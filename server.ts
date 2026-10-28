import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';

const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = path.resolve(process.cwd(), 'data');
const BACKUPS_FILE = path.join(DATA_DIR, 'cloud_backups.json');
const LATEST_BACKUP_FILE = path.join(DATA_DIR, 'latest_backup.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

interface BackupRecord {
  id: string;
  timestamp: string;
  batchesCount: number;
  streetsCount: number;
  reason: 'auto_reconnect' | 'manual' | 'auto_periodic' | 'batch_edit' | 'offline_sync';
  sizeBytes?: number;
  deviceId?: string;
  note?: string;
  data: {
    app: string;
    version: string;
    timestamp: string;
    config: any;
    batches: any[];
  };
}

function loadBackupsHistory(): BackupRecord[] {
  try {
    if (fs.existsSync(BACKUPS_FILE)) {
      const content = fs.readFileSync(BACKUPS_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.error('Error reading backups file:', err);
  }
  return [];
}

function saveBackupsHistory(backups: BackupRecord[]) {
  try {
    fs.writeFileSync(BACKUPS_FILE, JSON.stringify(backups, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing backups file:', err);
  }
}

async function startServer() {
  const app = express();

  // JSON payload parser
  app.use(express.json({ limit: '25mb' }));

  // --- CLOUD BACKUP API ROUTES ---

  // Health / Ping endpoint for connection check
  app.get('/api/backup/ping', (_req, res) => {
    res.json({
      status: 'ok',
      online: true,
      serverTime: new Date().toISOString(),
      cloudStorage: 'active',
      version: '1.0.0',
    });
  });

  // GET: Latest cloud backup
  app.get('/api/backup/latest', (_req, res) => {
    try {
      if (fs.existsSync(LATEST_BACKUP_FILE)) {
        const content = fs.readFileSync(LATEST_BACKUP_FILE, 'utf-8');
        return res.json({ success: true, backup: JSON.parse(content) });
      }

      const history = loadBackupsHistory();
      if (history.length > 0) {
        return res.json({ success: true, backup: history[0] });
      }

      return res.status(404).json({ success: false, message: 'Nenhum backup encontrado na nuvem' });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // GET: Backups history (metadata only)
  app.get('/api/backup/history', (_req, res) => {
    try {
      const history = loadBackupsHistory();
      // Return metadata without giant data payload for snappy listing
      const metadataList = history.map((b) => ({
        id: b.id,
        timestamp: b.timestamp,
        batchesCount: b.batchesCount,
        streetsCount: b.streetsCount,
        reason: b.reason,
        sizeBytes: b.sizeBytes,
        deviceId: b.deviceId,
        note: b.note,
      }));
      res.json({ success: true, history: metadataList });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // POST: Upload and save cloud backup
  app.post('/api/backup', (req, res) => {
    try {
      const { batches, config, timestamp, deviceId, reason, note } = req.body;

      if (!batches || !Array.isArray(batches) || !config) {
        return res.status(400).json({
          success: false,
          error: 'Formato inválido. Os campos "batches" (array) e "config" (objeto) são obrigatórios.',
        });
      }

      const backupId = `bkp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const backupTimestamp = timestamp || new Date().toISOString();
      const payloadString = JSON.stringify(req.body);
      const sizeBytes = Buffer.byteLength(payloadString, 'utf-8');

      const backupRecord: BackupRecord = {
        id: backupId,
        timestamp: backupTimestamp,
        batchesCount: batches.length,
        streetsCount: config.streets ? Object.keys(config.streets).length : 0,
        reason: reason || 'manual',
        sizeBytes,
        deviceId: deviceId || 'browser-client',
        note: note || '',
        data: {
          app: 'estoque-pro',
          version: '1.0',
          timestamp: backupTimestamp,
          config,
          batches,
        },
      };

      // Save as latest backup
      fs.writeFileSync(LATEST_BACKUP_FILE, JSON.stringify(backupRecord, null, 2), 'utf-8');

      // Add to history (keep top 50 recent backups)
      const history = loadBackupsHistory();
      const updatedHistory = [backupRecord, ...history].slice(0, 50);
      saveBackupsHistory(updatedHistory);

      console.log(`[Cloud Backup] Successfully saved backup ${backupId} (${batches.length} batches, reason: ${reason || 'manual'})`);

      return res.status(201).json({
        success: true,
        backupId,
        timestamp: backupTimestamp,
        batchesCount: batches.length,
        streetsCount: backupRecord.streetsCount,
        message: 'Backup salvo na nuvem com sucesso',
      });
    } catch (err: any) {
      console.error('[Cloud Backup Error]', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // POST: Restore specific backup by ID
  app.post('/api/backup/restore/:id', (req, res) => {
    try {
      const { id } = req.params;
      const history = loadBackupsHistory();
      const found = history.find((b) => b.id === id);

      if (!found) {
        return res.status(404).json({ success: false, error: 'Backup não encontrado' });
      }

      return res.json({ success: true, backup: found });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // DELETE: Clear all cloud backup history
  app.delete('/api/backup/history', (_req, res) => {
    try {
      saveBackupsHistory([]);
      if (fs.existsSync(LATEST_BACKUP_FILE)) {
        fs.unlinkSync(LATEST_BACKUP_FILE);
      }
      return res.json({ success: true, message: 'Histórico de backups na nuvem limpo com sucesso' });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // --- VITE MIDDLEWARE / STATIC ASSETS ---
  const isProd = process.env.NODE_ENV === 'production';
  if (isProd) {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Estoque PRO] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
