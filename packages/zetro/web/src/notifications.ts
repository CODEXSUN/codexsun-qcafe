import { toast } from "@codexsun/ui/components/ui/sonner";

type ToastOptions = { description?: string };

export const zetroNotifications = {
  error(cause: unknown, fallback: string) {
    const message = cause instanceof Error ? cause.message : fallback;
    toast.error(message);
    return message;
  },
  info(message: string, options?: ToastOptions) {
    toast.info(message, options);
  },
  success(message: string, options?: ToastOptions) {
    toast.success(message, options);
  },
  warning(message: string, options?: ToastOptions) {
    toast.warning(message, options);
  },
};
