'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, PenSquare, ClipboardList, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', label: 'Dash', icon: LayoutDashboard },
  { href: '/read', label: 'Read', icon: BookOpen },
  { href: '/write', label: 'Write', icon: PenSquare },
  { href: '/attendance', label: 'Attend', icon: ClipboardList },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[hsl(var(--sidebar))] border-t border-[hsl(var(--sidebar-border))] safe-area-inset-bottom">
      <div className="flex items-stretch">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex-1 flex flex-col items-center justify-center gap-1 py-3 px-2 text-[10px] font-medium transition-all duration-150',
                active
                  ? 'text-[hsl(var(--primary))]'
                  : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
              )}
            >
              <Icon
                className={cn(
                  'w-5 h-5 transition-transform duration-150',
                  active && 'scale-110'
                )}
              />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
