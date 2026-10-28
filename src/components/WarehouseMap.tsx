/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Warehouse, 
  Layers, 
  Columns, 
  AlertTriangle, 
  Plus, 
  Info, 
  X, 
  Clock,
  CheckCircle2,
  Trash2,
  ChevronRight,
  ArrowLeft,
  MapPin,
  FileDown,
  Edit2,
  Search,
  LayoutGrid,
  Rows3,
  Sparkles,
  Filter,
  Check,
  Calendar,
  Hash,
  Package,
  Minus,
  Maximize2,
  Smartphone,
  Ban,
  Footprints,
  MoveHorizontal,
  MoveVertical,
  ShieldAlert,
  Wrench,
  Boxes,
  RotateCcw
} from 'lucide-react';
import { Batch, WarehouseConfig, SlotConfig, SlotType, SlotSize } from '../types';
import { calculateExpiryStatus, formatDatePT, getSlotStatus, getStreetColorStyle, getTodayDateString } from '../utils';
import { exportInventoryToPDF } from '../utils/pdfGenerator';
import { getTranslation } from '../utils/translations';
import { DeleteBatchConfirmModal } from './DeleteBatchConfirmModal';

interface WarehouseMapProps {
  batches: Batch[];
  config: WarehouseConfig;
  onAddBatch: (batch: Omit<Batch, 'id'>) => void;
  onDeleteBatch: (id: string) => void;
  onUpdateBatch: (batch: Batch) => void;
  onUpdateConfig?: (newConfig: WarehouseConfig) => void;
  initialStreet?: string;
  initialSlot?: { level: number; column: number };
}

