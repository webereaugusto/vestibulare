import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { verifyCronSecret } from '@/lib/utils';

export async function GET(req: Request) {
  // Verificar autenticação do cron
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const supabase = createServiceClient();
    const now = new Date().toISOString();

    // Buscar perfis com planos expirados
    const { data: expiredProfiles, error } = await supabase
      .from('profiles')
      .select('id, email, plan_type, plan_expires_at')
      .neq('plan_type', 'free')
      .lt('plan_expires_at', now);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    if (!expiredProfiles || expiredProfiles.length === 0) {
      return NextResponse.json({ success: true, message: 'Nenhum plano expirado', downgraded: 0 });
    }

    // Fazer downgrade para free
    let downgraded = 0;
    for (const profile of expiredProfiles) {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          plan_type: 'free',
          plan_expires_at: null,
        })
        .eq('id', profile.id);

      if (updateError) {
        console.error(`Erro ao fazer downgrade do usuário ${profile.email}:`, updateError);
      } else {
        downgraded++;
        console.log(`Downgrade: ${profile.email} (${profile.plan_type} -> free)`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `${downgraded} planos expirados convertidos para gratuito`,
      downgraded,
    });
  } catch (error) {
    console.error('Erro no cron check-expirations:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno',
    }, { status: 500 });
  }
}
