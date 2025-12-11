
import React, { useEffect, useState, useMemo } from 'react';
import { PeriodFilter, InstallerStat } from '../types';
import * as solarService from '../services/solarService';
import * as eco4Service from '../services/eco4Service';
import { getDateRange } from '../services/dateService';
import { useBusiness } from '../contexts/BusinessContext';
import { LoadingSpinner } from './LoadingSpinner';
import { Users, ClipboardList, Sun, Banknote, Hammer, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { DateFilter } from './DateFilter';

const KPICard = ({ title, value, color, icon: Icon, subtext }: { title: string, value: string | number, color: string, icon: any, subtext?: string }) => (
  <div className="bg-[#0f172a] border border-[#1e3a5f] rounded-xl p-6 shadow-sm">
    <div className="flex justify-between items-start">
      <div>
        <p className="text-slate-400 text-sm font-medium mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-white">{value}</h3>
        {subtext && <p className="text-xs text-slate-500 mt-1">{subtext}</p>}
      </div>
      <div className={`p-3 rounded-lg bg-opacity-10 ${color.replace('text-', 'bg-')}`}>
        <Icon className={`w-6 h-6 ${color}`} />
      </div>
    </div>
  </div>
);

export const CompanyInstallersView: React.FC = () => {
  const [loading, setLoading] = useState(true);
  
  const { business } = useBusiness();
  const service = business === 'solar' ? solarService : eco4Service;

  const [period, setPeriod] = useState<PeriodFilter>('this_year');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  
  // Active date range
  const [dateRange, setDateRange] = useState(() => getDateRange('this_year'));

  useEffect(() => {
    if (business === 'eco4') {
      setPeriod('all_time');
    } else {
      setPeriod('this_year');
    }
  }, [business]);

  // Update dateRange when period changes (presets)
  useEffect(() => {
    if (period !== 'custom') {
      setDateRange(getDateRange(period));
    }
  }, [period]);

  const handleApply = () => {
     setPeriod('custom');
     setDateRange(getDateRange('custom', customStart, customEnd));
  };
  
  const [stats, setStats] = useState<InstallerStat[]>([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await service.fetchInstallerPerformance(dateRange.start, dateRange.end);
        setStats(data);
        setLastUpdated(new Date());
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [dateRange, business]);

  // KPI Calculations
  const totalInstallers = stats.length;
  const totalLeads = stats.reduce((acc, s) => acc + s.leads, 0);
  const totalRevenue = stats.reduce((acc, s) => acc + s.revenue, 0);
  const avgRevenuePerLead = totalLeads > 0 ? totalRevenue / totalLeads : 0;

  const sortedByCount = [...stats].sort((a, b) => b.leads - a.leads);
  const sortedByRevenue = [...stats].sort((a, b) => b.revenue - a.revenue);

  return (
    <div className="space-y-8">
      {/* Header & Filters */}
      <div className="flex flex-col xl:flex-row justify-between items-center gap-4 bg-[#0f172a] p-4 rounded-xl border border-[#1e3a5f]">
        <div>
           <h2 className="text-xl font-bold text-white">Installer Performance</h2>
           <p className="text-sm text-slate-400">Analysis by Installation Team</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-4">
           <DateFilter 
             period={period} 
             setPeriod={setPeriod}
             customStart={customStart}
             setCustomStart={setCustomStart}
             customEnd={customEnd}
             setCustomEnd={setCustomEnd}
             onApply={handleApply}
           />
           <span className="text-xs text-slate-500 hidden xl:inline">Updated: {lastUpdated.toLocaleTimeString()}</span>
        </div>
      </div>

      {loading ? <LoadingSpinner /> : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <KPICard title="Total Installers" value={totalInstallers} color="text-indigo-400" icon={Hammer} />
            <KPICard title="Total Leads Delivered" value={totalLeads} color="text-blue-400" icon={Users} />
            <KPICard title="Total Revenue" value={`£${totalRevenue.toLocaleString()}`} color="text-emerald-400" icon={Banknote} />
            <KPICard title="Avg Revenue / Lead" value={`£${avgRevenuePerLead.toLocaleString(undefined, {maximumFractionDigits: 0})}`} color="text-purple-400" icon={TrendingUp} />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-[#0f172a] border border-[#1e3a5f] rounded-xl p-6 min-h-[400px] flex flex-col">
              <h3 className="text-lg font-semibold text-white mb-4">Leads by Installer</h3>
              <div className="flex-1 w-full min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sortedByCount} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" horizontal={false} vertical={true} />
                    <XAxis type="number" stroke="#94a3b8" />
                    <YAxis type="category" dataKey="name" stroke="#94a3b8" width={100} />
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: 'white' }} />
                    <Bar dataKey="leads" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-[#0f172a] border border-[#1e3a5f] rounded-xl p-6 min-h-[400px] flex flex-col">
              <h3 className="text-lg font-semibold text-white mb-4">Revenue by Installer</h3>
              <div className="flex-1 w-full min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sortedByRevenue} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" horizontal={false} vertical={true} />
                    <XAxis type="number" stroke="#94a3b8" />
                    <YAxis type="category" dataKey="name" stroke="#94a3b8" width={100} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: 'white' }}
                      formatter={(val: number) => `£${val.toLocaleString()}`}
                    />
                    <Bar dataKey="revenue" fill="#10b981" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Performance Table */}
          <div className="bg-[#0f172a] border border-[#1e3a5f] rounded-xl overflow-hidden">
             <div className="p-4 border-b border-[#1e3a5f]"><h3 className="font-semibold text-white">Installer Performance Detail</h3></div>
             <div className="overflow-x-auto">
               <table className="w-full text-sm text-left">
                 <thead className="bg-[#1e293b] text-slate-400">
                   <tr>
                     <th className="px-6 py-4">Installer</th>
                     <th className="px-6 py-4 text-right">Leads</th>
                     <th className="px-6 py-4 text-right">Surveys</th>
                     <th className="px-6 py-4 text-right">Installs</th>
                     <th className="px-6 py-4 text-right">Paid</th>
                     <th className="px-6 py-4 text-right">Revenue</th>
                     <th className="px-6 py-4 text-right">Lead → Paid</th>
                     <th className="px-6 py-4 text-right">Rev / Lead</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-[#1e3a5f]">
                   {sortedByRevenue.map((stat, idx) => (
                     <tr key={stat.name} className={`${idx === 0 ? 'bg-yellow-500/10 border-l-2 border-l-yellow-500' : 'hover:bg-[#1e293b]'}`}>
                       <td className="px-6 py-4 font-medium text-white flex items-center gap-2">
                         {idx === 0 && <Sun className="w-4 h-4 text-yellow-500" />}
                         {stat.name}
                       </td>
                       <td className="px-6 py-4 text-right text-slate-300">{stat.leads}</td>
                       <td className="px-6 py-4 text-right text-slate-300">{stat.surveys}</td>
                       <td className="px-6 py-4 text-right text-slate-300">{stat.installs}</td>
                       <td className="px-6 py-4 text-right text-emerald-400 font-bold">{stat.paid}</td>
                       <td className="px-6 py-4 text-right text-emerald-400 font-bold">£{stat.revenue.toLocaleString()}</td>
                       <td className="px-6 py-4 text-right text-slate-300">{stat.leadToPaidRate.toFixed(1)}%</td>
                       <td className="px-6 py-4 text-right text-slate-300">£{stat.avgRevenuePerLead.toFixed(0)}</td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
          </div>

          {/* Conversion Comparison Chart */}
          <div className="bg-[#0f172a] border border-[#1e3a5f] rounded-xl p-6 min-h-[400px] flex flex-col">
            <h3 className="text-lg font-semibold text-white mb-4">Conversion Funnel Comparison</h3>
            <div className="flex-1 w-full min-h-0">
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={stats}>
                   <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" vertical={false} />
                   <XAxis dataKey="name" stroke="#94a3b8" />
                   <YAxis stroke="#94a3b8" unit="%" />
                   <Tooltip 
                      contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: 'white' }}
                      formatter={(val: number) => `${val.toFixed(1)}%`}
                   />
                   <Legend />
                   <Bar dataKey="leadToSurveyRate" name="Lead → Survey" fill="#3b82f6" />
                   <Bar dataKey="surveyToInstallRate" name="Survey → Install" fill="#f59e0b" />
                   <Bar dataKey="installToPaidRate" name="Install → Paid" fill="#10b981" />
                 </BarChart>
               </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
