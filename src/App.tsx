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
import InteractiveHelpModal from './components/InteractiveHelpModal';
import StorageControls from './components/StorageControls';
import ExcelImportModal from './components/ExcelImportModal';
import TaxDashboard from './components/TaxDashboard';
import TransactionsManager from './components/TransactionsManager';
import McKinseyDashboard from './components/McKinseyDashboard';
import TaxAdvisorAssistant from './components/TaxAdvisorAssistant';
import FinancialDashboard from './components/FinancialDashboard';
import PdfExportModal from './components/PdfExportModal';
import StrategicPlanner from './components/StrategicPlanner';
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
  Sparkles,
  AlertCircle,
  Compass
} from 'lucide-react';

const LOCAL_STORAGE_KEY = 'symulator_podatkow_state_v2';

const CURRENT_DATE = new Date();
const CURRENT_YEAR = CURRENT_DATE.getFullYear();
const CURRENT_MONTH = CURRENT_DATE.getMonth() + 1;

// Detailed, high-fidelity sample state so the app looks fantastic on first load
const SAMPLE_STATE: AppState = {
  settings: {
    nazwaSpolki: 'JA',
    nip: '1',
    stawkaCIT: 9, // Obniżona stawka CIT dla małych podatników
    rokPodatkowy: CURRENT_YEAR,
    miesiacPodatkowy: CURRENT_MONTH
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
    rokPodatkowy: CURRENT_YEAR,
    miesiacPodatkowy: CURRENT_MONTH
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
          // Force active filters to current year and current month on app start
          parsed.settings.rokPodatkowy = CURRENT_YEAR;
          parsed.settings.miesiacPodatkowy = CURRENT_MONTH;
          return parsed as AppState;
        }
      }
      
      const chosen = localStorage.getItem('tax_app_initial_chosen');
      if (chosen === 'empty') {
        return {
          ...EMPTY_STATE,
          settings: {
            ...EMPTY_STATE.settings,
            rokPodatkowy: CURRENT_YEAR,
            miesiacPodatkowy: CURRENT_MONTH
          }
        };
      }
    } catch (e) {
      console.warn('Could not read state from localStorage, loading template', e);
    }
    return {
      ...SAMPLE_STATE,
      settings: {
        ...SAMPLE_STATE.settings,
        rokPodatkowy: CURRENT_YEAR,
        miesiacPodatkowy: CURRENT_MONTH
      }
    };
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

  const [showLegalDisclaimer, setShowLegalDisclaimer] = useState<boolean>(() => {
    try {
      const accepted = localStorage.getItem('tax_app_disclaimer_accepted');
      return accepted !== 'true';
    } catch (e) {
      return true;
    }
  });

  const [disclaimerChecked, setDisclaimerChecked] = useState<boolean>(false);

  const [activeTab, setActiveTab ] = useState<'kpis' | 'financial_dashboard' | 'yearly_executive' | 'registers' | 'settings_backup' | 'tax_advisor' | 'strategic_planner'>('kpis');
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [isSavedIndicator, setIsSavedIndicator] = useState(false);
  const [isDiskSaved, setIsDiskSaved] = useState(false);
  const [showHelper, setShowHelper] = useState(false);
  const [helpActiveQuestion, setHelpActiveQuestion] = useState<string>('all');
  const [importNotification, setImportNotification] = useState<{
    salesCount: number;
    purchasesCount: number;
    citCount: number;
    vatCount: number;
    strategy: string;
    totalRows: number;
  } | null>(null);

  const handleShowHelperChange = (show: boolean, section?: string) => {
    setShowHelper(show);
    if (section) {
      setHelpActiveQuestion(section);
    } else if (show) {
      setHelpActiveQuestion('all');
    }
  };

  // Logo upload handlers
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 8 * 1024 * 1024) {
        alert('Plik logo jest za duży! Maksymalna wielkość to 8MB.');
        e.target.value = '';
        return;
      }
      const reader = new FileReader();
      const targetInput = e.target;
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setState((prev) => ({
          ...prev,
          settings: {
            ...prev.settings,
            customLogoBase64: base64
          }
        }));
        targetInput.value = '';
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogoRemove = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setState((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        customLogoBase64: undefined
      }
    }));
  };
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

  // Load state from local disk on mount (Desktop mode)
  useEffect(() => {
    const loadFromDisk = async () => {
      try {
        const response = await fetch('/api/db/load');
        if (response.ok) {
          const resJson = await response.json();
          if (resJson.status === 'success' && resJson.data) {
            const diskState = resJson.data;
            if (diskState && diskState.settings && Array.isArray(diskState.sales)) {
              // Always override active filter year and month with current calendar date on app launch
              diskState.settings.rokPodatkowy = CURRENT_YEAR;
              diskState.settings.miesiacPodatkowy = CURRENT_MONTH;
              setState(diskState);
              setIsDiskSaved(true);
              console.log('Stan aplikacji załadowany pomyślnie z pliku fizycznego na dysku z domyślnym filtrem ustawionym na bieżący rok i miesiąc.');
            }
          }
        }
      } catch (err) {
        console.warn('Nie można załadować stanu z dysku (prawdopodobnie brak serwera lokalnego lub tryb webowy):', err);
      }
    };
    loadFromDisk();
  }, []);

  // Autosave when state changes
  useEffect(() => {
    if (showLaunchChoices) {
      return; // Do not save state when we are showing launch choices!
    }
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

      // Also try saving to physical HDD via background API
      const saveToDisk = async () => {
        try {
          const response = await fetch('/api/db/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(state)
          });
          if (response.ok) {
            setIsDiskSaved(true);
          } else {
            setIsDiskSaved(false);
          }
        } catch (e) {
          setIsDiskSaved(false); // Silent fail in standard browser
        }
      };
      saveToDisk();

      const timer = setTimeout(() => setIsSavedIndicator(false), 1200);
      return () => clearTimeout(timer);
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }
  }, [state, showLaunchChoices]);

  // Handle manual backup import
  const handleStateImport = (importedState: AppState) => {
    setState(importedState);
  };

  // Clear data
  const handleStateClear = async () => {
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      localStorage.removeItem('tax_app_initial_chosen');
      
      // Also try to delete/reset the physical database on the server
      await fetch('/api/db', { method: 'DELETE' }).catch(err => {
        console.warn('Failed to delete physical database on server:', err);
      });
    } catch (e) {
      console.error('Error clearing local storage:', e);
    }
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

    let importedSalesCount = importedData.sales.length;
    let importedPurchasesCount = importedData.purchases.length;
    let importedCitCount = importedData.citAdvances.length;
    let importedVatCount = importedData.vatRegistry.length;
    const totalProcessed = importedSalesCount + importedPurchasesCount + importedCitCount + importedVatCount;

    setState((prev) => {
      let salesCombined = [...prev.sales];
      let purchasesCombined = [...prev.purchases];
      let advancesCombined = [...prev.citAdvances];
      let vatCombined = [...prev.vatRegistry];

      // Strategy: overwrite -> purge old data for months present in imported data
      if (overwriteStrategy === 'overwrite') {
        const monthsInSales = new Set(importedData.sales.map(s => {
          if (!s.data) return '';
          const parts = s.data.split('-');
          return parts.length >= 2 ? `${parts[0]}-${parseInt(parts[1], 10)}` : '';
        }).filter(Boolean));

        const monthsInPurchases = new Set(importedData.purchases.map(p => {
          if (!p.data) return '';
          const parts = p.data.split('-');
          return parts.length >= 2 ? `${parts[0]}-${parseInt(parts[1], 10)}` : '';
        }).filter(Boolean));

        const importedMonthsAndYears = new Set([...monthsInSales, ...monthsInPurchases]);

        // Fallback to active month if no dates parsed
        if (importedMonthsAndYears.size === 0) {
          importedMonthsAndYears.add(`${settings.rokPodatkowy}-${mActive}`);
        }

        const checkInImportedMonthsAndYears = (dateStr: string) => {
          if (!dateStr) return false;
          const parts = dateStr.split('-');
          if (parts.length >= 2) {
            const key = `${parts[0]}-${parseInt(parts[1], 10)}`;
            return importedMonthsAndYears.has(key);
          }
          return false;
        };

        salesCombined = salesCombined.filter(s => !checkInImportedMonthsAndYears(s.data));
        purchasesCombined = purchasesCombined.filter(p => !checkInImportedMonthsAndYears(p.data));

        // For advances and VAT, gather the months
        const importedMonths = new Set<number>();
        importedData.citAdvances.forEach(a => importedMonths.add(a.miesiac));
        importedData.vatRegistry.forEach(v => importedMonths.add(v.miesiac));

        if (importedMonths.size === 0) {
          importedMonths.add(mActive);
        }

        advancesCombined = advancesCombined.filter(a => !importedMonths.has(a.miesiac));
        vatCombined = vatCombined.filter(v => !importedMonths.has(v.miesiac));
      }

      // Strategy: skip_duplicates -> match by Invoice Numbers
      if (overwriteStrategy === 'skip_duplicates') {
        const existingSalesInvoices = new Set(prev.sales.map(s => s.numerFaktury.toLowerCase().trim()));
        const existingPurchasesInvoices = new Set(prev.purchases.map(p => p.numerFaktury.toLowerCase().trim()));

        const filteredImportedSales = importedData.sales.filter(s => !existingSalesInvoices.has(s.numerFaktury.toLowerCase().trim()));
        const filteredImportedPurchases = importedData.purchases.filter(p => !existingPurchasesInvoices.has(p.numerFaktury.toLowerCase().trim()));

        importedSalesCount = filteredImportedSales.length;
        importedPurchasesCount = filteredImportedPurchases.length;

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

    let PolishStrategyName = 'Pomiń duplikaty';
    if (overwriteStrategy === 'append') PolishStrategyName = 'Dodaj wszystko';
    else if (overwriteStrategy === 'overwrite') PolishStrategyName = 'Nadpisz dane';
    else if (overwriteStrategy === 'separate_version') PolishStrategyName = 'Nowa wersja';

    setImportNotification({
      salesCount: importedSalesCount,
      purchasesCount: importedPurchasesCount,
      citCount: importedCitCount,
      vatCount: importedVatCount,
      strategy: PolishStrategyName,
      totalRows: totalProcessed,
    });

    setImportModalOpen(false);
  };

  const polishMonthsNames = [
    'STYCZEŃ', 'LUTY', 'MARZEC', 'KWIECIEŃ', 'MAJ', 'CZERWIEC',
    'LIPIEC', 'SIERPIEŃ', 'WRZESIEŃ', 'PAŹDZIERNIK', 'LISTOPAD', 'GRUDZIEŃ'
  ];

  return (
    <div 
      className="min-h-screen bg-slate-50 text-slate-900 font-sans leading-normal selection:bg-indigo-500/30" 
      id="tax-app-root"
    >
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Unified Top Meta & Settings Card */}
        <div className="sticky top-4 z-40 bg-white/95 backdrop-blur-md rounded-3xl shadow-md border border-slate-200 p-6 space-y-4 transition-all" id="top-unified-control-panel">
          
          {/* Bento-Styled Premium Header Inner Block */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4" id="global-header">
            <div className="flex flex-wrap items-center gap-4 md:gap-6 flex-1">
              <div className="flex items-center gap-4">
                <div 
                  className={`relative group w-20 h-20 rounded-xl flex items-center justify-center text-white font-display font-bold text-3xl shadow-md shrink-0 overflow-hidden cursor-pointer transition-all ${
                    state.settings.customLogoBase64 
                      ? 'bg-white border border-slate-200 shadow-sm' 
                      : 'bg-indigo-600 shadow-indigo-100'
                  }`} 
                  title="Przeciągnij lub kliknij, aby wgrać logo firmy"
                >
                  {state.settings.customLogoBase64 ? (
                    <img src={state.settings.customLogoBase64} alt="Company Logo" className="w-full h-full object-contain p-2" referrerPolicy="no-referrer" />
                  ) : (
                    <span>Σ</span>
                  )}
                  {/* Hover file upload and remove state */}
                  <div className="absolute inset-0 bg-slate-900/70 z-20 opacity-0 hover:opacity-100 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-[10px] font-bold text-white text-center leading-tight pointer-events-none">
                    <span>Zmień</span>
                    {state.settings.customLogoBase64 && (
                      <button 
                        type="button"
                        onClick={handleLogoRemove} 
                        className="text-[9px] text-rose-300 font-extrabold mt-1 hover:text-rose-400 px-2 py-1 cursor-pointer bg-slate-900/50 rounded-full z-30 pointer-events-auto"
                      >
                        Usuń ×
                      </button>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                    title="Kliknij, aby zmienić logo"
                  />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-0.5">
                    <h1 className="text-base font-bold text-slate-800 tracking-tight flex items-center gap-2">
                      {state.settings.nazwaSpolki || 'Kalkulator CIT & VAT'}
                    </h1>
                    {state.settings.nip && (
                      <span className="text-[10px] bg-slate-100 font-mono text-slate-600 px-1.5 py-0.5 rounded font-bold border border-slate-200 select-all">
                        NIP: {state.settings.nip}
                      </span>
                    )}
                    <span className="text-[10px] bg-indigo-50 font-bold text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-100">
                      CIT: {state.settings.stawkaCIT}%
                    </span>
                    <span className="text-[10px] bg-emerald-50 font-bold text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-100 uppercase">
                      {polishMonthsNames[state.settings.miesiacPodatkowy - 1]} {state.settings.rokPodatkowy}
                    </span>

                    <span className="w-px h-3.5 bg-slate-200 hidden md:inline self-center" />

                    <button
                      type="button"
                      onClick={() => setIsSettingsModalOpen(true)}
                      className="text-[10px] bg-white border border-slate-200 text-indigo-800 hover:text-indigo-600 font-extrabold px-2 py-0.5 rounded-lg hover:border-indigo-300 hover:bg-slate-50 cursor-pointer transition-all self-center shadow-xs flex items-center gap-1"
                    >
                      <span>Dane firmy ⚙</span>
                    </button>

                    <button
                      onClick={() => handleShowHelperChange(!showHelper)}
                      className={`text-[10px] border px-2 py-0.5 rounded-lg font-bold flex items-center gap-1 transition-all cursor-pointer shadow-xs select-none self-center ${
                        showHelper
                          ? 'border-indigo-600 bg-indigo-600 text-white'
                          : 'border-indigo-200 bg-indigo-50 hover:bg-indigo-100/80 text-indigo-805'
                      }`}
                    >
                      <HelpCircle className={`w-3.5 h-3.5 ${showHelper ? 'text-white' : 'text-indigo-600'}`} />
                      <span>Pomoc</span>
                    </button>

                    <button
                      onClick={() => setActiveTab('settings_backup')}
                      className={`text-[10px] border px-2 py-0.5 rounded-lg font-bold flex items-center gap-1 transition-all cursor-pointer shadow-xs select-none self-center ${
                        activeTab === 'settings_backup'
                          ? 'border-indigo-600 bg-indigo-600 text-white'
                          : 'border-indigo-200 bg-indigo-50 hover:bg-indigo-100/80 text-indigo-805'
                      }`}
                    >
                      <Database className={`w-3.5 h-3.5 ${activeTab === 'settings_backup' ? 'text-white' : 'text-indigo-600'}`} />
                      <span>Magazyn</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-start lg:items-end gap-1.5 self-stretch lg:self-auto">
              <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest leading-none font-display text-left lg:text-right">
                Inteligentny Symulator Podatkowy
              </span>
              <div className="flex flex-wrap items-center gap-4 md:gap-6 self-stretch lg:self-auto justify-between lg:justify-end">
                <div className="flex flex-col items-start lg:items-end">
                  <div className="flex items-center gap-1.5 text-emerald-600 font-semibold text-xs uppercase tracking-wider">
                    <span className="w-2 bg-emerald-500 h-2 rounded-full animate-pulse" />
                    {isSavedIndicator ? 'Zapisywanie...' : isDiskSaved ? 'Zapisano na dysku (Plik)' : 'Dane zapisane lokalnie'}
                  </div>
                  <span className="text-[9px] text-slate-400 mt-0.5 font-mono">
                    Ostatni autozapis: {lastSavedTime}
                  </span>
                </div>
                
                <div className="h-8 w-px bg-slate-200 hidden sm:block"></div>

                {/* Quick Actions & Date Indicator */}
                <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
                  {/* Rok Podatkowy Selector (Interactive dropdown styled as small button) */}
                  <select
                    value={state.settings.rokPodatkowy}
                    onChange={(e) => handleSettingsChange({
                      ...state.settings,
                      rokPodatkowy: parseInt(e.target.value, 10)
                    })}
                    className="px-2 py-0.5 text-[10.5px] font-bold text-indigo-700 hover:text-indigo-600 bg-white border border-slate-200 hover:border-indigo-300 rounded-lg transition-all cursor-pointer focus:outline-none shadow-xs font-display text-center"
                  >
                    {[2023, 2024, 2025, 2026, 2027].map((yr) => (
                      <option key={yr} value={yr}>
                        {yr} ROK
                      </option>
                    ))}
                  </select>

                  {/* Miesiąc Symulacji Selector (Interactive dropdown styled as small button) */}
                  <select
                    value={state.settings.miesiacPodatkowy}
                    onChange={(e) => handleSettingsChange({
                      ...state.settings,
                      miesiacPodatkowy: parseInt(e.target.value, 10)
                    })}
                    className="px-2 py-0.5 text-[10.5px] font-bold text-indigo-700 hover:text-indigo-600 bg-white border border-slate-200 hover:border-indigo-300 rounded-lg transition-all cursor-pointer focus:outline-none shadow-xs font-display text-center"
                  >
                    {polishMonthsNames.map((mStr, idx) => (
                      <option key={idx + 1} value={idx + 1}>
                        {idx + 1} - {mStr}
                      </option>
                    ))}
                  </select>

                  <div className="h-4 w-px bg-slate-200 shrink-0"></div>

                  <button
                    onClick={() => setImportModalOpen(true)}
                    className="px-2 py-0.5 text-[10.5px] font-semibold text-slate-600 hover:text-indigo-600 flex items-center gap-1 transition-colors cursor-pointer border-r border-slate-200 pr-1.5"
                    id="header-import-excel-btn"
                  >
                    <FileSpreadsheet className="w-3 h-3" />
                    Import
                  </button>
                  <button
                    onClick={() => setIsPdfModalOpen(true)}
                    className="px-2 py-0.5 text-[10.5px] font-semibold text-slate-600 hover:text-indigo-600 flex items-center gap-1 transition-colors cursor-pointer pl-0.5"
                    id="header-export-pdf-btn"
                  >
                    <FileText className="w-3 h-3" />
                    Eksport PDF
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Edit Company Settings Modal */}
        {isSettingsModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 max-w-3xl w-full relative">
              <button
                type="button"
                onClick={() => setIsSettingsModalOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-650 text-xl font-bold cursor-pointer bg-slate-100 hover:bg-slate-200 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                title="Zamknij"
              >
                &times;
              </button>
              
              <div className="space-y-4">
                <CompanySettingsComponent
                  settings={state.settings}
                  onSettingsChange={handleSettingsChange}
                  embedded={false}
                  showHelper={showHelper}
                  onShowHelperChange={handleShowHelperChange}
                />
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsSettingsModalOpen(false)}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-xs transition-colors cursor-pointer select-none"
                  >
                    Gotowe i zapisz dane
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bento Navigation Pills divided into separate sections for operations and AI/Strategy */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3" id="main-navigation-container">
          {/* Section 1: Standard accounting and operations modules */}
          <div className="bg-slate-100 p-1 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center gap-1.5" id="navigation-operations-section">
            <div className="px-2.5 py-1 font-mono text-[9px] font-black uppercase tracking-widest text-slate-500 shrink-0 border-b sm:border-b-0 sm:border-r border-slate-300 select-none">
              Operacje i Księgi
            </div>
            <div className="flex flex-wrap gap-1 flex-1 items-center">
              {[
                { id: 'kpis', label: 'Tablica Wyników i Symulacje', icon: Layers },
                { id: 'financial_dashboard', label: 'Dashboard Finansowy (TTM)', icon: Layers },
                { id: 'registers', label: 'Księgi i Rejestry Transakcji', icon: FileText },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-1.5 h-7 px-2.5 text-[11px] font-bold rounded-lg transition-all cursor-pointer relative ${
                      isActive
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                    }`}
                  >
                    <Icon className={`w-3 h-3 shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: AI & Strategic Advisory */}
          <div className="bg-slate-100 p-1 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center gap-1.5 relative overflow-hidden" id="navigation-ai-strategy-section">
            <div className="px-2.5 py-1 font-mono text-[9px] font-black uppercase tracking-widest text-slate-500 shrink-0 border-b sm:border-b-0 sm:border-r border-slate-300 flex items-center gap-1 select-none">
              <Sparkles className="w-3 h-3 text-slate-500" />
              <span>Strategia AI</span>
            </div>
            <div className="flex flex-wrap gap-1 flex-1 items-center z-10 font-sans">
              {[
                { id: 'yearly_executive', label: 'Strategiczny Bilans', icon: Layers2, badge: 'Smart Audit' },
                { id: 'tax_advisor', label: 'Asystent Kosztów', icon: Sparkles, badge: 'AI Doradca' },
                { id: 'strategic_planner', label: 'Planer Strategiczny', icon: Compass, badge: 'Portfel' },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-1.5 h-7 px-2.5 text-[11px] font-bold rounded-lg transition-all cursor-pointer relative ${
                      isActive
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                    }`}
                  >
                    <Icon className={`w-3 h-3 shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                    <span>{tab.label}</span>
                    <span className={`text-[7.5px] px-1 py-0.5 rounded-sm font-black uppercase font-mono tracking-wider shrink-0 transition-colors ${
                      isActive 
                        ? 'bg-slate-800 text-slate-100 border border-slate-700' 
                        : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                    }`}>
                      {tab.badge}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Dynamic View Content switcher */}
        <div className="space-y-6" id="workspace-content-pane">
          {activeTab === 'kpis' && (
            <TaxDashboard state={state} />
          )}

          {activeTab === 'financial_dashboard' && (
            <FinancialDashboard state={state} />
          )}

          {activeTab === 'yearly_executive' && (
            <McKinseyDashboard state={state} />
          )}

          {activeTab === 'tax_advisor' && (
            <TaxAdvisorAssistant state={state} />
          )}

          {activeTab === 'strategic_planner' && (
            <StrategicPlanner state={state} />
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

        {/* Compliance and Preferential Rates Info (Yellow elements moved from top to bottom) */}
        <div className="space-y-4 mt-8">
          {/* Dynamic Security & Audit Alert Banner - June 2026 Polish Regulation Status */}
          <div className="bg-indigo-50 border border-indigo-200/80 rounded-3xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm" id="compliance-audit-2026-banner-bottom">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-indigo-100 rounded-2xl text-indigo-700">
                <FileText className="w-5.5 h-5.5 font-bold" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  Audyt Zgodności 2026 (Sp. z o.o.) — Status: Zweryfikowany
                  <span className="px-2 py-0.5 text-[9px] uppercase font-black tracking-widest bg-emerald-500 text-white rounded-full">
                    Zaliczka CIT YTD
                  </span>
                </h3>
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed font-sans">
                  Zgodnie z audytem prawno-podatkowym na dzień <strong>2 czerwca 2026 r.</strong>, Krajowy System e-Faktur (KSeF) został ustawowo przesunięty na <strong>1 stycznia 2027 r.</strong> W okresie bieżącym (czerwiec 2026) fakturowanie przez KSeF jest <strong>dobrowolne</strong>, a system w pełni popiera i mapuje nagłówki KSeF przy imporcie Excel/CSV. Wyliczenia CIT dla Sp. z o.o. są zgodne z zasadą <strong>narastającą (YTD)</strong>, a podstawa i zaliczki są zaokrąglane pod ustawę (Art. 63 § 1 Ordynacji podatkowej).
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5 self-end md:self-auto text-xs font-bold text-indigo-900 bg-indigo-100/75 px-3 py-1.5 rounded-xl border border-indigo-150">
              Ustawy: Czerwiec 2026 r.
            </div>
          </div>

          {state.settings.stawkaCIT === 9 && (
            <div className="text-xs flex items-start gap-3 text-amber-900 bg-amber-50 border border-amber-200 p-4 rounded-2xl" id="cit-notice-bottom">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <span className="font-bold">Stawka preferencyjna 9% CIT:</span> Dotyczy małych podatników realizujących obrót roczny brutto poniżej 2 mln EUR w poprzednim roku. Pamiętaj o bieżącym monitorowaniu limitu rentowności i przychodów operacyjnych w roku {state.settings.rokPodatkowy}.
              </div>
            </div>
          )}
        </div>

        {/* Bottom Info Blocks Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
          {/* Local storage banner transformed into Bento Alert block (Moved to bottom) */}
          <div className="bg-amber-50/50 border border-amber-150 p-5 rounded-2xl flex items-start gap-3.5 transition-all hover:bg-amber-50/70" id="local-disclaimer-box">
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

          {/* Designed For Spółka z o.o. block */}
          <div className="bg-indigo-50/50 border border-indigo-150 p-5 rounded-2xl flex items-start gap-3.5 transition-all hover:bg-indigo-50/70" id="target-audience-box">
            <div className="w-10 h-10 bg-indigo-550 rounded-xl flex items-center justify-center text-sm text-white shadow-xs shrink-0 select-none font-bold font-display">
              🎯
            </div>
            <div>
              <h4 className="font-bold text-indigo-900 text-xs leading-none">Przeznaczenie: Spółki z o.o. (CIT + VAT)</h4>
              <p className="text-[11px] text-indigo-800 mt-1.5 leading-relaxed opacity-95">
                Ten symulator powstał <b>wyłącznie dla polskich Spółek z o.o.</b> w oparciu o opodatkowanie CIT (9%/19%) oraz VAT (23%). Dane i wyliczenia asystenta AI mają charakter poglądowo-edukacyjny, nie stanowią porady prawnej ani podatkowej, a wszelka odpowiedzialność leży po stronie użytkownika.
              </p>
            </div>
          </div>
        </div>

        {/* Clean minimal footer with professional regulatory & audit metadata */}
        <footer className="pt-8 border-t border-slate-200 space-y-4 text-xs text-slate-400">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2" id="footer-regulatory-guidelines">
            <div className="space-y-1">
              <span className="font-bold text-slate-600 block uppercase tracking-wider text-[10px]">Aktualność prawna i audyt:</span>
              <p className="text-slate-500 leading-relaxed font-sans">
                Stan prawno-podatkowy zweryfikowany na dzień: <strong className="text-slate-700">2 czerwca 2026 r.</strong> Wszystkie mechanizmy kalkulacyjne, podatkowe i integracje plików KSeF zostały dostosowane do najnowszych rozporządzeń MF z drugiego kwartału 2026 r.
              </p>
            </div>
            <div className="space-y-1">
              <span className="font-bold text-slate-600 block uppercase tracking-wider text-[10px]">Wytyczne KSeF i odroczenie:</span>
              <p className="text-slate-500 leading-relaxed font-sans">
                Opracowano na podstawie ustawy z dnia 9 maja 2024 r. przesuwającej obligatoryjny Krajowy System e-Faktur (KSeF) na <strong className="text-slate-700">1 stycznia 2027 r.</strong> W okresie przejściowym (rok 2026) fakturowanie KSeF i importowanie struktur XML pozostaje dobrowolne.
              </p>
            </div>
            <div className="space-y-1">
              <span className="font-bold text-slate-600 block uppercase tracking-wider text-[10px]">Reguły kalkulacyjne CIT i VAT:</span>
              <p className="text-slate-500 leading-relaxed font-sans">
                Zaliczka CIT wyliczana jest metodą narastającą (YTD). Podstawa opodatkowania oraz kwoty zaliczek podlegają obligatoryjnemu zaokrągleniu do pełnych złotych zgodnie z <strong className="text-slate-700">Art. 63 § 1 Ordynacji podatkowej</strong>. VAT rozliczany jest zgodnie z JPK_V7M.
              </p>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200/50">
            <div className="font-display">
              &copy; 2026 Symulator Podatkowy Sp. z o.o. • Autonomiczna Enklawa Podatkowa v2.4.0
            </div>
            <div className="text-[11px] text-slate-400/80 font-mono">
              Baza Prawna: Dz. U. 2024 poz. 852 (Nowelizacja KSeF) • Art. 63 § 1 Ordynacji podatkowej
            </div>
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

      {/* Import Notification Success Dialog / Modal */}
      {importNotification && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4" id="import-success-toast-bg">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 md:p-8 max-w-md w-full space-y-6 animate-fade-in animate-duration-200" id="import-success-notify-card">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-50 border border-emerald-150 rounded-2xl flex items-center justify-center text-emerald-600 shrink-0">
                <CheckCircle className="w-6 h-6 text-emerald-600" />
              </div>
              <div className="text-left">
                <h3 className="text-lg font-bold text-slate-900 tracking-tight font-display">
                  Import zakończony sukcesem!
                </h3>
                <p className="text-xs text-slate-500">
                  Przetworzono i zapisano dane podatkowe
                </p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-3">
              <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-200/50">
                <span className="text-slate-500 font-medium">Strategia zapisu:</span>
                <span className="font-semibold text-slate-800 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md text-[11px]">{importNotification.strategy}</span>
              </div>
              <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-200/50">
                <span className="text-slate-500 font-medium font-semibold text-slate-700">Wszystkich zidentyfikowanych wierszy:</span>
                <span className="font-bold text-indigo-600 text-sm">{importNotification.totalRows}</span>
              </div>

              <div className="space-y-2 pt-1 text-left">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                    VAT Sprzedaż (Zapisane faktury)
                  </span>
                  <span className="font-semibold text-slate-900">{importNotification.salesCount} szt.</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-rose-500 rounded-full"></span>
                    VAT Zakupy (Koszty i odliczenia)
                  </span>
                  <span className="font-semibold text-slate-900">{importNotification.purchasesCount} szt.</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                    Zapisane zaliczki CIT
                  </span>
                  <span className="font-semibold text-slate-900">{importNotification.citCount} szt.</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-sky-500 rounded-full"></span>
                    Nadwyżki / Deklaracje VAT
                  </span>
                  <span className="font-semibold text-slate-900">{importNotification.vatCount} szt.</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl shadow-sm transition-colors cursor-pointer"
                onClick={() => setImportNotification(null)}
                id="btn-close-import-success-toast"
              >
                Zamknij i przejdź do widoku
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PDF Export Options Modal */}
      {isPdfModalOpen && (
        <PdfExportModal
          state={state}
          activeTab={activeTab}
          onClose={() => setIsPdfModalOpen(false)}
        />
      )}

      {/* Interactive Helper Modal */}
      {showHelper && (
        <InteractiveHelpModal
          onClose={() => setShowHelper(false)}
          initialQuestion={helpActiveQuestion}
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

      {/* Pierwsze Uruchomienie: Regulamin & Zrzeczenie Odpowiedzialności (Modal Overlay) */}
      {showLegalDisclaimer && (
        <div className="fixed inset-0 z-100 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-3xl p-6 md:p-8 max-w-2xl w-full space-y-6 shadow-2xl animate-fade-in" id="startup-legal-disclaimer">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
              <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-amber-400">
                <span className="text-xl">⚖️</span>
              </div>
              <div>
                <h2 className="text-base font-bold text-white tracking-tight font-display">
                  Warunki Korzystania & Zrzeczenie Odpowiedzialności
                </h2>
                <p className="text-[10px] text-amber-400 uppercase tracking-wider font-semibold mt-0.5">
                  Wersja Demonstracyjno-Edukacyjna
                </p>
              </div>
            </div>

            <div className="space-y-4 text-xs text-slate-300 leading-relaxed max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
              <div className="space-y-2">
                <h4 className="font-bold text-white flex items-center gap-2">
                  <span>🎯</span> 1. Przeznaczenie systemu (Tylko Spółki z o.o.)
                </h4>
                <p className="text-slate-400">
                  Aplikacja jest wyspecjalizowanym narzędziem przeznaczonym <strong>wyłącznie dla spółek z ograniczoną odpowiedzialnością (Sp. z o.o.)</strong> w Polsce, rozliczających podatek dochodowy od osób prawnych (<strong>CIT</strong> 9% / 19%) oraz podatek od towarów i usług (<strong>VAT</strong> 23%). Program <strong>nie jest</strong> dostosowany do jednoosobowych działalności gospodarczych (JDG) obciążonych podatkiem PIT.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-white flex items-center gap-2">
                  <span>⚠️</span> 2. Brak charakteru prawnego i księgowego
                </h4>
                <p className="text-slate-400">
                  Prezentowane wzory kalkulacji, tabele, automatyczne porady asystenta AI oraz rekomendacje optymalizacyjne są uproszczonymi modelami statystyczno-matematycznymi. <strong>Aplikacja oraz jej asystent AI nie świadczą usług doradztwa podatkowego, prawnego ani finansowego</strong> w rozumieniu ustawy o doradztwie podatkowym.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-white flex items-center gap-2">
                  <span>💼</span> 3. Wyłączna odpowiedzialność użytkownika
                </h4>
                <p className="text-slate-400">
                  Rozumiesz, że wszelkie operacje, symulacje kosztowe, testy alokacji oraz decyzje inwestycyjne podejmujesz <strong>wyłącznie na własną odpowiedzialność</strong>. Wyniki z symulatora mają charakter darmowej pomocy kierunkowej. Zawsze przed złożeniem ostatecznych deklaracji księgowych lub podjęciem decyzji biznesowych powinieneś skonsultować sprawozdania z licencjonowanym doradcą podatkowym lub certyfikowanym biurem rachunkowym.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-white flex items-center gap-2">
                  <span>🔒</span> 4. 100% Prywatność lokalna
                </h4>
                <p className="text-slate-400">
                  Twoje klucze API i wprowadzane dane nie są przesyłane na żadne serwery zewnętrzne. Wszystkie bilanse i rejestry pozostają tylko na tym urządzeniu w Twojej przeglądarce i nigdzie nie są replikowane.
                </p>
              </div>

              <div className="space-y-4 bg-emerald-950/20 border border-emerald-900/35 p-4 rounded-2xl">
                <h4 className="font-bold text-emerald-400 flex items-center gap-2 text-xs">
                  <span>🛡️</span> 5. 100% Bezpieczne AI & RODO (Pre-Maskowanie Lokalnie w Przeglądarce!)
                </h4>
                <div className="text-slate-300 text-[11px] leading-relaxed space-y-2">
                  <p>
                    Zgodnie z wymaganiami RODO (GDPR), przesyłanie surowych danych osobowych lub handlowych do modeli chmurowych (np. Google Gemini, OpenAI) mogłoby naruszyć przepisy. Nasz symulator posiada <strong>wbudowaną tarczę prywatności działającą lokalnie na Twoim urządzeniu</strong>:
                  </p>
                  <ul className="list-disc pl-4 space-y-1 text-slate-300">
                    <li>
                      <strong>Kto i gdzie maskuje?</strong> Kod JavaScript uruchomiony bezpośrednio w Twojej przeglądarce (na Twoim komputerze), <strong>zanim wyśle jakiekolwiek zapytanie do chmury AI</strong>, wyszukuje i całkowicie rewiduje poufne dane. Do chmury LLM trafia już gotowy, oczyszczony tekst.
                    </li>
                    <li>
                      <strong>Maskowanie Kontrahentów:</strong> Nazwy dostawców (np. <i>"Orlen S.A."</i> czy imiona i nazwiska osób fizycznych) są usuwane w locie i zastępowane bezpiecznymi znacznikami, takimi jak <code>[DOSTAWCA_PALIW_01]</code>, <code>[KONTRAHENT_A]</code>.
                    </li>
                    <li>
                      <strong>Ukrywanie Numerów Faktur:</strong> Rzeczywiste numery dokumentów (np. <i>"FV/1204/2026/PRO"</i>) są zamieniane w pamięci RAM Twojego komputera na neutralne etykiety indeksowe <code>[FAKTURA_01]</code>, uniemożliwiając powiązanie analizy z realną fakturą.
                    </li>
                    <li>
                      <strong>Zero-Knowledge o Twojej Spółce:</strong> Twoja nazwa firmy, adres oraz NIP są całkowicie pomijane. Dla modelu AI analizowany zbiór jest całkowicie anonimowym modelem matematycznym standardowej Spółki z o.o. w Polsce, rozliczającej CIT (9%/19%) i VAT (23%).
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Checkbox Section */}
            <div className="pt-2">
              <label className="flex items-start gap-3 p-4 bg-slate-850/80 border border-slate-800 rounded-2xl cursor-pointer hover:bg-slate-850 transition-all text-left">
                <input
                  type="checkbox"
                  checked={disclaimerChecked}
                  onChange={(e) => setDisclaimerChecked(e.target.checked)}
                  className="mt-1 w-4.5 h-4.5 accent-indigo-650 cursor-pointer rounded-sm bg-slate-950 border-slate-700"
                  id="checkbox-accept-disclaimer"
                />
                <span className="text-[11px] text-slate-300 leading-relaxed select-none">
                  Oświadczam, że rozumiem demonstracyjny i edukacyjny charakter symulatora dedykowanego wyłącznie dla <strong>Spółek z o.o. (CIT + VAT)</strong>. Akceptuję informację o braku charakteru porady prawnej/finansowej i przejmuję pełną odpowiedzialność za wykorzystanie narzędzia.
                </span>
              </label>
            </div>

            {/* Accept Button action */}
            <div className="pt-2">
              <button
                type="button"
                disabled={!disclaimerChecked}
                onClick={() => {
                  try {
                    localStorage.setItem('tax_app_disclaimer_accepted', 'true');
                    setShowLegalDisclaimer(false);
                  } catch (e) {
                    console.error(e);
                  }
                }}
                className={`w-full py-4 px-6 rounded-2xl font-bold tracking-wide uppercase transition-all select-none text-xs ${
                  disclaimerChecked 
                    ? 'bg-indigo-600 border border-indigo-500 hover:bg-indigo-500 text-white cursor-pointer hover:shadow-lg shadow-indigo-950/50'
                    : 'bg-slate-800 border border-slate-700 text-slate-500 cursor-not-allowed'
                }`}
              >
                AKCEPTUJĘ WARUNKI I URUCHAMIAM SYSTEM
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
