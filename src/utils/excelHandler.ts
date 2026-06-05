import * as XLSX from 'xlsx';
import {
  SaleTransaction,
  PurchaseTransaction,
  CitAdvance,
  VatRegistry,
  ImportType,
  ColumnMapping,
  ValidationError,
  ParsedRowResult,
  AppState
} from '../types';
import { calculatePurchaseKUP } from './taxCalc';

/**
 * Parses XLSX/CSV file buffer using SheetJS and returns sheets with their rows
 */
export async function parseExcelFile(file: File): Promise<{ [sheetName: string]: any[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true, dateNF: 'YYYY-MM-DD' });
        const result: { [sheetName: string]: any[] } = {};
        
        workbook.SheetNames.forEach((sheetName) => {
          const worksheet = workbook.Sheets[sheetName];
          // Header: 1 returns array of arrays, but we will use header: 'A' or let XLSX extract objects
          // We default to raw: false, header: 1 to get standard rows with raw headers, or typical objects
          const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '', raw: false });
          result[sheetName] = rows;
        });
        
        resolve(result);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Flexible date parser supporting ISO, Excel dates, and standard Polish formats (e.g., DD.MM.YYYY)
 */
export function parseFlexibleDate(val: any): Date | null {
  if (!val) return null;
  if (val instanceof Date) {
    if (!isNaN(val.getTime())) return val;
  }
  const str = String(val).trim();
  if (!str) return null;

  // Try parsing ISO date-time or YYYY-MM-DD
  let d = new Date(str);
  if (!isNaN(d.getTime())) return d;

  // Try standard Polish format: DD.MM.YYYY
  const dotsMatch = str.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (dotsMatch) {
    const day = parseInt(dotsMatch[1], 10);
    const month = parseInt(dotsMatch[2], 10) - 1;
    const year = parseInt(dotsMatch[3], 10);
    d = new Date(year, month, day);
    if (!isNaN(d.getTime())) return d;
  }

  // Try slash format: MM/DD/YYYY or DD/MM/YYYY
  const slashMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slashMatch) {
    const firstVal = parseInt(slashMatch[1], 10);
    const secondVal = parseInt(slashMatch[2], 10);
    const year = parseInt(slashMatch[3], 10);
    if (firstVal <= 12 && secondVal > 12) {
      // Must be MM/DD/YYYY
      d = new Date(year, firstVal - 1, secondVal);
    } else {
      // Safe to assume DD/MM/YYYY for Polish system
      d = new Date(year, secondVal - 1, firstVal);
    }
    if (!isNaN(d.getTime())) return d;
  }

  return null;
}

/**
 * Searches row keys for typical keywords to auto-suggest column mapping, upgraded for KSeF compatibility
 */
export function guessColumnMapping(sampleRow: any, type: ImportType): ColumnMapping {
  const keys = Object.keys(sampleRow || {});
  const mapping: ColumnMapping = {
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
    czyImportUslug: '',
    miesiac: '',
    kwota: '',
    dataZaplaty: '',
    notatka: '',
    vatNalezny: '',
    vatNaliczony: '',
    nadwyzkaZPoprzedniego: '',
    korektyVat: ''
  };

  const findMatch = (keywords: string[]): string => {
    for (const key of keys) {
      const lower = key.toLowerCase();
      if (keywords.some(kw => lower.includes(kw))) {
        return key;
      }
    }
    return '';
  };

  // KSeF-oriented mapping guesses depending strictly on invoice direction
  if (type === 'sprzedaz') {
    // Issued / Sales Invoices
    mapping.data = findMatch(['data wystawienia', 'data_wyst', 'data wyst', 'wystawiono', 'data', 'date', 'dnia']);
    mapping.numerFaktury = findMatch([
      'identyfikator ksef', 'numer ksef', 'id ksef', 'id_ksef', 'ksef',
      'numer faktury', 'numer_faktury', 'numer dowodu', 'numer', 'fv', 'nr', 'invoice'
    ]);
    mapping.kontrahent = findMatch([
      'nazwa nabywcy', 'nabywca', 'odbiorca', 'klient', 'kontrahent', 'nazwa kontrahenta', 'buyer', 'customer'
    ]);
    mapping.czyCIT = findMatch(['czy wchodzi do cit', 'cit', 'czy cit', 'wchodzi do cit']);
    mapping.czyVAT = findMatch(['czy wchodzi do vat', 'czy vat', 'wchodzi do vat']);
  } else if (type === 'zakupy') {
    // Received / Cost Invoices
    mapping.data = findMatch([
      'data otrzymania', 'data wpływu', 'data_otrzymania', 'otrzymano', 'data wplywu', 'wplyw',
      'data wystawienia', 'data wyst', 'data_wyst', 'data', 'date', 'dnia'
    ]);
    mapping.numerFaktury = findMatch([
      'identyfikator ksef', 'numer ksef', 'id ksef', 'id_ksef', 'ksef',
      'numer faktury', 'numer_faktury', 'numer dowodu', 'numer', 'fv', 'nr', 'invoice'
    ]);
    mapping.dostawca = findMatch([
      'nazwa sprzedawcy', 'sprzedawca', 'dostawca', 'seller', 'vendor', 'kontrahent', 'nazwa kontrahenta'
    ]);
    mapping.kategoria = findMatch(['kategoria', 'typ', 'rodzaj', 'category']);
    mapping.kosztCIT = findMatch(['koszt cit', 'cit', 'kup', 'kup?']);
    mapping.odliczenieVat = findMatch(['odliczenie', 'odliczenie vat', 'procent odliczenia', 'wat', 'deduction']);
    mapping.czyImportUslug = findMatch(['import', 'zagraniczna', 'country', 'reverse charge']);
  }

  // Common numeric and VAT mapping guesses
  mapping.netto = findMatch(['wartość netto', 'kwota netto', 'netto', 'net', 'kwota netto']);
  mapping.stawkaVat = findMatch(['stawka vat', 'stawka %', 'stawka', 'skladka', 'rate', 'vat %', 'procent']);
  mapping.vat = findMatch(['kwota vat', 'podatek vat', 'vat value', 'vat']);
  mapping.brutto = findMatch(['wartość brutto', 'kwota brutto', 'brutto', 'gross', 'kwota brutto']);

  if (type === 'zaliczki_cit') {
    mapping.miesiac = findMatch(['miesiac', 'miesiąc', 'month', 'okres']);
    mapping.kwota = findMatch(['kwota', 'zaplacona', 'zaliczka', 'cit zapłacony', 'cit zaplacony']);
    mapping.dataZaplaty = findMatch(['data zaplaty', 'data płatności', 'payment date', 'kiedy']);
    mapping.notatka = findMatch(['notatka', 'uwagi', 'opis', 'note']);
  } else if (type === 'nadwyzki_vat') {
    mapping.miesiac = findMatch(['miesiac', 'miesiąc', 'month', 'okres']);
    mapping.vatNalezny = findMatch(['vat nalezny', 'należny', 'output']);
    mapping.vatNaliczony = findMatch(['vat naliczony', 'naliczony', 'input']);
    mapping.nadwyzkaZPoprzedniego = findMatch(['nadwyzka', 'nadwyżka', 'poprzedniego', 'surplus']);
    mapping.korektyVat = findMatch(['korekty', 'korekta', 'adjustments']);
  }

  // Double checks / fallback mapping to first matches if empty
  if (!mapping.data && keys.length > 0) mapping.data = keys[0];
  if (!mapping.numerFaktury && keys.length > 1) mapping.numerFaktury = keys[1];
  
  return mapping;
}

