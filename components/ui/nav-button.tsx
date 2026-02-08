'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type NavButtonProps = {
  href: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
};

export function NavButton({
  href,
  icon,
  children,
  className,
  variant = 'default',
  size = 'default',
}: NavButtonProps) {
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);

  // Reset loading when href changes (e.g. layout reuses this slot for a different button)
  useEffect(() => {
    setIsNavigating(false);
  }, [href]);

  const handleClick = () => {
    setIsNavigating(true);
    router.push(href);
  };

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={cn(className)}
      disabled={isNavigating}
      onClick={handleClick}
    >
      {isNavigating ? (
        <Loader2 className="h-4 w-4 animate-spin shrink-0" />
      ) : (
        icon
      )}
      {children}
    </Button>
  );
}
