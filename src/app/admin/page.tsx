import { createSupabaseServer } from '@/lib/supabase-server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, BookOpen, Calendar, Bell, CreditCard, TrendingUp } from 'lucide-react';

export default async function AdminDashboardPage() {
  const supabase = await createSupabaseServer();

  const [
    { count: usersCount },
    { count: vestibularesCount },
    { count: datesCount },
    { count: alertsCount },
    { count: sentAlertsCount },
    { count: paidUsersCount },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('vestibulares').select('*', { count: 'exact', head: true }).eq('active', true),
    supabase.from('important_dates').select('*', { count: 'exact', head: true }),
    supabase.from('user_alerts').select('*', { count: 'exact', head: true }).eq('active', true),
    supabase.from('alert_logs').select('*', { count: 'exact', head: true }).eq('status', 'sent'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).neq('plan_type', 'free'),
  ]);

  const stats = [
    { label: 'Usuários', value: usersCount || 0, icon: Users, color: 'bg-blue-50 text-blue-600' },
    { label: 'Vestibulares', value: vestibularesCount || 0, icon: BookOpen, color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Datas Cadastradas', value: datesCount || 0, icon: Calendar, color: 'bg-purple-50 text-purple-600' },
    { label: 'Alertas Ativos', value: alertsCount || 0, icon: Bell, color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Alertas Enviados', value: sentAlertsCount || 0, icon: TrendingUp, color: 'bg-amber-50 text-amber-600' },
    { label: 'Assinantes Pagos', value: paidUsersCount || 0, icon: CreditCard, color: 'bg-rose-50 text-rose-600' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Painel Administrativo</h1>
        <p className="text-gray-500 mt-1">Visão geral do sistema.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${stat.color}`}>
                  <stat.icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