/**
 * Validates and converts raw parsed lines of Excel to clean models
 */
export function validateImportRows(
  rows: any[],
  type: ImportType,
  mapping: ColumnMapping,
  selectedMonth: number,
  selectedYear: number,
  existingSales: SaleTransaction[],
  existingPurchases: PurchaseTransaction[]
): { parsedResults: ParsedRowResult[]; totals: any } {
  const parsedResults: ParsedRowResult[] = [];
  const existingSalesInvoices = new Set(existingSales.map(s => s.numerFaktury.toLowerCase().trim()));
  const existingPurchasesInvoices = new Set(existingPurchases.map(p => p.numerFaktury.toLowerCase().trim()));

  // Let's track totals
  let totalSalesNetto = 0;
  let totalSalesVat = 0;
  let totalPurchasesNetto = 0;
  let totalPurchasesVat = 0;
  let totalCitKup = 0;
  let totalErrors = 0;
  let totalWarnings = 0;

  // Track duplicates within the uploaded file itself
  const currentUploadInvoices = new Set<string>();

  rows.forEach((row, index) => {
    const rowNum = index + 2; // Row number in sheet (header is 1, index starts at 0, so 0 -> row 2)
    const errors: ValidationError[] = [];
    let validatedData: any = null;

    // Helper utilities
    const parseNumber = (val: any): number => {
      if (val === undefined || val === null || val === '') return 0;
      if (typeof val === 'number') return val;
      const cleaned = String(val).replace(/[^0-9.,-]/g, '').replace(',', '.');
      const num = parseFloat(cleaned);
      return isNaN(num) ? 0 : num;
    };

    const parseBoolean = (val: any, defaultVal = true): boolean => {
      if (val === undefined || val === null || val === '') return defaultVal;
      const str = String(val).toLowerCase().trim();
      if (str === 'tak' || str === 'yes' || str === '1' || str === 'true' || str === 't') return true;
      if (str === 'nie' || str === 'no' || str === '0' || str === 'false' || str === 'n') return false;
      return defaultVal;
    };

    const parseVatRate = (val: any): number => {
      if (val === undefined || val === null || val === '') return 23;
      // Extract numeric part from e.g. "23%", "23.0", "0.23"
      let str = String(val).replace(/[^0-9.]/g, '').trim();
      const num = parseFloat(str);
      if (isNaN(num)) return 23;
      if (num === 0.23) return 23;
      if (num === 0.08) return 8;
      if (num === 0.05) return 5;
      return num;
    };

    const cleanInvoiceNumber = (val: any): string => {
      return String(val || '').trim();
    };

    if (type === 'sprzedaz') {
      const dataVal = mapping.data ? row[mapping.data] : undefined;
      const nrVal = mapping.numerFaktury ? cleanInvoiceNumber(row[mapping.numerFaktury]) : "";
      const kontrahentVal = mapping.kontrahent ? String(row[mapping.kontrahent] || '').trim() : '';
      const nettoVal = mapping.netto ? parseNumber(row[mapping.netto]) : 0;
      const stawkaVal = mapping.stawkaVat ? parseVatRate(row[mapping.stawkaVat]) : 23;
      const vatVal = mapping.vat ? parseNumber(row[mapping.vat]) : 0;
      const bruttoVal = mapping.brutto ? parseNumber(row[mapping.brutto]) : 0;
      const czyCitVal = mapping.czyCIT ? parseBoolean(row[mapping.czyCIT], true) : true;
      const czyVatVal = mapping.czyVAT ? parseBoolean(row[mapping.czyVAT], true) : true;

      // Perform validations via flexible date parser
      let testDate: Date | null = null;
      if (mapping.data) {
        if (!dataVal) {
          errors.push({ row: rowNum, field: 'data', message: 'Brak daty faktury.', severity: 'warning' });
        } else {
          testDate = parseFlexibleDate(dataVal);
          if (!testDate) {
            errors.push({ row: rowNum, field: 'data', message: `Niepoprawny format daty: "${dataVal}".`, severity: 'warning' });
          }
        }
      }

      if (mapping.numerFaktury) {
        if (!nrVal) {
          errors.push({ row: rowNum, field: 'numerFaktury', message: 'Pusty numer faktury u sprzedaży.', severity: 'warning' });
        } else {
          const nrLower = nrVal.toLowerCase().trim();
          if (currentUploadInvoices.has(nrLower)) {
            errors.push({ row: rowNum, field: 'numerFaktury', message: `Powielony numer faktury "${nrVal}" w importowanym pliku.`, severity: 'warning' });
          } else {
            currentUploadInvoices.add(nrLower);
          }

          if (existingSalesInvoices.has(nrLower)) {
            errors.push({
              row: rowNum,
              field: 'numerFaktury',
              message: `Faktura o numerze "${nrVal}" już istnieje w bazie danych dla tej spółki.`,
              severity: 'warning'
            });
          }
        }
      }

      // Math validation
      const expectedVat = Math.round(nettoVal * (stawkaVal / 100) * 100) / 100;
      if (nettoVal > 0 && Math.abs(vatVal - expectedVat) > 1.0) {
        errors.push({
          row: rowNum,
          field: 'vat',
          message: `Kwota VAT (${vatVal} zł) odbiega od wyliczonej ze stawki ${stawkaVal}% (${expectedVat} zł) o więcej niż 1 zł.`,
          severity: 'warning',
          value: vatVal
        });
      }

      const expectedBrutto = Math.round((nettoVal + vatVal) * 100) / 100;
      if (nettoVal > 0 && Math.abs(bruttoVal - expectedBrutto) > 1.0) {
        errors.push({
          row: rowNum,
          field: 'brutto',
          message: `Kwota brutto (${bruttoVal} zł) niezgodna z netto + vat (${expectedBrutto} zł).`,
          severity: 'warning'
        });
      }

      validatedData = {
        id: `sale-${Date.now()}-${index}-${Math.floor(Math.random() * 1000)}`,
        data: testDate ? testDate.toISOString().split('T')[0] : (mapping.data ? new Date(selectedYear, selectedMonth - 1, 15).toISOString().split('T')[0] : ""),
        numerFaktury: nrVal,
        kontrahent: kontrahentVal,
        netto: nettoVal,
        stawkaVat: stawkaVal,
        vat: vatVal || expectedVat,
        brutto: bruttoVal || expectedBrutto,
        czyCIT: czyCitVal,
        czyVAT: czyVatVal
      } as SaleTransaction;

      // Accumulate
      totalSalesNetto += nettoVal;
      totalSalesVat += validatedData.vat;

    } else if (type === 'zakupy') {
      const dataVal = mapping.data ? row[mapping.data] : undefined;
      const nrVal = mapping.numerFaktury ? cleanInvoiceNumber(row[mapping.numerFaktury]) : "";
      const dostawcaVal = mapping.dostawca ? String(row[mapping.dostawca] || '').trim() : '';
      const kategoriaVal = mapping.kategoria ? String(row[mapping.kategoria] || '').trim() : '';
      const nettoVal = mapping.netto ? parseNumber(row[mapping.netto]) : 0;
      const stawkaVal = mapping.stawkaVat ? parseVatRate(row[mapping.stawkaVat]) : 23;
      const vatVal = mapping.vat ? parseNumber(row[mapping.vat]) : 0;
      const bruttoVal = mapping.brutto ? parseNumber(row[mapping.brutto]) : 0;
      const kosztCitVal = mapping.kosztCIT ? parseBoolean(row[mapping.kosztCIT], true) : true;
      const czyImportUslugVal = mapping.czyImportUslug ? parseBoolean(row[mapping.czyImportUslug], false) : false;
      
      // Determine VAT deduction percentage
      const odliczenieValRaw = mapping.odliczenieVat ? row[mapping.odliczenieVat] : undefined;
      let odliczenieVatVal = 100; // Default: full deduction
      if (odliczenieValRaw !== undefined && odliczenieValRaw !== '') {
        const cleanStr = String(odliczenieValRaw).replace(/[^0-9]/g, '');
        const pNum = parseInt(cleanStr, 10);
        if (pNum === 50) odliczenieVatVal = 50;
        else if (pNum === 0) odliczenieVatVal = 0;
        else if (pNum === 100) odliczenieVatVal = 100;
        else if (!isNaN(pNum)) {
          // Round to nearest Polish standard (0, 50, 100)
          if (pNum < 25) odliczenieVatVal = 0;
          else if (pNum < 75) odliczenieVatVal = 50;
          else odliczenieVatVal = 100;
        }
      }

      // Validations using the flexible date structure
      let testDate: Date | null = null;
      if (mapping.data) {
        if (!dataVal) {
          errors.push({ row: rowNum, field: 'data', message: 'Brak daty faktury zakupowej.', severity: 'warning' });
        } else {
          testDate = parseFlexibleDate(dataVal);
          if (!testDate) {
            errors.push({ row: rowNum, field: 'data', message: `Niepoprawny format daty: "${dataVal}".`, severity: 'warning' });
          }
        }
      }

      if (mapping.numerFaktury) {
        if (!nrVal) {
          errors.push({ row: rowNum, field: 'numerFaktury', message: 'Pusty numer faktury kosztowej.', severity: 'warning' });
        } else {
          const nrLower = nrVal.toLowerCase().trim();
          if (currentUploadInvoices.has(nrLower)) {
            errors.push({ row: rowNum, field: 'numerFaktury', message: `Powielony numer faktury kosztowej "${nrVal}" w pliku.`, severity: 'warning' });
          } else {
            currentUploadInvoices.add(nrLower);
          }

          if (existingPurchasesInvoices.has(nrLower)) {
            errors.push({
              row: rowNum,
              field: 'numerFaktury',
              message: `Faktura kosztowa o numerze "${nrVal}" istnieje już w bazie.`,
              severity: 'warning'
            });
          }
        }
      }

      const expectedVat = Math.round(nettoVal * (stawkaVal / 100) * 100) / 100;
      if (nettoVal > 0 && Math.abs(vatVal - expectedVat) > 1.0) {
        errors.push({
          row: rowNum,
          field: 'vat',
          message: `Kwota VAT (${vatVal} zł) odbiega od wyliczonej ze stawki ${stawkaVal}% (${expectedVat} zł) o ponad 1 zł.`,
          severity: 'warning'
        });
      }

      validatedData = {
        id: `purchase-${Date.now()}-${index}-${Math.floor(Math.random() * 1000)}`,
        data: testDate ? testDate.toISOString().split('T')[0] : (mapping.data ? new Date(selectedYear, selectedMonth - 1, 15).toISOString().split('T')[0] : ""),
        numerFaktury: nrVal,
        dostawca: dostawcaVal,
        kategoria: kategoriaVal || 'Inne',
        netto: nettoVal,
        stawkaVat: stawkaVal,
        vat: vatVal || expectedVat,
        brutto: czyImportUslugVal ? nettoVal : (bruttoVal || (nettoVal + (vatVal || expectedVat))),
        kosztCIT: kosztCitVal,
        odliczenieVat: odliczenieVatVal,
        czyImportUslug: czyImportUslugVal
      } as PurchaseTransaction;

      // Accumulate
      totalPurchasesNetto += nettoVal;
      const deductibleVat = validatedData.vat * (odliczenieVatVal / 100);
      totalPurchasesVat += deductibleVat;
      if (kosztCitVal) {
        totalCitKup += calculatePurchaseKUP(validatedData);
      }

    } else if (type === 'zaliczki_cit') {
      const miesiacValRaw = row[mapping.miesiac];
      const kwotaVal = parseNumber(row[mapping.kwota]);
      const dataZaplatyVal = row[mapping.dataZaplaty];
      const notatkaVal = String(row[mapping.notatka] || 'Zaliczka CIT').trim();

      // Determine month
      let mNum = selectedMonth;
      if (miesiacValRaw) {
        const mStr = String(miesiacValRaw).toLowerCase().trim();
        // Try parsing string or indices
        const polishMonths = ['styczeń', 'styczen', 'luty', 'marzec', 'kwiecień', 'kwiecien', 'maj', 'czerwiec', 'lipiec', 'sierpień', 'sierpien', 'wrzesień', 'wrzesien', 'październik', 'pazdziernik', 'listopad', 'grudzień', 'grudzien'];
        const foundIdx = polishMonths.findIndex(m => mStr.includes(m));
        if (foundIdx !== -1) {
          // Map to 1-12
          const mapToMonth = [1, 1, 2, 3, 4, 4, 5, 6, 7, 8, 8, 9, 9, 10, 10, 11, 12, 12];
          mNum = mapToMonth[foundIdx];
        } else {
          const parsedM = parseInt(mStr.replace(/[^0-9]/g, ''), 10);
          if (!isNaN(parsedM) && parsedM >= 1 && parsedM <= 12) {
            mNum = parsedM;
          }
        }
      }



      if (kwotaVal <= 0) {
        errors.push({ row: rowNum, field: 'kwota', message: 'Kwota zaliczki powinna być większa od zera.', severity: 'warning' });
      }

      let formattedDate = '';
      try {
        if (dataZaplatyVal) {
          const dObj = new Date(dataZaplatyVal);
          if (!isNaN(dObj.getTime())) {
            formattedDate = dObj.toISOString().split('T')[0];
          }
        }
      } catch (e) {
        formattedDate = String(dataZaplatyVal || '');
      }

      validatedData = {
        id: `advance-${Date.now()}-${index}-${Math.floor(Math.random() * 1000)}`,
        miesiac: mNum,
        kwota: kwotaVal,
        dataZaplaty: formattedDate || new Date(selectedYear, mNum - 1, 20).toISOString().split('T')[0],
        notatka: notatkaVal
      } as CitAdvance;

    } else if (type === 'nadwyzki_vat') {
      const miesiacValRaw = row[mapping.miesiac];
      const naleznyVal = parseNumber(row[mapping.vatNalezny]);
      const naliczonyVal = parseNumber(row[mapping.vatNaliczony]);
      const nadwyzkaVal = parseNumber(row[mapping.nadwyzkaZPoprzedniego]);
      const korektyVal = parseNumber(row[mapping.korektyVat]);

      let mNum = selectedMonth;
      if (miesiacValRaw) {
        const mStr = String(miesiacValRaw).toLowerCase().trim();
        const polishMonths = ['styczeń', 'styczen', 'luty', 'marzec', 'kwiecień', 'kwiecien', 'maj', 'czerwiec', 'lipiec', 'sierpień', 'sierpien', 'wrzesień', 'wrzesien', 'październik', 'pazdziernik', 'listopad', 'grudzień', 'grudzien'];
        const foundIdx = polishMonths.findIndex(m => mStr.includes(m));
        if (foundIdx !== -1) {
          const mapToMonth = [1, 1, 2, 3, 4, 4, 5, 6, 7, 8, 8, 9, 9, 10, 10, 11, 12, 12];
          mNum = mapToMonth[foundIdx];
        } else {
          const parsedM = parseInt(mStr.replace(/[^0-9]/g, ''), 10);
          if (!isNaN(parsedM) && parsedM >= 1 && parsedM <= 12) {
            mNum = parsedM;
          }
        }
      }



      validatedData = {
        id: `vatreg-${Date.now()}-${index}-${Math.floor(Math.random() * 1000)}`,
        miesiac: mNum,
        vatNalezny: naleznyVal,
        vatNaliczony: naliczonyVal,
        nadwyzkaZPoprzedniego: nadwyzkaVal,
        korekty: korektyVal
      } as VatRegistry;
    }

    errors.forEach((err) => {
      if (err.severity === 'error') totalErrors++;
      else totalWarnings++;
    });

    parsedResults.push({
      rowOriginal: row,
      validatedData,
      errors
    });
  });

  return {
    parsedResults,
    totals: {
      salesNetto: Math.round(totalSalesNetto * 100) / 100,
      salesVat: Math.round(totalSalesVat * 100) / 100,
      purchasesNetto: Math.round(totalPurchasesNetto * 100) / 100,
      purchasesVat: Math.round(totalPurchasesVat * 100) / 100,
      citKup: Math.round(totalCitKup * 100) / 100,
      errorsCount: totalErrors,
      warningsCount: totalWarnings
    }
  };
}

