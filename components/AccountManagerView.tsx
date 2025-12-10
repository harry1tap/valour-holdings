
import React, { useEffect, useState, useMemo } from 'react';
import { UserProfile, SolarLead, PeriodFilter, LeaderboardEntry } from '../types';
import { fetchLeads, fetchAccountManagerLeaderboard } from '../services/solarService';
import { 
  Users, Calendar, Sun, Banknote, ClipboardList, Medal, TrendingUp
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { LoadingSpinner } from './LoadingSpinner';

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

const MetricCard = ({ title, value, color, unit = '' }: { title: string, value: string | number, color: string, unit?: string }) => (
  <div className="bg-[#0f172a] border border-[#1e3a5f] rounded-xl p-6 flex flex-col justify-center items-center text-center">
    <p className="text-slate-400 text-sm font-medium mb-2">{title}</p>
    <div className={`text-3xl font-bold ${color}`}>
      {value}{unit}
    </div>
  </div>
);

interface AccountManagerViewProps {
  user: UserProfile;
}

export const AccountManagerView: React.FC<AccountManagerViewProps> = ({ user }) => {
  const [leads, setLeads] = useState<SolarLead[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<PeriodFilter>('this_year');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  
  // Date calculations
  const dateRange = useMemo(() => {
    const end = new Date();
    const start = new Date();
    
    switch (period) {
      case 'this_month':
        start.setDate(1);
        break;
      case 'last_month':
        start.setMonth(start.getMonth() - 1);
        start.setDate(1);
        end.setDate(0);
        break;
      case 'this_quarter':
        start.setMonth(Math.floor(start.getMonth() / 3) * 3);
        start.setDate(1);
        break;
      case 'this_year':
        start.setMonth(0, 1);
        break;
      case 'custom':
        start.setMonth(0, 1);
        break;
    }
    start.setHours(0,0,0,0);
    end.setHours(23,59,59,999);
    return { start, end };
  }, [period]);

  // Data Fetching
  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Single Query to get ALL filtered data for this Account Manager
      console.log(`Fetching leads for Account Manager: ${user.name}`);
      const fetchedLeads = await fetchLeads(user, dateRange.start, dateRange.end);
      setLeads(fetchedLeads);

      // 2. Fetch Global Leaderboard (for comparison)
      const lb = await fetchAccountManagerLeaderboard(dateRange.start, dateRange.end);
      setLeaderboard(lb);

      setLastUpdated(new Date());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user.name) {
      loadData();
    }
  }, [dateRange, user]);

  // --- Client-Side Metrics Calculation ---
  const stats = useMemo(() => {
    const totalLeads = leads.length;
    // Strict checks for non-null and non-empty dates
    const surveys = leads.filter(l => l.Survey_Booked_Date && l.Survey_Booked_Date !== '').length;
    const installs = leads.filter(l => l.Install_Booked_Date && l.Install_Booked_Date !== '').length;
    const paid = leads.filter(l => l.Status === 'Paid').length;
    const totalCommission = leads.reduce((sum, l) => sum + (l.Commission_Amount || 0), 0);

    const leadToSurvey = totalLeads > 0 ? (surveys / totalLeads) * 100 : 0;
    const surveyToInstall = surveys > 0 ? (installs / surveys) * 100 : 0;

    return {
      totalLeads,
      surveys,
      installs,
      paid,
      totalCommission,
      leadToSurvey,
      surveyToInstall
    };
  }, [leads]);

  // --- Chart Data Preparation (Monthly Activity) ---
  const chartData = useMemo(() => {
    const data: Record<string, { month: string, surveys: number, installs: number, paid: number }> = {};
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    // Initialize logic could go here, but we'll build dynamically
    leads.forEach(lead => {
      // Surveys
      if (lead.Survey_Booked_Date && lead.Survey_Booked_Date !== '') {
        const m = new Date(lead.Survey_Booked_Date).toLocaleString('default', { month: 'short' });
        if (!data[m]) data[m] = { month: m, surveys: 0, installs: 0, paid: 0 };
        data[m].surveys++;
      }
      // Installs
      if (lead.Install_Booked_Date && lead.Install_Booked_Date !== '') {
        const m = new Date(lead.Install_Booked_Date).toLocaleString('default', { month: 'short' });
        if (!data[m]) data[m] = { month: m, surveys: 0, installs: 0, paid: 0 };
        data[m].installs++;
      }
      // Paid
      if (lead.Status === 'Paid' && lead.Paid_Date && lead.Paid_Date !== '') {
        const m = new Date(lead.Paid_Date).toLocaleString('default', { month: 'short' });
        if (!data[m]) data[m] = { month: m, surveys: 0, installs: 0, paid: 0 };
        data[m].paid++;
      }
    });

    return Object.values(data).sort((a, b) => months.indexOf(a.month) - months.indexOf(b.month));
  }, [leads]);

  // Debug Log
  console.log('Displaying leads count:', stats.totalLeads, 'for AM:', user.name);

  return (
    <div className="space-y-8">
      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#0f172a] p-4 rounded-xl border border-[#1e3a5f]">
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
            <Calendar className="w-5 h-5 text-slate-400 mr-2 shrink-0" />
            {(['this_month', 'last_month', 'this_quarter', 'this_year'] as PeriodFilter[]).map((p) => (
              <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                period === p 
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20' 
                  : 'bg-[#1e293b] text-slate-400 hover:text-white hover:bg-[#334155]'
              }`}
              >
                {p.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </button>
            ))}
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-500">
            <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <>
          {/* KPI Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <KPICard title="Leads Assigned" value={stats.totalLeads} color="text-blue-500" icon={Users} />
            <KPICard title="Surveys Booked" value={stats.surveys} color="text-orange-500" icon={ClipboardList} />
            <KPICard title="Installs Booked" value={stats.installs} color="text-yellow-500" icon={Sun} />
            <KPICard title="Paid Leads" value={stats.paid} color="text-emerald-500" icon={Banknote} />
          </div>

          {/* Metrics Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <MetricCard title="Lead → Survey %" value={stats.leadToSurvey.toFixed(1)} unit="%" color="text-emerald-400" />
            <MetricCard title="Survey → Install %" value={stats.surveyToInstall.toFixed(1)} unit="%" color="text-orange-400" />
            <MetricCard title="Total Commission" value={`£${stats.totalCommission.toLocaleString()}`} color="text-white" />
          </div>

          {/* Charts & Leaderboard Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Monthly Activity Chart */}
            <div className="bg-[#0f172a] border border-[#1e3a5f] rounded-xl p-6 flex flex-col min-h-[400px]">
              <h3 className="text-lg font-semibold text-white mb-6">Monthly Performance</h3>
              <div className="flex-1 w-full min-h-0">
                  <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" vertical={false} />
                    <XAxis dataKey="month" stroke="#94a3b8" tick={{ fill: '#94a3b8' }} />
                    <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8' }} allowDecimals={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: 'white' }}
                      cursor={{fill: 'rgba(255,255,255,0.05)'}}
                    />
                    <Bar dataKey="surveys" name="Surveys" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="installs" name="Installs" fill="#eab308" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="paid" name="Paid" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Leaderboard */}
            <div className="bg-[#0f172a] border border-[#1e3a5f] rounded-xl overflow-hidden flex flex-col min-h-[400px]">
              <div className="p-6 border-b border-[#1e3a5f]">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Medal className="w-5 h-5 text-purple-500" />
                  AM Leaderboard
                </h3>
              </div>
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left">
                  <thead className="bg-[#1e293b] text-xs uppercase text-slate-400 sticky top-0">
                    <tr>
                      <th className="px-6 py-4 font-semibold">Rank</th>
                      <th className="px-6 py-4 font-semibold">Name</th>
                      <th className="px-6 py-4 font-semibold text-right">Paid</th>
                      <th className="px-6 py-4 font-semibold text-right">Conv. %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e3a5f]">
                    {leaderboard.map((am, idx) => (
                      <tr 
                        key={am.name} 
                        className={`transition-colors ${am.name === user.name ? 'bg-purple-500/10 hover:bg-purple-500/20 border-l-2 border-l-purple-500' : 'hover:bg-[#1e293b]/50'}`}
                      >
                        <td className="px-6 py-4 text-white">
                          {idx < 3 ? (
                              <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full font-bold text-xs
                              ${idx === 0 ? 'bg-yellow-500/20 text-yellow-500' : 
                                idx === 1 ? 'bg-slate-300/20 text-slate-300' : 
                                'bg-amber-700/20 text-amber-600'}`}>
                                {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}
                              </span>
                          ) : (
                            <span className="text-slate-500 ml-1 font-mono">{idx + 1}</span>
                          )}
                        </td>
                        <td className={`px-6 py-4 font-medium ${am.name === user.name ? 'text-purple-400' : 'text-white'}`}>
                          {am.name} {am.name === user.name && '(You)'}
                        </td>
                        <td className="px-6 py-4 text-right text-emerald-400 font-bold">{am.paid}</td>
                        <td className="px-6 py-4 text-right text-slate-300">{am.conversion.toFixed(1)}%</td>
                      </tr>
                    ))}
                    {leaderboard.length === 0 && (
                      <tr><td colSpan={4} className="text-center p-8 text-slate-500">No leaderboard data available</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Recent Leads Table */}
          <div className="bg-[#0f172a] border border-[#1e3a5f] rounded-xl overflow-hidden">
              <div className="p-6 border-b border-[#1e3a5f] flex justify-between items-center">
                <h3 className="text-lg font-semibold text-white">Recent Leads (Assigned to You)</h3>
                <span className="text-sm text-slate-500">Showing most recent 10</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-[#1e293b] text-xs uppercase text-slate-400">
                    <tr>
                      <th className="px-6 py-4 font-semibold">Customer</th>
                      <th className="px-6 py-4 font-semibold">Postcode</th>
                      <th className="px-6 py-4 font-semibold">Field Rep</th>
                      <th className="px-6 py-4 font-semibold">Status</th>
                      <th className="px-6 py-4 font-semibold">Survey</th>
                      <th className="px-6 py-4 font-semibold">Install</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e3a5f]">
                    {leads.slice(0, 10).map((lead) => (
                      <tr key={lead.id} className="hover:bg-[#1e293b]/50 transition-colors">
                        <td className="px-6 py-4 font-medium text-white">{lead.Customer_Name}</td>
                        <td className="px-6 py-4 text-slate-400">{lead.Postcode}</td>
                        <td className="px-6 py-4 text-blue-300">{lead.Field_Rep}</td>
                        <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                              ${lead.Status === 'Paid' ? 'bg-emerald-500/10 text-emerald-400' :
                                lead.Status === 'Install Booked' ? 'bg-yellow-500/10 text-yellow-400' :
                                lead.Status === 'Survey Booked' ? 'bg-blue-500/10 text-blue-400' :
                                lead.Status === 'Fall Off' ? 'bg-red-500/10 text-red-400' :
                                'bg-slate-500/10 text-slate-400'
                              }`}>
                              {lead.Status}
                            </span>
                        </td>
                        <td className="px-6 py-4 text-slate-400 text-sm">
                          {lead.Survey_Booked_Date ? new Date(lead.Survey_Booked_Date).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-6 py-4 text-slate-400 text-sm">
                            {lead.Install_Booked_Date ? new Date(lead.Install_Booked_Date).toLocaleDateString() : '-'}
                        </td>
                      </tr>
                    ))}
                    {leads.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                          No leads assigned to you in this period.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
          </div>
        </>
      )}
    </div>
  );
};
