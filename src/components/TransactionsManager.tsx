import React, { useState } from 'react';
import {
  SaleTransaction,
  PurchaseTransaction,
  CitAdvance,
  VatRegistry,
  AppState
} from '../types';
import { MONTHS_PL, getMonthName } from '../utils/taxCalc';
import {
  Plus,
  Trash2,
  FileText,
  TrendingUp,
  TrendingDown,
  Calendar,
  Layers,
  Percent,
  Calculator,
  AlertCircle,
  Info
} from 'lucide-react';

interface TransactionsManagerProps {
  state: AppState;
  onSalesChange: (newSales: SaleTransaction[]) => void;
  onPurchasesChange: (newPurchases: PurchaseTransaction[]) => void;
  onAdvancesChange: (newAdvances: CitAdvance[]) => void;
  onVatRegistryChange: (newRegistry: VatRegistry[]) => void;
}

export default function TransactionsManager({
  state,
  onSalesChange,
  onPurchasesChange,
  onAdvancesChange,
  onVatRegistryChange,
}: TransactionsManagerProps) {
  const [activeTab, setActiveTab] = useState<'sales' | 'purchases' | 'advances' | 'vat_registry'>('sales');

  // Manual Creation Forms states
  const [saleForm, setSaleForm] = useState({
    data: new Date().toISOString().split('T')[0],
    numerFaktury: '',
    kontrahent: '',
    netto: '',
    stawkaVat: '23',
    czyCIT: true,
    czyVAT: true
  });

  const [purchaseForm, setPurchaseForm] = useState({
    data: new Date().toISOString().split('T')[0],
    numerFaktury: '',
    dostawca: '',
    kategoria: 'Usługi',
    netto: '',
    stawkaVat: '23',
    kosztCIT: true,
    odliczenieVat: '100'
  });

  const [advanceForm, setAdvanceForm] = useState({
    miesiac: String(state.settings.miesiacPodatkowy),
    kwota: '',
    dataZaplaty: new Date().toISOString().split('T')[0],
    notatka: 'Zaliczka CIT'
  });

  const [vatRegForm, setVatRegForm] = useState({
    miesiac: String(state.settings.miesiacPodatkowy),
    vatNalezny: '0',
    vatNaliczony: '0',
    nadwyzkaZPoprzedniego: '',
    korekty: '0'
  });

  const [formOpen, setFormOpen] = useState(false);

  // States for hidden explainer tooltips (Podpowiedzi ukryte)
  const [showSalesVatHelp, setShowSalesVatHelp] = useState(false);
  const [showPurchasesVatHelp, setShowPurchasesVatHelp] = useState(false);
  const [showPurchasesDeductionHelp, setShowPurchasesDeductionHelp] = useState(false);

  // Formatting utilities
  const formatPLN = (num: number) => {
    return new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(num);
  };

  // 1. ADD SALES HANDLER
  const handleAddSale = (e: React.FormEvent) => {
    e.preventDefault();
    const nettoVal = parseFloat(saleForm.netto);
    const rate = parseFloat(saleForm.stawkaVat);
    if (isNaN(nettoVal) || nettoVal <= 0) {
      alert('Wpisz poprawną kwotę netto sprzedaży.');
      return;
    }
    if (!saleForm.numerFaktury) {
      alert('Wpisz numer faktury.');
      return;
    }

    const calculatedVat = Math.round(nettoVal * (rate / 100) * 100) / 100;
    const item: SaleTransaction = {
      id: `sale-${Date.now()}`,
      data: saleForm.data,
      numerFaktury: saleForm.numerFaktury,
      kontrahent: saleForm.kontrahent || 'Nabywca detaliczny',
      netto: nettoVal,
      stawkaVat: rate,
      vat: calculatedVat,
      brutto: Math.round((nettoVal + calculatedVat) * 100) / 100,
      czyCIT: saleForm.czyCIT,
      czyVAT: saleForm.czyVAT
    };

    onSalesChange([item, ...state.sales]);
    // Reset
    setSaleForm({
      ...saleForm,
      numerFaktury: '',
      kontrahent: '',
      netto: ''
    });
    setFormOpen(false);
  };

  // Delete sale item
  const handleDeleteSale = (id: string) => {
    onSalesChange(state.sales.filter(s => s.id !== id));
  };

  // Helper to pre-configure VAT and CIT defaults for specific cost categories
  const handlePurchaseCategoryChange = (cat: string) => {
    const isEmployee = cat === 'Wynagrodzenia etat' || cat === 'Umowa zlecenie' || cat === 'Umowa o dzieło';
    setPurchaseForm(prev => ({
      ...prev,
      kategoria: cat,
      ...(isEmployee ? {
        stawkaVat: '0',
        odliczenieVat: '0',
        kosztCIT: true
      } : {})
    }));
  };


  // 2. ADD PURCHASES HANDLER
  const handleAddPurchase = (e: React.FormEvent) => {
    e.preventDefault();
    const nettoVal = parseFloat(purchaseForm.netto);
    const rate = parseFloat(purchaseForm.stawkaVat);
    if (isNaN(nettoVal) || nettoVal <= 0) {
      alert('Wpisz poprawną kwotę netto kosztu.');
      return;
    }
    if (!purchaseForm.numerFaktury) {
      alert('Wpisz numer faktury zakupu.');
      return;
    }

    const calculatedVat = Math.round(nettoVal * (rate / 100) * 100) / 100;
    const item: PurchaseTransaction = {
      id: `purchase-${Date.now()}`,
      data: purchaseForm.data,
      numerFaktury: purchaseForm.numerFaktury,
      dostawca: purchaseForm.dostawca || 'Sprzedawca / Dostawca',
      kategoria: purchaseForm.kategoria,
      netto: nettoVal,
      stawkaVat: rate,
      vat: calculatedVat,
      brutto: Math.round((nettoVal + calculatedVat) * 100) / 100,
      kosztCIT: purchaseForm.kosztCIT,
      odliczenieVat: parseInt(purchaseForm.odliczenieVat, 10)
    };

    onPurchasesChange([item, ...state.purchases]);
    setPurchaseForm({
      ...purchaseForm,
      numerFaktury: '',
      dostawca: '',
      netto: ''
    });
    setFormOpen(false);
  };

  // Delete purchases item
  const handleDeletePurchase = (id: string) => {
    onPurchasesChange(state.purchases.filter(p => p.id !== id));
  };


  // 3. ADD CIT ADVANCES HANDLER
  const handleAddAdvance = (e: React.FormEvent) => {
    e.preventDefault();
    const kwotaVal = parseFloat(advanceForm.kwota);
    if (isNaN(kwotaVal) || kwotaVal < 0) {
      alert('Wpisz poprawną kwotę zaliczki CIT.');
      return;
    }

    const item: CitAdvance = {
      id: `advance-${Date.now()}`,
      miesiac: parseInt(advanceForm.miesiac, 10),
      kwota: kwotaVal,
      dataZaplaty: advanceForm.dataZaplaty,
      notatka: advanceForm.notatka
    };

    const filtered = state.citAdvances.filter(a => a.miesiac !== item.miesiac);
    onAdvancesChange([...filtered, item]);
    
    setAdvanceForm({
      ...advanceForm,
      kwota: '',
      notatka: 'Zaliczka CIT'
    });
    setFormOpen(false);
  };

  // Delete advance
  const handleDeleteAdvance = (id: string) => {
    onAdvancesChange(state.citAdvances.filter(a => a.id !== id));
  };


  // 4. ADD VAT REGISTRY / OVERRIDES HANDLER
  const handleAddVatReg = (e: React.FormEvent) => {
    e.preventDefault();
    const nadwyzkaVal = parseFloat(vatRegForm.nadwyzkaZPoprzedniego);
    if (isNaN(nadwyzkaVal) || nadwyzkaVal < 0) {
      alert('Wpisz poprawną kwotę nadwyżki VAT z poprzedniego miesiąca.');
      return;
    }

    const item: VatRegistry = {
      id: `vatreg-${Date.now()}`,
      miesiac: parseInt(vatRegForm.miesiac, 10),
      vatNalezny: parseFloat(vatRegForm.vatNalezny) || 0,
      vatNaliczony: parseFloat(vatRegForm.vatNaliczony) || 0,
      nadwyzkaZPoprzedniego: nadwyzkaVal,
      korekty: parseFloat(vatRegForm.korekty) || 0
    };

    const filtered = state.vatRegistry.filter(v => v.miesiac !== item.miesiac);
    onVatRegistryChange([...filtered, item]);

    setVatRegForm({
      ...vatRegForm,
      nadwyzkaZPoprzedniego: ''
    });
    setFormOpen(false);
  };

  // Delete vat registry record
  const handleDeleteVatReg = (id: string) => {
    onVatRegistryChange(state.vatRegistry.filter(v => v.id !== id));
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 space-y-6" id="transactions-manager-component">
      
      {/* Tab Selectors & Premium Buttons */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="flex flex-wrap bg-slate-100 p-1.5 rounded-xl border border-slate-200 gap-1 text-xs" id="transactions-registry-tabs">
          {[
            { id: 'sales', label: 'Rejestr Sprzedaży (CIT/VAT)', count: state.sales.length },
            { id: 'purchases', label: 'Zakupy i Koszty (KUP/VAT)', count: state.purchases.length },
            { id: 'advances', label: 'Zaliczki CIT', count: state.citAdvances.length },
            { id: 'vat_registry', label: 'Baza nadwyżek VAT', count: state.vatRegistry.length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                setFormOpen(false);
              }}
              className={`px-4 py-2 font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/50'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/30'
              }`}
            >
              {tab.label} <span className="opacity-60 ml-1 font-mono">({tab.count})</span>
            </button>
          ))}
        </div>

        <button
          onClick={() => setFormOpen(!formOpen)}
          className="h-10 px-4 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm shadow-indigo-200 transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          Dodaj rekord ręcznie
        </button>
      </div>

      {/* MANUAL CREATION POPUP FORM CONTAINER (BENTO FORM BOX) */}
      {formOpen && (
        <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl space-y-4 animate-fade-in animate-duration-150" id="manual-data-form">
          <div className="text-sm font-bold text-slate-800 flex items-center gap-2 font-display">
            <Calculator className="w-5 h-5 text-indigo-600" />
            Wpisujesz dane: {activeTab === 'sales' ? 'Faktura Sprzedażowa' : activeTab === 'purchases' ? 'Dokument Kosztu' : activeTab === 'advances' ? 'Zaliczka CIT' : 'Nadwyżka VAT'}
          </div>

          {/* Tab 1: Sale Form */}
          {activeTab === 'sales' && (
            <form onSubmit={handleAddSale} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Data faktury</label>
                <input
                  type="date"
                  className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-slate-800 outline-hidden transition-all"
                  value={saleForm.data}
                  onChange={(e) => setSaleForm({ ...saleForm, data: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Numer faktury</label>
                <input
                  type="text"
                  placeholder="np. FV/101/05/2026"
                  className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-slate-800 outline-hidden transition-all placeholder:text-slate-400 font-mono"
                  value={saleForm.numerFaktury}
                  onChange={(e) => setSaleForm({ ...saleForm, numerFaktury: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Kontrahent (Nabywca)</label>
                <input
                  type="text"
                  placeholder="np. Software Tech SA"
                  className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-slate-800 outline-hidden transition-all placeholder:text-slate-400"
                  value={saleForm.kontrahent}
                  onChange={(e) => setSaleForm({ ...saleForm, kontrahent: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Kwota Netto [PLN]</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="np. 5000"
                  className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-slate-800 outline-hidden transition-all placeholder:text-slate-400 font-mono"
                  value={saleForm.netto}
                  onChange={(e) => setSaleForm({ ...saleForm, netto: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1.5 relative">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Stawka VAT</label>
                  <button
                    type="button"
                    onClick={() => setShowSalesVatHelp(!showSalesVatHelp)}
                    className="text-[9px] font-bold text-indigo-600 hover:text-indigo-805 hover:bg-indigo-105/50 bg-indigo-50 px-1.5 py-0.5 rounded transition-all cursor-pointer select-none flex items-center gap-0.5"
                    title="Kliknij, aby otworzyć objaśnienie stawek VAT dla sprzedaży"
                  >
                    <Info className="w-3 h-3" /> Pomoc
                  </button>
                </div>
                <select
                  className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs cursor-pointer focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-slate-800 outline-hidden transition-all"
                  value={saleForm.stawkaVat}
                  onChange={(e) => setSaleForm({ ...saleForm, stawkaVat: e.target.value })}
                >
                  <option value="23">23% (Podstawowa)</option>
                  <option value="8">8% (Obniżona)</option>
                  <option value="5">5% (Obniżona)</option>
                  <option value="0">0% (Zwrot/Odwrotne obciążenie)</option>
                </select>
                
                {showSalesVatHelp && (
                  <div className="absolute top-[100%] left-0 right-0 mt-2 z-50 bg-slate-900 border border-slate-700 rounded-2xl p-4 shadow-xl text-[10.5px] leading-relaxed text-slate-300 space-y-2 animate-fade-in w-full max-w-sm md:max-w-md">
                    <div className="flex items-center justify-between border-b border-slate-700/80 pb-1.5 border-dashed">
                      <span className="font-bold text-indigo-300 uppercase tracking-wider text-[9px] flex items-center gap-1">
                        <Info className="w-3.5 h-3.5 text-indigo-400" /> STAWKI VAT W SPRZEDAŻY
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowSalesVatHelp(false)}
                        className="text-slate-400 hover:text-rose-450 hover:text-rose-400 font-bold text-[10px] cursor-pointer"
                      >
                        [ zamknij ]
                      </button>
                    </div>
                    <div className="space-y-1.5 text-left">
                      <p className="text-xs text-slate-200">Wybierz stawkę właściwą dla rodzaju świadczonych usług / towarów:</p>
                      <div className="space-y-1">
                        <div>
                          <strong className="text-white">● 23% (Podstawowa):</strong>
                          <span className="text-slate-400 block pl-2.5">Większość krajowych usług B2B (sprzedaż oprogramowania, doradztwo biznesowe, marketing, programowanie IT, usługi projektowe, pośrednictwo).</span>
                        </div>
                        <div>
                          <strong className="text-white">● 8% (Obniżona):</strong>
                          <span className="text-slate-400 block pl-2.5">Krajowe usługi budowlano-montażowe i remontowe (tylko w budownictwie objętym społecznym programem mieszkaniowym, np. domy do 300m², mieszkania do 150m²), zakwaterowanie, taxi.</span>
                        </div>
                        <div>
                          <strong className="text-white">● 5% (Obniżona):</strong>
                          <span className="text-slate-400 block pl-2.5">Sprzedaż drukowanych książek i e-booków, czasopism specjalistycznych, wyrobów medycznych oraz podstawowych artykułów spożywczych.</span>
                        </div>
                        <div>
                          <strong className="text-white">● 0% / NP (Nie podlega):</strong>
                          <span className="text-slate-400 block pl-2.5">Eksport towarów do krajów trzecich lub świadczenie usług dla firm zagranicznych (np. IT B2B dla klienta z USA czy z UE z VAT-UE, gdzie miejscem opodatkowania jest kraj nabywcy – "odwrotne obciążenie / reverse charge").</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-4 pt-4 md:col-span-2">
                <label className="flex items-center gap-2 cursor-pointer text-slate-600 font-medium">
                  <input
                    type="checkbox"
                    checked={saleForm.czyCIT}
                    onChange={(e) => setSaleForm({ ...saleForm, czyCIT: e.target.checked })}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-opacity-25 accent-indigo-600 w-4 h-4 cursor-pointer"
                  />
                  <span>Uwzględnij w przychodach CIT</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-slate-600 font-medium">
                  <input
                    type="checkbox"
                    checked={saleForm.czyVAT}
                    onChange={(e) => setSaleForm({ ...saleForm, czyVAT: e.target.checked })}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-opacity-25 accent-indigo-600 w-4 h-4 cursor-pointer"
                  />
                  <span>Uwzględnij w rozliczeniach VAT naleznego</span>
                </label>
              </div>

              {/* Dynamic qualification guide box */}
              <div className="col-span-1 md:col-span-2 lg:col-span-4 bg-indigo-50/70 border border-indigo-150 rounded-xl p-3 flex gap-2.5 items-start text-[11px] text-indigo-950">
                <AlertCircle className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5 animate-pulse" />
                <div>
                  <p className="font-bold">🎓 Dynamiczny Asystent Klasyfikacji (Sprzedaż):</p>
                  <p className="text-slate-600 mt-1 leading-relaxed">
                    {saleForm.czyCIT && saleForm.czyVAT ? (
                      <span>Ta faktura zwiększy Twój <b>podatek dochodowy (CIT: {state.settings.stawkaCIT}%)</b> oraz doliczy <b>{saleForm.netto ? formatPLN(Math.round(parseFloat(saleForm.netto) * (parseFloat(saleForm.stawkaVat) / 100) * 100) / 100) : 'odpowiedni'} podatku VAT należnego</b> do zapłaty w JPK-V7M. To standardowy zapis.</span>
                    ) : saleForm.czyCIT ? (
                      <span>Faktura do CIT, wyłączona z VAT. Przychód netto zalicza się do podstawy opodatkowania dochodowego, ale nie wykazuje podatku należnego VAT (np. przy sprzedaży zagranicznej, transakcjach niepodlegających).</span>
                    ) : saleForm.czyVAT ? (
                      <span>Wykazanie tylko w VAT należnym. Wpływa na deklarację VAT, ale nie powiększa zysku bilansowego w CIT.</span>
                    ) : (
                      <span>Transakcja wyłączona z rozliczeń CIT oraz VAT. Nie wejdzie do deklaracji ani kalkulatorów.</span>
                    )}
                  </p>
                </div>
              </div>

              <div className="col-span-1 md:col-span-2 lg:col-span-4 flex justify-end gap-2 pt-2 border-t border-slate-250 mt-2">
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition-all cursor-pointer"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  Zapisz rekord sprzedaży
                </button>
              </div>
            </form>
          )}

          {/* Tab 2: Purchase Form */}
          {activeTab === 'purchases' && (
            <form onSubmit={handleAddPurchase} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Data kosztu</label>
                <input
                  type="date"
                  className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-slate-800 outline-hidden transition-all"
                  value={purchaseForm.data}
                  onChange={(e) => setPurchaseForm({ ...purchaseForm, data: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Numer faktury zakupu</label>
                <input
                  type="text"
                  placeholder="np. KOSZ/094/2026"
                  className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-slate-800 outline-hidden transition-all placeholder:text-slate-400 font-mono"
                  value={purchaseForm.numerFaktury}
                  onChange={(e) => setPurchaseForm({ ...purchaseForm, numerFaktury: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sprzedawca / Dostawca</label>
                <input
                  type="text"
                  placeholder="np. Google Cloud Europe"
                  className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-slate-800 outline-hidden transition-all placeholder:text-slate-400"
                  value={purchaseForm.dostawca}
                  onChange={(e) => setPurchaseForm({ ...purchaseForm, dostawca: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Kategoria kosztowa</label>
                <select
                  className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs cursor-pointer focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-slate-800 outline-hidden transition-all"
                  value={purchaseForm.kategoria}
                  onChange={(e) => handlePurchaseCategoryChange(e.target.value)}
                >
                  <option value="Oprogramowanie">Oprogramowanie / Licencje SaaS</option>
                  <option value="Serwery">Serwery i Chmura obliczeniowa</option>
                  <option value="Biuro">Koszty biurowe i Czynsze</option>
                  <option value="Pojazdy">Samochód i Paliwo</option>
                  <option value="Marketing">Reklamy i Marketing</option>
                  <option value="Usługi">Inne usługi obce</option>
                  <option value="Wynagrodzenia etat">Wynagrodzenia - Umowa o pracę (etat)</option>
                  <option value="Umowa zlecenie">Wynagrodzenia - Umowa zlecenie</option>
                  <option value="Umowa o dzieło">Wynagrodzenia - Umowa o dzieło</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Kwota Netto [PLN]</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="np. 1500"
                  className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-slate-800 outline-hidden transition-all placeholder:text-slate-400 font-mono"
                  value={purchaseForm.netto}
                  onChange={(e) => setPurchaseForm({ ...purchaseForm, netto: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1.5 relative">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Stawka VAT</label>
                  <button
                    type="button"
                    onClick={() => setShowPurchasesVatHelp(!showPurchasesVatHelp)}
                    className="text-[9px] font-bold text-indigo-600 hover:text-indigo-805 hover:bg-indigo-105/50 bg-indigo-50 px-1.5 py-0.5 rounded transition-all cursor-pointer select-none flex items-center gap-0.5"
                    title="Kliknij, aby otworzyć objaśnienie stawek VAT dla kosztów"
                  >
                    <Info className="w-3 h-3" /> Pomoc
                  </button>
                </div>
                <select
                  className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs cursor-pointer focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-slate-800 outline-hidden transition-all"
                  value={purchaseForm.stawkaVat}
                  onChange={(e) => setPurchaseForm({ ...purchaseForm, stawkaVat: e.target.value })}
                >
                  <option value="23">23%</option>
                  <option value="8">8%</option>
                  <option value="5">5%</option>
                  <option value="0">0%</option>
                </select>

                {showPurchasesVatHelp && (
                  <div className="absolute top-[100%] left-0 right-0 mt-2 z-50 bg-slate-900 border border-slate-700 rounded-2xl p-4 shadow-xl text-[10.5px] leading-relaxed text-slate-300 space-y-2 animate-fade-in w-full max-w-sm md:max-w-md">
                    <div className="flex items-center justify-between border-b border-slate-700/80 pb-1.5 border-dashed">
                      <span className="font-bold text-indigo-300 uppercase tracking-wider text-[9px] flex items-center gap-1">
                        <Info className="w-3.5 h-3.5 text-indigo-400" /> STAWKI VAT W KOSZTACH
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowPurchasesVatHelp(false)}
                        className="text-slate-400 hover:text-rose-450 hover:text-rose-400 font-bold text-[10px] cursor-pointer"
                      >
                        [ zamknij ]
                      </button>
                    </div>
                    <div className="space-y-1.5 text-left">
                      <p className="text-xs text-slate-200">Wybierz stawkę wykazaną na otrzymanej fakturze kosztowej:</p>
                      <div className="space-y-1">
                        <div>
                          <strong className="text-white">● 23%:</strong>
                          <span className="text-slate-400 block pl-2.5">Większość standardowych zakupów firmowych (oprogramowanie SaaS deweloperskie i biurowe, serwery, telefon, paliwo, leasing samochodu, meble biurowe, sprzęt komputerowy, artykuły biurowe).</span>
                        </div>
                        <div>
                          <strong className="text-white">● 8%:</strong>
                          <span className="text-slate-400 block pl-2.5">Zakwatersowanie / noclegi dla pracowników (noclegi nie dają prawa do odliczenia VAT, patrz wyjaśnienie prawa obok), przejazdy i transport taxi, usługi budowlane.</span>
                        </div>
                        <div>
                          <strong className="text-white">● 5%:</strong>
                          <span className="text-slate-400 block pl-2.5">Prasa fachowa, literatura branżowa, rzadziej inne towary.</span>
                        </div>
                        <div>
                          <strong className="text-white">● 0% / NP / brak:</strong>
                          <span className="text-slate-400 block pl-2.5">Faktury za usługi i towary zakupione od kontrahentów zwolnionych podmiotowo z VAT, rachunki uproszczone, umowy cywilnoprawne bez VAT (płace, UZ, UoD), import usług rozliczany w trybie reverse charge (np. faktura z Google Ireland czy Zoom z 0% lub NP - naliczasz i odliczasz VAT 23% samodzielnie).</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-1.5 relative">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Odliczenie VAT</label>
                  <button
                    type="button"
                    onClick={() => setShowPurchasesDeductionHelp(!showPurchasesDeductionHelp)}
                    className="text-[9px] font-bold text-indigo-600 hover:text-indigo-805 hover:bg-indigo-105/50 bg-indigo-50 px-1.5 py-0.5 rounded transition-all cursor-pointer select-none flex items-center gap-0.5"
                    title="Kliknij, aby otworzyć objaśnienie prawa do odliczenia VAT"
                  >
                    <Info className="w-3 h-3" /> Pomoc
                  </button>
                </div>
                <select
                  className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs cursor-pointer focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-slate-800 outline-hidden transition-all"
                  value={purchaseForm.odliczenieVat}
                  onChange={(e) => setPurchaseForm({ ...purchaseForm, odliczenieVat: e.target.value })}
                >
                  <option value="100">100% (Pełne odliczenie kosztu)</option>
                  <option value="50">50% (Cele mieszane / auto osobowe)</option>
                  <option value="0">0% (Brak prawa do odliczenia)</option>
                </select>

                {showPurchasesDeductionHelp && (
                  <div className="absolute top-[100%] left-0 right-0 mt-2 z-50 bg-slate-900 border border-slate-700 rounded-2xl p-4 shadow-xl text-[10.5px] leading-relaxed text-slate-300 space-y-2 animate-fade-in w-full max-w-sm md:max-w-md">
                    <div className="flex items-center justify-between border-b border-slate-700/80 pb-1.5 border-dashed">
                      <span className="font-bold text-indigo-300 uppercase tracking-wider text-[9px] flex items-center gap-1">
                        <Info className="w-3.5 h-3.5 text-indigo-400" /> ODLICZENIE VAT (ZAKUPY)
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowPurchasesDeductionHelp(false)}
                        className="text-slate-400 hover:text-rose-450 hover:text-rose-400 font-bold text-[10px] cursor-pointer"
                      >
                        [ zamknij ]
                      </button>
                    </div>
                    <div className="space-y-1.5 text-left">
                      <p className="text-xs text-slate-200">Wybierz właściwy stopień odliczenia podatku naliczonego VAT:</p>
                      <div className="space-y-1">
                        <div>
                          <strong className="text-white">● 100% (Standardowe pełne):</strong>
                          <span className="text-slate-400 block pl-2.5">Wydatki firmowe wykazujące bezpośredni związek wyłącznie z prowadzoną działalnością gospodarczą opodatkowaną VAT (np. serwery chmurowe, abonamenty SaaS, telefon firmowy, meble biurowe, reklamy).</span>
                        </div>
                        <div>
                          <strong className="text-white">● 50% (Cele mieszane - Samochód osobowy):</strong>
                          <span className="text-slate-400 block pl-2.5">Zastosowanie do wszystkich wydatków związanych z firmowymi pojazdami osobowymi, które są użytkowane zarówno do celów biznesowych, jak i prywatnych (naprawy, paliwo, części zamienne, ubezpieczenia, raty leasingowe). <strong className="text-indigo-300">Korzyść:</strong> Nieodliczone 50% VAT stanowi koszt KUP w CIT (tarcza podatkowa)!</span>
                        </div>
                        <div>
                          <strong className="text-white">● 0% (Brak prawa do odliczenia):</strong>
                          <span className="text-slate-400 block pl-2.5">
                            W szczególności: 
                            <span className="block pl-1.5">• <strong className="text-slate-200">Usługi noclegowe i gastronomiczne:</strong> Ustawowy zakaz odliczania VAT na fakturach za zakwaterowanie, hotele oraz restauracje (mimo, że w CIT stanowią koszty KUP).</span>
                            <span className="block pl-1.5">• <strong className="text-slate-200">Wynagrodzenia i składki:</strong> Umowy UoP, zlecenie, o dzieło są poza ustawą o VAT (nie odliczasz VAT).</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-4 pt-4">
                <label className="flex items-center gap-2 cursor-pointer text-slate-600 font-medium">
                  <input
                    type="checkbox"
                    checked={purchaseForm.kosztCIT}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, kosztCIT: e.target.checked })}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-opacity-25 accent-indigo-600 w-4 h-4 cursor-pointer"
                  />
                  <span>Koszt uzyskania przychodu (KUP)</span>
                </label>
              </div>

              {/* Dynamic qualification guide box for Purchases */}
              <div className="col-span-1 md:col-span-2 lg:col-span-4 bg-indigo-50/70 border border-indigo-150 rounded-xl p-3 flex gap-2.5 items-start text-[11px] text-indigo-950">
                <AlertCircle className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5 animate-pulse" />
                <div>
                  <p className="font-bold">🎓 Dynamiczny Asystent Klasyfikacji Kosztów (KUP & VAT):</p>
                  <div className="text-slate-600 mt-1 leading-relaxed space-y-1">
                    {purchaseForm.kategoria === 'Pojazdy' ? (
                      <p className="text-amber-950 bg-amber-50/80 rounded-lg p-1.5 border border-amber-100 font-sans">
                        🚗 <b>KATEGORIA SAMOCHODOWA:</b> Wydatki na samochód osobowy eksploatowany w sposób mieszany pozwalają odliczyć tylko <b>75% kosztu CIT (jako KUP)</b> oraz <b>50% podatku VAT</b>. Nieodliczony 50% VAT-u automatycznie wejdzie do kosztu KUP zwiększając Twoją tarczę!
                      </p>
                    ) : purchaseForm.kategoria === 'Usługi' && purchaseForm.odliczenieVat === '0' ? (
                      <p className="text-rose-950 bg-rose-50/80 rounded-lg p-1.5 border border-rose-100 font-sans">
                        🏨 <b>USŁUGI NOCLEGOWE / GASTRONOMIA:</b> Ustawa o VAT wprost <b>zakazuje odliczania podatku VAT</b> z tego typu faktur (ustaw 0% odliczenia). Cała kwota BRUTTO powiększy jednak koszty uzyskania przychodów (CIT KUP).
                      </p>
                    ) : purchaseForm.kategoria === 'Wynagrodzenia etat' ? (
                      <p className="text-emerald-950 bg-emerald-50/80 rounded-lg p-1.5 border border-emerald-100 font-sans">
                        💼 <b>UMOWA O PRACĘ (ETAT):</b> Kosztem uzyskania przychodu spółki (CIT KUP) jest kwota wynagrodzenia brutto wraz ze składkami ZUS finansowanymi przez pracodawcę (tzw. "superbrutto" składające się z ubezpieczenia emerytalnego, rentowego, wypadkowego, FP i FGŚP). Wynagrodzenia pracownicze nie podlegają ustawie o VAT. Automatycznie ustawiono stawkę VAT na <b>0%</b> i brak odliczenia (<b>0%</b>).
                      </p>
                    ) : purchaseForm.kategoria === 'Umowa zlecenie' ? (
                      <p className="text-teal-950 bg-teal-50/80 rounded-lg p-1.5 border border-teal-100 font-sans">
                        🤝 <b>UMOWA ZLECENIE:</b> Wynagrodzenie z tytułu umowy zlecenie wraz z ewentualnym narzutem ZUS płatnika stanowi koszt CIT (KUP) w miesiącu, w którym zostało faktycznie wypłacone. Umowy zlecenia zawierane z osobami fizycznymi (nieprowadzącymi firmy) nie podlegają opodatkowaniu VAT (stawka VAT <b>0%</b>, odliczenie VAT <b>0%</b>).
                      </p>
                    ) : purchaseForm.kategoria === 'Umowa o dzieło' ? (
                      <p className="text-violet-950 bg-violet-50/80 rounded-lg p-1.5 border border-violet-100 font-sans">
                        ✍️ <b>UMOWA O DZIEŁO:</b> Wydatki na umowy o dzieło (np. przeniesienie praw autorskich z 50% kosztami uzyskania przychodów wykonawcy) stanowią tarcze podatkową CIT (KUP) w dacie ich wypłaty. Umowy te nie są objęte podatkiem VAT (brak odliczenia VAT, stawka 0%).
                      </p>
                    ) : (
                      <p>
                        Wydatki z kategorii <b>{purchaseForm.kategoria.toUpperCase()}</b> {purchaseForm.kosztCIT ? 'pomniejszą zysk firmy do opodatkowania CIT (są Kosztem Uzyskania Przychodu)' : 'nie zaliczą się jako KUP i nie wpłyną na CIT'}. {purchaseForm.odliczenieVat === '100' ? 'Odliczasz od tego wydatku pełne 100% kwoty VAT.' : purchaseForm.odliczenieVat === '50' ? 'Odliczasz 50% VAT ze względu na cel mieszany.' : 'Brak prawa do odliczenia VAT z tej faktury.'}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="col-span-1 md:col-span-2 lg:col-span-4 flex justify-end gap-2 pt-2 border-t border-slate-250 mt-2">
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition-all cursor-pointer"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  Zapisz koszt operacyjny
                </button>
              </div>
            </form>
          )}

          {/* Tab 3: CIT Advances Form */}
          {activeTab === 'advances' && (
            <form onSubmit={handleAddAdvance} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Miesiąc zaliczki</label>
                <select
                  className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs cursor-pointer focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-slate-800 outline-hidden transition-all font-medium"
                  value={advanceForm.miesiac}
                  onChange={(e) => setAdvanceForm({ ...advanceForm, miesiac: e.target.value })}
                >
                  {MONTHS_PL.map((mStr, idx) => (
                    <option key={idx + 1} value={idx + 1}>
                      {idx + 1} - {mStr.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Suma zapłaconej zaliczki</label>
                <input
                  type="number"
                  placeholder="np. 1200"
                  className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-slate-800 outline-hidden transition-all placeholder:text-slate-400 font-mono"
                  value={advanceForm.kwota}
                  onChange={(e) => setAdvanceForm({ ...advanceForm, kwota: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Rzeczywista data płatności</label>
                <input
                  type="date"
                  className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-slate-800 outline-hidden transition-all"
                  value={advanceForm.dataZaplaty}
                  onChange={(e) => setAdvanceForm({ ...advanceForm, dataZaplaty: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Komentarz / Notatka</label>
                <input
                  type="text"
                  placeholder="np. CIT spłacony terminowo"
                  className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-slate-800 outline-hidden transition-all placeholder:text-slate-400"
                  value={advanceForm.notatka}
                  onChange={(e) => setAdvanceForm({ ...advanceForm, notatka: e.target.value })}
                />
              </div>

              <div className="col-span-1 md:col-span-2 lg:col-span-4 flex justify-end gap-2 pt-2 border-t border-slate-250 mt-2">
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition-all cursor-pointer"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  Zapisz zaliczkę podatkową
                </button>
              </div>
            </form>
          )}

          {/* Tab 4: VAT Registry overrides Form */}
          {activeTab === 'vat_registry' && (
            <form onSubmit={handleAddVatReg} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div className="flex flex-col gap-1.5 font-medium">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Dotyczy miesiąca</label>
                <select
                  className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs cursor-pointer focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-slate-800 outline-hidden transition-all"
                  value={vatRegForm.miesiac}
                  onChange={(e) => setVatRegForm({ ...vatRegForm, miesiac: e.target.value })}
                >
                  {MONTHS_PL.map((mStr, idx) => (
                    <option key={idx + 1} value={idx + 1}>
                      {idx + 1} - {mStr.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5 font-mono">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-sans">Nadwyżka VAT przeniesiona</label>
                <input
                  type="number"
                  placeholder="Wartość w PLN (np. 1500)"
                  className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-slate-800 outline-hidden transition-all placeholder:text-slate-400"
                  value={vatRegForm.nadwyzkaZPoprzedniego}
                  onChange={(e) => setVatRegForm({ ...vatRegForm, nadwyzkaZPoprzedniego: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1.5 font-mono">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-sans">Korekty VAT JPK-V7 [PLN]</label>
                <input
                  type="number"
                  placeholder="opcjonalnie (np. -100)"
                  className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-slate-800 outline-hidden transition-all placeholder:text-slate-400"
                  value={vatRegForm.korekty}
                  onChange={(e) => setVatRegForm({ ...vatRegForm, korekty: e.target.value })}
                />
              </div>

              <div className="col-span-1 md:col-span-2 lg:col-span-4 flex justify-end gap-2 pt-2 border-t border-slate-250 mt-2">
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition-all cursor-pointer"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  Zapisz nadwyżki VAT
                </button>
              </div>
            </form>
          )}

        </div>
      )}

      {/* RENDER ACTIVE DATABASE LIST (TABLE CONTAINER BENTO STYLED) */}
      <div className="border border-slate-200 rounded-3xl overflow-hidden bg-white shadow-xs" id="transactions-registry-tables-box">
        
        {/* Table 1: Sales */}
        {activeTab === 'sales' && (
          <div className="overflow-x-auto">
            {state.sales.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs font-sans">
                Brak zarejestrowanych faktur sprzedaży. Możesz wpisać nową powyżej lub zaimportować z pliku Excel.
              </div>
            ) : (
              <table className="w-full text-left text-xs text-slate-700 border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 font-bold text-slate-400 uppercase text-[10px] tracking-wider">
                    <th className="px-5 py-3.5">Data r.p.</th>
                    <th className="px-5 py-3.5">Faktura</th>
                    <th className="px-5 py-3.5">Nabywca</th>
                    <th className="px-5 py-3.5 font-mono text-slate-600">Netto</th>
                    <th className="px-5 py-3.5">stawka VAT</th>
                    <th className="px-5 py-3.5">VAT</th>
                    <th className="px-5 py-3.5">Brutto</th>
                    <th className="px-5 py-3.5">Ujęcie CIT</th>
                    <th className="px-5 py-3.5">Ujęcie VAT</th>
                    <th className="px-5 py-3.5 text-right">Akcja</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {state.sales.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-3.5 font-semibold text-slate-900 font-mono">{s.data}</td>
                      <td className="px-5 py-3.5 font-mono text-indigo-700 font-semibold">{s.numerFaktury}</td>
                      <td className="px-5 py-3.5 text-slate-600">{s.kontrahent}</td>
                      <td className="px-5 py-3.5 font-mono text-slate-900 font-bold">{formatPLN(s.netto)}</td>
                      <td className="px-5 py-3.5 font-mono">{s.stawkaVat}%</td>
                      <td className="px-5 py-3.5 text-rose-600 font-semibold font-mono">+{formatPLN(s.vat)}</td>
                      <td className="px-5 py-3.5 text-slate-800 font-mono">{formatPLN(s.brutto)}</td>
                      <td className="px-5 py-3.5">
                        <span className={`px-2 py-0.5 rounded-lg text-[9.5px] font-bold border ${s.czyCIT ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                          {s.czyCIT ? 'CIT (TAK)' : 'NIE'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`px-2 py-0.5 rounded-lg text-[9.5px] font-bold border ${s.czyVAT ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                          {s.czyVAT ? 'VAT (TAK)' : 'NIE'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => handleDeleteSale(s.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer hover:bg-rose-50"
                          title="Usuń wpis"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Table 2: Purchases */}
        {activeTab === 'purchases' && (
          <div className="overflow-x-auto">
            {state.purchases.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs text-justify flex justify-center">
                Brak zarejestrowanych faktur kosztowych. Możesz dodać koszt ręcznie lub zaimportować arkusz kosztów.
              </div>
            ) : (
              <table className="w-full text-left text-xs text-slate-700 border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 font-bold text-slate-400 uppercase text-[10px] tracking-wider">
                    <th className="px-5 py-3.5">Data r.p.</th>
                    <th className="px-5 py-3.5">Faktura</th>
                    <th className="px-5 py-3.5">Dostawca</th>
                    <th className="px-5 py-3.5">Kategoria</th>
                    <th className="px-5 py-3.5">Netto</th>
                    <th className="px-5 py-3.5">stawka VAT</th>
                    <th className="px-5 py-3.5">VAT</th>
                    <th className="px-5 py-3.5">Odlicz. VAT</th>
                    <th className="px-5 py-3.5">Koszt CIT KUP</th>
                    <th className="px-5 py-3.5 text-right">Akcja</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {state.purchases.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-3.5 font-semibold text-slate-900 font-mono">{p.data}</td>
                      <td className="px-5 py-3.5 font-mono text-indigo-700 font-semibold">{p.numerFaktury}</td>
                      <td className="px-5 py-3.5 text-slate-600">{p.dostawca}</td>
                      <td className="px-5 py-3.5">
                        <span className="bg-slate-100 border border-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded-lg text-[9.5px]">
                          {p.kategoria.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-slate-900 font-bold">{formatPLN(p.netto)}</td>
                      <td className="px-5 py-3.5 font-mono">{p.stawkaVat}%</td>
                      <td className="px-5 py-3.5 text-emerald-600 font-semibold font-mono">-{formatPLN(p.vat)}</td>
                      <td className="px-5 py-3.5">
                        <span className={`px-2 py-0.5 rounded-lg text-[9.5px] font-bold border ${p.odliczenieVat === 100 ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : p.odliczenieVat === 50 ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-rose-50 text-rose-700 border-rose-100'}`}>
                          {p.odliczenieVat}% odliczenia
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`px-2 py-0.5 rounded-lg text-[9.5px] font-bold border ${p.kosztCIT ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                          {p.kosztCIT ? 'KUP (TAK)' : 'N-KUP (NIE)'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => handleDeletePurchase(p.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer hover:bg-rose-50"
                          title="Usuń kosz"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Table 3: CIT Advances */}
        {activeTab === 'advances' && (
          <div className="overflow-x-auto">
            {state.citAdvances.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs font-sans">
                Brak zarejestrowanych zaliczek CIT w tym roku. Przycisk powyżej pozwala dodać wpis.
              </div>
            ) : (
              <table className="w-full text-left text-xs text-slate-700 border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 font-bold text-slate-400 uppercase text-[10px] tracking-wider">
                    <th className="px-5 py-3.5">Miesiąc r.p.</th>
                    <th className="px-5 py-3.5">Kwota zaliczki</th>
                    <th className="px-5 py-3.5">Data płatności</th>
                    <th className="px-5 py-3.5">Notatka / Komentarz</th>
                    <th className="px-5 py-3.5 text-right">Akcja</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {state.citAdvances.map((adv) => (
                    <tr key={adv.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-3.5 font-bold text-slate-900">{getMonthName(adv.miesiac)}</td>
                      <td className="px-5 py-3.5 font-bold text-indigo-700 font-mono text-sm">{formatPLN(adv.kwota)}</td>
                      <td className="px-5 py-3.5 text-slate-600 font-mono">{adv.dataZaplaty}</td>
                      <td className="px-5 py-3.5 text-slate-500 font-medium italic">{adv.notatka}</td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => handleDeleteAdvance(adv.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer hover:bg-rose-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Table 4: VAT Overrides / registry */}
        {activeTab === 'vat_registry' && (
          <div className="overflow-x-auto">
            <div className="p-4 bg-amber-50 text-[11px] text-amber-900 flex items-start gap-2.5 border-b border-amber-100 font-medium leading-relaxed">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                <b>UWAGA SYSTEMOWA:</b> Rejestrowanie historycznych nadwyżek przenoszonych z ubiegłych miesięcy jest kluczowe do prawidłowego obliczenia podatku JPK-V7 należnego do odprowadzenia w bieżącym okresie symulacji.
              </span>
            </div>
            {state.vatRegistry.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                Brak zapisanych nadwyżek VAT z poprzednich okresów. Możesz dodać nadwyżkę m-ca powyżej.
              </div>
            ) : (
              <table className="w-full text-left text-xs text-slate-700 border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 font-bold text-slate-400 uppercase text-[10px] tracking-wider">
                    <th className="px-5 py-3.5">Miesiąc okresu</th>
                    <th className="px-5 py-3.5">VAT Należny (Sprzedaż)</th>
                    <th className="px-5 py-3.5">VAT Naliczony (Koszty)</th>
                    <th className="px-5 py-3.5 font-mono text-slate-600">Nadwyżka ubiegła</th>
                    <th className="px-5 py-3.5">Korekty VAT</th>
                    <th className="px-5 py-3.5 text-right">Akcja</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {state.vatRegistry.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-3.5 font-bold text-slate-900">{getMonthName(v.miesiac)}</td>
                      <td className="px-5 py-3.5 font-mono">{formatPLN(v.vatNalezny)}</td>
                      <td className="px-5 py-3.5 font-mono">{formatPLN(v.vatNaliczony)}</td>
                      <td className="px-5 py-3.5 font-bold text-emerald-700 font-mono">+{formatPLN(v.nadwyzkaZPoprzedniego)}</td>
                      <td className="px-5 py-3.5 text-rose-700 font-mono">{formatPLN(v.korekty)}</td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => handleDeleteVatReg(v.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer hover:bg-rose-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

      </div>

    </div>
  );
}
