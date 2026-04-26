/**
 * Evolution API Client
 * https://doc.evolution-api.com
 *
 * Usado para envio de mensagens WhatsApp via instância própria.
 */

import { createServiceClient } from '@/lib/supabase';

const getBaseUrl = () => process.env.EVOLUTION_API_URL || '';
const getApiKey = () => process.env.EVOLUTION_API_KEY || '';
export const getInstanceName = () => process.env.EVOLUTION_INSTANCE_NAME || 'zapvest';

export type EvolutionOperationalStatus =
  | 'unconfigured'
  | 'missing'
  | 'created'
  | 'connecting'
  | 'open'
  | 'closed'
  | 'error';

export interface EvolutionQrCode {
  base64?: string;
  code?: string;
  pairingCode?: string;
  generatedAt: string;
  raw: unknown;
}

export interface EvolutionInstanceStatus {
  success: boolean;
  status: EvolutionOperationalStatus;
  instanceName: string;
  info: InstanceInfo | null;
  qr?: EvolutionQrCode | null;
  error?: string;
}

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

function normalizeConnectionState(state?: string | null): EvolutionOperationalStatus {
  const normalized = (state || '').toLowerCase();

  if (['open', 'connected', 'connect'].includes(normalized)) return 'open';
  if (['connecting', 'qrcode', 'qr', 'pairing'].includes(normalized)) return 'connecting';
  if (['close', 'closed', 'disconnected', 'disconnect', 'logout'].includes(normalized)) return 'closed';
  if (['created', 'initialized'].includes(normalized)) return 'created';

  return normalized ? 'closed' : 'missing';
}

function isAlreadyExistsError(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return message.includes('already') || message.includes('exist') || message.includes('já existe');
}

export function extractQrCode(data: unknown): EvolutionQrCode | null {
  if (!data) return null;

  if (typeof data === 'string') {
    return {
      code: data,
      generatedAt: new Date().toISOString(),
      raw: data,
    };
  }

  if (typeof data !== 'object') return null;

  const record = data as Record<string, unknown>;
  const qrcode = typeof record.qrcode === 'object' && record.qrcode
    ? record.qrcode as Record<string, unknown>
    : {};

  const base64 = [
    record.base64,
    record.qr,
    qrcode.base64,
    qrcode.image,
  ].find((value): value is string => typeof value === 'string' && value.length > 0);

  const code = [
    record.code,
    record.qrCode,
    qrcode.code,
    qrcode.qrCode,
  ].find((value): value is string => typeof value === 'string' && value.length > 0);

  const pairingCode = [
    record.pairingCode,
    qrcode.pairingCode,
  ].find((value): value is string => typeof value === 'string' && value.length > 0);

  if (!base64 && !code && !pairingCode) return null;

  return {
    base64,
    code,
    pairingCode,
    generatedAt: new Date().toISOString(),
    raw: data,
  };
}

