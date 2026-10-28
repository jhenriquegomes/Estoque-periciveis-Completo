/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { 
  Warehouse, 
  Bell, 
  Search, 
  Settings, 
  AlertTriangle, 
  ShieldAlert,
  ClipboardList,
  FileDown,
  Wifi,
  WifiOff,
  Cloud,
  CloudUpload,
  CheckCircle2,
  RefreshCw,
  Smartphone,
  X,
  BarChart3
} from 'lucide-react';
import { Batch, WarehouseConfig, ActiveTab } from './types';
import { SAMPLE_BATCHES, DEFAULT_CONFIG } from './data/sampleData';
import { WarehouseMap } from './components/WarehouseMap';
import { AlertsList } from './components/AlertsList';
import { SearchAndFilters } from './components/SearchAndFilters';
import { SettingsPanel } from './components/SettingsPanel';
import { OccupancyChart } from './components/OccupancyChart';
import { calculateExpiryStatus } from './utils';
import { exportInventoryToPDF } from './utils/pdfGenerator';
import { getTranslation } from './utils/translations';
import { 
  uploadBackupToCloud, 
  getPendingOfflineCount, 
  recordOfflineChange, 
  clearPendingOfflineChanges 
} from './utils/cloudSyncService';
import { usePWAInstall } from './hooks/usePWAInstall';

