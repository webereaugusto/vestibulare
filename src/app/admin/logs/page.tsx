import { createSupabaseServer } from '@/lib/supabase-server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatChannel, formatStatus } from '@/lib/utils';
import { format } from 'date-fns';

export default async function AdminLogsPage() {
  const supabase = await createSupabaseServer();

  const { data: logs } = await supabase
    .from('alert_logs')
    .select(`
      *,
      user_alert:user_alerts(
        *,
        profile:profiles(email, full_name),
        vestibular:vestibulares(name)
      ),
      important_date:important_dates(event_name, event_date)
    `)
    .order('sent_at', { ascending: false })
    .limit(100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Logs de Alertas</h1>
        <p className="text-gray-500 mt-1">Histórico de alertas enviados pelo sistema.</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-700">Data/Hora</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-700">Usuário</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-700">Vestibular</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-700">Evento</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-700">Canal</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-700">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-700">Erro</th>
                </tr>
              </thead>
              <tbody>
                {logs && logs.length > 0 ? (
                  logs.map((log) => {
                    const userAlert = log.user_alert as {
                      profile?: { email: string; full_name: string };
                      vestibular?: { name: string };
                    } | null;
                    const importantDate = log.important_date as { event_name: string; event_date: string } | null;
                    return (
                      <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                          {format(new Date(log.sent_at), 'dd/MM/yyyy HH:mm')}
                        </td>
                        <td className="px-4 py-3 text-gray-900">
                          {userAlert?.profile?.email || '-'}
                        </td>
                        <td className="px-4 py-3 text-gray-900">
                          {userAlert?.vestibular?.name || '-'}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {importantDate?.event_name || '-'}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="secondary">{formatChannel(log.channel)}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={
                              log.status === 'sent' ? 'success' : log.status === 'failed' ? 'destructive' : 'warning'
                            }
                          >
                            {formatStatus(log.status)}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-red-600 text-xs max-w-[200px] truncate">
                          {log.error_message || '-'}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                      Nenhum log encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
