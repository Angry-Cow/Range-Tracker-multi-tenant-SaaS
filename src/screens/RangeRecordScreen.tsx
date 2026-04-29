import { useState, useEffect, useReducer } from 'react';
import { ArrowLeft, Save, LogOut } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { apiClient as supabase, clearTenantCredentials } from '../lib/apiClient';
import type { SettingValue, SettingCategory } from '../types';
import type { PlanInfo } from '../contexts/AppContext';
import { compressImage } from '../utils/compressImage';
import { PhotoSlot } from '../components/PhotoSlot';

type FormData = {
  record_date: string;
  range_location: string;
  range_type: string;
  practice_type: string;
  target_type: string;
  target_distance: string;
  shooting_position: string;
  firearm_type: string;
  firearm_model: string;
  ammunition: string;
  conditions: string;
  weather: string;
  photo_1_url: string; photo_1_rotation: number; notes_1: string;
  photo_2_url: string; photo_2_rotation: number; notes_2: string;
  photo_3_url: string; photo_3_rotation: number; notes_3: string;
  photo_4_url: string; photo_4_rotation: number; notes_4: string;
  photo_5_url: string; photo_5_rotation: number; notes_5: string;
  photo_6_url: string; photo_6_rotation: number; notes_6: string;
  photo_7_url: string; photo_7_rotation: number; notes_7: string;
  photo_8_url: string; photo_8_rotation: number; notes_8: string;
  photo_9_url: string; photo_9_rotation: number; notes_9: string;
  photo_10_url: string; photo_10_rotation: number; notes_10: string;
  photo_11_url: string; photo_11_rotation: number; notes_11: string;
  photo_12_url: string; photo_12_rotation: number; notes_12: string;
  photo_13_url: string; photo_13_rotation: number; notes_13: string;
  additional_notes: string;
};

type FormAction = { type: 'SET_FIELD'; field: keyof FormData; value: string | number }
  | { type: 'MERGE'; patch: Partial<FormData> };

function formReducer(state: FormData, action: FormAction): FormData {
  if (action.type === 'SET_FIELD') return { ...state, [action.field]: action.value };
  if (action.type === 'MERGE') return { ...state, ...action.patch };
  return state;
}

function computeHasPhotos(data: FormData): boolean {
  for (let i = 1; i <= 13; i++) {
    if (data[`photo_${i}_url` as keyof FormData]) return true;
  }
  return false;
}

const initialFormData: FormData = {
  record_date: new Date().toISOString().split('T')[0],
  range_location: '', range_type: '', practice_type: '', target_type: '',
  target_distance: '', shooting_position: '', firearm_type: '', firearm_model: '',
  ammunition: '', conditions: '', weather: '',
  photo_1_url: '', photo_1_rotation: 0, notes_1: '',
  photo_2_url: '', photo_2_rotation: 0, notes_2: '',
  photo_3_url: '', photo_3_rotation: 0, notes_3: '',
  photo_4_url: '', photo_4_rotation: 0, notes_4: '',
  photo_5_url: '', photo_5_rotation: 0, notes_5: '',
  photo_6_url: '', photo_6_rotation: 0, notes_6: '',
  photo_7_url: '', photo_7_rotation: 0, notes_7: '',
  photo_8_url: '', photo_8_rotation: 0, notes_8: '',
  photo_9_url: '', photo_9_rotation: 0, notes_9: '',
  photo_10_url: '', photo_10_rotation: 0, notes_10: '',
  photo_11_url: '', photo_11_rotation: 0, notes_11: '',
  photo_12_url: '', photo_12_rotation: 0, notes_12: '',
  photo_13_url: '', photo_13_rotation: 0, notes_13: '',
  additional_notes: '',
};

