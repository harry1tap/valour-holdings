
import { supabase, supabaseECO4 } from '../supabaseClient';
import { SolarLead, UserProfile, LeaderboardEntry, MonthlyActivity, RevenueTrendData, LeadSourceStat, CostPerMetric, FinancialTrend, Expense, InstallerStat } from '../types';

// Helper to parse currency strings (e.g. "£1,200.00")
const parseCurrency = (val: any): number => {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  return parseFloat(val.toString().replace(/[£,]/g, '') || '0');
};

// Helper to map new ECO4 Accounts columns to SolarLead interface
const mapECO4ToLead = (row: any): SolarLead => ({
  id: row.id || Math.floor(Math.random() * 1000000), // Fallback ID if not present
  Created_At: row['Paid Date'], // Use Paid Date as the primary timestamp
  Customer_Name: row['Customer Name'] || row['Address'] || 'ECO4 Customer',
  Customer_Tel: null,
  Customer_Email: null,
  First_Line_Of_Address: row['Address'],
  Postcode: row['Postcode'],
  Property_Type: null,
  Lead_Source: 'ECO4', 
  Field_Rep: null, // Column does not exist in Accounts table
  Account_Manager: null, // Column does not exist in Accounts table
  Installer: row['Installer'],
  Status: 'Paid', // All records in Accounts table with Paid Date are considered Paid
  Survey_Booked_Date: row['Paid Date'], // Assumed complete
  Survey_Complete_Date: row['Paid Date'],
  Install_Booked_Date: row['Paid Date'], // Assumed complete
  Paid_Date: row['Paid Date'],
  Lead_Cost: null,
  Lead_Revenue: parseCurrency(row['Payment Total (Net)']),
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
  // Authorization Logic for ECO4 Accounts Table:
  // Since "Field Rep" and "Account Manager" columns do not exist in the Accounts table,
  // we cannot filter data for specific reps.
  // To protect data privacy, we only return data for Admins.
  
  if (user.role !== 'admin') {
    console.warn("ECO4: Access denied. Non-admin users cannot view ECO4 Accounts data (missing Rep columns).");
    return [];
  }

  // ECO4 Filter Logic: Use "Paid Date" in "accounts"."Accounts"
  // This view is "Recent Leads" which effectively implies "Recent Paid Deals" for ECO4 currently
  let query = supabaseECO4
    .schema('accounts')
    .from('Accounts')
    .select('*')
    .gte('Paid Date', startDate.toISOString())
    .lte('Paid Date', endDate.toISOString());

  // NOTE: Cannot filter by Field Rep or Account Manager as columns don't exist.
  // if (selectedRepFilter) ...

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching ECO4 leads:", JSON.stringify(error, null, 2));
    throw error;
  }

  return (data || []).map(mapECO4ToLead);
};

export const fetchKPIMetrics = async (
  user: UserProfile,
  startDate: Date,
  endDate: Date,
  selectedRepFilter?: string | null
) => {
  // Since we cannot filter by Rep, non-admins get 0s.
  if (user.role !== 'admin') {
    return { leadsCount: 0, surveysCount: 0, installsCount: 0, paidCount: 0, revenue: 0 };
  }

  // 1. Fetch Pipeline Counts from public.ECO4_Leads
  // Used for: Leads, Surveys, Installs
  const { data: leadsData, error: leadsError } = await supabaseECO4
    .from('ECO4_Leads')
    .select('Lead_Created_Date, Survey_Date, Install_Date')
    .gte('Lead_Created_Date', startDate.toISOString())
    .lte('Lead_Created_Date', endDate.toISOString());

  if (leadsError) {
     console.error('Error fetching ECO4_Leads pipeline:', JSON.stringify(leadsError, null, 2));
  }

  // 2. Fetch Financials from accounts.Accounts (Activity based)
  // Used for: Paid Count, Revenue
  let accountsQuery = supabaseECO4
    .schema('accounts')
    .from('Accounts')
    .select('Payment Total (Net)')
    .gte('Paid Date', startDate.toISOString())
    .lte('Paid Date', endDate.toISOString());

  const { data: accountsData, error: accountsError } = await accountsQuery;

  if (accountsError) {
    console.error('Error fetching ECO4 KPI metrics (Accounts):', JSON.stringify(accountsError, null, 2));
  }

  // Calculate Metrics
  const leadsCount = leadsData?.length || 0;
  // Cohort analysis: Count surveys/installs associated with the leads created in this period
  // (Or activity if interpreted differently, but standard is cohort for funnel)
  const surveysCount = leadsData?.filter(l => l.Survey_Date).length || 0;
  const installsCount = leadsData?.filter(l => l.Install_Date).length || 0;

  const paidCount = accountsData?.length || 0;
  const revenue = accountsData?.reduce((sum, row) => {
    return sum + parseCurrency(row['Payment Total (Net)']);
  }, 0) || 0;

  console.log(`ECO4 Metrics: Leads=${leadsCount}, Surveys=${surveysCount}, Installs=${installsCount}, Paid=${paidCount}, Revenue=${revenue}`);

  return {
    leadsCount,
    surveysCount,
    installsCount,
    paidCount,
    revenue
  };
};

