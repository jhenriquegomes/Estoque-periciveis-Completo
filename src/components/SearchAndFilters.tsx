/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Search, 
  Plus, 
  MapPin, 
  Trash2, 
  Filter, 
  Calendar,
  AlertCircle,
  FolderOpen,
  Check,
  X
} from 'lucide-react';
import { Batch, WarehouseConfig } from '../types';
import { calculateExpiryStatus, formatDatePT } from '../utils';
import { getTranslation } from '../utils/translations';
import { DeleteBatchConfirmModal } from './DeleteBatchConfirmModal';

interface SearchAndFiltersProps {
  batches: Batch[];
  config: WarehouseConfig;
  onAddBatch: (batch: Omit<Batch, 'id'>) => void;
  onDeleteBatch: (id: string) => void;
  onLocateInMap: (street: string, level: number, column: number) => void;
}

export const SearchAndFilters: React.FC<SearchAndFiltersProps> = ({
  batches,
  config,
  onAddBatch,
  onDeleteBatch,
  onLocateInMap,
}) => {
  const t = getTranslation(config.language);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStreetFilter, setSelectedStreetFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'all' | 'expired' | 'soon' | 'safe'>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const isDark = config.theme === 'dark';

  // Form states for quick batch registration
  const [itemName, setItemName] = useState('');
  const [batchCode, setBatchCode] = useState('');
  const [quantity, setQuantity] = useState(10);
  const [unit, setUnit] = useState('kg');
  const [street, setStreet] = useState<string>(() => Object.keys(config.streets)[0] || '');
  const [level, setLevel] = useState(1);
  const [column, setColumn] = useState(1);
  const [expiryDate, setExpiryDate] = useState('');
  const [entryDate, setEntryDate] = useState('2026-07-05');
  const [notes, setNotes] = useState('');
  const [batchToDelete, setBatchToDelete] = useState<Batch | null>(null);

  // Form submission handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName) {
      const msg = config.language === 'EN' 
        ? 'Please fill the required name field.' 
        : config.language === 'ES' 
          ? 'Por favor, complete el campo de nombre obligatorio.' 
          : 'Por favor, preencha o campo de nome obrigatório.';
      alert(msg);
      return;
    }

    // Validate level/column bounds based on current street configuration
    const streetConfig = config.streets[street];
    const maxLevels = streetConfig?.levels ?? 10;
    const maxCols = streetConfig?.columns ?? 12;

    if (level < 1 || level > maxLevels) {
      const msg = config.language === 'EN'
        ? `The level for Street ${streetConfig?.name || street} must be between 1 and ${maxLevels}.`
        : config.language === 'ES'
          ? `El nivel/piso para la Calle ${streetConfig?.name || street} debe estar entre 1 y ${maxLevels}.`
          : `O pavimento/andar para a Rua ${streetConfig?.name || street} deve ser entre 1 e ${maxLevels}.`;
      alert(msg);
      return;
    }
    if (column < 1 || column > maxCols) {
      const msg = config.language === 'EN'
        ? `The column for Street ${streetConfig?.name || street} must be between 1 and ${maxCols}.`
        : config.language === 'ES'
          ? `La columna para la Calle ${streetConfig?.name || street} debe estar entre 1 y ${maxCols}.`
          : `A coluna para a Rua ${streetConfig?.name || street} deve ser entre 1 e ${maxCols}.`;
      alert(msg);
      return;
    }

    onAddBatch({
      itemName,
      batchCode,
      quantity,
      unit,
      street,
      level,
      column,
      entryDate,
      expiryDate,
      notes: notes.trim() || undefined,
    });

    // Reset Form & Close
    setItemName('');
    setBatchCode('');
    setQuantity(10);
    setNotes('');
    setExpiryDate('');
    setShowAddForm(false);
  };

  // Filter batches based on search term, street filter, and status filter
  const filteredBatches = batches.filter((b) => {
    // 1. Search term
    const matchesSearch = 
      b.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.batchCode.toLowerCase().includes(searchTerm.toLowerCase());

    // 2. Street filter
    const matchesStreet = selectedStreetFilter === 'all' || b.street === selectedStreetFilter;

    // 3. Status filter
    const status = calculateExpiryStatus(b.expiryDate, config.alertThresholdDays);
    let matchesStatus = true;
    if (selectedStatusFilter === 'expired') {
      matchesStatus = status.isExpired;
    } else if (selectedStatusFilter === 'soon') {
      matchesStatus = status.isExpiringSoon;
    } else if (selectedStatusFilter === 'safe') {
      matchesStatus = !status.isExpired && !status.isExpiringSoon;
    }

    return matchesSearch && matchesStreet && matchesStatus;
  });

  return (
    <div className="flex flex-col h-full overflow-y-auto pb-24 space-y-4">
      {/* QUICK ADD BUTTON */}
      {!showAddForm ? (
        <button
          onClick={() => setShowAddForm(true)}
          className="w-full flex items-center justify-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white font-bold py-3.5 px-4 rounded-xl text-xs sm:text-sm shadow-sm transition-all duration-300 cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2]" /> {config.language === 'EN' ? 'Register Food Batch' : config.language === 'ES' ? 'Registrar Lote de Alimento' : 'Cadastrar Lote de Alimento'}
        </button>
      ) : (
        /* EXPANDED REGISTER FORM */
        <form onSubmit={handleSubmit} className={`border rounded-2xl p-5 shadow-md space-y-4 transition-colors duration-300 ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'
        }`}>
          <div className={`flex items-center justify-between border-b pb-3 mb-1 ${
            isDark ? 'border-slate-850' : 'border-slate-100'
          }`}>
            <h3 className={`font-sans font-extrabold text-sm sm:text-base ${isDark ? 'text-white' : 'text-slate-800'}`}>
              {config.language === 'EN' ? 'Quick Batch Registration' : config.language === 'ES' ? 'Registro Rápido de Lote' : 'Cadastro Rápido de Lote'}
            </h3>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className={`text-xs font-bold uppercase transition-colors cursor-pointer ${
                isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {config.language === 'EN' ? 'Close' : config.language === 'ES' ? 'Cerrar' : 'Fechar'}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">{config.language === 'EN' ? 'Perishable Item Name *' : config.language === 'ES' ? 'Nombre del Perecedero *' : 'Nome do Perecível *'}</label>
              <input
                type="text"
                required
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                placeholder={config.language === 'EN' ? 'e.g. Potato Asterix' : config.language === 'ES' ? 'Ej: Papa Asterix' : 'Ex: Batata Asterix Lavada'}
                className={`w-full mt-1 px-3 py-2 border rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-orange-500/20 transition-all ${
                  isDark 
                    ? 'bg-slate-950 border-slate-800 text-slate-200 placeholder:text-slate-500' 
                    : 'bg-white border-slate-200/80 text-slate-700'
                }`}
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">{config.language === 'EN' ? 'Batch Code (Optional)' : config.language === 'ES' ? 'Código de Lote (Opcional)' : 'Código do Lote (Opcional)'}</label>
              <input
                type="text"
                value={batchCode}
                onChange={(e) => setBatchCode(e.target.value)}
                placeholder="Ex: LT-409B"
                className={`w-full mt-1 px-3 py-2 border rounded-xl text-xs focus:outline-hidden focus:ring-1 focus:ring-orange-500/20 font-mono font-bold transition-all ${
                  isDark 
                    ? 'bg-slate-950 border-slate-800 text-slate-200 placeholder:text-slate-500' 
                    : 'bg-white border-slate-200/80 text-slate-700'
                }`}
              />
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">{config.language === 'EN' ? 'Quantity' : config.language === 'ES' ? 'Cantidad' : 'Quantidade'}</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className={`w-full mt-1 px-2 py-2 border rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-orange-500/20 transition-all ${
                    isDark 
                      ? 'bg-slate-950 border-slate-800 text-slate-200' 
                      : 'bg-white border-slate-200/80 text-slate-700'
                  }`}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">{config.language === 'EN' ? 'Unit' : config.language === 'ES' ? 'Unidad' : 'Unidade'}</label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className={`w-full mt-1 px-1.5 py-2 border rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-orange-500/20 transition-all ${
                    isDark 
                      ? 'bg-slate-950 border-slate-800 text-slate-200 [color-scheme:dark]' 
                      : 'bg-white border-slate-200/80 text-slate-700'
                  }`}
                >
                  <option value="kg">kg</option>
                  <option value="caixas">{config.language === 'EN' ? 'boxes' : config.language === 'ES' ? 'cajas' : 'caixas'}</option>
                  <option value="pacotes">{config.language === 'EN' ? 'packages' : config.language === 'ES' ? 'paquetes' : 'pacotes'}</option>
                  <option value="unidades">{config.language === 'EN' ? 'units' : config.language === 'ES' ? 'unidades' : 'unidades'}</option>
                  <option value="paletes">{config.language === 'EN' ? 'pallets' : config.language === 'ES' ? 'palés' : 'paletes'}</option>
                </select>
              </div>
            </div>

            <div className={`col-span-2 p-3.5 rounded-2xl border shadow-3xs transition-colors duration-300 ${
              isDark ? 'bg-slate-950 border-slate-850' : 'bg-slate-50/50 border-slate-100'
            }`}>
              <span className={`text-[10px] font-bold block mb-2 uppercase tracking-wide ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>{config.language === 'EN' ? 'Storage Address' : config.language === 'ES' ? 'Dirección de Organización' : 'Endereço de Organização'}</span>
              
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase">{t.street}</label>
                  <select
                    value={street}
                    onChange={(e) => {
                      const selected = e.target.value;
                      setStreet(selected);
                      setLevel(1);
                      setColumn(1);
                    }}
                    className={`w-full mt-1 px-2 py-1.5 border rounded-lg text-xs font-semibold focus:outline-hidden ${
                      isDark ? 'bg-slate-900 border-slate-800 text-slate-200 [color-scheme:dark]' : 'bg-white border-slate-200 text-slate-700'
                    }`}
                  >
                    {(Object.values(config.streets) as any[]).map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase">{config.language === 'EN' ? 'Level' : config.language === 'ES' ? 'Nivel' : 'Pavimento'}</label>
                  <select
                    value={level}
                    onChange={(e) => setLevel(Number(e.target.value))}
                    className={`w-full mt-1 px-2 py-1.5 border rounded-lg text-xs font-semibold focus:outline-hidden ${
                      isDark ? 'bg-slate-900 border-slate-800 text-slate-200 [color-scheme:dark]' : 'bg-white border-slate-200 text-slate-700'
                    }`}
                  >
                    {Array.from({ length: config.streets[street]?.levels || 1 }, (_, i) => i + 1).map((lvl) => (
                      <option key={lvl} value={lvl}>
                        {config.language === 'EN' ? `Lvl ${lvl}` : config.language === 'ES' ? `Piso ${lvl}` : `Andar ${lvl}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase">{config.language === 'EN' ? 'Column' : config.language === 'ES' ? 'Columna' : 'Coluna'}</label>
                  <select
                    value={column}
                    onChange={(e) => setColumn(Number(e.target.value))}
                    className={`w-full mt-1 px-2 py-1.5 border rounded-lg text-xs font-semibold focus:outline-hidden ${
                      isDark ? 'bg-slate-900 border-slate-800 text-slate-200 [color-scheme:dark]' : 'bg-white border-slate-200 text-slate-700'
                    }`}
                  >
                    {Array.from({ length: config.streets[street]?.columns || 1 }, (_, i) => i + 1).map((col) => (
                      <option key={col} value={col}>
                        Col {col}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <p className="text-[9px] font-semibold text-slate-400 mt-2">
                {config.language === 'EN' ? 'Maximum capacity:' : config.language === 'ES' ? 'Dirección máxima:' : 'Endereço máximo:'} {config.streets[street]?.levels || 1} {config.language === 'EN' ? 'levels' : config.language === 'ES' ? 'pisos' : 'andares'} {config.language === 'EN' ? 'and' : config.language === 'ES' ? 'y' : 'e'} {config.streets[street]?.columns || 1} {config.language === 'EN' ? 'columns' : config.language === 'ES' ? 'columnas' : 'colunas'}.
              </p>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">{config.language === 'EN' ? 'Entry Date' : config.language === 'ES' ? 'Fecha de Entrada' : 'Data de Entrada'}</label>
              <input
                type="date"
                required
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                className={`w-full mt-1 px-3 py-2 border rounded-xl text-xs font-semibold focus:outline-hidden transition-all ${
                  isDark 
                    ? 'bg-slate-950 border-slate-800 text-slate-200 [color-scheme:dark]' 
                    : 'bg-white border-slate-200/80 text-slate-700'
                }`}
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">{config.language === 'EN' ? 'Expiration (Optional)' : config.language === 'ES' ? 'Vencimiento (Opcional)' : 'Vencimento (Opcional)'}</label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className={`w-full mt-1 px-3 py-2 border rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-orange-500/20 transition-all ${
                  isDark 
                    ? 'bg-slate-950 border-slate-800 text-slate-200 [color-scheme:dark]' 
                    : 'bg-white border-slate-200/80 text-slate-700'
                }`}
              />
            </div>

            <div className="col-span-2">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">{config.language === 'EN' ? 'Storage Notes' : config.language === 'ES' ? 'Observaciones de Almacenamiento' : 'Observações do Armazenamento'}</label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={config.language === 'EN' ? 'e.g. Keep dry, -1°C, etc.' : config.language === 'ES' ? 'Ej: Mantener seco, -1°C, etc.' : 'Ex: Manter umidade alta, temperatura de -1°C, etc.'}
                className={`w-full mt-1 px-3 py-2 border rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-orange-500/20 transition-all ${
                  isDark 
                    ? 'bg-slate-950 border-slate-800 text-slate-200 placeholder:text-slate-500' 
                    : 'bg-white border-slate-200/80 text-slate-700'
                }`}
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className={`flex-1 font-bold py-2.5 px-4 rounded-xl text-xs transition-colors cursor-pointer border ${
                isDark 
                  ? 'bg-slate-950 hover:bg-slate-850 text-slate-300 border-slate-800' 
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
              }`}
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold py-2.5 px-4 rounded-xl text-xs shadow-xs transition-all cursor-pointer"
            >
              {config.language === 'EN' ? 'Confirm Registration' : config.language === 'ES' ? 'Confirmar Registro' : 'Confirmar Cadastro'}
            </button>
          </div>
        </form>
      )}

      {/* FILTER CONTROLS */}
      <div className={`border rounded-2xl p-4 shadow-sm space-y-3 transition-colors duration-300 ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'
      }`}>
        <div className={`flex items-center justify-between text-xs font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>
          <span className="flex items-center gap-1.5">
            <Filter className="w-4 h-4 text-orange-500 stroke-[2]" /> {config.language === 'EN' ? 'Quick Filters' : config.language === 'ES' ? 'Filtros Rápidos' : 'Filtros Rápidos'}
          </span>
          {(selectedStreetFilter !== 'all' || selectedStatusFilter !== 'all' || searchTerm !== '') && (
            <button
              onClick={() => {
                setSelectedStreetFilter('all');
                setSelectedStatusFilter('all');
                setSearchTerm('');
              }}
              className="text-[10px] font-bold text-orange-600 hover:text-orange-700 hover:underline cursor-pointer"
            >
              {config.language === 'EN' ? 'Clear Filters' : config.language === 'ES' ? 'Limpiar Filtros' : 'Limpar Filtros'}
            </button>
          )}
        </div>

        {/* SEARCH BAR */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-3 stroke-[2]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={config.language === 'EN' ? 'Search product or batch name...' : config.language === 'ES' ? 'Buscar producto o lote...' : 'Buscar nome do produto ou lote...'}
            className={`w-full border rounded-xl pl-9 pr-3 py-2 text-xs placeholder-slate-400 font-semibold focus:outline-hidden focus:ring-1 focus:ring-orange-500/20 transition-all ${
              isDark 
                ? 'bg-slate-950 border-slate-800 text-slate-200 focus:bg-slate-950/80' 
                : 'bg-slate-50 border-slate-200/80 text-slate-700 focus:bg-white'
            }`}
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          {/* STREET SELECT */}
          <div>
            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">{t.street}/{config.language === 'EN' ? 'Sector' : config.language === 'ES' ? 'Sector' : 'Setor'}</label>
            <select
              value={selectedStreetFilter}
              onChange={(e) => setSelectedStreetFilter(e.target.value)}
              className={`w-full mt-1 p-2 border rounded-lg text-xs font-bold focus:outline-hidden transition-all ${
                isDark 
                  ? 'bg-slate-950 border-slate-800 text-slate-300 [color-scheme:dark]' 
                  : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}
            >
              <option value="all">{config.language === 'EN' ? 'All Streets' : config.language === 'ES' ? 'Todas las Calles' : 'Todas as Ruas'}</option>
              {(Object.values(config.streets) as any[]).map((st) => (
                <option key={st.id} value={st.id}>
                  {t.street} {st.name}
                </option>
              ))}
            </select>
          </div>

          {/* EXPIRY SELECT */}
          <div>
            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">{config.language === 'EN' ? 'Expiry Status' : config.language === 'ES' ? 'Status de Vencimiento' : 'Status Validade'}</label>
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value as any)}
              className={`w-full mt-1 p-2 border rounded-lg text-xs font-bold focus:outline-hidden transition-all ${
                isDark 
                  ? 'bg-slate-950 border-slate-800 text-slate-300 [color-scheme:dark]' 
                  : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}
            >
              <option value="all">{config.language === 'EN' ? 'All Batches' : config.language === 'ES' ? 'Todos los Lotes' : 'Todos os Lotes'}</option>
              <option value="expired">{config.language === 'EN' ? 'Expired 🚨' : config.language === 'ES' ? 'Vencidos 🚨' : 'Vencidos 🚨'}</option>
              <option value="soon">{config.language === 'EN' ? 'Expiring Soon ⚠️' : config.language === 'ES' ? 'Alerta Vencimiento ⚠️' : 'Alerta Vencendo ⚠️'}</option>
              <option value="safe">{config.language === 'EN' ? 'Valid & Safe ✅' : config.language === 'ES' ? 'Válidos y Seguros ✅' : 'Válidos e Seguros ✅'}</option>
            </select>
          </div>
        </div>
      </div>

      {/* TOTAL ITEMS BADGE */}
      <div className="text-[10px] font-bold text-slate-400 px-1 flex justify-between items-center">
        <span>{config.language === 'EN' ? `Showing ${filteredBatches.length} of ${batches.length} batches` : config.language === 'ES' ? `Mostrando ${filteredBatches.length} de ${batches.length} lotes` : `Mostrando ${filteredBatches.length} de ${batches.length} lotes`}</span>
      </div>

      {/* LIST OF BATCHES */}
      <div className="space-y-2.5">
        {filteredBatches.length === 0 ? (
          <div className={`border border-dashed rounded-2xl p-8 text-center transition-colors duration-300 ${
            isDark ? 'bg-slate-950/40 border-slate-800 text-slate-450' : 'bg-slate-50/50 border-slate-200 text-slate-500'
          }`}>
            <FolderOpen className="w-10 h-10 text-slate-400 mx-auto mb-2" />
            <p className="text-xs font-semibold">{config.language === 'EN' ? 'No matching batches.' : config.language === 'ES' ? 'Ningún lote coincidente.' : 'Nenhum lote correspondente.'}</p>
            <p className="text-[10px] text-slate-400 mt-1 font-medium">{config.language === 'EN' ? 'Change filters above to list other products.' : config.language === 'ES' ? 'Modifique los filtros arriba para ver otros productos.' : 'Altere os filtros acima para listar outros produtos.'}</p>
          </div>
        ) : (
          filteredBatches.map((b) => {
            const status = calculateExpiryStatus(b.expiryDate, config.alertThresholdDays);
            
            return (
              <div 
                key={b.id}
                className={`border rounded-2xl p-4 shadow-sm flex flex-col justify-between hover:-translate-y-0.5 transition-all duration-300 ${
                  isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'
                }`}
              >
                <div className={`flex justify-between items-start gap-2 border-b pb-2.5 ${
                  isDark ? 'border-slate-850' : 'border-slate-100'
                }`}>
                  <div>
                    <h4 className={`font-extrabold text-sm ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>{b.itemName}</h4>
                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                      <span className={`font-mono font-semibold px-1.5 py-0.5 rounded-md border ${
                        isDark ? 'bg-slate-950 text-slate-300 border-slate-800' : 'bg-slate-50 text-slate-600 border-slate-150'
                      }`}>
                        {b.batchCode || (config.language === 'EN' ? 'No Batch' : config.language === 'ES' ? 'Sin Lote' : 'Sem Lote')}
                      </span>
                      <span className="text-slate-300 font-bold">•</span>
                      <span className={`font-bold text-[10px] ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        {b.quantity} {b.unit}
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    {!b.expiryDate ? (
                      <span className={`text-[9px] font-bold border px-2 py-0.5 rounded-lg inline-block ${
                        isDark ? 'text-slate-400 bg-slate-950/40 border-slate-900/40' : 'text-slate-600 bg-slate-50 border-slate-100'
                      }`}>
                        {config.language === 'EN' ? 'No Expiry' : config.language === 'ES' ? 'Sin Vencimiento' : 'Sem Vencimento'}
                      </span>
                    ) : status.isExpired ? (
                      <span className={`text-[9px] font-bold border px-2 py-0.5 rounded-lg inline-block ${
                        isDark ? 'text-rose-400 bg-rose-950/40 border-rose-900/40' : 'text-rose-700 bg-rose-50 border-rose-100'
                      }`}>
                        {config.language === 'EN' ? `Expired ${Math.abs(status.daysRemaining)}d ago` : config.language === 'ES' ? `Vencido hace ${Math.abs(status.daysRemaining)}d` : `Vencido há ${Math.abs(status.daysRemaining)}d`}
                      </span>
                    ) : status.isExpiringSoon ? (
                      <span className={`text-[9px] font-bold border px-2 py-0.5 rounded-lg inline-block ${
                        isDark ? 'text-amber-400 bg-amber-950/40 border-amber-900/40' : 'text-amber-700 bg-amber-50 border-amber-100'
                      }`}>
                        {config.language === 'EN' ? `Expiring in ${status.daysRemaining}d` : config.language === 'ES' ? `Vence en ${status.daysRemaining}d` : `Vence em ${status.daysRemaining}d`}
                      </span>
                    ) : (
                      <span className={`text-[9px] font-bold border px-2 py-0.5 rounded-lg inline-block ${
                        isDark ? 'text-emerald-400 bg-emerald-950/40 border-emerald-900/40' : 'text-emerald-700 bg-emerald-50 border-emerald-100'
                      }`}>
                        OK ({status.daysRemaining}d)
                      </span>
                    )}
                  </div>
                </div>

                {/* LOCATE ON MAP QUICK ACCESS */}
                <div className={`mt-3 border rounded-xl py-2 px-3 flex items-center justify-between text-xs font-semibold ${
                  isDark ? 'bg-slate-950/60 border-slate-850 text-slate-400' : 'bg-slate-50/50 border-slate-100 text-slate-600'
                }`}>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-orange-500 shrink-0 stroke-[2]" />
                    <span className="text-[10px] text-slate-500">
                      {t.street} <span className={`font-bold ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>{config.streets[b.street]?.name || b.street}</span>
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded-md border ${
                      isDark ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-600'
                    }`}>P{b.level} C{b.column}</span>
                  </div>

                  <button
                    onClick={() => onLocateInMap(b.street, b.level, b.column)}
                    className={`text-[10px] font-bold flex items-center gap-1 border px-2.5 py-1 rounded-lg shadow-3xs transition-all cursor-pointer ${
                      isDark 
                        ? 'text-orange-400 bg-slate-900 border-orange-950/40 hover:bg-slate-850' 
                        : 'text-orange-600 bg-white border-orange-100 hover:bg-orange-50'
                    }`}
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

                <div className={`flex justify-between items-center mt-3.5 pt-2.5 border-t text-[10px] font-bold text-slate-400 ${
                  isDark ? 'border-slate-850' : 'border-slate-100'
                }`}>
                  <div className="flex gap-2 font-mono text-[9px] text-slate-400">
                    <span>In: {formatDatePT(b.entryDate)}</span>
                    <span>•</span>
                    <span>Out: {b.expiryDate ? formatDatePT(b.expiryDate) : (config.language === 'EN' ? 'No Expiry' : config.language === 'ES' ? 'Sin Venc.' : 'Sem Venc.')}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setBatchToDelete(b)}
                    className={`p-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1 text-[10px] font-bold border ${
                      isDark 
                        ? 'text-rose-400 hover:bg-rose-950/20 border-rose-900/40' 
                        : 'text-rose-600 hover:bg-rose-50 border-rose-200'
                    }`}
                    title={config.language === 'EN' ? 'Delete batch' : 'Excluir Lote'}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{config.language === 'EN' ? 'Delete' : 'Excluir'}</span>
                  </button>
                </div>
              </div>
            );
          })
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
