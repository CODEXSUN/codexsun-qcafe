import type { CafeSettings } from './Settings';

export function outputReceipt(settings: CafeSettings, openPreview: () => void) {
  if (!settings.directPrint) {
    openPreview();
    return;
  }

  requestAnimationFrame(() => window.print());
}
