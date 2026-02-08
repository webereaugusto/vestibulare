'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  User,
  Bell,
  Plus,
  Trash2,
  Mail,
  Phone,
  Crown,
  Shield,
  Calendar,
  CheckCircle,
  XCircle,
  Loader2,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { Profile, UserAlert, AlertLog, Vestibular, AlertChannel, EventType } from '@/types/database';
import { PLANS } from '@/lib/plans';
import { formatEventType } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const PLAN_LABELS: Record<string, string> = { free: 'Gratuito', basic: 'Basico', premium: 'Premium' };
const CHANNEL_LABELS: Record<AlertChannel, string> = { email: 'Email', sms: 'SMS', whatsapp: 'WhatsApp' };

interface AlertWithVest extends UserAlert {
  vestibular: Vestibular;
}

interface LogWithDetails extends Omit<AlertLog, 'user_alert' | 'important_date'> {
  user_alert: { user_id: string; vestibular: { name: string } };
  important_date: { event_name: string; event_date: string };
}

export default function AdminUserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [alerts, setAlerts] = useState<AlertWithVest[]>([]);
  const [logs, setLogs] = useState<LogWithDetails[]>([]);
  const [vestibulares, setVestibulares] = useState<Vestibular[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Modal adicionar alerta
  const [showAddAlert, setShowAddAlert] = useState(false);
  const [newAlertVestId, setNewAlertVestId] = useState('');
  const [newAlertChannels, setNewAlertChannels] = useState<AlertChannel[]>(['email']);

  const { addToast } = useToast();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`);
      const data = await res.json();
      if (data.success) {
        setProfile(data.profile);
        setAlerts(data.alerts);
        setLogs(data.logs);
        setVestibulares(data.vestibulares);
      } else {
        addToast('Usuario nao encontrado.', 'error');
        router.push('/admin/users');
      }
    } catch {
      addToast('Erro ao carregar dados.', 'error');
    } finally {
      setLoading(false);
    }
  }, [userId, router, addToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleAlertAction(action: string, body: Record<string, unknown>) {
    setActionLoading(action + (body.alertId || ''));
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...body }),
      });
      const data = await res.json();
      if (data.success) {
        addToast(data.message, 'success');
        loadData();
      } else {
        addToast(data.error || 'Erro.', 'error');
      }
    } catch {
      addToast('Erro na operacao.', 'error');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleAddAlert() {
    if (!newAlertVestId) { addToast('Selecione um vestibular.', 'error'); return; }
    await handleAlertAction('add-alert', {
      vestibularId: newAlertVestId,
      channels: newAlertChannels,
      eventTypes: null,
    });
    setShowAddAlert(false);
    setNewAlertVestId('');
    setNewAlertChannels(['email']);
  }

  async function handleToggleAlert(alert: AlertWithVest) {
    await handleAlertAction('update-alert', { alertId: alert.id, active: !alert.active });
  }

  async function handleDeleteAlert(alertId: string) {
    if (!confirm('Excluir este alerta?')) return;
    await handleAlertAction('delete-alert', { alertId });
  }

  function toggleChannel(ch: AlertChannel) {
    setNewAlertChannels((prev) =>
      prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch]
    );
  }

  // Vestibulares que o usuario ainda nao tem alerta
  const availableVestibulares = vestibulares.filter(
    (v) => !alerts.some((a) => a.vestibular_id === v.id)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!profile) return null;

  const plan = PLANS[profile.plan_type];

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/admin/users">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{profile.full_name || 'Sem nome'}</h1>
          <p className="text-gray-500 text-sm">{profile.email}</p>
        </div>
      </div>

      {/* Info do usuario */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-indigo-600" />
            Informacoes do Usuario
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 flex items-center gap-1"><Mail className="h-3 w-3" /> Email</p>
              <p className="text-sm font-medium text-gray-900 mt-0.5">{profile.email}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 flex items-center gap-1"><Phone className="h-3 w-3" /> Telefone</p>
              <p className="text-sm font-medium text-gray-900 mt-0.5">{profile.phone || 'Nao informado'}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 flex items-center gap-1"><Crown className="h-3 w-3" /> Plano</p>
              <p className="text-sm font-medium text-gray-900 mt-0.5">
                {PLAN_LABELS[profile.plan_type]}
                {profile.plan_expires_at && (
                  <span className="text-xs text-gray-400 ml-1">
                    (expira {format(new Date(profile.plan_expires_at), 'dd/MM/yyyy')})
                  </span>
                )}
              </p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 flex items-center gap-1"><Shield className="h-3 w-3" /> Admin</p>
              <p className="text-sm font-medium text-gray-900 mt-0.5">{profile.is_admin ? 'Sim' : 'Nao'}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 flex items-center gap-1"><Calendar className="h-3 w-3" /> Cadastro</p>
              <p className="text-sm font-medium text-gray-900 mt-0.5">
                {format(new Date(profile.created_at), "dd/MM/yyyy 'as' HH:mm", { locale: ptBR })}
              </p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 flex items-center gap-1"><Bell className="h-3 w-3" /> Limites</p>
              <p className="text-sm font-medium text-gray-900 mt-0.5">
                {alerts.length}/{plan.maxVestibulares} vestibulares | Canais: {plan.channels.join(', ')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alertas (vestibulares) do usuario */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-indigo-600" />
                Vestibulares ({alerts.length})
              </CardTitle>
              <CardDescription>Alertas configurados para este usuario.</CardDescription>
            </div>
            <Button onClick={() => setShowAddAlert(true)} disabled={availableVestibulares.length === 0} size="sm">
              <Plus className="h-4 w-4 mr-1" /> Adicionar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">Nenhum vestibular configurado.</p>
          ) : (
            <div className="space-y-2">
              {alerts.map((alert) => (
                <div key={alert.id} className={`flex items-center justify-between p-3 rounded-lg border ${alert.active ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-100 opacity-60'}`}>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm text-gray-900">{alert.vestibular?.name}</span>
                      {!alert.active && <Badge variant="secondary">Inativo</Badge>}
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {alert.channels.map((ch) => (
                        <Badge key={ch} variant="secondary" className="text-[10px]">{CHANNEL_LABELS[ch]}</Badge>
                      ))}
                      {alert.event_types && alert.event_types.length > 0 ? (
                        alert.event_types.map((et) => (
                          <Badge key={et} variant="default" className="text-[10px]">{formatEventType(et)}</Badge>
                        ))
                      ) : (
                        <span className="text-[10px] text-gray-400">Todos os tipos</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleToggleAlert(alert)}
                      title={alert.active ? 'Desativar' : 'Ativar'}
                      disabled={actionLoading === 'update-alert' + alert.id}
                    >
                      {alert.active
                        ? <ToggleRight className="h-4 w-4 text-emerald-500" />
                        : <ToggleLeft className="h-4 w-4 text-gray-400" />
                      }
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteAlert(alert.id)}
                      title="Excluir alerta"
                      disabled={actionLoading === 'delete-alert' + alert.id}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Historico de alertas enviados */}
      <Card>
        <CardHeader>
          <CardTitle>Historico de Alertas Enviados ({logs.length})</CardTitle>
          <CardDescription>Ultimos 50 alertas enviados/tentados para este usuario.</CardDescription>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">Nenhum alerta enviado ainda.</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {logs.map((log) => (
                <div key={log.id} className={`flex items-center gap-3 p-2 rounded-lg text-sm ${log.status === 'sent' ? 'bg-emerald-50' : 'bg-red-50'}`}>
                  {log.status === 'sent' ? (
                    <CheckCircle className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <span className="text-gray-900">
                      {log.user_alert?.vestibular?.name} - {log.important_date?.event_name}
                    </span>
                    {log.error_message && (
                      <p className="text-xs text-red-600 truncate">{log.error_message}</p>
                    )}
                  </div>
                  <Badge variant="secondary" className="text-[10px] flex-shrink-0">{log.channel}</Badge>
                  <span className="text-xs text-gray-400 flex-shrink-0">
                    {format(new Date(log.sent_at), 'dd/MM HH:mm')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Adicionar Alerta */}
      <Modal open={showAddAlert} onClose={() => setShowAddAlert(false)} title="Adicionar Vestibular">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Vestibular</label>
            <select
              value={newAlertVestId}
              onChange={(e) => setNewAlertVestId(e.target.value)}
              className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-sans focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="">Selecione...</option>
              {availableVestibulares.map((v) => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Canais de alerta</label>
            <div className="flex gap-2 flex-wrap">
              {(['email', 'sms', 'whatsapp'] as AlertChannel[]).map((ch) => (
                <label key={ch} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors text-sm ${
                  newAlertChannels.includes(ch) ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}>
                  <input
                    type="checkbox"
                    checked={newAlertChannels.includes(ch)}
                    onChange={() => toggleChannel(ch)}
                    className="sr-only"
                  />
                  {CHANNEL_LABELS[ch]}
                </label>
              ))}
            </div>
            {!plan.channels.includes('sms') && (newAlertChannels.includes('sms') || newAlertChannels.includes('whatsapp')) && (
              <p className="text-xs text-amber-600 mt-1">O plano {PLAN_LABELS[profile.plan_type]} nao suporta SMS/WhatsApp. Os alertas desses canais nao serao enviados.</p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setShowAddAlert(false)}>Cancelar</Button>
            <Button onClick={handleAddAlert} loading={!!actionLoading} disabled={!newAlertVestId}>
              <Plus className="h-4 w-4 mr-2" /> Adicionar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
