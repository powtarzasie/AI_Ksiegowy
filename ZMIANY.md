# Dziennik Zmian (Changelog)

- Przeprowadzono ostateczny przegląd kodu pod kątem kompilacji do `.exe`.
- Pomyślnie zbudowano aplikację frontendową (`vite build`) oraz backend (`esbuild server.ts --format=cjs`) bez błędów w TypeScript i w narzędziach minifikujących.
- Zatwierdzono wymuszane parametry konfiguracyjne: sztywne mapowanie `127.0.0.1` na porcie `3000`, poprawne ścieżki i obecność natywnych bramek plikowych dla platformy Electron.
- Sygnalizacja logowania `Server active on port 3000` pozostaje bez modyfikacji.
- Wykluczono istnienie brakujących punktów końcowych, sierot importowych czy martwych modułów.

- **Ostateczny audyt techniczny (Executable Ready)**: Przeprowadzono kompleksową inspekcję całego kodu źródłowego (front-end i backend) przed wypuszczeniem wersji instalacyjnej `.exe`.
- **Weryfikacja parametrów kompilacji**: Potwierdzono 100% zgodność portów (3000), adresów (127.0.0.1 zamiast localhost), odpowiednich metod zapisu oraz kompatybilności API z aplikacją React.
- **Czystość kodu**: Potwierdzono brak tzw. martwego kodu, zepsutych importów oraz poprawność działania kompilatorów TypeScript i ESBuild dla środowisk Node.js/Electron.

- **Audyt techniczny pod kompilację .exe**: Przeprowadzono końcowe sprawdzenie spójności i integralności kodu względem wyśrubowanych reguł kompilatora Electron z webpack.
- **Naprawa typowania TypeScript dla Master Export**: Dodano brakujące pole `czyImportUslug` do reguły mapowania w `excelHandler.ts`, znosząc tym samym jedyny błąd emitowany przy pakowaniu produkcyjnym.
- **Zweryfikowano zbieżność endpointów Express i React**: Upewniono się, że wszystkie 9 punktów styku API pomiędzy interfejsem graficznym a zapleczem serwera mają poprawne definicje z pełną obsługą błędów.
- **Potwierdzono wymogi Electron Main**: Proces `server.ts` jest w pełni przystosowany do izolacji CJS bez użycia `import.meta.url`, gwarantując natychmiastowe ładowanie portu 3000 i pomyślne "smoke-testy" okna bez efektu białego ekranu przy starcie w Windows.

- **Sprawdzian końcowy i regresja**: Zakończono ostateczny przegląd aplikacji przed kompilacją do pliku .exe. Pomyślnie przeprowadzono testy build (`vite build` oraz `esbuild` do formatu CJS) potwierdzające absolutny brak błędów TypeScript i problemów z resolucją modułów.
- **Weryfikacja API obsługującego pliki (Kopie zapasowe)**: Skonrolowano Endpointy REST (`/api/db/backups`, `/api/db/restore`, `/api/db/backup`, `/api/db/save`), gwarantując pełną zgodność UI (zakładka StorageControls) do backendu (Express) i zapewniono, że mechanizmy zapisu atomowego bezawaryjnie aktualizują pliki bazodanowe zachowując strukturę katalogu `backups/`.
- **Pełna kompatybilność Desktop / Electron**: Skonfigurowano wiążące nasłuchiwanie pętli zwrotnej `127.0.0.1:3000` na serwerze wewnętrznym; upewniono się, że proces Main z Electron celnie wywołuje poprawny URL i prawidłowo realizuje komunikację IPC poprzez unikalne id komponentów frontendowych.

- **Bezpieczeństwo i trwałość danych (Kopie zapasowe):** Wprowadzono trójwarstwowy mechanizm ochrony bazy danych. Dodano operacje atomowego zapisu (poprzez tymczasowy plik `.tmp`), które chronią przed uszkodzeniem pliku podczas niespodziewanego zamknięcia w trakcie modyfikacji.
- **Automatyczne Migawki:** System teraz generuje zautomatyzowane snapshoty bazy danych podczas startu. Narzędzie przechowuje do 15 ostatnich kopii zapasowych w specjalnym folderze `backups/`. Z poziomu widoku konfiguracyjnego można też wygenerować lub przywrócić kopię na żądanie.

