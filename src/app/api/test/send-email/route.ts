import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/supabase-server';
import { Profile } from '@/types/database';
import * as Brevo from '@getbrevo/brevo';

export async function POST(req: Request) {
  try {
    // Verificar se é admin
    const profile = (await getProfile()) as Profile | null;
    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    const { to, subject, type } = await req.json();
    const targetEmail = to || profile.email;

    const apiInstance = new Brevo.TransactionalEmailsApi();
    apiInstance.setApiKey(
      Brevo.TransactionalEmailsApiApiKeys.apiKey,
      process.env.BREVO_API_KEY!
    );

    const sendSmtpEmail = new Brevo.SendSmtpEmail();
    const sender = {
      name: process.env.BREVO_SENDER_NAME || 'VestibulaRe',
      email: process.env.BREVO_SENDER_EMAIL || 'alertas@vestibulare.com.br',
    };

    sendSmtpEmail.to = [{ email: targetEmail, name: profile.full_name || targetEmail }];
    sendSmtpEmail.sender = sender;

    if (type === 'alert') {
      // Simular email de alerta de vestibular
      sendSmtpEmail.subject = subject || '⚠️ ENEM: Inscrições em 3 dias!';
      sendSmtpEmail.htmlContent = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">🎓 VestibulaRe</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0;">Alerta de Vestibular</p>
          </div>
          
          <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0;">
            <p style="color: #334155; font-size: 16px;">Olá, <strong>${profile.full_name || 'estudante'}</strong>!</p>
            
            <div style="background: white; border-left: 4px solid #6366f1; padding: 16px; margin: 16px 0; border-radius: 0 8px 8px 0;">
              <h2 style="color: #1e293b; margin: 0 0 8px; font-size: 18px;">ENEM 2026</h2>
              <p style="color: #64748b; margin: 0 0 4px; font-size: 14px;">
                <strong>Inscrições ENEM</strong>
              </p>
              <p style="color: #6366f1; margin: 0; font-size: 20px; font-weight: bold;">
                📅 10 de fevereiro de 2026
              </p>
              <p style="color: #ef4444; margin: 8px 0 0; font-size: 14px; font-weight: bold;">
                ⏰ em 3 dias
              </p>
            </div>

            <p style="text-align: center; margin: 24px 0;">
              <a href="https://www.gov.br/inep/pt-br/areas-de-atuacao/avaliacao-e-exames-educacionais/enem" 
                 style="background: #6366f1; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; display: inline-block;">
                Acessar Site Oficial →
              </a>
            </p>
          </div>
          
          <div style="background: #f1f5f9; padding: 16px; border-radius: 0 0 12px 12px; text-align: center;">
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">
              Este é um email de TESTE do VestibulaRe.
            </p>
          </div>
        </div>
      `;
    } else {
      // Email de teste simples
      sendSmtpEmail.subject = subject || '✅ Teste VestibulaRe - Email funcionando!';
      sendSmtpEmail.htmlContent = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #10b981, #059669); padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">🎓 VestibulaRe</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0;">Teste de Email</p>
          </div>
          
          <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-radius: 0 0 12px 12px;">
            <p style="color: #334155; font-size: 16px;">Olá, <strong>${profile.full_name || 'admin'}</strong>!</p>
            <p style="color: #334155;">Se você está lendo isso, o envio de emails via <strong>Brevo</strong> está funcionando corretamente! 🎉</p>
            
            <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0;">
              <p style="color: #64748b; margin: 0; font-size: 14px;">
                <strong>Detalhes do teste:</strong><br>
                Enviado para: ${targetEmail}<br>
                Data: ${new Date().toLocaleString('pt-BR')}<br>
                API: Brevo Transactional Email
              </p>
            </div>
          </div>
        </div>
      `;
    }

    const result = await apiInstance.sendTransacEmail(sendSmtpEmail);

    return NextResponse.json({
      success: true,
      message: `Email enviado para ${targetEmail}`,
      messageId: result?.body?.messageId || null,
    });
  } catch (error) {
    console.error('Erro ao enviar email de teste:', error);
    const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
    return NextResponse.json({
      success: false,
      error: errorMessage,
    }, { status: 500 });
  }
}
