'use client';

import { Toaster as Sonner } from 'sonner';

export function Toaster(): React.JSX.Element {
  return (
    <Sonner
      className="toaster group"
      position="top-center"
      toastOptions={{
        classNames: {
          toast: '!rounded-2xl !border-brand !bg-brand !text-brand-foreground !shadow-xl',
          description: '!text-brand-foreground/80',
          actionButton:
            '!bg-background !text-brand hover:!bg-muted focus-visible:!ring-brand',
          cancelButton:
            '!bg-transparent !text-brand-foreground hover:!bg-brand-foreground/10',
        },
      }}
    />
  );
}
