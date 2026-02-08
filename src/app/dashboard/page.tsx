import { getProfile, createSupabaseServer } from '@/lib/supabase-server';
import { Profile } from '@/types/database';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell, Calendar, CheckCircle, AlertTriangle, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getDaysUntil, formatEventType, formatChannel, formatStatus } from '@/lib/utils';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default async function DashboardPage() {
  const profile = (await getProfile()) as Profile;
  const supabase = await createSupabaseServer();

  // Buscar alertas do usuário com vestibulares
  const { data: userAlerts } = await supabase
    .from('user_alerts')
    .select('*, vestibular:vestibulares(*)')
    .eq('user_id', profile.id)
    .eq('active', true);

  // Buscar próximas datas importantes
  const today = new Date().toISOString().split('T')[0];
  const { data: upcomingDates } = await supabase
    .from('important_dates')
    .select('*, vestibular:vestibulares(name, slug)')
    .gte('event_date', today)
    .order('event_date', { ascending: true })
    .limit(10);

  // Buscar logs recentes
  const { data: recentLogs } = await supabase
    .from('alert_logs')
    .select('*, user_alert:user_alerts(*, vestibular:vestibulares(name)), important_date:important_dates(event_name)')
    .eq('user_alert.user_id', profile.id)
    .order('sent_at', { ascending: false })
    .limit(5);

  const alertCount = userAlerts?.length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Olá, {profile.full_name || 'estudante'}!
          </h1>
          <p className="text-gray-500 mt-1">
            Aqui está um resumo dos seus alertas de vestibulares.
          </p>
        </div>
        <Link href="/dashboard/alerts">
          <Button>
            <Plus className="h-4 w-4 mr-2" /> Novo Alerta
          </Button>
        </Link>
      </div>

      {/* Banner de verificação */}
      {(!profile.email_verified || (profile.phone && (!profile.phone_verified || !profile.whatsapp_verified))) && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-800">Verifique seus dados de contato</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  Para garantir a entrega dos seus alertas, confirme seus meios de comunicacao.
                  {!profile.email_verified && ' Email nao verificado.'}
                  {profile.phone && !profile.phone_verified && ' Telefone (SMS) nao verificado.'}
                  {profile.phone && !profile.whatsapp_verified && ' WhatsApp nao verificado.'}
                </p>
                <Link href="/dashboard/settings" className="text-xs text-amber-800 font-medium hover:text-amber-900 underline mt-1 inline-block">
                  Verificar agora →
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-indigo-50">
                <Bell className="h-6 w-6 text-indigo-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{alertCount}</p>
                <p className="text-sm text-gray-500">Alertas ativos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-emerald-50">
                <Calendar className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {upcomingDates?.length || 0}
                </p>
                <p className="text-sm text-gray-500">Próximas datas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-blue-50">
                <CheckCircle className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {recentLogs?.filter((l) => l.status === 'sent').length || 0}
                </p>
                <p className="text-sm text-gray-500">Alertas enviados</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-amber-50">
                <AlertTriangle className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 capitalize">
                  {profile.plan_type === 'free' ? 'Gratuito' : profile.plan_type === 'basic' ? 'Básico' : 'Premium'}
                </p>
                <p className="text-sm text-gray-500">Seu plano</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Próximas Datas */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Próximas Datas</CardTitle>
            <Link href="/dashboard/alerts">
              <Button variant="ghost" size="sm">Ver todos</Button>
            </Link>
          </CardHeader>
          <CardContent>
            {upcomingDates && upcomingDates.length > 0 ? (
              <div className="space-y-3">
                {upcomingDates.slice(0, 5).map((date) => {
                  const days = getDaysUntil(date.event_date);
                  return (
                    <div
                      key={date.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {(date.vestibular as { name: string })?.name} - {date.event_name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {format(new Date(date.event_date), "dd 'de' MMMM", { locale: ptBR })}
                        </p>
                      </div>
                      <Badge
                        variant={days <= 1 ? 'destructive' : days <= 3 ? 'warning' : days <= 7 ? 'default' : 'secondary'}
                      >
                        {days === 0 ? 'Hoje' : days === 1 ? 'Amanhã' : `${days} dias`}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-8">
                Nenhuma data próxima encontrada.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Alertas Recentes */}
        <Card>
          <CardHeader>
            <CardTitle>Alertas Enviados</CardTitle>
          </CardHeader>
          <CardContent>
            {recentLogs && recentLogs.length > 0 ? (
              <div className="space-y-3">
                {recentLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-gray-50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {(log.important_date as { event_name: string })?.event_name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatChannel(log.channel)} - {format(new Date(log.sent_at), "dd/MM/yyyy 'às' HH:mm")}
                      </p>
                    </div>
                    <Badge variant={log.status === 'sent' ? 'success' : log.status === 'failed' ? 'destructive' : 'warning'}>
                      {formatStatus(log.status)}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-8">
                Nenhum alerta enviado ainda.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* CTA para adicionar alertas */}
      {alertCount === 0 && (
        <Card className="border-indigo-200 bg-indigo-50">
          <CardContent className="p-6 text-center">
            <Bell className="h-12 w-12 text-indigo-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Configure seus primeiros alertas
            </h3>
            <p className="text-gray-600 mb-4">
              Escolha os vestibulares que você quer acompanhar e nunca mais perca uma data importante.
            </p>
            <Link href="/dashboard/alerts">
              <Button>Configurar Alertas</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Botão flutuante - sempre visível */}
      <Link
        href="/dashboard/alerts"
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-full shadow-lg hover:shadow-xl transition-all"
      >
        <Plus className="h-5 w-5" />
        <span className="font-medium text-sm">Novo Alerta</span>
      </Link>
    </div>
  );
}
