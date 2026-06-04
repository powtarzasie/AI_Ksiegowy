import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import os from 'os';
import fs from 'fs';

dotenv.config();

const CONFIG_DIR = path.join(os.homedir(), '.symulator_podatkow');
const CONFIG_PATH = path.join(CONFIG_DIR, 'config.json');

function getDbPath(): string {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const configRaw = fs.readFileSync(CONFIG_PATH, 'utf8');
      const config = JSON.parse(configRaw);
      if (config.dbPath) {
        return config.dbPath;
      }
    }
  } catch (err) {
    console.error('Error reading config:', err);
  }
  return path.join(CONFIG_DIR, 'baza_danych.json');
}

function setDbPath(newPath: string) {
  try {
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
    let config: any = {};
    if (fs.existsSync(CONFIG_PATH)) {
      try {
        config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
      } catch (e) {}
    }
    config.dbPath = newPath;
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing config:', err);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Set up body parsing with high limit for larger Excel exports
  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ extended: true, limit: '15mb' }));

  // Local Database Persistence Config Endpoints
  app.get('/api/db/config', async (req, res) => {
    try {
      const currentPath = getDbPath();
      const defaultPath = path.join(os.homedir(), '.symulator_podatkow', 'baza_danych.json');
      return res.json({
        status: 'success',
        dbPath: currentPath,
        defaultPath: defaultPath,
        exists: fs.existsSync(currentPath)
      });
    } catch (err: any) {
      console.error('Error getting database config:', err);
      return res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/db/config', async (req, res) => {
    try {
      const { dbPath, moveExistingData } = req.body;
      if (!dbPath) {
        return res.status(400).json({ error: 'Brak wymaganej ścieżki dbPath' });
      }

      const targetPath = path.resolve(dbPath.trim());
      const oldPath = getDbPath();

      if (oldPath === targetPath) {
        return res.json({ status: 'success', dbPath: targetPath, message: 'Wybrana ścieżka jest taka sama jak obecna.' });
      }

      const targetDir = path.dirname(targetPath);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      let dataLoaded = null;

      if (moveExistingData && fs.existsSync(oldPath)) {
        // Move current data to the new path
        const data = fs.readFileSync(oldPath, 'utf8');
        fs.writeFileSync(targetPath, data, 'utf8');
        try {
          dataLoaded = JSON.parse(data);
        } catch (e) {}
        console.log(`Przeniesiono bazę danych z ${oldPath} do ${targetPath}`);
      } else if (fs.existsSync(targetPath)) {
        // Just load from target path
        const data = fs.readFileSync(targetPath, 'utf8');
        try {
          dataLoaded = JSON.parse(data);
        } catch (e) {}
      }

      setDbPath(targetPath);

      return res.json({
        status: 'success',
        dbPath: targetPath,
        data: dataLoaded,
        message: moveExistingData 
          ? `Pomyślnie przeniesiono bazę do nowej lokalizacji: ${targetPath}`
          : `Zmieniono ścieżkę bazy danych na: ${targetPath}`
      });
    } catch (err: any) {
      console.error('Error setting database config:', err);
      return res.status(500).json({ error: err.message });
    }
  });

  // Local Database Persistence Endpoints for Desktop Mode
  app.get('/api/db/load', async (req, res) => {
    try {
      const dbPath = getDbPath();
      if (fs.existsSync(dbPath)) {
        const rawJson = fs.readFileSync(dbPath, 'utf8');
        const parsed = JSON.parse(rawJson);
        return res.json({ status: 'success', data: parsed });
      } else {
        return res.json({ status: 'not_found', path: dbPath });
      }
    } catch (err: any) {
      console.error('Error loading database:', err);
      return res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/db/save', async (req, res) => {
    try {
      const dbPath = getDbPath();
      const dbDir = path.dirname(dbPath);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }
      fs.writeFileSync(dbPath, JSON.stringify(req.body, null, 2), 'utf8');
      return res.json({ status: 'success', path: dbPath });
    } catch (err: any) {
      console.error('Error saving database:', err);
      return res.status(500).json({ error: err.message });
    }
  });

  // AI McKinsey Audit API Endpoint
  app.post('/api/gemini/analyze', async (req, res) => {
    try {
      const { sales = [], purchases = [], settings = {} } = req.body;

      if (!process.env.GEMINI_API_KEY) {
        // Fallback Heuristics Model when API Key is missing - ensures graceful, uninterrupted service
        const fallbackResponse = generateHeuristicAnalysis(sales, purchases, settings);
        return res.json({
          status: 'fallback',
          message: 'Analityka wykończona algorytmem lokalnym. Aby odblokować pełną moc AI, wprowadź klucz GEMINI_API_KEY w panelu Settings > Secrets.',
          data: fallbackResponse
        });
      }

      // Initialize official GenAI SDK as per gemini-api guidelines
      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      // Prepare transactions digest for prompt optimization (reduce token weight)
      const salesDigest = sales.map((s: any) => ({
        data: s.data,
        numer: s.numerFaktury,
        kontrahent: s.kontrahent || 'Nienazwany',
        netto: s.netto,
        czyCIT: s.czyCIT
      }));

      const purchasesDigest = purchases.map((p: any) => ({
        data: p.data,
        numer: p.numerFaktury,
        dostawca: p.dostawca || 'Nienazwany',
        kategoria: p.kategoria || 'Ogólne',
        netto: p.netto,
        kosztCIT: p.kosztCIT,
        odliczenieVat: p.odliczenieVat
      }));

      const systemInstruction = `Jesteś ekspertem McKinsey & Company oraz dyrektorem finansowym (CFO) specjalizującym się w optymalizacji polskiego podatku CIT, analizie wąskich gardeł, marżowości oraz strukturyzacji modeli biznesowych.
Przeanalizuj listę transakcji sprzedaży (przychody) i zakupów (koszty) spółki z o.o. przeprowadź pełne badanie i generuj strukturyzowany raport McKinsey Matrix.

Musisz przydzielić transakcje do syntetycznych kategorii oraz ocenić je według kryteriów macierzy McKinsey:
1. Atrakcyjność segmentu rynkowego / strategiczna ważność (ocena 1-10)
2. Pozycja konkurencyjna / rentowność (ocena 1-10)

Dodatkowo zdefiniuj kluczowe przewagi (np. stabilność przychodowa, oszczędności, zdywersyfikowana baza klientów) oraz wąskie gardła (np. ryzyko koncentracji przychodów na jednym kliencie, wycieki marży przez nadmierne koszty transportu/paliwa/biurowe, brak kosztów KUP obniżających CIT).

Odpowiedź musi być wyłącznie w formacie JSON zgodnym ze schematem podanym w schemacie odpowiedzi. Pisz w języku polskim.`;

      const prompt = `Przeanalizuj następujące dane finansowe spółki:
Nazwa spółki: ${settings.nazwaSpolki || 'Spółka z o.o.'}
Stawka CIT: ${settings.stawkaCIT || 9}%
Rok podatkowy: ${settings.rokPodatkowy || 2026}

Dane sprzedaży (przychody):
${JSON.stringify(salesDigest.slice(0, 50))}

Dane zakupów (koszty):
${JSON.stringify(purchasesDigest.slice(0, 50))}

Wygeneruj kompletny audyt strategiczny McKinsey dla tych transakcji. Zasugeruj idealny podział na kategorie rynkowe (np. "Usługi IT", "Logistyka", "Koszty stałe operacyjne", "Licencje oprogramowania") i oceń je pod kątem McKinsey Matrix.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          systemInstruction: systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: {
                type: Type.STRING,
                description: "Syntetyczny ekspercki opis stanu finansowego i optymalizacji CIT dla zarządu spółki."
              },
              advantages: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Lista 3-4 kluczowych zalet i mocnych stron modelu biznesowego spółki."
              },
              bottlenecks: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Lista 3-4 wąskich gardeł, barier rozwoju, ryzyk koncentracyjnych lub wycieków CIT."
              },
              mckinseyMatrix: {
                type: Type.ARRAY,
                description: "Lista zidentyfikowanych kategorii przychodów i kosztów z ich pozycją rynkową i radą strategiczną.",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING, description: "Nazwa kategorii lub grupy kontrahentów." },
                    quadrant: { type: Type.STRING, description: "Nazwa segmentu macierzy (np. Lider wzrostu, Segment do restrukturyzacji, Segment do obrony, Generatory gotówki)." },
                    marketAttractivenessRating: { type: Type.INTEGER, description: "Atrakcyjność segmentu (skala 1-10)." },
                    competitivePositionRating: { type: Type.INTEGER, description: "Pozycja spółki w tym segmencie / rentowność (skala 1-10)." },
                    strategicGuidance: { type: Type.STRING, description: "Krótka (1 zdanie) rekomendacja strategiczna od McKinsey dla tej kategorii." },
                    type: { type: Type.STRING, description: "Czy jest to przychód ('przychod') czy koszt ('koszt')." }
                  },
                  required: ["name", "quadrant", "marketAttractivenessRating", "competitivePositionRating", "strategicGuidance", "type"]
                }
              }
            },
            required: ["summary", "advantages", "bottlenecks", "mckinseyMatrix"]
          }
        }
      });

      const responseText = response.text || '';
      const parsedData = JSON.parse(responseText.trim());

      return res.json({
        status: 'success',
        data: parsedData
      });

    } catch (error: any) {
      console.error('Error calling Gemini API:', error);
      // Fallback in case of server execution issues to keep the operational loop flawless
      const dummyResponse = generateHeuristicAnalysis(req.body.sales || [], req.body.purchases || [], req.body.settings || {});
      return res.json({
        status: 'error_fallback',
        message: `Wystąpił błąd podczas komunikacji z AI: ${error.message || error}. Zastąpiono analizą algorytmiczną.`,
        data: dummyResponse
      });
    }
  });

  // AI Tax Adviser and Qualification Helper
  app.post('/api/gemini/tax-adviser', async (req, res) => {
    try {
      const { 
        query = '', 
        krs = 'Przeważająca działalność: 71.11.Z DZIAŁALNOŚĆ W ZAKRESIE ARCHITEKTURY. Pozostała działalność: 1. 74.10.Z DZIAŁALNOŚĆ W ZAKRESIE SPECJALISTYCZNEGO PROJEKTOWANIA, 2. 71.12.Z DZIAŁALNOŚĆ W ZAKRESIE INŻYNIERII I ZWIĄZANE Z NIĄ DORADZTWO TECHNICZNE.',
        llmConfig = null
      } = req.body;

      if (!query.trim()) {
        return res.status(400).json({ error: 'Brak zapytania' });
      }

      const provider = llmConfig?.provider || 'gemini';
      const userApiKey = llmConfig?.apiKey;
      const effectiveApiKey = provider === 'gemini' ? (userApiKey || process.env.GEMINI_API_KEY) : '';

      const isPlaceholderKey = !effectiveApiKey || 
        effectiveApiKey.startsWith('AIzaSyYourKey') || 
        effectiveApiKey.includes('PLACEHOLDER') || 
        effectiveApiKey.trim() === '' || 
        effectiveApiKey.includes('wprowadź') ||
        effectiveApiKey.includes('TwójKey') ||
        effectiveApiKey.includes('...') ||
        effectiveApiKey.length < 10;

      const systemInstruction = `Jesteś wybitnym polskim licencjonowanym doradcą podatkowym (specjalistą od podatku CIT i VAT) oraz partnerem prawnym w renomowanej kancelarii podatkowej.
Twoim celem jest pomoc właścicielowi biura architektonicznego (PKD 71.11.Z - "Działalność w zakresie architektury") w LEGALNEJ i bezpiecznej optymalizacji podatkowej.
Zasugeruj jak najszersze, w pełni zgodne z literą prawa (100% legalne), zakwalifikowanie podanego wydatku jako koszt uzyskania przychodu (KUP) w spółce z o.o.

Przeanalizuj wydatek w kontekście polskiej ustawy o podatku dochodowym od osób prawnych (Ustawa o CIT) – zwłaszcza art. 15 ust. 1, oraz ustawy o VAT (prawo do odliczenia z uwzględnieniem ograniczeń np. gastronomii czy pojazdów).
Wydaj jednoznaczną ocenę ("Zielone", "Żółte" lub "Czerwone" światło):
- Zielone światło (Bezpieczny koszt): Koszt bezpośrednio związany z projektowaniem, pracownią, marketingiem lub BHP. Nie budzi wątpliwości fiskusa.
- Żółte światło (Średnie ryzyko): Koszt, który można zakwalifikować w koszty firmy pod pewnymi warunkami formalnymi (np. trwałym naklejeniem logo, spisaniem protokołu, opisem celu biznesowego na fakturze, udowodnieniem powiązania ze startem w przetargu).
- Czerwone światło (Wysokie ryzyko): Wydatek osobisty, reprezentacja sprzeczna z prawem, brak jakiegokolwiek racjonalnego związku z PKD 71.11.Z (duże prawdopodobieństwo zakwestionowania przez Urząd Skarbowy).

Zawsze podaj:
1. "light" (jedno z: "green", "yellow", "red")
2. "category" (nazwa kategorii kosztowej po polsku, np. "Koszty Spotkań z Klientami", "Odzież Służbowa / BHP", "Narzędzia Projektowe")
3. "vatDeductibility" (informacja o odliczeniu podatku VAT, w tym ograniczenia i warunki)
4. "citDeductibility" (informacja o rozliczeniu CIT, np. 100% KUP, 75% KUP itp.)
5. "justification" (Wyjątkowo precyzyjne, urzędowe, profesjonalne uzasadnienie prawne, powołujące się na przepisy np. art. 15 ust. 1 ustawy o CIT. Musi brzmieć profesjonalnie, zawierać solidne logiczne powiązanie z PKD architekta - projektowanie, inwentaryzacje, nadzór techniczny, wizualizacje. Użyj argumentów, że koszt ten służy zabezpieczeniu i zachowaniu źródła przychodów).
6. "accountingAdvice" (Konkretna, praktyczna instrukcja jak rozmawiać z księgową i co powiedzieć. Podaj listę dokładnych argumentów i wymogów formalnych, np. 'Jak oznaczyć odzież logo', 'Co wpisać na odwrocie faktury z restauracji', 'Jak udokumentować cel spotkania (np. zapisem w kalendarzu czy mailem do klienta)', 'O co poprosić biuro rachunkowe').
7. "krsRelevance" (Wykazanie spójności z PKD 71.11.Z oraz KRS podanym przez użytkownika).

Odpowiedź musi być wyłącznie w formacie JSON zgodnym z podanym schematem. Pisz profesjonalnym, urzędowym, ale jasnym językiem polskim.`;

      const prompt = `Zbadaj wydatek:
Wydatek użytkownika: "${query}"
Informacje o działalności (KRS/PKD): "${krs}"
Bieżący rok podatkowy: 2026

Oceniaj z perspektywy najnowszych interpretacji dyrektora KIS (Krajowej Informacji Skarbowej) oraz wyroków NSA (Naczelnego Sądu Administracyjnego). Pamiętaj o praktycznych przykładach (np. dla ubrań z logo, czy usług dla klientów).`;

      // 1. OLLAMA / LM STUDIO / OPENAI Compatible Dynamic Endpoint Routing
      if (['ollama', 'lmstudio', 'openai', 'custom'].includes(provider)) {
        let baseUrl = llmConfig.baseUrl || '';
        if (provider === 'ollama' && !baseUrl) baseUrl = 'http://localhost:11434/v1';
        if (provider === 'lmstudio' && !baseUrl) baseUrl = 'http://localhost:1234/v1';
        if (provider === 'openai' && !baseUrl) baseUrl = 'https://api.openai.com/v1';
        
        if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
        const url = `${baseUrl}/chat/completions`;
        
        const headers: Record<string, string> = {
          'Content-Type': 'application/json'
        };
        
        if (llmConfig.apiKey) {
          headers['Authorization'] = `Bearer ${llmConfig.apiKey}`;
        } else if (provider === 'openai') {
          headers['Authorization'] = `Bearer ${process.env.OPENAI_API_KEY || ''}`;
        }

        const modelName = llmConfig.model || (provider === 'openai' ? 'gpt-4o-mini' : 'llama3');

        const extendedPrompt = `${prompt}\n\nOdpowiedz WYŁĄCZNIE w formacie JSON o schemacie:\n{\n  "light": "green" lub "yellow" lub "red",\n  "category": "kategoria po polsku",\n  "vatDeductibility": "opis odliczenia VAT",\n  "citDeductibility": "opis odliczenia CIT",\n  "justification": "szczegółowe uzasadnienie prawne Art.15 CIT",\n  "accountingAdvice": "praktyczna pomoc dla księgowej",\n  "krsRelevance": "zbieżność z PKD architekta"\n}\nNie dodawaj żadnych cytatów, wstępów ani znaczników markdown \`\`\`json. Zwróć sam surowy obiekt JSON.`;

        const response = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model: modelName,
            messages: [
              { role: 'system', content: systemInstruction },
              { role: 'user', content: extendedPrompt }
            ],
            temperature: 0.1,
            response_format: { type: 'json_object' }
          })
        });

        if (!response.ok) {
          throw new Error(`Błąd HTTP ${response.status} od zewnętrznego dostawcy AI (${provider})`);
        }

        const resData: any = await response.json();
        const content = resData.choices?.[0]?.message?.content || '';
        
        const jsonStart = content.indexOf('{');
        const jsonEnd = content.lastIndexOf('}');
        if (jsonStart === -1 || jsonEnd === -1) {
          throw new Error('Nie odnaleziono poprawnej struktury JSON w odpowiedzi od lokalnego modelu AI.');
        }
        const jsonStr = content.substring(jsonStart, jsonEnd + 1);
        const parsed = JSON.parse(jsonStr);
        
        return res.json({
          status: 'success',
          data: parsed
        });
      }

      // 2. ANTHROPIC CLAUDE Dynamic Endpoint Routing
      if (provider === 'anthropic') {
        const apiKey = llmConfig.apiKey || process.env.ANTHROPIC_API_KEY || '';
        const modelName = llmConfig.model || 'claude-3-5-sonnet-latest';
        
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: modelName,
            max_tokens: 3000,
            system: systemInstruction,
            messages: [
              { role: 'user', content: `${prompt}\n\nOdpowiedz WYŁĄCZNIE w formacie JSON o schemacie:\n{\n  "light": "green" lub "yellow" lub "red",\n  "category": "kategoria po polsku",\n  "vatDeductibility": "opis odliczenia VAT",\n  "citDeductibility": "opis odliczenia CIT",\n  "justification": "szczegółowe uzasadnienie prawne Art.15 CIT",\n  "accountingAdvice": "praktyczna pomoc dla księgowej",\n  "krsRelevance": "zbieżność z PKD architekta"\n}` }
            ]
          })
        });

        if (!response.ok) {
          throw new Error(`Błąd HTTP ${response.status} od dostawcy Anthropic API`);
        }

        const resData: any = await response.json();
        const content = resData.content?.[0]?.text || '';
        
        const jsonStart = content.indexOf('{');
        const jsonEnd = content.lastIndexOf('}');
        if (jsonStart === -1 || jsonEnd === -1) {
          throw new Error('Nie odnaleziono poprawnej struktury JSON w odpowiedzi od Claude Anthropic.');
        }
        const jsonStr = content.substring(jsonStart, jsonEnd + 1);
        const parsed = JSON.parse(jsonStr);
        
        return res.json({
          status: 'success',
          data: parsed
        });
      }

      // 3. GOOGLE GEMINI Dynamic Endpoint Routing / Default Fallback
      if (provider === 'gemini' && isPlaceholderKey) {
        const fallback = generateHeuristicTaxAdviserOffset(query, krs);
        return res.json({
          status: 'fallback',
          message: 'Odpowiedź wygenerowana lokalnym algorytmem heurystycznym. Wprowadź poprawny klucz Gemini API w panelu Settings, aby odblokować pełną moc AI.',
          data: fallback
        });
      }

      // Initialize official GenAI SDK as per gemini-api guidelines
      const ai = new GoogleGenAI({
        apiKey: effectiveApiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const activeModel = llmConfig?.model || 'gemini-3.5-flash';

      const response = await ai.models.generateContent({
        model: activeModel,
        contents: prompt,
        config: {
          systemInstruction: systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              light: { type: Type.STRING, description: "Status bezpieczeństwa. Dozwolone wartości: 'green', 'yellow', 'red'." },
              category: { type: Type.STRING, description: "Kategoria kosztu." },
              vatDeductibility: { type: Type.STRING, description: "Jak odliczamy podatek VAT z tego kosztu (np. 100%, 50%, brak)." },
              citDeductibility: { type: Type.STRING, description: "Jak księgujemy w CIT (100% KUP, 75% KUP, wyłączony z KUP itp.)." },
              justification: { type: Type.STRING, description: "Argument prawno-podatkowy wykazujący celowość kosztu, powołujący się na art. 15 ust. 1 ustawy o CIT." },
              accountingAdvice: { type: Type.STRING, description: "Instrukcja rozmowy i weryfikacji z księgową. Wskazówki dokumentacyjne." },
              krsRelevance: { type: Type.STRING, description: "Powiązanie kosztu z profilem architektonicznym z KRS użytkownika." }
            },
            required: ["light", "category", "vatDeductibility", "citDeductibility", "justification", "accountingAdvice", "krsRelevance"]
          }
        }
      });

      const responseText = response.text || '';
      const parsedData = JSON.parse(responseText.trim());

      return res.json({
        status: 'success',
        data: parsedData
      });

    } catch (error: any) {
      console.error('Error in tax-adviser endpoint:', error);
      const fallback = generateHeuristicTaxAdviserOffset(req.body.query || '', req.body.krs || '');
      return res.json({
        status: 'error_fallback',
        message: `Wystąpił błąd po stronie serwera AI: ${error.message || error}. Zastąpiono lokalną rzetelną symulacją doradcy podatkowego.`,
        data: fallback
      });
    }
  });

  // Serve static UI assets under production, or let Vite process in development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[tax-today backend] Server active on port ${PORT}`);
  });
}