- **Audyt techniczny i optymalizacja API:** Usunięto nieużywany punkt końcowy `/api/gemini/analyze` z lokalnego serwera (`server.ts`) wraz z nieużywanym kodem zapasowym, rozwiązując problem martwego kodu i przywracając pełną zgodność wywołań interfejsu (żadnych endpointów-sierot).
- **Dostosowanie do kompilacji Windows (.exe):** Skonfigurowano backend Express do nasłuchiwania wyłącznie na porcie `3000` dla adresu loopback (`127.0.0.1`), zabezpieczając w ten sposób port przed dostępem z pozostałej sieci i przygotowując pod integrację z Electron. Dodano twardy log systemowy `Server active on port 3000` na potrzeby skryptu build ("smoke test").
- **Korekty błędów w kompilacji backendu:** Oczyszczono osierocone deklaracje TypeScript, dzięki czemu proces pakowania poprzez kod bundlujący i minifikujący (np. pod Electron Builder) przechodzi wyjściowo bez uszkodzeń w bloku AST. Błędy nie są emitowane podczas `vite build` oraz budowy `esbuild`.

- **Audyt UX / Interfejs:** Dodano mechanizmy weryfikacyjne (`window.confirm`) przed usunięciem rekordu w Rejestrach (faktury, koszty, zaliczki, nadwyżki VAT), zabezpieczające przed przypadkową utratą danych.
- **Centrum Pomocy (FAQ):** Dodano szczegółową sekcję tłumaczącą krok po kroku konfigurację lokalnych modeli sztucznej inteligencji (Ollama i LM Studio).
- **Spójność wersji:** Ujednolicono i poprawiono numery wersji pojawiające się w raportach PDF do spójnego oznaczenia `v2.0`.
- **Zautomatyzowane, interaktywne podpowiedzi (Hover Tooltips)**: Zaimplementowano w pełni interaktywne podpowiedzi (tooltips) uruchamiane na najechanie kursorem (hover-based) dla wszystkich kluczowych wskaźników KPI w McKinseyDashboard (EBITDA, Prognozowany ARR, Koncentracja Ryzyka, Średni Burn-Rate, Koszty Osobowe, Koszty Licencji & SaaS).
- **Struktura Przychodów YTD (Retainery i Kamienie Milowe)**: Przekształcono statyczne przyciski informacyjne w estetyczne, nieblokujące hover-tooltipy. Usunięto regułę `overflow-hidden` z klocków struktury przychodów, dzięki czemu podpowiedzi nie są ucinane przez krawędzie kontenerów, a teksty i ikona "i" zostały rozsunięte (flex layout z gap), zapobiegając nakładaniu się na małych ekranach.

### 📌 Przyszła implementacja tooltipów (Developer Guide)
Dodawanie nowych podpowiedzi w przyszłości powinno odbywać się według poniższego, ustandaryzowanego szablonu opartego wyłącznie o utility-classes z Tailwind CSS (zasada `group/tooltip`):

```tsx
<div className="relative group/tooltip inline-flex items-center shrink-0">
  {/* Ikona wyzwalająca podpowiedź */}
  <span className="w-4.5 h-4.5 rounded-full border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-bold cursor-help select-none font-sans">
    i
  </span>
  
  {/* Chmurka podpowiedzi (Tooltip) */}
  <div className="invisible group-hover/tooltip:visible opacity-0 group-hover/tooltip:opacity-100 transition-all duration-200 absolute bottom-full right-0 mb-2 w-72 bg-slate-900 border border-slate-800 text-slate-100 text-left p-4 rounded-xl shadow-2xl z-[100] transform scale-95 origin-bottom-right group-hover/tooltip:scale-100">
    {/* Nagłówek */}
    <div className="font-extrabold text-indigo-400 mb-1.5 border-b border-indigo-500/20 pb-1 flex items-center gap-1.5 text-[11px] uppercase tracking-wide leading-tight">
      <Icon className="w-3.5 h-3.5" />
      Nazwa Metryki
    </div>
    
    {/* Treść */}
    <div className="text-[11px] text-slate-300 leading-relaxed space-y-2 font-sans font-medium normal-case tracking-normal">
      <p>Opis wskaźnika...</p>
      <p className="text-[10px] font-mono text-slate-400 bg-slate-950 p-1.5 rounded-md border border-slate-800/50">
        Wzór kalkulacyjny...
      </p>
      <p className="text-[11px] text-indigo-300 font-medium">
        Dlaczego to ważne...
      </p>
    </div>
    
    {/* Strzałka dole podpowiedzi */}
    <div className="absolute top-full right-2 border-[6px] border-transparent border-t-slate-900"></div>
  </div>
</div>
```
*Uwaga: Kontener nadrzędny, w którym znajduje się powyższy blok, **nie może** posiadać klasy `overflow-hidden`, ponieważ spowoduje to obcięcie wyświetlanej chmurki podpowiedzi.*

