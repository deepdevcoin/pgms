import { Role } from '../../core/models';

export type ModuleKey = 'payments' | 'complaints' | 'notices' | 'vacate' | 'services' | 'amenities' | 'menu' | 'sublets';
export type Row = Record<string, any>;

export interface FieldConfig {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'time' | 'textarea' | 'select' | 'checkbox';
  options?: string[];
  optionLabel?: (option: string) => string;
  show?: (role: Role | null) => boolean;
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