// Heuristic Strategic Fallback engine to guarantee 100% offline availability & stellar UI fidelity
function generateHeuristicAnalysis(sales: any[], purchases: any[], settings: any) {
  // Compute basic metrics
  let totalSales = 0;
  let totalCost = 0;
  let totalKUP = 0;

  const clientScores: { [key: string]: number } = {};
  const costScores: { [key: string]: number } = {};

  sales.forEach(s => {
    if (s.czyCIT) {
      totalSales += s.netto;
      const clientName = s.kontrahent || 'Inny Kontrahent';
      clientScores[clientName] = (clientScores[clientName] || 0) + s.netto;
    }
  });

  purchases.forEach(p => {
    totalCost += p.netto;
    if (p.kosztCIT) {
      totalKUP += p.netto;
    }
    const cat = p.kategoria || 'Ogólne';
    costScores[cat] = (costScores[cat] || 0) + p.netto;
  });

  // Client concentration check
  const sortedClients = Object.entries(clientScores).sort((a, b) => b[1] - a[1]);
  const sortedCosts = Object.entries(costScores).sort((a, b) => b[1] - a[1]);

  const maxClientName = sortedClients[0]?.[0] || 'Inne przychody';
  const maxClientVal = sortedClients[0]?.[1] || 0;
  const clientConcentrationRatio = totalSales > 0 ? (maxClientVal / totalSales) * 100 : 0;

  // Build high quality strategic observations
  const advantages = [
    `Stabilne ustrukturyzowane źródła przychodu: Łączne fakturowanie netto w badanej próbie wynosi ${totalSales.toLocaleString('pl-PL')} zł.`,
    `Zarządzanie odliczeniami podatkowymi: Spółka efektywnie księguje koszty jako KUP (${totalKUP.toLocaleString('pl-PL')} zł z ${totalCost.toLocaleString('pl-PL')} zł wszystkich kosztów), obniżając podstawę opodatkowania CIT.`
  ];

  if (settings.stawkaCIT === 9) {
    advantages.push('Preferencyjna stawka 9% CIT: Model zapewnia zgodność z warunkami małego podatnika (rocznie poniżej 2M EUR).');
  } else {
    advantages.push('Standardowy CIT 19%: Silne i dojrzałe ramy korporacyjne bez ograniczeń co do skali działalności.');
  }

  const bottlenecks = [
    totalKUP === 0 
      ? 'Brak generowania kosztów KUP: Spółka nie posiada żadnych kosztów uzyskania przychodu, co powoduje bardzo wysoką, niepotrzebną ekspozycję na podatek CIT.' 
      : 'Eksploatacja bazy kosztowej: Struktura kosztów wskazuje na znaczny udział kategorii o niskiej wartości dodanej, co ogranicza dźwignię operacyjną.'
  ];

  if (clientConcentrationRatio > 40) {
    bottlenecks.push(`Ryzyko skrajnej koncentracji przychodów: Kontrahent "${maxClientName}" generuje aż ${clientConcentrationRatio.toFixed(1)}% Twoich całościowych przychodów. Utrata tego kontraktu zdestabilizuje płynność spółki.`);
  } else {
    bottlenecks.push('Ryzyko dywersyfikacji: Niska bariera wejścia i rozproszony portfel klientów mogą generować dodatkowe koszty logistyczne i administracyjne.');
  }

  if (totalSales > 0 && (totalCost / totalSales) > 0.85) {
    bottlenecks.push('Bardzo wysoki wskaźnik kosztów do przychodów (CIR > 85%): Wysokie stałe wydatki operacyjne znacząco zawężają marżę operacyjną spółki.');
  }

  // Populate dynamic McKinsey Matrix items
  const mckinseyMatrix: any[] = [];

  // Clients mappings
  sortedClients.forEach(([name, val]) => {
    const isMajor = val > totalSales * 0.25;
    const marketAttractiveness = isMajor ? 8 : 6;
    const competitivePosition = isMajor ? 9 : 5;
    
    mckinseyMatrix.push({
      name: `Klienci: ${name}`,
      quadrant: isMajor ? 'Główny Lider wzrostu' : 'Segment do selektywnej obrony',
      marketAttractivenessRating: marketAttractiveness,
      competitivePositionRating: competitivePosition,
      strategicGuidance: isMajor 
        ? 'Najbardziej wartościowy kontrahent. Zapewnij długookresowy kontrakt i program lojalnościowy.' 
        : 'Wspieraj relację, lecz unikaj dedytkowania dodatkowych stałych kosztów obsługi.',
      type: 'przychod'
    });
  });

  // Adding Costs categories mappings
  sortedCosts.forEach(([name, val]) => {
    const isMajorCost = val > totalCost * 0.3;
    const marketAttractiveness = isMajorCost ? 4 : 5;
    const competitivePosition = isMajorCost ? 3 : 6;

    mckinseyMatrix.push({
      name: `Koszty: ${name}`,
      quadrant: isMajorCost ? 'Rygorystyczna optymalizacja' : 'Segment pod stałą kontrolą',
      marketAttractivenessRating: marketAttractiveness,
      competitivePositionRating: competitivePosition,
      strategicGuidance: isMajorCost 
        ? 'Wysoki poziom kosztów podkopuje zysk. Wymagana renegocjacja umów ramowych.' 
        : 'Poziom akceptowalny, prowadź okresowy monitoring cen rynkowych alternatywnych dostawców.',
      type: 'koszt'
    });
  });

  // Fallback summary
  const summary = `Przegląd finansowy wskazuje na stabilne zręby rynkowe z obrotami rzędu ${totalSales.toLocaleString('pl-PL')} zł netto. Poziom optymalizacji CIT przez koszty uzyskania przychodów wynosi ${totalSales > 0 ? ((totalKUP / totalSales) * 100).toFixed(1) : '0'}% obrotu. McKinsey zaleca skoncentrowanie się na dywersyfikacji portfela przychodowego w celu złagodzenia ryzyka rynkowego, a także na wdrożeniu surowej dyscypliny w dużych kategoriach kosztów operacyjnych.`;

  return {
    summary,
    advantages,
    bottlenecks,
    mckinseyMatrix
  };
}

