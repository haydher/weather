import { useState, useEffect, useCallback, useRef } from 'react';
import { DEBOUNCE_MS, STORAGE_KEY, abbreviateState } from '../lib/constants.js';
import { searchPlaces } from '../lib/nominatim.js';

function formatPlaceDisplay(place) {
  if (!place) return '';
  const addr = place.address || {};
  const city = addr.city || addr.town || addr.village || addr.municipality || place.name || '';
  const stateAbbr = addr.state_code || abbreviateState(addr.state || place.state) || 'US';
  return [city, stateAbbr].filter(Boolean).length ? `${city}, ${stateAbbr}`.trim() : (place.display_name || '');
}

export function useGeocodeSearch(setSelectedPlace) {
  const [query, setQuery] = useState('');
  const [geocodeResults, setGeocodeResults] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const debounceRef = useRef(null);
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    if (searchFocused && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchFocused]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setGeocodeResults([]);
      setDropdownOpen(false);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const list = await searchPlaces(query);
        setGeocodeResults(list);
        setDropdownOpen(list.length > 0);
      } catch (_) {
        setGeocodeResults([]);
        setDropdownOpen(false);
      }
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const handleSelectPlace = useCallback(
    (place) => {
      const displayName = formatPlaceDisplay(place) || place.display_name || `${place.name || ''}, ${place.state || 'US'}`.trim();
      const item = {
        lat: parseFloat(place.lat),
        lon: parseFloat(place.lon),
        displayName,
      };
      setSelectedPlace(item);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(item));
      } catch (_) {}
      setQuery('');
      setGeocodeResults([]);
      setDropdownOpen(false);
      setSearchFocused(false);
    },
    [setSelectedPlace]
  );

  return {
    query,
    setQuery,
    geocodeResults,
    dropdownOpen,
    setDropdownOpen,
    searchFocused,
    setSearchFocused,
    formatPlaceDisplay,
    handleSelectPlace,
    dropdownRef,
    searchInputRef,
  };
}
