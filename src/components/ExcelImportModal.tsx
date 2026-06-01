import React, { useState, useRef, useEffect } from 'react';
import {
  ImportType,
  ColumnMapping,
  ValidationError,
  ParsedRowResult,
  SaleTransaction,
  PurchaseTransaction,
  CitAdvance,
  VatRegistry,
  AppState
} from '../types';
import { parseExcelFile, guessColumnMapping, validateImportRows } from '../utils/excelHandler';
import { MONTHS_PL, getMonthName } from '../utils/taxCalc';
import {
  Upload,
  FileSpreadsheet,
  Settings2,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ChevronRight,
  Info,
  Calendar,
  Layers,
  ArrowRight,
  HelpCircle,
  Check,
  ShieldCheck,
  FileText
} from 'lucide-react';

interface ExcelImportModalProps {
  state: AppState;
  onImportCompleted: (importedData: {
    sales: SaleTransaction[];
    purchases: PurchaseTransaction[];
    citAdvances: CitAdvance[];
    vatRegistry: VatRegistry[];
  }, overwriteStrategy: 'append' | 'overwrite' | 'skip_duplicates' | 'separate_version') => void;
  onClose: () => void;
}

export default function ExcelImportModal({
  state,
  onImportCompleted,
  onClose,
}: ExcelImportModalProps) {
  // Phase of wizard: 'upload' | 'mapping' | 'preview_and_validate'
  const [phase, setPhase] = useState<'upload' | 'mapping' | 'preview_and_validate'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [importType, setImportType] = useState<ImportType>('sprzedaz');
  
  // Available sheets and selected sheet
  const [sheetsData, setSheetsData] = useState<{ [sheetName: string]: any[] }>({});
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  
  // Mapping state
  const [mapping, setMapping] = useState<ColumnMapping>({
    data: '',
    numerFaktury: '',
    kontrahent: '',
    netto: '',
    stawkaVat: '',
    vat: '',
    brutto: '',
    czyCIT: '',
    czyVAT: '',
    dostawca: '',
    kategoria: '',
    kosztCIT: '',
    odliczenieVat: '',
    miesiac: '',
    kwota: '',
    dataZaplaty: '',
    notatka: '',
    vatNalezny: '',
    vatNaliczony: '',
    nadwyzkaZPoprzedniego: '',
    korektyVat: ''
  });

  // Validation results
  const [parsedResults, setParsedResults] = useState<ParsedRowResult[]>([]);
  const [validationTotals, setValidationTotals] = useState<any>({});
  
  // Duplication Overwrite Strategy
  // Spec: 'dodać nowe dane do istniejących' (append), 'nadpisać dane za miesiąc' (overwrite), 'pominąć duplikaty' (skip_duplicates), 'nowa wersja symulacji' (separate_version)
  const [overwriteStrategy, setOverwriteStrategy] = useState<'append' | 'overwrite' | 'skip_duplicates' | 'separate_version'>('skip_duplicates');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);

  // File drag & drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => {
    setDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await processSelectedFile(files[0]);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await processSelectedFile(files[0]);
    }
  };

  const processSelectedFile = async (selectedFile: File) => {
    setIsProcessingFile(true);
    try {
      setFile(selectedFile);
      const parsedSheets = await parseExcelFile(selectedFile);
      setSheetsData(parsedSheets);
      
      // Select first sheet by default
      const sheetNames = Object.keys(parsedSheets);
      if (sheetNames.length > 0) {
        setSelectedSheet(sheetNames[0]);
        // Auto guess mapping based on first sheet's rows
        const firstRow = parsedSheets[sheetNames[0]][0];
        const guessed = guessColumnMapping(firstRow, importType);
        setMapping(guessed);
      }
      setPhase('mapping');
    } catch (err) {
      alert('Nie udało się odczytać pliku Excel. Upewnij się, że plik nie jest uszkodzony.');
    } finally {
      setIsProcessingFile(false);
    }
  };

  // Whenever import type or selected sheet changes, re-guess mapping
  useEffect(() => {
    if (selectedSheet && sheetsData[selectedSheet]) {
      const sampleRow = sheetsData[selectedSheet][0];
      const guessed = guessColumnMapping(sampleRow, importType);
      setMapping(guessed);
    }
  }, [importType, selectedSheet, sheetsData]);

  const handleMappingFieldChange = (key: keyof ColumnMapping, value: string) => {
    setMapping((prev) => ({
      ...prev,
      [key]: value
    }));
  };

  const executeValidation = () => {
    if (!selectedSheet || !sheetsData[selectedSheet]) return;
    
    const rows = sheetsData[selectedSheet];
    const { parsedResults: validated, totals } = validateImportRows(
      rows,
      importType,
      mapping,
      state.settings.miesiacPodatkowy,
      state.settings.rokPodatkowy,
      state.sales,
      state.purchases
    );

    setParsedResults(validated);
    setValidationTotals(totals);
    setPhase('preview_and_validate');
  };

  const handleConfirmImport = () => {
    // Separate variables representing imported objects
    const importedSales: SaleTransaction[] = [];
    const importedPurchases: PurchaseTransaction[] = [];
    const importedCitAdvances: CitAdvance[] = [];
    const importedVatRegistry: VatRegistry[] = [];

    parsedResults.forEach((res) => {
      if (!res.validatedData) return;
      
      // Skip row if it has blocking errors
      const hasErrors = res.errors.some((err) => err.severity === 'error');
      if (hasErrors) return;

      if (importType === 'sprzedaz') {
        importedSales.push(res.validatedData as SaleTransaction);
      } else if (importType === 'zakupy') {
        importedPurchases.push(res.validatedData as PurchaseTransaction);
      } else if (importType === 'zaliczki_cit') {
        importedCitAdvances.push(res.validatedData as CitAdvance);
      } else if (importType === 'nadwyzki_vat') {
        importedVatRegistry.push(res.validatedData as VatRegistry);
      }
    });

    onImportCompleted({
      sales: importedSales,
      purchases: importedPurchases,
      citAdvances: importedCitAdvances,
      vatRegistry: importedVatRegistry
    }, overwriteStrategy);
  };

  const sampleColumns = selectedSheet && sheetsData[selectedSheet] && sheetsData[selectedSheet].length > 0
    ? Object.keys(sheetsData[selectedSheet][0])
    : [];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/45 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-fade-in animate-duration-200">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2 font-display">
              <FileSpreadsheet className="w-5.5 h-5.5 text-indigo-600 font-bold" />
              Kreator Importu danych z Excela / CSV
            </h2>
            <p className="text-xs text-slate-400 mt-1 font-sans">
              {file ? `Przetwarzasz: ${file.name}` : 'Zaimportuj sprzedaż, koszty, zaliczki CIT lub rejestr VAT'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full border border-slate-250 text-slate-400 hover:text-slate-700 bg-white hover:bg-slate-50 flex items-center justify-center transition-all cursor-pointer font-bold text-lg"
          >
            &times;
          </button>
        </div>

        {/* Steps Breadcrumbs */}
        <div className="px-6 py-3.5 bg-slate-50 border-b border-slate-100 flex items-center gap-6 text-xs font-semibold">
          <div className="flex items-center gap-2">
            <span className={`w-5.5 h-5.5 rounded-full flex items-center justify-center text-[11px] font-bold ${phase === 'upload' ? 'bg-indigo-600 text-white' : 'bg-emerald-100 text-emerald-800'}`}>
              {phase !== 'upload' ? <Check className="w-3 h-3" /> : '1'}
            </span>
            <span className={phase === 'upload' ? 'text-slate-900 font-bold' : 'text-slate-400'}>Wybór Pliku i Typu</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
          <div className="flex items-center gap-2">
            <span className={`w-5.5 h-5.5 rounded-full flex items-center justify-center text-[11px] font-bold ${phase === 'mapping' ? 'bg-indigo-600 text-white' : phase === 'preview_and_validate' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-500'}`}>
              {phase === 'preview_and_validate' ? <Check className="w-3 h-3" /> : '2'}
            </span>
            <span className={phase === 'mapping' ? 'text-slate-900 font-bold' : 'text-slate-400'}>Mapowanie Kolumn</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
          <div className="flex items-center gap-2">
            <span className={`w-5.5 h-5.5 rounded-full flex items-center justify-center text-[11px] font-bold ${phase === 'preview_and_validate' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-400'}`}>
              3
            </span>
            <span className={phase === 'preview_and_validate' ? 'text-slate-900 font-bold' : 'text-slate-400'}>Walidacja i Podgląd</span>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Phase 1: Upload and Import Type */}
          {phase === 'upload' && (
            <div className="space-y-6">
              {/* Type Selector */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2 font-display">
                  <Layers className="w-4 h-4 text-indigo-500" />
                  Wybierz rodzaj importowanych danych
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { id: 'sprzedaz', title: 'Rejestr Sprzedaży', desc: 'Faktury sprzedażowe, Należny VAT, przychody do CIT' },
                    { id: 'zakupy', title: 'Zakupy i Koszty', desc: 'Koszty operacyjne KUP, odliczenia VAT, pojazdy' },
                    { id: 'zaliczki_cit', title: 'Zapłacone zaliczki CIT', desc: 'Suma podatków CIT zapłaconych w ubiegłych miesiącach' },
                    { id: 'nadwyzki_vat', title: 'Dane VAT & Nadwyżki', desc: 'Korekty i nadwyżka VAT przeniesiona z zeszłego okresu' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setImportType(t.id as ImportType)}
                      className={`p-4 rounded-xl text-left border transition-all cursor-pointer ${
                        importType === t.id
                          ? 'bg-indigo-50/60 border-indigo-500 shadow-xs'
                          : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                      }`}
                    >
                      <h4 className={`text-sm font-bold font-display ${importType === t.id ? 'text-indigo-900' : 'text-slate-800'}`}>
                        {t.title}
                      </h4>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">{t.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Drag drop slot */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider font-display">
                  Wgraj plik arkusza kalkulacyjnego (.xlsx, .xls lub .csv)
                </label>
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all flex flex-col items-center justify-center space-y-4 cursor-pointer ${
                    dragging
                      ? 'border-indigo-600 bg-indigo-55/10'
                      : 'border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/5'
                  }`}
                  onClick={() => fileInputRef.current?.click()}
                  id="drag-drop-zone"
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                  />
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-xs">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 font-display">
                      Przeciągnij i upuść plik tutaj lub <span className="text-indigo-600 hover:underline">wybierz z dysku</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">Obsługiwane formaty: Microsoft Excel (.xlsx, .xls) oraz CSV</p>
                  </div>
                </div>
              </div>

              {/* Sample format guides of specifications */}
              <div className="rounded-xl border border-gray-150 p-4 bg-indigo-50/40 text-xs text-gray-600 space-y-2.5">
                <span className="font-semibold text-indigo-950 flex items-center gap-1">
                  <Info className="w-4 h-4 text-indigo-600 shrink-0" />
                  Wskazówka: System dopasuje kolejność automatycznie!
                </span>
                <p className="text-slate-600 leading-relaxed text-[11.5px]">
                  Twój arkusz nie musi mieć idealnej kolejności kolumn ani konkretnego języka. W kroku 2 dopasujesz kolumny z pliku do pól programu. Pomożemy Ci, dopasowując automatycznie kolumny o nazwach zbieżnych ze standardem eksportu KSeF (np. <i>data otrzymania, identyfikator ksef, wartość netto</i>).
                </p>
              </div>

              {/* Dynamic KSeF & Aggregation Format Explorer */}
              <div className="bg-slate-50 border border-slate-200/85 rounded-2xl p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-indigo-100 rounded-lg text-indigo-700">
                      <FileText className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-[12px] uppercase tracking-wider">
                        📋 Wymagane nagłówki pliku Excel / CSV & KSeF: {importType === 'sprzedaz' ? 'Rejestr Sprzedaży' : importType === 'zakupy' ? 'Zakupy i Koszty' : importType === 'zaliczki_cit' ? 'Zaliczki CIT' : 'Dane VAT i Nadwyżki'}
                      </h4>
                      <p className="text-[11px] text-slate-500">Poniżej znajduje się idealna struktura kolumn dla wybranego typu importu wraz z przykładem agregacji:</p>
                    </div>
                  </div>
                  <span className="text-[10px] uppercase font-bold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full inline-block self-start sm:self-auto">
                    KSeF Standard Ready
                  </span>
                </div>

                {/* File Layout Table Mockup */}
                <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-xs">
                  <table className="w-full text-left font-sans text-[11px] border-collapse min-w-[650px]">
                    <thead>
                      <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-150 text-[10px] uppercase tracking-wider">
                        {importType === 'sprzedaz' && (
                          <>
                            <th className="px-3.5 py-2.5 border-r border-slate-150 bg-slate-100/30">data wystawienia *</th>
                            <th className="px-3.5 py-2.5 border-r border-slate-150 bg-slate-100/30">identyfikator ksef * <span className="text-slate-400 font-normal lowercase">(nr faktury)</span></th>
                            <th className="px-3.5 py-2.5 border-r border-slate-150">nazwa nabywcy</th>
                            <th className="px-3.5 py-2.5 border-r border-slate-150 text-right">wartość netto *</th>
                            <th className="px-3.5 py-2.5 border-r border-slate-150 text-center">stawka vat</th>
                            <th className="px-3.5 py-2.5 text-right">kwota vat</th>
                          </>
                        )}
                        {importType === 'zakupy' && (
                          <>
                            <th className="px-3.5 py-2.5 border-r border-slate-150 bg-slate-100/30">data otrzymania *</th>
                            <th className="px-3.5 py-2.5 border-r border-slate-150 bg-slate-100/30">identyfikator ksef * <span className="text-slate-400 font-normal lowercase">(nr faktury)</span></th>
                            <th className="px-3.5 py-2.5 border-r border-slate-150">nazwa sprzedawcy</th>
                            <th className="px-3.5 py-2.5 border-r border-slate-150">kategoria</th>
                            <th className="px-3.5 py-2.5 border-r border-slate-150 text-right">wartość netto *</th>
                            <th className="px-3.5 py-2.5 border-r border-slate-150 text-center">koszt cit <span className="text-slate-400 font-normal">(KUP)</span></th>
                            <th className="px-3.5 py-2.5 text-right">odliczenie vat</th>
                          </>
                        )}
                        {importType === 'zaliczki_cit' && (
                          <>
                            <th className="px-3.5 py-2.5 border-r border-slate-150 bg-slate-100/30">miesiąc * <span className="text-slate-400 font-normal lowercase">(okres)</span></th>
                            <th className="px-3.5 py-2.5 border-r border-slate-150 text-right bg-slate-100/30">kwota zaliczki *</th>
                            <th className="px-3.5 py-2.5 border-r border-slate-150">data zapłaty</th>
                            <th className="px-3.5 py-2.5">notatka / opis</th>
                          </>
                        )}
                        {importType === 'nadwyzki_vat' && (
                          <>
                            <th className="px-3.5 py-2.5 border-r border-slate-150 bg-slate-100/30">miesiąc * <span className="text-slate-400 font-normal lowercase">(okres)</span></th>
                            <th className="px-3.5 py-2.5 border-r border-slate-150 text-right">vat należny</th>
                            <th className="px-3.5 py-2.5 border-r border-slate-150 text-right">vat naliczony</th>
                            <th className="px-3.5 py-2.5 border-r border-slate-150 text-right bg-slate-100/30">nadwyzka z poprzedniego</th>
                            <th className="px-3.5 py-2.5 text-right">korekty vat</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {/* Row 1: Regular Sample Row */}
                      <tr className="border-b border-slate-100 text-slate-800 bg-white hover:bg-slate-50/50 transition-colors">
                        {importType === 'sprzedaz' && (
                          <>
                            <td className="px-3.5 py-2 border-r border-slate-150 font-mono text-[10px] text-slate-600">2026-04-12</td>
                            <td className="px-3.5 py-2 border-r border-slate-150 font-mono text-[10px] text-indigo-950 font-medium">1234567890-20260412-12A34B-56</td>
                            <td className="px-3.5 py-2 border-r border-slate-150 text-slate-700">Acme Corporation Sp. z o.o.</td>
                            <td className="px-3.5 py-2 border-r border-slate-150 text-right font-semibold text-slate-900">10 000,00</td>
                            <td className="px-3.5 py-2 border-r border-slate-150 text-center font-mono">23%</td>
                            <td className="px-3.5 py-2 text-right font-mono">2 300,00</td>
                          </>
                        )}
                        {importType === 'zakupy' && (
                          <>
                            <td className="px-3.5 py-2 border-r border-slate-150 font-mono text-[10px] text-slate-600">2026-04-14</td>
                            <td className="px-3.5 py-2 border-r border-slate-150 font-mono text-[10px] text-indigo-950 font-medium">9876543210-20260414-98C76D-21</td>
                            <td className="px-3.5 py-2 border-r border-slate-150 text-slate-700">Orlen S.A.</td>
                            <td className="px-3.5 py-2 border-r border-slate-150"><span className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded text-[10px] font-medium">Pojazdy</span></td>
                            <td className="px-3.5 py-2 border-r border-slate-150 text-right font-semibold text-slate-900">350,00</td>
                            <td className="px-3.5 py-2 border-r border-slate-150 text-center font-bold text-emerald-700 font-sans text-[10px]">TAK</td>
                            <td className="px-3.5 py-2 text-right text-amber-900 font-medium">50%</td>
                          </>
                        )}
                        {importType === 'zaliczki_cit' && (
                          <>
                            <td className="px-3.5 py-2 border-r border-slate-150 font-bold text-slate-900">Styczeń</td>
                            <td className="px-3.5 py-2 border-r border-slate-150 text-right font-semibold text-indigo-950">1 450,00</td>
                            <td className="px-3.5 py-2 border-r border-slate-150 font-mono text-[10px] text-slate-500">2026-02-20</td>
                            <td className="px-3.5 py-2 text-slate-500">Przelew zaliczki CIT za styczeń 2026</td>
                          </>
                        )}
                        {importType === 'nadwyzki_vat' && (
                          <>
                            <td className="px-3.5 py-2 border-r border-slate-150 font-bold text-slate-900">Styczeń</td>
                            <td className="px-3.5 py-2 border-r border-slate-150 text-right font-mono text-slate-600">15 400,00</td>
                            <td className="px-3.5 py-2 border-r border-slate-150 text-right font-mono text-slate-600">11 200,00</td>
                            <td className="px-3.5 py-2 border-r border-slate-150 text-right font-mono text-indigo-700 font-medium bg-indigo-50/20">4 500,00</td>
                            <td className="px-3.5 py-2 text-right font-mono text-slate-600">0,00</td>
                          </>
                        )}
                      </tr>

                      {/* Row 2: Suggested Monthly AGGREGATE row */}
                      <tr className="border-b border-indigo-100 text-slate-800 bg-amber-50/50 hover:bg-amber-100/30 transition-colors">
                        {importType === 'sprzedaz' && (
                          <>
                            <td className="px-3.5 py-2 border-r border-slate-150 font-mono text-[10px] text-amber-900">2026-01-31</td>
                            <td className="px-3.5 py-2 border-r border-slate-150 font-mono text-[10px] text-amber-900 font-bold">SUMA_SPRZEDAZ_M01</td>
                            <td className="px-3.5 py-2 border-r border-slate-150 text-amber-950 font-semibold flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse inline-block" />
                              📊 AGREGAT MIESIĘCZNY (Styczeń)
                            </td>
                            <td className="px-3.5 py-2 border-r border-slate-150 text-right font-bold text-amber-950">54 200,50</td>
                            <td className="px-3.5 py-2 border-r border-slate-150 text-center font-mono text-amber-900 font-bold">23%</td>
                            <td className="px-3.5 py-2 text-right font-mono text-amber-900 font-bold">12 466,12</td>
                          </>
                        )}
                        {importType === 'zakupy' && (
                          <>
                            <td className="px-3.5 py-2 border-r border-slate-150 font-mono text-[10px] text-amber-900">2026-01-31</td>
                            <td className="px-3.5 py-2 border-r border-slate-150 font-mono text-[10px] text-amber-900 font-bold">SUMA_KOSZTY_M01</td>
                            <td className="px-3.5 py-2 border-r border-slate-150 text-amber-950 font-semibold flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse inline-block" />
                              📊 AGREGAT MIESIĘCZNY (Styczeń)
                            </td>
                            <td className="px-3.5 py-2 border-r border-slate-150"><span className="bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded text-[10px] font-bold">Inne</span></td>
                            <td className="px-3.5 py-2 border-r border-slate-150 text-right font-bold text-amber-950">22 150,00</td>
                            <td className="px-3.5 py-2 border-r border-slate-150 text-center font-bold text-emerald-800 font-sans text-[10px]">TAK</td>
                            <td className="px-3.5 py-2 text-right text-indigo-900 font-bold">100%</td>
                          </>
                        )}
                        {importType === 'zaliczki_cit' && (
                          <>
                            <td className="px-3.5 py-2 border-r border-slate-150 font-bold text-slate-900">Luty</td>
                            <td className="px-3.5 py-2 border-r border-slate-150 text-right font-semibold text-indigo-950">2 890,00</td>
                            <td className="px-3.5 py-2 border-r border-slate-150 font-mono text-[10px] text-slate-500">2026-03-20</td>
                            <td className="px-3.5 py-2 text-slate-500">Przelew zaliczki CIT za luty 2026</td>
                          </>
                        )}
                        {importType === 'nadwyzki_vat' && (
                          <>
                            <td className="px-3.5 py-2 border-r border-slate-150 font-bold text-slate-900">Luty</td>
                            <td className="px-3.5 py-2 border-r border-slate-150 text-right font-mono text-slate-600">19 800,00</td>
                            <td className="px-3.5 py-2 border-r border-slate-150 text-right font-mono text-slate-600">16 500,00</td>
                            <td className="px-3.5 py-2 border-r border-slate-150 text-right font-mono text-slate-600">0,00</td>
                            <td className="px-3.5 py-2 text-right font-mono text-slate-600">0,00</td>
                          </>
                        )}
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Import Guideline Text Explanation */}
                <div className="bg-indigo-50/60 border border-indigo-150 rounded-xl p-3.5 text-[11px] text-indigo-950 space-y-2 leading-relaxed">
                  <h5 className="font-bold text-indigo-950 flex items-center gap-1.5 text-xs">
                    <span className="text-xl">🎓</span> Jak prawidłowo i szybko zainicjować historię firmy (Metoda Zgrupowana):
                  </h5>
                  {importType === 'sprzedaz' ? (
                    <p className="text-slate-700">
                      Jeśli masz już aktywną działalność i chcesz minimalnym kosztem przenieść dane chronologiczne od <strong>stycznia 2026</strong>, nie musisz importować każdej faktury osobno. Wpisz w arkuszu po jednym zbiorczym wierszu dla każdego minionego miesiąca. Użyj daty ostatniego dnia miesiąca (np. <kbd className="bg-white/80 px-1 border border-slate-200 rounded font-mono text-[10px]">2026-01-31</kbd>) i nadaj wierszowi fikcyjny identyfikator KSeF (np. <kbd className="bg-white/80 px-1 border border-slate-200 rounded font-mono text-[10px]">SUMA_SPRZEDAZ_M01</kbd>). Podaj łączne wartości Netto oraz VAT. Narzędzie automatycznie rozliczy te miesiące jako poprawne przychody!
                    </p>
                  ) : importType === 'zakupy' ? (
                    <p className="text-slate-700">
                      Zamiast wgrywania setek pojedynczych paragonów czy faktur kosztowych, dodaj jeden skumulowany wiersz na miesiąc dla każdej głównej kategorii kosztów (np. <kbd className="bg-white/80 px-1 border border-slate-200 rounded font-mono text-[10px]">SUMA_KOSZTY_M01</kbd>) z datą np. <kbd className="bg-white/80 px-1 border border-slate-200 rounded font-mono text-[10px]">2026-01-31</kbd> i stopniem odliczenia VAT 100% lub 50% dla pojazdów. W ten sposób zachowasz prawidłową tarczę podatkową CIT oraz rejestr naliczonego podatku VAT przy minimalnej pracy ręcznej.
                    </p>
                  ) : importType === 'zaliczki_cit' ? (
                    <p className="text-slate-700">
                      Zaliczki CIT są płacone narastająco w skali roku. Aby kalkulacja podatku dla kolejnych miesięcy bieżącego roku była całkowicie bezbłędna, zaimportuj lub wpisz sumaryczną kwotę zaliczek, które zostały odprowadzone do Twojego Urzędu Skarbowego za styczeń, luty lub kolejne miesiące od początku 2026 roku.
                    </p>
                  ) : (
                    <p className="text-slate-700">
                      Płynność rozliczeń podatku VAT opiera się na ciągłości. Najistotniejszym parametrem bilansu otwarcia jest <strong>nadwyżka podatku VAT naliczonego nad należnym z poprzedniego okresu (np. z grudnia 2025 r.)</strong>. Wpisz tę kwotę w pierwszym wierszu (styczniowym) w kolumnie <i>nadwyzka z poprzedniego</i>. Dzięki temu kwota zostanie przeniesiona na styczeń 2026 roku, odpalając prawidłowy ciąg rozliczeniowy!
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Phase 2: Mapping columns */}
          {phase === 'mapping' && (
            <div className="space-y-6">
              
              <div className="p-4 rounded-xl bg-sky-50 border border-sky-100 text-xs text-sky-950 flex items-start gap-2.5">
                <Settings2 className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">Krok Mapowania Kolumn:</span> Sprawdź, czy pola rozpoznane automatycznie z Twojego pliku poprawne odzwierciedlają kolumny arkusza. Jeśli Twoje kolumny mają inne nazwy, wybierz pasujące pozycje z list rozwijanych.
                </div>
              </div>

              {/* Sheet selector */}
              {Object.keys(sheetsData).length > 1 && (
                <div className="flex items-center gap-3 bg-gray-100 p-3 rounded-xl text-xs">
                  <span className="font-bold text-gray-700">Wykryto wiele zakładek w pliku Excel. Wybierz arkusz:</span>
                  <select
                    className="bg-white border border-gray-200 rounded px-2.5 py-1 text-xs text-gray-900 cursor-pointer font-medium focus:outline-hidden"
                    value={selectedSheet}
                    onChange={(e) => setSelectedSheet(e.target.value)}
                  >
                    {Object.keys(sheetsData).map((s) => (
                      <option key={s} value={s}>
                        {s} ({sheetsData[s].length} wierszy)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Map list */}
              <div className="border border-gray-150 rounded-xl overflow-hidden bg-white">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 font-bold">
                      <th className="px-4 py-3">Dane w aplikacji</th>
                      <th className="px-4 py-3">Rekomendacja/Opis pola</th>
                      <th className="px-4 py-3 w-1/3">Wybrana Kolumna w Excelu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Render fields relative to importType */}
                    {importType === 'sprzedaz' && (
                      <>
                        <tr>
                          <td className="px-4 py-3 font-semibold text-gray-950">Data faktury *</td>
                          <td className="px-4 py-3 text-gray-500">Data wystawienia sprzedaży (np. YYYY-MM-DD)</td>
                          <td className="px-4 py-3">
                            <select
                              className="w-full h-8 px-2 bg-gray-50 border border-gray-200 rounded text-xs"
                              value={mapping.data}
                              onChange={(e) => handleMappingFieldChange('data', e.target.value)}
                            >
                              <option value="">-- wybierz kolumnę --</option>
                              {sampleColumns.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </td>
                        </tr>
                        <tr>
                          <td className="px-4 py-3 font-semibold text-gray-950">Numer faktury *</td>
                          <td className="px-4 py-3 text-gray-500">Unikalne oznaczenie faktury sprzedaży</td>
                          <td className="px-4 py-3">
                            <select
                              className="w-full h-8 px-2 bg-gray-50 border border-gray-200 rounded text-xs"
                              value={mapping.numerFaktury}
                              onChange={(e) => handleMappingFieldChange('numerFaktury', e.target.value)}
                            >
                              <option value="">-- wybierz kolumnę --</option>
                              {sampleColumns.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </td>
                        </tr>
                        <tr>
                          <td className="px-4 py-3 font-semibold text-gray-950">Kontrahent</td>
                          <td className="px-4 py-3 text-gray-500">Nazwa nabywcy/klienta</td>
                          <td className="px-4 py-3">
                            <select
                              className="w-full h-8 px-2 bg-gray-50 border border-gray-200 rounded text-xs"
                              value={mapping.kontrahent}
                              onChange={(e) => handleMappingFieldChange('kontrahent', e.target.value)}
                            >
                              <option value="">-- wybierz kolumnę (opcjonalne) --</option>
                              {sampleColumns.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </td>
                        </tr>
                        <tr>
                          <td className="px-4 py-3 font-semibold text-gray-950">Kwota netto *</td>
                          <td className="px-4 py-3 text-gray-500">Wartość netto sprzedaży</td>
                          <td className="px-4 py-3">
                            <select
                              className="w-full h-8 px-2 bg-gray-50 border border-gray-200 rounded text-xs"
                              value={mapping.netto}
                              onChange={(e) => handleMappingFieldChange('netto', e.target.value)}
                            >
                              <option value="">-- wybierz kolumnę --</option>
                              {sampleColumns.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </td>
                        </tr>
                        <tr>
                          <td className="px-4 py-3 font-semibold text-gray-950">Stawka VAT</td>
                          <td className="px-4 py-3 text-gray-500">Stawka procentowa (np. 23%, 8% lub 0.23)</td>
                          <td className="px-4 py-3">
                            <select
                              className="w-full h-8 px-2 bg-gray-50 border border-gray-200 rounded text-xs"
                              value={mapping.stawkaVat}
                              onChange={(e) => handleMappingFieldChange('stawkaVat', e.target.value)}
                            >
                              <option value="">-- wybierz kolumnę (domyślna 23%) --</option>
                              {sampleColumns.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </td>
                        </tr>
                        <tr>
                          <td className="px-4 py-3 font-semibold text-gray-950">Suma VAT</td>
                          <td className="px-4 py-3 text-gray-500">Wartość podatku VAT (lub wylicz ze stawki)</td>
                          <td className="px-4 py-3">
                            <select
                              className="w-full h-8 px-2 bg-gray-50 border border-gray-200 rounded text-xs"
                              value={mapping.vat}
                              onChange={(e) => handleMappingFieldChange('vat', e.target.value)}
                            >
                              <option value="">-- wybierz lub oblicz automatycznie --</option>
                              {sampleColumns.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </td>
                        </tr>
                        <tr>
                          <td className="px-4 py-3 font-semibold text-gray-950">Czy wchodzi do CIT</td>
                          <td className="px-4 py-3 text-gray-500">Flaga TAK / NIE dla przychodu do CIT</td>
                          <td className="px-4 py-3">
                            <select
                              className="w-full h-8 px-2 bg-gray-50 border border-gray-200 rounded text-xs"
                              value={mapping.czyCIT}
                              onChange={(e) => handleMappingFieldChange('czyCIT', e.target.value)}
                            >
                              <option value="">-- domyślnie TAK --</option>
                              {sampleColumns.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </td>
                        </tr>
                        <tr>
                          <td className="px-4 py-3 font-semibold text-gray-950">Czy wchodzi do VAT</td>
                          <td className="px-4 py-3 text-gray-500">Flaga TAK / NIE dla ujęcia w rejestrze VAT</td>
                          <td className="px-4 py-3">
                            <select
                              className="w-full h-8 px-2 bg-gray-50 border border-gray-200 rounded text-xs"
                              value={mapping.czyVAT}
                              onChange={(e) => handleMappingFieldChange('czyVAT', e.target.value)}
                            >
                              <option value="">-- domyślnie TAK --</option>
                              {sampleColumns.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </td>
                        </tr>
                      </>
                    )}

                    {importType === 'zakupy' && (
                      <>
                        <tr>
                          <td className="px-4 py-3 font-semibold text-gray-950">Data zakupu *</td>
                          <td className="px-4 py-3 text-gray-500">Data wystawienia faktury kosztowej</td>
                          <td className="px-4 py-3">
                            <select
                              className="w-full h-8 px-2 bg-gray-50 border border-gray-200 rounded text-xs"
                              value={mapping.data}
                              onChange={(e) => handleMappingFieldChange('data', e.target.value)}
                            >
                              <option value="">-- wybierz kolumnę --</option>
                              {sampleColumns.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </td>
                        </tr>
                        <tr>
                          <td className="px-4 py-3 font-semibold text-gray-950">Numer faktury *</td>
                          <td className="px-4 py-3 text-gray-500">Unikalne oznaczenie faktury dostawcy</td>
                          <td className="px-4 py-3">
                            <select
                              className="w-full h-8 px-2 bg-gray-50 border border-gray-200 rounded text-xs"
                              value={mapping.numerFaktury}
                              onChange={(e) => handleMappingFieldChange('numerFaktury', e.target.value)}
                            >
                              <option value="">-- wybierz kolumnę --</option>
                              {sampleColumns.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </td>
                        </tr>
                        <tr>
                          <td className="px-4 py-3 font-semibold text-gray-950">Dostawca / Sprzedawca</td>
                          <td className="px-4 py-3 text-gray-500">Nazwa wystawcy kosztu</td>
                          <td className="px-4 py-3">
                            <select
                              className="w-full h-8 px-2 bg-gray-50 border border-gray-200 rounded text-xs"
                              value={mapping.dostawca}
                              onChange={(e) => handleMappingFieldChange('dostawca', e.target.value)}
                            >
                              <option value="">-- wybierz kolumnę (opcjonalne) --</option>
                              {sampleColumns.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </td>
                        </tr>
                        <tr>
                          <td className="px-4 py-3 font-semibold text-gray-950">Kategoria kosztów</td>
                          <td className="px-4 py-3 text-gray-500">Grupa (paliwo, oprogramowanie, biuro, itp.)</td>
                          <td className="px-4 py-3">
                            <select
                              className="w-full h-8 px-2 bg-gray-50 border border-gray-200 rounded text-xs"
                              value={mapping.kategoria}
                              onChange={(e) => handleMappingFieldChange('kategoria', e.target.value)}
                            >
                              <option value="">-- wybierz lub domyślna 'Inne' --</option>
                              {sampleColumns.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </td>
                        </tr>
                        <tr>
                          <td className="px-4 py-3 font-semibold text-gray-950">Kwota netto *</td>
                          <td className="px-4 py-3 text-gray-500">Wartość netto kosztu</td>
                          <td className="px-4 py-3">
                            <select
                              className="w-full h-8 px-2 bg-gray-50 border border-gray-200 rounded text-xs"
                              value={mapping.netto}
                              onChange={(e) => handleMappingFieldChange('netto', e.target.value)}
                            >
                              <option value="">-- wybierz kolumnę --</option>
                              {sampleColumns.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </td>
                        </tr>
                        <tr>
                          <td className="px-4 py-3 font-semibold text-gray-950">Stawka VAT</td>
                          <td className="px-4 py-3 text-gray-500">Standardowa stawka kosztu (np. 23%)</td>
                          <td className="px-4 py-3">
                            <select
                              className="w-full h-8 px-2 bg-gray-50 border border-gray-200 rounded text-xs"
                              value={mapping.stawkaVat}
                              onChange={(e) => handleMappingFieldChange('stawkaVat', e.target.value)}
                            >
                              <option value="">-- wybierz lub domyślna 23% --</option>
                              {sampleColumns.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </td>
                        </tr>
                        <tr>
                          <td className="px-4 py-3 font-semibold text-gray-950">Kwota VAT</td>
                          <td className="px-4 py-3 text-gray-500">Podatek VAT wykazany na fakturze</td>
                          <td className="px-4 py-3">
                            <select
                              className="w-full h-8 px-2 bg-gray-50 border border-gray-200 rounded text-xs"
                              value={mapping.vat}
                              onChange={(e) => handleMappingFieldChange('vat', e.target.value)}
                            >
                              <option value="">-- wybierz lub oblicz automatycznie --</option>
                              {sampleColumns.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </td>
                        </tr>
                        <tr>
                          <td className="px-4 py-3 font-semibold text-gray-950">Koszt CIT KUP *</td>
                          <td className="px-4 py-3 text-gray-500">Czy stanowi koszt uzyskania przychodu (TAK/NIE)</td>
                          <td className="px-4 py-3">
                            <select
                              className="w-full h-8 px-2 bg-gray-50 border border-gray-200 rounded text-xs"
                              value={mapping.kosztCIT}
                              onChange={(e) => handleMappingFieldChange('kosztCIT', e.target.value)}
                            >
                              <option value="">-- domyślnie TAK --</option>
                              {sampleColumns.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </td>
                        </tr>
                        <tr>
                          <td className="px-4 py-3 font-semibold text-gray-950">Odliczenie VAT *</td>
                          <td className="px-4 py-3 text-gray-500">Stopień odliczenia: 100%, 50% (auto itp.), 0%</td>
                          <td className="px-4 py-3">
                            <select
                              className="w-full h-8 px-2 bg-gray-50 border border-gray-200 rounded text-xs"
                              value={mapping.odliczenieVat}
                              onChange={(e) => handleMappingFieldChange('odliczenieVat', e.target.value)}
                            >
                              <option value="">-- domyślnie 100% --</option>
                              {sampleColumns.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </td>
                        </tr>
                      </>
                    )}

                    {importType === 'zaliczki_cit' && (
                      <>
                        <tr>
                          <td className="px-4 py-3 font-semibold text-gray-950">Miesiąc zaliczki *</td>
                          <td className="px-4 py-3 text-gray-500">Miesiąc lub okres spłaty (np. Luty, 2 lub II)</td>
                          <td className="px-4 py-3">
                            <select
                              className="w-full h-8 px-2 bg-gray-50 border border-gray-200 rounded text-xs"
                              value={mapping.miesiac}
                              onChange={(e) => handleMappingFieldChange('miesiac', e.target.value)}
                            >
                              <option value="">-- wybierz kolumnę --</option>
                              {sampleColumns.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </td>
                        </tr>
                        <tr>
                          <td className="px-4 py-3 font-semibold text-gray-950">Kwota zaliczki *</td>
                          <td className="px-4 py-3 text-gray-500">Suma przekazanej płatności CIT</td>
                          <td className="px-4 py-3">
                            <select
                              className="w-full h-8 px-2 bg-gray-50 border border-gray-200 rounded text-xs"
                              value={mapping.kwota}
                              onChange={(e) => handleMappingFieldChange('kwota', e.target.value)}
                            >
                              <option value="">-- wybierz kolumnę --</option>
                              {sampleColumns.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </td>
                        </tr>
                        <tr>
                          <td className="px-4 py-3 font-semibold text-gray-950">Data zapłaty</td>
                          <td className="px-4 py-3 text-gray-500">Data przekazania zaliczki do urzędu</td>
                          <td className="px-4 py-3">
                            <select
                              className="w-full h-8 px-2 bg-gray-50 border border-gray-200 rounded text-xs"
                              value={mapping.dataZaplaty}
                              onChange={(e) => handleMappingFieldChange('dataZaplaty', e.target.value)}
                            >
                              <option value="">-- wybierz kolumnę (opcjonalne) --</option>
                              {sampleColumns.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </td>
                        </tr>
                        <tr>
                          <td className="px-4 py-3 font-semibold text-gray-950">Notatka / Opis</td>
                          <td className="px-4 py-3 text-gray-500">Krótki komentarz</td>
                          <td className="px-4 py-3">
                            <select
                              className="w-full h-8 px-2 bg-gray-50 border border-gray-200 rounded text-xs"
                              value={mapping.notatka}
                              onChange={(e) => handleMappingFieldChange('notatka', e.target.value)}
                            >
                              <option value="">-- wybierz kolumnę (opcjonalne) --</option>
                              {sampleColumns.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </td>
                        </tr>
                      </>
                    )}

                    {importType === 'nadwyzki_vat' && (
                      <>
                        <tr>
                          <td className="px-4 py-3 font-semibold text-gray-950">Miesiąc *</td>
                          <td className="px-4 py-3 text-gray-500">Zapisywany miesiąc (np. Luty lub okres)</td>
                          <td className="px-4 py-3">
                            <select
                              className="w-full h-8 px-2 bg-gray-50 border border-gray-200 rounded text-xs"
                              value={mapping.miesiac}
                              onChange={(e) => handleMappingFieldChange('miesiac', e.target.value)}
                            >
                              <option value="">-- wybierz kolumnę --</option>
                              {sampleColumns.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </td>
                        </tr>
                        <tr>
                          <td className="px-4 py-3 font-semibold text-gray-950">VAT Należny</td>
                          <td className="px-4 py-3 text-gray-500">Suma VAT należnego ze sprzedaży za cały miesiąc</td>
                          <td className="px-4 py-3">
                            <select
                              className="w-full h-8 px-2 bg-gray-50 border border-gray-200 rounded text-xs"
                              value={mapping.vatNalezny}
                              onChange={(e) => handleMappingFieldChange('vatNalezny', e.target.value)}
                            >
                              <option value="">-- wybierz kolumnę (opcjonalne) --</option>
                              {sampleColumns.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </td>
                        </tr>
                        <tr>
                          <td className="px-4 py-3 font-semibold text-gray-950">VAT Naliczony</td>
                          <td className="px-4 py-3 text-gray-500">Suma VAT naliczonego z zakupów</td>
                          <td className="px-4 py-3">
                            <select
                              className="w-full h-8 px-2 bg-gray-50 border border-gray-200 rounded text-xs"
                              value={mapping.vatNaliczony}
                              onChange={(e) => handleMappingFieldChange('vatNaliczony', e.target.value)}
                            >
                              <option value="">-- wybierz kolumnę (opcjonalne) --</option>
                              {sampleColumns.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </td>
                        </tr>
                        <tr>
                          <td className="px-4 py-3 font-semibold text-gray-950">Nadwyżka z poprz. okresu</td>
                          <td className="px-4 py-3 text-gray-500">Przeniesiony nadmiar podatku VAT</td>
                          <td className="px-4 py-3">
                            <select
                              className="w-full h-8 px-2 bg-gray-50 border border-gray-200 rounded text-xs"
                              value={mapping.nadwyzkaZPoprzedniego}
                              onChange={(e) => handleMappingFieldChange('nadwyzkaZPoprzedniego', e.target.value)}
                            >
                              <option value="">-- wybierz kolumnę --</option>
                              {sampleColumns.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </td>
                        </tr>
                        <tr>
                          <td className="px-4 py-3 font-semibold text-gray-950">Korekty VAT</td>
                          <td className="px-4 py-3 text-gray-500">Miesięczne korekty VAT naliczonego/należnego</td>
                          <td className="px-4 py-3">
                            <select
                              className="w-full h-8 px-2 bg-gray-50 border border-gray-200 rounded text-xs"
                              value={mapping.korektyVat}
                              onChange={(e) => handleMappingFieldChange('korektyVat', e.target.value)}
                            >
                              <option value="">-- wybierz kolumnę --</option>
                              {sampleColumns.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </td>
                        </tr>
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Phase 3: Preview, Validations, Overwrite strategy and totals summary */}
          {phase === 'preview_and_validate' && (
            <div className="space-y-6">

              {/* STATS PREVIEW TABLE */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3" id="import-stats-panel">
                <div className="p-4 bg-gray-50 border border-gray-150 rounded-xl">
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Ogółem rekordów</span>
                  <div className="text-xl font-bold text-gray-900 mt-1">{parsedResults.length} wierszy</div>
                </div>

                {importType === 'sprzedaz' && (
                  <>
                    <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-xl">
                      <span className="text-[10px] font-bold text-emerald-600 uppercase">Suma Sprzedaży Netto</span>
                      <div className="text-xl font-bold text-emerald-950 mt-1">{validationTotals.salesNetto || 0} zł</div>
                    </div>
                    <div className="p-4 bg-teal-50/50 border border-teal-100 rounded-xl">
                      <span className="text-[10px] font-bold text-teal-600 uppercase">Suma VAT Należnego</span>
                      <div className="text-xl font-bold text-teal-950 mt-1">{validationTotals.salesVat || 0} zł</div>
                    </div>
                  </>
                )}

                {importType === 'zakupy' && (
                  <>
                    <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl">
                      <span className="text-[10px] font-bold text-stone-500 uppercase">Suma Kosztów Netto</span>
                      <div className="text-xl font-bold text-stone-900 mt-1">{validationTotals.purchasesNetto || 0} zł</div>
                    </div>
                    <div className="p-4 bg-sky-50/50 border border-sky-100 rounded-xl">
                      <span className="text-[10px] font-bold text-sky-600 uppercase">Koszt podatkowy CIT (KUP)</span>
                      <div className="text-xl font-bold text-sky-950 mt-1">{validationTotals.citKup || 0} zł</div>
                    </div>
                  </>
                )}

                <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-center justify-between col-span-1">
                  <div>
                    <span className="text-[10px] font-bold text-rose-600 uppercase">Krytyczne błędy</span>
                    <div className="text-xl font-bold text-rose-950 mt-1">{validationTotals.errorsCount || 0}</div>
                  </div>
                  {validationTotals.errorsCount > 0 && <XCircle className="w-5 h-5 text-rose-500" />}
                </div>

                <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl flex items-center justify-between col-span-1">
                  <div>
                    <span className="text-[10px] font-bold text-amber-600 uppercase">Ostrzeżenia</span>
                    <div className="text-xl font-bold text-amber-950 mt-1">{validationTotals.warningsCount || 0}</div>
                  </div>
                  {validationTotals.warningsCount > 0 && <AlertTriangle className="w-5 h-5 text-amber-500" />}
                </div>
              </div>

              {/* OVERWRITE STRATEGY DROPDOWN */}
              <div className="p-4 bg-amber-50/30 border border-amber-200/50 rounded-xl space-y-3" id="overwrite-strategy-panel">
                <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5 leading-none">
                  <ShieldCheck className="w-4 h-4 text-amber-700" />
                  Konfiguracja Scenariusza Integracji z Istniejącymi Danymi
                </h4>
                <p className="text-xs text-gray-600 leading-normal">
                  Chcesz wgrać dane do wybranego okresu podatkowego: <span className="font-bold">{getMonthName(state.settings.miesiacPodatkowy)} {state.settings.rokPodatkowy}</span>. Wybierz co zrobić jeśli za dany miesiąc już istnieją zapisy:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 text-xs pt-1">
                  {[
                    { id: 'skip_duplicates', title: 'Pomiń duplikaty (Domyślny)', desc: 'Pomiń wiersze o powielonym numerze faktury.' },
                    { id: 'append', title: 'Dodaj wszystko (Append)', desc: 'Dodaje całą zawartość, ignorując stare i tworząc nowe kopie.' },
                    { id: 'overwrite', title: 'Nadpisz miesiąc', desc: 'Trwale wyczyszcza stare dane tego miesiąca przed zapisem.' },
                    { id: 'separate_version', title: 'Importuj jako nową wersję', desc: 'Wymusi osobne, unikalne ID bez modyfikowania starych.' },
                  ].map((st) => (
                    <button
                      key={st.id}
                      onClick={() => setOverwriteStrategy(st.id as any)}
                      className={`p-3 rounded-lg text-left border transition-all cursor-pointer flex flex-col justify-between ${
                        overwriteStrategy === st.id
                          ? 'bg-amber-500/10 border-amber-500 text-amber-900 font-medium'
                          : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <span className="font-bold leading-normal">{st.title}</span>
                      <span className="text-[10px] text-gray-500 mt-1 leading-normal">{st.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* VALIDATION STATUS BANNER */}
              {validationTotals.errorsCount === 0 && (
                <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-start gap-2.5 text-emerald-950 text-xs">
                  <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <span className="font-bold block">Status Walidacji: Import Poprawny!</span>
                    Wszystkie dane zostały poprawnie odczytane. Brak krytycznych błędów blokujących zapis. Możesz bezpiecznie zaimportować dane do rejestru.
                  </div>
                </div>
              )}

              {validationTotals.errorsCount > 0 && (
                <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-2.5 text-rose-950 text-xs">
                  <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                  <div>
                    <span className="font-bold block">Status Walidacji: Import zawiera błędy wierszy!</span>
                    Wykryto {validationTotals.errorsCount} błędów blokujących. Wiersze zaznaczone na czerwono zostaną pominięte podczas końcowego importu. Możesz wrócić i poprawić mapowanie kolumn lub dokonać edycji pliku.
                  </div>
                </div>
              )}

              {/* SAMPLE LIVE ROW PREVIEW */}
              <div className="border border-gray-150 rounded-xl overflow-hidden bg-white">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-700">
                  Podgląd i Wyniki Walidacji Poszczególnych Wierszy
                </div>
                <div className="max-h-60 overflow-y-auto divide-y divide-gray-100 text-xs">
                  {parsedResults.map((res, i) => {
                    const hasErr = res.errors.some(e => e.severity === 'error');
                    const hasWarn = res.errors.some(e => e.severity === 'warning');
                    
                    return (
                      <div
                        key={i}
                        className={`p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
                          hasErr ? 'bg-rose-50/40 text-rose-950' : hasWarn ? 'bg-amber-50/20 text-amber-950' : 'hover:bg-gray-50/35'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono bg-gray-200/60 text-gray-600 px-1.5 py-0.5 rounded text-[10px]">
                              Wiersz {res.rowOriginal.__rowNum__ || (i + 2)}
                            </span>
                            <span className="font-semibold text-gray-900">
                              {importType === 'sprzedaz' && (res.validatedData?.numerFaktury || 'Brak numeru')}
                              {importType === 'zakupy' && (res.validatedData?.numerFaktury || 'Brak numeru')}
                              {importType === 'zaliczki_cit' && `Zaliczka: ${getMonthName(res.validatedData?.miesiac || 1)}`}
                              {importType === 'nadwyzki_vat' && `Suma VAT: ${getMonthName(res.validatedData?.miesiac || 1)}`}
                            </span>
                          </div>
                          
                          <div className="text-[11px] text-gray-500 flex flex-wrap gap-x-4">
                            {importType === 'sprzedaz' && (
                              <>
                                <span>Kontrahent: {res.validatedData?.kontrahent}</span>
                                <span>Netto: {res.validatedData?.netto} zł</span>
                                <span>VAT ({res.validatedData?.stawkaVat}%): {res.validatedData?.vat} zł</span>
                              </>
                            )}
                            {importType === 'zakupy' && (
                              <>
                                <span>Sprzedawca: {res.validatedData?.dostawca}</span>
                                <span>Netto: {res.validatedData?.netto} zł</span>
                                <span>Odlicz. VAT: {res.validatedData?.odliczenieVat}%</span>
                              </>
                            )}
                            {importType === 'zaliczki_cit' && (
                              <>
                                <span>Kwota: {res.validatedData?.kwota} zł</span>
                                <span>Data zapłaty: {res.validatedData?.dataZaplaty}</span>
                              </>
                            )}
                            {importType === 'nadwyzki_vat' && (
                              <>
                                <span>Nadwyżka: {res.validatedData?.nadwyzkaZPoprzedniego} zł</span>
                                <span>Korekty: {res.validatedData?.korekty} zł</span>
                              </>
                            )}
                          </div>

                          {/* Show listed errors/warnings */}
                          {res.errors.length > 0 && (
                            <div className="mt-1.5 space-y-0.5" id={`validation-errors-row-${i}`}>
                              {res.errors.map((e, idx) => (
                                <div
                                  key={idx}
                                  className={`flex items-start gap-1 text-[10.5px] font-medium ${
                                    e.severity === 'error' ? 'text-rose-700' : 'text-amber-700'
                                  }`}
                                >
                                  {e.severity === 'error' ? (
                                    <XCircle className="w-3.5 h-3.5 text-rose-500 mt-0.5 shrink-0" />
                                  ) : (
                                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
                                  )}
                                  <span>{e.message}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="text-right">
                          {hasErr ? (
                            <span className="text-[10px] font-bold text-rose-700 bg-rose-100 border border-rose-200 px-2 py-0.5 rounded-full select-none">
                              Pominięty
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-full select-none">
                              Prawidłowy
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer controls */}
        <div className="p-6 border-t border-gray-150 flex items-center justify-between bg-gray-50/50">
          <div>
            {phase !== 'upload' && (
              <button
                type="button"
                onClick={() => setPhase(phase === 'preview_and_validate' ? 'mapping' : 'upload')}
                className="h-10 px-4 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg transition-all cursor-pointer"
              >
                Wróć
              </button>
            )}
          </div>
          
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-4 text-xs font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all cursor-pointer"
            >
              Anuluj
            </button>
            
            {phase === 'mapping' && (
              <button
                type="button"
                onClick={executeValidation}
                className="h-10 px-5 text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
              >
                Zweryfikuj Dane
                <ChevronRight className="w-4 h-4" />
              </button>
            )}

            {phase === 'preview_and_validate' && (
              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={parsedResults.length === 0}
                className="h-10 px-6 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                id="sumbit-import-btn"
              >
                <Check className="w-4 h-4" />
                Zaimportuj Dane
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
