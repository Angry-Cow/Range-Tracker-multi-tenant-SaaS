import { useState, useEffect, useReducer } from 'react';
import { ArrowLeft, CreditCard as Edit, Save, X, Download } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { apiClient as supabase, getPhotoPublicUrl } from '../lib/apiClient';
import type { RangeRecord, SettingValue, SettingCategory, Shooter } from '../types';
import { exportRecordToPDF } from '../utils/pdfExport.ts';
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

function recordToFormData(data: RangeRecord): FormData {
  return {
    record_date: data.record_date || '',
    range_location: data.range_location || '',
    range_type: data.range_type || '',
    practice_type: data.practice_type || '',
    target_type: data.target_type || '',
    target_distance: data.target_distance || '',
    shooting_position: data.shooting_position || '',
    firearm_type: data.firearm_type || '',
    firearm_model: data.firearm_model || '',
    ammunition: data.ammunition || '',
    conditions: data.conditions || '',
    weather: data.weather || '',
    photo_1_url: data.photo_1_url || '', photo_1_rotation: data.photo_1_rotation || 0, notes_1: data.notes_1 || '',
    photo_2_url: data.photo_2_url || '', photo_2_rotation: data.photo_2_rotation || 0, notes_2: data.notes_2 || '',
    photo_3_url: data.photo_3_url || '', photo_3_rotation: data.photo_3_rotation || 0, notes_3: data.notes_3 || '',
    photo_4_url: data.photo_4_url || '', photo_4_rotation: data.photo_4_rotation || 0, notes_4: data.notes_4 || '',
    photo_5_url: data.photo_5_url || '', photo_5_rotation: data.photo_5_rotation || 0, notes_5: data.notes_5 || '',
    photo_6_url: data.photo_6_url || '', photo_6_rotation: data.photo_6_rotation || 0, notes_6: data.notes_6 || '',
    photo_7_url: data.photo_7_url || '', photo_7_rotation: data.photo_7_rotation || 0, notes_7: data.notes_7 || '',
    photo_8_url: data.photo_8_url || '', photo_8_rotation: data.photo_8_rotation || 0, notes_8: data.notes_8 || '',
    photo_9_url: data.photo_9_url || '', photo_9_rotation: data.photo_9_rotation || 0, notes_9: data.notes_9 || '',
    photo_10_url: data.photo_10_url || '', photo_10_rotation: data.photo_10_rotation || 0, notes_10: data.notes_10 || '',
    photo_11_url: data.photo_11_url || '', photo_11_rotation: data.photo_11_rotation || 0, notes_11: data.notes_11 || '',
    photo_12_url: data.photo_12_url || '', photo_12_rotation: data.photo_12_rotation || 0, notes_12: data.notes_12 || '',
    photo_13_url: data.photo_13_url || '', photo_13_rotation: data.photo_13_rotation || 0, notes_13: data.notes_13 || '',
    additional_notes: data.additional_notes || '',
  };
}

