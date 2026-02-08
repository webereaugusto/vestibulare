import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { sendAlert } from '@/lib/brevo';
import { PLANS } from '@/lib/plans';
import { verifyCronSecret } from '@/lib/utils';
import { Profile, Vestibular, ImportantDate, UserAlert, AlertChannel } from '@/types/database';

export async function GET(req: Request) {
  // Verificar autenticação do cron
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const supabase = createServiceClient();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let totalSent = 0;
    let totalFailed = 0;
    const errors: string[] = [];

    // Buscar todas as datas importantes futuras (próximos 30 dias)
    const futureDate = new Date(today);
    futureDate.setDate(futureDate.getDate() + 30);

    const { data: upcomingDates, error: datesError } = await supabase
      .from('important_dates')
      .select('*, vestibular:vestibulares(*)')
      .gte('event_date', today.toISOString().split('T')[0])
      .lte('event_date', futureDate.toISOString().split('T')[0]);

    if (datesError || !upcomingDates) {
      return NextResponse.json({
        success: false,
        message: 'Erro ao buscar datas',
        error: datesError?.message,
      });
    }

    for (const dateRecord of upcomingDates) {
      const eventDate = new Date(dateRecord.event_date);
      eventDate.setHours(0, 0, 0, 0);
      const daysUntil = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      // Verificar se hoje é um dos dias configurados para alertar
      const alertDays: number[] = dateRecord.alert_days_before || [1, 3, 7];
      if (!alertDays.includes(daysUntil)) {
        continue;
      }

      // Buscar alertas de usuários para este vestibular
      const { data: userAlerts } = await supabase
        .from('user_alerts')
        .select('*, profile:profiles(*)')
        .eq('vestibular_id', dateRecord.vestibular_id)
        .eq('active', true);

      if (!userAlerts || userAlerts.length === 0) continue;

      for (const alert of userAlerts) {
        const profile = (alert as UserAlert & { profile: Profile }).profile;
        if (!profile) continue;

        // Verificar se o tipo de evento é aceito pelo alerta do usuário
        const alertEventTypes = alert.event_types as string[] | null;
        if (alertEventTypes && alertEventTypes.length > 0) {
          if (!alertEventTypes.includes(dateRecord.event_type)) continue;
        }

        // Verificar se plano está ativo
        const plan = PLANS[profile.plan_type];
        if (!plan) continue;

        // Verificar se o tipo de evento é permitido pelo plano
        if (plan.allowedEventTypes && !plan.allowedEventTypes.includes(dateRecord.event_type as import('@/types/database').EventType)) continue;

        // Verificar expiração do plano pago
        if (profile.plan_type !== 'free' && profile.plan_expires_at) {
          const expiresAt = new Date(profile.plan_expires_at);
          if (expiresAt < today) continue; // Plano expirado
        }

        // Verificar limite de alertas enviados (contar alertas sent do usuario no periodo)
        const { count: sentCount } = await supabase
          .from('alert_logs')
          .select('*', { count: 'exact', head: true })
          .eq('user_alert_id', alert.id)
          .eq('status', 'sent');
        if ((sentCount || 0) >= plan.maxAlerts) continue;

        const vestibular = dateRecord.vestibular as Vestibular;
        const importantDate = dateRecord as ImportantDate;
        const channels: AlertChannel[] = alert.channels || ['whatsapp'];

        for (const channel of channels) {
          // Verificar se canal é permitido pelo plano
          if (!plan.channels.includes(channel)) continue;

          // Verificar se já foi enviado (evitar duplicatas)
          const { data: existingLog } = await supabase
            .from('alert_logs')
            .select('id')
            .eq('user_alert_id', alert.id)
            .eq('important_date_id', dateRecord.id)
            .eq('channel', channel)
            .eq('status', 'sent')
            .maybeSingle();

          if (existingLog) continue; // Já enviado

          // Enviar alerta
          const result = await sendAlert({
            user: profile,
            vestibular,
            importantDate,
            channel,
            daysUntilEvent: daysUntil,
          });

          // Registrar log
          await supabase.from('alert_logs').insert({
            user_alert_id: alert.id,
            important_date_id: dateRecord.id,
            channel,
            status: result.success ? 'sent' : 'failed',
            error_message: result.error || null,
          });

          if (result.success) {
            totalSent++;
          } else {
            totalFailed++;
            errors.push(`${profile.email}/${channel}: ${result.error}`);
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Alertas processados: ${totalSent} enviados, ${totalFailed} falhas`,
      processed: totalSent + totalFailed,
      sent: totalSent,
      failed: totalFailed,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Erro no cron check-alerts:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno',
    }, { status: 500 });
  }
}
