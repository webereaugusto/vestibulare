import { NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase-server';
import { createPaymentPreference } from '@/lib/mercadopago';
import { PLANS } from '@/lib/plans';
import { PlanType } from '@/types/database';

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await req.json();
    const planType = body.planType as PlanType;

    if (!planType || !PLANS[planType] || planType === 'free') {
      return NextResponse.json({ error: 'Plano inválido' }, { status: 400 });
    }

    const result = await createPaymentPreference({
      userId: user.id,
      planType: planType as 'basic' | 'premium',
      userEmail: user.email!,
    });

    return NextResponse.json({
      id: result.id,
      init_point: result.init_point,
      sandbox_init_point: result.sandbox_init_point,
    });
  } catch (error) {
    console.error('Erro ao criar preferência:', error);
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('Detalhes:', JSON.stringify(error, null, 2));
    return NextResponse.json({ 
      error: `Erro ao processar pagamento: ${message}` 
    }, { status: 500 });
  }
}
