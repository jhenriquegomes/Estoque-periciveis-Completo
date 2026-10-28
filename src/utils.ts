/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Batch, ExpiryStatus } from './types';

// Anchor date: July 5, 2026 (matching system metadata for the run)
export const getTodayDate = (): Date => {
  return new Date('2026-07-05T00:00:00');
};

export const getTodayDateString = (): string => {
  return '2026-07-05';
};

/**
 * Calculates the expiry status of a given batch based on the threshold days
 */
export const calculateExpiryStatus = (expiryDateStr: string, thresholdDays: number): ExpiryStatus => {
  if (!expiryDateStr) {
    return {
      isExpired: false,
      isExpiringSoon: false,
      daysRemaining: 999999,
      colorClass: 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-950/40 dark:text-slate-400 dark:border-slate-800',
      textClass: 'text-slate-400 dark:text-slate-500',
    };
  }
  const today = getTodayDate();
  const expiryDate = new Date(expiryDateStr + 'T00:00:00');
  
  // Calculate difference in days
  const diffTime = expiryDate.getTime() - today.getTime();
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  const isExpired = daysRemaining < 0;
  const isExpiringSoon = daysRemaining >= 0 && daysRemaining <= thresholdDays;
  
  let colorClass = 'bg-emerald-50 text-emerald-800 border-emerald-200';
  let textClass = 'text-emerald-600';
  
  if (isExpired) {
    colorClass = 'bg-rose-50 text-rose-800 border-rose-200';
    textClass = 'text-rose-600 font-bold';
  } else if (isExpiringSoon) {
    colorClass = 'bg-amber-50 text-amber-800 border-amber-200';
    textClass = 'text-amber-600 font-semibold';
  }
  
  return {
    isExpired,
    isExpiringSoon,
    daysRemaining,
    colorClass,
    textClass,
  };
};

/**
 * Formats an ISO string date to a friendly Portuguese representation
 * e.g., "2026-07-05" -> "05/07/2026"
 */
export const formatDatePT = (dateStr: string): string => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

/**
 * Aggregates all batches in a specific slot (street, level, column)
 * and returns the collective priority status for grid coloring.
 */
export const getSlotStatus = (
  batches: Batch[],
  street: string,
  level: number,
  column: number,
  thresholdDays: number
) => {
  const slotBatches = batches.filter(
    (b) => b.street === street && b.level === level && b.column === column
  );
  
  if (slotBatches.length === 0) {
    return {
      status: 'empty',
      label: 'Vazio',
      colorClass: 'bg-slate-50 hover:bg-slate-100 text-slate-400 border-slate-200',
      count: 0,
    };
  }
  
  let hasExpired = false;
  let hasExpiringSoon = false;
  
  for (const b of slotBatches) {
    const { isExpired, isExpiringSoon } = calculateExpiryStatus(b.expiryDate, thresholdDays);
    if (isExpired) hasExpired = true;
    if (isExpiringSoon) hasExpiringSoon = true;
  }
  
  if (hasExpired) {
    return {
      status: 'expired',
      label: 'Vencido',
      colorClass: 'bg-rose-100 hover:bg-rose-200 border-rose-300 text-rose-800 font-semibold ring-2 ring-rose-300 ring-offset-1 animate-pulse-subtle',
      count: slotBatches.length,
    };
  }
  
  if (hasExpiringSoon) {
    return {
      status: 'warning',
      label: 'Vence em breve',
      colorClass: 'bg-amber-100 hover:bg-amber-200 border-amber-300 text-amber-800 font-medium ring-1 ring-amber-300',
      count: slotBatches.length,
    };
  }
  
  return {
    status: 'ok',
    label: 'Seguro',
    colorClass: 'bg-emerald-100 hover:bg-emerald-200 border-emerald-300 text-emerald-800',
    count: slotBatches.length,
  };
};