export const WarehouseMap: React.FC<WarehouseMapProps> = ({
  batches,
  config,
  onAddBatch,
  onDeleteBatch,
  onUpdateBatch,
  onUpdateConfig,
  initialStreet,
  initialSlot,
}) => {
  const [selectedStreet, setSelectedStreet] = useState<string | null>(initialStreet || null);
  const [selectedSlot, setSelectedSlot] = useState<{ level: number; column: number } | null>(initialSlot || null);
  const [isAddingToSlot, setIsAddingToSlot] = useState(false);
  const [editingBatchId, setEditingBatchId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Mobile & Modern Rack display states
  const [viewMode, setViewMode] = useState<'matrix' | 'shelves'>('matrix');
  const [touchDensity, setTouchDensity] = useState<'comfortable' | 'compact'>('comfortable');
  const [levelFilter, setLevelFilter] = useState<number | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'occupied' | 'empty' | 'warning' | 'expired'>('all');

  // Rack structure customization mode (Passage, Blocked, Large Bay)
  const [isStructureMode, setIsStructureMode] = useState(false);
  const [configuringSlot, setConfiguringSlot] = useState<{ level: number; column: number } | null>(null);
  const [slotTypeChoice, setSlotTypeChoice] = useState<SlotType>('available');
  const [slotSizeChoice, setSlotSizeChoice] = useState<SlotSize>('standard');
  const [slotLabelInput, setSlotLabelInput] = useState('');
  const [slotNotesInput, setSlotNotesInput] = useState('');
  const [batchToDelete, setBatchToDelete] = useState<Batch | null>(null);

  const t = getTranslation(config.language);

  // Form states for new/editing batch inside a specific slot
  const [newItemName, setNewItemName] = useState('');
  const [newBatchCode, setNewBatchCode] = useState('');
  const [newQuantity, setNewQuantity] = useState(10);
  const [newUnit, setNewUnit] = useState('kg');
  const [newExpiryDate, setNewExpiryDate] = useState('');
  const [newEntryDate, setNewEntryDate] = useState(getTodayDateString());
  const [newNotes, setNewNotes] = useState('');

  // Helper to get slot configuration for current or specified street
  const getSlotConfig = (streetId: string, level: number, column: number): SlotConfig | undefined => {
    return config.streets[streetId]?.slots?.[`${level}-${column}`];
  };

  // Helper to quickly add days to date
  const setQuickExpiryDays = (days: number) => {
    const base = new Date('2026-07-05T00:00:00');
    base.setDate(base.getDate() + days);
    const yyyy = base.getFullYear();
    const mm = String(base.getMonth() + 1).padStart(2, '0');
    const dd = String(base.getDate()).padStart(2, '0');
    setNewExpiryDate(`${yyyy}-${mm}-${dd}`);
  };

  // Adjust quantity easily with buttons
  const adjustQuantity = (delta: number) => {
    setNewQuantity((prev) => Math.max(1, prev + delta));
  };

  // Open slot structure editor
  const openStructureEditor = (level: number, column: number) => {
    if (!selectedStreet) return;
    const currentSlot = getSlotConfig(selectedStreet, level, column);
    setSlotTypeChoice(currentSlot?.type || 'available');
    setSlotSizeChoice(currentSlot?.size || 'standard');
    setSlotLabelInput(currentSlot?.label || '');
    setSlotNotesInput(currentSlot?.notes || '');
    setConfiguringSlot({ level, column });
  };

  // Save slot structure customization
  const handleSaveSlotStructure = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStreet || !configuringSlot || !onUpdateConfig) return;

    const street = config.streets[selectedStreet];
    if (!street) return;

    const key = `${configuringSlot.level}-${configuringSlot.column}`;
    const nextSlots = { ...(street.slots || {}) };

    // If completely default, remove from dict
    if (slotTypeChoice === 'available' && slotSizeChoice === 'standard' && !slotLabelInput.trim() && !slotNotesInput.trim()) {
      delete nextSlots[key];
    } else {
      nextSlots[key] = {
        type: slotTypeChoice,
        size: slotSizeChoice,
        label: slotLabelInput.trim() || undefined,
        notes: slotNotesInput.trim() || undefined,
      };
    }

    const updatedConfig: WarehouseConfig = {
      ...config,
      streets: {
        ...config.streets,
        [selectedStreet]: {
          ...street,
          slots: nextSlots,
        },
      },
    };

    onUpdateConfig(updatedConfig);
    setConfiguringSlot(null);
  };

  // Reset a slot back to standard default
  const handleResetSlotStructure = () => {
    if (!selectedStreet || !configuringSlot || !onUpdateConfig) return;

    const street = config.streets[selectedStreet];
    if (!street || !street.slots) {
      setConfiguringSlot(null);
      return;
    }

    const key = `${configuringSlot.level}-${configuringSlot.column}`;
    const nextSlots = { ...street.slots };
    delete nextSlots[key];

    const updatedConfig: WarehouseConfig = {
      ...config,
      streets: {
        ...config.streets,
        [selectedStreet]: {
          ...street,
          slots: nextSlots,
        },
      },
    };

    onUpdateConfig(updatedConfig);
    setConfiguringSlot(null);
  };

  // Quick set slot type (directly exclude or restore a slot from shelf)
  const handleQuickSetSlotType = (level: number, column: number, type: SlotType) => {
    if (!selectedStreet || !onUpdateConfig) return;
    const street = config.streets[selectedStreet];
    if (!street) return;

    const key = `${level}-${column}`;
    const nextSlots = { ...(street.slots || {}) };

    if (type === 'available') {
      delete nextSlots[key];
    } else {
      nextSlots[key] = {
        ...(nextSlots[key] || {}),
        type,
        size: nextSlots[key]?.size || 'standard',
        label: type === 'passage' ? (nextSlots[key]?.label || 'Passagem Livre') : type === 'blocked' ? (nextSlots[key]?.label || 'Pilar / Obstrução') : undefined,
      };
    }

    const updatedConfig: WarehouseConfig = {
      ...config,
      streets: {
        ...config.streets,
        [selectedStreet]: {
          ...street,
          slots: nextSlots,
        },
      },
    };

    onUpdateConfig(updatedConfig);
  };

  // Calculate alerts & real usable capacity per street
  const getStreetStats = (streetId: string) => {
    const streetBatches = batches.filter((b) => b.street === streetId);
    let expiredCount = 0;
    let warningCount = 0;

    streetBatches.forEach((b) => {
      const { isExpired, isExpiringSoon } = calculateExpiryStatus(b.expiryDate, config.alertThresholdDays);
      if (isExpired) expiredCount++;
      else if (isExpiringSoon) warningCount++;
    });

    const streetObj = config.streets[streetId];
    const totalSlots = streetObj ? streetObj.levels * streetObj.columns : 0;
    
    // Count exclusions (passageways and blocked pillars)
    let passageCount = 0;
    let blockedCount = 0;
    let doubleCount = 0;
    let highClearanceCount = 0;

    if (streetObj?.slots) {
      (Object.values(streetObj.slots) as SlotConfig[]).forEach((s) => {
        if (s.type === 'passage') passageCount++;
        else if (s.type === 'blocked') blockedCount++;
        if (s.size === 'double') doubleCount++;
        else if (s.size === 'high_clearance') highClearanceCount++;
      });
    }

    const excludedSlotsCount = passageCount + blockedCount;
    const usableSlots = Math.max(0, totalSlots - excludedSlotsCount);
    const occupiedSlotsCount = new Set(streetBatches.map((b) => `${b.level}-${b.column}`)).size;

    return {
      total: streetBatches.length,
      expired: expiredCount,
      warning: warningCount,
      occupiedSlotsCount,
      totalSlots,
      usableSlots,
      excludedSlotsCount,
      passageCount,
      blockedCount,
      doubleCount,
      highClearanceCount,
      occupancyPercentage: usableSlots > 0 ? Math.round((occupiedSlotsCount / usableSlots) * 100) : 0,
    };
  };

  const handleStreetSelect = (streetId: string) => {
    setSelectedStreet(streetId);
    setSelectedSlot(null);
    setIsAddingToSlot(false);
    setEditingBatchId(null);
    setLevelFilter('all');
    setStatusFilter('all');
  };

  const handleSlotSelect = (level: number, column: number) => {
    if (!selectedStreet) return;

    if (isStructureMode) {
      openStructureEditor(level, column);
      return;
    }

    setSelectedSlot({ level, column });
    setIsAddingToSlot(false);
    setEditingBatchId(null);
    // Reset form
    setNewItemName('');
    setNewBatchCode('');
    setNewQuantity(20);
    setNewExpiryDate('');
    setNewNotes('');
  };

  const handleStartEditBatch = (b: Batch) => {
    setEditingBatchId(b.id);
    setNewItemName(b.itemName);
    setNewBatchCode(b.batchCode);
    setNewQuantity(b.quantity);
    setNewUnit(b.unit);
    setNewExpiryDate(b.expiryDate);
    setNewEntryDate(b.entryDate);
    setNewNotes(b.notes || '');
    setIsAddingToSlot(true); // Open form
  };

  const handleSaveBatchToSlot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStreet || !selectedSlot || !newItemName) return;

    if (editingBatchId) {
      onUpdateBatch({
        id: editingBatchId,
        itemName: newItemName,
        batchCode: newBatchCode,
        quantity: Number(newQuantity),
        unit: newUnit,
        entryDate: newEntryDate,
        expiryDate: newExpiryDate,
        street: selectedStreet,
        level: selectedSlot.level,
        column: selectedSlot.column,
        notes: newNotes,
      });
      setEditingBatchId(null);
    } else {
      onAddBatch({
        itemName: newItemName,
        batchCode: newBatchCode,
        quantity: Number(newQuantity),
        unit: newUnit,
        entryDate: newEntryDate,
        expiryDate: newExpiryDate,
        street: selectedStreet,
        level: selectedSlot.level,
        column: selectedSlot.column,
        notes: newNotes,
      });
    }

    setIsAddingToSlot(false);
    // Reset form
    setNewItemName('');
    setNewBatchCode('');
    setNewNotes('');
  };

  const getSlotBatches = (streetId: string, level: number, column: number) => {
    return batches.filter(
      (b) => b.street === streetId && b.level === level && b.column === column
    );
  };

  const isDark = config.theme === 'dark';
  const streetKeys = Object.keys(config.streets || {});
  const selectedStreetIndex = selectedStreet ? streetKeys.indexOf(selectedStreet) : -1;
  const selectedStreetColor = selectedStreet ? getStreetColorStyle(config.streets[selectedStreet]?.color, selectedStreetIndex, isDark) : null;

  const filteredBatches = searchQuery.trim() === '' 
    ? [] 
    : batches.filter(b => 
        b.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.batchCode.toLowerCase().includes(searchQuery.toLowerCase())
      );

  // Active street object
  const currentStreetObj = selectedStreet ? config.streets[selectedStreet] : null;
  const currentStreetStats = selectedStreet ? getStreetStats(selectedStreet) : null;

  // Filter check helper for slots
  const slotMatchesFilters = (level: number, column: number) => {
    if (!selectedStreet) return true;
    
    // Level filter
    if (levelFilter !== 'all' && level !== levelFilter) {
      return false;
    }

    // Status filter
    if (statusFilter !== 'all') {
      const slotState = getSlotStatus(batches, selectedStreet, level, column, config.alertThresholdDays);
      if (statusFilter === 'empty' && slotState.status !== 'empty') return false;
      if (statusFilter === 'occupied' && slotState.status === 'empty') return false;
      if (statusFilter === 'warning' && slotState.status !== 'warning') return false;
      if (statusFilter === 'expired' && slotState.status !== 'expired') return false;
    }

    return true;
  };

  // Render Slot Detail Manager Content (Used both in Bottom Sheet for mobile and in Desktop Side Panel)
  const renderSlotManagerContent = (isMobileSheet = false) => {
    if (!selectedSlot || !selectedStreet) return null;
    const slotBatches = getSlotBatches(selectedStreet, selectedSlot.level, selectedSlot.column);
    const slotState = getSlotStatus(batches, selectedStreet, selectedSlot.level, selectedSlot.column, config.alertThresholdDays);

    const slotCfg = getSlotConfig(selectedStreet, selectedSlot.level, selectedSlot.column);
    const isPassage = slotCfg?.type === 'passage';
    const isBlocked = slotCfg?.type === 'blocked';
    const isDouble = slotCfg?.size === 'double';
    const isHighClearance = slotCfg?.size === 'high_clearance';

    return (
      <div className="flex flex-col space-y-4">
        {/* Header inside drawer/panel */}
        <div className={`flex items-start justify-between border-b pb-3.5 ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
          <div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className={`px-2.5 py-0.5 rounded-lg text-xs font-black font-mono tracking-wide ${
                isDark ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 'bg-orange-100 text-orange-700 border border-orange-200'
              }`}>
                P{selectedSlot.level} • C{selectedSlot.column}
              </span>

              {isPassage ? (
                <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-500 border border-amber-500/30 uppercase tracking-wide flex items-center gap-1">
                  <Footprints className="w-3 h-3" /> Passagem Livre
                </span>
              ) : isBlocked ? (
                <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-rose-500/15 text-rose-500 border border-rose-500/30 uppercase tracking-wide flex items-center gap-1">
                  <Ban className="w-3 h-3" /> Bloqueado (Pilar)
                </span>
              ) : (
                <>
                  <span className={`text-[11px] font-bold uppercase tracking-wider ${
                    slotState.status === 'expired'
                      ? 'text-rose-500'
                      : slotState.status === 'warning'
                      ? 'text-amber-500'
                      : slotState.status === 'ok'
                      ? 'text-emerald-500'
                      : 'text-slate-400'
                  }`}>
                    {slotState.status === 'empty' ? t.empty_slot_tap : `${slotBatches.length} ${slotBatches.length === 1 ? 'Lote' : 'Lotes'}`}
                  </span>

                  {isDouble && (
                    <span className="text-[9px] font-black px-1.5 py-0.2 rounded-md bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 uppercase">
                      2x Vaga Dupla
                    </span>
                  )}
                  {isHighClearance && (
                    <span className="text-[9px] font-black px-1.5 py-0.2 rounded-md bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 uppercase">
                      Pé Alto
                    </span>
                  )}
                </>
              )}
            </div>
            <h4 className={`font-black text-sm sm:text-base mt-1.5 flex items-center gap-1.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              <Layers className="w-4 h-4 text-orange-500 stroke-[2.5]" />
              {config.language === 'EN' ? `Floor ${selectedSlot.level} • Column ${selectedSlot.column}` : config.language === 'ES' ? `Piso ${selectedSlot.level} • Columna ${selectedSlot.column}` : `Andar ${selectedSlot.level} • Coluna ${selectedSlot.column}`}
            </h4>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
              {t.street} {config.streets[selectedStreet]?.name || selectedStreet}
            </p>
          </div>

          <button
            onClick={() => setSelectedSlot(null)}
            className={`p-2 rounded-xl transition-all border cursor-pointer ${
              isDark 
                ? 'hover:bg-slate-800 text-slate-400 hover:text-white border-slate-800' 
                : 'hover:bg-slate-100 text-slate-400 hover:text-slate-700 border-slate-200'
            }`}
            title="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* CASE A: EXCLUDED SLOT (PASSAGE OR BLOCKED) */}
        {(isPassage || isBlocked) ? (
          <div className={`p-5 rounded-2xl border flex flex-col items-center text-center space-y-3.5 ${
            isPassage 
              ? isDark ? 'bg-amber-950/20 border-amber-500/30' : 'bg-amber-50/80 border-amber-200' 
              : isDark ? 'bg-rose-950/20 border-rose-500/30' : 'bg-rose-50/80 border-rose-200'
          }`}>
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border shadow-xs ${
              isPassage 
                ? 'bg-amber-500/15 text-amber-500 border-amber-500/30' 
                : 'bg-rose-500/15 text-rose-500 border-rose-500/30'
            }`}>
              {isPassage ? <Footprints className="w-7 h-7 stroke-[2.2]" /> : <Ban className="w-7 h-7 stroke-[2.2]" />}
            </div>

            <div>
              <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                isPassage 
                  ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' 
                  : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
              }`}>
                {isPassage ? 'Área de Passagem / Corredor' : 'Posição Bloqueada / Pilar'}
              </span>

              <h4 className={`text-sm sm:text-base font-black mt-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {slotCfg?.label || (isPassage ? 'Passagem Livre de Trânsito' : 'Obstrução Estrutural')}
              </h4>

              <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed font-semibold">
                {slotCfg?.notes || (isPassage 
                  ? 'Esta posição da prateleira funciona como vão livre para circulação e travessia. Por este motivo, foi excluída do cálculo de capacidade e não recebe mercadorias.' 
                  : 'Esta posição está fisicamente interditada devido a pilar estrutural, tubulação ou barreira física, não podendo ser utilizada para estoque.')}
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center gap-2 w-full">
              <button
                type="button"
                onClick={() => handleQuickSetSlotType(selectedSlot.level, selectedSlot.column, 'available')}
                className="flex-1 w-full text-xs font-black py-2.5 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs inline-flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95"
              >
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                <span>Reativar Vaga na Prateleira</span>
              </button>
              <button
                type="button"
                onClick={() => openStructureEditor(selectedSlot.level, selectedSlot.column)}
                className={`flex-1 w-full text-xs font-bold py-2.5 px-3.5 rounded-xl border transition-all cursor-pointer inline-flex items-center justify-center gap-1.5 ${
                  isDark 
                    ? 'border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-850' 
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-3xs'
                }`}
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>Personalizar</span>
              </button>
            </div>
          </div>
        ) : (
          /* CASE B: NORMAL STORAGE SLOT (BATCHES LIST + FORM) */
          <>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Package className="w-3.5 h-3.5 text-orange-500" />
                  {config.language === 'EN' ? 'Stored Batches' : config.language === 'ES' ? 'Lotes Almacenados' : 'Lotes Armazenados'} ({slotBatches.length})
                </h5>
                {slotBatches.length > 0 && !isAddingToSlot && (
                  <button
                    onClick={() => {
                      setEditingBatchId(null);
                      setIsAddingToSlot(true);
                    }}
                    className="text-[11px] font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> {config.language === 'EN' ? 'Add Another' : 'Adicionar Outro'}
                  </button>
                )}
              </div>
          
          {slotBatches.length === 0 && !isAddingToSlot ? (
            <div className={`text-center py-7 px-4 border border-dashed rounded-2xl ${
              isDark ? 'border-slate-800 bg-slate-950/40' : 'border-slate-200 bg-slate-50/50'
            }`}>
              <div className="w-10 h-10 rounded-full mx-auto flex items-center justify-center bg-orange-500/10 text-orange-500 mb-2.5">
                <Plus className="w-5 h-5 stroke-[2.5]" />
              </div>
              <p className="text-xs text-slate-400 font-bold">
                {config.language === 'EN' ? 'No batches in this space.' : config.language === 'ES' ? 'Ningún lote en este espacio.' : 'Nenhum lote neste espaço da prateleira.'}
              </p>
              <p className="text-[10px] text-slate-500 mt-1">
                {config.language === 'EN' ? 'Position ready to receive inventory.' : 'Posição livre pronta para receber mercadoria.'}
              </p>
              <button
                onClick={() => {
                  setEditingBatchId(null);
                  setIsAddingToSlot(true);
                }}
                className="mt-3.5 text-xs font-bold py-2.5 px-4 rounded-xl bg-orange-600 hover:bg-orange-700 text-white shadow-xs inline-flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" /> {config.language === 'EN' ? 'Register First Batch' : config.language === 'ES' ? 'Añadir Primer Lote' : 'Cadastrar Primeiro Lote'}
              </button>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-56 sm:max-h-64 overflow-y-auto pr-1 scrollbar-thin">
              {slotBatches.map((b) => {
                const { isExpired, isExpiringSoon, daysRemaining } = calculateExpiryStatus(b.expiryDate, config.alertThresholdDays);
                return (
                  <div 
                    key={b.id} 
                    className={`border rounded-2xl p-3.5 flex flex-col justify-between shadow-xs transition-all ${
                      isExpired 
                        ? isDark ? 'bg-rose-950/20 border-rose-900/40 text-rose-300' : 'bg-rose-50/80 border-rose-200' 
                        : isExpiringSoon 
                        ? isDark ? 'bg-amber-950/20 border-amber-900/40 text-amber-300' : 'bg-amber-50/80 border-amber-200' 
                        : isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-white border-slate-200/90'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <span className={`font-black text-sm block truncate ${
                          isDark ? 'text-slate-100' : 'text-slate-900'
                        }`}>
                          {b.itemName}
                        </span>
                        
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border ${
                            isDark ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                          }`}>
                            <Hash className="w-2.5 h-2.5 inline mr-0.5 text-orange-500" />
                            {b.batchCode || (config.language === 'EN' ? 'No Batch' : 'Sem Lote')}
                          </span>

                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${
                            isDark ? 'bg-slate-900 border-slate-800 text-orange-400' : 'bg-orange-50 border-orange-200 text-orange-700'
                          }`}>
                            {b.quantity} {b.unit}
                          </span>
                        </div>
                      </div>

                      {/* Expiry Pill */}
                      <div className="shrink-0 text-right">
                        {!b.expiryDate ? (
                          <span className={`text-[9px] font-black border px-2 py-0.5 rounded-lg flex items-center gap-1 ${
                            isDark ? 'text-slate-400 bg-slate-950 border-slate-850' : 'text-slate-600 bg-slate-100 border-slate-200'
                          }`}>
                            <CheckCircle2 className="w-3 h-3 text-slate-400" /> {config.language === 'EN' ? 'No Expiry' : 'Sem Venc.'}
                          </span>
                        ) : isExpired ? (
                          <span className="text-[9px] font-black border px-2 py-0.5 rounded-lg flex items-center gap-1 bg-rose-500/15 border-rose-500/30 text-rose-500 animate-pulse">
                            <AlertTriangle className="w-3 h-3 text-rose-500" /> {config.language === 'EN' ? 'Expired' : 'Vencido'} ({Math.abs(daysRemaining)}d)
                          </span>
                        ) : isExpiringSoon ? (
                          <span className="text-[9px] font-black border px-2 py-0.5 rounded-lg flex items-center gap-1 bg-amber-500/15 border-amber-500/30 text-amber-500">
                            <Clock className="w-3 h-3 text-amber-500" /> {config.language === 'EN' ? 'Warning' : 'Alerta'} ({daysRemaining}d)
                          </span>
                        ) : (
                          <span className="text-[9px] font-black border px-2 py-0.5 rounded-lg flex items-center gap-1 bg-emerald-500/15 border-emerald-500/30 text-emerald-500">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" /> {config.language === 'EN' ? 'Safe' : 'Seguro'} ({daysRemaining}d)
                          </span>
                        )}
                      </div>
                    </div>

                    {b.notes && (
                      <p className={`text-[10px] p-2 rounded-xl border mt-2.5 font-medium leading-relaxed ${
                        isDark 
                          ? 'text-slate-300 bg-slate-900/60 border-slate-800' 
                          : 'text-slate-600 bg-slate-50 border-slate-150'
                      }`}>
                        <span className="font-bold text-orange-500">{config.language === 'EN' ? 'Notes' : 'Obs'}:</span> {b.notes}
                      </p>
                    )}

                    <div className={`flex items-center justify-between mt-3 pt-2.5 border-t text-[10px] font-bold ${
                      isDark ? 'border-slate-800/80' : 'border-slate-100'
                    }`}>
                      <span className="text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {config.language === 'EN' ? 'Entry' : 'Entrada'}: {formatDatePT(b.entryDate)}
                      </span>
                      
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleStartEditBatch(b)}
                          className={`p-2 rounded-xl transition-all cursor-pointer flex items-center gap-1 text-[11px] font-bold ${
                            isDark 
                              ? 'text-indigo-400 hover:bg-indigo-500/10 border border-indigo-500/20' 
                              : 'text-indigo-600 hover:bg-indigo-50 border border-indigo-200'
                          }`}
                          title={config.language === 'EN' ? 'Edit Batch' : 'Editar Lote'}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>{config.language === 'EN' ? 'Edit' : 'Editar'}</span>
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => setBatchToDelete(b)}
                          className={`p-2 rounded-xl transition-all cursor-pointer flex items-center gap-1 text-[11px] font-bold ${
                            isDark 
                              ? 'text-rose-400 hover:bg-rose-500/10 border border-rose-500/20' 
                              : 'text-rose-600 hover:bg-rose-50 border border-rose-200'
                          }`}
                          title={config.language === 'EN' ? 'Delete / Checkout' : 'Excluir / Dar Baixa'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>{config.language === 'EN' ? 'Delete' : 'Excluir'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ADD / EDIT BATCH FORM IN THIS SLOT */}
        {!isAddingToSlot ? (
          <button
            onClick={() => {
              setEditingBatchId(null);
              setIsAddingToSlot(true);
            }}
            className={`w-full flex items-center justify-center gap-2 font-bold py-3.5 px-4 rounded-xl text-xs sm:text-sm transition-all cursor-pointer shadow-md active:scale-98 ${
              isDark 
                ? 'bg-orange-500 hover:bg-orange-600 text-slate-950 font-black shadow-orange-500/10' 
                : 'bg-slate-900 hover:bg-slate-800 text-white shadow-slate-900/10'
            }`}
          >
            <Plus className="w-4 h-4 stroke-[3]" /> {config.language === 'EN' ? 'Register Batch in this Slot' : 'Cadastrar Lote neste Espaço'}
          </button>
        ) : (
          <form onSubmit={handleSaveBatchToSlot} className={`border rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-sm transition-colors ${
            isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50/80 border-slate-200'
          }`}>
            <div className={`flex justify-between items-center border-b pb-2.5 ${
              isDark ? 'border-slate-800' : 'border-slate-200'
            }`}>
              <span className={`text-xs sm:text-sm font-black flex items-center gap-1.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                <Package className="w-4 h-4 text-orange-500" />
                {editingBatchId 
                  ? (config.language === 'EN' ? 'Edit Batch' : 'Editar Lote') 
                  : (config.language === 'EN' ? 'New Batch in Slot' : 'Novo Lote na Posição')}
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsAddingToSlot(false);
                  setEditingBatchId(null);
                }}
                className={`text-[11px] font-bold px-2 py-1 rounded-lg border cursor-pointer ${
                  isDark ? 'text-slate-400 hover:text-white border-slate-800' : 'text-slate-500 hover:text-slate-800 border-slate-200 bg-white'
                }`}
              >
                {config.language === 'EN' ? 'Cancel' : 'Cancelar'}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Product Name */}
              <div className="col-span-2">
                <label className="block text-[11px] font-bold text-slate-400 tracking-wide">
                  {config.language === 'EN' ? 'Product / Food Name *' : 'Nome do Produto / Alimento *'}
                </label>
                <input
                  type="text"
                  required
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder={config.language === 'EN' ? 'Ex: Washed Asterix Potato' : 'Ex: Batata Asterix Lavada'}
                  className={`w-full mt-1 px-3.5 py-2.5 border rounded-xl text-xs sm:text-sm font-bold focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 transition-all ${
                    isDark 
                      ? 'bg-slate-900 border-slate-800 text-white placeholder:text-slate-500 focus:border-orange-500' 
                      : 'bg-white border-slate-200 text-slate-800 focus:border-orange-500'
                  }`}
                />
              </div>

              {/* Batch Code */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 tracking-wide">
                  {config.language === 'EN' ? 'Batch Code' : 'Código do Lote'}
                </label>
                <input
                  type="text"
                  value={newBatchCode}
                  onChange={(e) => setNewBatchCode(e.target.value)}
                  placeholder="Ex: LT-409A"
                  className={`w-full mt-1 px-3 py-2.5 border rounded-xl text-xs font-mono font-bold focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 transition-all ${
                    isDark 
                      ? 'bg-slate-900 border-slate-800 text-white placeholder:text-slate-500' 
                      : 'bg-white border-slate-200 text-slate-800'
                  }`}
                />
              </div>

              {/* Unit Selector */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 tracking-wide">
                  {config.language === 'EN' ? 'Unit' : 'Unidade'}
                </label>
                <select
                  value={newUnit}
                  onChange={(e) => setNewUnit(e.target.value)}
                  className={`w-full mt-1 px-3 py-2.5 border rounded-xl text-xs font-bold focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 transition-all ${
                    isDark 
                      ? 'bg-slate-900 border-slate-800 text-white [color-scheme:dark]' 
                      : 'bg-white border-slate-200 text-slate-800'
                  }`}
                >
                  <option value="kg">kg (Quilogramas)</option>
                  <option value="caixas">Caixas (cx)</option>
                  <option value="pacotes">Pacotes (pct)</option>
                  <option value="unidades">Unidades (un)</option>
                  <option value="paletes">Paletes (plt)</option>
                </select>
              </div>

              {/* Quantity with Smartphone Stepper */}
              <div className="col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-slate-400 tracking-wide">
                    {config.language === 'EN' ? 'Quantity' : 'Quantidade'}
                  </label>
                  <span className="text-[10px] font-mono font-bold text-orange-500">
                    {newQuantity} {newUnit}
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => adjustQuantity(-10)}
                    className={`px-2.5 py-2 rounded-xl text-xs font-black border transition-all cursor-pointer active:scale-95 ${
                      isDark ? 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    -10
                  </button>
                  <button
                    type="button"
                    onClick={() => adjustQuantity(-1)}
                    className={`p-2 rounded-xl text-xs font-black border transition-all cursor-pointer active:scale-95 ${
                      isDark ? 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  
                  <input
                    type="number"
                    required
                    min="1"
                    value={newQuantity}
                    onChange={(e) => setNewQuantity(Number(e.target.value))}
                    className={`flex-1 text-center py-2 border rounded-xl text-sm font-black focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 transition-all ${
                      isDark 
                        ? 'bg-slate-900 border-slate-800 text-white' 
                        : 'bg-white border-slate-200 text-slate-800'
                    }`}
                  />

                  <button
                    type="button"
                    onClick={() => adjustQuantity(1)}
                    className={`p-2 rounded-xl text-xs font-black border transition-all cursor-pointer active:scale-95 ${
                      isDark ? 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => adjustQuantity(10)}
                    className={`px-2.5 py-2 rounded-xl text-xs font-black border transition-all cursor-pointer active:scale-95 ${
                      isDark ? 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    +10
                  </button>
                </div>
              </div>

              {/* Expiry Date with Smartphone Quick Presets */}
              <div className="col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-slate-400 tracking-wide">
                    {config.language === 'EN' ? 'Expiration Date' : 'Data de Validade'}
                  </label>
                  {newExpiryDate && (
                    <span className="text-[10px] font-bold text-slate-400">
                      {formatDatePT(newExpiryDate)}
                    </span>
                  )}
                </div>

                <input
                  type="date"
                  value={newExpiryDate}
                  onChange={(e) => setNewExpiryDate(e.target.value)}
                  className={`w-full px-3 py-2.5 border rounded-xl text-xs font-bold focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 transition-all ${
                    isDark 
                      ? 'bg-slate-900 border-slate-800 text-white [color-scheme:dark]' 
                      : 'bg-white border-slate-200 text-slate-800'
                  }`}
                />

                {/* Quick Date Shortcuts for Smartphone */}
                <div className="flex items-center gap-1.5 mt-2 overflow-x-auto pb-1 scrollbar-none">
                  <span className="text-[9px] font-bold text-slate-400 uppercase shrink-0">Atalhos:</span>
                  {[
                    { days: 3, label: '+3d' },
                    { days: 7, label: '+7d' },
                    { days: 15, label: '+15d' },
                    { days: 30, label: '+30d' },
                    { days: 60, label: '+60d' },
                    { days: 90, label: '+90d' },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setQuickExpiryDays(preset.days)}
                      className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition-all cursor-pointer shrink-0 active:scale-95 ${
                        isDark 
                          ? 'bg-slate-900 border-slate-800 text-slate-300 hover:border-orange-500 hover:text-orange-400' 
                          : 'bg-white border-slate-200 text-slate-600 hover:border-orange-400 hover:text-orange-600 shadow-3xs'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Entry Date */}
              <div className="col-span-2">
                <label className="block text-[11px] font-bold text-slate-400 tracking-wide">
                  {config.language === 'EN' ? 'Entry Date' : 'Data de Entrada'}
                </label>
                <input
                  type="date"
                  required
                  value={newEntryDate}
                  onChange={(e) => setNewEntryDate(e.target.value)}
                  className={`w-full mt-1 px-3 py-2 border rounded-xl text-xs font-bold focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 transition-all ${
                    isDark 
                      ? 'bg-slate-900 border-slate-800 text-white [color-scheme:dark]' 
                      : 'bg-white border-slate-200 text-slate-800'
                  }`}
                />
              </div>

              {/* Notes */}
              <div className="col-span-2">
                <label className="block text-[11px] font-bold text-slate-400 tracking-wide">
                  {config.language === 'EN' ? 'Observations' : 'Observações (Opcional)'}
                </label>
                <textarea
                  rows={2}
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder={config.language === 'EN' ? 'Strict refrigeration, pallet bottom...' : 'Refrigeração, lote prioritário, umidade...'}
                  className={`w-full mt-1 px-3 py-2 border rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 transition-all ${
                    isDark 
                      ? 'bg-slate-900 border-slate-800 text-white placeholder:text-slate-500' 
                      : 'bg-white border-slate-200 text-slate-800'
                  }`}
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full mt-3 bg-orange-600 hover:bg-orange-700 text-white font-black py-3.5 px-4 rounded-xl text-xs sm:text-sm shadow-md shadow-orange-600/10 cursor-pointer transition-all active:scale-98 flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              {editingBatchId 
                ? (config.language === 'EN' ? 'Save Batch Changes' : 'Salvar Alterações do Lote') 
                : (config.language === 'EN' ? 'Confirm & Place in Slot' : 'Confirmar & Guardar na Posição')}
            </button>
          </form>
        )}

        {/* STRUCTURAL INFO & CUSTOMIZATION TRIGGER */}
        <div className={`p-3 rounded-2xl border flex items-center justify-between gap-2 mt-2 ${
          isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-orange-500/10 text-orange-500">
              <Boxes className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Estrutura & Porte:</span>
              <span className={`text-xs font-black ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                {isDouble ? 'Vaga Dupla (2 Paletes)' : isHighClearance ? 'Pé-Direito Alto (Big Bag)' : 'Padrão (1 Palete)'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => openStructureEditor(selectedSlot.level, selectedSlot.column)}
            className="text-[11px] font-black text-orange-600 hover:text-orange-700 px-2.5 py-1.5 rounded-xl border border-orange-500/30 hover:bg-orange-500/10 transition cursor-pointer flex items-center gap-1 shrink-0"
          >
            <Wrench className="w-3 h-3" />
            <span>Personalizar</span>
          </button>
        </div>

        {/* EXCLUIR VAGA / PARTE DA PRATELEIRA INUTILIZÁVEL */}
        <div className={`p-3 rounded-2xl border transition-colors ${
          isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Ban className="w-3.5 h-3.5 text-rose-500" />
              Excluir Vaga da Prateleira
            </span>
            <span className="text-[9px] text-slate-400 font-semibold">Passagem / Pilar</span>
          </div>
          <p className="text-[10px] text-slate-400 mb-2.5 leading-snug">
            Se este espaço da prateleira não pode ser utilizado para mercadorias, exclua-o do estoque marcando como passagem ou pilar:
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickSetSlotType(selectedSlot.level, selectedSlot.column, 'passage')}
              className={`py-2 px-2.5 rounded-xl border text-[11px] font-black flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-95 ${
                isDark 
                  ? 'bg-amber-950/20 border-amber-500/30 text-amber-400 hover:bg-amber-950/40' 
                  : 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100 shadow-3xs'
              }`}
              title="Excluir posição da prateleira (marcar como passagem livre)"
            >
              <Footprints className="w-3.5 h-3.5" />
              <span>Excluir p/ Passagem</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickSetSlotType(selectedSlot.level, selectedSlot.column, 'blocked')}
              className={`py-2 px-2.5 rounded-xl border text-[11px] font-black flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-95 ${
                isDark 
                  ? 'bg-rose-950/20 border-rose-500/30 text-rose-400 hover:bg-rose-950/40' 
                  : 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100 shadow-3xs'
              }`}
              title="Excluir posição da prateleira (marcar como pilar / obstrução)"
            >
              <Ban className="w-3.5 h-3.5" />
              <span>Excluir p/ Pilar</span>
            </button>
          </div>
        </div>
      </>
    )}
  </div>
);
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto pb-24">
      {/* GLOBAL SEARCH BAR */}
      <div className={`p-3.5 sm:p-4 rounded-2xl border transition-colors duration-300 ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'
      } mb-4 shrink-0 shadow-xs`}>
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={config.language === 'EN' ? 'Search batches by name or code...' : config.language === 'ES' ? 'Buscar lotes por nombre o código...' : 'Buscar lotes por nome do produto ou código...'}
            className={`w-full pl-10 pr-10 py-2.5 rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 transition-all ${
              isDark 
                ? 'bg-slate-950 border-slate-850 text-white focus:border-orange-500' 
                : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-orange-500'
            }`}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Search Results Drawer */}
        {searchQuery.trim() !== '' && (
          <div className={`mt-3 border-t pt-3 ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
            <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">
              {config.language === 'EN' ? 'Search Results' : config.language === 'ES' ? 'Resultados de Búsqueda' : 'Resultados da Busca'} ({filteredBatches.length})
            </h4>
            {filteredBatches.length === 0 ? (
              <p className="text-xs text-slate-400 font-semibold italic py-1">
                {config.language === 'EN' ? 'No batches found matching your search.' : config.language === 'ES' ? 'No se encontraron lotes que coincidan con la búsqueda.' : 'Nenhum lote encontrado para esta busca.'}
              </p>
            ) : (
              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
                {filteredBatches.map((b) => {
                  const streetName = config.streets[b.street]?.name || b.street;
                  const expiryStatus = calculateExpiryStatus(b.expiryDate, config.alertThresholdDays);
                  return (
                    <button
                      key={b.id}
                      onClick={() => {
                        setSelectedStreet(b.street);
                        setSelectedSlot({ level: b.level, column: b.column });
                        setIsAddingToSlot(false);
                        setEditingBatchId(null);
                        setSearchQuery('');
                      }}
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                        isDark 
                          ? 'bg-slate-950/60 border-slate-800 hover:bg-slate-850 hover:border-slate-700' 
                          : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <div className="flex items-center gap-1.5">
                          <span className={`font-black text-xs truncate ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                            {b.itemName}
                          </span>
                          <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border ${
                            isDark ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-600'
                          }`}>
                            {b.batchCode || (config.language === 'EN' ? 'No Batch' : 'Sem Lote')}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-semibold mt-0.5">
                          <span className="flex items-center gap-0.5">
                            <MapPin className="w-3 h-3 text-orange-500" />
                            {config.language === 'EN' ? 'Street' : 'Rua'} {streetName} • P{b.level} - C{b.column}
                          </span>
                          <span>•</span>
                          <span>{b.quantity} {b.unit}</span>
                        </div>
                      </div>
                      
                      <div className="shrink-0 flex items-center gap-2">
                        {!b.expiryDate ? (
                          <span className={`text-[8px] font-black border px-1.5 py-0.5 rounded-md ${
                            isDark ? 'text-slate-400 bg-slate-900 border-slate-800' : 'text-slate-500 bg-white border-slate-200'
                          }`}>
                            SEM VENC.
                          </span>
                        ) : expiryStatus.isExpired ? (
                          <span className="text-[8px] font-black border px-1.5 py-0.5 rounded-md bg-rose-500/10 border-rose-500/20 text-rose-400">
                            VENCIDO
                          </span>
                        ) : expiryStatus.isExpiringSoon ? (
                          <span className="text-[8px] font-black border px-1.5 py-0.5 rounded-md bg-amber-500/10 border-amber-500/20 text-amber-400">
                            ALERTA
                          </span>
                        ) : (
                          <span className="text-[8px] font-black border px-1.5 py-0.5 rounded-md bg-emerald-500/10 border-emerald-500/20 text-emerald-400">
                            SEGURO
                          </span>
                        )}
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* MAP MAIN VIEW: WHEN NO STREET IS SELECTED */}
      {!selectedStreet ? (
        <div className="flex flex-col space-y-4">
          <div className={`border rounded-2xl p-5 shadow-xs flex flex-col items-center justify-center text-center space-y-3 transition-colors duration-300 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'
          }`}>
            <div>
              <h3 className={`font-sans font-extrabold text-sm sm:text-base flex items-center justify-center gap-1.5 tracking-tight ${
                isDark ? 'text-white' : 'text-slate-950'
              }`}>
                <Warehouse className="w-5 h-5 text-orange-500 stroke-[2.2]" />
                {config.language === 'EN' ? 'General Warehouse Map' : config.language === 'ES' ? 'Mapa General del Almacén' : 'Mapa Geral do Galpão'}
              </h3>
              <p className="text-[11px] text-slate-400 mt-1 font-semibold">
                {config.language === 'EN' ? 'Select a street below to inspect racks, levels, and products.' : 'Selecione uma rua abaixo para visualizar as prateleiras, andares e produtos.'}
              </p>
            </div>

            <button
              id="exportar-pdf-geral"
              onClick={() => exportInventoryToPDF(batches, config)}
              className={`w-full max-w-sm font-bold py-3 px-4 rounded-xl text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-98 ${
                isDark 
                  ? 'bg-orange-500 hover:bg-orange-600 text-slate-950 shadow-orange-500/10' 
                  : 'bg-slate-900 hover:bg-slate-800 text-white shadow-slate-900/10'
              }`}
            >
              <FileDown className={`w-4 h-4 stroke-[2] ${isDark ? 'text-slate-950' : 'text-orange-400'}`} />
              {config.language === 'EN' ? 'Export Full Inventory (PDF)' : 'Exportar Inventário Completo (PDF)'}
            </button>
          </div>

          {/* VISUAL WAREHOUSE LAYOUT / STREETS CARDS */}
          <div className={`border rounded-2xl p-4 shadow-sm transition-colors duration-300 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'
          }`}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {(Object.values(config.streets || {}) as any[]).map((street, idx) => {
                const stats = getStreetStats(street.id);
                const streetColor = getStreetColorStyle(street.color, idx, isDark);
                
                const streetBatches = batches.filter((b) => b.street === street.id);
                const hasMatchingBatches = searchQuery.trim() === '' || streetBatches.some(b => 
                  b.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  (b.batchCode && b.batchCode.toLowerCase().includes(searchQuery.toLowerCase()))
                );

                return (
                  <button
                    key={street.id}
                    id={`btn-rua-${street.id}`}
                    onClick={() => handleStreetSelect(street.id)}
                    className={`flex flex-col p-4 rounded-2xl border ${streetColor.bg} hover:shadow-md hover:-translate-y-0.5 active:scale-98 transition-all duration-300 relative overflow-hidden cursor-pointer text-left ${
                      searchQuery.trim() !== '' 
                        ? hasMatchingBatches 
                          ? 'ring-2 ring-orange-500 border-orange-500 shadow-md shadow-orange-500/10' 
                          : 'opacity-40 saturate-50'
                        : ''
                    }`}
                  >
                    <div className="flex justify-between items-start w-full relative z-10">
                      <div>
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md border ${
                          isDark 
                            ? 'bg-slate-950/80 text-slate-300 border-slate-850' 
                            : 'bg-white text-slate-700 border-slate-200'
                        }`}>
                          RUA • {street.id.toUpperCase()}
                        </span>
                        <h4 className={`font-sans font-black text-sm sm:text-base tracking-tight mt-2 flex items-center gap-1.5 ${streetColor.text}`}>
                          {t.street} {street.name}
                        </h4>
                        <p className="text-[10px] text-slate-400 font-bold mt-1 flex items-center gap-1.5">
                          <Layers className="w-3 h-3 text-orange-500" />
                          {street.levels} {config.language === 'EN' ? 'Levels' : 'Andares'} × {street.columns} {config.language === 'EN' ? 'Columns' : 'Colunas'}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className={`text-[10px] border px-2.5 py-1 rounded-xl font-bold font-mono block ${
                          isDark 
                            ? 'bg-slate-950 border-slate-800 text-slate-300' 
                            : 'bg-white border-slate-200 text-slate-700'
                        }`}>
                          {stats.occupiedSlotsCount}/{stats.totalSlots}
                        </span>
                        <span className="text-[9px] text-slate-400 font-bold mt-0.5 block">
                          {stats.occupancyPercentage}% {config.language === 'EN' ? 'occupied' : 'ocupado'}
                        </span>
                      </div>
                    </div>

                    {/* Occupancy progress bar */}
                    <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          stats.expired > 0 ? 'bg-rose-500' : stats.warning > 0 ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, stats.occupancyPercentage)}%` }}
                      />
                    </div>

                    {/* Summary badges */}
                    <div className="mt-3 grid grid-cols-3 gap-2 w-full relative z-10 text-center">
                      <div className={`flex flex-col items-center justify-center p-2 rounded-xl border font-bold ${
                        isDark ? 'bg-slate-950/80 border-slate-850' : 'bg-white border-slate-200/80'
                      }`}>
                        <span className="text-[8px] uppercase tracking-wider text-slate-400 font-bold">Lotes</span>
                        <span className={`text-xs font-black ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>{stats.total}</span>
                      </div>
                      
                      <div className={`flex flex-col items-center justify-center p-2 rounded-xl border font-bold ${
                        stats.expired > 0 
                          ? 'bg-rose-500/15 border-rose-500/30 text-rose-500' 
                          : isDark 
                          ? 'bg-slate-950/80 border-slate-850 text-slate-400' 
                          : 'bg-white border-slate-200/80 text-slate-500'
                      }`}>
                        <span className="text-[8px] uppercase tracking-wider font-bold">Vencidos</span>
                        <span className="text-xs font-black">{stats.expired}</span>
                      </div>

                      <div className={`flex flex-col items-center justify-center p-2 rounded-xl border font-bold ${
                        stats.warning > 0 && stats.expired === 0 
                          ? 'bg-amber-500/15 border-amber-500/30 text-amber-500' 
                          : isDark 
                          ? 'bg-slate-950/80 border-slate-850 text-slate-400' 
                          : 'bg-white border-slate-200/80 text-slate-500'
                      }`}>
                        <span className="text-[8px] uppercase tracking-wider font-bold">Alerta</span>
                        <span className="text-xs font-black">{stats.warning}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* DETAILED SHELF (RACK) VIEW FOR SELECTED STREET                            */
        /* Complete, modern & highly responsive for smartphones & touch devices      */
        /* ========================================================================= */
        <div className="flex flex-col space-y-3.5 animate-fade-in">
          {/* TOP CONTROLS & STREET SELECTOR CAROUSEL */}
          <div className="flex flex-col space-y-2.5">
            {/* Top Bar with Back and Quick PDF */}
            <div className="flex items-center justify-between gap-2">
              <button
                onClick={() => {
                  setSelectedStreet(null);
                  setSelectedSlot(null);
                  setIsAddingToSlot(false);
                }}
                className={`flex items-center gap-1.5 text-xs font-black py-2.5 px-3.5 rounded-xl border transition-all cursor-pointer active:scale-95 ${
                  isDark 
                    ? 'text-slate-200 bg-slate-900 border-slate-800 hover:bg-slate-850' 
                    : 'text-slate-700 bg-white border-slate-200 hover:bg-slate-50 shadow-3xs'
                }`}
              >
                <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
                <span>{config.language === 'EN' ? 'Back' : 'Galpão'}</span>
              </button>

              {/* Street Occupancy Counter */}
              <div className={`flex flex-wrap items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold ${
                isDark ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-700'
              }`}>
                <span className={`w-2 h-2 rounded-full ${selectedStreetColor?.dot || 'bg-orange-500'} animate-pulse`} />
                <span className="font-black text-orange-500">
                  {currentStreetStats?.occupiedSlotsCount}/{currentStreetStats?.usableSlots}
                </span>
                <span className="text-[10px] text-slate-400">
                  ({currentStreetStats?.occupancyPercentage}% {config.language === 'EN' ? 'occupied' : 'ocupado'})
                </span>
                {currentStreetStats && currentStreetStats.excludedSlotsCount > 0 && (
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-amber-500/15 text-amber-500 border border-amber-500/25">
                    {currentStreetStats.excludedSlotsCount} {config.language === 'EN' ? 'excluded' : 'excluídas'}
                  </span>
                )}
              </div>

              {/* Export single street PDF */}
              <button
                onClick={() => {
                  const streetBatches = batches.filter((b) => b.street === selectedStreet);
                  exportInventoryToPDF(streetBatches, config);
                }}
                className={`flex items-center gap-1 text-xs font-bold py-2 px-3 rounded-xl border transition-all cursor-pointer active:scale-95 ${
                  isDark 
                    ? 'bg-slate-900 border-slate-800 text-orange-400 hover:bg-slate-850' 
                    : 'bg-white border-slate-200 text-orange-600 hover:bg-orange-50 shadow-3xs'
                }`}
                title="Exportar PDF desta Rua"
              >
                <FileDown className="w-3.5 h-3.5 stroke-[2.2]" />
                <span className="hidden sm:inline">PDF</span>
              </button>
            </div>

            {/* QUICK STREET SWITCHER PILL TABS (Smartphones love this!) */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-none">
              <span className="text-[9px] font-black text-slate-400 uppercase shrink-0 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-orange-500" />
                Ruas:
              </span>
              {streetKeys.map((sKey) => {
                const sObj = config.streets[sKey];
                const sStats = getStreetStats(sKey);
                const isCurrent = sKey === selectedStreet;
                return (
                  <button
                    key={sKey}
                    onClick={() => handleStreetSelect(sKey)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer shrink-0 border flex items-center gap-1.5 active:scale-95 ${
                      isCurrent
                        ? isDark 
                          ? 'bg-orange-500 text-slate-950 border-orange-400 shadow-sm shadow-orange-500/20' 
                          : 'bg-orange-500 text-white border-orange-600 shadow-sm shadow-orange-500/20'
                        : isDark
                        ? 'bg-slate-900/90 text-slate-400 border-slate-800 hover:text-white'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span>{sObj?.name || sKey}</span>
                    <span className={`text-[9px] px-1.5 py-0.2 rounded-md font-mono ${
                      isCurrent 
                        ? 'bg-black/20 text-white' 
                        : isDark 
                        ? 'bg-slate-950 text-slate-400' 
                        : 'bg-slate-100 text-slate-500'
                    }`}>
                      {sStats.total}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* SMARTPHONE VIEW MODES & FILTER DECK */}
            <div className={`p-3 rounded-2xl border transition-colors ${
              isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200/80 shadow-3xs'
            }`}>
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                {/* View Mode Toggle: Grid Matrix vs Shelf by Shelf (Mobile favorite) */}
                <div className="flex items-center p-1 rounded-xl border bg-slate-100/80 dark:bg-slate-950 border-slate-200/80 dark:border-slate-800">
                  <button
                    onClick={() => setViewMode('matrix')}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                      viewMode === 'matrix'
                        ? 'bg-white dark:bg-slate-850 text-orange-600 dark:text-orange-400 shadow-xs'
                        : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                    }`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span>{t.view_mode_matrix}</span>
                  </button>
                  <button
                    onClick={() => setViewMode('shelves')}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                      viewMode === 'shelves'
                        ? 'bg-white dark:bg-slate-850 text-orange-600 dark:text-orange-400 shadow-xs'
                        : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                    }`}
                  >
                    <Rows3 className="w-3.5 h-3.5" />
                    <span>{t.view_mode_shelves}</span>
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  {/* Structure Mode Toggle Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsStructureMode(!isStructureMode);
                      setSelectedSlot(null);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-black transition-all cursor-pointer active:scale-95 ${
                      isStructureMode
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm shadow-amber-500/20'
                        : isDark
                        ? 'bg-slate-950 border-slate-800 text-slate-300 hover:border-amber-500/40 hover:text-amber-400'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-amber-400 hover:text-amber-600'
                    }`}
                    title="Configurar passagens, pilares e vagas especiais"
                  >
                    <Wrench className={`w-3.5 h-3.5 ${isStructureMode ? 'animate-bounce text-slate-950' : 'text-amber-500'}`} />
                    <span>{t.structure_edit_mode || 'Modo Estrutura'}</span>
                    {currentStreetStats && currentStreetStats.excludedSlotsCount > 0 && (
                      <span className={`text-[9px] px-1 py-0.2 rounded-md font-mono ${
                        isStructureMode ? 'bg-black/20 text-slate-950' : 'bg-amber-500/20 text-amber-500'
                      }`}>
                        {currentStreetStats.excludedSlotsCount}
                      </span>
                    )}
                  </button>

                  {/* Touch density toggle (only in Matrix mode) */}
                  {viewMode === 'matrix' && (
                    <button
                      onClick={() => setTouchDensity(touchDensity === 'comfortable' ? 'compact' : 'comfortable')}
                      className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                        touchDensity === 'comfortable'
                          ? isDark ? 'bg-orange-500/15 border-orange-500/30 text-orange-400' : 'bg-orange-50 border-orange-200 text-orange-700'
                          : isDark ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
                      }`}
                      title="Alternar tamanho das posições na tela"
                    >
                      <Smartphone className="w-3 h-3 text-orange-500" />
                      <span>{touchDensity === 'comfortable' ? t.view_mode_density_comfortable : t.view_mode_density_compact}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Structure Mode Active Banner */}
              {isStructureMode && (
                <div className="mt-3 p-3 rounded-xl border bg-amber-500/10 border-amber-500/30 flex items-center justify-between gap-2.5 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2 min-w-0">
                    <Wrench className="w-4 h-4 text-amber-500 shrink-0" />
                    <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300">
                      <strong>Modo Estrutura Ativo:</strong> Toque em qualquer vaga da prateleira para definir se é <em>Passagem Livre</em>, <em>Bloqueio (Pilar)</em> ou <em>Vaga Especial</em>.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsStructureMode(false)}
                    className="text-[10px] font-extrabold px-2.5 py-1 rounded-lg bg-amber-500 text-slate-950 shrink-0 cursor-pointer hover:bg-amber-400 transition"
                  >
                    Pronto
                  </button>
                </div>
              )}

              {/* Status Quick Filter Bar */}
              <div className="flex items-center gap-1.5 mt-2.5 overflow-x-auto pb-1 scrollbar-none">
                <span className="text-[9px] font-black text-slate-400 uppercase shrink-0 flex items-center gap-0.5">
                  <Filter className="w-3 h-3" />
                  Filtrar:
                </span>
                {[
                  { key: 'all', label: t.quick_filter_all, count: currentStreetStats?.totalSlots },
                  { key: 'occupied', label: t.quick_filter_occupied, count: currentStreetStats?.occupiedSlotsCount },
                  { key: 'empty', label: t.quick_filter_empty, count: (currentStreetStats?.totalSlots || 0) - (currentStreetStats?.occupiedSlotsCount || 0) },
                  { key: 'warning', label: t.quick_filter_alerts, count: currentStreetStats?.warning, color: 'text-amber-500' },
                  { key: 'expired', label: t.quick_filter_expired, count: currentStreetStats?.expired, color: 'text-rose-500' },
                ].map((flt) => {
                  const isActive = statusFilter === flt.key;
                  return (
                    <button
                      key={flt.key}
                      onClick={() => setStatusFilter(flt.key as any)}
                      className={`px-2.5 py-1 rounded-xl text-[10px] font-bold transition-all cursor-pointer shrink-0 border flex items-center gap-1 active:scale-95 ${
                        isActive
                          ? isDark 
                            ? 'bg-slate-800 text-white border-orange-500' 
                            : 'bg-slate-900 text-white border-slate-900'
                          : isDark
                          ? 'bg-slate-950 text-slate-400 border-slate-850 hover:text-slate-200'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <span>{flt.label}</span>
                      <span className={`font-mono text-[9px] font-black ${flt.color || ''}`}>
                        ({flt.count || 0})
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Floor Level Filter Tabs */}
              {currentStreetObj && currentStreetObj.levels > 1 && (
                <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 overflow-x-auto pb-1 scrollbar-none">
                  <span className="text-[9px] font-black text-slate-400 uppercase shrink-0">
                    Andar:
                  </span>
                  <button
                    onClick={() => setLevelFilter('all')}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                      levelFilter === 'all'
                        ? 'bg-orange-500 text-white border-orange-500'
                        : isDark ? 'bg-slate-950 text-slate-400 border-slate-850' : 'bg-white text-slate-600 border-slate-200'
                    }`}
                  >
                    {t.all_levels}
                  </button>
                  {Array.from({ length: currentStreetObj.levels }, (_, i) => currentStreetObj.levels - i).map((lvl) => (
                    <button
                      key={`lvl-filter-${lvl}`}
                      onClick={() => setLevelFilter(lvl)}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold border transition-all cursor-pointer ${
                        levelFilter === lvl
                          ? 'bg-orange-500 text-white border-orange-500'
                          : isDark ? 'bg-slate-950 text-slate-400 border-slate-850' : 'bg-white text-slate-600 border-slate-200'
                      }`}
                    >
                      P{lvl}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* MAIN RACK CONTAINER (Split into Responsive Grid on Desktop, Interactive Bottom Sheet on Mobile) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* LEFT / MAIN COLUMN: THE RACK VISUALIZATION */}
            <div className="lg:col-span-7 xl:col-span-8 flex flex-col space-y-3.5">
              <div className={`border rounded-2xl p-3.5 sm:p-5 shadow-xs transition-colors duration-300 relative overflow-hidden ${
                isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'
              }`}>
                {/* Rack Frame Header Aesthetic */}
                <div className={`flex flex-wrap items-center justify-between pb-3 mb-3 border-b ${
                  isDark ? 'border-slate-800' : 'border-slate-100'
                }`}>
                  <div>
                    <h3 className={`font-black text-sm sm:text-base tracking-tight flex items-center gap-2 ${
                      isDark ? 'text-white' : 'text-slate-950'
                    }`}>
                      <Warehouse className="w-4 h-4 text-orange-500 stroke-[2.5]" />
                      <span>{t.shelf_structure} • {currentStreetObj?.name}</span>
                    </h3>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                      {currentStreetObj?.levels} {config.language === 'EN' ? 'levels high' : 'andares de altura'} × {currentStreetObj?.columns} {config.language === 'EN' ? 'columns wide' : 'colunas de largura'}
                    </p>
                  </div>

                  {/* Status Legend mini */}
                  <div className="flex items-center gap-2 text-[9px] font-bold text-slate-400">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" /> Seguro
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-amber-500" /> Alerta
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" /> Vencido
                    </span>
                  </div>
                </div>

                {/* ------------------------------------------------------------- */}
                {/* MODE A: INTERACTIVE INDUSTRIAL MATRIX (GRADE DA PRATELEIRA)    */}
                {/* ------------------------------------------------------------- */}
                {viewMode === 'matrix' && (
                  <div className="overflow-x-auto pb-3 pt-1 scrollbar-thin">
                    <div 
                      className={`flex flex-col space-y-2.5 mx-auto ${
                        touchDensity === 'comfortable' ? 'min-w-[340px]' : 'min-w-[280px]'
                      }`}
                    >
                      {/* Industrial Top Beam Accent */}
                      <div className="h-1.5 bg-gradient-to-r from-orange-600 via-amber-500 to-orange-600 rounded-full opacity-80 mb-1" />

                      {/* Levels/Pavimentos Loop (Highest Level at top to 1 at bottom, like real warehouse) */}
                      {Array.from(
                        { length: currentStreetObj?.levels || 1 },
                        (_, i) => (currentStreetObj?.levels || 1) - i
                      )
                        .filter((level) => levelFilter === 'all' || levelFilter === level)
                        .map((level) => {
                          const numColumns = currentStreetObj?.columns || 1;
                          const isTopLevel = level === (currentStreetObj?.levels || 1);
                          const isGroundLevel = level === 1;

                          return (
                            <div key={`level-${level}`} className="flex flex-col space-y-1">
                              <div className="flex items-center space-x-2">
                                {/* Floor Level Indicator Pill */}
                                <div className="w-14 sm:w-16 shrink-0 flex flex-col items-end pr-2">
                                  <span className={`text-[11px] font-black font-mono px-2 py-0.5 rounded-lg border ${
                                    isDark ? 'bg-slate-950 border-slate-800 text-orange-400' : 'bg-slate-100 border-slate-200 text-slate-800'
                                  }`}>
                                    P{level}
                                  </span>
                                  <span className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">
                                    {isTopLevel ? t.level_top : isGroundLevel ? t.level_ground : `${level}º`}
                                  </span>
                                </div>

                                {/* Columns Grid */}
                                <div 
                                  className="flex-1 grid gap-2" 
                                  style={{ gridTemplateColumns: `repeat(${numColumns}, minmax(0, 1fr))` }}
                                >
                                  {Array.from({ length: numColumns }, (_, colIdx) => {
                                    const column = colIdx + 1;
                                    const slotState = getSlotStatus(batches, selectedStreet, level, column, config.alertThresholdDays);
                                    const isSelected = selectedSlot?.level === level && selectedSlot?.column === column;
                                    const slotBatches = getSlotBatches(selectedStreet, level, column);
                                    const slotCfg = currentStreetObj?.slots?.[`${level}-${column}`];
                                    const isPassage = slotCfg?.type === 'passage';
                                    const isBlocked = slotCfg?.type === 'blocked';
                                    const isDouble = slotCfg?.size === 'double';
                                    const isHighClearance = slotCfg?.size === 'high_clearance';

                                    const matches = slotMatchesFilters(level, column);
                                    const hasSearchMatch = searchQuery.trim() !== '' && slotBatches.some(b => 
                                      b.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                      (b.batchCode && b.batchCode.toLowerCase().includes(searchQuery.toLowerCase()))
                                    );

                                    const firstBatch = slotBatches[0];
                                    const isOccupied = slotState.status !== 'empty';

                                    let slotBgClass = '';
                                    if (isPassage) {
                                      slotBgClass = isDark 
                                        ? "bg-amber-950/20 border-dashed border-2 border-amber-500/50 text-amber-300 hover:border-amber-400" 
                                        : "bg-amber-50/70 border-dashed border-2 border-amber-400 text-amber-700 hover:border-amber-500";
                                    } else if (isBlocked) {
                                      slotBgClass = isDark 
                                        ? "bg-rose-950/20 border-dashed border-2 border-rose-500/40 text-rose-300 hover:border-rose-400" 
                                        : "bg-rose-50/70 border-dashed border-2 border-rose-300 text-rose-700 hover:border-rose-400";
                                    } else if (selectedStreetColor) {
                                      slotBgClass = isOccupied ? selectedStreetColor.btnOccupied : selectedStreetColor.btnEmpty;
                                      if (isDouble) slotBgClass += ' ring-1 ring-indigo-500/30';
                                      if (isHighClearance) slotBgClass += ' ring-1 ring-cyan-500/30';
                                    } else {
                                      slotBgClass = isDark ? "bg-slate-950 border-slate-800 text-slate-400" : "bg-slate-50 border-slate-200 text-slate-500";
                                    }

                                    return (
                                      <button
                                        key={`slot-${level}-${column}`}
                                        id={`slot-${level}-${column}`}
                                        onClick={() => handleSlotSelect(level, column)}
                                        className={`rounded-2xl border flex flex-col items-center justify-between p-1.5 sm:p-2 cursor-pointer transition-all duration-200 relative select-none active:scale-95 ${
                                          touchDensity === 'comfortable' ? 'min-h-[58px] sm:min-h-[68px]' : 'min-h-[46px]'
                                        } ${slotBgClass} ${
                                          isSelected 
                                            ? 'ring-3 ring-orange-500 border-orange-500 scale-102 z-10 shadow-lg shadow-orange-500/20' 
                                            : hasSearchMatch
                                            ? 'ring-3 ring-amber-400 border-amber-400 animate-pulse scale-[1.04] shadow-md z-10'
                                            : isStructureMode
                                            ? 'hover:ring-2 hover:ring-amber-500/50 hover:scale-[1.02]'
                                            : matches
                                            ? 'shadow-xs hover:border-orange-400'
                                            : 'opacity-30 saturate-30'
                                        }`}
                                      >
                                        {/* Status Dot / Indicator */}
                                        <div className="flex items-center justify-between w-full">
                                          <span className={`text-[9px] sm:text-[10px] font-mono font-black ${
                                            isSelected ? 'text-orange-500 font-extrabold' : isDark ? 'text-slate-300' : 'text-slate-700'
                                          }`}>
                                            C{column}
                                          </span>

                                          {isStructureMode ? (
                                            <span className={`p-0.5 rounded-md ${
                                              isPassage ? 'bg-amber-500/20 text-amber-500' : isBlocked ? 'bg-rose-500/20 text-rose-500' : 'bg-slate-200 dark:bg-slate-800 text-amber-500'
                                            }`} title="Configurar Vaga">
                                              <Wrench className="w-2.5 h-2.5" />
                                            </span>
                                          ) : isPassage ? (
                                            <span className="text-[8px] font-black text-amber-500">LIVRE</span>
                                          ) : isBlocked ? (
                                            <span className="text-[8px] font-black text-rose-500">PILAR</span>
                                          ) : slotState.status !== 'empty' ? (
                                            <span className={`w-2 h-2 rounded-full border ${
                                              slotState.status === 'expired'
                                                ? 'bg-rose-500 border-white dark:border-slate-900 animate-pulse'
                                                : slotState.status === 'warning'
                                                ? 'bg-amber-500 border-white dark:border-slate-900'
                                                : 'bg-emerald-500 border-white dark:border-slate-900'
                                            }`} />
                                          ) : (
                                            <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
                                          )}
                                        </div>

                                        {/* Center Content: Passageway, Blocked, Product snippet or empty */}
                                        {isPassage ? (
                                          <div className="w-full text-center px-0.5 my-auto flex flex-col items-center justify-center">
                                            <Footprints className="w-3.5 h-3.5 text-amber-500 mb-0.5 opacity-90" />
                                            <span className="text-[8px] font-black uppercase tracking-tight block truncate text-amber-600 dark:text-amber-400">
                                              {slotCfg?.label || 'PASSAGEM'}
                                            </span>
                                          </div>
                                        ) : isBlocked ? (
                                          <div className="w-full text-center px-0.5 my-auto flex flex-col items-center justify-center">
                                            <Ban className="w-3.5 h-3.5 text-rose-500 mb-0.5 opacity-90" />
                                            <span className="text-[8px] font-black uppercase tracking-tight block truncate text-rose-600 dark:text-rose-400">
                                              {slotCfg?.label || 'PILAR'}
                                            </span>
                                          </div>
                                        ) : isOccupied ? (
                                          <div className="w-full text-center px-0.5 my-auto">
                                            {touchDensity === 'comfortable' && firstBatch && (
                                              <span className={`text-[9px] font-black block truncate leading-tight ${
                                                isDark ? 'text-slate-100' : 'text-slate-900'
                                              }`}>
                                                {firstBatch.itemName}
                                              </span>
                                            )}
                                            <div className="flex items-center justify-center gap-1">
                                              <span className={`text-[8px] font-bold px-1 py-0.2 rounded-md font-mono inline-block ${
                                                isDark ? 'bg-slate-900/90 text-slate-300' : 'bg-white/90 text-slate-700 shadow-3xs'
                                              }`}>
                                                {slotBatches.length > 1 ? `${slotBatches.length} lotes` : `${firstBatch?.quantity}${firstBatch?.unit}`}
                                              </span>
                                              {isDouble && (
                                                <span className="text-[7px] font-extrabold px-1 py-0.2 rounded bg-indigo-500/15 text-indigo-400">
                                                  2x
                                                </span>
                                              )}
                                              {isHighClearance && (
                                                <span className="text-[7px] font-extrabold px-1 py-0.2 rounded bg-cyan-500/15 text-cyan-400">
                                                  Pé+
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        ) : (
                                          <div className="my-auto flex flex-col items-center">
                                            <div className="opacity-40">
                                              <Plus className="w-3 h-3 text-slate-400" />
                                            </div>
                                            {isDouble && (
                                              <span className="text-[7px] font-extrabold px-1 py-0.2 rounded bg-indigo-500/15 text-indigo-400 mt-0.5">
                                                2x Vaga
                                              </span>
                                            )}
                                            {isHighClearance && (
                                              <span className="text-[7px] font-extrabold px-1 py-0.2 rounded bg-cyan-500/15 text-cyan-400 mt-0.5">
                                                Pé Alto
                                              </span>
                                            )}
                                          </div>
                                        )}

                                        {/* Bottom indicator for selected */}
                                        {isSelected && (
                                          <span className="w-full h-1 bg-orange-500 rounded-full mt-0.5" />
                                        )}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Shelf horizontal metallic crossbeam */}
                              <div className="flex items-center space-x-2">
                                <div className="w-14 sm:w-16 shrink-0" />
                                <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full" />
                              </div>
                            </div>
                          );
                        })}

                      {/* Columns label header at the bottom */}
                      <div className="flex items-center space-x-2 pt-1">
                        <div className="w-14 sm:w-16 shrink-0" />
                        <div 
                          className="flex-1 grid gap-2" 
                          style={{ 
                            gridTemplateColumns: `repeat(${
                              currentStreetObj?.columns || 1
                            }, minmax(0, 1fr))` 
                          }}
                        >
                          {Array.from(
                            { length: currentStreetObj?.columns || 1 },
                            (_, i) => (
                              <div key={`col-label-${i}`} className="text-center text-[9px] font-black text-slate-400 font-mono">
                                Col {i + 1}
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ------------------------------------------------------------- */}
                {/* MODE B: ANDARES / SHELF-BY-SHELF LIST (Mobile Ergonomics)     */}
                {/* ------------------------------------------------------------- */}
                {viewMode === 'shelves' && (
                  <div className="space-y-4 py-1">
                    {Array.from(
                      { length: currentStreetObj?.levels || 1 },
                      (_, i) => (currentStreetObj?.levels || 1) - i
                    )
                      .filter((level) => levelFilter === 'all' || levelFilter === level)
                      .map((level) => {
                        const numColumns = currentStreetObj?.columns || 1;
                        const isTopLevel = level === (currentStreetObj?.levels || 1);
                        const isGroundLevel = level === 1;

                        return (
                          <div 
                            key={`shelf-level-${level}`} 
                            className={`p-3.5 rounded-2xl border transition-colors ${
                              isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50/70 border-slate-200'
                            }`}
                          >
                            {/* Shelf Level Title */}
                            <div className="flex items-center justify-between mb-2.5">
                              <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                                <h4 className={`text-xs sm:text-sm font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                  {t.level_floor} {level} • {isTopLevel ? t.level_top : isGroundLevel ? t.level_ground : 'Nível Intermediário'}
                                </h4>
                              </div>
                              <span className="text-[10px] font-mono font-bold text-slate-400">
                                {numColumns} {config.language === 'EN' ? 'slots' : 'posições'}
                              </span>
                            </div>

                            {/* Horizontal Bays Slider */}
                            <div className="flex items-stretch gap-2.5 overflow-x-auto pb-1.5 scrollbar-thin">
                              {Array.from({ length: numColumns }, (_, colIdx) => {
                                const column = colIdx + 1;
                                const slotState = getSlotStatus(batches, selectedStreet, level, column, config.alertThresholdDays);
                                const isSelected = selectedSlot?.level === level && selectedSlot?.column === column;
                                const slotBatches = getSlotBatches(selectedStreet, level, column);
                                const slotCfg = currentStreetObj?.slots?.[`${level}-${column}`];
                                const isPassage = slotCfg?.type === 'passage';
                                const isBlocked = slotCfg?.type === 'blocked';
                                const isDouble = slotCfg?.size === 'double';
                                const isHighClearance = slotCfg?.size === 'high_clearance';
                                const isOccupied = slotState.status !== 'empty';
                                const firstBatch = slotBatches[0];
                                const expiry = firstBatch ? calculateExpiryStatus(firstBatch.expiryDate, config.alertThresholdDays) : null;

                                return (
                                  <button
                                    key={`shelf-slot-${level}-${column}`}
                                    onClick={() => handleSlotSelect(level, column)}
                                    className={`w-36 sm:w-44 shrink-0 rounded-2xl border p-3 flex flex-col justify-between text-left transition-all cursor-pointer active:scale-95 ${
                                      isSelected
                                        ? 'bg-orange-500/10 border-orange-500 ring-2 ring-orange-500/30'
                                        : isPassage
                                        ? isDark ? 'bg-amber-950/20 border-dashed border-2 border-amber-500/50' : 'bg-amber-50/80 border-dashed border-2 border-amber-300'
                                        : isBlocked
                                        ? isDark ? 'bg-rose-950/20 border-dashed border-2 border-rose-500/50' : 'bg-rose-50/80 border-dashed border-2 border-rose-300'
                                        : isOccupied
                                        ? isDark ? 'bg-slate-900 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200 hover:shadow-xs'
                                        : isDark ? 'bg-slate-950/40 border-slate-850 hover:bg-slate-900/40' : 'bg-slate-100/60 border-slate-200/80 hover:bg-white'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between w-full mb-1.5">
                                      <div className="flex items-center gap-1">
                                        <span className="text-[10px] font-mono font-black px-1.5 py-0.5 rounded-md bg-black/10 dark:bg-white/10">
                                          C{column}
                                        </span>
                                        {isDouble && (
                                          <span className="text-[7px] font-extrabold px-1 rounded bg-indigo-500/15 text-indigo-400">2x</span>
                                        )}
                                        {isHighClearance && (
                                          <span className="text-[7px] font-extrabold px-1 rounded bg-cyan-500/15 text-cyan-400">Pé+</span>
                                        )}
                                      </div>

                                      {isStructureMode ? (
                                        <span className="text-[8px] font-bold text-amber-500 flex items-center gap-0.5">
                                          <Wrench className="w-2.5 h-2.5" /> Editar
                                        </span>
                                      ) : isPassage ? (
                                        <span className="text-[8px] font-black px-1.5 py-0.2 rounded-md bg-amber-500/20 text-amber-500 flex items-center gap-0.5">
                                          <Footprints className="w-2.5 h-2.5" /> LIVRE
                                        </span>
                                      ) : isBlocked ? (
                                        <span className="text-[8px] font-black px-1.5 py-0.2 rounded-md bg-rose-500/20 text-rose-500 flex items-center gap-0.5">
                                          <Ban className="w-2.5 h-2.5" /> PILAR
                                        </span>
                                      ) : isOccupied && expiry ? (
                                        <span className={`text-[8px] font-black px-1.5 py-0.2 rounded-md ${
                                          expiry.isExpired 
                                            ? 'bg-rose-500/20 text-rose-500' 
                                            : expiry.isExpiringSoon 
                                            ? 'bg-amber-500/20 text-amber-500' 
                                            : 'bg-emerald-500/20 text-emerald-500'
                                        }`}>
                                          {expiry.isExpired ? 'VENCIDO' : expiry.isExpiringSoon ? `${expiry.daysRemaining}d` : 'OK'}
                                        </span>
                                      ) : (
                                        <span className="text-[9px] font-bold text-slate-400">Livre</span>
                                      )}
                                    </div>

                                    {isPassage ? (
                                      <div className="py-1">
                                        <h5 className="font-black text-xs text-amber-600 dark:text-amber-400 truncate">
                                          {slotCfg?.label || 'Passagem Livre'}
                                        </h5>
                                        <p className="text-[10px] font-medium text-amber-700/80 dark:text-amber-400/80 mt-0.5">
                                          Corredor de trânsito
                                        </p>
                                      </div>
                                    ) : isBlocked ? (
                                      <div className="py-1">
                                        <h5 className="font-black text-xs text-rose-600 dark:text-rose-400 truncate">
                                          {slotCfg?.label || 'Pilar Estrutural'}
                                        </h5>
                                        <p className="text-[10px] font-medium text-rose-700/80 dark:text-rose-400/80 mt-0.5">
                                          Obstrução física
                                        </p>
                                      </div>
                                    ) : isOccupied && firstBatch ? (
                                      <div>
                                        <h5 className={`font-black text-xs truncate ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                                          {firstBatch.itemName}
                                        </h5>
                                        <p className="text-[10px] font-semibold text-slate-400 mt-0.5">
                                          {firstBatch.quantity} {firstBatch.unit}
                                        </p>
                                      </div>
                                    ) : (
                                      <div className="py-2 text-center text-slate-400">
                                        <Plus className="w-4 h-4 mx-auto mb-0.5 opacity-60" />
                                        <span className="text-[9px] font-bold">Toque p/ Lote</span>
                                      </div>
                                    )}

                                    <div className="mt-2 pt-1.5 border-t border-slate-200/40 dark:border-slate-800/60 flex items-center justify-between text-[9px] font-bold text-slate-400">
                                      <span>
                                        {isPassage || isBlocked 
                                          ? 'Indisponível' 
                                          : `${slotBatches.length} ${slotBatches.length === 1 ? 'item' : 'itens'}`}
                                      </span>
                                      <ChevronRight className="w-3.5 h-3.5" />
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}

                {/* Helpful Instruction Tip */}
                <p className="text-[10px] text-slate-400 mt-3 text-center italic font-medium">
                  {config.language === 'EN' ? 'Tap any slot in the rack to manage or register inventory.' : 'Toque em qualquer posição da prateleira para inspecionar, cadastrar ou dar baixa.'}
                </p>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* DESKTOP SIDE PANEL (Only on lg: screens and above)                        */}
            {/* ========================================================================= */}
            <div className="hidden lg:flex lg:col-span-5 xl:col-span-4 w-full flex-col">
              <AnimatePresence mode="wait">
                {selectedSlot ? (
                  <motion.div
                    key={`desktop-slot-${selectedSlot.level}-${selectedSlot.column}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className={`border rounded-2xl p-5 shadow-lg transition-colors ${
                      isDark 
                        ? 'bg-slate-900 border-slate-800 shadow-[0_15px_35px_-5px_rgba(0,0,0,0.3)]' 
                        : 'bg-white border-slate-100 shadow-[0_15px_35px_-5px_rgba(15,23,42,0.06)]'
                    }`}
                  >
                    {renderSlotManagerContent(false)}
                  </motion.div>
                ) : (
                  <motion.div
                    key="slot-placeholder-desktop"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    className={`border rounded-2xl p-6 flex flex-col items-center justify-center text-center py-20 transition-colors border-dashed ${
                      isDark 
                        ? 'bg-slate-900/40 border-slate-800 text-slate-500' 
                        : 'bg-slate-50/50 border-slate-200 text-slate-400'
                    }`}
                  >
                    <Layers className="w-10 h-10 text-slate-400 dark:text-slate-600 mb-3.5 stroke-[1.5]" />
                    <h4 className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                      {t.select_slot_prompt}
                    </h4>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 max-w-[200px] mt-1.5 leading-relaxed font-semibold">
                      Toque em qualquer posição da grade para visualizar lotes, dar baixa ou cadastrar.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* SMARTPHONE / MOBILE SLIDE-UP BOTTOM SHEET (For screens < lg)               */}
          {/* Automatically opens when a slot is tapped, no more scrolling down!       */}
          {/* ========================================================================= */}
          <AnimatePresence>
            {selectedSlot && (
              <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
                {/* Backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setSelectedSlot(null)}
                  className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
                />

                {/* Bottom Sheet Drawer */}
                <motion.div
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '100%' }}
                  transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                  className={`relative z-10 w-full max-h-[85vh] overflow-y-auto rounded-t-3xl border-t p-5 shadow-2xl ${
                    isDark 
                      ? 'bg-slate-900 border-slate-800 text-white' 
                      : 'bg-white border-slate-200 text-slate-900'
                  }`}
                >
                  {/* Pull down indicator handle */}
                  <div className="flex justify-center mb-3">
                    <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
                  </div>

                  {renderSlotManagerContent(true)}
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STRUCTURAL CONFIGURATION MODAL (PASSAGE / BLOCKED / LARGE BAY)             */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {configuringSlot && selectedStreet && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfiguringSlot(null)}
              className="absolute inset-0 bg-black/70 backdrop-blur-xs"
            />

            {/* Modal Dialog */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className={`relative z-10 w-full max-w-lg rounded-3xl border p-5 sm:p-6 shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto ${
                isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
              <div className="flex items-start justify-between border-b pb-3.5 mb-4 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-orange-500/10 text-orange-500">
                    <Wrench className="w-5 h-5 stroke-[2.2]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-orange-500/15 text-orange-500 font-mono">
                        P{configuringSlot.level} • C{configuringSlot.column}
                      </span>
                      <span className="text-xs font-bold text-slate-400">
                        {config.streets[selectedStreet]?.name}
                      </span>
                    </div>
                    <h3 className="text-base font-black tracking-tight mt-0.5">
                      Configurar Estrutura da Vaga
                    </h3>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setConfiguringSlot(null)}
                  className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveSlotStructure} className="space-y-4">
                {/* Tipo de Posição (Disponível, Passagem, Bloqueado) */}
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-2">
                    Tipo da Posição na Prateleira
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {/* Disponível */}
                    <button
                      type="button"
                      onClick={() => setSlotTypeChoice('available')}
                      className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                        slotTypeChoice === 'available'
                          ? 'border-orange-500 bg-orange-500/10 ring-2 ring-orange-500/20 text-orange-600 dark:text-orange-400'
                          : isDark ? 'border-slate-800 bg-slate-950/40 text-slate-300' : 'border-slate-200 bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <Package className="w-4 h-4" />
                        {slotTypeChoice === 'available' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                      <span className="text-xs font-black block">Vaga de Estoque</span>
                      <span className="text-[10px] text-slate-400 leading-tight mt-0.5">Disponível para receber lotes</span>
                    </button>

                    {/* Passagem */}
                    <button
                      type="button"
                      onClick={() => setSlotTypeChoice('passage')}
                      className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                        slotTypeChoice === 'passage'
                          ? 'border-amber-500 bg-amber-500/15 ring-2 ring-amber-500/20 text-amber-600 dark:text-amber-400'
                          : isDark ? 'border-slate-800 bg-slate-950/40 text-slate-300' : 'border-slate-200 bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <Footprints className="w-4 h-4" />
                        {slotTypeChoice === 'passage' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                      <span className="text-xs font-black block">Passagem Livre</span>
                      <span className="text-[10px] text-slate-400 leading-tight mt-0.5">Corredor / pedestres / empilhadeira</span>
                    </button>

                    {/* Bloqueado */}
                    <button
                      type="button"
                      onClick={() => setSlotTypeChoice('blocked')}
                      className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                        slotTypeChoice === 'blocked'
                          ? 'border-rose-500 bg-rose-500/15 ring-2 ring-rose-500/20 text-rose-600 dark:text-rose-400'
                          : isDark ? 'border-slate-800 bg-slate-950/40 text-slate-300' : 'border-slate-200 bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <Ban className="w-4 h-4" />
                        {slotTypeChoice === 'blocked' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                      <span className="text-xs font-black block">Pilar / Bloqueio</span>
                      <span className="text-[10px] text-slate-400 leading-tight mt-0.5">Obstrução física inutilizável</span>
                    </button>
                  </div>
                </div>

                {/* Tamanho da Vaga (Somente quando Tipo for Disponível) */}
                {slotTypeChoice === 'available' && (
                  <div className="animate-in fade-in duration-150">
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-2">
                      Tamanho / Porte da Vaga
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {/* Standard */}
                      <button
                        type="button"
                        onClick={() => setSlotSizeChoice('standard')}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                          slotSizeChoice === 'standard'
                            ? 'border-orange-500 bg-orange-500/10 text-orange-600 dark:text-orange-400 font-black'
                            : isDark ? 'border-slate-800 text-slate-300' : 'border-slate-200 text-slate-700'
                        }`}
                      >
                        <span className="text-xs">Padrão (1 Palete)</span>
                        {slotSizeChoice === 'standard' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </button>

                      {/* Double Bay */}
                      <button
                        type="button"
                        onClick={() => setSlotSizeChoice('double')}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                          slotSizeChoice === 'double'
                            ? 'border-indigo-500 bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 font-black'
                            : isDark ? 'border-slate-800 text-slate-300' : 'border-slate-200 text-slate-700'
                        }`}
                      >
                        <span className="text-xs flex items-center gap-1">
                          <MoveHorizontal className="w-3 h-3 text-indigo-500" />
                          Vaga Dupla (2x)
                        </span>
                        {slotSizeChoice === 'double' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </button>

                      {/* High Clearance */}
                      <button
                        type="button"
                        onClick={() => setSlotSizeChoice('high_clearance')}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                          slotSizeChoice === 'high_clearance'
                            ? 'border-cyan-500 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-black'
                            : isDark ? 'border-slate-800 text-slate-300' : 'border-slate-200 text-slate-700'
                        }`}
                      >
                        <span className="text-xs flex items-center gap-1">
                          <MoveVertical className="w-3 h-3 text-cyan-500" />
                          Pé-Direito Alto
                        </span>
                        {slotSizeChoice === 'high_clearance' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </button>
                    </div>
                  </div>
                )}

                {/* Rótulo Personalizado */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">
                    Identificação / Rótulo Visual (Opcional)
                  </label>
                  <input
                    type="text"
                    value={slotLabelInput}
                    onChange={(e) => setSlotLabelInput(e.target.value)}
                    placeholder={slotTypeChoice === 'passage' ? 'Ex: Passagem de Pedestres Bloco A' : slotTypeChoice === 'blocked' ? 'Ex: Pilar Central P-04' : 'Ex: Vaga Especial Paletes Duplos'}
                    className={`w-full px-3 py-2.5 rounded-xl text-xs font-bold border transition ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>

                {/* Observações Estruturais */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">
                    Observações Estruturais (Opcional)
                  </label>
                  <textarea
                    rows={2}
                    value={slotNotesInput}
                    onChange={(e) => setSlotNotesInput(e.target.value)}
                    placeholder="Ex: Altura livre 4,20m, trânsito liberado apenas para carrinhos manuais..."
                    className={`w-full px-3 py-2 rounded-xl text-xs font-semibold border transition ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>

                {/* Actions: Save, Reset, Cancel */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t dark:border-slate-800">
                  <button
                    type="button"
                    onClick={handleResetSlotStructure}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border cursor-pointer transition flex items-center gap-1 ${
                      isDark ? 'border-slate-800 text-slate-400 hover:text-white' : 'border-slate-200 text-slate-600 hover:text-slate-900'
                    }`}
                    title="Remover todas as personalizações e restaurar como vaga disponível padrão"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restaurar Vaga Padrão</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setConfiguringSlot(null)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold border cursor-pointer transition ${
                        isDark ? 'border-slate-800 text-slate-400 hover:text-white' : 'border-slate-200 text-slate-600'
                      }`}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl text-xs font-black bg-orange-600 hover:bg-orange-700 text-white cursor-pointer shadow-sm active:scale-95 transition flex items-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                      <span>Salvar Estrutura</span>
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CONFIRM DELETE BATCH DIALOG MODAL */}
      <DeleteBatchConfirmModal
        isOpen={!!batchToDelete}
        batch={batchToDelete}
        streetName={batchToDelete ? (config.streets[batchToDelete.street]?.name || batchToDelete.street) : undefined}
        alertThresholdDays={config.alertThresholdDays}
        onConfirm={() => {
          if (batchToDelete) {
            onDeleteBatch(batchToDelete.id);
            if (editingBatchId === batchToDelete.id) {
              setEditingBatchId(null);
              setIsAddingToSlot(false);
            }
            setBatchToDelete(null);
          }
        }}
        onCancel={() => setBatchToDelete(null)}
        isDark={isDark}
        language={config.language}
      />
    </div>
  );
};
