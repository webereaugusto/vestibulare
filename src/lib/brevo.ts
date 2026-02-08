import * as Brevo from '@getbrevo/brevo';
import { Profile, ImportantDate, AlertChannel, Vestibular } from '@/types/database';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const brevoApiKey = (process.env.BREVO_API_KEY || '').trim();

const apiInstance = new Brevo.TransactionalEmailsApi();
apiInstance.setApiKey(
  Brevo.TransactionalEmailsApiApiKeys.apiKey,
  brevoApiKey
);

const smsApi = new Brevo.TransactionalSMSApi();
smsApi.setApiKey(
  Brevo.TransactionalSMSApiApiKeys.apiKey,
  brevoApiKey
);

function getSender() {
  return {
    name: process.env.BREVO_SENDER_NAME || 'ZapVest',
    email: process.env.BREVO_SENDER_EMAIL || 'alertas@zapvest.com.br',
  };
}

interface SendAlertParams {
  user: Profile;
  vestibular: Vestibular;
  importantDate: ImportantDate;
  channel: AlertChannel;
  daysUntilEvent: number;
}

export async function sendAlert({
  user,
  vestibular,
  importantDate,
  channel,
  daysUntilEvent,
}: SendAlertParams): Promise<{ success: boolean; error?: string }> {
  try {
    const formattedDate = format(new Date(importantDate.event_date), "dd 'de' MMMM 'de' yyyy", {
      locale: ptBR,
    });

    const urgencyText = daysUntilEvent === 1
      ? 'AMANHÃ'
      : daysUntilEvent === 0
        ? 'HOJE'
        : `em ${daysUntilEvent} dias`;

    switch (channel) {
      case 'email':
        return await sendEmailAlert({
          user,
          vestibular,
          importantDate,
          formattedDate,
          urgencyText,
        });
      case 'sms':
        return await sendSmsAlert({
          user,
          vestibular,
          importantDate,
          formattedDate,
          urgencyText,
        });
      case 'whatsapp':
        return await sendWhatsAppAlert({
          user,
          vestibular,
          importantDate,
          formattedDate,
          urgencyText,
        });
      default:
        return { success: false, error: `Canal não suportado: ${channel}` };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return { success: false, error: errorMessage };
  }
}

async function sendEmailAlert({
  user,
  vestibular,
  importantDate,
  formattedDate,
  urgencyText,
}: {
  user: Profile;
  vestibular: Vestibular;
  importantDate: ImportantDate;
  formattedDate: string;
  urgencyText: string;
}) {
  const sendSmtpEmail = new Brevo.SendSmtpEmail();

  sendSmtpEmail.to = [{ email: user.email, name: user.full_name || user.email }];
  sendSmtpEmail.sender = getSender();
  sendSmtpEmail.subject = `⚠️ ${vestibular.name}: ${importantDate.event_name} ${urgencyText}!`;
  sendSmtpEmail.htmlContent = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #25D366, #128C7E); padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">ZapVest</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0;">Alerta de Vestibular</p>
      </div>
      
      <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0;">
        <p style="color: #334155; font-size: 16px;">Ola, <strong>${user.full_name || 'estudante'}</strong>!</p>
        
        <div style="background: white; border-left: 4px solid #25D366; padding: 16px; margin: 16px 0; border-radius: 0 8px 8px 0;">
          <h2 style="color: #1e293b; margin: 0 0 8px; font-size: 18px;">${vestibular.name}</h2>
          <p style="color: #64748b; margin: 0 0 4px; font-size: 14px;">
            <strong>${importantDate.event_name}</strong>
          </p>
          <p style="color: #25D366; margin: 0; font-size: 20px; font-weight: bold;">
            ${formattedDate}
          </p>
          <p style="color: #ef4444; margin: 8px 0 0; font-size: 14px; font-weight: bold;">
            ${urgencyText}
          </p>
        </div>

        ${vestibular.official_url ? `
        <p style="text-align: center; margin: 24px 0;">
          <a href="${vestibular.official_url}" 
             style="background: #25D366; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; display: inline-block;">
            Acessar Site Oficial
          </a>
        </p>` : ''}
      </div>
      
      <div style="background: #f1f5f9; padding: 16px; border-radius: 0 0 12px 12px; text-align: center;">
        <p style="color: #94a3b8; font-size: 12px; margin: 0;">
          Voce recebeu este email porque ativou alertas para ${vestibular.name} no ZapVest.
        </p>
      </div>
    </div>
  `;

  await apiInstance.sendTransacEmail(sendSmtpEmail);
  return { success: true };
}

/**
 * Formatar número de telefone para formato internacional SMS (+55XXXXXXXXXXX)
 */
function formatPhoneForSms(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }
  if (!cleaned.startsWith('55')) {
    cleaned = '55' + cleaned;
  }
  return '+' + cleaned;
}

async function sendSmsAlert({
  user,
  vestibular,
  importantDate,
  formattedDate,
  urgencyText,
}: {
  user: Profile;
  vestibular: Vestibular;
  importantDate: ImportantDate;
  formattedDate: string;
  urgencyText: string;
}) {
  if (!user.phone) {
    return { success: false, error: 'Usuário sem telefone cadastrado' };
  }

  if (!user.phone_verified) {
    return { success: false, error: 'Telefone (SMS) não verificado pelo usuário' };
  }

  const sendSms = new Brevo.SendTransacSms();
  sendSms.sender = 'ZapVest';
  sendSms.recipient = formatPhoneForSms(user.phone);
  sendSms.content = `ZapVest: ${vestibular.name} - ${importantDate.event_name} ${urgencyText} (${formattedDate}). Acesse zapvest.com.br`;

  await smsApi.sendTransacSms(sendSms);
  return { success: true };
}

/** Exporta utilitários SMS para uso em rotas de teste */
export { smsApi, formatPhoneForSms };

async function sendWhatsAppAlert({
  user,
  vestibular,
  importantDate,
  formattedDate,
  urgencyText,
}: {
  user: Profile;
  vestibular: Vestibular;
  importantDate: ImportantDate;
  formattedDate: string;
  urgencyText: string;
}) {
  if (!user.phone) {
    return { success: false, error: 'Usuário sem telefone cadastrado' };
  }

  if (!user.whatsapp_verified) {
    return { success: false, error: 'WhatsApp não verificado pelo usuário' };
  }

  // Usa Evolution API para envio de WhatsApp
  const { sendTextMessage, buildAlertMessage, isEvolutionReady } = await import('@/lib/evolution');

  const ready = await isEvolutionReady();
  if (!ready) {
    return { success: false, error: 'Evolution API não está conectada. Configure em Admin > WhatsApp.' };
  }

  const message = buildAlertMessage({
    userName: user.full_name || 'estudante',
    vestibularName: vestibular.name,
    eventName: importantDate.event_name,
    formattedDate,
    urgencyText,
    officialUrl: vestibular.official_url || undefined,
  });

  const result = await sendTextMessage(user.phone, message);

  if (!result.success) {
    return { success: false, error: result.error || 'Falha ao enviar WhatsApp via Evolution' };
  }

  return { success: true };
}

// Email de confirmação de pagamento
export async function sendPaymentConfirmation(user: Profile, planName: string) {
  const sendSmtpEmail = new Brevo.SendSmtpEmail();

  sendSmtpEmail.to = [{ email: user.email, name: user.full_name || user.email }];
  sendSmtpEmail.sender = getSender();
  sendSmtpEmail.subject = `✅ Pagamento confirmado - Plano ${planName}`;
  sendSmtpEmail.htmlContent = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #10b981, #059669); padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">ZapVest</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0;">Pagamento Confirmado!</p>
      </div>
      
      <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-radius: 0 0 12px 12px;">
        <p style="color: #334155; font-size: 16px;">Olá, <strong>${user.full_name || 'estudante'}</strong>!</p>
        <p style="color: #334155;">Seu plano <strong>${planName}</strong> foi ativado com sucesso!</p>
        <p style="color: #334155;">Agora você tem acesso a todos os recursos do plano. Acesse seu painel para configurar seus alertas.</p>
        
        <p style="text-align: center; margin: 24px 0;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" 
             style="background: #10b981; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold;">
            Acessar Painel →
          </a>
        </p>
      </div>
    </div>
  `;

  try {
    await apiInstance.sendTransacEmail(sendSmtpEmail);
  } catch (error) {
    console.error('Erro ao enviar email de confirmação:', error);
  }
}
