/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { 
  Trash2, 
  AlertTriangle, 
  X, 
  MapPin, 
  Calendar, 
  Hash, 
  Package, 
  CheckCircle2, 
  Clock 
} from 'lucide-react';
import { Batch } from '../types';
import { calculateExpiryStatus, formatDatePT } from '../utils';
import { Language } from '../utils/translations';

interface DeleteBatchConfirmModalProps {
  isOpen: boolean;
  batch: Batch | null;
  streetName?: string;
  alertThresholdDays?: number;
  onConfirm: () => void;
  onCancel: () => void;
  isDark?: boolean;
  language?: Language;
}

export const DeleteBatchConfirmModal: React.FC<DeleteBatchConfirmModalProps> = ({
  isOpen,
  batch,
  streetName,
  alertThresholdDays = 5,
  onConfirm,
  onCancel,
  isDark = true,
  language = 'PT',
}) => {
  // Listen for Escape key to close modal safely
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen || !batch) return null;

  const expiryStatus = calculateExpiryStatus(batch.expiryDate, alertThresholdDays);
  const locationLabel = streetName || batch.street;

  const titles = {
    PT: 'Confirmar Exclusão de Lote',
    ES: 'Confirmar Eliminación de Lote',
    EN: 'Confirm Batch Deletion',
  };

  const descriptions = {
    PT: 'Tem certeza de que deseja dar baixa e excluir este lote? Esta ação removerá os itens da prateleira e do inventário do estoque.',
    ES: '¿Está seguro de que desea dar de baja y eliminar este lote? Esta acción eliminará los productos del estante y del inventario.',
    EN: 'Are you sure you want to remove and delete this batch? This will remove the items from the shelf and inventory.',
  };

  const cancelLabels = {
    PT: 'Cancelar',
    ES: 'Cancelar',
    EN: 'Cancel',
  };

  const confirmLabels = {
    PT: 'Sim, Excluir Lote',
    ES: 'Sí, Eliminar Lote',
    EN: 'Yes, Delete Batch',
  };

  return (
    <div 
      className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-batch-title"
    >
      <div
        className={`w-full max-w-md rounded-3xl p-5 sm:p-6 shadow-2xl border transition-all duration-200 scale-100 animate-in zoom-in-95 ${
          isDark 
            ? 'bg-slate-900 border-slate-800 text-white shadow-black/60' 
            : 'bg-white border-slate-200 text-slate-800 shadow-slate-900/20'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-500 shrink-0">
              <Trash2 className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 id="delete-batch-title" className="font-sans font-extrabold text-base sm:text-lg leading-tight">
                {titles[language] || titles.PT}
              </h3>
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500 flex items-center gap-1 mt-0.5">
                <AlertTriangle className="w-3 h-3" />
                {language === 'EN' ? 'Irreversible Action' : language === 'ES' ? 'Acción Irreversible' : 'Ação com Baixa no Estoque'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onCancel}
            className={`p-1.5 rounded-xl border transition-colors cursor-pointer ${
              isDark 
                ? 'border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800' 
                : 'border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-100'
            }`}
            title="Fechar (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* DESCRIPTION MESSAGE */}
        <p className={`text-xs font-medium leading-relaxed mb-4 ${
          isDark ? 'text-slate-300' : 'text-slate-600'
        }`}>
          {descriptions[language] || descriptions.PT}
        </p>

        {/* BATCH DETAIL SUMMARY CARD */}
        <div className={`p-4 rounded-2xl border mb-5 space-y-2.5 ${
          isDark 
            ? 'bg-slate-950/70 border-slate-800/80' 
            : 'bg-slate-50 border-slate-200'
        }`}>
          {/* Item Name & Quantity */}
          <div className="flex items-center justify-between gap-2 border-b pb-2.5 border-dashed border-slate-700/50 dark:border-slate-800">
            <div className="min-w-0 flex-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                {language === 'EN' ? 'Product' : 'Produto / Alimento'}
              </span>
              <span className={`font-black text-sm block truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {batch.itemName}
              </span>
            </div>

            <div className="text-right shrink-0">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                {language === 'EN' ? 'Quantity' : 'Quantidade'}
              </span>
              <span className="text-sm font-black text-orange-500">
                {batch.quantity} {batch.unit}
              </span>
            </div>
          </div>

          {/* Code & Location */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                {language === 'EN' ? 'Batch Code' : 'Código do Lote'}
              </span>
              <span className="font-mono font-bold flex items-center gap-1 text-[11px] mt-0.5">
                <Hash className="w-3 h-3 text-orange-500" />
                {batch.batchCode || (language === 'EN' ? 'No batch code' : 'Sem código')}
              </span>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                {language === 'EN' ? 'Location' : 'Posição na Prateleira'}
              </span>
              <span className="font-bold flex items-center gap-1 text-[11px] mt-0.5 truncate">
                <MapPin className="w-3 h-3 text-orange-500 shrink-0" />
                <span className="truncate">{locationLabel} • P{batch.level} C{batch.column}</span>
              </span>
            </div>
          </div>

          {/* Expiry Date */}
          <div className="pt-2 border-t border-dashed border-slate-700/50 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-[11px] text-slate-400 flex items-center gap-1 font-semibold">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              {language === 'EN' ? 'Expiry:' : 'Validade:'} {batch.expiryDate ? formatDatePT(batch.expiryDate) : (language === 'EN' ? 'No expiry' : 'Sem vencimento')}
            </span>

            {batch.expiryDate && (
              expiryStatus.isExpired ? (
                <span className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-500 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {language === 'EN' ? `Expired (${Math.abs(expiryStatus.daysRemaining)}d)` : `Vencido (${Math.abs(expiryStatus.daysRemaining)}d)`}
                </span>
              ) : expiryStatus.isExpiringSoon ? (
                <span className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-500 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {language === 'EN' ? `Expiring in ${expiryStatus.daysRemaining}d` : `Vence em ${expiryStatus.daysRemaining}d`}
                </span>
              ) : (
                <span className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  {language === 'EN' ? `Safe (${expiryStatus.daysRemaining}d)` : `Seguro (${expiryStatus.daysRemaining}d)`}
                </span>
              )
            )}
          </div>

          {batch.notes && (
            <p className={`text-[10px] p-2 rounded-xl border italic mt-1 ${
              isDark ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-600'
            }`}>
              <strong className="not-italic text-slate-400 font-bold">{language === 'EN' ? 'Obs:' : 'Obs:'}</strong> {batch.notes}
            </p>
          )}
        </div>

        {/* MODAL ACTIONS */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onCancel}
            className={`py-3 px-4 rounded-xl border text-xs sm:text-sm font-bold transition-all cursor-pointer active:scale-98 ${
              isDark 
                ? 'bg-slate-800 hover:bg-slate-750 text-slate-300 border-slate-700' 
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
            }`}
          >
            {cancelLabels[language] || cancelLabels.PT}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            className="py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-98 text-white text-xs sm:text-sm font-black flex items-center justify-center gap-1.5 shadow-lg shadow-rose-600/20 cursor-pointer transition-all"
          >
            <Trash2 className="w-4 h-4 stroke-[2.2]" />
            <span>{confirmLabels[language] || confirmLabels.PT}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
