
import { supabase } from '../supabaseClient';
import { SolarLead, UserProfile, LeaderboardEntry, MonthlyActivity, RevenueTrendData, LeadSourceStat, FinancialSummary, CostPerMetric, FinancialTrend, Expense, InstallerStat } from '../types';

export const fetchUserProfile = async (email: string): Promise<UserProfile | null> => {
  const { data, error } = await supabase
    .schema('finances')
    .from('users')
    .select('*')
    .eq('email', email)
    .single();

  if (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
  return data as UserProfile;
};

export const fetchAllReps = async (): Promise<string[]> => {
  const { data, error } = await supabase
    .schema('finances')
    .from('users')
    .select('name')
    .eq('role', 'field_rep');
    
  if (error) {
    console.error('Error fetching reps:', error);
    return [];
  }
  return data.map((u: any) => u.name);
};

export const fetchLeads = async (
  user: UserProfile,
  startDate: Date,
  endDate: Date,
  selectedRepFilter?: string | null
): Promise<SolarLead[]> => {
  let query = supabase
    .schema('solar')
    .from('solar_leads')
    .select('*')
    .gte('Created_At', startDate.toISOString())
    .lte('Created_At', endDate.toISOString());

  // Authorization Logic
  if (user.role === 'field_rep') {
    query = query.eq('Field_Rep', user.name);
  } else if (user.role === 'admin') {
    if (selectedRepFilter) {
      query = query.eq('Field_Rep', selectedRepFilter);
    }
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data as SolarLead[]) || [];
};

export const fetchKPIMetrics = async (
  user: UserProfile,
  startDate: Date,
  endDate: Date,
  selectedRepFilter?: string | null
) => {
  const applyFilter = (query: any) => {
    if (user.role === 'field_rep') {
      return query.eq('Field_Rep', user.name);
    } else if (user.role === 'admin' && selectedRepFilter) {
      return query.eq('Field_Rep', selectedRepFilter);
    }
    return query;
  };

  // 1. Leads Created in period
  const leadsQuery = applyFilter(
    supabase.schema('solar').from('solar_leads').select('*', { count: 'exact', head: true })
      .gte('Created_At', startDate.toISOString())
      .lte('Created_At', endDate.toISOString())
  );

  // 2. Surveys Booked in period
  const surveysQuery = applyFilter(
    supabase.schema('solar').from('solar_leads').select('*', { count: 'exact', head: true })
      .gte('Survey_Booked_Date', startDate.toISOString())
      .lte('Survey_Booked_Date', endDate.toISOString())
  );

  // 3. Installs Booked in period
  const installsQuery = applyFilter(
    supabase.schema('solar').from('solar_leads').select('*', { count: 'exact', head: true })
      .gte('Install_Booked_Date', startDate.toISOString())
      .lte('Install_Booked_Date', endDate.toISOString())
  );

  // 4. Paid in period
  const paidQuery = applyFilter(
    supabase.schema('solar').from('solar_leads').select('*', { count: 'exact', head: true })
      .eq('Status', 'Paid')
      .gte('Paid_Date', startDate.toISOString())
      .lte('Paid_Date', endDate.toISOString())
  );

  // 5. Revenue in period (Only for admin view, but we can return it safely)
  // Need to fetch data to sum it, as Supabase count doesn't sum
  const revenueQuery = applyFilter(
    supabase.schema('solar').from('solar_leads').select('Lead_Revenue')
      .eq('Status', 'Paid')
      .gte('Paid_Date', startDate.toISOString())
      .lte('Paid_Date', endDate.toISOString())
  );

  const [leads, surveys, installs, paid, revenueRes] = await Promise.all([
    leadsQuery, surveysQuery, installsQuery, paidQuery, revenueQuery
  ]);

  const revenue = revenueRes.data?.reduce((sum, item) => sum + (item.Lead_Revenue || 0), 0) || 0;

  return {
    leadsCount: leads.count || 0,
    surveysCount: surveys.count || 0,
    installsCount: installs.count || 0,
    paidCount: paid.count || 0,
    revenue
  };
};

export const fetchLeaderboardStats = async (): Promise<LeaderboardEntry[]> => {
  // Fetch ALL leads to calculate global ranking
  const { data, error } = await supabase
    .schema('solar')
    .from('solar_leads')
    .select('Field_Rep, Status, Install_Booked_Date, Paid_Date')
    .not('Field_Rep', 'is', null);

  if (error) {
    console.error('Error fetching leaderboard data:', error);
    return [];
  }

  const repStats: Record<string, LeaderboardEntry> = {};

  (data as any[]).forEach((lead) => {
    const rep = lead.Field_Rep;
    if (!rep) return;

    if (!repStats[rep]) {
      repStats[rep] = { name: rep, leads: 0, installs: 0, paid: 0, conversion: 0 };
    }

    repStats[rep].leads++;
    if (lead.Install_Booked_Date) repStats[rep].installs++;
    if (lead.Status === 'Paid') repStats[rep].paid++;
  });

  // Calculate conversion and format array
  const leaderboard = Object.values(repStats).map(stat => ({
    ...stat,
    conversion: stat.leads > 0 ? (stat.paid / stat.leads) * 100 : 0
  }));

  // Sort by Paid descending
  return leaderboard.sort((a, b) => b.paid - a.paid).slice(0, 10);
};

export const fetchAccountManagerLeaderboard = async (): Promise<LeaderboardEntry[]> => {
  const { data, error } = await supabase
    .schema('solar')
    .from('solar_leads')
    .select('Account_Manager, Status, Install_Booked_Date, Paid_Date')
    .not('Account_Manager', 'is', null);

  if (error) return [];

  const amStats: Record<string, LeaderboardEntry> = {};

  (data as any[]).forEach((lead) => {
    const am = lead.Account_Manager;
    if (!am) return;

    if (!amStats[am]) {
      amStats[am] = { name: am, leads: 0, installs: 0, paid: 0, conversion: 0 };
    }

    amStats[am].leads++;
    if (lead.Install_Booked_Date) amStats[am].installs++;
    if (lead.Status === 'Paid') amStats[am].paid++;
  });

  const leaderboard = Object.values(amStats).map(stat => ({
    ...stat,
    conversion: stat.leads > 0 ? (stat.paid / stat.leads) * 100 : 0
  }));

  return leaderboard.sort((a, b) => b.paid - a.paid).slice(0, 5);
};

export const fetchSixMonthTrend = async (): Promise<MonthlyActivity[]> => {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 5);
  startDate.setDate(1); // Start of 6 months ago

  const { data, error } = await supabase
    .schema('solar')
    .from('solar_leads')
    .select('Created_At, Survey_Booked_Date, Install_Booked_Date, Paid_Date, Status')
    .gte('Created_At', startDate.toISOString());

  if (error) return [];

  // Group by month
  const monthlyData: Record<string, MonthlyActivity> = {};
  
  // Initialize last 6 months
  for (let i = 0; i < 6; i++) {
    const d = new Date(startDate);
    d.setMonth(d.getMonth() + i);
    const key = d.toLocaleString('default', { month: 'short' });
    monthlyData[key] = { month: key, leads: 0, surveys: 0, installs: 0, paid: 0 };
  }

  (data as any[]).forEach(lead => {
    // Leads (Created_At)
    const createdMonth = new Date(lead.Created_At).toLocaleString('default', { month: 'short' });
    if (monthlyData[createdMonth]) monthlyData[createdMonth].leads++;

    // Surveys
    if (lead.Survey_Booked_Date) {
      const sMonth = new Date(lead.Survey_Booked_Date).toLocaleString('default', { month: 'short' });
      if (monthlyData[sMonth]) monthlyData[sMonth].surveys++;
    }

    // Installs
    if (lead.Install_Booked_Date) {
      const iMonth = new Date(lead.Install_Booked_Date).toLocaleString('default', { month: 'short' });
      if (monthlyData[iMonth]) monthlyData[iMonth].installs++;
    }

    // Paid
    if (lead.Status === 'Paid' && lead.Paid_Date) {
      const pMonth = new Date(lead.Paid_Date).toLocaleString('default', { month: 'short' });
      if (monthlyData[pMonth]) monthlyData[pMonth].paid++;
    }
  });

  return Object.values(monthlyData);
};