export const fetchLeaderboardStats = async (): Promise<LeaderboardEntry[]> => {
  // Cannot generate leaderboard without Field Rep column.
  console.log("ECO4: Leaderboard unavailable (missing Field Rep column)");
  return [];
};

export const fetchAccountManagerLeaderboard = async (startDate?: Date, endDate?: Date): Promise<LeaderboardEntry[]> => {
  // Cannot generate leaderboard without Account Manager column.
  console.log("ECO4: AM Leaderboard unavailable (missing Account Manager column)");
  return [];
};

export const fetchSixMonthTrend = async (): Promise<MonthlyActivity[]> => {
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 5);
  startDate.setDate(1);

  // 1. Fetch Pipeline Data (ECO4_Leads)
  const { data: leadsData, error: leadsError } = await supabaseECO4
    .from('ECO4_Leads')
    .select('Lead_Created_Date, Survey_Date, Install_Date')
    .gte('Lead_Created_Date', startDate.toISOString());

  if (leadsError) {
    console.error('Error fetching ECO4 6-month trend (Leads):', JSON.stringify(leadsError, null, 2));
  }

  // 2. Fetch Paid Data (Accounts)
  const { data: accountsData, error: accountsError } = await supabaseECO4
    .schema('accounts')
    .from('Accounts')
    .select('Paid Date')
    .gte('Paid Date', startDate.toISOString());

  if (accountsError) {
    console.error('Error fetching ECO4 6-month trend (Accounts):', JSON.stringify(accountsError, null, 2));
  }

  const monthlyData: Record<string, MonthlyActivity> = {};
  
  for (let i = 0; i < 6; i++) {
    const d = new Date(startDate);
    d.setMonth(d.getMonth() + i);
    const key = d.toLocaleString('default', { month: 'short' });
    monthlyData[key] = { month: key, leads: 0, surveys: 0, installs: 0, paid: 0 };
  }

  // Aggregate Pipeline (Activity-based grouping for trend consistency)
  leadsData?.forEach(row => {
    // Lead Created
    if (row.Lead_Created_Date) {
      const m = new Date(row.Lead_Created_Date).toLocaleString('default', { month: 'short' });
      if (monthlyData[m]) monthlyData[m].leads++;
    }
    // Survey (Activity)
    if (row.Survey_Date) {
      const m = new Date(row.Survey_Date).toLocaleString('default', { month: 'short' });
      if (monthlyData[m]) monthlyData[m].surveys++;
    }
    // Install (Activity)
    if (row.Install_Date) {
      const m = new Date(row.Install_Date).toLocaleString('default', { month: 'short' });
      if (monthlyData[m]) monthlyData[m].installs++;
    }
  });

  // Aggregate Paid
  accountsData?.forEach(row => {
    const paidDate = row['Paid Date'];
    if (paidDate) {
      const month = new Date(paidDate).toLocaleString('default', { month: 'short' });
      if (monthlyData[month]) monthlyData[month].paid++;
    }
  });

  return Object.values(monthlyData);
};

