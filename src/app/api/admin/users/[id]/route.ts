import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { getProfile } from '@/lib/supabase-server';
import { Profile, AlertChannel, EventType } from '@/types/database';

async function requireAdmin() {
  const profile = (await getProfile()) as Profile | null;
  if (!profile?.is_admin) return null;
  return profile;
}

// GET - Detalhes de um usuário com alertas e logs
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });

  const { id: userId } = await params;
  const supabase = createServiceClient();

  // Buscar perfil
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
  }

  // Buscar alertas do usuário com vestibulares
  const { data: alerts } = await supabase
    .from('user_alerts')
    .select('*, vestibular:vestibulares(id, name, slug)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  // Buscar últimos logs de alertas
  const { data: logs } = await supabase
    .from('alert_logs')
    .select('*, user_alert:user_alerts!inner(user_id, vestibular:vestibulares(name)), important_date:important_dates(event_name, event_date)')
    .eq('user_alert.user_id', userId)
    .order('sent_at', { ascending: false })
    .limit(50);

  // Buscar todos os vestibulares ativos (para poder adicionar)
  const { data: vestibulares } = await supabase
    .from('vestibulares')
    .select('id, name, slug')
    .eq('active', true)
    .order('name');

  return NextResponse.json({
    success: true,
    profile,
    alerts: alerts || [],
    logs: logs || [],
    vestibulares: vestibulares || [],
  });
}

// POST - Ações nos alertas de um usuário
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });

  const { id: userId } = await params;
  const body = await req.json();
  const { action } = body;

  const supabase = createServiceClient();

  switch (action) {
    case 'add-alert': {
      const { vestibularId, channels, eventTypes } = body as {
        vestibularId: string;
        channels: AlertChannel[];
        eventTypes: EventType[] | null;
      };

      if (!vestibularId) {
        return NextResponse.json({ error: 'vestibularId obrigatório' }, { status: 400 });
      }

      const { error } = await supabase.from('user_alerts').upsert({
        user_id: userId,
        vestibular_id: vestibularId,
        channels: channels || ['email'],
        event_types: eventTypes || null,
        active: true,
      }, { onConflict: 'user_id,vestibular_id' });

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, message: 'Alerta adicionado' });
    }

    case 'update-alert': {
      const { alertId, channels, eventTypes, active } = body as {
        alertId: string;
        channels?: AlertChannel[];
        eventTypes?: EventType[] | null;
        active?: boolean;
      };

      if (!alertId) return NextResponse.json({ error: 'alertId obrigatório' }, { status: 400 });

      const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (channels !== undefined) update.channels = channels;
      if (eventTypes !== undefined) update.event_types = eventTypes;
      if (active !== undefined) update.active = active;

      const { error } = await supabase.from('user_alerts').update(update).eq('id', alertId);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, message: 'Alerta atualizado' });
    }

    case 'delete-alert': {
      const { alertId } = body as { alertId: string };
      if (!alertId) return NextResponse.json({ error: 'alertId obrigatório' }, { status: 400 });

      const { error } = await supabase.from('user_alerts').delete().eq('id', alertId);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, message: 'Alerta removido' });
    }

    default:
      return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
  }
}
