import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { getUser, getProfile } from '@/lib/supabase-server';
import { Profile, AlertChannel } from '@/types/database';
import * as Brevo from '@getbrevo/brevo';
import { formatPhoneForSms } from '@/lib/brevo';

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(req: Request) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const profile = (await getProfile()) as Profile | null;
    if (!profile) return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 404 });

    const { channel } = (await req.json()) as { channel: AlertChannel };

    if (!['email', 'sms', 'whatsapp'].includes(channel)) {
      return NextResponse.json({ error: 'Canal inválido' }, { status: 400 });
    }

    // Validações por canal
    if (channel === 'sms' || channel === 'whatsapp') {
      if (!profile.phone) {
        return NextResponse.json({ error: 'Cadastre um telefone antes de verificar este canal.' }, { status: 400 });
      }
    }

    const supabase = createServiceClient();
    const code = generateCode();
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(); // 2 horas

    // Invalidar códigos anteriores do mesmo canal/usuário
    await supabase
      .from('verification_codes')
      .update({ used: true })
      .eq('user_id', profile.id)
      .eq('channel', channel)
      .eq('used', false);

    // Salvar novo código
    const { error: insertError } = await supabase.from('verification_codes').insert({
      user_id: profile.id,
      channel,
      code,
      expires_at: expiresAt,
    });

    if (insertError) {
      return NextResponse.json({ error: 'Erro ao gerar código' }, { status: 500 });
    }

    // Enviar código pelo canal escolhido
    const message = `VestibulaRe - Seu codigo de verificacao: ${code}\n\nEste codigo expira em 2 horas.`;

    switch (channel) {
      case 'email': {
        const apiInstance = new Brevo.TransactionalEmailsApi();
        apiInstance.setApiKey(Brevo.TransactionalEmailsApiApiKeys.apiKey, (process.env.BREVO_API_KEY || '').trim());

        const sendSmtpEmail = new Brevo.SendSmtpEmail();
        sendSmtpEmail.to = [{ email: profile.email, name: profile.full_name || profile.email }];
        sendSmtpEmail.sender = {
          name: process.env.BREVO_SENDER_NAME || 'VestibulaRe',
          email: process.env.BREVO_SENDER_EMAIL || 'alertas@vestibulare.com.br',
        };
        sendSmtpEmail.subject = `Seu codigo de verificacao: ${code}`;
        sendSmtpEmail.htmlContent = `
          <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 20px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 20px;">VestibulaRe</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 4px 0 0; font-size: 14px;">Verificacao de Email</p>
            </div>
            <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; text-align: center;">
              <p style="color: #334155; font-size: 14px;">Use o codigo abaixo para verificar seu email:</p>
              <div style="background: white; border: 2px dashed #6366f1; border-radius: 12px; padding: 16px; margin: 16px 0;">
                <p style="font-size: 32px; font-weight: bold; color: #6366f1; letter-spacing: 8px; margin: 0;">${code}</p>
              </div>
              <p style="color: #94a3b8; font-size: 12px;">Este codigo expira em 2 horas.</p>
            </div>
            <div style="background: #f1f5f9; padding: 12px; border-radius: 0 0 12px 12px; text-align: center;">
              <p style="color: #94a3b8; font-size: 11px; margin: 0;">Se voce nao solicitou este codigo, ignore esta mensagem.</p>
            </div>
          </div>
        `;
        await apiInstance.sendTransacEmail(sendSmtpEmail);
        break;
      }

      case 'sms': {
        const smsApi = new Brevo.TransactionalSMSApi();
        smsApi.setApiKey(Brevo.TransactionalSMSApiApiKeys.apiKey, (process.env.BREVO_API_KEY || '').trim());

        const sendSms = new Brevo.SendTransacSms();
        sendSms.sender = 'VestibulRe';
        sendSms.recipient = formatPhoneForSms(profile.phone!);
        sendSms.content = `VestibulaRe: Seu codigo de verificacao e ${code}. Valido por 2 horas.`;
        await smsApi.sendTransacSms(sendSms);
        break;
      }

      case 'whatsapp': {
        const { sendTextMessage, isEvolutionReady } = await import('@/lib/evolution');
        const ready = await isEvolutionReady();
        if (!ready) {
          return NextResponse.json({ error: 'WhatsApp nao esta conectado. Contate o suporte.' }, { status: 503 });
        }
        const whatsappMsg = `*VestibulaRe - Verificacao de WhatsApp*\n\nSeu codigo de verificacao: *${code}*\n\nEste codigo expira em 2 horas.`;
        const result = await sendTextMessage(profile.phone!, whatsappMsg);
        if (!result.success) {
          return NextResponse.json({ error: result.error || 'Falha ao enviar WhatsApp' }, { status: 500 });
        }
        break;
      }
    }

    return NextResponse.json({ success: true, message: `Codigo enviado via ${channel}` });
  } catch (error) {
    console.error('Erro ao enviar codigo de verificacao:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno',
    }, { status: 500 });
  }
}
