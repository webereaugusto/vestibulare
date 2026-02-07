import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { sendAlert } from '@/lib/brevo';
import { getProfile } from '@/lib/supabase-server';
import { Profile, Vestibular, ImportantDate, AlertChannel } from '@/types/database';
import { getDaysUntil } from '@/lib/utils';

// Endpoint manual para enviar um alerta específico (admin only)
export async function POST(req: Request) {
  try {
    const profile = (await getProfile()) as Profile | null;
    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    const { userId, importantDateId, channel } = await req.json();

    if (!userId || !importantDateId || !channel) {
      return NextResponse.json({ error: 'Parâmetros faltando' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Buscar dados
    const [userRes, dateRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase.from('important_dates').select('*, vestibular:vestibulares(*)').eq('id', importantDateId).single(),
    ]);

    if (!userRes.data || !dateRes.data) {
      return NextResponse.json({ error: 'Dados não encontrados' }, { status: 404 });
    }

    const targetUser = userRes.data as Profile;
    const importantDate = dateRes.data as ImportantDate & { vestibular: Vestibular };
    const daysUntil = getDaysUntil(importantDate.event_date);

    const result = await sendAlert({
      user: targetUser,
      vestibular: importantDate.vestibular!,
      importantDate,
      channel: channel as AlertChannel,
      daysUntilEvent: daysUntil,
    });

    return NextResponse.json({
      success: result.success,
      error: result.error,
    });
  } catch (error) {
    console.error('Erro ao enviar alerta manual:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
