import React, { useState, useEffect } from 'react';
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
  Database,
  Plus
} from 'lucide-react';

interface InteractiveHelpModalProps {
  onClose: () => void;
  initialQuestion?: string;
}

export default function InteractiveHelpModal({
  onClose,
  initialQuestion = 'all'
}: InteractiveHelpModalProps) {
  const [activeQuestion, setActiveQuestion] = useState<'all' | 'nip' | 'cit_vs_vat' | 'cars_and_other' | 'start_balance' | 'ai_privacy' | 'ai_cost' | 'target_disclaimer'>('all');

  // Synchronize with initialQuestion if provided
  useEffect(() => {
    if (initialQuestion) {
      setActiveQuestion(initialQuestion as any);
    }
  }, [initialQuestion]);

  return (
    <div 
      className="fixed inset-0 z-[110] bg-slate-950/80 backdrop-blur-sm flex items-start md:items-center justify-center p-4 overflow-y-auto animate-fade-in"
      onClick={onClose}
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
              <div className="text-left">
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
              onClick={onClose}
              className="text-[11px] font-bold text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-slate-700 px-3.5 py-1.5 rounded-xl transition-all cursor-pointer self-start sm:self-auto uppercase tracking-wider flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4 rotate-45" /> ZAMKNIJ
            </button>
          </div>

          {/* Clean Category Selector Tabs */}
          <div className="flex flex-wrap gap-2 pb-1 border-b border-slate-800/50">
            {[
              { tag: 'all', label: '📖 Przegląd wszystkich tematów' },
              { tag: 'target_disclaimer', label: '⚖️ Przeznaczenie i Zastrzeżenia' },
              { tag: 'ai_privacy', label: '🛡️ Prywatność & Co wysyłamy do AI?' },
              { tag: 'ai_cost', label: '💸 Rozliczenie & Darmowy Klucz API' },
              { tag: 'local_llm', label: '🔌 Konfiguracja LM Studio / Ollama' },
              { tag: 'nip', label: '🏢 Po co mi Nazwa i NIP?' },
              { tag: 'cit_vs_vat', label: '📊 CIT vs VAT (Szybki skrót)' },
              { tag: 'cars_and_other', label: '🚗 Samochody, Hotele i Odliczenia' },
              { tag: 'start_balance', label: '💼 Import miesięczny' }
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 text-xs leading-relaxed max-h-[55vh] overflow-y-auto pr-2 custom-scrollbar">

            {/* Question: Przeznaczenie i Zastrzeżenia */}
            {(activeQuestion === 'all' || activeQuestion === 'target_disclaimer') && (
              <div className="bg-amber-950/20 border border-amber-900/35 rounded-2xl p-5 md:p-6 space-y-4 col-span-1 md:col-span-2 shadow-sm text-slate-300 text-left">
                <div className="flex items-center gap-2 border-b border-amber-900/40 pb-3">
                  <span className="text-lg">⚖️</span>
                  <h4 className="font-bold text-amber-300 text-sm font-display tracking-tight">
                    Dla kogo przeznaczony jest symulator i oficjalne zastrzeżenia prawne (Koniecznie Przeczytaj!)
                  </h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-[11px] leading-relaxed">
                  <div className="space-y-2">
                    <span className="font-bold text-white block">🎯 Specjalizacja: Tylko dla Spółek z o.o. (CIT + VAT)</span>
                    <p>
                      Aplikacja została zaprojektowana <strong>wyłącznie w oparciu o polskie przepisy dla spółek z ograniczoną odpowiedzialnością (Sp. z o.o.)</strong> rozliczających się podatkiem dochodowym od osób prawnych (stawka CIT 9% dla małych podatników lub 19% stawka ogólna) oraz będących czynnymi podatnikami podatku od towarów i usług (VAT 23%).
                    </p>
                    <p className="text-slate-400">
                      Program nie obsługuje jednoosobowych działalności gospodarczych (JDG) opodatkowanych podatkiem PIT (zasady ogólne, liniowy, ryczałt).
                    </p>
                  </div>
                  <div className="space-y-2">
                    <span className="font-bold text-rose-300 block">⚠️ Brak Charakteru Porady Prawnej / Podatkowej</span>
                    <p>
                      System stanowi <strong>wyłącznie symulację demonstracyjno-edukacyjną</strong> i nie prowadzi działalności doradztwa podatkowego w rozumieniu ustawy o doradztwie podatkowym.
                    </p>
                    <p>
                      Kalkulatory bazują na uproszczonych formułach matematycznych i uśrednionych algorytmach. Prezentowane wyniki mają walor wyłącznie ilustracyjny. Wszelka odpowiedzialność za wykorzystanie danych oraz za ewentualne decyzje gospodarcze leży <strong>wyłącznie po stronie użytkownika</strong>. Przed złożeniem deklaracji podatkowej zawsze skonsultuj się z certyfikowanym doradcą podatkowym lub biurem rachunkowym.
                    </p>
                  </div>
                </div>
                <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 text-[10.5px] text-slate-400 text-left">
                  <strong>Podsumowanie:</strong> Samodzielne klikanie w programie służy do analizy kierunkowej i "zrozumienia liczb" (np. symulacja McKinsey przed rozmową z księgowym), a nie zastępowania profesjonalnego biura rachunkowego.
                </div>
              </div>
            )}
          
            {/* Question: Prywatność, RODO & Bezpieczeństwo AI */}
            {(activeQuestion === 'all' || activeQuestion === 'ai_privacy') && (
              <div className="bg-slate-850/60 border border-slate-800 rounded-2xl p-5 md:p-6 space-y-4 col-span-1 md:col-span-2 shadow-sm text-left">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                  <Shield className="w-5 h-5 text-emerald-400" />
                  <h4 className="font-bold text-white text-sm font-display tracking-tight">
                    Gwarancja RODO i Bezpieczeństwa: Jak chronimy dane firmowe i faktury przed AI?
                  </h4>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-[11px] text-slate-300">
                  <div className="bg-slate-900/80 p-4.5 rounded-2xl border border-slate-800 space-y-2">
                    <div className="flex items-center gap-1.5 font-bold text-emerald-400">
                      <Lock className="w-4 h-4 shrink-0" />
                      <span>1. Pełne Maskowanie Kontrahentów</span>
                    </div>
                    <p className="leading-relaxed text-slate-400 text-left">
                      Wszelkie nazwy dostawców, odbiorców oraz osób fizycznych są <strong>całkowicie usuwane w pamięci podręcznej RAM Twojego komputera</strong> przed sformułowaniem i wysłaniem zapytania do modeli AI. Wszelkie nazwy własne zastępowane są neutralnymi etykietami, np. <code>[KONTRAHENT_A]</code> lub <code>[DOSTAWCA_USŁUG_01]</code>. Do chmury nigdy nie trafia żadne sformułowanie identyfikujące partnera biznesowego.
                    </p>
                  </div>

                  <div className="bg-slate-900/80 p-4.5 rounded-2xl border border-slate-800 space-y-2">
                    <div className="flex items-center gap-1.5 font-bold text-indigo-400">
                      <Terminal className="w-4 h-4 shrink-0" />
                      <span>2. Redakcja Numerów Faktur</span>
                    </div>
                    <p className="leading-relaxed text-slate-400 text-left">
                      Numery faktur (np. <i>FV/1042/2026/XYZ</i>) stanowią unikalne identyfikatory, które mogłyby wskazywać na strukturę zakupową Twojej firmy. Z tego powodu nasz system <strong>automatycznie maskuje numery dokumentów lokalnie w przeglądarce</strong>, zmieniając je na losowe kody porządkowe typu <code>[FAKTURA_01]</code>, <code>[RACHUNEK_02]</code>. Do LLM płyną wyłącznie suche liczby podatkowe i kody.
                    </p>
                  </div>

                  <div className="bg-slate-900/80 p-4.5 rounded-2xl border border-slate-800 space-y-2">
                    <div className="flex items-center gap-1.5 font-bold text-amber-400 flex-wrap">
                      <Laptop className="w-4 h-4 shrink-0" />
                      <span>3. Zero-Knowledge o Firmie</span>
                    </div>
                    <p className="leading-relaxed text-slate-400 text-left">
                      Twoja nazwa rejestrowa i NIP są całkowicie ukrywane. Model sztucznej inteligencji analizuje zbiór finansowy jako <strong>całkowicie bezimienny model spółki z o.o.</strong> bez możliwości skorelowania go z rzeczywistym podmiotem w Polsce. Dodatkowo, jeśli chcesz unikać chmur, możesz użyć w pełni prywatnego połączenia lokalnego <strong className="text-white">LM Studio / Ollama (100% offline)</strong>.
                    </p>
                  </div>
                </div>

                <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 space-y-4 text-left">
                  <h5 className="font-bold text-white text-xs flex items-center gap-2">
                    <span>🧠</span> Jak technicznie wygląda proces lokalnego pre-maskowania? (GDPR-Safe Proxy)
                  </h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[11px] text-slate-300 leading-relaxed">
                    <div className="space-y-2 text-left">
                      <span className="font-semibold text-emerald-400 block">KROK I: Lokalna inicjalizacja filtru (Klient)</span>
                      <p>
                        Gdy uruchamiasz funkcję <strong className="text-indigo-300">Smart Audit</strong>, aplikacja nie wysyła pliku, arkusza ani surowej tabeli. Specjalny parser transakcji w przeglądarce skanuje wiersz po wierszu i izoluje wyłącznie: kwotę netto, stawkę VAT, rodzaj podatku CIT oraz ogólną kategorię (np. "abonament", "paliwo", "reklama").
                      </p>
                    </div>
                    <div className="space-y-2 text-left">
                      <span className="font-semibold text-indigo-400 block">KROK II: Wyczyszczenie danych przed transmisją do Cloud API</span>
                      <p>
                        Wszelkie kolumny i właściwości obiektów zawierające nazwy kontrahentów, NIP, e-maile czy szczegółowe adresy są wymazywane przed uformowaniem tekstowego promptu HTTP do API Google/OpenAI. W efekcie, zewnętrzny model LLM przetwarza wyłącznie matematyczny fantom badawczy: model kalkulacji CIT dla fikcyjnej firmy Sp. z o.o.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-indigo-950/45 border border-indigo-900/60 rounded-xl p-4.5 text-[11px] text-slate-300 flex items-start gap-3 text-left">
                  <span className="text-emerald-400 text-lg mt-0.5">🛡️</span>
                  <div>
                    <p className="font-bold text-white mb-1">Zgodność z RODO (GDPR Compliance):</p>
                    <p className="leading-relaxed">
                      Zgodnie z Rozporządzeniem Ogólnym o Ochronie Danych Osobowych (RODO), przesyłanie danych osobowych do zewnętrznych dostawców AI bez odpowiednich umów powierzenia przetwarzania danych może stanowić naruszenie prawa. Ten symulator <strong>nigdy nie wysyła danych osobowych, adresowych, kontaktowych ani handlowych identyfikatorów</strong> do API zewnętrznych. AI otrzymuje wyłącznie anonimowe agregaty liczbowe i ogólne kategorie opisowe (np. "paliwo23", "reklama", "oprogramowanie"). Twój biznes jest w 100% bezpieczny.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Question: Rozliczenie tokenów */}
            {(activeQuestion === 'all' || activeQuestion === 'ai_cost') && (
              <div className="bg-slate-850/60 border border-slate-800 rounded-2xl p-5 md:p-6 space-y-4 col-span-1 md:col-span-2 shadow-sm text-left">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                  <Cpu className="w-5 h-5 text-amber-400" />
                  <h4 className="font-bold text-white text-sm font-display tracking-tight">
                    Jak wygląda rozliczenie za tokeny bezpośrednio u dostawcy (model Pay-as-you-go)?
                  </h4>
                </div>
                
                <div className="space-y-4 text-slate-300 text-[11px]">
                  <p className="leading-relaxed text-left">
                    Zamiast płacić wysokie, stałe abonamenty u pośredników (np. 100 PLN/miesięcznie), zyskujesz bezpośredni dostęp do najtańszego i najszybszego strumienia od Google Inc. Generujesz swój <strong>własny klucz API</strong> i płacisz tylko za to, co rzeczywiście przeanalizuje model (liczone w ułamkach grosza za słowo).
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-left">
                    <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-1">
                      <span className="text-[10px] uppercase font-bold text-slate-500 font-mono">Mały Model (np. Gemini Flash)</span>
                      <span className="text-white font-bold block text-sm">~ 0,001 PLN / Audyt</span>
                      <p className="text-[10px] text-slate-400 leading-normal font-sans">
                        Zalecany do codziennego szybkiego audytu faktur i kalkulacji CIT. Za kwotę 1 PLN wykonasz setki takich analiz.
                      </p>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-1">
                      <span className="text-[10px] uppercase font-bold text-slate-500 font-mono">Duży Model (np. Gemini Pro)</span>
                      <span className="text-white font-bold block text-sm">~ 0,04 PLN / Raport</span>
                      <p className="text-[10px] text-slate-400 leading-normal font-sans">
                        Używany do zaawansowanych wniosków strategicznych McKinsey i rocznych analiz optymalizacji podatkowej.
                      </p>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-1">
                      <span className="text-[10px] uppercase font-bold text-slate-550 font-mono text-wrap">Kolejna Zaleta</span>
                      <span className="text-emerald-400 font-bold block text-sm">Darmowe pule startowe</span>
                      <p className="text-[10px] text-slate-400 leading-normal font-sans">
                        Większość dostawców (w tym Google) oferuje darmowe zapytania testowe (Free Tier) o ograniczonej częstotliwości, co pozwala korzystać z analizy całkowicie za darmo.
                      </p>
                    </div>
                  </div>

                  <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800 text-left">
                    <strong className="text-white text-[11px] block mb-1 font-sans">🛠️ Jak zdobyć darmowy klucz API w 60 sekund?</strong>
                    <ol className="list-decimal pl-5 space-y-1.5 text-slate-400 text-[10.5px]">
                      <li>Wejdź na oficjalną bezpłatną konsolę Google AI: <a href="https://aistudio.google.com/" target="_blank" rel="noreferrer" className="text-indigo-400 underline hover:text-indigo-300 font-semibold font-sans">Google AI Studio</a></li>
                      <li>Kliknij przycisk <strong>"Get API key"</strong>, załóż lub zaloguj się na standardowe konto Google.</li>
                      <li>Wygeneruj klucz i skopiuj go do pola <i>"Konektor Inteligencji AI"</i> na dole zakładki kopii zapasowej w tej aplikacji. Gotowe!</li>
                    </ol>
                  </div>
                </div>
              </div>
            )}

            {/* Question: Konfiguracja LM Studio / Ollama */}
            {(activeQuestion === 'all' || activeQuestion === 'local_llm') && (
              <div className="bg-slate-850/60 border border-slate-800 rounded-2xl p-5 md:p-6 space-y-4 col-span-1 md:col-span-2 shadow-sm text-left">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                  <Database className="w-5 h-5 text-emerald-400" />
                  <h4 className="font-bold text-white text-sm font-display tracking-tight">
                    Jak skonfigurować lokalny model AI (Ollama / LM Studio)?
                  </h4>
                </div>
                
                <div className="space-y-4 text-slate-300 text-[11px] leading-relaxed">
                  <p>
                    Rozwiązania takie jak <strong>Ollama</strong> lub <strong>LM Studio</strong> pozwalają uruchomić potężne modele (np. Llama 3) sprzętowo na Twoim komputerze bez dostępu do Internetu, zapewniając absolutną 100% dyskrecję (offline) przy analizie podatkowej!
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-2 text-left">
                      <span className="text-white font-bold block text-sm">🦙 Ollama (Windows/Mac/Linux)</span>
                      <ol className="list-decimal pl-5 space-y-1 text-slate-400">
                        <li>Pobierz i zainstaluj Ollama z oficjalnej strony.</li>
                        <li>Otwórz terminal (cmd/Powershell) i wpisz: <code>ollama run llama3</code></li>
                        <li>Upewnij się, że serwer Ollamy wystartował lokalnie.</li>
                        <li>W panelu <i>Ustawienia LLM</i> aplikacji wybierz dostawcę <b>Ollama</b>.</li>
                        <li>Zmień Base URL (Endpoint) na <code className="text-emerald-300 bg-emerald-950 px-1 rounded">http://127.0.0.1:11434/api/chat</code>.</li>
                        <li>Nazwa modelu w polu klucza: <code>llama3</code></li>
                      </ol>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-2 text-left">
                      <span className="text-white font-bold block text-sm">🖥️ LM Studio</span>
                      <ol className="list-decimal pl-5 space-y-1 text-slate-400">
                        <li>Zainstaluj aplikację LM Studio i pobierz dowolny model GGUF (np. Mistral/Llama3).</li>
                        <li>Wybierz zakładkę <b>Local Inference Server</b> na lewym panelu.</li>
                        <li>Zaznacz opcję <i>Cross-Origin Resource Sharing (CORS)</i> na włączoną.</li>
                        <li>Kliknij Start Server (domyślnie ruszy na porcie 1234).</li>
                        <li>W panelu <i>Ustawienia LLM</i> wybierz <b>OpenAI (Kompatybilne)</b>.</li>
                        <li>Zmień Base URL (Endpoint) na <code className="text-emerald-300 bg-emerald-950 px-1 rounded">http://127.0.0.1:1234/v1/chat/completions</code>.</li>
                      </ol>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Question 1: Po co Nazwa i NIP? */}
            {(activeQuestion === 'all' || activeQuestion === 'nip') && (
              <div className="bg-slate-850/60 border border-slate-800 rounded-xl p-5 space-y-3 text-left col-span-1 md:col-span-1">
                <h4 className="font-bold text-indigo-300 flex items-center gap-1.5 text-xs">
                  <Building2 className="w-5 h-5 text-indigo-400" />
                  W jakim celu podaję Nazwę i NIP Spółki?
                </h4>
                <p className="text-slate-400 text-[11px] font-sans">
                  NIP i nazwa nadają kontekst prawny i biznesowy aplikacji. Służą wyłącznie do dwóch rzeczy na Twoim komputerze:
                </p>
                <ul className="space-y-2 text-slate-350 text-[11px] list-disc pl-5 font-sans">
                  <li><strong className="text-white">Generowanie Raportów:</strong> Eksportując ewidencję do plików Excel lub archiwów ZIP, dane te są automatycznie umieszczane w plikach jako nagłówek dla Twojego biura rachunkowego.</li>
                  <li><strong className="text-white">Zapobieganie Pomyłkom:</strong> Jeśli prowadzisz symulacje dla kilku różnych spółek z o.o., NIP w bazie LocalStorage chroni dane przed przypadkowym złączeniem czy nadpisaniem.</li>
                </ul>
              </div>
            )}

            {/* Question 2: Co wchodzi do CIT a co do VAT? */}
            {(activeQuestion === 'all' || activeQuestion === 'cit_vs_vat') && (
              <div className="bg-slate-850/60 border border-slate-800 rounded-xl p-5 space-y-3 text-left col-span-1 md:col-span-1">
                <h4 className="font-bold text-amber-300 flex items-center gap-1.5 text-xs">
                  <ArrowRight className="w-5 h-5 text-amber-400" />
                  Podatek CIT vs Podatek VAT (Złote reguły dla każdego)
                </h4>
                
                <div className="space-y-3.5 text-[11px] text-slate-300 leading-relaxed font-sans">
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
              <div className="bg-slate-850/60 border border-slate-800 rounded-2xl p-5 md:p-6 space-y-4 col-span-1 md:col-span-2 shadow-sm text-left">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                  <CheckCircle2 className="w-5 h-5 text-indigo-400" />
                  <h4 className="font-bold text-white text-sm font-display tracking-tight">
                    Najczęstsze pułapki podatkowe: Samochody, Noclegi, Reprezentacja
                  </h4>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4.5 text-[11px]">
                  <div className="bg-slate-900/60 p-4.5 rounded-xl border border-slate-800 space-y-2 text-left">
                    <span className="text-amber-300 font-bold block text-xs">🚗 Samochody (Cel Mieszany)</span>
                    <p className="text-slate-400 leading-relaxed text-[10.5px] font-sans">
                      Dla samochodów osobowych użytkowanych również prywatnie możesz odliczyć <strong>tylko 50% podatku VAT</strong>. Niezagospodarowana połowa VAT-u nie przepada — automatycznie <strong>powiększa ona kwotę netto braną do kosztów CIT-KUP</strong>! Nasz system kalkuluje to na bieżąco.
                    </p>
                  </div>

                  <div className="bg-slate-900/60 p-4.5 rounded-xl border border-slate-800 space-y-2 text-left">
                    <span className="text-pink-300 font-bold block text-xs">🏨 Hotele & Restauracje</span>
                    <p className="text-slate-400 leading-relaxed text-[10.5px] font-sans">
                      Polskie prawo podatkowe całkowicie <strong>zabrania odliczania podatku VAT</strong> od usług noclegowych oraz gastronomicznych (0% odliczenia). Jednakże, cała kwota brutto (razem z nieodliczalnym VAT) stanowi dla spółki z o.o. uzasadniony koszt podatkowy CIT (KUP).
                    </p>
                  </div>

                  <div className="bg-slate-900/60 p-4.5 rounded-xl border border-slate-800 space-y-2 text-left">
                    <span className="text-emerald-300 font-bold block text-xs">🎁 Reprezentacja (N-KUP)</span>
                    <p className="text-slate-400 leading-relaxed text-[10.5px] font-sans">
                      Ekskluzywne prezenty, kolacje reprezentacyjne z kontrahentem mające na celu budowanie wizerunku firmy w świetle przepisów to tzw. <strong>N-KUP</strong> (Nie stanowią kosztu uzyskania przychodu w CIT). Nie obniżą podatku dochodowego, ale zazwyczaj dają pełne odliczenie VAT.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Question 4: Dane startowe firmy i agregowanie m-cy */}
            {(activeQuestion === 'all' || activeQuestion === 'start_balance') && (
              <div className="bg-slate-850/60 border border-slate-800 rounded-2xl p-5 md:p-6 space-y-4 col-span-1 md:col-span-2 shadow-sm text-left">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                  <Database className="w-5 h-5 text-indigo-400" />
                  <h4 className="font-bold text-white text-sm font-display tracking-tight">
                    Jak szybko przenieść historię swojej firmy bez żmudnego przepisywania?
                  </h4>
                </div>
                
                <p className="text-slate-300 text-[11px] leading-relaxed font-sans text-left">
                  Jeżeli Twoja spółka z o.o. już od dawna działa, nie musisz tracić godzin na importowanie setek pojedynczych faktur z systemu księgowego od stycznia. Zastosuj wysoce rekomendowany sposób <strong>zbiorczych agregatów miesięcznych</strong>:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5 text-slate-350 text-[10px] text-left leading-normal font-sans">
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

          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="w-full md:w-auto md:px-12 bg-indigo-650 hover:bg-indigo-700 text-white py-3 rounded-xl text-xs font-black shadow-lg transition-all active:scale-98 cursor-pointer select-none"
            >
              Ukończ przegląd i zamknij centrum
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