function generateHeuristicTaxAdviserOffset(query: string, krs: string) {
  const normalized = query.toLowerCase().trim();
  
  if (normalized.includes('staging') || normalized.includes('rekwizyt') || normalized.includes('dekorac') || normalized.includes('wazon') || normalized.includes('narzut') || normalized.includes('pościel') || normalized.includes('obraz') || normalized.includes('sesja') || normalized.includes('zdjęc') || normalized.includes('fotograf') || normalized.includes('video') || normalized.includes('film') || normalized.includes('aparat')) {
    return {
      light: 'green',
      category: 'Koszty Home Stagingu, Usług Fotograficznych i Portfolio',
      vatDeductibility: '100% odliczenia podatku VAT. Zdjęcia reklamowe i przygotowanie wnętrza bezpośrednio służą reklamie realizowanych usług.',
      citDeductibility: '100% KUP. Wydatki na marketing wizualny ukończonych projektów stanowią bezpośredni koszt uzyskania przychodu.',
      justification: `Zgodnie z art. 15 ust. 1 ustawy o CIT, wydatki na zakup rekwizytów do Home Stagingu (takich jak wazony, narzuty, obrazy, oświetlenie pomocnicze) oraz na profesjonalne usługi fotografii i wideo zrealizowanych wnętrz/obiektów stanowią koszty działań marketingowo-reklamowych biura projektowego. Są one kluczowe do udokumentowania efektów pracy architekta w portfolio firmy, pozyskiwania kolejnych inwestorów oraz budowania silnej tożsamości rynkowej i świadomości marki pracowni.`,
      accountingAdvice: `1. Opisz fakturę z adnotacją: "Zakup rekwizytów aranżacyjnych / usług fotograficznych na potrzeby sesji zdjęciowej ukończonego projektu wnętrza [Nazwa Inwestycji / Adres] celem umieszczenia w portfolio reklamowym biura i promocji w internecie".\n2. Rekwizyty trzymaj w pracowni i używaj ich wielokrotnie do kolejnych realizacji. Przechowuj zdjęcia z sesji jako doskonały dowód wykonania prac.\n3. Całość rozliczaj bezpośrednio w koszty operacyjne bez amortyzacji, o ile wartość pojedynczego rekwizytu (np. designerski fotel) nie przekracza 10 000 zł netto.`,
      krsRelevance: `Pełna spójność. PKD 71.11.Z oraz PKD 74.10.Z (Specjalistyczne projektowanie) bezpośrednio opierają swój sukces rynkowy na estetycznej i rzetelnej prezentacji wcześniejszych dokonań. Sesje portfolio i Home Staging są rynkowym standardem budowania przewagi konkurencyjnej.`
    };
  }

  if (normalized.includes('próbnik') || normalized.includes('tynk') || normalized.includes('tkanin') || normalized.includes('plansz') || normalized.includes('makiety') || normalized.includes('model') || normalized.includes('prezentacj')) {
    return {
      light: 'green',
      category: 'Materiały Prezentacyjne i Fizyczne Próbniki',
      vatDeductibility: '100% odliczenia podatku VAT.',
      citDeductibility: '100% KUP (zaliczenie bezpośrednie w bieżące koszty operacyjne).',
      justification: `Zakup fizycznych próbek materiałowych (kamień, drewno, tynki elewacyjne, tkaniny, profile aluminiowe) oraz wydruków wielkoformatowych na sztywnych planszach piankowych służy rzetelnemu wykonaniu i uzgodnieniu projektu z inwestorem. Stanowi bezpośredni koszt operacyjny roboczych spotkań i koordynacji technicznej w myśl art. 15 ust. 1 ustawy o CIT, kluczowy dla eliminacji wad projektowych.`,
      accountingAdvice: `1. Księgowa może bez problemu ująć to w koszty zużycia materiałów operacyjnych.\n2. Do faktury za wydruki wielkoformatowe lub plansze dołącz dopisek: "Wydruki plansz prezentacyjnych i makiet na spotkanie koordynacyjne z inwestorem w sprawie projektu [Nazwa Projektu]". Próbniki od podmiotów zewnętrznych mogą być fakturowane zbiorczo, dokumentując proces doboru materiałów wykończeniowych.`,
      krsRelevance: `Ścisła zgodność z PKD 71.11.Z (Architektura) oraz PKD 71.12.Z (Inżynieria i doradztwo techniczne). Architekt w ramach obowiązków umownych dokonuje nadzorów autorskich i doradztwa w zakresie doboru certyfikowanych materiałów wykończeniowych.`
    };
  }

  if (normalized.includes('strona') || normalized.includes('www') || normalized.includes('seo') || normalized.includes('pozycjonowan') || normalized.includes('reklam') || normalized.includes('ads') || normalized.includes('facebook') || normalized.includes('instagram') || normalized.includes('pinterest') || normalized.includes('google ads')) {
    return {
      light: 'green',
      category: 'Usługi Reklamowe i Marketing Internetowy',
      vatDeductibility: '100% odliczenia VAT. W przypadku faktur od Meta/Google z Irlandii, należy rozliczyć Import Usług VAT ze stawką 23% naliczoną i należną simultanicznie (wymagany NIP z przedrostkiem PL w systemie VIES).',
      citDeductibility: '100% KUP. Koszt stały reklamy i marketingu cyfrowego.',
      justification: `Strona internetowa z galerią realizacji (portfolio), jej pozycjonowanie w wyszukiwarkach (SEO) oraz prowadzenie celowanych kampanii reklamowych w kanałach społecznościowych (Meta Ads, Pinterest, Google Ads) służą bezpośrednio pozyskiwaniu nowych zleceń projektowych na rzecz spółki (Art. 15 ust. 1 CIT). Wydatki te służą zachowaniu i zabezpieczeniu stałego źródła przychodów pracowni architektonicznej.`,
      accountingAdvice: `1. Pamiętaj, aby podać swój NIP z przedrostkiem PL przy rejestracji kont reklamowych Google/Facebook/Pinterest. Faktury będą wystawiane bez zagranicznego VAT-u (odwrotne obciążenie), co księgowa rozliczy jako Import Usług.\n2. Przy opłatach za SEO zadbaj o dołączanie przez agencję comiesięcznego raportu z wykonanych prac pozycjonerskich i analityki ruchu. To wyklucza zarzut urzędu skarbowego o fikcyjność usług.`,
      krsRelevance: `Pełna zgodność. Pozyskiwanie kontraktów projektowych premium i komercyjnych (deweloperskich) w PKD 71.11.Z opiera się współcześnie głównie na marketingu cyfrowym.`
    };
  }

  if (normalized.includes('dron') || normalized.includes('fotogrametri')) {
    return {
      light: 'green',
      category: 'Specjalistyczny Sprzęt Techniczno-Inwentaryzacyjny',
      vatDeductibility: '100% odliczenia podatku VAT.',
      citDeductibility: '100% KUP (jednorazowo, jeśli wartość drona nie przekracza 10 000 zł netto, lub ratalnie przez odpisy amortyzacyjne w grupie 6 KŚT).',
      justification: `Dron stanowi nowoczesne narzędzie inwentaryzacyjne, służące do mapowania terenu (fotogrametria 3D), analizy ukształtowania i nasłonecznienia parceli przed rozpoczęciem projektowania koncepcyjnego, a także do sporządzania precyzyjnej dokumentacji technicznej i foto/wideo dla celów obowiązkowego nadzoru autorskiego. Wydatek ten wprost realizuje przesłankę celowości z art. 15 ust. 1 ustawy o CIT.`,
      accountingAdvice: `1. Kup drona na fakturę wystawioną na dane spółki.\n2. Zarejestruj drona w Urzędzie Lotnictwa Cywilnego (ULC) na dane firmy i opłać firmowe ubezpieczenie OC operatora drona (które w 100% stanowi KUP).\n3. Przechowuj ortofotomapy, chmury punktów oraz zdjęcia działek jako załącznik do projektów budowlanych w razie kontroli skarbówki dokumentującej realne wykorzystanie sprzętu technicznego w biurze.`,
      krsRelevance: `Wysoka spójność. Zgodne z PKD 71.11.Z (Architektura) oraz PKD 71.12.Z (Inżynieria). Pozwala na szybkie pozyskanie danych geodezyjnych i wizualnych w trudnym terenie bez ponoszenia kosztów zewnętrznych podwykonawców.`
    };
  }

  if (normalized.includes('kaw') || normalized.includes('pij') || normalized.includes('jedz') || normalized.includes('restaurac') || normalized.includes('obiad') || normalized.includes('kawiarn') || normalized.includes('lunch') || normalized.includes('spotka') || normalized.includes('restor') || normalized.includes('kater') || normalized.includes('poczęst')) {
    return {
      light: 'yellow',
      category: 'Spotkania z Klientami i Gastronomia',
      vatDeductibility: 'Brak odliczenia VAT z faktur za tradycyjne usługi gastronomiczne (Art. 88 ust. 1 pkt 4 ustawy o VAT zabrania odliczania podatku od usług restauracyjnych). Wyjątkiem jest katering zamawiany do biura (np. przekąski na rzutnikową prezentację), od którego odliczysz 100% VAT.',
      citDeductibility: '100% KUP. Możesz zaliczyć całą kwotę brutto z faktury restauracyjnej do kosztów uzyskania przychodów CIT, pod warunkiem wskazania, że celem spotkania było omówienie projektu architektonicznego, uzgodnienia umowne lub inwentaryzacje.',
      justification: `Zakup usługi gastronomicznej w restauracji lub kawiarni w celu omówienia rzutów kondygnacji i założeń projektowych z inwestorem bezpośrednio wiąże się z PKD 71.11.Z oraz regulacją art. 15 ust. 1 ustawy o CIT. Wydatki te nie mają charakteru reprezentacji wystawnej, skrajnie luksusowej (która jest wyłączona na mocy art. 16 ust. 1 pkt 28 CIT), lecz są standardowymi, racjonalnymi kosztami ponoszonymi w toku negocjacji biznesowych mających na celu osiągnięcie oraz zabezpieczenie przychodów spółki.`,
      accountingAdvice: `1. Poproś obsługę restauracji o fakturę VAT wystawioną bezpośrednio na Twoją spółkę z o.o.\n2. Wyjaśnij księgowej, że spotkanie miało charakter roboczo-negocjacyjny (ustalenia architektoniczne, dobór materiałów budowlanych), a nie wystawny bankiet.\n3. Napisz odręcznie na odwrocie faktury lub dołącz notatkę: "Spotkanie robocze z inwestorem [Imię / Nazwisko / Nazwa Firmy] w sprawie projektu budynku jednorodzinnego przy ul. X, celem zatwierdzenia fazy koncepcyjnej". To chroni koszt przed zakwalifikowaniem jako "reprezentacja wyłączona z KUP".`,
      krsRelevance: `Wysoka spójność. Świadczenie usług projektowych w architekturze wymaga bezpośrednich konsultacji z inwestorami i podwykonawcami v celach koordynacji branżowej (konstrukcja, instalacje), co często odbywa się poza stałym biurem.`
    };
  }

  if (normalized.includes('ubran') || normalized.includes('odzie') || normalized.includes('buty') || normalized.includes('garnitur') || normalized.includes('kurtk') || normalized.includes('koszul') || normalized.includes('marynark') || normalized.includes('kask') || normalized.includes('kamizel')) {
    const isBHP = normalized.includes('kask') || normalized.includes('kamizel') || normalized.includes('bhp') || normalized.includes('budow');
    return {
      light: isBHP ? 'green' : 'yellow',
      category: isBHP ? 'Środki Ochrony Indywidualnej (BHP na budowie)' : 'Branded Apparel / Odzież Służbowa z Logo',
      vatDeductibility: '100% odliczenia podatku VAT.',
      citDeductibility: '100% KUP (Koszt Uzyskania Przychodu).',
      justification: isBHP 
        ? `Zakup kasku ochronnego, butów roboczych ze stalowym noskiem i kamizelki odblaskowej jest bezpośrednio wymagany przepisami prawa budowlanego i BHP podczas wykonywania nadzorów autorskich na czynnych placach budowy (art. 15 ust. 1 ustawy o CIT).`
        : `Zakup odzieży codziennej (garnitur, koszula, polo) na potrzeby spółki architektonicznej stanowi koszt uzyskania przychodu tylko wtedy, gdy odzież ta zostanie trwale i widocznie opatrzona cechami charakterystycznymi marki (np. na stałe naszyte logo, wyhaftowane inicjały spółki). Taki zabieg pozbawia ubrania waloru osobistego, nadając im dominujący charakter reklamowo-reprezentacyjny (zgodny z art. 15 ust. 1 i art. 16 ust. 1 pkt 28 CIT).`,
      accountingAdvice: isBHP
        ? `1. Przekaż fakturę księgowej i zaznacz, że zakupiony sprzęt ochronny (kask, buty) był niezbędny do sprawowania prawnie narzuconego nadzoru autorskiego na budowie.\n2. Warto w historii transakcji zachować pisemne wezwanie od inwestora do wizytacji na placu budowy lub wpis w dziennik budowy.`
        : `1. Upewnij się, że odzież została trwale znakowana (np. zleć haft komputerowy logo spółki na piersi marynarki lub koszuli).\n2. Pokaż księgowej dowód: fakturę za usługę znakowania (haftu) oraz zrób zdjęcie ubrania z widocznym logo. Uzasadnij, że jest to odzież wykorzystywana wyłącznie podczas prezentacji projektów dla kluczowych inwestorów w celu reprezentacji tożsamości korporacyjnej spółki.`,
      krsRelevance: `Wysoka spójność. Architekt wykonujący nadzór autorski (PKD 71.11.Z) osobiście wizytuje place budowy, gdzie przepisy BHP wymagają zabezpieczenia ciała, a spotkania z deweloperami wymagają profesjonalnej tożsamości wizualnej marki.`
    };
  }

  if (normalized.includes('program') || normalized.includes('licencj') || normalized.includes('soft') || normalized.includes('autocad') || normalized.includes('revit') || normalized.includes('archicad') || normalized.includes('sketchup') || normalized.includes('adobe') || normalized.includes('windows') || normalized.includes('cad') || normalized.includes('blender') || normalized.includes('office') || normalized.includes('smet') || normalized.includes('midjourney') || normalized.includes('magnific') || normalized.includes('twinmotion') || normalized.includes('enscape') || normalized.includes('v-ray') || normalized.includes('lumion')) {
    return {
      light: 'green',
      category: 'Narzędzia Specjalistyczne (Licencje, AI i SaaS)',
      vatDeductibility: '100% odliczenia VAT (w przypadku zakupów z UE, np. Adobe/Autodesk/Midjourney, rozliczamy Import Usług z 23% VAT naliczonym i należnym jednocześnie).',
      citDeductibility: '100% KUP (zaliczenie bezpośrednie lub przez amortyzację wartości niematerialnych i prawnych, jeżeli licencja roczna przekracza 10 000 zł i nadaje się do amortyzacji).',
      justification: `Oprogramowanie do projektowania wspomaganego komputerowo (BIM/CAD), programy graficzne do renderingu i wizualizacji (Twinmotion, Lumion, V-Ray) oraz subskrypcje sztucznej inteligencji (AI np. Midjourney do tworzenia moodboardów) to podstawowe, nieodzowne narzędzia pracy w PKD 71.11.Z. Ich koszt kwalifikuje się bezdyskusyjnie na podstawie art. 15 ust. 1 ustawy o CIT jako służący celowi osiągnięcia i zachowania przychodów i bezpośrednio powiązany z nowoczesną działalnością projektową.`,
      accountingAdvice: `1. Przekaż fakturę księgowej. Jeśli licencję zakupiono od podmiotu zagranicznego (np. faktura w EUR/USD z Irlandii od Adobe/Trimble/Autodesk czy USA od Midjourney), poinformuj ją, że to import usług.\n2. Upewnij się, że na fakturze widnieje Twój unijny numer NIP (NIP-UE z przedrostkiem PL). To zapobiegnie doliczeniu zagranicznego podatku VAT.`,
      krsRelevance: `Pełna zgodność bezpośrednia. Brak profesjonalnego oprogramowania CAD/BIM/AI renderingowego uniemożliwia realizację współczesnej działalności sklasyfikowanej pod kodem PKD 71.11.Z.`
    };
  }

  if (normalized.includes('auto') || normalized.includes('samoch') || normalized.includes('paliw') || normalized.includes('leasing') || normalized.includes('napraw') || normalized.includes('ubezp') || normalized.includes('opon') || normalized.includes('ostrad') || normalized.includes('parking')) {
    return {
      light: 'green',
      category: 'Eksploatacja i Leasing Pojazdów',
      vatDeductibility: '50% odliczenia VAT w przypadku użytku mieszanego (prywatno-firmowego) lub 100% VAT jeśli prowadzona jest pełna ewidencja przebiegu pojazdu i zgłoszono formularz VAT-26 do Urzędu Skarbowego.',
      citDeductibility: '75% KUP dla kosztów używania pojazdu mieszanego (naprawy, serwis, paliwo) oraz 150 000 zł / 225 000 zł limity odpisów leasingowych dla aut spalinowych/elektrycznych.',
      justification: `Auto osobowe w firmie architektonicznej służy do szybkiego poruszania się na inwentaryzacje, spotkania z urzędami celem uzyskania pozwoleń na budowę oraz nadzory na rozproszonych placach budów. Wydatki paliwowe i eksploatacyjne stanowią uzasadnione uderzenie kosztowe chroniące realizację planów finansowych podmiotu.`,
      accountingAdvice: `1. Poinformuj biuro rachunkowe o statusie pojazdu (większość przedsiębiorców korzysta z trybu mieszanego 50% VAT / 75% CIT, co nie wymaga uciążliwego rozpisywania kilometrówek).\n2. Zbierz faktury za opłaty autostradowe, parkingi na mieście przy wizytach u inwestorów i przekaż je zbiorczo. One również podlegają limitowi 75% KUP w trybie mieszanym.`,
      krsRelevance: `Wysoka spójność. Architektura to praca w terenie, wymagająca mobilnego przemieszczania sprzętu pomiarowego oraz dojazdu do placów budowy rozlokowanych poza siedzibą spółki.`
    };
  }

  if (normalized.includes('ksiazk') || normalized.includes('literatur') || normalized.includes('albu') || normalized.includes('czasopi') || normalized.includes('magazyn') || normalized.includes('norm') || normalized.includes('eurokod') || normalized.includes('szkolen') || normalized.includes('kurs') || normalized.includes('konferencj')) {
    return {
      light: 'green',
      category: 'Rozwój Kwalifikacji i Baza Literatury Fachowej',
      vatDeductibility: '100% odliczenia VAT (lub stawka obniżona 5%/8% dla książek drukowanych/prasy).',
      citDeductibility: '100% KUP. Koszt zaliczany bezpośrednio.',
      justification: `Zgodnie z art. 15 ust. 1 ustawy o CIT, ciągłe podnoszenie kwalifikacji, znajomość najnowszych dynamicznie zmieniających się norm budowlanych (Eurokody), prawa budowlanego oraz śledzenie trendów światowej architektury przy pomocy czasopism specjalistycznych bezpośrednio wpływa na konkurencyjność projektów i zabezpiecza przed wadami prawno-konstrukcyjnymi, co pozwala spółce zachować nienaruszone źródło przychodów.`,
      accountingAdvice: `1. Fakturę za zakup książek, albumów o designie, subskrypcji czasopism czy szkoleń (np. z oprogramowania Revit, przepisów prawa) daj księgowej.\n2. Jeśli to szkolenie z certyfikatem imiennym dla pracownika lub członka zarządu, ugruntuj celowość – szkolenie poprawia jakość wykonywanych rzutów architektonicznych w biurze.`,
      krsRelevance: `Spójne z zawodem zaufania publicznego. Architekt ma prawny i etyczny obowiązek tworzenia obiektów bezpiecznych, zgodnych z najnowszymi warunkami technicznymi i normami budownictwa.`
    };
  }

  if (normalized.includes('ekspres') || normalized.includes('mebl') || normalized.includes('biurk') || normalized.includes('fote') || normalized.includes('drzw') || normalized.includes('krzes') || normalized.includes('lamp') || normalized.includes('rezerw')) {
    return {
      light: 'green',
      category: 'Wyposażenie Pracowni i Ergonomia',
      vatDeductibility: '100% odliczenia podatku VAT.',
      citDeductibility: '100% KUP (dla jednorazowych zakupów poniżej 10 050 zł netto).',
      justification: `Zakup wysokiej jakości mebli biurowych, ergonomicznego fotela do wielogodzinnej pracy przy projektach oraz ekspresu do kawy do serwowania poczęstunku klientom odwiedzającym pracownię architektoniczną jest w pełni uzasadniony. Poprawia ergonomię pracy oraz kreuje profesjonalny wizerunek spółki, co ułatwia pozyskiwanie lukratywnych kontraktów (art. 15 ust. 1 ustawy o CIT).`,
      accountingAdvice: `1. Faktury za meble, lampy kreślarskie czy ekspres do kawy oddaj księgowej.\n2. Wytłumacz, że ekspres jest udostępniony w pracowni, gdzie spotykasz się z klientami w celu prezentacji fizycznych makiet budynków – kawa podawana deweloperom wspiera budowanie zaufania handlowego i stanowi koszt ogólnozakładowy wspierający sprzedaż (reklama/BHP).`,
      krsRelevance: `Bardzo wysoka spójność. Pracownia architektoniczna to wizytówka twórcy - estetyczne, ergonomiczne meble i poczęstunek dla klientów budują wizerunek biura projektowego klasy premium.`
    };
  }

  // General default fallback
  return {
    light: 'yellow',
    category: 'Koszty Operacyjne Wspierające Biznes',
    vatDeductibility: 'Zazwyczaj 100% odliczenia (o ile koszt nie dotyczy zakwaterowania ani usług gastronomicznych, na które nałożono ustawowe wyłączenia).',
    citDeductibility: 'Zazwyczaj 100% KUP, o ile wykazana zostanie celowość i wpływ na generowanie przychodu w spółce z o.o.',
    justification: `Wydatek ten, choć ma charakter ogólny, przyczynia się do zachowania sprawności operacyjnej biura projektowego i personelu technicznego, co zabezpiecza poprawną realizację umów i terminowość projektów v myśl art. 15 ust. 1 ustawy o CIT.`,
    accountingAdvice: `1. Zachowaj fakturę VAT prawidłowo wystawioną na pełną nazwę i NIP Twojej spółki z o.o.\n2. Upewnij się, że potrafisz krótko opisać księgowej logiczny związek tego zakupu ze sprawami firmy (np. 'dostęp do szybkiego internetu pozwala na transferowanie ciężkich plików projektowych CAD o rozmiarach setek megabajtów na serwery klienta').`,
    krsRelevance: `Spójne z ogólnymi kosztami administracyjno-operacyjnymi niezbędnymi dla utrzymania spółki z o.o. w gotowości do fakturowania usług projektowych z zakresu architektury.`
  };
}

startServer();
