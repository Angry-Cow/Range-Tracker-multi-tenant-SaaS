import { useRef } from 'react';
import { Camera, Upload, RotateCw } from 'lucide-react';
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

  const showRotate = !!(preview || photoUrl);

  return (
    <div className="border border-slate-200 rounded-lg p-4">
      <h4 className="font-medium text-slate-700 mb-3">Photo {num}</h4>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Upload Photo</label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onFileChange?.(file);
            }}
            className="hidden"
          />
          <div
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const file = e.dataTransfer.files?.[0];
              if (file && file.type.startsWith('image/')) onFileChange?.(file);
            }}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all border-slate-300 hover:border-emerald-400 hover:bg-slate-50"
          >
            {displaySrc ? (
              <div className="relative rounded-lg overflow-hidden">
                <RotatedImage
                  src={displaySrc}
                  alt={`Preview ${num}`}
                  className="w-full h-auto rounded-lg transition-transform duration-300"
                  rotation={rotation}
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-40 transition-all rounded-lg flex items-center justify-center">
                  <Upload className="w-8 h-8 text-white opacity-0 hover:opacity-100 transition-opacity" />
                </div>
              </div>
            ) : (
              <div className="py-8">
                <Camera className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <p className="text-sm text-slate-600 font-medium mb-1">Drop image here or click to upload</p>
                <p className="text-xs text-slate-500">PNG, JPG, GIF up to 10MB</p>
              </div>
            )}
          </div>
          {showRotate && (
            <div className="flex justify-end mt-2">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onRotate?.(); }}
                className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors"
                title="Rotate 90° clockwise"
              >
                <RotateCw className="w-3.5 h-3.5" />
                Rotate
              </button>
            </div>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Notes</label>
          <textarea
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
