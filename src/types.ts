/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Batch {
  id: string;
  itemName: string;
  batchCode: string; // Code or ID of the batch (Lote)
  quantity: number;
  unit: string; // e.g., "kg", "caixas", "unidades", "pacotes", "paletes"
  entryDate: string; // YYYY-MM-DD
  expiryDate: string; // YYYY-MM-DD
  street: string;
  level: number; // 1-indexed floor (pavimento)
  column: number; // 1-indexed slot (coluna)
  notes?: string;
}

export type SlotType = 'available' | 'passage' | 'blocked';
export type SlotSize = 'standard' | 'double' | 'high_clearance';

export interface SlotConfig {
  type: SlotType; // 'available' = vaga utilizável, 'passage' = passagem livre/corredor, 'blocked' = pilar/obstrução estrutural
  size?: SlotSize; // 'standard' = 1 palete, 'double' = vaga dupla/larga, 'high_clearance' = pé direito alto
  label?: string; // e.g. "Passagem de Pedestres", "Pilar Central P-01", "Vaga Grande 2 Paletes"
  notes?: string;
}

export interface StreetConfig {
  id: string; // unique key, e.g. "batata", "corte"
  name: string; // Display name, e.g. "Rua da Batata", "Rua do Corte"
  levels: number; // Quantity of floors/levels (pavimentos)
  columns: number; // Quantity of columns per level (colunas por andar)
  color?: string; // Color identifier for visual themes, e.g., "blue", "rose"
  slots?: Record<string, SlotConfig>; // key: `${level}-${column}`, e.g. "1-4": { type: 'passage' }
}

export interface WarehouseConfig {
  streets: Record<string, StreetConfig>;
  alertThresholdDays: number; // Alert threshold in days (vencimento próximo)
  language?: 'PT' | 'ES' | 'EN';
  theme?: 'light' | 'dark';
  defaultBatchPattern?: {
    batchPrefix?: string;
    defaultUnit?: string;
    defaultDaysToExpiry?: number;
  };
  autoBackupOnReconnect?: boolean;
  customCloudEndpoint?: string;
  lastCloudBackupTime?: string;
}

export type ActiveTab = 'map' | 'alerts' | 'search' | 'occupancy' | 'settings';

export interface ExpiryStatus {
  isExpired: boolean;
  isExpiringSoon: boolean;
  daysRemaining: number;
  colorClass: string;
  textClass: string;
}

export interface CloudBackupMetadata {
  id: string;
  timestamp: string;
  batchesCount: number;
  streetsCount: number;
  reason: 'auto_reconnect' | 'manual' | 'auto_periodic' | 'batch_edit' | 'offline_sync';
  sizeBytes?: number;
  deviceId?: string;
  note?: string;
}

export interface CloudBackupPayload {
  id?: string;
  timestamp?: string;
  deviceId?: string;
  reason?: 'auto_reconnect' | 'manual' | 'auto_periodic' | 'batch_edit' | 'offline_sync';
  note?: string;
  config: WarehouseConfig;
  batches: Batch[];
}
