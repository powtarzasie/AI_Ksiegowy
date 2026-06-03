import React, { useState } from 'react';
import { AppState, MonthlySimulationResult } from '../types';
import { calculateMonthlyTaxes, calculatePurchaseKUP } from '../utils/taxCalc';
import {
  Sliders,
  Clock,
  ShieldCheck,
  Layers,
  Sparkles,
  Briefcase,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Info,
  Plus,
  Trash2,
  Calendar,
  PiggyBank,
  Percent
} from 'lucide-react';

interface FutureExpense {
  id: string;
  nazwa: string;
  netto: number;
  kategoria: string;
  prawdopodobienstwo: 'wysokie' | 'średnie' | 'niskie';
  czyAktywny: boolean;
  miesiacPlanowany: number;
}

interface FutureRevenue {
  id: string;
  nazwa: string;
  netto: number;
  kategoria: string;
  prawdopodobienstwo: 'wysokie' | 'średnie' | 'niskie';
  czyAktywny: boolean;
  miesiacPlanowany: number;
}

interface McKinseyDashboardProps {
  state: AppState;
}

export default function McKinseyDashboard({ state }: McKinseyDashboardProps) {
  const { settings, purchases, sales, citAdvances } = state;

  // Compute all 12 months to have active and future totals
  const monthlyResults: MonthlySimulationResult[] = Array.from({ length: 12 }, (_, i) => {
    return calculateMonthlyTaxes(state, settings.rokPodatkowy, i + 1);
  });

  // Calculate actual registered totals YTD
  const actualRevenueYTD = monthlyResults.reduce((acc, m) => acc + m.przychodyNetto, 0);
  const actualCostYTD = monthlyResults.reduce((acc, m) => acc + m.kosztyNetto, 0);
  const actualKupYTD = monthlyResults.reduce((acc, m) => acc + m.kosztyKUP, 0);
  const actualIncomeYTD = Math.max(0, actualRevenueYTD - actualKupYTD);
  
  // Calculate CIT on actual YTD
  const actualCitYTD = Math.round(actualIncomeYTD * (settings.stawkaCIT / 100));
  
  // Total CIT advances paid so far by the user
  const totalPaidAdvancesYTD = citAdvances.reduce((acc, adv) => acc + adv.kwota, 0);
  
  // What is the current closing CIT due at the end of the year if there were no more activities?
  const finalYearClosingTaxPayable = Math.max(0, actualCitYTD - totalPaidAdvancesYTD);
  const isEligibleForRefund = totalPaidAdvancesYTD > actualCitYTD;
  const potentialRefundAmount = isEligibleForRefund ? (totalPaidAdvancesYTD - actualCitYTD) : 0;

  // State for the interactive strategic McKinsey simulation
  const [simulatedFutureSales, setSimulatedFutureSales] = useState<number>(0); // additional sales till end of year
  const [simulatedFutureCosts, setSimulatedFutureCosts] = useState<number>(0); // additional KUP costs till end of year

  // Future Expenses Module State
  const DEFAULT_FUTURE_EXPENSES: FutureExpense[] = [
    {
      id: 'fe-1',
      nazwa: 'Przedłużenie licencji SketchUp',
      netto: 1800,
      kategoria: 'Oprogramowanie',
      prawdopodobienstwo: 'wysokie',
      czyAktywny: true,
      miesiacPlanowany: 10
    },
    {
      id: 'fe-2',
      nazwa: 'Polisa ubezpieczeniowa OC Spółki',
      netto: 2500,
      kategoria: 'Ubezpieczenia',
      prawdopodobienstwo: 'wysokie',
      czyAktywny: true,
      miesiacPlanowany: 11
    },
    {
      id: 'fe-3',
      nazwa: 'Utrzymanie Serwerów Chmurowych (AWS/GCP)',
      netto: 4200,
      kategoria: 'SaaS',
      prawdopodobienstwo: 'średnie',
      czyAktywny: true,
      miesiacPlanowany: 12
    },
    {
      id: 'fe-4',
      nazwa: 'Zakup laptopa biurowego',
      netto: 8500,
      kategoria: 'Sprzęt komputerowy',
      prawdopodobienstwo: 'niskie',
      czyAktywny: false,
      miesiacPlanowany: 11
    }
  ];

  const [futureExpenses, setFutureExpenses] = useState<FutureExpense[]>(() => {
    const saved = localStorage.getItem('mck_future_expenses');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // Fallback
      }
    }
    return DEFAULT_FUTURE_EXPENSES;
  });

  const saveFutureExpenses = (newExpenses: FutureExpense[]) => {
    setFutureExpenses(newExpenses);
    localStorage.setItem('mck_future_expenses', JSON.stringify(newExpenses));
  };

  // Form State for adding a new expense inline
  const [newExpName, setNewExpName] = useState('');
  const [newExpNetto, setNewExpNetto] = useState('');
  const [newExpProb, setNewExpProb] = useState<'wysokie' | 'średnie' | 'niskie'>('wysokie');
  const [newExpCategory, setNewExpCategory] = useState('Oprogramowanie');
  const [newExpMonth, setNewExpMonth] = useState(12);

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpName.trim() || !newExpNetto) return;
    const nettoVal = parseFloat(newExpNetto);
    if (isNaN(nettoVal) || nettoVal <= 0) return;

    const newExpense: FutureExpense = {
      id: `fe-${Date.now()}`,
      nazwa: newExpName,
      netto: nettoVal,
      kategoria: newExpCategory || 'Inne',
      prawdopodobienstwo: newExpProb,
      czyAktywny: true,
      miesiacPlanowany: newExpMonth
    };

    const updated = [...futureExpenses, newExpense];
    saveFutureExpenses(updated);
    setNewExpName('');
    setNewExpNetto('');
  };

  const handleToggleExpense = (id: string) => {
    const updated = futureExpenses.map((exp) => 
      exp.id === id ? { ...exp, czyAktywny: !exp.czyAktywny } : exp
    );
    saveFutureExpenses(updated);
  };

  const handleDeleteExpense = (id: string) => {
    const updated = futureExpenses.filter((exp) => exp.id !== id);
    saveFutureExpenses(updated);
  };

  // State to toggle between Expenses and Revenues in the planning hub
  const [planningTab, setPlanningTab] = useState<'expenses' | 'revenues'>('expenses');

  // Future Revenues Module State
  const DEFAULT_FUTURE_REVENUES: FutureRevenue[] = [
    {
      id: 'fr-1',
      nazwa: 'Zakontraktowane wdrożenie (Etap II)',
      netto: 28000,
      kategoria: 'Wdrożenie',
      prawdopodobienstwo: 'wysokie',
      czyAktywny: true,
      miesiacPlanowany: 10
    },
    {
      id: 'fr-2',
      nazwa: 'Abonamenty i opieka techniczna Q4',
      netto: 15000,
      kategoria: 'SaaS / Stałe',
      prawdopodobienstwo: 'wysokie',
      czyAktywny: true,
      miesiacPlanowany: 11
    },
    {
      id: 'fr-3',
      nazwa: 'Premia roczna za KPI od klienta głównego',
      netto: 20000,
      kategoria: 'Inne',
      prawdopodobienstwo: 'średnie',
      czyAktywny: false,
      miesiacPlanowany: 12
    }
  ];

  const [futureRevenues, setFutureRevenues] = useState<FutureRevenue[]>(() => {
    const saved = localStorage.getItem('mck_future_revenues');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // Fallback
      }
    }
    return DEFAULT_FUTURE_REVENUES;
  });

  const saveFutureRevenues = (newRevenues: FutureRevenue[]) => {
    setFutureRevenues(newRevenues);
    localStorage.setItem('mck_future_revenues', JSON.stringify(newRevenues));
  };

  // Form State for adding a new revenue inline
  const [newRevName, setNewRevName] = useState('');
  const [newRevNetto, setNewRevNetto] = useState('');
  const [newRevProb, setNewRevProb] = useState<'wysokie' | 'średnie' | 'niskie'>('wysokie');
  const [newRevCategory, setNewRevCategory] = useState('Projekt');
  const [newRevMonth, setNewRevMonth] = useState(12);

  const handleAddRevenue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRevName.trim() || !newRevNetto) return;
    const nettoVal = parseFloat(newRevNetto);
    if (isNaN(nettoVal) || nettoVal <= 0) return;

    const newRev: FutureRevenue = {
      id: `fr-${Date.now()}`,
      nazwa: newRevName,
      netto: nettoVal,
      kategoria: newRevCategory || 'Inne',
      prawdopodobienstwo: newRevProb,
      czyAktywny: true,
      miesiacPlanowany: newRevMonth
    };

    const updated = [...futureRevenues, newRev];
    saveFutureRevenues(updated);
    setNewRevName('');
    setNewRevNetto('');
  };

  const handleToggleRevenue = (id: string) => {
    const updated = futureRevenues.map((rev) => 
      rev.id === id ? { ...rev, czyAktywny: !rev.czyAktywny } : rev
    );
    saveFutureRevenues(updated);
  };

  const handleDeleteRevenue = (id: string) => {
    const updated = futureRevenues.filter((rev) => rev.id !== id);
    saveFutureRevenues(updated);
  };

  // Sum of active future expenses included in simulation KUP costs
  const activeFutureExpensesKUP = futureExpenses
    .filter((e) => e.czyAktywny)
    .reduce((acc, e) => acc + e.netto, 0);

  // Sum of active future revenues included in simulation
  const activeFutureRevenues = futureRevenues
    .filter((e) => e.czyAktywny)
    .reduce((acc, e) => acc + e.netto, 0);

  // Calculations of "tax-today" including active future planned expenses and revenues
  const actualRevenueWithPlanned = actualRevenueYTD + activeFutureRevenues;
  const actualKupTotalWithPlanned = actualKupYTD + activeFutureExpensesKUP;
  const actualIncomeTotalWithPlanned = Math.max(0, actualRevenueWithPlanned - actualKupTotalWithPlanned);
  const actualCitTotalWithPlanned = Math.round(actualIncomeTotalWithPlanned * (settings.stawkaCIT / 100));
  
  const finalYearClosingTaxPayableWithPlanned = Math.max(0, actualCitTotalWithPlanned - totalPaidAdvancesYTD);
  const isEligibleForRefundWithPlanned = totalPaidAdvancesYTD > actualCitTotalWithPlanned;
  const potentialRefundAmountWithPlanned = isEligibleForRefundWithPlanned ? (totalPaidAdvancesYTD - actualCitTotalWithPlanned) : 0;
  
  const actualNetProfitWithPlanned = actualRevenueWithPlanned - (actualCostYTD + activeFutureExpensesKUP) - actualCitTotalWithPlanned;

  // Recalculated values under the Simulated Scenario
  const simulatedRevenueBase = actualRevenueYTD + simulatedFutureSales;
  const simulatedRevenueTotal = simulatedRevenueBase + activeFutureRevenues;
  const simulatedKupBase = actualKupYTD + simulatedFutureCosts;
  const simulatedKupTotal = simulatedKupBase + activeFutureExpensesKUP;
  const simulatedIncomeTotal = Math.max(0, simulatedRevenueTotal - simulatedKupTotal);
  const simulatedCitTotal = Math.round(simulatedIncomeTotal * (settings.stawkaCIT / 100));
  
  // Simulating year-end closure against the paid advances
  const simulatedTaxPayable = Math.max(0, simulatedCitTotal - totalPaidAdvancesYTD);
  const simulatedIsEligibleForRefund = totalPaidAdvancesYTD > simulatedCitTotal;
  const simulatedRefundAmount = simulatedIsEligibleForRefund ? (totalPaidAdvancesYTD - simulatedCitTotal) : 0;

  const simulatedNetProfit = simulatedRevenueTotal - (actualCostYTD + simulatedFutureCosts + activeFutureExpensesKUP) - simulatedCitTotal;

  // Grouping actual cost structure from the database
  const costCategories: { [key: string]: number } = {};
  let totalDeductibleKup = 0;

  purchases.forEach((p) => {
    // Apply CIT koszt rule (including vehicle clawbacks)
    const kupValue = calculatePurchaseKUP(p);

    if (kupValue > 0) {
      const catName = p.kategoria || 'Inne';
      costCategories[catName] = (costCategories[catName] || 0) + kupValue;
      totalDeductibleKup += kupValue;
    }
  });

  const costCategoryArray = Object.keys(costCategories).map((key) => ({
    name: key,
    value: costCategories[key],
    share: totalDeductibleKup > 0 ? (costCategories[key] / totalDeductibleKup) * 100 : 0,
  })).sort((a, b) => b.value - a.value);

  // Grouping actual revenues by contractor (sales)
  const revenueContractors: { [key: string]: number } = {};
  let totalRevenueForShare = 0;

  sales.forEach((s) => {
    if (s.czyCIT) {
      let contrName = s.kontrahent || 'Inne';
      // Beautify aggregation labels
      if (contrName.toLowerCase().includes('zbiorcza')) {
        contrName = contrName.replace('Zbiorcza sprzedaż za ', 'Suma: ').replace('Zbiorcza sprzedaż ', 'Suma: ');
      }
      revenueContractors[contrName] = (revenueContractors[contrName] || 0) + s.netto;
      totalRevenueForShare += s.netto;
    }
  });

  const revenueContractorsArray = Object.keys(revenueContractors).map((key) => ({
    name: key,
    value: revenueContractors[key],
    share: totalRevenueForShare > 0 ? (revenueContractors[key] / totalRevenueForShare) * 100 : 0,
  })).sort((a, b) => b.value - a.value);

  // 1. Calculate Monthly values of Sales & Purchases to analyze seasonality
  const monthlyRevenues = Array(12).fill(0);
  const monthlyCosts = Array(12).fill(0);
  const monthlyKUPSum = Array(12).fill(0);

  sales.forEach((s) => {
    if (s.czyCIT) {
      const monthStr = s.data.split('-')[1];
      const monthIdx = monthStr ? parseInt(monthStr, 10) - 1 : 0;
      if (monthIdx >= 0 && monthIdx < 12) {
        monthlyRevenues[monthIdx] += s.netto;
      }
    }
  });

  purchases.forEach((p) => {
    const monthStr = p.data.split('-')[1];
    const monthIdx = monthStr ? parseInt(monthStr, 10) - 1 : 0;
    if (monthIdx >= 0 && monthIdx < 12) {
      monthlyCosts[monthIdx] += p.netto;
      const kupValue = calculatePurchaseKUP(p);
      monthlyKUPSum[monthIdx] += kupValue;
    }
  });

  // Calculate standard deviation / variation of sales to show lumpy spikes
  let totalRecurrentRevenues = 0;
  let totalSpikyRevenues = 0;

  sales.forEach(s => {
    if (s.czyCIT) {
      // If single invoice is >= 25 050 PLN or contains project keywords, we consider it a large "lumpy" spike
      if (s.netto >= 25000 || s.kontrahent.toLowerCase().includes('projekt') || s.kontrahent.toLowerCase().includes('wdrożenie') || s.kontrahent.toLowerCase().includes('jednorazowa')) {
        totalSpikyRevenues += s.netto;
      } else {
        totalRecurrentRevenues += s.netto;
      }
    }
  });

  // Group costs by behaviour
  let totalFixedCosts = 0;
  let totalVariableCosts = 0;

  purchases.forEach(p => {
    if (p.kosztCIT) {
      const isFixedCategory = ['biuro', 'księg', 'telefon', 'internet', 'saas', 'subskr', 'licencj', 'lokal', 'czynsz'].some(word => p.kategoria.toLowerCase().includes(word));
      const kupValue = calculatePurchaseKUP(p);

      // If recurring cost or small recurring items
      if (isFixedCategory || p.netto < 3500) {
        totalFixedCosts += kupValue;
      } else {
        totalVariableCosts += kupValue;
      }
    }
  });

  // Count months list with costs to get average monthly baseline
  const uniqueMonthsWithCosts = new Set(purchases.filter(p => p.kosztCIT).map(p => p.data.split('-')[1])).size || 1;
  const avgMonthlyFixedCostValue = totalFixedCosts / uniqueMonthsWithCosts;

  // Identify preventable/unnecessary CIT advance payments
  const preventableCitPayments: { month: number; paid: number; rev: number; kup: number; advice: string }[] = [];
  
  citAdvances.forEach((adv) => {
    const mIdx = adv.miesiac - 1;
    const revThisMonth = monthlyRevenues[mIdx] || 0;
    const kupThisMonth = monthlyKUPSum[mIdx] || 0;
    const profitThisMonth = revThisMonth - kupThisMonth;

    // Trigger criteria: paid > 0, and monthly revenue is twice higher than avg monthly fixed cost, indicating a spike!
    if (adv.kwota > 0 && revThisMonth > avgMonthlyFixedCostValue * 1.8 && profitThisMonth > 15000) {
      preventableCitPayments.push({
        month: adv.miesiac,
        paid: adv.kwota,
        rev: revThisMonth,
        kup: kupThisMonth,
        advice: `W miesiącu ${adv.miesiac} zapłaciłeś/aś zaliczkę CIT w kwocie ${adv.kwota} zł przy wysokim piku przychodowym i niskich kosztach KUP. Można było tego w całości lub części uniknąć, przyspieszając planowane zakupy biurowe, opłacając z góry abonamenty/licencje lub dokonując amortyzacji jednorazowej w tym konkretnym miesiącu.`
      });
    }
  });

  // Corporate Tax Optimization Indicator (9% vs 19% CIT based on 2M EUR Polish threshold)
  const EUR_LIMIT_PLN = 9200000; 
  const currentRatioToLimit = Math.min(100, (simulatedRevenueTotal / EUR_LIMIT_PLN) * 100);
  const isApproachingLimit = simulatedRevenueTotal > EUR_LIMIT_PLN * 0.75;

  // Formatting helper for currency
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
    
    let resultStr = `${grouped},${decimalPart}`;
    if (isNegative) {
      resultStr = '-' + resultStr;
    }
    return `${resultStr} zł`;
  };

  return (
    <div className="space-y-6" id="mckinsey-dashboard-pane">
      
      {/* 1. Executive Summary Alert Banner */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 relative overflow-hidden shadow-xl border border-slate-800" id="mck-exec-summary">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-550/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-indigo-500/20 text-indigo-300 px-3.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border border-indigo-500/30">
              <Sparkles className="w-3 h-3 text-indigo-300 animate-pulse" />
              Scenariusz: Zamknięcie Roku tax-today
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight font-display">
              Gdyby rok podatkowy {settings.rokPodatkowy} zakończył się dzisiaj...
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed font-sans">
              Zasymulowaliśmy bilans spółki przy założeniu <b>całkowitego wstrzymania operacji</b> od dnia dzisiejszego do końca 12-miesięcznego roku. To czysty, obiektywny rzut zysku, podatków i nadpłat na bazie zarejestrowanych danych YTD
              {activeFutureRevenues > 0 && (
                <span>, wpisanych planowanych przychodów (<span className="text-emerald-400 font-bold">+{formatPLN(activeFutureRevenues)}</span>)</span>
              )}
              {activeFutureExpensesKUP > 0 && (
                <span> oraz planowanych wydatków (<span className="text-indigo-300 font-bold">-{formatPLN(activeFutureExpensesKUP)}</span>)</span>
              )}
              .
            </p>

            {/* Real-time breakdown row in banner */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-3 border-t border-slate-800 text-[11px] text-slate-400 font-sans">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                Suma Przychodów YTD: <strong className="text-slate-200">{formatPLN(actualRevenueYTD)}</strong>
              </span>
              {activeFutureRevenues > 0 && (
                <span className="flex items-center gap-1 bg-emerald-500/20 border border-emerald-500/35 px-2 py-0.5 rounded-md text-emerald-300">
                  <Sparkles className="w-3 h-3 text-emerald-300 animate-pulse" />
                  Planowane Przychody: <strong className="text-white">{formatPLN(activeFutureRevenues)}</strong>
                </span>
              )}
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                Baza KUP YTD: <strong className="text-slate-200">{formatPLN(actualKupYTD)}</strong>
              </span>
              {activeFutureExpensesKUP > 0 && (
                <span className="flex items-center gap-1 bg-indigo-500/25 border border-indigo-500/40 px-2 py-0.5 rounded-md text-slate-300">
                  <Sparkles className="w-3 h-3 text-indigo-300 animate-pulse" />
                  Planowane Wydatki: <strong className="text-white">{formatPLN(activeFutureExpensesKUP)}</strong>
                </span>
              )}
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Roczny CIT: <strong className="text-emerald-400 font-bold">{formatPLN(actualCitTotalWithPlanned)}</strong>
              </span>
            </div>
          </div>
          <div className="flex gap-4 shrink-0">
            <div className="bg-slate-800/80 border border-slate-700/50 p-4 rounded-2xl min-w-[140px] text-center">
              <div className="text-[10px] uppercase text-slate-400 font-bold tracking-widest font-display">Zysk Po Podatkach</div>
              <div className="text-xl font-black font-mono mt-1 text-emerald-400">
                {formatPLN(actualNetProfitWithPlanned)}
              </div>
              <div className="text-[10px] text-slate-400 mt-1 font-mono">Realna rentowność: {actualRevenueWithPlanned > 0 ? (((actualNetProfitWithPlanned)/actualRevenueWithPlanned)*100).toFixed(1) : '0.0'}%</div>
            </div>
            <div className="bg-slate-800/80 border border-slate-700/50 p-4 rounded-2xl min-w-[140px] text-center">
              <div className="text-[10px] uppercase text-slate-400 font-bold tracking-widest font-display">Status Krajowy CIT</div>
              {isEligibleForRefundWithPlanned ? (
                <>
                  <div className="text-xl font-black font-mono mt-1 text-indigo-400">
                    +{formatPLN(potentialRefundAmountWithPlanned)}
                  </div>
                  <div className="text-[10px] text-indigo-300 mt-1 font-bold uppercase">Zwrot nadpłaty w CIT-8</div>
                </>
              ) : (
                <>
                  <div className="text-xl font-black font-mono mt-1 text-amber-400">
                    {formatPLN(finalYearClosingTaxPayableWithPlanned)}
                  </div>
                  <div className="text-[10px] text-amber-300 mt-1 font-bold uppercase">Dopłata na koniec roku</div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Double-Column Corporate Model */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="mck-corporate-columns">
        
        {/* LEFT COLUMN: Waterfall Breakdown & Optimization Dashboard */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 p-6 space-y-6 shadow-xs">
          
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest font-display flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-500 animate-pulse" />
                Symulacyjny Bilans Zamknięcia Roku
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Analiza finansowo-podatkowa krok po kroku (McKinsey Waterfall)</p>
            </div>
          </div>

          {/* McKinsey Clean Financial Flow Table */}
          <div className="space-y-2" id="waterfall-table">
            
            {/* Row 1: Revenues */}
            <div className="flex justify-between items-center p-3 hover:bg-slate-50 rounded-xl transition-colors">
              <div>
                <span className="text-xs font-bold text-slate-800 block font-display">A. Przychód Netto Spółki (Baza YTD + Prognoza)</span>
                <span className="text-[10px] text-slate-400 font-mono">Sprzedaż zaksięgowana z faktur + suwak symulatora</span>
              </div>
              <div className="text-right font-mono">
                <span className="text-xs font-bold text-slate-900">{formatPLN(simulatedRevenueBase)}</span>
              </div>
            </div>

            {/* Row 1b: Active Future Revenues (Przychody ze Słownika) */}
            <div className="flex justify-between items-center p-3 bg-emerald-50/35 border border-emerald-100/50 hover:bg-emerald-50/45 rounded-xl transition-colors my-1.5 font-sans">
              <div className="flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5 animate-pulse" />
                <div className="space-y-0.5 text-left">
                  <span className="text-xs font-bold text-emerald-950 block font-display flex items-center gap-1.5">
                    A2. Zakładane Przyszłe Przychody (Wpisy ze słownika)
                    <span className="text-[9px] bg-emerald-100 text-emerald-850 text-emerald-700 font-bold px-1.5 py-0.5 rounded-full uppercase font-mono tracking-wider scale-90">
                      Aktywne Przychody
                    </span>
                  </span>
                  <span className="text-[10px] text-slate-500 block leading-tight">Zaznaczone pozycje robocze na liście planowanych przychodów</span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="text-xs font-black font-mono text-emerald-600">+{formatPLN(activeFutureRevenues)}</span>
              </div>
            </div>

            {/* Row 2: Costs KUP */}
            <div className="flex justify-between items-center p-3 hover:bg-slate-50 rounded-xl transition-colors">
              <div>
                <span className="text-xs font-bold text-slate-800 block font-display">B. Koszty Kwalifikowane KUP (Baza YTD + Prognoza)</span>
                <span className="text-[10px] text-slate-400 font-mono">Bieżące koszty z ksiąg + prognoza ze slidera</span>
              </div>
              <div className="text-right font-mono">
                <span className="text-xs font-bold text-rose-600">-{formatPLN(simulatedKupBase)}</span>
                <span className="text-[10px] text-slate-400 block font-sans">({simulatedRevenueTotal > 0 ? ((simulatedKupBase / simulatedRevenueTotal)*100).toFixed(1) : '0.0'}% przychodu)</span>
              </div>
            </div>

            {/* Row 2b: Active Future Expenses (Inwestycje Robocze) */}
            <div className="flex justify-between items-center p-3 bg-indigo-50/30 border border-indigo-100/50 hover:bg-indigo-50/45 rounded-xl transition-colors my-1.5 font-sans">
              <div className="flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5 animate-pulse" />
                <div className="space-y-0.5 text-left">
                  <span className="text-xs font-bold text-indigo-950 block font-display flex items-center gap-1.5">
                    B2. Zakładane Przyszłe Wydatki (Wpisy ze słownika)
                    <span className="text-[9px] bg-indigo-100 text-indigo-700 font-bold px-1.5 py-0.5 rounded-full uppercase font-mono tracking-wider scale-90">
                      Aktywne KUP
                    </span>
                  </span>
                  <span className="text-[10px] text-slate-500 block leading-tight">Zaznaczone pozycje robocze na liście planowanych wydatków</span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="text-xs font-black font-mono text-indigo-600">-{formatPLN(activeFutureExpensesKUP)}</span>
              </div>
            </div>

            {/* Row 3: EBT (Operating Profit) */}
            <div className="flex justify-between items-center p-3 bg-slate-50/55 rounded-xl border border-slate-100 my-1 font-bold">
              <div>
                <span className="text-xs font-bold text-slate-900 block font-display">C. Podstawa Opodatkowania CIT (EBT)</span>
                <span className="text-[10px] text-slate-400 font-medium">Zysk podlegający opodatkowaniu (A + A2 - B - B2)</span>
              </div>
              <div className="text-right font-mono">
                <span className="text-xs font-bold text-slate-900">{formatPLN(simulatedIncomeTotal)}</span>
              </div>
            </div>

            {/* Row 4: Tax rate and CIT computed */}
            <div className="flex justify-between items-center p-3 hover:bg-slate-50 rounded-xl transition-colors">
              <div>
                <span className="text-xs font-bold text-slate-85 block font-display">D. Wyliczony Podatek CIT za cały Rok</span>
                <span className="text-[10px] text-slate-400 font-mono">Obliczony stawką {settings.stawkaCIT}% CIT dla spółki</span>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold font-mono text-slate-900 text-rose-600">-{formatPLN(simulatedCitTotal)}</span>
              </div>
            </div>

            {/* Row 5: Paid Advances to be deducted */}
            <div className="flex justify-between items-center p-3 hover:bg-slate-50 rounded-xl transition-colors border-b border-slate-100">
              <div>
                <span className="text-xs font-bold text-slate-85 block font-display">E. Zaliczki Odprowadzone w ciągu Roku</span>
                <span className="text-[10px] text-slate-400 font-mono">Suma wpłat CIT zadeklarowana we wszystkich miesiącach</span>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold font-mono text-emerald-600">+{formatPLN(totalPaidAdvancesYTD)}</span>
              </div>
            </div>

            {/* Row 6: Final close result */}
            <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4">
              <div>
                <h4 className="text-xs font-black text-indigo-950 uppercase tracking-wider font-display">F. Ostateczny Rozrachunek z US (CIT-8)</h4>
                <p className="text-[10px] text-indigo-700 font-medium mt-0.5">Różnica między rocznym CIT a sumą zaliczek (D - E)</p>
              </div>
              <div className="text-right">
                {simulatedIsEligibleForRefund ? (
                  <div className="space-y-0.5">
                    <span className="text-[9px] bg-emerald-100 border border-emerald-200 text-emerald-800 font-black px-2 py-0.5 rounded-full uppercase leading-none inline-block">Nadpłata CIT do Zwrotu</span>
                    <div className="text-xl font-black font-mono text-emerald-600">{formatPLN(simulatedRefundAmount)}</div>
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    <span className="text-[9px] bg-amber-100 border border-amber-200 text-amber-800 font-black px-2 py-0.5 rounded-full uppercase leading-none inline-block">Dopłata do przelewu</span>
                    <div className="text-xl font-black font-mono text-amber-750 text-amber-700">{formatPLN(simulatedTaxPayable)}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Row 7: Ultimate net earnings */}
            <div className="flex justify-between items-center p-4 pt-5 border-t border-slate-100 mt-2 font-black text-slate-950">
              <span className="font-display text-xs">CZYSTY ZYSK NETTO SPÓŁKI (EAT):</span>
              <span className="font-mono text-2xl text-indigo-600 font-black">{formatPLN(simulatedNetProfit)}</span>
            </div>

          </div>

          {/* Interactive McKinsey Strategic Scenario Controls */}
          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-150 space-y-4" id="simulated-future-sliders">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
              Interaktywny Symulator Strategiczny (What-If)
            </div>
            
            <p className="text-[11px] text-slate-500 leading-normal">
              Zarówno dochód, jak i stawki podatkowe rozliczane są <b>kumulatywnie (YTD)</b>. Zwiększ przyszłe przychody lub dodaj planowane zakupy pod koniec roku, aby zobaczyć, jak zmieni się Twój zwrot roczny.
            </p>

            <div className="space-y-4 pt-1">
              {/* Slider 1: Sales */}
              <div className="space-y-1.5 p-3.5 bg-white border border-slate-200 rounded-2xl shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-slate-700 font-bold text-xs font-display">Prognozowana DALSZA Sprzedaż (netto):</span>
                  <div className="flex items-center gap-1.5 self-end sm:self-auto">
                    <span className="text-[10px] text-slate-400 font-bold font-sans">ZAPISZ / WPISZ KWOTĘ:</span>
                    <div className="relative">
                      <input 
                        type="number"
                        min="0"
                        value={simulatedFutureSales || 0}
                        onChange={(e) => setSimulatedFutureSales(Math.max(0, Number(e.target.value)))}
                        className="w-28 text-right font-bold font-mono text-xs border border-indigo-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden bg-white rounded-lg pl-2 pr-8 py-1.5 text-indigo-700"
                        placeholder="0"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-indigo-600">PLN</span>
                    </div>
                  </div>
                </div>
                <input
                  type="range"
                  min="0"
                  max="500000"
                  step="5000"
                  value={Math.min(500000, simulatedFutureSales)}
                  onChange={(e) => setSimulatedFutureSales(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>0 zł</span>
                  <span>250 000 zł</span>
                  <span>500 050 zł+ (możesz wpisać wyższą powyżej)</span>
                </div>
              </div>

              {/* Slider 2: Costs */}
              <div className="space-y-1.5 p-3.5 bg-white border border-slate-200 rounded-2xl shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-slate-700 font-bold text-xs font-display">Prognozowane DALSZE Koszty (KUP):</span>
                  <div className="flex items-center gap-1.5 self-end sm:self-auto">
                    <span className="text-[10px] text-slate-400 font-bold font-sans">ZAPISZ / WPISZ KWOTĘ:</span>
                    <div className="relative">
                      <input 
                        type="number"
                        min="0"
                        value={simulatedFutureCosts || 0}
                        onChange={(e) => setSimulatedFutureCosts(Math.max(0, Number(e.target.value)))}
                        className="w-28 text-right font-bold font-mono text-xs border border-rose-200 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 focus:outline-hidden bg-white rounded-lg pl-2 pr-8 py-1.5 text-rose-700"
                        placeholder="0"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-rose-600">PLN</span>
                    </div>
                  </div>
                </div>
                <input
                  type="range"
                  min="0"
                  max="350000"
                  step="5000"
                  value={Math.min(350000, simulatedFutureCosts)}
                  onChange={(e) => setSimulatedFutureCosts(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-rose-500"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>0 zł</span>
                  <span>175 000 zł</span>
                  <span>350 000 zł+ (możesz wpisać wyższą powyżej)</span>
                </div>
              </div>
            </div>

            {/* Simulated Action reset */}
            {(simulatedFutureSales > 0 || simulatedFutureCosts > 0) && (
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setSimulatedFutureSales(0);
                    setSimulatedFutureCosts(0);
                  }}
                  className="text-[10px] font-bold text-indigo-700 hover:text-indigo-950 font-display select-none cursor-pointer"
                >
                  Resetuj parametry prognozy ↩
                </button>
              </div>
            )}
          </div>

          {/* 3. Strategic Planning Hub YTD (What-if) */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-xs" id="mck-strategic-planning-hub">
            <div className="border-b border-slate-100 pb-2">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest font-display flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-500 animate-pulse" />
                Planer Strategiczny (Pozycje Zakładane)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5 font-sans">
                Wpisz i zatwierdź oczekiwane wpływy lub planowane inwestycje. Zaznaczone pozycje są przeliczane w rocznym CIT.
              </p>
            </div>

            {/* Strategic Tabs Switcher */}
            <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
              <button
                type="button"
                onClick={() => setPlanningTab('expenses')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-black rounded-lg transition-all cursor-pointer ${
                  planningTab === 'expenses'
                    ? 'bg-white shadow-xs text-indigo-700 border border-indigo-100/50'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
                }`}
              >
                💸 Planowane Wydatki
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold font-mono ${
                  planningTab === 'expenses' ? 'bg-indigo-100 text-indigo-850' : 'bg-slate-200 text-slate-600'
                }`}>
                  {formatPLN(activeFutureExpensesKUP)}
                </span>
              </button>
              
              <button
                type="button"
                onClick={() => setPlanningTab('revenues')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-black rounded-lg transition-all cursor-pointer ${
                  planningTab === 'revenues'
                    ? 'bg-white shadow-xs text-emerald-700 border border-emerald-100/50'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
                }`}
              >
                📈 Planowane Przychody
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold font-mono ${
                  planningTab === 'revenues' ? 'bg-emerald-100 text-emerald-850' : 'bg-slate-200 text-slate-600'
                }`}>
                  +{formatPLN(activeFutureRevenues)}
                </span>
              </button>
            </div>

            {/* Render expenses content */}
            {planningTab === 'expenses' && (
              <div className="space-y-4" id="expenses-tab-content">
                {/* List of expenses */}
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1" id="future-expenses-list">
                  {futureExpenses.length === 0 ? (
                    <div className="text-center py-8 text-xs text-slate-400 border border-dashed border-slate-200 rounded-2xl font-medium">
                      Brak planowanych wydatków. Wpisz i dodaj pierwszy wydatek za pomocą formularza poniżej!
                    </div>
                  ) : (
                    futureExpenses.map((exp) => {
                      const taxSaving = Math.round(exp.netto * (settings.stawkaCIT / 100));
                      return (
                        <div 
                          key={exp.id} 
                          className={`flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-2xl border transition-all ${
                            exp.czyAktywny 
                              ? 'bg-indigo-50/20 border-indigo-100 shadow-xs' 
                              : 'bg-white border-slate-150 opacity-60 hover:opacity-95'
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            <input
                              type="checkbox"
                              checked={exp.czyAktywny}
                              onChange={() => handleToggleExpense(exp.id)}
                              className="w-4.5 h-4.5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 mt-1 cursor-pointer"
                              title="Włącz/wyłącz z symulacji rocznej"
                            />
                            <div className="space-y-0.5">
                              <span className="text-xs font-black text-slate-805 text-slate-800 block leading-tight font-display">
                                {exp.nazwa}
                              </span>
                              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                <span className="text-[9px] bg-slate-100 text-slate-500 font-bold px-1.5 py-0.5 rounded-sm uppercase">
                                  {exp.kategoria}
                                </span>
                                <span className="text-[9px] text-slate-400 font-mono">
                                  Miesiąc: {exp.miesiacPlanowany}
                                </span>
                                {/* Probability Badges */}
                                {exp.prawdopodobienstwo === 'wysokie' && (
                                  <span className="text-[9px] bg-emerald-50 text-emerald-800 border border-emerald-100/50 font-bold px-1.5 py-0.5 rounded-sm uppercase">
                                    Pewny (100%)
                                  </span>
                                )}
                                {exp.prawdopodobienstwo === 'średnie' && (
                                  <span className="text-[9px] bg-amber-50 text-amber-800 border border-amber-100/50 font-bold px-1.5 py-0.5 rounded-sm uppercase">
                                    Prawdopodobny
                                  </span>
                                )}
                                {exp.prawdopodobienstwo === 'niskie' && (
                                  <span className="text-[9px] bg-slate-50 text-slate-500 border border-slate-100 font-bold px-1.5 py-0.5 rounded-sm uppercase">
                                    Opcjonalny
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-3.5 mt-2.5 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 shrink-0">
                            <div className="text-right">
                              <div className="text-xs font-black text-slate-900 font-mono">
                                {formatPLN(exp.netto)}
                              </div>
                              <div className="text-[9px] text-emerald-600 font-bold font-mono">
                                Tarcza CIT: -{formatPLN(taxSaving)}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteExpense(exp.id)}
                              className="hover:bg-rose-50 text-slate-350 hover:text-rose-600 p-1.5 rounded-lg transition-colors cursor-pointer"
                              title="Usuń planowany wydatek"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Quick-Add Expense Form */}
                <form onSubmit={handleAddExpense} className="bg-slate-50/50 p-4 rounded-2xl border border-slate-200/60 space-y-3 mt-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block flex items-center gap-1">
                    <Plus className="w-3.5 h-3.5 text-indigo-500" />
                    Dodaj Nowy Planowany Wydatek (Roboczy)
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-450 text-slate-400 block uppercase font-sans">Nazwa Kosztu</label>
                      <input
                        type="text"
                        required
                        maxLength={50}
                        placeholder="np. SketchUp licencje 2026"
                        value={newExpName}
                        onChange={(e) => setNewExpName(e.target.value)}
                        className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white outline-indigo-500 text-slate-805 text-slate-800"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-450 text-slate-400 block uppercase font-sans">Kwota Netto (PLN)</label>
                      <input
                        type="number"
                        required
                        min="1"
                        placeholder="np. 1800"
                        value={newExpNetto}
                        onChange={(e) => setNewExpNetto(e.target.value)}
                        className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white outline-indigo-500 text-slate-805 text-slate-800 font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    <div className="space-y-1 font-sans">
                      <label className="text-[9px] font-bold text-slate-400 block uppercase">Prawdopodobieństwo</label>
                      <select
                        value={newExpProb}
                        onChange={(e) => setNewExpProb(e.target.value as any)}
                        className="w-full text-xs border border-slate-200 rounded-xl px-3 py-1.5 bg-white outline-indigo-500 text-slate-800"
                      >
                        <option value="wysokie">Pewny (wysokie)</option>
                        <option value="średnie">Prawdopodobny (średnie)</option>
                        <option value="niskie">Opcjonalny (niskie)</option>
                      </select>
                    </div>
                    <div className="space-y-1 font-sans">
                      <label className="text-[9px] font-bold text-slate-400 block uppercase">Kategoria KUP</label>
                      <select
                        value={newExpCategory}
                        onChange={(e) => setNewExpCategory(e.target.value)}
                        className="w-full text-xs border border-slate-200 rounded-xl px-3 py-1.5 bg-white outline-indigo-500 text-slate-800"
                      >
                        <option value="Oprogramowanie">Oprogramowanie</option>
                        <option value="SaaS">Usługi SaaS / Serwery</option>
                        <option value="Biuro">Koszty Biurowe</option>
                        <option value="Sprzęt komputerowy">Sprzęt komputerowy</option>
                        <option value="Reklama">Reklama / Marketing</option>
                        <option value="Inne">Inne ubezpieczenia / KUP</option>
                      </select>
                    </div>
                    <div className="space-y-1 font-sans">
                      <label className="text-[9px] font-bold text-slate-400 block uppercase font-sans">Planowany miesiąc</label>
                      <select
                        value={newExpMonth}
                        onChange={(e) => setNewExpMonth(parseInt(e.target.value, 10))}
                        className="w-full text-xs border border-slate-200 rounded-xl px-3 py-1.5 bg-white outline-indigo-500 text-slate-800"
                      >
                        {Array.from({ length: 12 }, (_, i) => (
                          <option key={i + 1} value={i + 1}>
                            {i + 1} ({new Date(2026, i, 1).toLocaleString('pl-PL', { month: 'short' })})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-2 border-t border-slate-200/50 gap-2">
                    <span className="text-[10px] text-slate-400 font-sans italic leading-normal">
                      *Aktywne pozycje podwyższają koszty i chronią zysk przed podatkiem CIT w sekcji finansowej powyżej.
                    </span>
                    <button
                      type="submit"
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs px-3.5 py-2 rounded-xl cursor-pointer transition-all flex items-center justify-center gap-1 shadow-sm active:scale-98 shrink-0 self-end sm:self-auto"
                    >
                      <Plus className="w-3.5 h-3.5" /> Dodaj wydatek
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Render revenues content */}
            {planningTab === 'revenues' && (
              <div className="space-y-4" id="revenues-tab-content">
                {/* List of revenues */}
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1" id="future-revenues-list">
                  {futureRevenues.length === 0 ? (
                    <div className="text-center py-8 text-xs text-slate-400 border border-dashed border-slate-200 rounded-2xl font-medium">
                      Brak planowanych przychodów. Wpisz i dodaj pierwszy przychód za pomocą formularza poniżej!
                    </div>
                  ) : (
                    futureRevenues.map((rev) => {
                      return (
                        <div 
                          key={rev.id} 
                          className={`flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-2xl border transition-all ${
                            rev.czyAktywny 
                              ? 'bg-emerald-50/20 border-emerald-100 shadow-xs' 
                              : 'bg-white border-slate-150 opacity-60 hover:opacity-95'
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            <input
                              type="checkbox"
                              checked={rev.czyAktywny}
                              onChange={() => handleToggleRevenue(rev.id)}
                              className="w-4.5 h-4.5 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500 mt-1 cursor-pointer"
                              title="Włącz/wyłącz z symulacji rocznej"
                            />
                            <div className="space-y-0.5">
                              <span className="text-xs font-black text-slate-800 block leading-tight font-display">
                                {rev.nazwa}
                              </span>
                              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                <span className="text-[9px] bg-slate-100 text-slate-500 font-bold px-1.5 py-0.5 rounded-sm uppercase">
                                  {rev.kategoria}
                                </span>
                                <span className="text-[9px] text-slate-400 font-mono">
                                  Miesiąc: {rev.miesiacPlanowany}
                                </span>
                                {/* Probability Badges */}
                                {rev.prawdopodobienstwo === 'wysokie' && (
                                  <span className="text-[9px] bg-emerald-50 text-emerald-800 border border-emerald-100/50 font-bold px-1.5 py-0.5 rounded-sm uppercase">
                                    Pewny (100%)
                                  </span>
                                )}
                                {rev.prawdopodobienstwo === 'średnie' && (
                                  <span className="text-[9px] bg-amber-50 text-amber-800 border border-amber-100/50 font-bold px-1.5 py-0.5 rounded-sm uppercase">
                                    Prawdopodobny
                                  </span>
                                )}
                                {rev.prawdopodobienstwo === 'niskie' && (
                                  <span className="text-[9px] bg-slate-50 text-slate-500 border border-slate-100 font-bold px-1.5 py-0.5 rounded-sm uppercase">
                                    Opcjonalny
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-3.5 mt-2.5 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 shrink-0">
                            <div className="text-right">
                              <div className="text-xs font-black text-emerald-600 font-mono">
                                +{formatPLN(rev.netto)}
                              </div>
                              <div className="text-[9px] text-slate-500 font-semibold font-mono">
                                Planowany wpływ
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteRevenue(rev.id)}
                              className="hover:bg-rose-50 text-slate-350 hover:text-rose-600 p-1.5 rounded-lg transition-colors cursor-pointer"
                              title="Usuń planowany przychód"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Quick-Add Revenue Form */}
                <form onSubmit={handleAddRevenue} className="bg-slate-50/50 p-4 rounded-2xl border border-slate-200/60 space-y-3 mt-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block flex items-center gap-1">
                    <Plus className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                    Dodaj Nowy Planowany Przychód (Roboczy)
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 block uppercase font-sans">Nazwa Przychodu</label>
                      <input
                        type="text"
                        required
                        maxLength={50}
                        placeholder="np. Wdrożenie systemu CRM klastra"
                        value={newRevName}
                        onChange={(e) => setNewRevName(e.target.value)}
                        className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white outline-emerald-500 text-slate-85 text-slate-800"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 block uppercase font-sans">Kwota Netto (PLN)</label>
                      <input
                        type="number"
                        required
                        min="1"
                        placeholder="np. 25000"
                        value={newRevNetto}
                        onChange={(e) => setNewRevNetto(e.target.value)}
                        className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white outline-emerald-500 text-slate-85 text-slate-800 font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    <div className="space-y-1 font-sans">
                      <label className="text-[9px] font-bold text-slate-400 block uppercase">Prawdopodobieństwo</label>
                      <select
                        value={newRevProb}
                        onChange={(e) => setNewRevProb(e.target.value as any)}
                        className="w-full text-xs border border-slate-200 rounded-xl px-3 py-1.5 bg-white outline-emerald-500 text-slate-800"
                      >
                        <option value="wysokie">Pewny (wysokie)</option>
                        <option value="średnie">Prawdopodobny (średnie)</option>
                        <option value="niskie">Opcjonalny (niskie)</option>
                      </select>
                    </div>
                    <div className="space-y-1 font-sans">
                      <label className="text-[9px] font-bold text-slate-400 block uppercase">Kategoria</label>
                      <select
                        value={newRevCategory}
                        onChange={(e) => setNewRevCategory(e.target.value)}
                        className="w-full text-xs border border-slate-200 rounded-xl px-3 py-1.5 bg-white outline-emerald-500 text-slate-800"
                      >
                        <option value="Projekt">Projekt / Wdrożenie</option>
                        <option value="SaaS / Stałe">SaaS / Stały abonament</option>
                        <option value="Doradztwo">Doradztwo / Usługi</option>
                        <option value="Szkolenie">Szkolenie / Wsparcie</option>
                        <option value="Inne font-sans">Inne źródło</option>
                      </select>
                    </div>
                    <div className="space-y-1 font-sans">
                      <label className="text-[9px] font-bold text-slate-400 block uppercase font-sans">Planowany miesiąc</label>
                      <select
                        value={newRevMonth}
                        onChange={(e) => setNewRevMonth(parseInt(e.target.value, 10))}
                        className="w-full text-xs border border-slate-200 rounded-xl px-3 py-1.5 bg-white outline-emerald-500 text-slate-800"
                      >
                        {Array.from({ length: 12 }, (_, i) => (
                          <option key={i + 1} value={i + 1}>
                            {i + 1} ({new Date(2026, i, 1).toLocaleString('pl-PL', { month: 'short' })})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-2 border-t border-slate-200/50 gap-2">
                    <span className="text-[10px] text-slate-450 text-slate-400 font-sans italic leading-normal">
                      *Zaznaczone przychody podwyższają prognozowany wynik roczny oraz zysk netto po podatkach.
                    </span>
                    <button
                      type="submit"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs px-3.5 py-2 rounded-xl cursor-pointer transition-all flex items-center justify-center gap-1 shadow-sm active:scale-98 shrink-0 self-end sm:self-auto"
                    >
                      <Plus className="w-3.5 h-3.5" /> Dodaj przychód
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Cost Structure, Corporate Visuals & Expert Insights */}
        <div className="lg:col-span-5 space-y-6 flex flex-col">
          
          {/* Bento Block A: Real-Time Revenue Structure matrix with Smart Grouping */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-xs" id="revenue-matrix-panel">
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest font-display flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  Struktura i Model Przychodów YTD
                </h3>
                <span className="text-[10px] bg-emerald-50 text-emerald-800 px-2.5 py-0.5 rounded-full font-bold font-mono flex items-center gap-1 select-none border border-emerald-100/50">
                  <Sparkles className="w-3 h-3 text-emerald-650 text-emerald-550 animate-pulse" />
                  Smart Audit
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Analiza cykliczności i wpływu dużych faktur na gotówkę</p>
            </div>

            {/* Smart Grouped Metrics */}
            <div className="grid grid-cols-2 gap-3" id="revenue-behavior-groups">
              <div className="bg-emerald-50/50 rounded-2xl p-3 border border-emerald-100/60">
                <span className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider block">Cykliczne (Regularne)</span>
                <span className="text-sm font-black text-slate-900 font-mono block mt-1">
                  {formatPLN(totalRecurrentRevenues)}
                </span>
                <span className="text-[9px] text-slate-400 font-medium font-sans">Stały dochód bazowy</span>
              </div>
              <div className="bg-indigo-50/50 rounded-2xl p-3 border border-indigo-100/65">
                <span className="text-[10px] text-indigo-800 font-bold uppercase tracking-wider block">Skokowe (Projektowe)</span>
                <span className="text-sm font-black text-indigo-600 font-mono block mt-1">
                  {formatPLN(totalSpikyRevenues)}
                </span>
                <span className="text-[9px] text-slate-400 font-medium font-sans">Nieregularne piki</span>
              </div>
            </div>

            {/* Visual Bar of Group Percentage */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Podział wolumenu przychodów</span>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex border border-slate-200">
                {totalRevenueForShare > 0 ? (
                  <>
                    <div 
                      className="bg-emerald-500 h-full transition-all"
                      style={{ width: `${(totalRecurrentRevenues / totalRevenueForShare) * 100}%` }}
                    />
                    <div 
                      className="bg-indigo-500 h-full transition-all"
                      style={{ width: `${(totalSpikyRevenues / totalRevenueForShare) * 100}%` }}
                    />
                  </>
                ) : (
                  <div className="bg-slate-200 w-full h-full" />
                )}
              </div>
              <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Cykliczne ({totalRevenueForShare > 0 ? ((totalRecurrentRevenues / totalRevenueForShare) * 100).toFixed(0) : 0}%)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-indigo-500" />
                  Skokowe/Spora klisza ({totalRevenueForShare > 0 ? ((totalSpikyRevenues / totalRevenueForShare) * 100).toFixed(0) : 0}%)
                </span>
              </div>
            </div>

            {/* Smart insights on revenue pattern */}
            <div className="text-[11px] bg-slate-50 border border-slate-150 p-3 rounded-2xl space-y-1.5 text-slate-600 leading-relaxed font-sans">
              <div className="font-bold text-slate-800 flex items-center gap-1">
                <span>🎯</span> Wnioski płynnościowe:
              </div>
              {totalSpikyRevenues > totalRecurrentRevenues ? (
                <p>
                  <b>Słuchaj!</b> Twoje przychody mają model głównie <b>skokowy</b>. Duże faktury wpadają rzadziej (np. jako spore piki co 3 miesiące). Taki model utrudnia płynne opłacanie zaliczek CIT, bo zyskowne miesiące generują nagłe i wysokie podatki dochodowe, podczas gdy koszty lecą stale.
                </p>
              ) : (
                <p>
                  Twoje przychody opierają się głównie na <b>stałych, cyklicznych fakturach</b>. To ułatwia prognozowanie płynności i planowanie podatku w przeciwieństwie do spółek ze skokowym fakturowaniem.
                </p>
              )}
            </div>

            {/* Contractor list inside smaller accordion/list */}
            <div className="space-y-2 pt-1 border-t border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Odbiorcy YTD (Koncentracja)</span>
              <div className="max-h-[140px] overflow-y-auto space-y-2 pr-1" id="revenue-contractor-bars">
                {revenueContractorsArray.length === 0 ? (
                  <div className="text-center py-4 text-xs text-slate-400 font-medium">
                    Brak zarejestrowanych przychodów.
                  </div>
                ) : (
                  revenueContractorsArray.map((contr) => (
                    <div key={contr.name} className="flex justify-between items-center text-xs p-1.5 hover:bg-slate-50 rounded-lg">
                      <span className="font-medium text-slate-700 truncate max-w-[160px]">{contr.name}</span>
                      <span className="font-mono text-slate-600 font-bold">{formatPLN(contr.value)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Bento Block B: Real-Time Cost Structure with Smart Grouping */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-xs" id="cost-matrix-panel">
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest font-display flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-500 animate-pulse" />
                  Struktura i Model Kosztów YTD
                </h3>
                <span className="text-[10px] bg-indigo-50 text-indigo-800 px-2.5 py-0.5 rounded-full font-bold font-mono flex items-center gap-1 select-none border border-indigo-100/50">
                  <Sparkles className="w-3 h-3 text-indigo-500 animate-pulse" />
                  Smart Audit
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Stałe koszty operacyjne spółki vs jednorazowe inwestycje KUP</p>
            </div>

            {/* Smart Grouped Metrics */}
            <div className="grid grid-cols-2 gap-3" id="cost-behavior-groups">
              <div className="bg-slate-50 border border-slate-150 rounded-2xl p-3">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Koszty Stałe (Stała Baza)</span>
                <span className="text-sm font-black text-slate-900 font-mono block mt-1">
                  {formatPLN(totalFixedCosts)}
                </span>
                <span className="text-[9px] text-slate-400 font-medium font-sans">Śr: ~{formatPLN(avgMonthlyFixedCostValue)}/mc</span>
              </div>
              <div className="bg-rose-50/40 border border-rose-100 rounded-2xl p-3">
                <span className="text-[10px] text-rose-800 font-bold uppercase tracking-wider block">Jednorazowe / Zmienne</span>
                <span className="text-sm font-black text-rose-650 text-rose-600 font-mono block mt-1">
                  {formatPLN(totalVariableCosts)}
                </span>
                <span className="text-[9px] text-slate-400 font-medium font-sans">Zakupy ad-hoc i sprzęt</span>
              </div>
            </div>

            {/* Smart Dynamic Insight on costs stability */}
            <div className="text-[11px] bg-slate-50 border border-slate-150 p-3 rounded-2xl space-y-1.5 text-slate-600 leading-relaxed font-sans">
              <div className="font-bold text-slate-800 flex items-center gap-1">
                <span>📊</span> Wnioski kosztowe:
              </div>
              <p>
                Twoje koszty stałe (biuro, księgowość, opłaty abonamentowe) działają na poziomie <b>{formatPLN(avgMonthlyFixedCostValue)}</b> miesięcznie. Ponieważ ta baza kosztowa jest stabilna, optymalnym podejściem pod CIT jest dopasowywanie pory większych jednorazowych zakupów do miesięcy, w których fakturowana jest wysoka sprzedaż.
              </p>
            </div>

            {/* Category list inside smaller list */}
            <div className="space-y-2 pt-1 border-t border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Kategorie Kosztów KUP (Szczegóły)</span>
              <div className="max-h-[140px] overflow-y-auto space-y-2 pr-1" id="cost-category-bars">
                {costCategoryArray.length === 0 ? (
                  <div className="text-center py-4 text-xs text-slate-400 font-medium">
                    Brak zakwalifikowanych kosztów.
                  </div>
                ) : (
                  costCategoryArray.map((category) => (
                    <div key={category.name} className="flex justify-between items-center text-xs p-1.5 hover:bg-slate-50 rounded-lg">
                      <span className="font-medium text-slate-700 truncate max-w-[160px]">
                        {category.name === 'Agregacja' ? 'Agregacja Styczeń - Kwiecień' : category.name}
                      </span>
                      <span className="font-mono text-slate-600 font-semibold">
                        {formatPLN(category.value)} <span className="text-[10px] text-slate-400">({category.share.toFixed(0)}%)</span>
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Strategic Suggestion Block: Limit 2M EUR for preferencial 9% CIT rate */}
          <div className="bg-slate-50 rounded-3xl border border-slate-200 p-6 space-y-4 shadow-xs border-indigo-150" id="regulatory-threshold-card">
            <div className="flex justify-between items-start gap-2">
              <div>
                <h4 className="text-xs font-black text-slate-905 text-slate-900 uppercase tracking-widest font-display flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
                  Górny Limit 9% CIT (2 mln EUR)
                </h4>
                <p className="text-[10px] text-slate-400 mt-0.5">Weryfikacja statusu Małego Podatnika</p>
              </div>
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase shrink-0 border ${
                simulatedRevenueTotal > EUR_LIMIT_PLN 
                  ? 'bg-rose-100 border-rose-200 text-rose-800'
                  : isApproachingLimit
                    ? 'bg-amber-100 border-amber-200 text-amber-800'
                    : 'bg-emerald-100 border-emerald-200 text-emerald-800'
              }`}>
                {simulatedRevenueTotal > EUR_LIMIT_PLN ? 'Przekroczony' : isApproachingLimit ? 'Faza Ryzyka' : 'Bezpieczny'}
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px] font-mono font-medium text-slate-600">
                <span>Roczny Przychód: {formatPLN(simulatedRevenueTotal)}</span>
                <span>Limit: ~9.2M PLN</span>
              </div>
              {/* Progress bar to limit */}
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden border border-slate-200">
                <div 
                  className={`h-full rounded-full transition-all duration-550 ${
                    simulatedRevenueTotal > EUR_LIMIT_PLN 
                      ? 'bg-rose-600'
                      : isApproachingLimit
                        ? 'bg-amber-500'
                        : 'bg-indigo-600'
                  }`}
                  style={{ width: `${currentRatioToLimit}%` }}
                />
              </div>
              <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                <span>0% limitu</span>
                <span>Wykorzystanie: {currentRatioToLimit.toFixed(1)}%</span>
                <span>100% (2M EUR)</span>
              </div>
            </div>

            <p className="text-[10px] text-slate-500 leading-relaxed font-sans">
              {simulatedRevenueTotal > EUR_LIMIT_PLN ? (
                <span className="text-rose-700 font-bold">⚠️ Spółka przekroczyła próg Małego Podatnika. Obowiązuje stawka 19% CIT.</span>
              ) : isApproachingLimit ? (
                <span className="text-amber-850 font-medium">⚡ Przychody zbliżają się do 2 mln EUR. Kontroluj fakturowanie, aby zachować 9% CIT.</span>
              ) : (
                <span className="text-slate-650">✅ Przychody spółki są bezpiecznie poniżej limitu. Przysługuje pełne prawo do obniżonej stawki 9% CIT.</span>
              )}
            </p>
          </div>

          {/* Expert Advisor Panel: Liquidity Leak & Unnecessary CIT Paid Analysis */}
          <div className="bg-indigo-50/60 border border-indigo-150 rounded-3xl p-6 space-y-4 shadow-xs relative overflow-hidden" id="expert-advisor-panel">
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-150 border border-indigo-200 text-indigo-700 font-bold flex items-center justify-center text-xs shadow-sm shrink-0">
                <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-905 text-slate-900 uppercase tracking-wider font-display animate-none flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
                  Audyt Płynności: Niepotrzebnie Zamrożony CIT
                </h4>
                <p className="text-[10px] text-slate-400">Prawda o zaliczkach odprowadzanych w locie YTD</p>
              </div>
            </div>

            <div className="text-xs text-slate-700 space-y-3 leading-relaxed font-sans mt-2">
              
              {preventableCitPayments.length > 0 ? (
                <>
                  <p className="font-bold text-rose-700">
                    ⚠️ Wykryliśmy okresy nieefektywnego obciążenia podatkowego spółki:
                  </p>
                  <div className="space-y-3">
                    {preventableCitPayments.map((p, idx) => (
                      <div key={idx} className="bg-white border border-rose-100 p-3.5 rounded-2xl relative space-y-2 font-sans text-xs text-slate-600 shadow-sm shadow-rose-100/45">
                        <div className="flex items-center gap-1.5 font-bold text-slate-800">
                          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                          Miesiąc {p.month}: Zamrożono {formatPLN(p.paid)}
                        </div>
                        <p className="text-[11px] leading-relaxed text-slate-600">
                          {p.advice}
                        </p>
                        <div className="text-[9px] bg-rose-50 text-rose-800 px-2 py-1 rounded inline-block font-mono font-bold border border-rose-100/50">
                          💡 Sugerowana oszczędność płynności: ok. {formatPLN(p.paid * 0.5)} gotówki na lokacie!
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="bg-white border border-slate-150 p-3.5 rounded-2xl relative space-y-2 font-mono text-[9px] text-slate-600 tracking-tight">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    Wzorowa tarcza płynnościowa (Cashflow Shield)
                  </div>
                  <p className="text-[11px] text-slate-600 leading-normal">
                    W bazie danych nie znaleziono prapłat CIT odprowadzonych bez sensu! Twoje koszty stałe i ruchome pokrywają piki z dużą precyzją, eliminując zatory płatnicze w Urzędzie Skarbowym. Dobra robota.
                  </p>
                </div>
              )}

              <p className="text-[11px] text-slate-500 italic mt-2 leading-normal">
                <b>Złota zasada finansów spółki z o.o.:</b> Polskie zaliczki płatne w locie zamrażają kapitał w Urzędzie aż do deklaracji CIT-8 w kolejnym roku. Każde przesunięcie kosztu na miesiąc piku fakturowania bezpośrednio chroni Twoją płynność gotówkową spółki.
              </p>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
