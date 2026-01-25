'use client';

import Image from 'next/image';
import { cn, getInitials } from '@/lib/utils';

interface AvatarProps {
  src?: string | null;
  alt?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function Avatar({ src, alt = 'Avatar', size = 'md', className }: AvatarProps) {
  const sizeClasses = {
    xs: 'h-6 w-6 text-xs',
    sm: 'h-8 w-8 text-sm',
    md: 'h-10 w-10 text-sm',
    lg: 'h-12 w-12 text-base',
    xl: 'h-20 w-20 text-xl',
  };

  const imageSizes = {
    xs: 24,
    sm: 32,
    md: 40,
    lg: 48,
    xl: 80,
  };

  if (src) {
    return (
      <div className={cn('relative rounded-full overflow-hidden flex-shrink-0', sizeClasses[size], className)}>
        <Image
          src={src}
          alt={alt}
          width={imageSizes[size]}
          height={imageSizes[size]}
          className="object-cover w-full h-full"
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full bg-gradient-to-br from-primary-400 to-primary-600 text-white font-medium flex-shrink-0',
        sizeClasses[size],
        className
      )}
    >
      {getInitials(alt)}
    </div>
  );
}