export const COLOR_PALETTE = {
  orange: {
    name: { PT: 'Laranja', ES: 'Naranja', EN: 'Orange' },
    lightBg: 'bg-orange-50/70 hover:bg-orange-100/60 border-orange-200 text-orange-800',
    lightText: 'text-orange-800',
    darkBg: 'bg-orange-950/20 hover:bg-orange-950/30 border-orange-900/40 text-orange-300',
    darkText: 'text-orange-300',
    dotColor: 'bg-orange-500',
    solidBg: 'bg-orange-500',
    ringColor: 'ring-orange-400',
    btnLightOccupied: 'bg-orange-100 border-orange-200 text-orange-900 hover:bg-orange-200/60',
    btnDarkOccupied: 'bg-orange-950/40 border-orange-900/50 text-orange-200 hover:bg-orange-900/40',
    btnLightEmpty: 'bg-orange-50/15 border-orange-100/30 text-orange-300/60 hover:bg-orange-50/40',
    btnDarkEmpty: 'bg-slate-950 border-slate-900 text-slate-600 hover:bg-slate-900',
  },
  amber: {
    name: { PT: 'Amarelo', ES: 'Amarillo', EN: 'Amber' },
    lightBg: 'bg-amber-50/70 hover:bg-amber-100/60 border-amber-200 text-amber-850',
    lightText: 'text-amber-800',
    darkBg: 'bg-amber-950/20 hover:bg-amber-950/30 border-amber-900/40 text-amber-300',
    darkText: 'text-amber-300',
    dotColor: 'bg-amber-500',
    solidBg: 'bg-amber-500',
    ringColor: 'ring-amber-400',
    btnLightOccupied: 'bg-amber-100 border-amber-200 text-amber-900 hover:bg-amber-200/60',
    btnDarkOccupied: 'bg-amber-950/40 border-amber-900/50 text-amber-200 hover:bg-amber-900/40',
    btnLightEmpty: 'bg-amber-50/15 border-amber-100/30 text-amber-300/60 hover:bg-amber-50/40',
    btnDarkEmpty: 'bg-slate-950 border-slate-900 text-slate-600 hover:bg-slate-900',
  },
  rose: {
    name: { PT: 'Rosa', ES: 'Rosa', EN: 'Rose' },
    lightBg: 'bg-rose-50/70 hover:bg-rose-100/60 border-rose-200 text-rose-850',
    lightText: 'text-rose-800',
    darkBg: 'bg-rose-950/20 hover:bg-rose-950/30 border-rose-900/40 text-rose-300',
    darkText: 'text-rose-300',
    dotColor: 'bg-rose-500',
    solidBg: 'bg-rose-500',
    ringColor: 'ring-rose-400',
    btnLightOccupied: 'bg-rose-100 border-rose-200 text-rose-900 hover:bg-rose-200/60',
    btnDarkOccupied: 'bg-rose-950/40 border-rose-900/50 text-rose-200 hover:bg-rose-900/40',
    btnLightEmpty: 'bg-rose-50/15 border-rose-100/30 text-rose-300/60 hover:bg-rose-50/40',
    btnDarkEmpty: 'bg-slate-950 border-slate-900 text-slate-600 hover:bg-slate-900',
  },
  blue: {
    name: { PT: 'Azul', ES: 'Azul', EN: 'Blue' },
    lightBg: 'bg-blue-50/70 hover:bg-blue-100/60 border-blue-200 text-blue-850',
    lightText: 'text-blue-800',
    darkBg: 'bg-blue-950/20 hover:bg-blue-950/30 border-blue-900/40 text-blue-300',
    darkText: 'text-blue-300',
    dotColor: 'bg-blue-500',
    solidBg: 'bg-blue-500',
    ringColor: 'ring-blue-400',
    btnLightOccupied: 'bg-blue-100 border-blue-200 text-blue-900 hover:bg-blue-200/60',
    btnDarkOccupied: 'bg-blue-950/40 border-blue-900/50 text-blue-200 hover:bg-blue-900/40',
    btnLightEmpty: 'bg-blue-50/15 border-blue-100/30 text-blue-300/60 hover:bg-blue-50/40',
    btnDarkEmpty: 'bg-slate-950 border-slate-900 text-slate-600 hover:bg-slate-900',
  },
  emerald: {
    name: { PT: 'Verde', ES: 'Verde', EN: 'Green' },
    lightBg: 'bg-emerald-50/70 hover:bg-emerald-100/60 border-emerald-200 text-emerald-850',
    lightText: 'text-emerald-800',
    darkBg: 'bg-emerald-950/20 hover:bg-emerald-950/30 border-emerald-900/40 text-emerald-300',
    darkText: 'text-emerald-300',
    dotColor: 'bg-emerald-500',
    solidBg: 'bg-emerald-500',
    ringColor: 'ring-emerald-400',
    btnLightOccupied: 'bg-emerald-100 border-emerald-200 text-emerald-900 hover:bg-emerald-200/60',
    btnDarkOccupied: 'bg-emerald-950/40 border-emerald-900/50 text-emerald-200 hover:bg-emerald-900/40',
    btnLightEmpty: 'bg-emerald-50/15 border-emerald-100/30 text-emerald-300/60 hover:bg-emerald-50/40',
    btnDarkEmpty: 'bg-slate-950 border-slate-900 text-slate-600 hover:bg-slate-900',
  },
  purple: {
    name: { PT: 'Roxo', ES: 'Púrpura', EN: 'Purple' },
    lightBg: 'bg-purple-50/70 hover:bg-purple-100/60 border-purple-200 text-purple-850',
    lightText: 'text-purple-800',
    darkBg: 'bg-purple-950/20 hover:bg-purple-950/30 border-purple-900/40 text-purple-300',
    darkText: 'text-purple-300',
    dotColor: 'bg-purple-500',
    solidBg: 'bg-purple-500',
    ringColor: 'ring-purple-400',
    btnLightOccupied: 'bg-purple-100 border-purple-200 text-purple-900 hover:bg-purple-200/60',
    btnDarkOccupied: 'bg-purple-950/40 border-purple-900/50 text-purple-200 hover:bg-purple-900/40',
    btnLightEmpty: 'bg-purple-50/15 border-purple-100/30 text-purple-300/60 hover:bg-purple-50/40',
    btnDarkEmpty: 'bg-slate-950 border-slate-900 text-slate-600 hover:bg-slate-900',
  },
  teal: {
    name: { PT: 'Ciano', ES: 'Cian', EN: 'Teal' },
    lightBg: 'bg-teal-50/70 hover:bg-teal-100/60 border-teal-200 text-teal-850',
    lightText: 'text-teal-800',
    darkBg: 'bg-teal-950/20 hover:bg-teal-950/30 border-teal-900/40 text-teal-300',
    darkText: 'text-teal-300',
    dotColor: 'bg-teal-500',
    solidBg: 'bg-teal-500',
    ringColor: 'ring-teal-400',
    btnLightOccupied: 'bg-teal-100 border-teal-200 text-teal-900 hover:bg-teal-200/60',
    btnDarkOccupied: 'bg-teal-950/40 border-teal-900/50 text-teal-200 hover:bg-teal-900/40',
    btnLightEmpty: 'bg-teal-50/15 border-teal-100/30 text-teal-300/60 hover:bg-teal-50/40',
    btnDarkEmpty: 'bg-slate-950 border-slate-900 text-slate-600 hover:bg-slate-900',
  },
  indigo: {
    name: { PT: 'Índigo', ES: 'Índigo', EN: 'Indigo' },
    lightBg: 'bg-indigo-50/70 hover:bg-indigo-100/60 border-indigo-200 text-indigo-850',
    lightText: 'text-indigo-800',
    darkBg: 'bg-indigo-950/20 hover:bg-indigo-950/30 border-indigo-900/40 text-indigo-300',
    darkText: 'text-indigo-300',
    dotColor: 'bg-indigo-500',
    solidBg: 'bg-indigo-500',
    ringColor: 'ring-indigo-400',
    btnLightOccupied: 'bg-indigo-100 border-indigo-200 text-indigo-900 hover:bg-indigo-200/60',
    btnDarkOccupied: 'bg-indigo-950/40 border-indigo-900/50 text-indigo-200 hover:bg-indigo-900/40',
    btnLightEmpty: 'bg-indigo-50/15 border-indigo-100/30 text-indigo-300/60 hover:bg-indigo-50/40',
    btnDarkEmpty: 'bg-slate-950 border-slate-900 text-slate-600 hover:bg-slate-900',
  },
  cyan: {
    name: { PT: 'Ciano', ES: 'Cian', EN: 'Cyan' },
    lightBg: 'bg-cyan-50/70 hover:bg-cyan-100/60 border-cyan-200 text-cyan-850',
    lightText: 'text-cyan-800',
    darkBg: 'bg-cyan-950/20 hover:bg-cyan-950/30 border-cyan-900/40 text-cyan-300',
    darkText: 'text-cyan-300',
    dotColor: 'bg-cyan-500',
    solidBg: 'bg-cyan-500',
    ringColor: 'ring-cyan-400',
    btnLightOccupied: 'bg-cyan-100 border-cyan-200 text-cyan-900 hover:bg-cyan-200/60',
    btnDarkOccupied: 'bg-cyan-950/40 border-cyan-900/50 text-cyan-200 hover:bg-cyan-900/40',
    btnLightEmpty: 'bg-cyan-50/15 border-cyan-100/30 text-cyan-300/60 hover:bg-cyan-50/40',
    btnDarkEmpty: 'bg-slate-950 border-slate-900 text-slate-600 hover:bg-slate-900',
  },
  pink: {
    name: { PT: 'Rosa Pink', ES: 'Rosa Fucsia', EN: 'Pink' },
    lightBg: 'bg-pink-50/70 hover:bg-pink-100/60 border-pink-200 text-pink-850',
    lightText: 'text-pink-800',
    darkBg: 'bg-pink-950/20 hover:bg-pink-950/30 border-pink-900/40 text-pink-300',
    darkText: 'text-pink-300',
    dotColor: 'bg-pink-500',
    solidBg: 'bg-pink-500',
    ringColor: 'ring-pink-400',
    btnLightOccupied: 'bg-pink-100 border-pink-200 text-pink-900 hover:bg-pink-200/60',
    btnDarkOccupied: 'bg-pink-950/40 border-pink-900/50 text-pink-200 hover:bg-pink-900/40',
    btnLightEmpty: 'bg-pink-50/15 border-pink-100/30 text-pink-300/60 hover:bg-pink-50/40',
    btnDarkEmpty: 'bg-slate-950 border-slate-900 text-slate-600 hover:bg-slate-900',
  },
  lime: {
    name: { PT: 'Lima / Verde Claro', ES: 'Lima', EN: 'Lime' },
    lightBg: 'bg-lime-50/70 hover:bg-lime-100/60 border-lime-200 text-lime-850',
    lightText: 'text-lime-800',
    darkBg: 'bg-lime-950/20 hover:bg-lime-950/30 border-lime-900/40 text-lime-300',
    darkText: 'text-lime-300',
    dotColor: 'bg-lime-500',
    solidBg: 'bg-lime-500',
    ringColor: 'ring-lime-400',
    btnLightOccupied: 'bg-lime-100 border-lime-200 text-lime-900 hover:bg-lime-200/60',
    btnDarkOccupied: 'bg-lime-950/40 border-lime-900/50 text-lime-200 hover:bg-lime-900/40',
    btnLightEmpty: 'bg-lime-50/15 border-lime-100/30 text-lime-300/60 hover:bg-lime-50/40',
    btnDarkEmpty: 'bg-slate-950 border-slate-900 text-slate-600 hover:bg-slate-900',
  },
  red: {
    name: { PT: 'Vermelho Intenso', ES: 'Rojo', EN: 'Red' },
    lightBg: 'bg-red-50/70 hover:bg-red-100/60 border-red-200 text-red-850',
    lightText: 'text-red-800',
    darkBg: 'bg-red-950/20 hover:bg-red-950/30 border-red-900/40 text-red-300',
    darkText: 'text-red-300',
    dotColor: 'bg-red-500',
    solidBg: 'bg-red-500',
    ringColor: 'ring-red-400',
    btnLightOccupied: 'bg-red-100 border-red-200 text-red-900 hover:bg-red-200/60',
    btnDarkOccupied: 'bg-red-950/40 border-red-900/50 text-red-200 hover:bg-red-900/40',
    btnLightEmpty: 'bg-red-50/15 border-red-100/30 text-red-300/60 hover:bg-red-50/40',
    btnDarkEmpty: 'bg-slate-950 border-slate-900 text-slate-600 hover:bg-slate-900',
  }
};

