import { PinIcon } from '../ui/icons/PinIcon.jsx';
import { SearchIcon } from '../ui/icons/SearchIcon.jsx';
import { SearchDropdown } from './SearchDropdown.jsx';

export function SearchBar({
  query,
  setQuery,
  searchFocused,
  setSearchFocused,
  selectedPlace,
  locationDetecting,
  geocodeResults,
  dropdownOpen,
  formatPlaceDisplay,
  handleSelectPlace,
  dropdownRef,
  searchInputRef,
}) {
  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <div
        className="glass-card search-pill"
        style={{
          display: 'flex',
          alignItems: 'center',
          borderRadius: 9999,
          padding: '10px 16px',
          minHeight: 48,
          border: '1px solid var(--border-glass)',
          background: 'rgba(10, 15, 30, 0.7)',
          position: 'relative',
          overflow: 'visible',
        }}
      >
        <div style={{ flex: 1, position: 'relative', minWidth: 0, overflow: 'visible' }}>
          <span
            aria-hidden
            style={{
              position: 'absolute',
              left: 0,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 18,
              height: 18,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
            }}
          >
            <PinIcon />
          </span>
          <label
            className="search-label"
            htmlFor="city-search"
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              paddingLeft: 26,
              margin: 0,
              cursor: 'pointer',
              color: selectedPlace ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontFamily: 'var(--font-body)',
              fontSize: 15,
              letterSpacing: '0.04em',
              opacity: searchFocused ? 0 : 1,
              pointerEvents: searchFocused ? 'none' : 'auto',
              transition: 'opacity 150ms ease',
            }}
            onClick={() => setSearchFocused(true)}
          >
            {locationDetecting ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="search-pulse" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-clear)' }} />
                Detecting…
              </span>
            ) : selectedPlace ? (
              selectedPlace.displayName
            ) : (
              'Search a US city…'
            )}
          </label>
          <input
            ref={searchInputRef}
            id="city-search"
            type="text"
            placeholder="Search a US city..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setTimeout(() => { if (!dropdownOpen) setSearchFocused(false); }, 180)}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              bottom: 0,
              width: '100%',
              boxSizing: 'border-box',
              paddingLeft: 26,
              border: 'none',
              background: 'transparent',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-body)',
              fontSize: 15,
              outline: 'none',
              letterSpacing: '0.04em',
              opacity: searchFocused ? 1 : 0,
              pointerEvents: searchFocused ? 'auto' : 'none',
              transition: 'opacity 150ms ease',
            }}
            aria-label="Search a US city"
          />
        </div>
        <button
          type="button"
          onClick={() => setSearchFocused(true)}
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            border: 'none',
            background: 'rgba(255,255,255,0.08)',
            color: 'var(--text-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
          }}
          aria-label="Search"
        >
          <SearchIcon />
        </button>
      </div>
      {dropdownOpen && geocodeResults.length > 0 && (
        <SearchDropdown
          results={geocodeResults}
          formatPlaceDisplay={formatPlaceDisplay}
          onSelectPlace={handleSelectPlace}
        />
      )}
    </div>
  );
}
