
import { supabase, supabaseECO4 } from '../supabaseClient';
import { SolarLead, UserProfile, LeaderboardEntry, MonthlyActivity, RevenueTrendData, LeadSourceStat, CostPerMetric, FinancialTrend, Expense, InstallerStat } from '../types';

// Helper to parse currency values (handles numbers and strings)
const parseCurrency = (val: any): number => {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  return parseFloat(val.toString().replace(/[£,]/g, '') || '0');
};

// Helper to fetch all rows across pages (bypasses 1000 row limit)
const fetchAllPages = async (
  tableName: string,
  columns: string,
  dateColumn: string,
  startDate: Date,
  endDate: Date,
  isAllTime: boolean,
  extraFilter?: (query: any) => any
) => {
  let allData: any[] = [];
  let from = 0;
  const batchSize = 1000;
  const start = startDate.toISOString();
  const end = endDate.toISOString();

  while (true) {
    let query = supabaseECO4.from(tableName).select(columns);
    
    if (!isAllTime) {
      query = query.gte(dateColumn, start).lte(dateColumn, end);
    } else if (dateColumn !== 'Lead_Created_Date') {
      // For all time, if it's not lead creation, we just need the column to be not null
      query = query.not(dateColumn, 'is', null);
    }

    if (extraFilter) {
      query = extraFilter(query);
    }

    const { data, error } = await query.range(from, from + batchSize - 1);
    
    if (error) {
      console.error(`Error fetching ${tableName} page:`, error);
      break;
    }

    if (!data || data.length === 0) break;
    
    allData = [...allData, ...data];
    if (data.length < batchSize) break;
    from += batchSize;
    
    // Safety cap to prevent infinite loops (ECO4 likely won't exceed 100k records in one view)
    if (from > 100000) break;
  }
  return allData;
};

// Helper to map ECO4_Leads columns to SolarLead interface
const mapECO4ToLead = (row: any): SolarLead => ({
  id: row.id || Math.floor(Math.random() * 1000000),
  Created_At: row.Lead_Created_Date || row.Valour_Paid_Date, 
  Customer_Name: row.Customer_Name || row.Address || 'ECO4 Customer',
  Customer_Tel: row.Customer_Phone || null,
  Customer_Email: row.Customer_Email || null,
  First_Line_Of_Address: row.Address,
  Postcode: row.Postcode,
  Property_Type: null,
  Lead_Source: row.Lead_Generation || 'ECO4', 
  Field_Rep: null, 
  Account_Manager: null, 
  Installer: row.Current_Installer,
  Status: row.Overall_Status || 'Pending',
  Survey_Booked_Date: row.Survey_Date,
  Survey_Complete_Date: row.Survey_Date,
  Install_Booked_Date: row.Install_Date,
  Paid_Date: row.Valour_Paid_Date,
  Lead_Cost: null,
  Lead_Revenue: parseCurrency(row.Payment_Total_Net),
  Commission_Amount: null,
  Commission_Paid: null,
  Commission_Paid_Date: null
});

export const fetchUserProfile = async (email: string): Promise<UserProfile | null> => {
  const { data, error } = await supabase
    .schema('finances')
    .from('users')
    .select('*')
    .eq('email', email)
    .single();

  if (error) {
    console.error('Error fetching user profile:', JSON.stringify(error, null, 2));
    return null;
  }
  return data as UserProfile;
};

export const fetchLeads = async (
  user: UserProfile,
  startDate: Date,
  endDate: Date,
  selectedRepFilter?: string | null
): Promise<SolarLead[]> => {
  if (user.role !== 'admin') return [];

  const isAllTime = startDate.getFullYear() === 2020;
  const start = startDate.toISOString();
  const end = endDate.toISOString();

  let query = supabaseECO4.from('ECO4_Leads').select('*');
  if (!isAllTime) {
    query = query.gte('Lead_Created_Date', start).lte('Lead_Created_Date', end);
  }

  const { data, error } = await query.range(0, 999).order('Lead_Created_Date', { ascending: false });
  if (error) throw error;

  return (data || []).map(mapECO4ToLead);
};

