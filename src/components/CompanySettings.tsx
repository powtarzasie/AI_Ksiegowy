import React from 'react';
import { CompanySettings } from '../types';
import { MONTHS_PL } from '../utils/taxCalc';
import { 
  Building2, 
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Company Name */}
        <div className="flex flex-col gap-1.5" id="field-company-name">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Nazwa Spółki z o.o.</span>
            {!showHelper && (
              <button 
                type="button"
                onClick={() => onShowHelperChange(true, 'nip')}
                className="text-[9.5px] text-indigo-500 hover:text-indigo-700 hover:underline font-bold font-sans cursor-pointer"
              >
                Po co wpisywać?
              </button>
            )}
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
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>NIP Spółki</span>
            {!showHelper && (
              <button 
                type="button"
                onClick={() => onShowHelperChange(true, 'nip')}
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

        {/* Custom Logo Upload */}
        <div className="flex flex-col gap-1.5" id="field-company-logo">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Własne Logo Firmy</span>
            {settings.customLogoBase64 && (
              <button
                type="button"
                onClick={() => handleChange('customLogoBase64', undefined)}
                className="text-[9.5px] text-rose-500 hover:text-rose-700 hover:underline font-bold font-sans cursor-pointer"
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
                  if (file.size > 1024 * 1024) {
                     alert('Logotyp jest za duży! Maksymalna objętość to 1MB.');
                    return;
                  }
                  const reader = new FileReader();
                  reader.onload = (event) => {
                    const base64 = event.target?.result as string;
                    handleChange('customLogoBase64', base64);
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
