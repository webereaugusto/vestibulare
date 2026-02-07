import { AlertChannel, ImportantDate, Profile, Vestibular } from './database';

export interface AlertToSend {
  user: Profile;
  vestibular: Vestibular;
  importantDate: ImportantDate;
  channel: AlertChannel;
  daysUntilEvent: number;
}

export interface AlertResult {
  alertId: string;
  channel: AlertChannel;
  status: 'sent' | 'failed';
  error?: string;
}

export interface ScrapedDate {
  eventType: ImportantDate['event_type'];
  eventName: string;
  eventDate: string; // YYYY-MM-DD
  eventEndDate?: string; // YYYY-MM-DD
}

export interface ScraperResult {
  vestibularSlug: string;
  dates: ScrapedDate[];
  scrapedAt: string;
  errors?: string[];
}

export interface CronResponse {
  success: boolean;
  processed?: number;
  errors?: string[];
  message?: string;
}

export interface DashboardStats {
  totalUsers: number;
  activeSubscriptions: number;
  alertsSentToday: number;
  alertsSentMonth: number;
  vestibularCount: number;
  upcomingDates: number;
}

export interface UserDashboardData {
  profile: Profile;
  alerts: Array<{
    id: string;
    vestibular: Vestibular;
    channels: AlertChannel[];
    active: boolean;
    upcomingDates: ImportantDate[];
  }>;
  recentLogs: Array<{
    id: string;
    channel: AlertChannel;
    status: string;
    sentAt: string;
    eventName: string;
    vestibularName: string;
  }>;
}
