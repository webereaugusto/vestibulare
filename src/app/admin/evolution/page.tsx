'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  MessageSquare,
  Wifi,
  WifiOff,
  QrCode,
  Send,
  Trash2,
  RefreshCw,
  Power,
  PowerOff,
  CheckCircle,
  XCircle,
  Loader2,
  AlertTriangle,
  Smartphone,
  Phone,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';

interface ConnectionState {
  state: string;
  instance?: string;
}

interface InstanceInfo {
  instanceName: string;
  state: string;
  profileName?: string;
  profilePictureUrl?: string;
  number?: string;
}

export default function AdminEvolutionPage() {
  const [connectionState, setConnectionState] = useState<ConnectionState | null>(null);
  const [instanceInfo, setInstanceInfo] = useState<InstanceInfo | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('');
  const [configError, setConfigError] = useState<string | null>(null);
  const { addToast } = useToast();

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/evolution?action=status');
      const data = await res.json();

      if (data.error && data.error.includes('não configurada')) {
        setConfigError(data.error);
        setConnectionState({ state: 'unconfigured' });
        setInstanceInfo(null);
      } else {
        setConfigError(null);
        setConnectionState(data.state || { state: 'disconnected' });
        setInstanceInfo(data.info || null);
      }
    } catch {
      setConnectionState({ state: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Auto-refresh quando esperando conexão
  useEffect(() => {
    if (qrCode && connectionState?.state !== 'open') {
      const interval = setInterval(async () => {
        const res = await fetch('/api/admin/evolution?action=status');
        const data = await res.json();
        if (data.state?.state === 'open') {
          setQrCode(null);
          setConnectionState(data.state);
          setInstanceInfo(data.info);
          addToast('WhatsApp conectado com sucesso!', 'success');
        }
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [qrCode, connectionState?.state, addToast]);

  async function handleAction(action: string, body?: Record<string, string>) {
    setActionLoading(action);
    try {
      const res = await fetch('/api/admin/evolution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...body }),
      });
      const data = await res.json();

      if (!data.success && data.error) {
        addToast(data.error, 'error');
        return data;
      }

      switch (action) {
        case 'create':
          addToast('Instância criada! Agora conecte escaneando o QR Code.', 'success');
          // Auto-buscar QR code
          await handleAction('connect');
          break;
        case 'connect':
          if (data.qr?.base64 || data.qr?.code) {
            setQrCode(data.qr.base64 || data.qr.code);
          }
          break;
        case 'logout':
          addToast('WhatsApp desconectado.', 'success');
          setQrCode(null);
          await fetchStatus();
          break;
        case 'restart':
          addToast('Instância reiniciada.', 'success');
          await fetchStatus();
          break;
        case 'delete':
          addToast('Instância deletada.', 'success');
          setQrCode(null);
          setConnectionState({ state: 'disconnected' });
          setInstanceInfo(null);
          break;
        case 'test-message':
          if (data.result?.success) {
            addToast('Mensagem de teste enviada!', 'success');
          } else {
            addToast(`Falha no envio: ${data.result?.error || data.error}`, 'error');
          }
          break;
      }

      return data;
    } catch (err) {
      addToast('Erro na operação.', 'error');
      return null;
    } finally {
      setActionLoading(null);
    }
  }

  const isConnected = connectionState?.state === 'open';
  const isUnconfigured = connectionState?.state === 'unconfigured';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">WhatsApp - Evolution API</h1>
        <p className="text-gray-500 mt-1">
          Configure e gerencie a integração com WhatsApp via Evolution API.
        </p>
      </div>

      {/* Aviso se não configurado */}
      {isUnconfigured && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <div className="flex gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-800 mb-1">Evolution API não configurada</p>
                <p className="text-amber-700 mb-2">{configError}</p>
                <p className="text-amber-700">
                  Adicione as variáveis no <code className="bg-amber-100 px-1 rounded">.env.local</code>:
                </p>
                <pre className="mt-2 bg-amber-100 p-3 rounded-lg text-xs text-amber-900 overflow-x-auto">
{`EVOLUTION_API_URL=http://localhost:8080
EVOLUTION_API_KEY=sua-api-key
EVOLUTION_INSTANCE_NAME=vestibulare`}
                </pre>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status da Conexão */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isConnected ? (
                <div className="p-3 rounded-lg bg-emerald-50">
                  <Wifi className="h-6 w-6 text-emerald-600" />
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-gray-100">
                  <WifiOff className="h-6 w-6 text-gray-400" />
                </div>
              )}
              <div>
                <CardTitle>Status da Conexão</CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={isConnected ? 'success' : isUnconfigured ? 'warning' : 'destructive'}>
                    {isConnected ? 'Conectado' : isUnconfigured ? 'Não configurado' : 'Desconectado'}
                  </Badge>
                  {instanceInfo?.number && (
                    <Badge variant="secondary">
                      <Phone className="h-3 w-3 mr-1" />
                      {instanceInfo.number}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={fetchStatus}
              title="Atualizar status"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        {instanceInfo && (
          <CardContent>
            <div className="grid sm:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-xs text-gray-500">Instância</p>
                <p className="text-sm font-medium text-gray-900">{instanceInfo.instanceName}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Nome do Perfil</p>
                <p className="text-sm font-medium text-gray-900">{instanceInfo.profileName || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Estado</p>
                <p className="text-sm font-medium text-gray-900 capitalize">{instanceInfo.state}</p>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Ações da Instância */}
      {!isUnconfigured && (
        <Card>
          <CardHeader>
            <CardTitle>Gerenciar Instância</CardTitle>
            <CardDescription>
              Crie, conecte ou gerencie a instância do WhatsApp.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {!isConnected && (
                <>
                  <Button
                    onClick={() => handleAction('create')}
                    loading={actionLoading === 'create'}
                    variant="default"
                  >
                    <Power className="h-4 w-4 mr-2" />
                    Criar Instância
                  </Button>
                  <Button
                    onClick={() => handleAction('connect')}
                    loading={actionLoading === 'connect'}
                    variant="outline"
                  >
                    <QrCode className="h-4 w-4 mr-2" />
                    Gerar QR Code
                  </Button>
                </>
              )}
              {isConnected && (
                <Button
                  onClick={() => handleAction('restart')}
                  loading={actionLoading === 'restart'}
                  variant="outline"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reiniciar
                </Button>
              )}
              <Button
                onClick={() => handleAction('logout')}
                loading={actionLoading === 'logout'}
                variant="outline"
                disabled={!isConnected}
              >
                <PowerOff className="h-4 w-4 mr-2" />
                Desconectar
              </Button>
              <Button
                onClick={() => {
                  if (confirm('Tem certeza? Isso vai remover a instância completamente.')) {
                    handleAction('delete');
                  }
                }}
                loading={actionLoading === 'delete'}
                variant="destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Deletar Instância
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* QR Code */}
      {qrCode && !isConnected && (
        <Card className="border-indigo-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-indigo-600" />
              Escanear QR Code
            </CardTitle>
            <CardDescription>
              Abra o WhatsApp no celular, vá em <strong>Dispositivos Conectados</strong> e escaneie o código abaixo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-4">
              {qrCode.startsWith('data:') ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qrCode}
                  alt="QR Code WhatsApp"
                  className="w-64 h-64 rounded-lg border border-gray-200"
                />
              ) : (
                <div className="p-6 bg-white rounded-lg border border-gray-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent(qrCode)}`}
                    alt="QR Code WhatsApp"
                    className="w-64 h-64"
                  />
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-indigo-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                Aguardando leitura do QR Code...
              </div>
              <Button variant="outline" size="sm" onClick={() => handleAction('connect')}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Gerar Novo QR Code
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Teste de Mensagem */}
      {isConnected && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-indigo-600" />
              Teste de Mensagem
            </CardTitle>
            <CardDescription>
              Envie uma mensagem de teste para verificar se o WhatsApp está funcionando.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              id="testPhone"
              label="Número do WhatsApp"
              type="tel"
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              placeholder="(11) 99999-9999"
            />
            <Input
              id="testMsg"
              label="Mensagem (opcional)"
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              placeholder="Deixe vazio para mensagem padrão de teste"
            />
            <div className="flex gap-3">
              <Button
                onClick={() =>
                  handleAction('test-message', {
                    phone: testPhone,
                    ...(testMessage ? { message: testMessage } : {}),
                  })
                }
                loading={actionLoading === 'test-message'}
                disabled={!testPhone}
              >
                <Send className="h-4 w-4 mr-2" />
                Enviar Teste
              </Button>
              <Button
                variant="outline"
                onClick={() => handleAction('check-number', { phone: testPhone })}
                loading={actionLoading === 'check-number'}
                disabled={!testPhone}
              >
                <Smartphone className="h-4 w-4 mr-2" />
                Verificar Número
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info de configuração */}
      <Card>
        <CardHeader>
          <CardTitle>Variáveis de Ambiente</CardTitle>
          <CardDescription>
            Configuração necessária no <code>.env.local</code> para a integração funcionar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { key: 'EVOLUTION_API_URL', desc: 'URL da Evolution API', value: instanceInfo ? '✅ Configurada' : 'Não configurada' },
              { key: 'EVOLUTION_API_KEY', desc: 'Chave de API da Evolution', value: instanceInfo ? '✅ Configurada' : 'Não configurada' },
              { key: 'EVOLUTION_INSTANCE_NAME', desc: 'Nome da instância', value: instanceInfo?.instanceName || 'Não configurada' },
            ].map((envVar) => (
              <div key={envVar.key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <code className="text-sm font-mono font-medium text-gray-900">{envVar.key}</code>
                  <p className="text-xs text-gray-500 mt-0.5">{envVar.desc}</p>
                </div>
                <Badge variant={envVar.value.includes('✅') || envVar.value === instanceInfo?.instanceName ? 'success' : 'secondary'} className="font-mono text-xs">{envVar.value}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
