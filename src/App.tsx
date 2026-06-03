import React, { useState, useEffect } from 'react';
import {
  AppState,
  CompanySettings,
  SaleTransaction,
  PurchaseTransaction,
  CitAdvance,
  VatRegistry
} from './types';
import CompanySettingsComponent from './components/CompanySettings';
import StorageControls from './components/StorageControls';
import ExcelImportModal from './components/ExcelImportModal';
import TaxDashboard from './components/TaxDashboard';
import TransactionsManager from './components/TransactionsManager';
import McKinseyDashboard from './components/McKinseyDashboard';
import {
  Database,
  Layers,
  FileSpreadsheet,
  ShieldAlert,
  Calendar,
  Layers2,
  CheckCircle,
  FileText,
  HelpCircle,
  Sparkles
} from 'lucide-react';

const LOCAL_STORAGE_KEY = 'symulator_podatkow_state_v2';

// Detailed, high-fidelity sample state so the app looks fantastic on first load
const SAMPLE_STATE: AppState = {
  settings: {
    nazwaSpolki: 'JA',
    nip: '1',
    stawkaCIT: 9, // Obniżona stawka CIT dla małych podatników
    rokPodatkowy: 2026,
    miesiacPodatkowy: 5 // Maj
  },
  sales: [
    // Monthly aggregations (styczeń - kwiecień)
    {
      id: 'agg-sale-1',
      data: '2026-01-31',
      numerFaktury: 'SUMA_SPRZEDAZ_M01',
      kontrahent: 'Zbiorcza sprzedaż za Styczeń',
      netto: 24000,
      stawkaVat: 23,
      vat: 5520,
      brutto: 29520,
      czyCIT: true,
      czyVAT: true
    },
    {
      id: 'agg-sale-2',
      data: '2026-02-28',
      numerFaktury: 'SUMA_SPRZEDAZ_M02',
      kontrahent: 'Zbiorcza sprzedaż za Luty',
      netto: 28500,
      stawkaVat: 23,
      vat: 6555,
      brutto: 35055,
      czyCIT: true,
      czyVAT: true
    },
    {
      id: 'agg-sale-3',
      data: '2026-03-31',
      numerFaktury: 'SUMA_SPRZEDAZ_M03',
      kontrahent: 'Zbiorcza sprzedaż za Marzec',
      netto: 32000,
      stawkaVat: 23,
      vat: 7360,
      brutto: 39360,
      czyCIT: true,
      czyVAT: true
    },
    {
      id: 'agg-sale-4',
      data: '2026-04-30',
      numerFaktury: 'SUMA_SPRZEDAZ_M04',
      kontrahent: 'Zbiorcza sprzedaż za Kwiecień',
      netto: 35500,
      stawkaVat: 23,
      vat: 8165,
      brutto: 43665,
      czyCIT: true,
      czyVAT: true
    },
    // May sample sales (5 items)
    {
      id: 'sale-may-1',
      data: '2026-05-05',
      numerFaktury: 'FV/2026/05/01',
      kontrahent: 'Przykładowa faktura sprzedaży 1',
      netto: 6500,
      stawkaVat: 23,
      vat: 1495,
      brutto: 7995,
      czyCIT: true,
      czyVAT: true
    },
    {
      id: 'sale-may-2',
      data: '2026-05-10',
      numerFaktury: 'FV/2026/05/02',
      kontrahent: 'Przykładowa faktura sprzedaży 2',
      netto: 8200,
      stawkaVat: 23,
      vat: 1886,
      brutto: 10086,
      czyCIT: true,
      czyVAT: true
    },
    {
      id: 'sale-may-3',
      data: '2026-05-15',
      numerFaktury: 'FV/2026/05/03',
      kontrahent: 'Przykładowa faktura sprzedaży 3',
      netto: 12000,
      stawkaVat: 23,
      vat: 2760,
      brutto: 14760,
      czyCIT: true,
      czyVAT: true
    },
    {
      id: 'sale-may-4',
      data: '2026-05-20',
      numerFaktury: 'FV/2026/05/04',
      kontrahent: 'Przykładowa faktura sprzedaży 4',
      netto: 4500,
      stawkaVat: 23,
      vat: 1035,
      brutto: 5535,
      czyCIT: true,
      czyVAT: true
    },
    {
      id: 'sale-may-5',
      data: '2026-05-25',
      numerFaktury: 'FV/2026/05/05',
      kontrahent: 'Przykładowa faktura sprzedaży 5',
      netto: 9800,
      stawkaVat: 23,
      vat: 2254,
      brutto: 12054,
      czyCIT: true,
      czyVAT: true
    }
  ],
  purchases: [
    // Monthly aggregations (styczeń - kwiecień)
    {
      id: 'agg-purchase-1',
      data: '2026-01-31',
      numerFaktury: 'SUMA_KOSZTY_M01',
      dostawca: 'Zbiorcze koszty za Styczeń',
      kategoria: 'Agregacja',
      netto: 11000,
      stawkaVat: 23,
      vat: 2530,
      brutto: 13530,
      kosztCIT: true,
      odliczenieVat: 100
    },
    {
      id: 'agg-purchase-2',
      data: '2026-02-28',
      numerFaktury: 'SUMA_KOSZTY_M02',
      dostawca: 'Zbiorcze koszty za Luty',
      kategoria: 'Agregacja',
      netto: 13500,
      stawkaVat: 23,
      vat: 3105,
      brutto: 16605,
      kosztCIT: true,
      odliczenieVat: 100
    },
    {
      id: 'agg-purchase-3',
      data: '2026-03-31',
      numerFaktury: 'SUMA_KOSZTY_M03',
      dostawca: 'Zbiorcze koszty za Marzec',
      kategoria: 'Agregacja',
      netto: 15000,
      stawkaVat: 23,
      vat: 3450,
      brutto: 18450,
      kosztCIT: true,
      odliczenieVat: 100
    },
    {
      id: 'agg-purchase-4',
      data: '2026-04-30',
      numerFaktury: 'SUMA_KOSZTY_M04',
      dostawca: 'Zbiorcze koszty za Kwiecień',
      kategoria: 'Agregacja',
      netto: 17200,
      stawkaVat: 23,
      vat: 3956,
      brutto: 21156,
      kosztCIT: true,
      odliczenieVat: 100
    },
    // May sample purchases/costs (5 items)
    {
      id: 'purchase-may-1',
      data: '2026-05-04',
      numerFaktury: 'FV/ZAKUP/05/01',
      dostawca: 'Przykładowy koszt u dostawcy 1',
      kategoria: 'Biuro',
      netto: 1200,
      stawkaVat: 23,
      vat: 276,
      brutto: 1476,
      kosztCIT: true,
      odliczenieVat: 100
    },
    {
      id: 'purchase-may-2',
      data: '2026-05-08',
      numerFaktury: 'FV/ZAKUP/05/02',
      dostawca: 'Przykładowy koszt u dostawcy 2',
      kategoria: 'Pojazdy',
      netto: 500,
      stawkaVat: 23,
      vat: 115,
      brutto: 615,
      kosztCIT: true,
      odliczenieVat: 50
    },
    {
      id: 'purchase-may-3',
      data: '2026-05-12',
      numerFaktury: 'FV/ZAKUP/05/03',
      dostawca: 'Przykładowy koszt u dostawcy 3',
      kategoria: 'Oprogramowanie',
      netto: 1800,
      stawkaVat: 23,
      vat: 414,
      brutto: 2214,
      kosztCIT: true,
      odliczenieVat: 100
    },
    {
      id: 'purchase-may-4',
      data: '2026-05-18',
      numerFaktury: 'FV/ZAKUP/05/04',
      dostawca: 'Przykładowy koszt u dostawcy 4',
      kategoria: 'Telefony',
      netto: 300,
      stawkaVat: 23,
      vat: 69,
      brutto: 369,
      kosztCIT: true,
      odliczenieVat: 100
    },
    {
      id: 'purchase-may-5',
      data: '2026-05-22',
      numerFaktury: 'FV/ZAKUP/05/05',
      dostawca: 'Przykładowy koszt u dostawcy 5',
      kategoria: 'Inne',
      netto: 1500,
      stawkaVat: 23,
      vat: 345,
      brutto: 1845,
      kosztCIT: true,
      odliczenieVat: 100
    }
  ],
  citAdvances: [
    {
      id: 'adv-may-1',
      miesiac: 1, // styczeń
      kwota: 1170,
      dataZaplaty: '2026-02-20',
      notatka: 'Zaliczka CIT spłacona za Styczeń'
    },
    {
      id: 'adv-may-2',
      miesiac: 2, // luty
      kwota: 1350,
      dataZaplaty: '2026-03-20',
      notatka: 'Zaliczka CIT spłacona za Luty'
    },
    {
      id: 'adv-may-3',
      miesiac: 3, // marzec
      kwota: 1530,
      dataZaplaty: '2026-04-20',
      notatka: 'Zaliczka CIT spłacona za Marzec'
    },
    {
      id: 'adv-may-4',
      miesiac: 4, // kwiecień
      kwota: 1647,
      dataZaplaty: '2026-05-20',
      notatka: 'Zaliczka CIT spłacona za Kwiecień'
    }
  ],
  vatRegistry: [
    {
      id: 'vat-reg-1',
      miesiac: 1,
      vatNalezny: 5520,
      vatNaliczony: 2530,
      nadwyzkaZPoprzedniego: 0,
      korekty: 0
    },
    {
      id: 'vat-reg-2',
      miesiac: 2,
      vatNalezny: 6555,
      vatNaliczony: 3105,
      nadwyzkaZPoprzedniego: 0,
      korekty: 0
    },
    {
      id: 'vat-reg-3',
      miesiac: 3,
      vatNalezny: 7360,
      vatNaliczony: 3450,
      nadwyzkaZPoprzedniego: 0,
      korekty: 0
    },
    {
      id: 'vat-reg-4',
      miesiac: 4,
      vatNalezny: 8165,
      vatNaliczony: 3956,
      nadwyzkaZPoprzedniego: 0,
      korekty: 0
    },
    {
      id: 'vat-reg-5',
      miesiac: 5,
      vatNalezny: 9430,
      vatNaliczony: 1162,
      nadwyzkaZPoprzedniego: 0,
      korekty: 0
    }
  ],
  llmConfig: {
    provider: 'gemini',
    apiKey: '',
    model: 'gemini-2.5-flash',
    baseUrl: '',
    isEnabled: false
  }
};

