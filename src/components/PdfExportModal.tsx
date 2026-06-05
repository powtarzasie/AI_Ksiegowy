import React, { useState } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { AppState, MonthlySimulationResult } from '../types';
import { calculateMonthlyTaxes, getMonthName } from '../utils/taxCalc';
import {
  FileText,
  Download,
  CheckCircle,
  X,
  Loader2,
  FileCheck,
  TrendingUp,
  Settings,
  AlertTriangle,
  Layers
} from 'lucide-react';

// Precise math-based OKLCH to RGB conversion
function oklchToRgb(l: number, c: number, h: number, a?: number): string {
  const hRad = (h * Math.PI) / 180;
  
  const L = l;
  const a_lab = c * Math.cos(hRad);
  const b_lab = c * Math.sin(hRad);
  
  const l_ = L + 0.3963377774 * a_lab + 0.2158037573 * b_lab;
  const m_ = L - 0.1055613458 * a_lab - 0.0638541167 * b_lab;
  const s_ = L - 0.0894841775 * a_lab - 1.2914855480 * b_lab;
  
  const l_cube = l_ * l_ * l_;
  const m_cube = m_ * m_ * m_;
  const s_cube = s_ * s_ * s_;
  
  const r_lin = +4.0767416621 * l_cube - 3.3077115913 * m_cube + 0.1309699292 * s_cube;
  const g_lin = -1.2684380046 * l_cube + 2.6097574011 * m_cube - 0.3413193965 * s_cube;
  const b_lin = -0.0041960863 * l_cube - 0.7034186147 * m_cube + 1.7076147010 * s_cube;
  
  const toSRGB = (c_lin: number) => {
    if (c_lin <= 0.0031308) {
      return 12.92 * c_lin;
    }
    return 1.055 * Math.pow(c_lin, 1 / 2.4) - 0.055;
  };
  
  const r = Math.max(0, Math.min(255, Math.round(toSRGB(r_lin) * 255)));
  const g = Math.max(0, Math.min(255, Math.round(toSRGB(g_lin) * 255)));
  const b = Math.max(0, Math.min(255, Math.round(toSRGB(b_lin) * 255)));
  
  if (a !== undefined) {
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }
  return `rgb(${r}, ${g}, ${b})`;
}

// Convert all oklch() color occurrences inside a CSS string to rgb() or rgba()
function convertOklchToRgb(value: string): string {
  if (typeof value !== 'string') return value;
  if (!value.includes('oklch(')) return value;
  
  return value.replace(/oklch\(([^)]+)\)/g, (match, inner) => {
    try {
      const parts = inner.trim().split(/[\s,+/]+/);
      if (parts.length < 3) return match;
      
      const lStr = parts[0];
      const cStr = parts[1];
      const hStr = parts[2];
      const aStr = parts[3];
      
      let l = 0;
      if (lStr.endsWith('%')) {
        l = parseFloat(lStr) / 100;
      } else {
        l = parseFloat(lStr);
      }
      
      let c = parseFloat(cStr);
      if (cStr.endsWith('%')) {
        c = (parseFloat(cStr) / 100) * 0.4;
      }
      
      const h = parseFloat(hStr);
      
      let a: number | undefined = undefined;
      if (aStr !== undefined) {
        if (aStr.endsWith('%')) {
          a = parseFloat(aStr) / 100;
        } else {
          a = parseFloat(aStr);
        }
      }
      
      if (isNaN(l) || isNaN(c) || isNaN(h)) {
        return match;
      }
      
      return oklchToRgb(l, c, h, a);
    } catch (e) {
      return match;
    }
  });
}

// Convert all oklab() color occurrences inside a CSS string to rgb() or rgba()
function oklabToRgb(l: number, a_lab: number, b_lab: number, a?: number): string {
  const L = l;
  const l_ = L + 0.3963377774 * a_lab + 0.2158037573 * b_lab;
  const m_ = L - 0.1055613458 * a_lab - 0.0638541167 * b_lab;
  const s_ = L - 0.0894841775 * a_lab - 1.2914855480 * b_lab;
  
  const l_cube = l_ * l_ * l_;
  const m_cube = m_ * m_ * m_;
  const s_cube = s_ * s_ * s_;
  
  const r_lin = +4.0767416621 * l_cube - 3.3077115913 * m_cube + 0.1309699292 * s_cube;
  const g_lin = -1.2684380046 * l_cube + 2.6097574011 * m_cube - 0.3413193965 * s_cube;
  const b_lin = -0.0041960863 * l_cube - 0.7034186147 * m_cube + 1.7076147010 * s_cube;
  
  const toSRGB = (c_lin: number) => {
    if (c_lin <= 0.0031308) {
      return 12.92 * c_lin;
    }
    return 1.055 * Math.pow(c_lin, 1 / 2.4) - 0.055;
  };
  
  const r = Math.max(0, Math.min(255, Math.round(toSRGB(r_lin) * 255)));
  const g = Math.max(0, Math.min(255, Math.round(toSRGB(g_lin) * 255)));
  const b = Math.max(0, Math.min(255, Math.round(toSRGB(b_lin) * 255)));
  
  if (a !== undefined) {
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }
  return `rgb(${r}, ${g}, ${b})`;
}

