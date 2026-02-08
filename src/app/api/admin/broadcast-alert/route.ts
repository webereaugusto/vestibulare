import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { sendAlert } from '@/lib/brevo';
import { getProfile } from '@/lib/supabase-server';
import { Profile, Vestibular, ImportantDate, UserAlert, AlertChannel } from '@/types/database';
import { PLANS } from '@/lib/plans';
import { getDaysUntil } from '@/lib/utils';

/**
 * Disparo manual de alertas para TODOS os usuários inscritos em um vestibular.
 * Usado pelo admin na página de Datas Importantes.
 */
export async function POST(req: Request) {
  try {
    const profile = (await getProfile()) as Profile | null;
    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    const { importantDateId } = await req.json();

    if (!importantDateId) {
      return NextResponse.json({ error: 'importantDateId é obrigatório' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Buscar a data importante com o vestibular
    const { data: dateRecord, error: dateError } = await supabase
      .from('important_dates')
      .select('*, vestibular:vestibulares(*)')
      .eq('id', importantDateId)
      .single();

    if (dateError || !dateRecord) {
      return NextResponse.json({ error: 'Data importante não encontrada' }, { status: 404 });
    }

    const vestibular = dateRecord.vestibular as Vestibular;
    const importantDate = dateRecord as ImportantDate;
    const daysUntil = getDaysUntil(importantDate.event_date);

    // Buscar todos os alertas de usuários ativos para este vestibular
    const { data: userAlerts, error: alertsError } = await supabase
      .from('user_alerts')
      .select('*, profile:profiles(*)')
      .eq('vestibular_id', dateRecord.vestibular_id)
      .eq('active', true);

    if (alertsError) {
      return NextResponse.json({ error: 'Erro ao buscar alertas de usuários' }, { status: 500 });
    }

    if (!userAlerts || userAlerts.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Nenhum usuário inscrito neste vestibular',
        sent: 0,
        failed: 0,
        skipped: 0,
      });
    }

    let totalSent = 0;
    let totalFailed = 0;
    let totalSkipped = 0;
    const errors: string[] = [];

    for (const alert of userAlerts) {
      const userProfile = (alert as UserAlert & { profile: Profile }).profile;
      if (!userProfile) { totalSkipped++; continue; }

      // Verificar tipo de evento aceito pelo alerta do usuário
      const alertEventTypes = alert.event_types as string[] | null;
      if (alertEventTypes && alertEventTypes.length > 0) {
        if (!alertEventTypes.includes(dateRecord.event_type)) {
          totalSkipped++;
          continue;
        }
      }

      // Verificar plano
      const plan = PLANS[userProfile.plan_type];
      if (!plan) { totalSkipped++; continue; }

      // Verificar expiração do plano pago
      if (userProfile.plan_type !== 'free' && userProfile.plan_expires_at) {
        const expiresAt = new Date(userProfile.plan_expires_at);
        if (expiresAt < new Date()) { totalSkipped++; continue; }
      }

      const channels: AlertChannel[] = alert.channels || ['email'];

      for (const channel of channels) {
        // Verificar se canal é permitido pelo plano
        if (!plan.channels.includes(channel)) { totalSkipped++; continue; }

        // Enviar alerta
        const result = await sendAlert({
          user: userProfile,
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
          errors.push(`${userProfile.email}/${channel}: ${result.error}`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Disparo concluído: ${totalSent} enviados, ${totalFailed} falhas, ${totalSkipped} ignorados`,
      sent: totalSent,
      failed: totalFailed,
      skipped: totalSkipped,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Erro no broadcast-alert:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno',
    }, { status: 500 });
  }
}