export const fetchRevenueTrend = async (): Promise<RevenueTrendData[]> => {
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 5);
  startDate.setDate(1);

  const { data, error } = await supabaseECO4
    .schema('accounts')
    .from('Accounts')
    .select('*')
    .gte('Paid Date', startDate.toISOString());

  if (error) {
    console.error('Error fetching ECO4 revenue trend:', JSON.stringify(error, null, 2));
    return [];
  }

  const trend: Record<string, number> = {};
  
  for (let i = 0; i < 6; i++) {
    const d = new Date(startDate);
    d.setMonth(d.getMonth() + i);
    const key = d.toLocaleString('default', { month: 'short' });
    trend[key] = 0;
  }

  data.forEach(row => {
    const paidDate = row['Paid Date'];
    if (paidDate) {
      const month = new Date(paidDate).toLocaleString('default', { month: 'short' });
      if (trend[month] !== undefined) {
        trend[month] += parseCurrency(row['Payment Total (Net)']);
      }
    }
  });

  return Object.entries(trend).map(([month, revenue]) => ({ month, revenue }));
};

export const fetchLeadSourceStats = async (startDate: Date, endDate: Date): Promise<LeadSourceStat[]> => {
  // Use ECO4_Leads for Total Leads count to accurate Conversion
  const { data: leadsData } = await supabaseECO4
    .from('ECO4_Leads')
    .select('Lead_Created_Date')
    .gte('Lead_Created_Date', startDate.toISOString())
    .lte('Lead_Created_Date', endDate.toISOString());

  // Use Accounts for Paid count
  const { data: accountsData } = await supabaseECO4
    .schema('accounts')
    .from('Accounts')
    .select('Paid Date')
    .gte('Paid Date', startDate.toISOString())
    .lte('Paid Date', endDate.toISOString());

  const leadsCount = leadsData?.length || 0;
  const paidCount = accountsData?.length || 0;

  // Since we only have one source "ECO4", we calculate aggregate conversion
  const conversion = leadsCount > 0 ? (paidCount / leadsCount) * 100 : 0;

  return [{
    source: 'ECO4',
    count: leadsCount,
    percentage: 100,
    conversion: conversion
  }];
};

export const fetchInstallerPerformance = async (startDate: Date, endDate: Date): Promise<InstallerStat[]> => {
  const { data, error } = await supabaseECO4
    .schema('accounts')
    .from('Accounts')
    .select('*')
    .gte('Paid Date', startDate.toISOString())
    .lte('Paid Date', endDate.toISOString());

  if (error || !data) {
    console.error('Error fetching ECO4 installer data:', JSON.stringify(error, null, 2));
    return [];
  }

  const stats: Record<string, InstallerStat> = {};

  data.forEach((row) => {
    const installer = row['Installer'] || 'Unassigned';
    if (!stats[installer]) {
      stats[installer] = {
        name: installer,
        leads: 0,
        surveys: 0,
        installs: 0,
        paid: 0,
        revenue: 0,
        leadToPaidRate: 0,
        avgRevenuePerLead: 0,
        leadToSurveyRate: 0,
        surveyToInstallRate: 0,
        installToPaidRate: 0
      };
    }

    const revenue = parseCurrency(row['Payment Total (Net)']);

    // Since we only check Accounts (Paid), all these are Paid deals.
    // Leads/Surveys/Installs for Installer performance are derived from Paid set only.
    // We cannot join with ECO4_Leads for installer accuracy without Installer column in Leads table.
    stats[installer].leads++;
    stats[installer].surveys++;
    stats[installer].installs++;
    stats[installer].paid++;
    stats[installer].revenue += revenue;
  });

  return Object.values(stats).map(stat => {
    const leads = stat.leads || 1;
    
    return {
      ...stat,
      leadToPaidRate: 100, // Accounts are all paid
      avgRevenuePerLead: stat.revenue / leads,
      leadToSurveyRate: 100,
      surveyToInstallRate: 100,
      installToPaidRate: 100
    };
  }).sort((a, b) => b.revenue - a.revenue);
};

