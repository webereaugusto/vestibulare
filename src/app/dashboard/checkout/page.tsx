'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  MessageCircle,
  Check,
  Shield,
  CreditCard,
  Zap,
  ArrowLeft,
  Crown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import { createBrowserClient } from '@/lib/supabase';
import { PLANS, formatPrice } from '@/lib/plans';
import { PlanType, Profile } from '@/types/database';

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}

function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const planKey = searchParams.get('plan') as PlanType | null;
  const { addToast } = useToast();
  const supabase = createBrowserClient();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const plan = planKey && (planKey === 'basic' || planKey === 'premium') ? PLANS[planKey] : null;

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/login');
        return;
      }
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (data) setProfile(data as Profile);
      setLoadingProfile(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handlePayment() {
    if (!plan || !planKey) return;
    setLoading(true);

    try {
      const response = await fetch('/api/payments/create-preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planType: planKey }),
      });

      const data = await response.json();

      if (data.error) {
        addToast(data.error, 'error');
        setLoading(false);
        return;
      }

      if (data.init_point) {
        window.location.href = data.init_point;
      } else {
        addToast('Erro ao gerar link de pagamento. Tente novamente.', 'error');
        setLoading(false);
      }
    } catch {
      addToast('Erro ao processar pagamento. Tente novamente.', 'error');
      setLoading(false);
    }
  }

  if (loadingProfile) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
      </div>
    );
  }

  // Se plano invalido, redirecionar para upgrade
  if (!plan || !planKey) {
    return (
      <div className="max-w-lg mx-auto mt-12 text-center space-y-4">
        <p className="text-gray-600">Plano n\u00e3o encontrado.</p>
        <Link href="/dashboard/upgrade">
          <Button>Ver Planos</Button>
        </Link>
      </div>
    );
  }

  // Se ja tem o plano, redirecionar
  if (profile && profile.plan_type === planKey) {
    return (
      <div className="max-w-lg mx-auto mt-12 text-center space-y-4">
        <div className="mx-auto w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
          <Check className="h-8 w-8 text-emerald-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Voc\u00ea j\u00e1 possui o plano {plan.name}!</h2>
        <Link href="/dashboard">
          <Button>Ir para o Painel</Button>
        </Link>
      </div>
    );
  }

  const isPremium = planKey === 'premium';

  return (
    <div className="max-w-2xl mx-auto py-4">
      {/* Voltar */}
      <Link
        href="/dashboard/upgrade"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Ver todos os planos
      </Link>

      <div className="grid gap-6">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 mb-3">
            <MessageCircle className="h-8 w-8 text-emerald-600" />
            <span className="text-2xl font-bold text-gray-900">
              Zap<span className="text-emerald-600">Vest</span>
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            Assinar Plano {plan.name}
          </h1>
          <p className="text-gray-500 mt-1">{plan.description}</p>
        </div>

        {/* Card principal do checkout */}
        <Card className={`border-2 ${isPremium ? 'border-amber-400' : 'border-emerald-400'} shadow-lg`}>
          <CardContent className="p-0">
            {/* Header do plano */}
            <div
              className={`p-6 text-center rounded-t-lg ${
                isPremium
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600'
                  : 'bg-gradient-to-r from-emerald-500 to-emerald-600'
              } text-white`}
            >
              <div className="flex items-center justify-center gap-2 mb-2">
                {isPremium ? (
                  <Crown className="h-6 w-6" />
                ) : (
                  <Zap className="h-6 w-6" />
                )}
                <span className="text-lg font-bold">Plano {plan.name}</span>
              </div>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-4xl font-extrabold">{formatPrice(plan.price)}</span>
                <span className="text-white/80 text-sm">/ano</span>
              </div>
              <p className="text-white/80 text-sm mt-1">
                Equivale a {formatPrice(plan.price / 12)}/m\u00eas
              </p>
            </div>

            {/* Features */}
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">
                O que est\u00e1 inclu\u00eddo
              </h3>
              <ul className="space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${
                      isPremium ? 'bg-amber-100' : 'bg-emerald-100'
                    }`}>
                      <Check className={`h-3 w-3 ${isPremium ? 'text-amber-600' : 'text-emerald-600'}`} />
                    </div>
                    <span className="text-sm text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Resumo e Botao */}
            <div className="p-6 space-y-4">
              {/* Resumo do pagamento */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Plano {plan.name} (anual)</span>
                  <span className="font-medium text-gray-900">{formatPrice(plan.price)}</span>
                </div>
                <div className="border-t border-gray-200 pt-2 flex justify-between">
                  <span className="font-semibold text-gray-900">Total</span>
                  <span className="font-bold text-lg text-gray-900">{formatPrice(plan.price)}</span>
                </div>
              </div>

              {/* Botao Pagar */}
              <Button
                onClick={handlePayment}
                loading={loading}
                className={`w-full h-14 text-lg font-bold ${
                  isPremium
                    ? 'bg-amber-500 hover:bg-amber-600 text-white'
                    : ''
                }`}
              >
                <CreditCard className="h-5 w-5 mr-2" />
                {loading ? 'Redirecionando...' : `Pagar ${formatPrice(plan.price)}`}
              </Button>

              {/* Selos de confianca */}
              <div className="flex flex-col items-center gap-2 pt-2">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Shield className="h-4 w-4 text-emerald-500" />
                  Pagamento seguro via Mercado Pago
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-400">
                  <span>Pix</span>
                  <span>\u2022</span>
                  <span>Cart\u00e3o de Cr\u00e9dito</span>
                  <span>\u2022</span>
                  <span>Boleto</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Comparativo com plano atual */}
        {profile && profile.plan_type === 'free' && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                <Zap className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-emerald-900">
                  Upgrade do plano Gratuito para {plan.name}
                </p>
                <p className="text-xs text-emerald-700 mt-0.5">
                  Voc\u00ea ter\u00e1 acesso a {plan.features[0].toLowerCase()}, {plan.features[1].toLowerCase()} e muito mais.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* FAQ rapido */}
        <div className="text-center space-y-2 pb-4">
          <p className="text-xs text-gray-400">
            D\u00favidas? Entre em contato: contato@zapvest.com.br
          </p>
          <Link href="/dashboard" className="text-xs text-gray-500 hover:underline">
            Continuar com o plano gratuito
          </Link>
        </div>
      </div>
    </div>
  );
}