export const getStreetColorStyle = (colorName: string | undefined, index: number, isDark: boolean) => {
  // Check if color is a custom hex
  if (colorName && colorName.startsWith('#')) {
    const hex = colorName;
    return {
      key: hex,
      isHex: true,
      hexColor: hex,
      bg: isDark ? 'border' : 'border shadow-3xs',
      text: isDark ? 'text-white' : 'text-slate-900',
      dot: '',
      solidBg: '',
      ringColor: '',
      btnOccupied: isDark ? 'border text-white' : 'border text-slate-900 shadow-3xs',
      btnEmpty: isDark ? 'bg-slate-950 border-slate-900 text-slate-600 hover:bg-slate-900' : 'bg-slate-50 border-slate-100 text-slate-400',
      name: { PT: 'Customizado', ES: 'Personalizado', EN: 'Custom' },
      customStyle: {
        backgroundColor: isDark ? `${hex}18` : `${hex}10`,
        borderColor: `${hex}45`,
      },
      customTextStyle: {
        color: hex,
      },
      customDotStyle: {
        backgroundColor: hex,
      },
      customBtnOccupiedStyle: {
        backgroundColor: isDark ? `${hex}30` : `${hex}22`,
        borderColor: `${hex}60`,
      }
    };
  }

  const keys = Object.keys(COLOR_PALETTE);
  const colorKey = (colorName && COLOR_PALETTE[colorName as keyof typeof COLOR_PALETTE]) 
    ? colorName 
    : keys[index % keys.length];
  
  const scheme = COLOR_PALETTE[colorKey as keyof typeof COLOR_PALETTE];
  return {
    key: colorKey,
    isHex: false,
    hexColor: undefined,
    bg: isDark ? scheme.darkBg : scheme.lightBg,
    text: isDark ? scheme.darkText : scheme.lightText,
    dot: scheme.dotColor,
    solidBg: scheme.solidBg,
    ringColor: scheme.ringColor,
    btnOccupied: isDark ? scheme.btnDarkOccupied : scheme.btnLightOccupied,
    btnEmpty: isDark ? scheme.btnDarkEmpty : scheme.btnLightEmpty,
    name: scheme.name,
    customStyle: undefined,
    customTextStyle: undefined,
    customDotStyle: undefined,
    customBtnOccupiedStyle: undefined,
  };
};
