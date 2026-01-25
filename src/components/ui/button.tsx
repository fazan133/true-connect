import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    return (
      <button
        className={cn(
          'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed',
          {
            // Variants
            'bg-primary-500 text-white hover:bg-primary-600 focus:ring-primary-500':
              variant === 'primary',
            'bg-neutral-100 text-neutral-900 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700':
              variant === 'secondary',
            'border border-neutral-200 dark:border-neutral-700 bg-transparent hover:bg-neutral-100 dark:hover:bg-neutral-800':
              variant === 'outline',
            'bg-transparent hover:bg-neutral-100 dark:hover:bg-neutral-800':
              variant === 'ghost',
            'bg-red-500 text-white hover:bg-red-600 focus:ring-red-500':
              variant === 'danger',
            // Sizes
            'h-8 px-3 text-sm': size === 'sm',
            'h-10 px-4 text-sm': size === 'md',
            'h-12 px-6 text-base': size === 'lg',
          },
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';

export { Button };
