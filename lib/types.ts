export const BUSINESS_UNITS = [
  "HMR Retail",
  "HMR Auctions",
  "Envirocycle",
  "HMR Solutions",
] as const;

export type BusinessUnit = (typeof BUSINESS_UNITS)[number];
export type BusinessUnitFilter = "All" | BusinessUnit;

export const DATE_RANGE_KEYS = [
  "today",
  "last7days",
  "last30days",
  "thismonth",
  "custom",
] as const;

export type DateRangeKey = (typeof DATE_RANGE_KEYS)[number];

export interface DailyMetricRow {
  email_date: string;
  business_unit: string;
  total_emails: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  failed: number;
  complained: number;
  suppressed: number;
}

export interface MetricTotals {
  totalEmails: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  failed: number;
  complained: number;
  suppressed: number;
  deliveryRate: number | null;
  openRate: number | null;
  clickRate: number | null;
  bounceRate: number | null;
}

export interface VolumePoint {
  date: string;
  totalEmails: number;
  delivered: number;
  opened: number;
  clicked: number;
}

export interface BusinessUnitPerformance {
  businessUnit: BusinessUnit;
  totalEmails: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  deliveryRate: number | null;
  openRate: number | null;
  clickRate: number | null;
}

export interface DashboardMetricsResponse {
  range: { from: string; to: string };
  totals: MetricTotals;
  volume: VolumePoint[];
  businessUnits: BusinessUnitPerformance[];
}

export interface EmailLogRow {
  resend_email_id: string;
  business_unit: string | null;
  sender: string | null;
  recipients: string[] | null;
  subject: string | null;
  status: string | null;
  sent_at: string | null;
}

export interface RecentEmailsResponse {
  rows: EmailLogRow[];
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface ApiErrorResponse {
  error: string;
}
