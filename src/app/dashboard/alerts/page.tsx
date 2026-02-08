'use client';

import { useEffect, useState } from 'react';
import { Bell, Plus, Trash2, Check, Pencil, Filter, Zap, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { createBrowserClient } from '@/lib/supabase';
import { PLANS } from '@/lib/plans';
import { Vestibular, UserAlert, Profile, AlertChannel, EventType } from '@/types/database';
import { formatChannel, formatEventType } from '@/lib/utils';

const ALL_EVENT_TYPES: { value: EventType; label: string }[] = [
  { value: 'inscricao', label: 'Inscrição' },
  { value: 'prova', label: 'Prova' },
  { value: 'resultado', label: 'Resultado' },
  { value: 'segunda_chamada', label: 'Segunda Chamada' },
  { value: 'recurso', label: 'Recurso' },
  { value: 'matricula', label: 'Matrícula' },
  { value: 'outro', label: 'Outro' },
];

export default function AlertsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [vestibulares, setVestibulares] = useState<Vestibular[]>([]);
  const [userAlerts, setUserAlerts] = useState<(UserAlert & { vestibular: Vestibular })[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingAlert, setEditingAlert] = useState<(UserAlert & { vestibular: Vestibular }) | null>(null);
  const [selectedVestibular, setSelectedVestibular] = useState<string>('');
  const [selectedChannels, setSelectedChannels] = useState<AlertChannel[]>(['whatsapp']);
  const [allEventTypes, setAllEventTypes] = useState(true);
  const [selectedEventTypes, setSelectedEventTypes] = useState<EventType[]>([]);
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

  function openCreate() {
    setEditingAlert(null);
    setSelectedVestibular('');
    setSelectedChannels(['whatsapp']);
    setAllEventTypes(true);
    setSelectedEventTypes([]);
    setShowModal(true);
  }

  function openEdit(alert: UserAlert & { vestibular: Vestibular }) {
    setEditingAlert(alert);
    setSelectedVestibular(alert.vestibular_id);
    setSelectedChannels(alert.channels || ['whatsapp']);
    if (!Array.isArray(alert.event_types) || alert.event_types.length === 0) {
      setAllEventTypes(true);
      setSelectedEventTypes([]);
    } else {
      setAllEventTypes(false);
      setSelectedEventTypes(alert.event_types);
    }
    setShowModal(true);
  }

  async function handleSaveAlert() {
    if (!profile) return;
    if (!editingAlert && !selectedVestibular) return;
    setSaving(true);

    const plan = PLANS[profile.plan_type];

    // Se criando novo, verificar limite
    if (!editingAlert) {
      const activeAlerts = userAlerts.filter((a) => a.active);
      if (activeAlerts.length >= plan.maxVestibulares) {
        addToast(`Limite de ${plan.maxVestibulares} vestibulares atingido. Faça upgrade do plano.`, 'error');
        setSaving(false);
        return;
      }
    }

    // Filtrar canais permitidos pelo plano
    const allowedChannels = selectedChannels.filter((c) => plan.channels.includes(c));
    if (allowedChannels.length === 0) {
      addToast('Selecione pelo menos um canal de alerta.', 'error');
      setSaving(false);
      return;
    }

    // Event types: null = todos, array = específicos
    // Para planos com allowedEventTypes (ex: free), forçar os tipos permitidos
    let eventTypes: EventType[] | null;
    if (plan.allowedEventTypes) {
      // Plano com restrição de tipos: salvar apenas os selecionados dentro do permitido
      const filtered = selectedEventTypes.filter(et => plan.allowedEventTypes!.includes(et));
      eventTypes = filtered.length > 0 ? filtered : plan.allowedEventTypes;
    } else {
      eventTypes = allEventTypes ? null : (selectedEventTypes.length > 0 ? selectedEventTypes : null);
    }

    if (editingAlert) {
      // Atualizar alerta existente
      const { error } = await supabase
        .from('user_alerts')
        .update({
          channels: allowedChannels,
          event_types: eventTypes,
        })
        .eq('id', editingAlert.id);

      if (error) {
        addToast('Erro ao atualizar alerta.', 'error');
      } else {
        addToast('Alerta atualizado com sucesso!', 'success');
        setShowModal(false);
        await loadData();
      }
    } else {
      // Criar novo alerta
      const { error } = await supabase.from('user_alerts').insert({
        user_id: profile.id,
        vestibular_id: selectedVestibular,
        channels: allowedChannels,
        event_types: eventTypes,
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
        setSelectedChannels(['whatsapp']);
        setAllEventTypes(true);
        setSelectedEventTypes([]);
        await loadData();
      }
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

  function toggleEventType(type: EventType) {
    setSelectedEventTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
      </div>
    );
  }

  const plan = profile ? PLANS[profile.plan_type] : PLANS.free;
  const planType = profile?.plan_type || 'free';
  const activeCount = userAlerts.filter((a) => a.active).length;
  const usagePercent = Math.min((activeCount / plan.maxVestibulares) * 100, 100);
  const isAtLimit = activeCount >= plan.maxVestibulares;
  const canUpgrade = planType !== 'premium';
  const availableVestibulares = vestibulares.filter(
    (v) => !userAlerts.some((a) => a.vestibular_id === v.id)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Meus Alertas</h1>
        <Button onClick={openCreate} disabled={availableVestibulares.length === 0 || isAtLimit}>
          <Plus className="h-4 w-4 mr-2" /> Novo Alerta
        </Button>
      </div>

      {/* Banner do Plano */}
      <Card className={planType === 'free' ? 'border-gray-200' : planType === 'basic' ? 'border-emerald-200' : 'border-amber-200'}>
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge
                  variant={planType === 'free' ? 'secondary' : planType === 'basic' ? 'default' : 'warning'}
                  className="text-xs font-semibold"
                >
                  Plano {plan.name}
                </Badge>
                <span className="text-sm text-gray-500">
                  {plan.channels.map((c) => formatChannel(c)).join(', ')} | At\u00e9 {plan.maxAlerts} alertas
                </span>
              </div>

              {/* Barra de uso */}
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">
                      {plan.maxVestibulares >= 999
                        ? `${activeCount} vestibulares (sem limite)`
                        : `${activeCount} de ${plan.maxVestibulares} vestibulares`}
                    </span>
                    {plan.maxVestibulares < 999 && (
                      <span className="text-xs text-gray-500">
                        {plan.maxVestibulares - activeCount} dispon\u00edveis
                      </span>
                    )}
                  </div>
                  <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isAtLimit
                          ? 'bg-red-500'
                          : usagePercent >= 70
                            ? 'bg-amber-500'
                            : 'bg-emerald-600'
                      }`}
                      style={{ width: `${usagePercent}%` }}
                    />
                  </div>
                </div>
              </div>

              {isAtLimit && (
                <p className="text-xs text-red-600 mt-1.5 font-medium">
                  Você atingiu o limite do seu plano.
                  {canUpgrade && ' Faça upgrade para adicionar mais vestibulares.'}
                </p>
              )}
            </div>

            {/* CTA Upgrade */}
            {canUpgrade && (
              <Link href="/dashboard/upgrade" className="flex-shrink-0">
                <button className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-sm font-semibold shadow-md hover:shadow-lg transition-all">
                  <Zap className="h-4 w-4" />
                  Fazer Upgrade
                  <ArrowRight className="h-4 w-4" />
                </button>
              </Link>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Lista de alertas */}
      {userAlerts.length > 0 ? (
        <div className="grid gap-4">
          {userAlerts.map((alert) => {
            const hasCustomTypes = Array.isArray(alert.event_types) && alert.event_types.length > 0;
            return (
              <Card key={alert.id} className={!alert.active ? 'opacity-60' : ''}>
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      <div className="p-2 rounded-lg bg-emerald-50 flex-shrink-0">
                        <Bell className={`h-5 w-5 ${alert.active ? 'text-emerald-600' : 'text-gray-400'}`} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {alert.vestibular?.name}
                        </h3>
                        {/* Canais */}
                        <div className="flex flex-wrap gap-1 mt-1">
                          {alert.channels.map((ch) => (
                            <Badge key={ch} variant="secondary" className="text-xs">
                              {formatChannel(ch)}
                            </Badge>
                          ))}
                        </div>
                        {/* Tipos de evento */}
                        <div className="flex flex-wrap items-center gap-1 mt-1.5">
                          {hasCustomTypes ? (
                            <>
                              <Filter className="h-3 w-3 text-gray-400 mr-0.5" />
                              {alert.event_types!.map((et) => (
                                <Badge key={et} variant="default" className="text-xs">
                                  {formatEventType(et)}
                                </Badge>
                              ))}
                            </>
                          ) : (
                            <span className="text-xs text-gray-500">Todos os tipos de alerta</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(alert)}
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4 text-gray-500" />
                      </Button>
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
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <Bell className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum alerta configurado</h3>
            <p className="text-gray-500 mb-4">Adicione vestibulares para receber alertas automáticos.</p>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" /> Adicionar Vestibular
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Modal de criar/editar alerta */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editingAlert ? 'Editar Alerta' : 'Novo Alerta'}
      >
        <div className="space-y-5">
          {/* Vestibular */}
          {!editingAlert ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Vestibular</label>
              <select
                value={selectedVestibular}
                onChange={(e) => setSelectedVestibular(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-sans focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="">Selecione um vestibular...</option>
                {availableVestibulares.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Vestibular</label>
              <div className="h-10 flex items-center px-3 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-700">
                {editingAlert.vestibular?.name}
              </div>
            </div>
          )}

          {/* Canais de alerta */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Canais de alerta</label>
            <div className="flex flex-wrap gap-2">
              {(['whatsapp', 'sms', 'email'] as AlertChannel[]).map((channel) => {
                const isAllowed = plan.channels.includes(channel);
                const isSelected = selectedChannels.includes(channel);
                return (
                  <button
                    key={channel}
                    onClick={() => isAllowed && toggleChannel(channel)}
                    disabled={!isAllowed}
                    className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      isSelected && isAllowed
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
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

          {/* Tipos de alerta */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Tipos de alerta
            </label>

            {/* Se plano free, mostrar apenas os tipos permitidos sem opção de escolher todos */}
            {plan.allowedEventTypes ? (
              <div>
                <p className="text-xs text-gray-500 mb-2">
                  Seu plano permite alertas de: <strong>{plan.allowedEventTypes.map(et => formatEventType(et)).join(' e ')}</strong>.{' '}
                  <Link href="/dashboard/upgrade" className="text-emerald-600 hover:underline">Faça upgrade</Link> para mais tipos.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {ALL_EVENT_TYPES.filter(t => plan.allowedEventTypes!.includes(t.value)).map((type) => {
                    const isSelected = selectedEventTypes.includes(type.value);
                    return (
                      <button
                        key={type.value}
                        onClick={() => toggleEventType(type.value)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors text-left ${
                          isSelected
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                            : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                            isSelected ? 'bg-emerald-600 border-emerald-600' : 'border-gray-300'
                          }`}>
                            {isSelected && (
                              <Check className="h-3 w-3 text-white" />
                            )}
                          </span>
                          {type.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <>
                {/* Toggle todos / selecionar */}
                <div className="flex gap-2 mb-3">
                  <button
                    onClick={() => {
                      setAllEventTypes(true);
                      setSelectedEventTypes([]);
                    }}
                    className={`flex-1 px-3 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                      allEventTypes
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Todos os alertas
                  </button>
                  <button
                    onClick={() => setAllEventTypes(false)}
                    className={`flex-1 px-3 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                      !allEventTypes
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Selecionar tipos
                  </button>
                </div>

                {/* Grid de tipos de evento */}
                {!allEventTypes && (
                  <div className="grid grid-cols-2 gap-2">
                    {ALL_EVENT_TYPES.map((type) => {
                      const isSelected = selectedEventTypes.includes(type.value);
                      return (
                        <button
                          key={type.value}
                          onClick={() => toggleEventType(type.value)}
                          className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors text-left ${
                            isSelected
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                              : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <span className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                              isSelected ? 'bg-emerald-600 border-emerald-600' : 'border-gray-300'
                            }`}>
                              {isSelected && (
                                <Check className="h-3 w-3 text-white" />
                              )}
                            </span>
                            {type.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {!allEventTypes && selectedEventTypes.length === 0 && (
                  <p className="text-xs text-amber-600 mt-2">
                    Selecione pelo menos um tipo ou escolha &quot;Todos os alertas&quot;.
                  </p>
                )}
              </>
            )}
          </div>

          {/* Botões */}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setShowModal(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSaveAlert}
              loading={saving}
              disabled={
                (!editingAlert && !selectedVestibular) ||
                selectedChannels.length === 0 ||
                (!plan.allowedEventTypes && !allEventTypes && selectedEventTypes.length === 0)
              }
            >
              {editingAlert ? 'Salvar' : 'Criar Alerta'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
