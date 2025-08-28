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
              'flex items-center gap-2 p-2 rounded-md text-sm font-medium transition-colors hover:bg-accent/50 hover:text-primary relative md:p-0 md:hover:bg-transparent',
              isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <item.icon className="h-5 w-5 md:h-4 md:w-4" />
            <span>{item.label}</span>
            {isActive && (
              <span className="absolute hidden md:block -bottom-1 left-0 w-full h-0.5 bg-primary rounded-full" />
            )}
          </Link>
        );
      })}
    </>
  );
}
