'use client';

import { useState, useEffect } from 'react';
import { Check, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import { createBrowserClient } from '@/lib/supabase';
import { PLANS, formatPrice } from '@/lib/plans';
import { Profile, PlanType } from '@/types/database';

export default function UpgradePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const { addToast } = useToast();
  const supabase = createBrowserClient();

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (data) setProfile(data as Profile);
  }

  async function handleUpgrade(planType: PlanType) {
    if (!profile || planType === 'free') return;
    setLoading(planType);

    try {
      const response = await fetch('/api/payments/create-preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planType }),
      });

      const data = await response.json();

      if (data.error) {
        addToast(data.error, 'error');
        return;
      }

      // Redirecionar para checkout do Mercado Pago
      window.location.href = data.init_point;
    } catch {
      addToast('Erro ao processar upgrade. Tente novamente.', 'error');
    } finally {
      setLoading(null);
    }
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Plano e Assinatura</h1>
        <p className="text-gray-500 mt-1">
          Seu plano atual:{' '}
          <Badge variant={profile.plan_type === 'premium' ? 'default' : profile.plan_type === 'basic' ? 'success' : 'secondary'}>
            {PLANS[profile.plan_type].name}
          </Badge>
          {profile.plan_expires_at && (
            <span className="ml-2">
              (expira em {new Date(profile.plan_expires_at).toLocaleDateString('pt-BR')})
            </span>
          )}
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {(Object.entries(PLANS) as [PlanType, typeof PLANS[PlanType]][]).map(([key, plan]) => {
          const isCurrent = profile.plan_type === key;
          const isDowngrade =
            (key === 'free' && profile.plan_type !== 'free') ||
            (key === 'basic' && profile.plan_type === 'premium');

          return (
            <Card
              key={key}
              className={`relative ${
                plan.popular ? 'border-indigo-600 border-2 shadow-lg' : ''
              } ${isCurrent ? 'ring-2 ring-indigo-200' : ''}`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-indigo-600 text-white">Mais Popular</Badge>
                </div>
              )}
              {isCurrent && (
                <div className="absolute -top-3 right-4">
                  <Badge variant="success">Plano Atual</Badge>
                </div>
              )}
              <CardHeader className="text-center">
                {key === 'premium' && <Crown className="h-8 w-8 text-indigo-600 mx-auto mb-2" />}
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-gray-900">
                    {plan.price === 0 ? 'Grátis' : formatPrice(plan.price)}
                  </span>
                  {plan.price > 0 && <span className="text-gray-500 text-sm">/ano</span>}
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-gray-600">
                      <Check className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                      {feature}
                    </li>
                  ))}
                </ul>
                {isCurrent ? (
                  <Button className="w-full" variant="outline" disabled>
                    Plano Atual
                  </Button>
                ) : isDowngrade ? (
                  <Button className="w-full" variant="outline" disabled>
                    Downgrade
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    variant={plan.popular ? 'default' : 'outline'}
                    onClick={() => handleUpgrade(key)}
                    loading={loading === key}
                  >
                    Assinar {plan.name}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
