import React, { useState, useRef, useEffect } from 'react';
import { X, Tag, Plus } from 'lucide-react';

interface TagsInputProps {
  value: string;
  onChange: (tags: string) => void;
  existingTags?: string[];
  placeholder?: string;
  label?: string;
}

const tagColors = [
  { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200' },
  { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' },
  { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-200' },
  { bg: 'bg-pink-100', text: 'text-pink-800', border: 'border-pink-200' },
  { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200' },
  { bg: 'bg-indigo-100', text: 'text-indigo-800', border: 'border-indigo-200' },
  { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200' },
  { bg: 'bg-teal-100', text: 'text-teal-800', border: 'border-teal-200' },
  { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-200' },
  { bg: 'bg-cyan-100', text: 'text-cyan-800', border: 'border-cyan-200' },
  { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-200' },
  { bg: 'bg-violet-100', text: 'text-violet-800', border: 'border-violet-200' },
];

export const TagsInput: React.FC<TagsInputProps> = ({
  value,
  onChange,
  existingTags = [],
  placeholder = "Type and press Enter to add tags",
  label = "Tags"
}) => {
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse current tags from string
  const currentTags = React.useMemo(() => 
    value ? value.split(',').map(tag => tag.trim()).filter(tag => tag) : [], 
    [value]
  );

  const getTagColor = (tag: string) => {
    const index = existingTags.indexOf(tag);
    // If tag doesn't exist in existingTags, use a hash of the tag string for consistent colors
    const colorIndex = index >= 0 ? index : tag.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return tagColors[Math.abs(colorIndex) % tagColors.length];
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (inputValue.trim()) {
      const filtered = existingTags.filter(tag => 
        tag.toLowerCase().includes(inputValue.toLowerCase()) && 
        !currentTags.includes(tag)
      );
      setSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setShowSuggestions(false);
      setSuggestions([]);
    }
  }, [inputValue, existingTags, currentTags]);

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim();
    if (trimmedTag && !currentTags.includes(trimmedTag)) {
      const newTags = [...currentTags, trimmedTag];
      onChange(newTags.join(', '));
    }
    setInputValue('');
    setShowSuggestions(false);
  };

  const removeTag = (tagToRemove: string) => {
    const newTags = currentTags.filter(tag => tag !== tagToRemove);
    onChange(newTags.join(', '));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (inputValue.trim()) {
        addTag(inputValue);
      }
    } else if (e.key === 'Backspace' && !inputValue && currentTags.length > 0) {
      // Remove last tag when backspace is pressed and input is empty
      removeTag(currentTags[currentTags.length - 1]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setInputValue('');
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    addTag(suggestion);
  };

  return (
    <div className="relative" ref={containerRef}>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      
      <div className="relative">
        <div className={`
          w-full min-h-[42px] px-3 py-2 border border-gray-300 rounded-lg 
          focus-within:outline-none focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-transparent
          bg-white transition-colors duration-200
          flex flex-wrap items-center gap-2
        `}>
          {/* Current Tags */}
          {currentTags.map((tag, index) => (
            <div
              key={`${tag}-${index}`}
              className={`
                inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium
                ${getTagColor(tag).bg} ${getTagColor(tag).text} ${getTagColor(tag).border} border
                animate-in fade-in duration-200
              `}
            >
              <Tag className="h-3 w-3" />
              <span>{tag}</span>
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="ml-1 hover:bg-black hover:bg-opacity-10 rounded-full p-0.5 transition-colors duration-150"
                aria-label={`Remove ${tag} tag`}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          
          {/* Input Field */}
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowSuggestions(suggestions.length > 0)}
            placeholder={currentTags.length === 0 ? placeholder : "Add another tag..."}
            className="flex-1 min-w-[120px] border-none outline-none bg-transparent text-sm"
          />
        </div>

        {/* Suggestions Dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-auto">
            <div className="p-2">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 px-2">
                Suggested Tags
              </div>
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-50 transition-colors duration-150 flex items-center space-x-2 text-gray-700"
                >
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${getTagColor(suggestion).bg} ${getTagColor(suggestion).text}`}>
                    <Tag className="h-3 w-3 inline mr-1" />
                    {suggestion}
                  </div>
                  <Plus className="h-3 w-3 text-gray-400" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Help Text */}
      <div className="mt-2 space-y-1">
        <p className="text-sm text-gray-500">
          Type and press Enter to add tags. Click on suggested tags to add them quickly.
        </p>
        {currentTags.length > 0 && (
          <p className="text-xs text-gray-400">
            {currentTags.length} tag{currentTags.length !== 1 ? 's' : ''} added
          </p>
        )}
      </div>
    </div>
  );
};
