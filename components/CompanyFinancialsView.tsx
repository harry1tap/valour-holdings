
import React, { useEffect, useState, useMemo } from 'react';
import { PeriodFilter, FinancialSummary, CostPerMetric, FinancialTrend, UserProfile } from '../types';
import * as solarService from '../services/solarService';
import * as eco4Service from '../services/eco4Service';
import { getDateRange } from '../services/dateService';
import { useBusiness } from '../contexts/BusinessContext';
import { LoadingSpinner } from './LoadingSpinner';
import { TrendingUp, TrendingDown, DollarSign, PieChart as PieIcon, Activity } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';
import { DateFilter } from './DateFilter';

const SummaryCard = ({ title, value, subValue, color, icon: Icon }: { title: string, value: string, subValue?: string, color: string, icon: any }) => (
  <div className="bg-[#0f172a] border border-[#1e3a5f] rounded-xl p-6 shadow-sm flex flex-col justify-between">
    <div className="flex justify-between items-start mb-4">
      <div className={`p-3 rounded-lg bg-opacity-10 ${color.replace('text-', 'bg-')}`}>
        <Icon className={`w-6 h-6 ${color}`} />
      </div>
    </div>
    <div>
      <p className="text-slate-400 text-sm font-medium mb-1">{title}</p>
      <h3 className={`text-2xl font-bold ${color}`}>{value}</h3>
      {subValue && <p className="text-xs text-slate-500 mt-1">{subValue}</p>}
    </div>
  </div>
);

const MetricCard = ({ title, value, theme }: { title: string, value: string, theme: 'blue' | 'purple' }) => {
  const bgClass = theme === 'blue' ? 'bg-blue-500/10 border-blue-500/30' : 'bg-purple-500/10 border-purple-500/30';
  const textClass = theme === 'blue' ? 'text-blue-400' : 'text-purple-400';
  
  return (
    <div className={`border rounded-xl p-4 flex flex-col items-center justify-center text-center ${bgClass}`}>
      <p className="text-slate-400 text-xs uppercase font-bold tracking-wider mb-1">{title}</p>
      <div className={`text-xl font-bold ${textClass}`}>{value}</div>
    </div>
  );
};

interface CompanyFinancialsViewProps {
  user: UserProfile;
}

