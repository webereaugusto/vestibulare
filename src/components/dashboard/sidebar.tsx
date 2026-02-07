'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  GraduationCap,
  LayoutDashboard,
  Bell,
  CreditCard,
  Settings,
  LogOut,
  Menu,
  X,
  Shield,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { createBrowserClient } from '@/lib/supabase';
import { Profile } from '@/types/database';
import { Badge } from '@/components/ui/badge';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Painel' },
  { href: '/dashboard/alerts', icon: Bell, label: 'Meus Alertas' },
  { href: '/dashboard/upgrade', icon: CreditCard, label: 'Plano' },
  { href: '/dashboard/settings', icon: Settings, label: 'Configurações' },
];

interface SidebarProps {
  profile: Profile;
}

export function Sidebar({ profile }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const supabase = createBrowserClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }

  const planBadgeVariant = profile.plan_type === 'premium'
    ? 'default'
    : profile.plan_type === 'basic'
      ? 'success'
      : 'secondary';

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-white shadow-md border border-gray-200"
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-40 h-screen w-64 bg-white border-r border-gray-200 flex flex-col transition-transform lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-gray-100">
          <Link href="/" className="flex items-center gap-2">
            <GraduationCap className="h-7 w-7 text-indigo-600" />
            <span className="text-lg font-bold text-gray-900">
              Vestibula<span className="text-indigo-600">Re</span>
            </span>
          </Link>
        </div>

        {/* User info */}
        <div className="px-6 py-4 border-b border-gray-100">
          <p className="text-sm font-medium text-gray-900 truncate">
            {profile.full_name || profile.email}
          </p>
          <p className="text-xs text-gray-500 truncate">{profile.email}</p>
          <Badge variant={planBadgeVariant} className="mt-2">
            Plano {profile.plan_type === 'free' ? 'Gratuito' : profile.plan_type === 'basic' ? 'Básico' : 'Premium'}
          </Badge>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                )}
              >
                <item.icon className={cn('h-5 w-5', isActive ? 'text-indigo-600' : 'text-gray-400')} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Admin + Logout */}
        <div className="p-3 border-t border-gray-100 space-y-1">
          {profile.is_admin && (
            <Link
              href="/admin"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors"
            >
              <Shield className="h-5 w-5 text-amber-600" />
              Painel Admin
            </Link>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors w-full"
          >
            <LogOut className="h-5 w-5 text-gray-400" />
            Sair
          </button>
        </div>
      </aside>
    </>
  );
}
