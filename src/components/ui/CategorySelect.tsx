import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Plus, Tag } from 'lucide-react';

interface CategorySelectProps {
  value: string;
  onChange: (category: string) => void;
  existingCategories: string[];
  placeholder?: string;
  label?: string;
  required?: boolean;
  className?: string;
}

// Predefined colors for categories
const categoryColors = [
  'bg-blue-100 text-blue-800 border-blue-200',
  'bg-green-100 text-green-800 border-green-200',
  'bg-purple-100 text-purple-800 border-purple-200',
  'bg-pink-100 text-pink-800 border-pink-200',
  'bg-indigo-100 text-indigo-800 border-indigo-200',
  'bg-yellow-100 text-yellow-800 border-yellow-200',
  'bg-red-100 text-red-800 border-red-200',
  'bg-cyan-100 text-cyan-800 border-cyan-200',
  'bg-orange-100 text-orange-800 border-orange-200',
  'bg-teal-100 text-teal-800 border-teal-200',
  'bg-emerald-100 text-emerald-800 border-emerald-200',
  'bg-violet-100 text-violet-800 border-violet-200',
];

const getCategoryColor = (category: string, index: number) => {
  return categoryColors[index % categoryColors.length];
};

const CategorySelect: React.FC<CategorySelectProps> = ({
  value,
  onChange,
  existingCategories,
  placeholder = "Select or add a category",
  label = "Category",
  required = false,
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter categories based on search term
  const filteredCategories = existingCategories.filter(category =>
    category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Check if search term matches a new category
  const isNewCategory = searchTerm && !existingCategories.includes(searchTerm);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSelectCategory = (category: string) => {
    onChange(category);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleAddNewCategory = () => {
    if (searchTerm.trim()) {
      handleSelectCategory(searchTerm.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (isNewCategory) {
        handleAddNewCategory();
      } else if (filteredCategories.length === 1) {
        handleSelectCategory(filteredCategories[0]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setSearchTerm('');
    }
  };

  const selectedCategoryIndex = existingCategories.indexOf(value);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 ${
          value 
            ? 'bg-white border-gray-300 hover:border-gray-400' 
            : 'bg-white border-gray-300 hover:border-gray-400'
        }`}
        aria-label="Select category"
      >
        <div className="flex items-center justify-between">
          {value ? (
            <div className="flex items-center space-x-2">
              <div className={`px-2 py-1 rounded-full text-xs font-medium border ${getCategoryColor(value, selectedCategoryIndex)}`}>
                <Tag className="h-3 w-3 inline mr-1" />
                {value}
              </div>
            </div>
          ) : (
            <span className="text-gray-500">{placeholder}</span>
          )}
          <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-hidden">
          {/* Search Input */}
          <div className="p-2 border-b border-gray-100">
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search or type new category..."
              className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
            />
          </div>

          {/* Categories List */}
          <div className="max-h-48 overflow-y-auto">
            {filteredCategories.length > 0 ? (
              <div className="py-1">
                {filteredCategories.map((category, index) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => handleSelectCategory(category)}
                    className={`w-full px-3 py-2 text-left hover:bg-gray-50 focus:outline-none focus:bg-gray-50 transition-colors duration-150 ${
                      value === category ? 'bg-primary-50 text-primary-700' : 'text-gray-700'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <div className={`px-2 py-1 rounded-full text-xs font-medium border ${getCategoryColor(category, index)}`}>
                        <Tag className="h-3 w-3 inline mr-1" />
                        {category}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="px-3 py-2 text-sm text-gray-500">
                No categories found
              </div>
            )}

            {/* Add New Category Option */}
            {isNewCategory && (
              <div className="border-t border-gray-100">
                <button
                  type="button"
                  onClick={handleAddNewCategory}
                  className="w-full px-3 py-2 text-left hover:bg-green-50 focus:outline-none focus:bg-green-50 transition-colors duration-150 text-green-700"
                >
                  <div className="flex items-center space-x-2">
                    <Plus className="h-4 w-4" />
                    <span className="font-medium">Add "{searchTerm}"</span>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Quick Add Categories */}
          {!searchTerm && (
            <div className="border-t border-gray-100 p-2">
              <div className="text-xs text-gray-500 mb-2">Quick add popular categories:</div>
              <div className="flex flex-wrap gap-1">
                {['Food & Beverages', 'Electronics', 'Clothing', 'Home & Garden', 'Health & Beauty', 'Sports & Outdoors'].map((quickCategory) => {
                  if (existingCategories.includes(quickCategory)) return null;
                  return (
                    <button
                      key={quickCategory}
                      type="button"
                      onClick={() => handleSelectCategory(quickCategory)}
                      className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors duration-150"
                    >
                      + {quickCategory}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CategorySelect;



