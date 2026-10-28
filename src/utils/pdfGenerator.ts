/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { jsPDF } from 'jspdf';
import { Batch, WarehouseConfig } from '../types';
import { calculateExpiryStatus, formatDatePT } from '../utils';

export const exportInventoryToPDF = (batches: Batch[], config: WarehouseConfig) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageHeight = 297;
  const pageWidth = 210;
  const margin = 15;
  let y = 20;

  // Helper to check page bounds and auto-add new page
  const checkPageOverflow = (heightNeeded: number) => {
    if (y + heightNeeded > pageHeight - 20) {
      doc.addPage();
      y = 20;
      drawHeader();
    }
  };

  // Helper to draw clean page headers on each page
  const drawHeader = () => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text('ESTOQUE PRO • RELATÓRIO COMPLETO DE INVENTÁRIO', margin, y);
    
    const currentDate = new Date();
    const formattedDate = currentDate.toLocaleDateString('pt-BR') + ' ' + currentDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    doc.text(`Gerado em: ${formattedDate}`, pageWidth - margin, y, { align: 'right' });
    
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setLineWidth(0.5);
    doc.line(margin, y + 2, pageWidth - margin, y + 2);
    y += 10;
  };

  // 1. FIRST PAGE COVER HEADER
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text('ESTOQUE PRO', margin, y);
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(249, 115, 22); // orange-500
  doc.text('CONTROLE DE VALIDADE & ENDEREÇAMENTO FÍSICO', margin, y + 6);
  
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(1.5);
  doc.line(margin, y + 10, pageWidth - margin, y + 10);
  
  y += 20;

  // 2. STATISTICS BANNER
  // Count items and status
  let totalBatches = batches.length;
  let totalQty = batches.reduce((acc, curr) => acc + curr.quantity, 0);
  let expiredCount = 0;
  let warningCount = 0;
  let safeCount = 0;

  batches.forEach((b) => {
    const status = calculateExpiryStatus(b.expiryDate, config.alertThresholdDays);
    if (status.isExpired) expiredCount++;
    else if (status.isExpiringSoon) warningCount++;
    else safeCount++;
  });

  checkPageOverflow(40);
  
  // Draw general info box
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(15, 23, 42); // slate-900
  doc.setLineWidth(0.5);
  doc.rect(margin, y, pageWidth - margin * 2, 28, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('RESUMO GERAL DO INVENTÁRIO', margin + 5, y + 6);

  // Statistics columns
  const colWidth = (pageWidth - margin * 2 - 10) / 4;
  
  // Total items
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('Total de Lotes', margin + 6, y + 14);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(`${totalBatches}`, margin + 6, y + 21);

  // Vencidos count (danger red)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('Vencidos (Crítico)', margin + colWidth + 6, y + 14);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(225, 29, 72); // rose-600
  doc.text(`${expiredCount}`, margin + colWidth + 6, y + 21);

  // Alerta count (amber warning)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('Em Alerta', margin + colWidth * 2 + 6, y + 14);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(217, 119, 6); // amber-600
  doc.text(`${warningCount}`, margin + colWidth * 2 + 6, y + 21);

  // Saudáveis count (emerald safe)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('Seguros', margin + colWidth * 3 + 6, y + 14);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(5, 150, 105); // emerald-600
  doc.text(`${safeCount}`, margin + colWidth * 3 + 6, y + 21);

  y += 36;

  // 3. DETAILED BREAKDOWN BY STREET
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('DETALHAMENTO POR RUA / SETOR', margin, y);
  
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.5);
  doc.line(margin, y + 2, pageWidth - margin, y + 2);
  
  y += 8;

  const streetsList = Object.values(config.streets || {});
  
  if (streetsList.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text('Nenhuma rua cadastrada no sistema.', margin, y);
  } else {
    streetsList.forEach((street: any) => {
      checkPageOverflow(30);

      // Draw Street Header
      doc.setFillColor(241, 245, 249); // slate-100
      doc.rect(margin, y, pageWidth - margin * 2, 10, 'F');
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text(`RUA ${street.name.toUpperCase()}`, margin + 4, y + 7);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      const streetBatches = batches.filter((b) => b.street === street.id);
      doc.text(
        `Capacidade: ${street.levels} andares x ${street.columns} colunas | Lotes armazenados: ${streetBatches.length}`, 
        pageWidth - margin - 4, 
        y + 6.5, 
        { align: 'right' }
      );

      y += 14;

      if (streetBatches.length === 0) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(9);
        doc.setTextColor(148, 163, 184);
        doc.text('Nenhum lote armazenado nesta rua no momento.', margin + 4, y);
        y += 10;
      } else {
        // Table Header for batches
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(15, 23, 42);
        
        doc.text('Alimento / Produto', margin + 2, y);
        doc.text('Lote', margin + 55, y);
        doc.text('Quantidade', margin + 80, y);
        doc.text('Localização', margin + 105, y);
        doc.text('Entrada', margin + 130, y);
        doc.text('Vencimento', margin + 152, y);
        doc.text('Status', margin + 175, y);

        doc.setDrawColor(15, 23, 42);
        doc.setLineWidth(0.3);
        doc.line(margin, y + 2.5, pageWidth - margin, y + 2.5);
        y += 7;

        // Sort street batches so expired and warnings appear at the top
        const sortedBatches = [...streetBatches].sort((a, b) => {
          const statusA = calculateExpiryStatus(a.expiryDate, config.alertThresholdDays);
          const statusB = calculateExpiryStatus(b.expiryDate, config.alertThresholdDays);
          
          if (statusA.isExpired && !statusB.isExpired) return -1;
          if (!statusA.isExpired && statusB.isExpired) return 1;
          if (statusA.isExpiringSoon && !statusB.isExpiringSoon) return -1;
          if (!statusA.isExpiringSoon && statusB.isExpiringSoon) return 1;
          
          // Safe comparison of date strings when they might be empty
          if (!a.expiryDate && !b.expiryDate) return 0;
          if (!a.expiryDate) return 1; // Put non-expiring batches at the end
          if (!b.expiryDate) return -1;
          
          return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
        });

        sortedBatches.forEach((b) => {
          checkPageOverflow(18);

          const { isExpired, isExpiringSoon, daysRemaining } = calculateExpiryStatus(b.expiryDate, config.alertThresholdDays);
          
          // Row background for expired items for immediate visibility
          if (isExpired) {
            doc.setFillColor(254, 242, 242); // light red
            doc.rect(margin, y - 4, pageWidth - margin * 2, 10, 'F');
          } else if (isExpiringSoon) {
            doc.setFillColor(255, 251, 235); // light amber
            doc.rect(margin, y - 4, pageWidth - margin * 2, 10, 'F');
          }

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8.5);
          doc.setTextColor(15, 23, 42);
          
          // Truncate long item names
          let name = b.itemName;
          if (name.length > 25) name = name.substring(0, 23) + '...';
          doc.text(name, margin + 2, y + 1.5);

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.text(b.batchCode || 'S/ Lote', margin + 55, y + 1.5);
          doc.text(`${b.quantity} ${b.unit}`, margin + 80, y + 1.5);
          
          doc.setFont('helvetica', 'bold');
          doc.text(`P${b.level} C${b.column}`, margin + 105, y + 1.5);
          
          doc.setFont('helvetica', 'normal');
          doc.text(formatDatePT(b.entryDate), margin + 130, y + 1.5);
          doc.text(b.expiryDate ? formatDatePT(b.expiryDate) : 'S/ Venc.', margin + 152, y + 1.5);

          // Render styled text status label
          doc.setFont('helvetica', 'bold');
          if (isExpired) {
            doc.setTextColor(225, 29, 72); // rose-600
            doc.text(`VENCIDO (${Math.abs(daysRemaining)}d)`, margin + 175, y + 1.5);
          } else if (isExpiringSoon) {
            doc.setTextColor(217, 119, 6); // amber-600
            doc.text(`ALERTA (${daysRemaining}d)`, margin + 175, y + 1.5);
          } else if (!b.expiryDate) {
            doc.setTextColor(100, 116, 139); // slate-500
            doc.text('S/ VENCIMENTO', margin + 175, y + 1.5);
          } else {
            doc.setTextColor(5, 150, 105); // emerald-600
            doc.text(`SEGURO (${daysRemaining}d)`, margin + 175, y + 1.5);
          }

          // Row separator line
          doc.setDrawColor(241, 245, 249);
          doc.setLineWidth(0.2);
          doc.line(margin, y + 6, pageWidth - margin, y + 6);

          // Draw notes if they exist
          if (b.notes) {
            y += 5.5;
            checkPageOverflow(12);
            doc.setFont('helvetica', 'italic');
            doc.setFontSize(7.5);
            doc.setTextColor(100, 116, 139);
            doc.text(`* Obs: ${b.notes}`, margin + 4, y + 1);
            y += 1;
          }

          y += 6.5;
        });

        y += 6; // spacing after table
      }
    });
  }

  // Draw Page Number at footer of all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    
    // Page footer line
    doc.setDrawColor(241, 245, 249);
    doc.setLineWidth(0.5);
    doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
    
    doc.text(
      `Página ${i} de ${totalPages}`, 
      pageWidth / 2, 
      pageHeight - 10, 
      { align: 'center' }
    );
    doc.text(
      'Gerado pelo Estoque PRO • Controle Inteligente de Perecíveis', 
      margin, 
      pageHeight - 10
    );
  }

  // Trigger browser download
  const dateStr = new Date().toISOString().split('T')[0];
  doc.save(`estoque-pro-completo-${dateStr}.pdf`);
};
