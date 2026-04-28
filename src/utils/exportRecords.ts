import JSZip from 'jszip';
import type { RangeRecord, Shooter } from '../types';
import { getPhotoPublicUrl } from '../lib/apiClient';

const CSV_FIELDS: { key: keyof RangeRecord; label: string }[] = [
  { key: 'record_date', label: 'Date' },
  { key: 'range_location', label: 'Range Location' },
  { key: 'range_type', label: 'Range Type' },
  { key: 'practice_type', label: 'Practice Type' },
  { key: 'target_type', label: 'Target Type' },
  { key: 'target_distance', label: 'Target Distance' },
  { key: 'shooting_position', label: 'Shooting Position' },
  { key: 'firearm_type', label: 'Firearm Type' },
  { key: 'firearm_model', label: 'Firearm Model' },
  { key: 'ammunition', label: 'Ammunition' },
  { key: 'conditions', label: 'Conditions' },
  { key: 'weather', label: 'Weather' },
  { key: 'notes_1', label: 'Photo 1 Notes' },
  { key: 'notes_2', label: 'Photo 2 Notes' },
  { key: 'notes_3', label: 'Photo 3 Notes' },
  { key: 'notes_4', label: 'Photo 4 Notes' },
  { key: 'notes_5', label: 'Photo 5 Notes' },
  { key: 'notes_6', label: 'Photo 6 Notes' },
  { key: 'notes_7', label: 'Photo 7 Notes' },
  { key: 'notes_8', label: 'Photo 8 Notes' },
  { key: 'notes_9', label: 'Photo 9 Notes' },
  { key: 'notes_10', label: 'Photo 10 Notes' },
  { key: 'notes_11', label: 'Photo 11 Notes' },
  { key: 'notes_12', label: 'Photo 12 Notes' },
  { key: 'notes_13', label: 'Photo 13 Notes' },
  { key: 'additional_notes', label: 'Additional Notes' },
];

function escapeCsvValue(value: string | null | undefined): string {
  if (value == null) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);

  // In iframe contexts (e.g. bolt.new preview), link.click() is silently blocked by the browser.
  // window.open bypasses this restriction by opening the blob URL in a new top-level tab.
  if (window.self !== window.top) {
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    return;
  }

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export function exportRecordsToCSV(records: RangeRecord[], shooter: Shooter): void {
  const headers = CSV_FIELDS.map((f) => f.label).join(',');
  const rows = records.map((record) =>
    CSV_FIELDS.map((f) => escapeCsvValue(record[f.key] as string)).join(',')
  );

  const csvContent = [headers, ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const shooterName = `${shooter.first_name}_${shooter.last_name}`.replace(/\s+/g, '_');
  triggerBlobDownload(blob, `${shooterName}_range_records.csv`);
}

interface PhotoEntry {
  url: string;
  date: string;
  photoNumber: number;
  recordId: string;
}

function getExtensionFromUrl(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const lastSegment = pathname.split('/').pop() || '';
    const dotIndex = lastSegment.lastIndexOf('.');
    if (dotIndex !== -1) {
      const ext = lastSegment.slice(dotIndex + 1).split('?')[0].toLowerCase();
      if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic'].includes(ext)) {
        return ext === 'jpeg' ? 'jpg' : ext;
      }
    }
  } catch {
    // ignore
  }
  return 'jpg';
}

const CONCURRENCY = 6;

async function fetchWithRetry(url: string, retries = 2): Promise<Blob> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.blob();
    } catch (err) {
      lastError = err;
      if (attempt < retries) await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
    }
  }
  throw lastError;
}

export async function exportRecordsPhotosToZip(
  records: RangeRecord[],
  shooter: Shooter,
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  const photos: PhotoEntry[] = [];

  for (const record of records) {
    for (let i = 1; i <= 13; i++) {
      const rawUrl = record[`photo_${i}_url` as keyof RangeRecord] as string;
      if (rawUrl) {
        photos.push({ url: getPhotoPublicUrl(rawUrl), date: record.record_date, photoNumber: i, recordId: record.id });
      }
    }
  }

  if (photos.length === 0) {
    throw new Error('No photos found in the selected records.');
  }

  const zip = new JSZip();
  let completed = 0;

  // Process in batches to avoid overwhelming the browser connection limit and CDN rate limits
  for (let i = 0; i < photos.length; i += CONCURRENCY) {
    const batch = photos.slice(i, i + CONCURRENCY);
    await Promise.all(
      batch.map(async (photo) => {
        try {
          const blob = await fetchWithRetry(photo.url);
          const ext = getExtensionFromUrl(photo.url);
          const filename = `${photo.date}-${photo.recordId.slice(0, 8)}-photo${photo.photoNumber}.${ext}`;
          zip.file(filename, blob);
        } catch {
          // skip photos that fail after retries
        } finally {
          completed++;
          onProgress?.(completed, photos.length);
        }
      })
    );
  }

  const content = await zip.generateAsync({ type: 'blob' });
  const shooterName = `${shooter.first_name}_${shooter.last_name}`.replace(/\s+/g, '_');
  triggerBlobDownload(content, `${shooterName}_range_photos.zip`);
}
