import { toast } from 'sonner';

type ToastOptions = Readonly<{ description?: string }>;

export const notify = {
  success(message: string, options?: ToastOptions): string | number {
    return toast.success(message, options);
  },

  error(message: string, options?: ToastOptions): string | number {
    return toast.error(message, options);
  },

  info(message: string, options?: ToastOptions): string | number {
    return toast.info(message, options);
  },

  loading(message: string): string | number {
    return toast.loading(message);
  },

  dismiss(id?: string | number): void {
    toast.dismiss(id);
  },
};
