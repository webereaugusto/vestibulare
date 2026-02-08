export type PlanType = 'free' | 'basic' | 'premium';
export type EventType = 'inscricao' | 'prova' | 'resultado' | 'segunda_chamada' | 'recurso' | 'matricula' | 'outro';
export type AlertChannel = 'email' | 'sms' | 'whatsapp';
export type AlertStatus = 'sent' | 'failed' | 'pending';
export type SubscriptionStatus = 'pending' | 'approved' | 'rejected' | 'refunded';
export type DateSource = 'manual' | 'scraped';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  plan_type: PlanType;
  plan_expires_at: string | null;
  is_admin: boolean;
  email_verified: boolean;
  phone_verified: boolean;
  whatsapp_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface Vestibular {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  official_url: string | null;
  logo_url: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ImportantDate {
  id: string;
  vestibular_id: string;
  event_type: EventType;
  event_name: string;
  event_date: string;
  event_end_date: string | null;
  official_url: string | null;
  notes: string | null;
  alert_days_before: number[];
  source: DateSource;
  scraped_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  vestibular?: Vestibular;
}

export interface UserAlert {
  id: string;
  user_id: string;
  vestibular_id: string;
  channels: AlertChannel[];
  event_types: EventType[] | null; // null = todos os tipos
  active: boolean;
  created_at: string;
  updated_at: string;
  // Joined fields
  vestibular?: Vestibular;
  important_dates?: ImportantDate[];
}

export interface AlertLog {
  id: string;
  user_alert_id: string;
  important_date_id: string;
  channel: AlertChannel;
  status: AlertStatus;
  sent_at: string;
  error_message: string | null;
  // Joined fields
  user_alert?: UserAlert;
  important_date?: ImportantDate;
}

export interface Subscription {
  id: string;
  user_id: string;
  mercadopago_payment_id: string | null;
  mercadopago_preference_id: string | null;
  plan_type: PlanType;
  amount: number;
  status: SubscriptionStatus;
  expires_at: string | null;
  created_at: string;
}
