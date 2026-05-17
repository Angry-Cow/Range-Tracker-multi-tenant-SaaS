import { useRef } from 'react';
import { Camera, Upload, RotateCw, Image as ImageIcon } from 'lucide-react';
import { Save } from 'lucide-react';

function RotatedImage({ src, rotation, alt, className }: { src: string; rotation: number; alt: string; className?: string }) {
  const isPortrait = rotation === 90 || rotation === 270;

  if (!isPortrait) {
    return (
      <img
        src={src}
        alt={alt}
        className={className}
        style={{ transform: `rotate(${rotation}deg)` }}
      />
    );
  }

  return (
    <div style={{ position: 'relative', width: '100%', paddingBottom: '133.33%' /* 3:4 */ }}>
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', borderRadius: 'inherit' }}>
        <img
          src={src}
          alt={alt}
          className={className}
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: '100%',
            height: 'auto',
            transform: `translate(-50%, -50%) rotate(${rotation}deg) scale(1.3333)`,
            transformOrigin: 'center center',
          }}
        />
      </div>
    </div>
  );
}

interface PhotoSlotProps {
  num: number;
  photoUrl: string;
  rotation: number;
  notes: string;
  preview?: string;
  onFileChange?: (file: File) => void;
  onRotate?: () => void;
  onNotesChange?: (notes: string) => void;
  onSave?: () => void;
  saving?: boolean;
  saveStatus?: string;
  readOnly?: boolean;
  getPublicUrl?: (path: string) => string;
}

export function PhotoSlot({
  num,
  photoUrl,
  rotation,
  notes,
  preview,
  onFileChange,
  onRotate,
  onNotesChange,
  onSave,
  saving,
  saveStatus,
  readOnly = false,
  getPublicUrl,
}: PhotoSlotProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileChange?.(file);
    e.target.value = '';
  };

  if (readOnly) {
    if (!photoUrl && !notes) return null;

    return (
      <div className="border border-slate-200 rounded-lg p-4">
        <h4 className="font-medium text-slate-700 mb-3">Photo {num}</h4>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {photoUrl && (
            <div className="rounded-lg overflow-hidden">
              <RotatedImage
                src={getPublicUrl ? getPublicUrl(photoUrl) : photoUrl}
                alt={`Photo ${num}`}
                className="w-full h-auto rounded-lg transition-transform duration-300"
                rotation={rotation}
              />
            </div>
          )}
          {notes && (
            <div>
              <label className="block text-sm font-medium text-slate-500 mb-1">Notes</label>
              <p className="text-slate-900 whitespace-pre-wrap">{notes}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  const displaySrc = preview
    ? preview
    : photoUrl
    ? (getPublicUrl ? getPublicUrl(photoUrl) : photoUrl)
    : null;

  return (
    <div className="border border-slate-200 rounded-lg p-4">
      <h4 className="font-medium text-slate-700 mb-3">Photo {num}</h4>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          {/* Gallery / library picker */}
          <input
            ref={fileInputRef}
            id={`photo-file-${num}`}
            aria-label={`Choose photo ${num} from library`}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          {/* Camera picker */}
          <input
            ref={cameraInputRef}
            id={`photo-camera-${num}`}
            aria-label={`Take photo ${num} with camera`}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            className="hidden"
          />
          {displaySrc ? (
            <div>
              <div className="rounded-lg overflow-hidden">
                <RotatedImage
                  src={displaySrc}
                  alt={`Photo ${num}`}
                  className="w-full h-auto rounded-lg transition-transform duration-300"
                  rotation={rotation}
                />
              </div>
              <div className="flex items-center gap-2 mt-2">
                <button
                  type="button"
                  aria-label={`Take new photo ${num} with camera`}
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <Camera className="w-3.5 h-3.5" />
                  Camera
                </button>
                <button
                  type="button"
                  aria-label={`Replace photo ${num} from library`}
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Library
                </button>
                <button
                  type="button"
                  aria-label={`Rotate photo ${num} 90 degrees clockwise`}
                  onClick={onRotate}
                  className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors"
                  title="Rotate 90° clockwise"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  Rotate
                </button>
              </div>
            </div>
          ) : (
            <div
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const file = e.dataTransfer.files?.[0];
                if (file && file.type.startsWith('image/')) onFileChange?.(file);
              }}
              className="border-2 border-dashed rounded-lg p-6 text-center transition-all border-slate-300 hover:border-emerald-400 hover:bg-slate-50"
            >
              <div className="py-4">
                <Camera className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                <p className="text-xs text-slate-500 mb-4">Drop image here or choose an option below</p>
                <div className="flex items-center justify-center gap-3">
                  <button
                    type="button"
                    aria-label={`Take photo ${num} with camera`}
                    onClick={() => cameraInputRef.current?.click()}
                    className="flex items-center gap-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-lg transition-colors"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    Take Photo
                  </button>
                  <button
                    type="button"
                    aria-label={`Choose photo ${num} from library`}
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-lg transition-colors"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    Choose Photo
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        <div>
          <label htmlFor={`photo-notes-${num}`} className="block text-sm font-medium text-slate-700 mb-2">Notes</label>
          <textarea
            id={`photo-notes-${num}`}
            value={notes}
            onChange={(e) => onNotesChange?.(e.target.value)}
            rows={4}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
            placeholder={`Notes for photo ${num}...`}
          />
        </div>
      </div>
      {onSave && (
        <div className="flex items-center justify-end gap-3 mt-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            aria-label={`Save photo ${num} progress`}
            onClick={onSave}
            disabled={saving}
            className="disabled:cursor-not-allowed text-white px-4 py-1.5 text-sm rounded-lg transition-colors flex items-center gap-2 bg-primary-900 hover:bg-primary-800 disabled:bg-slate-500"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? 'Saving...' : 'Save Progress'}
          </button>
          {saveStatus && (
            <span className={`text-xs font-medium ${saveStatus === 'Saved!' ? 'text-emerald-600' : 'text-red-600'}`}>
              {saveStatus}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
