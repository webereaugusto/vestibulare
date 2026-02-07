import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { getPaymentById, getExpirationDate, getPlanFromExternalReference } from '@/lib/mercadopago';
import { sendPaymentConfirmation } from '@/lib/brevo';
import { PLANS } from '@/lib/plans';
import { Profile } from '@/types/database';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Mercado Pago envia notificações do tipo "payment"
    if (body.type !== 'payment' && body.action !== 'payment.created' && body.action !== 'payment.updated') {
      return NextResponse.json({ received: true });
    }

    const paymentId = body.data?.id;
    if (!paymentId) {
      return NextResponse.json({ error: 'Payment ID not found' }, { status: 400 });
    }

    // Buscar dados do pagamento no Mercado Pago
    const payment = await getPaymentById(String(paymentId));
    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    const supabase = createServiceClient();

    // Extrair user_id e plan_type do external_reference ou metadata
    let userId = payment.metadata?.user_id;
    let planType = payment.metadata?.plan_type;

    if (!userId && payment.external_reference) {
      const parsed = getPlanFromExternalReference(payment.external_reference);
      if (parsed) {
        userId = parsed.userId;
        planType = parsed.planType;
      }
    }

    if (!userId || !planType) {
      console.error('Webhook MP: userId ou planType não encontrados', { paymentId });
      return NextResponse.json({ error: 'Missing user or plan info' }, { status: 400 });
    }

    // Registrar/atualizar subscription
    await supabase.from('subscriptions').upsert(
      {
        user_id: userId,
        mercadopago_payment_id: String(payment.id),
        plan_type: planType,
        amount: payment.transaction_amount,
        status: payment.status === 'approved' ? 'approved' : payment.status === 'rejected' ? 'rejected' : 'pending',
        expires_at: payment.status === 'approved' ? getExpirationDate() : null,
      },
      { onConflict: 'mercadopago_payment_id' }
    );

    // Se pagamento aprovado, atualizar perfil do usuário
    if (payment.status === 'approved') {
      await supabase
        .from('profiles')
        .update({
          plan_type: planType,
          plan_expires_at: getExpirationDate(),
        })
        .eq('id', userId);

      // Enviar email de confirmação
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profile) {
        const planConfig = PLANS[planType as keyof typeof PLANS];
        await sendPaymentConfirmation(profile as Profile, planConfig?.name || planType);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro no webhook MP:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
