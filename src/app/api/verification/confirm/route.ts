import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { getUser, getProfile } from '@/lib/supabase-server';
import { Profile, AlertChannel } from '@/types/database';

const CHANNEL_TO_FIELD: Record<AlertChannel, string> = {
  email: 'email_verified',
  sms: 'phone_verified',
  whatsapp: 'whatsapp_verified',
};

export async function POST(req: Request) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const profile = (await getProfile()) as Profile | null;
    if (!profile) return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 404 });

    const { channel, code } = (await req.json()) as { channel: AlertChannel; code: string };

    if (!['email', 'sms', 'whatsapp'].includes(channel)) {
      return NextResponse.json({ error: 'Canal inválido' }, { status: 400 });
    }

    if (!code || code.length !== 6) {
      return NextResponse.json({ error: 'Código deve ter 6 dígitos' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Buscar código válido
    const { data: verificationCode, error: findError } = await supabase
      .from('verification_codes')
      .select('*')
      .eq('user_id', profile.id)
      .eq('channel', channel)
      .eq('code', code)
      .eq('used', false)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (findError) {
      return NextResponse.json({ error: 'Erro ao verificar código' }, { status: 500 });
    }

    if (!verificationCode) {
      return NextResponse.json({ error: 'Código inválido ou expirado. Solicite um novo.' }, { status: 400 });
    }

    // Marcar código como usado
    await supabase
      .from('verification_codes')
      .update({ used: true })
      .eq('id', verificationCode.id);

    // Atualizar campo verified no perfil
    const fieldName = CHANNEL_TO_FIELD[channel];
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ [fieldName]: true, updated_at: new Date().toISOString() })
      .eq('id', profile.id);

    if (updateError) {
      return NextResponse.json({ error: 'Erro ao atualizar perfil' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `${channel === 'email' ? 'Email' : channel === 'sms' ? 'Telefone (SMS)' : 'WhatsApp'} verificado com sucesso!`,
    });
  } catch (error) {
    console.error('Erro ao confirmar código:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno',
    }, { status: 500 });
  }
}
