import { Factory, FolderKanban, Truck, AlertTriangle, BarChart3, Activity, type LucideIcon } from 'lucide-react';

export type TrendDirection = 'up' | 'down' | 'stable';

export interface KpiMock {
  title: string;
  value: number;
  displayValue?: string;
  prefix?: string;
  suffix?: string;
  variant?: 'success' | 'warning' | 'danger' | 'info';
  status?: string;
  insight: string;
  trend?: number;
  trendLabel?: string;
  trendDirection?: TrendDirection;
  icon: LucideIcon;
  sparklineData: number[];
  updatedAt?: string;
  delay?: number;
}

export const KPI_MOCK: {
  machinesRunning: KpiMock;
  openProjects: KpiMock;
  pendingDispatches: KpiMock;
  overdueCAPAs: KpiMock;
} = {
  machinesRunning: {
    title: 'Machines Running',
    value: 8,
    displayValue: '8/12',
    variant: 'success',
    status: 'Operational',
    insight: 'Shop-floor utilization at 67%; suggest balancing load to underutilized cells to prevent backlog.',
    trend: 2,
    trendDirection: 'up',
    trendLabel: 'vs yesterday',
    icon: Factory,
    sparklineData: [60, 62, 58, 65, 63, 67, 69, 67],
    updatedAt: '2 min ago',
    delay: 0,
  },
  openProjects: {
    title: 'Open Projects',
    value: 34,
    variant: 'warning',
    status: 'Active',
    insight: 'Design stage concentration (12) suggests pipeline backlog; prioritize key bids to meet delivery windows.',
    trendDirection: 'stable',
    trendLabel: 'Stable',
    icon: FolderKanban,
    sparklineData: [28, 30, 31, 33, 32, 34, 34, 34],
    updatedAt: '15 min ago',
    delay: 0.1,
  },
  pendingDispatches: {
    title: 'Pending Dispatches',
    value: 7,
    variant: 'info',
    status: 'In Queue',
    insight: '3 packages ready, 4 awaiting QC—expedite QC triage for time-sensitive shipments.',
    trend: -3,
    trendDirection: 'down',
    trendLabel: 'vs yesterday',
    icon: Truck,
    sparklineData: [12, 11, 10, 9, 8, 8, 7, 7],
    updatedAt: '1 hr ago',
    delay: 0.2,
  },
  overdueCAPAs: {
    title: 'Overdue CAPAs',
    value: 2,
    variant: 'danger',
    status: 'Critical',
    insight: '1 Critical and 1 High priority overdue — assign owners and schedule immediate review.',
    trend: 1,
    trendDirection: 'up',
    trendLabel: 'vs last week',
    icon: AlertTriangle,
    sparklineData: [0, 1, 1, 0, 1, 1, 2, 2],
    updatedAt: 'Just now',
    delay: 0.3,
  },
};

export interface AiInsight {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  color?: 'warning' | 'accent' | 'success';
}

export const AI_INSIGHTS: AiInsight[] = [
  { icon: AlertTriangle, title: '2 Projects are at risk', subtitle: 'Delay likely due to material shortage', color: 'warning' },
  { icon: BarChart3, title: 'Production bottleneck detected', subtitle: 'CNC Machine #3 idle for 2 hours', color: 'accent' },
  { icon: Activity, title: 'Demand forecast updated', subtitle: 'Q3 projections increased by 12%', color: 'success' },
];

export interface RecentActivity {
  title: string;
  user: string;
  time: string;
  type: string;
}

export const RECENT_ACTIVITIES: RecentActivity[] = [
  { title: 'Design released for PRJ-1250', user: 'John Doe', time: '2 min ago', type: 'design' },
  { title: 'Material received for PRJ-1248', user: 'Sarah Wilson', time: '15 min ago', type: 'material' },
  { title: 'Quality check completed for PRJ-1246', user: 'Mike Johnson', time: '1 hr ago', type: 'quality' },
  { title: 'Dispatch scheduled for PRJ-1245', user: 'Admin', time: '2 hr ago', type: 'dispatch' },
  { title: 'CAPA #CAP-0042 closed', user: 'Quality Team', time: '3 hr ago', type: 'capa' },
];
