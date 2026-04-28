import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Settings as SettingsIcon, Plus, Trash2, GripVertical } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { apiClient as supabase } from '../lib/apiClient';
import type { SettingValue, SettingCategory } from '../types';

const CATEGORIES: { key: SettingCategory; label: string }[] = [
  { key: 'range_location', label: 'Range Location' },
  { key: 'range_type', label: 'Range Type' },
  { key: 'practice_type', label: 'Practice Type' },
  { key: 'target_type', label: 'Target Type' },
  { key: 'target_distance', label: 'Target Distance' },
  { key: 'shooting_position', label: 'Shooting Position' },
  { key: 'firearm_type', label: 'Firearm Type' },
  { key: 'firearm_model', label: 'Firearm Model' },
  { key: 'ammunition', label: 'Ammunition' },
];

export function SettingsScreen() {
  const { setCurrentScreen, selectedShooter, planInfo } = useApp();
  const [settings, setSettings] = useState<SettingValue[]>([]);
  const [newValues, setNewValues] = useState<Record<SettingCategory, string>>({
    range_location: '',
    range_type: '',
    practice_type: '',
    target_type: '',
    target_distance: '',
    shooting_position: '',
    firearm_type: '',
    firearm_model: '',
    ammunition: '',
  });
  const [loading, setLoading] = useState(true);

  // Drag state: which item is being dragged, and which slot it's hovering over
  const dragItem = useRef<{ id: string; category: string } | null>(null);
  const dragOverItem = useRef<{ id: string; category: string } | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const settingsLimit = planInfo && !planInfo.unlimited ? (planInfo.settings_limit ?? null) : null;

  useEffect(() => {
    if (selectedShooter) {
      loadSettings();
    }
  }, [selectedShooter]);

  async function loadSettings() {
    if (!selectedShooter) return;

    try {
      const { data, error } = await supabase
        .from('setting_values')
        .select('*')
        .eq('shooter_id', selectedShooter.id)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Normalize: if all sort_orders are 0 (legacy data), assign sequential values per category
      const raw = (data || []) as SettingValue[];
      const needsNormalization = raw.length > 0 && raw.every(s => s.sort_order === 0);
      if (needsNormalization) {
        const normalized = normalizeSortOrders(raw);
        setSettings(normalized);
        await persistSortOrders(normalized);
      } else {
        setSettings(raw);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  }

  function normalizeSortOrders(items: SettingValue[]): SettingValue[] {
    const byCat: Record<string, SettingValue[]> = {};
    for (const item of items) {
      if (!byCat[item.category]) byCat[item.category] = [];
      byCat[item.category].push(item);
    }
    const result: SettingValue[] = [];
    for (const cat of Object.keys(byCat)) {
      byCat[cat].forEach((item, idx) => {
        result.push({ ...item, sort_order: idx });
      });
    }
    return result;
  }

  async function persistSortOrders(items: SettingValue[]) {
    // Fire-and-forget batch update — one update per item
    for (const item of items) {
      supabase
        .from('setting_values')
        .update({ sort_order: item.sort_order })
        .eq('id', item.id)
        .then(() => {/* ignore */});
    }
  }

  async function handleAddValue(category: SettingCategory) {
    if (!selectedShooter || !newValues[category].trim()) return;

    const categoryValues = getValuesForCategory(category);
    if (settingsLimit !== null && categoryValues.length >= settingsLimit) {
      alert(`Settings limit reached. Your Free plan allows up to ${settingsLimit} entries per category per shooter.`);
      return;
    }

    const nextOrder = categoryValues.length > 0
      ? Math.max(...categoryValues.map(v => v.sort_order)) + 1
      : 0;

    try {
      const { data, error } = await supabase
        .from('setting_values')
        .insert([
          {
            shooter_id: selectedShooter.id,
            category,
            value: newValues[category].trim(),
            sort_order: nextOrder,
          },
        ])
        .select()
        .single();

      if (error) {
        if (error.message && error.message.toLowerCase().includes('limit')) {
          alert(error.message);
          return;
        }
        throw error;
      }

      setSettings([...settings, data]);
      setNewValues({ ...newValues, [category]: '' });
    } catch (error) {
      console.error('Error adding value:', error);
      alert('Error adding value. Please try again.');
    }
  }

  async function handleDeleteValue(id: string) {
    try {
      const { error } = await supabase
        .from('setting_values')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setSettings(settings.filter(s => s.id !== id));
    } catch (error) {
      console.error('Error deleting value:', error);
      alert('Error deleting value. Please try again.');
    }
  }

  function getValuesForCategory(category: SettingCategory) {
    return settings.filter(s => s.category === category);
  }

  // --- Drag and drop handlers ---

  function handleDragStart(item: SettingValue) {
    dragItem.current = { id: item.id, category: item.category };
    setDraggingId(item.id);
  }

  function handleDragEnter(item: SettingValue) {
    if (!dragItem.current || dragItem.current.category !== item.category) return;
    dragOverItem.current = { id: item.id, category: item.category };
    setDragOverId(item.id);
  }

  function handleDragEnd() {
    const from = dragItem.current;
    const to = dragOverItem.current;

    if (!from || !to || from.id === to.id || from.category !== to.category) {
      dragItem.current = null;
      dragOverItem.current = null;
      setDraggingId(null);
      setDragOverId(null);
      return;
    }

    const category = from.category as SettingCategory;
    const catItems = [...getValuesForCategory(category)];
    const fromIdx = catItems.findIndex(s => s.id === from.id);
    const toIdx = catItems.findIndex(s => s.id === to.id);

    if (fromIdx === -1 || toIdx === -1) return;

    // Reorder within category
    const [moved] = catItems.splice(fromIdx, 1);
    catItems.splice(toIdx, 0, moved);

    // Assign new sort_order values (0-based sequential)
    const reordered = catItems.map((item, idx) => ({ ...item, sort_order: idx }));

    // Merge back into full settings list
    const otherSettings = settings.filter(s => s.category !== category);
    const newSettings = [...otherSettings, ...reordered].sort((a, b) => {
      if (a.category !== b.category) return a.category.localeCompare(b.category);
      return a.sort_order - b.sort_order;
    });

    setSettings(newSettings);
    persistSortOrders(reordered);

    dragItem.current = null;
    dragOverItem.current = null;
    setDraggingId(null);
    setDragOverId(null);
  }

  if (!selectedShooter) {
    return null;
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#5e5e5e' }}>
      <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
          <button
            onClick={() => setCurrentScreen('home')}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Home
          </button>

          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <SettingsIcon className="w-8 h-8" style={{ color: '#093057' }} />
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
                <p className="text-slate-600">
                  {selectedShooter.first_name} {selectedShooter.last_name}
                </p>
              </div>
            </div>
            <button
              onClick={() => setCurrentScreen('shooter-profile')}
              className="text-white px-4 py-2 rounded-lg font-semibold transition-colors bg-primary-900 hover:bg-primary-800"
            >
              View Shooter Profile
            </button>
          </div>

          {settingsLimit !== null && (
            <div className="mb-6 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
              <span className="font-semibold">Free Plan</span> — up to {settingsLimit} entries per category for this shooter
            </div>
          )}

          {loading ? (
            <div className="text-center py-8 text-slate-500">Loading settings...</div>
          ) : (
            <div className="space-y-6">
              {CATEGORIES.map(({ key, label }) => {
                const categoryValues = getValuesForCategory(key);
                const atCategoryLimit = settingsLimit !== null && categoryValues.length >= settingsLimit;

                return (
                  <div key={key} className="border border-slate-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-slate-900">{label}</h3>
                      {settingsLimit !== null && (
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${atCategoryLimit ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'}`}>
                          {categoryValues.length}/{settingsLimit}
                        </span>
                      )}
                    </div>

                    <div className="space-y-1 mb-3">
                      {categoryValues.map((setting) => (
                        <div
                          key={setting.id}
                          draggable
                          onDragStart={() => handleDragStart(setting)}
                          onDragEnter={() => handleDragEnter(setting)}
                          onDragEnd={handleDragEnd}
                          onDragOver={(e) => e.preventDefault()}
                          className={`flex items-center gap-2 px-3 py-2 rounded transition-all select-none ${
                            draggingId === setting.id
                              ? 'opacity-40 bg-slate-100'
                              : dragOverId === setting.id
                              ? 'bg-blue-50 border border-blue-300'
                              : 'bg-slate-50 border border-transparent'
                          }`}
                        >
                          <GripVertical className="w-4 h-4 text-slate-400 cursor-grab active:cursor-grabbing flex-shrink-0" />
                          <span className="flex-1 text-slate-700">{setting.value}</span>
                          <button
                            onClick={() => handleDeleteValue(setting.id)}
                            className="text-red-400 hover:text-red-600 transition-colors flex-shrink-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      {categoryValues.length === 0 && (
                        <p className="text-slate-400 text-sm italic px-1">No values added yet</p>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newValues[key]}
                        onChange={(e) =>
                          setNewValues({ ...newValues, [key]: e.target.value })
                        }
                        placeholder={atCategoryLimit ? `Limit reached (${settingsLimit} max)` : `Add new ${label.toLowerCase()}`}
                        disabled={atCategoryLimit}
                        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm disabled:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-400"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddValue(key);
                          }
                        }}
                      />
                      <button
                        onClick={() => handleAddValue(key)}
                        disabled={atCategoryLimit}
                        className="text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-1 disabled:cursor-not-allowed bg-primary-900 hover:bg-primary-800 disabled:bg-slate-400"
                      >
                        <Plus className="w-4 h-4" />
                        Add
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
