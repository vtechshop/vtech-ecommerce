// FILE: apps/web/src/components/common/SearchAutocomplete.jsx
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Search, TrendingUp, Clock, X, ChevronRight, Mic } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import api from '@/utils/api';
import { formatCurrency } from '@/utils/format';
import { normalizeImageUrl } from '@/utils/placeholders';

// Debounce hook
function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

const SearchAutocomplete = React.memo(({ className = '' }) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 250);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState([]);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);
  const [isListening, setIsListening] = useState(false);
  const [voiceText, setVoiceText] = useState('');
  const [voiceError, setVoiceError] = useState('');
  const recognitionRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const maxTimerRef = useRef(null);
  const transcriptRef = useRef('');

  // Check if browser supports speech recognition
  const SpeechRecognition = typeof window !== 'undefined'
    && (window.SpeechRecognition || window.webkitSpeechRecognition);

  // Execute voice search with accumulated transcript
  const executeVoiceSearch = useCallback((text) => {
    clearTimeout(silenceTimerRef.current);
    clearTimeout(maxTimerRef.current);
    if (recognitionRef.current) {
      recognitionRef.current.onend = null; // prevent restart
      recognitionRef.current.stop();
    }
    recognitionRef.current = null;
    if (text.trim()) {
      saveRecentSearch(text.trim());
      setIsListening(false);
      setVoiceText('');
      navigate(`/products?q=${encodeURIComponent(text.trim())}&source=voice`);
    }
  }, [navigate]);

  const startVoiceSearch = useCallback(async () => {
    if (!SpeechRecognition) return;

    // Pre-warm mic to avoid missing first word
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
    } catch {
      setVoiceError('Microphone access denied.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.continuous = false; // Use false + auto-restart (more reliable)
    recognition.interimResults = true;
    recognitionRef.current = recognition;
    transcriptRef.current = '';

    recognition.onstart = () => {
      setIsListening(true);
      setVoiceText('');
      setVoiceError('');
    };

    recognition.onresult = (event) => {
      // Build full transcript from all segments
      let finalText = '';
      let interimText = '';
      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalText += event.results[i][0].transcript;
        } else {
          interimText += event.results[i][0].transcript;
        }
      }
      // Accumulate final text across restarts
      const fullText = (transcriptRef.current + ' ' + finalText + interimText).trim();
      setVoiceText(fullText);

      // When a segment is final, save it permanently
      if (finalText) {
        transcriptRef.current = (transcriptRef.current + ' ' + finalText).trim();
      }

      // Reset silence timer — auto-search after 1.5s of silence
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = setTimeout(() => {
        const q = transcriptRef.current || fullText;
        if (q.trim()) executeVoiceSearch(q.trim());
      }, 1000);
    };

    recognition.onerror = (event) => {
      if (event.error === 'no-speech') {
        setVoiceError('No speech detected. Try again.');
      } else if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setVoiceError('Microphone access denied.');
        setIsListening(false);
      } else if (event.error !== 'aborted') {
        setVoiceError('Something went wrong. Try again.');
      }
    };

    // Auto-restart on end (continuous:false stops after each phrase)
    recognition.onend = () => {
      if (recognitionRef.current) {
        try {
          recognition.start();
        } catch {
          // If restart fails and we have text, search with it
          const q = transcriptRef.current;
          if (q.trim()) executeVoiceSearch(q.trim());
          else setIsListening(false);
        }
      }
    };

    recognition.start();

    // Safety cap: max 15 seconds of listening
    maxTimerRef.current = setTimeout(() => {
      const q = transcriptRef.current;
      if (q.trim()) {
        executeVoiceSearch(q.trim());
      } else {
        // Manual cleanup (can't reference stopVoiceSearch here)
        clearTimeout(silenceTimerRef.current);
        if (recognitionRef.current) {
          recognitionRef.current.onend = null;
          recognitionRef.current.stop();
        }
        recognitionRef.current = null;
        transcriptRef.current = '';
        setIsListening(false);
        setVoiceText('');
      }
    }, 15000);
  }, [SpeechRecognition, executeVoiceSearch]);

  const stopVoiceSearch = useCallback(() => {
    clearTimeout(silenceTimerRef.current);
    clearTimeout(maxTimerRef.current);
    if (recognitionRef.current) {
      recognitionRef.current.onend = null; // prevent restart
      recognitionRef.current.stop();
    }
    recognitionRef.current = null;
    transcriptRef.current = '';
    setIsListening(false);
    setVoiceText('');
    setVoiceError('');
  }, []);

  // Scroll dismisses voice search overlay
  useEffect(() => {
    if (!isListening) return;
    const dismiss = () => stopVoiceSearch();
    window.addEventListener('scroll', dismiss, { once: true });
    return () => window.removeEventListener('scroll', dismiss);
  }, [isListening, stopVoiceSearch]);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('recentSearches');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load recent searches:', e);
      }
    }
  }, []);

  // Fetch autocomplete from dedicated endpoint
  const { data: autocomplete, isLoading } = useQuery({
    queryKey: ['autocomplete', debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery.trim() || debouncedQuery.length < 2) return null;
      const response = await api.get(`/catalog/autocomplete?q=${encodeURIComponent(debouncedQuery)}`);
      return response.data.data;
    },
    enabled: debouncedQuery.length >= 2,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  // Voice autocomplete - live suggestions while speaking
  const debouncedVoiceText = useDebounce(voiceText, 400);
  const { data: voiceAutocomplete } = useQuery({
    queryKey: ['voice-autocomplete', debouncedVoiceText],
    queryFn: async () => {
      if (!debouncedVoiceText.trim() || debouncedVoiceText.length < 2) return null;
      const response = await api.get(`/catalog/autocomplete?q=${encodeURIComponent(debouncedVoiceText)}`);
      return response.data.data;
    },
    enabled: isListening && debouncedVoiceText.length >= 2,
    staleTime: 30 * 1000,
    gcTime: 60 * 1000,
  });

  // Fetch trending searches (popular products)
  const { data: trending } = useQuery({
    queryKey: ['trending-searches'],
    queryFn: async () => {
      const response = await api.get('/catalog/products?sort=-sold&limit=5');
      return response.data.data || [];
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  // Build flat list of all selectable items for keyboard navigation
  const allItems = useMemo(() => {
    if (debouncedQuery.length < 2) return [];
    const items = [];
    // Text suggestions
    (autocomplete?.suggestions || []).forEach(s => items.push({ type: 'suggestion', text: s }));
    // Category suggestions
    (autocomplete?.categories || []).forEach(c => items.push({ type: 'category', ...c }));
    // Product suggestions
    (autocomplete?.products || []).forEach(p => items.push({ type: 'product', ...p }));
    return items;
  }, [autocomplete, debouncedQuery]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    const hasAutocomplete = debouncedQuery.length >= 2 && allItems.length > 0;
    const itemCount = hasAutocomplete ? allItems.length : (recentSearches.length + (trending?.length || 0));

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => (prev < itemCount - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (hasAutocomplete && selectedIndex >= 0 && allItems[selectedIndex]) {
          const item = allItems[selectedIndex];
          if (item.type === 'suggestion') handleSearch(item.text);
          else if (item.type === 'category') handleSelectCategory(item);
          else if (item.type === 'product') handleSelectProduct(item);
        } else if (!hasAutocomplete && selectedIndex >= 0) {
          // Recent/trending selection
          if (selectedIndex < recentSearches.length) {
            handleSearch(recentSearches[selectedIndex]);
          } else {
            const trendingIdx = selectedIndex - recentSearches.length;
            if (trending?.[trendingIdx]) handleSelectProduct(trending[trendingIdx]);
          }
        } else if (query.trim()) {
          handleSearch(query);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        inputRef.current?.blur();
        break;
      default:
        break;
    }
  };

  const handleSearch = (searchQuery) => {
    if (!searchQuery.trim()) return;
    saveRecentSearch(searchQuery);
    navigate(`/products?q=${encodeURIComponent(searchQuery)}`);
    setQuery('');
    setIsOpen(false);
    inputRef.current?.blur();
  };

  const handleSelectProduct = (product) => {
    saveRecentSearch(product.title);
    navigate(`/product/${product.slug}`);
    setQuery('');
    setIsOpen(false);
    inputRef.current?.blur();
  };

  // Select product from voice overlay
  const handleVoiceSelectProduct = useCallback((product) => {
    clearTimeout(silenceTimerRef.current);
    clearTimeout(maxTimerRef.current);
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.stop();
    }
    recognitionRef.current = null;
    saveRecentSearch(product.title);
    setIsListening(false);
    setVoiceText('');
    navigate(`/product/${product.slug}`);
  }, [navigate]);

  const handleSelectCategory = (category) => {
    if (query.trim()) {
      // Search within category: "mixer grinder in Kitchen"
      saveRecentSearch(query.trim());
      navigate(`/products?q=${encodeURIComponent(query.trim())}&category=${category.slug}`);
    } else {
      navigate(`/category/${category.slug}`);
    }
    setQuery('');
    setIsOpen(false);
    inputRef.current?.blur();
  };

  const saveRecentSearch = (searchTerm) => {
    const updated = [
      searchTerm,
      ...recentSearches.filter(s => s.toLowerCase() !== searchTerm.toLowerCase())
    ].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('recentSearches');
  };

  const handleInputChange = (e) => {
    setQuery(e.target.value);
    setIsOpen(true);
    setSelectedIndex(-1);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) handleSearch(query);
  };

  const shouldShowDropdown = useMemo(() =>
    isOpen && (query.length >= 2 || recentSearches.length > 0 || trending?.length > 0),
    [isOpen, query.length, recentSearches.length, trending?.length]
  );

  const handleFocus = useCallback(() => setIsOpen(true), []);

  // Track selected index across all sections
  let globalIndex = -1;

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <form onSubmit={handleSubmit} className="relative search-bar">
        <input
          ref={inputRef}
          type="text"
          placeholder="Search products..."
          value={query}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          className={`w-full px-4 py-2 ${SpeechRecognition ? 'pr-20' : 'pr-12'} border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400`}
          autoComplete="off"
          aria-label="Search products"
          role="combobox"
          aria-expanded={shouldShowDropdown}
          aria-autocomplete="list"
        />
        {/* Voice search mic button */}
        {SpeechRecognition && (
          <button
            type="button"
            onClick={isListening ? stopVoiceSearch : startVoiceSearch}
            className={`absolute right-10 top-1/2 -translate-y-1/2 p-1.5 rounded-full transition-all ${
              isListening
                ? 'text-red-500 bg-red-50 animate-pulse'
                : 'text-gray-400 hover:text-primary-500'
            }`}
            aria-label={isListening ? 'Stop listening' : 'Search by voice'}
          >
            <Mic className="w-4 h-4" />
          </button>
        )}
        <button
          type="submit"
          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:hover:text-primary-400 transition-colors"
          aria-label="Search products"
        >
          <Search className="w-5 h-5" aria-hidden="true" />
        </button>
      </form>

      {/* Voice search listening overlay - Amazon style (portal to body) */}
      {isListening && createPortal(
        <div
          className="z-[9999] flex items-center justify-center"
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)' }}
          onClick={stopVoiceSearch}
        >
          <div className="bg-white rounded-2xl text-center shadow-2xl mx-4 overflow-hidden" style={{ width: '440px', maxWidth: '92vw' }} onClick={e => e.stopPropagation()}>
            {/* Top section with mic and status */}
            <div className="px-8 pt-8 pb-4">
              {/* Animated mic with ripple rings */}
              <div className="relative inline-flex items-center justify-center mb-4" style={{ width: '120px', height: '120px' }}>
                <div className="absolute rounded-full border-2 border-blue-100 animate-ping opacity-20" style={{ width: '110px', height: '110px' }}></div>
                <div className="absolute rounded-full border-2 border-blue-200 animate-pulse opacity-30" style={{ width: '90px', height: '90px' }}></div>
                <div className="absolute rounded-full bg-blue-50 opacity-40" style={{ width: '80px', height: '80px' }}></div>
                <div className="relative w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg cursor-pointer" onClick={stopVoiceSearch}>
                  <Mic className="w-8 h-8 text-white" />
                </div>
              </div>

              {/* Audio wave bars */}
              <div className="flex items-end justify-center gap-1.5 mb-3 h-8">
                {[...Array(7)].map((_, i) => (
                  <div
                    key={i}
                    className="w-1 bg-blue-500 rounded-full"
                    style={{
                      animation: `voiceWave 0.6s ease-in-out ${i * 0.08}s infinite alternate`,
                      height: '6px',
                    }}
                  />
                ))}
              </div>

              <p className="text-lg font-bold text-gray-900 mb-1">Listening...</p>
              {voiceError ? (
                <p className="text-sm text-red-500 mb-3">{voiceError}</p>
              ) : voiceText ? (
                <p className="text-base text-blue-600 font-medium mb-3 min-h-[24px]">"{voiceText}"</p>
              ) : (
                <p className="text-sm text-gray-400 mb-3">Try saying a product name</p>
              )}

              <div className="flex items-center justify-center gap-3">
                {voiceText && (
                  <button
                    onClick={() => executeVoiceSearch(voiceText)}
                    className="px-5 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-full transition-colors"
                  >
                    Search
                  </button>
                )}
                <button
                  onClick={stopVoiceSearch}
                  className="px-5 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>

            {/* Live suggestions - YouTube style */}
            {voiceAutocomplete && (voiceAutocomplete.suggestions?.length > 0 || voiceAutocomplete.products?.length > 0) && (
              <div className="border-t border-gray-100 max-h-[240px] overflow-y-auto">
                {/* Text suggestions */}
                {voiceAutocomplete.suggestions?.slice(0, 3).map((suggestion) => (
                  <button
                    key={`vs-${suggestion}`}
                    onClick={() => executeVoiceSearch(suggestion)}
                    className="w-full px-5 py-2.5 flex items-center gap-3 text-left hover:bg-gray-50 transition-colors"
                  >
                    <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="text-sm text-gray-800 truncate">{suggestion}</span>
                  </button>
                ))}

                {/* Product matches */}
                {voiceAutocomplete.products?.slice(0, 4).map((product) => (
                  <button
                    key={`vp-${product._id}`}
                    onClick={() => handleVoiceSelectProduct(product)}
                    className="w-full px-5 py-2.5 flex items-center gap-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-9 h-9 flex-shrink-0 bg-gray-100 rounded overflow-hidden">
                      {product.images?.[0] ? (
                        <img
                          src={normalizeImageUrl(product.images[0])}
                          alt={product.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-[8px]">
                          No img
                        </div>
                      )}
                    </div>
                    <div className="flex-1 text-left overflow-hidden">
                      <p className="text-sm text-gray-800 truncate">{product.title}</p>
                      <p className="text-xs font-semibold text-blue-600">{formatCurrency(product.price)}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <style>{`
            @keyframes voiceWave {
              0% { height: 6px; }
              100% { height: 40px; }
            }
          `}</style>
        </div>,
        document.body
      )}

      {/* Dropdown - Always light background for visibility */}
      {shouldShowDropdown && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-xl border border-gray-200 max-h-[480px] overflow-y-auto z-50">

          {/* Loading */}
          {isLoading && debouncedQuery.length >= 2 && (
            <div className="p-3 text-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600 mx-auto"></div>
            </div>
          )}

          {/* === AUTOCOMPLETE RESULTS (when typing) === */}
          {debouncedQuery.length >= 2 && autocomplete && (
            <>
              {/* Text Suggestions - Amazon style keyword hints */}
              {autocomplete.suggestions?.length > 0 && (
                <div className="py-1">
                  {autocomplete.suggestions.map((suggestion) => {
                    globalIndex++;
                    const idx = globalIndex;
                    return (
                      <button
                        key={`s-${suggestion}`}
                        onClick={() => handleSearch(suggestion)}
                        className={`w-full px-4 py-2 flex items-center gap-3 text-left hover:bg-gray-100 transition-colors ${
                          selectedIndex === idx ? 'bg-gray-100' : ''
                        }`}
                      >
                        <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span className="text-sm text-gray-900 flex-1">
                          {highlightMatch(suggestion, debouncedQuery)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Category Suggestions - "in Kitchen Appliances" */}
              {autocomplete.categories?.length > 0 && (
                <div className="py-1 border-t border-gray-200">
                  {autocomplete.categories.map((cat) => {
                    globalIndex++;
                    const idx = globalIndex;
                    return (
                      <button
                        key={`c-${cat._id}`}
                        onClick={() => handleSelectCategory(cat)}
                        className={`w-full px-4 py-2 flex items-center gap-3 text-left hover:bg-gray-100 transition-colors ${
                          selectedIndex === idx ? 'bg-gray-100' : ''
                        }`}
                      >
                        <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span className="text-sm text-gray-900 flex-1">
                          {debouncedQuery.trim()}{' '}
                          <span className="text-gray-500">in</span>{' '}
                          <span className="font-medium">{cat.name}</span>
                        </span>
                        <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Product Suggestions with images */}
              {autocomplete.products?.length > 0 && (
                <div className="py-1 border-t border-gray-200">
                  <div className="px-4 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                    Products
                  </div>
                  {autocomplete.products.map((product) => {
                    globalIndex++;
                    const idx = globalIndex;
                    return (
                      <button
                        key={`p-${product._id}`}
                        onClick={() => handleSelectProduct(product)}
                        className={`search-result-item w-full px-4 py-2.5 flex items-center gap-3 hover:bg-gray-100 transition-colors ${
                          selectedIndex === idx ? 'bg-gray-100' : ''
                        }`}
                      >
                        <div className="w-10 h-10 flex-shrink-0 bg-gray-100 rounded overflow-hidden">
                          {product.images?.[0] ? (
                            <img
                              src={normalizeImageUrl(product.images[0])}
                              alt={product.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                              No img
                            </div>
                          )}
                        </div>
                        <div className="flex-1 text-left overflow-hidden">
                          <p className="text-sm text-gray-900 truncate">
                            {highlightMatch(product.title, debouncedQuery)}
                          </p>
                          <p className="text-xs font-semibold text-blue-600">
                            {formatCurrency(product.price)}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* View All Results link */}
              {(autocomplete.products?.length > 0 || autocomplete.suggestions?.length > 0) && (
                <div className="border-t border-gray-200">
                  <button
                    onClick={() => handleSearch(debouncedQuery)}
                    className="w-full px-4 py-2.5 text-sm text-blue-600 font-medium hover:bg-gray-100 transition-colors text-left flex items-center gap-2"
                  >
                    <Search className="w-4 h-4" />
                    See all results for "{debouncedQuery}"
                  </button>
                </div>
              )}

              {/* No Results */}
              {!isLoading && autocomplete.products?.length === 0 && autocomplete.suggestions?.length === 0 && (
                <div className="p-6 text-center">
                  <p className="text-gray-600 text-sm">No results for "{debouncedQuery}"</p>
                  <p className="text-xs text-gray-500 mt-1">Try different keywords</p>
                </div>
              )}
            </>
          )}

          {/* === IDLE STATE (before typing) === */}
          {debouncedQuery.length < 2 && (
            <>
              {/* Recent Searches */}
              {recentSearches.length > 0 && (
                <div className="py-1">
                  <div className="px-4 py-1.5 flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                      Recent Searches
                    </span>
                    <button
                      onClick={clearRecentSearches}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Clear
                    </button>
                  </div>
                  {recentSearches.map((search, index) => (
                    <button
                      key={index}
                      onClick={() => handleSearch(search)}
                      className={`w-full px-4 py-2 flex items-center gap-3 hover:bg-gray-100 transition-colors ${
                        selectedIndex === index ? 'bg-gray-100' : ''
                      }`}
                    >
                      <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="flex-1 text-left text-sm text-gray-900">
                        {search}
                      </span>
                      <X
                        className="w-4 h-4 text-gray-400 hover:text-red-500 flex-shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          const updated = recentSearches.filter((_, i) => i !== index);
                          setRecentSearches(updated);
                          localStorage.setItem('recentSearches', JSON.stringify(updated));
                        }}
                      />
                    </button>
                  ))}
                </div>
              )}

              {/* Trending */}
              {trending?.length > 0 && (
                <div className="py-1 border-t border-gray-200">
                  <div className="px-4 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    Trending
                  </div>
                  {trending.map((product) => (
                    <button
                      key={product._id}
                      onClick={() => handleSelectProduct(product)}
                      className="w-full px-4 py-2 flex items-center gap-3 hover:bg-gray-100 transition-colors"
                    >
                      <div className="w-8 h-8 flex-shrink-0 bg-gray-100 rounded overflow-hidden">
                        {product.images?.[0] ? (
                          <img
                            src={normalizeImageUrl(product.images[0])}
                            alt={product.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400 text-[8px]">
                            No img
                          </div>
                        )}
                      </div>
                      <span className="flex-1 text-left text-sm text-gray-900 truncate">
                        {product.title}
                      </span>
                      <TrendingUp className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
});

// Highlight matching text in suggestions (bold the typed part)
function highlightMatch(text, query) {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <strong>{text.slice(idx, idx + query.length)}</strong>
      {text.slice(idx + query.length)}
    </>
  );
}

SearchAutocomplete.displayName = 'SearchAutocomplete';

export default SearchAutocomplete;
