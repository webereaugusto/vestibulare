/**
 * Evolution API Client
 * https://doc.evolution-api.com
 *
 * Usado para envio de mensagens WhatsApp via instância própria.
 */

const getBaseUrl = () => process.env.EVOLUTION_API_URL || '';
const getApiKey = () => process.env.EVOLUTION_API_KEY || '';
const getInstanceName = () => process.env.EVOLUTION_INSTANCE_NAME || 'vestibulare';

function headers() {
  return {
    'Content-Type': 'application/json',
    apikey: getApiKey(),
  };
}

async function request(path: string, options?: RequestInit) {
  const baseUrl = getBaseUrl().replace(/\/+$/, '');
  if (!baseUrl) throw new Error('EVOLUTION_API_URL não configurada');
  if (!getApiKey()) throw new Error('EVOLUTION_API_KEY não configurada');

  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { ...headers(), ...options?.headers },
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const errorMsg = data?.message || data?.error || `HTTP ${res.status}`;
    throw new Error(typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg));
  }

  return data;
}

// ============================================
// Gerenciamento de Instância
// ============================================

export interface InstanceInfo {
  instanceName: string;
  state: string;
  profileName?: string;
  profilePictureUrl?: string;
  number?: string;
}

/**
 * Criar nova instância
 */
export async function createInstance(instanceName?: string) {
  const name = instanceName || getInstanceName();
  return request('/instance/create', {
    method: 'POST',
    body: JSON.stringify({
      instanceName: name,
      integration: 'WHATSAPP-BAILEYS',
      qrcode: true,
      rejectCall: true,
      msgCall: 'Não aceitamos ligações neste número.',
      groupsIgnore: true,
      alwaysOnline: false,
      readMessages: false,
      readStatus: false,
    }),
  });
}

/**
 * Buscar QR Code para conectar
 */
export async function getQrCode(instanceName?: string) {
  const name = instanceName || getInstanceName();
  return request(`/instance/connect/${name}`, { method: 'GET' });
}

/**
 * Verificar estado da conexão
 */
export async function getConnectionState(instanceName?: string): Promise<{
  state: string;
  instance: string;
}> {
  const name = instanceName || getInstanceName();
  const data = await request(`/instance/connectionState/${name}`, { method: 'GET' });
  // Evolution API retorna { instance: { instanceName, state } }
  return {
    state: data?.instance?.state || data?.state || 'unknown',
    instance: data?.instance?.instanceName || name,
  };
}

/**
 * Buscar info da instância (número, nome, foto)
 */
export async function fetchInstanceInfo(instanceName?: string): Promise<InstanceInfo | null> {
  const name = instanceName || getInstanceName();
  try {
    const data = await request(`/instance/fetchInstances?instanceName=${name}`, { method: 'GET' });
    // Evolution API v2 retorna { value: [...], Count: N }
    // Evolution API v1 retorna array direto [...]
    const instances = Array.isArray(data) ? data : data?.value || [];
    if (instances.length > 0) {
      const inst = instances[0];
      return {
        instanceName: inst.name || inst.instance?.instanceName || name,
        state: inst.connectionStatus || inst.instance?.state || 'unknown',
        profileName: inst.profileName || inst.instance?.profileName || undefined,
        profilePictureUrl: inst.profilePicUrl || inst.instance?.profilePicUrl || undefined,
        number: inst.number || inst.ownerJid?.replace('@s.whatsapp.net', '') || inst.instance?.owner || undefined,
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Desconectar instância (logout)
 */
export async function logoutInstance(instanceName?: string) {
  const name = instanceName || getInstanceName();
  return request(`/instance/logout/${name}`, { method: 'DELETE' });
}

/**
 * Deletar instância
 */
export async function deleteInstance(instanceName?: string) {
  const name = instanceName || getInstanceName();
  return request(`/instance/delete/${name}`, { method: 'DELETE' });
}

/**
 * Reiniciar instância
 */
export async function restartInstance(instanceName?: string) {
  const name = instanceName || getInstanceName();
  return request(`/instance/restart/${name}`, { method: 'PUT' });
}

// ============================================
// Envio de Mensagens
// ============================================

/**
 * Formatar número de telefone para o formato do WhatsApp (55XXXXXXXXXXX)
 */
export function formatPhoneNumber(phone: string): string {
  // Remove tudo que não é número
  let cleaned = phone.replace(/\D/g, '');

  // Se começa com 0, remove
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }

  // Se não começa com 55 (código do Brasil), adiciona
  if (!cleaned.startsWith('55')) {
    cleaned = '55' + cleaned;
  }

  return cleaned;
}

/**
 * Enviar mensagem de texto
 */
export async function sendTextMessage(
  phone: string,
  text: string,
  instanceName?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const name = instanceName || getInstanceName();
  const number = formatPhoneNumber(phone);

  try {
    const result = await request(`/message/sendText/${name}`, {
      method: 'POST',
      body: JSON.stringify({
        number,
        text,
      }),
    });

    return {
      success: true,
      messageId: result?.key?.id || result?.messageId,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao enviar mensagem',
    };
  }
}

/**
 * Verificar se o número tem WhatsApp
 */
export async function checkWhatsAppNumber(
  phone: string,
  instanceName?: string
): Promise<{ exists: boolean; jid?: string }> {
  const name = instanceName || getInstanceName();
  const number = formatPhoneNumber(phone);

  try {
    const result = await request(`/chat/whatsappNumbers/${name}`, {
      method: 'POST',
      body: JSON.stringify({ numbers: [number] }),
    });

    if (Array.isArray(result) && result.length > 0) {
      return { exists: result[0].exists, jid: result[0].jid };
    }
    return { exists: false };
  } catch {
    return { exists: false };
  }
}

/**
 * Verificar se a Evolution API está configurada e conectada
 */
export async function isEvolutionReady(): Promise<boolean> {
  if (!getBaseUrl() || !getApiKey()) return false;

  try {
    const state = await getConnectionState();
    return state.state === 'open';
  } catch {
    return false;
  }
}

/**
 * Montar mensagem de alerta para WhatsApp
 */
export function buildAlertMessage(params: {
  userName: string;
  vestibularName: string;
  eventName: string;
  formattedDate: string;
  urgencyText: string;
  officialUrl?: string;
}): string {
  const lines = [
    `🎓 *VestibulaRe - Alerta de Vestibular*`,
    ``,
    `Olá, *${params.userName}*!`,
    ``,
    `📋 *${params.vestibularName}*`,
    `📌 ${params.eventName}`,
    `📅 ${params.formattedDate}`,
    `⏰ *${params.urgencyText}*`,
  ];

  if (params.officialUrl) {
    lines.push(``, `🔗 Site oficial: ${params.officialUrl}`);
  }

  lines.push(``, `_Enviado por VestibulaRe_`);

  return lines.join('\n');
}
