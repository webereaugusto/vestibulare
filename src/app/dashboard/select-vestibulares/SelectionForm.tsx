'use client';

import { useState } from 'react';
import { createBrowserClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function SelectionForm({ vestibulares }: { vestibulares: any[] }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [showLimitModal, setShowLimitModal] = useState(false);
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
      // fetch profile to check plan limits
      const { data: profile } = await supabase.from('profiles').select('plan_type').eq('id', user.id).single();
      const planType = profile?.plan_type || 'free';

      // if free plan and selected > 2, show friendly modal instead of proceeding
      if (planType === 'free' && selected.length > 2) {
        setShowLimitModal(true);
        setSaving(false);
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
      {/* Limit modal for free plan */}
      {showLimitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg p-6 max-w-md w-full shadow">
            <h3 className="text-lg font-semibold mb-2">Limite do plano Gratuito</h3>
            <p className="text-sm text-gray-600 mb-4">
              O plano gratuito permite até 2 vestibulares. Você selecionou {selected.length}. Você pode:
            </p>
            <ul className="list-disc list-inside text-sm text-gray-700 mb-4">
              <li>Manter apenas 2 opções selecionadas (o aplicativo removerá as extras).</li>
              <li>Fazer upgrade para um plano com mais limites.</li>
            </ul>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowLimitModal(false)}>Cancelar</Button>
              <Button onClick={() => { setSelected((s) => s.slice(0, 2)); setShowLimitModal(false); }}>Manter apenas 2</Button>
              <Button onClick={() => router.push('/dashboard/upgrade')}>Ver planos</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