export const fetchRevenueTrend = async (): Promise<RevenueTrendData[]> => {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 5);
  startDate.setDate(1);

  const { data, error } = await supabase
    .schema('solar')
    .from('solar_leads')
    .select('Paid_Date, Lead_Revenue, Status')
    .eq('Status', 'Paid')
    .gte('Paid_Date', startDate.toISOString());

  if (error) return [];

  const trend: Record<string, number> = {};
  
  // Initialize
  for (let i = 0; i < 6; i++) {
    const d = new Date(startDate);
    d.setMonth(d.getMonth() + i);
    const key = d.toLocaleString('default', { month: 'short' });
    trend[key] = 0;
  }

  data.forEach(lead => {
    if (lead.Paid_Date) {
      const month = new Date(lead.Paid_Date).toLocaleString('default', { month: 'short' });
      if (trend[month] !== undefined) {
        trend[month] += (lead.Lead_Revenue || 0);
      }
    }
  });

  return Object.entries(trend).map(([month, revenue]) => ({ month, revenue }));
};

export const fetchLeadSourceStats = async (startDate: Date, endDate: Date): Promise<LeadSourceStat[]> => {
  const { data, error } = await supabase
    .schema('solar')
    .from('solar_leads')
    .select('Lead_Source, Status')
    .gte('Created_At', startDate.toISOString())
    .lte('Created_At', endDate.toISOString());

  if (error) return [];

  const stats: Record<string, { count: number, paid: number }> = {};
  const total = data.length;

  data.forEach(lead => {
    const source = lead.Lead_Source || 'Unknown';
    if (!stats[source]) stats[source] = { count: 0, paid: 0 };
    stats[source].count++;
    if (lead.Status === 'Paid') stats[source].paid++;
  });

  return Object.entries(stats).map(([source, data]) => ({
    source,
    count: data.count,
    percentage: total > 0 ? (data.count / total) * 100 : 0,
    conversion: data.count > 0 ? (data.paid / data.count) * 100 : 0
  }));
};

