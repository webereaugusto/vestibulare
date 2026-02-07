'use client';

import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Calendar } from 'lucide-react';
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
    alert_days_before: '1,3,7',
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
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
        .select('*, vestibular:vestibulares(name, slug)')
        .order('event_date', { ascending: false })
        .limit(100),
      supabase.from('vestibulares').select('*').eq('active', true).order('name'),
    ]);
    if (datesRes.data) setDates(datesRes.data as (ImportantDate & { vestibular: Vestibular })[]);
    if (vestRes.data) setVestibulares(vestRes.data as Vestibular[]);
    setLoading(false);
  }

  function openCreate() {
    setEditing(null);
    setForm({ vestibular_id: '', event_type: 'inscricao', event_name: '', event_date: '', event_end_date: '', alert_days_before: '1,3,7' });
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
      alert_days_before: d.alert_days_before.join(','),
    });
    setShowModal(true);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Datas Importantes</h1>
          <p className="text-gray-500 mt-1">{dates.length} datas cadastradas</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" /> Nova Data
        </Button>
      </div>

      <div className="grid gap-3">
        {dates.map((d) => (
          <Card key={d.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="p-2 rounded-lg bg-indigo-50 flex-shrink-0">
                    <Calendar className="h-4 w-4 text-indigo-600" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 truncate">{(d.vestibular as Vestibular)?.name}</span>
                      <Badge variant="default">{formatEventType(d.event_type)}</Badge>
                      <Badge variant={d.source === 'scraped' ? 'warning' : 'secondary'}>{d.source}</Badge>
                    </div>
                    <p className="text-sm text-gray-600 truncate">{d.event_name}</p>
                    <p className="text-xs text-gray-500">
                      {format(new Date(d.event_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      {d.event_end_date && ` até ${format(new Date(d.event_end_date), "dd 'de' MMMM", { locale: ptBR })}`}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(d)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(d.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {dates.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center text-gray-500">
              Nenhuma data cadastrada ainda.
            </CardContent>
          </Card>
        )}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Editar Data' : 'Nova Data'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Vestibular</label>
            <select
              value={form.vestibular_id}
              onChange={(e) => setForm((f) => ({ ...f, vestibular_id: e.target.value }))}
              className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
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
              className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              {EVENT_TYPES.map((t) => (<option key={t.value} value={t.value}>{t.label}</option>))}
            </select>
          </div>
          <Input label="Nome do Evento" value={form.event_name} onChange={(e) => setForm((f) => ({ ...f, event_name: e.target.value }))} placeholder="Ex: Inscrições ENEM 2026" required />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Data" type="date" value={form.event_date} onChange={(e) => setForm((f) => ({ ...f, event_date: e.target.value }))} required />
            <Input label="Data Fim (opcional)" type="date" value={form.event_end_date} onChange={(e) => setForm((f) => ({ ...f, event_end_date: e.target.value }))} />
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