export const fetchKPIMetrics = async (
  user: UserProfile,
  startDate: Date,
  endDate: Date,
  selectedRepFilter?: string | null
) => {
  if (user.role !== 'admin') {
    return { leadsCount: 0, surveysCount: 0, installsCount: 0, paidCount: 0, revenue: 0 };
  }

  const isAllTime = startDate.getFullYear() === 2020;
  const start = startDate.toISOString();
  const end = endDate.toISOString();

  const [leadsRes, surveysRes, installsRes, paidRes, revenueRes] = await Promise.all([
    (() => {
        let q = supabaseECO4.from('ECO4_Leads').select('*', { count: 'exact', head: true });
        if (!isAllTime) q = q.gte('Lead_Created_Date', start).lte('Lead_Created_Date', end);
        return q;
    })(),
    (() => {
        let q = supabaseECO4.from('ECO4_Leads').select('*', { count: 'exact', head: true });
        if (!isAllTime) q = q.gte('Survey_Date', start).lte('Survey_Date', end);
        else q = q.not('Survey_Date', 'is', null);
        return q;
    })(),
    (() => {
        let q = supabaseECO4.from('ECO4_Leads').select('*', { count: 'exact', head: true });
        if (!isAllTime) q = q.gte('Install_Date', start).lte('Install_Date', end);
        else q = q.not('Install_Date', 'is', null);
        return q;
    })(),
    (() => {
        let q = supabaseECO4.from('ECO4_Leads').select('*', { count: 'exact', head: true }).eq('Overall_Status', 'PAID');
        if (!isAllTime) q = q.gte('Valour_Paid_Date', start).lte('Valour_Paid_Date', end);
        else q = q.not('Valour_Paid_Date', 'is', null);
        return q;
    })(),
    // We need to fetch revenue data rows because Sum requires logic or specific columns
    fetchAllPages('ECO4_Leads', 'Payment_Total_Net', 'Valour_Paid_Date', startDate, endDate, isAllTime, (q) => q.eq('Overall_Status', 'PAID'))
  ]);

  const leadsCount = leadsRes.count || 0;
  const surveysCount = surveysRes.count || 0;
  const installsCount = installsRes.count || 0;
  const paidCount = paidRes.count || 0;
  const revenue = revenueRes.reduce((sum, row) => sum + parseCurrency(row.Payment_Total_Net), 0);

  return { leadsCount, surveysCount, installsCount, paidCount, revenue };
};

// Added to satisfy common service interface
export const fetchLeaderboardStats = async (): Promise<LeaderboardEntry[]> => {
  // ECO4 leads don't currently track Field_Rep in the same way.
  return [];
};

// Added to satisfy common service interface
export const fetchAccountManagerLeaderboard = async (startDate?: Date, endDate?: Date): Promise<LeaderboardEntry[]> => {
  // ECO4 leads don't currently track Account_Manager.
  return [];
};

export const fetchSixMonthTrend = async (): Promise<MonthlyActivity[]> => {
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 5);
  startDate.setDate(1);
  startDate.setHours(0, 0, 0, 0);

  try {
    const [leadsData, surveysData, installsData, paidData] = await Promise.all([
      supabaseECO4.from('ECO4_Leads').select('Lead_Created_Date').gte('Lead_Created_Date', startDate.toISOString()).range(0, 49999),
      supabaseECO4.from('ECO4_Leads').select('Survey_Date').gte('Survey_Date', startDate.toISOString()).range(0, 49999),
      supabaseECO4.from('ECO4_Leads').select('Install_Date').gte('Install_Date', startDate.toISOString()).range(0, 49999),
      supabaseECO4.from('ECO4_Leads').select('Valour_Paid_Date').eq('Overall_Status', 'PAID').gte('Valour_Paid_Date', startDate.toISOString()).range(0, 49999)
    ]);

    const monthlyData: Record<string, MonthlyActivity> = {};
    for (let i = 0; i < 6; i++) {
      const d = new Date(startDate);
      d.setMonth(d.getMonth() + i);
      const key = d.toLocaleString('default', { month: 'short' });
      monthlyData[key] = { month: key, leads: 0, surveys: 0, installs: 0, paid: 0 };
    }

    leadsData.data?.forEach(row => {
      const m = new Date(row.Lead_Created_Date).toLocaleString('default', { month: 'short' });
      if (monthlyData[m]) monthlyData[m].leads++;
    });
    surveysData.data?.forEach(row => {
      const m = new Date(row.Survey_Date).toLocaleString('default', { month: 'short' });
      if (monthlyData[m]) monthlyData[m].surveys++;
    });
    installsData.data?.forEach(row => {
      const m = new Date(row.Install_Date).toLocaleString('default', { month: 'short' });
      if (monthlyData[m]) monthlyData[m].installs++;
    });
    paidData.data?.forEach(row => {
      const m = new Date(row.Valour_Paid_Date).toLocaleString('default', { month: 'short' });
      if (monthlyData[m]) monthlyData[m].paid++;
    });

    return Object.values(monthlyData);
  } catch (err) {
    return [];
  }
};

