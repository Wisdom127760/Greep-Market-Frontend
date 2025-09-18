import * as XLSX from 'xlsx';

export interface ExcelColumn {
  index: number;
  header: string;
  sampleValues: string[];
  dataType: 'text' | 'number' | 'date' | 'mixed';
}

export interface ProductField {
  key: string;
  label: string;
  required: boolean;
  dataType: 'text' | 'number' | 'date' | 'boolean';
  possibleHeaders: string[];
}

export interface ColumnMapping {
  excelColumnIndex: number;
  productField: string;
  confidence: number;
  transformation?: (value: any) => any;
}

export interface ExcelParseResult {
  columns: ExcelColumn[];
  data: any[][];
  headerRowIndex: number;
  totalRows: number;
  suggestedMappings: ColumnMapping[];
}

export class ExcelParserService {
  private static productFields: ProductField[] = [
    {
      key: 'name',
      label: 'Product Name',
      required: true,
      dataType: 'text',
      possibleHeaders: [
        'name', 'product name', 'product_name', 'item name', 'item_name',
        'product', 'item', 'description', 'title', 'product title',
        'name of product', 'product title', 'item description'
      ]
    },
    {
      key: 'category',
      label: 'Category',
      required: false,
      dataType: 'text',
      possibleHeaders: [
        'category', 'type', 'product type', 'product_type', 'classification',
        'group', 'class', 'department', 'section'
      ]
    },
    {
      key: 'sku',
      label: 'SKU',
      required: false,
      dataType: 'text',
      possibleHeaders: [
        'sku', 'product code', 'product_code', 'code', 'item code',
        'item_code', 'product id', 'product_id', 'id', 'reference'
      ]
    },
    {
      key: 'barcode',
      label: 'Barcode',
      required: false,
      dataType: 'text',
      possibleHeaders: [
        'barcode', 'barcode number', 'barcode_number', 'upc', 'ean',
        'isbn', 'product barcode', 'product_barcode'
      ]
    },
    {
      key: 'price',
      label: 'Price',
      required: true,
      dataType: 'number',
      possibleHeaders: [
        'price', 'prices', 'selling price', 'selling_price', 'retail price',
        'retail_price', 'unit price', 'unit_price', 'cost', 'amount',
        'value', 'price per unit', 'price_per_unit'
      ]
    },
    {
      key: 'cost_price',
      label: 'Cost Price',
      required: false,
      dataType: 'number',
      possibleHeaders: [
        'cost price', 'cost_price', 'bought price', 'bought_price',
        'purchase price', 'purchase_price', 'wholesale price', 'wholesale_price',
        'cost', 'buying price', 'buying_price', 'unit cost', 'unit_cost'
      ]
    },
    {
      key: 'stock_quantity',
      label: 'Stock Quantity',
      required: false,
      dataType: 'number',
      possibleHeaders: [
        'stock', 'quantity', 'stock quantity', 'stock_quantity', 'inventory',
        'total quantity', 'total_quantity', 'available', 'units left', 'units_left',
        'unit left', 'unit_left', 'remaining', 'on hand', 'on_hand'
      ]
    },
    {
      key: 'min_stock_level',
      label: 'Minimum Stock Level',
      required: false,
      dataType: 'number',
      possibleHeaders: [
        'min stock', 'min_stock', 'minimum stock', 'minimum_stock',
        'reorder level', 'reorder_level', 'low stock', 'low_stock',
        'minimum quantity', 'minimum_quantity', 'min stock level', 'min_stock_level'
      ]
    },
    {
      key: 'unit',
      label: 'Unit',
      required: false,
      dataType: 'text',
      possibleHeaders: [
        'unit', 'units', 'measurement', 'measure', 'uom', 'unit of measure',
        'unit_of_measure', 'packaging', 'package', 'size'
      ]
    },
    {
      key: 'weight',
      label: 'Weight',
      required: false,
      dataType: 'number',
      possibleHeaders: [
        'weight', 'mass', 'kg', 'kilogram', 'grams', 'g', 'pounds', 'lbs',
        'weight in kg', 'weight_in_kg', 'net weight', 'net_weight'
      ]
    },
    {
      key: 'description',
      label: 'Description',
      required: false,
      dataType: 'text',
      possibleHeaders: [
        'description', 'details', 'notes', 'remarks', 'info', 'information',
        'product description', 'product_description', 'long description'
      ]
    },
    {
      key: 'is_active',
      label: 'Active Status',
      required: false,
      dataType: 'boolean',
      possibleHeaders: [
        'active', 'status', 'enabled', 'available', 'in stock', 'in_stock',
        'is active', 'is_active', 'active status', 'active_status'
      ]
    }
  ];

