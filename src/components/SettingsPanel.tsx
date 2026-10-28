/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Layers, 
  Columns, 
  Bell, 
  Trash2, 
  Plus,
  Edit2,
  Save,
  X,
  CheckCircle,
  HelpCircle,
  MapPin,
  Sparkles,
  Upload,
  Download,
  FileDown,
  Languages,
  Sun,
  Moon,
  ArrowLeft,
  Palette,
  Eye,
  Wifi,
  WifiOff,
  Cloud,
  CloudUpload,
  CloudDownload,
  RefreshCw,
  Clock,
  HardDrive,
  Smartphone,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  Wrench,
  Footprints,
  Ban,
  Boxes
} from 'lucide-react';
import { WarehouseConfig, StreetConfig, Batch, CloudBackupMetadata, ActiveTab } from '../types';
import { DEFAULT_CONFIG } from '../data/sampleData';
import { getTranslation, Language } from '../utils/translations';
import { COLOR_PALETTE, getStreetColorStyle } from '../utils';
import { fetchCloudBackupHistory, restoreCloudBackupById } from '../utils/cloudSyncService';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { OccupancyChart } from './OccupancyChart';

interface SettingsPanelProps {
  config: WarehouseConfig;
  batches: Batch[];
  onUpdateConfig: (newConfig: WarehouseConfig) => void;
  onResetSampleData: () => void;
  onClearAllData: () => void;
  onImportAllData: (batches: Batch[], config: WarehouseConfig) => void;
  isOnline: boolean;
  isSimulatedOffline: boolean;
  onToggleSimulateOffline: () => void;
  pendingOfflineChanges: number;
  lastCloudSyncTime: string | null;
  onTriggerCloudSync: () => Promise<boolean>;
  isSyncingCloud: boolean;
  onNavigateToTab?: (tab: ActiveTab) => void;
  onLocateStreet?: (streetId: string) => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  config,
  batches,
  onUpdateConfig,
  onResetSampleData,
  onClearAllData,
  onImportAllData,
  isOnline,
  isSimulatedOffline,
  onToggleSimulateOffline,
  pendingOfflineChanges,
  lastCloudSyncTime,
  onTriggerCloudSync,
  isSyncingCloud,
  onNavigateToTab,
  onLocateStreet,
}) => {
  const t = getTranslation(config.language);
  const isDark = config.theme === 'dark';
  const { isInstallable, isInstalled, isIOS, install: installPWA } = usePWAInstall();

  // Sub-pages within settings (e.g. main settings list vs. dedicated visual themes customizer)
  const [activeSubPage, setActiveSubPage] = useState<'main' | 'themes'>('main');

  // Cloud backup history local state
  const [cloudHistory, setCloudHistory] = useState<CloudBackupMetadata[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [restoringBackupId, setRestoringBackupId] = useState<string | null>(null);
  const [customEndpoint, setCustomEndpoint] = useState(config.customCloudEndpoint || '');
  const [showIOSInstallGuide, setShowIOSInstallGuide] = useState(false);

  // Load cloud backup history
  const loadCloudHistory = async () => {
    setLoadingHistory(true);
    try {
      const history = await fetchCloudBackupHistory();
      setCloudHistory(history);
    } catch (err) {
      console.error('Error loading cloud history', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadCloudHistory();
  }, [lastCloudSyncTime]);

  const handleSaveCustomEndpoint = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateConfig({
      ...config,
      customCloudEndpoint: customEndpoint.trim(),
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const handleToggleAutoBackup = () => {
    const nextVal = config.autoBackupOnReconnect === false ? true : false;
    onUpdateConfig({
      ...config,
      autoBackupOnReconnect: nextVal,
    });
  };

  const handleRestoreCloudBackup = async (backupId: string) => {
    const confirmMsg = t.cloud_restore_confirm || 'Deseja restaurar este backup da nuvem? Isso substituirá as ruas atuais e os lotes cadastrados no estoque.';
    if (!confirm(confirmMsg)) return;

    setRestoringBackupId(backupId);
    try {
      const restored = await restoreCloudBackupById(backupId);
      onImportAllData(restored.batches, restored.config);
      alert(t.import_success || 'Backup importado da nuvem com sucesso! Seus dados foram restaurados.');
    } catch (err: any) {
      alert(`Erro ao restaurar da nuvem: ${err.message || 'Falha na conexão'}`);
    } finally {
      setRestoringBackupId(null);
    }
  };

  // Alert parameters
  const [alertThreshold, setAlertThreshold] = useState(config.alertThresholdDays);
  
  // Streets management local state
  const [streets, setStreets] = useState<Record<string, StreetConfig>>(() => config.streets || {});

  // Sync state with incoming config if updated externally
  useEffect(() => {
    setAlertThreshold(config.alertThresholdDays);
    setStreets(config.streets || {});
  }, [config]);
  
  // Form state for creating/editing a street
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formName, setFormName] = useState('');
  const [formLevels, setFormLevels] = useState(4);
  const [formColumns, setFormColumns] = useState(5);
  const [formColor, setFormColor] = useState('orange');
  
  const [saveSuccess, setSaveSuccess] = useState(false);

  const triggerConfigUpdate = (
    updatedStreets: Record<string, StreetConfig>, 
    updatedThreshold: number,
    updatedLanguage?: Language
  ) => {
    onUpdateConfig({
      ...config,
      streets: updatedStreets,
      alertThresholdDays: updatedThreshold,
      language: updatedLanguage !== undefined ? updatedLanguage : config.language,
    });
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
    }, 2500);
  };

  const handleThemeChange = (newTheme: 'light' | 'dark') => {
    onUpdateConfig({
      ...config,
      theme: newTheme,
    });
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
    }, 1500);
  };

  const handleLanguageChange = (newLang: Language) => {
    triggerConfigUpdate(streets, alertThreshold, newLang);
  };

  const handleSaveThreshold = (e: React.FormEvent) => {
    e.preventDefault();
    triggerConfigUpdate(streets, alertThreshold);
  };

  const handleExportJSON = () => {
    try {
      const dataStr = JSON.stringify({
        app: 'estoque-pro',
        version: '1.0',
        timestamp: new Date().toISOString(),
        config,
        batches
      }, null, 2);
      
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      const dateStr = new Date().toISOString().split('T')[0];
      link.download = `estoque-pro-backup-${dateStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      alert(t.export_error || 'Erro ao gerar arquivo de backup.');
    }
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        
        if (!parsed || typeof parsed !== 'object') {
          throw new Error('Formato inválido.');
        }
        
        if (!parsed.config || !parsed.batches) {
          throw new Error('O arquivo selecionado não contém os campos necessários ("config" e "batches") do Estoque PRO.');
        }

        if (confirm(t.confirm_import || 'Tem certeza que deseja importar estes dados? Isso substituirá as ruas atuais e todos os lotes cadastrados do seu estoque.')) {
          onImportAllData(parsed.batches, parsed.config);
          alert(t.import_success || 'Backup importado com sucesso! Seus dados foram restaurados.');
        }
      } catch (err: any) {
        alert(`${t.import_error || 'Erro na importação:'} ${err.message || 'arquivo JSON inválido.'}`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleStartAdd = () => {
    setEditingId(null);
    setFormName('');
    setFormLevels(4);
    setFormColumns(5);
    setFormColor('orange');
    setIsAdding(true);
  };

  const handleStartEdit = (street: StreetConfig) => {
    setIsAdding(false);
    setEditingId(street.id);
    setFormName(street.name.replace(/^(da|do|de|d')\s+/i, '')); // Strip connector for editing if any
    setFormLevels(street.levels);
    setFormColumns(street.columns);
    setFormColor(street.color || 'orange');
  };

  const handleCancelForm = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormName('');
    setFormColor('orange');
  };

  const handleSaveStreet = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    let streetId = editingId;
    const cleanName = formName.trim();
    
    // Auto-prefix/format connector if user typed without "Rua da / Rua do"
    let displayName = cleanName;
    if (!displayName.toLowerCase().startsWith('da ') && 
        !displayName.toLowerCase().startsWith('do ') && 
        !displayName.toLowerCase().startsWith('de ')) {
      // Basic Portuguese guess of grammatical connector
      const vowels = ['a', 'e', 'o', 'i', 'u'];
      const lastChar = cleanName.toLowerCase().slice(-1);
      if (lastChar === 'a') {
        displayName = `da ${cleanName}`;
      } else if (lastChar === 'o') {
        displayName = `do ${cleanName}`;
      } else {
        displayName = `de ${cleanName}`;
      }
    }

    const nextStreets = { ...streets };

    if (!streetId) {
      // Create unique key based on English characters representation
      const baseId = cleanName
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, '_');
      
      let finalId = baseId || `rua_${Date.now()}`;
      // Prevent duplicate ids
      let counter = 1;
      while (nextStreets[finalId]) {
        finalId = `${baseId}_${counter}`;
        counter++;
      }
      
      streetId = finalId;
    }

    nextStreets[streetId] = {
      id: streetId,
      name: displayName,
      levels: Number(formLevels),
      columns: Number(formColumns),
      color: formColor,
      slots: streets[streetId]?.slots,
    };

    setStreets(nextStreets);
    triggerConfigUpdate(nextStreets, alertThreshold);
    setIsAdding(false);
    setEditingId(null);
    setFormName('');
  };

  const handleDeleteStreet = (idToDelete: string) => {
    const keys = Object.keys(streets);
    if (keys.length <= 1) {
      alert("Erro: Não é possível remover a última rua. O galpão precisa de pelo menos uma área/rua ativa.");
      return;
    }

    const streetToDelete = streets[idToDelete];
    const confirmMessage = `${t.confirm_delete_street || 'Deseja excluir esta rua? Lotes associados continuarão no sistema, mas sem localização visual.'} (${streetToDelete?.name || idToDelete})`;
    
    if (confirm(confirmMessage)) {
      const nextStreets = { ...streets };
      delete nextStreets[idToDelete];
      setStreets(nextStreets);
      triggerConfigUpdate(nextStreets, alertThreshold);
      if (editingId === idToDelete) {
        handleCancelForm();
      }
    }
  };

  if (activeSubPage === 'themes') {
    return (
      <div className="flex flex-col h-full overflow-y-auto pb-24 space-y-5">
        {/* SUB-HEADER */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setActiveSubPage('main')}
            className={`flex items-center gap-1.5 text-xs font-bold py-2 px-3.5 rounded-xl shadow-3xs border transition-all cursor-pointer ${
              isDark 
                ? 'text-slate-300 bg-slate-900 border-slate-800 hover:bg-slate-850 hover:text-white' 
                : 'text-slate-600 bg-white border-slate-200 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <ArrowLeft className="w-4 h-4 stroke-[2]" /> {config.language === 'EN' ? 'Back to Settings' : config.language === 'ES' ? 'Volver' : 'Voltar aos Ajustes'}
          </button>
          
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border shadow-3xs ${
            isDark ? 'border-orange-500/20 bg-orange-500/10 text-orange-400' : 'border-orange-100 bg-orange-50 text-orange-700'
          }`}>
            <Palette className="w-4 h-4 stroke-[2]" />
            {config.language === 'EN' ? 'Layout Studio' : config.language === 'ES' ? 'Diseño de Interfaz' : 'Estúdio de Design'}
          </div>
        </div>

        {/* PAGE COVER CARD */}
        <div className={`p-6 rounded-2xl border relative overflow-hidden shadow-md transition-all duration-300 ${
          isDark 
            ? 'bg-slate-900 border-slate-800' 
            : 'bg-white border-slate-100'
        }`}>
          {/* Subtle glow background */}
          <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full bg-orange-500/10 blur-3xl pointer-events-none" />

          <h3 className={`font-sans font-black text-base tracking-tight flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-950'}`}>
            <Sparkles className="w-5 h-5 text-orange-450 animate-pulse" />
            {config.language === 'EN' ? 'Visual Theme Studio' : config.language === 'ES' ? 'Estúdio de Temas' : 'Estúdio de Temas & Aparência'}
          </h3>
          <p className="text-[10.5px] text-slate-400 dark:text-slate-400 font-semibold mt-1.5 leading-relaxed">
            {config.language === 'EN' ? 'Fine-tune the appearance of Estoque PRO. Toggle themes, and view responsive mockup grids designed for operators, tablets, and desktops.' : config.language === 'ES' ? 'Personalice la apariencia de Estoque PRO. Cambie entre temas y observe la maqueta en tiempo real.' : 'Escolha a estética do Estoque PRO. Ajuste os modos claro ou escuro e visualize o comportamento do painel em tempo real.'}
          </p>
        </div>

        {/* THEMES ROW */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* LIGHT MODE CARD */}
          <button
            onClick={() => handleThemeChange('light')}
            className={`text-left border rounded-3xl p-5 shadow-md transition-all duration-300 relative overflow-hidden group cursor-pointer active:scale-98 ${
              !isDark 
                ? 'bg-orange-50/15 border-orange-450 ring-2 ring-orange-500/10 shadow-[0_12px_24px_-8px_rgba(249,115,22,0.12)]' 
                : 'bg-slate-900 border-slate-800 hover:bg-slate-850 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors duration-300 ${
                  !isDark ? 'bg-orange-500 text-white shadow-md' : 'bg-slate-800 text-slate-400'
                }`}>
                  <Sun className="w-4.5 h-4.5 stroke-[2.5]" />
                </div>
                <div>
                  <h4 className={`text-xs font-black uppercase tracking-wider ${!isDark ? 'text-slate-800' : 'text-slate-400'}`}>
                    {config.language === 'EN' ? 'Light Theme' : config.language === 'ES' ? 'Tema Claro' : 'Tema Claro'}
                  </h4>
                  <p className="text-[9px] text-slate-400 font-bold">Standard clean layout</p>
                </div>
              </div>
              {!isDark ? (
                <span className="w-5 h-5 rounded-full bg-orange-500 text-white flex items-center justify-center text-[10px] font-bold shadow-xs">✓</span>
              ) : (
                <span className="w-5 h-5 rounded-full border border-slate-800" />
              )}
            </div>

            {/* LIGHT MOCKUP MINI PANEL */}
            <div className="bg-slate-100/90 rounded-2xl p-3 border border-slate-200/60 pointer-events-none select-none transition-transform duration-300 group-hover:scale-[1.01]">
              <div className="flex items-center justify-between border-b border-slate-200/50 pb-1.5 mb-2">
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span className="text-[7px] text-slate-500 font-black uppercase">Estoque PRO</span>
                </div>
                <span className="text-[6px] px-1 bg-orange-100 text-orange-700 rounded font-bold">RACKS</span>
              </div>
              
              {/* Mini shelf rows mockup */}
              <div className="grid grid-cols-4 gap-1">
                <div className="h-4 rounded bg-orange-100 border border-orange-200 text-center text-[5px] flex items-center justify-center font-bold text-orange-800">C1</div>
                <div className="h-4 rounded bg-emerald-100 border border-emerald-200 text-center text-[5px] flex items-center justify-center font-bold text-emerald-800">C2</div>
                <div className="h-4 rounded bg-slate-50 border border-slate-200 text-center text-[5px] flex items-center justify-center font-bold text-slate-400">C3</div>
                <div className="h-4 rounded bg-rose-100 border border-rose-200 text-center text-[5px] flex items-center justify-center font-bold text-rose-800">C4</div>
              </div>
            </div>
          </button>

          {/* DARK MODE CARD */}
          <button
            onClick={() => handleThemeChange('dark')}
            className={`text-left border rounded-3xl p-5 shadow-md transition-all duration-300 relative overflow-hidden group cursor-pointer active:scale-98 ${
              isDark 
                ? 'bg-slate-900 border-slate-700 ring-2 ring-orange-500/10 shadow-[0_12px_24px_-8px_rgba(0,0,0,0.5)]' 
                : 'bg-white border-slate-200 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors duration-300 ${
                  isDark ? 'bg-orange-500 text-slate-950 shadow-md' : 'bg-slate-100 text-slate-400'
                }`}>
                  <Moon className="w-4.5 h-4.5 stroke-[2.5]" />
                </div>
                <div>
                  <h4 className={`text-xs font-black uppercase tracking-wider ${isDark ? 'text-white' : 'text-slate-800'}`}>
                    {config.language === 'EN' ? 'Dark Theme' : config.language === 'ES' ? 'Tema Oscuro' : 'Tema Escuro'}
                  </h4>
                  <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold">Ambient eye-safe layout</p>
                </div>
              </div>
              {isDark ? (
                <span className="w-5 h-5 rounded-full bg-orange-500 text-slate-950 flex items-center justify-center text-[10px] font-bold shadow-xs">✓</span>
              ) : (
                <span className="w-5 h-5 rounded-full border border-slate-200" />
              )}
            </div>

            {/* DARK MOCKUP MINI PANEL */}
            <div className="bg-slate-950 rounded-2xl p-3 border border-slate-900 pointer-events-none select-none transition-transform duration-300 group-hover:scale-[1.01]">
              <div className="flex items-center justify-between border-b border-slate-900 pb-1.5 mb-2">
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span className="text-[7px] text-slate-400 font-black uppercase">Estoque PRO</span>
                </div>
                <span className="text-[6px] px-1 bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded font-bold">RACKS</span>
              </div>
              
              {/* Mini shelf rows mockup */}
              <div className="grid grid-cols-4 gap-1">
                <div className="h-4 rounded bg-orange-500/10 border border-orange-500/25 text-center text-[5px] flex items-center justify-center font-bold text-orange-400">C1</div>
                <div className="h-4 rounded bg-emerald-500/10 border border-emerald-500/25 text-center text-[5px] flex items-center justify-center font-bold text-emerald-400">C2</div>
                <div className="h-4 rounded bg-slate-900 border border-slate-800 text-center text-[5px] flex items-center justify-center font-bold text-slate-600">C3</div>
                <div className="h-4 rounded bg-rose-500/10 border border-rose-500/25 text-center text-[5px] flex items-center justify-center font-bold text-rose-400">C4</div>
              </div>
            </div>
          </button>
        </div>

        {/* SYSTEM COLOR SWATCH EXPLANATION */}
        <div className={`p-5 rounded-2xl border shadow-sm transition-all duration-300 space-y-3 ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'
        }`}>
          <div className="flex items-center gap-1.5 border-b pb-2.5 dark:border-slate-800/60">
            <Sparkles className="w-4.5 h-4.5 text-orange-500 animate-pulse" />
            <h4 className={`text-xs font-extrabold uppercase tracking-wider ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
              {config.language === 'EN' ? 'Interactive Color Schemes' : config.language === 'ES' ? 'Muestra de Colores' : 'Amostra de Cores das Ruas'}
            </h4>
          </div>
          <p className="text-[10px] text-slate-450 dark:text-slate-400 font-semibold leading-relaxed">
            {config.language === 'EN' ? 'Street cards and rack buttons will reflect the custom colors you defined in the street structure settings. Configure individual area identities below:' : config.language === 'ES' ? 'Las tarjetas de la calle y los botones de los estantes reflejarán los colores que defina en la configuración de calles:' : 'Os cards das ruas e os botões de suas prateleiras refletirão as cores exatas que você definir para cada uma nas configurações abaixo:'}
          </p>

          <div className="grid grid-cols-2 gap-2">
            {Object.keys(streets).map((streetId, idx) => {
              const street = streets[streetId];
              const colorStyle = getStreetColorStyle(street.color, idx, isDark);
              return (
                <div key={street.id} className={`flex items-center gap-2.5 p-2.5 border rounded-xl ${
                  isDark ? 'bg-slate-950/40 border-slate-800/85' : 'bg-slate-50 border-slate-100'
                }`}>
                  <span className={`w-3.5 h-3.5 rounded-full ${colorStyle.dot} flex items-center justify-center border-2 border-white dark:border-slate-950`} />
                  <div className="flex-1 min-w-0">
                    <span className={`text-[10px] font-bold block truncate ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                      {t.street} {street.name}
                    </span>
                    <span className="text-[8px] text-slate-400 font-semibold uppercase">{street.color || 'Laranja'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* FULL RESPONSIVE MOCKUP SIMULATION (LIVE PREVIEW) */}
        <div className={`p-5 rounded-2xl border shadow-sm transition-all duration-300 space-y-4 ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'
        }`}>
          <div className="flex items-center gap-1.5 border-b pb-2.5 dark:border-slate-800/60">
            <Eye className="w-4 h-4 text-orange-500" />
            <h4 className={`text-xs font-extrabold uppercase tracking-wider ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
              {config.language === 'EN' ? 'Live Interface Preview' : config.language === 'ES' ? 'Vista Previa en Vivo' : 'Pré-visualização de Interface'}
            </h4>
          </div>

          <p className="text-[10px] text-slate-400 font-semibold">
            {config.language === 'EN' ? 'Simulated layout representing active visual themes for tablets, monitors, and mobiles:' : config.language === 'ES' ? 'Maqueta simulada de temas visuales activos para tabletas y computadores:' : 'Veja a simulação de como ficará o tema ativo nos diferentes dispositivos:'}
          </p>

          {/* SIMULATED DEVICE BENTO */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            {/* Tablet Mockup */}
            <div className={`md:col-span-8 border rounded-2xl p-4 flex flex-col justify-between h-44 shadow-3xs relative overflow-hidden transition-all duration-300 ${
              isDark ? 'bg-slate-950/70 border-slate-800/80' : 'bg-slate-100 border-slate-200/70'
            }`}>
              <div className="flex items-center justify-between border-b pb-2 border-dashed dark:border-slate-900">
                <span className="text-[7px] text-slate-400 font-bold uppercase">🖥️ Computador / Tablet Widescreen</span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              
              {/* Simulated split view */}
              <div className="grid grid-cols-12 gap-2.5 my-2">
                <div className="col-span-8 rounded-lg border p-1.5 dark:border-slate-800/80 dark:bg-slate-900/40">
                  <div className="w-1/2 h-1 bg-orange-500 rounded mb-1.5" />
                  <div className="grid grid-cols-6 gap-1">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className={`h-4 rounded-md border text-[5px] flex items-center justify-center font-bold ${
                        i % 3 === 0 
                          ? isDark ? 'bg-orange-500/10 border-orange-500/25 text-orange-400' : 'bg-orange-100 border-orange-200 text-orange-800' 
                          : isDark ? 'bg-slate-900 border-slate-800 text-slate-650' : 'bg-white border-slate-200 text-slate-400'
                      }`}>C{i+1}</div>
                    ))}
                  </div>
                </div>
                <div className="col-span-4 rounded-lg border border-dashed p-1.5 dark:border-slate-850 dark:bg-slate-950/40 flex flex-col justify-center items-center text-center">
                  <span className="text-[5px] text-slate-400 font-black">POSIÇÃO SELECIONADA</span>
                  <span className="text-[4px] text-slate-400 scale-90 mt-0.5 font-bold">Lotes e Detalhes</span>
                </div>
              </div>

              <span className="text-[6px] text-slate-400 font-bold tracking-wide">ESTOQUE PRO WEB</span>
            </div>

            {/* Mobile Mockup */}
            <div className={`md:col-span-4 border rounded-2xl p-4 flex flex-col justify-between h-44 shadow-3xs relative overflow-hidden transition-all duration-300 ${
              isDark ? 'bg-slate-950/70 border-slate-800/80' : 'bg-slate-100 border-slate-200/70'
            }`}>
              <div className="flex items-center justify-between border-b pb-2 border-dashed dark:border-slate-900">
                <span className="text-[7px] text-slate-400 font-bold uppercase">📱 Celular (Smartphone)</span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              </div>

              <div className="my-2 p-1.5 rounded-lg border dark:border-slate-850 dark:bg-slate-900/40">
                <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded mb-1.5" />
                <div className="w-2/3 h-1.5 bg-orange-500 rounded" />
              </div>

              <span className="text-[6px] text-slate-400 font-bold tracking-wide">Layout Compacto</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto pb-24 space-y-5">
      {/* HEADER SECTION */}
      <div className={`text-center py-5 rounded-2xl px-5 shadow-md border transition-all duration-300 ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-900 border-slate-950'
      }`}>
        <h3 className="font-sans font-extrabold text-orange-400 text-sm flex items-center justify-center gap-1.5">
          <Settings className="w-4 h-4 text-orange-400 animate-spin-slow" />
          {t.settings_title}
        </h3>
        <p className="text-[11px] text-slate-300 mt-1 font-semibold">
          {t.settings_subtitle}
        </p>
      </div>

      {/* NEW PROMINENT MODERN THEME CUSTOMIZER PORTAL CARD */}
      <button
        id="themes-portal-card"
        onClick={() => setActiveSubPage('themes')}
        className={`w-full text-left border rounded-2xl p-5 shadow-md flex items-center justify-between gap-4 transition-all duration-300 cursor-pointer hover:scale-[1.01] ${
          isDark 
            ? 'bg-gradient-to-r from-orange-600/10 via-amber-600/10 to-orange-500/5 border-orange-500/20 hover:border-orange-500/30 shadow-[0_4px_20px_rgba(249,115,22,0.06)]' 
            : 'bg-gradient-to-r from-orange-500/5 via-amber-500/5 to-orange-50/50 border-orange-200 hover:border-orange-300 shadow-sm'
        }`}
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-orange-500 text-white flex items-center justify-center shadow-lg shadow-orange-500/20 shrink-0">
            <Palette className="w-6 h-6 stroke-[2]" />
          </div>
          <div>
            <h4 className={`font-sans font-extrabold text-xs sm:text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
              🎨 {config.language === 'EN' ? 'Custom Themes & Visual Settings' : config.language === 'ES' ? 'Temas Personalizados y Diseño' : 'Personalizar Temas & Design do Galpão'}
            </h4>
            <p className="text-[10px] text-slate-400 font-semibold mt-1 leading-relaxed">
              {config.language === 'EN' ? 'Toggle light & dark modes with premium structures and real-time live mockup.' : config.language === 'ES' ? 'Cambie entre modo claro y oscuro con estructuras premium y vista previa.' : 'Alterne entre os modos claro e escuro com estruturas modernas e pré-visualização.'}
            </p>
          </div>
        </div>
        <div className={`p-2 rounded-xl text-xs font-bold shrink-0 ${
          isDark ? 'bg-slate-800 text-orange-400' : 'bg-white text-orange-600 border border-slate-100 shadow-3xs'
        }`}>
          {config.language === 'EN' ? 'Open' : config.language === 'ES' ? 'Abrir' : 'Abrir'} →
        </div>
      </button>

      {/* RECHARTS WAREHOUSE OCCUPANCY VISUALIZATION */}
      <div id="settings-occupancy-chart-card" className={`border rounded-2xl p-5 shadow-sm space-y-4 transition-all duration-300 ${
        isDark ? 'bg-slate-900 border-slate-800/80 shadow-[0_4px_20px_rgba(0,0,0,0.12)]' : 'bg-white border-slate-100'
      }`}>
        <div className={`flex items-center justify-between border-b pb-3 ${
          isDark ? 'border-slate-800/60' : 'border-slate-100'
        }`}>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-orange-500 stroke-[2.2]" />
            <div>
              <h4 className={`font-extrabold text-xs sm:text-sm ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
                {config.language === 'EN' ? '📊 Sector Occupancy Analytics (Recharts)' : config.language === 'ES' ? '📊 Ocupación por Sector (Recharts)' : '📊 Ocupação por Setor do Galpão (Recharts)'}
              </h4>
              <p className="text-[10px] text-slate-400 font-semibold">
                {config.language === 'EN' ? 'Interactive bar chart showing capacity and slot usage across all streets.' : config.language === 'ES' ? 'Gráfico de barras interactivo con capacidad y ocupación por calle.' : 'Gráfico de barras interativo com a capacidade e ocupação de cada rua.'}
              </p>
            </div>
          </div>

          {onNavigateToTab && (
            <button
              type="button"
              onClick={() => onNavigateToTab('occupancy')}
              className={`text-[10px] font-bold px-3 py-1.5 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 ${
                isDark 
                  ? 'bg-slate-800 hover:bg-slate-700 text-orange-400 border-slate-700' 
                  : 'bg-orange-50 hover:bg-orange-100 text-orange-600 border-orange-200'
              }`}
            >
              <span>Ver Aba Completa</span>
              <span>→</span>
            </button>
          )}
        </div>

        <OccupancyChart
          config={config}
          batches={batches}
          isEmbedded={true}
          onLocateStreet={onLocateStreet}
          onOpenFullTab={onNavigateToTab ? () => onNavigateToTab('occupancy') : undefined}
        />
      </div>

      {/* SYSTEM LANGUAGE SELECTOR */}
      <div id="language-settings-card" className={`border rounded-2xl p-5 shadow-sm space-y-3.5 transition-all duration-300 ${
        isDark ? 'bg-slate-900 border-slate-800/80' : 'bg-white border-slate-100'
      }`}>
        <div className={`flex items-center gap-1.5 border-b pb-2.5 ${
          isDark ? 'border-slate-800/60' : 'border-slate-100'
        }`}>
          <Languages className="w-4.5 h-4.5 text-orange-500 stroke-[2]" />
          <h4 className={`font-extrabold text-xs sm:text-sm ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
            {t.select_language_title}
          </h4>
        </div>
        <div>
          <p className="text-[10px] text-slate-400 font-semibold mb-3 leading-relaxed">
            {t.select_language_desc}
          </p>
          <div className="grid grid-cols-3 gap-2.5">
            {(['PT', 'ES', 'EN'] as const).map((lang) => (
              <button
                id={`lang-btn-${lang.toLowerCase()}`}
                key={lang}
                type="button"
                onClick={() => handleLanguageChange(lang)}
                className={`text-[10px] font-bold py-2 px-2.5 rounded-lg border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  (config.language || 'PT') === lang
                    ? isDark
                      ? 'bg-orange-500/10 text-orange-400 border-orange-500/30 shadow-xs'
                      : 'bg-slate-900 text-orange-400 border-slate-800 shadow-sm'
                    : isDark
                      ? 'bg-slate-950/40 hover:bg-slate-850 text-slate-400 border-slate-800/60 shadow-3xs'
                      : 'bg-white hover:bg-slate-50 text-slate-500 border-slate-200/80 shadow-3xs'
                }`}
              >
                <span className="text-sm shrink-0">
                  {lang === 'PT' ? '🇧🇷' : lang === 'ES' ? '🇪🇸' : '🇺🇸'}
                </span>
                <span>{lang}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* SAVE RECOGNITION toast-like success label */}
      {saveSuccess && (
        <div className="bg-emerald-500 text-white rounded-xl p-3 flex items-center gap-2 text-xs font-bold shadow-sm border border-emerald-400">
          <CheckCircle className="w-4 h-4 text-white" />
          Configuração salva com sucesso!
        </div>
      )}

      {/* STREETS LIST & CRUD CONTAINER */}
      <div className={`border rounded-2xl p-5 shadow-sm space-y-4 transition-all duration-300 ${
        isDark ? 'bg-slate-900 border-slate-800/80 shadow-[0_4px_20px_rgba(0,0,0,0.12)]' : 'bg-white border-slate-100'
      }`}>
        <div className={`flex items-center justify-between border-b pb-3 ${
          isDark ? 'border-slate-800/60' : 'border-slate-100'
        }`}>
          <h4 className={`font-extrabold text-xs sm:text-sm flex items-center gap-1.5 ${
            isDark ? 'text-slate-100' : 'text-slate-800'
          }`}>
            <MapPin className="w-4.5 h-4.5 text-orange-500 stroke-[2]" />
            {t.street_structure_title}
          </h4>
          
          {!isAdding && !editingId && (
            <button
              onClick={handleStartAdd}
              className="flex items-center gap-1 bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded-xl text-[10px] font-bold shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-3 h-3 stroke-[3]" /> {t.add_street_btn}
            </button>
          )}
        </div>

        {/* CREATE / EDIT IN-LINE FORM */}
        {(isAdding || editingId) && (
          <form onSubmit={handleSaveStreet} className={`border rounded-2xl p-4.5 space-y-4 shadow-3xs transition-all duration-300 ${
            isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-amber-50/55 border-amber-100'
          }`}>
            <h5 className={`text-[11px] font-bold flex items-center gap-1 border-b pb-2 ${
              isDark ? 'text-orange-400 border-slate-800' : 'text-amber-900 border-amber-100'
            }`}>
              <Sparkles className="w-3.5 h-3.5 text-orange-500 animate-pulse" />
              {editingId ? `${t.edit}: ${streets[editingId]?.name}` : t.add_street_btn}
            </h5>

            <div className="space-y-3">
              <div>
                <label className={`block text-[10px] font-bold uppercase tracking-wide ${
                  isDark ? 'text-slate-400' : 'text-slate-500'
                }`}>{t.street_name_label}</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ex: Batata, Corte, Câmara Fria, Frutas"
                  className={`w-full mt-1 px-3 py-2 rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-orange-500/20 transition-all ${
                    isDark ? 'bg-slate-900 border-slate-800 text-white placeholder-slate-650' : 'bg-white border-slate-200 text-slate-700'
                  }`}
                />
                <span className="text-[9px] text-slate-400 font-semibold block mt-1 italic">
                  {config.language === 'EN' ? 'The system will auto-format the label' : config.language === 'ES' ? 'El sistema dará formato automáticamente' : 'O sistema gerará o rótulo amigável'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                    isDark ? 'text-slate-400' : 'text-slate-500'
                  }`}>
                    <Layers className="w-3.5 h-3.5 stroke-[2]" /> {t.levels_count_label}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    required
                    value={formLevels}
                    onChange={(e) => setFormLevels(Number(e.target.value))}
                    className={`w-full mt-1 px-3 py-1.5 rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-orange-500/20 transition-all ${
                      isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-700'
                    }`}
                  />
                  <span className="text-[8px] text-slate-400 font-semibold block mt-1">Max: 10</span>
                </div>

                <div>
                  <label className={`block text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                    isDark ? 'text-slate-400' : 'text-slate-500'
                  }`}>
                    <Columns className="w-3.5 h-3.5 stroke-[2]" /> {t.columns_count_label}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    required
                    value={formColumns}
                    onChange={(e) => setFormColumns(Number(e.target.value))}
                    className={`w-full mt-1 px-3 py-1.5 rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-orange-500/20 transition-all ${
                      isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-700'
                    }`}
                  />
                  <span className="text-[8px] text-slate-400 font-semibold block mt-1">Max: 20</span>
                </div>
              </div>

              {/* COLOR PICKER FIELD */}
              <div>
                <label className={`block text-[10px] font-bold uppercase tracking-wide ${
                  isDark ? 'text-slate-400' : 'text-slate-500'
                }`}>
                  {config.language === 'EN' ? 'Street Theme Color' : config.language === 'ES' ? 'Color de la Calle' : 'Cor Temática da Rua'}
                </label>
                <div className="flex flex-wrap gap-2.5 mt-2">
                  {Object.keys(COLOR_PALETTE).map((colorKey) => {
                    const colorDetails = COLOR_PALETTE[colorKey as keyof typeof COLOR_PALETTE];
                    const isSelected = formColor === colorKey;
                    
                    return (
                      <button
                        key={colorKey}
                        type="button"
                        onClick={() => setFormColor(colorKey)}
                        title={colorDetails.name[config.language as Language || 'PT']}
                        className={`w-7 h-7 rounded-full cursor-pointer transition-all duration-200 border relative flex items-center justify-center ${colorDetails.solidBg} ${
                          isSelected 
                            ? 'ring-2 ring-orange-500 ring-offset-2 ring-offset-slate-900 scale-110 shadow-md border-white' 
                            : 'border-transparent hover:scale-105 hover:opacity-90'
                        }`}
                      >
                        {isSelected && (
                          <span className="w-1.5 h-1.5 bg-white rounded-full" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                className={`flex-1 font-bold py-2 px-3 rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center gap-1 shadow-xs ${
                  isDark ? 'bg-orange-500 hover:bg-orange-600 text-slate-950' : 'bg-slate-900 hover:bg-slate-950 text-white'
                }`}
              >
                <Save className="w-3.5 h-3.5 text-orange-400" /> {t.save}
              </button>
              
              <button
                type="button"
                onClick={handleCancelForm}
                className={`font-bold py-2 px-3 rounded-xl text-xs shadow-3xs transition-all cursor-pointer flex items-center justify-center border ${
                  isDark ? 'bg-slate-850 hover:bg-slate-800 text-slate-300 border-slate-700' : 'bg-white hover:bg-slate-50 text-slate-500 border-slate-200'
                }`}
              >
                {t.cancel}
              </button>
            </div>
          </form>
        )}

        {/* REGISTERED STREETS DISPLAY */}
        <div className="space-y-3">
          {(Object.values(streets) as any[]).map((street) => (
            <div 
              key={street.id}
              className={`border rounded-2xl p-4 flex items-center justify-between shadow-3xs transition-all duration-300 ${
                isDark ? 'border-slate-800/80 bg-slate-950/40' : 'border-slate-100 bg-slate-50/50'
              }`}
            >
              <div>
                <h5 className={`font-extrabold text-xs uppercase flex items-center gap-1.5 ${
                  isDark ? 'text-slate-100' : 'text-slate-800'
                }`}>
                  {(() => {
                    const idx = (Object.values(streets) as any[]).indexOf(street);
                    const colorStyle = getStreetColorStyle(street.color, idx, isDark);
                    return (
                      <span className={`w-2.5 h-2.5 rounded-full ${colorStyle.dot} inline-block`} />
                    );
                  })()}
                  {t.street} {street.name}
                </h5>
                <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                  Chave: <span className={`px-1.5 py-0.5 rounded-md border ${
                    isDark ? 'text-slate-300 bg-slate-905 border-slate-800' : 'text-slate-600 bg-slate-100 border-slate-200'
                  }`}>{street.id}</span>
                </p>
                
                {(() => {
                  let passages = 0;
                  let blocked = 0;
                  let special = 0;
                  if (street.slots) {
                    Object.values(street.slots).forEach((s: any) => {
                      if (s.type === 'passage') passages++;
                      else if (s.type === 'blocked') blocked++;
                      if (s.size === 'double' || s.size === 'high_clearance') special++;
                    });
                  }
                  const excluded = passages + blocked;
                  const total = street.levels * street.columns;
                  const usable = Math.max(0, total - excluded);

                  return (
                    <div className="space-y-1.5 mt-1.5">
                      <div className={`flex flex-wrap items-center gap-2 text-[10px] font-semibold ${
                        isDark ? 'text-slate-400' : 'text-slate-500'
                      }`}>
                        <span className="flex items-center gap-1">
                          <Layers className="w-3.5 h-3.5 stroke-[2]" /> {street.levels} {t.level}s
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Columns className="w-3.5 h-3.5 stroke-[2]" /> {street.columns} {t.column}s
                        </span>
                        <span>•</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                          isDark ? 'bg-orange-500/20 text-orange-400' : 'bg-slate-800 text-white'
                        }`}>
                          {usable} Vagas Úteis {excluded > 0 && `(${total} nominais)`}
                        </span>
                      </div>

                      {(excluded > 0 || special > 0) && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                          {passages > 0 && (
                            <span className="text-[8px] font-black px-1.5 py-0.2 rounded-md bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center gap-0.5">
                              <Footprints className="w-2.5 h-2.5" /> {passages} {passages === 1 ? 'passagem' : 'passagens'}
                            </span>
                          )}
                          {blocked > 0 && (
                            <span className="text-[8px] font-black px-1.5 py-0.2 rounded-md bg-rose-500/10 text-rose-500 border border-rose-500/20 flex items-center gap-0.5">
                              <Ban className="w-2.5 h-2.5" /> {blocked} {blocked === 1 ? 'pilar bloqueado' : 'pilares bloqueados'}
                            </span>
                          )}
                          {special > 0 && (
                            <span className="text-[8px] font-black px-1.5 py-0.2 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center gap-0.5">
                              <Boxes className="w-2.5 h-2.5" /> {special} {special === 1 ? 'vaga especial' : 'vagas especiais'}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                {onLocateStreet && (
                  <button
                    type="button"
                    onClick={() => onLocateStreet(street.id)}
                    className={`p-1.5 rounded-lg border transition-all cursor-pointer flex items-center gap-1 text-[10px] font-bold ${
                      isDark
                        ? 'text-amber-400 hover:bg-amber-500/10 border-amber-500/20'
                        : 'text-amber-600 hover:bg-amber-50 border-amber-200'
                    }`}
                    title="Configurar passagens, pilares e vagas no mapa interativo"
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Vagas</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleStartEdit(street)}
                  className={`p-1.5 rounded-lg border border-transparent transition-all cursor-pointer ${
                    isDark
                      ? 'text-slate-400 hover:text-orange-400 hover:bg-slate-800 hover:border-slate-700'
                      : 'text-slate-500 hover:text-orange-500 hover:bg-orange-50 hover:border-slate-200'
                  }`}
                  title="Editar estrutura da rua"
                >
                  <Edit2 className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => handleDeleteStreet(street.id)}
                  className={`p-1.5 rounded-lg border border-transparent transition-all cursor-pointer ${
                    isDark
                      ? 'text-slate-400 hover:text-rose-450 hover:bg-slate-800 hover:border-slate-700'
                      : 'text-slate-450 hover:text-rose-600 hover:bg-rose-50 hover:border-slate-200'
                  }`}
                  title="Excluir rua"
                >
                  <Trash2 className="w-4.5 h-4.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ALERT LIMITS SETTING CARD */}
      <div className={`border rounded-2xl p-5 shadow-sm space-y-4 transition-all duration-300 ${
        isDark ? 'bg-slate-900 border-slate-800/80 shadow-[0_4px_20px_rgba(0,0,0,0.12)]' : 'bg-white border-slate-100'
      }`}>
        <div className={`flex items-center gap-1.5 border-b pb-2.5 ${
          isDark ? 'border-slate-800/60' : 'border-slate-100'
        }`}>
          <Bell className="w-4 h-4 text-orange-500 stroke-[2]" />
          <h4 className={`font-extrabold text-xs sm:text-sm ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>{t.alert_params_title}</h4>
        </div>

        <form onSubmit={handleSaveThreshold} className="space-y-3">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">
              {t.alert_params_desc}
            </label>
            <div className="flex items-center gap-3 mt-2">
              <input
                type="range"
                min="1"
                max="90"
                value={alertThreshold}
                onChange={(e) => setAlertThreshold(Number(e.target.value))}
                className="flex-1 accent-orange-500 h-2 rounded-lg appearance-none cursor-pointer border transition-colors bg-slate-100 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
              />
              <span className={`shrink-0 text-xs font-bold px-2.5 py-1 rounded-lg font-mono border ${
                isDark ? 'bg-orange-500/10 border-orange-500/20 text-orange-400' : 'bg-amber-50 border-amber-200 text-amber-800'
              }`}>
                {alertThreshold} {config.language === 'EN' ? 'days' : config.language === 'ES' ? 'días' : 'dias'}
              </span>
            </div>
            <p className={`text-[10px] font-semibold mt-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {t.alert_params_desc} {alertThreshold} {t.alert_params_days}
            </p>
          </div>

          <button
            type="submit"
            className="w-full mt-2 bg-orange-500 hover:bg-orange-600 text-white font-bold py-2.5 px-4 rounded-xl text-xs shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Save className="w-4 h-4 text-white" /> {t.save}
          </button>
        </form>
      </div>

      {/* CLOUD & AUTOMATIC BACKUP HUB */}
      <div className={`border rounded-2xl p-5 shadow-sm space-y-4.5 transition-all duration-300 ${
        isDark ? 'bg-slate-900 border-slate-800/80 shadow-[0_4px_20px_rgba(0,0,0,0.12)]' : 'bg-white border-slate-100'
      }`}>
        <div className={`flex items-center justify-between border-b pb-3 ${
          isDark ? 'border-slate-800/60' : 'border-slate-100'
        }`}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center border border-orange-500/20">
              <CloudUpload className="w-4.5 h-4.5 stroke-[2.2]" />
            </div>
            <div>
              <h4 className={`font-extrabold text-xs sm:text-sm ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
                {t.cloud_backup_header}
              </h4>
              <p className="text-[10px] text-slate-400 font-medium">
                Sincronização em nuvem e salvamento automático ao reconectar
              </p>
            </div>
          </div>

          {/* Real-time Status Pill */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-extrabold uppercase tracking-wide border ${
            isOnline
              ? isDark 
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                : 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : 'bg-rose-500/10 border-rose-500/20 text-rose-500 animate-pulse'
          }`}>
            {isOnline ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Online</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3 h-3 text-rose-500" />
                <span>Offline</span>
              </>
            )}
          </div>
        </div>

        {/* CLOUD ACTIONS ROW */}
        <div className="space-y-3">
          {/* Automatic Backup on Reconnect Switch */}
          <div className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
            isDark ? 'bg-slate-950/40 border-slate-800/80' : 'bg-slate-50 border-slate-150'
          }`}>
            <div className="space-y-0.5">
              <span className={`text-xs font-bold flex items-center gap-1.5 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                <ShieldCheck className="w-4 h-4 text-orange-500" />
                {t.auto_backup_reconnect_label}
              </span>
              <p className="text-[10px] text-slate-400 leading-snug">
                {t.auto_backup_reconnect_desc}
              </p>
            </div>
            <button
              type="button"
              onClick={handleToggleAutoBackup}
              className={`w-11 h-6 rounded-full transition-colors cursor-pointer relative p-0.5 shrink-0 ${
                config.autoBackupOnReconnect !== false ? 'bg-orange-500' : isDark ? 'bg-slate-800' : 'bg-slate-300'
              }`}
            >
              <span className={`block w-5 h-5 rounded-full bg-white shadow-xs transition-transform duration-200 ${
                config.autoBackupOnReconnect !== false ? 'translate-x-5' : 'translate-x-0'
              }`} />
            </button>
          </div>

          {/* Simulate Offline Mode for Testing */}
          <div className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
            isSimulatedOffline 
              ? 'bg-rose-500/10 border-rose-500/30' 
              : isDark ? 'bg-slate-950/30 border-slate-800/60' : 'bg-slate-50 border-slate-150'
          }`}>
            <div className="space-y-0.5">
              <span className={`text-xs font-bold flex items-center gap-1.5 ${
                isSimulatedOffline ? 'text-rose-400' : isDark ? 'text-slate-300' : 'text-slate-700'
              }`}>
                {isSimulatedOffline ? <WifiOff className="w-4 h-4 text-rose-500" /> : <Wifi className="w-4 h-4 text-slate-400" />}
                {t.simulate_offline_label}
              </span>
              <p className="text-[10px] text-slate-400 leading-snug">
                {t.simulate_offline_desc}
              </p>
            </div>
            <button
              type="button"
              onClick={onToggleSimulateOffline}
              className={`text-[10px] font-extrabold px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                isSimulatedOffline
                  ? 'bg-rose-500 text-white border-rose-600 shadow-xs'
                  : isDark 
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700' 
                    : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200'
              }`}
            >
              {isSimulatedOffline ? 'Desativar Teste' : 'Ativar Teste'}
            </button>
          </div>

          {/* Pending Changes notification if offline */}
          {!isOnline && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-2.5 text-amber-500 text-[10px] font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-500" />
              <span>
                {pendingOfflineChanges > 0 
                  ? `${pendingOfflineChanges} ${t.pending_changes_badge} salvas no dispositivo. O backup será enviado para a nuvem automaticamente quando você voltar ao modo online.`
                  : 'Você está no modo offline. Todas as alterações serão salvas localmente e sincronizadas com a nuvem ao reconectar.'
                }
              </span>
            </div>
          )}

          {/* Manual Cloud Sync Button & Last Sync Date */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
            <button
              type="button"
              disabled={isSyncingCloud}
              onClick={() => onTriggerCloudSync()}
              className={`text-xs font-bold py-2.5 px-4 rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2 ${
                isSyncingCloud
                  ? 'bg-orange-500/50 text-white cursor-not-allowed'
                  : 'bg-orange-500 hover:bg-orange-600 active:scale-98 text-white'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingCloud ? 'animate-spin' : ''}`} />
              {isSyncingCloud ? t.cloud_syncing : t.cloud_sync_now_btn}
            </button>

            {lastCloudSyncTime && (
              <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1 justify-center sm:justify-start">
                <Clock className="w-3 h-3 text-emerald-500" />
                {t.cloud_last_sync}: {new Date(lastCloudSyncTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            )}
          </div>

          {/* CLOUD BACKUP HISTORY ACCORDION/LIST */}
          <div className="pt-2 border-t dark:border-slate-800/60">
            <div className="flex items-center justify-between mb-2">
              <h5 className={`text-xs font-bold flex items-center gap-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                <HardDrive className="w-3.5 h-3.5 text-orange-500" />
                {t.cloud_history_title}
              </h5>
              <button
                type="button"
                onClick={loadCloudHistory}
                disabled={loadingHistory}
                className="text-[10px] text-slate-400 hover:text-orange-500 flex items-center gap-1 cursor-pointer font-bold"
              >
                <RefreshCw className={`w-3 h-3 ${loadingHistory ? 'animate-spin' : ''}`} />
                Atualizar
              </button>
            </div>

            {loadingHistory ? (
              <div className="py-4 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-orange-500" />
                Carregando backups da nuvem...
              </div>
            ) : cloudHistory.length === 0 ? (
              <p className="text-[10px] text-slate-400 italic py-2">
                {t.cloud_history_empty}
              </p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {cloudHistory.slice(0, 6).map((item) => {
                  const isAuto = item.reason === 'auto_reconnect';
                  const dateObj = new Date(item.timestamp);
                  const isToday = new Date().toDateString() === dateObj.toDateString();
                  const timeFormatted = isToday 
                    ? `Hoje às ${dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                    : dateObj.toLocaleDateString([], { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

                  return (
                    <div 
                      key={item.id}
                      className={`p-2.5 rounded-xl border flex items-center justify-between text-xs transition-colors ${
                        isDark ? 'bg-slate-950/40 border-slate-800/80' : 'bg-slate-50 border-slate-150'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${
                            isAuto 
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                              : 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                          }`}>
                            {isAuto ? 'Reconexão Auto' : 'Manual'}
                          </span>
                          <span className={`text-[11px] font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                            {timeFormatted}
                          </span>
                        </div>
                        <p className="text-[9px] text-slate-400">
                          {item.batchesCount} lotes salvos • {item.streetsCount} ruas
                        </p>
                      </div>

                      <button
                        type="button"
                        disabled={restoringBackupId === item.id}
                        onClick={() => handleRestoreCloudBackup(item.id)}
                        className={`text-[10px] font-bold px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${
                          isDark 
                            ? 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700' 
                            : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        <CloudDownload className="w-3 h-3 text-orange-400" />
                        {restoringBackupId === item.id ? 'Restaurando...' : 'Restaurar'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* CUSTOM CLOUD ENDPOINT / WEBHOOK CONFIG */}
          <form onSubmit={handleSaveCustomEndpoint} className="pt-2 border-t dark:border-slate-800/60">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">
              {t.custom_cloud_endpoint_label}
            </label>
            <div className="flex gap-2 mt-1.5">
              <input
                type="url"
                value={customEndpoint}
                onChange={(e) => setCustomEndpoint(e.target.value)}
                placeholder={t.custom_cloud_endpoint_placeholder}
                className={`flex-1 px-3 py-1.5 rounded-xl text-xs font-mono transition-colors focus:outline-hidden focus:ring-1 focus:ring-orange-500/20 ${
                  isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              />
              <button
                type="submit"
                className={`text-[10px] font-bold px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                  isDark 
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700' 
                    : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                Salvar
              </button>
            </div>
            <p className="text-[9px] text-slate-400 font-semibold mt-1">
              Opcional. Se preenchido, os backups também serão enviados em formato JSON para esta URL.
            </p>
          </form>
        </div>
      </div>

      {/* OFFLINE-FIRST TECHNOLOGY & PWA INSTALL CARD */}
      <div className={`border rounded-2xl p-5 shadow-sm space-y-3.5 transition-all duration-300 ${
        isDark ? 'bg-slate-900 border-slate-800/80 shadow-[0_4px_20px_rgba(0,0,0,0.12)]' : 'bg-white border-slate-100'
      }`}>
        <div className={`flex items-center justify-between border-b pb-2.5 ${
          isDark ? 'border-slate-800/60' : 'border-slate-100'
        }`}>
          <div className="flex items-center gap-1.5">
            <Smartphone className="w-4.5 h-4.5 text-orange-500 stroke-[2]" />
            <h4 className={`font-extrabold text-xs sm:text-sm ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
              {config.language === 'EN' ? 'Offline-First & Native PWA' : config.language === 'ES' ? 'Offline-First y PWA Nativa' : 'Tecnologia Offline-First & App PWA'}
            </h4>
          </div>

          {/* In-App PWA Install Button */}
          {isInstalled ? (
            <span className="flex items-center gap-1 text-[10px] font-extrabold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-xl border border-emerald-500/20">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              {t.pwa_installed_badge}
            </span>
          ) : isInstallable ? (
            <button
              type="button"
              onClick={installPWA}
              className="flex items-center gap-1.5 text-[10px] font-extrabold bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded-xl shadow-xs transition cursor-pointer"
            >
              <Smartphone className="w-3 h-3 stroke-[2.5]" />
              {t.pwa_install_btn}
            </button>
          ) : isIOS ? (
            <button
              type="button"
              onClick={() => setShowIOSInstallGuide(true)}
              className={`flex items-center gap-1.5 text-[10px] font-extrabold px-3 py-1.5 rounded-xl border transition cursor-pointer ${
                isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700' : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              <Smartphone className="w-3 h-3 stroke-[2.5]" />
              Instalar no iPhone
            </button>
          ) : null}
        </div>

        <div>
          <p className="text-[10px] text-slate-450 dark:text-slate-400 font-semibold leading-relaxed">
            {config.language === 'EN' 
              ? 'This system operates 100% locally on your browser. No internet connection is needed to browse shelves, register batches, or change configurations. Ideal for cold chambers, metal structures, or blind spots.'
              : config.language === 'ES'
              ? 'Este sistema opera 100% localmente en su navegador. No se necesita conexión a internet para ver estantes, registrar lotes o cambiar configuraciones. Ideal para cámaras frigoríficas o áreas sin señal.'
              : 'Este sistema opera 100% localmente no seu dispositivo. Nenhuma conexão com a internet é necessária para navegar pelas prateleiras, cadastrar lotes ou alterar configurações. Ideal para câmaras frias, subsolos ou áreas com oscilação de sinal.'
            }
          </p>
          
          <div className="grid grid-cols-2 gap-2.5 mt-3.5">
            <div className={`p-2.5 rounded-xl border flex flex-col justify-between ${
              isDark ? 'bg-slate-950/40 border-slate-800/80' : 'bg-slate-50 border-slate-150'
            }`}>
              <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider block">
                {config.language === 'EN' ? 'Engine' : config.language === 'ES' ? 'Motor' : 'Motor de Estado'}
              </span>
              <span className={`text-[10px] font-extrabold mt-1 block ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                Service Worker + Storage
              </span>
            </div>

            <div className={`p-2.5 rounded-xl border flex flex-col justify-between ${
              isDark ? 'bg-slate-950/40 border-slate-800/80' : 'bg-slate-50 border-slate-150'
            }`}>
              <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider block">
                {config.language === 'EN' ? 'Cloud Sync' : config.language === 'ES' ? 'Sync Nube' : 'Sincronização'}
              </span>
              <span className="text-[10px] font-extrabold text-emerald-500 mt-1 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {config.autoBackupOnReconnect !== false ? 'Auto Reconexão' : 'Manual'}
              </span>
            </div>
          </div>
        </div>

        {/* iOS Guided Install Modal */}
        {showIOSInstallGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <div className={`w-full max-w-sm rounded-2xl p-6 shadow-2xl border ${
              isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-900'
            }`}>
              <div className="flex items-center justify-between pb-3 border-b dark:border-slate-800">
                <h3 className="text-sm font-extrabold flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-orange-500" />
                  Instalar no iPhone / iPad
                </h3>
                <button
                  onClick={() => setShowIOSInstallGuide(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="mt-4 space-y-2.5 text-xs text-slate-400">
                <p>1. Toque no botão de <strong>Compartilhar</strong> (ícone de quadrado com seta para cima) na barra do Safari.</p>
                <p>2. Role a lista para baixo e toque em <strong>"Adicionar à Tela de Início"</strong>.</p>
                <p>3. Toque em <strong>"Adicionar"</strong> no canto superior direito.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowIOSInstallGuide(false)}
                className="mt-5 w-full bg-orange-500 text-white py-2.5 rounded-xl text-xs font-bold"
              >
                Entendido
              </button>
            </div>
          </div>
        )}
      </div>

      {/* RECOVERY & DATA CONTROLS */}
      <div className={`border rounded-2xl p-5 shadow-sm space-y-4.5 transition-all duration-300 ${
        isDark ? 'bg-slate-900 border-slate-800/80 shadow-[0_4px_20px_rgba(0,0,0,0.12)]' : 'bg-white border-slate-100'
      }`}>
        <h4 className={`font-extrabold text-xs sm:text-sm border-b pb-3 ${
          isDark ? 'text-slate-100 border-slate-800/60' : 'text-slate-800 border-slate-100'
        }`}>
          {t.db_backup_title} (Arquivo Local)
        </h4>

        <div className="space-y-4">
          {/* BACKUP COMPLETO DOS DADOS (PRIMEIRO) */}
          <div className="flex items-start gap-3">
            <Download className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5 stroke-[2]" />
            <div className="flex-1">
              <h5 className={`text-xs font-extrabold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{t.full_backup_title}</h5>
              <p className="text-[10px] text-slate-400 font-semibold mt-1 leading-relaxed">
                {t.full_backup_desc}
              </p>
              
              <div className="flex flex-wrap gap-2.5 mt-3">
                <button
                  id="btn-export-backup"
                  type="button"
                  onClick={handleExportJSON}
                  className={`text-[10px] font-bold px-3.5 py-2.5 rounded-xl shadow-3xs transition-all cursor-pointer flex items-center gap-1.5 border ${
                    isDark 
                      ? 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20 hover:bg-indigo-500/25' 
                      : 'text-indigo-600 bg-white hover:bg-indigo-50 border-indigo-100'
                  }`}
                >
                  <FileDown className="w-3.5 h-3.5 stroke-[2]" />
                  {t.export_backup_btn}
                </button>

                <label 
                  id="label-import-backup"
                  className={`text-[10px] font-bold px-3.5 py-2.5 rounded-xl shadow-3xs transition-all cursor-pointer flex items-center gap-1.5 border ${
                    isDark 
                      ? 'text-slate-300 bg-slate-950/45 hover:bg-slate-850 border-slate-800' 
                      : 'text-slate-600 bg-white hover:bg-slate-50 border-slate-200'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5 text-slate-500 stroke-[2]" />
                  {t.import_backup_btn}
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportJSON}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>

          <hr className={`border-t ${isDark ? 'border-slate-800/60' : 'border-slate-100'}`} />

          {/* ZERAR INVENTÁRIO (DEPOIS) */}
          <div className="flex items-start gap-3">
            <Trash2 className="w-5 h-5 text-rose-500 shrink-0 mt-0.5 stroke-[2]" />
            <div>
              <h5 className={`text-xs font-extrabold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{t.clear_inventory_title}</h5>
              <p className="text-[10px] text-slate-400 font-semibold mt-1 leading-relaxed">
                {t.clear_inventory_desc}
              </p>
              <button
                type="button"
                onClick={() => {
                  if (confirm(t.confirm_clear_all || 'CUIDADO: Deseja apagar ABSOLUTAMENTE TODOS os lotes cadastrados no estoque? Esta ação é irreversível.')) {
                    onClearAllData();
                    alert(t.clear_all_success || 'Todo o inventário foi apagado.');
                  }
                }}
                className={`mt-2.5 text-[10px] font-bold px-3.5 py-2.5 rounded-xl shadow-3xs transition-all cursor-pointer border ${
                  isDark 
                    ? 'text-rose-400 bg-rose-500/10 border-rose-500/20 hover:bg-rose-500/25' 
                    : 'text-rose-600 bg-white hover:bg-rose-50 border-rose-100'
                }`}
              >
                {t.clear_inventory_btn}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