const EMPTY_STATE: AppState = {
  settings: {
    nazwaSpolki: '',
    nip: '',
    stawkaCIT: 9,
    rokPodatkowy: 2026,
    miesiacPodatkowy: 5
  },
  sales: [],
  purchases: [],
  citAdvances: [],
  vatRegistry: [],
  llmConfig: {
    provider: 'gemini',
    apiKey: '',
    model: 'gemini-2.5-flash',
    baseUrl: '',
    isEnabled: false
  }
};

export default function App() {
  const [state, setState] = useState<AppState>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.settings && Array.isArray(parsed.sales)) {
          return parsed as AppState;
        }
      }
      
      const chosen = localStorage.getItem('tax_app_initial_chosen');
      if (chosen === 'empty') {
        return EMPTY_STATE;
      }
    } catch (e) {
      console.warn('Could not read state from localStorage, loading template', e);
    }
    return SAMPLE_STATE;
  });

  const [showLaunchChoices, setShowLaunchChoices] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      const chosen = localStorage.getItem('tax_app_initial_chosen');
      return !saved && !chosen;
    } catch (e) {
      return false;
    }
  });

  const [activeTab, setActiveTab ] = useState<'kpis' | 'yearly_executive' | 'registers' | 'settings_backup'>('kpis');
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [isSavedIndicator, setIsSavedIndicator] = useState(false);
  const [showHelper, setShowHelper] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string>(() => {
    return new Date().toLocaleString('pl-PL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  });

  // Autosave when state changes
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
      setIsSavedIndicator(true);
      setLastSavedTime(new Date().toLocaleString('pl-PL', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }));
      const timer = setTimeout(() => setIsSavedIndicator(false), 1200);
      return () => clearTimeout(timer);
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }
  }, [state]);

  // Handle manual backup import
  const handleStateImport = (importedState: AppState) => {
    setState(importedState);
  };

  // Clear data
  const handleStateClear = () => {
    localStorage.removeItem('tax_app_initial_chosen');
    setShowLaunchChoices(true);
    setState(EMPTY_STATE);
  };

  const handleLlmConfigChange = (newConfig: any) => {
    setState((prev) => ({
      ...prev,
      llmConfig: newConfig
    }));
  };

  // Trigger manual save indicator
  const handleManualSave = () => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
    setIsSavedIndicator(true);
    setLastSavedTime(new Date().toLocaleString('pl-PL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }));
    setTimeout(() => setIsSavedIndicator(false), 2000);
  };

  // State modification events
  const handleSettingsChange = (newSettings: CompanySettings) => {
    setState((prev) => ({
      ...prev,
      settings: newSettings
    }));
  };

  const handleSalesChange = (newSales: SaleTransaction[]) => {
    setState((prev) => ({
      ...prev,
      sales: newSales
    }));
  };

  const handlePurchasesChange = (newPurchases: PurchaseTransaction[]) => {
    setState((prev) => ({
      ...prev,
      purchases: newPurchases
    }));
  };

  const handleAdvancesChange = (newAdvances: CitAdvance[]) => {
    setState((prev) => ({
      ...prev,
      citAdvances: newAdvances
    }));
  };

  const handleVatRegistryChange = (newRegistry: VatRegistry[]) => {
    setState((prev) => ({
      ...prev,
      vatRegistry: newRegistry
    }));
  };

  // EXCEL IMPORT COMPLETION EVENT
  const handleExcelImportCompleted = (
    importedData: {
      sales: SaleTransaction[];
      purchases: PurchaseTransaction[];
      citAdvances: CitAdvance[];
      vatRegistry: VatRegistry[];
    },
    overwriteStrategy: 'append' | 'overwrite' | 'skip_duplicates' | 'separate_version'
  ) => {
    const { settings } = state;
    const mActive = settings.miesiacPodatkowy;

    setState((prev) => {
      let salesCombined = [...prev.sales];
      let purchasesCombined = [...prev.purchases];
      let advancesCombined = [...prev.citAdvances];
      let vatCombined = [...prev.vatRegistry];

      // Strategy: overwrite -> purge old data for THIS month first
      if (overwriteStrategy === 'overwrite') {
        const checkInMonth = (dateStr: string) => {
          if (!dateStr) return false;
          const parts = dateStr.split('-');
          if (parts.length >= 2) {
            return parseInt(parts[1], 10) === mActive && parseInt(parts[0], 10) === settings.rokPodatkowy;
          }
          return false;
        };

        salesCombined = salesCombined.filter(s => !checkInMonth(s.data));
        purchasesCombined = purchasesCombined.filter(p => !checkInMonth(p.data));
        advancesCombined = advancesCombined.filter(a => a.miesiac !== mActive);
        vatCombined = vatCombined.filter(v => v.miesiac !== mActive);
      }

      // Strategy: skip_duplicates -> match by Invoice Numbers
      if (overwriteStrategy === 'skip_duplicates') {
        const existingSalesInvoices = new Set(prev.sales.map(s => s.numerFaktury.toLowerCase().trim()));
        const existingPurchasesInvoices = new Set(prev.purchases.map(p => p.numerFaktury.toLowerCase().trim()));

        const filteredImportedSales = importedData.sales.filter(s => !existingSalesInvoices.has(s.numerFaktury.toLowerCase().trim()));
        const filteredImportedPurchases = importedData.purchases.filter(p => !existingPurchasesInvoices.has(p.numerFaktury.toLowerCase().trim()));

        salesCombined = [...filteredImportedSales, ...salesCombined];
        purchasesCombined = [...filteredImportedPurchases, ...purchasesCombined];
      } else {
        // Appends or separate_version
        salesCombined = [...importedData.sales, ...salesCombined];
        purchasesCombined = [...importedData.purchases, ...purchasesCombined];
      }

      // Merge advances and VAT parameters
      importedData.citAdvances.forEach((adv) => {
        const existsIdx = advancesCombined.findIndex(a => a.miesiac === adv.miesiac);
        if (existsIdx !== -1 && overwriteStrategy !== 'append') {
          // Replace
          advancesCombined[existsIdx] = adv;
        } else {
          advancesCombined.push(adv);
        }
      });

      importedData.vatRegistry.forEach((vReg) => {
        const existsIdx = vatCombined.findIndex(v => v.miesiac === vReg.miesiac);
        if (existsIdx !== -1 && overwriteStrategy !== 'append') {
          vatCombined[existsIdx] = vReg;
        } else {
          vatCombined.push(vReg);
        }
      });

      return {
        ...prev,
        sales: salesCombined,
        purchases: purchasesCombined,
        citAdvances: advancesCombined,
        vatRegistry: vatCombined
      };
    });

    setImportModalOpen(false);
  };

  const polishMonthsNames = [
    'STYCZEŃ', 'LUTY', 'MARZEC', 'KWIECIEŃ', 'MAJ', 'CZERWIEC',
    'LIPIEC', 'SIERPIEŃ', 'WRZESIEŃ', 'PAŹDZIERNIK', 'LISTOPAD', 'GRUDZIEŃ'
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans leading-normal selection:bg-indigo-500/15" id="tax-app-root">
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Unified Top Meta & Settings Card */}
        <div className="bg-white rounded-3xl shadow-xs border border-slate-200 p-6 space-y-6" id="top-unified-control-panel">
          
          {/* Bento-Styled Premium Header Inner Block */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4" id="global-header">
            <div className="flex flex-wrap items-center gap-4 md:gap-6 flex-1">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-display font-bold text-2xl shadow-md shadow-indigo-100 shrink-0">
                  Σ
                </div>
                <div>
                  <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest leading-none font-display">
                    Inteligentny Symulator Podatkowy
                  </span>
                  <h1 className="text-xl font-bold text-slate-800 tracking-tight flex flex-wrap items-center gap-2 mt-0.5">
                    {state.settings.nazwaSpolki || 'Kalkulator CIT & VAT'}
                    {state.settings.nip && (
                      <span className="text-xs bg-slate-100 font-mono text-slate-600 px-2 py-0.5 rounded font-medium border border-slate-200">
                        NIP: {state.settings.nip}
                      </span>
                    )}
                  </h1>
                </div>
              </div>

              {/* Help assistant button in the gap pointed to by the red arrow */}
              <button
                onClick={() => setShowHelper(!showHelper)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100/80 text-[11px] font-bold text-indigo-800 transition-all cursor-pointer shadow-xs select-none uppercase tracking-wider"
              >
                <HelpCircle className="w-4 h-4 text-indigo-600" />
                CENTRUM POMOCY
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-4 md:gap-6 self-stretch md:self-auto justify-between md:justify-end">
              <div className="flex flex-col items-start md:items-end">
                <div className="flex items-center gap-1.5 text-emerald-600 font-semibold text-xs uppercase tracking-wider">
                  <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
                  {isSavedIndicator ? 'Zapisywanie...' : 'Dane zapisane lokalnie'}
                </div>
                <span className="text-[10px] text-slate-400 mt-0.5 font-mono">
                  Ostatni autozapis: {lastSavedTime}
                </span>
              </div>
              
              <div className="h-8 w-px bg-slate-200 hidden sm:block"></div>

              {/* Quick Actions & Date Indicator */}
              <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
                <span className="px-3 py-1 text-xs font-bold bg-white text-indigo-700 rounded-lg shadow-xs font-display">
                  {polishMonthsNames[state.settings.miesiacPodatkowy - 1]} {state.settings.rokPodatkowy}
                </span>
                <button
                  onClick={() => setImportModalOpen(true)}
                  className="px-3 py-1 text-xs font-semibold text-slate-600 hover:text-indigo-600 flex items-center gap-1.5 transition-colors cursor-pointer"
                  id="header-import-excel-btn"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  Importuj Excel
                </button>
              </div>
            </div>
          </div>

          {/* Embedded Company Settings Component */}
          <CompanySettingsComponent
            settings={state.settings}
            onSettingsChange={handleSettingsChange}
            embedded={true}
            showHelper={showHelper}
            onShowHelperChange={setShowHelper}
          />
        </div>

        {/* Bento Navigation Pills */}
        <div className="flex flex-wrap bg-slate-100 p-1.5 rounded-2xl border border-slate-200 gap-1" id="main-navigation-tabs">
          {[
            { id: 'kpis', label: 'Tablica Wyników i Symulacje', icon: Layers },
            { id: 'yearly_executive', label: 'Strategiczny Bilans Roczny (McKinsey)', icon: Layers2 },
            { id: 'registers', label: 'Księgi i Rejestry Transakcji', icon: FileText },
            { id: 'settings_backup', label: 'Magazyn i Kopia Zapasowa', icon: Database },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 sm:px-5 py-3 text-xs font-bold rounded-xl transition-all cursor-pointer relative ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                {tab.id === 'yearly_executive' ? (
                  <Sparkles className={`w-4 h-4 shrink-0 ${isActive ? 'text-amber-300 animate-pulse' : 'text-indigo-650 text-indigo-500'}`} />
                ) : (
                  <Icon className="w-4 h-4 shrink-0" />
                )}
                <span>{tab.label}</span>
                {tab.id === 'yearly_executive' && (
                  <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase font-mono tracking-wider flex items-center gap-0.5 ${
                    isActive 
                      ? 'bg-indigo-500 text-white border border-indigo-400' 
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-100/60'
                  }`}>
                    <span>Smart Audit</span>
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Dynamic View Content switcher */}
        <div className="space-y-6" id="workspace-content-pane">
          {activeTab === 'kpis' && (
            <TaxDashboard state={state} />
          )}

          {activeTab === 'yearly_executive' && (
            <McKinseyDashboard state={state} />
          )}

          {activeTab === 'registers' && (
            <TransactionsManager
              state={state}
              onSalesChange={handleSalesChange}
              onPurchasesChange={handlePurchasesChange}
              onAdvancesChange={handleAdvancesChange}
              onVatRegistryChange={handleVatRegistryChange}
            />
          )}

          {activeTab === 'settings_backup' && (
            <StorageControls
              state={state}
              onStateImport={handleStateImport}
              onStateClear={handleStateClear}
              onManualSave={handleManualSave}
              onLlmConfigChange={handleLlmConfigChange}
            />
          )}
        </div>

        {/* Local storage banner transformed into Bento Alert block (Moved to bottom) */}
        <div className="bg-amber-50/50 border border-amber-150 p-5 rounded-2xl flex items-start gap-3.5 mt-8 transition-all hover:bg-amber-50/70" id="local-disclaimer-box">
          <div className="w-10 h-10 bg-amber-400 rounded-xl flex items-center justify-center text-xl text-amber-900 shadow-xs shrink-0 select-none">
            ⚠️
          </div>
          <div>
            <h4 className="font-bold text-amber-900 text-xs leading-none">Zasada Przechowywania: Pamięć Podręczna</h4>
            <p className="text-[11px] text-amber-800 mt-1.5 leading-relaxed opacity-95">
              Twoje dane są bezpiecznie odizolowane i przechowywane <b>wyłącznie w Twojej bieżącej przeglądarce</b>. Wyczyszczenie plików cookie lub zmiana urządzenia spowoduje usunięcie postępów. Aby uchronić się przed utratą danych, regularnie eksportuj i pobieraj kopie zapasowe w bocznej sekcji <span className="font-semibold italic">Magazyn i Kopia Zapasowa</span>.
            </p>
          </div>
        </div>

        {/* Clean minimal footer */}
        <footer className="pt-8 border-t border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div className="font-display">
            &copy; 2026 Symulator Podatkowy Sp. z o.o. • Autonomiczna Enklawa Podatkowa v2.4.0
          </div>
        </footer>
      </div>

      {/* Excel Import Dialog Modal */}
      {importModalOpen && (
        <ExcelImportModal
          state={state}
          onClose={() => setImportModalOpen(false)}
          onImportCompleted={handleExcelImportCompleted}
        />
      )}

      {/* Wybór Trybu Uruchomienia (Launch Mode Dialog Selector) */}
      {showLaunchChoices && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 md:p-8 max-w-xl w-full text-center space-y-6 animate-fade-in">
            <div className="mx-auto w-14 h-14 bg-indigo-50 border border-indigo-150 rounded-2xl flex items-center justify-center text-indigo-600">
              <Sparkles className="w-7 h-7 text-indigo-600 animate-pulse" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight font-display">
                Witaj w Inteligentnym Symulatorze Podatkowym CIT/VAT
              </h2>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                Wybierz preferowany tryb startu systemu, aby spersonalizować swój pulpit finansowy. Wybór możesz zresetować w dowolnym momencie w zakładce kopii zapasowej.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 text-left">
              {/* Option 1: Tryb Demo */}
              <button
                type="button"
                onClick={() => {
                  try {
                    localStorage.setItem('tax_app_initial_chosen', 'demo');
                    setState(SAMPLE_STATE);
                    setShowLaunchChoices(false);
                  } catch (e) {
                    console.error(e);
                  }
                }}
                className="group p-4 bg-indigo-50/60 hover:bg-indigo-50 border border-indigo-150/70 hover:border-indigo-300 rounded-2xl transition-all flex items-start gap-4 cursor-pointer text-left focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              >
                <div className="p-2.5 bg-white rounded-xl text-indigo-600 shadow-sm shrink-0 group-hover:scale-105 transition-transform">
                  <Layers className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-950 text-xs flex items-center gap-1.5">
                    📊 Zasilony Tryb Demonstracyjny
                    <span className="text-[9px] bg-indigo-600 text-white px-2 py-0.5 rounded-full font-bold">Rekomendowany</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    Szybki start z gotowym zestawem przykładowych faktur sprzedaży i kosztów rocznych. Umożliwi Ci to natychmiastowe przetestowanie wykresów McKinsey, wskaźnika CIT oraz Smart Audytu.
                  </p>
                </div>
              </button>

              {/* Option 2: Czysta Baza */}
              <button
                type="button"
                onClick={() => {
                  try {
                    localStorage.setItem('tax_app_initial_chosen', 'empty');
                    setState(EMPTY_STATE);
                    setShowLaunchChoices(false);
                  } catch (e) {
                    console.error(e);
                  }
                }}
                className="group p-4 hover:bg-slate-50 border border-slate-200 hover:border-slate-350 rounded-2xl transition-all flex items-start gap-4 cursor-pointer text-left focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              >
                <div className="p-2.5 bg-slate-100 rounded-xl text-slate-600 shadow-sm shrink-0 group-hover:scale-105 transition-transform">
                  <FileSpreadsheet className="w-5 h-5 text-slate-500" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-950 text-xs">
                    🆕 Czysty Projekt (Zacznij od zera)
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    Uruchamia całkowicie czysty arkusz kalkulacyjny bez żadnych wpisów. Idealne, aby szybko zacząć wpisywać prawdziwe faktury swojej firmy lub wczytać dane z własnego pliku Excel.
                  </p>
                </div>
              </button>
            </div>

            <p className="text-[10px] text-slate-400 italic font-medium leading-normal">
              🔒 Poufność: Niezależnie od wybranego trybu, cała baza danych oraz klucze API pozostają w 100% lokalnie w przeglądarce i nie są wysyłane na żaden zewnętrzny serwer.
            </p>
          </div>
        </div>
      )}

    </div>
  );
}
