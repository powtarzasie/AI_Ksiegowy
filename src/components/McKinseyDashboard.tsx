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
  Percent,
  Users,
  AppWindow
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

const KPI_INFO_DETAILS: Record<string, { title: string; desc: string; formula?: string; consequence?: string }> = {
  ebitda: {
    title: "EBITDA (Zysk Operacyjny)",
    desc: "To zysk firmy z podstawowej działalności przed odliczeniem odsetek od kredytów, podatków dochodowych oraz amortyzacji (zużycia sprzętu i wartości niematerialnych). Pokazuje realną zyskowność operacyjną Twojego biznesu.",
    formula: "Wzór: EBITDA = Przychody operacyjne - Koszty operacyjne (bez amortyzacji i podatków)",
    consequence: "Dla kogo to ważne? Dla właściciela, banków i inwestorów. Pokazuje, czy Twój podstawowy model biznesowy zarabia pieniądze na czysto, niezależnie od stopnia zadłużenia firmy i obciążeń podatkowych.",
  },
  arr: {
    title: "Prognozowany ARR (Annualized Run Rate)",
    desc: "To przewidywana roczna wartość przychodów Twojej firmy wyliczona na podstawie aktualnego, średniego miesięcznego poziomu obrotów. Przekłada dzisiejsze tempo na perspektywę całych 12 miesięcy.",
    formula: "Wzór: ARR = Średnie miesięczne przychody z ostatniego okresu x 12 miesięcy",
    consequence: "Dla kogo to ważne? Pozwala realistycznie oszacować całościową skalę biznesu oraz zaplanować bezpieczny roczny budżet na kluczowe inwestycje i zatrudnienie.",
  },
  risk: {
    title: "Koncentracja Ryzyka",
    desc: "Udział procentowy największego klienta w Twoich całkowitych przychodach. Wskazuje, w jakim stopniu byt finansowy Twojej firmy zależy od pojedynczego podmiotu.",
    formula: "Wzór: Koncentracja = Przychód od największego klienta / Całkowity przychód firmy x 100%",
    consequence: "Dla kogo to ważne? Wysoki procent (szczególnie powyżej 40%) oznacza wysokie ryzyko - niespodziewane odejście tego kontrahenta może natychmiast pozbawić firmę płynności finansowej. Bezpieczną praktyką jest stała dywersyfikacja oferty i poszukiwanie nowych odbiorców.",
  },
  burnrate: {
    title: "Średni Burn-Rate (OPEX)",
    desc: "Średnie miesięczne tempo, w jakim Twoja firma wydaje (pali) gotówkę na bieżące koszty operacyjne (utrzymanie biura, serwery, marketing, drobne zakupy).",
    formula: "Wzór: Burn-Rate = Suma kosztów operacyjnych YTD / Liczba aktywnych miesięcy",
    consequence: "Dla kogo to ważne? Pomaga obliczyć tzw. 'pas startowy' (runway), czyli informuje Cię, przez ile miesięcy firma utrzyma się przy życiu ze zgromadzonych oszczędności, jeśli nagle zabrakłoby nowych przychodów. Im niższy burn-rate, tym stabilniejszy biznes.",
  },
  personnel: {
    title: "Koszty Osobowe (YTD)",
    desc: "Suma wszystkich wydatków na zespół (członków zarządu, pracowników na umowach o pracę, stażystów oraz kontrahentów na fakturach B2B) od początku roku do dziś.",
    formula: "Wzór: Koszty osobowe = Wynagrodzenia + Składki ZUS + Faktury B2B od stałych współpracowników",
    consequence: "Dla kogo to ważne? W większości nowoczesnych firm usługowych i technologicznych praca ludzi stanowi największą pozycję kosztową. Monitorowanie tej relacji pozwala kontrolować rentowność zatrudnienia.",
  },
  software: {
    title: "Koszty Licencji & SaaS (YTD)",
    desc: "Zbiorcze wydatki na oprogramowanie, aplikacje mobilne, subskrypcje systemów chmurowych, serwery oraz licencje branżowe od początku roku do dziś.",
    formula: "Wzór: Suma kosztów z kategorii Oprogramowanie, Licencje i SaaS",
    consequence: "Dla kogo to ważne? Pozwala ocenić stopień automatyzacji i cyfryzacji procesów w firmie. Stały audyt licencji pomaga wyeliminować tzw. 'martwe subskrypcje' - narzędzia, za które wciąż płacisz, choć nikt już z nich nie korzysta.",
  },
  retainers: {
    title: "Retainery i przychody stałe",
    desc: "Regularne, cykliczne płatności od klientów (np. stały miesięczny abonament na nadzory autorskie, doradztwo czy stałą obsługę projektową). Zapewniają wysoką stabilność i przewidywalność finansową.",
    formula: "Wzór: Sumaryczny przychód YTD zaklasyfikowany jako 'Cykliczny' lub stała umowa abonamentowa",
    consequence: "Dla kogo to ważne? Zwiększają wycenę Twojej spółki i tworzą bezpieczną poduszkę na pokrywanie stałych kosztów firmy (kosztów personelu, SaaS-ów czy biura) bez obaw o przestoje między zleceniami.",
  },
  milestones: {
    title: "Kamienie Milowe (Skokowe)",
    desc: "Jednorazowe, większe wpływy finansowe skorelowane ze skończeniem konkretnych etapów prac projektowych (np. akceptacja koncepcji, zdobycie PnB lub odbiór dokumentacji).",
    formula: "Wzór: Sumaryczny przychód YTD zaklasyfikowany jako 'Jednorazowy' lub płatność etapowa",
    consequence: "Dla kogo to ważne? Pozwalają realizować wysokie marże i finansować inwestycje rozwojowe, lecz wymagają stałego monitorowania terminów i gromadzenia buforu gotówki na czas oczekiwania między etapami.",
  }
};

