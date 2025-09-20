import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Plus, X, Tag } from 'lucide-react';

interface TagsDropdownProps {
  value: string[];
  onChange: (tags: string[]) => void;
  existingTags: string[];
  placeholder?: string;
  label?: string;
  maxTags?: number;
  className?: string;
}

// Predefined colors for tags
const tagColors = [
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
  'bg-rose-100 text-rose-800 border-rose-200',
  'bg-sky-100 text-sky-800 border-sky-200',
  'bg-lime-100 text-lime-800 border-lime-200',
];

const getTagColor = (tag: string, index: number) => {
  return tagColors[index % tagColors.length];
};

const TagsDropdown: React.FC<TagsDropdownProps> = ({
  value = [],
  onChange,
  existingTags = [],
  placeholder = "Add tags...",
  label = "Tags",
  maxTags = 10,
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [inputValue, setInputValue] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter tags based on search term
  const filteredTags = existingTags.filter(tag =>
    tag.toLowerCase().includes(searchTerm.toLowerCase()) &&
    !value.includes(tag)
  );

  // Check if search term matches a new tag
  const isNewTag = searchTerm && !existingTags.includes(searchTerm) && !value.includes(searchTerm);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
        setInputValue('');
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

  const handleAddTag = (tag: string) => {
    const trimmedTag = tag.trim();
    if (trimmedTag && !value.includes(trimmedTag) && value.length < maxTags) {
      onChange([...value, trimmedTag]);
      setSearchTerm('');
      setInputValue('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onChange(value.filter(tag => tag !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (searchTerm.trim()) {
        handleAddTag(searchTerm);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setSearchTerm('');
      setInputValue('');
    } else if (e.key === 'Backspace' && !searchTerm && value.length > 0) {
      handleRemoveTag(value[value.length - 1]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    setInputValue(inputValue);
    setSearchTerm(inputValue);
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  const handleTagClick = (tag: string) => {
    handleAddTag(tag);
  };

  const handleAddNewTag = () => {
    if (searchTerm.trim()) {
      handleAddTag(searchTerm);
    }
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
      )}
      
      <div className="relative">
        <div
          className={`min-h-[42px] w-full px-3 py-2 border rounded-lg focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-transparent transition-all duration-200 bg-white border-gray-300 ${
            isOpen ? 'border-primary-300' : 'hover:border-gray-400'
          }`}
          onClick={() => inputRef.current?.focus()}
        >
          {/* Selected Tags */}
          <div className="flex flex-wrap gap-1 mb-1">
            {value.map((tag, index) => (
              <span
                key={tag}
                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getTagColor(tag, index)}`}
              >
                <Tag className="h-3 w-3 mr-1" />
                {tag}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveTag(tag);
                  }}
                  className="ml-1 hover:bg-black hover:bg-opacity-10 rounded-full p-0.5 transition-colors duration-150"
                  aria-label={`Remove ${tag} tag`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>

          {/* Input Field */}
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={handleInputFocus}
            placeholder={value.length === 0 ? placeholder : "Add more tags..."}
            className="w-full border-none outline-none text-sm bg-transparent placeholder-gray-500"
            disabled={value.length >= maxTags}
          />

          {/* Dropdown Arrow */}
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
            <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
          </div>
        </div>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-hidden">
            {/* Tags List */}
            <div className="max-h-48 overflow-y-auto">
              {filteredTags.length > 0 ? (
                <div className="py-1">
                  {filteredTags.map((tag, index) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleTagClick(tag)}
                      className="w-full px-3 py-2 text-left hover:bg-gray-50 focus:outline-none focus:bg-gray-50 transition-colors duration-150 text-gray-700"
                    >
                      <div className="flex items-center space-x-2">
                        <div className={`px-2 py-1 rounded-full text-xs font-medium border ${getTagColor(tag, index)}`}>
                          <Tag className="h-3 w-3 inline mr-1" />
                          {tag}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="px-3 py-2 text-sm text-gray-500">
                  {existingTags.length === 0 ? 'No existing tags' : 'No matching tags'}
                </div>
              )}

              {/* Add New Tag Option */}
              {isNewTag && (
                <div className="border-t border-gray-100">
                  <button
                    type="button"
                    onClick={handleAddNewTag}
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

            {/* Quick Add Tags */}
            {!searchTerm && (
              <div className="border-t border-gray-100 p-2">
                <div className="text-xs text-gray-500 mb-2">Quick add popular tags:</div>
                <div className="flex flex-wrap gap-1">
                  {['popular', 'featured', 'new', 'turkey', 'sale', 'bestseller', 'organic', 'premium', 'limited'].map((quickTag) => {
                    if (value.includes(quickTag)) return null;
                    return (
                      <button
                        key={quickTag}
                        type="button"
                        onClick={() => handleTagClick(quickTag)}
                        className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors duration-150"
                      >
                        + {quickTag}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Max Tags Warning */}
            {value.length >= maxTags && (
              <div className="border-t border-gray-100 px-3 py-2">
                <div className="text-xs text-orange-600">
                  Maximum {maxTags} tags allowed
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Helper Text */}
      <div className="mt-1 text-xs text-gray-500">
        {value.length > 0 && (
          <span>
            {value.length} of {maxTags} tags selected
          </span>
        )}
        {value.length === 0 && (
          <span>Press Enter to add tags, or click on existing tags to select them</span>
        )}
      </div>
    </div>
  );
};

export { TagsDropdown };