export const fetchRevenueTrend = async (): Promise<RevenueTrendData[]> => {
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 5);
  startDate.setDate(1);

  try {
    const { data, error } = await supabaseECO4
      .from('ECO4_Leads')
      .select('Valour_Paid_Date, Payment_Total_Net')
      .eq('Overall_Status', 'PAID')
      .gte('Valour_Paid_Date', startDate.toISOString())
      .range(0, 49999);

    if (error) return [];

    const trend: Record<string, number> = {};
    for (let i = 0; i < 6; i++) {
      const d = new Date(startDate);
      d.setMonth(d.getMonth() + i);
      const key = d.toLocaleString('default', { month: 'short' });
      trend[key] = 0;
    }

    data?.forEach(row => {
      if (row.Valour_Paid_Date) {
        const month = new Date(row.Valour_Paid_Date).toLocaleString('default', { month: 'short' });
        if (trend[month] !== undefined) {
          trend[month] += parseCurrency(row.Payment_Total_Net);
        }
      }
    });

    return Object.entries(trend).map(([month, revenue]) => ({ month, revenue }));
  } catch (err) {
    return [];
  }
};

export const fetchLeadSourceStats = async (startDate: Date, endDate: Date): Promise<LeadSourceStat[]> => {
  const isAllTime = startDate.getFullYear() === 2020;

  try {
    const [leads, paidLeads] = await Promise.all([
      fetchAllPages('ECO4_Leads', 'Lead_Generation', 'Lead_Created_Date', startDate, endDate, isAllTime),
      fetchAllPages('ECO4_Leads', 'Lead_Generation', 'Valour_Paid_Date', startDate, endDate, isAllTime, (q) => q.eq('Overall_Status', 'PAID'))
    ]);
    
    const stats: Record<string, { total: number; paid: number }> = {};
    const normalize = (val: any) => val ? String(val).trim() : 'Unknown';

    leads.forEach((row: any) => {
      const source = normalize(row.Lead_Generation);
      if (!stats[source]) stats[source] = { total: 0, paid: 0 };
      stats[source].total++;
    });

    paidLeads.forEach((row: any) => {
      const source = normalize(row.Lead_Generation);
      if (!stats[source]) stats[source] = { total: 0, paid: 0 };
      stats[source].paid++;
    });

    const totalVolume = leads.length;

    return Object.entries(stats).map(([source, counts]) => ({
      source,
      count: counts.total,
      percentage: totalVolume > 0 ? (counts.total / totalVolume) * 100 : 0,
      conversion: Math.min(counts.total > 0 ? (counts.paid / counts.total) * 100 : 0, 100)
    })).sort((a, b) => b.count - a.count);
  } catch (err) {
    return [];
  }
};

export const fetchInstallerPerformance = async (startDate: Date, endDate: Date): Promise<InstallerStat[]> => {
  try {
    const isAllTime = startDate.getFullYear() === 2020;

    const [leadsRows, surveysRows, installsRows, financialsRows] = await Promise.all([
      fetchAllPages('ECO4_Leads', 'Current_Installer', 'Lead_Created_Date', startDate, endDate, isAllTime),
      fetchAllPages('ECO4_Leads', 'Current_Installer', 'Survey_Date', startDate, endDate, isAllTime),
      fetchAllPages('ECO4_Leads', 'Current_Installer', 'Install_Date', startDate, endDate, isAllTime),
      fetchAllPages('ECO4_Leads', 'Current_Installer, Payment_Total_Net', 'Valour_Paid_Date', startDate, endDate, isAllTime, (q) => q.eq('Overall_Status', 'PAID'))
    ]);

    const stats: Record<string, InstallerStat> = {};
    const normalize = (name: any) => name ? String(name).trim() : 'Unassigned';

    const getStat = (name: string) => {
      if (!stats[name]) {
        stats[name] = {
          name, leads: 0, surveys: 0, installs: 0, paid: 0, revenue: 0,
          leadToPaidRate: 0, avgRevenuePerLead: 0, leadToSurveyRate: 0,
          surveyToInstallRate: 0, installToPaidRate: 0
        };
      }
      return stats[name];
    };

    leadsRows.forEach(r => getStat(normalize(r.Current_Installer)).leads++);
    surveysRows.forEach(r => getStat(normalize(r.Current_Installer)).surveys++);
    installsRows.forEach(r => getStat(normalize(r.Current_Installer)).installs++);
    financialsRows.forEach(r => {
      const s = getStat(normalize(r.Current_Installer));
      s.paid++;
      s.revenue += parseCurrency(r.Payment_Total_Net);
    });

    return Object.values(stats).map(stat => {
        const lCount = stat.leads || 0;
        const sCount = stat.surveys || 0;
        const iCount = stat.installs || 0;
        const pCount = stat.paid || 0;
        const rev = stat.revenue || 0;
        
        return {
            ...stat,
            leadToPaidRate: Math.min(lCount > 0 ? (pCount / lCount) * 100 : 0, 100),
            avgRevenuePerLead: lCount > 0 ? rev / lCount : 0,
            leadToSurveyRate: Math.min(lCount > 0 ? (sCount / lCount) * 100 : 0, 100),
            surveyToInstallRate: Math.min(sCount > 0 ? (iCount / sCount) * 100 : 0, 100),
            installToPaidRate: Math.min(iCount > 0 ? (pCount / iCount) * 100 : 0, 100)
        };
    }).sort((a, b) => b.revenue - a.revenue);

  } catch (err) {
    console.error("Exception in fetchInstallerPerformance:", err);
    return [];
  }
};

