export interface Shooter {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  notes: string;
  created_at: string;
}

export interface SettingValue {
  id: string;
  shooter_id: string;
  category: string;
  value: string;
  sort_order: number;
  created_at: string;
}

export interface RangeRecord {
  id: string;
  shooter_id: string;
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
  photo_1_url: string;
  photo_1_rotation: number;
  notes_1: string;
  photo_2_url: string;
  photo_2_rotation: number;
  notes_2: string;
  photo_3_url: string;
  photo_3_rotation: number;
  notes_3: string;
  photo_4_url: string;
  photo_4_rotation: number;
  notes_4: string;
  photo_5_url: string;
  photo_5_rotation: number;
  notes_5: string;
  photo_6_url: string;
  photo_6_rotation: number;
  notes_6: string;
  photo_7_url: string;
  photo_7_rotation: number;
  notes_7: string;
  photo_8_url: string;
  photo_8_rotation: number;
  notes_8: string;
  photo_9_url: string;
  photo_9_rotation: number;
  notes_9: string;
  photo_10_url: string;
  photo_10_rotation: number;
  notes_10: string;
  photo_11_url: string;
  photo_11_rotation: number;
  notes_11: string;
  photo_12_url: string;
  photo_12_rotation: number;
  notes_12: string;
  photo_13_url: string;
  photo_13_rotation: number;
  notes_13: string;
  additional_notes: string;
  has_photos: boolean;
  created_at: string;
}

export type SettingCategory =
  | 'range_location'
  | 'range_type'
  | 'practice_type'
  | 'target_type'
  | 'target_distance'
  | 'shooting_position'
  | 'firearm_type'
  | 'firearm_model'
  | 'ammunition';
