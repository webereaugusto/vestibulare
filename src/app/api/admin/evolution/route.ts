import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/supabase-server';
import { Profile } from '@/types/database';
import {
  getQrCode,
  ensureZapVestInstance,
  logoutInstance,
  deleteInstance,
  restartInstance,
  sendTextMessage,
  checkWhatsAppNumber,
  getInstanceName,
  type EvolutionInstanceStatus,
} from '@/lib/evolution';

async function requireAdmin() {
  const profile = (await getProfile()) as Profile | null;
  if (!profile?.is_admin) {
    return null;
  }
  return profile;
}

function jsonStatus(status: EvolutionInstanceStatus, init?: ResponseInit) {
  return NextResponse.json({
    success: status.success,
    status: status.status,
    instanceName: status.instanceName,
    info: status.info,
    qr: status.qr ?? null,
    error: status.error,
  }, init);
}

// GET - Buscar status da instância
export async function GET(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');

  try {
    switch (action) {
      case 'status': {
        const status = await ensureZapVestInstance({
          createIfMissing: false,
          includeQr: false,
        });
        return jsonStatus(status);
      }

      case 'qrcode': {
        const qr = await getQrCode();
        const status = await ensureZapVestInstance({
          createIfMissing: false,
          includeQr: false,
        });
        return NextResponse.json({
          success: true,
          status: qr ? 'connecting' : status.status,
          instanceName: getInstanceName(),
          info: status.info,
          qr,
          error: status.error,
        });
      }

      case 'info': {
        const status = await ensureZapVestInstance({
          createIfMissing: false,
          includeQr: false,
        });
        return jsonStatus(status);
      }

      default:
        return jsonStatus(await ensureZapVestInstance({
          createIfMissing: false,
          includeQr: false,
        }));
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// POST - Ações na instância
export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });

  try {
    const body = await req.json();
    const { action, phone, message } = body;

    switch (action) {
      case 'ensure': {
        const status = await ensureZapVestInstance({
          createIfMissing: true,
          includeQr: true,
        });
        return jsonStatus(status, { status: status.success ? 200 : 500 });
      }

      case 'create': {
        const status = await ensureZapVestInstance({
          createIfMissing: true,
          includeQr: true,
        });
        return jsonStatus(status, { status: status.success ? 200 : 500 });
      }

      case 'connect': {
        const status = await ensureZapVestInstance({
          createIfMissing: false,
          includeQr: true,
        });
        return jsonStatus(status, { status: status.success ? 200 : 500 });
      }

      case 'logout': {
        const result = await logoutInstance();
        const status = await ensureZapVestInstance({
          createIfMissing: false,
          includeQr: false,
        });
        return NextResponse.json({ ...status, result, success: true });
      }

      case 'restart': {
        const result = await restartInstance();
        const status = await ensureZapVestInstance({
          createIfMissing: false,
          includeQr: false,
        });
        return NextResponse.json({ ...status, result, success: true });
      }

      case 'delete': {
        const result = await deleteInstance();
        return NextResponse.json({
          success: true,
          status: 'missing',
          instanceName: getInstanceName(),
          info: null,
          qr: null,
          result,
        });
      }

      case 'test-message': {
        if (typeof phone !== 'string' || !phone.trim()) {
          return NextResponse.json({ error: 'Número de telefone obrigatório' }, { status: 400 });
        }
        const status = await ensureZapVestInstance({
          createIfMissing: false,
          includeQr: false,
        });
        if (status.status !== 'open') {
          return NextResponse.json({
            ...status,
            success: false,
            error: 'WhatsApp ainda não está conectado.',
          }, { status: 409 });
        }
        const text = typeof message === 'string' && message.trim()
          ? message.trim()
          : '✅ Teste ZapVest - WhatsApp funcionando!\n\n🎓 Se você recebeu esta mensagem, a integração com Evolution API está configurada corretamente.';
        const result = await sendTextMessage(phone, text);
        return NextResponse.json({
          ...status,
          success: result.success,
          result,
          error: result.error,
        }, { status: result.success ? 200 : 500 });
      }

      case 'check-number': {
        if (typeof phone !== 'string' || !phone.trim()) {
          return NextResponse.json({ error: 'Número de telefone obrigatório' }, { status: 400 });
        }
        const result = await checkWhatsAppNumber(phone);
        const status = await ensureZapVestInstance({
          createIfMissing: false,
          includeQr: false,
        });
        return NextResponse.json({ ...status, success: true, result });
      }

      default:
        return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