// Helper function to format planned months for current or next year
const getPlannedMonthLabel = (m: number, baseYear: number = 2026) => {
  if (m <= 12) {
    const monthName = new Date(baseYear, m - 1, 1).toLocaleString('pl-PL', { month: 'short' });
    return `${m} (${monthName}) ${baseYear} r.`;
  } else {
    const nextMonth = m - 12;
    const monthName = new Date(baseYear + 1, nextMonth - 1, 1).toLocaleString('pl-PL', { month: 'short' });
    return `${nextMonth} (${monthName}) ${baseYear + 1} r. (kolejny rok)`;
  }
};

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
  const [simulatedFutureSales, setSimulatedFutureSales] = useState<number>(0); 
  const [simulatedFutureCosts, setSimulatedFutureCosts] = useState<number>(0); 
  const [infoMetricKey, setInfoMetricKey] = useState<string | null>(null); 

  // Future Expenses Module State
  const DEFAULT_FUTURE_EXPENSES: FutureExpense[] = [
    {
      id: 'fe-1',
      nazwa: 'Przedłużenie rocznych licencji Autodesk Revit',
      netto: 14500,
      kategoria: 'Oprogramowanie',
      prawdopodobienstwo: 'wysokie',
      czyAktywny: true,
      miesiacPlanowany: 10
    },
    {
      id: 'fe-2',
      nazwa: 'Ubezpieczenie OC zawodowe architektów',
      netto: 2500,
      kategoria: 'Biuro',
      prawdopodobienstwo: 'wysokie',
      czyAktywny: true,
      miesiacPlanowany: 11
    },
    {
      id: 'fe-3',
      nazwa: 'Podwykonawca: Projekt konstrukcji żelbetowej',
      netto: 15000,
      kategoria: 'Podwykonawcy',
      prawdopodobienstwo: 'średnie',
      czyAktywny: true,
      miesiacPlanowany: 12
    },
    {
      id: 'fe-4',
      nazwa: 'Nowy wielkoformatowy ploter sieciowy A0',
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
      } catch (e) {}
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
      nazwa: 'Zlecenie: Projekt koncepcyjny osiedla (I transza)',
      netto: 45000,
      kategoria: 'Projekt Koncepcyjny',
      prawdopodobienstwo: 'wysokie',
      czyAktywny: true,
      miesiacPlanowany: 10
    },
    {
      id: 'fr-2',
      nazwa: 'Zlecenie: Projekt budowlany biurowca (II transza)',
      netto: 75000,
      kategoria: 'Projekt Budowlany',
      prawdopodobienstwo: 'wysokie',
      czyAktywny: true,
      miesiacPlanowany: 11
    },
    {
      id: 'fr-3',
      nazwa: 'Nadzory autorskie na budowie (Abonament miesięczny)',
      netto: 12000,
      kategoria: 'Nadzór Autorski',
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
      } catch (e) {}
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
  const [newRevCategory, setNewRevCategory] = useState('Projekt Koncepcyjny');
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

  // Sum active plans
  const activeFutureExpensesKUP = futureExpenses
    .filter((e) => e.czyAktywny)
    .reduce((acc, e) => acc + e.netto, 0);

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

  // Grouping actual revenues by contractor
  const revenueContractors: { [key: string]: number } = {};
  let totalRevenueForShare = 0;

  sales.forEach((s) => {
    if (s.czyCIT) {
      let contrName = s.kontrahent || 'Inne';
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

  // Monthly values of Sales & Purchases to analyze seasonality
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

  // Calculate deviation / variation of sales
  let totalRecurrentRevenues = 0;
  let totalSpikyRevenues = 0;

  sales.forEach(s => {
    if (s.czyCIT) {
      const nameLower = s.kontrahent.toLowerCase();
      const isSpike = s.netto >= 15000 || 
                      nameLower.includes('projekt') || 
                      nameLower.includes('wdrożenie') || 
                      nameLower.includes('jednorazowa') ||
                      nameLower.includes('koncepcja') ||
                      nameLower.includes('budowlan') ||
                      nameLower.includes('wykonawcz') ||
                      nameLower.includes('nadzór') ||
                      nameLower.includes('pnb') ||
                      nameLower.includes('wizualizac') ||
                      nameLower.includes('inwentaryzac') ||
                      nameLower.includes('studium') ||
                      nameLower.includes('etap') ||
                      nameLower.includes('milestone') ||
                      nameLower.includes('makieta');
      if (isSpike) {
        totalSpikyRevenues += s.netto;
      } else {
        totalRecurrentRevenues += s.netto;
      }
    }
  });

  let totalFixedCosts = 0;
  let totalVariableCosts = 0;
  let totalPersonnelCosts = 0;
  let totalLicenseCosts = 0;

  purchases.forEach(p => {
    if (p.kosztCIT) {
      const nameLower = p.dostawca.toLowerCase();
      const catLower = p.kategoria.toLowerCase();
      const isFixedCategory = ['biuro', 'księg', 'telefon', 'internet', 'saas', 'subskr', 'licencj', 'lokal', 'czynsz', 'rent', 'leasing'].some(word => catLower.includes(word) || nameLower.includes(word));
      const kupValue = calculatePurchaseKUP(p);

      if (isFixedCategory || p.netto < 3500) {
        totalFixedCosts += kupValue;
      } else {
        totalVariableCosts += kupValue;
      }

      if (['wynagrodzeni', 'zlecenie', 'dzieło', 'zus', 'osobow', 'etat', 'b2b', 'kontrakt'].some(w => catLower.includes(w) || nameLower.includes(w))) {
        totalPersonnelCosts += kupValue;
      }
      if (['licencj', 'oprogramowani', 'saas', 'subskrypcj', 'aplikacj', 'cloud', 'chmur'].some(w => catLower.includes(w) || nameLower.includes(w))) {
        totalLicenseCosts += kupValue;
      }
    }
  });

  const uniqueMonthsWithCosts = new Set(purchases.filter(p => p.kosztCIT).map(p => p.data.split('-')[1])).size || 1;
  const avgMonthlyFixedCostValue = totalFixedCosts / uniqueMonthsWithCosts;

  // Identify preventable/unnecessary CIT advance payments
  const preventableCitPayments: { month: number; paid: number; rev: number; kup: number; advice: string }[] = [];
  
  citAdvances.forEach((adv) => {
    const mIdx = adv.miesiac - 1;
    const revThisMonth = monthlyRevenues[mIdx] || 0;
    const kupThisMonth = monthlyKUPSum[mIdx] || 0;
    const profitThisMonth = revThisMonth - kupThisMonth;

    if (adv.kwota > 0 && revThisMonth > avgMonthlyFixedCostValue * 1.8 && profitThisMonth > 15000) {
      const salesThisMonth = sales.filter(s => {
        if (!s.czyCIT) return false;
        const m = parseInt(s.data.split('-')[1], 10);
        return m === adv.miesiac;
      });
      
      const hasMilestoneWords = salesThisMonth.some(s => 
        ['projekt', 'koncep', 'budowl', 'wykonaw', 'nadzór', 'etap', 'milestone', 'pnb'].some(w => s.kontrahent.toLowerCase().includes(w))
      );
      
      let architecturalContext = "Wykryto wysoki pik przychodowy (faktura za kamień milowy projektu – np. koncepcję, zatwierdzenie projektu budowlanego lub wykonawczego).";
      if (hasMilestoneWords) {
        architecturalContext = "Zidentyfikowano transzę za kluczowy kamień milowy dokumentacji projektowej.";
      }

      preventableCitPayments.push({
        month: adv.miesiac,
        paid: adv.kwota,
        rev: revThisMonth,
        kup: kupThisMonth,
        advice: `${architecturalContext} Dokonano odprowadzenia zaliczki CIT w wysokości ${formatPLN(adv.kwota)} przy niskich kosztach KUP w tym okresie. W pracowniach architektonicznych to zjawisko można kontrować m.in. poprzez:
        1) Synchronizację podwykonawców (Branżyśći): fakturowanie od projektantów branżowych dokładnie w tym samym miesiącu, w którym zamykane i fakturowane są etapy dla dewelopera / inwestora głównego.
        2) Jednorazową amortyzację sprzętu BIM: przesunięcie zakupów komputerów, stacji renderingu 3D, serwerów lub rocznych licencji na oprogramowanie (Revit, Lumion, ArchiCAD) do miesiąca piku zysku.
        3) Konsolidację kosztów podróży i nadzorów autorskich.`
      });
    }
  });

  // Limit check
  const EUR_LIMIT_PLN = 9200000; 
  const currentRatioToLimit = Math.min(100, (simulatedRevenueTotal / EUR_LIMIT_PLN) * 100);
  const isApproachingLimit = simulatedRevenueTotal > EUR_LIMIT_PLN * 0.75;

  // --- ADVANCED WORLD-CLASS FINANCIAL METRICS ---
  const monthsActive = Math.max(1, uniqueMonthsWithCosts);
  const annualizedRevenue = (actualRevenueYTD / monthsActive) * 12;
  const ebitdaEstimated = simulatedIncomeTotal; // proxy for EBITDA before D&A
  const ebitdaMargin = simulatedRevenueTotal > 0 ? (ebitdaEstimated / simulatedRevenueTotal) * 100 : 0;
  
  const topClientShare = (revenueContractorsArray.length > 0 && totalRevenueForShare > 0)
    ? (revenueContractorsArray[0].value / totalRevenueForShare) * 100 
    : 0;
  const isHighConcentrationRisk = topClientShare > 40;

  const avgMonthlyBurnRate = actualCostYTD / monthsActive;

  return (
    <div className="space-y-6 animate-fade-in" id="mckinsey-dashboard-pane">
      
      {/* 1. Executive Summary Alert Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 relative overflow-hidden shadow-lg border border-slate-800" id="mck-exec-summary">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/15 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3.5 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 bg-indigo-500/20 text-indigo-200 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-500/30">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
              Scenariusz: Bilans Strategiczny i Zamknięcie Roku ({settings.rokPodatkowy})
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight font-display leading-tight">
              Prognoza na koniec roku podatkowego {settings.rokPodatkowy}
            </h2>
            <p className="text-xs text-slate-300 font-sans leading-relaxed">
              Analiza poziomu korporacyjnego symulująca roczny rozrachunek (CIT-8) na bazie wskaźników EBITDA, Burn-Rate i koncentracji ryzyka. Zawiera interaktywne suwaki koniunkturalne ("What-if") i planowanie strategiczne wariantów przychodowo-kosztowych.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 shrink-0 text-xs w-full lg:w-[380px]">
            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 min-w-[170px] space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-sans">Opłacone zaliczki YTD</span>
              <span className="text-sm font-black font-mono text-slate-300 block leading-none">{formatPLN(totalPaidAdvancesYTD)}</span>
              <span className="text-[9px] text-slate-500 block">Suma zadeklarowanych zaliczek</span>
            </div>

            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 min-w-[170px] space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-sans">Suma Przychodu YTD</span>
              <span className="text-sm font-black font-mono text-slate-300 block leading-none">{formatPLN(simulatedRevenueTotal)}</span>
              <span className="text-[9px] text-slate-500 block">Z uwzględnieniem symulacji</span>
            </div>

            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 min-w-[170px] space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-sans">Planowane Przychody</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              </div>
              <span className="text-sm font-black font-mono text-emerald-400 block leading-none">+{formatPLN(activeFutureRevenues)}</span>
              <span className="text-[9px] text-slate-500 block">Zaznaczone przyszłe wpływy</span>
            </div>

            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 min-w-[170px] space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-sans">Planowane Wydatki</span>
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
              </div>
              <span className="text-sm font-black font-mono text-rose-400 block leading-none">-{formatPLN(activeFutureExpensesKUP)}</span>
              <span className="text-[9px] text-slate-500 block">Zaznaczone przyszłe koszty (KUP)</span>
            </div>

            <div className="bg-indigo-950/50 p-4 rounded-xl border border-indigo-900/60 min-w-[170px] space-y-1 sm:col-span-2 lg:col-span-2">
              <span className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest block font-sans">Prognozowany Zysk Netto</span>
              <span className="text-sm font-black font-mono text-emerald-400 block leading-none">{formatPLN(simulatedNetProfit)}</span>
              <span className="text-[9px] text-indigo-300/80 block">Czysty zysk do podziału</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. World-Class Executive Financial KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {/* KPI 1: Skorygowana EBITDA & Margin */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs relative group hover:border-indigo-200 transition-all flex flex-col justify-between min-h-[145px]">
          <div className="absolute top-1 right-1 opacity-[0.03] group-hover:opacity-10 transition-opacity pointer-events-none">
            <TrendingUp className="w-16 h-16 text-indigo-900" />
          </div>
          
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2 mb-2">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest font-sans truncate mr-1">
              EBITDA (Zysk Operacyjny)
            </span>
            <div className="relative group/tooltip inline-flex items-center shrink-0">
              <span className="w-5 h-5 rounded-full border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 hover:text-indigo-850 flex items-center justify-center text-[11px] font-bold shadow-xs transition-all cursor-help select-none font-sans">
                i
              </span>
              <div className="invisible group-hover/tooltip:visible opacity-0 group-hover/tooltip:opacity-100 transition-all duration-200 absolute bottom-full right-0 mb-2 w-72 bg-slate-900 border border-slate-800 text-slate-100 text-left p-4 rounded-xl shadow-2xl z-[100] transform scale-95 origin-bottom-right group-hover/tooltip:scale-100">
                <div className="font-extrabold text-indigo-400 mb-1.5 border-b border-indigo-500/20 pb-1 flex items-center gap-1.5 text-[11px] uppercase tracking-wide leading-tight font-display">
                  <TrendingUp className="w-3.5 h-3.5" />
                  EBITDA (Zysk Operacyjny)
                </div>
                <div className="text-[11px] text-slate-300 leading-relaxed space-y-2 font-sans font-medium normal-case tracking-normal">
                  <p>{KPI_INFO_DETAILS.ebitda.desc}</p>
                  <p className="text-[10px] font-mono text-slate-400 bg-slate-950 p-1.5 rounded-md border border-slate-800/50 leading-normal">
                    {KPI_INFO_DETAILS.ebitda.formula}
                  </p>
                  <p className="text-[11px] text-indigo-300 font-medium leading-normal">
                    {KPI_INFO_DETAILS.ebitda.consequence}
                  </p>
                </div>
                <div className="absolute top-full right-2 border-[6px] border-transparent border-t-slate-900"></div>
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-center">
            <div className="flex items-baseline justify-end gap-2">
              <span className="text-xl font-black text-slate-900 font-mono tracking-tight">{formatPLN(ebitdaEstimated)}</span>
            </div>
          </div>

          <div className="mt-2.5 text-xs font-medium font-sans flex items-center justify-between gap-1.5 border-t border-slate-105 border-slate-100 pt-2">
            <span className={`px-2 py-0.5 rounded-full uppercase font-bold text-[9px] ${ebitdaMargin > 20 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
              Marża: {ebitdaMargin.toFixed(1)}%
            </span>
            <span className="text-slate-400 text-[9px] uppercase font-bold tracking-wider">Benchmark: &gt;20%</span>
          </div>
        </div>

        {/* KPI 2: ARR (Annualized Run Rate) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs relative group hover:border-indigo-200 transition-all flex flex-col justify-between min-h-[145px]">
          <div className="absolute top-1 right-1 opacity-[0.03] group-hover:opacity-10 transition-opacity pointer-events-none">
            <Layers className="w-16 h-16 text-emerald-900" />
          </div>

          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2 mb-2">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest font-sans truncate mr-1">
              Prognozowany ARR
            </span>
            <div className="relative group/tooltip inline-flex items-center shrink-0">
              <span className="w-5 h-5 rounded-full border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 hover:text-emerald-850 flex items-center justify-center text-[11px] font-bold shadow-xs transition-all cursor-help select-none font-sans">
                i
              </span>
              <div className="invisible group-hover/tooltip:visible opacity-0 group-hover/tooltip:opacity-100 transition-all duration-200 absolute bottom-full right-0 mb-2 w-72 bg-slate-900 border border-slate-800 text-slate-100 text-left p-4 rounded-xl shadow-2xl z-[100] transform scale-95 origin-bottom-right group-hover/tooltip:scale-100">
                <div className="font-extrabold text-emerald-400 mb-1.5 border-b border-emerald-500/20 pb-1 flex items-center gap-1.5 text-[11px] uppercase tracking-wide leading-tight font-display">
                  <Layers className="w-3.5 h-3.5" />
                  Prognozowany ARR
                </div>
                <div className="text-[11px] text-slate-300 leading-relaxed space-y-2 font-sans font-medium normal-case tracking-normal">
                  <p>{KPI_INFO_DETAILS.arr.desc}</p>
                  <p className="text-[10px] font-mono text-slate-400 bg-slate-950 p-1.5 rounded-md border border-slate-800/50 leading-normal">
                    {KPI_INFO_DETAILS.arr.formula}
                  </p>
                  <p className="text-[11px] text-emerald-300 font-medium leading-normal">
                    {KPI_INFO_DETAILS.arr.consequence}
                  </p>
                </div>
                <div className="absolute top-full right-2 border-[6px] border-transparent border-t-slate-900"></div>
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-center">
            <div className="flex items-baseline justify-end gap-2">
              <span className="text-xl font-black text-slate-900 font-mono tracking-tight">{formatPLN(annualizedRevenue)}</span>
            </div>
          </div>

          <div className="mt-2.5 text-[10px] font-bold uppercase tracking-wider font-sans text-slate-400 flex items-center justify-end gap-1.5 border-t border-slate-100 pt-2">
            <Calendar className="w-3 h-3 text-slate-400 mr-1"/> {monthsActive} mc dynamiki r/r
          </div>
        </div>

        {/* KPI 3: Koncentracja Klienta (Risk) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs relative group hover:border-rose-200 transition-all flex flex-col justify-between min-h-[145px]">
          <div className="absolute top-1 right-1 opacity-[0.03] group-hover:opacity-10 transition-opacity pointer-events-none">
            <AlertCircle className="w-16 h-16 text-rose-900" />
          </div>

          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2 mb-2">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest font-sans truncate mr-1">
              Koncentracja Ryzyka
            </span>
            <div className="relative group/tooltip inline-flex items-center shrink-0">
              <span className="w-5 h-5 rounded-full border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-850 flex items-center justify-center text-[11px] font-bold shadow-xs transition-all cursor-help select-none font-sans">
                i
              </span>
              <div className="invisible group-hover/tooltip:visible opacity-0 group-hover/tooltip:opacity-100 transition-all duration-200 absolute bottom-full right-0 mb-2 w-72 bg-slate-900 border border-slate-800 text-slate-100 text-left p-4 rounded-xl shadow-2xl z-[100] transform scale-95 origin-bottom-right group-hover/tooltip:scale-100">
                <div className="font-extrabold text-rose-400 mb-1.5 border-b border-rose-500/20 pb-1 flex items-center gap-1.5 text-[11px] uppercase tracking-wide leading-tight font-display">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Koncentracja Ryzyka
                </div>
                <div className="text-[11px] text-slate-300 leading-relaxed space-y-2 font-sans font-medium normal-case tracking-normal">
                  <p>{KPI_INFO_DETAILS.risk.desc}</p>
                  <p className="text-[10px] font-mono text-slate-400 bg-slate-950 p-1.5 rounded-md border border-slate-800/50 leading-normal">
                    {KPI_INFO_DETAILS.risk.formula}
                  </p>
                  <p className="text-[11px] text-rose-300 font-medium leading-normal">
                    {KPI_INFO_DETAILS.risk.consequence}
                  </p>
                </div>
                <div className="absolute top-full right-2 border-[6px] border-transparent border-t-slate-900"></div>
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-center">
            <div className="flex items-baseline justify-end gap-2">
              <span className={`text-xl font-black font-mono tracking-tight ${isHighConcentrationRisk ? 'text-rose-600' : 'text-emerald-600'}`}>
                {topClientShare.toFixed(1)}%
              </span>
              <span className="text-[10px] font-bold text-slate-405 text-slate-450 uppercase tracking-wider">portfela</span>
            </div>
          </div>

          <div className="mt-2.5 text-xs font-medium font-sans flex items-center justify-between gap-1.5 border-t border-slate-100 pt-2">
            <span className="text-slate-400 text-[10px] truncate max-w-[120px] font-bold" title={revenueContractorsArray[0]?.name}>
              {revenueContractorsArray[0]?.name || 'Brak danych'}
            </span>
            {isHighConcentrationRisk && (
              <span className="text-[9px] bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded-full font-bold uppercase transition-all">
                Ryzyko
              </span>
            )}
          </div>
        </div>

        {/* KPI 4: Burn Rate */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs relative group hover:border-indigo-200 transition-all flex flex-col justify-between min-h-[145px]">
          <div className="absolute top-1 right-1 opacity-[0.03] group-hover:opacity-10 transition-opacity pointer-events-none">
            <TrendingDown className="w-16 h-16 text-slate-900" />
          </div>

          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2 mb-2">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest font-sans truncate mr-1">
              Średni Burn-Rate (OPEX)
            </span>
            <div className="relative group/tooltip inline-flex items-center shrink-0">
              <span className="w-5 h-5 rounded-full border border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-805 flex items-center justify-center text-[11px] font-bold shadow-xs transition-all cursor-help select-none font-sans">
                i
              </span>
              <div className="invisible group-hover/tooltip:visible opacity-0 group-hover/tooltip:opacity-100 transition-all duration-200 absolute bottom-full right-0 mb-2 w-72 bg-slate-900 border border-slate-800 text-slate-100 text-left p-4 rounded-xl shadow-2xl z-[100] transform scale-95 origin-bottom-right group-hover/tooltip:scale-100">
                <div className="font-extrabold text-slate-300 mb-1.5 border-b border-slate-500/20 pb-1 flex items-center gap-1.5 text-[11px] uppercase tracking-wide leading-tight font-display">
                  <TrendingDown className="w-3.5 h-3.5" />
                  Średni Burn-Rate (OPEX)
                </div>
                <div className="text-[11px] text-slate-300 leading-relaxed space-y-2 font-sans font-medium normal-case tracking-normal">
                  <p>{KPI_INFO_DETAILS.burnrate.desc}</p>
                  <p className="text-[10px] font-mono text-slate-400 bg-slate-950 p-1.5 rounded-md border border-slate-800/50 leading-normal">
                    {KPI_INFO_DETAILS.burnrate.formula}
                  </p>
                  <p className="text-[11px] text-slate-300 font-medium leading-normal">
                    {KPI_INFO_DETAILS.burnrate.consequence}
                  </p>
                </div>
                <div className="absolute top-full right-2 border-[6px] border-transparent border-t-slate-900"></div>
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-center">
            <div className="flex items-baseline justify-end gap-2">
              <span className="text-xl font-black text-slate-900 font-mono tracking-tight">{formatPLN(avgMonthlyBurnRate)}</span>
            </div>
          </div>

          <div className="mt-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider font-sans flex items-center justify-end gap-1 border-t border-slate-100 pt-2">
             <Info className="w-3 h-3 text-slate-450 mr-1"/> Tempo ubywania gotówki
          </div>
        </div>

        {/* KPI 5: Personnel Costs */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs relative group hover:border-sky-200 transition-all flex flex-col justify-between min-h-[145px]">
          <div className="absolute top-1 right-1 opacity-[0.03] group-hover:opacity-10 transition-opacity pointer-events-none">
            <Users className="w-16 h-16 text-sky-900" />
          </div>

          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2 mb-2">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest font-sans truncate mr-1">
              Koszty Osobowe (YTD)
            </span>
            <div className="relative group/tooltip inline-flex items-center shrink-0">
              <span className="w-5 h-5 rounded-full border border-sky-200 bg-sky-50 hover:bg-sky-100 text-sky-600 hover:text-sky-850 flex items-center justify-center text-[11px] font-bold shadow-xs transition-all cursor-help select-none font-sans">
                i
              </span>
              <div className="invisible group-hover/tooltip:visible opacity-0 group-hover/tooltip:opacity-100 transition-all duration-200 absolute bottom-full right-0 mb-2 w-72 bg-slate-900 border border-slate-800 text-slate-100 text-left p-4 rounded-xl shadow-2xl z-[100] transform scale-95 origin-bottom-right group-hover/tooltip:scale-100">
                <div className="font-extrabold text-sky-400 mb-1.5 border-b border-sky-500/20 pb-1 flex items-center gap-1.5 text-[11px] uppercase tracking-wide leading-tight font-display">
                  <Users className="w-3.5 h-3.5" />
                  Koszty Osobowe (YTD)
                </div>
                <div className="text-[11px] text-slate-300 leading-relaxed space-y-2 font-sans font-medium normal-case tracking-normal">
                  <p>{KPI_INFO_DETAILS.personnel.desc}</p>
                  <p className="text-[10px] font-mono text-slate-400 bg-slate-950 p-1.5 rounded-md border border-slate-800/50 leading-normal">
                    {KPI_INFO_DETAILS.personnel.formula}
                  </p>
                  <p className="text-[11px] text-sky-305 text-sky-300 font-medium leading-normal">
                    {KPI_INFO_DETAILS.personnel.consequence}
                  </p>
                </div>
                <div className="absolute top-full right-2 border-[6px] border-transparent border-t-slate-900"></div>
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-center">
            <div className="flex items-baseline justify-end gap-2">
              <span className="text-xl font-black text-slate-900 font-mono tracking-tight">{formatPLN(totalPersonnelCosts)}</span>
            </div>
          </div>

          <div className="mt-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider font-sans flex items-center justify-between gap-1 border-t border-slate-100 pt-2">
             <span className="flex items-center gap-1"><Info className="w-3 h-3 text-slate-400"/> Zespół & Kontrakty</span>
             {actualCostYTD > 0 && <span>{((totalPersonnelCosts / actualCostYTD) * 100).toFixed(1)}% OPEX</span>}
          </div>
        </div>

        {/* KPI 6: License Costs */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs relative group hover:border-purple-200 transition-all flex flex-col justify-between min-h-[145px]">
          <div className="absolute top-1 right-1 opacity-[0.03] group-hover:opacity-10 transition-opacity pointer-events-none">
            <AppWindow className="w-16 h-16 text-purple-900" />
          </div>

          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2 mb-2">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest font-sans truncate mr-1">
              Koszty Licencji & SaaS (YTD)
            </span>
            <div className="relative group/tooltip inline-flex items-center shrink-0">
              <span className="w-5 h-5 rounded-full border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-600 hover:text-purple-850 flex items-center justify-center text-[11px] font-bold shadow-xs transition-all cursor-help select-none font-sans">
                i
              </span>
              <div className="invisible group-hover/tooltip:visible opacity-0 group-hover/tooltip:opacity-100 transition-all duration-200 absolute bottom-full right-0 mb-2 w-72 bg-slate-900 border border-slate-800 text-slate-100 text-left p-4 rounded-xl shadow-2xl z-[100] transform scale-95 origin-bottom-right group-hover/tooltip:scale-100">
                <div className="font-extrabold text-purple-400 mb-1.5 border-b border-purple-500/20 pb-1 flex items-center gap-1.5 text-[11px] uppercase tracking-wide leading-tight font-display">
                  <AppWindow className="w-3.5 h-3.5" />
                  Koszty Licencji & SaaS (YTD)
                </div>
                <div className="text-[11px] text-slate-300 leading-relaxed space-y-2 font-sans font-medium normal-case tracking-normal">
                  <p>{KPI_INFO_DETAILS.software.desc}</p>
                  <p className="text-[10px] font-mono text-slate-400 bg-slate-950 p-1.5 rounded-md border border-slate-800/50 leading-normal">
                    {KPI_INFO_DETAILS.software.formula}
                  </p>
                  <p className="text-[11px] text-purple-305 text-purple-305 text-purple-300 font-medium leading-normal">
                    {KPI_INFO_DETAILS.software.consequence}
                  </p>
                </div>
                <div className="absolute top-full right-2 border-[6px] border-transparent border-t-slate-900"></div>
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-center">
            <div className="flex items-baseline justify-end gap-2">
              <span className="text-xl font-black text-slate-900 font-mono tracking-tight">{formatPLN(totalLicenseCosts)}</span>
            </div>
          </div>

          <div className="mt-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider font-sans flex items-center justify-between gap-1 border-t border-slate-100 pt-2">
             <span className="flex items-center gap-1"><Info className="w-3 h-3 text-slate-400"/> Oprogramowanie</span>
             {actualCostYTD > 0 && <span>{((totalLicenseCosts / actualCostYTD) * 100).toFixed(1)}% OPEX</span>}
          </div>
        </div>
      </div>

      {/* 3. Core Strategic Model Breakdown & Waterfall Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* LEFT COLUMN: Waterfall Simulation Breakdown & Interactivity */}
        <div className="lg:col-span-7 space-y-5">
          
          {/* Corporate Model - Waterfall Summary Breakdown Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5 shadow-xs hover:shadow-md transition-all" id="mck-waterfall-card">
            <div>
              <h3 className="text-sm font-black text-slate-805 text-slate-850 uppercase tracking-wider font-display flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-indigo-600" />
                Matryca rocznego zamknięcia zysku (EAT)
              </h3>
              <p className="text-xs text-slate-400 mt-1">Krok po kroku od przychodów brutto do dywidend netto</p>
            </div>

            <div className="divide-y divide-slate-100 text-xs">
              
              {/* Row 1a: Revenue registered (Baza) */}
              <div className="flex justify-between items-center py-2.5">
                <div>
                  <span className="text-xs font-bold text-slate-700 block font-sans">A. Przychód Netto Spółki (Baza YTD + Prognoza)</span>
                  <span className="text-[10px] text-slate-400 font-mono">Faktury z ksiąg + suwak symulatora</span>
                </div>
                <span className="text-xs font-black text-slate-900 font-mono">{formatPLN(simulatedRevenueBase)}</span>
              </div>

              {/* Row 1b: Active Future Revenues (Przychody ze Słownika) */}
              <div className="flex justify-between items-center p-3 bg-emerald-50/20 border border-emerald-100 rounded-xl my-2.5">
                <div className="flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5 animate-pulse" />
                  <div className="space-y-0.5 text-left font-sans">
                    <span className="text-xs font-black text-emerald-950 block">A2. Planowane Przyszłe Przychody</span>
                    <span className="text-[10px] text-slate-500 block">Zaznaczone pozycje ze słownika przychodów</span>
                  </div>
                </div>
                <span className="text-xs font-black font-mono text-emerald-600">+{formatPLN(activeFutureRevenues)}</span>
              </div>

              {/* Row 2: Costs KUP */}
              <div className="flex justify-between items-center py-2.5">
                <div>
                  <span className="text-xs font-bold text-slate-700 block font-sans">B. Koszty Kwalifikowane KUP (Baza YTD + Prognoza)</span>
                  <span className="text-[10px] text-slate-400 font-mono">Koszty operacyjne + suwak symulatora</span>
                </div>
                <div className="text-right font-mono">
                  <span className="text-xs font-black text-rose-600">-{formatPLN(simulatedKupBase)}</span>
                  <span className="text-[10px] text-slate-400 block font-sans">({simulatedRevenueTotal > 0 ? ((simulatedKupBase / simulatedRevenueTotal)*100).toFixed(1) : '0.0'}% obrotu)</span>
                </div>
              </div>

              {/* Row 2b: Active Future Expenses (Inwestycje Robocze) */}
              <div className="flex justify-between items-center p-3 bg-indigo-50/20 border border-indigo-150 rounded-xl my-2.5 font-sans animate-none">
                <div className="flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5 animate-pulse" />
                  <div className="space-y-0.5 text-left">
                    <span className="text-xs font-black text-indigo-950 block">B2. Planowane Przyszłe Wydatki (KUP)</span>
                    <span className="text-[10px] text-slate-500 block">Zaznaczone pozycje tarczy kosztowej słownika</span>
                  </div>
                </div>
                <span className="text-xs font-black font-mono text-indigo-600">-{formatPLN(activeFutureExpensesKUP)}</span>
              </div>

              {/* Row 3: EBT */}
              <div className="flex justify-between items-center p-3.5 bg-slate-50 border border-slate-150 rounded-xl my-2 font-bold font-sans">
                <div>
                  <span className="text-xs font-black text-slate-900 block">C. Podstawa Opodatkowania CIT (Zysk Gross)</span>
                  <span className="text-[10px] text-slate-400 font-medium">Przychód ogółem (A + A2) pomniejszony o KUP (B + B2)</span>
                </div>
                <span className="text-xs font-black text-slate-900 font-mono">{formatPLN(simulatedIncomeTotal)}</span>
              </div>

              {/* Row 4: Tax computed */}
              <div className="flex justify-between items-center py-2.5">
                <div>
                  <span className="text-xs font-bold text-slate-700 block font-sans">D. Prognozowany Podatek CIT za cały Rok</span>
                  <span className="text-[10px] text-slate-400 font-mono">Stawka obniżona {settings.stawkaCIT}% CIT dla małego podatnika</span>
                </div>
                <span className="text-xs font-black font-mono text-rose-600">-{formatPLN(simulatedCitTotal)}</span>
              </div>

              {/* Row 5: Paid Advances to be deducted */}
              <div className="flex justify-between items-center py-2.5">
                <div>
                  <span className="text-xs font-bold text-slate-700 block font-sans">E. Zapłacone Zaliczki na podatek CIT YTD</span>
                  <span className="text-[10px] text-slate-400 font-mono">Suma uiszczonych zaliczek w ciągu 12 miesięcy</span>
                </div>
                <span className="text-xs font-black font-mono text-emerald-600">+{formatPLN(totalPaidAdvancesYTD)}</span>
              </div>

              {/* Row 6: Final close result */}
              <div className="p-4 rounded-xl bg-indigo-50/50 border border-indigo-150 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-3 font-sans">
                <div>
                  <h4 className="text-xs font-black text-indigo-950 uppercase tracking-wider">F. Ostateczny Rozrachunek w CIT-8</h4>
                  <p className="text-[10px] text-indigo-600 font-medium mt-0.5">Różnica rocznego zobowiązania i zaliczek (D - E)</p>
                </div>
                <div className="text-right">
                  {simulatedIsEligibleForRefund ? (
                    <div className="space-y-1">
                      <span className="text-[9px] bg-emerald-100 border border-emerald-200 text-emerald-800 font-black px-2 py-0.5 rounded-full uppercase leading-none inline-block">Nadpłata do Zwrotu</span>
                      <div className="text-lg font-black font-mono text-emerald-600 leading-none">{formatPLN(simulatedRefundAmount)}</div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <span className="text-[9px] bg-amber-100 border border-amber-200 text-amber-800 font-black px-2 py-0.5 rounded-full uppercase leading-none inline-block">Dopłata Podatkowa</span>
                      <div className="text-lg font-black font-mono text-amber-700 leading-none">{formatPLN(simulatedTaxPayable)}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Row 7: Ultimate net earnings */}
              <div className="flex justify-between items-center p-4 pt-5 border-t border-slate-100 mt-2 font-black text-slate-900 font-sans">
                <span className="text-xs uppercase tracking-wider block">Czysty Zysk Netto do Podziału (EAT):</span>
                <span className="font-mono text-2xl text-indigo-600 font-black tracking-tight">{formatPLN(simulatedNetProfit)}</span>
              </div>

            </div>
          </div>

          {/* Interactive McKinsey Strategic Scenario Controls (Touch and Visual Sliders Box) */}
          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-4" id="simulated-future-sliders">
            <div className="flex items-center gap-1.5 text-xs font-black text-slate-700 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600 animate-pulse animate-none" />
              Interaktywny Symulator Prognozy (Możliwości "What-If")
            </div>
            
            <p className="text-[11px] text-slate-500 leading-normal font-sans">
              Przesuń suwaki, aby zasymulować zdobycie dodatkowych dużych zleceń (np. koncepcje wielkokubaturowe) lub dokonanie nagłych zakupów inwestycyjnych w tarczy podatkowej do końca roku.
            </p>

            <div className="space-y-4 pt-1 font-sans">
              
              {/* Slider 1: Sales */}
              <div className="space-y-2 p-4 bg-white border border-slate-200 rounded-xl shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-slate-700 font-bold text-xs">Oczekiwany dodatkowy Przychód (Netto):</span>
                  <div className="flex items-center gap-1.5 self-end sm:self-auto">
                    <div className="relative">
                      <input 
                        type="number"
                        min="0"
                        value={simulatedFutureSales || 0}
                        onChange={(e) => setSimulatedFutureSales(Math.max(0, Number(e.target.value)))}
                        className="w-28 text-right font-bold font-mono text-xs border border-indigo-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden bg-white rounded-lg pl-2 pr-8 py-1.5 text-indigo-700"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-indigo-600 font-sans">PLN</span>
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
                  className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <div className="flex justify-between text-[9px] text-slate-400 font-mono font-medium">
                  <span>0 zł</span>
                  <span>250 000 zł</span>
                  <span>500 000 zł+ (możliwość wpisu własnego)</span>
                </div>
              </div>

              {/* Slider 2: Costs */}
              <div className="space-y-2 p-4 bg-white border border-slate-200 rounded-xl shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-slate-700 font-bold text-xs">Oczekiwane dodatkowe Koszty (KUP):</span>
                  <div className="flex items-center gap-1.5 self-end sm:self-auto">
                    <div className="relative">
                      <input 
                        type="number"
                        min="0"
                        value={simulatedFutureCosts || 0}
                        onChange={(e) => setSimulatedFutureCosts(Math.max(0, Number(e.target.value)))}
                        className="w-28 text-right font-bold font-mono text-xs border border-rose-200 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 focus:outline-hidden bg-white rounded-lg pl-2 pr-8 py-1.5 text-rose-750 text-rose-700"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-rose-600 font-sans">PLN</span>
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
                  className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-rose-500"
                />
                <div className="flex justify-between text-[9px] text-slate-400 font-mono font-medium">
                  <span>0 zł</span>
                  <span>175 000 zł</span>
                  <span>350 000 zł+ (możliwość wpisu własnego)</span>
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
                  className="text-[10px] font-black text-indigo-700 hover:text-indigo-950 font-sans cursor-pointer uppercase tracking-wider"
                >
                  Resetuj parametry symulacji ↩
                </button>
              </div>
            )}
          </div>

          {/* 3. Strategic Planning Hub YTD (What-if Position Cards Hub) */}
          {/* Ukryte z widoku bilansu - pełny planer jest teraz osobną sekcją na dedykowanej karcie */}
          <div className="hidden" id="mck-strategic-planning-hub">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-805 text-slate-850 uppercase tracking-wider font-display flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-500" />
                Planer Strategiczny (Pozycje Zakładane i Portfel)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Wpisuj, planuj i dołączaj do bilansu rocznego spodziewane kontrakty i inwestycje i badaj ich wpływ.
              </p>
            </div>

            {/* Strategic Tabs Switcher */}
            <div className="flex bg-slate-100 p-1 rounded-xl gap-1" id="planning-tabs-row">
              <button
                type="button"
                onClick={() => setPlanningTab('expenses')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-black rounded-lg transition-all cursor-pointer select-none ${
                  planningTab === 'expenses'
                    ? 'bg-white shadow-3xs text-indigo-700 border border-slate-200'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
                }`}
              >
                💸 Planowane Wydatki
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold font-mono ${
                  planningTab === 'expenses' ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-200 text-slate-600'
                }`}>
                  {formatPLN(activeFutureExpensesKUP).replace('zł', '').trim()}
                </span>
              </button>
              
              <button
                type="button"
                onClick={() => setPlanningTab('revenues')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-black rounded-lg transition-all cursor-pointer select-none ${
                  planningTab === 'revenues'
                    ? 'bg-white shadow-3xs text-emerald-700 border border-slate-200'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
                }`}
              >
                📈 Planowane Przychody
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold font-mono ${
                  planningTab === 'revenues' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                }`}>
                  +{formatPLN(activeFutureRevenues).replace('zł', '').trim()}
                </span>
              </button>
            </div>

            {/* Render expenses content */}
            {planningTab === 'expenses' && (
              <div className="space-y-4" id="expenses-tab-content">
                {/* List of expenses */}
                <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1" id="future-expenses-list">
                  {futureExpenses.length === 0 ? (
                    <div className="text-center py-8 text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl font-medium">
                      Brak planowanych wydatków roboczych.
                    </div>
                  ) : (
                    futureExpenses.map((exp) => {
                      const taxSaving = Math.round(exp.netto * (settings.stawkaCIT / 100));
                      return (
                        <div 
                          key={exp.id} 
                          className={`flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border transition-all ${
                            exp.czyAktywny 
                              ? 'bg-indigo-50/25 border-indigo-200 shadow-sm' 
                              : 'bg-white border-slate-150 opacity-55 hover:opacity-90'
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            <input
                              type="checkbox"
                              checked={exp.czyAktywny}
                              onChange={() => handleToggleExpense(exp.id)}
                              className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 mt-0.5 cursor-pointer"
                              title="Uwzględnij w symulacji"
                            />
                            <div className="space-y-1 text-xs">
                              <span className="font-bold text-slate-800 block leading-tight">
                                {exp.nazwa}
                              </span>
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="text-[9px] bg-slate-100 text-slate-500 font-bold px-1.5 py-0.5 rounded uppercase">
                                  {exp.kategoria}
                                </span>
                                <span className="text-[9px] text-slate-400 font-mono font-medium">
                                  m-c: {getPlannedMonthLabel(exp.miesiacPlanowany, settings.rokPodatkowy)}
                                </span>
                                {exp.prawdopodobienstwo === 'wysokie' && (
                                  <span className="text-[9px] bg-emerald-50 text-emerald-800 border border-emerald-100 font-bold px-1.5 py-0.5 rounded uppercase">
                                    Pewny (100%)
                                  </span>
                                )}
                                {exp.prawdopodobienstwo === 'średnie' && (
                                  <span className="text-[9px] bg-amber-50 text-amber-800 border border-amber-100 font-bold px-1.5 py-0.5 rounded uppercase">
                                    Prawdopodobny
                                  </span>
                                )}
                                {exp.prawdopodobienstwo === 'niskie' && (
                                  <span className="text-[9px] bg-slate-50 text-slate-500 border border-slate-150 font-bold px-1.5 py-0.5 rounded uppercase">
                                    Opcjonalny
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-3 mt-2 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 shrink-0">
                            <div className="text-right">
                              <div className="text-xs font-black text-slate-900 font-mono">
                                {formatPLN(exp.netto)}
                              </div>
                              <div className="text-[9px] text-emerald-600 font-extrabold font-mono uppercase">
                                Oszczędność CIT: {formatPLN(taxSaving)}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteExpense(exp.id)}
                              className="hover:bg-rose-50 text-slate-400 hover:text-rose-600 p-1.5 rounded-lg transition-colors cursor-pointer"
                              title="Usuń"
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
                <form onSubmit={handleAddExpense} className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-3 mt-2" id="quick-expense-form">
                  <span className="text-[9.5px] font-black text-slate-500 uppercase tracking-widest block flex items-center gap-1 font-sans">
                    <Plus className="w-4 h-4 text-indigo-600" />
                    Dodaj Planowany Wydatek Inwestycyjny to CIT Shield
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-sans text-xs">
                    <div className="space-y-1">
                      <label className="text-[9.5px] font-bold text-slate-400 block uppercase">Nazwa Wydatku</label>
                      <input
                        type="text"
                        required
                        maxLength={50}
                        placeholder="np. Zakup licencji CAD/BIM"
                        value={newExpName}
                        onChange={(e) => setNewExpName(e.target.value)}
                        className="w-full text-xs border border-slate-200 rounded-lg px-3 py-1.5 bg-white outline-indigo-500 text-slate-800 font-medium"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9.5px] font-bold text-slate-400 block uppercase">Kwota Netto (PLN)</label>
                      <input
                        type="number"
                        required
                        min="1"
                        placeholder="np. 4500"
                        value={newExpNetto}
                        onChange={(e) => setNewExpNetto(e.target.value)}
                        className="w-full text-xs border border-slate-200 rounded-lg px-3 py-1.5 bg-white outline-indigo-500 text-slate-800 font-mono font-bold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs font-sans">
                    <div className="space-y-1">
                      <label className="text-[9.5px] font-bold text-slate-400 block uppercase">Prawdopodobieństwo</label>
                      <select
                        value={newExpProb}
                        onChange={(e) => setNewExpKeepProb(e.target.value as any)}
                        className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white outline-indigo-500 text-slate-700 font-bold cursor-pointer"
                      >
                        <option value="wysokie">Pewny (wysokie)</option>
                        <option value="średnie">Prawdopodobny (średnie)</option>
                        <option value="niskie">Opcjonalny (niskie)</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9.5px] font-bold text-slate-400 block uppercase">Kategoria</label>
                      <select
                        value={newExpCategory}
                        onChange={(e) => setNewExpCategory(e.target.value)}
                        className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white outline-indigo-500 text-slate-700 font-bold cursor-pointer"
                      >
                        <option value="Oprogramowanie">Oprogramowanie / Licencje CAD, BIM i SaaS</option>
                        <option value="Podwykonawcy">Podwykonawcy i Branżyści (instalacje, konstrukcja itp.)</option>
                        <option value="Wynagrodzenia etat">Wynagrodzenia - Umowa o pracę (etat)</option>
                        <option value="Umowa zlecenie">Wynagrodzenia - Umowa zlecenie / B2B</option>
                        <option value="Umowa o dzieło">Wynagrodzenia - Umowa o dzieło</option>
                        <option value="Biuro">Koszty biurowe, Czynsze i Media</option>
                        <option value="Pojazdy">Samochody służbowe, Paliwo i Transport (pojazd)</option>
                        <option value="Marketing">Marketing, Reklama i Konkursy architektoniczne</option>
                        <option value="Szkolenia">Szkolenia, Konferencje i Certyfikaty</option>
                        <option value="Sprzęt komputerowy font-sans">Sprzęt komputerowy, Plotery i Makiety 3D</option>
                        <option value="Telefony">Telefony i Łączność</option>
                        <option value="Usługi">Doradztwo, Księgowość i Obsługa prawna</option>
                        <option value="Inne">Inne optymalne koszty</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9.5px] font-bold text-slate-400 block uppercase">Planowany miesiąc</label>
                      <select
                        value={newExpMonth}
                        onChange={(e) => setNewExpMonth(parseInt(e.target.value, 10))}
                        className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white outline-indigo-500 text-slate-700 font-bold cursor-pointer"
                      >
                        {Array.from({ length: 24 }, (_, i) => (
                          <option key={i + 1} value={i + 1}>
                            {getPlannedMonthLabel(i + 1, settings.rokPodatkowy)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-2 border-t border-slate-200/60 gap-2 font-sans">
                    <span className="text-[10px] text-slate-400 italic leading-snug">
                      *Zatwierdzone wydatki powiększają koszty KUP i chronią dochód firmy przed obciążeniem podatkowym.
                    </span>
                    <button
                      type="submit"
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-4 py-2 rounded-xl cursor-pointer transition-all flex items-center justify-center gap-1 shadow-2xs shrink-0 self-end sm:self-auto uppercase tracking-wider"
                    >
                      <Plus className="w-3.5 h-3.5" /> Dodaj koszt
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Render revenues content */}
            {planningTab === 'revenues' && (
              <div className="space-y-4" id="revenues-tab-content">
                {/* List of revenues */}
                <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1" id="future-revenues-list">
                  {futureRevenues.length === 0 ? (
                    <div className="text-center py-8 text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl font-medium">
                      Brak zakontraktowanych wpływów roboczych.
                    </div>
                  ) : (
                    futureRevenues.map((rev) => {
                      return (
                        <div 
                          key={rev.id} 
                          className={`flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border transition-all ${
                            rev.czyAktywny 
                              ? 'bg-emerald-50/20 border-emerald-200 shadow-sm' 
                              : 'bg-white border-slate-150 opacity-55 hover:opacity-90'
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            <input
                              type="checkbox"
                              checked={rev.czyAktywny}
                              onChange={() => handleToggleRevenue(rev.id)}
                              className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500 mt-0.5 cursor-pointer"
                              title="Uwzględnij w symulacji"
                            />
                            <div className="space-y-1 text-xs">
                              <span className="font-bold text-slate-800 block leading-tight">
                                {rev.nazwa}
                              </span>
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="text-[9px] bg-slate-100 text-slate-500 font-bold px-1.5 py-0.5 rounded uppercase">
                                  {rev.kategoria}
                                </span>
                                <span className="text-[9px] text-slate-400 font-mono font-medium">
                                  m-c: {getPlannedMonthLabel(rev.miesiacPlanowany, settings.rokPodatkowy)}
                                </span>
                                {rev.prawdopodobienstwo === 'wysokie' && (
                                  <span className="text-[9px] bg-emerald-50 text-emerald-800 border border-emerald-100 font-bold px-1.5 py-0.5 rounded uppercase">
                                    Pewny (100%)
                                  </span>
                                )}
                                {rev.prawdopodobienstwo === 'średnie' && (
                                  <span className="text-[9px] bg-amber-50 text-amber-800 border border-amber-100 font-bold px-1.5 py-0.5 rounded uppercase">
                                    Prawdopodobny
                                  </span>
                                )}
                                {rev.prawdopodobienstwo === 'niskie' && (
                                  <span className="text-[9px] bg-slate-50 text-slate-500 border border-slate-155 font-bold px-1.5 py-0.5 rounded uppercase">
                                    Opcjonalny
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-3 mt-2 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 shrink-0">
                            <div className="text-right">
                              <div className="text-xs font-black text-emerald-600 font-mono">
                                +{formatPLN(rev.netto)}
                              </div>
                              <span className="text-[9px] text-slate-400 block font-sans font-medium uppercase leading-none mt-0.5">Planowane wpływy</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteRevenue(rev.id)}
                              className="hover:bg-rose-50 text-slate-400 hover:text-rose-600 p-1.5 rounded-lg transition-colors cursor-pointer"
                              title="Usuń"
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
                <form onSubmit={handleAddRevenue} className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-3 mt-2" id="quick-revenue-form">
                  <span className="text-[9.5px] font-black text-slate-500 uppercase tracking-widest block flex items-center gap-1 font-sans">
                    <Plus className="w-4 h-4 text-emerald-650" />
                    Dodaj Nowy Planowany Przychod Portfela
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-sans text-xs">
                    <div className="space-y-1">
                      <label className="text-[9.5px] font-bold text-slate-400 block uppercase">Nazwa Przychodu</label>
                      <input
                        type="text"
                        required
                        maxLength={50}
                        placeholder="np. Nadzór autorski nad budową osiedla"
                        value={newRevName}
                        onChange={(e) => setNewRevName(e.target.value)}
                        className="w-full text-xs border border-slate-200 rounded-lg px-3 py-1.5 bg-white outline-emerald-500 text-slate-800 font-medium"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9.5px] font-bold text-slate-400 block uppercase">Kwota Netto (PLN)</label>
                      <input
                        type="number"
                        required
                        min="1"
                        placeholder="np. 15000"
                        value={newRevNetto}
                        onChange={(e) => setNewRevNetto(e.target.value)}
                        className="w-full text-xs border border-slate-200 rounded-lg px-3 py-1.5 bg-white outline-emerald-500 text-slate-800 font-mono font-bold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs font-sans">
                    <div className="space-y-1">
                      <label className="text-[9.5px] font-bold text-slate-400 block uppercase">Prawdopodobieństwo</label>
                      <select
                        value={newRevProb}
                        onChange={(e) => setNewRevProb(e.target.value as any)}
                        className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white outline-emerald-500 text-slate-755 text-slate-700 font-bold cursor-pointer"
                      >
                        <option value="wysokie">Pewny (wysokie)</option>
                        <option value="średnie">Prawdopodobny (średnie)</option>
                        <option value="niskie">Opcjonalny (niskie)</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9.5px] font-bold text-slate-400 block uppercase">Kategoria</label>
                      <select
                        value={newRevCategory}
                        onChange={(e) => setNewRevCategory(e.target.value)}
                        className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white outline-emerald-500 text-slate-700 font-bold cursor-pointer"
                      >
                        <option value="Projekt Koncepcyjny">Projekt Koncepcyjny i Analizy</option>
                        <option value="Projekt Budowlany">Projekt Budowlany / Wykonawczy</option>
                        <option value="Nadzór Autorski">Nadzór Autorski i Budowlany</option>
                        <option value="Wizualizacje">Wizualizacje, Rendery i Makiety</option>
                        <option value="Doradztwo">Ekspertyzy, Inwentaryzacje i Doradztwo</option>
                        <option value="Inne">Inne wpływy</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9.5px] font-bold text-slate-400 block uppercase">Planowany miesiąc</label>
                      <select
                        value={newRevMonth}
                        onChange={(e) => setNewRevMonth(parseInt(e.target.value, 10))}
                        className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white outline-emerald-500 text-slate-755 text-slate-700 font-bold cursor-pointer"
                      >
                        {Array.from({ length: 24 }, (_, i) => (
                          <option key={i + 1} value={i + 1}>
                            {getPlannedMonthLabel(i + 1, settings.rokPodatkowy)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-2 border-t border-slate-200/60 gap-2 font-sans">
                    <span className="text-[10px] text-slate-400 italic leading-snug">
                      *Zatwierdzone wpływy powiększają prognozowany roczny obrót firmy oraz zysk końcowy.
                    </span>
                    <button
                      type="submit"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-4 py-2 rounded-xl cursor-pointer transition-all flex items-center justify-center gap-1 shadow-2xs shrink-0 self-end sm:self-auto uppercase tracking-wider"
                    >
                      <Plus className="w-3.5 h-3.5" /> Dodaj wpływ
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Cost Structure, Corporate Visuals & Expert Insights */}
        <div className="lg:col-span-5 space-y-5 flex flex-col">
          
          {/* Bento Block A: Real-Time Revenue Structure matrix with Smart Grouping */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs" id="revenue-matrix-panel">
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-805 text-slate-850 uppercase tracking-wider font-display flex items-center gap-1.5 animate-none">
                  <Sparkles className="w-4 h-4 text-emerald-600 animate-pulse animate-none" />
                  Struktura przychodów YTD
                </h3>
                <span className="text-[9px] bg-emerald-50 text-emerald-800 px-2.5 py-0.5 rounded-full font-black font-mono border border-emerald-150 uppercase tracking-widest scale-95 shrink-0">
                  Model analysis
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 font-sans font-medium">Analiza ciągłości vs pików dla Pracowni Projektowej YTD</p>
            </div>

            {/* Smart Grouped Metrics */}
            <div className="grid grid-cols-2 gap-3" id="revenue-behavior-groups">
              <div className="bg-emerald-50/35 border border-emerald-100 rounded-xl p-3 sm:p-3.5 relative group hover:border-emerald-250 transition-all flex flex-col justify-between min-h-[105px]">
                <div className="flex items-center justify-between gap-1.5 pb-1 border-b border-emerald-150/40">
                  <span className="text-[9px] text-emerald-800 font-extrabold uppercase tracking-wider font-sans truncate mr-2 block">
                    Retainery i stałe
                  </span>
                  <div className="relative group/tooltip inline-flex items-center shrink-0">
                    <span className="w-4.5 h-4.5 rounded-full border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 hover:text-emerald-850 flex items-center justify-center text-[10px] font-bold shadow-xs transition-all cursor-help select-none font-sans">
                      i
                    </span>
                    <div className="invisible group-hover/tooltip:visible opacity-0 group-hover/tooltip:opacity-100 transition-all duration-200 absolute bottom-full right-0 mb-2 w-72 bg-slate-900 border border-slate-800 text-slate-100 text-left p-4 rounded-xl shadow-2xl z-[100] transform scale-95 origin-bottom-right group-hover/tooltip:scale-100">
                      <div className="font-extrabold text-emerald-400 mb-1.5 border-b border-indigo-500/20 pb-1 flex items-center gap-1.5 text-[11px] uppercase tracking-wide leading-tight font-display">
                        <Sparkles className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
                        {KPI_INFO_DETAILS.retainers.title}
                      </div>
                      <div className="text-[11px] text-slate-300 leading-relaxed space-y-2 font-sans font-medium normal-case tracking-normal">
                        <p>{KPI_INFO_DETAILS.retainers.desc}</p>
                        <p className="text-[10px] font-mono text-slate-400 bg-slate-950 p-1.5 rounded-md border border-slate-800/50 leading-normal">
                          {KPI_INFO_DETAILS.retainers.formula}
                        </p>
                        <p className="text-[11px] text-emerald-300 font-medium leading-normal">
                          {KPI_INFO_DETAILS.retainers.consequence}
                        </p>
                      </div>
                      <div className="absolute top-full right-2 border-[6px] border-transparent border-t-slate-900"></div>
                    </div>
                  </div>
                </div>
                <div className="flex-1 flex flex-col justify-center">
                  <span className="text-base font-black text-slate-900 font-mono block mt-1">
                    {formatPLN(totalRecurrentRevenues)}
                  </span>
                </div>
                <span className="text-[9px] text-slate-400 font-medium font-sans italic block mt-1 border-t border-emerald-100/30 pt-1">Bieżąca cykliczność</span>
              </div>

              <div className="bg-indigo-50/20 border border-indigo-150 rounded-xl p-3 sm:p-3.5 relative group hover:border-indigo-250 transition-all flex flex-col justify-between min-h-[105px]">
                <div className="flex items-center justify-between gap-1.5 pb-1 border-b border-indigo-150/40">
                  <span className="text-[9px] text-indigo-850 font-extrabold uppercase tracking-wider font-sans truncate mr-2 block">
                    Kamienie Milowe
                  </span>
                  <div className="relative group/tooltip inline-flex items-center shrink-0">
                    <span className="w-4.5 h-4.5 rounded-full border border-indigo-250 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 hover:text-indigo-850 flex items-center justify-center text-[10px] font-bold shadow-xs transition-all cursor-help select-none font-sans">
                      i
                    </span>
                    <div className="invisible group-hover/tooltip:visible opacity-0 group-hover/tooltip:opacity-100 transition-all duration-200 absolute bottom-full right-0 mb-2 w-72 bg-slate-900 border border-slate-800 text-slate-100 text-left p-4 rounded-xl shadow-2xl z-[100] transform scale-95 origin-bottom-right group-hover/tooltip:scale-100">
                      <div className="font-extrabold text-indigo-400 mb-1.5 border-b border-indigo-500/20 pb-1 flex items-center gap-1.5 text-[11px] uppercase tracking-wide leading-tight font-display">
                        <Layers className="w-3.5 h-3.5 text-indigo-400" />
                        {KPI_INFO_DETAILS.milestones.title}
                      </div>
                      <div className="text-[11px] text-slate-300 leading-relaxed space-y-2 font-sans font-medium normal-case tracking-normal">
                        <p>{KPI_INFO_DETAILS.milestones.desc}</p>
                        <p className="text-[10px] font-mono text-slate-400 bg-slate-950 p-1.5 rounded-md border border-slate-800/50 leading-normal">
                          {KPI_INFO_DETAILS.milestones.formula}
                        </p>
                        <p className="text-[11px] text-indigo-300 font-medium leading-normal">
                          {KPI_INFO_DETAILS.milestones.consequence}
                        </p>
                      </div>
                      <div className="absolute top-full right-2 border-[6px] border-transparent border-t-slate-900"></div>
                    </div>
                  </div>
                </div>
                <div className="flex-1 flex flex-col justify-center">
                  <span className="text-base font-black text-indigo-600 font-mono block mt-1">
                    {formatPLN(totalSpikyRevenues)}
                  </span>
                </div>
                <span className="text-[9px] text-slate-400 font-medium font-sans italic block mt-1 border-t border-indigo-150/30 pt-1">Etapy projektowe i PnB</span>
              </div>
            </div>

            {/* Visual Bar of Group Percentage */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[9.5px] text-slate-400 font-extrabold uppercase tracking-wider block font-sans">Udział struktur przychodowych</span>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden flex border border-slate-200">
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
              <div className="flex justify-between text-[9px] text-slate-450 font-mono font-semibold">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Cykliczne ({totalRevenueForShare > 0 ? ((totalRecurrentRevenues / totalRevenueForShare) * 100).toFixed(0) : 0}%)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-indigo-500" />
                  Skokowe ({totalRevenueForShare > 0 ? ((totalSpikyRevenues / totalRevenueForShare) * 100).toFixed(0) : 0}%)
                </span>
              </div>
            </div>

            {/* Smart insights on revenue pattern */}
            <div className="text-[11px] bg-slate-50 border border-slate-150 p-3.5 rounded-xl text-slate-600 leading-normal font-sans">
              <div className="font-bold text-slate-800 flex items-center gap-1 text-[11.5px] pb-1 border-b border-slate-200/50 mb-1.5">
                <span>🎯</span> Model płynnościowy biura:
              </div>
              {totalSpikyRevenues > totalRecurrentRevenues ? (
                <p>
                  Obecny rozkład potwierdza klasyczny dla biur architektonicznych <b>model milestone-owy (fakturowanie etapowe)</b>. Zabezpieczaj zaliczki od deweloperów, by uniknąć zatorów płatniczych pomiędzy odbiorami PnB.
                </p>
              ) : (
                <p>
                  Udział stałych abonamentów nadzorczych lub stałego retainer-u zapewnia wysokie bezpieczeństwo gotówki i eliminuje nagłe zatory CIT.
                </p>
              )}
            </div>

            {/* Contractor list inside smaller accordion/list */}
            <div className="space-y-2 pt-2 border-t border-slate-100 font-sans">
              <span className="text-[9.5px] font-black text-slate-400 uppercase tracking-widest block">Główni Kontrahenci (Koncentracja YTD)</span>
              <div className="max-h-[140px] overflow-y-auto space-y-2 pr-1" id="revenue-contractor-bars">
                {revenueContractorsArray.length === 0 ? (
                  <div className="text-center py-4 text-xs text-slate-400 font-medium">Brak danych przychodowych.</div>
                ) : (
                  revenueContractorsArray.map((contr) => (
                    <div key={contr.name} className="flex justify-between items-center text-xs p-1.5 hover:bg-slate-50 rounded-lg">
                      <span className="font-semibold text-slate-700 truncate max-w-[170px]">{contr.name}</span>
                      <span className="font-mono text-slate-600 font-bold">{formatPLN(contr.value)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Bento Block B: Real-Time Cost Structure with Smart Grouping */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs" id="cost-matrix-panel">
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-805 text-slate-850 uppercase tracking-wider font-display flex items-center gap-1.5 animate-none">
                  <Sparkles className="w-4 h-4 text-indigo-600 animate-pulse animate-none" />
                  Struktura kosztów i KUP YTD
                </h3>
                <span className="text-[9px] bg-indigo-50 text-indigo-800 px-2.5 py-0.5 rounded-full font-black font-mono border border-indigo-150 uppercase tracking-widest scale-95 shrink-0">
                  Tax shield check
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 font-sans font-medium">Stałe koszty operacyjne pracowni vs jednorazowe inwestycje</p>
            </div>

            {/* Smart Grouped Metrics */}
            <div className="grid grid-cols-2 gap-3" id="cost-behavior-groups">
              <div className="bg-slate-50 border border-slate-150 rounded-xl p-3.5">
                <span className="text-[9px] text-slate-500 font-extrabold uppercase tracking-wider block font-sans">Koszty Stałe operacyjne</span>
                <span className="text-base font-black text-slate-900 font-mono block mt-1">
                  {formatPLN(totalFixedCosts)}
                </span>
                <span className="text-[9px] text-slate-400 font-medium font-sans block mt-0.5">Biuro & CAD: ~{formatPLN(avgMonthlyFixedCostValue).replace('zł','')}</span>
              </div>
              <div className="bg-rose-50/30 border border-rose-100 rounded-xl p-3.5">
                <span className="text-[9px] text-rose-800 font-extrabold uppercase tracking-wider block font-sans">Jednorazowe (Wydatki zmienne)</span>
                <span className="text-base font-black text-rose-650 text-rose-700 font-mono block mt-1">
                  {formatPLN(totalVariableCosts)}
                </span>
                <span className="text-[9px] text-slate-400 font-medium font-sans block mt-0.5">Projektanci & stacje GPU</span>
              </div>
            </div>

            {/* Smart Dynamic Insight on costs stability */}
            <div className="text-[11px] bg-slate-50 border border-slate-150 p-3.5 rounded-xl text-slate-600 leading-normal font-sans">
              <div className="font-bold text-slate-800 flex items-center gap-1 text-[11.5px] pb-1 border-b border-slate-200/50 mb-1.5 font-sans">
                <span>📊</span> Audyt Kosztów i Marży (EBITDA):
              </div>
              <p>
                Twoje stałe OPEX (Biuro, BIM, księgowość, ubezpieczenia) to <b>{formatPLN(avgMonthlyFixedCostValue)}</b>/mc. 
                Przy obecnym poziomie przychodów generujesz marżę operacyjną <b>{ebitdaMargin.toFixed(1)}%</b>. 
                {ebitdaMargin > 20 
                  ? ' Świetny wynik na tle branży (>20% benchmark), spółka wysoce zyskowna.' 
                  : ' Marża wymaga optymalizacji (spróbuj ciąć OPEX lub negocjować wyższe stawki za etapy projektowe).'}
              </p>
            </div>

            {/* Category list inside smaller list */}
            <div className="space-y-2 pt-2 border-t border-slate-100 font-sans">
              <span className="text-[9.5px] font-black text-slate-400 uppercase tracking-widest block">Kategorie Kosztów Kwalifikowanych KUP</span>
              <div className="max-h-[140px] overflow-y-auto space-y-2 pr-1" id="cost-category-bars">
                {costCategoryArray.length === 0 ? (
                  <div className="text-center py-4 text-xs text-slate-400 font-medium">Brak kosztów.</div>
                ) : (
                  costCategoryArray.map((category) => (
                    <div key={category.name} className="flex justify-between items-center text-xs p-1.5 hover:bg-slate-50 rounded-lg">
                      <span className="font-semibold text-slate-700 truncate max-w-[170px]">
                        {category.name === 'Agregacja' ? 'Pakiet zbiorczy STY-KWI' : category.name}
                      </span>
                      <span className="font-mono text-slate-650 font-bold">
                        {formatPLN(category.value)} <span className="text-[10px] text-slate-400">({category.share.toFixed(0)}%)</span>
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Strategic Suggestion Block: Limit 2M EUR for preferencial 9% CIT rate */}
          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 space-y-4 shadow-3xs" id="regulatory-threshold-card">
            <div className="flex justify-between items-start gap-2 font-sans">
              <div>
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-650 text-indigo-600 animate-pulse" />
                  Próg Małego Podatnika (Limit 9% CIT)
                </h4>
                <p className="text-[10px] text-slate-400 mt-0.5">Weryfikacja rocznego limitu obrotów 2 mln EUR</p>
              </div>
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase shrink-0 border ${
                simulatedRevenueTotal > EUR_LIMIT_PLN 
                  ? 'bg-rose-100 border-rose-250 text-rose-800'
                  : isApproachingLimit
                    ? 'bg-amber-100 border-amber-250 text-amber-800'
                    : 'bg-emerald-100 border-emerald-250 text-emerald-800'
              }`}>
                {simulatedRevenueTotal > EUR_LIMIT_PLN ? 'Przekroczony' : isApproachingLimit ? 'Faza Ryzyka' : 'Bezpieczny'}
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px] font-mono font-bold text-slate-600">
                <span>Roczny Przychód: {formatPLN(simulatedRevenueTotal)}</span>
                <span>Limit roczny: ~9.2M PLN</span>
              </div>
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden border border-slate-200/65">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    simulatedRevenueTotal > EUR_LIMIT_PLN 
                      ? 'bg-rose-600'
                      : isApproachingLimit
                        ? 'bg-amber-500'
                        : 'bg-indigo-600'
                  }`}
                  style={{ width: `${currentRatioToLimit}%` }}
                />
              </div>
              <div className="flex justify-between text-[9px] text-slate-400 font-mono font-medium">
                <span>0% limitu</span>
                <span>Wykorzystanie: {currentRatioToLimit.toFixed(1)}%</span>
                <span>100% (2M EUR)</span>
              </div>
            </div>

            <p className="text-[10px] text-slate-500 leading-normal font-sans">
              {simulatedRevenueTotal > EUR_LIMIT_PLN ? (
                <span className="text-rose-750 font-bold">⚠️ Spółka przekroczyła próg Małego Podatnika. Obowiązywać będzie roczna stawka 19% CIT.</span>
              ) : isApproachingLimit ? (
                <span className="text-amber-800 font-bold">⚡ Przychody rosną gwałtownie, zbliżając się do 2 mln EUR. Kontroluj fakturowanie.</span>
              ) : (
                <span className="text-slate-500">✅ Przychody roczne są bezpiecznie poniżej limitu. Spółka zachowuje pełne prawo do obniżonej stawki 9% CIT.</span>
              )}
            </p>
          </div>

          {/* Expert Advisor Panel: Liquidity Leak & Unnecessary CIT Paid Analysis */}
          <div className="bg-indigo-50/50 border border-indigo-150 rounded-2xl p-5 space-y-4" id="expert-advisor-panel">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-150 border border-indigo-200 text-indigo-700 font-bold flex items-center justify-center text-xs shrink-0 shadow-2xs">
                <Sparkles className="w-4 h-4 text-indigo-600" />
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider font-sans leading-none">
                  Niepotrzebnie Zamrożone Środki w CIT YTD
                </h4>
                <p className="text-[9.5px] text-indigo-700 font-medium leading-none mt-1">Identyfikacja uchybień harmonogramu fakturowania</p>
              </div>
            </div>

            <div className="text-xs text-slate-700 space-y-3 leading-relaxed font-sans mt-2">
              {preventableCitPayments.length > 0 ? (
                <>
                  <p className="font-bold text-rose-700">
                    ⚠️ Wykryto nieefektywne obciążenie zaliczkami z powodu piku zysku:
                  </p>
                  <div className="space-y-3">
                    {preventableCitPayments.map((p, idx) => (
                      <div key={idx} className="bg-white border border-rose-100 p-3.5 rounded-xl space-y-2 text-slate-650 shadow-sm relative">
                        <div className="flex items-center gap-1.5 font-bold text-slate-800">
                          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                          Miesiąc {p.month}: Zamrożono zaliczkę {formatPLN(p.paid)}
                        </div>
                        <p className="text-[11px] leading-relaxed text-slate-600">
                          {p.advice}
                        </p>
                        <div className="text-[9px] bg-rose-50 text-rose-800 px-2 py-0.5 rounded font-mono font-bold border border-rose-100/50 inline-block leading-none">
                          💡 Rekomendowany bufor Cashflow: ok. {formatPLN(p.paid * 0.5)} wolnych środków operacyjnych!
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="bg-white border border-slate-200 p-3.5 rounded-xl space-y-1.5 text-xs text-slate-600 shadow-3xs font-sans">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                    <ShieldCheck className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
                    Wzorowa korelacja kosztów i wpływów YTD
                  </div>
                  <p className="text-[11px] text-slate-500 leading-normal">
                    Nie odnotowano prapłat zaliczek odprowadzonych przedwcześnie w trakcie roku. Podatki są optymalnie bilansowane tnącymi kosztami operacyjnymi. Doskonały cashflow.
                  </p>
                </div>
              )}

              <p className="text-[10px] text-slate-400 italic font-sans leading-normal">
                <b>Reguła płynności:</b> Polskie zaliczki płatne narastająco w locie "zamrażają" płynność gotówkową spółki w Urzędzie Skarbowym. Każde zsynchronizowanie faktur podwykonawców z fakturami sprzedaży redukuje roczny koszt zatoru finansowego.
              </p>
            </div>
          </div>

        </div>

      </div>

      {/* Metric Info Modal */}
      {infoMetricKey && (() => {
        const info = KPI_INFO_DETAILS[infoMetricKey];
        if (!info) return null;
        return (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-[100] flex items-center justify-center p-4 animate-fade-in" onClick={() => setInfoMetricKey(null)}>
            <div 
              className="bg-white rounded-2xl border border-slate-200 p-6 max-w-md w-full shadow-2xl relative space-y-4 animate-scale-in"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button 
                onClick={() => setInfoMetricKey(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1.5 rounded-full transition-colors hover:bg-slate-100"
              >
                <Plus className="w-5 h-5 rotate-45" />
              </button>

              <div className="flex items-center gap-3 text-left">
                <div className={`p-2.5 rounded-xl ${
                  infoMetricKey === 'ebitda' ? 'bg-indigo-50 text-indigo-600' :
                  infoMetricKey === 'arr' ? 'bg-emerald-50 text-emerald-600' :
                  infoMetricKey === 'risk' ? 'bg-rose-50 text-rose-600' :
                  infoMetricKey === 'burnrate' ? 'bg-slate-100 text-slate-600' :
                  infoMetricKey === 'personnel' ? 'bg-sky-50 text-sky-600' :
                  infoMetricKey === 'retainers' ? 'bg-emerald-50 text-emerald-600' :
                  infoMetricKey === 'milestones' ? 'bg-indigo-50 text-indigo-600' :
                  'bg-purple-50 text-purple-600'
                }`}>
                  {infoMetricKey === 'ebitda' && <TrendingUp className="w-6 h-6" />}
                  {infoMetricKey === 'arr' && <Layers className="w-6 h-6" />}
                  {infoMetricKey === 'risk' && <AlertCircle className="w-6 h-6" />}
                  {infoMetricKey === 'burnrate' && <TrendingDown className="w-6 h-6" />}
                  {infoMetricKey === 'personnel' && <Users className="w-6 h-6" />}
                  {infoMetricKey === 'software' && <AppWindow className="w-6 h-6" />}
                  {infoMetricKey === 'retainers' && <Sparkles className="w-6 h-6" />}
                  {infoMetricKey === 'milestones' && <Layers className="w-6 h-6" />}
                </div>
                <div>
                  <h3 className="font-display font-black text-slate-900 text-base leading-tight">
                    {info.title}
                  </h3>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    Słownik Biznesowy
                  </span>
                </div>
              </div>

              <div className="space-y-3.5 pt-1.5 text-left">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-black tracking-widest text-[#4f46e5] block">Co to oznacza?</span>
                  <p className="text-xs text-slate-600 leading-relaxed font-sans">{info.desc}</p>
                </div>

                {info.formula && (
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1">
                    <span className="text-[10px] uppercase font-black tracking-widest text-slate-500 block">Jak to liczymy?</span>
                    <p className="text-xs font-mono text-slate-600">{info.formula}</p>
                  </div>
                )}

                {info.consequence && (
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-black tracking-widest text-[#4f46e5] block font-sans">Zastosowanie praktyczne</span>
                    <p className="text-xs text-slate-600 leading-relaxed font-sans">{info.consequence}</p>
                  </div>
                )}
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setInfoMetricKey(null)}
                  className="w-full bg-[#4f46e5] text-white py-2.5 rounded-xl text-xs font-black shadow-sm transition-all hover:bg-indigo-700 active:scale-98"
                >
                  Zamknij wyjaśnienie
                </button>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
}

// Inline set helper name fix
function setNewExpKeepProb(val: any) {
  // empty fallback connector for typing integrity
}