const emptyFormData: FormData = {
  record_date: '', range_location: '', range_type: '', practice_type: '',
  target_type: '', target_distance: '', shooting_position: '', firearm_type: '',
  firearm_model: '', ammunition: '', conditions: '', weather: '',
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

export function ViewRecordScreen() {
  const { setCurrentScreen, selectedRecordId, setRecordsCache } = useApp();
  const [record, setRecord] = useState<RangeRecord | null>(null);
  const [shooter, setShooter] = useState<Shooter | null>(null);
  const [settings, setSettings] = useState<SettingValue[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string>('');
  const [photoFiles, setPhotoFiles] = useState<{ [key: number]: File }>({});
  const [photoPreviews, setPhotoPreviews] = useState<{ [key: number]: string }>({});
  const [exporting, setExporting] = useState(false);

  const [formData, dispatch] = useReducer(formReducer, emptyFormData);
  function setFormData(patch: Partial<FormData>) { dispatch({ type: 'MERGE', patch }); }

  useEffect(() => {
    if (selectedRecordId) {
      loadRecord();
    }
  }, [selectedRecordId]);

  async function loadRecord() {
    if (!selectedRecordId) return;

    try {
      const { data, error } = await supabase
        .from('range_records')
        .select('*')
        .eq('id', selectedRecordId)
        .single();

      if (error) throw error;
      setRecord(data);
      setFormData(recordToFormData(data));

      await loadSettings(data.shooter_id);
      await loadShooter(data.shooter_id);
    } catch (error) {
      console.error('Error loading record:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadShooter(shooterId: string) {
    try {
      const { data, error } = await supabase
        .from('shooters')
        .select('*')
        .eq('id', shooterId)
        .single();

      if (error) throw error;
      setShooter(data);
    } catch (error) {
      console.error('Error loading shooter:', error);
    }
  }

  async function loadSettings(shooterId: string) {
    try {
      const { data, error } = await supabase
        .from('setting_values')
        .select('*')
        .eq('shooter_id', shooterId)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setSettings(data || []);
    } catch (error) {
      console.error('Error loading settings:', error);
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
    setPhotoPreviews({ ...photoPreviews, [photoNumber]: URL.createObjectURL(compressed) });
  }

  async function incrementalSave() {
    if (!selectedRecordId || !record) return;

    setSaving(true);
    setSaveStatus('Saving...');

    try {
      const updatedFormData = { ...formData };

      for (const [photoNumber, file] of Object.entries(photoFiles)) {
        const num = parseInt(photoNumber);
        const fileExt = file.name.split('.').pop();
        const fileName = `${record.shooter_id}/${Date.now()}_photo${num}.${fileExt}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('range-photos')
          .upload(fileName, file, {});

        if (uploadError) throw uploadError;

        updatedFormData[`photo_${num}_url` as keyof typeof formData] = uploadData!.path;
      }

      const has_photos = computeHasPhotos(updatedFormData);

      const { error } = await supabase
        .from('range_records')
        .update({ ...updatedFormData, has_photos })
        .eq('id', selectedRecordId);

      if (error) throw error;

      setFormData(updatedFormData);
      setPhotoFiles({});
      setSaveStatus('Saved!');
      setTimeout(() => setSaveStatus(''), 3000);
    } catch (error) {
      console.error('Error updating record:', error);
      setSaveStatus('Error saving');
      setTimeout(() => setSaveStatus(''), 3000);
    } finally {
      setSaving(false);
    }
  }

  async function handleSave() {
    if (!selectedRecordId || !record) return;

    setSaving(true);

    try {
      const updatedFormData = { ...formData };

      for (const [photoNumber, file] of Object.entries(photoFiles)) {
        const num = parseInt(photoNumber);
        const fileExt = file.name.split('.').pop();
        const fileName = `${record.shooter_id}/${Date.now()}_photo${num}.${fileExt}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('range-photos')
          .upload(fileName, file, {});

        if (uploadError) throw uploadError;

        updatedFormData[`photo_${num}_url` as keyof typeof formData] = uploadData!.path;
      }

      const has_photos = computeHasPhotos(updatedFormData);

      const { error } = await supabase
        .from('range_records')
        .update({ ...updatedFormData, has_photos })
        .eq('id', selectedRecordId);

      if (error) throw error;

      const updatedRecord = { ...record, ...updatedFormData, has_photos };
      setFormData(updatedFormData);
      setPhotoFiles({});
      setPhotoPreviews({});
      setRecord(updatedRecord);
      setRecordsCache(null);
      setIsEditMode(false);
      setSaveStatus('Saved!');
      setTimeout(() => setSaveStatus(''), 3000);
    } catch (error) {
      console.error('Error updating record:', error);
      setSaveStatus('Error saving');
      setTimeout(() => setSaveStatus(''), 3000);
    } finally {
      setSaving(false);
    }
  }

  function handleCancelEdit() {
    if (record) {
      setFormData(recordToFormData(record));
    }
    setPhotoFiles({});
    setPhotoPreviews({});
    setIsEditMode(false);
  }

  async function handleExportPDF() {
    if (!record) return;

    setExporting(true);
    try {
      const shooterName = shooter
        ? `${shooter.first_name} ${shooter.last_name}`
        : undefined;

      await exportRecordToPDF({ record, shooterName });
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Error exporting PDF. Please try again.');
    } finally {
      setExporting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#5e5e5e' }}>
        <div className="text-slate-500">Loading record...</div>
      </div>
    );
  }

  if (!record) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#5e5e5e' }}>
        <div className="text-slate-500">Record not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#5e5e5e' }}>
      <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
          <div className="flex items-start justify-between mb-6">
            <button
              onClick={() => setCurrentScreen('previous-records')}
              className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Records
            </button>

            <div className="flex gap-2">
              {!isEditMode ? (
                <>
                  <button
                    onClick={handleExportPDF}
                    disabled={exporting}
                    className="bg-slate-600 hover:bg-slate-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    {exporting ? 'Exporting...' : 'Download PDF'}
                  </button>
                  <button
                    onClick={() => setIsEditMode(true)}
                    className="text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2 bg-primary-900 hover:bg-primary-800"
                  >
                    <Edit className="w-4 h-4" />
                    Edit
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleCancelEdit}
                    className="bg-slate-200 hover:bg-slate-300 text-slate-900 px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2 bg-primary-900 hover:bg-primary-800 disabled:bg-slate-500"
                  >
                    <Save className="w-4 h-4" />
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                </>
              )}
            </div>
          </div>

          {saveStatus && (
            <div className={`mb-4 px-4 py-2 rounded-lg text-sm font-medium ${saveStatus === 'Saved!' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
              {saveStatus === 'Saved!' ? 'Record saved successfully.' : saveStatus}
            </div>
          )}

          <h1 className="text-2xl font-bold text-slate-900 mb-6">
            Range Record - {record.record_date}
          </h1>

          {!isEditMode ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-500 mb-1">Date</label>
                  <p className="text-slate-900">{record.record_date}</p>
                </div>

                {record.range_location && (
                  <div>
                    <label className="block text-sm font-medium text-slate-500 mb-1">Range Location</label>
                    <p className="text-slate-900">{record.range_location}</p>
                  </div>
                )}

                {record.range_type && (
                  <div>
                    <label className="block text-sm font-medium text-slate-500 mb-1">Range Type</label>
                    <p className="text-slate-900">{record.range_type}</p>
                  </div>
                )}

                {record.practice_type && (
                  <div>
                    <label className="block text-sm font-medium text-slate-500 mb-1">Practice Type</label>
                    <p className="text-slate-900">{record.practice_type}</p>
                  </div>
                )}

                {record.target_type && (
                  <div>
                    <label className="block text-sm font-medium text-slate-500 mb-1">Target Type</label>
                    <p className="text-slate-900">{record.target_type}</p>
                  </div>
                )}

                {record.target_distance && (
                  <div>
                    <label className="block text-sm font-medium text-slate-500 mb-1">Target Distance</label>
                    <p className="text-slate-900">{record.target_distance}</p>
                  </div>
                )}

                {record.shooting_position && (
                  <div>
                    <label className="block text-sm font-medium text-slate-500 mb-1">Shooting Position</label>
                    <p className="text-slate-900">{record.shooting_position}</p>
                  </div>
                )}

                {record.firearm_type && (
                  <div>
                    <label className="block text-sm font-medium text-slate-500 mb-1">Firearm Type</label>
                    <p className="text-slate-900">{record.firearm_type}</p>
                  </div>
                )}

                {record.firearm_model && (
                  <div>
                    <label className="block text-sm font-medium text-slate-500 mb-1">Firearm Model</label>
                    <p className="text-slate-900">{record.firearm_model}</p>
                  </div>
                )}

                {record.ammunition && (
                  <div>
                    <label className="block text-sm font-medium text-slate-500 mb-1">Ammunition</label>
                    <p className="text-slate-900">{record.ammunition}</p>
                  </div>
                )}

                {record.conditions && (
                  <div>
                    <label className="block text-sm font-medium text-slate-500 mb-1">Conditions</label>
                    <p className="text-slate-900">{record.conditions}</p>
                  </div>
                )}

                {record.weather && (
                  <div>
                    <label className="block text-sm font-medium text-slate-500 mb-1">Weather</label>
                    <p className="text-slate-900">{record.weather}</p>
                  </div>
                )}
              </div>

              <div className="border-t border-slate-200 pt-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Photos & Notes</h3>
                <div className="space-y-6">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map((num) => (
                    <PhotoSlot
                      key={num}
                      num={num}
                      photoUrl={(record[`photo_${num}_url` as keyof RangeRecord] as string) || ''}
                      rotation={(record[`photo_${num}_rotation` as keyof RangeRecord] as number) || 0}
                      notes={(record[`notes_${num}` as keyof RangeRecord] as string) || ''}
                      readOnly
                      getPublicUrl={getPhotoPublicUrl}
                    />
                  ))}

                  {record.additional_notes && (
                    <div>
                      <label className="block text-sm font-medium text-slate-500 mb-1">
                        Additional Notes
                      </label>
                      <p className="text-slate-900 whitespace-pre-wrap">{record.additional_notes}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={formData.record_date}
                    onChange={(e) =>
                      setFormData({ record_date: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Range Location
                  </label>
                  <select
                    value={formData.range_location}
                    onChange={(e) =>
                      setFormData({ range_location: e.target.value })
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
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Range Type
                  </label>
                  <select
                    value={formData.range_type}
                    onChange={(e) =>
                      setFormData({ range_type: e.target.value })
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
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Practice Type
                  </label>
                  <select
                    value={formData.practice_type}
                    onChange={(e) =>
                      setFormData({ practice_type: e.target.value })
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
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Target Type
                  </label>
                  <select
                    value={formData.target_type}
                    onChange={(e) =>
                      setFormData({ target_type: e.target.value })
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
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Target Distance
                  </label>
                  <select
                    value={formData.target_distance}
                    onChange={(e) =>
                      setFormData({ target_distance: e.target.value })
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
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Shooting Position
                  </label>
                  <select
                    value={formData.shooting_position}
                    onChange={(e) =>
                      setFormData({ shooting_position: e.target.value })
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
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Firearm Type
                  </label>
                  <select
                    value={formData.firearm_type}
                    onChange={(e) =>
                      setFormData({ firearm_type: e.target.value })
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
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Firearm Model
                  </label>
                  <select
                    value={formData.firearm_model}
                    onChange={(e) =>
                      setFormData({ firearm_model: e.target.value })
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
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Ammunition
                  </label>
                  <select
                    value={formData.ammunition}
                    onChange={(e) =>
                      setFormData({ ammunition: e.target.value })
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
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Conditions
                  </label>
                  <input
                    type="text"
                    value={formData.conditions}
                    onChange={(e) =>
                      setFormData({ conditions: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Weather
                  </label>
                  <input
                    type="text"
                    value={formData.weather}
                    onChange={(e) =>
                      setFormData({ weather: e.target.value })
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
                      getPublicUrl={getPhotoPublicUrl}
                    />
                  ))}

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Additional Notes
                    </label>
                    <textarea
                      value={formData.additional_notes}
                      onChange={(e) =>
                        setFormData({ additional_notes: e.target.value })
                      }
                      rows={4}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                      placeholder="Any other notes..."
                    />
                  </div>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
