'use client';

import { useState } from 'react';
import { createBrowserClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function SelectionForm({ vestibulares }: { vestibulares: any[] }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const supabase = createBrowserClient();

  function toggle(id: string) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  async function handleSave() {
    if (selected.length === 0) return;
    setSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        // redirect to login
        router.push('/auth/login');
        return;
      }

      // create user_alerts for each selected vestibular
      const inserts = selected.map((vestibular_id) => ({
        user_id: user.id,
        vestibular_id,
        channels: ['whatsapp'],
        event_types: null,
        active: true,
      }));

      const { error } = await supabase.from('user_alerts').insert(inserts);
      if (error) {
        console.error('Erro ao criar alertas:', error);
      } else {
        router.push('/dashboard');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {vestibulares.map((v) => (
          <label
            key={v.id}
            className={`p-3 rounded-lg border cursor-pointer flex items-center justify-between ${
              selected.includes(v.id) ? 'bg-emerald-50 border-emerald-300' : 'bg-white border-gray-200'
            }`}
          >
            <div>
              <div className="font-medium text-gray-900">{v.name}</div>
              <div className="text-xs text-gray-500">{v.slug}</div>
            </div>
            <input
              type="checkbox"
              checked={selected.includes(v.id)}
              onChange={() => toggle(v.id)}
              className="h-4 w-4"
            />
          </label>
        ))}
      </div>
      <div className="flex justify-end">
        <Button onClick={handleSave} loading={saving} className="ml-auto">
          Salvar e Voltar
        </Button>
      </div>
    </div>
  );
}

