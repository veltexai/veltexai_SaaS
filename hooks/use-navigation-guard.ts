import { useEffect, useRef } from 'react';
import { useConfirmation } from '@/components/providers/confirmation-provider';

// Global state for navigation guards
let globalNavigationGuards: Array<{
  id: string;
  hasUnsavedChanges: boolean;
  message: string;
  confirmFn: (options: any) => Promise<boolean>;
}> = [];

let isGlobalInterceptorSetup = false;
let isNavigating = false;
let isConfirmationInProgress = false;

function setupGlobalInterceptor() {
  if (isGlobalInterceptorSetup || typeof window === 'undefined') return;

  const checkGuards = async () => {
    if (isConfirmationInProgress) return true;

    const activeGuard = globalNavigationGuards.find(
      (guard) => guard.hasUnsavedChanges
    );
    if (activeGuard) {
      isConfirmationInProgress = true;
      const result = await activeGuard.confirmFn({
        title: 'Unsaved Changes',
        message: activeGuard.message,
        confirmText: 'Leave Page',
        cancelText: 'Stay Here',
        variant: 'destructive',
      });
      isConfirmationInProgress = false;
      return result;
    }
    return true;
  };

  // Store original methods
  const originalPushState = window.history.pushState;
  const originalReplaceState = window.history.replaceState;

  // Override pushState
  window.history.pushState = async function (state, title, url) {
    if (isNavigating || isConfirmationInProgress) return;

    if (!(await checkGuards())) {
      return;
    }

    isNavigating = true;
    originalPushState.call(this, state, title, url);
    isNavigating = false;
  };

  // Override replaceState
  window.history.replaceState = async function (state, title, url) {
    if (isNavigating || isConfirmationInProgress) return;

    if (!(await checkGuards())) {
      return;
    }

    isNavigating = true;
    originalReplaceState.call(this, state, title, url);
    isNavigating = false;
  };

  // Handle popstate (back/forward buttons)
  let isPopstateBlocked = false;
  window.addEventListener('popstate', async (e) => {
    if (isPopstateBlocked || isConfirmationInProgress) return;

    const activeGuard = globalNavigationGuards.find(
      (guard) => guard.hasUnsavedChanges
    );
    if (activeGuard) {
      isPopstateBlocked = true;
      const confirmed = await activeGuard.confirmFn({
        title: 'Unsaved Changes',
        message: activeGuard.message,
        confirmText: 'Leave Page',
        cancelText: 'Stay Here',
        variant: 'destructive',
      });

      if (!confirmed) {
        window.history.pushState(null, '', window.location.href);
      }
      setTimeout(() => {
        isPopstateBlocked = false;
      }, 0);
    }
  });

  // Intercept Link clicks
  document.addEventListener(
    'click',
    async (e) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a[href]') as HTMLAnchorElement;

      if (
        link &&
        link.href &&
        !link.target &&
        !e.ctrlKey &&
        !e.metaKey &&
        !isConfirmationInProgress
      ) {
        const activeGuard = globalNavigationGuards.find(
          (guard) => guard.hasUnsavedChanges
        );
        if (activeGuard) {
          e.preventDefault();
          const confirmed = await activeGuard.confirmFn({
            title: 'Unsaved Changes',
            message: activeGuard.message,
            confirmText: 'Leave Page',
            cancelText: 'Stay Here',
            variant: 'destructive',
            illustration: 'Warning-pana.svg',
          });

          if (confirmed) {
            isNavigating = true;
            window.location.href = link.href;
          }
        }
      }
    },
    true
  );

  // Intercept keyboard shortcuts (Cmd+R, F5, etc.)
  document.addEventListener('keydown', async (e) => {
    if (isConfirmationInProgress) return;

    // Check for reload shortcuts
    const isReload =
      (e.metaKey && e.key === 'r') || // Cmd+R on Mac
      (e.ctrlKey && e.key === 'r') || // Ctrl+R on Windows
      e.key === 'F5'; // F5

    if (isReload) {
      const activeGuard = globalNavigationGuards.find(
        (guard) => guard.hasUnsavedChanges
      );

      if (activeGuard) {
        e.preventDefault();
        const confirmed = await activeGuard.confirmFn({
          title: 'Unsaved Changes',
          message: activeGuard.message,
          confirmText: 'Leave Page',
          cancelText: 'Stay Here',
          variant: 'destructive',
        });

        if (confirmed) {
          window.location.reload();
        }
      }
    }
  });

  isGlobalInterceptorSetup = true;
}

export function useNavigationGuard(
  hasUnsavedChanges: boolean,
  message?: string
) {
  const { confirm } = useConfirmation();
  const guardIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    setupGlobalInterceptor();

    // Generate unique ID for this guard
    if (!guardIdRef.current) {
      guardIdRef.current = Math.random().toString(36).substr(2, 9);
    }

    const guardId = guardIdRef.current;
    const guardMessage =
      message || 'You have unsaved changes. Are you sure you want to leave?';

    // Add or update guard
    const existingIndex = globalNavigationGuards.findIndex(
      (guard) => guard.id === guardId
    );

    const guardConfig = {
      id: guardId,
      hasUnsavedChanges,
      message: guardMessage,
      confirmFn: confirm,
    };

    if (existingIndex >= 0) {
      globalNavigationGuards[existingIndex] = guardConfig;
    } else {
      globalNavigationGuards.push(guardConfig);
    }

    // Cleanup function
    return () => {
      const index = globalNavigationGuards.findIndex(
        (guard) => guard.id === guardId
      );
      if (index >= 0) {
        globalNavigationGuards.splice(index, 1);
      }
    };
  }, [hasUnsavedChanges, message, confirm]);
}
