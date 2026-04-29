import { Role } from '../../core/models';

export type ModuleKey = 'payments' | 'complaints' | 'notices' | 'vacate' | 'services' | 'amenities' | 'menu' | 'sublets';
export type Row = Record<string, any>;

export interface FieldConfig {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'time' | 'time-dial' | 'textarea' | 'select' | 'search-select' | 'checkbox';
  options?: string[];
  optionLabel?: (option: string) => string;
  optionSearchText?: (option: string) => string;
  min?: string;
  max?: string;
  step?: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  minKey?: string;
  maxKey?: string;
  wide?: boolean;
  show?: (role: Role | null) => boolean;
  visibleWhen?: (form: Row) => boolean;
}

export interface ActionConfig {
  label: string;
  icon: string;
  show: (row: Row, role: Role | null) => boolean;
  run: (row: Row) => void;
}

export type CellClassValue = string | string[] | Record<string, boolean> | null | undefined;

export interface ModuleConfig {
  title: string;
  crumb: string;
  subtitle: string;
  columns: string[];
  createLabel?: string;
  fields?: FieldConfig[];
}

export interface SummaryCard {
  label: string;
  value: string;
  meta?: string;
  money?: boolean;
}
