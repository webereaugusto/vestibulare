import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { getProfile } from '@/lib/supabase-server';
import { Profile, PlanType } from '@/types/database';

async function requireAdmin() {
  const profile = (await getProfile()) as Profile | null;
  if (!profile?.is_admin) return null;
  return profile;
}

// GET - Listar todos os usuários com contagens
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });

  const supabase = createServiceClient();

  // Buscar todos os perfis
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Para cada perfil, buscar contagens
  const usersWithStats = await Promise.all(
    (profiles || []).map(async (profile: Profile) => {
      // Contar alertas ativos (vestibulares)
      const { count: alertCount } = await supabase
        .from('user_alerts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', profile.id)
        .eq('active', true);

      // Contar total de notificações enviadas
      const { count: sentCount } = await supabase
        .from('alert_logs')
        .select('*, user_alert:user_alerts!inner(user_id)', { count: 'exact', head: true })
        .eq('user_alert.user_id', profile.id)
        .eq('status', 'sent');

      return {
        ...profile,
        _alertCount: alertCount || 0,
        _sentCount: sentCount || 0,
      };
    })
  );

  return NextResponse.json({ success: true, users: usersWithStats });
}

// POST - Criar usuário ou ações em lote
export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });

  const body = await req.json();
  const { action } = body;

  const supabase = createServiceClient();

  switch (action) {
    case 'update-plan': {
      const { userId, planType } = body as { userId: string; planType: PlanType };
      if (!userId || !planType) {
        return NextResponse.json({ error: 'userId e planType obrigatórios' }, { status: 400 });
      }

      const validPlans: PlanType[] = ['free', 'basic', 'premium'];
      if (!validPlans.includes(planType)) {
        return NextResponse.json({ error: 'Plano inválido' }, { status: 400 });
      }

      // Para planos pagos, definir expiração em 1 ano
      const planExpiresAt = planType === 'free'
        ? null
        : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

      const { error } = await supabase
        .from('profiles')
        .update({
          plan_type: planType,
          plan_expires_at: planExpiresAt,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, message: `Plano alterado para ${planType}` });
    }

    case 'toggle-admin': {
      const { userId, isAdmin } = body as { userId: string; isAdmin: boolean };
      if (!userId) return NextResponse.json({ error: 'userId obrigatório' }, { status: 400 });

      const { error } = await supabase
        .from('profiles')
        .update({ is_admin: isAdmin, updated_at: new Date().toISOString() })
        .eq('id', userId);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, message: isAdmin ? 'Admin ativado' : 'Admin desativado' });
    }

    case 'delete': {
      const { userId } = body as { userId: string };
      if (!userId) return NextResponse.json({ error: 'userId obrigatório' }, { status: 400 });

      // Não permitir auto-exclusão
      if (userId === admin.id) {
        return NextResponse.json({ error: 'Você não pode excluir a si mesmo' }, { status: 400 });
      }

      // Deletar via auth (cascata deleta profile e dados relacionados)
      const { error: authError } = await supabase.auth.admin.deleteUser(userId);

      if (authError) {
        // Fallback: deletar apenas o profile
        const { error } = await supabase.from('profiles').delete().eq('id', userId);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: 'Usuário excluído' });
    }

    default:
      return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
  }
}
