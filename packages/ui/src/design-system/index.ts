import { clearVariant } from "./variants/clear/tokens";
import { compactVariant } from "./variants/compact/tokens";
import { defaultVariant } from "./variants/default/tokens";
import {
  blueVariant,
  graphiteVariant,
  greenVariant,
  neutralVariant,
  orangeVariant,
  purpleVariant,
  shadcnVariant
} from "./variants/palette/tokens";
import type { DesignSystemVariant, DesignSystemVariantId } from "./types";

export type { DesignSystemVariant, DesignSystemVariantId };
export * from "./component-defaults";
export * from "./theme-mode";
export * from "./theme-mode-selector";

export const DESIGN_SYSTEM_NAME = "codexsun";
export const DESIGN_SYSTEM_MARKER = "data-design-system";
export const DESIGN_SYSTEM_VARIANT_MARKER = "data-design-variant";
export const DESIGN_SYSTEM_DEFAULT_STORAGE_KEY = "codexsun.design-system.default-variant";

export const designSystemVariants = [
  defaultVariant,
  compactVariant,
  clearVariant,
  shadcnVariant,
  neutralVariant,
  orangeVariant,
  greenVariant,
  blueVariant,
  purpleVariant,
  graphiteVariant
] satisfies DesignSystemVariant[];

export const defaultDesignSystemVariantId: DesignSystemVariantId = "default";

export function getDesignSystemVariant(id: string | null | undefined): DesignSystemVariant {
  return designSystemVariants.find((variant) => variant.id === id) ?? defaultVariant;
}

export function isDesignSystemVariantId(id: string): id is DesignSystemVariantId {
  return designSystemVariants.some((variant) => variant.id === id);
}

export function applyDesignSystemPreference(defaultVariant: DesignSystemVariantId = defaultDesignSystemVariantId): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  const stored = window.localStorage.getItem(DESIGN_SYSTEM_DEFAULT_STORAGE_KEY);
  const activeVariant = stored && isDesignSystemVariantId(stored) ? stored : defaultVariant;
  document.documentElement.setAttribute(DESIGN_SYSTEM_MARKER, DESIGN_SYSTEM_NAME);
  document.documentElement.setAttribute(DESIGN_SYSTEM_VARIANT_MARKER, activeVariant);
}

export function getCurrentDesignSystemVariantId(): DesignSystemVariantId {
  if (typeof window === "undefined") return defaultDesignSystemVariantId;
  const stored = window.localStorage.getItem(DESIGN_SYSTEM_DEFAULT_STORAGE_KEY);
  return stored && isDesignSystemVariantId(stored) ? stored : defaultDesignSystemVariantId;
}

export function setDesignSystemVariantId(variantId: DesignSystemVariantId): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  document.documentElement.setAttribute(DESIGN_SYSTEM_MARKER, DESIGN_SYSTEM_NAME);
  document.documentElement.setAttribute(DESIGN_SYSTEM_VARIANT_MARKER, variantId);
  window.localStorage.setItem(DESIGN_SYSTEM_DEFAULT_STORAGE_KEY, variantId);
}
