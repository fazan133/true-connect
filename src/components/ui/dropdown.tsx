'use client';

import { createContext, useContext, useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface DropdownContextType {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const DropdownContext = createContext<DropdownContextType | null>(null);

interface DropdownProps {
  children: React.ReactNode;
}

export function Dropdown({ children }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <DropdownContext.Provider value={{ isOpen, setIsOpen }}>
      <div ref={dropdownRef} className="relative">
        {children}
      </div>
    </DropdownContext.Provider>
  );
}

interface DropdownTriggerProps {
  children: React.ReactNode;
  className?: string;
}

export function DropdownTrigger({ children, className }: DropdownTriggerProps) {
  const context = useContext(DropdownContext);
  if (!context) throw new Error('DropdownTrigger must be used within Dropdown');

  return (
    <button
      type="button"
      onClick={() => context.setIsOpen(!context.isOpen)}
      className={className}
    >
      {children}
    </button>
  );
}

interface DropdownContentProps {
  children: React.ReactNode;
  className?: string;
  align?: 'left' | 'right';
}

export function DropdownContent({ children, className, align = 'right' }: DropdownContentProps) {
  const context = useContext(DropdownContext);
  if (!context) throw new Error('DropdownContent must be used within Dropdown');

  if (!context.isOpen) return null;

  return (
    <div
      className={cn(
        'absolute z-50 mt-2 min-w-[180px] rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 shadow-lg py-1 animate-scale-in',
        align === 'right' ? 'right-0' : 'left-0',
        className
      )}
    >
      {children}
    </div>
  );
}

interface DropdownItemProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  danger?: boolean;
}

export function DropdownItem({ children, onClick, className, danger }: DropdownItemProps) {
  const context = useContext(DropdownContext);
  if (!context) throw new Error('DropdownItem must be used within Dropdown');

  return (
    <button
      type="button"
      onClick={() => {
        onClick?.();
        context.setIsOpen(false);
      }}
      className={cn(
        'w-full flex items-center gap-2 px-4 py-2 text-sm text-left transition-colors',
        danger
          ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-950'
          : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800',
        className
      )}
    >
      {children}
    </button>
  );
}

export function DropdownDivider() {
  return <div className="my-1 border-t border-neutral-200 dark:border-neutral-700" />;
}