export const CompanyFinancialsView: React.FC<CompanyFinancialsViewProps> = ({ user }) => {
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

  const [summary, setSummary] = useState<FinancialSummary>({ revenue: 0, expenses: 0, netProfit: 0, margin: 0 });
  const [fieldMetrics, setFieldMetrics] = useState<CostPerMetric>({ cpl: 0, cps: 0, cpi: 0 });
  const [onlineMetrics, setOnlineMetrics] = useState<CostPerMetric>({ cpl: 0, cps: 0, cpi: 0 });
  const [trends, setTrends] = useState<FinancialTrend[]>([]);
  const [expenseBreakdown, setExpenseBreakdown] = useState<any[]>([]);
  const [sourceBreakdown, setSourceBreakdown] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await service.fetchFinancialData(dateRange.start, dateRange.end);
        const trendData = await service.fetchFinancialTrend();
        
        setSummary(data.summary);
        setFieldMetrics(data.fieldMetrics);
        setOnlineMetrics(data.onlineMetrics);
        setExpenseBreakdown(data.expenseBreakdown);
        setSourceBreakdown(data.sourceBreakdown);
        setTrends(trendData);
        setLastUpdated(new Date());
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [dateRange, business]);

  const formatCurrency = (val: number) => `£${val.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  return (
    <div className="space-y-8">
      {/* Filters */}
      <div className="flex flex-col xl:flex-row justify-between items-center gap-4 bg-[#0f172a] p-4 rounded-xl border border-[#1e3a5f]">
        <div>
          <h2 className="text-xl font-bold text-white">Company Financials</h2>
          <p className="text-sm text-slate-400">Profit & Loss Analysis</p>
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
          {/* Row 1: Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <SummaryCard 
              title="Total Revenue" 
              value={formatCurrency(summary.revenue)} 
              color="text-emerald-500" 
              icon={DollarSign} 
            />
            <SummaryCard 
              title="Total Expenses" 
              value={formatCurrency(summary.expenses)} 
              color="text-red-500" 
              icon={TrendingDown} 
            />
            <SummaryCard 
              title="Net Profit" 
              value={formatCurrency(summary.netProfit)} 
              color={summary.netProfit >= 0 ? "text-blue-500" : "text-red-500"} 
              icon={TrendingUp} 
            />
            <SummaryCard 
              title="Profit Margin" 
              value={`${summary.margin.toFixed(1)}%`} 
              subValue="Net Profit / Revenue"
              color={summary.margin >= 0 ? "text-emerald-400" : "text-red-400"} 
              icon={PieIcon} 
            />
          </div>

          {/* Row 2: Cost Per Metrics - Hidden for ECO4 */}
          {business !== 'eco4' && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-slate-400" /> Cost Efficiency Metrics
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <MetricCard title="CPL Field" value={formatCurrency(fieldMetrics.cpl)} theme="blue" />
                <MetricCard title="CPS Field" value={formatCurrency(fieldMetrics.cps)} theme="blue" />
                <MetricCard title="CPI Field" value={formatCurrency(fieldMetrics.cpi)} theme="blue" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <MetricCard title="CPL Online" value={formatCurrency(onlineMetrics.cpl)} theme="purple" />
                <MetricCard title="CPS Online" value={formatCurrency(onlineMetrics.cps)} theme="purple" />
                <MetricCard title="CPI Online" value={formatCurrency(onlineMetrics.cpi)} theme="purple" />
              </div>
            </div>
          )}

          {/* Row 3: Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
             {/* Revenue vs Expenses */}
             <div className="bg-[#0f172a] border border-[#1e3a5f] rounded-xl p-6 min-h-[350px] flex flex-col">
                <h3 className="text-lg font-semibold text-white mb-4">Revenue vs Expenses (6 Months)</h3>
                <div className="flex-1 w-full min-h-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={trends}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" vertical={false} />
                      <XAxis dataKey="month" stroke="#94a3b8" />
                      <YAxis stroke="#94a3b8" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: 'white' }} 
                        formatter={(val: number) => formatCurrency(val)}
                      />
                      <Legend />
                      <Bar dataKey="revenue" name="Revenue" fill="#10b981" />
                      <Bar dataKey="expenses" name="Expenses" fill="#ef4444" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
             </div>

             {/* Net Profit Trend */}
             <div className="bg-[#0f172a] border border-[#1e3a5f] rounded-xl p-6 min-h-[350px] flex flex-col">
                <h3 className="text-lg font-semibold text-white mb-4">Net Profit Trend</h3>
                <div className="flex-1 w-full min-h-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trends}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" vertical={false} />
                      <XAxis dataKey="month" stroke="#94a3b8" />
                      <YAxis stroke="#94a3b8" />
                      <Tooltip 
                         contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: 'white' }}
                         formatter={(val: number) => formatCurrency(val)}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="netProfit" name="Net Profit" stroke="#3b82f6" strokeWidth={3} dot={{r: 4}} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
             </div>
          </div>

          {/* Row 4: Tables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
             {/* Expenses Breakdown */}
             <div className="bg-[#0f172a] border border-[#1e3a5f] rounded-xl overflow-hidden">
                <div className="p-4 border-b border-[#1e3a5f]"><h3 className="font-semibold text-white">Expense Breakdown</h3></div>
                <table className="w-full text-sm text-left">
                  <thead className="bg-[#1e293b] text-slate-400">
                    <tr>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                      <th className="px-4 py-3 text-right">% Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e3a5f]">
                    {expenseBreakdown.map((item) => (
                      <tr key={item.type}>
                        <td className="px-4 py-3 text-white font-medium">{item.type}</td>
                        <td className="px-4 py-3 text-right text-slate-300">{formatCurrency(item.amount)}</td>
                        <td className="px-4 py-3 text-right text-slate-400">{item.percentage.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
             </div>

             {/* Revenue by Source */}
             <div className="bg-[#0f172a] border border-[#1e3a5f] rounded-xl overflow-hidden">
                <div className="p-4 border-b border-[#1e3a5f]"><h3 className="font-semibold text-white">Revenue by Source</h3></div>
                <table className="w-full text-sm text-left">
                  <thead className="bg-[#1e293b] text-slate-400">
                    <tr>
                      <th className="px-4 py-3">Source</th>
                      <th className="px-4 py-3 text-right">Leads</th>
                      <th className="px-4 py-3 text-right">Revenue</th>
                      <th className="px-4 py-3 text-right">Conv %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e3a5f]">
                    {sourceBreakdown.map((item) => (
                      <tr key={item.source}>
                        <td className="px-4 py-3 text-white font-medium">{item.source}</td>
                        <td className="px-4 py-3 text-right text-slate-300">{item.leads}</td>
                        <td className="px-4 py-3 text-right text-emerald-400">{formatCurrency(item.revenue)}</td>
                        <td className="px-4 py-3 text-right text-slate-400">{item.conversion.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
             </div>
          </div>
        </>
      )}
    </div>
  );
};
