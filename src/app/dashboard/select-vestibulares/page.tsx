import { createSupabaseServer } from '@/lib/supabase-server';
import { Vestibular } from '@/types/database';
import SelectionForm from './SelectionForm';

export default async function SelectVestibularesPage() {
  const supabase = await createSupabaseServer();

  const { data: vestibulares } = await supabase
    .from('vestibulares')
    .select('id,name,slug')
    .order('name', { ascending: true })
    .limit(200);

  const list = (vestibulares || []) as Vestibular[];

  return (
    <div className="max-w-4xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Escolher vestibulares</h1>
      <p className="text-gray-600 mb-6">Selecione um ou mais vestibulares para começar a receber alertas.</p>
      <SelectionForm vestibulares={list} />
    </div>
  );
}

