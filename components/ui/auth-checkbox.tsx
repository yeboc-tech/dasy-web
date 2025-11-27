'use client';

import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/lib/contexts/auth-context';
import { useAuthBlocker } from '@/lib/contexts/auth-blocker-context';

type CheckboxProps = React.ComponentProps<typeof Checkbox>;

/**
 * A Checkbox that requires authentication.
 * If user is not authenticated, clicking triggers the auth blocker instead of onCheckedChange.
 */
export function AuthCheckbox({ onCheckedChange, ...props }: CheckboxProps) {
  const { user } = useAuth();
  const { triggerAuthBlocker } = useAuthBlocker();

  const handleCheckedChange = (checked: boolean | 'indeterminate') => {
    if (!user) {
      triggerAuthBlocker();
      return;
    }
    onCheckedChange?.(checked);
  };

  return <Checkbox onCheckedChange={handleCheckedChange} {...props} />;
}
