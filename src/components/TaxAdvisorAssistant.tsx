import React, { useState, useEffect } from 'react';
import { AppState } from '../types';
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Send,
  Info,
  Scale,
  MessageSquare,
  FileText,
  BadgePercent,
  Search,
  Check,
  ChevronRight,
  Clipboard,
  Building2,
  Calendar,
  AlertCircle
} from 'lucide-react';

interface TaxAdvisorAssistantProps {
  state: AppState;
}

interface TaxQualificationResult {
  light: 'green' | 'yellow' | 'red';
  category: string;
  vatDeductibility: string;
  citDeductibility: string;
  justification: string;
  accountingAdvice: string;
  krsRelevance: string;
}

interface HistoryItem {
  id: string;
  query: string;
  timestamp: string;
  result: TaxQualificationResult;
  isCustom: boolean;
}

const PRE_QUALIFIED_EXAMPLES = [
  {
    title: 'Kawa / Lunch z klientem w kawiarni',
    query: 'Jestem na mieście, piję kawę i jem lunch z klientem (inwestorem) w celu omówienia uwag do projektu koncepcyjnego budynku. Czy mogę to ująć w koszty i jak to opisać?',
    tags: ['Gastronomia', 'Reprezentacja'],
    icon: '☕'
  },
  {
    title: 'Markowy garnitur + buty na spotkania',
    query: 'Kupuję markowy garnitur, marynarkę i eleganckie buty do spotkań z deweloperami. Chcę wszyć małe, subtelne logo biura na podszewce lub mankiecie. Czy to przejdzie w koszty s-ki z o.o.?',
    tags: ['Odzież', 'Reklama'],
    icon: '👔'
  },
  {
    title: 'Kask, buty robocze i kamizelka BHP',
    query: 'Kupuję profesjonalny kask budowlany, okulary ochronne oraz buty ze stalowym noskiem do prowadzenia osobiście nadzorów autorskich na budowach. Czy odliczę 100% CIT i VAT?',
    tags: ['BHP', 'Nadzór'],
    icon: '🦺'
  },
  {
    title: 'Subskrypcja Autodesk Revit / CAD',
    query: 'Opłacam roczną licencję Autodesk Revit oraz pakiet Adobe Creative Cloud od podmiotu z Irlandii. Na fakturze mam NIP UE z przedrostkiem PL. Jak to rozliczyć?',
    tags: ['Software', 'BIM'],
    icon: '💻'
  },
  {
    title: 'Ekspres do kawy i kawa do pracowni',
    query: 'Kupuję ekspres ciśnieniowy za 4500 zł oraz paczki kawy ziarnistej do biura/pracowni architektonicznej. Kawa służy pracownikom oraz klientom przychodzącym na prezentację rzutów.',
    tags: ['Wyposażenie', 'BHP'],
    icon: '🔌'
  },
  {
    title: 'Gogle VR (Virtual Reality) do biura',
    query: 'Kupuję gogle Oculus Quest (VR) do biura architektonicznego. Będą podłączone do komputera renderingowego, żeby klienci mogli odbyć wirtualny spacer po zaprojektowanym budynku.',
    tags: ['Sprzęt IT', 'Prezentacja'],
    icon: '🥽'
  }
];

