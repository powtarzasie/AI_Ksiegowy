import {
  SaleTransaction,
  PurchaseTransaction,
  CitAdvance,
  VatRegistry,
  MonthlySimulationResult,
  AppState
} from '../types';

/**
 * Parses "YYYY-MM-DD" or similar dates and checks if it belongs to given year and month
 */
export function isDateInMonth(dateStr: string, year: number, month: number): boolean {
  if (!dateStr) return false;
  try {
    // Basic split checks to avoid timezone complications
    const parts = dateStr.split('-');
    if (parts.length >= 2) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      return y === year && m === month;
    }
    // Fallback to JS Date
    const d = new Date(dateStr);
    return d.getFullYear() === year && (d.getMonth() + 1) === month;
  } catch (e) {
    return false;
  }
}

/**
 * Calculates tax details for a specific month
 */
export function calculateMonthlyTaxes(
  state: AppState,
  year: number,
  month: number,
  manualPreviousVatSurplus?: number // Overriding previous VAT surplus if passed
): MonthlySimulationResult {
  const { sales, purchases, citAdvances, vatRegistry, settings } = state;

  // 1. Filter transactions
  const monthSales = sales.filter((s) => isDateInMonth(s.data, year, month));
  const monthPurchases = purchases.filter((p) => isDateInMonth(p.data, year, month));

  // 2. Sales and CIT Income
  let przychodyNetto = 0;
  let przychodyDoCIT = 0;
  let vatNaleznySuma = 0;

  monthSales.forEach((s) => {
    przychodyNetto += s.netto;
    if (s.czyCIT) {
      przychodyDoCIT += s.netto;
    }
    if (s.czyVAT) {
      vatNaleznySuma += s.vat;
    }
  });

  // 3. Purchases and CIT Expenses
  let kosztyNetto = 0;
  let kosztyKUP = 0;
  let vatNaliczonySuma = 0;

  monthPurchases.forEach((p) => {
    kosztyNetto += p.netto;

    // Polish tax code car expense / VAT logic:
    // - odliczenieVat: 100% -> Full VAT deductible, KUP is netto
    // - odliczenieVat: 50%  -> 50% of VAT is deductible, other 50% is non-deductible and added to KUP-eligible cost.
    // - odliczenieVat: 0%   -> 0% of VAT is deductible, 100% of VAT added to KUP-eligible cost.
    const dedPercent = p.odliczenieVat; // 0, 50, 100
    const deductibleVat = p.vat * (dedPercent / 100);
    const nonDeductibleVat = p.vat - deductibleVat;

    vatNaliczonySuma += deductibleVat;

    if (p.kosztCIT) {
      kosztyKUP += (p.netto + nonDeductibleVat);
    }
  });

  // 4. CIT Calculations
  const dochodCIT = Math.max(0, przychodyDoCIT - kosztyKUP);
  const CIT_RATE_PERCENT = settings.stawkaCIT; // 9 or 19
  const podatekCIT = Math.round(dochodCIT * (CIT_RATE_PERCENT / 100));

  // Find paid advances for this month
  const monthAdvance = citAdvances.find((a) => parseInt(a.id, 10) === month || a.miesiac === month);
  const zaplaconeZaliczkiCIT = monthAdvance ? monthAdvance.kwota : 0;
  const podatekCitDoZaplaty = Math.max(0, podatekCIT - zaplaconeZaliczkiCIT);

  // 5. VAT Calculations
  // Get manual or automated VAT registry values
  const registryRecord = vatRegistry.find((v) => v.miesiac === month);
  
  // Decide previous month's surplus
  let nadwyzkaVatZPoprzedniego = 0;
  if (manualPreviousVatSurplus !== undefined) {
    nadwyzkaVatZPoprzedniego = manualPreviousVatSurplus;
  } else if (registryRecord) {
    nadwyzkaVatZPoprzedniego = registryRecord.nadwyzkaZPoprzedniego;
  } else if (month > 1) {
    // Attempt automatic chain calculation for the previous month
    const prevResult = calculateMonthlyTaxes(state, year, month - 1);
    nadwyzkaVatZPoprzedniego = prevResult.vatDoPrzeniesienia;
  }

  const korektyVat = registryRecord ? registryRecord.korekty : 0;

  // VAT Payable vs Carried Forward
  const vatNet = vatNaleznySuma - vatNaliczonySuma - nadwyzkaVatZPoprzedniego - korektyVat;
  
  let vatDoZaplaty = 0;
  let vatDoPrzeniesienia = 0;

  if (vatNet > 0) {
    vatDoZaplaty = Math.round(vatNet * 100) / 100;
  } else {
    vatDoPrzeniesienia = Math.round(Math.abs(vatNet) * 100) / 100;
  }

  return {
    miesiac: month,
    rok: year,
    przychodyNetto: Math.round(przychodyNetto * 100) / 100,
    przychodyDoCIT: Math.round(przychodyDoCIT * 100) / 100,
    kosztyNetto: Math.round(kosztyNetto * 100) / 100,
    kosztyKUP: Math.round(kosztyKUP * 100) / 100,
    dochodCIT: Math.round(dochodCIT * 100) / 100,
    podatekCIT,
    zaplaconeZaliczkiCIT: Math.round(zaplaconeZaliczkiCIT * 100) / 100,
    podatekCitDoZaplaty: Math.round(podatekCitDoZaplaty * 100) / 100,
    vatNaleznySuma: Math.round(vatNaleznySuma * 100) / 100,
    vatNaliczonySuma: Math.round(vatNaliczonySuma * 100) / 100,
    nadwyzkaVatZPoprzedniego: Math.round(nadwyzkaVatZPoprzedniego * 100) / 100,
    korektyVat: Math.round(korektyVat * 100) / 100,
    vatDoZaplaty: Math.round(vatDoZaplaty * 100) / 100,
    vatDoPrzeniesienia: Math.round(vatDoPrzeniesienia * 100) / 100,
  };
}

/**
 * Generates Polish month names
 */
export const MONTHS_PL = [
  'Styczeń',
  'Luty',
  'Marzec',
  'Kwiecień',
  'Maj',
  'Czerwiec',
  'Lipiec',
  'Sierpień',
  'Wrzesień',
  'Październik',
  'Listopad',
  'Grudzień',
];

export function getMonthName(month: number): string {
  return MONTHS_PL[month - 1] || `${month}. miesiąc`;
}