/**
 * Exports application databases to a complete, beautiful multi-sheet Excel Workbook
 * acting as a fully human-readable Master Backup (synchronization file).
 */
export function exportToExcel(state: AppState) {
  const { settings, sales, purchases, citAdvances, vatRegistry } = state;
  const wb = XLSX.utils.book_new();

  // Sheet 1: Instrukcja i Metryka
  // Double columns layout + guidelines so physical humans can read, modify, and understand it easily.
  const instructionsData = [
    ['DOKUMENT SYNC MASTER EXCEL (KOPIA ZAPASOWA BAZY DANYCH)', ''],
    ['Opis działania:', 'Ten plik stanowi kompletną kopię zapasową danych z Symulatora Podatków CIT i VAT.'],
    ['', 'Możesz edytować ten plik ręcznie w Excelu, a następnie zaimportować go na innym urządzeniu.'],
    ['', ''],
    ['⚙️ METRYKA I PARAMETRY SPÓŁKI (Moduł Konfiguracyjny - Importowany automatycznie):', ''],
    ['ID_KLUCZA_PARAMETRU', 'WARTOŚĆ_PARAMETRU', 'OPIS POLA'],
    ['NAZWA_SPOLKI', settings.nazwaSpolki || '', 'Pełna nazwa prawna Twojej spółki z o.o.'],
    ['NIP_SPOLKI', settings.nip || '', '10-cyfrowy NIP firmy bez myślników i spacji'],
    ['STAWKA_CIT_PROCENT', settings.stawkaCIT, 'Stawka podatku dochodowego CIT: 9 lub 19'],
    ['ROK_PODATKOWY', settings.rokPodatkowy, 'Bieżący rok podatkowy firmy (np. 2026)'],
    ['AKTYWNY_MIESIAC_SYMULACJI', settings.miesiacPodatkowy, 'Miesiąc analizowany w symulatorze: liczba 1-12'],
    ['', ''],
    ['📖 INSTRUKCJA EDYCJI REJESTRÓW:', ''],
    ['Nazwa zakładki', 'Zasada i wymagane dane', 'Informacja o agregacji (dla firm już aktywnych)'],
    ['Rejestr Sprzedaży', 'Faktury przychodowe. Kolumny: Data (RRRR-MM-DD), Numer, Nabywca, Netto, VAT, Brutto.', 'Zamiast wszystkich pojedynczych faktur od 1 stycznia, wpisz 1 wiersz zbiorczy na miesiąc o nazwie np. "SUMA_SPRZEDAZ_M01" w numerze faktury.'],
    ['Rejestr Zakupów i Kosztów', 'Koszty operacyjne (KUP) oraz koszty osobowe (etat - UoP, zlecenie - UZ, dzieło - UoD). Dla umów i wynagrodzeń pracowników stawkę VAT i prawo do odliczenia ustaw na 0%, a koszt KUP do CIT jako TAK.', 'Możesz dodać po 1 zbiorczym wierszu dla każdego minionego miesiąca o nazwie np. "SUMA_KOSZTY_M01" z łączeniem wartości kosztów typu KUP.'],
    ['Zaliczki CIT', 'Chronologiczny rejestr zaliczek zapłaconych już do Urzędu Skarbowego za poszczególne miesiące (styczeń, luty...).', 'Wprowadź sumy zaliczek przelanych w ubiegłych miesiącach, aby system poprawnie obliczył narastający CIT do dopłaty.'],
    ['Rejestr Dane VAT', 'Służy do wpisania danych rozliczeniowych VAT z przeszłości lub sprawdzania ciągłości.', 'Dla STYCZNIA 2026 kluczowe jest wpisanie w kolumnie "Nadwyżka z poprz. okresu" kwoty nadwyżki VAT przeniesionej na koniec 2025 roku! Odpali to poprawny łańcuch przeniesień.'],
    ['', ''],
    ['Ważna informacja:', 'Wszystkie kwoty podawaj w PLN. System przy imporcie wykona pełną walidację matematyczną VAT oraz dat!']
  ];
  
  const instructionsWs = XLSX.utils.aoa_to_sheet(instructionsData);
  XLSX.utils.book_append_sheet(wb, instructionsWs, '1. Instrukcja i Metryka');

  // Sheet 2: Sprzedaż
  const salesHeaders = [
    ['Data *', 'Numer Faktury *', 'Kontrahent', 'Netto [PLN] *', 'Stawka VAT', 'VAT [PLN]', 'Brutto [PLN]', 'Wchodzi do CIT (TAK/NIE)', 'Wchodzi do VAT (TAK/NIE)']
  ];
  const salesRows = sales.map((s) => [
    s.data,
    s.numerFaktury,
    s.kontrahent,
    s.netto,
    `${s.stawkaVat}%`,
    s.vat,
    s.brutto,
    s.czyCIT ? 'TAK' : 'NIE',
    s.czyVAT ? 'TAK' : 'NIE'
  ]);
  const salesWs = XLSX.utils.aoa_to_sheet([...salesHeaders, ...salesRows]);
  XLSX.utils.book_append_sheet(wb, salesWs, 'Rejestr Sprzedaży');

  // Sheet 3: Zakupy i Koszty
  const purchaseHeaders = [
    ['Data *', 'Numer Faktury *', 'Dostawca', 'Kategoria', 'Netto [PLN] *', 'Stawka VAT', 'VAT [PLN]', 'Brutto [PLN]', 'KUP do CIT (TAK/NIE)', 'Odliczenie VAT', 'Import Usług (TAK/NIE)']
  ];
  const purchaseRows = purchases.map((p) => [
    p.data,
    p.numerFaktury,
    p.dostawca,
    p.kategoria,
    p.netto,
    `${p.stawkaVat}%`,
    p.vat,
    p.brutto,
    p.kosztCIT ? 'TAK' : 'NIE',
    `${p.odliczenieVat}%`,
    p.czyImportUslug ? 'TAK' : 'NIE'
  ]);
  const purchaseWs = XLSX.utils.aoa_to_sheet([...purchaseHeaders, ...purchaseRows]);
  XLSX.utils.book_append_sheet(wb, purchaseWs, 'Rejestr Zakupów i Kosztów');

  // Sheet 4: Zaliczki CIT
  const citHeaders = [
    ['Miesiąc *', 'Zapłacona zaliczka CIT [PLN] *', 'Data płatności', 'Notatka / Opis']
  ];
  const citRows = citAdvances.map((c) => [
    c.miesiac,
    c.kwota,
    c.dataZaplaty,
    c.notatka
  ]);
  const citWs = XLSX.utils.aoa_to_sheet([...citHeaders, ...citRows]);
  XLSX.utils.book_append_sheet(wb, citWs, 'Zaliczki CIT');

  // Sheet 5: Nadwyżki i Rejestr VAT z poprzednich okresów
  const vatHeaders = [
    ['Miesiąc *', 'VAT Należny [PLN]', 'VAT Naliczony [PLN]', 'Nadwyżka z poprz. okresu [PLN] *', 'Korekty VAT [PLN]']
  ];
  const vatRows = vatRegistry.map((v) => [
    v.miesiac,
    v.vatNalezny,
    v.vatNaliczony,
    v.nadwyzkaZPoprzedniego,
    v.korekty
  ]);
  const vatWs = XLSX.utils.aoa_to_sheet([...vatHeaders, ...vatRows]);
  XLSX.utils.book_append_sheet(wb, vatWs, 'Rejestr Dane VAT');

  // Generate file download
  const filename = `TaxMasterBackup_${settings.nazwaSpolki.replace(/[^a-zA-Z0-9]/g, '_') || 'Spolka'}_${settings.rokPodatkowy}.xlsx`;
  XLSX.writeFile(wb, filename);
}

