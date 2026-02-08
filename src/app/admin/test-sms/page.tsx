'use client';

import { useState } from 'react';
import { Smartphone, Send, CheckCircle, XCircle, Loader2, AlertTriangle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';

interface TestResult {
  success: boolean;
  message?: string;
  messageId?: string;
  reference?: string;
  error?: string;
}

export default function AdminTestSmsPage() {
  const [phone, setPhone] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [sending, setSending] = useState<string | null>(null);
  const [results, setResults] = useState<{ type: string; result: TestResult }[]>([]);
  const { addToast } = useToast();

  async function handleSendTest(type: 'simple' | 'alert') {
    if (!phone) {
      addToast('Informe o número de telefone.', 'error');
      return;
    }

    setSending(type);

    try {
      const response = await fetch('/api/test/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          message: type === 'simple' && customMessage ? customMessage : undefined,
          type,
        }),
      });

      const data: TestResult = await response.json();

      setResults((prev) => [
        { type: type === 'simple' ? 'Teste Simples' : 'Alerta Simulado', result: data },
        ...prev,
      ]);

      if (data.success) {
        addToast('SMS enviado com sucesso! Verifique o celular.', 'success');
      } else {
        addToast(`Falha no envio: ${data.error}`, 'error');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro desconhecido';
      setResults((prev) => [
        { type: type === 'simple' ? 'Teste Simples' : 'Alerta Simulado', result: { success: false, error: errorMsg } },
        ...prev,
      ]);
      addToast('Erro ao enviar SMS.', 'error');
    } finally {
      setSending(null);
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Teste de SMS</h1>
        <p className="text-gray-500 mt-1">Envie SMS de teste para verificar a integração com o Brevo.</p>
      </div>

      {/* Configuração */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-indigo-600" />
            Configuração do Teste
          </CardTitle>
          <CardDescription>
            Informe o número do celular para receber o SMS de teste.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            id="testPhone"
            label="Número do celular"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(11) 99999-9999"
          />
          <Input
            id="customMsg"
            label="Mensagem personalizada (opcional, só para teste simples)"
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            placeholder="Deixe vazio para usar a mensagem padrão"
          />

          <div className="grid sm:grid-cols-2 gap-3">
            <Button
              onClick={() => handleSendTest('simple')}
              loading={sending === 'simple'}
              disabled={!phone}
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
              disabled={!phone}
              className="w-full"
            >
              {sending === 'alert' ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Smartphone className="h-4 w-4 mr-2" />
              )}
              Simular Alerta ENEM
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Info sobre SMS Brevo */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-800 mb-1">Como funciona o SMS via Brevo</p>
              <ul className="text-blue-700 space-y-1 list-disc pl-4">
                <li>Nao precisa de celular ou chip -- funciona 100% pela API</li>
                <li>O remetente aparece como <code className="bg-blue-100 px-1 rounded">VestibulRe</code> (alfanumerico)</li>
                <li>Cada SMS gasta creditos da sua conta Brevo</li>
                <li>O numero do destinatario e formatado automaticamente para +55...</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Aviso de horários */}
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-amber-800 mb-1">Restricoes de horario para o Brasil</p>
              <p className="text-amber-700">
                SMS marketing no Brasil so pode ser enviado de <strong>Segunda a Sexta das 8h as 20h</strong> e{' '}
                <strong>Sabado das 8h as 14h</strong>. SMS transacional (alertas) geralmente nao tem essa restricao,
                mas recomendamos respeitar esses horarios para garantir a entrega.
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
