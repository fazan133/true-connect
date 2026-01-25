'use client';

import Link from 'next/link';
import { Search } from 'lucide-react';
import { ThemeToggle } from './theme-toggle';
import { NotificationBell } from '@/components/notifications/notification-bell';

export function Header() {
  return (
    <header className="lg:hidden sticky top-0 z-30 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800">
      <div className="flex items-center justify-between px-4 h-14">
        <Link href="/feed" className="text-xl font-bold bg-gradient-to-r from-primary-500 to-primary-700 bg-clip-text text-transparent">
          True-Connect
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href="/search"
            className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <Search className="h-5 w-5" />
          </Link>
          <NotificationBell />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
