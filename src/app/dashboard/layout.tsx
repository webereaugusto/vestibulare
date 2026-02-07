import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/supabase-server';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Profile } from '@/types/database';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getProfile() as Profile | null;

  console.log('[Dashboard] Profile carregado:', profile?.email, 'is_admin:', profile?.is_admin, 'plan:', profile?.plan_type);

  if (!profile) {
    redirect('/auth/login');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar profile={profile} />
      <main className="lg:ml-64 min-h-screen">
        <div className="p-6 lg:p-8 pt-20 lg:pt-8">{children}</div>
      </main>
    </div>
  );
}
