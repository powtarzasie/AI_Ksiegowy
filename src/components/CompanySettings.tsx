import React, { useState } from 'react';
import { CompanySettings } from '../types';
import { MONTHS_PL } from '../utils/taxCalc';
import { 
  Building2, 
  Calendar, 
  FileText, 
  Percent, 
  AlertCircle,
  HelpCircle,
  CheckCircle2,
  Info,
  ChevronDown,
  ChevronUp,
  XCircle,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Shield,
  Lock,
  Terminal,
  Cpu,
  Laptop,
  Sparkles,
  Database
} from 'lucide-react';

interface CompanySettingsProps {
  settings: CompanySettings;
  onSettingsChange: (newSettings: CompanySettings) => void;
  embedded?: boolean;
  showHelper: boolean;
  onShowHelperChange: (show: boolean) => void;
}

export default function CompanySettingsComponent({
  settings,
  onSettingsChange,
  embedded = false,
  showHelper,
  onShowHelperChange,
}: CompanySettingsProps) {
  const [activeQuestion, setActiveQuestion] = useState<'all' | 'nip' | 'cit_vs_vat' | 'cars_and_other' | 'start_balance' | 'ai_privacy' | 'ai_cost'>('all');
  
  const handleChange = (field: keyof CompanySettings, value: any) => {
    onSettingsChange({
      ...settings,
      [field]: value
    });
  };

  const yearsRange = [2024, 2025, 2026, 2027];

  return (
    <div className={embedded ? "border-t border-slate-100 pt-6 space-y-6" : "bg-white rounded-3xl shadow-meta border border-slate-200 p-6 space-y-6"} id="company-settings-card">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <Building2 className="w-5 h-5 text-indigo-600" />
          <h2 className="text-lg font-bold text-slate-800 tracking-tight font-display">
            Metryka Spółki i Okres Podatkowy
          </h2>
        </div>
      </div>      {/* Interactive Tax Helper / Clarification Panel (Modal/Overlay) */}
      {showHelper && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-start md:items-center justify-center p-4 overflow-y-auto animate-fade-in"
          onClick={() => onShowHelperChange(false)}
          id="interactive-help-modal-backdrop"
        >
          <div 
            className="bg-slate-900 border border-slate-800 text-slate-100 rounded-3xl p-6 md:p-8 relative overflow-hidden shadow-2xl max-w-5xl w-full my-8 md:my-0"
            onClick={(e) => e.stopPropagation()}
            id="interactive-help-hub"
          >
            {/* Subtle background gradients for premium touch */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
            <div className="absolute bottom-0 left-10 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

            <div className="relative z-10 space-y-6">
              
              {/* Header Section */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-550/15 border border-indigo-500/35 rounded-2xl text-indigo-400">
                    <Sparkles className="w-5.5 h-5.5 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base font-display tracking-tight">
                      Centrum Pomocy, Prywatności & AI
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Wszystko o bezpieczeństwie Twoich danych, rozliczeniach tokenów i regułach podatkowych CIT/VAT w prostych słowach.
                    </p>
                  </div>
                </div>
                
                <button 
                  type="button"
                  onClick={() => onShowHelperChange(false)}
                  className="text-[11px] font-bold text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-slate-700 px-3.5 py-1.5 rounded-xl transition-all cursor-pointer self-start sm:self-auto uppercase tracking-wider"
                >
                  &times; ZAMKNIJ
                </button>
              </div>

              {/* Clean Category Selector Tabs */}
              <div className="flex flex-wrap gap-2 pb-1 border-b border-slate-800/50">
                {[
                  { tag: 'all', label: '📖 Przegląd wszystkich tematów' },
                  { tag: 'ai_privacy', label: '🛡️ Prywatność & Co wysyłamy do AI?' },
                  { tag: 'ai_cost', label: '💸 Rozliczenie & Darmowy Klucz API' },
                  { tag: 'nip', label: '🏢 Po co mi Nazwa i NIP?' },
                  { tag: 'cit_vs_vat', label: '📊 CIT vs VAT (Szybki skrót)' },
                  { tag: 'cars_and_other', label: '🚗 Samochody, Hotele i Odliczenia' },
                  { tag: 'start_balance', label: '💼 Import miesięczny dla działających firm' }
                ].map((item) => (
                  <button
                    key={item.tag}
                    type="button"
                    onClick={() => setActiveQuestion(item.tag as any)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer select-none border ${
                      activeQuestion === item.tag 
                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-900/40' 
                        : 'bg-slate-800/50 border-slate-700 hover:border-slate-600 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Help Content Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 text-xs leading-relaxed max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
              
              {/* Question: Prywatność & Transmisja AI */}
              {(activeQuestion === 'all' || activeQuestion === 'ai_privacy') && (
                <div className="bg-slate-850/60 border border-slate-800 rounded-2xl p-5 md:p-6 space-y-4 col-span-1 md:col-span-2 shadow-sm">
                  <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                    <Shield className="w-5 h-5 text-emerald-400" />
                    <h4 className="font-bold text-white text-sm font-display tracking-tight">
                      Gdzie są zapisywane moje klucze i co dokładnie przesyłamy do chmury? (Pełna Transparentność)
                    </h4>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-[11px] text-slate-300">
                    <div className="bg-slate-900/80 p-4.5 rounded-2xl border border-slate-800 space-y-2">
                      <div className="flex items-center gap-1.5 font-bold text-emerald-400">
                        <Lock className="w-4 h-4 shrink-0" />
                        <span>1. 100% Lokalny Zapis</span>
                      </div>
                      <p className="leading-relaxed text-slate-400">
                        Twoje klucze API (np. Google Gemini) są zapisywane <strong>wyłącznie w pamięci Twojej przeglądarki (LocalStorage)</strong> na Twoim dysku. Aplikacja nie posiada własnego serwera bazodanowego, który gromadziłby te klucze.
                      </p>
                    </div>

                    <div className="bg-slate-900/80 p-4.5 rounded-2xl border border-slate-800 space-y-2">
                      <div className="flex items-center gap-1.5 font-bold text-indigo-400">
                        <Terminal className="w-4 h-4 shrink-0" />
                        <span>2. Filtracja Wrażliwych Danych</span>
                      </div>
                      <p className="leading-relaxed text-slate-400">
                        Podczas analizy (funkcja <strong className="text-indigo-300">Smart Audit</strong>), system automatycznie <strong>anonimizuje tekst</strong>. Nazwa Twojej spółki i NIP są podmieniane na bezpieczne tagi maskujące. Pozycje faktur są zbierane w suche kwoty zbiorcze.
                      </p>
                    </div>

                    <div className="bg-slate-900/80 p-4.5 rounded-2xl border border-slate-800 space-y-2">
                      <div className="flex items-center gap-1.5 font-bold text-amber-400">
                        <Laptop className="w-4 h-4 shrink-0" />
                        <span>3. Opcjonalny Tryb Offline</span>
                      </div>
                      <p className="leading-relaxed text-slate-400">
                        Jeżeli przepisy wewnętrzne Twojej firmy całkowicie zabraniają wysyłania jakichkolwiek liczb na serwery chmurowe Google/OpenAI, możesz podpiąć lokalną AI przez <strong>LM Studio</strong> lub <strong>Ollama</strong>. Wtedy całość działa na Twojej karcie graficznej bez internetu.
                      </p>
                    </div>
                  </div>

                  <div className="bg-indigo-950/40 border border-indigo-900/50 rounded-xl p-3 text-[11.5px] text-slate-350 flex items-start gap-2.5">
                    <span className="text-indigo-400 text-sm mt-0.5">ℹ️</span>
                    <p>
                      <strong>Podsumowanie dla Dyrekcji / Zarządu:</strong> Aplikacja chroni tajemnicę handlową przedsiębiorstwa. Nikt poza Tobą nie ma zdalnego wglądu do Twoich ewidencji VAT i ksiąg, ponieważ program jest aplikacją kliencką (SPA) działającą wyłącznie na Twoim komputerze.
                    </p>
                  </div>
                </div>
              )}

              {/* Question: Rozliczenie tokenów */}
              {(activeQuestion === 'all' || activeQuestion === 'ai_cost') && (
                <div className="bg-slate-850/60 border border-slate-800 rounded-2xl p-5 md:p-6 space-y-4 col-span-1 md:col-span-2 shadow-sm">
                  <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                    <Cpu className="w-5 h-5 text-amber-400" />
                    <h4 className="font-bold text-white text-sm font-display tracking-tight">
                      Jak wygląda rozliczenie za tokeny bezpośrednio u dostawcy (model Pay-as-you-go)?
                    </h4>
                  </div>
                  
                  <div className="space-y-4 text-slate-300 text-[11px]">
                    <p className="leading-relaxed">
                      Zamiast płacić wysokie, stałe abonamenty u pośredników (np. 100 PLN/miesięcznie), zyskujesz bezpośredni dostęp do najtańszego i najszybszego strumienia od Google Inc. Generujesz swój <strong>własny klucz API</strong> i płacisz tylko za to, co rzeczywiście przeanalizuje model (liczone w ułamkach grosza za słowo).
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-1">
                        <span className="text-[10px] uppercase font-bold text-slate-500 font-mono">Mały Model (np. Gemini Flash)</span>
                        <span className="text-white font-bold block text-sm">~ 0,001 PLN / Audyt</span>
                        <p className="text-[10px] text-slate-400 leading-normal">
                          Zalecany do codziennego szybkiego audytu faktur i kalkulacji CIT. Za kwotę 1 PLN wykonasz setki takich analiz.
                        </p>
                      </div>

                      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-1">
                        <span className="text-[10px] uppercase font-bold text-slate-500 font-mono">Duży Model (np. Gemini Pro)</span>
                        <span className="text-white font-bold block text-sm">~ 0,04 PLN / Raport</span>
                        <p className="text-[10px] text-slate-400 leading-normal">
                          Używany do zaawansowanych wniosków strategicznych McKinsey i rocznych analiz optymalizacji podatkowej.
                        </p>
                      </div>

                      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-1">
                        <span className="text-[10px] uppercase font-bold text-slate-550 font-mono">Kolejna Zaleta</span>
                        <span className="text-emerald-400 font-bold block text-sm">Darmowe pule startowe</span>
                        <p className="text-[10px] text-slate-400 leading-normal">
                          Większość dostawców (w tym Google) oferuje darmowe zapytania testowe (Free Tier) o ograniczonej częstotliwości, co pozwala korzystać z analizy całkowicie za darmo.
                        </p>
                      </div>
                    </div>

                    <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
                      <strong className="text-white text-[11px] block mb-1">🛠️ Jak zdobyć darmowy klucz API w 60 sekund?</strong>
                      <ol className="list-decimal pl-5 space-y-1.5 text-slate-400 text-[10.5px]">
                        <li>Wejdź na oficjalną bezpłatną konsolę Google AI: <a href="https://aistudio.google.com/" target="_blank" rel="noreferrer" className="text-indigo-400 underline hover:text-indigo-300 font-semibold">Google AI Studio</a></li>
                        <li>Kliknij przycisk <strong>"Get API key"</strong>, załóż lub zaloguj się na standardowe konto Google.</li>
                        <li>Wygeneruj klucz i skopiuj go do pola <i>"Konektor Inteligencji AI"</i> na dole zakładki kopii zapasowej w tej aplikacji. Gotowe!</li>
                      </ol>
                    </div>
                  </div>
                </div>
              )}

              {/* Question 1: Po co Nazwa i NIP? */}
              {(activeQuestion === 'all' || activeQuestion === 'nip') && (
                <div className="bg-slate-850/60 border border-slate-800 rounded-xl p-5 space-y-3">
                  <h4 className="font-bold text-indigo-300 flex items-center gap-1.5 text-xs">
                    <Building2 className="w-5 h-5 text-indigo-400" />
                    W jakim celu podaję Nazwę i NIP Spółki?
                  </h4>
                  <p className="text-slate-400 text-[11px]">
                    NIP i nazwa nadają kontekst prawny i biznesowy aplikacji. Służą wyłącznie do dwóch rzeczy na Twoim komputerze:
                  </p>
                  <ul className="space-y-2 text-slate-350 text-[11px] list-disc pl-5">
                    <li><strong className="text-white">Generowanie Raportów:</strong> Eksportując ewidencję do plików Excel lub archiwów ZIP, dane te są automatycznie umieszczane w plikach jako nagłówek dla Twojego biura rachunkowego.</li>
                    <li><strong className="text-white">Zapobieganie Pomyłkom:</strong> Jeśli prowadzisz symulacje dla kilku różnych spółek z o.o., NIP w bazie LocalStorage chroni dane przed przypadkowym złączeniem czy nadpisaniem.</li>
                  </ul>
                </div>
              )}

              {/* Question 2: Co wchodzi do CIT a co do VAT? */}
              {(activeQuestion === 'all' || activeQuestion === 'cit_vs_vat') && (
                <div className="bg-slate-850/60 border border-slate-800 rounded-xl p-5 space-y-3">
                  <h4 className="font-bold text-amber-300 flex items-center gap-1.5 text-xs">
                    <ArrowRight className="w-5 h-5 text-amber-400" />
                    Podatek CIT vs Podatek VAT (Złote reguły dla każdego)
                  </h4>
                  
                  <div className="space-y-3.5 text-[11px] text-slate-300 leading-relaxed">
                    <div className="border-l-2 border-emerald-500 pl-3">
                      <span className="font-bold text-white block">📊 Podatek CIT (Dochodowy Spółki - 9% lub 19%)</span>
                      <p className="text-slate-400 mt-1">
                        Płacony jest wyłącznie od Twojego realnego wypracowanego czystego zysku operacyjnego na koniec roku. Obliczenie: <span className="text-slate-200 bg-slate-900 border border-slate-800 px-1 py-0.5 rounded font-mono font-bold">Przychody Netto - Koszty (KUP)</span>. Każda zaliczona faktura kosztowa bezpośrednio obniża Twój ostateczny CIT.
                      </p>
                    </div>

                    <div className="border-l-2 border-indigo-500 pl-3">
                      <span className="font-bold text-white block">💸 Podatek VAT (Od Towarów i Usług - zazwyczaj 23%)</span>
                      <p className="text-slate-400 mt-1">
                        VAT to podatek "przelewowy". Na fakturach sprzedażowych doliczasz go klientom, a z faktur zakupowych go odliczasz. Do US przelewasz tylko czystą różnicę. VAT nie zależy od tego, czy masz zysk, czy stratę.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Question 3: Wyjątki, pojazdy, noclegi, gastronomia */}
              {(activeQuestion === 'all' || activeQuestion === 'cars_and_other') && (
                <div className="bg-slate-850/60 border border-slate-800 rounded-2xl p-5 md:p-6 space-y-4 col-span-1 md:col-span-2 shadow-sm">
                  <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                    <CheckCircle2 className="w-5 h-5 text-indigo-400" />
                    <h4 className="font-bold text-white text-sm font-display tracking-tight">
                      Najczęstsze pułapki podatkowe: Samochody, Noclegi, Reprezentacja
                    </h4>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4.5 text-[11px]">
                    <div className="bg-slate-900/60 p-4.5 rounded-xl border border-slate-800 space-y-2">
                      <span className="text-amber-300 font-bold block text-xs">🚗 Samochody (Cel Mieszany)</span>
                      <p className="text-slate-400 leading-relaxed text-[10.5px]">
                        Dla samochodów osobowych użytkowanych również prywatnie możesz odliczyć <strong>tylko 50% podatku VAT</strong>. Niezagospodarowana połowa VAT-u nie przepada — automatycznie <strong>powiększa ona kwotę netto braną do kosztów CIT-KUP</strong>! Nasz system kalkuluje to na bieżąco.
                      </p>
                    </div>

                    <div className="bg-slate-900/60 p-4.5 rounded-xl border border-slate-800 space-y-2">
                      <span className="text-pink-300 font-bold block text-xs">🏨 Hotele & Restauracje</span>
                      <p className="text-slate-400 leading-relaxed text-[10.5px]">
                        Polskie prawo podatkowe całkowicie <strong>zabrania odliczania podatku VAT</strong> od usług noclegowych oraz gastronomicznych (0% odliczenia). Jednakże, cała kwota brutto (razem z nieodliczalnym VAT) stanowi dla spółki z o.o. uzasadniony koszt podatkowy CIT (KUP).
                      </p>
                    </div>

                    <div className="bg-slate-900/60 p-4.5 rounded-xl border border-slate-800 space-y-2">
                      <span className="text-emerald-300 font-bold block text-xs">🎁 Reprezentacja (N-KUP)</span>
                      <p className="text-slate-400 leading-relaxed text-[10.5px]">
                        Ekskluzywne prezenty, kolacje reprezentacyjne z kontrahentem mające na celu budowanie wizerunku firmy w świetle przepisów to tzw. <strong>N-KUP</strong> (Nie stanowią kosztu uzyskania przychodu w CIT). Nie obniżą podatku dochodowego, ale zazwyczaj dają pełne odliczenie VAT.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Question 4: Dane startowe firmy i agregowanie m-cy */}
              {(activeQuestion === 'all' || activeQuestion === 'start_balance') && (
                <div className="bg-slate-850/60 border border-slate-800 rounded-2xl p-5 md:p-6 space-y-4 col-span-1 md:col-span-2 shadow-sm">
                  <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                    <Database className="w-5 h-5 text-indigo-400" />
                    <h4 className="font-bold text-white text-sm font-display tracking-tight">
                      Jak szybko przenieść historię swojej firmy bez żmudnego przepisywania?
                    </h4>
                  </div>
                  
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    Jeżeli Twoja spółka z o.o. już od dawna działa, nie musisz tracić godzin na importowanie setek pojedynczych faktur z systemu księgowego od stycznia. Zastosuj wysoce rekomendowany sposób <strong>zbiorczych agregatów miesięcznych</strong>:
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5 text-slate-350 text-[10px]">
                    <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800">
                      <strong className="text-white block mb-1 text-[11px]">1. Agregacja Przychodu</strong>
                      Dla minionych miesięcy dodaj 1 transakcję sprzedaży zbiorczej za dany miesiąc. Wpisz całkowitą sumę netto oraz średni VAT ze wszystkich faktur sprzedażowych danego miesiąca.
                    </div>

                    <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800">
                      <strong className="text-white block mb-1 text-[11px]">2. Agregacja Kosztu</strong>
                      Podobnie dodaj 1 rachunek kosztowy reprezentujący sumaryczną kwotę kosztów KUP spółki w tym okresie. Nasz algorytm McKinsey i tak poprawnie skalkuluje rentowność.
                    </div>

                    <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800">
                      <strong className="text-white block mb-1 text-[11px]">3. Zapłacone Zaliczki</strong>
                      Wprowadź sumę zapłaconych zaliczek CIT w ubiegłych miesiącach w dziale <i>"Zaliczki CIT"</i>. Pozwoli to systemowi prawidłowo wyliczyć kwotę ostatecznej dopłaty / zwrotu.
                    </div>

                    <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800">
                      <strong className="text-white block mb-1 text-[11px]">4. Nadwyżka VAT</strong>
                      Jeżeli na koniec zeszłego roku Twojej firmie pozostał niewypłacony VAT ze Skarbówki, wpisz go w styczeń jako <i>"Nadwyżka VAT przeniesiona z ubiegłego okresu"</i>.
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Company Name */}
        <div className="flex flex-col gap-1.5" id="field-company-name">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Nazwa Spółki z o.o.</span>
            {!showHelper && (
              <button 
                onClick={() => { onShowHelperChange(true); setActiveQuestion('nip'); }}
                className="text-[9.5px] text-indigo-500 hover:text-indigo-700 hover:underline font-bold font-sans cursor-pointer"
              >
                Po co wpisywać?
              </button>
            )}
          </label>
          <input
            type="text"
            className="w-full h-10 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-hidden transition-all placeholder:text-slate-400"
            placeholder="np. Acme Sp. z o.o."
            value={settings.nazwaSpolki}
            onChange={(e) => handleChange('nazwaSpolki', e.target.value)}
          />
        </div>

        {/* NIP */}
        <div className="flex flex-col gap-1.5" id="field-company-nip">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>NIP Spółki</span>
            {!showHelper && (
              <button 
                onClick={() => { onShowHelperChange(true); setActiveQuestion('nip'); }}
                className="text-[9.5px] text-indigo-500 hover:text-indigo-700 hover:underline font-bold font-sans cursor-pointer"
              >
                Dowiedz się więcej CP
              </button>
            )}
          </label>
          <input
            type="text"
            className="w-full h-10 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-hidden transition-all placeholder:text-slate-400"
            placeholder="np. 1234567890"
            value={settings.nip}
            maxLength={13}
            onChange={(e) => {
              const clean = e.target.value.replace(/[^0-9-]/g, '');
              handleChange('nip', clean);
            }}
          />
        </div>

        {/* CIT Rate */}
        <div className="flex flex-col gap-1.5" id="field-company-cit">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            Stawka podatku CIT
          </label>
          <div className="flex bg-slate-100 border border-slate-200 rounded-xl p-1 h-10">
            <button
              type="button"
              className={`flex-1 text-xs font-bold rounded-lg transition-all ${
                settings.stawkaCIT === 9
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              onClick={() => handleChange('stawkaCIT', 9)}
            >
              9% (Preferencyjna)
            </button>
            <button
              type="button"
              className={`flex-1 text-xs font-bold rounded-lg transition-all ${
                settings.stawkaCIT === 19
                  ? 'bg-indigo-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              onClick={() => handleChange('stawkaCIT', 19)}
            >
              19% (Standard)
            </button>
          </div>
        </div>

        {/* Fiscal Year */}
        <div className="flex flex-col gap-1.5" id="field-company-year">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            Rok Podatkowy
          </label>
          <select
            className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-hidden transition-all cursor-pointer font-medium"
            value={settings.rokPodatkowy}
            onChange={(e) => handleChange('rokPodatkowy', parseInt(e.target.value, 10))}
          >
            {yearsRange.map((yr) => (
              <option key={yr} value={yr}>
                {yr} ROK
              </option>
            ))}
          </select>
        </div>

        {/* Selected Month */}
        <div className="flex flex-col gap-1.5" id="field-company-month">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            Miesiąc Symulacji
          </label>
          <select
            className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-hidden transition-all cursor-pointer font-medium"
            value={settings.miesiacPodatkowy}
            onChange={(e) => handleChange('miesiacPodatkowy', parseInt(e.target.value, 10))}
          >
            {MONTHS_PL.map((mStr, idx) => (
              <option key={idx + 1} value={idx + 1}>
                {idx + 1} - {mStr.toUpperCase()}
              </option>
            ))}
          </select>
        </div>
      </div>

      {settings.stawkaCIT === 9 && (
        <div className="text-xs flex items-start gap-3 text-amber-900 bg-amber-50 border border-amber-200 p-4 rounded-2xl" id="cit-notice">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-bold">Stawka preferencyjna 9% CIT:</span> Dotyczy małych podatników realizujących obrót roczny brutto poniżej 2 mln EUR w poprzednim roku. Pamiętaj o bieżącym monitorowaniu limitu rentowności i przychodów operacyjnych w roku {settings.rokPodatkowy}.
          </div>
        </div>
      )}
    </div>
  );
}