export function RangeRecordScreen() {
  const { setCurrentScreen, selectedShooter, planInfo } = useApp();
  const [settings, setSettings] = useState<SettingValue[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string>('');
  const [recordId, setRecordId] = useState<string | null>(null);

  const [formData, dispatch] = useReducer(formReducer, initialFormData);
  function setFormData(patch: Partial<FormData>) { dispatch({ type: 'MERGE', patch }); }

  const [photoFiles, setPhotoFiles] = useState<{ [key: number]: File }>({});
  const [photoPreviews, setPhotoPreviews] = useState<{ [key: number]: string }>({});
  const [shooterRecordCount, setShooterRecordCount] = useState<number>(0);

  useEffect(() => {
    if (selectedShooter) {
      loadSettings();
    }
  }, [selectedShooter]);

  async function loadSettings() {
    if (!selectedShooter) return;

    try {
      const [settingsResult, recordsResult] = await Promise.all([
        supabase.from('setting_values').select('*').eq('shooter_id', selectedShooter.id).order('sort_order', { ascending: true }),
        supabase.from('range_records').select('*').eq('shooter_id', selectedShooter.id),
      ]);

      if (settingsResult.error) throw settingsResult.error;
      setSettings(settingsResult.data || []);

      if (!recordsResult.error && Array.isArray(recordsResult.data)) {
        setShooterRecordCount(recordsResult.data.length);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  }

  function getOptionsForCategory(category: SettingCategory) {
    return settings.filter(s => s.category === category);
  }

  async function handlePhotoChange(photoNumber: number, file: File) {
    if (!file) return;

    setSaveStatus('Compressing...');
    const compressed = await compressImage(file);
    setSaveStatus('');

    setPhotoFiles({ ...photoFiles, [photoNumber]: compressed });

    const previewUrl = URL.createObjectURL(compressed);
    setPhotoPreviews({ ...photoPreviews, [photoNumber]: previewUrl });
  }

  function isAtRecordLimit(currentPlanInfo: PlanInfo | null, currentRecordId: string | null): boolean {
    if (currentRecordId) return false;
    if (!currentPlanInfo || currentPlanInfo.unlimited) return false;
    if (currentPlanInfo.records_limit === null) return false;
    return shooterRecordCount >= currentPlanInfo.records_limit;
  }

  async function incrementalSave() {
    if (!selectedShooter) return;

    if (isAtRecordLimit(planInfo, recordId)) {
      setSaveStatus('Record limit reached');
      setTimeout(() => setSaveStatus(''), 3000);
      alert(`Record limit reached. Your Free plan allows up to ${planInfo!.records_limit} range records per shooter. Please upgrade to add more.`);
      return;
    }

    setSaving(true);
    setSaveStatus('Saving...');

    try {
      const updatedFormData = { ...formData };

      for (const [photoNumber, file] of Object.entries(photoFiles)) {
        const num = parseInt(photoNumber);
        const fileExt = file.name.split('.').pop();
        const fileName = `${selectedShooter.id}/${Date.now()}_photo${num}.${fileExt}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('range-photos')
          .upload(fileName, file, {});

        if (uploadError) throw uploadError;

        updatedFormData[`photo_${num}_url` as keyof typeof formData] = uploadData!.path;
      }

      const has_photos = computeHasPhotos(updatedFormData);

      if (recordId) {
        const { error } = await supabase
          .from('range_records')
          .update({ ...updatedFormData, has_photos })
          .eq('id', recordId);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('range_records')
          .insert([
            {
              shooter_id: selectedShooter.id,
              ...updatedFormData,
              has_photos,
            },
          ])
          .select()
          .single();

        if (error) throw error;
        setRecordId(data.id);
      }

      setFormData(updatedFormData);
      setPhotoFiles({});
      setSaveStatus('Saved!');
      setTimeout(() => setSaveStatus(''), 3000);
    } catch (error) {
      console.error('Error saving record:', error);
      setSaveStatus('Error saving');
      setTimeout(() => setSaveStatus(''), 3000);
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedShooter) return;

    if (isAtRecordLimit(planInfo, recordId)) {
      alert(`Record limit reached. Your Free plan allows up to ${planInfo!.records_limit} range records per shooter. Please upgrade to add more.`);
      return;
    }

    setSaving(true);

    try {
      const updatedFormData = { ...formData };

      for (const [photoNumber, file] of Object.entries(photoFiles)) {
        const num = parseInt(photoNumber);
        const fileExt = file.name.split('.').pop();
        const fileName = `${selectedShooter.id}/${Date.now()}_photo${num}.${fileExt}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('range-photos')
          .upload(fileName, file, {});

        if (uploadError) throw uploadError;

        updatedFormData[`photo_${num}_url` as keyof typeof formData] = uploadData!.path;
      }

      const has_photos = computeHasPhotos(updatedFormData);

      if (recordId) {
        const { error } = await supabase
          .from('range_records')
          .update({ ...updatedFormData, has_photos })
          .eq('id', recordId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('range_records')
          .insert([
            {
              shooter_id: selectedShooter.id,
              ...updatedFormData,
              has_photos,
            },
          ]);

        if (error) throw error;
      }

      alert('Range record saved successfully!');
      setCurrentScreen('home');
    } catch (error) {
      console.error('Error saving record:', error);
      alert('Error saving record. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  if (!selectedShooter) {
    return null;
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#5e5e5e' }}>
      <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
          <div className="flex items-start justify-between mb-6">
            <button
              type="button"
              aria-label="Back to Home"
              onClick={() => setCurrentScreen('home')}
              className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Home
            </button>
            <button
              type="button"
              aria-label="Log out"
              onClick={() => { clearTenantCredentials(); window.location.reload(); }}
              className="flex items-center gap-2 text-sm text-slate-500 hover:text-red-600 transition-colors border border-slate-200 hover:border-red-300 px-3 py-1.5 rounded-lg"
            >
              <LogOut className="w-4 h-4" />
              Log Out
            </button>
          </div>

          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-900">New Range Record</h1>
            <p className="text-slate-600">
              {selectedShooter.first_name} {selectedShooter.last_name}
            </p>
          </div>

          {planInfo && !planInfo.unlimited && !recordId && (
            <div className={`mb-6 px-4 py-3 rounded-lg border text-sm ${shooterRecordCount >= (planInfo.records_limit ?? 0) ? 'bg-red-50 border-red-200 text-red-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
              {shooterRecordCount >= (planInfo.records_limit ?? 0)
                ? `Record limit reached. Your Free plan allows up to ${planInfo.records_limit} range records per shooter. Please upgrade to add more.`
                : <><span className="font-semibold">Free Plan</span> — {shooterRecordCount} of {planInfo.records_limit} range records used for this shooter</>
              }
            </div>
          )}

          {loading ? (
            <div className="text-center py-8 text-slate-500">Loading form...</div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="record-date" className="block text-sm font-medium text-slate-700 mb-1">
                    Date
                  </label>
                  <input
                    id="record-date"
                    type="date"
                    value={formData.record_date}
                    onChange={(e) =>
                      setFormData({ ...formData, record_date: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="record-range-location" className="block text-sm font-medium text-slate-700 mb-1">
                    Range Location
                  </label>
                  <select
                    id="record-range-location"
                    value={formData.range_location}
                    onChange={(e) =>
                      setFormData({ ...formData, range_location: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  >
                    <option value="">-- Select --</option>
                    {getOptionsForCategory('range_location').map((opt) => (
                      <option key={opt.id} value={opt.value}>
                        {opt.value}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="record-range-type" className="block text-sm font-medium text-slate-700 mb-1">
                    Range Type
                  </label>
                  <select
                    id="record-range-type"
                    value={formData.range_type}
                    onChange={(e) =>
                      setFormData({ ...formData, range_type: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  >
                    <option value="">-- Select --</option>
                    {getOptionsForCategory('range_type').map((opt) => (
                      <option key={opt.id} value={opt.value}>
                        {opt.value}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="record-practice-type" className="block text-sm font-medium text-slate-700 mb-1">
                    Practice Type
                  </label>
                  <select
                    id="record-practice-type"
                    value={formData.practice_type}
                    onChange={(e) =>
                      setFormData({ ...formData, practice_type: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  >
                    <option value="">-- Select --</option>
                    {getOptionsForCategory('practice_type').map((opt) => (
                      <option key={opt.id} value={opt.value}>
                        {opt.value}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="record-target-type" className="block text-sm font-medium text-slate-700 mb-1">
                    Target Type
                  </label>
                  <select
                    id="record-target-type"
                    value={formData.target_type}
                    onChange={(e) =>
                      setFormData({ ...formData, target_type: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  >
                    <option value="">-- Select --</option>
                    {getOptionsForCategory('target_type').map((opt) => (
                      <option key={opt.id} value={opt.value}>
                        {opt.value}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="record-target-distance" className="block text-sm font-medium text-slate-700 mb-1">
                    Target Distance
                  </label>
                  <select
                    id="record-target-distance"
                    value={formData.target_distance}
                    onChange={(e) =>
                      setFormData({ ...formData, target_distance: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  >
                    <option value="">-- Select --</option>
                    {getOptionsForCategory('target_distance').map((opt) => (
                      <option key={opt.id} value={opt.value}>
                        {opt.value}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="record-shooting-position" className="block text-sm font-medium text-slate-700 mb-1">
                    Shooting Position
                  </label>
                  <select
                    id="record-shooting-position"
                    value={formData.shooting_position}
                    onChange={(e) =>
                      setFormData({ ...formData, shooting_position: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  >
                    <option value="">-- Select --</option>
                    {getOptionsForCategory('shooting_position').map((opt) => (
                      <option key={opt.id} value={opt.value}>
                        {opt.value}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="record-firearm-type" className="block text-sm font-medium text-slate-700 mb-1">
                    Firearm Type
                  </label>
                  <select
                    id="record-firearm-type"
                    value={formData.firearm_type}
                    onChange={(e) =>
                      setFormData({ ...formData, firearm_type: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  >
                    <option value="">-- Select --</option>
                    {getOptionsForCategory('firearm_type').map((opt) => (
                      <option key={opt.id} value={opt.value}>
                        {opt.value}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="record-firearm-model" className="block text-sm font-medium text-slate-700 mb-1">
                    Firearm Model
                  </label>
                  <select
                    id="record-firearm-model"
                    value={formData.firearm_model}
                    onChange={(e) =>
                      setFormData({ ...formData, firearm_model: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  >
                    <option value="">-- Select --</option>
                    {getOptionsForCategory('firearm_model').map((opt) => (
                      <option key={opt.id} value={opt.value}>
                        {opt.value}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="record-ammunition" className="block text-sm font-medium text-slate-700 mb-1">
                    Ammunition
                  </label>
                  <select
                    id="record-ammunition"
                    value={formData.ammunition}
                    onChange={(e) =>
                      setFormData({ ...formData, ammunition: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  >
                    <option value="">-- Select --</option>
                    {getOptionsForCategory('ammunition').map((opt) => (
                      <option key={opt.id} value={opt.value}>
                        {opt.value}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="record-conditions" className="block text-sm font-medium text-slate-700 mb-1">
                    Conditions
                  </label>
                  <input
                    id="record-conditions"
                    type="text"
                    value={formData.conditions}
                    onChange={(e) =>
                      setFormData({ ...formData, conditions: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="record-weather" className="block text-sm font-medium text-slate-700 mb-1">
                    Weather
                  </label>
                  <input
                    id="record-weather"
                    type="text"
                    value={formData.weather}
                    onChange={(e) =>
                      setFormData({ ...formData, weather: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pb-4 border-b border-slate-200">
                <button
                  type="button"
                  onClick={incrementalSave}
                  disabled={saving}
                  className="disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg transition-colors flex items-center gap-2 bg-primary-900 hover:bg-primary-800 disabled:bg-slate-500"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save Progress'}
                </button>
                {saveStatus && (
                  <span className={`text-sm font-medium ${saveStatus === 'Saved!' ? '' : 'text-red-600'}`} style={saveStatus === 'Saved!' ? { color: '#093057' } : {}}>
                    {saveStatus}
                  </span>
                )}
              </div>

              <div className="border-t border-slate-200 pt-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Photos & Notes</h3>
                <div className="space-y-6">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map((num) => (
                    <PhotoSlot
                      key={num}
                      num={num}
                      photoUrl={formData[`photo_${num}_url` as keyof typeof formData] as string}
                      rotation={(formData[`photo_${num}_rotation` as keyof typeof formData] as number) || 0}
                      notes={formData[`notes_${num}` as keyof typeof formData] as string}
                      preview={photoPreviews[num]}
                      onFileChange={(file) => handlePhotoChange(num, file)}
                      onRotate={() => {
                        const key = `photo_${num}_rotation` as keyof typeof formData;
                        const current = (formData[key] as number) || 0;
                        setFormData({ [key]: (current + 90) % 360 });
                      }}
                      onNotesChange={(val) => setFormData({ [`notes_${num}`]: val })}
                      onSave={incrementalSave}
                      saving={saving}
                      saveStatus={saveStatus}
                    />
                  ))}

                  <div>
                    <label htmlFor="record-additional-notes" className="block text-sm font-medium text-slate-700 mb-2">
                      Additional Notes
                    </label>
                    <textarea
                      id="record-additional-notes"
                      value={formData.additional_notes}
                      onChange={(e) =>
                        setFormData({ ...formData, additional_notes: e.target.value })
                      }
                      rows={4}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                      placeholder="Any other notes..."
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setCurrentScreen('home')}
                  className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-900 font-semibold py-3 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 bg-primary-900 hover:bg-primary-800 disabled:bg-slate-500"
                >
                  <Save className="w-5 h-5" />
                  {saving ? 'Saving...' : 'Save Record'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
