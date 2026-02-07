'use client';

import { useState } from 'react';
import { Mail, Send, CheckCircle, XCircle, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';

interface TestResult {
  success: boolean;
  message?: string;
  messageId?: string;
  error?: string;
}

export default function AdminTestEmailPage() {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState<string | null>(null);
  const [results, setResults] = useState<{ type: string; result: TestResult }[]>([]);
  const { addToast } = useToast();

  async function handleSendTest(type: 'simple' | 'alert') {
    setSending(type);

    try {
      const response = await fetch('/api/test/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: email || undefined,
          type,
        }),
      });

      const data: TestResult = await response.json();

      setResults((prev) => [
        { type: type === 'simple' ? 'Teste Simples' : 'Alerta Simulado', result: data },
        ...prev,
      ]);

      if (data.success) {
        addToast(`Email enviado com sucesso! Verifique a caixa de entrada.`, 'success');
      } else {
        addToast(`Falha no envio: ${data.error}`, 'error');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro desconhecido';
      setResults((prev) => [
        { type: type === 'simple' ? 'Teste Simples' : 'Alerta Simulado', result: { success: false, error: errorMsg } },
        ...prev,
      ]);
      addToast('Erro ao enviar email.', 'error');
    } finally {
      setSending(null);
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Teste de Email</h1>
        <p className="text-gray-500 mt-1">Envie emails de teste para verificar a integração com o Brevo.</p>
      </div>

      {/* Configuração */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-indigo-600" />
            Configuração do Teste
          </CardTitle>
          <CardDescription>
            Se deixar o email vazio, será enviado para o email da sua conta admin.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            id="testEmail"
            label="Email de destino (opcional)"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Deixe vazio para usar seu email"
          />

          <div className="grid sm:grid-cols-2 gap-3">
            <Button
              onClick={() => handleSendTest('simple')}
              loading={sending === 'simple'}
              className="w-full"
              variant="outline"
            >
              {sending === 'simple' ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Enviar Teste Simples
            </Button>

            <Button
              onClick={() => handleSendTest('alert')}
              loading={sending === 'alert'}
              className="w-full"
            >
              {sending === 'alert' ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Mail className="h-4 w-4 mr-2" />
              )}
              Simular Alerta ENEM
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Dica sobre sender */}
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-amber-800 mb-1">Importante sobre o remetente</p>
              <p className="text-amber-700">
                O Brevo precisa de um <strong>remetente verificado</strong>. Vá em{' '}
                <strong>Brevo &gt; Settings &gt; Senders &amp; IPs</strong> e adicione/verifique o email remetente.
                Por padrão, o sistema usa <code className="bg-amber-100 px-1 rounded">alertas@vestibulare.com.br</code>.
                Se não tiver um domínio próprio, altere para um email verificado no Brevo.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resultados */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Resultados dos Testes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {results.map((item, index) => (
                <div
                  key={index}
                  className={`flex items-start gap-3 p-3 rounded-lg ${
                    item.result.success ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'
                  }`}
                >
                  {item.result.success ? (
                    <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm text-gray-900">{item.type}</span>
                      <Badge variant={item.result.success ? 'success' : 'destructive'}>
                        {item.result.success ? 'Sucesso' : 'Falhou'}
                      </Badge>
                    </div>
                    {item.result.success ? (
                      <p className="text-sm text-emerald-700">
                        {item.result.message}
                        {item.result.messageId && (
                          <span className="block text-xs text-emerald-600 mt-1">
                            Message ID: {item.result.messageId}
                          </span>
                        )}
                      </p>
                    ) : (
                      <p className="text-sm text-red-700 break-all">{item.result.error}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
