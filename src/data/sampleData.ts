/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Batch, WarehouseConfig } from '../types';

export const DEFAULT_CONFIG: WarehouseConfig = {
  streets: {
    batata: {
      id: 'batata',
      name: 'da Batata',
      levels: 4,
      columns: 5,
      color: 'amber',
      slots: {
        '1-4': { type: 'passage', label: 'Passagem Pedestre / Corredor' },
        '3-4': { type: 'blocked', label: 'Pilar Estrutural P-1' },
        '1-1': { type: 'available', size: 'double', label: 'Vaga Dupla (2 Paletes)' },
        '4-1': { type: 'available', size: 'high_clearance', label: 'Pé-Direito Alto (Big Bag)' },
      },
    },
    corte: {
      id: 'corte',
      name: 'do Corte',
      levels: 3,
      columns: 4,
      color: 'rose',
      slots: {
        '1-3': { type: 'passage', label: 'Passagem Livre de Trânsito' },
      },
    },
  },
  alertThresholdDays: 5, // Alerta para vencimento em 5 dias ou menos
};

// Generates an ISO string for relative dates based on current time (2026-07-05)
const getRelativeDateString = (daysOffset: number): string => {
  const baseDate = new Date('2026-07-05T12:00:00');
  baseDate.setDate(baseDate.getDate() + daysOffset);
  return baseDate.toISOString().split('T')[0];
};

export const SAMPLE_BATCHES: Batch[] = [
  // Rua da Batata (Levels: 1 to 4, Columns: 1 to 5)
  {
    id: 'b1',
    itemName: 'Batata Monalisa Especial',
    batchCode: 'L-BM502',
    quantity: 120,
    unit: 'kg',
    entryDate: getRelativeDateString(-10),
    expiryDate: getRelativeDateString(-2), // Expired 2 days ago
    street: 'batata',
    level: 3,
    column: 2,
    notes: 'Requer atenção imediata. Apresentando sinais de brotação.',
  },
  {
    id: 'b2',
    itemName: 'Batata Asterix Lavada',
    batchCode: 'L-AL104',
    quantity: 450,
    unit: 'kg',
    entryDate: getRelativeDateString(-8),
    expiryDate: getRelativeDateString(2), // Expiring in 2 days (Warning)
    street: 'batata',
    level: 1,
    column: 3,
    notes: 'Lote de qualidade premium. Para fritura rápida.',
  },
  {
    id: 'b3',
    itemName: 'Batata Doce Rosada',
    batchCode: 'L-BD339',
    quantity: 200,
    unit: 'kg',
    entryDate: getRelativeDateString(-5),
    expiryDate: getRelativeDateString(15), // Safe
    street: 'batata',
    level: 2,
    column: 1,
    notes: 'Armazenado em área fresca.',
  },
  {
    id: 'b4',
    itemName: 'Batata Baroa (Mandioquinha)',
    batchCode: 'L-BB098',
    quantity: 80,
    unit: 'kg',
    entryDate: getRelativeDateString(-12),
    expiryDate: getRelativeDateString(-1), // Expired 1 day ago
    street: 'batata',
    level: 4,
    column: 5,
    notes: 'Umidade da prateleira superior um pouco alta.',
  },
  {
    id: 'b5',
    itemName: 'Batata Inglesa Lavada',
    batchCode: 'L-BI203',
    quantity: 600,
    unit: 'kg',
    entryDate: getRelativeDateString(-3),
    expiryDate: getRelativeDateString(20), // Safe
    street: 'batata',
    level: 1,
    column: 1,
  },
  {
    id: 'b6',
    itemName: 'Batata Doce Roxa',
    batchCode: 'L-BDR88',
    quantity: 150,
    unit: 'kg',
    entryDate: getRelativeDateString(-4),
    expiryDate: getRelativeDateString(4), // Expiring in 4 days (Warning)
    street: 'batata',
    level: 2,
    column: 4,
  },

  // Rua do Corte (Levels: 1 to 3, Columns: 1 to 4)
  {
    id: 'c1',
    itemName: 'Bife de Alcatra Limpo',
    batchCode: 'L-ALC402',
    quantity: 35,
    unit: 'caixas',
    entryDate: getRelativeDateString(-4),
    expiryDate: getRelativeDateString(-1), // Expired 1 day ago
    street: 'corte',
    level: 2,
    column: 2,
    notes: 'Retirar do estoque para descarte ou processamento.',
  },
  {
    id: 'c2',
    itemName: 'Filé de Frango Cubos',
    batchCode: 'L-FF290',
    quantity: 50,
    unit: 'caixas',
    entryDate: getRelativeDateString(-2),
    expiryDate: getRelativeDateString(1), // Expiring in 1 day (Critical Warning)
    street: 'corte',
    level: 1,
    column: 4,
    notes: 'Manter temperatura estrita de -2°C a 2°C.',
  },
  {
    id: 'c3',
    itemName: 'Legumes Picados para Sopa',
    batchCode: 'L-LEG501',
    quantity: 90,
    unit: 'pacotes',
    entryDate: getRelativeDateString(-1),
    expiryDate: getRelativeDateString(3), // Expiring in 3 days (Warning)
    street: 'corte',
    level: 3,
    column: 1,
    notes: 'Mix contendo cenoura, vagem, abóbora e repolho.',
  },
  {
    id: 'c4',
    itemName: 'Carne Moída Patinho',
    batchCode: 'L-CMP309',
    quantity: 40,
    unit: 'caixas',
    entryDate: getRelativeDateString(-2),
    expiryDate: getRelativeDateString(12), // Safe
    street: 'corte',
    level: 1,
    column: 2,
  },
  {
    id: 'c5',
    itemName: 'Abóbora Cabotiá Cubos',
    batchCode: 'L-ACC12',
    quantity: 110,
    unit: 'pacotes',
    entryDate: getRelativeDateString(-3),
    expiryDate: getRelativeDateString(18), // Safe
    street: 'corte',
    level: 2,
    column: 3,
    notes: 'Pronto para embalar a vácuo.',
  }
];
