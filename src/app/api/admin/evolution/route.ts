import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/supabase-server';
import { Profile } from '@/types/database';
import {
  createInstance,
  getQrCode,
  getConnectionState,
  fetchInstanceInfo,
  logoutInstance,
  deleteInstance,
  restartInstance,
  sendTextMessage,
  checkWhatsAppNumber,
} from '@/lib/evolution';

async function requireAdmin() {
  const profile = (await getProfile()) as Profile | null;
  if (!profile?.is_admin) {
    return null;
  }
  return profile;
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
        const state = await getConnectionState();
        const info = await fetchInstanceInfo();
        return NextResponse.json({ success: true, state, info });
      }

      case 'qrcode': {
        const qr = await getQrCode();
        return NextResponse.json({ success: true, qr });
      }

      case 'info': {
        const info = await fetchInstanceInfo();
        return NextResponse.json({ success: true, info });
      }

      default:
        // Retorna status geral
        try {
          const state = await getConnectionState();
          const info = await fetchInstanceInfo();
          return NextResponse.json({ success: true, state, info });
        } catch (error) {
          return NextResponse.json({
            success: true,
            state: { state: 'disconnected' },
            info: null,
            error: error instanceof Error ? error.message : 'Instância não encontrada',
          });
        }
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
      case 'create': {
        const result = await createInstance();
        return NextResponse.json({ success: true, result });
      }

      case 'connect': {
        const qr = await getQrCode();
        return NextResponse.json({ success: true, qr });
      }

      case 'logout': {
        const result = await logoutInstance();
        return NextResponse.json({ success: true, result });
      }

      case 'restart': {
        const result = await restartInstance();
        return NextResponse.json({ success: true, result });
      }

      case 'delete': {
        const result = await deleteInstance();
        return NextResponse.json({ success: true, result });
      }

      case 'test-message': {
        if (!phone) {
          return NextResponse.json({ error: 'Número de telefone obrigatório' }, { status: 400 });
        }
        const text = message || '✅ Teste ZapVest - WhatsApp funcionando!\n\n🎓 Se você recebeu esta mensagem, a integração com Evolution API está configurada corretamente.';
        const result = await sendTextMessage(phone, text);
        return NextResponse.json({ success: result.success, result });
      }

      case 'check-number': {
        if (!phone) {
          return NextResponse.json({ error: 'Número de telefone obrigatório' }, { status: 400 });
        }
        const result = await checkWhatsAppNumber(phone);
        return NextResponse.json({ success: true, result });
      }

      default:
        return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