export const fetchFinancialData = async (startDate: Date, endDate: Date) => {
  const isAllTime = startDate.getFullYear() === 2020;
  const start = startDate.toISOString();
  const end = endDate.toISOString();

  const [expensesRes, leadsRes, surveysRes, installsRes, revenueRes] = await Promise.all([
    supabase.schema('finances').from('expenses').select('*').gte('transaction_date', start).lte('transaction_date', end).range(0, 9999),
    fetchAllPages('ECO4_Leads', 'id', 'Lead_Created_Date', startDate, endDate, isAllTime),
    fetchAllPages('ECO4_Leads', 'id', 'Survey_Date', startDate, endDate, isAllTime),
    fetchAllPages('ECO4_Leads', 'id', 'Install_Date', startDate, endDate, isAllTime),
    fetchAllPages('ECO4_Leads', 'Overall_Status, Payment_Total_Net', 'Valour_Paid_Date', startDate, endDate, isAllTime, (q) => q.eq('Overall_Status', 'PAID'))
  ]);

  const expenseData = (expensesRes.data as Expense[]) || [];
  const totalExpenses = expenseData.reduce((sum, e) => sum + (e.amount || 0), 0);
  
  const totalRevenue = revenueRes.reduce((sum, row) => sum + parseCurrency(row.Payment_Total_Net), 0);
  const netProfit = totalRevenue - totalExpenses;
  const margin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  const leadsCount = leadsRes.length;
  const surveysCount = surveysRes.length;
  const installsCount = installsRes.length;
  const paidCount = revenueRes.length;

  const eco4Metrics: CostPerMetric = {
    cpl: leadsCount > 0 ? totalExpenses / leadsCount : 0,
    cps: surveysCount > 0 ? totalExpenses / surveysCount : 0,
    cpi: installsCount > 0 ? totalExpenses / installsCount : 0
  };

  const expenseBreakdown = ['Field', 'Online', 'Split', 'Salaries', 'Software', 'Other'].map(type => {
    const amount = expenseData.filter(e => e.expense_type === type).reduce((s, e) => s + e.amount, 0);
    return {
      type, amount,
      percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0
    };
  }).sort((a, b) => b.amount - a.amount);

  const sourceBreakdown = [
    {
      source: 'ECO4',
      leads: leadsCount,
      paid: paidCount,
      revenue: totalRevenue,
      conversion: Math.min(leadsCount > 0 ? (paidCount / leadsCount) * 100 : 0, 100)
    }
  ];

  return {
    summary: { revenue: totalRevenue, expenses: totalExpenses, netProfit, margin },
    fieldMetrics: eco4Metrics,
    onlineMetrics: eco4Metrics,
    expenseBreakdown,
    sourceBreakdown
  };
};

export const fetchFinancialTrend = async (): Promise<FinancialTrend[]> => {
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 5);
  startDate.setDate(1);

  const [revRes, expRes] = await Promise.all([
    supabaseECO4.from('ECO4_Leads').select('Valour_Paid_Date, Payment_Total_Net').eq('Overall_Status', 'PAID').gte('Valour_Paid_Date', startDate.toISOString()).range(0, 49999),
    supabase.schema('finances').from('expenses').select('transaction_date, amount').gte('transaction_date', startDate.toISOString()).range(0, 9999)
  ]);

  const finalTrend: Record<string, FinancialTrend> = {};
  for (let i = 0; i < 6; i++) {
     const d = new Date(startDate);
     d.setMonth(d.getMonth() + i);
     const key = d.toLocaleString('default', { month: 'short' });
     finalTrend[key] = { month: key, revenue: 0, expenses: 0, netProfit: 0 };
  }

  revRes.data?.forEach(row => {
    const m = new Date(row.Valour_Paid_Date).toLocaleString('default', { month: 'short' });
    if (finalTrend[m]) finalTrend[m].revenue += parseCurrency(row.Payment_Total_Net);
  });

  expRes.data?.forEach(e => {
    const m = new Date(e.transaction_date).toLocaleString('default', { month: 'short' });
    if (finalTrend[m]) finalTrend[m].expenses += (e.amount || 0);
  });

  Object.values(finalTrend).forEach(t => {
    t.netProfit = t.revenue - t.expenses;
  });

  return Object.values(finalTrend);
};
