
import React, { useEffect, useState, useMemo } from 'react';
import { PeriodFilter, MonthlyActivity, RevenueTrendData, LeaderboardEntry, LeadSourceStat, UserProfile } from '../types';
import * as solarService from '../services/solarService';
import * as eco4Service from '../services/eco4Service';
import { getDateRange } from '../services/dateService';
import { useBusiness } from '../contexts/BusinessContext';
import { Users, Sun, Banknote, ClipboardList, TrendingUp, BarChart2, PieChart, Hammer } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPie, Pie, Cell, Legend } from 'recharts';
import { LoadingSpinner } from './LoadingSpinner';
import { DateFilter } from './DateFilter';

const KPICard = ({ title, value, color, icon: Icon }: { title: string, value: string | number, color: string, icon: any }) => (
  <div className="bg-[#0f172a] border border-[#1e3a5f] rounded-xl p-6 shadow-sm">
    <div className="flex justify-between items-start">
      <div>
        <p className="text-slate-400 text-sm font-medium mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-white">{value}</h3>
      </div>
      <div className={`p-3 rounded-lg bg-opacity-10 ${color.replace('text-', 'bg-')}`}>
        <Icon className={`w-6 h-6 ${color}`} />
      </div>
    </div>
  </div>
);

const ConversionCard = ({ title, value, color }: { title: string, value: string, color: string }) => (
  <div className="bg-[#0f172a] border border-[#1e3a5f] rounded-xl p-6 flex flex-col items-center justify-center text-center">
    <p className="text-slate-400 text-sm font-medium mb-2">{title}</p>
    <div className={`text-3xl font-bold ${color}`}>{value}%</div>
  </div>
);