export const fetchInstallerPerformance = async (startDate: Date, endDate: Date): Promise<InstallerStat[]> => {
  // Fetch all leads in range
  const { data, error } = await supabase
    .schema('solar')
    .from('solar_leads')
    .select('Installer, Status, Survey_Booked_Date, Install_Booked_Date, Paid_Date, Lead_Revenue')
    .gte('Created_At', startDate.toISOString())
    .lte('Created_At', endDate.toISOString());

  if (error || !data) {
    console.error('Error fetching installer data:', error);
    return [];
  }

  const stats: Record<string, InstallerStat> = {};

  data.forEach((lead) => {
    const installer = lead.Installer || 'Unassigned';
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

    stats[installer].leads++;
    if (lead.Survey_Booked_Date) stats[installer].surveys++;
    if (lead.Install_Booked_Date) stats[installer].installs++;
    
    if (lead.Status === 'Paid') {
      stats[installer].paid++;
      stats[installer].revenue += (lead.Lead_Revenue || 0);
    }
  });

  return Object.values(stats).map(stat => {
    const leads = stat.leads || 1; // avoid div by zero
    const surveys = stat.surveys || 1;
    const installs = stat.installs || 1;
    
    return {
      ...stat,
      leadToPaidRate: (stat.paid / leads) * 100,
      avgRevenuePerLead: stat.revenue / leads,
      leadToSurveyRate: (stat.surveys / leads) * 100,
      surveyToInstallRate: (stat.installs / surveys) * 100,
      installToPaidRate: (stat.paid / installs) * 100
    };
  }).sort((a, b) => b.revenue - a.revenue);
};

