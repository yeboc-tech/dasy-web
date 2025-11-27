'use client';

import React from 'react';
import { Slider } from '@/components/ui/slider';
import { useAuth } from '@/lib/contexts/auth-context';
import { useAuthBlocker } from '@/lib/contexts/auth-blocker-context';

type SliderProps = React.ComponentProps<typeof Slider>;

/**
 * A Slider that requires authentication.
 * If user is not authenticated, interaction triggers the auth blocker.
 */
export function AuthSlider({ onValueChange, ...props }: SliderProps) {
  const { user } = useAuth();
  const { triggerAuthBlocker } = useAuthBlocker();

  const handleValueChange = (value: number[]) => {
    if (!user) {
      triggerAuthBlocker();
      return;
    }
    onValueChange?.(value);
  };

  return <Slider onValueChange={handleValueChange} {...props} />;
}
