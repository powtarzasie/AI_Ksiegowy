import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Set up body parsing with high limit for larger Excel exports
  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ extended: true, limit: '15mb' }));

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

startServer();
