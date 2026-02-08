'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { MessageCircle, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { createBrowserClient } from '@/lib/supabase';
import { PLANS, formatPrice } from '@/lib/plans';
import { PlanType } from '@/types/database';

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
      </div>
    }>
      <SignupForm />
    </Suspense>
  );
}

function SignupForm() {
  const searchParams = useSearchParams();
  const selectedPlan = searchParams.get('plan') as PlanType | null;
  const isPaidPlan = selectedPlan === 'basic' || selectedPlan === 'premium';
  const planInfo = isPaidPlan ? PLANS[selectedPlan] : null;

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [redirectingToPayment, setRedirectingToPayment] = useState(false);
  const [pendingPlan, setPendingPlan] = useState<PlanType | null>(null);
  const router = useRouter();
  const supabase = createBrowserClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      setLoading(false);
      return;
    }

    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone: phone || undefined,
          },
          emailRedirectTo: isPaidPlan
            ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(`/dashboard/checkout?plan=${selectedPlan}`)}`
            : `${window.location.origin}/auth/callback`,
        },
      });

      if (authError) {
        if (authError.message.includes('already registered')) {
          setError('Este email já está cadastrado. Tente fazer login.');
        } else {
          setError(authError.message);
        }
        return;
      }

      if (data.session) {
        if (phone && data.user) {
          await supabase
            .from('profiles')
            .update({ phone, full_name: fullName })
            .eq('id', data.user.id);
        }

        if (isPaidPlan) {
          setRedirectingToPayment(true);
          router.push(`/dashboard/checkout?plan=${selectedPlan}`);
          return;
        }

        router.push('/dashboard');
        router.refresh();
      } else {
        // Email precisa ser confirmado
        setPendingPlan(isPaidPlan ? selectedPlan : null);
        setSuccess(true);
      }
    } catch {
      setError('Ocorreu um erro. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2">
              <MessageCircle className="h-10 w-10 text-emerald-600" />
              <span className="text-2xl font-bold text-gray-900">
                Zap<span className="text-emerald-600">Vest</span>
              </span>
            </Link>
          </div>

          {/* Banner do plano pendente */}
          {pendingPlan && planInfo && (
            <div className="mb-4 p-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Zap className="h-5 w-5" />
                <span className="font-semibold">Plano {planInfo.name} reservado!</span>
              </div>
              <p className="text-emerald-100 text-xs">
                Confirme seu email para ir ao pagamento
              </p>
            </div>
          )}

          <Card>
            <CardContent className="p-8 text-center">
              <div className="mx-auto w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                <svg className="h-8 w-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Verifique seu email</h2>
              <p className="text-gray-600 mb-2">
                Enviamos um link de confirma\u00e7\u00e3o para <strong>{email}</strong>.
              </p>
              <p className="text-gray-500 text-sm mb-6">
                {pendingPlan
                  ? 'Ap\u00f3s confirmar, voc\u00ea ser\u00e1 direcionado para a tela de pagamento.'
                  : 'Clique no link para ativar sua conta.'}
              </p>
              <Link href="/auth/login">
                <Button variant="outline" className="w-full">
                  Ir para o Login
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <MessageCircle className="h-10 w-10 text-emerald-600" />
            <span className="text-2xl font-bold text-gray-900">
              Zap<span className="text-emerald-600">Vest</span>
            </span>
          </Link>
        </div>

        {/* Banner do plano selecionado */}
        {isPaidPlan && planInfo && (
          <div className="mb-4 p-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Zap className="h-5 w-5" />
              <span className="font-semibold text-lg">Plano {planInfo.name}</span>
            </div>
            <p className="text-emerald-100 text-sm">
              {formatPrice(planInfo.price)}/ano - {planInfo.features[0]}
            </p>
            <p className="text-emerald-200 text-xs mt-1">
              Crie sua conta e va direto para o pagamento
            </p>
          </div>
        )}

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Criar Conta</CardTitle>
            <CardDescription>
              {isPaidPlan
                ? `Preencha seus dados para assinar o plano ${planInfo?.name}`
                : 'Comece a receber alertas sobre vestibulares gratuitamente'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                  {error}
                </div>
              )}

              <Input
                id="fullName"
                label="Nome completo"
                type="text"
                placeholder="Seu nome"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />

              <Input
                id="email"
                label="Email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <Input
                id="phone"
                label="Telefone (opcional)"
                type="tel"
                placeholder="(11) 99999-9999"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />

              <Input
                id="password"
                label="Senha"
                type="password"
                placeholder="Minimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />

              <Button type="submit" className="w-full" loading={loading || redirectingToPayment}>
                {redirectingToPayment
                  ? 'Redirecionando para pagamento...'
                  : isPaidPlan
                    ? `Criar Conta e Assinar ${planInfo?.name}`
                    : 'Criar Conta Gratis'
                }
              </Button>
            </form>

            <p className="mt-4 text-center text-xs text-gray-500">
              Ao criar uma conta, voce concorda com nossos{' '}
              <a href="#" className="underline hover:text-gray-700">Termos de Uso</a>
              {' '}e{' '}
              <a href="#" className="underline hover:text-gray-700">Politica de Privacidade</a>.
            </p>

            <div className="mt-6 text-center text-sm text-gray-600">
              Ja tem uma conta?{' '}
              <Link href="/auth/login" className="text-emerald-600 hover:underline font-medium">
                Entrar
              </Link>
            </div>

            {isPaidPlan && (
              <div className="mt-3 text-center text-xs text-gray-500">
                <Link href="/auth/signup" className="hover:underline">
                  Ou comece com o plano gratuito
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
