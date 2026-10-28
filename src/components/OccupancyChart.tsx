/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  Cell, 
  ReferenceLine 
} from 'recharts';
import { 
  WarehouseConfig, 
  Batch,
  SlotConfig
} from '../types';
import { calculateExpiryStatus, getStreetColorStyle } from '../utils';
import { getTranslation } from '../utils/translations';
import { 
  BarChart3, 
  Layers, 
  PieChart, 
  ArrowUpRight, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldAlert, 
  Percent, 
  Boxes, 
  MapPin, 
  Sparkles,
  Maximize2
} from 'lucide-react';

export interface OccupancyChartProps {
  config: WarehouseConfig;
  batches: Batch[];
  onLocateStreet?: (streetId: string) => void;
  isEmbedded?: boolean; // When rendered inside SettingsPanel
  onOpenFullTab?: () => void;
}

// Hex color mapping for street color identifiers
const STREET_HEX_MAP: Record<string, string> = {
  orange: '#f97316',
  amber: '#f59e0b',
  rose: '#f43f5e',
  blue: '#3b82f6',
  emerald: '#10b981',
  purple: '#a855f7',
  cyan: '#06b6d4',
  indigo: '#6366f1',
  slate: '#64748b',
};

const FALLBACK_HEX = ['#f97316', '#3b82f6', '#10b981', '#a855f7', '#f43f5e', '#06b6d4', '#f59e0b'];

export type ChartViewMode = 'stacked_slots' | 'occupancy_pct' | 'validity_status';

