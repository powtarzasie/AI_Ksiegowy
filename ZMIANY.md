# Dziennik Zmian (Changelog)

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
- **Weryfikacja parametrów liczbowych:** Zweryfikowano zgodność stawek (CIT 9%/19%, VAT 23%, limit małego podatnika 2 mln EUR) oraz jednolite datowania regulacji KSeF we wszystkich widokach.
