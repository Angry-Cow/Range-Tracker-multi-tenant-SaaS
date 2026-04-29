import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Search, Eye, Download, FileText, Image as ImageIcon, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';


import { useApp } from '../contexts/AppContext';
import { fetchRangeRecords } from '../lib/apiClient';
import type { RangeRecord } from '../types';
import { exportRecordsToCSV, exportRecordsPhotosToZip } from '../utils/exportRecords';
const PAGE_SIZE = 20;

type SortOption =
  | 'date_range'
  | 'range_location'
  | 'range_type'
  | 'practice_type'
  | 'target_type'
  | 'target_distance'
  | 'shooting_position'
  | 'firearm_type'
  | 'firearm_model'
  | 'ammunition';

interface FilterLevel {
  type: SortOption | '';
  value: string;
}

const defaultFilters: FilterLevel[] = [
  { type: '', value: '' },
  { type: '', value: '' },
  { type: '', value: '' },
];

const defaultDateRange = { start: '', end: '' };

export function PreviousRecordsScreen() {
  const { setCurrentScreen, selectedShooter, setSelectedRecordId, recordsCache, setRecordsCache } = useApp();

  const cacheHit =
    recordsCache !== null && selectedShooter !== null && recordsCache.shooterId === selectedShooter.id;

  const [records, setRecords] = useState<RangeRecord[]>(cacheHit ? recordsCache.records : []);
  const [filteredRecords, setFilteredRecords] = useState<RangeRecord[]>(cacheHit ? recordsCache.records : []);
  const [loading, setLoading] = useState(!cacheHit);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [exportingZip, setExportingZip] = useState(false);
  const [zipProgress, setZipProgress] = useState<{ current: number; total: number } | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);

  const [filters, setFilters] = useState<FilterLevel[]>(
    cacheHit ? (recordsCache.filters as FilterLevel[]) : defaultFilters
  );

  const [dateRange, setDateRange] = useState(
    cacheHit ? recordsCache.dateRange : defaultDateRange
  );

  const sortOptions: { value: SortOption; label: string }[] = [
    { value: 'date_range', label: 'Date Range' },
    { value: 'range_location', label: 'Range Location' },
    { value: 'range_type', label: 'Range Type' },
    { value: 'practice_type', label: 'Practice Type' },
    { value: 'target_type', label: 'Target Type' },
    { value: 'target_distance', label: 'Target Distance' },
    { value: 'shooting_position', label: 'Shooting Position' },
    { value: 'firearm_type', label: 'Firearm Type' },
    { value: 'firearm_model', label: 'Firearm Model' },
    { value: 'ammunition', label: 'Ammunition' },
  ];

  // Track whether we are mounting for the first time so we don't double-apply filters on load
  const initialMount = useRef(true);

  useEffect(() => {
    if (selectedShooter && !cacheHit) {
      loadRecords();
    }
  }, [selectedShooter]);

  useEffect(() => {
    if (initialMount.current) {
      initialMount.current = false;
      if (cacheHit) {
        applyFilters();
      }
      return;
    }
    applyFilters();
  }, [records, filters, dateRange]);

  async function loadRecords() {
    if (!selectedShooter) return;

    try {
      const result = await fetchRangeRecords(selectedShooter.id, 1, 500);
      const fetched = result?.data || [];
      setRecords(fetched);
      setFilteredRecords(fetched);
      setRecordsCache({
        shooterId: selectedShooter.id,
        records: fetched,
        filters: defaultFilters,
        dateRange: defaultDateRange,
      });
    } catch (error) {
      console.error('Error loading records:', error);
    } finally {
      setLoading(false);
    }
  }

  function applyFilters() {
    if (!selectedShooter) return;

    let filtered = [...records];

    filters.forEach((filter) => {
      if (!filter.type || !filter.value) return;

      if (filter.type === 'date_range') {
        if (dateRange.start && dateRange.end) {
          filtered = filtered.filter(
            (r) =>
              r.record_date >= dateRange.start && r.record_date <= dateRange.end
          );
        }
      } else {
        filtered = filtered.filter(
          (r) => r[filter.type as keyof RangeRecord] === filter.value
        );
      }
    });

    setFilteredRecords(filtered);
    setCurrentPage(1);
    setRecordsCache({
      shooterId: selectedShooter.id,
      records,
      filters,
      dateRange,
    });
  }

  function getAvailableOptions(level: number): SortOption[] {
    const usedTypes = filters
      .slice(0, level)
      .map((f) => f.type)
      .filter(Boolean);
    return sortOptions
      .filter((opt) => !usedTypes.includes(opt.value))
      .map((opt) => opt.value);
  }

  function getValuesForFilter(filterType: SortOption): string[] {
    if (!filterType) return [];

    const uniqueValues = new Set<string>();
    records.forEach((record) => {
      const value = record[filterType as keyof RangeRecord];
      if (value && typeof value === 'string') {
        uniqueValues.add(value);
      }
    });

    return Array.from(uniqueValues).sort();
  }

  function handleFilterTypeChange(level: number, type: SortOption | '') {
    const newFilters = [...filters];
    newFilters[level] = { type, value: '' };
    for (let i = level + 1; i < newFilters.length; i++) {
      newFilters[i] = { type: '', value: '' };
    }
    setFilters(newFilters);
  }

  function handleFilterValueChange(level: number, value: string) {
    const newFilters = [...filters];
    newFilters[level].value = value;
    setFilters(newFilters);
  }

  function handleClearFilters() {
    setFilters([
      { type: '', value: '' },
      { type: '', value: '' },
      { type: '', value: '' },
    ]);
    setDateRange({ start: '', end: '' });
  }

  function handleViewRecord(recordId: string) {
    setSelectedRecordId(recordId);
    setCurrentScreen('view-record');
  }

  async function handleExportCSV() {
    if (!selectedShooter || filteredRecords.length === 0) return;
    setExportError(null);
    setExportingCsv(true);
    try {
      exportRecordsToCSV(filteredRecords, selectedShooter);
    } catch {
      setExportError('Failed to export CSV. Please try again.');
    } finally {
      setExportingCsv(false);
    }
  }

  async function handleExportPhotos() {
    if (!selectedShooter || filteredRecords.length === 0) return;
    setExportError(null);
    setExportingZip(true);
    setZipProgress(null);
    try {
      await exportRecordsPhotosToZip(filteredRecords, selectedShooter, (current, total) => {
        setZipProgress({ current, total });
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to export photos.';
      setExportError(message);
    } finally {
      setExportingZip(false);
      setZipProgress(null);
    }
  }

  if (!selectedShooter) {
    return null;
  }

  const hasPhotos = filteredRecords.some((r) =>
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].some(
      (i) => r[`photo_${i}_url` as keyof RangeRecord]
    )
  );

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / PAGE_SIZE));
  const paginatedRecords = filteredRecords.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#5e5e5e' }}>
      <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
          <button
            type="button"
            aria-label="Back to Home"
            onClick={() => setCurrentScreen('home')}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Home
          </button>

          <div className="flex items-center gap-3 mb-6">
            <Search className="w-8 h-8" style={{ color: '#093057' }} />
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Previous Records</h1>
              <p className="text-slate-600">
                {selectedShooter.first_name} {selectedShooter.last_name}
              </p>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8 text-slate-500">Loading records...</div>
          ) : (
            <>
              <div className="bg-slate-50 rounded-lg p-6 mb-6 space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-slate-900">Filter Records</h3>
                  <button
                    type="button"
                    onClick={handleClearFilters}
                    className="text-sm font-medium"
                    style={{ color: '#093057' }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#0a4070'}
                    onMouseLeave={(e) => e.currentTarget.style.color = '#093057'}
                  >
                    Clear All
                  </button>
                </div>

                {filters.map((filter, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor={`filter-type-${index}`} className="block text-sm font-medium text-slate-700 mb-1">
                        Filter {index + 1} - Type
                      </label>
                      <select
                        id={`filter-type-${index}`}
                        value={filter.type}
                        onChange={(e) =>
                          handleFilterTypeChange(index, e.target.value as SortOption)
                        }
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      >
                        <option value="">-- Select Filter --</option>
                        {sortOptions
                          .filter((opt) =>
                            getAvailableOptions(index).includes(opt.value)
                          )
                          .map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor={`filter-value-${index}`} className="block text-sm font-medium text-slate-700 mb-1">
                        Filter {index + 1} - Value
                      </label>
                      {filter.type === 'date_range' ? (
                        <div className="flex gap-2">
                          <label htmlFor={`filter-date-start-${index}`} className="sr-only">Start date</label>
                          <input
                            id={`filter-date-start-${index}`}
                            type="date"
                            value={dateRange.start}
                            onChange={(e) =>
                              setDateRange({ ...dateRange, start: e.target.value })
                            }
                            className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                          />
                          <label htmlFor={`filter-date-end-${index}`} className="sr-only">End date</label>
                          <input
                            id={`filter-date-end-${index}`}
                            type="date"
                            value={dateRange.end}
                            onChange={(e) =>
                              setDateRange({ ...dateRange, end: e.target.value })
                            }
                            className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                          />
                        </div>
                      ) : (
                        <select
                          id={`filter-value-${index}`}
                          value={filter.value}
                          onChange={(e) =>
                            handleFilterValueChange(index, e.target.value)
                          }
                          disabled={!filter.type}
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:bg-slate-100"
                        >
                          <option value="">-- Select Value --</option>
                          {filter.type &&
                            getValuesForFilter(filter.type).map((value) => (
                              <option key={value} value={value}>
                                {value}
                              </option>
                            ))}
                        </select>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-slate-600">
                  {totalPages > 1
                    ? `Displaying ${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, filteredRecords.length)} of ${filteredRecords.length} record${filteredRecords.length !== 1 ? 's' : ''}`
                    : `${filteredRecords.length} record${filteredRecords.length !== 1 ? 's' : ''} found`}
                </p>

                {filteredRecords.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleExportCSV}
                      disabled={exportingCsv || exportingZip}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed bg-primary-900 hover:bg-primary-800"
                    >
                      {exportingCsv ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <FileText className="w-4 h-4" />
                      )}
                      {exportingCsv ? 'Exporting...' : 'Download CSV'}
                    </button>

                    <button
                      type="button"
                      onClick={handleExportPhotos}
                      disabled={exportingCsv || exportingZip || !hasPhotos}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed border"
                      style={{ borderColor: '#093057', color: '#093057' }}
                      onMouseEnter={(e) => {
                        if (!exportingCsv && !exportingZip && hasPhotos) {
                          e.currentTarget.style.backgroundColor = '#f0f4f8';
                        }
                      }}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      title={!hasPhotos ? 'No photos in the current filtered records' : ''}
                    >
                      {exportingZip ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <ImageIcon className="w-4 h-4" />
                      )}
                      {exportingZip
                        ? zipProgress
                          ? `Downloading ${zipProgress.current}/${zipProgress.total}...`
                          : 'Preparing...'
                        : 'Download Photos (.zip)'}
                    </button>

                    {!hasPhotos && filteredRecords.length > 0 && (
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Download className="w-3 h-3" />
                        No photos in current records
                      </span>
                    )}
                  </div>
                )}
              </div>

              {exportError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {exportError}
                </div>
              )}

              <div className="space-y-3">
                {filteredRecords.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    No records found. Try adjusting your filters.
                  </div>
                ) : (
                  paginatedRecords.map((record) => (
                    <div
                      key={record.id}
                      className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-lg font-semibold text-slate-900">
                              {record.record_date}
                            </span>
                            {record.range_location && (
                              <span className="text-sm text-slate-600">
                                {record.range_location}
                              </span>
                            )}
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm text-slate-600">
                            {record.target_type && (
                              <div>
                                <span className="font-medium">Target:</span> {record.target_type}
                              </div>
                            )}
                            {record.target_distance && (
                              <div>
                                <span className="font-medium">Distance:</span>{' '}
                                {record.target_distance}
                              </div>
                            )}
                            {record.firearm_model && (
                              <div>
                                <span className="font-medium">Firearm:</span>{' '}
                                {record.firearm_model}
                              </div>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          aria-label={`View record from ${record.record_date}`}
                          onClick={() => handleViewRecord(record.id)}
                          className="ml-4 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2 bg-primary-900 hover:bg-primary-800"
                        >
                          <Eye className="w-4 h-4" />
                          View
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {totalPages > 1 && (
                <div className="mt-6 flex items-center justify-between">
                  <span className="text-sm text-slate-500">
                    Page {currentPage} of {totalPages} &mdash; showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredRecords.length)} of {filteredRecords.length}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      aria-label="Previous page"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Previous
                    </button>
                    <button
                      type="button"
                      aria-label="Next page"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
