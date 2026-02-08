'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Users,
  Search,
  Crown,
  Trash2,
  Bell,
  Mail,
  Phone,
  ExternalLink,
  ChevronRight,
  Loader2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { Profile, PlanType } from '@/types/database';
import { PLANS, formatPrice } from '@/lib/plans';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface UserWithStats extends Profile {
  _alertCount: number;
  _sentCount: number;
}

const PLAN_COLORS: Record<PlanType, string> = {
  free: 'secondary',
  basic: 'default',
  premium: 'warning',
};

const PLAN_LABELS: Record<PlanType, string> = {
  free: 'Gratuito',
  basic: 'Basico',
  premium: 'Premium',
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [filterPlan, setFilterPlan] = useState('');
  const [changePlanUser, setChangePlanUser] = useState<UserWithStats | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('free');
  const [actionLoading, setActionLoading] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      if (data.success) {
        setUsers(data.users);
      }
    } catch {
      addToast('Erro ao carregar usuarios.', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(action: string, body: Record<string, unknown>) {
    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...body }),
      });
      const data = await res.json();
      if (data.success) {
        addToast(data.message, 'success');
        loadUsers();
      } else {
        addToast(data.error || 'Erro na operacao.', 'error');
      }
    } catch {
      addToast('Erro na operacao.', 'error');
    } finally {
      setActionLoading(false);
    }
  }

  function openChangePlan(user: UserWithStats) {
    setChangePlanUser(user);
    setSelectedPlan(user.plan_type);
  }

  async function confirmChangePlan() {
    if (!changePlanUser) return;
    await handleAction('update-plan', { userId: changePlanUser.id, planType: selectedPlan });
    setChangePlanUser(null);
  }

  async function handleDelete(user: UserWithStats) {
    if (!confirm(`Tem certeza que deseja excluir o usuario "${user.full_name || user.email}"? Esta acao nao pode ser desfeita.`)) return;
    await handleAction('delete', { userId: user.id });
  }

  // Filtros
  const filteredUsers = users.filter((u) => {
    if (filterPlan && u.plan_type !== filterPlan) return false;
    if (searchText) {
      const q = searchText.toLowerCase();
      const matchName = u.full_name?.toLowerCase().includes(q);
      const matchEmail = u.email.toLowerCase().includes(q);
      const matchPhone = u.phone?.includes(q);
      if (!matchName && !matchEmail && !matchPhone) return false;
    }
    return true;
  });

  // Estatísticas
  const totalUsers = users.length;
  const planCounts = {
    free: users.filter((u) => u.plan_type === 'free').length,
    basic: users.filter((u) => u.plan_type === 'basic').length,
    premium: users.filter((u) => u.plan_type === 'premium').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Usuarios</h1>
        <p className="text-gray-500 mt-1">{totalUsers} usuarios cadastrados</p>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{totalUsers}</p>
            <p className="text-xs text-gray-500">Total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-gray-500">{planCounts.free}</p>
            <p className="text-xs text-gray-500">Gratuito</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">{planCounts.basic}</p>
            <p className="text-xs text-gray-500">Basico</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">{planCounts.premium}</p>
            <p className="text-xs text-gray-500">Premium</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Buscar por nome, email ou telefone..."
                className="w-full h-10 pl-10 pr-3 rounded-lg border border-gray-300 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-colors"
              />
            </div>
            <select
              value={filterPlan}
              onChange={(e) => setFilterPlan(e.target.value)}
              className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 font-sans focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 sm:w-44"
            >
              <option value="">Todos os planos</option>
              <option value="free">Gratuito</option>
              <option value="basic">Basico</option>
              <option value="premium">Premium</option>
            </select>
            {(searchText || filterPlan) && (
              <Button variant="ghost" size="icon" onClick={() => { setSearchText(''); setFilterPlan(''); }} title="Limpar filtros">
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          {(searchText || filterPlan) && (
            <p className="text-xs text-gray-500 mt-2">
              Mostrando {filteredUsers.length} de {users.length} usuarios
            </p>
          )}
        </CardContent>
      </Card>

      {/* Lista de usuários */}
      <div className="grid gap-3">
        {filteredUsers.map((user) => (
          <Card key={user.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-emerald-600">
                      {(user.full_name || user.email).charAt(0).toUpperCase()}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-gray-900 truncate">{user.full_name || 'Sem nome'}</span>
                      {user.is_admin && (
                        <Badge variant="destructive" className="text-[10px]">Admin</Badge>
                      )}
                      <Badge variant={PLAN_COLORS[user.plan_type] as 'default' | 'secondary' | 'warning'}>
                        {PLAN_LABELS[user.plan_type]}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                      <span className="flex items-center gap-1 truncate">
                        <Mail className="h-3 w-3" /> {user.email}
                      </span>
                      {user.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" /> {user.phone}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
                      <span className="flex items-center gap-1">
                        <Bell className="h-3 w-3" /> {user._alertCount} vestibulares
                      </span>
                      <span>{user._sentCount} alertas enviados</span>
                      <span>Desde {format(new Date(user.created_at), "dd/MM/yyyy", { locale: ptBR })}</span>
                    </div>
                  </div>
                </div>

                {/* Ações */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button variant="ghost" size="icon" onClick={() => openChangePlan(user)} title="Alterar plano">
                    <Crown className="h-4 w-4 text-amber-500" />
                  </Button>
                  <Link href={`/admin/users/${user.id}`}>
                    <Button variant="ghost" size="icon" title="Ver detalhes e alertas">
                      <ExternalLink className="h-4 w-4 text-emerald-500" />
                    </Button>
                  </Link>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(user)} title="Excluir usuario" disabled={user.is_admin && user.id === users.find(u => u.is_admin)?.id}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredUsers.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center text-gray-500">
              {searchText || filterPlan ? 'Nenhum usuario encontrado com os filtros.' : 'Nenhum usuario cadastrado.'}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Modal Alterar Plano */}
      <Modal open={!!changePlanUser} onClose={() => !actionLoading && setChangePlanUser(null)} title="Alterar Plano do Usuario">
        {changePlanUser && (
          <div className="space-y-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-900">{changePlanUser.full_name || changePlanUser.email}</p>
              <p className="text-xs text-gray-500">{changePlanUser.email}</p>
              <p className="text-xs text-gray-400 mt-1">Plano atual: <strong>{PLAN_LABELS[changePlanUser.plan_type]}</strong></p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Novo plano</label>
              {(['free', 'basic', 'premium'] as PlanType[]).map((plan) => (
                <label
                  key={plan}
                  className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedPlan === plan ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="plan"
                      value={plan}
                      checked={selectedPlan === plan}
                      onChange={() => setSelectedPlan(plan)}
                      className="text-emerald-600"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{PLANS[plan].name}</p>
                      <p className="text-xs text-gray-500">{PLANS[plan].maxVestibulares} vestibulares, {PLANS[plan].channels.join(', ')}</p>
                    </div>
                  </div>
                  <span className="text-sm font-medium text-gray-700">{formatPrice(PLANS[plan].price)}</span>
                </label>
              ))}
            </div>

            {selectedPlan !== 'free' && (
              <p className="text-xs text-amber-600">O plano pago sera ativado com validade de 1 ano a partir de agora.</p>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setChangePlanUser(null)} disabled={actionLoading}>Cancelar</Button>
              <Button onClick={confirmChangePlan} loading={actionLoading} disabled={selectedPlan === changePlanUser.plan_type}>
                {actionLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Crown className="h-4 w-4 mr-2" />}
                Alterar Plano
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
