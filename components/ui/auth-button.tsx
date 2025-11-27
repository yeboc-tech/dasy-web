'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/contexts/auth-context';
import { useAuthBlocker } from '@/lib/contexts/auth-blocker-context';

type ButtonProps = React.ComponentProps<typeof Button>;

/**
 * A Button that requires authentication.
 * If user is not authenticated, clicking triggers the auth blocker instead of onClick.
 */
export function AuthButton({ onClick, children, ...props }: ButtonProps) {
  const { user } = useAuth();
  const { triggerAuthBlocker } = useAuthBlocker();

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!user) {
      e.preventDefault();
      e.stopPropagation();
      triggerAuthBlocker();
      return;
    }
    onClick?.(e);
  };

  return (
    <Button onClick={handleClick} {...props}>
      {children}
    </Button>
  );
}
