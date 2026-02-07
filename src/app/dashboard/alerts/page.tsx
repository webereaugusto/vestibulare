'use client';

import { useEffect, useState } from 'react';
import { Bell, Plus, Trash2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { createBrowserClient } from '@/lib/supabase';
import { PLANS } from '@/lib/plans';
import { Vestibular, UserAlert, Profile, AlertChannel } from '@/types/database';
import { formatChannel } from '@/lib/utils';

export default function AlertsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [vestibulares, setVestibulares] = useState<Vestibular[]>([]);
  const [userAlerts, setUserAlerts] = useState<(UserAlert & { vestibular: Vestibular })[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedVestibular, setSelectedVestibular] = useState<string>('');
  const [selectedChannels, setSelectedChannels] = useState<AlertChannel[]>(['email']);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { addToast } = useToast();
  const supabase = createBrowserClient();

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadData() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [profileRes, vestRes, alertsRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('vestibulares').select('*').eq('active', true).order('name'),
      supabase
        .from('user_alerts')
        .select('*, vestibular:vestibulares(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
    ]);

    if (profileRes.data) setProfile(profileRes.data as Profile);
    if (vestRes.data) setVestibulares(vestRes.data as Vestibular[]);
    if (alertsRes.data) setUserAlerts(alertsRes.data as (UserAlert & { vestibular: Vestibular })[]);
    setLoading(false);
  }

  async function handleCreateAlert() {
    if (!profile || !selectedVestibular) return;
    setSaving(true);

    const plan = PLANS[profile.plan_type];
    const activeAlerts = userAlerts.filter((a) => a.active);

    if (activeAlerts.length >= plan.maxVestibulares) {
      addToast(`Limite de ${plan.maxVestibulares} vestibulares atingido. Faça upgrade do plano.`, 'error');
      setSaving(false);
      return;
    }

    // Filtrar canais permitidos pelo plano
    const allowedChannels = selectedChannels.filter((c) => plan.channels.includes(c));

    const { error } = await supabase.from('user_alerts').insert({
      user_id: profile.id,
      vestibular_id: selectedVestibular,
      channels: allowedChannels,
      active: true,
    });

    if (error) {
      if (error.code === '23505') {
        addToast('Você já tem um alerta para este vestibular.', 'error');
      } else {
        addToast('Erro ao criar alerta. Tente novamente.', 'error');
      }
    } else {
      addToast('Alerta criado com sucesso!', 'success');
      setShowModal(false);
      setSelectedVestibular('');
      setSelectedChannels(['email']);
      await loadData();
    }
    setSaving(false);
  }

  async function handleDeleteAlert(alertId: string) {
    const { error } = await supabase.from('user_alerts').delete().eq('id', alertId);
    if (error) {
      addToast('Erro ao remover alerta.', 'error');
    } else {
      addToast('Alerta removido.', 'success');
      setUserAlerts((prev) => prev.filter((a) => a.id !== alertId));
    }
  }

  async function handleToggleAlert(alertId: string, currentActive: boolean) {
    const { error } = await supabase
      .from('user_alerts')
      .update({ active: !currentActive })
      .eq('id', alertId);
    if (error) {
      addToast('Erro ao atualizar alerta.', 'error');
    } else {
      setUserAlerts((prev) =>
        prev.map((a) => (a.id === alertId ? { ...a, active: !currentActive } : a))
      );
    }
  }

  function toggleChannel(channel: AlertChannel) {
    setSelectedChannels((prev) =>
      prev.includes(channel) ? prev.filter((c) => c !== channel) : [...prev, channel]
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  const plan = profile ? PLANS[profile.plan_type] : PLANS.free;
  const availableVestibulares = vestibulares.filter(
    (v) => !userAlerts.some((a) => a.vestibular_id === v.id)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Meus Alertas</h1>
          <p className="text-gray-500 mt-1">
            {userAlerts.filter((a) => a.active).length} de {plan.maxVestibulares} vestibulares
          </p>
        </div>
        <Button onClick={() => setShowModal(true)} disabled={availableVestibulares.length === 0}>
          <Plus className="h-4 w-4 mr-2" /> Novo Alerta
        </Button>
      </div>

      {/* Lista de alertas */}
      {userAlerts.length > 0 ? (
        <div className="grid gap-4">
          {userAlerts.map((alert) => (
            <Card key={alert.id} className={!alert.active ? 'opacity-60' : ''}>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <div className="p-2 rounded-lg bg-indigo-50 flex-shrink-0">
                      <Bell className={`h-5 w-5 ${alert.active ? 'text-indigo-600' : 'text-gray-400'}`} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {alert.vestibular?.name}
                      </h3>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {alert.channels.map((ch) => (
                          <Badge key={ch} variant="secondary" className="text-xs">
                            {formatChannel(ch)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleToggleAlert(alert.id, alert.active)}
                      title={alert.active ? 'Desativar' : 'Ativar'}
                    >
                      <Check className={`h-4 w-4 ${alert.active ? 'text-emerald-600' : 'text-gray-400'}`} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteAlert(alert.id)}
                      title="Remover"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <Bell className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum alerta configurado</h3>
            <p className="text-gray-500 mb-4">Adicione vestibulares para receber alertas automáticos.</p>
            <Button onClick={() => setShowModal(true)}>
              <Plus className="h-4 w-4 mr-2" /> Adicionar Vestibular
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Modal de criar alerta */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Novo Alerta">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Vestibular</label>
            <select
              value={selectedVestibular}
              onChange={(e) => setSelectedVestibular(e.target.value)}
              className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="">Selecione um vestibular...</option>
              {availableVestibulares.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Canais de alerta</label>
            <div className="flex flex-wrap gap-2">
              {(['email', 'sms', 'whatsapp'] as AlertChannel[]).map((channel) => {
                const isAllowed = plan.channels.includes(channel);
                const isSelected = selectedChannels.includes(channel);
                return (
                  <button
                    key={channel}
                    onClick={() => isAllowed && toggleChannel(channel)}
                    disabled={!isAllowed}
                    className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      isSelected && isAllowed
                        ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                        : isAllowed
                          ? 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                          : 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {formatChannel(channel)}
                    {!isAllowed && ' (upgrade)'}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setShowModal(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleCreateAlert}
              loading={saving}
              disabled={!selectedVestibular || selectedChannels.length === 0}
            >
              Criar Alerta
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
