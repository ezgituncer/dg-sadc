export interface YearlyReportUserInfo {
  accountId: string;
  name: string;
  team: string | null;
}

export interface YearlyReportRow {
  user: YearlyReportUserInfo;
  hoursByMonth: string[];
  yearTotal: string;
  breakdownByActivity: Record<string, string[]>;
}

export interface YearlyReport {
  year: number;
  expectedWorkingDays: number[];
  yearTargetHours: string;
  rows: YearlyReportRow[];
  columnTotals: string[];
  grandTotal: string;
}

export interface WorkingDaysResponse {
  year: number;
  months: number[];
}
