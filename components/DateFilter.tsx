
import React from 'react';
import { PeriodFilter } from '../types';
import { Calendar } from 'lucide-react';

interface DateFilterProps {
  period: PeriodFilter;
  setPeriod: (p: PeriodFilter) => void;
  customStart: string;
  setCustomStart: (d: string) => void;
  customEnd: string;
  setCustomEnd: (d: string) => void;
  onApply: () => void;
}

export const DateFilter: React.FC<DateFilterProps> = ({
  period, setPeriod, customStart, setCustomStart, customEnd, setCustomEnd, onApply
}) => {
  const periodOptions: { value: PeriodFilter; label: string }[] = [
    { value: 'this_month', label: 'This Month' },
    { value: 'last_month', label: 'Last Month' },
    { value: 'this_quarter', label: 'This Quarter' },
    { value: 'this_year', label: 'This Year' },
    { value: 'last_year', label: 'Last Year (2024)' },
    { value: 'all_time', label: 'All Time' },
    { value: 'custom', label: 'Custom' }
  ];

  const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value as PeriodFilter;
    setPeriod(val);
    if (val !== 'custom') {
      // Clear custom inputs when switching to a preset
      setCustomStart('');
      setCustomEnd('');
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-[#1e293b] p-2 rounded-lg border border-[#334155]">
      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4 text-slate-400" />
        <select
          value={period}
          onChange={handlePresetChange}
          className="bg-[#0f172a] text-white px-3 py-1.5 rounded-md border border-[#334155] text-sm focus:outline-none focus:border-blue-500 hover:border-blue-500 transition-colors"
        >
          {periodOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div className="hidden sm:block w-px h-6 bg-[#334155]" />

      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">Custom:</span>
        <input
          type="date"
          value={customStart}
          onChange={(e) => setCustomStart(e.target.value)}
          className="bg-[#0f172a] text-white px-2 py-1.5 rounded-md border border-[#334155] text-sm focus:outline-none focus:border-blue-500 w-[130px]"
        />
        <span className="text-slate-500 text-sm">to</span>
        <input
          type="date"
          value={customEnd}
          onChange={(e) => setCustomEnd(e.target.value)}
          className="bg-[#0f172a] text-white px-2 py-1.5 rounded-md border border-[#334155] text-sm focus:outline-none focus:border-blue-500 w-[130px]"
        />
        <button
          onClick={onApply}
          disabled={!customStart || !customEnd}
          className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
        >
          Apply
        </button>
      </div>
    </div>
  );
};
