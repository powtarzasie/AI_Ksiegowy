import React from 'react';
import { AppState, MonthlySimulationResult } from '../types';
import { calculateMonthlyTaxes, getMonthName, MONTHS_PL } from '../utils/taxCalc';
import {
  TrendingUp,
  Percent,
  TrendingDown,
  DollarSign,
  Briefcase,
  Layers,
  ArrowRight,
  Info,
  Calendar,
  Layers2,
  FileText,
  AlertCircle
} from 'lucide-react';

interface TaxDashboardProps {
  state: AppState;
}

export default function TaxDashboard({ state }: TaxDashboardProps) {
  const { settings } = state;

  // Compute active month results
  const currentResult = calculateMonthlyTaxes(state, settings.rokPodatkowy, settings.miesiacPodatkowy);

  // Compute all 12 months for the year so we can show historical trends
  const yearlyResults: MonthlySimulationResult[] = Array.from({ length: 12 }, (_, i) => {
    return calculateMonthlyTaxes(state, settings.rokPodatkowy, i + 1);
  });

  // Totals for the whole year
  const rawYearRevenue = yearlyResults.reduce((acc, curr) => acc + curr.przychodyNetto, 0);
  const rawYearCost = yearlyResults.reduce((acc, curr) => acc + curr.kosztyNetto, 0);
  const totalYearCIT = yearlyResults.reduce((acc, curr) => acc + curr.podatekCIT, 0);
  const totalYearPaidCIT = yearlyResults.reduce((acc, curr) => acc + curr.zaplaconeZaliczkiCIT, 0);
  const totalYearVatToPay = yearlyResults.reduce((acc, curr) => acc + curr.vatDoZaplaty, 0);

  // Formatting utility with guaranteed space grouping for thousands (including 4-digit numbers) and decimal comma
  const formatPLN = (num: number) => {
    const isNegative = num < 0;
    const absVal = Math.abs(num);
    const fixed = absVal.toFixed(2); // e.g. "5357.50"
    
    const [integerPart, decimalPart] = fixed.split('.');
    
    // Group thousands manually
    const length = integerPart.length;
    let grouped = '';
    for (let i = 0; i < length; i++) {
      const revIndex = length - 1 - i;
      grouped = integerPart[revIndex] + grouped;
      if (i % 3 === 2 && revIndex > 0) {
        grouped = ' ' + grouped; // regular space is extremely predictable and matches font-mono perfectly
      }
    }
    
    let resultStr = `${grouped},${decimalPart}`;
    if (isNegative) {
      resultStr = '-' + resultStr;
    }
    
    return `${resultStr} zł`;
  };

  const netProfit = currentResult.przychodyNetto - currentResult.kosztyNetto - currentResult.podatekCIT;
  const netMargin = currentResult.przychodyNetto > 0 ? (netProfit / currentResult.przychodyNetto) * 100 : 0;

  // Cumulative results up to the current simulated month (1 to settings.miesiacPodatkowy)
  const cumulativeResults = yearlyResults.slice(0, settings.miesiacPodatkowy);
  const cumRevenue = cumulativeResults.reduce((acc, curr) => acc + curr.przychodyNetto, 0);
  const cumCost = cumulativeResults.reduce((acc, curr) => acc + curr.kosztyNetto, 0);
  const cumCITPaid = cumulativeResults.reduce((acc, curr) => acc + curr.podatekCIT, 0);
  const cumNetProfit = cumRevenue - cumCost - cumCITPaid;
  const cumNetMargin = cumRevenue > 0 ? (cumNetProfit / cumRevenue) * 100 : 0;

  // Progress Bar for year status
  const totalYearProfit = rawYearRevenue - rawYearCost;
  const progressPercent = Math.min(Math.max(rawYearRevenue > 0 ? (totalYearProfit / rawYearRevenue) * 100 : 0, 0), 100);

  return (
    <div className="space-y-6" id="tax-dashboard-view">
      
      {/* 1. Bento KPI Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        
        {/* HIGHLIGHTED BENTO CARD: Rentowność (Deep indigo styling from Design HTML) */}
        <div className="bg-indigo-900 rounded-3xl p-6 text-white flex flex-col justify-between shadow-md shadow-indigo-900/10 min-h-[170px]" id="metric-margin">
          <div className="flex justify-between items-start">
            <span className="text-indigo-200 uppercase text-[10px] font-black tracking-widest font-display">
              Rentowność Netto (M-C)
            </span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${netMargin > 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
              Rozliczony: {netMargin.toFixed(1)}%
            </span>
          </div>
          <div className="mt-4">
            <div className="text-[10px] text-indigo-200 uppercase tracking-wider font-mono">Wynik finansowy (m-c)</div>
            <div className="text-2xl font-bold font-display italic tracking-tight">{formatPLN(netProfit)}</div>
            <div className="w-full bg-indigo-850 h-1.5 rounded-full overflow-hidden mt-2 border border-indigo-850">
              <div 
                className="bg-emerald-400 h-full rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(Math.max(netMargin, 0), 100)}%` }}
              />
            </div>
          </div>
          <div className="text-[10px] text-indigo-300 font-mono mt-1">
            Okres: {getMonthName(settings.miesiacPodatkowy)}
          </div>
        </div>

        {/* HIGHLIGHTED BENTO CARD 2: Rentowność Roczna (YTD - od początku roku) */}
        <div className="bg-slate-900 rounded-3xl p-6 text-white flex flex-col justify-between shadow-md shadow-slate-900/10 min-h-[170px]" id="metric-ytd-margin">
          <div className="flex justify-between items-start">
            <span className="text-indigo-200 uppercase text-[10px] font-black tracking-widest font-display">
              Rentowność Roczna (YTD)
            </span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${cumNetMargin > 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
              Narastająco: {cumNetMargin.toFixed(1)}%
            </span>
          </div>
          <div className="mt-4">
            <div className="text-[10px] text-indigo-200 uppercase tracking-wider font-mono">Zysk roczny od {getMonthName(1).slice(0, 3)}. do {getMonthName(settings.miesiacPodatkowy).slice(0, 3)}.</div>
            <div className="text-2xl font-bold font-display italic tracking-tight">{formatPLN(cumNetProfit)}</div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-2 border border-slate-800">
              <div 
                className="bg-emerald-400 h-full rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(Math.max(cumNetMargin, 0), 100)}%` }}
              />
            </div>
          </div>
          <div className="text-[10px] text-slate-300 font-mono mt-1">
            Okres: Styczeń - {getMonthName(settings.miesiacPodatkowy)}
          </div>
        </div>

        {/* CIT Payable */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between min-h-[170px]" id="metric-cit">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-display">
              Należny CIT do US
            </span>
            <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full text-[10px] font-bold">
              CIT-{settings.stawkaCIT}%
            </span>
          </div>
          <div className="mt-4">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">Do zapłaty za bieżący m-c</div>
            <div className="text-2xl font-bold font-display text-slate-900 tracking-tight">
              {formatPLN(currentResult.podatekCitDoZaplaty)}
            </div>
            <p className="text-xs text-slate-500 mt-1 font-medium italic">
              Zaliczka pomniejszona o transakcje
            </p>
          </div>
        </div>

        {/* VAT Payable */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between min-h-[170px]" id="metric-vat">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-display">
              Miesięczny VAT (JPK-V7)
            </span>
            <TrendingUp className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-4">
            {currentResult.vatDoZaplaty > 0 ? (
              <>
                <div className="text-[10px] text-rose-500 font-bold uppercase tracking-wider">Zobowiązanie podatkowe</div>
                <div className="text-2xl font-bold font-display text-rose-700 tracking-tight">
                  {formatPLN(currentResult.vatDoZaplaty)}
                </div>
              </>
            ) : (
              <>
                <div className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">Nadwyżka (Do przeniesienia)</div>
                <div className="text-2xl font-bold font-display text-emerald-600 tracking-tight">
                  {formatPLN(currentResult.vatDoPrzeniesienia)}
                </div>
              </>
            )}
            <p className="text-xs text-slate-500 mt-1 font-medium">
              Uwzględnia nadwyżkę z poprz. okresu
            </p>
          </div>
        </div>

        {/* Sales metric */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between min-h-[170px]" id="metric-sales">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-display">
              Przychód Netto Spółki
            </span>
            <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full text-[10px] font-bold border border-indigo-100">
              SPRZEDAŻ M-C
            </span>
          </div>
          <div className="mt-4">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">Zafakturowano w tym miesiącu</div>
            <div className="text-2xl font-bold font-display text-slate-900 tracking-tight">
              {formatPLN(currentResult.przychodyNetto)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Suma ujętych faktur sprzedaży
            </p>
          </div>
        </div>

      </div>

      {/* 2. Granular CIT vs VAT Side-by-Side Bento Blocks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* CIT Simulation Box */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-sm" id="cit-panel-breakdown">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <div className="w-3 h-3 rounded-full bg-indigo-600 shadow-xs" />
            <h3 className="text-base font-bold text-slate-800 font-display">
              Szczegóły Symulacji CIT (Podatek Dochodowy Spółki)
            </h3>
          </div>

          <div className="space-y-3 text-xs leading-none">
            <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Przychody uwzględniane w CIT (A):</span>
              <span className="font-semibold text-slate-900 font-mono">{formatPLN(currentResult.przychodyDoCIT)}</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Koszty uzyskania przychodów (KUP) (B):</span>
              <span className="font-semibold text-slate-900 font-mono">{formatPLN(currentResult.kosztyKUP)}</span>
            </div>
            
            <div className="flex justify-between items-center py-2.5 border-y border-slate-200 my-1 font-bold text-slate-900">
              <span>Podstawa opodatkowania (A - B):</span>
              <span className="font-semibold font-mono">{formatPLN(currentResult.dochodCIT)}</span>
            </div>

            <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Stawka podatku CIT:</span>
              <span className="font-semibold text-slate-900 font-mono">{settings.stawkaCIT}%</span>
            </div>

            <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
              <span className="text-slate-400 font-medium">Bieżąco policzona zaliczka CIT:</span>
              <span className="font-semibold text-slate-700 font-mono">{formatPLN(currentResult.podatekCIT)}</span>
            </div>
            <div className="flex justify-between items-center py-1.5 text-emerald-800 border-b border-slate-100 pb-2">
              <span className="text-emerald-700">Zapłacone / zaksięgowane zaliczki:</span>
              <span className="font-semibold text-emerald-900 font-mono">-{formatPLN(currentResult.zaplaconeZaliczkiCIT)}</span>
            </div>

            <div className="flex justify-between items-center pt-2.5 text-base font-bold text-slate-950">
              <span className="font-display">Ostateczny CIT do przelewu:</span>
              <span className="text-indigo-600 font-mono text-2xl font-black">{formatPLN(currentResult.podatekCitDoZaplaty)}</span>
            </div>
          </div>
        </div>

        {/* VAT Simulation Box */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-sm" id="vat-panel-breakdown">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <div className="w-3 h-3 rounded-full bg-slate-400 shadow-xs" />
            <h3 className="text-base font-bold text-slate-800 font-display">
              Szczegóły Symulacji VAT (Towary i Usługi)
            </h3>
          </div>

          <div className="space-y-3 text-xs leading-none">
            <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
              <span className="text-slate-500">VAT należny ze sprzedaży (Output):</span>
              <span className="font-semibold text-rose-700 font-mono">+{formatPLN(currentResult.vatNaleznySuma)}</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
              <span className="text-slate-500">VAT naliczony z kosztów (Input odliczalny):</span>
              <span className="font-semibold text-emerald-700 font-mono">-{formatPLN(currentResult.vatNaliczonySuma)}</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
              <span className="text-slate-400">Nadwyżka VAT przeniesiona z zeszłego m-ca:</span>
              <span className="font-semibold text-emerald-700 font-mono">-{formatPLN(currentResult.nadwyzkaVatZPoprzedniego)}</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Miesięczne korekty JPK-V7:</span>
              <span className="font-semibold text-slate-900 font-mono">+{formatPLN(currentResult.korektyVat)}</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl space-y-1 text-[11px] text-slate-600 border border-slate-150 leading-relaxed">
              <span className="font-bold text-slate-700 flex items-center gap-1">
                <Info className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                Matryca Rozliczeniowa VAT:
              </span>
              <p>
                Wartość podatku do zwrotu lub przeniesienia jest decydowana dynamicznie na podstawie sumy podatku naliczonego i zaksięgowanych nadwyżek z poprzednich deklaracji.
              </p>
            </div>

            {currentResult.vatDoZaplaty > 0 ? (
              <div className="flex justify-between items-center pt-2 text-base font-bold text-slate-950">
                <span className="font-display">VAT do zapłaty (M-C):</span>
                <span className="text-rose-600 font-mono text-2xl font-black">{formatPLN(currentResult.vatDoZaplaty)}</span>
              </div>
            ) : (
              <div className="flex justify-between items-center pt-2 text-base font-bold text-slate-950">
                <span className="font-display">VAT do przeniesienia na m-c {MONTHS_PL[settings.miesiacPodatkowy] || 'kolejny'}:</span>
                <span className="text-emerald-600 font-mono text-2xl font-black">{formatPLN(currentResult.vatDoPrzeniesienia)}</span>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* 3. TAX GRID FORECAST (ALL 12 MONTHS - Large Bento Grid Block) */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-sm font-display" id="tax-grid-forecast-panel">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <Calendar className="w-5 h-5 text-indigo-600" />
            <div>
              <h3 className="text-base font-bold text-slate-800">
                Roczna Kronika Symulacji Miesięcznych ({settings.rokPodatkowy})
              </h3>
              <p className="text-xs text-slate-400 mt-0.5 font-sans font-medium">
                Pulpit pętli rozliczeniowej i korelacja podatków w przekroju roku podatkowego
              </p>
            </div>
          </div>
          <div className="text-xs bg-slate-50 px-3 py-2 rounded-xl text-slate-600 border border-slate-200 font-sans font-medium">
            Roczny obrót netto: <span className="font-bold text-slate-900 font-mono">{formatPLN(rawYearRevenue)}</span>
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full text-left text-xs text-slate-700 border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-400 text-[10px] uppercase font-sans">
                <th className="px-4 py-3.5">Miesiąc r.p.</th>
                <th className="px-4 py-3.5">Przychody Netto</th>
                <th className="px-4 py-3.5">Koszty (KUP)</th>
                <th className="px-4 py-3.5">Dochód netto</th>
                <th className="px-4 py-3.5">Wyliczony CIT</th>
                <th className="px-4 py-3.5">Suma VAT Nal.</th>
                <th className="px-4 py-3.5">Suma VAT Należ.</th>
                <th className="px-4 py-3.5">Status VAT za m-c</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800 font-sans">
              {yearlyResults.map((res, idx) => {
                const isActive = res.miesiac === settings.miesiacPodatkowy;
                const income = res.przychodyNetto - res.kosztyNetto;
                
                return (
                  <tr
                    key={res.miesiac}
                    className={`hover:bg-slate-50/70 transition-colors ${
                      isActive ? 'bg-indigo-50/40 font-semibold text-slate-900 border-l-4 border-indigo-600' : ''
                    }`}
                  >
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {idx + 1} - {getMonthName(res.miesiac)}
                    </td>
                    <td className="px-4 py-3 font-mono">{formatPLN(res.przychodyNetto)}</td>
                    <td className="px-4 py-3 font-mono">{formatPLN(res.kosztyKUP)}</td>
                    <td className={`px-4 py-3 font-semibold font-mono ${income > 0 ? 'text-emerald-700' : income < 0 ? 'text-rose-700' : 'text-slate-500'}`}>
                      {formatPLN(income)}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-900 font-medium">{formatPLN(res.podatekCitDoZaplaty)}</td>
                    <td className="px-4 py-3 text-rose-600 font-mono">+{formatPLN(res.vatNaleznySuma)}</td>
                    <td className="px-4 py-3 text-emerald-600 font-mono">-{formatPLN(res.vatNaliczonySuma)}</td>
                    <td className="px-4 py-3 font-semibold">
                      {res.vatDoZaplaty > 0 ? (
                        <span className="text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-100 text-[10px]">zapłata: {formatPLN(res.vatDoZaplaty)}</span>
                      ) : res.vatDoPrzeniesienia > 0 ? (
                        <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 text-[10px]">nadwyżka: {formatPLN(res.vatDoPrzeniesienia)}</span>
                      ) : (
                        <span className="text-slate-400 font-mono">0,00 zł</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        <div className="text-[11px] text-slate-500 flex items-start gap-2.5 bg-yellow-50 border border-yellow-200/60 p-4 rounded-2xl font-sans leading-relaxed">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <p>
            * Symulacja roczna ma charakter informacyjny w celu ułatwienia bieżącej kontroli finansowej i optymalizacji obciążeń. Wyliczenia oparte są o standardowe kryteria ujęcia transakcji bieżących i mogą ulec korektom przy sporządzaniu deklaracji końcowych przez doradcę finansowego.
          </p>
        </div>

      </div>

    </div>
  );
}
