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
  AlertCircle,
  Mail
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
  knowledgeCutoff?: string;
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
    title: 'Rekwizyty do Home Stagingu (meble, dekoracje, teksty)',
    query: 'Zakup designerskich lamp stojących, wazonów, pościeli, narzut i obrazów wykorzystywanych jako rekwizyty przy sesjach fotograficznych / Home Stagingu ukończonych projektów w celu podniesienia wartości portfolio biura.',
    tags: ['Home Staging', 'Marketing'],
    icon: '🛋️'
  },
  {
    title: 'Profesjonalna sesja zdjęciowa i wideo realizacji',
    query: 'Zlecenie fotografowi wykonania profesjonalnej sesji zdjęciowej oraz wideo zrealizowanego wnętrza lub budynku. Zdjęcia będą publikowane w naszym portfolio, social mediach, na stronie WWW oraz w prasie branżowej.',
    tags: ['Marketing', 'Reklama'],
    icon: '📸'
  },
  {
    title: 'Próbniki materiałowe, plansze i makiety fizyczne',
    query: 'Zakup próbnika tynków elewacyjnych, drewna, tkanin meblowych oraz wydruk wielkoformatowy rzutów i renderingów na sztywnych planszach piankowych do prezentacji inwestorów podczas spotkań roboczych.',
    tags: ['Prezentacja', 'Próbniki'],
    icon: '📐'
  },
  {
    title: 'Strona WWW, SEO i reklama w social media (Ads)',
    query: 'Zaprojektowanie i wdrożenie nowoczesnej strony www pracowni z portfolio, jej stałe pozycjonowanie (SEO) oraz opłacanie miesięcznych budżetów reklamowych Meta Ads (Facebook/Instagram), Pinterest i Google Ads.',
    tags: ['E-marketing', 'Reklama'],
    icon: '📣'
  },
  {
    title: 'Subskrypcja Revit, Twinmotion i AI do renderingu',
    query: 'Opłacenie rocznej licencji Autodesk Revit (BIM), programu Twinmotion do wizualizacji 3D, oraz subskrypcji generatorów obrazów AI (np. Midjourney, Magnific AI) używanych do tworzenia moodboardów koncepcyjnych.',
    tags: ['Software', 'BIM & AI'],
    icon: '💻'
  },
  {
    title: 'Gogle Meta Quest VR do wirtualnych spacerów',
    query: 'Kupujemy gogle Meta Quest VR do biura architektonicznego. Będą podłączone do komputera renderingowego, aby klienci na spotkaniach roboczych mogli odbyć immersyjny, wirtualny spacer po zaprojektowanym obiekcie.',
    tags: ['Sprzęt IT', 'Prezentacja'],
    icon: '🥽'
  },
  {
    title: 'Zakup drona do inwentaryzacji i nalotów foto/video',
    query: 'Kupujemy profesjonalnego drona o wartości 7000 zł do wykonywania inwentaryzacji działek przed projektowaniem, fotogrametrii 3D terenu oraz kręcenia ujęć z powietrza postępów nadzorowanych budów we własnym zakresie.',
    tags: ['Sprzęt i Foto', 'Nadzór'],
    icon: '🛸'
  },
  {
    title: 'Katering i lunch roboczy z inwestorem w kawiarni',
    query: 'Opłacenie lunchu w kawiarni z kluczowym inwestorem podczas prezentacji i akceptacji projektu budowlanego lub zamawianie przekąsek/fingerfood na oficjalną prezentację projektu w biurze dla rady nadzorczej dewelopera.',
    tags: ['Gastronomia', 'Negocjacje'],
    icon: '☕'
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
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showClearHistoryConfirm, setShowClearHistoryConfirm] = useState(false);

  const isApiKeyMissingOrPlaceholder = (() => {
    const config = state.llmConfig;
    if (!config) return true;
    if (config.provider === 'ollama' || config.provider === 'lmstudio') return false;
    const key = config.apiKey || '';
    return !key || 
      key.startsWith('AIzaSyYourKey') || 
      key.includes('PLACEHOLDER') || 
      key.trim() === '' || 
      key.includes('wprowadź') ||
      key.includes('TwójKey') ||
      key.includes('...') ||
      key.length < 10;
  })();

  const generateEmailBody = () => {
    if (!currentResult) return '';

    const riskLabels = {
      green: 'NISKIE RYZYKO - Bezpieczny Koszt (Zielone Światło)',
      yellow: 'UMIARKOWANE RYZYKO - Koszt warunkowy (Żółte Światło)',
      red: 'WYSOKIE RYZYKO - Koszt nierekomendowany / osobisty (Czerwone Światło)'
    };
  
    const riskDescs = {
      green: 'Znikomy poziom ryzyka. Koszt powszechnie akceptowany przez Krajową Informację Skarbową w branży architektonicznej (PKD 71.11.Z). Można bez obaw realizować transakcję.',
      yellow: 'Średnie ryzyko. Wymaga rzetelnej dokumentacji i dopełnienia określonych warunków (np. trwałe oznaczenie logo, szczegółowy opis celowości na odwrocie faktury, wpis w kalendarzu potwierdzający spotkanie w kawiarni/restauracji z kontrahentem itp.) w celu obrony kosztu podczas ewentualnej kontroli.',
      red: 'Wydatek zaklasyfikowany jako osobisty lub reprezentacja sprzeczna z prawem, brak merytorycznego związku z PKD architektonicznym. Wysokie prawdopodobieństwo zakwestionowania przez Urząd Skarbowy (ryzyko uznania za tzw. ukryty zysk lub nieodpłatne świadczenie).'
    };

    const riskText = riskLabels[currentResult.light] || currentResult.light;
    const riskDesc = riskDescs[currentResult.light] || '';

    return `Dzień dobry,

Zwracam się z uprzejmą prośbą o wydanie wiążącej opinii księgowej w celu zweryfikowania dopuszczalności podatkowej planowanego zakupu przed realizacją transakcji. Zależy nam na upewnieniu się, że ujęcie tego kosztu w księgach naszej Spółki z o.o. będzie w pełni bezpieczne i zgodne z aktualną linią interpretacyjną organów podatkowych.

Poniżej przedstawiam szczegółowe dane o planowanym wydatku oraz naszą wstępną analizę celowości podatkowej, sporządzoną pod kątem specyfiki i merytorycznego profilu działalności naszej Spółki (PKD 71.11.Z - Działalność w zakresie architektury):

1. SPRAWDZONY WYDATEK:
"${explanationQuery}"

2. PROPONOWANA KATEGORIA KOSZTOWA:
${currentResult.category || 'Ogólne koszty prowadzenia działalności / Do ustalenia'}

3. ODLICZENIE PODATKÓW (VAT / CIT):
• Odliczenie VAT: ${currentResult.vatDeductibility || 'Sprecyzowane poniżej.'}
• Koszt uzyskania przychodu (CIT/KUP): ${currentResult.citDeductibility || 'Sprecyzowane poniżej.'}

4. UZASADNIENIE CELOWOŚCI WYDATKU (ART. 15 UST. 1 USTAWY O CIT):
${currentResult.justification}

5. SPÓJNOŚĆ Z PROFILEM KRS (DZIAŁALNOŚĆ ARCHITEKTONICZNA PKD 71.11.Z):
${currentResult.krsRelevance}

6. OFICJALNE ZAPYTANIE DO KSIĘGOWOŚCI (PROŚBA O WIĄŻĄCE STANOWISKO):
Mając na uwadze powyższe merytoryczne i prawne uzasadnienie celowości zakupu oraz jego ścisłą spójność z merytorycznym przedmiotem działalności firmy, dążąc do dochowania należytej staranności, uprzejmie proszę o odpowiedź na poniższe pytania przed realizacją transakcji:
- Czy wyraża Pan/Pani zgodę na ujęcie tego kosztu jako kosztu uzyskania przychodów (KUP) oraz na odliczenie podatku naliczonego VAT zgodnie z powyższą rekomendacją systemową?
- Jakie konkretne dokumenty uzupełniające bądź procedury dowodowe (np. merytoryczny opis na odwrocie faktury, wpisy w kalendarzu spotkań, dokumentacja fotograficzna, ewentualne ustalenia mailowe z kontrahentem) uważa Pan/Pani za zalecane w tym przypadku, aby skutecznie obronić gospodarczy cel tego wydatku przed Urzędem Skarbowym?

7. SYSTEMOWA OCENA RYZYKA (ANALIZA WSTĘPNA):
• Rekomendowany status: ${riskText}
• Ocena analityczna ryzyka: ${riskDesc}

Będę niezmiernie wdzięczny/wdzięczna za informację zwrotną oraz jednoznaczne ustosunkowanie się do powyższych punktów przed zakupem, co pozwoli nam na bezpieczne sfinalizowanie transakcji.

Z wyrazami szacunku,
[Zarząd Spółki / Twój Podpis]`;
  };

  const generateExternalPromptBody = (): string => {
    const targetQuery = explanationQuery || searchQuery || '[Wpisz lub wybierz wydatek]';
    const localToday = new Date().toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' });
    const cutoffDate = currentResult?.knowledgeCutoff || 'styczeń 2025 r.';

    if (currentResult) {
      const riskText = currentResult.light === 'green' 
        ? '🟢 ZIELONE ŚWIATŁO (Niskie ryzyko)' 
        : currentResult.light === 'yellow' 
          ? '🟡 ŻÓŁTE ŚWIATŁO (Średnie ryzyko / wymagane warunki)' 
          : '🔴 CZERWONE ŚWIATŁO (Wysokie ryzyko / nierekomendowany)';

      return `### ⚖️ ZLECENIE DLA DORADCY PODATKOWEGO GOOGLE SEARCH AI

Działasz jako licencjonowany doradca podatkowy w Polsce wyposażony w aktywne narzędzie wyszukiwania informacji w sieci na żywo (Google Search). Posiadasz najnowsze dane o orzecznictwie i interpretacjach fiskusa.

#### 🏢 PROFIL MOJEJ FIRMY
* **Forma prawna:** Spółka z o.o.
* **Branża:** Pracownia projektowa i architektoniczna
* **Główne PKD:** \`71.11.Z\` - Działalność w zakresie architektury

---

#### 🔍 PLANOWANY WYDATEK DO WERYFIKACJI
* **Wydatek:** "${targetQuery}"
* **Cel:** Ustalenie możliwości ujęcia wydatku w kosztach uzyskania przychodu (KUP) dla podatku CIT (zgodnie z art. 15 ust. 1 ustawy o CIT) oraz prawa do odliczenia podatku naliczonego VAT.

---

#### 📜 KWALIFIKACJA WYJŚCIOWA (Asystent Lokalny)
Wstępny audyt algorytmiczny (baza wiedzy zamrożona na dzień odcięcia: **${cutoffDate}**) sklasyfikował ten wydatek tak:
* **Sugerowany Status:** ${riskText}
* **Sugerowana Kategoria:** \`${currentResult.category}\`
* **Odliczenie VAT (S-ka z o.o.):** ${currentResult.vatDeductibility}
* **Odliczenie CIT (KUP):** ${currentResult.citDeductibility}
* **Wstępne Uzasadnienie Celowości:**
> "${currentResult.justification}"

---

#### 📅 ZADANIE DLA CIEBIE (Wyszukiwanie Google Search)
Bieżąca data dzisiejsza to: **${localToday} r.**
Przeszukaj internet za pomocą wyszukiwarki internetowej i sprawdź, czy w okresie od **${cutoffDate}** do dziś (**${localToday} r.**) pojawiły się:

1. **Interpretacje indywidualne Krajowej Informacji Skarbowej (KIS)** dotyczące dokładnie tego typu wydatków u architektów, biur projektowych lub inżynierskich.
2. **Wyroki sądów administracyjnych (WSA, NSA)** wskazujące ewoluującą linię orzeczniczą.
3. **Oficjalne objaśnienia** Ministerstwa Finansów lub nowelizacje ustaw rzutujące bezpośrednio na ten koszt.

---

#### 📝 FORMAT ODPOWIEDZI
Ustrukturyzuj swoją odpowiedź przy użyciu przejrzystego formatowania Markdown:
1. **Analiza zmian historycznych:** Czy od daty bazy wiedzy modelów (${cutoffDate}) nastąpiły zmiany na korzyść lub niekorzyść podatników? Podaj konkretne sygnatury interpretacji indywidualnych lub wyroków sadowych i ich daty.
2. **Ostateczna rekomendacja bezpieczeństwa na dzień ${localToday} r.:** Czy koszt wciąż kwalifikuje się bezpiecznie, czy niesie za sobą nowe ryzyka podatkowe?
3. **Zalecane procedury dowodowe:** Jak skutecznie opisać fakturę i jakie dowody zgromadzić, by obronić wydatek przy kontroli skarbowej.`;
    } else {
      // General prompt if there is no currentResult (e.g. offline/no API key)
      return `### ⚖️ ZLECENIE DLA DORADCY PODATKOWEGO GOOGLE SEARCH AI (Badanie od Podstaw)

Działasz jako licencjonowany doradca podatkowy w Polsce wyposażony w aktywne narzędzie wyszukiwania informacji w sieci na żywo (Google Search). Posiadasz najnowsze dane o orzecznictwie i interpretacjach fiskusa.

#### 🏢 PROFIL MOJEJ FIRMY
* **Forma prawna:** Spółka z o.o.
* **Branża:** Pracownia projektowa i architektoniczna
* **Główne PKD:** \`71.11.Z\` - Działalność w zakresie architektury

---

#### 🔍 PLANOWANY WYDATEK DO BADANIA
* **Przedmiot weryfikacji:** "${targetQuery}"
* **Cel:** Przeprowadzenie pełnego merytorycznego badania celowości wydatku pod kątem art. 15 ust. 1 ustawy o CIT oraz prawa do odliczenia podatku VAT w Spółce z o.o. w bieżącym roku podatkowym.

---

#### 📅 ZADANIE DLA CIEBIE (Wyszukiwanie Google Search na dzień ${localToday} r.)
Korzystając z dostępu do internetu, znajdź aktualny stan prawny na dziś (**${localToday} r.**) w Polsce:

1. **Interpretacje indywidualne Krajowej Informacji Skarbowej (KIS)** dotyczące takiego wydatku u architektów, projektantów, inżynierów lub ogólnych przedsiębiorstw usługowych.
2. **Najnowsze wyroki sądów administracyjnych (WSA, NSA)** określające aktualne podejście fiskusa.
3. **Ograniczenia lub unormowania szczególne** rzutujące na odliczalność tego wydatku (np. kwestie reprezentacji, odzieży roboczej/reklamowej, limitów samochodowych czy gastronomii).

---

#### 📝 REKOMENDOWANY FORMAT ODPOWIEDZI (Użyj Markdown)
Ustrukturyzuj opinię podatkową i zweryfikuj wydatek w następujących sekcjach:
1. **Ocena bezpieczeństwa (Światła ostrzegawcze):** Przypisz wydatek do poziomu ryzyka: Zielony (bezpieczny), Żółty (warunkowy, średnie ryzyko) lub Czerwony (wysokie ryzyko odrzucenia).
2. **Kwalifikacja Podatków (CIT i VAT):** Jaki procent VAT można odliczyć oraz czy wydatek stanowi Koszt Uzyskania Przychodu (KUP) w CIT i na jakich zasadach?
3. **Rzetelne Uzasadnienie Prawne:** Przygotuj profesjonalny argument celowości biznesowej (powołując się bezpośrednio na orzecznictwo i cel działalności architekta - pozyskiwanie klientów, inwentaryzacje, profesjonalny wizerunek).
4. **Najnowsze Orzecznictwo i Pisma KIS:** Podaj konkretne przykłady interpretacji wraz z sygnaturami z ostatnich lat.
5. **Skrzynka dowodowa:** Jakie procedury i dowody (zdjęcia, wpisy kontraktowe, opatrzenie logiem firmy) są niezbędne, by księgowa mogła bezpiecznie ująć ten koszt w księgach operacyjnych spółki.`;
    }
  };

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

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
    setShowClearHistoryConfirm(true);
  };

  const executeClearHistory = () => {
    setShowClearHistoryConfirm(false);
    saveHistory([]);
    setCurrentResult(null);
  };

  const handleCheckExpense = async (queryText: string, isFromExample = false) => {
    if (!queryText.trim() || loading) return;

    if (!navigator.onLine) {
      setIsOffline(true);
      setCurrentResult(null);
      setExplanationQuery(queryText);
      return;
    }

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
      
      if (resData && resData.status === 'success' && resData.data) {
        const result: TaxQualificationResult = resData.data;
        setCurrentResult(result);
        setIsOffline(false);

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
      setIsOffline(true);
      setCurrentResult(null);
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

  const getLlmEngineLabel = () => {
    const config = state.llmConfig;
    if (!config) return 'Gemini (gemini-2.5-flash)';
    
    const providerMap: Record<string, string> = {
      gemini: 'Google Gemini',
      openai: 'OpenAI',
      anthropic: 'Anthropic Claude',
      ollama: 'Ollama Local LLM',
      lmstudio: 'LM Studio Local LLM',
      custom: 'Custom API'
    };

    const providerLabel = providerMap[config.provider] || config.provider;
    return `${providerLabel} (${config.model || 'domyślny'})`;
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
              {isOffline ? '📡' : '🧠'}
            </div>
            <div className="text-xs font-mono">
              <div className="text-slate-400 font-bold">SILNIK ANALIZY AI</div>
              {isOffline ? (
                <div className="text-rose-400 font-semibold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                  TRYB OFFLINE (Brak połączenia)
                </div>
              ) : isApiKeyMissingOrPlaceholder ? (
                <div className="text-amber-400 font-semibold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  BRAK KLUCZA API
                </div>
              ) : (
                <div className="text-emerald-400 font-semibold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  {getLlmEngineLabel()}
                </div>
              )}
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
                    setExplanationQuery(ex.query);
                    if (!isApiKeyMissingOrPlaceholder) {
                      handleCheckExpense(ex.query, true);
                    }
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
                  <span>Ocena podatkowa dla bieżącej daty: <strong>{new Date().toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' })} r.</strong></span>
                </div>
                
                {isApiKeyMissingOrPlaceholder ? (
                  <div className="text-amber-805 bg-amber-50 border border-amber-200 py-1.5 px-3 rounded-xl flex items-center gap-1.5 text-[10px] font-bold">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                    <span>Silnik AI nieaktywny (brak klucza API w Settings). Kopiuj prompt poniżej!</span>
                  </div>
                ) : (
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
                )}
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

          {/* Offline Placeholder Card */}
          {isOffline && !loading && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-8 text-center space-y-6" id="offline-placeholder-card">
              <div className="w-16 h-16 bg-rose-50 border border-rose-200 rounded-full flex items-center justify-center text-rose-500 mx-auto shadow-2xs">
                <AlertCircle className="w-8 h-8" />
              </div>
              <div className="space-y-3 max-w-md mx-auto">
                <h4 className="font-bold text-slate-900 text-sm tracking-tight font-display uppercase">
                  Brak połączenia z Internetem
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed font-sans">
                  Sztuczna inteligencja i asystent weryfikacji kosztów wymagają <strong>aktywnego połączenia z Internetem</strong> do pracy z modelami językowymi. W tym trybie żadne podpowiedzi, rekomendacje podatkowe ani analizy prawne nie mogą zostać wygenerowane.
                </p>
                <div className="bg-slate-50/50 border border-slate-200 rounded-2xl p-4 text-left space-y-3 shadow-3xs">
                  <span className="font-bold text-slate-800 block text-[11px] uppercase tracking-wider">Wymagana Akcja:</span>
                  <ul className="list-disc pl-4 space-y-1.5 text-slate-650 text-[11px]">
                    <li>Upewnij się, że Twoje urządzenie posiada aktywne <strong>połączenie sieciowe (Wi-Fi lub Ethernet)</strong>.</li>
                    <li>Zweryfikuj ustawienia <strong>Konektora Inteligencji AI (LLM API Key)</strong> w zakładce <strong>Magazyn i Kopia Zapasowa</strong> na dole ekranu, jeżeli korzystasz z własnego klucza API lub dostawcy.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Qualification Core Result Panel */}
          {currentResult && !loading && !isOffline && !isApiKeyMissingOrPlaceholder && (
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
                      <div className="space-y-1 text-left flex-1 col-span-1">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <h4 className="font-bold text-sm tracking-tight uppercase leading-tight font-display">
                            {styles.text}
                          </h4>
                          {currentResult.knowledgeCutoff && (
                            <span className="text-[9px] font-semibold bg-white/70 text-slate-850 px-2.5 py-0.5 rounded-full font-sans uppercase tracking-wider shrink-0 w-fit self-start sm:self-auto border border-white/20">
                              Baza wiedzy: {currentResult.knowledgeCutoff}
                            </span>
                          )}
                        </div>
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
                            {currentResult.citDeductibility ? currentResult.citDeductibility.split('.')[0] + '.' : 'Zgodnie z przepisami.'}
                          </span>
                        </div>
                      </div>

                      {/* Expense Verification context */}
                      <div className="bg-slate-50/50 rounded-xl p-3 border border-slate-200/80 text-xs">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Sprawdzany Wydatek:</span>
                        <p className="text-slate-700 mt-1 italic font-medium">"{explanationQuery}"</p>
                      </div>

                      {/* 1. Legal Justification block (Uzasadnienie dla urzędników) */}
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

                      {/* 2. KRS alignment status */}
                      <div className="space-y-2 relative animate-fade-in" id="section-krs-status">
                        <div className="flex justify-between items-center bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
                          <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 font-display">
                            <Building2 className="w-4 h-4 text-indigo-600" />
                            Spójność z profilem KRS Twojej Spółki (PKD 71.11.Z)
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyText(currentResult.krsRelevance, 'krsRelevance')}
                            className="text-[10px] font-bold text-indigo-600 hover:text-indigo-500 flex items-center gap-1 cursor-pointer"
                          >
                            <Clipboard className="w-3.5 h-3.5" />
                            {copiedSection === 'krsRelevance' ? 'skopiowano' : 'kopiuj'}
                          </button>
                        </div>
                        <p className="text-xs text-slate-750 leading-relaxed font-sans bg-slate-50/20 p-3 rounded-xl border border-dashed border-slate-200 pl-4 border-l-2 border-l-indigo-600">
                          {currentResult.krsRelevance}
                        </p>
                      </div>

                      {/* 3. How To Talk to Accountant Section (Instrukcja dla księgowej / Uzasadnienie dla księgowej) */}
                      <div className="space-y-2 relative" id="section-accounting-advice">
                        <div className="flex justify-between items-center bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
                          <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 font-display">
                            <MessageSquare className="w-4 h-4 text-emerald-600" />
                            Uzasadnienie i Instrukcja dla Księgowej
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

                      {/* 4. Custom Email Inquiry Generator (Eksport do maila o wiążącą opinię przed zakupem) */}
                      <div className="space-y-3 bg-indigo-50/45 p-5 rounded-2xl border border-indigo-150 mt-6" id="section-email-export">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 font-display">
                            <Mail className="w-4 h-4 text-indigo-700" />
                            Gotowe Zapytanie E-mail do Twojej Księgowej (Wiążąca Opinia)
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const body = generateEmailBody();
                              handleCopyText(body, 'email-body');
                            }}
                            className="text-[10px] font-bold text-indigo-600 hover:text-indigo-550 flex items-center gap-1 cursor-pointer"
                          >
                            <Clipboard className="w-3.5 h-3.5" />
                            {copiedSection === 'email-body' ? 'skopiowano' : 'kopiuj całość'}
                          </button>
                        </div>
                        
                        <p className="text-[10px] text-slate-500 leading-relaxed">
                          Profesjonalny e-mail przygotowany na podstawie wstępnej analizy celowości podatkowej. Służy do celów oficjalnego wysłania zapytania do biura rachunkowego w celu uzyskania wiążącej opinii i ostatecznego zatwierdzenia kwalifikacji podatkowej planowanego zakupu.
                        </p>

                        <div className="bg-white border text-xs text-slate-800 rounded-xl overflow-hidden shadow-2xs border-slate-200">
                          {/* Simulated Email Headers */}
                          <div className="bg-slate-50 p-3 border-b border-slate-150 space-y-1.5 text-[11px] font-sans text-slate-600">
                            <div><strong className="text-slate-500">Do:</strong> <span className="italic text-slate-400 font-sans">[Adres e-mail Twojej księgowej / biura rachunkowego]</span></div>
                            <div className="border-t border-slate-150 pt-1.5"><strong className="text-slate-500">Temat:</strong> <span className="text-slate-800 font-medium">Zapytanie o wiążącą opinię podatkową przed zakupem: "{explanationQuery}"</span></div>
                          </div>
                          
                          {/* Resizable Textarea Preview */}
                          <textarea
                            readOnly
                            value={generateEmailBody()}
                            className="w-full h-80 p-4 bg-slate-50/20 text-xs font-sans text-slate-700 focus:outline-hidden leading-relaxed resize-y border-none"
                            id="email-draft-textarea"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              const body = generateEmailBody();
                              handleCopyText(body, 'email-click');
                            }}
                            className="flex py-2.5 px-4 bg-white border border-slate-250 hover:bg-slate-50 rounded-xl font-bold text-xs text-slate-700 items-center justify-center gap-2 transition-all cursor-pointer shadow-3xs"
                          >
                            <Clipboard className="w-4 h-4 text-slate-500" />
                            {copiedSection === 'email-click' ? 'SKOPIOWANO TREŚĆ!' : 'KOPIUJ CAŁĄ TREŚĆ MAILA'}
                          </button>
                          
                          <a
                            href={`mailto:?subject=${encodeURIComponent(`Zapytanie o wiążącą opinię podatkową przed zakupem: "${explanationQuery}"`)}&body=${encodeURIComponent(generateEmailBody())}`}
                            className="flex py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-bold text-xs text-white items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-indigo-100"
                          >
                            <Mail className="w-4 h-4" />
                            UTWÓRZ WIADOMOŚĆ E-MAIL
                          </a>
                        </div>
                      </div>

                      {/* 5. Custom Web Search Prompt Generator (Weryfikacja zmian na dzień dzisiejszy) */}
                      <div className="space-y-3 bg-teal-50/45 p-5 rounded-2xl border border-teal-150 mt-4" id="section-web-search-prompt">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 font-display">
                            <Search className="w-4 h-4 text-teal-700" />
                            Zweryfikuj Aktualność (Gotowy prompt do innych narzędzi AI z dostępem do Google)
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const promptText = generateExternalPromptBody();
                              handleCopyText(promptText, 'web-prompt');
                            }}
                            className="text-[10px] font-bold text-teal-700 hover:text-teal-650 flex items-center gap-1 cursor-pointer"
                          >
                            <Clipboard className="w-3.5 h-3.5" />
                            {copiedSection === 'web-prompt' ? 'skopiowano' : 'kopiuj prompt'}
                          </button>
                        </div>
                        
                        <p className="text-[10px] text-slate-500 leading-relaxed">
                          Ten prompt możesz skopiować i wkleić do dowolnego darmowego modelu (np. <strong>Google Gemini, ChatGPT, Claude</strong> z włączoną wyszukiwarką). Zleci on modelowi przeszukanie internetu na żywo i zweryfikowanie, czy od progu bazy wiedzy (<strong className="text-slate-600">{currentResult.knowledgeCutoff || 'styczeń 2025 r.'}</strong>) do dnia dzisiejszego (<strong className="text-slate-600">{new Date().toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' })} r.</strong>) nie ukazały się nowe, niekorzystne interpretacje KIS lub wyroki NSA.
                        </p>

                        <div className="bg-white border text-xs text-slate-800 rounded-xl overflow-hidden shadow-2xs border-slate-200">
                          <textarea
                            readOnly
                            value={generateExternalPromptBody()}
                            className="w-full h-48 p-4 bg-slate-50/20 text-xs font-sans text-slate-700 focus:outline-hidden leading-relaxed resize-y border-none"
                            id="web-prompt-textarea"
                          />
                        </div>

                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              const promptText = generateExternalPromptBody();
                              handleCopyText(promptText, 'web-prompt-click');
                            }}
                            className="w-full flex py-2.5 px-4 bg-white border border-teal-200 hover:bg-teal-50/30 rounded-xl font-bold text-xs text-slate-700 items-center justify-center gap-2 transition-all cursor-pointer shadow-3xs hover:border-teal-300"
                          >
                            <Clipboard className="w-4 h-4 text-teal-600" />
                            {copiedSection === 'web-prompt-click' ? 'SKOPIOWANO PROMPT DO SCHOWKA!' : 'SKOPIUJ GOTOWY PROMPT BADANIA INTERNETU'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Dedicated template / copy prompt panel when API is missing/placeholder */}
          {isApiKeyMissingOrPlaceholder && !loading && !isOffline && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden animate-fade-in" id="no-api-copy-prompt-panel">
              {/* Header block highlighting prompt generator */}
              <div className="p-5 border-b border-slate-200 bg-amber-50/50 text-amber-900 flex items-start gap-4" id="no-api-header">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white bg-amber-500 shadow-xs shrink-0 select-none">
                  <Search className="w-6 h-6" />
                </div>
                <div className="space-y-1 text-left flex-1 col-span-1">
                  <h4 className="font-bold text-sm tracking-tight uppercase leading-tight font-display flex items-center gap-1.5 text-amber-950">
                    Skarbowa Baza Wiedzy (Kopiowanie Promptu)
                  </h4>
                  <p className="text-[11px] font-medium leading-relaxed opacity-95 text-slate-750 font-sans">
                    Bezpośredni silnik weryfikacyjny AI w tej aplikacji nie posiada podpiętego klucza API. Wykorzystaj poniższy, profesjonnie przygotowany generator promptu w formacie <strong>Markdown</strong>, aby uzyskać bezpłatną analizę na żywo w innych darmowych narzędziach AI z dostępem do internetu (ChatGPT, Gemini, Claude).
                  </p>
                </div>
              </div>

              {/* Prompt Box Details */}
              <div className="p-6 space-y-4">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Wpisany lub wybrany wydatek:</span>
                  <span className="text-slate-800 font-medium text-xs mt-1 block">
                    {searchQuery.trim() ? `"${searchQuery}"` : '[Wybierz przykład po lewej lub wpisz wydatek w polu powyżej, aby automatycznie odświeżyć prompt]'}
                  </span>
                </div>

                {/* 5. Custom Web Search Prompt Generator (Weryfikacja zmian na dzień dzisiejszy) */}
                <div className="space-y-3 bg-teal-50/45 p-5 rounded-2xl border border-teal-150 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 font-display">
                      <Search className="w-4 h-4 text-teal-700" />
                      Wygenerowany Prompt do Zewnętrznych AI (Kopiuj i Wklej)
                    </span>
                    <button
                      type="button"
                      disabled={!searchQuery.trim()}
                      onClick={() => {
                        const promptText = generateExternalPromptBody();
                        handleCopyText(promptText, 'web-prompt-offline');
                      }}
                      className={`text-[10px] font-bold flex items-center gap-1 cursor-pointer ${
                        searchQuery.trim() ? 'text-teal-700 hover:text-teal-650' : 'text-slate-350 cursor-not-allowed'
                      }`}
                    >
                      <Clipboard className="w-3.5 h-3.5" />
                      {copiedSection === 'web-prompt-offline' ? 'skopiowano' : 'kopiuj prompt'}
                    </button>
                  </div>
                  
                  <p className="text-[10px] text-slate-500 leading-relaxed font-sans">
                    Poniższy prompt został sformatowany przy użyciu <strong>języka Markdown</strong>. Możesz go skopiować i wkleić bezpośrednio do dowolnego czatu AI z dostępem do Google Search (np. <strong>Google Gemini, ChatGPT, Claude</strong>), aby model sam przeszukał aktualną bazę podatkową i ocenił Twój wydatek.
                  </p>

                  <div className={`bg-white border text-xs text-slate-800 rounded-xl overflow-hidden shadow-2xs border-slate-200 ${!searchQuery.trim() ? 'opacity-50' : ''}`}>
                    <textarea
                      readOnly
                      placeholder="Wpisz szczegóły wydatku w polu roboczym powyżej, aby wygenerować dedykowany prompt..."
                      value={generateExternalPromptBody()}
                      className="w-full h-80 p-4 bg-slate-50/20 text-xs font-sans text-slate-750 focus:outline-hidden leading-relaxed resize-y border-none"
                      id="web-prompt-textarea-offline"
                    />
                  </div>

                  <div className="pt-1">
                    <button
                      type="button"
                      disabled={!searchQuery.trim()}
                      onClick={() => {
                        const promptText = generateExternalPromptBody();
                        handleCopyText(promptText, 'web-prompt-click-offline');
                      }}
                      className={`w-full flex py-2.5 px-4 bg-white border rounded-xl font-bold text-xs items-center justify-center gap-2 transition-all shadow-3xs ${
                        searchQuery.trim() 
                          ? 'border-teal-200 hover:bg-teal-50/30 text-slate-700 hover:border-teal-300 cursor-pointer' 
                          : 'border-slate-200 text-slate-450 bg-slate-50 cursor-not-allowed'
                      }`}
                    >
                      <Clipboard className="w-4 h-4 text-teal-600" />
                      {copiedSection === 'web-prompt-click-offline' ? 'SKOPIOWANO PROMPT DO SCHOWKA!' : 'SKOPIUJ GOTOWY PROMPT BADANIA INTERNETU'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Help notice if nothing is searched yet */}
          {!currentResult && !loading && !isOffline && !isApiKeyMissingOrPlaceholder && (
            <div className="bg-slate-50 border border-slate-200 rounded-3xl p-8 text-center space-y-3" id="no-result-helper-message">
              <div className="w-12 h-12 bg-white border border-slate-200 rounded-full flex items-center justify-center text-lg mx-auto shadow-2xs">
                💡
              </div>
              <div className="space-y-1.5 max-w-sm mx-auto">
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                  Oczekiwanie na zapytanie kosztowe
                </h4>
                <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
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
            Weryfikacja celowości opiera się na wytycznych prawa podatkowego obowiązujących w Polsce na rok podatkowy <strong>2026</strong>. Porady mają charakter doradczo-dydaktyczny, pozwalający przygotować twarde argumentacje rynkowe bezpośrednio pod PKD 71.11.Z. Wyniki z asystenta nie zastępują spersonalizowanego audytu księgowego ani wiążącej opinii licencjonowanego doradcy podatkowego v trybie formalnym. Dane oznaczające kontrahentów są rewidowane lokalnie przed przetworzeniem.
          </p>
        </div>
      </div>

      {/* Custom Confirmation Modal for Clear History */}
      {showClearHistoryConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in" id="clear-history-confirm-modal">
          <div className="bg-white rounded-3xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4 animate-scale-in">
            <div className="flex items-start gap-3">
              <div className="p-3 bg-rose-50 rounded-2xl text-rose-600 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900 tracking-tight font-display">
                  Czyszczenie historii zapytań
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed text-left">
                  Czy na pewno chcesz wyczyścić całą historię zapytań o kwalifikowalność kosztów? Tej operacji nie można cofnąć!
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 justify-end">
              <button
                type="button"
                onClick={() => setShowClearHistoryConfirm(false)}
                className="px-4 h-9 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Anuluj
              </button>
              <button
                type="button"
                onClick={executeClearHistory}
                className="px-4 h-9 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors cursor-pointer shadow-sm"
              >
                Tak, wyczyść historię
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
