'use client';
import { type LucideIcon } from 'lucide-react';
import Link from 'next/link';

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  color?: string;
  href?: string;
}

export function StatCard({ title, value, subtitle, icon: Icon, color = 'text-primary', href }: StatCardProps) {
  const content = (
    <div
      className={`bg-card rounded-xl border border-border p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[0_18px_40px_-22px_rgba(0,0,0,0.9)]${
        href ? ' cursor-pointer h-full' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-muted-foreground">{title}</span>
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-white/[0.08] to-transparent border border-white/5 flex items-center justify-center">
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
      </div>
      <p className="font-display text-2xl font-bold tracking-tight">{value}</p>
      {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {content}
      </Link>
    );
  }
  return content;
}
