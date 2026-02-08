'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  GraduationCap,
  LayoutDashboard,
  BookOpen,
  Calendar,
  Activity,
  Bot,
  LogOut,
  Menu,
  X,
  ArrowLeft,
  Mail,
  MessageSquare,
  Smartphone,
  Users,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { createBrowserClient } from '@/lib/supabase';
import { Profile } from '@/types/database';
import { Badge } from '@/components/ui/badge';

const navItems = [
  { href: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/admin/users', icon: Users, label: 'Usuarios' },
  { href: '/admin/vestibulares', icon: BookOpen, label: 'Vestibulares' },
  { href: '/admin/dates', icon: Calendar, label: 'Datas Importantes' },
  { href: '/admin/logs', icon: Activity, label: 'Logs de Alertas' },
  { href: '/admin/scraper', icon: Bot, label: 'Scraper' },
  { href: '/admin/test-email', icon: Mail, label: 'Teste de Email' },
  { href: '/admin/test-sms', icon: Smartphone, label: 'Teste de SMS' },
  { href: '/admin/evolution', icon: MessageSquare, label: 'WhatsApp' },
];

interface AdminSidebarProps {
  profile: Profile;
}

export function AdminSidebar({ profile }: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const supabase = createBrowserClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }

  return (
    <>
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-white shadow-md border border-gray-200"
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setMobileOpen(false)} />
      )}

      <aside
        className={cn(
          'fixed top-0 left-0 z-40 h-screen w-64 bg-gray-900 text-white flex flex-col transition-transform lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="h-16 flex items-center px-6 border-b border-gray-800">
          <Link href="/admin" className="flex items-center gap-2">
            <GraduationCap className="h-7 w-7 text-indigo-400" />
            <span className="text-lg font-bold">
              Vestibula<span className="text-indigo-400">Re</span>
            </span>
          </Link>
          <Badge className="ml-2 bg-red-600 text-white text-[10px]">Admin</Badge>
        </div>

        <div className="px-6 py-4 border-b border-gray-800">
          <p className="text-sm font-medium text-gray-300 truncate">{profile.full_name || profile.email}</p>
          <p className="text-xs text-gray-500 truncate">{profile.email}</p>
        </div>

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
                    ? 'bg-indigo-600/20 text-indigo-300'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                )}
              >
                <item.icon className={cn('h-5 w-5', isActive ? 'text-indigo-400' : 'text-gray-500')} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-gray-800 space-y-1">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-gray-200 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-500" />
            Voltar ao Painel
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-gray-200 transition-colors w-full"
          >
            <LogOut className="h-5 w-5 text-gray-500" />
            Sair
          </button>
        </div>
      </aside>
    </>
  );
}