/**
 * Validates and parses a full multi-sheet backup master file, checking compatibility
 * and reporting all errors or warnings with details.
 */
export function validateAndParseMasterExcel(sheets: { [sheetName: string]: any[] }): {
  parsedState: Partial<AppState>;
  errorsLength: number;
  warningsLength: number;
  salesCount: number;
  purchasesCount: number;
  citCount: number;
  vatCount: number;
  log: { sheet: string; row: number; field: string; message: string; severity: 'error' | 'warning' }[];
} {
  const result: Partial<AppState> = {
    settings: {
      nazwaSpolki: '',
      nip: '',
      stawkaCIT: 19,
      rokPodatkowy: 2026,
      miesiacPodatkowy: 5
    },
    sales: [],
    purchases: [],
    citAdvances: [],
    vatRegistry: []
  };

  const logs: { sheet: string; row: number; field: string; message: string; severity: 'error' | 'warning' }[] = [];
  let errorsLength = 0;
  let warningsLength = 0;

  const logMsg = (sheet: string, row: number, field: string, message: string, severity: 'error' | 'warning' = 'warning') => {
    logs.push({ sheet, row, field, message, severity });
    if (severity === 'error') errorsLength++;
    else warningsLength++;
  };

  // Helper parsers
  const parseNumValue = (val: any): number => {
    if (val === undefined || val === null || val === '') return 0;
    if (typeof val === 'number') return val;
    const clean = String(val).replace(/[^0-9.,-]/g, '').replace(',', '.');
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
  };

  const parseBoolValue = (val: any, defaultVal = true): boolean => {
    if (val === undefined || val === null || val === '') return defaultVal;
    const str = String(val).toLowerCase().trim();
    if (str === 'tak' || str === 'yes' || str === '1' || str === 'true' || str === 't') return true;
    if (str === 'nie' || str === 'no' || str === '0' || str === 'false' || str === 'n') return false;
    return defaultVal;
  };

  const parseVatPercent = (val: any): number => {
    if (val === undefined || val === null || val === '') return 23;
    let str = String(val).replace(/[^0-9.]/g, '').trim();
    const num = parseFloat(str);
    if (isNaN(num)) return 23;
    if (num === 0.23) return 23;
    if (num === 0.08) return 8;
    if (num === 0.05) return 5;
    return num;
  };

  const parseDeductionPercent = (val: any): number => {
    if (val === undefined || val === null || val === '') return 100;
    const str = String(val).replace(/[^0-9]/g, '');
    const num = parseInt(str, 10);
    if (isNaN(num)) return 100;
    if (num === 50) return 50;
    if (num === 0) return 0;
    if (num === 100) return 100;
    return num < 25 ? 0 : num < 75 ? 50 : 100;
  };

  // 1. Parse Settings from Instruction sheet (or lookup matching sheet name)
  const settingsSheetName = Object.keys(sheets).find(name => name.includes('Instrukcja') || name.includes('Ustawienia') || name.includes('Metryka'));
  if (settingsSheetName && sheets[settingsSheetName]) {
    const rows = sheets[settingsSheetName];
    rows.forEach((row: any, index: number) => {
      // Find rows with settings key in Column A or properties
      // The row object from sheet_to_json can contain properties named after columns or index
      const cells = Object.values(row);
      const cellA = String(cells[0] || '').toUpperCase().trim();
      const val = cells[1];

      if (cellA.includes('NAZWA_SPOLKI')) {
        result.settings!.nazwaSpolki = String(val || '').trim();
      } else if (cellA.includes('NIP_SPOLKI')) {
        const cleanedNip = String(val || '').replace(/[^0-9]/g, '');
        result.settings!.nip = cleanedNip;
        if (cleanedNip.length !== 10) {
          logMsg('Ustawienia Spółki', index + 2, 'NIP', `Wykryto nieprawidłową długość NIP: "${cleanedNip}" (${cleanedNip.length} cyfr zamiast 10).`, 'warning');
        }
      } else if (cellA.includes('STAWKA_CIT_PROCENT')) {
        const rate = parseNumValue(val);
        if (rate === 9 || rate === 19) {
          result.settings!.stawkaCIT = rate as 9 | 19;
        } else {
          result.settings!.stawkaCIT = 19;
          logMsg('Ustawienia Spółki', index + 2, 'stawkaCIT', `Niepoprawna stawka CIT: "${rate}". Przypisano domyślnie 19%.`, 'warning');
        }
      } else if (cellA.includes('ROK_PODATKOWY')) {
        const yr = parseInt(String(val), 10);
        result.settings!.rokPodatkowy = isNaN(yr) ? 2026 : yr;
      } else if (cellA.includes('AKTYWNY_MIESIAC')) {
        const mc = parseInt(String(val), 10);
        if (!isNaN(mc) && mc >= 1 && mc <= 12) {
          result.settings!.miesiacPodatkowy = mc;
        } else {
          result.settings!.miesiacPodatkowy = 5;
          logMsg('Ustawienia Spółki', index + 2, 'miesiacPodatkowy', `Nieprawidłowy aktywny miesiąc: "${val}". Ustawiono Maj (5).`, 'warning');
        }
      }
    });
  } else {
    logMsg('Ogólny', 0, 'Ustawienia i Metryka', 'Brak zakładki z ustawieniami spółki (metodą "Instrukcja i Metryka"). Przyjęto ustawienia domyślne.', 'warning');
  }

  // 2. Parse Sales / Przychody
  const salesSheetName = Object.keys(sheets).find(name => name.toLowerCase().includes('sprzeda') || name.toLowerCase().includes('sales'));
  if (salesSheetName && sheets[salesSheetName]) {
    const rows = sheets[salesSheetName];
    // Guess columns mapping directly on the first row or dynamically
    const map = guessColumnMapping(rows[0], 'sprzedaz');

    rows.forEach((row: any, idx: number) => {
      const rowNum = idx + 2;
      const dataVal = row[map.data];
      const nrVal = String(row[map.numerFaktury] || '').trim();
      const kontrahentVal = String(row[map.kontrahent] || 'Nieznany kontrahent').trim();
      const nettoVal = parseNumValue(row[map.netto]);
      const stawkaVal = parseVatPercent(row[map.stawkaVat]);
      const vatVal = parseNumValue(row[map.vat]);
      const bruttoVal = parseNumValue(row[map.brutto]);
      const czyCitVal = parseBoolValue(row[map.czyCIT], true);
      const czyVatVal = parseBoolValue(row[map.czyVAT], true);

      // Skip lines that have no data or are instruction headers/empty
      if (!dataVal && !nrVal && nettoVal === 0) return;

      // Validation
      const parsedDate = parseFlexibleDate(dataVal);
      if (!parsedDate) {
        logMsg('Rejestr Sprzedaży', rowNum, 'Data', `Niepoprawny lub pusty format daty: "${dataVal}"`, 'error');
      }

      if (!nrVal) {
        logMsg('Rejestr Sprzedaży', rowNum, 'Numer Faktury', 'Brak numeru faktury przy sprzedaży.', 'error');
      }

      // VAT Math validation
      const expectedVat = Math.round(nettoVal * (stawkaVal / 100) * 100) / 100;
      if (nettoVal > 0 && Math.abs(vatVal - expectedVat) > 0.10) {
        logMsg('Rejestr Sprzedaży', rowNum, 'VAT', `Rozbierzność matematyczna: Netto (${nettoVal.toFixed(2)} zł) i podany VAT (${vatVal.toFixed(2)} zł) przy stawce ${stawkaVal}% - wyliczenie wynosi: ${expectedVat.toFixed(2)} zł!`, 'warning');
      }

      const expectedGross = Math.round((nettoVal + vatVal) * 100) / 100;
      if (nettoVal > 0 && Math.abs(bruttoVal - expectedGross) > 0.10) {
        logMsg('Rejestr Sprzedaży', rowNum, 'Brutto', `Kwota brutto (${bruttoVal.toFixed(2)} zł) różni się od netto+vat (${expectedGross.toFixed(2)} zł).`, 'warning');
      }

      result.sales!.push({
        id: `sale-${Date.now()}-${idx}-${Math.floor(Math.random() * 1000)}`,
        data: parsedDate ? parsedDate.toISOString().split('T')[0] : (result.settings?.rokPodatkowy ? `${result.settings.rokPodatkowy}-05-15` : '2026-05-15'),
        numerFaktury: nrVal || 'FV-TEMP',
        kontrahent: kontrahentVal,
        netto: nettoVal,
        stawkaVat: stawkaVal,
        vat: vatVal || expectedVat,
        brutto: bruttoVal || expectedGross,
        czyCIT: czyCitVal,
        czyVAT: czyVatVal
      });
    });
  } else {
    logMsg('Ogólny', 0, 'Rejestr Sprzedaży', 'Brak zakładki z Rejestrem Sprzedaży. Pominięto import przychodów.', 'warning');
  }

  // 3. Parse Purchases / Koszty i Zakupy
  const purchaseSheetName = Object.keys(sheets).find(name => name.toLowerCase().includes('zakup') || name.toLowerCase().includes('koszt') || name.toLowerCase().includes('purchase'));
  if (purchaseSheetName && sheets[purchaseSheetName]) {
    const rows = sheets[purchaseSheetName];
    const map = guessColumnMapping(rows[0], 'zakupy');

    rows.forEach((row: any, idx: number) => {
      const rowNum = idx + 2;
      const dataVal = row[map.data];
      const nrVal = String(row[map.numerFaktury] || '').trim();
      const dostawcaVal = String(row[map.dostawca] || 'Nieznany dostawca').trim();
      const kategoriaVal = String(row[map.kategoria] || 'Inne').trim();
      const nettoVal = parseNumValue(row[map.netto]);
      const stawkaVal = parseVatPercent(row[map.stawkaVat]);
      const vatVal = parseNumValue(row[map.vat]);
      const bruttoVal = parseNumValue(row[map.brutto]);
      const kosztCitVal = parseBoolValue(row[map.kosztCIT], true);
      const odliczenieVatVal = parseDeductionPercent(row[map.odliczenieVat]);

      if (!dataVal && !nrVal && nettoVal === 0) return;

      const parsedDate = parseFlexibleDate(dataVal);
      if (!parsedDate) {
        logMsg('Rejestr Zakupów', rowNum, 'Data', `Niepoprawny lub pusty format daty zakupu: "${dataVal}"`, 'error');
      }

      if (!nrVal) {
        logMsg('Rejestr Zakupów', rowNum, 'Numer Faktury', 'Brak numeru faktury przy zakupie.', 'error');
      }

      const expectedVat = Math.round(nettoVal * (stawkaVal / 100) * 100) / 100;
      if (nettoVal > 0 && Math.abs(vatVal - expectedVat) > 0.10) {
        logMsg('Rejestr Zakupów', rowNum, 'VAT', `Rozbieżność matematyczna kosztu: Netto (${nettoVal.toFixed(2)} zł) i podany VAT (${vatVal.toFixed(2)} zł) dla ${stawkaVal}% - wyliczenie wynosi: ${expectedVat.toFixed(2)} zł!`, 'warning');
      }

      result.purchases!.push({
        id: `purchase-${Date.now()}-${idx}-${Math.floor(Math.random() * 1000)}`,
        data: parsedDate ? parsedDate.toISOString().split('T')[0] : (result.settings?.rokPodatkowy ? `${result.settings.rokPodatkowy}-05-15` : '2026-05-15'),
        numerFaktury: nrVal || 'FV-TEMP',
        dostawca: dostawcaVal,
        kategoria: kategoriaVal,
        netto: nettoVal,
        stawkaVat: stawkaVal,
        vat: vatVal || expectedVat,
        brutto: bruttoVal || (nettoVal + (vatVal || expectedVat)),
        kosztCIT: kosztCitVal,
        odliczenieVat: odliczenieVatVal
      });
    });
  } else {
    logMsg('Ogólny', 0, 'Rejestr Zakupów', 'Brak zakładki z Rejestrem Zakupów i Kosztów. Pominięto import kosztów.', 'warning');
  }

  // 4. Parse CIT Advances
  const citSheetName = Object.keys(sheets).find(name => name.toLowerCase().includes('zalicz') || name.toLowerCase().includes('cit'));
  if (citSheetName && sheets[citSheetName]) {
    const rows = sheets[citSheetName];
    const map = guessColumnMapping(rows[0], 'zaliczki_cit');

    rows.forEach((row: any, idx: number) => {
      const rowNum = idx + 2;
      const mVal = parseNumValue(row[map.miesiac]);
      const kwotaVal = parseNumValue(row[map.kwota]);
      const dataZaplatyVal = row[map.dataZaplaty];
      const notatkaVal = String(row[map.notatka] || 'Zaliczka CIT').trim();

      if (mVal === 0 && kwotaVal === 0) return;

      if (mVal < 1 || mVal > 12) {
        logMsg('Zaliczki CIT', rowNum, 'Miesiąc', `Niedozwolony miesiąc zaliczki: "${mVal}" (musi być od 1 do 12).`, 'error');
      }

      if (kwotaVal < 0) {
        logMsg('Zaliczki CIT', rowNum, 'Kwota', `Niepoprawna ujemna kwota zaliczki: ${kwotaVal} zł.`, 'warning');
      }

      const parsedDate = parseFlexibleDate(dataZaplatyVal);

      result.citAdvances!.push({
        id: `advance-${Date.now()}-${idx}-${Math.floor(Math.random() * 1000)}`,
        miesiac: mVal >= 1 && mVal <= 12 ? mVal : 5,
        kwota: Math.abs(kwotaVal),
        dataZaplaty: parsedDate ? parsedDate.toISOString().split('T')[0] : '2026-05-20',
        notatka: notatkaVal
      });
    });
  }

  // 5. Parse VAT Registry
  const vatSheetName = Object.keys(sheets).find(name => name.toLowerCase().includes('vatreg') || name.toLowerCase().includes('dane vat') || name.toLowerCase().includes('filtr vat') || name.toLowerCase().includes('rejestr dane vat'));
  if (vatSheetName && sheets[vatSheetName]) {
    const rows = sheets[vatSheetName];
    const map = guessColumnMapping(rows[0], 'nadwyzki_vat');

    rows.forEach((row: any, idx: number) => {
      const rowNum = idx + 2;
      const mVal = parseNumValue(row[map.miesiac]);
      const naleznyVal = parseNumValue(row[map.vatNalezny]);
      const naliczonyVal = parseNumValue(row[map.vatNaliczony]);
      const nadwyzkaVal = parseNumValue(row[map.nadwyzkaZPoprzedniego]);
      const korektaVal = parseNumValue(row[map.korektyVat]);

      if (mVal === 0 && naleznyVal === 0 && naliczonyVal === 0 && nadwyzkaVal === 0) return;

      if (mVal < 1 || mVal > 12) {
        logMsg('Rejestr Dane VAT', rowNum, 'Miesiąc', `Nieprawidłowy miesiąc: ${mVal} (dopuszczalne 1-12).`, 'error');
      }

      result.vatRegistry!.push({
        id: `vatreg-${Date.now()}-${idx}-${Math.floor(Math.random() * 1000)}`,
        miesiac: mVal >= 1 && mVal <= 12 ? mVal : 5,
        vatNalezny: Math.abs(naleznyVal),
        vatNaliczony: Math.abs(naliczonyVal),
        nadwyzkaZPoprzedniego: Math.abs(nadwyzkaVal),
        korekty: korektaVal
      });
    });
  }

  return {
    parsedState: result,
    errorsLength,
    warningsLength,
    salesCount: result.sales!.length,
    purchasesCount: result.purchases!.length,
    citCount: result.citAdvances!.length,
    vatCount: result.vatRegistry!.length,
    log: logs
  };
}

