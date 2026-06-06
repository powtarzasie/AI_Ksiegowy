import React, { useState } from 'react';
import { AppState } from '../types';
import {
  Sparkles,
  Plus,
  Trash2,
  TrendingUp,
  Percent,
  Calendar,
  Layers,
  ArrowRight,
  Calculator,
  ShieldAlert,
  Settings,
  HelpCircle,
  PiggyBank,
  Info,
  Pencil,
  Check,
  X
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

const DEFAULT_FUTURE_EXPENSES: FutureExpense[] = [
  {
    id: 'fe-1',
    nazwa: 'Roczna licencja Autodesk Revit (BIM)',
    netto: 14500,
    kategoria: 'Oprogramowanie',
    prawdopodobienstwo: 'wysokie',
    czyAktywny: true,
    miesiacPlanowany: 10
  },
  {
    id: 'fe-2',
    nazwa: 'Konstruktor i podwykonawcy branżowi (Etap Budowlany)',
    netto: 18000,
    kategoria: 'Podwykonawcy',
    prawdopodobienstwo: 'wysokie',
    czyAktywny: true,
    miesiacPlanowany: 10
  },
  {
    id: 'fe-3',
    nazwa: 'Szkolenie zespołu z projektowania energooszczędnego (Cert)',
    netto: 3500,
    kategoria: 'Szkolenia',
    prawdopodobienstwo: 'średnie',
    czyAktywny: true,
    miesiacPlanowany: 11
  }
];

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

interface StrategicPlannerProps {
  state: AppState;
}

export default function StrategicPlanner({ state }: StrategicPlannerProps) {
  const { settings } = state;

  // Expenses state
  const [futureExpenses, setFutureExpenses] = useState<FutureExpense[]>(() => {
    const saved = localStorage.getItem('mck_future_expenses');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return DEFAULT_FUTURE_EXPENSES;
  });

  // Revenues state
  const [futureRevenues, setFutureRevenues] = useState<FutureRevenue[]>(() => {
    const saved = localStorage.getItem('mck_future_revenues');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return DEFAULT_FUTURE_REVENUES;
  });

  const saveFutureExpenses = (newExpenses: FutureExpense[]) => {
    setFutureExpenses(newExpenses);
    localStorage.setItem('mck_future_expenses', JSON.stringify(newExpenses));
  };

  const saveFutureRevenues = (newRevenues: FutureRevenue[]) => {
    setFutureRevenues(newRevenues);
    localStorage.setItem('mck_future_revenues', JSON.stringify(newRevenues));
  };

  // Form states for expenses
  const [newExpName, setNewExpName] = useState('');
  const [newExpNetto, setNewExpNetto] = useState('');
  const [newExpProb, setNewExpProb] = useState<'wysokie' | 'średnie' | 'niskie'>('wysokie');
  const [newExpCategory, setNewExpCategory] = useState('Oprogramowanie');
  const [newExpMonth, setNewExpMonth] = useState(12);

  // Form states for revenues
  const [newRevName, setNewRevName] = useState('');
  const [newRevNetto, setNewRevNetto] = useState('');
  const [newRevProb, setNewRevProb] = useState<'wysokie' | 'średnie' | 'niskie'>('wysokie');
  const [newRevCategory, setNewRevCategory] = useState('Projekt Koncepcyjny');
  const [newRevMonth, setNewRevMonth] = useState(12);

  // Active planning tab
  const [planningTab, setPlanningTab] = useState<'expenses' | 'revenues'>('expenses');

  // Edit states for expense items
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [editingExpenseData, setEditingExpenseData] = useState<FutureExpense | null>(null);

  // Edit states for revenue items
  const [editingRevenueId, setEditingRevenueId] = useState<string | null>(null);
  const [editingRevenueData, setEditingRevenueData] = useState<FutureRevenue | null>(null);

  const startEditExpense = (exp: FutureExpense) => {
    setEditingExpenseId(exp.id);
    setEditingExpenseData({ ...exp });
  };

  const handleSaveExpenseEdit = () => {
    if (!editingExpenseData || !editingExpenseData.nazwa.trim()) return;
    const updated = futureExpenses.map((exp) => 
      exp.id === editingExpenseId ? editingExpenseData : exp
    );
    saveFutureExpenses(updated);
    setEditingExpenseId(null);
    setEditingExpenseData(null);
  };

  const handleCancelExpenseEdit = () => {
    setEditingExpenseId(null);
    setEditingExpenseData(null);
  };

  const startEditRevenue = (rev: FutureRevenue) => {
    setEditingRevenueId(rev.id);
    setEditingRevenueData({ ...rev });
  };

  const handleSaveRevenueEdit = () => {
    if (!editingRevenueData || !editingRevenueData.nazwa.trim()) return;
    const updated = futureRevenues.map((rev) => 
      rev.id === editingRevenueId ? editingRevenueData : rev
    );
    saveFutureRevenues(updated);
    setEditingRevenueId(null);
    setEditingRevenueData(null);
  };

  const handleCancelRevenueEdit = () => {
    setEditingRevenueId(null);
    setEditingRevenueData(null);
  };

  // Calculations
  const activeFutureExpensesKUP = futureExpenses
    .filter((exp) => exp.czyAktywny)
    .reduce((sum, exp) => sum + exp.netto, 0);

  const activeFutureRevenues = futureRevenues
    .filter((rev) => rev.czyAktywny)
    .reduce((sum, rev) => sum + rev.netto, 0);

  const totalPossibleExpensesTaxSaving = futureExpenses
    .filter((exp) => exp.czyAktywny)
    .reduce((sum, exp) => sum + Math.round(exp.netto * (settings.stawkaCIT / 100)), 0);

  // Handlers for Expenses
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

  // Handlers for Revenues
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

  return (
    <div className="space-y-6" id="strategic-planner-root">
      {/* Header Panel */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 text-white relative overflow-hidden shadow-xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.15),transparent_40%)]" />
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 rounded-full text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" /> Planowanie Budżetu i Portfela
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight" id="strategic-planner-title">
              Planer Strategiczny
            </h1>
            <p className="text-slate-350 text-slate-300 text-sm max-w-xl">
              Dodaj zakładane koszty oraz planowane wpływy portfelowe. Ich wartości zostaną automatycznie uwzględnione w symulacjach i wyliczeniach Bilansu Strategicznego.
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 shadow-2xs shrink-0 flex items-center gap-3">
            <Calculator className="w-8 h-8 text-indigo-400" />
            <div>
              <span className="text-[10px] text-zinc-400 block font-bold uppercase">Stawka CIT Twojej spółki</span>
              <span className="text-2xl font-black font-mono text-white">{settings.stawkaCIT}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Top metrics dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5" id="strategic-metrics-grid">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 p-6 flex items-center justify-between gap-4.5 shadow-xs">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div className="space-y-0.5 text-right flex-1">
            <span className="text-[11px] font-black text-slate-400 block uppercase tracking-wider">Aktywne prognozowane przychody</span>
            <div className="text-xl font-mono font-black text-slate-900">
              +{formatPLN(activeFutureRevenues)}
            </div>
            <span className="text-[10px] text-slate-400 block font-medium">Suma aktywnych planowanych wpływów</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 p-6 flex items-center justify-between gap-4.5 shadow-xs">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Layers className="w-6 h-6" />
          </div>
          <div className="space-y-0.5 text-right flex-1">
            <span className="text-[11px] font-black text-slate-400 block uppercase tracking-wider">Aktywne planowane wydatki (KUP)</span>
            <div className="text-xl font-mono font-black text-slate-900">
              -{formatPLN(activeFutureExpensesKUP)}
            </div>
            <span className="text-[10px] text-slate-400 block font-medium">Suma zakładanych kosztów KUP w symulacji</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-indigo-50/50 to-emerald-50/20 rounded-2xl border border-indigo-100 p-5 p-6 flex items-center justify-between gap-4.5 shadow-xs">
          <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm">
            <PiggyBank className="w-6 h-6" />
          </div>
          <div className="space-y-0.5 text-right flex-1">
            <span className="text-[11px] font-black text-indigo-750 text-indigo-700 block uppercase tracking-wider">Tarcza podatkowa CIT Shield</span>
            <div className="text-xl font-mono font-black text-emerald-700">
              {formatPLN(totalPossibleExpensesTaxSaving)}
            </div>
            <span className="text-[10px] text-slate-500 block font-medium">Odsunięty podatek CIT dzięki kosztom</span>
          </div>
        </div>
      </div>

      {/* Main planner container */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5 shadow-xs" id="main-planning-hub">
        <div className="border-b border-slate-100 pb-4">
          <h2 className="text-base font-black text-slate-800 uppercase tracking-wider font-display flex items-center gap-2">
            <Settings className="w-4 h-4 text-indigo-600" />
            Pozycje Zakładane i Portfel Kontraktów
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Zarządzaj ustrukturyzowanymi prognozami na nadchodzące miesiące. Przełączaj przyciski aktywacji, by badać od ręki scenariusze co-if.
          </p>
        </div>

        {/* Tabs Switcher */}
        <div className="flex bg-slate-100 p-1 rounded-xl max-w-md gap-1" id="planning-tabs-row">
          <button
            type="button"
            onClick={() => setPlanningTab('expenses')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-black rounded-lg transition-all cursor-pointer select-none ${
              planningTab === 'expenses'
                ? 'bg-white shadow-3xs text-indigo-700 border border-slate-200'
                : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
            }`}
          >
            💸 Planowane Koszty
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold font-mono ${
              planningTab === 'expenses' ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-200 text-slate-605'
            }`}>
              {formatPLN(activeFutureExpensesKUP).replace('zł', '').trim()}
            </span>
          </button>
          
          <button
            type="button"
            onClick={() => setPlanningTab('revenues')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-black rounded-lg transition-all cursor-pointer select-none ${
              planningTab === 'revenues'
                ? 'bg-white shadow-3xs text-emerald-705 text-emerald-700 border border-slate-200'
                : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
            }`}
          >
            📈 Wpływy Portfelowe
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold font-mono ${
              planningTab === 'revenues' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-605'
            }`}>
              +{formatPLN(activeFutureRevenues).replace('zł', '').trim()}
            </span>
          </button>
        </div>

        {/* Expenses UI */}
        {planningTab === 'expenses' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="expenses-tab-container">
            {/* List and list actions */}
            <div className="lg:col-span-7 space-y-3">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest block">Lista zakładanych inwestycji kosztowych</h3>
              
              <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1" id="future-expenses-list">
                {futureExpenses.length === 0 ? (
                  <div className="text-center py-12 text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl font-medium">
                    Brak planowanych wydatków roboczych. Użyj formularza obok, aby dodać koszty.
                  </div>
                ) : (
                  futureExpenses.map((exp) => {
                    const taxSaving = Math.round(exp.netto * (settings.stawkaCIT / 100));
                    if (editingExpenseId === exp.id && editingExpenseData) {
                      return (
                        <div 
                          key={exp.id} 
                          className="p-4 rounded-xl border border-indigo-300 bg-indigo-50/15 shadow-sm space-y-3"
                          id={`edit-expense-card-${exp.id}`}
                        >
                          <div className="flex items-center justify-between border-b border-indigo-100/55 pb-2">
                            <span className="text-[11px] font-black text-indigo-700 uppercase tracking-wider flex items-center gap-1">
                              <Pencil className="w-3.5 h-3.5" /> Edycja planowanego kosztu
                            </span>
                            <div className="flex gap-1.5">
                              <button
                                type="button"
                                onClick={handleSaveExpenseEdit}
                                className="bg-indigo-600 hover:bg-indigo-700 font-extrabold text-[10px] px-2.5 py-1 text-white rounded-md flex items-center gap-1 cursor-pointer transition-colors shadow-3xs uppercase tracking-wider"
                              >
                                <Check className="w-3 h-3" /> Zapisz
                              </button>
                              <button
                                type="button"
                                onClick={handleCancelExpenseEdit}
                                className="bg-slate-200 hover:bg-slate-300 font-extrabold text-[10px] px-2.5 py-1 text-slate-705 text-slate-700 rounded-md flex items-center gap-1 cursor-pointer transition-colors uppercase tracking-wider"
                              >
                                <X className="w-3 h-3" /> Anuluj
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-sans">
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold text-slate-400 uppercase">Nazwa kosztu</label>
                              <input
                                type="text"
                                value={editingExpenseData.nazwa}
                                onChange={(e) => setEditingExpenseData({ ...editingExpenseData, nazwa: e.target.value })}
                                className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white outline-indigo-500 text-slate-800 font-bold"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold text-slate-400 uppercase">Kwota Netto (PLN)</label>
                              <input
                                type="number"
                                value={editingExpenseData.netto || ''}
                                onChange={(e) => setEditingExpenseData({ ...editingExpenseData, netto: parseFloat(e.target.value) || 0 })}
                                className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white outline-indigo-500 text-slate-800 font-mono font-bold"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold text-slate-400 uppercase">Kategoria</label>
                              <select
                                value={editingExpenseData.kategoria}
                                onChange={(e) => setEditingExpenseData({ ...editingExpenseData, kategoria: e.target.value })}
                                className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white outline-indigo-500 text-slate-700 font-bold cursor-pointer"
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
                                <option value="Sprzęt komputerowy">Sprzęt komputerowy, Plotery i Makiety 3D</option>
                                <option value="Telefony">Telefony i Łączność</option>
                                <option value="Usługi">Doradztwo, Księgowość i Obsługa prawna</option>
                                <option value="Inne">Inne optymalne koszty</option>
                              </select>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <label className="text-[9px] font-bold text-slate-400 uppercase">Szansa</label>
                                <select
                                  value={editingExpenseData.prawdopodobienstwo}
                                  onChange={(e) => setEditingExpenseData({ ...editingExpenseData, prawdopodobienstwo: e.target.value as any })}
                                  className="w-full border border-slate-200 rounded-lg px-1 py-1.5 bg-white outline-indigo-500 text-slate-700 font-bold cursor-pointer text-[10.5px]"
                                >
                                  <option value="wysokie">Pewny (100%)</option>
                                  <option value="średnie">Prawdopodobny</option>
                                  <option value="niskie">Opcjonalny</option>
                                </select>
                              </div>
                              <div className="space-y-1">
                                <label className="text-[9px] font-bold text-slate-400 uppercase">Miesiąc</label>
                                <select
                                  value={editingExpenseData.miesiacPlanowany}
                                  onChange={(e) => setEditingExpenseData({ ...editingExpenseData, miesiacPlanowany: parseInt(e.target.value, 10) })}
                                  className="w-full border border-slate-200 rounded-lg px-1 py-1.5 bg-white outline-indigo-500 text-slate-700 font-bold cursor-pointer text-[10.5px]"
                                >
                                  {Array.from({ length: 24 }, (_, i) => (
                                    <option key={i + 1} value={i + 1}>
                                      {getPlannedMonthLabel(i + 1, settings.rokPodatkowy)}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div 
                        key={exp.id} 
                        className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border transition-all ${
                          exp.czyAktywny 
                            ? 'bg-indigo-50/25 border-indigo-200 shadow-3xs' 
                            : 'bg-white border-slate-150 opacity-55 hover:opacity-90'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={exp.czyAktywny}
                            onChange={() => handleToggleExpense(exp.id)}
                            className="w-4.5 h-4.5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 mt-0.5 cursor-pointer"
                            title="Uwzględnij w symulacji i zsumowaniu"
                          />
                          <div className="space-y-1.5 text-xs">
                            <span className="font-bold text-slate-800 block leading-snug">
                              {exp.nazwa}
                            </span>
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-[9.5px] bg-slate-100 text-slate-550 border border-slate-200 font-bold px-2 py-0.5 rounded uppercase">
                                {exp.kategoria}
                              </span>
                              <span className="text-[9.5px] text-slate-400 font-mono font-medium">
                                Miesiąc: {getPlannedMonthLabel(exp.miesiacPlanowany, settings.rokPodatkowy)}
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

                        <div className="flex items-center justify-between sm:justify-end gap-4 mt-3 sm:mt-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100 shrink-0">
                          <div className="text-right">
                            <div className="text-xs font-black text-slate-900 font-mono">
                              {formatPLN(exp.netto)}
                            </div>
                            <div className="text-[9.5px] text-emerald-600 font-extrabold font-mono uppercase">
                              Tarcza CIT: {formatPLN(taxSaving)}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => startEditExpense(exp)}
                              className="hover:bg-indigo-50 text-indigo-500 hover:text-indigo-700 p-2 rounded-lg transition-colors cursor-pointer"
                              title="Edytuj pozycję"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteExpense(exp.id)}
                              className="hover:bg-rose-50 text-slate-400 hover:text-rose-600 p-2 rounded-lg transition-colors cursor-pointer"
                              title="Usuń pozycję"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Form */}
            <div className="lg:col-span-5">
              <form onSubmit={handleAddExpense} className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4" id="quick-expense-form">
                <div>
                  <span className="text-[10px] font-black text-indigo-650 text-indigo-600 uppercase tracking-widest block flex items-center gap-1.5 font-sans mb-1">
                    <Plus className="w-4.5 h-4.5" />
                    Nowy planowany wydatek
                  </span>
                  <p className="text-[11px] text-slate-400">Dodaj spodziewane wydatki inwestycyjne, oprogramowanie, makiety projektowe.</p>
                </div>

                <div className="space-y-3.5 text-xs font-sans">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 block uppercase">Nazwa kosztu</label>
                    <input
                      type="text"
                      required
                      maxLength={50}
                      placeholder="np. Zakup licencji Revit"
                      value={newExpName}
                      onChange={(e) => setNewExpName(e.target.value)}
                      className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white outline-indigo-500 text-slate-800 font-medium"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 block uppercase">Kwota Netto (PLN)</label>
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder="np. 6500"
                      value={newExpNetto}
                      onChange={(e) => setNewExpNetto(e.target.value)}
                      className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white outline-indigo-500 text-slate-800 font-mono font-bold"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 block uppercase">Prawdopodobieństwo</label>
                      <select
                        value={newExpProb}
                        onChange={(e) => setNewExpProb(e.target.value as any)}
                        className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-2 bg-white outline-indigo-500 text-slate-700 font-bold cursor-pointer"
                      >
                        <option value="wysokie">Pewny (wysokie)</option>
                        <option value="średnie">Prawdopodobne</option>
                        <option value="niskie">Opcjonalne</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 block uppercase">Miesiąc planowany</label>
                      <select
                        value={newExpMonth}
                        onChange={(e) => setNewExpMonth(parseInt(e.target.value, 10))}
                        className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-2 bg-white outline-indigo-500 text-slate-700 font-bold cursor-pointer"
                      >
                        {Array.from({ length: 24 }, (_, i) => (
                          <option key={i + 1} value={i + 1}>
                            {getPlannedMonthLabel(i + 1, settings.rokPodatkowy)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 block uppercase">Kategoria</label>
                    <select
                      value={newExpCategory}
                      onChange={(e) => setNewExpCategory(e.target.value)}
                      className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-2 bg-white outline-indigo-500 text-slate-700 font-bold cursor-pointer"
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
                      <option value="Sprzęt komputerowy">Sprzęt komputerowy, Plotery i Makiety 3D</option>
                      <option value="Telefony">Telefony i Łączność</option>
                      <option value="Usługi">Doradztwo, Księgowość i Obsługa prawna</option>
                      <option value="Inne">Inne optymalne koszty</option>
                    </select>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200">
                  <button
                    type="submit"
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs py-2.5 rounded-xl cursor-pointer transition-all flex items-center justify-center gap-1.5 shadow-2xs uppercase tracking-wider"
                  >
                    <Plus className="w-4 h-4" /> Dodaj koszt
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Revenues UI */}
        {planningTab === 'revenues' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="revenues-tab-container">
            {/* List and list actions */}
            <div className="lg:col-span-7 space-y-3">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest block">Lista spodziewanych wpływów rocznych</h3>
              
              <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1" id="future-revenues-list">
                {futureRevenues.length === 0 ? (
                  <div className="text-center py-12 text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl font-medium">
                    Brak planowanych wpływów roboczych. Użyj formularza obok, aby dodać przychody.
                  </div>
                ) : (
                  futureRevenues.map((rev) => {
                    if (editingRevenueId === rev.id && editingRevenueData) {
                      return (
                        <div 
                          key={rev.id} 
                          className="p-4 rounded-xl border border-emerald-300 bg-emerald-50/10 shadow-sm space-y-3"
                          id={`edit-revenue-card-${rev.id}`}
                        >
                          <div className="flex items-center justify-between border-b border-emerald-100/50 pb-2">
                            <span className="text-[11px] font-black text-emerald-700 uppercase tracking-wider flex items-center gap-1">
                              <Pencil className="w-3.5 h-3.5" /> Edycja planowanego wpływu
                            </span>
                            <div className="flex gap-1.5">
                              <button
                                type="button"
                                onClick={handleSaveRevenueEdit}
                                className="bg-emerald-600 hover:bg-emerald-700 font-extrabold text-[10px] px-2.5 py-1 text-white rounded-md flex items-center gap-1 cursor-pointer transition-colors shadow-3xs uppercase tracking-wider"
                              >
                                <Check className="w-3 h-3" /> Zapisz
                              </button>
                              <button
                                type="button"
                                onClick={handleCancelRevenueEdit}
                                className="bg-slate-200 hover:bg-slate-300 font-extrabold text-[10px] px-2.5 py-1 text-slate-707 text-slate-700 rounded-md flex items-center gap-1 cursor-pointer transition-colors uppercase tracking-wider"
                              >
                                <X className="w-3 h-3" /> Anuluj
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-sans">
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold text-slate-400 uppercase">Nazwa kontraktu / wpływu</label>
                              <input
                                type="text"
                                value={editingRevenueData.nazwa}
                                onChange={(e) => setEditingRevenueData({ ...editingRevenueData, nazwa: e.target.value })}
                                className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white outline-emerald-500 text-slate-800 font-bold"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold text-slate-400 uppercase">Kwota Netto (PLN)</label>
                              <input
                                type="number"
                                value={editingRevenueData.netto || ''}
                                onChange={(e) => setEditingRevenueData({ ...editingRevenueData, netto: parseFloat(e.target.value) || 0 })}
                                className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white outline-emerald-500 text-slate-800 font-mono font-bold"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold text-slate-400 uppercase">Kategoria</label>
                              <select
                                value={editingRevenueData.kategoria}
                                onChange={(e) => setEditingRevenueData({ ...editingRevenueData, kategoria: e.target.value })}
                                className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white outline-emerald-500 text-slate-700 font-bold cursor-pointer"
                              >
                                <option value="Projekt Koncepcyjny">Projekt Koncepcyjny i Analizy</option>
                                <option value="Projekt Budowlany">Projekt Budowlany / Wykonawczy</option>
                                <option value="Nadzór Autorski">Nadzór Autorski i Budowlany</option>
                                <option value="Wizualizacje">Wizualizacje, Rendery i Makiety</option>
                                <option value="Doradztwo font-bold">Ekspertyzy, Inwentaryzacje i Doradztwo</option>
                                <option value="Inne">Inne wpływy</option>
                              </select>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <label className="text-[9px] font-bold text-slate-400 uppercase">Szansa</label>
                                <select
                                  value={editingRevenueData.prawdopodobienstwo}
                                  onChange={(e) => setEditingRevenueData({ ...editingRevenueData, prawdopodobienstwo: e.target.value as any })}
                                  className="w-full border border-slate-200 rounded-lg px-1 py-1.5 bg-white outline-emerald-500 text-slate-700 font-bold cursor-pointer text-[10.5px]"
                                >
                                  <option value="wysokie">Pewny (100%)</option>
                                  <option value="średnie">Prawdopodobny</option>
                                  <option value="niskie">Opcjonalny</option>
                                </select>
                              </div>
                              <div className="space-y-1">
                                <label className="text-[9px] font-bold text-slate-400 uppercase">Miesiąc</label>
                                <select
                                  value={editingRevenueData.miesiacPlanowany}
                                  onChange={(e) => setEditingRevenueData({ ...editingRevenueData, miesiacPlanowany: parseInt(e.target.value, 10) })}
                                  className="w-full border border-slate-200 rounded-lg px-1 py-1.5 bg-white outline-emerald-500 text-slate-700 font-bold cursor-pointer text-[10.5px]"
                                >
                                  {Array.from({ length: 24 }, (_, i) => (
                                    <option key={i + 1} value={i + 1}>
                                      {getPlannedMonthLabel(i + 1, settings.rokPodatkowy)}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div 
                        key={rev.id} 
                        className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border transition-all ${
                          rev.czyAktywny 
                            ? 'bg-emerald-50/20 border-emerald-200 shadow-3xs' 
                            : 'bg-white border-slate-150 opacity-55 hover:opacity-90'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={rev.czyAktywny}
                            onChange={() => handleToggleRevenue(rev.id)}
                            className="w-4.5 h-4.5 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500 mt-0.5 cursor-pointer"
                            title="Uwzględnij w symulacji i zsumowaniu"
                          />
                          <div className="space-y-1.5 text-xs">
                            <span className="font-bold text-slate-800 block leading-snug">
                              {rev.nazwa}
                            </span>
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-[9.5px] bg-slate-100 text-slate-550 border border-slate-200 font-bold px-2 py-0.5 rounded uppercase">
                                {rev.kategoria}
                              </span>
                              <span className="text-[9.5px] text-slate-400 font-mono font-medium">
                                Miesiąc: {getPlannedMonthLabel(rev.miesiacPlanowany, settings.rokPodatkowy)}
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
                                <span className="text-[9px] bg-slate-50 text-slate-500 border border-slate-150 font-bold px-1.5 py-0.5 rounded uppercase">
                                  Opcjonalny
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-4 mt-3 sm:mt-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100 shrink-0">
                          <div className="text-right">
                            <div className="text-xs font-black text-emerald-600 font-mono">
                              +{formatPLN(rev.netto)}
                            </div>
                            <span className="text-[9px] text-slate-400 block font-sans font-medium uppercase font-extrabold leading-none mt-0.5">Planowane wpływy</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => startEditRevenue(rev)}
                              className="hover:bg-emerald-50 text-emerald-500 hover:text-emerald-700 p-2 rounded-lg transition-colors cursor-pointer"
                              title="Edytuj pozycję"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteRevenue(rev.id)}
                              className="hover:bg-rose-50 text-slate-400 hover:text-rose-600 p-2 rounded-lg transition-colors cursor-pointer"
                              title="Usuń pozycję"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Form */}
            <div className="lg:col-span-5">
              <form onSubmit={handleAddRevenue} className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4" id="quick-revenue-form">
                <div>
                  <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest block flex items-center gap-1.5 font-sans mb-1">
                    <Plus className="w-4.5 h-4.5 text-emerald-600" />
                    Nowy planowany przychód
                  </span>
                  <p className="text-[11px] text-slate-400">Dodaj nowe nadchodzące projekty budowlane, kontrakty, wyceny, usługi abonamentowe.</p>
                </div>

                <div className="space-y-3.5 text-xs font-sans">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 block uppercase">Nazwa kontraktu / wpływu</label>
                    <input
                      type="text"
                      required
                      maxLength={50}
                      placeholder="np. Nadzór autorski - osiedle parkowe"
                      value={newRevName}
                      onChange={(e) => setNewRevName(e.target.value)}
                      className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white outline-emerald-500 text-slate-800 font-medium"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 block uppercase">Kwota Netto (PLN)</label>
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder="np. 24000"
                      value={newRevNetto}
                      onChange={(e) => setNewRevNetto(e.target.value)}
                      className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white outline-emerald-500 text-slate-800 font-mono font-bold"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 block uppercase">Prawdopodobieństwo</label>
                      <select
                        value={newRevProb}
                        onChange={(e) => setNewRevProb(e.target.value as any)}
                        className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-2 bg-white outline-emerald-500 text-slate-700 font-bold cursor-pointer"
                      >
                        <option value="wysokie">Pewny (wysokie)</option>
                        <option value="średnie">Prawdopodobne</option>
                        <option value="niskie">Opcjonalne</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 block uppercase">Miesiąc planowany</label>
                      <select
                        value={newRevMonth}
                        onChange={(e) => setNewRevMonth(parseInt(e.target.value, 10))}
                        className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-2 bg-white outline-emerald-500 text-slate-700 font-bold cursor-pointer"
                      >
                        {Array.from({ length: 24 }, (_, i) => (
                          <option key={i + 1} value={i + 1}>
                            {getPlannedMonthLabel(i + 1, settings.rokPodatkowy)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 block uppercase">Kategoria</label>
                    <select
                      value={newRevCategory}
                      onChange={(e) => setNewRevCategory(e.target.value)}
                      className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-2 bg-white outline-emerald-500 text-slate-700 font-bold cursor-pointer"
                    >
                      <option value="Projekt Koncepcyjny">Projekt Koncepcyjny i Analizy</option>
                      <option value="Projekt Budowlany">Projekt Budowlany / Wykonawczy</option>
                      <option value="Nadzór Autorski">Nadzór Autorski i Budowlany</option>
                      <option value="Wizualizacje">Wizualizacje, Rendery i Makiety</option>
                      <option value="Doradztwo">Ekspertyzy, Inwentaryzacje i Doradztwo</option>
                      <option value="Inne">Inne wpływy</option>
                    </select>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200">
                  <button
                    type="submit"
                    className="w-full bg-emerald-600 hover:bg-emerald-750 hover:bg-emerald-700 text-white font-extrabold text-xs py-2.5 rounded-xl cursor-pointer transition-all flex items-center justify-center gap-1.5 shadow-2xs uppercase tracking-wider"
                  >
                    <Plus className="w-4 h-4" /> Dodaj wpływ
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Info card block */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex items-start gap-3.5" id="planner-rules-explainer">
        <Info className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs text-slate-600">
          <span className="font-extrabold text-slate-800 block">Sposób podpięcia z Bilansowaniem i CIT Shield:</span>
          <p className="leading-relaxed">
            Wszystkie pozycje oznaczone jako <b>aktywne</b> (z zaznaczonym checkboxem) są w locie pobierane do obliczeń w sekcji <b>Strategiczny Bilans</b>. Wydatki automatycznie podwyższają koszty i zmniejszają wysokość podatku dochodowego (CIT Shield), podczas gdy planowane przychody symulują całkowity obrót firmy na dany rok podatkowy.
          </p>
        </div>
      </div>
    </div>
  );
}
