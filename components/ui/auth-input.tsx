'use client';

import React from 'react';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/contexts/auth-context';
import { useAuthBlocker } from '@/lib/contexts/auth-blocker-context';

type InputProps = React.ComponentProps<typeof Input>;

/**
 * An Input that requires authentication.
 * If user is not authenticated, focusing triggers the auth blocker.
 */
export function AuthInput({ onFocus, onChange, ...props }: InputProps) {
  const { user } = useAuth();
  const { triggerAuthBlocker } = useAuthBlocker();

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    if (!user) {
      e.target.blur();
      triggerAuthBlocker();
      return;
    }
    onFocus?.(e);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user) {
      triggerAuthBlocker();
      return;
    }
    onChange?.(e);
  };

  return <Input onFocus={handleFocus} onChange={handleChange} {...props} />;
}