export default function App() {
  // Real browser online/offline status tracking
  const [realOnline, setRealOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  // Optional simulated offline mode for user testing & verification in AI Studio preview
  const [isSimulatedOffline, setIsSimulatedOffline] = useState(false);

  // Effective online state
  const isOnline = realOnline && !isSimulatedOffline;

  // Pending offline changes counter
  const [pendingOfflineChanges, setPendingOfflineChanges] = useState<number>(() => getPendingOfflineCount());

  // Cloud sync states
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);
  const [lastCloudSyncTime, setLastCloudSyncTime] = useState<string | null>(null);

  // Floating toast notification state
  const [toastNotification, setToastNotification] = useState<{
    id: string;
    type: 'success' | 'info' | 'error';
    title: string;
    description?: string;
  } | null>(null);

  // PWA installation hook
  const { isInstallable, isInstalled, install: installPWA } = usePWAInstall();

  useEffect(() => {
    const handleOnline = () => setRealOnline(true);
    const handleOffline = () => setRealOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load batches and configs from localStorage or fallback to defaults
  const [batches, setBatches] = useState<Batch[]>(() => {
    const saved = localStorage.getItem('estoque_pereciveis_batches');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error loading batches', e);
      }
    }
    return SAMPLE_BATCHES;
  });

  const [config, setConfig] = useState<WarehouseConfig>(() => {
    const saved = localStorage.getItem('estoque_pereciveis_config');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.streets) {
          return parsed;
        }
        // Migrate old config structure
        return {
          alertThresholdDays: parsed?.alertThresholdDays ?? 5,
          streets: {
            batata: {
              id: 'batata',
              name: 'da Batata',
              levels: parsed?.batata?.levels ?? 4,
              columns: parsed?.batata?.columns ?? 5,
            },
            corte: {
              id: 'corte',
              name: 'do Corte',
              levels: parsed?.corte?.levels ?? 3,
              columns: parsed?.corte?.columns ?? 4,
            },
          },
          autoBackupOnReconnect: true,
        };
      } catch (e) {
        console.error('Error loading config', e);
      }
    }
    return {
      ...DEFAULT_CONFIG,
      autoBackupOnReconnect: true,
    };
  });

  // Initialize lastCloudSyncTime from config if available
  useEffect(() => {
    if (config.lastCloudBackupTime && !lastCloudSyncTime) {
      setLastCloudSyncTime(config.lastCloudBackupTime);
    }
  }, [config.lastCloudBackupTime]);

  const [activeTab, setActiveTab] = useState<ActiveTab>('map');
  const t = getTranslation(config.language);

  // Interactive locator states to pass deep-link coordinates to the WarehouseMap
  const [locatorAction, setLocatorAction] = useState<{
    street: string;
    level: number;
    column: number;
    trigger: number;
  } | null>(null);

  // Sync state to localStorage on changes
  useEffect(() => {
    localStorage.setItem('estoque_pereciveis_batches', JSON.stringify(batches));
  }, [batches]);

  useEffect(() => {
    localStorage.setItem('estoque_pereciveis_config', JSON.stringify(config));
  }, [config]);

  // Record an offline change if currently disconnected
  const checkAndRecordOfflineMutation = () => {
    if (!isOnline) {
      const newCount = recordOfflineChange();
      setPendingOfflineChanges(newCount);
    }
  };

  // Inventory logic handlers
  const handleAddBatch = (newBatchData: Omit<Batch, 'id'>) => {
    const newBatch: Batch = {
      ...newBatchData,
      id: `b-${Date.now()}`,
    };
    setBatches((prev) => [newBatch, ...prev]);
    checkAndRecordOfflineMutation();
  };

  const handleDeleteBatch = (id: string) => {
    const itemToRemove = batches.find((b) => b.id === id);
    setBatches((prev) => prev.filter((b) => b.id !== id));
    checkAndRecordOfflineMutation();

    if (itemToRemove) {
      setToastNotification({
        id: `toast_del_${Date.now()}`,
        type: 'info',
        title: config.language === 'EN' ? 'Batch Removed from Inventory' : 'Lote Removido do Estoque',
        description: `${itemToRemove.itemName} (${itemToRemove.quantity} ${itemToRemove.unit}) - ${config.language === 'EN' ? 'Discharged successfully' : 'Baixa realizada com sucesso'}.`,
      });
      setTimeout(() => {
        setToastNotification((curr) => (curr?.id.startsWith('toast_del_') ? null : curr));
      }, 4000);
    }
  };

  const handleUpdateBatch = (updatedBatch: Batch) => {
    setBatches((prev) => prev.map((b) => (b.id === updatedBatch.id ? updatedBatch : b)));
    checkAndRecordOfflineMutation();
  };

  const handleUpdateConfig = (newConfig: WarehouseConfig) => {
    setConfig(newConfig);
    checkAndRecordOfflineMutation();
  };

  const handleResetSampleData = () => {
    setBatches(SAMPLE_BATCHES);
    setConfig(DEFAULT_CONFIG);
    checkAndRecordOfflineMutation();
  };

  const handleClearAllData = () => {
    setBatches([]);
    checkAndRecordOfflineMutation();
  };

  const handleImportAllData = (importedBatches: Batch[], importedConfig: WarehouseConfig) => {
    setBatches(importedBatches);
    setConfig(importedConfig);
    checkAndRecordOfflineMutation();
  };

  // Cross-navigation locator function (Alert List -> Map Drawer Zoom)
  const handleLocateInMap = (street: string, level: number, column: number) => {
    setLocatorAction({
      street,
      level,
      column,
      trigger: Math.random(),
    });
    setActiveTab('map');
  };

  // Execute upload of backup to cloud (reconnect or manual)
  const executeCloudBackup = async (reason: 'auto_reconnect' | 'manual' = 'manual'): Promise<boolean> => {
    if (!isOnline) {
      setToastNotification({
        id: `toast_${Date.now()}`,
        type: 'info',
        title: 'Modo Offline Ativo',
        description: 'Os dados continuam salvos no seu aparelho. O backup será enviado para a nuvem automaticamente assim que a conexão retornar.',
      });
      return false;
    }

    setIsSyncingCloud(true);
    try {
      const result = await uploadBackupToCloud(batches, config, reason);
      if (result.success) {
        const timestamp = result.timestamp || new Date().toISOString();
        setLastCloudSyncTime(timestamp);
        setPendingOfflineChanges(0);
        clearPendingOfflineChanges();

        const updatedConfig = { ...config, lastCloudBackupTime: timestamp };
        setConfig(updatedConfig);
        localStorage.setItem('estoque_pereciveis_config', JSON.stringify(updatedConfig));

        setToastNotification({
          id: `toast_${Date.now()}`,
          type: 'success',
          title: reason === 'auto_reconnect'
            ? '🟢 Conexão restabelecida! Backup enviado para a nuvem.'
            : '☁️ Backup salvo na nuvem com sucesso!',
          description: `${batches.length} lotes e ${Object.keys(config.streets || {}).length} setores salvos às ${new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`,
        });

        setTimeout(() => {
          setToastNotification((curr) => (curr?.id.startsWith('toast_') ? null : curr));
        }, 5500);

        return true;
      } else {
        throw new Error(result.error);
      }
    } catch (err: any) {
      console.error('Error during cloud backup:', err);
      setToastNotification({
        id: `toast_${Date.now()}`,
        type: 'error',
        title: 'Falha ao sincronizar com a nuvem',
        description: err.message || 'Verifique sua conexão ou servidor de backup.',
      });
      return false;
    } finally {
      setIsSyncingCloud(false);
    }
  };

  // --- AUTOMATIC CLOUD SYNC UPON RETURNING ONLINE ---
  // Tracks transitions from offline -> online and dispatches auto backup
  const prevOnlineRef = useRef<boolean>(isOnline);
  useEffect(() => {
    const wasOffline = !prevOnlineRef.current;
    const isNowOnline = isOnline;

    if (wasOffline && isNowOnline) {
      console.log('[Estoque PRO] Conexão restabelecida! Disparando envio automático de backup para a nuvem...');
      if (config.autoBackupOnReconnect !== false) {
        executeCloudBackup('auto_reconnect');
      }
    }

    prevOnlineRef.current = isOnline;
  }, [isOnline, batches, config]);

  const handleToggleSimulateOffline = () => {
    setIsSimulatedOffline((prev) => !prev);
  };

  // Calculate global alerts for UI badge counters
  const getGlobalAlertsCount = () => {
    let expired = 0;
    let expiringSoon = 0;

    batches.forEach((b) => {
      const status = calculateExpiryStatus(b.expiryDate, config.alertThresholdDays);
      if (status.isExpired) {
        expired++;
      } else if (status.isExpiringSoon) {
        expiringSoon++;
      }
    });

    return { expired, expiringSoon };
  };

  const alertsCount = getGlobalAlertsCount();
  const totalWarnings = alertsCount.expired + alertsCount.expiringSoon;
  const isDark = config.theme === 'dark';

  return (
    <div className={`min-h-screen flex items-center justify-center p-0 sm:p-6 font-sans antialiased transition-colors duration-350 ${
      isDark 
        ? 'bg-slate-950 text-slate-100 bg-[radial-gradient(#1e293b_1.5px,transparent_1.5px)] [background-size:24px_24px]' 
        : 'bg-slate-50 text-slate-800 bg-[radial-gradient(#e2e8f0_1.5px,transparent_1.5px)] [background-size:24px_24px]'
    }`}>
      {/* FLOATING CLOUD SYNC TOAST NOTIFICATION */}
      {toastNotification && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-60 w-11/12 max-w-md animate-in fade-in slide-in-from-top-4 duration-300">
          <div className={`p-4 rounded-2xl shadow-2xl border flex items-start gap-3 backdrop-blur-md ${
            toastNotification.type === 'success'
              ? isDark ? 'bg-slate-900/95 border-emerald-500/40 text-emerald-300' : 'bg-white/95 border-emerald-400 text-emerald-900 shadow-emerald-500/10'
              : toastNotification.type === 'error'
              ? isDark ? 'bg-slate-900/95 border-rose-500/40 text-rose-300' : 'bg-white/95 border-rose-400 text-rose-900 shadow-rose-500/10'
              : isDark ? 'bg-slate-900/95 border-orange-500/40 text-orange-300' : 'bg-white/95 border-orange-400 text-orange-900'
          }`}>
            <div className="shrink-0 mt-0.5">
              {toastNotification.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              ) : toastNotification.type === 'error' ? (
                <AlertTriangle className="w-5 h-5 text-rose-400" />
              ) : (
                <Cloud className="w-5 h-5 text-orange-400" />
              )}
            </div>
            <div className="flex-1 space-y-0.5">
              <h5 className="text-xs font-extrabold leading-tight">{toastNotification.title}</h5>
              {toastNotification.description && (
                <p className="text-[11px] opacity-90 leading-snug">{toastNotification.description}</p>
              )}
            </div>
            <button
              onClick={() => setToastNotification(null)}
              className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* RESPONSIVE CONTAINER */}
      <div className={`w-full sm:max-w-md md:max-w-5xl lg:max-w-7xl h-screen sm:h-[840px] md:h-[880px] lg:h-[940px] sm:rounded-[40px] overflow-hidden flex flex-col sm:border-6 relative transition-all duration-350 ${
        isDark 
          ? 'bg-slate-950 border-slate-800 sm:shadow-[0_24px_60px_-15px_rgba(0,0,0,0.6)]' 
          : 'bg-white border-slate-900 sm:shadow-[0_24px_60px_-15px_rgba(15,23,42,0.12),0_10px_20px_-10px_rgba(15,23,42,0.06)]'
      }`}>

        {/* APPLICATION MAIN HEADER */}
        <header className={`px-5 py-4 shrink-0 flex items-center justify-between relative z-10 border-b transition-colors duration-350 ${
          isDark ? 'bg-slate-900 border-slate-800/80' : 'bg-white border-slate-100'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-md shadow-orange-500/10">
              <Warehouse className="w-5 h-5 stroke-[2]" />
            </div>
            <div>
              <h1 className={`font-sans font-extrabold text-sm tracking-tight flex items-center gap-1.5 leading-none ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}>
                Estoque de Perecíveis
              </h1>
              <p className={`text-[9px] font-bold uppercase tracking-wider mt-1.5 ${
                isDark ? 'text-slate-400' : 'text-slate-400'
              }`}>
                Gestão com Prateleiras & Nuvem
              </p>
            </div>
          </div>

          {/* Header Action Controls */}
          <div className="flex items-center gap-2">
            {/* Interactive Connection & Cloud Status Indicator */}
            <button
              id="header-offline-indicator"
              type="button"
              onClick={() => {
                if (isOnline) {
                  executeCloudBackup('manual');
                } else {
                  handleToggleSimulateOffline();
                }
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider border transition-all duration-300 cursor-pointer ${
                isOnline 
                  ? isDark 
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20' 
                    : 'bg-emerald-50/60 border-emerald-100 text-emerald-700 hover:bg-emerald-100'
                  : 'bg-rose-500/15 border-rose-500/30 text-rose-500 animate-pulse hover:bg-rose-500/25'
              }`}
              title={
                isOnline 
                  ? `Conectado à nuvem. Toque para forçar backup agora. Último sync: ${lastCloudSyncTime ? new Date(lastCloudSyncTime).toLocaleTimeString() : 'Nenhum'}`
                  : `Modo offline ativo (${pendingOfflineChanges} alterações pendentes). Toque para testar reconexão.`
              }
            >
              {isOnline ? (
                <>
                  <Cloud className="w-3.5 h-3.5 stroke-[2.5] text-emerald-400" />
                  <span className="hidden sm:inline">
                    {isSyncingCloud ? 'Sincronizando...' : 'Nuvem OK'}
                  </span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>
                    Offline {pendingOfflineChanges > 0 ? `(${pendingOfflineChanges})` : ''}
                  </span>
                </>
              )}
            </button>

            {/* In-App PWA Install header button if installable */}
            {isInstallable && !isInstalled && (
              <button
                type="button"
                onClick={installPWA}
                className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[9px] font-extrabold bg-orange-500 hover:bg-orange-600 text-white shadow-2xs transition cursor-pointer"
                title="Instalar App no dispositivo"
              >
                <Smartphone className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Instalar</span>
              </button>
            )}

            {/* Quick Export PDF Icon Button */}
            <button
              id="exportar-pdf-header"
              onClick={() => exportInventoryToPDF(batches, config)}
              className={`p-2 rounded-xl transition-all cursor-pointer flex items-center justify-center shadow-2xs border ${
                isDark 
                  ? 'text-slate-300 bg-slate-800 border-slate-700/80 hover:bg-slate-700 hover:text-white' 
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50 border-slate-200/80'
              }`}
              title="Exportar PDF Completo"
            >
              <FileDown className="w-4 h-4 stroke-[2]" />
            </button>

            {/* Quick warning alert indicator */}
            {alertsCount.expired > 0 ? (
              <div className="flex items-center gap-1 bg-rose-500 text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-xs animate-bounce-subtle">
                <AlertTriangle className="w-3.5 h-3.5 text-white animate-pulse" />
                <span>{alertsCount.expired} {t.expired_count}</span>
              </div>
            ) : alertsCount.expiringSoon > 0 ? (
              <div className="flex items-center gap-1 bg-amber-500 text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-xs">
                <ShieldAlert className="w-3.5 h-3.5 text-white" />
                <span>{alertsCount.expiringSoon} {t.warning_count}</span>
              </div>
            ) : (
              <div className={`text-[10px] font-extrabold px-2.5 py-1.5 rounded-xl border uppercase tracking-wide ${
                isDark 
                  ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' 
                  : 'text-emerald-700 bg-emerald-50 border-emerald-100'
              }`}>
                {t.stock_ok}
              </div>
            )}
          </div>
        </header>

        {/* NAVIGATION TAB BAR */}
        <nav className={`border-b py-2.5 px-3 flex justify-around items-center shrink-0 z-20 transition-all duration-350 shadow-3xs ${
          isDark 
            ? 'bg-slate-900/95 backdrop-blur-md border-slate-800/80' 
            : 'bg-white/95 backdrop-blur-md border-slate-100'
        }`}>
          {/* MAP TAB button */}
          <button
            id="tab-btn-map"
            onClick={() => {
              setLocatorAction(null);
              setActiveTab('map');
            }}
            className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all duration-300 cursor-pointer ${
              activeTab === 'map' 
                ? isDark 
                  ? 'bg-orange-500/15 text-orange-400 font-bold scale-102 border border-orange-500/20'
                  : 'bg-orange-50 text-orange-600 font-bold scale-102 border border-orange-100'
                : 'text-slate-400 font-semibold hover:text-slate-200 hover:bg-slate-800/30'
            }`}
          >
            <Warehouse className={`w-4.5 h-4.5 transition-all ${activeTab === 'map' ? 'stroke-[2.5] scale-105' : 'stroke-[1.8]'}`} />
            <span className="text-[9px] uppercase tracking-wider font-extrabold">{t.map}</span>
          </button>

          {/* ALERTS TAB button */}
          <button
            id="tab-btn-alerts"
            onClick={() => setActiveTab('alerts')}
            className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all duration-300 cursor-pointer relative ${
              activeTab === 'alerts' 
                ? isDark 
                  ? 'bg-orange-500/15 text-orange-400 font-bold scale-102 border border-orange-500/20'
                  : 'bg-orange-50 text-orange-600 font-bold scale-102 border border-orange-100'
                : 'text-slate-400 font-semibold hover:text-slate-200 hover:bg-slate-800/30'
            }`}
          >
            <Bell className={`w-4.5 h-4.5 transition-all ${activeTab === 'alerts' ? 'stroke-[2.5] scale-105' : 'stroke-[1.8]'}`} />
            <span className="text-[9px] uppercase tracking-wider font-extrabold">{t.alerts}</span>
            
            {totalWarnings > 0 && (
              <span className={`absolute -top-0.5 -right-0.5 w-4 h-4 text-[8px] font-black text-white rounded-full flex items-center justify-center border shadow-xs ${
                alertsCount.expired > 0 ? 'bg-rose-500 animate-pulse' : 'bg-amber-500'
              } ${isDark ? 'border-slate-900' : 'border-white'}`}>
                {totalWarnings}
              </span>
            )}
          </button>

          {/* SEARCH/INVENTORY TAB button */}
          <button
            id="tab-btn-search"
            onClick={() => setActiveTab('search')}
            className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all duration-300 cursor-pointer ${
              activeTab === 'search' 
                ? isDark 
                  ? 'bg-orange-500/15 text-orange-400 font-bold scale-102 border border-orange-500/20'
                  : 'bg-orange-50 text-orange-600 font-bold scale-102 border border-orange-100'
                : 'text-slate-400 font-semibold hover:text-slate-200 hover:bg-slate-800/30'
            }`}
          >
            <ClipboardList className={`w-4.5 h-4.5 transition-all ${activeTab === 'search' ? 'stroke-[2.5] scale-105' : 'stroke-[1.8]'}`} />
            <span className="text-[9px] uppercase tracking-wider font-extrabold">{t.inventory}</span>
          </button>

          {/* OCCUPANCY / RECHARTS CHART TAB button */}
          <button
            id="tab-btn-occupancy"
            onClick={() => setActiveTab('occupancy')}
            className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all duration-300 cursor-pointer ${
              activeTab === 'occupancy' 
                ? isDark 
                  ? 'bg-orange-500/15 text-orange-400 font-bold scale-102 border border-orange-500/20'
                  : 'bg-orange-50 text-orange-600 font-bold scale-102 border border-orange-100'
                : 'text-slate-400 font-semibold hover:text-slate-200 hover:bg-slate-800/30'
            }`}
          >
            <BarChart3 className={`w-4.5 h-4.5 transition-all ${activeTab === 'occupancy' ? 'stroke-[2.5] scale-105' : 'stroke-[1.8]'}`} />
            <span className="text-[9px] uppercase tracking-wider font-extrabold">{t.occupancy || 'Ocupação'}</span>
          </button>

          {/* CONFIG TAB button */}
          <button
            id="tab-btn-settings"
            onClick={() => setActiveTab('settings')}
            className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all duration-300 cursor-pointer ${
              activeTab === 'settings' 
                ? isDark 
                  ? 'bg-orange-500/15 text-orange-400 font-bold scale-102 border border-orange-500/20'
                  : 'bg-orange-50 text-orange-600 font-bold scale-102 border border-orange-100'
                : 'text-slate-400 font-semibold hover:text-slate-200 hover:bg-slate-800/30'
            }`}
          >
            <Settings className={`w-4.5 h-4.5 transition-all ${activeTab === 'settings' ? 'stroke-[2.5] scale-105' : 'stroke-[1.8]'}`} />
            <span className="text-[9px] uppercase tracking-wider font-extrabold">{t.settings}</span>
          </button>
        </nav>

        {/* PERSISTENT OFFLINE NOTICE BANNER */}
        {!isOnline && (
          <div className="bg-gradient-to-r from-amber-600 to-rose-600 text-white text-[10px] font-bold px-4 py-2 flex items-center justify-between shrink-0 shadow-sm animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <WifiOff className="w-3.5 h-3.5 animate-pulse" />
              <span>
                <strong>Modo Offline Ativo:</strong> Todos os dados continuam salvos no seu dispositivo. O backup será carregado para a nuvem automaticamente ao reconectar.
                {pendingOfflineChanges > 0 && ` (${pendingOfflineChanges} alterações pendentes)`}
              </span>
            </div>
            {isSimulatedOffline ? (
              <button
                type="button"
                onClick={handleToggleSimulateOffline}
                className="bg-white/20 hover:bg-white/30 text-white px-2 py-0.5 rounded-lg text-[9px] font-extrabold cursor-pointer transition shrink-0 ml-2"
              >
                Reconectar (Online)
              </button>
            ) : (
              <button
                type="button"
                onClick={() => executeCloudBackup('auto_reconnect')}
                className="bg-white/20 hover:bg-white/30 text-white px-2 py-0.5 rounded-lg text-[9px] font-extrabold cursor-pointer transition shrink-0 ml-2"
              >
                Tentar Sync
              </button>
            )}
          </div>
        )}

        {/* INNER PAGE BODY CONTAINER */}
        <main className={`flex-1 overflow-hidden p-4 relative transition-colors duration-350 ${
          isDark ? 'bg-slate-950' : 'bg-slate-50/40'
        }`}>
          {activeTab === 'map' && (
            <WarehouseMap
              batches={batches}
              config={config}
              onAddBatch={handleAddBatch}
              onDeleteBatch={handleDeleteBatch}
              onUpdateBatch={handleUpdateBatch}
              onUpdateConfig={handleUpdateConfig}
              key={locatorAction ? `${locatorAction.street}-${locatorAction.level}-${locatorAction.column}-${locatorAction.trigger}` : 'map-default'}
              {...(locatorAction ? {
                initialStreet: locatorAction.street,
                initialSlot: { level: locatorAction.level, column: locatorAction.column }
              } : {})}
            />
          )}

          {activeTab === 'alerts' && (
            <AlertsList
              batches={batches}
              config={config}
              onDeleteBatch={handleDeleteBatch}
              onLocateInMap={handleLocateInMap}
            />
          )}

          {activeTab === 'search' && (
            <SearchAndFilters
              batches={batches}
              config={config}
              onAddBatch={handleAddBatch}
              onDeleteBatch={handleDeleteBatch}
              onLocateInMap={handleLocateInMap}
            />
          )}

          {activeTab === 'occupancy' && (
            <OccupancyChart
              config={config}
              batches={batches}
              onLocateStreet={(streetId) => {
                setLocatorAction({ street: streetId, level: 1, column: 1, trigger: Date.now() });
                setActiveTab('map');
              }}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsPanel
              config={config}
              batches={batches}
              onUpdateConfig={handleUpdateConfig}
              onResetSampleData={handleResetSampleData}
              onClearAllData={handleClearAllData}
              onImportAllData={handleImportAllData}
              isOnline={isOnline}
              isSimulatedOffline={isSimulatedOffline}
              onToggleSimulateOffline={handleToggleSimulateOffline}
              pendingOfflineChanges={pendingOfflineChanges}
              lastCloudSyncTime={lastCloudSyncTime}
              onTriggerCloudSync={() => executeCloudBackup('manual')}
              isSyncingCloud={isSyncingCloud}
              onNavigateToTab={(tab) => setActiveTab(tab)}
              onLocateStreet={(streetId) => {
                setLocatorAction({ street: streetId, level: 1, column: 1, trigger: Date.now() });
                setActiveTab('map');
              }}
            />
          )}
        </main>

        {/* BOTTOM HOME INDICATOR MOCK FOR SMARTPHONE */}
        <div className={`hidden sm:block pb-2.5 pt-1.5 shrink-0 transition-colors duration-350 ${
          isDark ? 'bg-slate-900 border-t border-slate-800/50' : 'bg-white'
        }`}>
          <div className={`w-24 h-1 rounded-full mx-auto ${
            isDark ? 'bg-slate-800' : 'bg-slate-200'
          }`} />
        </div>
      </div>
    </div>
  );
}
