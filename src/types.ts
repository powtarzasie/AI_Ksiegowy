export interface CompanySettings {
  nazwaSpolki: string;
  nip: string;
  stawkaCIT: 9 | 19; // Polish CIT rate: 9% (small taxpayer) or 19% (standard)
  rokPodatkowy: number;
  miesiacPodatkowy: number; // 1 = January, 12 = December
}

export interface SaleTransaction {
  id: string;
  data: string; // YYYY-MM-DD
  numerFaktury: string;
  kontrahent: string;
  netto: number;
  stawkaVat: number; // e.g. 23 for 23%
  vat: number;
  brutto: number;
  czyCIT: boolean;
  czyVAT: boolean;
}

export interface PurchaseTransaction {
  id: string;
  data: string; // YYYY-MM-DD
  numerFaktury: string;
  dostawca: string;
  kategoria: string; // e.g. Telefony, Biuro, Paliwo, Narzędzia
  netto: number;
  stawkaVat: number; // e.g. 23 for 23%
  vat: number;
  brutto: number;
  kosztCIT: boolean;
  odliczenieVat: number; // Percent: 0, 50 (for mixed passenger cars usage), or 100
}

export interface CitAdvance {
  id: string;
  miesiac: number; // 1-12
  kwota: number;
  dataZaplaty: string;
  notatka: string;
}

export interface VatRegistry {
  id: string;
  miesiac: number; // 1-12
  vatNalezny: number;
  vatNaliczony: number;
  nadwyzkaZPoprzedniego: number;
  korekty: number;
}

export interface MonthlySimulationResult {
  miesiac: number;
  rok: number;
  
  // Sales & CIT
  przychodyNetto: number;
  przychodyDoCIT: number;
  kosztyNetto: number;
  kosztyKUP: number; // Koszty Uzyskania Przychodów (tax deductible)
  dochodCIT: number; // przychodyDoCIT - kosztyKUP
  podatekCIT: number; // dochodCIT * stawkaCIT
  zaplaconeZaliczkiCIT: number;
  podatekCitDoZaplaty: number; // podatekCIT - zaplaconeZaliczkiCIT (cumulative/current)
  
  // Cumulative (YTD - od początku roku) fields for Sp. z o.o. progressive tax
  cumPrzychodyNetto?: number;
  cumPrzychodyDoCIT?: number;
  cumKosztyNetto?: number;
  cumKosztyKUP?: number;
  cumDochodCIT?: number;
  cumPodatekCIT?: number;

  // VAT
  vatNaleznySuma: number; // output VAT from sales
  vatNaliczonySuma: number; // input VAT from purchases which are odliczalne
  nadwyzkaVatZPoprzedniego: number;
  korektyVat: number;
  vatDoZaplaty: number; // vatNaleznySuma - vatNaliczonySuma - nadwyzka - korekty (if > 0)
  vatDoPrzeniesienia: number; // if the above is < 0, it is moving to next period
}

export interface LLMConfig {
  provider: 'gemini' | 'openai' | 'anthropic' | 'ollama' | 'lmstudio' | 'custom';
  apiKey: string;
  model: string;
  baseUrl?: string;
  isEnabled: boolean;
}

export interface AppState {
  settings: CompanySettings;
  sales: SaleTransaction[];
  purchases: PurchaseTransaction[];
  citAdvances: CitAdvance[];
  vatRegistry: VatRegistry[];
  llmConfig?: LLMConfig;
}

export type ImportType =
  | 'sprzedaz'
  | 'zakupy'
  | 'zaliczki_cit'
  | 'nadwyzki_vat'
  | 'pelny_arkusz';

export interface ColumnMapping {
  data: string;
  numerFaktury: string;
  kontrahent: string;
  netto: string;
  stawkaVat: string;
  vat: string;
  brutto: string;
  czyCIT: string;
  czyVAT: string;
  
  // Purchase specifics
  dostawca: string;
  kategoria: string;
  kosztCIT: string;
  odliczenieVat: string;

  // CIT Advance specifics
  miesiac: string;
  kwota: string;
  dataZaplaty: string;
  notatka: string;

  // VAT registry specifics
  vatNalezny: string;
  vatNaliczony: string;
  nadwyzkaZPoprzedniego: string;
  korektyVat: string;
}

export interface ValidationError {
  row: number; // Row index or number in the uploaded excel
  field: string;
  message: string;
  severity: 'error' | 'warning';
  value?: any;
}

export interface ParsedRowResult {
  rowOriginal: any;
  validatedData: any;
  errors: ValidationError[];
}
