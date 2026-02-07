'use client';

import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { createBrowserClient } from '@/lib/supabase';
import { Vestibular } from '@/types/database';

export default function AdminVestibularesPage() {
  const [vestibulares, setVestibulares] = useState<Vestibular[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Vestibular | null>(null);
  const [form, setForm] = useState({ name: '', slug: '', description: '', official_url: '' });
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
    const { data } = await supabase.from('vestibulares').select('*').order('name');
    if (data) setVestibulares(data as Vestibular[]);
    setLoading(false);
  }

  function openCreate() {
    setEditing(null);
    setForm({ name: '', slug: '', description: '', official_url: '' });
    setShowModal(true);
  }

  function openEdit(v: Vestibular) {
    setEditing(v);
    setForm({
      name: v.name,
      slug: v.slug,
      description: v.description || '',
      official_url: v.official_url || '',
    });
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.name || !form.slug) {
      addToast('Nome e slug são obrigatórios.', 'error');
      return;
    }
    setSaving(true);

    if (editing) {
      const { error } = await supabase
        .from('vestibulares')
        .update({
          name: form.name,
          slug: form.slug,
          description: form.description || null,
          official_url: form.official_url || null,
        })
        .eq('id', editing.id);

      if (error) {
        addToast('Erro ao atualizar.', 'error');
      } else {
        addToast('Vestibular atualizado!', 'success');
        setShowModal(false);
        loadData();
      }
    } else {
      const { error } = await supabase.from('vestibulares').insert({
        name: form.name,
        slug: form.slug,
        description: form.description || null,
        official_url: form.official_url || null,
      });

      if (error) {
        addToast(error.code === '23505' ? 'Slug já existe.' : 'Erro ao criar.', 'error');
      } else {
        addToast('Vestibular criado!', 'success');
        setShowModal(false);
        loadData();
      }
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('Tem certeza que deseja excluir?')) return;
    const { error } = await supabase.from('vestibulares').delete().eq('id', id);
    if (error) {
      addToast('Erro ao excluir. Pode haver datas ou alertas vinculados.', 'error');
    } else {
      addToast('Vestibular excluído.', 'success');
      loadData();
    }
  }

  async function handleToggle(v: Vestibular) {
    const { error } = await supabase
      .from('vestibulares')
      .update({ active: !v.active })
      .eq('id', v.id);
    if (!error) loadData();
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
          <h1 className="text-2xl font-bold text-gray-900">Vestibulares</h1>
          <p className="text-gray-500 mt-1">{vestibulares.length} vestibulares cadastrados</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" /> Novo Vestibular
        </Button>
      </div>

      <div className="grid gap-4">
        {vestibulares.map((v) => (
          <Card key={v.id} className={!v.active ? 'opacity-60' : ''}>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900">{v.name}</h3>
                    <Badge variant={v.active ? 'success' : 'secondary'}>
                      {v.active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">Slug: {v.slug}</p>
                  {v.description && <p className="text-sm text-gray-600 mt-1">{v.description}</p>}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {v.official_url && (
                    <a href={v.official_url} target="_blank" rel="noopener noreferrer">
                      <Button variant="ghost" size="icon" title="Site oficial">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </a>
                  )}
                  <Button variant="ghost" size="icon" onClick={() => handleToggle(v)} title={v.active ? 'Desativar' : 'Ativar'}>
                    <span className={`h-3 w-3 rounded-full ${v.active ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => openEdit(v)} title="Editar">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(v.id)} title="Excluir">
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Editar Vestibular' : 'Novo Vestibular'}>
        <div className="space-y-4">
          <Input
            id="name"
            label="Nome"
            value={form.name}
            onChange={(e) => {
              setForm((f) => ({
                ...f,
                name: e.target.value,
                slug: editing ? f.slug : e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
              }));
            }}
            placeholder="Ex: ENEM"
            required
          />
          <Input
            id="slug"
            label="Slug"
            value={form.slug}
            onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
            placeholder="Ex: enem"
            required
          />
          <Input
            id="description"
            label="Descrição"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Descrição breve"
          />
          <Input
            id="url"
            label="URL Oficial"
            type="url"
            value={form.official_url}
            onChange={(e) => setForm((f) => ({ ...f, official_url: e.target.value }))}
            placeholder="https://..."
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button onClick={handleSave} loading={saving}>
              {editing ? 'Salvar' : 'Criar'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
