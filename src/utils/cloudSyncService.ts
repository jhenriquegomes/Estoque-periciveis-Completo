/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Batch, WarehouseConfig, CloudBackupMetadata, CloudBackupPayload } from '../types';

const OFFLINE_CHANGES_KEY = 'estoque_pending_offline_changes';
const LOCAL_DEVICE_ID_KEY = 'estoque_device_id';
const LOCAL_BACKUP_VAULT_KEY = 'estoque_cloud_backup_vault';

export function getDeviceId(): string {
  let id = localStorage.getItem(LOCAL_DEVICE_ID_KEY);
  if (!id) {
    id = `device_${Math.random().toString(36).substring(2, 9)}_${Date.now().toString(36)}`;
    localStorage.setItem(LOCAL_DEVICE_ID_KEY, id);
  }
  return id;
}

export function getPendingOfflineCount(): number {
  try {
    const raw = localStorage.getItem(OFFLINE_CHANGES_KEY);
    return raw ? parseInt(raw, 10) || 0 : 0;
  } catch {
    return 0;
  }
}

export function recordOfflineChange(): number {
  const current = getPendingOfflineCount() + 1;
  localStorage.setItem(OFFLINE_CHANGES_KEY, current.toString());
  return current;
}

export function clearPendingOfflineChanges(): void {
  localStorage.removeItem(OFFLINE_CHANGES_KEY);
}

/**
 * Checks if the server/cloud endpoint is actually reachable with a lightweight ping
 */
export async function checkCloudConnection(timeoutMs = 4000): Promise<boolean> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return false;
  }

  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch('/api/backup/ping', {
      method: 'GET',
      headers: { 'Cache-Control': 'no-cache' },
      signal: controller.signal,
    });
    clearTimeout(id);
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Uploads current warehouse state to the cloud backend
 */
export async function uploadBackupToCloud(
  batches: Batch[],
  config: WarehouseConfig,
  reason: 'auto_reconnect' | 'manual' | 'auto_periodic' | 'batch_edit' | 'offline_sync' = 'manual',
  note?: string
): Promise<{ success: boolean; backupId?: string; error?: string; timestamp?: string }> {
  const deviceId = getDeviceId();
  const timestamp = new Date().toISOString();

  const payload: CloudBackupPayload = {
    deviceId,
    timestamp,
    reason,
    note,
    batches,
    config,
  };

  // Always save a copy in local offline backup vault for resilience
  try {
    const cachedVault = localStorage.getItem(LOCAL_BACKUP_VAULT_KEY);
    const vault = cachedVault ? JSON.parse(cachedVault) : [];
    vault.unshift({
      id: `local_${Date.now()}`,
      timestamp,
      batchesCount: batches.length,
      reason,
      payload,
    });
    localStorage.setItem(LOCAL_BACKUP_VAULT_KEY, JSON.stringify(vault.slice(0, 15)));
  } catch (e) {
    console.warn('Could not cache backup in local vault:', e);
  }

  try {
    // 1. Post to primary Cloud Backend endpoint
    const response = await fetch('/api/backup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `Erro de servidor HTTP ${response.status}`);
    }

    const result = await response.json();

    // 2. If user configured a custom external cloud Webhook or endpoint, post to it in parallel
    if (config.customCloudEndpoint && config.customCloudEndpoint.trim().startsWith('http')) {
      try {
        await fetch(config.customCloudEndpoint.trim(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            app: 'estoque-pro',
            event: 'backup_uploaded',
            backupId: result.backupId,
            timestamp,
            batchesCount: batches.length,
            streetsCount: Object.keys(config.streets || {}).length,
            data: payload,
          }),
        });
      } catch (externalErr) {
        console.warn('Custom external cloud webhook error (non-fatal):', externalErr);
      }
    }

    // Reset pending offline changes counter upon successful cloud backup
    clearPendingOfflineChanges();

    return {
      success: true,
      backupId: result.backupId,
      timestamp: result.timestamp || timestamp,
    };
  } catch (err: any) {
    console.error('Failed to upload backup to cloud:', err);
    return {
      success: false,
      error: err.message || 'Falha na comunicação com a nuvem',
    };
  }
}

/**
 * Fetch cloud backups history
 */
export async function fetchCloudBackupHistory(): Promise<CloudBackupMetadata[]> {
  try {
    const res = await fetch('/api/backup/history', {
      headers: { 'Cache-Control': 'no-cache' },
    });
    if (!res.ok) throw new Error('Falha ao obter histórico da nuvem');
    const data = await res.json();
    return data.history || [];
  } catch (err) {
    console.warn('Could not fetch cloud history, falling back to local vault:', err);
    try {
      const cachedVault = localStorage.getItem(LOCAL_BACKUP_VAULT_KEY);
      if (cachedVault) {
        const list = JSON.parse(cachedVault);
        return list.map((item: any) => ({
          id: item.id,
          timestamp: item.timestamp,
          batchesCount: item.batchesCount,
          streetsCount: 0,
          reason: item.reason,
          note: 'Cópia em Cache Local',
        }));
      }
    } catch {}
    return [];
  }
}

/**
 * Fetch the latest cloud backup
 */
export async function fetchLatestCloudBackup(): Promise<{ config: WarehouseConfig; batches: Batch[] } | null> {
  try {
    const res = await fetch('/api/backup/latest', {
      headers: { 'Cache-Control': 'no-cache' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.success && data.backup?.data) {
      return {
        config: data.backup.data.config,
        batches: data.backup.data.batches,
      };
    }
    return null;
  } catch (err) {
    console.error('Error fetching latest cloud backup:', err);
    return null;
  }
}

/**
 * Restore a specific backup from cloud by ID
 */
export async function restoreCloudBackupById(backupId: string): Promise<{ config: WarehouseConfig; batches: Batch[] }> {
  const res = await fetch(`/api/backup/restore/${encodeURIComponent(backupId)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!res.ok) {
    throw new Error(`Falha ao restaurar backup da nuvem (HTTP ${res.status})`);
  }

  const result = await res.json();
  if (!result.success || !result.backup?.data) {
    throw new Error('Conteúdo do backup da nuvem corrompido ou inválido');
  }

  return {
    config: result.backup.data.config,
    batches: result.backup.data.batches,
  };
}
