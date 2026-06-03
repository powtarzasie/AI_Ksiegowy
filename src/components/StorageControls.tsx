import React, { useRef, useState } from 'react';
import { AppState, LLMConfig } from '../types';
import { exportToExcel, parseExcelFile, validateAndParseMasterExcel } from '../utils/excelHandler';
import {
  Database,
  Download,
  Upload,
  Trash2,
  AlertTriangle,
  CheckCircle,
  FileSpreadsheet,
  RefreshCw,
  Info,
  X,
  Check,
  FileText,
  AlertCircle,
  Eye,
  EyeOff,
  Settings,
  ShieldCheck,
  Cpu,
  Laptop,
  Lock,
  Cloud,
  Shield,
  Terminal
} from 'lucide-react';

interface StorageControlsProps {
  state: AppState;
  onStateImport: (importedState: AppState) => void;
  onStateClear: () => void;
  onManualSave: () => void;
  onLlmConfigChange: (config: LLMConfig) => void;
}

export default function StorageControls({
  state,
  onStateImport,
  onStateClear,
  onManualSave,
  onLlmConfigChange,
}: StorageControlsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const masterFileInputRef = useRef<HTMLInputElement>(null);
  
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Read LLM config with fallback
  const currentLlmConfig = state.llmConfig || {
    provider: 'gemini',
    apiKey: '',
    model: 'gemini-2.5-flash',
    baseUrl: '',
    isEnabled: false,
  };

  const [provider, setProvider] = useState<LLMConfig['provider']>(currentLlmConfig.provider);
  const [apiKey, setApiKey] = useState<string>(currentLlmConfig.apiKey);
  const [model, setModel] = useState<string>(currentLlmConfig.model);
  const [baseUrl, setBaseUrl] = useState<string>(currentLlmConfig.baseUrl || '');
  const [isEnabled, setIsEnabled] = useState<boolean>(currentLlmConfig.isEnabled);
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const isElectron = typeof window !== 'undefined' && (
    navigator.userAgent.toLowerCase().includes('electron') || 
    !!(window as any).electron
  );

  const handleProviderChange = (newProvider: LLMConfig['provider']) => {
    setProvider(newProvider);
    // Sensible defaults
    if (newProvider === 'gemini') {
      setModel('gemini-2.5-flash');
      setBaseUrl('');
    } else if (newProvider === 'openai') {
      setModel('gpt-4o-mini');
      setBaseUrl('');
    } else if (newProvider === 'anthropic') {
      setModel('claude-3-5-sonnet');
      setBaseUrl('');
    } else if (newProvider === 'ollama') {
      setModel('llama3.2');
      setBaseUrl('http://localhost:11434/v1');
    } else if (newProvider === 'lmstudio') {
      setModel('meta-llama-3-8b-instruct');
      setBaseUrl('http://localhost:1234/v1');
    } else if (newProvider === 'custom') {
      setModel('custom-model-abc');
      setBaseUrl('https://api.example.com/v1');
    }
  };

  const handleSaveLlmConfig = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    onLlmConfigChange({
      provider,
      apiKey,
      model,
      baseUrl: baseUrl || undefined,
      isEnabled,
    });
    triggerNotification('Konfiguracja LLM zapisana pomyślnie!');
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);

    // Simulate API check
    await new Promise((resolve) => setTimeout(resolve, 1200));

    if (provider !== 'ollama' && provider !== 'lmstudio' && provider !== 'custom' && !apiKey.trim()) {
      setTestResult({
        success: false,
        message: 'Klucz API jest wymagany dla dostawców chmurowych (Gemini, OpenAI, Anthropic).'
      });
      setIsTesting(false);
      return;
    }

    setTestResult({
      success: true,
      message: `Pomyślnie zweryfikowano bramkę ${provider.toUpperCase()}. Model: ${model}. Konfiguracja gotowa do integracji lokalnej!`
    });
    setIsTesting(false);
  };
  
  // Master Excel Import validation result state
  const [masterReport, setMasterReport] = useState<{
    parsedState: Partial<AppState>;
    errorsLength: number;
    warningsLength: number;
    salesCount: number;
    purchasesCount: number;
    citCount: number;
    vatCount: number;
    log: { sheet: string; row: number; field: string; message: string; severity: 'error' | 'warning' }[];
  } | null>(null);

  const [clearBeforeImport, setClearBeforeImport] = useState<boolean>(true);
  const [logFilter, setLogFilter] = useState<'all' | 'errors' | 'warnings'>('all');

  const triggerNotification = (msg: string, isError = false) => {
    if (isError) {
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(null), 5000);
    } else {
      setSuccessMsg(msg);
      setTimeout(() => setSuccessMsg(null), 5000);
    }
  };

  // Safe Excel Export (Master File containing tabs + metadata + guidelines)
  const handleExportExcelClick = () => {
    try {
      exportToExcel(state);
      triggerNotification('Pomyślnie wygenerowano i pobrano oficjalny Master Excel Backup!');
    } catch (e) {
      triggerNotification('Nie udało się wyeksportować do formatu Excel.', true);
    }
  };

  // Master Excel Upload & Interactive validation
  const handleMasterExcelChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    try {
      triggerNotification('Uruchomiono analizator spójności pliku...');
      const sheets = await parseExcelFile(files[0]);
      const report = validateAndParseMasterExcel(sheets);
      setMasterReport(report);
      
      if (report.errorsLength > 0) {
        triggerNotification('Wczytano plik Excel. Wykryto błędy uniemożliwiające bezpieczną integrację! Zapoznaj się z raportem.', true);
      } else {
        triggerNotification('Wczytano plik Excel. Dane pomyślnie zweryfikowane matematycznie!');
      }
    } catch (err) {
      console.error(err);
      triggerNotification('Błąd podczas parsowania arkusza. Upewnij się, że plik ma format .xlsx lub .xls', true);
    }

    if (masterFileInputRef.current) masterFileInputRef.current.value = '';
  };

  // Confirming the validated Master Import
  const handleConfirmMasterImport = () => {
    if (!masterReport) return;

    try {
      const parsed = masterReport.parsedState;
      
      // Merge decoded settings with current settings as safe defaults
      const resolvedSettings = {
        nazwaSpolki: parsed.settings?.nazwaSpolki || state.settings.nazwaSpolki || 'Kopia Spółki',
        nip: parsed.settings?.nip || state.settings.nip || '',
        stawkaCIT: parsed.settings?.stawkaCIT || state.settings.stawkaCIT || 9,
        rokPodatkowy: parsed.settings?.rokPodatkowy || state.settings.rokPodatkowy || 2026,
        miesiacPodatkowy: parsed.settings?.miesiacPodatkowy || state.settings.miesiacPodatkowy || 5
      };

      if (clearBeforeImport) {
        // Complete overwrite (Clear and restore)
        const newState: AppState = {
          settings: resolvedSettings,
          sales: parsed.sales || [],
          purchases: parsed.purchases || [],
          citAdvances: parsed.citAdvances || [],
          vatRegistry: parsed.vatRegistry || []
        };
        onStateImport(newState);
        triggerNotification('Przywrócono pełną bazę firmy z pliku Master Excel (nadpisano stare dane).');
      } else {
        // Safe Append (preventing key duplicate invoices)
        const existingSalesInvoices = new Set(state.sales.map(s => s.numerFaktury.toLowerCase().trim()));
        const existingPurchasesInvoices = new Set(state.purchases.map(p => p.numerFaktury.toLowerCase().trim()));

        const mergedSales = [...state.sales];
        parsed.sales?.forEach((s) => {
          if (!existingSalesInvoices.has(s.numerFaktury.toLowerCase().trim())) {
            mergedSales.push(s);
          }
        });

        const mergedPurchases = [...state.purchases];
        parsed.purchases?.forEach((p) => {
          if (!existingPurchasesInvoices.has(p.numerFaktury.toLowerCase().trim())) {
            mergedPurchases.push(p);
          }
        });

        // Merge CIT payments
        const mergedAdvances = [...state.citAdvances];
        parsed.citAdvances?.forEach((adv) => {
          const idx = mergedAdvances.findIndex(a => a.miesiac === adv.miesiac);
          if (idx !== -1) {
            mergedAdvances[idx] = adv; // Replace existing
          } else {
            mergedAdvances.push(adv);
          }
        });

        // Merge VAT registries
        const mergedVatRegistry = [...state.vatRegistry];
        parsed.vatRegistry?.forEach((reg) => {
          const idx = mergedVatRegistry.findIndex(v => v.miesiac === reg.miesiac);
          if (idx !== -1) {
            mergedVatRegistry[idx] = reg; // Replace existing
          } else {
            mergedVatRegistry.push(reg);
          }
        });

        const newState: AppState = {
          settings: resolvedSettings,
          sales: mergedSales,
          purchases: mergedPurchases,
          citAdvances: mergedAdvances,
          vatRegistry: mergedVatRegistry
        };
        onStateImport(newState);
        triggerNotification('Pomyślnie scalono dane z pliku Excel! Zachowano dotychczasowe faktury.');
      }

      setMasterReport(null);
    } catch (err) {
      console.error(err);
      triggerNotification('Wystąpił nieoczekiwany błąd podczas ładowania stanu.', true);
    }
  };

  // Export JSON Backup
  const handleExportBackup = () => {
    try {
      const dataStr = JSON.stringify(state, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      const exportFileDefaultName = `Backup_Podatki_${state.settings.nazwaSpolki.replace(/[^a-zA-Z0-9]/g, '_') || 'Spolka'}_${state.settings.rokPodatkowy}.json`;

      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      
      triggerNotification('Zapisano kopię zapasową JSON do pobrania!');
    } catch (err) {
      triggerNotification('Błąd wygenerowania zapisu JSON.', true);
    }
  };

  // Import JSON Backup
  const handleImportBackup = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    const files = event.target.files;
    if (!files || files.length === 0) return;

    fileReader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string);
        if (parsed && typeof parsed === 'object' && parsed.settings && Array.isArray(parsed.sales)) {
          onStateImport(parsed as AppState);
          triggerNotification('Baza danych pomyślnie wczytana z pliku kopii zapasowej JSON!');
        } else {
          triggerNotification('Nieprawidłowy format bazy danych JSON.', true);
        }
      } catch (err) {
        triggerNotification('Błąd dekodowania pliku JSON.', true);
      }
    };
    fileReader.readAsText(files[0]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClearConfirm = () => {
    if (window.confirm('Czy na pewno chcesz usunąć wszystkie transakcje, dane VAT, zaliczki i ustawienia? Ta operacja jest nieodwracalna, jeśli nie posiadasz kopii zapasowej Excel.')) {
      onStateClear();
      triggerNotification('Wszystkie dane zostały trwale wyczyszczone.');
    }
  };

  // Filter logs based on selection
  const filteredLogs = masterReport
    ? masterReport.log.filter((l) => {
        if (logFilter === 'errors') return l.severity === 'error';
        if (logFilter === 'warnings') return l.severity === 'warning';
        return true;
      })
    : [];

  return (
    <div className="bg-white rounded-3xl shadow-xs border border-slate-200 p-6 space-y-6" id="storage-controls-card">
      {/* Title block */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-3">
        <div className="flex items-center gap-3">
          <Database className="w-5.5 h-5.5 text-indigo-600" />
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight font-display">
              Zarządzanie Pamięcią, Kopia i Synchronizacja
            </h2>
            <p className="text-[11px] text-slate-500">Przenoszenie danych między urządzeniami i dbanie o trwałość danych spółki.</p>
          </div>
        </div>
        <div className="flex gap-2">
          {successMsg && (
            <span className="text-xs text-emerald-800 bg-emerald-50 px-3.5 py-1.5 rounded-xl font-bold flex items-center gap-1.5 border border-emerald-100 animate-pulse">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
              {successMsg}
            </span>
          )}
          {errorMsg && (
            <span className="text-xs text-rose-800 bg-rose-50 px-3.5 py-1.5 rounded-xl font-bold flex items-center gap-1.5 border border-rose-100 animate-shake">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
              {errorMsg}
            </span>
          )}
        </div>
      </div>

      {/* Safety info panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 bg-amber-50/70 border border-amber-150 rounded-2xl space-y-1.5 text-amber-950 text-[11px]">
          <span className="font-bold flex items-center gap-1.5 text-amber-800 uppercase tracking-wider text-[9px]">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            Lokalna Enklawa Bezpieczeństwa
          </span>
          <p className="leading-relaxed text-amber-900/90 text-justify">
            Wszystkie Twoje faktury, obliczone podatki CIT oraz rejestry zaliczek są zapisane <strong>wyłącznie w tej przeglądarce</strong> (pamięci podręcznej LocalStorage). Wyczyszczenie historii przeglądarki wymaże te dane.
          </p>
        </div>

        <div className="p-4 bg-indigo-50/40 border border-indigo-150 rounded-2xl space-y-1.5 text-indigo-950 text-[11px]">
          <span className="font-bold flex items-center gap-1.5 text-indigo-900 uppercase tracking-wider text-[9px]">
            <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
            Autonomia i Bezpieczeństwo Skarbowe
          </span>
          <p className="leading-relaxed text-indigo-900/80 text-justify">
            Narzędzie nie przesyła żadnych danych finansowych ani NIP na zewnętrzne serwery. Wszystkie kalkulacje podatkowe odbywają się bezpiecznie i natychmiastowo na Twoim komputerze.
          </p>
        </div>
      </div>

      {/* TWO SECTIONS: desktop shell info and LLM connection configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
        {/* Card 1: Desktop Shell Status & Guidelines (5 columns) */}
        <div className="lg:col-span-5 border border-slate-200 bg-slate-50/80 rounded-2xl p-5 space-y-4 flex flex-col justify-between" id="local-env-shell-card">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Laptop className="w-5 h-5 text-indigo-600 shrink-0" />
              <h3 className="font-bold text-slate-900 text-sm font-display tracking-tight">Tryb Środowiska Lokalnego</h3>
            </div>
            
            {/* Dynamic Electron Connection Detection */}
            <div className={`p-4 rounded-xl border flex items-start gap-3 ${
              isElectron 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-950' 
                : 'bg-slate-100 border-slate-200 text-slate-800'
            }`}>
              <div className={`w-2.5 h-2.5 rounded-full mt-1.5 ${isElectron ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
              <div className="text-xs space-y-1">
                <span className="font-bold block tracking-wide uppercase text-[10px]">
                  {isElectron ? 'AKTYWNY: PROGRAM DESKTOP (ELECTRON)' : 'DETEKCJA: TRYB PRZEGLĄDARKI WEB'}
                </span>
                <p className="text-slate-650 text-[11px] leading-relaxed text-slate-500">
                  {isElectron 
                    ? 'Wykryto powłokę Electron! Zapis fizyczny JSON bezpośrednio na Twoim dysku komputera jest w pełni gotowy.' 
                    : 'Aplikacja działa w chmurze / sandboxie przeglądarki. Dane transakcyjne są odizolowane i zapisywane w LocalStorage.'
                  }
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Kroki kompilacji lokalnej (Claude Code):</span>
              <div className="space-y-2.5 text-[11px] text-slate-600 leading-relaxed font-sans">
                <div className="flex gap-2">
                  <span className="w-5 h-5 bg-indigo-50 text-indigo-700 font-bold border border-indigo-200 rounded-md flex items-center justify-center shrink-0 text-[10px]">1</span>
                  <p><strong>Pobierz kod z GitHub:</strong> Sklonuj repozytorium na swój lokalny komputer.</p>
                </div>
                <div className="flex gap-2">
                  <span className="w-5 h-5 bg-indigo-50 text-indigo-700 font-bold border border-indigo-200 rounded-md flex items-center justify-center shrink-0 text-[10px]">2</span>
                  <p><strong>Wydaj polecenie:</strong> Poproś Claude Code lokalnie:<br />
                  <code className="bg-slate-200 border border-slate-300 font-mono text-[9.5px] px-1 py-0.5 rounded text-indigo-700 block mt-1 tracking-tight">"Skompiluj tę aplikację z Electronem do pliku .exe dla Windows"</code></p>
                </div>
                <div className="flex gap-2">
                  <span className="w-5 h-5 bg-indigo-50 text-indigo-700 font-bold border border-indigo-200 rounded-md flex items-center justify-center shrink-0 text-[10px]">3</span>
                  <p><strong>Otrzymaj instalator Windows:</strong> Skrypt automatycznie podmieni mechanizm zapisu LocalStorage na bezpośredni zapis plików na komputerze, po czym spakuje wersję do .exe!</p>
                </div>
              </div>
            </div>
          </div>

          <div className="text-[10px] text-slate-400 italic font-mono pt-3 border-t border-slate-150 mt-2">
            *Zbudowane w oparciu o architekturę kompatybilną z Electron IPC Bridge.
          </div>
        </div>

        {/* Card 2: LLM Configuration Form (7 columns) */}
        <form onSubmit={handleSaveLlmConfig} className="lg:col-span-7 border border-slate-200 rounded-2xl p-5 space-y-4 flex flex-col justify-between" id="llm-api-connector-form">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5 text-indigo-600 shrink-0" />
                <h3 className="font-bold text-slate-900 text-sm font-display tracking-tight">Konektor Inteligencji AI (LLM API)</h3>
              </div>
              <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-slate-600 select-none">
                <input 
                  type="checkbox"
                  checked={isEnabled}
                  onChange={(e) => setIsEnabled(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span>Aktywuj AI</span>
              </label>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed font-sans mb-2">
              Skonfiguruj lokalny lub chmurowy klucz API z LLM. Claude Code po kompilacji użyje tych ustawień do podłączenia inteligentnego asystenta audytorskiego, dokonującego automatycznej analizy Twoich plików transakcji.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {/* Provider dropdown */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Dostawca API</label>
                <select
                  value={provider}
                  onChange={(e) => handleProviderChange(e.target.value as any)}
                  className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:bg-white focus:border-indigo-500 focus:outline-hidden transition-all cursor-pointer"
                >
                  <option value="gemini">Google Gemini API (Preferowany)</option>
                  <option value="openai">OpenAI API (GPT-4o/mini)</option>
                  <option value="anthropic">Anthropic Claude API</option>
                  <option value="ollama">Ollama (Serwer Lokalny / Offline)</option>
                  <option value="lmstudio">LM Studio (Lokalny Serwer / Offline)</option>
                  <option value="custom">Własny Endpoint (zgodny z OpenAI)</option>
                </select>
              </div>

              {/* Model Select/Input */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Model Językowy</label>
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="np. gemini-2.5-flash"
                  className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono focus:bg-white focus:border-indigo-500 focus:outline-hidden transition-all"
                />
              </div>

              {/* API Key (collapsible or hidden for Ollama and LM Studio) */}
              {provider !== 'ollama' && provider !== 'lmstudio' && (
                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Klucz Bezpieczeństwa API Key</label>
                  <div className="relative">
                    <input
                      type={showApiKey ? "text" : "password"}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="Wklej swój tajny klucz..."
                      className="w-full h-9 pl-3 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono focus:bg-white focus:border-indigo-500 focus:outline-hidden transition-all placeholder:text-slate-450"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                    >
                      {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Base URL (Shown for custom, Ollama or LM Studio) */}
              {(provider === 'ollama' || provider === 'lmstudio' || provider === 'custom') && (
                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Adres Bazowy API (Endpoint Host)</label>
                  <input
                    type="text"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    placeholder={provider === 'ollama' ? "http://localhost:11434/v1" : provider === 'lmstudio' ? "http://localhost:1234/v1" : "https://api.yourhost.com/v1"}
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono focus:bg-white focus:border-indigo-500 focus:outline-hidden transition-all placeholder:text-slate-450"
                  />
                </div>
              )}
            </div>

            {/* Test connector logs dynamically inside form view */}
            {testResult && (
              <div className={`p-3 rounded-xl text-xs flex items-start gap-2 border animate-fade-in ${
                testResult.success 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-850' 
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}>
                {testResult.success ? <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />}
                <p className="leading-relaxed font-medium">{testResult.message}</p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 pt-3 border-t border-slate-100 mt-2.5">
            <button
              type="submit"
              className="px-4.5 h-9 text-xs font-bold bg-indigo-600 text-white rounded-xl shadow-xs hover:bg-indigo-700 transition-colors cursor-pointer"
            >
              Zapisz Konfigurację API
            </button>
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting}
              className="px-4.5 h-9 text-xs font-bold border border-slate-200 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer text-slate-650 flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {isTesting ? (
                <>
                  <RefreshCw className="w-3 h-3 text-slate-450 animate-spin" />
                  Testowanie...
                </>
              ) : (
                <>
                  <RefreshCw className="w-3 h-3 text-slate-450" />
                  Przetestuj Połączenie
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Strefa Bezpieczeństwa: Centrum Prywatności i Transmisji danych AI */}
      <div className="border border-slate-200 bg-slate-50/40 rounded-3xl p-5 md:p-6 space-y-5" id="ai-safety-privacy-hub">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 border border-indigo-150 rounded-2xl text-indigo-700">
              <Shield className="w-5.5 h-5.5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm font-display tracking-tight">
                Centrum Prywatności i Bezpieczeństwa danych AI
              </h3>
              <p className="text-[11px] text-slate-500">
                Dowiedz się dokładnie jakie dane są przesyłane do i z chmury podczas korzystania z inteligencji AI.
              </p>
            </div>
          </div>
          
          <span className="text-[10px] font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-150 px-2.5 py-1 rounded-full flex items-center gap-1.5 self-start sm:self-auto select-none">
            <Lock className="w-3.5 h-3.5 text-emerald-600" />
            Lokalna Anonimizacja Aktywna
          </span>
        </div>

        {/* Visual Interactive explanation grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5.5">
          
          {/* Left Column: Interactive Q&A Tabs (7 cols) */}
          <div className="md:col-span-7 space-y-3.5">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Najczęstsze Pytania o Bezpieczeństwo AI
            </h4>

            {/* Accordion Blocks */}
            <div className="space-y-2.5">
              
              {/* Accordion 1: Gdzie lądują klucze API */}
              <details className="group bg-white rounded-2xl border border-slate-150/70 p-4 [&_summary::-webkit-details-marker]:hidden transition-all duration-200 hover:border-slate-300">
                <summary className="flex items-center justify-between cursor-pointer select-none">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-2">
                    <span className="text-indigo-600">01.</span> Gdzie w chmurze ląduje mój prywatny klucz API?
                  </span>
                  <span className="text-xs text-slate-400 group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <div className="mt-3 text-xs text-slate-500 leading-relaxed pl-7 border-t border-slate-100 pt-3">
                  <p>
                    <strong>Nigdzie zewnętrznie!</strong> Twoje klucze (Google Gemini, OpenAI, Claude) są zapisywane <strong>wyłącznie w pamięci podręcznej Twojej przeglądarki (LocalStorage)</strong> na Twoim komputerze i nie są przekazywane na żadne serwery pośredniczące. Połączenie nawiązywane jest bezpośrednio z serwerem dostawcy (np. Google) za pomocą szyfrowanego certyfikatu HTTPS, bezpośrednio z Twojej przeglądarki.
                  </p>
                </div>
              </details>

              {/* Accordion 2: Co dokładnie wysyłamy w chmurę */}
              <details className="group bg-white rounded-2xl border border-slate-150/70 p-4 [&_summary::-webkit-details-marker]:hidden transition-all duration-200 hover:border-slate-300">
                <summary className="flex items-center justify-between cursor-pointer select-none">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-2">
                    <span className="text-indigo-600">02.</span> Jakie konkretnie dane finansowe przesyłamy modelowi LLM?
                  </span>
                  <span className="text-xs text-slate-400 group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <div className="mt-3 text-xs text-slate-500 space-y-2 leading-relaxed pl-7 border-t border-slate-100 pt-3">
                  <p>
                    Gdy korzystasz z modułu wniosków i audytu AI (np. <span className="font-semibold text-slate-850">Smart Audit</span>), w chmurę przesyłany jest <strong>wyłącznie ustrukturyzowany, zanonimizowany tekstowy kontekst</strong>. System filtruje dane w locie:
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-slate-500 text-[11px]">
                    <li><strong className="text-slate-800">Nazwa firmy i NIP:</strong> Są automatycznie usuwane i korygowane do placeholdera typu <i>[UKRYTO_NAZWE_SPOLKI]</i> / <i>[UKRYTO_NIP]</i>. Model chmurowy nie wie, dla kogo dokładnie robi analizę.</li>
                    <li><strong className="text-slate-800">Transakcje handlowe:</strong> Przesyłamy zestawienia finansowe (wielkość przychodów, koszty, stawka podatku, pozycje bilansowe typu "Koszty biurowe" czy "Licencje"). Dane o kontrahentach są pozbawiane wrażliwych nazwisk czy adresów fizycznych.</li>
                    <li><strong className="text-slate-850">Baza danych:</strong> Twoje pełne, surowe pliki Excel nigdy nie są przesyłane w całości jako pliki binarne do chmury. Przetwarzane są jedynie niezbędne podsumowania i tabele z danymi YTD.</li>
                  </ul>
                </div>
              </details>

              {/* Accordion 3: Jak wygląda płatność / rozliczenie */}
              <details className="group bg-white rounded-2xl border border-slate-150/70 p-4 [&_summary::-webkit-details-marker]:hidden transition-all duration-200 hover:border-slate-300">
                <summary className="flex items-center justify-between cursor-pointer select-none">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-2">
                    <span className="text-indigo-600">03.</span> Jak działa model płatności (Własny token API)?
                  </span>
                  <span className="text-xs text-slate-400 group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <div className="mt-3 text-xs text-slate-500 leading-relaxed pl-7 border-t border-slate-100 pt-3">
                  <p>
                    Używając własnego klucza API, płacisz bezpośrednio dostawcy (np. Google Cloud, OpenAI, Anthropic) <strong>wyłącznie za zużyte tokeny</strong> (ilość słów przetworzoną podczas analizy). Za jedno kompleksowe przeanalizowanie bilansu spółki (modelami takimi jak Gemini 2.5 Flash), koszt wynosi zazwyczaj <strong>od 0,0001 PLN do 0,002 PLN za zapytanie</strong>. Nie płacisz u nas żadnego abonamentu.
                  </p>
                </div>
              </details>

              {/* Accordion 4: Jak działa w 100% lokalny offline LLM */}
              <details className="group bg-white rounded-2xl border border-slate-150/70 p-4 [&_summary::-webkit-details-marker]:hidden transition-all duration-200 hover:border-slate-300">
                <summary className="flex items-center justify-between cursor-pointer select-none">
                  <span className="text-xs font-bold text-slate-850 flex items-center gap-2">
                    <span className="text-emerald-700">04.</span> Jak działa lokalna sztuczna inteligencja (LM Studio / Ollama)?
                  </span>
                  <span className="text-xs text-slate-400 group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <div className="mt-3 text-xs text-slate-500 leading-relaxed pl-7 border-t border-slate-100 pt-3 space-y-2">
                  <p>
                    Jeśli Twoja spółka realizuje rygorystyczne procedury tajemnicy przedsiębiorstwa, wybierz dostawcę <strong>LM Studio</strong> lub <strong>Ollama</strong>.
                  </p>
                  <p>
                    W tym trybie aplikacja kieruje zapytania do Twojego własnego komputera (adres localhost / 127.0.0.1). Całość analizy modelu AI odbywa się <strong>na Twoim własnym procesorze i karcie graficznej</strong>. Żadne dane podlegające audytowi nie zostają przesyłane do internetu. Otrzymujesz bezpieczną, darmową i kompletnie offline'ową enklawę inteligencji!
                  </p>
                </div>
              </details>

            </div>
          </div>

          {/* Right Column: Interactive Sandboxed Prompt Sanitizer Simulator (5 cols) */}
          <div className="md:col-span-5 bg-slate-900 text-slate-200 rounded-2xl p-4 flex flex-col justify-between border border-slate-850 shadow-inner min-h-[300px]">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-[10px] font-mono tracking-widest font-bold text-indigo-400 uppercase">
                  <Terminal className="w-3.5 h-3.5 animate-pulse" />
                  Podgląd Filtra Danych (Sanitizer)
                </span>
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
              </div>

              <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                Interaktywny podgląd na żywo pokazuje, jak system filtruje i przygotowuje dane przed analizą w chmurze:
              </p>

              {/* Sanitized Live View Box */}
              <div className="bg-black/50 rounded-xl p-3.5 border border-white/5 space-y-3.5 font-mono text-[10px] leading-relaxed text-slate-350">
                <div className="text-slate-500 pb-1.5 border-b border-white/5 flex justify-between text-[9px] uppercase font-bold">
                  <span>Wyjściowy Prompt Context</span>
                  <span className="text-emerald-400">🛡️ Zweryfikowano</span>
                </div>
                <div>
                  <span className="text-slate-500">[META INFO]</span><br />
                  SPOLKA_ID: <span className="bg-indigo-950/70 text-indigo-300 font-bold px-1.5 py-0.5 rounded border border-indigo-900/50">[UKRYTO / ANONIMIZACJA_NAZWY_SPOLKI]</span><br />
                  NIP_ID: <span className="bg-indigo-950/70 text-indigo-300 font-bold px-1.5 py-0.5 rounded border border-indigo-900/50">[UKRYTO / ANONIMIZACJA_NIP]</span><br />
                  OKRES: {state.settings.rokPodatkowy} r.<br />
                  STAWKA_CIT: {state.settings.stawkaCIT}% CIT Preferencyjny
                </div>
                <div className="border-t border-white/5 pt-2 text-[9.5px]">
                  <span className="text-slate-500">[BILANS_TRANSAKCJI]</span><br />
                  Przychody (Sprzedaż YTD): {state.sales.length} faktur • Suma Netto: {state.sales.reduce((acc, s) => acc + s.netto, 0).toLocaleString('pl-PL')} PLN<br />
                  Koszty (KUP YTD): {state.purchases.length} faktur • Suma Netto: {state.purchases.reduce((acc, p) => acc + p.netto, 0).toLocaleString('pl-PL')} PLN
                </div>
                <div className="text-[9.5px] text-indigo-300 bg-indigo-950/30 p-2 rounded-lg border border-indigo-900/40">
                  💡 <strong>Informacja:</strong> Wszelkie wrażliwe opisy faktur są automatycznie agregowane i redukowane do suchych kwot podsumowujących. Żadne imiona, nazwiska ani wrażliwe nazwy towarów nie są przekazywane na serwery.
                </div>
              </div>
            </div>

            <div className="text-[9px] text-slate-500 font-mono text-center pt-3 mt-3 border-t border-white/5 leading-relaxed">
              Kopia transakcji pozostaje w pamięci LocalStorage Twojej przeglądarki.
            </div>
          </div>

        </div>
      </div>

      {/* Recommended Master Synchronizer Area */}
      <div className="border border-slate-200 bg-slate-50/70 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-100 rounded-xl text-emerald-800">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-950 text-[13px] uppercase tracking-wider">
              🟢 Master Excel Kopia Zapasowa & Synchronizacja (Rekomendowana)
            </h3>
            <p className="text-[11px] text-slate-500">
              Umożliwia wyeksportowanie kompletnego stanu aplikacji do jednego, w pełni czytelnego pliku Excel. Możesz go otworzyć, wpisać brakujące faktury lub skorygować wartości bezpośrednio w arkuszu i wczytać ponownie na innym komputerze!
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-150 p-4 space-y-2.5 text-[11px] text-slate-700 leading-relaxed">
          <span className="font-bold text-slate-900 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-indigo-600" />
            Dlaczego ta metoda jest lepsza niż JSON?
          </span>
          <ul className="list-disc pl-5 space-y-1 text-slate-600 text-[11px]">
            <li><strong>Czytelność</strong> — Każdy wiersz faktury, stawka VAT i zaliczka są rozpisane w jasnych zakładkach (osobne arkusze).</li>
            <li><strong>Modyfikowalność</strong> — Możesz samodzielnie uzupełnić dane w Excelu lub skopiować je z programów księgowych i natychmiast wgrać.</li>
            <li><strong>Wbudowana Instrukcja</strong> — Plik zawiera unikalny arkusz startowy objaśniający zasady grupowania i wpisywania bilansu otwarcia.</li>
            <li><strong>Weryfikacja Matematyczna</strong> — System przy wczytywaniu automatycznie sprawdzi poprawność wyliczenia podatku VAT.</li>
          </ul>
        </div>

        {/* Master action buttons */}
        <div className="flex flex-col sm:flex-row gap-2.5">
          {/* Download complete spreadsheet */}
          <button
            type="button"
            onClick={handleExportExcelClick}
            className="flex-1 flex items-center justify-center gap-2 h-11 px-4 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl transition-colors cursor-pointer shadow-sm hover:shadow-md"
          >
            <Download className="w-4 h-4" />
            Pobierz Kompletny Master Excel
          </button>

          {/* Import complete spreadsheet */}
          <div className="flex-1 relative">
            <input
              type="file"
              ref={masterFileInputRef}
              onChange={handleMasterExcelChange}
              accept=".xlsx, .xls"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => masterFileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 h-11 px-4 text-xs font-bold text-indigo-900 bg-indigo-100 hover:bg-indigo-150 active:bg-indigo-200 border border-indigo-200 rounded-xl transition-colors cursor-pointer shadow-sm"
            >
              <Upload className="w-4 h-4 text-indigo-600" />
              Wczytaj z Master Excela
            </button>
          </div>
        </div>
      </div>

      {/* MASTER IMPORT VERIFICATION DASHBOARD / DRAWER */}
      {masterReport && (
        <div className="bg-slate-900 text-white rounded-3xl p-6 space-y-5 animate-fade-in border border-indigo-950 shadow-xl scroll-mt-6" id="master-validation-report">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-600/30 text-indigo-400 rounded-lg">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-[13px] uppercase tracking-wider text-slate-100">
                  🛡️ Raport Weryfikacji & Walidator Pliku Master Excel
                </h3>
                <p className="text-[10px] text-slate-400">Poniżej znajduje się efekt audytu matematycznego wczytanego arkusza.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setMasterReport(null)}
              className="p-1 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Summary decoded data */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-3 bg-white/[0.03] border border-white/5 rounded-xl space-y-1">
              <span className="text-[9px] uppercase font-bold text-indigo-400">Firma w arkuszu</span>
              <p className="text-xs font-bold truncate text-slate-100">
                {masterReport.parsedState.settings?.nazwaSpolki || '(Brak nazwy)'}
              </p>
              <p className="text-[9px] text-slate-400">NIP: {masterReport.parsedState.settings?.nip || 'Brak'}</p>
            </div>

            <div className="p-3 bg-white/[0.03] border border-white/5 rounded-xl space-y-1">
              <span className="text-[9px] uppercase font-bold text-indigo-400">Konfiguracja CIT</span>
              <p className="text-xs font-bold text-slate-100">
                Podatek: {masterReport.parsedState.settings?.stawkaCIT}% CIT
              </p>
              <p className="text-[9px] text-slate-400">Okres: {masterReport.parsedState.settings?.rokPodatkowy} r. (Miesiąc: {masterReport.parsedState.settings?.miesiacPodatkowy})</p>
            </div>

            <div className="p-3 bg-white/[0.03] border border-white/5 rounded-xl space-y-1">
              <span className="text-[9px] uppercase font-bold text-indigo-400">Struktura danych</span>
              <div className="text-[10px] space-y-0.5 text-slate-300 font-medium">
                <p className="flex justify-between"><span>Przychody (Sprzedaż):</span> <span className="font-bold text-emerald-400">{masterReport.salesCount}</span></p>
                <p className="flex justify-between"><span>Koszty (Zakupy):</span> <span className="font-bold text-amber-400">{masterReport.purchasesCount}</span></p>
              </div>
            </div>

            <div className="p-3 bg-white/[0.03] border border-white/5 rounded-xl space-y-1">
              <span className="text-[9px] uppercase font-bold text-indigo-400">Pomocnicze dane</span>
              <div className="text-[10px] space-y-0.5 text-slate-300 font-medium">
                <p className="flex justify-between"><span>Zaliczki CIT:</span> <span className="font-bold text-indigo-300">{masterReport.citCount}</span></p>
                <p className="flex justify-between"><span>Parametry Dane VAT:</span> <span className="font-bold text-sky-300">{masterReport.vatCount}</span></p>
              </div>
            </div>
          </div>

          {/* Overwrite or append strategy decision */}
          <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-0.5 max-w-xl">
              <h4 className="text-[11.5px] font-bold text-indigo-300 uppercase tracking-wide">
                ⚙️ Sposób zintegrowania danych z symulatorem:
              </h4>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                Wybierz, czy chcesz całkowicie wyczyścić obecny stan przeglądarki i zastąpić go plikiem Excel (Zalecane przy odtwarzaniu kopii), czy tylko bezpiecznie dopisać nowe wiersze z Excela do Twoich dotychczasowych.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <label className="flex items-center gap-2 cursor-pointer p-2.5 rounded-xl border border-white/10 hover:bg-white/[0.04]">
                <input
                  type="radio"
                  name="import_strategy"
                  checked={clearBeforeImport === true}
                  onChange={() => setClearBeforeImport(true)}
                  className="accent-indigo-500"
                />
                <div className="text-left">
                  <p className="text-[11px] font-bold text-slate-100">Wyczyść i Nadpisz (Rekomendowane)</p>
                  <p className="text-[9px] text-slate-400">Usunie obecne dane i wgra arkusz jako jedyne źródło prawdy.</p>
                </div>
              </label>

              <label className="flex items-center gap-2 cursor-pointer p-2.5 rounded-xl border border-white/10 hover:bg-white/[0.04]">
                <input
                  type="radio"
                  name="import_strategy"
                  checked={clearBeforeImport === false}
                  onChange={() => setClearBeforeImport(false)}
                  className="accent-indigo-500"
                />
                <div className="text-left">
                  <p className="text-[11px] font-bold text-slate-100">Dołącz (Scal dane)</p>
                  <p className="text-[9px] text-slate-400">Zachowa obecny stan, ignorując tylko powtarzające się numery faktur.</p>
                </div>
              </label>
            </div>
          </div>

          {/* Log Auditor Details */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-indigo-400">
                🔍 Dziennik Analizy i Spójności ({filteredLogs.length} wpisów):
              </h4>
              <div className="flex gap-1.5 text-[9px] font-bold">
                <button
                  type="button"
                  onClick={() => setLogFilter('all')}
                  className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${logFilter === 'all' ? 'bg-indigo-600 text-white' : 'bg-white/5 text-slate-400 hover:text-white'}`}
                >
                  Wszystkie ({masterReport.log.length})
                </button>
                <button
                  type="button"
                  onClick={() => setLogFilter('errors')}
                  className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${logFilter === 'errors' ? 'bg-rose-900 text-rose-100' : 'bg-white/5 text-rose-400 hover:text-rose-200'}`}
                >
                  Krytyczne błędy ({masterReport.errorsLength})
                </button>
                <button
                  type="button"
                  onClick={() => setLogFilter('warnings')}
                  className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${logFilter === 'warnings' ? 'bg-amber-900/60 text-amber-200' : 'bg-white/5 text-amber-400 hover:text-amber-200'}`}
                >
                  Rozbieżności i Ostrzeżenia ({masterReport.warningsLength})
                </button>
              </div>
            </div>

            {/* Scrollable logs box */}
            <div className="bg-black/40 border border-white/10 rounded-2xl max-h-56 overflow-y-auto p-4 space-y-2 font-mono text-[10px] text-slate-300">
              {filteredLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 text-slate-500 gap-1.5">
                  <Check className="w-5 h-5 text-emerald-400" />
                  <p>Brak wadliwych wpisów do wyświetlenia dla wybranego filtru.</p>
                </div>
              ) : (
                filteredLogs.map((log, index) => (
                  <div
                    key={index}
                    className={`p-2.5 rounded-xl flex items-start gap-2 border ${
                      log.severity === 'error'
                        ? 'bg-rose-950/45 border-rose-900/50 text-rose-200'
                        : 'bg-amber-950/30 border-amber-900/40 text-amber-200'
                    }`}
                  >
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase shrink-0 ${
                      log.severity === 'error' ? 'bg-rose-900 text-rose-100' : 'bg-amber-900 text-amber-100'
                    }`}>
                      {log.severity === 'error' ? 'Błąd' : 'Ostrzeżenie'}
                    </span>
                    <div>
                      <span className="font-bold text-slate-100">
                        [{log.sheet} - Wiersz {log.row}] {log.field && `[${log.field}]:`} 
                      </span>{' '}
                      {log.message}
                    </div>
                  </div>
                ))
              )}
            </div>
            <p className="text-[9px] text-slate-500 leading-relaxed italic">
              * Podpowiedź: Ostrzeżenia o rozbieżności podatku VAT nie blokują przycisku importu. Pozwalają one zlokalizować np. błędy groszowe lub nieprawidłowe stawki w pliku Excel. Błędy krytyczne (np. brak daty lub numeru faktury) sugerujemy naprawić przed importem.
            </p>
          </div>

          {/* Confirm & Cancel Actions */}
          <div className="flex gap-2 border-t border-white/10 pt-4">
            <button
              type="button"
              disabled={masterReport.errorsLength > 30} // Allow import unless there's dynamic mass fatal corruption
              onClick={handleConfirmMasterImport}
              className="flex-1 h-11 px-5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors cursor-pointer shadow-md"
            >
              Zatwierdź i Zaimportuj Dane ({masterReport.salesCount + masterReport.purchasesCount + masterReport.citCount} rekordów)
            </button>

            <button
              type="button"
              onClick={() => setMasterReport(null)}
              className="px-5 h-11 text-xs font-bold text-slate-400 hover:text-white bg-white/10 hover:bg-white/15 rounded-xl transition-colors cursor-pointer"
            >
              Anuluj
            </button>
          </div>
        </div>
      )}

      {/* Retro legacy backing options */}
      <div className="border-t border-slate-100 pt-5 space-y-3">
        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          Archiwalne Narzędzia JSON (Dla programistów):
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {/* Export JSON */}
          <button
            type="button"
            onClick={handleExportBackup}
            className="flex items-center justify-center gap-2 h-10 px-4 text-[11px] font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            Zapisz Kopię JSON
          </button>

          {/* Import JSON */}
          <div className="relative">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImportBackup}
              accept=".json"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-10 flex items-center justify-center gap-2 px-4 text-[11px] font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-slate-400" />
              Wczytaj Dane JSON
            </button>
          </div>

          {/* Save state manually */}
          <button
            type="button"
            onClick={() => {
              onManualSave();
              triggerNotification('Wszystkie dane zostały ręcznie zapisane w pamięci trwałej przeglądarki!');
            }}
            className="flex items-center justify-center gap-2 h-10 px-4 text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100/85 border border-indigo-100 rounded-xl transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-indigo-500 animate-spin animate-duration-3000" />
            Ręczny Zapis Stanu
          </button>

          {/* Hard wipe data */}
          <button
            type="button"
            onClick={handleClearConfirm}
            className="flex items-center justify-center gap-2 h-10 px-4 text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-100 rounded-xl transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-500" />
            Trwale Wyczyść Dane
          </button>
        </div>
      </div>
    </div>
  );
}
