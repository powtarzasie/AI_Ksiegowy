import React from 'react';
import { CompanySettings } from '../types';
import { MONTHS_PL } from '../utils/taxCalc';
import { 
  Building2, 
  HelpCircle,
} from 'lucide-react';

interface CompanySettingsProps {
  settings: CompanySettings;
  onSettingsChange: (newSettings: CompanySettings) => void;
  embedded?: boolean;
  showHelper: boolean;
  onShowHelperChange: (show: boolean, section?: string) => void;
}

export default function CompanySettingsComponent({
  settings,
  onSettingsChange,
  embedded = false,
  showHelper,
  onShowHelperChange,
}: CompanySettingsProps) {
  
  const handleChange = (field: keyof CompanySettings, value: any) => {
    onSettingsChange({
      ...settings,
      [field]: value
    });
  };

  const yearsRange = [2023, 2024, 2025, 2026, 2027];

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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Company Name */}
        <div className="flex flex-col gap-1.5" id="field-company-name">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 min-h-[22px]">
            <span>Nazwa Spółki z o.o.</span>
            <span className="relative group/tooltip inline-flex items-center">
              <HelpCircle className="w-3.5 h-3.5 text-indigo-500 hover:text-indigo-750 cursor-help transition-colors select-none" />
              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 bg-slate-900 border border-slate-800 text-slate-100 text-left text-xs p-3.5 rounded-2xl shadow-2xl opacity-0 pointer-events-none group-hover/tooltip:opacity-100 transition-all duration-200 z-[60] transform scale-95 origin-bottom group-hover/tooltip:scale-100 normal-case tracking-normal font-sans block">
                <span className="font-extrabold text-indigo-400 mb-1 border-b border-indigo-500/20 pb-1 flex items-center gap-1.5 text-[11.5px] tracking-wide block uppercase font-display leading-tight">
                  Po co wpisywać?
                </span>
                <span className="text-[11px] text-slate-350 leading-relaxed font-sans block font-medium">
                  Nazwa firmy nadaje kontekst raportom i zestawieniom. Jest automatycznie umieszczana w plikach Excel lub archiwach ZIP generowanych dla Twojego biura rachunkowego.
                </span>
                <span className="absolute top-full left-1/2 -translate-x-1/2 border-[6px] border-transparent border-t-slate-900 block"></span>
              </span>
            </span>
          </label>
          <input
            type="text"
            className="w-full h-10 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-hidden transition-all placeholder:text-slate-400 font-sans"
            placeholder="np. Acme Sp. z o.o."
            value={settings.nazwaSpolki}
            onChange={(e) => handleChange('nazwaSpolki', e.target.value)}
          />
        </div>

        {/* NIP */}
        <div className="flex flex-col gap-1.5" id="field-company-nip">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 min-h-[22px]">
            <span>NIP Spółki</span>
            <span className="relative group/tooltip inline-flex items-center">
              <HelpCircle className="w-3.5 h-3.5 text-indigo-500 hover:text-indigo-750 cursor-help transition-colors select-none" />
              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 bg-slate-900 border border-slate-800 text-slate-100 text-left text-xs p-3.5 rounded-2xl shadow-2xl opacity-0 pointer-events-none group-hover/tooltip:opacity-100 transition-all duration-200 z-[60] transform scale-95 origin-bottom group-hover/tooltip:scale-100 normal-case tracking-normal font-sans block">
                <span className="font-extrabold text-indigo-400 mb-1 border-b border-indigo-500/20 pb-1 flex items-center gap-1.5 text-[11.5px] tracking-wide block uppercase font-display leading-tight">
                  Dowiedz się więcej (NIP)
                </span>
                <span className="text-[11px] text-slate-350 leading-relaxed font-sans block font-medium">
                  NIP nadaje kontekst prawny i poświadcza tożsamość podatkową. Służy do zapobiegania pomyłkom i bezpiecznego przechowywania danych w pamięci Twojej przeglądarki (LocalStorage).
                </span>
                <span className="absolute top-full left-1/2 -translate-x-1/2 border-[6px] border-transparent border-t-slate-900 block"></span>
              </span>
            </span>
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
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 min-h-[22px]">
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
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 min-h-[22px]">
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
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 min-h-[22px]">
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

        {/* Custom Logo Upload */}
        <div className="flex flex-col gap-1.5" id="field-company-logo">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between min-h-[22px]">
            <span>Własne Logo Firmy</span>
            {settings.customLogoBase64 && (
              <button
                type="button"
                onClick={() => handleChange('customLogoBase64', undefined)}
                className="text-[9.5px] text-rose-500 hover:text-rose-750 hover:underline font-bold font-sans cursor-pointer"
              >
                Usuń logo
              </button>
            )}
          </label>
          <div className="relative border border-dashed border-slate-300 rounded-xl h-10 px-3 flex items-center justify-between bg-slate-50 hover:bg-slate-100/50 transition-colors cursor-pointer group">
            <span className="text-[11px] font-semibold text-slate-600 truncate max-w-[150px]">
              {settings.customLogoBase64 ? '✓ Logo wczytane' : 'Dodaj logo (.png, .svg)'}
            </span>
            <span className="text-[9.5px] bg-slate-205 text-slate-700 font-bold px-2 py-1 rounded bg-slate-200 group-hover:bg-slate-300 transition-colors shrink-0">
              Wgraj plik
            </span>
            <input
              type="file"
              accept="image/*"
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  if (file.size > 8 * 1024 * 1024) {
                     alert('Logotyp jest za duży! Maksymalna objętość to 8MB.');
                     e.target.value = '';
                    return;
                  }
                  const reader = new FileReader();
                  const targetInput = e.target;
                  reader.onload = (event) => {
                    const base64 = event.target?.result as string;
                    handleChange('customLogoBase64', base64);
                    targetInput.value = '';
                  };
                  reader.readAsDataURL(file);
                }
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
