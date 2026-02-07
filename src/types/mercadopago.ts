export interface MercadoPagoPreference {
  id: string;
  init_point: string;
  sandbox_init_point: string;
}

export interface MercadoPagoWebhookPayload {
  action: string;
  api_version: string;
  data: {
    id: string;
  };
  date_created: string;
  id: number;
  live_mode: boolean;
  type: string;
  user_id: string;
}

export interface MercadoPagoPayment {
  id: number;
  status: 'approved' | 'pending' | 'authorized' | 'in_process' | 'in_mediation' | 'rejected' | 'cancelled' | 'refunded' | 'charged_back';
  status_detail: string;
  transaction_amount: number;
  currency_id: string;
  description: string;
  payer: {
    email: string;
    identification: {
      type: string;
      number: string;
    };
  };
  metadata: {
    user_id?: string;
    plan_type?: string;
  };
  date_approved: string | null;
  date_created: string;
  external_reference: string;
}

export interface CreatePreferencePayload {
  userId: string;
  planType: 'basic' | 'premium';
  userEmail: string;
}
