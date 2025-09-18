import React, { useState } from 'react';
import { Search, Camera, X } from 'lucide-react';
import { Button } from './Button';

interface SearchBarProps {
  placeholder?: string;
  onSearch: (query: string) => void;
  onBarcodeScan?: () => void;
  showBarcodeButton?: boolean;
  className?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  placeholder = 'Search products...',
  onSearch,
  onBarcodeScan,
  showBarcodeButton = true,
  className = '',
}) => {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query);
  };

  const handleClear = () => {
    setQuery('');
    onSearch('');
  };

  return (
    <form onSubmit={handleSubmit} className={`relative ${className}`}>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-10 pr-20 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-2 space-x-1">
          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-gray-400 hover:text-gray-600"
              title="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          {showBarcodeButton && onBarcodeScan && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onBarcodeScan}
              className="!p-2"
              title="Scan barcode"
            >
              <Camera className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </form>
  );
};