function convertOklabToRgb(value: string): string {
  if (typeof value !== 'string') return value;
  if (!value.includes('oklab(')) return value;
  
  return value.replace(/oklab\(([^)]+)\)/g, (match, inner) => {
    try {
      const parts = inner.trim().split(/[\s,+/]+/);
      if (parts.length < 3) return match;
      
      const lStr = parts[0];
      const aLabStr = parts[1];
      const bLabStr = parts[2];
      const aStr = parts[3];
      
      let l = 0;
      if (lStr.endsWith('%')) {
        l = parseFloat(lStr) / 100;
      } else {
        l = parseFloat(lStr);
      }
      
      let a_lab = parseFloat(aLabStr);
      if (aLabStr.endsWith('%')) {
        a_lab = (parseFloat(aLabStr) / 100) * 0.4;
      }
      
      let b_lab = parseFloat(bLabStr);
      if (bLabStr.endsWith('%')) {
        b_lab = (parseFloat(bLabStr) / 100) * 0.4;
      }
      
      let a: number | undefined = undefined;
      if (aStr !== undefined) {
        if (aStr.endsWith('%')) {
          a = parseFloat(aStr) / 100;
        } else {
          a = parseFloat(aStr);
        }
      }
      
      if (isNaN(l) || isNaN(a_lab) || isNaN(b_lab)) {
        return match;
      }
      
      return oklabToRgb(l, a_lab, b_lab, a);
    } catch (e) {
      return match;
    }
  });
}

function convertModernColorsToRgb(value: string): string {
  let val = convertOklchToRgb(value);
  val = convertOklabToRgb(val);
  return val;
}

const COLOR_PROPERTIES = [
  'color',
  'backgroundColor',
  'borderColor',
  'borderTopColor',
  'borderRightColor',
  'borderBottomColor',
  'borderLeftColor',
  'outlineColor',
  'fill',
  'stroke',
  'backgroundImage',
  'boxShadow',
  'textShadow'
];

// Resolves oklch & oklab values directly from calculated CSS rules of an original element onto a cloned element as inline styles
function resolveOklchForClone(original: Element, clone: Element) {
  const originalHtml = original as HTMLElement;
  const cloneHtml = clone as HTMLElement;
  
  if (originalHtml.style && cloneHtml.style) {
    const computed = window.getComputedStyle(originalHtml);
    
    for (const prop of COLOR_PROPERTIES) {
      const value = computed[prop as any];
      if (typeof value === 'string' && (value.includes('oklch(') || value.includes('oklab('))) {
        const rgbVal = convertModernColorsToRgb(value);
        cloneHtml.style[prop as any] = rgbVal;
      }
    }
  }
  
  const originalChildren = original.children;
  const cloneChildren = clone.children;
  const len = Math.min(originalChildren.length, cloneChildren.length);
  for (let i = 0; i < len; i++) {
    resolveOklchForClone(originalChildren[i], cloneChildren[i]);
  }
}

interface PdfExportModalProps {
  state: AppState;
  activeTab: string;
  onClose: () => void;
}