async function saveInstanceStatus(params: {
  instanceName: string;
  status: EvolutionOperationalStatus;
  info?: InstanceInfo | null;
  qr?: EvolutionQrCode | null;
  error?: string | null;
}) {
  try {
    const supabase = createServiceClient();
    const now = new Date().toISOString();

    await supabase.from('whatsapp_instances').upsert({
      instance_name: params.instanceName,
      state: params.status,
      phone: params.info?.number ?? null,
      profile_name: params.info?.profileName ?? null,
      profile_picture_url: params.info?.profilePictureUrl ?? null,
      last_qr_at: params.qr ? params.qr.generatedAt : undefined,
      last_connected_at: params.status === 'open' ? now : undefined,
      last_error: params.error ?? null,
      updated_at: now,
    }, { onConflict: 'instance_name' });
  } catch {
    // A tabela pode ainda não existir em ambientes que não executaram o setup atualizado.
  }
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
  const result = await request('/instance/create', {
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

  await saveInstanceStatus({
    instanceName: name,
    status: 'created',
    qr: extractQrCode(result),
  });

  return result;
}

/**
 * Buscar QR Code para conectar
 */
export async function getQrCode(instanceName?: string): Promise<EvolutionQrCode | null> {
  const name = instanceName || getInstanceName();
  const result = await request(`/instance/connect/${name}`, { method: 'GET' });
  const qr = extractQrCode(result);

  await saveInstanceStatus({
    instanceName: name,
    status: qr ? 'connecting' : 'closed',
    qr,
  });

  return qr;
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
    state: normalizeConnectionState(data?.instance?.state || data?.state),
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
        state: normalizeConnectionState(inst.connectionStatus || inst.instance?.state),
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
  const result = await request(`/instance/logout/${name}`, { method: 'DELETE' });
  await saveInstanceStatus({ instanceName: name, status: 'closed' });
  return result;
}

/**
 * Deletar instância
 */
export async function deleteInstance(instanceName?: string) {
  const name = instanceName || getInstanceName();
  const result = await request(`/instance/delete/${name}`, { method: 'DELETE' });
  await saveInstanceStatus({ instanceName: name, status: 'missing' });
  return result;
}

/**
 * Reiniciar instância
 */
export async function restartInstance(instanceName?: string) {
  const name = instanceName || getInstanceName();
  const result = await request(`/instance/restart/${name}`, { method: 'PUT' });
  await saveInstanceStatus({ instanceName: name, status: 'connecting' });
  return result;
}

export async function ensureZapVestInstance(options?: {
  createIfMissing?: boolean;
  includeQr?: boolean;
}): Promise<EvolutionInstanceStatus> {
  const instanceName = getInstanceName();
  const createIfMissing = options?.createIfMissing ?? true;
  const includeQr = options?.includeQr ?? true;

  if (!getBaseUrl() || !getApiKey()) {
    const status: EvolutionInstanceStatus = {
      success: false,
      status: 'unconfigured',
      instanceName,
      info: null,
      error: !getBaseUrl()
        ? 'EVOLUTION_API_URL não configurada'
        : 'EVOLUTION_API_KEY não configurada',
    };
    await saveInstanceStatus({
      instanceName,
      status: status.status,
      error: status.error,
    });
    return status;
  }

  try {
    let info = await fetchInstanceInfo(instanceName);
    let qr: EvolutionQrCode | null = null;

    if (!info && createIfMissing) {
      try {
        const createResult = await createInstance(instanceName);
        qr = extractQrCode(createResult);
      } catch (error) {
        if (!isAlreadyExistsError(error)) {
          throw error;
        }
      }

      info = await fetchInstanceInfo(instanceName);
    }

    if (!info && !createIfMissing) {
      const status: EvolutionInstanceStatus = {
        success: true,
        status: 'missing',
        instanceName,
        info: null,
      };
      await saveInstanceStatus({ instanceName, status: 'missing' });
      return status;
    }

    let status: EvolutionOperationalStatus = info?.state
      ? normalizeConnectionState(info.state)
      : 'created';

    try {
      const connection = await getConnectionState(instanceName);
      status = normalizeConnectionState(connection.state);
    } catch (error) {
      if (!info && !createIfMissing) {
        status = 'missing';
      } else if (!isAlreadyExistsError(error)) {
        status = info ? normalizeConnectionState(info.state) : 'created';
      }
    }

    if (status !== 'open' && includeQr) {
      qr = qr || await getQrCode(instanceName);
      if (qr) status = 'connecting';
    }

    info = await fetchInstanceInfo(instanceName) || info;

    const result: EvolutionInstanceStatus = {
      success: true,
      status,
      instanceName,
      info,
      qr,
    };

    await saveInstanceStatus({
      instanceName,
      status,
      info,
      qr,
    });

    return result;
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido';
    const status: EvolutionInstanceStatus = {
      success: false,
      status: 'error',
      instanceName,
      info: null,
      error: msg,
    };

    await saveInstanceStatus({
      instanceName,
      status: 'error',
      error: msg,
    });

    return status;
  }
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
    const status = await ensureZapVestInstance({
      createIfMissing: false,
      includeQr: false,
    });
    return status.status === 'open';
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
    `*ZapVest - Alerta de Vestibular*`,
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

  lines.push(``, `_Enviado por ZapVest_`);

  return lines.join('\n');
}
