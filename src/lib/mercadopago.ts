import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import { PLANS } from './plans';
import { CreatePreferencePayload, MercadoPagoPayment } from '@/types/mercadopago';
import { PlanType } from '@/types/database';

const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!,
});

const preference = new Preference(client);
const payment = new Payment(client);

export async function createPaymentPreference({
  userId,
  planType,
  userEmail,
}: CreatePreferencePayload) {
  const plan = PLANS[planType];
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;

  const result = await preference.create({
    body: {
      items: [
        {
          id: `plan-${planType}`,
          title: `ZapVest - Plano ${plan.name}`,
          description: `Assinatura anual do plano ${plan.name}`,
          quantity: 1,
          unit_price: plan.price,
          currency_id: 'BRL',
        },
      ],
      payer: {
        email: userEmail,
      },
      metadata: {
        user_id: userId,
        plan_type: planType,
      },
      external_reference: `${userId}:${planType}`,
      back_urls: {
        success: `${appUrl}/dashboard/upgrade/success`,
        failure: `${appUrl}/dashboard/upgrade/failure`,
        pending: `${appUrl}/dashboard/upgrade/pending`,
      },
      auto_return: 'approved',
      notification_url: `${appUrl}/api/webhooks/mercadopago`,
    },
  });

  return result;
}

export async function getPaymentById(paymentId: string): Promise<MercadoPagoPayment | null> {
  try {
    const result = await payment.get({ id: paymentId });
    return result as unknown as MercadoPagoPayment;
  } catch {
    return null;
  }
}

export function getExpirationDate(): string {
  const now = new Date();
  const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
  return endOfYear.toISOString();
}

export function getPlanFromExternalReference(externalReference: string): {
  userId: string;
  planType: PlanType;
} | null {
  const parts = externalReference.split(':');
  if (parts.length !== 2) return null;
  return {
    userId: parts[0],
    planType: parts[1] as PlanType,
  };
}