export const fetchFinancialData = async (startDate: Date, endDate: Date) => {
  // 1. Fetch Expenses from SOLAR DB (Expenses are shared or solar specific, assuming shared for now)
  const { data: expenses, error: expenseError } = await supabase
    .schema('finances')
    .from('expenses')
    .select('*')
    .gte('transaction_date', startDate.toISOString())
    .lte('transaction_date', endDate.toISOString());
  
  if (expenseError) console.error("Expense Fetch Error:", JSON.stringify(expenseError, null, 2));

  // 2. Fetch ECO4 Leads (for Counts/CPL)
  const { data: leadsData, error: leadsError } = await supabaseECO4
    .from('ECO4_Leads')
    .select('Lead_Created_Date, Survey_Date, Install_Date')
    .gte('Lead_Created_Date', startDate.toISOString())
    .lte('Lead_Created_Date', endDate.toISOString());
  
  if (leadsError) console.error("ECO4 Leads Fetch Error", JSON.stringify(leadsError, null, 2));

  // 3. Fetch ECO4 Accounts (Revenue/Paid)
  const { data: accounts, error: accountsError } = await supabaseECO4
    .schema('accounts')
    .from('Accounts')
    .select('*')
    .gte('Paid Date', startDate.toISOString())
    .lte('Paid Date', endDate.toISOString());

  if (accountsError) console.error("ECO4 Accounts Fetch Error", JSON.stringify(accountsError, null, 2));

  const expenseData = (expenses as Expense[]) || [];
  const accountsData = accounts || [];
  const leadsCount = leadsData?.length || 0;
  const surveysCount = leadsData?.filter(l => l.Survey_Date).length || 0;
  const installsCount = leadsData?.filter(l => l.Install_Date).length || 0;
  const paidCount = accountsData.length;

  // --- Calculate Totals ---
  const totalRevenue = accountsData.reduce((sum, row) => sum + parseCurrency(row['Payment Total (Net)']), 0);
  const totalExpenses = expenseData.reduce((sum, e) => sum + (e.amount || 0), 0);
  const netProfit = totalRevenue - totalExpenses;
  const margin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  // --- Cost Per Metrics ---
  const eco4Metrics: CostPerMetric = {
    cpl: leadsCount > 0 ? totalExpenses / leadsCount : 0,
    cps: surveysCount > 0 ? totalExpenses / surveysCount : 0,
    cpi: installsCount > 0 ? totalExpenses / installsCount : 0
  };

  const expenseTypes = ['Field', 'Online', 'Split', 'Salaries', 'Software', 'Other'];
  const expenseBreakdown = expenseTypes.map(type => {
    const amount = expenseData.filter(e => e.expense_type === type).reduce((s, e) => s + e.amount, 0);
    return {
      type,
      amount,
      percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0
    };
  }).sort((a, b) => b.amount - a.amount);

  const sourceBreakdown = [
    {
      source: 'ECO4',
      leads: leadsCount,
      paid: paidCount,
      revenue: totalRevenue,
      conversion: leadsCount > 0 ? (paidCount / leadsCount) * 100 : 0
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

  // Rev using Paid Date
  const { data: revData, error: revError } = await supabaseECO4
    .schema('accounts')
    .from('Accounts')
    .select('*')
    .gte('Paid Date', startDate.toISOString());
    
  if (revError) console.error("ECO4 Trend Error:", JSON.stringify(revError, null, 2));

  // Expenses from Solar DB
  const { data: expData } = await supabase
    .schema('finances')
    .from('expenses')
    .select('transaction_date, amount')
    .gte('transaction_date', startDate.toISOString());

  const trend: Record<string, FinancialTrend> = {};

  for (let i = 0; i < 6; i++) {
    const d = new Date(startDate);
    d.setMonth(d.getMonth() + i);
    const key = d.toLocaleString('default', { month: 'short' });
    trend[key] = { month: key, revenue: 0, expenses: 0, netProfit: 0 };
  }

  revData?.forEach(row => {
    const paidDate = row['Paid Date'];
    if (paidDate) {
      const m = new Date(paidDate).toLocaleString('default', { month: 'short' });
      if (trend[m]) trend[m].revenue += parseCurrency(row['Payment Total (Net)']);
    }
  });

  expData?.forEach(e => {
    if (e.transaction_date) {
      const m = new Date(e.transaction_date).toLocaleString('default', { month: 'short' });
      if (trend[m]) trend[m].expenses += (e.amount || 0);
    }
  });

  Object.values(trend).forEach(t => {
    t.netProfit = t.revenue - t.expenses;
  });

  return Object.values(trend);
};