  /**
   * Parse Excel file and detect columns intelligently
   */
  static parseExcelFile(file: File): Promise<ExcelParseResult> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          
          // Get the first worksheet
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          
          // Convert to array of arrays
          const rawData = XLSX.utils.sheet_to_json(worksheet, { 
            header: 1, 
            defval: '',
            raw: false 
          }) as any[][];

          if (rawData.length === 0) {
            reject(new Error('Excel file is empty'));
            return;
          }

          // Find the header row
          const headerRowIndex = this.findHeaderRow(rawData);
          
          // Extract columns
          const columns = this.extractColumns(rawData, headerRowIndex);
          
          // Generate suggested mappings
          const suggestedMappings = this.generateSuggestedMappings(columns);
          
          resolve({
            columns,
            data: rawData,
            headerRowIndex,
            totalRows: rawData.length - headerRowIndex - 1,
            suggestedMappings
          });
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Find the header row by analyzing data patterns
   */
  private static findHeaderRow(data: any[][]): number {
    if (data.length === 0) return 0;
    
    let bestHeaderRow = 0;
    let maxScore = 0;
    
    // Check first 5 rows for header patterns
    for (let i = 0; i < Math.min(5, data.length); i++) {
      const row = data[i];
      let score = 0;
      
      // Check if row contains mostly text (headers are usually text)
      const textCount = row.filter(cell => 
        typeof cell === 'string' && 
        cell.trim().length > 0 && 
        !this.isNumeric(cell)
      ).length;
      
      score += (textCount / row.length) * 50;
      
      // Check for common header patterns
      const headerPatterns = [
        'name', 'price', 'quantity', 'category', 'sku', 'barcode',
        'type', 'unit', 'description', 'cost', 'stock'
      ];
      
      const headerMatches = row.filter(cell => 
        typeof cell === 'string' && 
        headerPatterns.some(pattern => 
          cell.toLowerCase().includes(pattern)
        )
      ).length;
      
      score += (headerMatches / row.length) * 30;
      
      // Check for consistent formatting (headers often have consistent case)
      const hasConsistentCase = this.hasConsistentCase(row);
      if (hasConsistentCase) score += 20;
      
      if (score > maxScore) {
        maxScore = score;
        bestHeaderRow = i;
      }
    }
    
    return bestHeaderRow;
  }

  /**
   * Extract column information from data
   */
  private static extractColumns(data: any[][], headerRowIndex: number): ExcelColumn[] {
    if (data.length <= headerRowIndex) return [];
    
    const headerRow = data[headerRowIndex];
    const columns: ExcelColumn[] = [];
    
    for (let i = 0; i < headerRow.length; i++) {
      const header = String(headerRow[i] || '').trim();
      if (!header) continue;
      
      // Get sample values from next few rows
      const sampleValues = [];
      for (let j = headerRowIndex + 1; j < Math.min(headerRowIndex + 4, data.length); j++) {
        if (data[j] && data[j][i] !== undefined) {
          sampleValues.push(String(data[j][i]));
        }
      }
      
      // Determine data type
      const dataType = this.determineDataType(sampleValues);
      
      columns.push({
        index: i,
        header,
        sampleValues,
        dataType
      });
    }
    
    return columns;
  }

