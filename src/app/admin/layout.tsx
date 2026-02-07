import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/supabase-server';
import { Profile } from '@/types/database';
import { AdminSidebar } from '@/components/admin/sidebar';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = (await getProfile()) as Profile | null;

  if (!profile) {
    redirect('/auth/login');
  }

  if (!profile.is_admin) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminSidebar profile={profile} />
      <main className="lg:ml-64 min-h-screen">
        <div className="p-6 lg:p-8 pt-20 lg:pt-8">{children}</div>
      </main>
    </div>
  );
}
