'use client';

import Link from 'next/link';
import { Search } from 'lucide-react';
import { ThemeToggle } from './theme-toggle';
import { NotificationBell } from '@/components/notifications/notification-bell';

export function Header() {
  return (
    <>
      {/* Mobile Header */}
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

      {/* Desktop Top Bar */}
      <header className="hidden lg:block fixed top-0 left-64 right-0 z-30 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center justify-between px-6 h-14 max-w-2xl mx-auto">
          <Link
            href="/search"
            className="flex items-center gap-2 flex-1 max-w-md px-4 py-2 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
          >
            <Search className="h-4 w-4" />
            <span className="text-sm">Search users...</span>
          </Link>
          <div className="flex items-center gap-3 ml-4">
            <NotificationBell />
            <ThemeToggle />
          </div>
        </div>
      </header>
    </>
  );
}
