import React from 'react';
import { AppState, MonthlySimulationResult } from '../types';
import { calculateMonthlyTaxes, getMonthName, MONTHS_PL, isDateInMonth } from '../utils/taxCalc';
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
        grouped = ' ' + grouped; // regular space matches font-mono perfectly
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
  const cumNetMargin = cumRevenue > 0 ? (cumNetProfit / cumRevenue) * 105 : 0; // scaled nicely or capped
  const actualCumNetMargin = cumRevenue > 0 ? (cumNetProfit / cumRevenue) * 100 : 0;

  const importUslugPurchases = state.purchases.filter(p => p.czyImportUslug && isDateInMonth(p.data, settings.rokPodatkowy, settings.miesiacPodatkowy));
  const wirtualnyVatSuma = importUslugPurchases.reduce((sum, curr) => sum + curr.vat, 0);

  return (
    <div className="space-y-6" id="tax-dashboard-view">
      
      {/* 1. Bento KPI Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
        
        {/* HIGHLIGHTED BENTO CARD: Rentowność (Luxurious Deep Slate & Indigo Gradient) */}
        <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-5 text-white flex flex-col justify-between shadow-lg shadow-indigo-950/10 min-h-[160px] border border-slate-800 transition-all hover:scale-[1.01]" id="metric-margin">
          <div className="flex justify-between items-start">
            <span className="text-indigo-200 uppercase text-[9px] font-bold tracking-wider font-display">
              Rentowność Netto (M-C)
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold ${netMargin > 0 ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/25' : 'bg-rose-500/15 text-rose-300 border border-rose-500/25'}`}>
              {netMargin.toFixed(1).replace('.', ',')}%
            </span>
          </div>
          <div className="mt-4">
            <div className="text-[9px] text-indigo-200/70 uppercase tracking-wider font-mono">Wynik finansowy (m-c)</div>
            <div className="text-xl sm:text-2xl font-black font-display tracking-tight text-white">{formatPLN(netProfit)}</div>
            <div className="w-full bg-slate-800/80 h-1.5 rounded-full overflow-hidden mt-2.5 border border-slate-700/30">
              <div 
                className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(Math.max(netMargin, 0), 100)}%` }}
              />
            </div>
          </div>
          <div className="text-[9px] text-indigo-300/80 font-mono mt-1 pt-1.5 border-t border-slate-800 flex justify-between items-center">
            <span>Okres rozliczeniowy:</span>
            <span className="font-bold uppercase text-white">{getMonthName(settings.miesiacPodatkowy)}</span>
          </div>
        </div>

        {/* HIGHLIGHTED BENTO CARD 2: Rentowność Roczna (YTD - od początku roku) */}
        <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 rounded-2xl p-5 text-white flex flex-col justify-between shadow-lg shadow-indigo-950/5 min-h-[160px] border border-slate-800/80 transition-all hover:scale-[1.01]" id="metric-ytd-margin">
          <div className="flex justify-between items-start">
            <span className="text-slate-300 uppercase text-[9px] font-bold tracking-wider font-display">
              Rentowność Roczna (YTD)
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold ${actualCumNetMargin > 0 ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/25' : 'bg-rose-500/15 text-rose-300 border border-rose-500/25'}`}>
              YTD: {actualCumNetMargin.toFixed(1).replace('.', ',')}%
            </span>
          </div>
          <div className="mt-4">
            <div className="text-[9px] text-indigo-200/75 uppercase tracking-wider font-mono">
              Zysk roczny (styczeń - {getMonthName(settings.miesiacPodatkowy).slice(0, 3)}.)
            </div>
            <div className="text-xl sm:text-2xl font-black font-display tracking-tight text-indigo-200">{formatPLN(cumNetProfit)}</div>
            <div className="w-full bg-slate-800/80 h-1.5 rounded-full overflow-hidden mt-2.5 border border-slate-700/30">
              <div 
                className="bg-gradient-to-r from-teal-400 to-indigo-500 h-full rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(Math.max(actualCumNetMargin, 0), 100)}%` }}
              />
            </div>
          </div>
          <div className="text-[9px] text-slate-400 font-mono mt-1 pt-1.5 border-t border-slate-800/60 flex justify-between items-center">
            <span>Zbieżność roczna:</span>
            <span className="font-bold text-slate-200">STY - {getMonthName(settings.miesiacPodatkowy).slice(0, 3).toUpperCase()}</span>
          </div>
        </div>

        {/* CIT Payable */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between min-h-[160px] transition-all hover:border-indigo-300" id="metric-cit">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-display">
              Należny CIT do US
            </span>
            <span className="bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full text-[9px] font-black font-mono border border-indigo-100">
              CIT {settings.stawkaCIT}%
            </span>
          </div>
          <div className="mt-4">
            <div className="text-[9px] text-slate-450 text-slate-400 uppercase tracking-wider font-sans">Do zapłaty za bieżący m-c</div>
            <div className="text-xl sm:text-2xl font-black font-display text-slate-900 tracking-tight">
              {formatPLN(currentResult.podatekCitDoZaplaty)}
            </div>
            <p className="text-[10.5px] text-slate-500 mt-2 font-medium italic leading-tight">
              Zaliczka pomniejszona o transakcje
            </p>
          </div>
        </div>

        {/* VAT Payable */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between min-h-[160px] transition-all hover:border-indigo-300" id="metric-vat">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-display">
              Miesięczny VAT (JPK-V7)
            </span>
            <Layers className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-4">
            {currentResult.vatDoZaplaty > 0 ? (
              <>
                <div className="text-[9px] text-rose-500 font-bold uppercase tracking-wider">Zobowiązanie podatkowe</div>
                <div className="text-xl sm:text-2xl font-black font-display text-rose-700 tracking-tight">
                  {formatPLN(currentResult.vatDoZaplaty)}
                </div>
              </>
            ) : (
              <>
                <div className="text-[9px] text-emerald-600 font-bold uppercase tracking-wider font-mono">Nadwyżka na przeniesienie</div>
                <div className="text-xl sm:text-2xl font-black font-display text-emerald-600 tracking-tight">
                  {formatPLN(currentResult.vatDoPrzeniesienia)}
                </div>
              </>
            )}
            <p className="text-[10.5px] text-slate-500 mt-2 font-medium leading-tight">
              Uwzględnia nadwyżkę z poprz. okresu
            </p>
          </div>
        </div>

        {/* Sales metric */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between min-h-[160px] transition-all hover:border-indigo-300" id="metric-sales">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-display">
              Przychód Netto Spółki
            </span>
            <span className="bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold border border-slate-200">
              M-C NETTO
            </span>
          </div>
          <div className="mt-4">
            <div className="text-[9px] text-slate-450 text-slate-400 uppercase tracking-wider font-mono">Zafakturowano w tym miesiącu</div>
            <div className="text-xl sm:text-2xl font-black font-display text-slate-900 tracking-tight">
              {formatPLN(currentResult.przychodyNetto)}
            </div>
            <p className="text-[10.5px] text-slate-500 mt-2 font-medium leading-tight">
              Suma ujętych faktur sprzedaży
            </p>
          </div>
        </div>

      </div>

      {/* 2. Granular CIT vs VAT Side-by-Side Bento Blocks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* CIT Simulation Box */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5 shadow-xs hover:shadow-md transition-all" id="cit-panel-breakdown">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-indigo-600 ring-4 ring-indigo-100" />
              <h3 className="text-sm font-black text-slate-805 text-slate-850 font-display uppercase tracking-wider">
                Symulacja CIT (Podatek Dochodowy Spółki)
              </h3>
            </div>
            <span className="text-[9px] bg-slate-150 text-slate-600 px-2 py-0.5 rounded-md font-mono tracking-wider font-black">
              YTD METHOD
            </span>
          </div>

          <div className="space-y-3 text-xs leading-none">
            <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider pb-1 flex items-center gap-1.5">
              <span>🗓️</span> Miesiąc bazowy: {getMonthName(settings.miesiacPodatkowy)} {settings.rokPodatkowy}
            </h4>
            
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Miesięczny przychód do CIT:</span>
              <span className="font-extrabold text-slate-900 font-mono">{formatPLN(currentResult.przychodyDoCIT)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Miesięczne koszty uzyskania przychodu (KUP):</span>
              <span className="font-extrabold text-slate-900 font-mono">{formatPLN(currentResult.kosztyKUP)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-100 bg-slate-50/45 px-2 rounded-lg">
              <span className="text-slate-600 font-semibold">Dochód handlowy bieżącego miesiąca:</span>
              <span className="font-black text-slate-950 font-mono text-xs">{formatPLN(currentResult.dochodCIT)}</span>
            </div>

            <h4 className="text-[10px] font-black text-indigo-905 text-indigo-700 uppercase tracking-wider pt-3 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />
              Narastająco od początku roku (Ujęcie YTD):
            </h4>
            
            <div className="grid grid-cols-3 gap-2.5 pt-1">
              <div className="bg-slate-50 border border-slate-150 rounded-xl p-3 text-center space-y-1">
                <span className="text-[8.5px] uppercase text-slate-400 font-bold block">Przychody YTD</span>
                <span className="text-[11px] font-extrabold text-slate-900 font-mono block">{formatPLN(currentResult.cumPrzychodyDoCIT || 0).replace('zł', '')}</span>
              </div>
              <div className="bg-slate-50 border border-slate-150 rounded-xl p-3 text-center space-y-1">
                <span className="text-[8.5px] uppercase text-slate-400 font-bold block">Koszty YTD</span>
                <span className="text-[11px] font-extrabold text-slate-900 font-mono block">{formatPLN(currentResult.cumKosztyKUP || 0).replace('zł', '')}</span>
              </div>
              <div className="bg-indigo-50/40 border border-indigo-150 rounded-xl p-3 text-center space-y-1">
                <span className="text-[8.5px] uppercase text-indigo-700 font-bold block">Podstawa YTD</span>
                <span className="text-[11px] font-extrabold text-indigo-950 font-mono block">{formatPLN(currentResult.cumDochodCIT || 0).replace('zł', '')}</span>
              </div>
            </div>

            <div className="flex justify-between items-center py-2.5 border-y border-slate-100 my-2 font-bold text-slate-800">
              <span className="text-xs">Stawka podatku CIT Spółki:</span>
              <span className="font-black font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 text-xs">{settings.stawkaCIT}% CIT</span>
            </div>

            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Należna zaliczka za ten m-c (metoda postępowa):</span>
              <span className="font-extrabold text-slate-800 font-mono">{formatPLN(currentResult.podatekCIT)}</span>
            </div>
            <div className="flex justify-between items-center py-2 text-emerald-800 border-b border-slate-100 pb-2">
              <span className="text-emerald-700 font-medium">Suma uiszczonych zaliczek w tym okresie:</span>
              <span className="font-extrabold text-emerald-950 font-mono">-{formatPLN(currentResult.zaplaconeZaliczkiCIT)}</span>
            </div>

            <div className="flex justify-between items-center pt-3.5 text-base font-bold text-slate-950 border-t border-slate-100">
              <span className="font-display font-black text-xs sm:text-xs">MIESIĘCZNA ZALICZKA CIT DO WPŁATY:</span>
              <span className="text-indigo-600 font-mono text-2xl font-black tracking-tight">{formatPLN(currentResult.podatekCitDoZaplaty)}</span>
            </div>
          </div>
        </div>

        {/* VAT Simulation Box */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5 shadow-xs hover:shadow-md transition-all" id="vat-panel-breakdown">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-500 ring-4 ring-slate-100" />
              <h3 className="text-sm font-black text-slate-805 text-slate-850 font-display uppercase tracking-wider">
                Symulacja VAT (Podatek od Towarów i Usług)
              </h3>
            </div>
            <span className="text-[9px] bg-slate-150 text-slate-600 px-2 py-0.5 rounded-md font-mono tracking-wider font-black">
              JPK_V7M MODEL
            </span>
          </div>

          <div className="space-y-3 text-xs leading-none">
            <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider pb-1 flex items-center gap-1.5">
              <span>📊</span> Parametry podatku obrotowego (VAT-23%)
            </h4>

            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-slate-500 font-medium">VAT należny ze sprzedaży (Output Tax):</span>
              <span className="font-extrabold text-rose-600 font-mono">+{formatPLN(currentResult.vatNaleznySuma)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-slate-500 font-medium">VAT naliczony z kosztów (Input Tax odliczalny):</span>
              <span className="font-extrabold text-emerald-600 font-mono">-{formatPLN(currentResult.vatNaliczonySuma)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-slate-450 text-slate-400 font-medium">Przeniesiona nadwyżka VAT z poprzedniego miesiąca:</span>
              <span className="font-bold text-emerald-600 font-mono">-{formatPLN(currentResult.nadwyzkaVatZPoprzedniego)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Doraźne korekty deklaracji JPK-V7M:</span>
              <span className="font-extrabold text-slate-905 text-slate-800 font-mono">+{formatPLN(currentResult.korektyVat)}</span>
            </div>

            {wirtualnyVatSuma > 0 && (
              <div className="mt-3 p-3 bg-blue-50/60 border border-blue-100 rounded-xl text-xs text-blue-800 space-y-1">
                <div className="font-bold flex items-center justify-between">
                  <span>Wykryto Import Usług (zagraniczne zakupy):</span>
                  <span className="font-mono bg-blue-100 px-1.5 py-0.5 rounded text-blue-900">{formatPLN(wirtualnyVatSuma)}</span>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-600">
                  Kwota ta została automatycznie dodana do <strong>VAT-u Należnego (sprzedaż)</strong> oraz <strong>VAT-u Naliczonego (zakupy)</strong>. Transakcja jest neutralna podatkowo pod warunkiem posiadania prawa do pełnego odliczenia.
                </p>
              </div>
            )}

            <div className="p-3.5 bg-slate-50 rounded-xl space-y-1.5 text-[11px] text-slate-600 border border-slate-150 leading-relaxed font-sans mt-3">
              <span className="font-bold text-slate-700 flex items-center gap-1">
                <Info className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                Matryca Rozliczeniowa VAT:
              </span>
              <p>
                Wycena podatku do zapłaty lub zwrotu rozliczana jest miesięcznie. Nadwyżka zakupów (podatku naliczonego) powiększa kwotę do przeniesienia na następny okres deklaracyjny w deklaracjach JPK_V7.
              </p>
            </div>

            <div className="flex justify-between items-center pt-3.5 text-base font-bold text-slate-950 border-t border-slate-100">
              {currentResult.vatDoZaplaty > 0 ? (
                <>
                  <span className="font-display font-black text-xs sm:text-xs">MIESIĘCZNY VAT DO ZAPŁATY (US):</span>
                  <span className="text-rose-600 font-mono text-2xl font-black tracking-tight">{formatPLN(currentResult.vatDoZaplaty)}</span>
                </>
              ) : (
                <>
                  <span className="font-display font-black text-xs sm:text-xs">VAT DO PRZENIESIENIA NA KOLEJNY M-C:</span>
                  <span className="text-emerald-600 font-mono text-2xl font-black tracking-tight">{formatPLN(currentResult.vatDoPrzeniesienia)}</span>
                </>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* 3. TAX GRID FORECAST (ALL 12 MONTHS - Large Bento Grid Block) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5 shadow-xs hover:shadow-md transition-all font-display" id="tax-grid-forecast-panel">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600 border border-indigo-100">
              <Calendar className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-805 text-slate-850 uppercase tracking-wider">
                Kronika Symulacji Miesięcznych ({settings.rokPodatkowy})
              </h3>
              <p className="text-xs text-slate-400 mt-0.5 font-sans font-medium">
                Pulpit korelacji podatkowej i bilansu firmy w ujęciu 12-miesięcznym
              </p>
            </div>
          </div>
          <div className="text-[11px] bg-slate-50 px-3.5 py-2 rounded-xl text-slate-600 border border-slate-200 font-sans font-semibold">
            Roczny obrót netto: <span className="font-extrabold text-slate-900 font-mono">{formatPLN(rawYearRevenue)}</span>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs text-slate-700 border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-400 text-[9.5px] uppercase font-sans tracking-wider">
                <th className="px-4 py-3.5">Miesiąc r.p.</th>
                <th className="px-4 py-3.5 text-right">Przychody Netto</th>
                <th className="px-4 py-3.5 text-right">Koszty (KUP)</th>
                <th className="px-4 py-3.5 text-right">Dochód netto</th>
                <th className="px-4 py-3.5 text-right">Wyliczony CIT</th>
                <th className="px-4 py-3.5 text-right">Suma VAT Nal.</th>
                <th className="px-4 py-3.5 text-right">Suma VAT Należ.</th>
                <th className="px-4 py-3.5 text-center">Status VAT za m-c</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-805 text-slate-800 font-sans">
              {yearlyResults.map((res, idx) => {
                const isActive = res.miesiac === settings.miesiacPodatkowy;
                const income = res.przychodyNetto - res.kosztyNetto;
                
                return (
                  <tr
                    key={res.miesiac}
                    className={`hover:bg-slate-50/70 transition-colors ${
                      isActive ? 'bg-indigo-50/45 font-semibold text-slate-950 border-l-4 border-indigo-600' : ''
                    }`}
                  >
                    <td className="px-4 py-3 font-bold text-slate-900">
                      {idx + 1} - {getMonthName(res.miesiac)}
                    </td>
                    <td className="px-4 py-3 font-mono text-right">{formatPLN(res.przychodyNetto)}</td>
                    <td className="px-4 py-3 font-mono text-right">{formatPLN(res.kosztyKUP)}</td>
                    <td className={`px-4 py-3 font-black font-mono text-right ${income > 0 ? 'text-emerald-700' : income < 0 ? 'text-rose-700' : 'text-slate-500'}`}>
                      {formatPLN(income)}
                    </td>
                    <td className="px-4 py-3 font-mono text-right text-slate-900 font-bold">{formatPLN(res.podatekCitDoZaplaty)}</td>
                    <td className="px-4 py-3 text-rose-600 font-mono text-right">+{formatPLN(res.vatNaleznySuma)}</td>
                    <td className="px-4 py-3 text-emerald-600 font-mono text-right">-{formatPLN(res.vatNaliczonySuma)}</td>
                    <td className="px-4 py-3 font-bold text-center">
                      {res.vatDoZaplaty > 0 ? (
                        <span className="text-rose-600 bg-rose-50/80 px-2 py-0.5 rounded-full border border-rose-100 text-[9px] font-black uppercase font-mono">zapłata: {formatPLN(res.vatDoZaplaty)}</span>
                      ) : res.vatDoPrzeniesienia > 0 ? (
                        <span className="text-emerald-600 bg-emerald-50/80 px-2 py-0.5 rounded-full border border-emerald-100 text-[9px] font-black uppercase font-mono">nadwyżka: {formatPLN(res.vatDoPrzeniesienia)}</span>
                      ) : (
                        <span className="text-slate-400 font-mono text-[9px]">0,00 zł</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        <div className="text-[11px] text-slate-500 flex items-start gap-2.5 bg-amber-50 border border-amber-200/50 p-4 rounded-xl font-sans leading-relaxed">
          <AlertCircle className="w-4.5 h-4.5 text-amber-600 shrink-0 mt-0.5" />
          <p>
            * Symulacja roczna ma charakter poglądowy w celu ułatwienia bieżącej optymalizacji kosztowej. Wyliczenia oparte są o standardowe kryteria ujęcia transakcji i mogą ulec zmianie przy sporządzaniu deklaracji końcowych przez doradcę finansowego. Zaokrąglenia CIT wyliczane są progresywnie zgodnie z Ordynacją podatkową.
          </p>
        </div>

      </div>

    </div>
  );
}