export default function PdfExportModal({ state, activeTab, onClose }: PdfExportModalProps) {
  const { settings } = state;
  const [isGenerating, setIsGenerating] = useState(false);
  const [exportType, setExportType] = useState<'viewport' | 'executive'>('executive');
  const [reportTitle, setReportTitle] = useState(() => {
    const monthStr = getMonthName(settings.miesiacPodatkowy);
    return `Raport_Podatkowy_${settings.nazwaSpolki.replace(/\s+/g, '_') || 'Spolka'}_${monthStr}_${settings.rokPodatkowy}`;
  });
  const [includeTransactions, setIncludeTransactions] = useState(true);
  const [includeYtd, setIncludeYtd] = useState(true);
  const [isDone, setIsDone] = useState(false);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);

  // Compute values for report
  const currentResult = calculateMonthlyTaxes(state, settings.rokPodatkowy, settings.miesiacPodatkowy);
  
  // Format currency for Poland
  const formatPLN = (num: number) => {
    const isNegative = num < 0;
    const absVal = Math.abs(num);
    const fixed = absVal.toFixed(2);
    const [integerPart, decimalPart] = fixed.split('.');
    
    const length = integerPart.length;
    let grouped = '';
    for (let i = 0; i < length; i++) {
      const revIndex = length - 1 - i;
      grouped = integerPart[revIndex] + grouped;
      if (i % 3 === 2 && revIndex > 0) {
        grouped = ' ' + grouped;
      }
    }
    
    return `${isNegative ? '-' : ''}${grouped},${decimalPart} zł`;
  };

  const activeMonthName = getMonthName(settings.miesiacPodatkowy);

  // List of months for YTD table
  const monthsIndices = Array.from({ length: settings.miesiacPodatkowy }, (_, i) => i + 1);
  const ytdResults = monthsIndices.map(m => calculateMonthlyTaxes(state, settings.rokPodatkowy, m));

  const totalYtdRevenue = ytdResults.reduce((sum, r) => sum + r.przychodyNetto, 0);
  const totalYtdCost = ytdResults.reduce((sum, r) => sum + r.kosztyNetto, 0);
  const totalYtdKup = ytdResults.reduce((sum, r) => sum + r.kosztyKUP, 0);
  const totalYtdCit = ytdResults.reduce((sum, r) => sum + r.podatekCIT, 0);

  // May trans summary (filtered for current month)
  const currentMonthSales = state.sales
    .filter(s => {
      const parts = s.data.split('-');
      return parts.length >= 2 && parseInt(parts[1], 10) === settings.miesiacPodatkowy && parseInt(parts[0], 10) === settings.rokPodatkowy;
    })
    .sort((a, b) => b.netto - a.netto); // highest first

  const currentMonthPurchases = state.purchases
    .filter(p => {
      const parts = p.data.split('-');
      return parts.length >= 2 && parseInt(parts[1], 10) === settings.miesiacPodatkowy && parseInt(parts[0], 10) === settings.rokPodatkowy;
    })
    .sort((a, b) => b.netto - a.netto);

  const handleExport = async () => {
    setIsGenerating(true);
    setIsDone(false);
    setErrorStatus(null);
    try {
      if (exportType === 'viewport') {
        // Target workspace-content-pane or the root element (without background overlay layers)
        const element = document.getElementById('workspace-content-pane') || document.getElementById('tax-app-root');
        if (!element) throw new Error('Nie znaleziono kontenera aplikacji do pobrania.');

        // For viewport capture, we perform synchronous in-place color conversion of OKLCH styles
        // directly on the active DOM elements to preserve exact screen coordinates, scrolls, layout, and charts.
        // These are instantly restored back to standard styles in the finally block.
        const modifiedElements: { el: HTMLElement; prop: string; originalValue: string }[] = [];

        const applyOklchFixRecursively = (el: Element) => {
          const htmlEl = el as HTMLElement;
          if (htmlEl.style) {
            const computed = window.getComputedStyle(htmlEl);
            for (const prop of COLOR_PROPERTIES) {
              const value = computed[prop as any];
              if (typeof value === 'string' && (value.includes('oklch(') || value.includes('oklab('))) {
                const rgbVal = convertModernColorsToRgb(value);
                const originalValue = htmlEl.style[prop as any];
                modifiedElements.push({ el: htmlEl, prop, originalValue });
                htmlEl.style[prop as any] = rgbVal;
              }
            }
          }
          for (let i = 0; i < el.children.length; i++) {
            applyOklchFixRecursively(el.children[i]);
          }
        };

        let originalWidth = '';
        let originalMinWidth = '';
        let originalMaxWidth = '';
        try {
          originalWidth = element.style.width;
          originalMinWidth = element.style.minWidth;
          originalMaxWidth = element.style.maxWidth;
          // Wymuszamy szerokość desktopową przed zrobieniem screena (aby był gęsto upakowany i miał odpowiednie proporcje)
          element.style.width = '1200px';
          element.style.minWidth = '1200px';
          element.style.maxWidth = '1200px';

          applyOklchFixRecursively(element);

          const canvas = await html2canvas(element, {
            scale: 2,
            useCORS: true,
            logging: false,
            scrollX: 0,
            scrollY: 0,
            windowWidth: 1200,
            backgroundColor: '#f8fafc',
            ignoreElements: (el) => {
              // Dropdowns, action select overlays, or specific buttons to ignore
              return el.hasAttribute('data-html2canvas-ignore') || el.id?.includes('header-export') || el.id?.includes('import-excel');
            }
          });

          const imgData = canvas.toDataURL('image/jpeg', 0.95);
          
          // Zmiana orientacji na poziomą (Landscape) dla zrzutów z pulpitu aby zachować proporcje i gęstość
          const pdf = new jsPDF('l', 'mm', 'a4');
          const pageWidth = 297;
          const pageHeight = 210;
          const margX = 10;
          const margTop = 15;
          const margBot = 15;
          const imgWidth = pageWidth - margX * 2;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;
          const printableHeight = pageHeight - margTop - margBot;

          let heightLeft = imgHeight;
          let positionY = margTop;
          let page = 1;
          const totalPages = Math.ceil(imgHeight / printableHeight);

          const drawA4Overlays = (pageNum: number) => {
            pdf.setFillColor(255, 255, 255);
            pdf.rect(0, 0, pageWidth, margTop, 'F');
            pdf.rect(0, pageHeight - margBot, pageWidth, margBot, 'F');
            pdf.rect(0, 0, margX, pageHeight, 'F');
            pdf.rect(pageWidth - margX, 0, margX, pageHeight, 'F');

            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(9);
            pdf.setTextColor(60, 60, 60);
            const companyStr = `RAPORT (ZRZUT INTERAKTYWNY): ${settings.nazwaSpolki || 'Kalkulator CIT & VAT'}`;
            pdf.text(companyStr, margX, 10);
            
            pdf.setFont('helvetica', 'normal');
            const dateStr = `Wygenerowano: ${new Date().toLocaleDateString('pl-PL')} ${new Date().toLocaleTimeString('pl-PL')}`;
            pdf.text(dateStr, pageWidth - margX, 10, { align: 'right' });

            pdf.setDrawColor(200, 200, 200);
            pdf.setLineWidth(0.2);
            pdf.line(margX, 12, pageWidth - margX, 12);

            pdf.line(margX, pageHeight - 12, pageWidth - margX, pageHeight - 12);
            pdf.setFontSize(8);
            pdf.setTextColor(120, 120, 120);
            pdf.text(`Strona ${pageNum} z ${totalPages}`, pageWidth - margX, pageHeight - 8, { align: 'right' });
            pdf.text(`Raport zoptymalizowany dla wydruku A4 • © 2026`, margX, pageHeight - 8);
          };

          pdf.addImage(imgData, 'JPEG', margX, positionY, imgWidth, imgHeight, undefined, 'FAST');
          drawA4Overlays(page);
          heightLeft -= printableHeight;

          while (heightLeft > 0) {
            positionY = positionY - printableHeight;
            page++;
            pdf.addPage();
            pdf.addImage(imgData, 'JPEG', margX, positionY, imgWidth, imgHeight, undefined, 'FAST');
            drawA4Overlays(page);
            heightLeft -= printableHeight;
          }

          pdf.save(`${reportTitle}.pdf`);
        } finally {
          element.style.width = originalWidth;
          element.style.minWidth = originalMinWidth;
          element.style.maxWidth = originalMaxWidth;
          // Restore the legacy styles back immediately in reverse order
          for (let i = modifiedElements.length - 1; i >= 0; i--) {
            const item = modifiedElements[i];
            item.el.style[item.prop as any] = item.originalValue;
          }
        }
      } else {
        // For 'executive' report, we snapshot our hidden high-fidelity layout
        const element = document.getElementById('pdf-report-template');
        if (!element) throw new Error('Wystąpił błąd ładowania szablonu raportu.');

        // Clone the element to prevent modifying direct React virtual DOM structure on the screen
        const clone = element.cloneNode(true) as HTMLElement;

        // Wrap it in a top-level overlay attached directly to document.body.
        // This avoids html2canvas failing to match deep/portaled ancestors or offset containers,
        // and completely eliminates the "Unable to find element in cloned iframe" error.
        const wrapper = document.createElement('div');
        wrapper.id = 'html2canvas-render-wrapper';
        wrapper.style.position = 'fixed';
        wrapper.style.left = '0px';
        wrapper.style.top = '0px';
        wrapper.style.width = '800px';
        wrapper.style.zIndex = '-99999';
        wrapper.style.visibility = 'visible';
        wrapper.style.background = '#ffffff';
        wrapper.style.opacity = '1';

        wrapper.appendChild(clone);
        document.body.appendChild(wrapper);

        try {
          resolveOklchForClone(element, clone);

          const canvas = await html2canvas(clone, {
            scale: 2,
            useCORS: true,
            logging: false,
            scrollX: 0,
            scrollY: 0,
            backgroundColor: '#ffffff',
            width: 800
          });

          const imgData = canvas.toDataURL('image/jpeg', 0.95);
          const pdf = new jsPDF('p', 'mm', 'a4');
          const pageWidth = 210;
          const pageHeight = 297;
          const margX = 10;
          const margTop = 15;
          const margBot = 15;
          const imgWidth = pageWidth - margX * 2;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;
          const printableHeight = pageHeight - margTop - margBot;

          let heightLeft = imgHeight;
          let positionY = margTop;
          let page = 1;
          const totalPages = Math.ceil(imgHeight / printableHeight);

          const drawA4Overlays = (pageNum: number) => {
            pdf.setFillColor(255, 255, 255);
            pdf.rect(0, 0, pageWidth, margTop, 'F');
            pdf.rect(0, pageHeight - margBot, pageWidth, margBot, 'F');
            pdf.rect(0, 0, margX, pageHeight, 'F');
            pdf.rect(pageWidth - margX, 0, margX, pageHeight, 'F');

            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(9);
            pdf.setTextColor(60, 60, 60);
            const companyStr = `RAPORT: ${settings.nazwaSpolki || 'Kalkulator CIT & VAT'} ${settings.nip ? `(NIP: ${settings.nip})` : ''}`;
            pdf.text(companyStr, margX, 10);
            
            pdf.setFont('helvetica', 'normal');
            const dateStr = `Wygenerowano: ${new Date().toLocaleDateString('pl-PL')} ${new Date().toLocaleTimeString('pl-PL')}`;
            pdf.text(dateStr, pageWidth - margX, 10, { align: 'right' });

            pdf.setDrawColor(200, 200, 200);
            pdf.setLineWidth(0.2);
            pdf.line(margX, 12, pageWidth - margX, 12);

            pdf.line(margX, pageHeight - 12, pageWidth - margX, pageHeight - 12);
            pdf.setFontSize(8);
            pdf.setTextColor(120, 120, 120);
            pdf.text(`Strona ${pageNum} z ${totalPages}`, pageWidth - margX, pageHeight - 8, { align: 'right' });
            pdf.text(`Raport zoptymalizowany dla wydruku A4 • © 2026`, margX, pageHeight - 8);
          };

          pdf.addImage(imgData, 'JPEG', margX, positionY, imgWidth, imgHeight, undefined, 'FAST');
          drawA4Overlays(page);
          heightLeft -= printableHeight;

          while (heightLeft > 0) {
            positionY = positionY - printableHeight;
            page++;
            pdf.addPage();
            pdf.addImage(imgData, 'JPEG', margX, positionY, imgWidth, imgHeight, undefined, 'FAST');
            drawA4Overlays(page);
            heightLeft -= printableHeight;
          }

          pdf.save(`${reportTitle}.pdf`);
        } finally {
          // Immediately tear down the temporary element
          if (document.body.contains(wrapper)) {
            document.body.removeChild(wrapper);
          }
        }
      }
      setIsDone(true);
    } catch (e: any) {
      console.error(e);
      setErrorStatus(`Wystąpił błąd podczas generowania: ${e.message || e}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-100 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
      {/* Container */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col md:flex-row max-h-[90vh]">
        
        {/* Left Option Sidebar */}
        <div className="p-6 md:p-8 bg-slate-50 border-r border-slate-200 flex-1 space-y-6 flex flex-col justify-between overflow-y-auto">
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-sm font-display uppercase tracking-wide">
                  Eksport PDF
                </h3>
              </div>
              <button 
                onClick={onClose} 
                className="p-1.5 rounded-lg hover:bg-slate-200/50 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Selector */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider font-mono">
                Typ eksportowanego dokumentu
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => { setExportType('executive'); setIsDone(false); }}
                  className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                    exportType === 'executive'
                      ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 text-slate-600'
                  }`}
                >
                  <FileCheck className="w-5 h-5 mx-auto mb-1 text-indigo-600" />
                  <span className="text-xs font-bold block leading-tight">Biznesowy Raport PDF</span>
                  <span className="text-[9px] text-slate-400">Rekomendowany do wydruków</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setExportType('viewport'); setIsDone(false); }}
                  className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                    exportType === 'viewport'
                      ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 text-slate-600'
                  }`}
                >
                  <Layers className="w-5 h-5 mx-auto mb-1 text-slate-500" />
                  <span className="text-xs font-bold block leading-tight">Zrzut pulpitu interaktywnego</span>
                  <span className="text-[9px] text-slate-400">Dokładny widok z wykresami</span>
                </button>
              </div>
            </div>

            {/* Inputs & switches */}
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider font-mono">
                  Nazwa generowanego pliku
                </label>
                <input
                  type="text"
                  value={reportTitle}
                  onChange={(e) => setReportTitle(e.target.value)}
                  placeholder="Nazwa pliku..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-250 bg-white text-xs font-mono text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {exportType === 'executive' && (
                <div className="space-y-2 bg-slate-100 border border-slate-200 p-3.5 rounded-xl">
                  <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest block mb-2 font-mono">
                    Konfiguracja zawartości raportu
                  </span>
                  
                  <label className="flex items-center gap-2.5 cursor-pointer text-xs select-none">
                    <input
                      type="checkbox"
                      checked={includeYtd}
                      onChange={(e) => setIncludeYtd(e.target.checked)}
                      className="accent-indigo-600 h-4 w-4 rounded-xs border-slate-300 cursor-pointer"
                    />
                    <span className="font-semibold text-slate-700">Wytocz zestawienie roczne (YTD)</span>
                  </label>

                  <label className="flex items-center gap-2.5 cursor-pointer text-xs select-none mt-2 block">
                    <input
                      type="checkbox"
                      checked={includeTransactions}
                      onChange={(e) => setIncludeTransactions(e.target.checked)}
                      className="accent-indigo-600 h-4 w-4 rounded-xs border-slate-300 cursor-pointer"
                    />
                    <span className="font-semibold text-slate-700">Wykaż kluczowe faktury i koszty</span>
                  </label>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t border-slate-200">
            {isDone ? (
              <div className="bg-emerald-100/60 border border-emerald-200 p-3 rounded-xl flex items-center gap-2.5 text-emerald-800 text-xs">
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <span className="font-bold">Pobrano pomyślnie!</span>
                  <p className="text-[10px] text-emerald-700">Plik został wyeksportowany na Twój komputer.</p>
                </div>
              </div>
            ) : null}

            {errorStatus ? (
              <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl flex items-center gap-2.5 text-rose-850 text-xs">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 font-bold" />
                <div>
                  <span className="font-bold">Wystąpił błąd:</span>
                  <p className="text-[10px] text-rose-750 font-mono mt-0.5">{errorStatus}</p>
                </div>
              </div>
            ) : null}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 px-4 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors"
                disabled={isGenerating}
              >
                Zamknij
              </button>
              
              <button
                type="button"
                onClick={handleExport}
                disabled={isGenerating}
                className="flex-1 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 hover:shadow-lg disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wider cursor-pointer transition-all flex items-center justify-center gap-1.5"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Przetwarzanie...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Pobierz PDF</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right Preview Window (Visible on desktop) */}
        <div className="hidden lg:block w-[320px] bg-slate-800 border-l border-slate-700/80 p-6 flex flex-col justify-between text-white shrink-0 overflow-y-auto">
          <div className="space-y-4">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider font-mono">
              Podgląd parametrów raportu
            </span>
            
            <div className="space-y-3 bg-slate-900/60 border border-slate-700/55 p-4 rounded-2xl">
              <div>
                <span className="text-[9px] text-slate-400 block uppercase font-mono">Zarząd i Firma:</span>
                <span className="text-xs font-bold block mt-0.5 text-slate-100">
                  {settings.nazwaSpolki || 'Kalkulator CIT & VAT'}
                </span>
                {settings.nip && (
                  <span className="text-[10px] text-indigo-300 font-mono">NIP: {settings.nip}</span>
                )}
              </div>

              <div className="h-px bg-slate-800"></div>

              <div>
                <span className="text-[9px] text-slate-400 block uppercase font-mono">Miesiąc Analizy:</span>
                <span className="text-xs font-bold block mt-0.5 text-slate-100">
                  {activeMonthName} {settings.rokPodatkowy}
                </span>
              </div>

              <div className="h-px bg-slate-800"></div>

              <div>
                <span className="text-[9px] text-slate-400 block uppercase font-mono">Podatek CIT:</span>
                <span className="text-xs font-bold block mt-0.5 text-emerald-400 font-mono">
                  {formatPLN(currentResult.podatekCIT)} ({settings.stawkaCIT}%)
                </span>
              </div>

              <div className="h-px bg-slate-800"></div>

              <div>
                <span className="text-[9px] text-slate-400 block uppercase font-mono">Kwota VAT Do Zapłaty:</span>
                <span className="text-xs font-bold block mt-0.5 text-rose-300 font-mono">
                  {formatPLN(currentResult.vatDoZaplaty)}
                </span>
              </div>
            </div>

            <div className="p-3 bg-indigo-950/40 border border-indigo-900 rounded-xl flex gap-2.5 text-slate-300 text-[11px] leading-relaxed">
              <TrendingUp className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <span>Możesz bezpłatnie drukować lub zapisać raport jako PDF chroniąc dane finansowe firmy.</span>
            </div>
          </div>

          <div className="text-[10px] text-slate-400 text-center font-mono pt-4 select-none">
            Symulator Podatkowy v2.0
          </div>
        </div>
      </div>

      {/* RENDER-OUT OF HIGH-FIDELITY BUSINESS REPORT EMBED (rendered off-screen, width 800px) */}
      <div style={{ position: 'absolute', left: '-10000px', top: '0px', width: '800px' }} data-html2canvas-ignore="false">
        <div id="pdf-report-template" className="bg-white text-slate-900 p-10 font-sans space-y-8 leading-normal">
          
          {/* Executive Company Tag & Seal */}
          <div className="flex justify-between items-start border-b-2 border-indigo-700 pb-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
                  Σ
                </div>
                <span className="text-lg font-black tracking-tight text-slate-800 uppercase font-display">
                  Symulator Podatkowy
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                Polskie Spółki z ograniczoną odpowiedzialnością • CIT + VAT
              </p>
            </div>
            
            {/* Stamp Metadata Box */}
            <div className="text-right text-xs space-y-1 text-slate-600">
              <div className="font-bold text-slate-900 uppercase">RAPORT FINANSOWO-PODATKOWY</div>
              <div className="font-mono text-[10px]">Wygenerowano: {new Date().toLocaleDateString('pl-PL')}</div>
              <div className="text-[10px] bg-indigo-50 border border-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-black uppercase inline-block">
                Status: Oficjalny Symulator
              </div>
            </div>
          </div>

          {/* Company Details Grid */}
          <div className="grid grid-cols-2 gap-6 bg-slate-50 p-5 rounded-2xl border border-slate-200">
            <div className="space-y-1">
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">PODMIOT GOSPODARCZY</span>
              <h4 className="text-sm font-bold text-slate-800">{settings.nazwaSpolki || 'Nie podano nazwy spółki'}</h4>
              {settings.nip && (
                <p className="text-xs text-slate-600 font-mono">Numer NIP: {settings.nip}</p>
              )}
              <p className="text-xs text-slate-500">Forma prawna: Spółka z ograniczoną odpowiedzialnością</p>
            </div>

            <div className="space-y-1 text-right">
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">OKRES ROZLICZENIOWY</span>
              <h4 className="text-sm font-bold text-slate-800 uppercase">{activeMonthName} {settings.rokPodatkowy}</h4>
              <p className="text-xs text-slate-600 font-mono">Bieżąca stawka CIT: {settings.stawkaCIT}%</p>
              <p className="text-xs text-slate-500">System fakturowania: KSeF / Standardowy</p>
            </div>
          </div>

          {/* Section: Main KPIs */}
          <div className="space-y-3">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest border-b border-slate-200 pb-1.5 font-display">
              1. Zestawienie Wyników Podatkowych
            </h3>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="border border-slate-200 p-4 rounded-xl text-center">
                <span className="text-[9px] text-slate-500 block uppercase font-mono">PRZYCHÓD NETTO (M-C)</span>
                <span className="text-base font-black text-slate-800 font-mono block mt-1">
                  {formatPLN(currentResult.przychodyNetto)}
                </span>
                <span className="text-[10px] text-slate-400">Przychód kwalifikowany CIT</span>
              </div>

              <div className="border border-slate-200 p-4 rounded-xl text-center">
                <span className="text-[9px] text-slate-500 block uppercase font-mono">KOSZTY UZYSKANIA PRZYCHODU (KUP)</span>
                <span className="text-base font-black text-slate-800 font-mono block mt-1">
                  {formatPLN(currentResult.kosztyKUP)}
                </span>
                <span className="text-[10px] text-slate-400">Z uwzględnieniem limitu aut 75%</span>
              </div>

              <div className="bg-indigo-50 border border-indigo-150 p-4 rounded-xl text-center">
                <span className="text-[9px] text-indigo-700 block uppercase font-mono">DOCHÓD PRZED OPODATKOWANIEM</span>
                <span className="text-base font-black text-indigo-900 font-mono block mt-1">
                  {formatPLN(currentResult.dochodCIT)}
                </span>
                <span className="text-[10px] text-indigo-600">Baza opodatkowania CIT</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-2">
              <div className="border border-slate-200 p-4 rounded-xl bg-slate-50/50 flex justify-between items-center">
                <div>
                  <span className="text-[9px] text-slate-500 block uppercase font-mono">NALEŻNA ZALICZKA CIT ZA M-C</span>
                  <span className="text-sm font-bold text-slate-800 font-mono mt-0.5 block">
                    {formatPLN(currentResult.podatekCIT)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[9px] text-slate-400 block font-mono">ZAPŁACONA ZALICZKA:</span>
                  <span className="text-xs font-bold text-slate-600 font-mono">
                    {formatPLN(currentResult.zaplaconeZaliczkiCIT)}
                  </span>
                </div>
              </div>

              <div className="border border-slate-200 p-4 rounded-xl bg-slate-50/50 flex justify-between items-center">
                <div>
                  <span className="text-[9px] text-slate-500 block uppercase font-mono">PODATEK VAT DO WPŁATY</span>
                  <span className="text-sm font-bold text-rose-600 font-mono mt-0.5 block">
                    {formatPLN(currentResult.vatDoZaplaty)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[9px] text-slate-400 block font-mono">VAT DO PRZENIESIENIA:</span>
                  <span className="text-xs font-bold text-emerald-600 font-mono">
                    {formatPLN(currentResult.vatDoPrzeniesienia)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Section: YTD Table */}
          {includeYtd && (
            <div className="space-y-3">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest border-b border-slate-200 pb-1.5 font-display">
                2. Kronika Rozliczeń Narastająco YTD ({settings.rokPodatkowy})
              </h3>
              
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-350 text-slate-500 font-mono text-[9px] uppercase">
                    <th className="py-2">Miesiąc</th>
                    <th className="py-2 text-right">Przychód Netto</th>
                    <th className="py-2 text-right font-mono">Koszty KUP</th>
                    <th className="py-2 text-right">Zaliczka CIT</th>
                    <th className="py-2 text-right">VAT należny</th>
                    <th className="py-2 text-right">VAT naliczony</th>
                    <th className="py-2 text-right">Kwota VAT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150">
                  {ytdResults.map((e, index) => (
                    <tr key={index} className="hover:bg-slate-50/50 font-mono">
                      <td className="py-2 font-sans font-bold text-slate-700">{getMonthName(e.miesiac)}</td>
                      <td className="py-2 text-right">{formatPLN(e.przychodyNetto)}</td>
                      <td className="py-2 text-right">{formatPLN(e.kosztyKUP)}</td>
                      <td className="py-2 text-right font-semibold text-slate-800">{formatPLN(e.podatekCIT)}</td>
                      <td className="py-2 text-right text-slate-500">{formatPLN(e.vatNaleznySuma)}</td>
                      <td className="py-2 text-right text-slate-500">{formatPLN(e.vatNaliczonySuma)}</td>
                      <td className={`py-2 text-right font-semibold ${e.vatDoZaplaty > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {e.vatDoZaplaty > 0 ? `Do wpłaty: ${formatPLN(e.vatDoZaplaty)}` : `Do przen.: ${formatPLN(e.vatDoPrzeniesienia)}`}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-slate-100 font-black font-mono">
                    <td className="py-2.5 font-sans font-bold text-slate-800">SUMA YTD:</td>
                    <td className="py-2.5 text-right font-black">{formatPLN(totalYtdRevenue)}</td>
                    <td className="py-2.5 text-right font-black">{formatPLN(totalYtdKup)}</td>
                    <td className="py-2.5 text-right font-black text-indigo-700">{formatPLN(totalYtdCit)}</td>
                    <td className="py-2.5 text-right text-slate-500">--</td>
                    <td className="py-2.5 text-right text-slate-500">--</td>
                    <td className="py-2.5 text-right">--</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Section: Transactions */}
          {includeTransactions && (
            <div className="space-y-4">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest border-b border-slate-200 pb-1.5 font-display">
                3. Wykaz Kluczowych Transakcji ({activeMonthName})
              </h3>
              
              <div className="grid grid-cols-2 gap-5">
                {/* Sales */}
                <div className="space-y-2">
                  <span className="text-[10px] font-black text-indigo-700 block uppercase tracking-wide">
                    NAJWIĘKSZE PRZYCHODY (SPRZEDAŻ)
                  </span>
                  {currentMonthSales.length === 0 ? (
                    <div className="text-[11px] text-slate-400 italic py-2">Brak transakcji sprzedaży dla tego miesiąca.</div>
                  ) : (
                    <div className="space-y-1.5">
                      {currentMonthSales.slice(0, 5).map((s, idx) => (
                        <div key={idx} className="border border-slate-150 p-2 rounded-lg space-y-0.5 text-[11px] hover:bg-slate-50 font-mono">
                          <div className="flex justify-between font-bold text-slate-800">
                            <span className="truncate max-w-[150px]">{s.kontrahent}</span>
                            <span>{formatPLN(s.netto)}</span>
                          </div>
                          <div className="flex justify-between text-slate-400 text-[10px]">
                            <span>FV: {s.numerFaktury}</span>
                            <span>VAT: {s.vat} zł ({s.stawkaVat}%)</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Purchases */}
                <div className="space-y-2">
                  <span className="text-[10px] font-black text-rose-700 block uppercase tracking-wide">
                    NAJWIĘKSZE KOSZTY (ZAKUPY)
                  </span>
                  {currentMonthPurchases.length === 0 ? (
                    <div className="text-[11px] text-slate-400 italic py-2">Brak transakcji kosztowych dla tego miesiąca.</div>
                  ) : (
                    <div className="space-y-1.5">
                      {currentMonthPurchases.slice(0, 5).map((p, idx) => (
                        <div key={idx} className="border border-slate-150 p-2 rounded-lg space-y-0.5 text-[11px] hover:bg-slate-50 font-mono">
                          <div className="flex justify-between font-bold text-slate-800">
                            <span className="truncate max-w-[150px]">{p.dostawca}</span>
                            <span>{formatPLN(p.netto)}</span>
                          </div>
                          <div className="flex justify-between text-slate-400 text-[10px]">
                            <span>
                              FV: {p.numerFaktury} • {p.kategoria}
                              {p.czyImportUslug && <span className="ml-1 text-blue-600 bg-blue-50 px-1 py-0.5 rounded font-black">[IMPORT]</span>}
                            </span>
                            <span>KUP: {p.kosztCIT ? 'TAK' : 'NIE'} • VAT: {p.odliczenieVat}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Legal and compliance check alert */}
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-[10px] text-amber-900 leading-relaxed flex gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Notatka Audytorska (Stan Prawny r. 2026):</span>
              <p className="mt-0.5 text-slate-600">
                Dokument wyrenderowany za pomocą zintegrowanego silnika podatkowego. Obliczenia CIT-8 i JPK_V7 są szacunkami matematycznymi opartymi na dostarczonych zbiorach danych i Ordynacji Podatkowej na rok 2026. Dokument ten ma charakter zarządczy i doradczy, i nie zdejmuje obowiązku ostatecznej autoryzacji z licencjonowanym Biurem Rachunkowym lub Doradcą Podatkowym.
              </p>
            </div>
          </div>

          {/* Signature Block */}
          <div className="grid grid-cols-2 gap-8 pt-8 border-t border-slate-200 text-xs">
            <div className="space-y-12">
              <span className="text-slate-400 block text-center font-mono text-[9px] uppercase">
                SPORZĄDZIŁ (ZESPÓŁ FINANSOWY / ADVISOR)
              </span>
              <div className="border-t border-dashed border-slate-300 mx-auto w-3/4"></div>
              <span className="text-[10px] text-slate-500 block text-center italic">
                Data i podpis asystenta finansowego
              </span>
            </div>

            <div className="space-y-12">
              <span className="text-slate-400 block text-center font-mono text-[9px] uppercase">
                ZATWIERDZIŁ (ZARZĄD SPÓŁKI / CFO)
              </span>
              <div className="border-t border-dashed border-slate-300 mx-auto w-3/4"></div>
              <span className="text-[10px] text-slate-500 block text-center italic">
                Podpis osoby upoważnionej do reprezentacji
              </span>
            </div>
          </div>

          {/* Footer of sheet */}
          <div className="pt-6 border-t border-slate-100 flex justify-between text-[9px] font-mono text-slate-400">
            <span>Ekosystem Rozliczeniowy Sp. z o.o. • Autonomiczna Enklawa Podatkowa v2.4.0</span>
            <span>Strona 1 z 1</span>
          </div>

        </div>
      </div>
    </div>
  );
}
