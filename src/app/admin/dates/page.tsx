'use client';

import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Calendar, Database, Search, X, ExternalLink, FileText, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { createBrowserClient } from '@/lib/supabase';
import { ImportantDate, Vestibular, EventType } from '@/types/database';
import { formatEventType } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const EVENT_TYPES: { value: EventType; label: string }[] = [
  { value: 'inscricao', label: 'Inscrição' },
  { value: 'prova', label: 'Prova' },
  { value: 'resultado', label: 'Resultado' },
  { value: 'segunda_chamada', label: 'Segunda Chamada' },
  { value: 'recurso', label: 'Recurso' },
  { value: 'matricula', label: 'Matrícula' },
  { value: 'outro', label: 'Outro' },
];

export default function AdminDatesPage() {
  const [dates, setDates] = useState<(ImportantDate & { vestibular: Vestibular })[]>([]);
  const [vestibulares, setVestibulares] = useState<Vestibular[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<ImportantDate | null>(null);
  const [form, setForm] = useState({
    vestibular_id: '',
    event_type: 'inscricao' as EventType,
    event_name: '',
    event_date: '',
    event_end_date: '',
    official_url: '',
    notes: '',
    alert_days_before: '1,3,7',
  });
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [filterVestibular, setFilterVestibular] = useState('');
  const [filterEventType, setFilterEventType] = useState('');
  const [broadcastTarget, setBroadcastTarget] = useState<(ImportantDate & { vestibular: Vestibular }) | null>(null);
  const [broadcasting, setBroadcasting] = useState(false);
  const [broadcastResult, setBroadcastResult] = useState<{
    success: boolean;
    message?: string;
    sent?: number;
    failed?: number;
    skipped?: number;
    errors?: string[];
    error?: string;
  } | null>(null);
  const { addToast } = useToast();
  const supabase = createBrowserClient();

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadData() {
    setLoading(true);
    const [datesRes, vestRes] = await Promise.all([
      supabase
        .from('important_dates')
        .select('*, vestibular:vestibulares(id, name, slug)')
        .order('event_date', { ascending: true }),
      supabase.from('vestibulares').select('*').eq('active', true).order('name'),
    ]);
    if (datesRes.data) setDates(datesRes.data as (ImportantDate & { vestibular: Vestibular })[]);
    if (vestRes.data) setVestibulares(vestRes.data as Vestibular[]);
    setLoading(false);
  }

  function openCreate() {
    setEditing(null);
    setForm({ vestibular_id: '', event_type: 'inscricao', event_name: '', event_date: '', event_end_date: '', official_url: '', notes: '', alert_days_before: '1,3,7' });
    setShowModal(true);
  }

  function openEdit(d: ImportantDate) {
    setEditing(d);
    setForm({
      vestibular_id: d.vestibular_id,
      event_type: d.event_type,
      event_name: d.event_name,
      event_date: d.event_date,
      event_end_date: d.event_end_date || '',
      official_url: d.official_url || '',
      notes: d.notes || '',
      alert_days_before: d.alert_days_before.join(','),
    });
    setShowModal(true);
  }

  async function handleSeedDates() {
    setSeeding(true);
    try {
      const res = await fetch('/api/admin/seed-dates', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        addToast(`${data.inserted} datas inseridas com sucesso!`, 'success');
        loadData();
      } else {
        addToast(data.error || 'Erro ao importar datas.', 'error');
      }
    } catch {
      addToast('Erro ao importar datas.', 'error');
    } finally {
      setSeeding(false);
    }
  }

  async function handleSave() {
    if (!form.vestibular_id || !form.event_name || !form.event_date) {
      addToast('Preencha todos os campos obrigatórios.', 'error');
      return;
    }
    setSaving(true);

    const alertDays = form.alert_days_before.split(',').map((d) => parseInt(d.trim())).filter((d) => !isNaN(d));

    const payload = {
      vestibular_id: form.vestibular_id,
      event_type: form.event_type,
      event_name: form.event_name,
      event_date: form.event_date,
      event_end_date: form.event_end_date || null,
      official_url: form.official_url || null,
      notes: form.notes || null,
      alert_days_before: alertDays,
      source: 'manual' as const,
    };

    if (editing) {
      const { error } = await supabase.from('important_dates').update(payload).eq('id', editing.id);
      if (error) addToast('Erro ao atualizar.', 'error');
      else { addToast('Data atualizada!', 'success'); setShowModal(false); loadData(); }
    } else {
      const { error } = await supabase.from('important_dates').insert(payload);
      if (error) addToast('Erro ao criar.', 'error');
      else { addToast('Data criada!', 'success'); setShowModal(false); loadData(); }
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('Tem certeza?')) return;
    const { error } = await supabase.from('important_dates').delete().eq('id', id);
    if (error) addToast('Erro ao excluir.', 'error');
    else { addToast('Data excluída.', 'success'); loadData(); }
  }

  async function handleBroadcast() {
    if (!broadcastTarget) return;
    setBroadcasting(true);
    setBroadcastResult(null);
    try {
      const res = await fetch('/api/admin/broadcast-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ importantDateId: broadcastTarget.id }),
      });
      const data = await res.json();
      setBroadcastResult(data);
    } catch {
      setBroadcastResult({ success: false, error: 'Erro de rede ao disparar alertas.' });
    } finally {
      setBroadcasting(false);
    }
  }

  function closeBroadcastModal() {
    if (!broadcasting) {
      setBroadcastTarget(null);
      setBroadcastResult(null);
    }
  }

  // Filtrar datas
  const filteredDates = dates.filter((d) => {
    const vest = d.vestibular as Vestibular;
    if (filterVestibular && d.vestibular_id !== filterVestibular) return false;
    if (filterEventType && d.event_type !== filterEventType) return false;
    if (searchText) {
      const query = searchText.toLowerCase();
      const matchName = d.event_name.toLowerCase().includes(query);
      const matchVest = vest?.name?.toLowerCase().includes(query);
      const matchDate = d.event_date.includes(query);
      if (!matchName && !matchVest && !matchDate) return false;
    }
    return true;
  });

  const hasActiveFilters = searchText || filterVestibular || filterEventType;

  function clearFilters() {
    setSearchText('');
    setFilterVestibular('');
    setFilterEventType('');
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Datas Importantes</h1>
          <p className="text-gray-500 mt-1">{dates.length} datas cadastradas</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSeedDates} loading={seeding}>
            <Database className="h-4 w-4 mr-2" /> Importar Cronograma 2026/2027
          </Button>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" /> Nova Data
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Busca por texto */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Buscar por nome, vestibular ou data..."
                className="w-full h-10 pl-10 pr-3 rounded-lg border border-gray-300 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors"
              />
            </div>

            {/* Filtro por vestibular */}
            <select
              value={filterVestibular}
              onChange={(e) => setFilterVestibular(e.target.value)}
              className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 sm:w-48"
            >
              <option value="">Todos vestibulares</option>
              {vestibulares.map((v) => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>

            {/* Filtro por tipo */}
            <select
              value={filterEventType}
              onChange={(e) => setFilterEventType(e.target.value)}
              className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 sm:w-44"
            >
              <option value="">Todos os tipos</option>
              {EVENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>

            {/* Limpar filtros */}
            {hasActiveFilters && (
              <Button variant="ghost" size="icon" onClick={clearFilters} title="Limpar filtros">
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Contador de resultados */}
          {hasActiveFilters && (
            <p className="text-xs text-gray-500 mt-2">
              Mostrando {filteredDates.length} de {dates.length} datas
            </p>
          )}
        </CardContent>
      </Card>

      {/* Lista de datas */}
      <div className="grid gap-3">
        {filteredDates.map((d) => (
          <Card key={d.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="p-2 rounded-lg bg-indigo-50 flex-shrink-0">
                    <Calendar className="h-4 w-4 text-indigo-600" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-gray-900 truncate">{(d.vestibular as Vestibular)?.name}</span>
                      <Badge variant="default">{formatEventType(d.event_type)}</Badge>
                      <Badge variant={d.source === 'scraped' ? 'warning' : 'secondary'}>{d.source}</Badge>
                    </div>
                    <p className="text-sm text-gray-600 truncate">{d.event_name}</p>
                    <p className="text-xs text-gray-500">
                      {format(new Date(d.event_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      {d.event_end_date && ` até ${format(new Date(d.event_end_date), "dd 'de' MMMM", { locale: ptBR })}`}
                    </p>
                    <div className="flex items-center gap-3 mt-0.5">
                      {d.official_url && (
                        <a href={d.official_url} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                          <ExternalLink className="h-3 w-3" /> Link oficial
                        </a>
                      )}
                      {d.notes && (
                        <span className="text-xs text-gray-400 flex items-center gap-1" title={d.notes}>
                          <FileText className="h-3 w-3" /> Tem observações
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <Button variant="ghost" size="icon" onClick={() => setBroadcastTarget(d)} title="Enviar alerta agora"><Send className="h-4 w-4 text-indigo-500" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => openEdit(d)} title="Editar"><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(d.id)} title="Excluir"><Trash2 className="h-4 w-4 text-red-500" /></Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {filteredDates.length === 0 && dates.length > 0 && (
          <Card>
            <CardContent className="p-8 text-center text-gray-500">
              Nenhuma data encontrada com os filtros selecionados.
              <br />
              <button onClick={clearFilters} className="text-indigo-600 hover:underline mt-2 inline-block">
                Limpar filtros
              </button>
            </CardContent>
          </Card>
        )}
        {dates.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center text-gray-500">
              Nenhuma data cadastrada ainda.
            </CardContent>
          </Card>
        )}
      </div>

      {/* Modal de confirmação e resultado de disparo */}
      <Modal open={!!broadcastTarget} onClose={closeBroadcastModal} title={broadcastResult ? 'Resultado do Disparo' : 'Confirmar Disparo de Alerta'}>
        {broadcastTarget && !broadcastResult && (
          <div className="space-y-4">
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">
                Tem certeza que deseja enviar o aviso <strong>&quot;{broadcastTarget.event_name}&quot;</strong> para
                o vestibular <strong>&quot;{(broadcastTarget.vestibular as Vestibular)?.name}&quot;</strong> agora?
              </p>
              <p className="text-xs text-amber-600 mt-2">
                Todos os usuarios inscritos neste vestibular receberao o alerta imediatamente nos canais configurados (email, SMS, WhatsApp).
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={closeBroadcastModal} disabled={broadcasting}>
                Cancelar
              </Button>
              <Button onClick={handleBroadcast} loading={broadcasting}>
                {broadcasting ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Enviando...</>
                ) : (
                  <><Send className="h-4 w-4 mr-2" /> Sim, Enviar Agora</>
                )}
              </Button>
            </div>
          </div>
        )}

        {broadcastResult && (
          <div className="space-y-4">
            {/* Resumo */}
            <div className={`p-4 rounded-lg border ${
              broadcastResult.sent && broadcastResult.sent > 0
                ? 'bg-emerald-50 border-emerald-200'
                : broadcastResult.error
                  ? 'bg-red-50 border-red-200'
                  : 'bg-amber-50 border-amber-200'
            }`}>
              <p className={`text-sm font-medium ${
                broadcastResult.sent && broadcastResult.sent > 0
                  ? 'text-emerald-800'
                  : broadcastResult.error
                    ? 'text-red-800'
                    : 'text-amber-800'
              }`}>
                {broadcastResult.error
                  ? `Erro: ${broadcastResult.error}`
                  : broadcastResult.message
                }
              </p>
            </div>

            {/* Contadores detalhados */}
            {broadcastResult.success && (
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 bg-emerald-50 rounded-lg">
                  <p className="text-2xl font-bold text-emerald-700">{broadcastResult.sent ?? 0}</p>
                  <p className="text-xs text-emerald-600">Enviados</p>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <p className="text-2xl font-bold text-red-700">{broadcastResult.failed ?? 0}</p>
                  <p className="text-xs text-red-600">Falhas</p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-gray-700">{broadcastResult.skipped ?? 0}</p>
                  <p className="text-xs text-gray-600">Ignorados</p>
                </div>
              </div>
            )}

            {/* Dica quando ninguém inscrito */}
            {broadcastResult.success && broadcastResult.sent === 0 && broadcastResult.failed === 0 && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-800 font-medium mb-1">Por que ninguem recebeu?</p>
                <ul className="text-xs text-blue-700 list-disc pl-4 space-y-0.5">
                  <li>Nenhum usuario criou um alerta para este vestibular no Dashboard</li>
                  <li>Para testar: acesse o Dashboard como usuario e crie um alerta para o vestibular desejado</li>
                  <li>O usuario precisa ter o vestibular adicionado em &quot;Meus Alertas&quot;</li>
                </ul>
              </div>
            )}

            {/* Erros detalhados */}
            {broadcastResult.errors && broadcastResult.errors.length > 0 && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-xs text-red-800 font-medium mb-1">Detalhes dos erros:</p>
                <ul className="text-xs text-red-700 list-disc pl-4 space-y-0.5">
                  {broadcastResult.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex justify-end">
              <Button onClick={closeBroadcastModal}>Fechar</Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Editar Data' : 'Nova Data'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Vestibular</label>
            <select
              value={form.vestibular_id}
              onChange={(e) => setForm((f) => ({ ...f, vestibular_id: e.target.value }))}
              className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-sans focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="">Selecione...</option>
              {vestibulares.map((v) => (<option key={v.id} value={v.id}>{v.name}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Tipo de Evento</label>
            <select
              value={form.event_type}
              onChange={(e) => setForm((f) => ({ ...f, event_type: e.target.value as EventType }))}
              className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-sans focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              {EVENT_TYPES.map((t) => (<option key={t.value} value={t.value}>{t.label}</option>))}
            </select>
          </div>
          <Input label="Nome do Evento" value={form.event_name} onChange={(e) => setForm((f) => ({ ...f, event_name: e.target.value }))} placeholder="Ex: Inscrições ENEM 2026" required />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Data" type="date" value={form.event_date} onChange={(e) => setForm((f) => ({ ...f, event_date: e.target.value }))} required />
            <Input label="Data Fim (opcional)" type="date" value={form.event_end_date} onChange={(e) => setForm((f) => ({ ...f, event_end_date: e.target.value }))} />
          </div>
          <Input label="Link Oficial (opcional)" value={form.official_url} onChange={(e) => setForm((f) => ({ ...f, official_url: e.target.value }))} placeholder="https://www.exemplo.com/edital" />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Observações (opcional)</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Texto adicional, instruções, observações..."
              rows={3}
              className="flex w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
            />
          </div>
          <Input label="Alertar X dias antes (separar por vírgula)" value={form.alert_days_before} onChange={(e) => setForm((f) => ({ ...f, alert_days_before: e.target.value }))} placeholder="1,3,7" />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button onClick={handleSave} loading={saving}>{editing ? 'Salvar' : 'Criar'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
