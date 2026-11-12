'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { useState } from 'react';
import {
  LayoutDashboard,
  Receipt,
  Target,
  TrendingUp,
  Bitcoin,
  Package,
  Car,
  Wallet,
  Settings,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { Logo } from '@/components/logo';
import { InstallAppButton } from '@/components/install-app-button';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/gastos', label: 'Gastos', icon: Receipt },
  { href: '/objetivos', label: 'Objetivos', icon: Target },
  { href: '/inversiones', label: 'Inversiones', icon: TrendingUp },
  { href: '/cripto', label: 'Portfolio Cripto', icon: Bitcoin },
  { href: '/inventario', label: 'Inventario', icon: Package },
  { href: '/vehiculos', label: 'Vehículos', icon: Car },
  { href: '/patrimonio', label: 'Patrimonio', icon: Wallet },
  { href: '/configuracion', label: 'Configuración', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed top-4 left-4 z-50 lg:hidden bg-card p-2 rounded-lg border border-border shadow-lg"
        aria-label="Toggle menu"
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-40 h-full w-64 bg-card border-r border-border flex flex-col transition-transform duration-300',
          'lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <Logo size={40} />
            <div>
              <h1 className="font-display font-bold text-lg tracking-tight">MisFinanzas</h1>
              <p className="text-xs text-muted-foreground">Panel personal</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                  isActive
                    ? 'bg-gradient-to-r from-primary/20 to-primary/5 text-primary border border-primary/20 shadow-[0_4px_14px_-8px_hsl(160_84%_39%/0.6)]'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground border border-transparent'
                )}
              >
                <item.icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border">
          <InstallAppButton />
          <button
            onClick={() => signOut({ redirectTo: '/login' })}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all w-full"
          >
            <LogOut size={18} />
            Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  );
}
