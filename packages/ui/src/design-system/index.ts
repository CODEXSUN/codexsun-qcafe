export type DesignSystemVariantId = "neutral";

export type DesignSystemVariant = {
  density: string;
  id: DesignSystemVariantId;
  name: string;
  palette: string[];
};

export const DESIGN_SYSTEM_NAME = "codexsun";
export const DESIGN_SYSTEM_VARIANT_MARKER = "data-design-variant";
export const DESIGN_SYSTEM_DEFAULT_STORAGE_KEY = "codexsun.design-system.default-variant";

export const defaultDesignSystemVariantId: DesignSystemVariantId = "neutral";

export const designSystemVariants: DesignSystemVariant[] = [
  {
    density: "Relaxed",
    id: "neutral",
    name: "Neutral",
    palette: ["#18181b", "#f4f4f5", "#ffffff", "#71717a"]
  }
];

export function isDesignSystemVariantId(id: string): id is DesignSystemVariantId {
  return id === defaultDesignSystemVariantId;
}
