import React, { useState } from 'react';
import { CompanySettings } from '../types';
import { MONTHS_PL } from '../utils/taxCalc';
import { 
  Building2, 
  Calendar, 
  FileText, 
  Percent, 
  AlertCircle,
  HelpCircle,
  CheckCircle2,
  Info,
  ChevronDown,
  ChevronUp,
  XCircle,
  ArrowRight,
  TrendingUp,
  TrendingDown
} from 'lucide-react';

interface CompanySettingsProps {
  settings: CompanySettings;
  onSettingsChange: (newSettings: CompanySettings) => void;
  embedded?: boolean;
  showHelper: boolean;
  onShowHelperChange: (show: boolean) => void;
}

export default function CompanySettingsComponent({
  settings,
  onSettingsChange,
  embedded = false,
  showHelper,
  onShowHelperChange,
}: CompanySettingsProps) {
  const [activeQuestion, setActiveQuestion] = useState<'all' | 'nip' | 'cit_vs_vat' | 'cars_and_other' | 'start_balance'>('all');
  
  const handleChange = (field: keyof CompanySettings, value: any) => {
    onSettingsChange({
      ...settings,
      [field]: value
    });
  };

  const yearsRange = [2024, 2025, 2026, 2027];

  return (
    <div className={embedded ? "border-t border-slate-100 pt-6 space-y-6" : "bg-white rounded-3xl shadow-meta border border-slate-200 p-6 space-y-6"} id="company-settings-card">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <Building2 className="w-5 h-5 text-indigo-600" />
          <h2 className="text-lg font-bold text-slate-800 tracking-tight font-display">
            Metryka Spółki i Okres Podatkowy
          </h2>
        </div>
      </div>

      {/* Interactive Tax Helper / Clarification Panel */}
      {showHelper && (
        <div className="bg-indigo-950 text-white rounded-2xl p-6 relative overflow-hidden animate-fade-in animate-duration-200 shadow-md">
          {/* Decorative subtle background glows */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
          <div className="absolute bottom-0 left-1/3 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>

          <div className="relative z-10 space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-200">
                  <Info className="w-4 h-4" />
                </span>
                <span className="font-bold text-sm tracking-tight font-display">
                  🎓 Mobilny Asystent Kwalifikacji Podatkowej CIT & VAT
                </span>
              </div>
              <button 
                onClick={() => onShowHelperChange(false)}
                className="text-indigo-200 hover:text-white transition-colors cursor-pointer text-xs"
              >
                &times; ukryj
              </button>
            </div>

            {/* Quick Filter Menu */}
            <div className="flex flex-wrap gap-1.5 text-[10px] font-bold">
              {[
                { tag: 'all', label: 'Wszystkie podpowiedzi' },
                { tag: 'nip', label: 'Po co Nazwa i NIP?' },
                { tag: 'cit_vs_vat', label: 'Co wchodzi w CIT / VAT?' },
                { tag: 'cars_and_other', label: 'Samochody osobowe, hotele' },
                { tag: 'start_balance', label: '💼 Dane startowe (Agregaty)' }
              ].map((item) => (
                <button
                  key={item.tag}
                  onClick={() => setActiveQuestion(item.tag as any)}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    activeQuestion === item.tag 
                      ? 'bg-white text-indigo-950 shadow-xs' 
                      : 'bg-white/10 text-indigo-100 hover:bg-white/15'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Content Switcher */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1 text-xs leading-relaxed">
              
              {/* Question 1: Po co Nazwa i NIP? */}
              {(activeQuestion === 'all' || activeQuestion === 'nip') && (
                <div className="bg-white/5 border border-white/10 rounded-xl p-4.5 space-y-2.5">
                  <h4 className="font-bold text-indigo-300 flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-indigo-400" />
                    W jakim celu podaję Nazwę i NIP Spółki?
                  </h4>
                  <ul className="space-y-2 text-slate-200 text-[11px] list-disc list-inside">
                    <li><strong className="text-white">Wiarygodność Raportowania:</strong> Te dane automatycznie personalizują generowane szablony oraz profesjonalny eksport do Excel i dokumentów PDF dla księgowości.</li>
                    <li><strong className="text-white">Alokacja i Walidacja:</strong> NIP sprawia, że symulator poprawnie wylicza wskaźniki i chroni przed pomyłkami w bazach nadwyżek, jeśli prowadzisz więcej niż jeden podmiot w tej samej przeglądarce.</li>
                  </ul>
                </div>
              )}

              {/* Question 2: Co wchodzi do CIT a co do VAT? */}
              {(activeQuestion === 'all' || activeQuestion === 'cit_vs_vat') && (
                <div className="bg-white/5 border border-white/10 rounded-xl p-4.5 space-y-2.5">
                  <h4 className="font-bold text-amber-300 flex items-center gap-1.5">
                    <ArrowRight className="w-4 h-4 text-amber-400 animate-pulse" />
                    Skąd mam wiedzieć czy coś wchodzi w CIT vs VAT?
                  </h4>
                  <div className="space-y-4 text-[11px]">
                    <div>
                      <span className="bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-md font-bold text-[9px]">
                        SPRZEDAŻ / PRZYCHODY
                      </span>
                      <p className="text-slate-200 mt-1">
                        Zarówno przychód netto wchodzi do <strong>CIT</strong> jak i podatek należny do <strong>VAT</strong> dla każdej Twojej faktury sprzedażowej (z wyjątkiem np. zwrotnych kaucji lub pożyczek, które nie są opodatkowane).
                      </p>
                    </div>
                    <div>
                      <span className="bg-indigo-400/25 text-indigo-300 px-2 py-0.5 rounded-md font-bold text-[9px]">
                        ZAKUPY / KOSZTY
                      </span>
                      <p className="text-slate-200 mt-1">
                        Większość wydatków firmowych to koszty <strong>CIT KUP (koszty uzyskania przychodu)</strong> oraz odliczasz z nich <strong>VAT</strong> (np. oprogramowanie, komputery, serwery, marketing, biuro).
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Question 3: Wyjątki, pojazdy, noclegi, gastronomia */}
              {(activeQuestion === 'all' || activeQuestion === 'cars_and_other') && (
                <div className="bg-white/5 border border-white/10 rounded-xl p-4.5 space-y-2.5 md:col-span-2">
                  <h4 className="font-bold text-emerald-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Najważniejsze wyjątki i reguły (Samochody, Gastronomia, Noclegi)
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 text-[11px] text-slate-200">
                    <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                      <span className="text-amber-400 font-bold block mb-1">🚗 Samochód Osobowy:</span>
                      Wydatki na auto osobowe w celach mieszanych (firmowo-prywatnych) pozwalają odliczyć tylko <strong className="text-white">50% podatku VAT</strong>. Nierozliczona połowa VAT powiększa kwotę netto braną do kosztów CIT KUP!
                    </div>
                    <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                      <span className="text-rose-400 font-bold block mb-1">🏨 Hotele i Gastronomia:</span>
                      Ustawa o VAT zabrania odliczania podatku VAT od usług noclegowych oraz gastronomicznych (<strong className="text-white">0% odliczenia VAT</strong>). Cała kwota brutto stanowi jednak koszt CIT KUP spółki z o.o.
                    </div>
                    <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                      <span className="text-emerald-400 font-bold block mb-1">🎁 Reprezentacja i Kary:</span>
                      Ekskluzywne prezenty dla kontrahentów, obiady biznesowe o charakterze reprezentacyjnym, alkohol czy kary umowne <strong className="text-white">nie stanowią kosztów podatkowych (N-KUP) w CIT</strong>, lecz możesz od nich zazwyczaj odliczyć VAT.
                    </div>
                  </div>
                </div>
              )}

              {/* Question 4: Dane startowe firmy i agregowanie m-cy */}
              {(activeQuestion === 'all' || activeQuestion === 'start_balance') && (
                <div className="bg-indigo-900/60 border border-indigo-500/30 rounded-xl p-4.5 space-y-3 col-span-1 md:col-span-2 text-[11.5px]">
                  <h4 className="font-bold text-indigo-200 flex items-center gap-1.5 text-xs">
                    <CheckCircle2 className="w-4.5 h-4.5 text-indigo-300" />
                    💼 Posiadam już aktywną firmę. Jakie dane najlepiej wpisać na start (od stycznia 2026)?
                  </h4>
                  <p className="text-[11px] text-slate-200">
                    Jeżeli Twoja spółka o.o. już działa, nie musisz żmudnie przepisywać ani importować setek pojedynczych faktur od początku roku. Najprostszym i w pełni zbieżnym matematycznie sposobem zainicjowania bazy jest <strong>agregacja miesięczna</strong>:
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-slate-200 mt-2.5">
                    <div className="bg-white/5 p-2.5 rounded-lg border border-white/5">
                      <strong className="text-white block text-xs">1. Agregat Sprzedaży</strong>
                      Dla każdego z minionych miesięcy (styczeń, luty itp.) dodaj 1 fikcyjną fakturę zbiorczą z sumarycznym netto i średnim VAT ze sprzedaży całego miesiąca (np. <kbd className="bg-black/30 px-1 rounded text-[10px]">SUMA_SPRZEDAZY_01</kbd>).
                    </div>
                    <div className="bg-white/5 p-2.5 rounded-lg border border-white/5">
                      <strong className="text-white block text-xs">2. Agregat Kosztów</strong>
                      Podobnie dodaj 1 fakturę kosztową na miesiąc reprezentującą sumę kosztów operacyjnych KUP (np. <kbd className="bg-black/30 px-1 rounded text-[10px]">SUMA_KOSZTOW_01</kbd>). Przyspieszy to kalkulatory CIT bez utraty dokładności.
                    </div>
                    <div className="bg-white/5 p-2.5 rounded-lg border border-white/5">
                      <strong className="text-white block text-xs">3. Zapłacone CIT-y</strong>
                      W sekcji <i>"Zaliczki CIT"</i> wprowadź sumę zaliczek przelanych do US w poprzednich miesiącach – dzięki temu skumulowana kalkulacja zaliczki w kolejnych miesiącach uwzględni to prawidłowo.
                    </div>
                    <div className="bg-white/5 p-2.5 rounded-lg border border-white/5">
                      <strong className="text-white block text-xs">4. Nadwyżka VAT z 2025</strong>
                      Jeżeli na koniec 2025 r. firma miała nadwyżkę VAT do przeniesienia, wpisz ją w sekcji <i>"Nadwyżki & Dane VAT"</i> dla <strong>stycznia</strong> jako nadwyżkę z poprzedniego okresu. Wtedy VAT zacznie płynąć łańcuchowo!
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Company Name */}
        <div className="flex flex-col gap-1.5" id="field-company-name">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Nazwa Spółki z o.o.</span>
            {!showHelper && (
              <button 
                onClick={() => { onShowHelperChange(true); setActiveQuestion('nip'); }}
                className="text-[9.5px] text-indigo-500 hover:text-indigo-700 hover:underline font-bold font-sans cursor-pointer"
              >
                Po co wpisywać?
              </button>
            )}
          </label>
          <input
            type="text"
            className="w-full h-10 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-hidden transition-all placeholder:text-slate-400"
            placeholder="np. Acme Sp. z o.o."
            value={settings.nazwaSpolki}
            onChange={(e) => handleChange('nazwaSpolki', e.target.value)}
          />
        </div>

        {/* NIP */}
        <div className="flex flex-col gap-1.5" id="field-company-nip">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>NIP Spółki</span>
            {!showHelper && (
              <button 
                onClick={() => { onShowHelperChange(true); setActiveQuestion('nip'); }}
                className="text-[9.5px] text-indigo-500 hover:text-indigo-700 hover:underline font-bold font-sans cursor-pointer"
              >
                Dowiedz się więcej CP
              </button>
            )}
          </label>
          <input
            type="text"
            className="w-full h-10 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-hidden transition-all placeholder:text-slate-400"
            placeholder="np. 1234567890"
            value={settings.nip}
            maxLength={13}
            onChange={(e) => {
              const clean = e.target.value.replace(/[^0-9-]/g, '');
              handleChange('nip', clean);
            }}
          />
        </div>

        {/* CIT Rate */}
        <div className="flex flex-col gap-1.5" id="field-company-cit">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            Stawka podatku CIT
          </label>
          <div className="flex bg-slate-100 border border-slate-200 rounded-xl p-1 h-10">
            <button
              type="button"
              className={`flex-1 text-xs font-bold rounded-lg transition-all ${
                settings.stawkaCIT === 9
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              onClick={() => handleChange('stawkaCIT', 9)}
            >
              9% (Preferencyjna)
            </button>
            <button
              type="button"
              className={`flex-1 text-xs font-bold rounded-lg transition-all ${
                settings.stawkaCIT === 19
                  ? 'bg-indigo-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              onClick={() => handleChange('stawkaCIT', 19)}
            >
              19% (Standard)
            </button>
          </div>
        </div>

        {/* Fiscal Year */}
        <div className="flex flex-col gap-1.5" id="field-company-year">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            Rok Podatkowy
          </label>
          <select
            className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-hidden transition-all cursor-pointer font-medium"
            value={settings.rokPodatkowy}
            onChange={(e) => handleChange('rokPodatkowy', parseInt(e.target.value, 10))}
          >
            {yearsRange.map((yr) => (
              <option key={yr} value={yr}>
                {yr} ROK
              </option>
            ))}
          </select>
        </div>

        {/* Selected Month */}
        <div className="flex flex-col gap-1.5" id="field-company-month">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            Miesiąc Symulacji
          </label>
          <select
            className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-hidden transition-all cursor-pointer font-medium"
            value={settings.miesiacPodatkowy}
            onChange={(e) => handleChange('miesiacPodatkowy', parseInt(e.target.value, 10))}
          >
            {MONTHS_PL.map((mStr, idx) => (
              <option key={idx + 1} value={idx + 1}>
                {idx + 1} - {mStr.toUpperCase()}
              </option>
            ))}
          </select>
        </div>
      </div>

      {settings.stawkaCIT === 9 && (
        <div className="text-xs flex items-start gap-3 text-amber-900 bg-amber-50 border border-amber-200 p-4 rounded-2xl" id="cit-notice">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-bold">Stawka preferencyjna 9% CIT:</span> Dotyczy małych podatników realizujących obrót roczny brutto poniżej 2 mln EUR w poprzednim roku. Pamiętaj o bieżącym monitorowaniu limitu rentowności i przychodów operacyjnych w roku {settings.rokPodatkowy}.
          </div>
        </div>
      )}
    </div>
  );
}