// --- Financial Services ---

export const fetchFinancialData = async (startDate: Date, endDate: Date) => {
  console.log('Fetching expenses from finances schema...', { startDate, endDate });

  // 1. Fetch Expenses (Switching to finances schema)
  const { data: expenses, error: expenseError } = await supabase
    .schema('finances')
    .from('expenses')
    .select('*')
    .gte('transaction_date', startDate.toISOString())
    .lte('transaction_date', endDate.toISOString());
  
  if (expenseError) {
    console.error("Expense Fetch Error:", expenseError);
  } else {
    console.log('Expenses loaded:', expenses?.length || 0, 'records');
  }

  // 2. Fetch Solar Leads for Revenue and Counts
  // We need distinct counts based on source for metrics
  const { data: leads, error: leadsError } = await supabase
    .schema('solar')
    .from('solar_leads')
    .select('*')
    .gte('Created_At', startDate.toISOString())
    .lte('Created_At', endDate.toISOString());

  if (leadsError) console.error("Leads Fetch Error", leadsError);

  const expenseData = (expenses as Expense[]) || [];
  const leadsData = (leads as SolarLead[]) || [];

  // --- Calculate Totals ---
  
  const { data: revenueLeads } = await supabase
    .schema('solar')
    .from('solar_leads')
    .select('Lead_Revenue')
    .eq('Status', 'Paid')
    .gte('Paid_Date', startDate.toISOString())
    .lte('Paid_Date', endDate.toISOString());

  const totalRevenue = revenueLeads?.reduce((sum, l) => sum + (l.Lead_Revenue || 0), 0) || 0;
  
  const totalExpenses = expenseData.reduce((sum, e) => sum + (e.amount || 0), 0);
  const netProfit = totalRevenue - totalExpenses;
  const margin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  // --- Cost Per Metrics Calculations ---
  
  // Expense Buckets
  const fieldDirect = expenseData.filter(e => e.expense_type === 'Field').reduce((s, e) => s + e.amount, 0);
  const onlineDirect = expenseData.filter(e => e.expense_type === 'Online').reduce((s, e) => s + e.amount, 0);
  const splitTotal = expenseData.filter(e => e.expense_type === 'Split').reduce((s, e) => s + e.amount, 0);
  
  const fieldExpenses = fieldDirect + (splitTotal / 2);
  const onlineExpenses = onlineDirect + (splitTotal / 2);

  // Activity Counts (from leadsData which is Created_At in range)
  // Field
  const fieldLeads = leadsData.filter(l => l.Lead_Source === 'Field Rep');
  const fieldLeadsCount = fieldLeads.length;
  const fieldSurveysCount = fieldLeads.filter(l => l.Survey_Booked_Date).length;
  const fieldInstallsCount = fieldLeads.filter(l => l.Install_Booked_Date).length;
  const fieldPaidCount = fieldLeads.filter(l => l.Status === 'Paid').length;
  const fieldRevenue = fieldLeads.filter(l => l.Status === 'Paid').reduce((s, l) => s + (l.Lead_Revenue || 0), 0); // Approx cohort revenue

  // Online
  const onlineLeads = leadsData.filter(l => l.Lead_Source === 'Online Ads');
  const onlineLeadsCount = onlineLeads.length;
  const onlineSurveysCount = onlineLeads.filter(l => l.Survey_Booked_Date).length;
  const onlineInstallsCount = onlineLeads.filter(l => l.Install_Booked_Date).length;
  const onlinePaidCount = onlineLeads.filter(l => l.Status === 'Paid').length;
  const onlineRevenue = onlineLeads.filter(l => l.Status === 'Paid').reduce((s, l) => s + (l.Lead_Revenue || 0), 0);

  // Metrics
  const fieldMetrics: CostPerMetric = {
    cpl: fieldLeadsCount > 0 ? fieldExpenses / fieldLeadsCount : 0,
    cps: fieldSurveysCount > 0 ? fieldExpenses / fieldSurveysCount : 0,
    cpi: fieldInstallsCount > 0 ? fieldExpenses / fieldInstallsCount : 0
  };

  const onlineMetrics: CostPerMetric = {
    cpl: onlineLeadsCount > 0 ? onlineExpenses / onlineLeadsCount : 0,
    cps: onlineSurveysCount > 0 ? onlineExpenses / onlineSurveysCount : 0,
    cpi: onlineInstallsCount > 0 ? onlineExpenses / onlineInstallsCount : 0
  };

  // --- Breakdown Tables ---
  
  // Expense Type Breakdown
  const expenseTypes = ['Field', 'Online', 'Split', 'Salaries', 'Software', 'Other'];
  const expenseBreakdown = expenseTypes.map(type => {
    const amount = expenseData.filter(e => e.expense_type === type).reduce((s, e) => s + e.amount, 0);
    return {
      type,
      amount,
      percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0
    };
  }).sort((a, b) => b.amount - a.amount);

  // Revenue Source Breakdown (Cohort based on leadsData for conversion, but maybe we should display totals)
  // Let's use the cohort data we computed above
  const sourceBreakdown = [
    {
      source: 'Field Rep',
      leads: fieldLeadsCount,
      paid: fieldPaidCount,
      revenue: fieldRevenue,
      conversion: fieldLeadsCount > 0 ? (fieldPaidCount / fieldLeadsCount) * 100 : 0
    },
    {
      source: 'Online Ads',
      leads: onlineLeadsCount,
      paid: onlinePaidCount,
      revenue: onlineRevenue,
      conversion: onlineLeadsCount > 0 ? (onlinePaidCount / onlineLeadsCount) * 100 : 0
    }
  ];

  return {
    summary: { revenue: totalRevenue, expenses: totalExpenses, netProfit, margin },
    fieldMetrics,
    onlineMetrics,
    expenseBreakdown,
    sourceBreakdown
  };
};

