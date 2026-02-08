import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/supabase-server';
import { Profile } from '@/types/database';
import * as Brevo from '@getbrevo/brevo';
import { formatPhoneForSms } from '@/lib/brevo';

export async function POST(req: Request) {
  try {
    // Verificar se é admin
    const profile = (await getProfile()) as Profile | null;
    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    const { phone, message, type } = await req.json();

    if (!phone) {
      return NextResponse.json({ error: 'Número de telefone obrigatório' }, { status: 400 });
    }

    const smsApi = new Brevo.TransactionalSMSApi();
    smsApi.setApiKey(
      Brevo.TransactionalSMSApiApiKeys.apiKey,
      (process.env.BREVO_API_KEY || '').trim()
    );

    const formattedPhone = formatPhoneForSms(phone);

    const sendSms = new Brevo.SendTransacSms();
    sendSms.sender = 'ZapVest';
    sendSms.recipient = formattedPhone;

    if (type === 'alert') {
      sendSms.content = `ZapVest: ENEM 2026 - Inscricoes em 3 dias (10 de fevereiro de 2026). Acesse zapvest.com.br`;
    } else {
      sendSms.content = message || `ZapVest: Teste de SMS realizado com sucesso! Se voce recebeu esta mensagem, a integracao com Brevo SMS esta funcionando.`;
    }

    const result = await smsApi.sendTransacSms(sendSms);

    return NextResponse.json({
      success: true,
      message: `SMS enviado para ${formattedPhone}`,
      messageId: result?.body?.messageId || null,
      reference: result?.body?.reference || null,
    });
  } catch (error) {
    console.error('Erro ao enviar SMS de teste:', error);
    const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
    return NextResponse.json({
      success: false,
      error: errorMessage,
    }, { status: 500 });
  }
}