export const CompanyPerformanceView = ({ user }: { user: UserProfile }) => {
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
      const newRange = getDateRange(period);
      setDateRange(newRange);
    }
  }, [period]);

  const handleApply = () => {
     setPeriod('custom');
     const newRange = getDateRange('custom', customStart, customEnd);
     setDateRange(newRange);
  };
  
  // Data State
  const [kpis, setKpis] = useState({ leadsCount: 0, surveysCount: 0, installsCount: 0, paidCount: 0, revenue: 0 });
  const [monthlyTrend, setMonthlyTrend] = useState<MonthlyActivity[]>([]);
  const [revenueTrend, setRevenueTrend] = useState<RevenueTrendData[]>([]);
  const [repLeaderboard, setRepLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [amLeaderboard, setAmLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [sourceStats, setSourceStats] = useState<LeadSourceStat[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const kpiData = await service.fetchKPIMetrics(user, dateRange.start, dateRange.end, null);
      setKpis(kpiData);

      const [trends, revTrend, repLb, amLb, srcStats] = await Promise.all([
        service.fetchSixMonthTrend(),
        service.fetchRevenueTrend(),
        service.fetchLeaderboardStats(),
        service.fetchAccountManagerLeaderboard(dateRange.start, dateRange.end),
        service.fetchLeadSourceStats(dateRange.start, dateRange.end)
      ]);

      setMonthlyTrend(trends);
      setRevenueTrend(revTrend);
      setRepLeaderboard(repLb);
      setAmLeaderboard(amLb);
      setSourceStats(srcStats);
      setLastUpdated(new Date());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [dateRange, business]);

  const calcPerc = (numerator: number, denominator: number) => {
    if (denominator <= 0) return 0;
    const val = (numerator / denominator) * 100;
    return Math.min(val, 100);
  };

  const leadToSurvey = calcPerc(kpis.surveysCount, kpis.leadsCount);
  const surveyToInstall = calcPerc(kpis.installsCount, kpis.surveysCount);
  const installToPaid = calcPerc(kpis.paidCount, kpis.installsCount);
  
  const leadToPaidECO4Raw = kpis.leadsCount > 0 ? (kpis.paidCount / kpis.leadsCount) * 100 : 0;
  const leadToPaidECO4 = Math.min(leadToPaidECO4Raw, 100);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  return (
    <div className="space-y-8">
      {/* Header & Filters */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-[#0f172a] p-4 rounded-xl border border-[#1e3a5f]">
        <div>
           <h2 className="text-xl font-bold text-white">Company Performance</h2>
           <p className="text-sm text-slate-400">Aggregated metrics across all reps</p>
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

      {loading ? (
        <LoadingSpinner />
      ) : (
        <>
          {/* Row 1: KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
             <KPICard title="Total Leads" value={kpis.leadsCount} color="text-blue-500" icon={Users} />
             <KPICard title="Total Surveys" value={kpis.surveysCount} color="text-orange-500" icon={ClipboardList} />
             <KPICard title="Total Installs" value={kpis.installsCount} color="text-yellow-500" icon={Sun} />
             <KPICard title="Total Paid" value={kpis.paidCount} color="text-emerald-500" icon={Banknote} />
          </div>

          {/* Row 2: Conversion Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <ConversionCard title="Lead → Survey" value={leadToSurvey.toFixed(1)} color="text-emerald-400" />
              <ConversionCard title="Survey → Install" value={surveyToInstall.toFixed(1)} color="text-orange-400" />
              
              {business === 'eco4' ? (
                 <ConversionCard title="Lead → Paid" value={leadToPaidECO4.toFixed(1)} color="text-blue-400" />
              ) : (
                 <ConversionCard title="Install → Paid" value={installToPaid.toFixed(1)} color="text-blue-400" />
              )}
          </div>

          {/* Row 3: Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-[#0f172a] border border-[#1e3a5f] rounded-xl p-6 min-h-[350px] flex flex-col">
               <h3 className="text-lg font-semibold text-white mb-4">Monthly Activity (6 Months)</h3>
               <div className="flex-1 w-full min-h-0">
                 <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={monthlyTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" vertical={false} />
                      <XAxis dataKey="month" stroke="#94a3b8" />
                      <YAxis stroke="#94a3b8" allowDecimals={false} />
                      <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: 'white' }} />
                      <Legend />
                      <Bar dataKey="leads" name="Leads" fill="#3b82f6" />
                      <Bar dataKey="surveys" name="Surveys" fill="#f59e0b" />
                      <Bar dataKey="installs" name="Installs" fill="#eab308" />
                      <Bar dataKey="paid" name="Paid" fill="#10b981" />
                   </BarChart>
                 </ResponsiveContainer>
               </div>
            </div>

            <div className="bg-[#0f172a] border border-[#1e3a5f] rounded-xl p-6 min-h-[350px] flex flex-col">
               <h3 className="text-lg font-semibold text-white mb-4">Revenue Trend (Paid)</h3>
               <div className="flex-1 w-full min-h-0">
                 <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={revenueTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" vertical={false} />
                      <XAxis dataKey="month" stroke="#94a3b8" />
                      <YAxis stroke="#94a3b8" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: 'white' }}
                        formatter={(val: number) => `£${val.toLocaleString()}`}
                      />
                      <Bar dataKey="revenue" name="Revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                   </BarChart>
                 </ResponsiveContainer>
               </div>
            </div>
          </div>

          {/* Row 4: Leaderboards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
             <div className="bg-[#0f172a] border border-[#1e3a5f] rounded-xl overflow-hidden">
                <div className="p-4 border-b border-[#1e3a5f]"><h3 className="font-semibold text-white">Top Field Reps</h3></div>
                <table className="w-full text-sm text-left">
                   <thead className="bg-[#1e293b] text-slate-400">
                     <tr>
                       <th className="px-4 py-3">Rank</th>
                       <th className="px-4 py-3">Name</th>
                       <th className="px-4 py-3 text-right">Paid</th>
                       <th className="px-4 py-3 text-right">Conv %</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-[#1e3a5f]">
                     {repLeaderboard.slice(0,5).map((rep, i) => (
                       <tr key={rep.name} className="hover:bg-[#1e293b]/50 transition-colors">
                         <td className="px-4 py-3 text-slate-400">#{i+1}</td>
                         <td className="px-4 py-3 text-white font-medium">{rep.name}</td>
                         <td className="px-4 py-3 text-right text-emerald-400 font-bold">{rep.paid}</td>
                         <td className="px-4 py-3 text-right text-slate-400">{rep.conversion.toFixed(1)}%</td>
                       </tr>
                     ))}
                   </tbody>
                </table>
             </div>

             <div className="bg-[#0f172a] border border-[#1e3a5f] rounded-xl overflow-hidden">
                <div className="p-4 border-b border-[#1e3a5f]"><h3 className="font-semibold text-white">Top Account Managers</h3></div>
                <table className="w-full text-sm text-left">
                   <thead className="bg-[#1e293b] text-slate-400">
                     <tr>
                       <th className="px-4 py-3">Rank</th>
                       <th className="px-4 py-3">Name</th>
                       <th className="px-4 py-3 text-right">Paid</th>
                       <th className="px-4 py-3 text-right">Conv %</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-[#1e3a5f]">
                     {amLeaderboard.slice(0,5).map((am, i) => (
                       <tr key={am.name} className="hover:bg-[#1e293b]/50 transition-colors">
                         <td className="px-4 py-3 text-slate-400">#{i+1}</td>
                         <td className="px-4 py-3 text-white font-medium">{am.name}</td>
                         <td className="px-4 py-3 text-right text-emerald-400 font-bold">{am.paid}</td>
                         <td className="px-4 py-3 text-right text-slate-400">{am.conversion.toFixed(1)}%</td>
                       </tr>
                     ))}
                   </tbody>
                </table>
             </div>
          </div>

          {/* Row 5: Lead Source Analysis */}
          <div className={`grid grid-cols-1 ${business === 'solar' ? 'lg:grid-cols-2' : ''} gap-6`}>
             <div className="bg-[#0f172a] border border-[#1e3a5f] rounded-xl p-6 min-h-[350px] flex flex-col">
                <h3 className="text-lg font-semibold text-white mb-6">Lead Source Distribution</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
                   <div className="flex justify-center items-center">
                      <ResponsiveContainer width="100%" height={220}>
                        <RechartsPie>
                          <Pie 
                             data={sourceStats} 
                             dataKey="count" 
                             nameKey="source" 
                             cx="50%" 
                             cy="50%" 
                             innerRadius={60}
                             outerRadius={85} 
                             paddingAngle={5}
                             stroke="none"
                          >
                            {sourceStats.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: 'white' }} 
                            itemStyle={{ color: 'white' }}
                          />
                        </RechartsPie>
                      </ResponsiveContainer>
                   </div>
                   <div className="flex flex-col justify-center gap-3">
                      <div className="grid grid-cols-1 gap-2">
                        {sourceStats.map((stat, index) => (
                          <div key={stat.source} className="flex items-center justify-between text-sm">
                             <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                                <span className="text-slate-300 font-medium truncate max-w-[120px]" title={stat.source}>
                                  {stat.source}
                                </span>
                             </div>
                             <div className="flex items-center gap-3">
                                <span className="text-white font-bold">{stat.count}</span>
                                <span className="text-slate-500 text-xs w-12 text-right">({stat.percentage.toFixed(1)}%)</span>
                             </div>
                          </div>
                        ))}
                      </div>
                   </div>
                </div>
             </div>
             
             {business === 'solar' && (
                <div className="bg-[#0f172a] border border-[#1e3a5f] rounded-xl p-6 min-h-[350px] flex flex-col">
                    <h3 className="text-lg font-semibold text-white mb-6">Conversion by Source (Lead → Paid)</h3>
                    <div className="flex-1 w-full min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={sourceStats} layout="vertical" margin={{ left: 20, right: 30 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" horizontal={true} vertical={false} />
                        <XAxis type="number" stroke="#94a3b8" unit="%" domain={[0, 100]} />
                        <YAxis type="category" dataKey="source" stroke="#94a3b8" width={100} />
                        <Tooltip 
                            cursor={{fill: 'rgba(255,255,255,0.05)'}}
                            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: 'white' }} 
                            formatter={(val: number) => `${val.toFixed(1)}%`}
                        />
                        <Bar dataKey="conversion" name="Conversion Rate" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                    </div>
                </div>
             )}
          </div>
        </>
      )}
    </div>
  );
};
