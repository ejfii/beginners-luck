import React, { useState } from 'react';
import '../styles/SearchFilter.css';

function SearchFilter({ onSearch }) {
  const [query, setQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    venue: ''
  });

  const handleSearch = (e) => {
    const newQuery = e.target.value;
    setQuery(newQuery);
    onSearch(newQuery, filters);
  };

  const handleFilterChange = (filterName, value) => {
    const newFilters = { ...filters, [filterName]: value };
    setFilters(newFilters);
    onSearch(query, newFilters);
  };

  const handleReset = () => {
    setQuery('');
    setFilters({ status: '', venue: '' });
    onSearch('', {});
  };

  return (
    <div className="search-filter">
      <div className="search-box">
        <input
          type="text"
          placeholder="Search negotiations..."
          value={query}
          onChange={handleSearch}
          className="search-input"
        />
        <button
          className="filter-toggle"
          onClick={() => setShowFilters(!showFilters)}
          title="Toggle advanced filters"
        >
          ⚙️
        </button>
      </div>

      {showFilters && (
        <div className="advanced-filters">
          <div className="filter-group">
            <label>Status</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="settled">Settled</option>
              <option value="initiated">Initiated</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Venue</label>
            <input
              type="text"
              placeholder="Filter by venue..."
              value={filters.venue}
              onChange={(e) => handleFilterChange('venue', e.target.value)}
            />
          </div>

          <button className="btn btn-secondary" onClick={handleReset}>
            Reset Filters
          </button>
        </div>
      )}
    </div>
  );
}

export default SearchFilter;