export const fetchFinancialTrend = async (): Promise<FinancialTrend[]> => {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 5);
  startDate.setDate(1);

  // Fetch Revenue (Paid_Date)
  const { data: revData } = await supabase
    .schema('solar')
    .from('solar_leads')
    .select('Paid_Date, Lead_Revenue, Status')
    .eq('Status', 'Paid')
    .gte('Paid_Date', startDate.toISOString());

  // Fetch Expenses (transaction_date)
  console.log('Fetching expense trend from finances schema...');
  const { data: expData, error: expError } = await supabase
    .schema('finances')
    .from('expenses')
    .select('transaction_date, amount')
    .gte('transaction_date', startDate.toISOString());

  if (expError) {
    console.error("Expense Trend Fetch Error:", expError);
  } else {
    console.log('Expense trend records:', expData?.length || 0);
  }

  const trend: Record<string, FinancialTrend> = {};

  // Init
  for (let i = 0; i < 6; i++) {
    const d = new Date(startDate);
    d.setMonth(d.getMonth() + i);
    const key = d.toLocaleString('default', { month: 'short' });
    trend[key] = { month: key, revenue: 0, expenses: 0, netProfit: 0 };
  }

  // Agg Revenue
  revData?.forEach(l => {
    if (l.Paid_Date) {
      const m = new Date(l.Paid_Date).toLocaleString('default', { month: 'short' });
      if (trend[m]) trend[m].revenue += (l.Lead_Revenue || 0);
    }
  });

  // Agg Expenses
  expData?.forEach(e => {
    if (e.transaction_date) {
      const m = new Date(e.transaction_date).toLocaleString('default', { month: 'short' });
      if (trend[m]) trend[m].expenses += (e.amount || 0);
    }
  });

  // Calc Net
  Object.values(trend).forEach(t => {
    t.netProfit = t.revenue - t.expenses;
  });

  return Object.values(trend);
};