export const OccupancyChart: React.FC<OccupancyChartProps> = ({
  config,
  batches,
  onLocateStreet,
  isEmbedded = false,
  onOpenFullTab,
}) => {
  const t = getTranslation(config.language);
  const isDark = config.theme === 'dark';
  const [viewMode, setViewMode] = useState<ChartViewMode>('stacked_slots');
  const [activeStreetHover, setActiveStreetHover] = useState<string | null>(null);

  // Calculate detailed metrics for each street
  const { streetMetrics, globalMetrics } = useMemo(() => {
    const streetsObj = config.streets || {};
    const streetIds = Object.keys(streetsObj);

    let totalGlobalCapacity = 0;
    let totalGlobalOccupiedSlots = 0;
    let totalGlobalBatches = 0;
    let totalGlobalExpired = 0;
    let totalGlobalWarning = 0;

    const metrics = streetIds.map((id, index) => {
      const street = streetsObj[id];
      const levels = street.levels || 1;
      const columns = street.columns || 1;
      const totalCapacity = levels * columns;

      // Batches located in this street
      const streetBatches = batches.filter((b) => b.street === id);

      // Unique occupied (level, column) slots
      const occupiedCoordsSet = new Set<string>();
      let expiredCount = 0;
      let warningCount = 0;
      let safeCount = 0;
      let totalQuantity = 0;

      streetBatches.forEach((b) => {
        occupiedCoordsSet.add(`${b.level}-${b.column}`);
        totalQuantity += Number(b.quantity) || 0;
        const status = calculateExpiryStatus(b.expiryDate, config.alertThresholdDays);
        if (status.isExpired) {
          expiredCount++;
        } else if (status.isExpiringSoon) {
          warningCount++;
        } else {
          safeCount++;
        }
      });

      // batata / corte slot structure exclusions
      let passageCount = 0;
      let blockedCount = 0;
      let doubleCount = 0;
      let highClearanceCount = 0;

      if (street.slots) {
        (Object.values(street.slots) as SlotConfig[]).forEach((slot) => {
          if (slot.type === 'passage') passageCount++;
          else if (slot.type === 'blocked') blockedCount++;
          if (slot.size === 'double') doubleCount++;
          else if (slot.size === 'high_clearance') highClearanceCount++;
        });
      }

      const excludedSlots = passageCount + blockedCount;
      const usableCapacity = Math.max(0, totalCapacity - excludedSlots);
      const occupiedSlots = occupiedCoordsSet.size;
      const freeSlots = Math.max(0, usableCapacity - occupiedSlots);
      const occupancyRate = usableCapacity > 0 ? Math.round((occupiedSlots / usableCapacity) * 100) : 0;

      totalGlobalCapacity += usableCapacity;
      totalGlobalOccupiedSlots += occupiedSlots;
      totalGlobalBatches += streetBatches.length;
      totalGlobalExpired += expiredCount;
      totalGlobalWarning += warningCount;

      const streetColorKey = street.color || 'orange';
      const hexColor = STREET_HEX_MAP[streetColorKey] || FALLBACK_HEX[index % FALLBACK_HEX.length];

      return {
        id,
        name: street.name || id,
        levels,
        columns,
        totalCapacity,
        usableCapacity,
        excludedSlots,
        passageCount,
        blockedCount,
        doubleCount,
        highClearanceCount,
        occupiedSlots,
        freeSlots,
        occupancyRate,
        batchCount: streetBatches.length,
        totalQuantity,
        expiredCount,
        warningCount,
        safeCount,
        colorKey: streetColorKey,
        hexColor,
      };
    });

    const totalGlobalFreeSlots = Math.max(0, totalGlobalCapacity - totalGlobalOccupiedSlots);
    const globalOccupancyRate = totalGlobalCapacity > 0
      ? Math.round((totalGlobalOccupiedSlots / totalGlobalCapacity) * 100)
      : 0;

    // Identify street with highest & lowest occupancy
    const sortedByRate = [...metrics].sort((a, b) => b.occupancyRate - a.occupancyRate);
    const highestOccupancy = sortedByRate[0] || null;
    const lowestOccupancy = sortedByRate[sortedByRate.length - 1] || null;

    return {
      streetMetrics: metrics,
      globalMetrics: {
        totalGlobalCapacity,
        totalGlobalOccupiedSlots,
        totalGlobalFreeSlots,
        globalOccupancyRate,
        totalGlobalBatches,
        totalGlobalExpired,
        totalGlobalWarning,
        highestOccupancy,
        lowestOccupancy,
      },
    };
  }, [config.streets, batches, config.alertThresholdDays]);

  // Labels based on language
  const labels = useMemo(() => {
    const lang = config.language || 'PT';
    if (lang === 'EN') {
      return {
        title: 'Warehouse Sector Occupancy',
        subtitle: 'Real-time capacity, occupied slots, and availability per warehouse street.',
        mode_slots: 'Slots (Occupied vs Free)',
        mode_pct: 'Occupancy Rate (%)',
        mode_validity: 'Batch Expiry Status',
        total_capacity: 'Total Capacity',
        occupied: 'Occupied',
        available: 'Available',
        occupancy_rate: 'Occupancy Rate',
        batches: 'Batches',
        global_avg: 'Global Occupancy',
        total_slots: 'Total Slots',
        highest_sector: 'Highest Occupancy',
        lowest_sector: 'Lowest Occupancy',
        empty_warning: 'No streets registered in the warehouse configuration.',
        view_map: 'View in Map',
        safe: 'Valid',
        warning: 'Expiring Soon',
        expired: 'Expired',
        alert_80: 'High load (>80%)',
        threshold_line: '80% High Load Threshold',
      };
    }
    if (lang === 'ES') {
      return {
        title: 'Ocupación de Sectores del Almacén',
        subtitle: 'Capacidad en tiempo real, espacios ocupados y disponibilidad por calle del galpón.',
        mode_slots: 'Espacios (Ocupados vs Libres)',
        mode_pct: 'Tasa de Ocupación (%)',
        mode_validity: 'Estado de Vencimiento',
        total_capacity: 'Capacidad Total',
        occupied: 'Ocupados',
        available: 'Disponibles',
        occupancy_rate: 'Tasa de Ocupación',
        batches: 'Lotes',
        global_avg: 'Ocupación Global',
        total_slots: 'Espacios Totales',
        highest_sector: 'Mayor Ocupación',
        lowest_sector: 'Menor Ocupación',
        empty_warning: 'No hay calles registradas en la configuración.',
        view_map: 'Ver en Mapa',
        safe: 'En Fecha',
        warning: 'Próximo a Vencer',
        expired: 'Vencido',
        alert_80: 'Alta carga (>80%)',
        threshold_line: 'Límite 80% Alta Ocupación',
      };
    }
    return {
      title: 'Ocupação por Setor do Armazém',
      subtitle: 'Capacidade em tempo real, posições ocupadas e disponibilidade por rua do galpão.',
      mode_slots: 'Espaços (Ocupados vs Livres)',
      mode_pct: 'Taxa de Ocupação (%)',
      mode_validity: 'Status de Validade',
      total_capacity: 'Capacidade Total',
      occupied: 'Ocupados',
      available: 'Livres',
      occupancy_rate: 'Taxa de Ocupação',
      batches: 'Lotes',
      global_avg: 'Ocupação Geral',
      total_slots: 'Total de Espaços',
      highest_sector: 'Maior Ocupação',
      lowest_sector: 'Menor Ocupação',
      empty_warning: 'Nenhuma rua configurada no armazém.',
      view_map: 'Ver no Mapa',
      safe: 'No Prazo',
      warning: 'Vence em Breve',
      expired: 'Vencido',
      alert_80: 'Alta Carga (>80%)',
      threshold_line: 'Linha de 80% (Alerta de Capacidade)',
    };
  }, [config.language]);

  // Custom rich Tooltip for Recharts
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0].payload;
    if (!data) return null;

    return (
      <div className={`p-3.5 rounded-2xl shadow-xl border backdrop-blur-md transition-all ${
        isDark 
          ? 'bg-slate-900/95 border-slate-700 text-slate-100 shadow-[0_10px_25px_rgba(0,0,0,0.5)]' 
          : 'bg-white/95 border-slate-200 text-slate-800 shadow-[0_10px_25px_rgba(0,0,0,0.1)]'
      } min-w-[210px] text-xs`}>
        {/* Street Header */}
        <div className="flex items-center justify-between gap-2 border-b pb-2 mb-2.5 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span 
              className="w-3 h-3 rounded-full shrink-0 shadow-xs ring-2 ring-white dark:ring-slate-900" 
              style={{ backgroundColor: data.hexColor }} 
            />
            <span className="font-extrabold text-sm tracking-tight">
              {t.street} {data.name}
            </span>
          </div>
          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
            data.occupancyRate >= 80 
              ? 'bg-rose-500/15 text-rose-500 border border-rose-500/30' 
              : data.occupancyRate >= 50
                ? 'bg-amber-500/15 text-amber-500 border border-amber-500/30'
                : 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
          }`}>
            {data.occupancyRate}%
          </span>
        </div>

        {/* Capacity Details */}
        <div className="space-y-1.5 text-[11px]">
          <div className="flex justify-between items-center text-slate-400">
            <span>Dimensões:</span>
            <span className="font-mono font-bold text-slate-200 dark:text-slate-300">
              {data.levels} andares × {data.columns} colunas
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400">{labels.total_capacity}:</span>
            <span className="font-bold">{data.totalCapacity} posições</span>
          </div>
          <div className="flex justify-between items-center text-orange-500 font-semibold">
            <span>• {labels.occupied}:</span>
            <span className="font-bold">{data.occupiedSlots}</span>
          </div>
          <div className="flex justify-between items-center text-emerald-500 font-semibold">
            <span>• {labels.available}:</span>
            <span className="font-bold">{data.freeSlots}</span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden my-2">
            <div 
              className="h-full rounded-full transition-all duration-500" 
              style={{ 
                width: `${data.occupancyRate}%`,
                backgroundColor: data.hexColor 
              }} 
            />
          </div>

          {/* Batches count & validity alert indicators */}
          <div className="pt-1.5 border-t dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
            <span>{labels.batches}: <strong>{data.batchCount}</strong> ({data.totalQuantity} itens)</span>
          </div>

          {(data.expiredCount > 0 || data.warningCount > 0) && (
            <div className="pt-1 flex items-center gap-2 text-[9px] font-bold">
              {data.expiredCount > 0 && (
                <span className="text-rose-500 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">
                  {data.expiredCount} {labels.expired}
                </span>
              )}
              {data.warningCount > 0 && (
                <span className="text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                  {data.warningCount} {labels.warning}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={`space-y-4 ${isEmbedded ? '' : 'flex flex-col h-full overflow-y-auto pb-24'}`}>
      {/* HEADER SECTION (When rendered as standalone tab) */}
      {!isEmbedded && (
        <div className={`text-center py-5 rounded-2xl px-5 shadow-md border transition-all duration-300 ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-900 border-slate-950'
        }`}>
          <h3 className="font-sans font-extrabold text-orange-400 text-sm sm:text-base flex items-center justify-center gap-2">
            <BarChart3 className="w-5 h-5 text-orange-400 animate-pulse" />
            {labels.title}
          </h3>
          <p className="text-[11px] text-slate-300 mt-1 font-semibold max-w-lg mx-auto">
            {labels.subtitle}
          </p>
        </div>
      )}

      {/* TOP SUMMARY KPI BENTO */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* Global Occupancy % */}
        <div className={`p-3.5 rounded-2xl border shadow-3xs transition-all ${
          isDark ? 'bg-slate-900 border-slate-800/80' : 'bg-white border-slate-100'
        }`}>
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">{labels.global_avg}</span>
            <Percent className="w-3.5 h-3.5 text-orange-500" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-orange-500 tracking-tight">
              {globalMetrics.globalOccupancyRate}%
            </span>
            <span className="text-[10px] text-slate-400 font-semibold">
              ({globalMetrics.totalGlobalOccupiedSlots}/{globalMetrics.totalGlobalCapacity})
            </span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mt-2">
            <div 
              className="bg-orange-500 h-full rounded-full transition-all duration-700"
              style={{ width: `${globalMetrics.globalOccupancyRate}%` }}
            />
          </div>
        </div>

        {/* Total Slots Capacity */}
        <div className={`p-3.5 rounded-2xl border shadow-3xs transition-all ${
          isDark ? 'bg-slate-900 border-slate-800/80' : 'bg-white border-slate-100'
        }`}>
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">{labels.total_slots}</span>
            <Boxes className="w-3.5 h-3.5 text-blue-500" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className={`text-2xl font-black tracking-tight ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
              {globalMetrics.totalGlobalCapacity}
            </span>
            <span className="text-[10px] text-emerald-500 font-bold">
              {globalMetrics.totalGlobalFreeSlots} livres
            </span>
          </div>
          <p className="text-[9px] text-slate-400 mt-1 font-semibold truncate">
            {streetMetrics.length} setores configurados
          </p>
        </div>

        {/* Highest Sector */}
        <div className={`p-3.5 rounded-2xl border shadow-3xs transition-all ${
          isDark ? 'bg-slate-900 border-slate-800/80' : 'bg-white border-slate-100'
        }`}>
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">{labels.highest_sector}</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-rose-500" />
          </div>
          {globalMetrics.highestOccupancy ? (
            <div>
              <span className="text-sm font-black text-rose-500 truncate block">
                {globalMetrics.highestOccupancy.name}
              </span>
              <span className="text-[10px] font-bold text-slate-400">
                {globalMetrics.highestOccupancy.occupancyRate}% ({globalMetrics.highestOccupancy.occupiedSlots}/{globalMetrics.highestOccupancy.totalCapacity})
              </span>
            </div>
          ) : (
            <span className="text-xs text-slate-400">-</span>
          )}
        </div>

        {/* Lowest Sector / Available Capacity */}
        <div className={`p-3.5 rounded-2xl border shadow-3xs transition-all ${
          isDark ? 'bg-slate-900 border-slate-800/80' : 'bg-white border-slate-100'
        }`}>
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">{labels.lowest_sector}</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          {globalMetrics.lowestOccupancy ? (
            <div>
              <span className="text-sm font-black text-emerald-500 truncate block">
                {globalMetrics.lowestOccupancy.name}
              </span>
              <span className="text-[10px] font-bold text-slate-400">
                {globalMetrics.lowestOccupancy.occupancyRate}% ({globalMetrics.lowestOccupancy.freeSlots} livres)
              </span>
            </div>
          ) : (
            <span className="text-xs text-slate-400">-</span>
          )}
        </div>
      </div>

      {/* MAIN CHART CONTAINER */}
      <div className={`p-5 rounded-2xl border shadow-sm transition-all duration-300 space-y-4 ${
        isDark ? 'bg-slate-900 border-slate-800/80' : 'bg-white border-slate-100'
      }`}>
        {/* CHART CONTROLS HEADER */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b pb-3.5 dark:border-slate-800/60">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4.5 h-4.5 text-orange-500 stroke-[2.2]" />
            <div>
              <h4 className={`font-extrabold text-xs sm:text-sm ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
                {viewMode === 'stacked_slots' && labels.mode_slots}
                {viewMode === 'occupancy_pct' && labels.mode_pct}
                {viewMode === 'validity_status' && labels.mode_validity}
              </h4>
              <span className="text-[10px] text-slate-400 font-semibold block">
                Recharts • Visualização Dinâmica por Setor
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {/* View Mode Toggle Buttons */}
            <div className={`p-0.5 rounded-xl border flex items-center gap-0.5 ${
              isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-100 border-slate-200'
            }`}>
              <button
                type="button"
                onClick={() => setViewMode('stacked_slots')}
                className={`text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'stacked_slots'
                    ? isDark 
                      ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30 shadow-xs' 
                      : 'bg-white text-orange-600 border border-slate-200 shadow-3xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Espaços
              </button>
              <button
                type="button"
                onClick={() => setViewMode('occupancy_pct')}
                className={`text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'occupancy_pct'
                    ? isDark 
                      ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30 shadow-xs' 
                      : 'bg-white text-orange-600 border border-slate-200 shadow-3xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Taxa (%)
              </button>
              <button
                type="button"
                onClick={() => setViewMode('validity_status')}
                className={`text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'validity_status'
                    ? isDark 
                      ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30 shadow-xs' 
                      : 'bg-white text-orange-600 border border-slate-200 shadow-3xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Validades
              </button>
            </div>

            {/* If embedded in settings, button to open full dedicated tab */}
            {isEmbedded && onOpenFullTab && (
              <button
                type="button"
                onClick={onOpenFullTab}
                className={`text-[10px] font-bold p-1.5 rounded-xl border transition-all cursor-pointer flex items-center gap-1 ${
                  isDark ? 'bg-slate-800 text-orange-400 border-slate-700' : 'bg-orange-50 text-orange-600 border-orange-200'
                }`}
                title="Expandir para tela cheia"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* CHART RENDER OR EMPTY STATE */}
        {streetMetrics.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            {labels.empty_warning}
          </div>
        ) : (
          <div className="w-full h-72 sm:h-80 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              {viewMode === 'stacked_slots' ? (
                // MODE 1: STACKED BARS (OCCUPIED + FREE SLOTS = TOTAL CAPACITY)
                <BarChart
                  data={streetMetrics}
                  margin={{ top: 12, right: 12, left: -16, bottom: 25 }}
                  onMouseMove={(state: any) => {
                    if (state?.activeLabel) setActiveStreetHover(state.activeLabel);
                  }}
                  onMouseLeave={() => setActiveStreetHover(null)}
                >
                  <CartesianGrid 
                    strokeDasharray="3 3" 
                    vertical={false} 
                    stroke={isDark ? '#334155' : '#e2e8f0'} 
                    opacity={0.6} 
                  />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 10, fontWeight: 700 }}
                    tickLine={false}
                    axisLine={{ stroke: isDark ? '#334155' : '#cbd5e1' }}
                    interval={0}
                  />
                  <YAxis 
                    tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend 
                    verticalAlign="top" 
                    align="right"
                    iconType="circle"
                    wrapperStyle={{ paddingBottom: 10, fontSize: 11, fontWeight: 600 }}
                  />
                  <Bar 
                    name={labels.occupied} 
                    dataKey="occupiedSlots" 
                    stackId="slots" 
                    fill="#f97316" 
                    radius={[0, 0, 4, 4]} 
                  />
                  <Bar 
                    name={labels.available} 
                    dataKey="freeSlots" 
                    stackId="slots" 
                    fill={isDark ? '#1e293b' : '#e2e8f0'} 
                    radius={[4, 4, 0, 0]} 
                  />
                </BarChart>
              ) : viewMode === 'occupancy_pct' ? (
                // MODE 2: OCCUPANCY PERCENTAGE (%) WITH INDIVIDUAL STREET COLORS & REFERENCE THRESHOLD
                <BarChart
                  data={streetMetrics}
                  margin={{ top: 12, right: 12, left: -16, bottom: 25 }}
                >
                  <CartesianGrid 
                    strokeDasharray="3 3" 
                    vertical={false} 
                    stroke={isDark ? '#334155' : '#e2e8f0'} 
                    opacity={0.6} 
                  />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 10, fontWeight: 700 }}
                    tickLine={false}
                    axisLine={{ stroke: isDark ? '#334155' : '#cbd5e1' }}
                    interval={0}
                  />
                  <YAxis 
                    domain={[0, 100]}
                    tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    unit="%"
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine 
                    y={80} 
                    stroke="#ef4444" 
                    strokeDasharray="4 4" 
                    label={{ 
                      value: 'Alerta 80%', 
                      fill: '#ef4444', 
                      fontSize: 9, 
                      fontWeight: 800, 
                      position: 'insideTopRight' 
                    }} 
                  />
                  <Bar 
                    name={labels.occupancy_rate} 
                    dataKey="occupancyRate" 
                    radius={[6, 6, 0, 0]}
                  >
                    {streetMetrics.map((entry) => (
                      <Cell key={`cell-${entry.id}`} fill={entry.hexColor} />
                    ))}
                  </Bar>
                </BarChart>
              ) : (
                // MODE 3: VALIDITY STATUS PER STREET (EXPIRED, WARNING, SAFE)
                <BarChart
                  data={streetMetrics}
                  margin={{ top: 12, right: 12, left: -16, bottom: 25 }}
                >
                  <CartesianGrid 
                    strokeDasharray="3 3" 
                    vertical={false} 
                    stroke={isDark ? '#334155' : '#e2e8f0'} 
                    opacity={0.6} 
                  />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 10, fontWeight: 700 }}
                    tickLine={false}
                    axisLine={{ stroke: isDark ? '#334155' : '#cbd5e1' }}
                    interval={0}
                  />
                  <YAxis 
                    tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend 
                    verticalAlign="top" 
                    align="right"
                    iconType="circle"
                    wrapperStyle={{ paddingBottom: 10, fontSize: 11, fontWeight: 600 }}
                  />
                  <Bar 
                    name={labels.expired} 
                    dataKey="expiredCount" 
                    stackId="validity" 
                    fill="#ef4444" 
                    radius={[0, 0, 0, 0]} 
                  />
                  <Bar 
                    name={labels.warning} 
                    dataKey="warningCount" 
                    stackId="validity" 
                    fill="#f59e0b" 
                    radius={[0, 0, 0, 0]} 
                  />
                  <Bar 
                    name={labels.safe} 
                    dataKey="safeCount" 
                    stackId="validity" 
                    fill="#10b981" 
                    radius={[4, 4, 0, 0]} 
                  />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* DETAILED STREET CARDS LIST (INTERACTIVE MAP JUMP) */}
      <div className={`p-5 rounded-2xl border shadow-sm transition-all duration-300 space-y-3.5 ${
        isDark ? 'bg-slate-900 border-slate-800/80' : 'bg-white border-slate-100'
      }`}>
        <div className="flex items-center justify-between border-b pb-2.5 dark:border-slate-800/60">
          <h4 className={`text-xs font-extrabold flex items-center gap-1.5 uppercase tracking-wider ${
            isDark ? 'text-slate-200' : 'text-slate-800'
          }`}>
            <MapPin className="w-4 h-4 text-orange-500" />
            Detalhamento por Rua & Atalho para o Mapa
          </h4>
          <span className="text-[10px] text-slate-400 font-bold">
            {streetMetrics.length} setores
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {streetMetrics.map((sm) => {
            const isHigh = sm.occupancyRate >= 80;
            return (
              <div 
                key={sm.id}
                className={`p-3.5 rounded-xl border flex flex-col justify-between gap-2.5 transition-all duration-200 ${
                  isDark ? 'bg-slate-950/50 border-slate-800/90 hover:border-slate-700' : 'bg-slate-50 border-slate-150 hover:border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span 
                      className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs border-2 border-white dark:border-slate-900" 
                      style={{ backgroundColor: sm.hexColor }} 
                    />
                    <div>
                      <h5 className={`text-xs font-black ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
                        {t.street} {sm.name}
                      </h5>
                      <span className="text-[9px] text-slate-400 font-semibold flex flex-wrap items-center gap-1">
                        <span>{sm.levels} andares • {sm.columns} colunas ({sm.usableCapacity} vagas úteis)</span>
                        {sm.excludedSlots > 0 && (
                          <span className="text-[8px] font-bold px-1.5 py-0.2 rounded-md bg-amber-500/10 text-amber-500 border border-amber-500/20">
                            {sm.excludedSlots} excluídas
                          </span>
                        )}
                        {sm.doubleCount > 0 && (
                          <span className="text-[8px] font-bold px-1.5 py-0.2 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                            {sm.doubleCount} duplas
                          </span>
                        )}
                      </span>
                    </div>
                  </div>

                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                    isHigh
                      ? 'bg-rose-500/15 text-rose-500 border border-rose-500/30'
                      : sm.occupancyRate >= 50
                        ? 'bg-amber-500/15 text-amber-500 border border-amber-500/30'
                        : 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                  }`}>
                    {sm.occupancyRate}%
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-500" 
                    style={{ 
                      width: `${sm.occupancyRate}%`,
                      backgroundColor: sm.hexColor 
                    }} 
                  />
                </div>

                {/* Bottom stats row & Quick Action */}
                <div className="flex items-center justify-between text-[10px]">
                  <div className="flex items-center gap-2">
                    <span className="text-orange-500 font-bold">
                      {sm.occupiedSlots} ocupados
                    </span>
                    <span className="text-slate-400">•</span>
                    <span className="text-emerald-500 font-bold">
                      {sm.freeSlots} livres
                    </span>
                  </div>

                  {onLocateStreet && (
                    <button
                      type="button"
                      onClick={() => onLocateStreet(sm.id)}
                      className={`text-[9px] font-bold px-2 py-1 rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${
                        isDark 
                          ? 'bg-slate-900 hover:bg-slate-850 text-orange-400 border-slate-700' 
                          : 'bg-white hover:bg-slate-100 text-orange-600 border-slate-200 shadow-3xs'
                      }`}
                    >
                      <MapPin className="w-3 h-3 text-orange-500" />
                      {labels.view_map}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
