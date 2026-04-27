'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createBrowserClient } from '@/lib/supabase';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [sessionReady, setSessionReady] = useState(false);
  const router = useRouter();
  const supabase = createBrowserClient();

  useEffect(() => {
    async function checkSession() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session) {
          setSessionReady(true);
        } else {
          setError('Link inválido ou expirado. Solicite um novo link em "Esqueci a senha".');
        }
      } catch {
        setError('Não foi possível validar a sessão. Solicite um novo link.');
      } finally {
        setCheckingSession(false);
      }
    }

    checkSession();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!sessionReady) {
      setError('Abra o link de recuperação enviado por email antes de salvar a nova senha.');
      return;
    }

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não conferem.');
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });

      if (updateError) {
        setError(
          updateError.message.includes('Auth session missing')
            ? 'Sessão expirada. Solicite um novo link em "Esqueci a senha".'
            : updateError.message
        );
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/dashboard');
        router.refresh();
      }, 1200);
    } catch {
      setError('Ocorreu um erro. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <MessageCircle className="h-10 w-10 text-emerald-600" />
            <span className="text-2xl font-bold text-gray-900">
              Zap<span className="text-emerald-600">Vest</span>
            </span>
          </Link>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Nova senha</CardTitle>
            <CardDescription>Crie uma nova senha para acessar sua conta.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                  {error}{' '}
                  {!sessionReady && !checkingSession && (
                    <Link href="/auth/forgot-password" className="underline font-medium">
                      Solicitar novo link
                    </Link>
                  )}
                </div>
              )}

              {checkingSession && (
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
                  Validando link de recuperação...
                </div>
              )}

              {success && (
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
                  Senha atualizada com sucesso. Redirecionando...
                </div>
              )}

              <Input
                id="password"
                label="Nova senha"
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />

              <Input
                id="confirmPassword"
                label="Confirmar nova senha"
                type="password"
                placeholder="Digite a senha novamente"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
              />

              <Button
                type="submit"
                className="w-full"
                loading={loading}
                disabled={checkingSession || !sessionReady || success}
              >
                Salvar nova senha
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
