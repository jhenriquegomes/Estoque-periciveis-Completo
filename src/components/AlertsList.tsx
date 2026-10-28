/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  AlertTriangle, 
  Clock, 
  MapPin, 
  Trash2, 
  CheckCircle,
  Bell,
  Search,
  Check,
  X
} from 'lucide-react';
import { Batch, WarehouseConfig } from '../types';
import { calculateExpiryStatus, formatDatePT } from '../utils';
import { getTranslation } from '../utils/translations';
import { DeleteBatchConfirmModal } from './DeleteBatchConfirmModal';

interface AlertsListProps {
  batches: Batch[];
  config: WarehouseConfig;
  onDeleteBatch: (id: string) => void;
  onLocateInMap: (street: string, level: number, column: number) => void;
}

export const AlertsList: React.FC<AlertsListProps> = ({
  batches,
  config,
  onDeleteBatch,
  onLocateInMap,
}) => {
  const t = getTranslation(config.language);
  const [searchTerm, setSearchTerm] = useState('');
  const [batchToDelete, setBatchToDelete] = useState<Batch | null>(null);
  const isDark = config.theme === 'dark';

  // Process all batches to check their expiry status
  const analyzedBatches = batches.map((b) => {
    const status = calculateExpiryStatus(b.expiryDate, config.alertThresholdDays);
    return {
      ...b,
      status,
    };
  });

  // Filter into categories
  const expiredBatches = analyzedBatches
    .filter((b) => b.status.isExpired)
    .sort((a, b) => a.status.daysRemaining - b.status.daysRemaining); // Most expired first

  const expiringSoonBatches = analyzedBatches
    .filter((b) => b.status.isExpiringSoon)
    .sort((a, b) => a.status.daysRemaining - b.status.daysRemaining); // Most urgent first

  const safeBatches = analyzedBatches
    .filter((b) => !b.status.isExpired && !b.status.isExpiringSoon)
    .sort((a, b) => a.status.daysRemaining - b.status.daysRemaining);

  // Combine and filter by search term if typed
  const filterBySearch = (list: typeof analyzedBatches) => {
    if (!searchTerm.trim()) return list;
    const term = searchTerm.toLowerCase();
    return list.filter(
      (b) =>
        b.itemName.toLowerCase().includes(term) ||
        b.batchCode.toLowerCase().includes(term) ||
        b.notes?.toLowerCase().includes(term)
    );
  };

  const filteredExpired = filterBySearch(expiredBatches);
  const filteredExpiringSoon = filterBySearch(expiringSoonBatches);

  return (
    <div className="flex flex-col h-full overflow-y-auto pb-24 space-y-4">
      {/* HEADER ALERTS HERO */}
      <div className={`text-white rounded-2xl p-5 shadow-md border relative overflow-hidden transition-colors duration-300 ${
        isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-900 border-slate-800'
      }`}>
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-5 pointer-events-none bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />
        
        <div className="relative flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-rose-300 bg-rose-950/40 px-2.5 py-1 rounded-lg border border-rose-500/30 w-fit">
              <Bell className="w-3.5 h-3.5 text-rose-400 stroke-[2]" /> {t.alerts}
            </div>
            <h3 className="font-sans font-extrabold text-lg text-white mt-1">
              {t.alerts_title}
            </h3>
            <p className="text-slate-400 text-xs font-semibold">
              {config.language === 'EN' ? 'Monitoring' : config.language === 'ES' ? 'Monitoreando' : 'Monitorando'} <span className="text-orange-400 font-bold">{config.alertThresholdDays} {config.language === 'EN' ? 'days' : config.language === 'ES' ? 'días' : 'dias'}</span> {config.language === 'EN' ? 'for safety warnings.' : config.language === 'ES' ? 'para alertas de segurança.' : 'para aviso prévio.'}
            </p>
          </div>

          <div className="flex gap-2">
            <div className="bg-rose-500/10 text-rose-400 px-3 py-2 rounded-xl text-center min-w-[55px] border border-rose-500/20 shadow-3xs">
              <span className="block text-lg font-extrabold leading-none">{expiredBatches.length}</span>
              <span className="text-[8px] uppercase tracking-wider text-rose-300/80 font-bold">{t.expired}</span>
            </div>
            <div className="bg-amber-400/10 text-amber-400 px-3 py-2 rounded-xl text-center min-w-[55px] border border-amber-400/20 shadow-3xs">
              <span className="block text-lg font-extrabold leading-none">{expiringSoonBatches.length}</span>
              <span className="text-[8px] uppercase tracking-wider text-amber-300/80 font-bold">{config.language === 'EN' ? 'Notice' : config.language === 'ES' ? 'Aviso' : 'Aviso'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* SEARCH BAR */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 stroke-[2]" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={config.language === 'EN' ? 'Search product or batch...' : config.language === 'ES' ? 'Buscar producto o lote...' : 'Pesquisar alimento ou código de lote...'}
          className={`w-full border pl-10 pr-4 py-3 text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-orange-500/30 shadow-3xs transition-all ${
            isDark 
              ? 'bg-slate-900 border-slate-800 text-slate-100 placeholder-slate-500' 
              : 'bg-white border-slate-200/80 text-slate-700 placeholder-slate-400'
          }`}
        />
      </div>

      {/* CATEGORY 1: EXPIRED (CRITICAL) */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-rose-600 tracking-wide flex items-center gap-1.5 px-1">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
          {config.language === 'EN' ? 'Expired Items' : config.language === 'ES' ? 'Productos Vencidos' : 'Produtos Vencidos'} ({filteredExpired.length})
        </h4>

        {filteredExpired.length === 0 ? (
          <div className={`border rounded-2xl p-6 text-center shadow-3xs transition-colors duration-300 ${
            isDark 
              ? 'bg-emerald-950/10 border-emerald-900/20 text-emerald-300' 
              : 'bg-emerald-50/50 border-emerald-100'
          }`}>
            <div className="w-8 h-8 rounded-full bg-emerald-100/50 border border-emerald-200 flex items-center justify-center mx-auto mb-2 text-emerald-600">
              <Check className="w-4 h-4 stroke-[2.5]" />
            </div>
            <p className={`text-xs font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-950'}`}>{t.no_alerts_title}</p>
            <p className="text-[10px] text-emerald-500 font-semibold mt-0.5">{t.no_alerts_subtitle}</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {filteredExpired.map((b) => (
              <div 
                key={b.id}
                className={`border rounded-2xl p-4 shadow-sm flex flex-col justify-between hover:-translate-y-0.5 transition-all duration-300 ${
                  isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'
                }`}
              >
                <div className={`flex justify-between items-start gap-2 border-b pb-2.5 ${
                  isDark ? 'border-slate-850' : 'border-slate-100'
                }`}>
                  <div className="space-y-0.5">
                    <span className={`font-extrabold text-sm ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>{b.itemName}</span>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-mono text-slate-400">
                      <span>{t.code}: <strong className={`font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{b.batchCode || (config.language === 'EN' ? 'No Batch' : config.language === 'ES' ? 'Sin Lote' : 'Sem Lote')}</strong></span>
                      <span className="text-slate-300">•</span>
                      <span>{t.qty}: <strong className={`font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{b.quantity} {b.unit}</strong></span>
                    </div>
                  </div>

                  <span className={`shrink-0 text-[9px] font-bold border px-2 py-0.5 rounded-lg flex items-center gap-0.5 ${
                    isDark ? 'text-rose-400 bg-rose-950/40 border-rose-900/40' : 'text-rose-700 bg-rose-50 border-rose-100'
                  }`}>
                    {config.language === 'EN' ? 'Expired' : config.language === 'ES' ? 'Vencido' : 'Vencido'} {Math.abs(b.status.daysRemaining)}d
                  </span>
                </div>

                {/* LOCATION INFO */}
                <div className={`mt-3 border rounded-xl py-2 px-3 flex items-center justify-between text-xs font-semibold ${
                  isDark ? 'bg-slate-950/60 border-slate-850 text-slate-400' : 'bg-slate-50/50 border-slate-100 text-slate-600'
                }`}>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-orange-500 shrink-0 stroke-[2]" />
                    <span className="text-[10px] text-slate-500">
                      {t.street} <span className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{config.streets[b.street]?.name || b.street}</span>
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded-md border ${
                      isDark ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-600'
                    }`}>P{b.level} C{b.column}</span>
                  </div>

                  <button
                    onClick={() => onLocateInMap(b.street, b.level, b.column)}
                    className="text-[10px] font-bold text-orange-600 hover:text-orange-700 flex items-center gap-0.5 cursor-pointer hover:underline"
                  >
                    {t.locate}
                  </button>
                </div>

                {b.notes && (
                  <p className={`text-[10px] p-2 rounded-lg border mt-2 italic font-semibold ${
                    isDark ? 'text-slate-400 bg-slate-950/65 border-slate-850/60' : 'text-slate-500 bg-slate-50 border-slate-100'
                  }`}>
                    {t.notes}: {b.notes}
                  </p>
                )}

                {/* ACTION ROW */}
                <div className={`flex justify-between items-center mt-3.5 pt-2.5 border-t text-[10px] font-bold text-slate-400 ${
                  isDark ? 'border-slate-850' : 'border-slate-100'
                }`}>
                  <span>{config.language === 'EN' ? 'Expired on' : config.language === 'ES' ? 'Venció el' : 'Venceu em'}: {formatDatePT(b.expiryDate)}</span>
                  
                  <button
                    type="button"
                    onClick={() => setBatchToDelete(b)}
                    className={`flex items-center gap-1 font-bold transition-colors cursor-pointer shadow-3xs px-2.5 py-1.5 rounded-xl border ${
                      isDark 
                        ? 'text-rose-400 bg-rose-950/20 border-rose-900/30 hover:bg-rose-950/40' 
                        : 'text-rose-600 bg-white hover:bg-rose-50 border-rose-100'
                    }`}
                  >
                    <Trash2 className="w-3.5 h-3.5" /> {config.language === 'EN' ? 'Dispose Batch' : 'Descartar Lote'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CATEGORY 2: EXPIRING SOON (WARNING) */}
      <div className="space-y-3 pt-2">
        <h4 className="text-xs font-bold text-amber-600 tracking-wide flex items-center gap-1.5 px-1">
          <Clock className="w-4 h-4 text-amber-500 shrink-0 stroke-[2]" />
          {config.language === 'EN' ? 'Expiring Soon' : config.language === 'ES' ? 'Vence en breve' : 'Vence em breve'} ({filteredExpiringSoon.length})
        </h4>

        {filteredExpiringSoon.length === 0 ? (
          <div className={`border border-dashed rounded-2xl p-6 text-center text-xs font-semibold ${
            isDark ? 'border-slate-800 text-slate-500' : 'border-slate-200 text-slate-400'
          }`}>
            {config.language === 'EN' ? `No batches expiring in the next ${config.alertThresholdDays} days.` : config.language === 'ES' ? `Ningún lote venciendo en los próximos ${config.alertThresholdDays} días.` : `Nenhum lote vencendo nos próximos ${config.alertThresholdDays} dias.`}
          </div>
        ) : (
          <div className="grid gap-3">
            {filteredExpiringSoon.map((b) => (
              <div 
                key={b.id}
                className={`border rounded-2xl p-4 shadow-sm flex flex-col justify-between hover:-translate-y-0.5 transition-all duration-300 ${
                  isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'
                }`}
              >
                <div className={`flex justify-between items-start gap-2 border-b pb-2.5 ${
                  isDark ? 'border-slate-850' : 'border-slate-100'
                }`}>
                  <div className="space-y-0.5">
                    <span className={`font-extrabold text-sm ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>{b.itemName}</span>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-mono text-slate-400">
                      <span>{t.code}: <strong className={`font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{b.batchCode || (config.language === 'EN' ? 'No Batch' : config.language === 'ES' ? 'Sin Lote' : 'Sem Lote')}</strong></span>
                      <span className="text-slate-300">•</span>
                      <span>{t.qty}: <strong className={`font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{b.quantity} {b.unit}</strong></span>
                    </div>
                  </div>

                  <span className={`shrink-0 text-[10px] font-bold border px-2 py-0.5 rounded-lg ${
                    isDark ? 'text-amber-400 bg-amber-950/40 border-amber-900/40' : 'text-amber-700 bg-amber-50 border-amber-100'
                  }`}>
                    {config.language === 'EN' ? `${b.status.daysRemaining} days remaining` : config.language === 'ES' ? `Quedan ${b.status.daysRemaining} días` : `Resta ${b.status.daysRemaining} dias`}
                  </span>
                </div>

                {/* LOCATION INFO */}
                <div className={`mt-3 border rounded-xl py-2 px-3 flex items-center justify-between text-xs font-semibold ${
                  isDark ? 'bg-slate-950/60 border-slate-850 text-slate-400' : 'bg-slate-50/50 border-slate-100 text-slate-600'
                }`}>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-orange-500 shrink-0 stroke-[2]" />
                    <span className="text-[10px] text-slate-500">
                      {t.street} <span className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{config.streets[b.street]?.name || b.street}</span>
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded-md border ${
                      isDark ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-600'
                    }`}>P{b.level} C{b.column}</span>
                  </div>

                  <button
                    onClick={() => onLocateInMap(b.street, b.level, b.column)}
                    className="text-[10px] font-bold text-orange-600 hover:text-orange-700 flex items-center gap-0.5 cursor-pointer hover:underline"
                  >
                    {t.locate}
                  </button>
                </div>

                {b.notes && (
                  <p className={`text-[10px] p-2 rounded-lg border mt-2 italic font-semibold ${
                    isDark ? 'text-slate-400 bg-slate-950/65 border-slate-850/60' : 'text-slate-500 bg-slate-50 border-slate-100'
                  }`}>
                    {t.notes}: {b.notes}
                  </p>
                )}

                {/* ACTION ROW */}
                <div className={`flex justify-between items-center mt-3.5 pt-2.5 border-t text-[10px] font-bold text-slate-400 ${
                  isDark ? 'border-slate-850' : 'border-slate-100'
                }`}>
                  <span>{config.language === 'EN' ? 'Expiring on' : config.language === 'ES' ? 'Vence el' : 'Vence em'}: {formatDatePT(b.expiryDate)}</span>
                  
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setBatchToDelete(b)}
                      className={`flex items-center gap-1 font-bold transition-colors cursor-pointer shadow-3xs px-2.5 py-1.5 rounded-xl border ${
                        isDark 
                          ? 'text-amber-400 bg-amber-950/20 hover:bg-amber-950/40 border-amber-900/30' 
                          : 'text-amber-700 bg-white hover:bg-amber-50 border-amber-100'
                      }`}
                    >
                      <CheckCircle className="w-3.5 h-3.5 text-amber-600 stroke-[2]" /> {config.language === 'EN' ? 'Consumed / Out' : config.language === 'ES' ? 'Consumido / Salida' : 'Consumido / Saída'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CONFIRM DELETE BATCH DIALOG MODAL */}
      <DeleteBatchConfirmModal
        isOpen={!!batchToDelete}
        batch={batchToDelete}
        streetName={batchToDelete ? (config.streets[batchToDelete.street]?.name || batchToDelete.street) : undefined}
        alertThresholdDays={config.alertThresholdDays}
        onConfirm={() => {
          if (batchToDelete) {
            onDeleteBatch(batchToDelete.id);
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