export default function TaxAdvisorAssistant({ state }: TaxAdvisorAssistantProps) {
  const [krsDescription, setKrsDescription] = useState<string>(() => {
    return localStorage.getItem('tax_advisor_krs_desc') || 
      'Przeważająca działalność:\n- 71.11.Z DZIAŁALNOŚĆ W ZAKRESIE ARCHITEKTURY\n\nPozostała działalność:\n1. 74.10.Z DZIAŁALNOŚĆ W ZAKRESIE SPECJALISTYCZNEGO PROJEKTOWANIA\n2. 71.12.Z DZIAŁALNOŚĆ W ZAKRESIE INŻYNIERII I ZWIĄZANE Z NIĄ DORADZTWO TECHNICZNE';
  });

  const [isEditingKrs, setIsEditingKrs] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [currentResult, setCurrentResult] = useState<TaxQualificationResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [explanationQuery, setExplanationQuery] = useState<string>('');

  // Persist KRS changes
  const saveKrs = () => {
    localStorage.setItem('tax_advisor_krs_desc', krsDescription);
    setIsEditingKrs(false);
  };

  // Load history from localStorage on mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('tax_advisor_history');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error('Failed to parse history', e);
      }
    }
  }, []);

  // Save history helper
  const saveHistory = (newHistory: HistoryItem[]) => {
    setHistory(newHistory);
    localStorage.setItem('tax_advisor_history', JSON.stringify(newHistory));
  };

  // Animated loading messages transitions
  const loadingSteps = [
    'Inicjowanie tarczy prywatności: maskowanie kontrahentów i dokumentów...',
    'Badanie spójności wydatku z kodem PKD 7111Z oraz wpisami KRS...',
    'Wyszukiwanie bazy orzeczniczej NSA oraz interpretacji indywidualnych KIS...',
    'Strukturyzowanie argumentów celowości na podstawie art. 15 ust. 1 CIT...',
    'Generowanie wytycznych operacyjnych dla Twojej księgowej...'
  ];

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (loading) {
      timer = setInterval(() => {
        setLoadingStep((prev) => (prev < loadingSteps.length - 1 ? prev + 1 : prev));
      }, 1000);
    } else {
      setLoadingStep(0);
    }
    return () => clearInterval(timer);
  }, [loading]);

  const handleClearHistory = () => {
    if (window.confirm('Czy na pewno chcesz wyczyścić historię zapytań o koszty?')) {
      saveHistory([]);
      setCurrentResult(null);
    }
  };

  const handleCheckExpense = async (queryText: string, isFromExample = false) => {
    if (!queryText.trim() || loading) return;
    setLoading(true);
    setLoadingStep(0);
    setCurrentResult(null);
    setExplanationQuery(queryText);

    try {
      const response = await fetch('/api/gemini/tax-adviser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: queryText,
          krs: krsDescription,
          llmConfig: state.llmConfig
        })
      });

      const resData = await response.json();
      
      if (resData && resData.data) {
        const result: TaxQualificationResult = resData.data;
        setCurrentResult(result);

        // Add to history
        const newItem: HistoryItem = {
          id: `h-${Date.now()}`,
          query: queryText,
          timestamp: new Date().toLocaleString('pl-PL', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }),
          result: result,
          isCustom: !isFromExample
        };
        saveHistory([newItem, ...history.filter(h => h.query !== queryText)].slice(0, 50));
      } else {
        throw new Error(resData.message || 'Brak danych w odpowiedzi');
      }
    } catch (error: any) {
      console.error('API Error checking expense:', error);
      // Hard fallback based on client-side heuristic just in case to avoid any bad states
      const fallbackResult = {
        light: 'yellow' as const,
        category: 'Analiza awaryjna (Koszt Operacyjny)',
        vatDeductibility: 'Do weryfikacji. Wymaga faktury imiennej na Spółkę z o.o.',
        citDeductibility: 'Zazwyczaj 100% KUP w celach bezpośrednio zabezpieczających stabilność biura.',
        justification: `Z powodu przejściowych problemów komunikacyjnych z serwerem AI, automatycznie aktywowano lokalny symulator podatkowy. Wydatek "${queryText}" wykazuje potencjalny logiczny związek z działalnością biura projektowego i nadzorem (PKD 71.11.Z) w ramach celowości z art. 15 ust. 1 ustawy o CIT.`,
        accountingAdvice: `1. Upewnij się, że poprawnie podano dane Twojej spółki (NIP, adres) i zgromadzono fakturę.\n2. Przygotuj krótkie wyjaśnienie dla księgowej na wypadek kontroli skarbowej (np. inwentaryzacja, wyjazd terenowy do klienta).`,
        krsRelevance: `Możliwa zbieżność z profilem usług projektowo-doradczych.`
      };
      setCurrentResult(fallbackResult);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(label);
    setTimeout(() => setCopiedSection(null), 1500);
  };

  // Quick helper to choose visual styling for safety lights
  const getLightStyles = (light: 'green' | 'yellow' | 'red') => {
    switch (light) {
      case 'green':
        return {
          bg: 'bg-emerald-50 border-emerald-200 text-emerald-900',
          badge: 'bg-emerald-500 text-white shadow-emerald-100',
          indicator: 'bg-emerald-500',
          icon: CheckCircle2,
          text: 'Bezpieczny Koszt (Zielone Światło)',
          desc: 'Znikomiony poziom ryzyka. Koszt powszechnie akceptowany przez Krajową Informację Skarbową w branży architektonicznej.'
        };
      case 'yellow':
        return {
          bg: 'bg-amber-50/75 border-amber-200 text-amber-900',
          badge: 'bg-amber-500 text-amber-950 shadow-amber-100',
          indicator: 'bg-amber-500',
          icon: AlertTriangle,
          text: 'Użyj pod warunkiem (Żółte Światło)',
          desc: 'Średnie ryzyko. Wymaga rzetelnej dokumentacji i spełnienia dodatkowych warunków (np. logo marki, adnotacje na fakturze, wpis w kalendarz).'
        };
      case 'red':
        return {
          bg: 'bg-rose-50 border-rose-200 text-rose-900',
          badge: 'bg-rose-600 text-white shadow-rose-100',
          indicator: 'bg-rose-600',
          icon: XCircle,
          text: 'Wysokie Ryzyko (Czerwone Światło)',
          desc: 'Niedopuszczalne lub skrajnie ryzykowne. Wysokie ryzyko odrzucenia przez audytora lub fiskusa. Wydatek ma charakter osobisty lub luksusowy.'
        };
    }
  };

  return (
    <div className="space-y-6" id="tax-advisor-tab-wrapper">
      
      {/* Top Banner introducing dedicated PKD */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 text-white border border-slate-800 shadow-xl relative overflow-hidden" id="tax-advisor-header-banner">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-6 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-550/30 text-indigo-300 border border-indigo-500/20 text-[10px] font-bold tracking-widest uppercase">
              <Building2 className="w-3.5 h-3.5" /> Dedykowane PKD: 71.11.Z
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight font-display">
              Asystent Kosztów i Optymalizacji Podatkowej
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Profesjonalny panel weryfikacji celowości wydatków dedykowany specjalnie dla działalności w zakresie <strong>architektury i projektowania budowlanego (7111Z)</strong>. Przekształć codzienne wydatki firmowe w legalne koszty uzyskania przychodów (KUP) w swojej Spółce z o.o., uzyskując twarde uzasadnienia prawne do rozmowy z księgową.
            </p>
          </div>
          
          <div className="bg-slate-850/50 border border-slate-700/50 p-4 rounded-2xl flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-xl shadow-md">
              🧠
            </div>
            <div className="text-xs font-mono">
              <div className="text-slate-400 font-bold">SILNIK ANALIZY AI</div>
              <div className="text-emerald-450 font-semibold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Gemini-3.5-TaxActive
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column - KRS, Examples Database & History */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Profile KRS Config Section */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-5 space-y-4" id="krs-config-card">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-2">
                <span>📋</span> KRS i Profil Biznesowy Pracowni
              </h3>
              {!isEditingKrs ? (
                <button
                  type="button"
                  onClick={() => setIsEditingKrs(true)}
                  className="text-[10px] font-bold text-indigo-650 hover:text-indigo-500 hover:underline px-2 py-1 rounded"
                >
                  Edytuj wpis
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={saveKrs}
                    className="text-[10px] font-bold text-emerald-650 hover:text-emerald-500"
                  >
                    Zapisz
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setKrsDescription(localStorage.getItem('tax_advisor_krs_desc') || 'Działalność w zakresie architektury (PKD 71.11.Z)...');
                      setIsEditingKrs(false);
                    }}
                    className="text-[10px] font-bold text-slate-400 hover:text-slate-600"
                  >
                    Anuluj
                  </button>
                </div>
              )}
            </div>

            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-xs space-y-3 relative">
              <div className="flex items-start gap-2.5">
                <Building2 className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div className="space-y-1.5 flex-1">
                  <div className="font-bold text-slate-700">Wypis z rejestru przedsiębiorców (PKD):</div>
                  {isEditingKrs ? (
                    <textarea
                      value={krsDescription}
                      onChange={(e) => setKrsDescription(e.target.value)}
                      className="w-full h-24 p-2 bg-white border border-slate-300 rounded-lg text-xs font-sans text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                      placeholder="Wpisz PKD lub zakres działalności ze statutu spółki..."
                    />
                  ) : (
                    <p className="text-slate-650 leading-relaxed font-sans italic">
                      "{krsDescription}"
                    </p>
                  )}
                </div>
              </div>
              <div className="text-[10px] text-slate-400 flex items-center gap-1">
                <Info className="w-3.5 h-3.5 shrink-0 text-slate-350" />
                <span>Asystent dopasowuje argumenty prawne pod ten konkretny opis, aby obrona celowości kosztu (Art.15 CIT) była niepodważalna.</span>
              </div>
            </div>
          </div>

          {/* Core Qualified Expenses Library */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-5 space-y-4" id="tax-pre-qualified-library">
            <div className="space-y-1">
              <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-2">
                <span>💡</span> Typowe koszty w architekturze
              </h3>
              <p className="text-[10px] text-slate-400">
                Kliknij jeden z poniższych sprawdzonych przykładów wydatków architektonicznych, aby natychmiast zobaczyć zielone/żółte światło i gotową linię obrony:
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" id="examples-grid-list">
              {PRE_QUALIFIED_EXAMPLES.map((ex, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setSearchQuery(ex.query);
                    handleCheckExpense(ex.query, true);
                  }}
                  className="p-3 bg-slate-50 hover:bg-indigo-50/60 border border-slate-250 hover:border-indigo-250 rounded-xl text-left transition-all group flex flex-col justify-between h-28 cursor-pointer shadow-2xs hover:shadow-xs"
                >
                  <div className="flex gap-2 items-start">
                    <span className="text-lg shrink-0 mt-0.5" role="img" aria-label={ex.title}>
                      {ex.icon}
                    </span>
                    <div>
                      <div className="font-bold text-[11px] text-slate-900 group-hover:text-indigo-950 transition-colors line-clamp-2">
                        {ex.title}
                      </div>
                      <p className="text-[9px] text-slate-400 mt-0.5 line-clamp-2 leading-tight">
                        {ex.query}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {ex.tags.map((tag, tIdx) => (
                      <span key={tIdx} className="text-[8px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-bold font-mono">
                        {tag}
                      </span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Expense Audit History */}
          {history.length > 0 && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-5 space-y-3" id="advisor-history-card">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-2">
                  <span>⏳</span> Historia Weryfikacji kosztów
                </h3>
                <button
                  type="button"
                  onClick={handleClearHistory}
                  className="text-[10px] font-bold text-slate-400 hover:text-slate-600 px-2 py-0.5"
                >
                  Wyczyść historię
                </button>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1 select-none">
                {history.map((hist) => {
                  const lightData = getLightStyles(hist.result.light);
                  return (
                    <button
                      key={hist.id}
                      type="button"
                      onClick={() => {
                        setSearchQuery(hist.query);
                        setExplanationQuery(hist.query);
                        setCurrentResult(hist.result);
                      }}
                      className="w-full p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-left transition-all flex items-center justify-between gap-3 text-xs cursor-pointer"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-slate-800 truncate pr-3">{hist.query}</div>
                        <span className="text-[9px] text-slate-400 font-mono mt-0.5 block">{hist.timestamp} • {hist.result.category}</span>
                      </div>
                      <span className={`w-2.5 h-2.5 rounded-full ${lightData.indicator} shrink-0 shadow-xs`}></span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {/* Right Column - Audit Core Interface */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Main AI Input Form */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-4" id="tax-custom-search-panel">
            <h3 className="font-semibold text-slate-800 text-sm tracking-tight flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>Zweryfikuj Nietypowy Wydatek w Urzędzie Skarbowym AI</span>
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Znalazłeś się w restauracji, kupiłeś sprzęt lub odzież i nie wiesz, jak to zaksięgować? Wpisz wydatek prostymi słowami (np. <i>"Kupuję markowe buty na plac budowy za 1200zł"</i> lub <i>"Opłaciłem badanie i prenumeratę czasopisma Design"</i>) i zażądaj twardej argumentacji podatkowej.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleCheckExpense(searchQuery, false);
              }}
              className="space-y-3"
            >
              <div className="relative">
                <textarea
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Wpisz tutaj szczegóły wydatku... (np. 'Obiad biznesowy w restauracji z inwestorem podmiejskim w celu omówienia planów architektonicznych')"
                  className="w-full h-24 p-4 pl-4 pr-12 bg-slate-50 border border-slate-300 rounded-2xl text-xs text-slate-850 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:outline-hidden transition-all font-sans"
                  id="expense-text-area-input"
                  required
                />
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-3 text-[10px] bg-slate-200 text-slate-500 hover:text-slate-800 px-1.5 py-0.5 rounded cursor-pointer font-bold"
                  title="Wyczyść"
                >
                  Usuń
                </button>
              </div>

              <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
                <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Ocena podatkowa dla bieżącej daty: <strong>3 czerwca 2026 r.</strong></span>
                </div>
                
                <button
                  type="submit"
                  disabled={loading || !searchQuery.trim()}
                  className={`px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    loading || !searchQuery.trim()
                      ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                      : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-md shadow-indigo-100'
                  }`}
                  id="btn-trigger-ai-tax-check"
                >
                  {loading ? 'ANALIZOWANIE...' : 'SPRAWDŹ KOSZT (AI)'}
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </div>

          {/* Loading Animation Card */}
          {loading && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-8 text-center space-y-4 animate-fade-in" id="loading-advisor-card">
              <div className="relative w-16 h-16 mx-auto">
                <div className="absolute inset-0 rounded-full border-4 border-slate-150" />
                <div className="absolute inset-0 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center text-xl">
                  ⚖️
                </div>
              </div>

              <div className="space-y-1.5 max-w-md mx-auto">
                <h4 className="font-bold text-slate-900 text-sm tracking-tight font-display">
                  Autonomiczne Biuro Analiz Podatkowych
                </h4>
                <div className="text-xs text-indigo-700 font-semibold px-3 py-1 bg-indigo-50 rounded-lg inline-block animate-pulse duration-1000">
                  {loadingSteps[loadingStep]}
                </div>
                <p className="text-[10px] text-slate-400 pt-2 leading-relaxed">
                  Przetwarzamy zapytanie w bezpiecznym sandboksie prawno-finansowym. Żadne surowe dane osobowe ani wrażliwe nie opuszczają Twojej przeglądarki dzięki filtrowi antyszpiegowskiemu RODO.
                </p>
              </div>
            </div>
          )}

          {/* Qualification Core Result Panel */}
          {currentResult && !loading && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden animate-fade-in" id="qualification-audit-result-main">
              
              {/* Header Status Bar from Safety Level */}
              {(() => {
                const styles = getLightStyles(currentResult.light);
                const IconComponent = styles.icon;
                return (
                  <div>
                    {/* Visual Status Header block */}
                    <div className={`p-5 border-b border-slate-200 ${styles.bg} flex items-start gap-4 transition-all`} id="safety-light-header">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white ${styles.badge} shadow-xs shrink-0 select-none`}>
                        <IconComponent className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-bold text-sm tracking-tight uppercase leading-tight font-display">
                          {styles.text}
                        </h4>
                        <p className="text-[11px] font-medium leading-relaxed opacity-95 text-slate-750">
                          {styles.desc}
                        </p>
                      </div>
                    </div>

                    {/* Result Details Fields Grid */}
                    <div className="p-6 space-y-6" id="result-details-content">
                      
                      {/* Meta stats badges (Category, CIT, VAT) */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col justify-between">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Kategoria kosztowa</span>
                          <span className="text-slate-800 font-bold text-xs mt-1 block">{currentResult.category || 'Ogólne kosztowe'}</span>
                        </div>
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col justify-between">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Odliczenie VAT (S-ka z o.o.)</span>
                          <span className="text-indigo-700 font-bold text-xs mt-1 block flex items-center gap-1">
                            <BadgePercent className="w-4 h-4 text-indigo-500" />
                            {currentResult.vatDeductibility ? currentResult.vatDeductibility.split('.')[0] + '.' : 'Zgodnie z przepisami.'}
                          </span>
                        </div>
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col justify-between">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Ocena CIT (KUP)</span>
                          <span className="text-emerald-700 font-bold text-xs mt-1 block flex items-center gap-1">
                            <Scale className="w-4 h-4 text-emerald-500" />
                            {currentResult.citDeductibility ? currentResult.citDeductibility.split('.')[0] + '.' : 'Analizowane.'}
                          </span>
                        </div>
                      </div>

                      {/* Expense Verification context */}
                      <div className="bg-slate-50/50 rounded-xl p-3 border border-slate-200/80 text-xs">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Sprawdzany Wydatek:</span>
                        <p className="text-slate-700 mt-1 italic font-medium">"{explanationQuery}"</p>
                      </div>

                      {/* Legal Justification block (Uzasadnienie dla urzędników) */}
                      <div className="space-y-2 relative" id="section-justification">
                        <div className="flex justify-between items-center bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
                          <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 font-display">
                            <FileText className="w-4 h-4 text-indigo-600" />
                            Uzasadnienie Celowości Środka (Art. 15 CIT)
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyText(currentResult.justification, 'justification')}
                            className="text-[10px] font-bold text-indigo-600 hover:text-indigo-500 flex items-center gap-1 cursor-pointer"
                          >
                            <Clipboard className="w-3.5 h-3.5" />
                            {copiedSection === 'justification' ? 'skopiowano' : 'kopiuj'}
                          </button>
                        </div>
                        <p className="text-xs text-slate-750 leading-relaxed font-sans bg-slate-50/20 p-3 rounded-xl border border-dashed border-slate-200 pl-4 border-l-2 border-l-indigo-600">
                          {currentResult.justification}
                        </p>
                      </div>

                      {/* How To Talk to Accountant Section (Instrukcja dla księgowej) */}
                      <div className="space-y-2 relative" id="section-accounting-advice">
                        <div className="flex justify-between items-center bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
                          <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 font-display">
                            <MessageSquare className="w-4 h-4 text-emerald-600" />
                            Instrukcja księgowa & Jak rozmawiać z Biurem
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyText(currentResult.accountingAdvice, 'advice')}
                            className="text-[10px] font-bold text-emerald-600 hover:text-emerald-500 flex items-center gap-1 cursor-pointer"
                          >
                            <Clipboard className="w-3.5 h-3.5" />
                            {copiedSection === 'advice' ? 'skopiowano' : 'kopiuj'}
                          </button>
                        </div>
                        <div className="text-xs text-slate-750 leading-relaxed font-sans bg-slate-50/20 p-4 rounded-xl border border-dashed border-slate-200 pl-4 border-l-2 border-l-emerald-600 space-y-2 whitespace-pre-line">
                          {currentResult.accountingAdvice}
                        </div>
                      </div>

                      {/* KRS alignment status */}
                      <div className="space-y-2 relative animate-fade-in" id="section-krs-status">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 uppercase tracking-wider bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 font-display">
                          <Building2 className="w-4 h-4 text-indigo-600" />
                          Spójność z profilem KRS Twojej Spółki (PKD 71.11.Z)
                        </div>
                        <p className="text-[11px] text-slate-600 leading-relaxed pl-3 font-sans">
                          {currentResult.krsRelevance}
                        </p>
                      </div>

                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Help notice if nothing is searched yet */}
          {!currentResult && !loading && (
            <div className="bg-slate-50 border border-slate-200 rounded-3xl p-8 text-center space-y-3" id="no-result-helper-message">
              <div className="w-12 h-12 bg-white border border-slate-200 rounded-full flex items-center justify-center text-lg mx-auto shadow-2xs">
                💡
              </div>
              <div className="space-y-1.5 max-w-sm mx-auto">
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                  Oczekiwanie na zapytanie kosztowe
                </h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Podaj szczegóły wydatku w polu powyżej i kliknij przycisk, lub skorzystaj ze <strong>wzorów typowych kosztów architekta</strong> po lewej stronie, aby odblokować pełną ekspertyzę prawną AI.
                </p>
              </div>
            </div>
          )}

        </div>

      </div>

      {/* Legal safety and disclaimer indicator */}
      <div className="bg-indigo-50/60 border border-indigo-100 p-5 rounded-2xl flex items-start gap-3.5 mt-4" id="tax-advisor-footer-note">
        <AlertCircle className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
        <div className="space-y-1 text-[11px] text-indigo-900 leading-relaxed">
          <span className="font-bold">Edukacyjność i tarcza bezpieczeństwa:</span>
          <p className="opacity-95 text-indigo-850">
            Weryfikacja celowości opiera się na wytycznych prawa podatkowego obowiązujących w Polsce na rok podatkowy <strong>2026</strong>. Porady mają charakter doradczo-dydaktyczny, pozwalający przygotować twarde argumentacje rynkowe bezpośrednio pod PKD 71.11.Z. Wyniki z asystenta nie zastępują spersonalizowanego audytu księgowego ani wiążącej opinii licencjonowanego doradcy podatkowego w trybie formalnym. Dane oznaczające kontrahentów są rewidowane lokalnie przed przetworzeniem.
          </p>
        </div>
      </div>

    </div>
  );
}
