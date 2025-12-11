
export interface SolarLead {
  id: number;
  Created_At: string; // timestamp
  Customer_Name: string;
  Customer_Tel: string | null;
  Customer_Email: string | null;
  First_Line_Of_Address: string | null;
  Postcode: string | null;
  Property_Type: string | null;
  Lead_Source: string | null;
  Field_Rep: string | null;
  Account_Manager: string | null;
  Installer: string | null;
  Status: string | null;
  Survey_Booked_Date: string | null; // date string YYYY-MM-DD
  Survey_Complete_Date: string | null;
  Install_Booked_Date: string | null;
  Paid_Date: string | null;
  Lead_Cost: number | null;
  Lead_Revenue: number | null;
  Commission_Amount: number | null;
  Commission_Paid: string | null; // "Yes" | "No"
  Commission_Paid_Date: string | null;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: 'field_rep' | 'account_manager' | 'admin';
}

export interface DateRange {
  start: Date;
  end: Date;
}

export type PeriodFilter = 'this_month' | 'last_month' | 'this_quarter' | 'this_year' | 'last_year' | 'all_time' | 'custom';

export interface DashboardMetrics {
  leadsThisMonth: number;
  surveysThisMonth: number;
  installsThisMonth: number;
  paidThisMonth: number;
  leadToSurveyRate: number;
  surveyToInstallRate: number;
  totalCommission: number;
}

export interface MonthlyActivity {
  month: string;
  leads: number;
  surveys: number;
  installs: number;
  paid: number;
}

export interface RevenueTrendData {
  month: string;
  revenue: number;
}

export interface LeaderboardEntry {
  name: string;
  leads: number;
  installs: number;
  paid: number;
  conversion: number;
}

export interface LeadSourceStat {
  source: string;
  count: number;
  percentage: number;
  conversion: number;
}

// Financial Types
export interface Expense {
  id: number;
  transaction_date: string;
  amount: number;
  expense_type: 'Field' | 'Online' | 'Split' | 'Salaries' | 'Software' | 'Other';
  description?: string;
}

export interface FinancialSummary {
  revenue: number;
  expenses: number;
  netProfit: number;
  margin: number;
}

export interface CostPerMetric {
  cpl: number;
  cps: number;
  cpi: number;
}

export interface FinancialTrend {
  month: string;
  revenue: number;
  expenses: number;
  netProfit: number;
}

export interface InstallerStat {
  name: string;
  leads: number;
  surveys: number;
  installs: number;
  paid: number;
  revenue: number;
  leadToPaidRate: number;
  avgRevenuePerLead: number;
  leadToSurveyRate: number;
  surveyToInstallRate: number;
  installToPaidRate: number;
}

export type DashboardView = 'dashboard' | 'company_kpis';