  /**
   * Generate suggested column mappings
   */
  private static generateSuggestedMappings(columns: ExcelColumn[]): ColumnMapping[] {
    const mappings: ColumnMapping[] = [];
    
    for (const column of columns) {
      let bestMatch: ProductField | null = null;
      let bestScore = 0;
      
      for (const field of this.productFields) {
        const score = this.calculateMappingScore(column, field);
        if (score > bestScore && score > 0.3) { // Minimum confidence threshold
          bestScore = score;
          bestMatch = field;
        }
      }
      
      if (bestMatch) {
        mappings.push({
          excelColumnIndex: column.index,
          productField: bestMatch.key,
          confidence: bestScore,
          transformation: this.getTransformation(bestMatch.dataType)
        });
      }
    }
    
    return mappings.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Calculate mapping score between column and product field
   */
  private static calculateMappingScore(column: ExcelColumn, field: ProductField): number {
    let score = 0;
    
    // Exact header match
    const headerLower = column.header.toLowerCase();
    if (field.possibleHeaders.includes(headerLower)) {
      score += 1.0;
    } else {
      // Partial header match
      for (const possibleHeader of field.possibleHeaders) {
        if (headerLower.includes(possibleHeader) || possibleHeader.includes(headerLower)) {
          score += 0.8;
          break;
        }
      }
    }
    
    // Data type compatibility
    if (this.isDataTypeCompatible(column.dataType, field.dataType)) {
      score += 0.2;
    } else {
      score -= 0.3;
    }
    
    // Sample data analysis
    const sampleAnalysis = this.analyzeSampleData(column.sampleValues, field);
    score += sampleAnalysis * 0.3;
    
    return Math.min(score, 1.0);
  }

  /**
   * Analyze sample data for field compatibility
   */
  private static analyzeSampleData(sampleValues: string[], field: ProductField): number {
    if (sampleValues.length === 0) return 0;
    
    let score = 0;
    
    switch (field.key) {
      case 'name':
        // Product names are usually text and not too short
        const avgLength = sampleValues.reduce((sum, val) => sum + val.length, 0) / sampleValues.length;
        if (avgLength > 3 && avgLength < 100) score += 0.5;
        break;
        
      case 'price':
      case 'cost_price':
        // Prices are usually numbers
        const numericCount = sampleValues.filter(val => this.isNumeric(val)).length;
        score += (numericCount / sampleValues.length) * 0.8;
        break;
        
      case 'stock_quantity':
        // Stock quantities are usually whole numbers
        const wholeNumberCount = sampleValues.filter(val => 
          this.isNumeric(val) && Number.isInteger(parseFloat(val))
        ).length;
        score += (wholeNumberCount / sampleValues.length) * 0.7;
        break;
        
      case 'category':
        // Categories are usually short text strings
        const shortTextCount = sampleValues.filter(val => 
          val.length > 0 && val.length < 50 && !this.isNumeric(val)
        ).length;
        score += (shortTextCount / sampleValues.length) * 0.6;
        break;
        
      case 'unit':
        // Units are usually short strings like 'kg', 'pcs', 'box'
        const unitPattern = /^(kg|g|pcs|pieces|box|pack|liter|l|ml|gram|kilogram)$/i;
        const unitCount = sampleValues.filter(val => unitPattern.test(val)).length;
        score += (unitCount / sampleValues.length) * 0.9;
        break;
    }
    
    return score;
  }

  /**
   * Get data transformation function
   */
  private static getTransformation(dataType: string): ((value: any) => any) | undefined {
    switch (dataType) {
      case 'number':
        return (value) => {
          const num = parseFloat(String(value).replace(/[^\d.-]/g, ''));
          return isNaN(num) ? 0 : num;
        };
      case 'boolean':
        return (value) => {
          const str = String(value).toLowerCase();
          return str === 'true' || str === 'yes' || str === '1' || str === 'active';
        };
      case 'date':
        return (value) => {
          const date = new Date(value);
          return isNaN(date.getTime()) ? new Date() : date;
        };
      default:
        return (value) => String(value).trim();
    }
  }

  /**
   * Helper methods
   */
  private static isNumeric(value: any): boolean {
    if (typeof value === 'number') return true;
    if (typeof value === 'string') {
      const cleaned = value.replace(/[^\d.-]/g, '');
      return !isNaN(parseFloat(cleaned)) && isFinite(parseFloat(cleaned));
    }
    return false;
  }

  private static hasConsistentCase(row: any[]): boolean {
    const textCells = row.filter(cell => typeof cell === 'string' && cell.trim().length > 0);
    if (textCells.length < 2) return false;
    
    const firstCase = this.getCaseType(textCells[0]);
    return textCells.every(cell => this.getCaseType(cell) === firstCase);
  }

  private static getCaseType(text: string): 'upper' | 'lower' | 'title' | 'mixed' {
    if (text === text.toUpperCase()) return 'upper';
    if (text === text.toLowerCase()) return 'lower';
    if (text === text.replace(/\w\S*/g, (txt) => 
      txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    )) return 'title';
    return 'mixed';
  }

  private static determineDataType(sampleValues: string[]): 'text' | 'number' | 'date' | 'mixed' {
    if (sampleValues.length === 0) return 'text';
    
    const numericCount = sampleValues.filter(val => this.isNumeric(val)).length;
    const dateCount = sampleValues.filter(val => !isNaN(Date.parse(val))).length;
    const scientificNotationCount = sampleValues.filter(val => 
      String(val).includes('E+') || String(val).includes('e+') || String(val).includes('E-') || String(val).includes('e-')
    ).length;
    
    // If we have scientific notation, treat as text (for barcodes, IDs, etc.)
    if (scientificNotationCount > 0) return 'text';
    
    if (numericCount / sampleValues.length > 0.8) return 'number';
    if (dateCount / sampleValues.length > 0.8) return 'date';
    if (numericCount > 0 && numericCount < sampleValues.length) return 'mixed';
    
    return 'text';
  }

  private static isDataTypeCompatible(columnType: string, fieldType: string): boolean {
    if (columnType === fieldType) return true;
    if (columnType === 'mixed' && fieldType === 'text') return true;
    if (columnType === 'number' && fieldType === 'text') return true;
    return false;
  }

  /**
   * Get all available product fields
   */
  static getProductFields(): ProductField[] {
    return this.productFields;
  }
}
