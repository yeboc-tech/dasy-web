'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from './auth-context';

interface AuthBlockerContextType {
  showAuthBlocker: boolean;
  triggerAuthBlocker: () => void;
  dismissAuthBlocker: () => void;
}

const AuthBlockerContext = createContext<AuthBlockerContextType | undefined>(undefined);

export function AuthBlockerProvider({ children }: { children: React.ReactNode }) {
  const [showAuthBlocker, setShowAuthBlocker] = useState(false);
  const pathname = usePathname();

  // Reset auth blocker on navigation
  useEffect(() => {
    setShowAuthBlocker(false);
  }, [pathname]);

  const triggerAuthBlocker = useCallback(() => {
    setShowAuthBlocker(true);
  }, []);

  const dismissAuthBlocker = useCallback(() => {
    setShowAuthBlocker(false);
  }, []);

  return (
    <AuthBlockerContext.Provider value={{ showAuthBlocker, triggerAuthBlocker, dismissAuthBlocker }}>
      {children}
    </AuthBlockerContext.Provider>
  );
}

export function useAuthBlocker() {
  const context = useContext(AuthBlockerContext);
  if (!context) {
    throw new Error('useAuthBlocker must be used within AuthBlockerProvider');
  }
  return context;
}

// Wrapper component for elements that require authentication
interface AuthRequiredProps {
  children: React.ReactNode;
  className?: string;
}

export function AuthRequired({ children, className }: AuthRequiredProps) {
  const { user, loading } = useAuth();
  const { triggerAuthBlocker } = useAuthBlocker();

  // If user is authenticated, render children without wrapper
  if (loading || user) {
    return <>{children}</>;
  }

  // For unauthenticated users, render an overlay that captures all events
  return (
    <div className={`relative ${className || ''}`}>
      {children}
      {/* Invisible overlay that captures all pointer events */}
      <div
        className="absolute inset-0 z-50 cursor-pointer"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          triggerAuthBlocker();
        }}
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onPointerDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      />
    </div>
  );
}
