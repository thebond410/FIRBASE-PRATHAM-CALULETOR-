"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { LayoutDashboard, ListOrdered, Calculator, Settings } from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/bill-list', label: 'Bill List', icon: ListOrdered },
  { href: '/calculator', label: 'Calculator', icon: Calculator },
  { href: '/settings', label: 'Settings', icon: Settings },
];

interface NavMenuProps {
    onLinkClick?: () => void;
}

export default function NavMenu({ onLinkClick }: NavMenuProps) {
  const pathname = usePathname();

  return (
    <>
      {navItems.map((item) => {
        const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
        return (
          <Link
            key={item.label}
            href={item.href}
            onClick={onLinkClick}
            className={cn(
              'flex items-center gap-2 p-2 rounded-md transition-colors whitespace-nowrap',
              isActive 
                ? 'font-bold text-base bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent' 
                : 'text-muted-foreground hover:text-foreground font-semibold text-sm'
            )}
          >
            <item.icon className="h-5 w-5" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </>
  );
}
