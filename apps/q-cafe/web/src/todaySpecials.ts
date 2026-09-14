export type TodaySpecialDefinition = {
  id: string;
  prefix: string;
  name: string;
  isEnabled: boolean;
};

type MasterSetting = { key: string; value: string };

const definitionKey = 'today_special_definitions';

export function readTodaySpecialDefinitions(settings: MasterSetting[] | undefined): TodaySpecialDefinition[] {
  const value = settings?.find((setting) => setting.key === definitionKey)?.value;
  if (!value) return [];
  try {
    const definitions = JSON.parse(value);
    if (!Array.isArray(definitions)) return [];
    return definitions.flatMap((definition): TodaySpecialDefinition[] => {
      const prefix = String(definition?.prefix ?? '').trim().toUpperCase();
      const name = String(definition?.name ?? '').trim();
      const id = String(definition?.id ?? '').trim();
      return prefix && name && id ? [{ id, prefix, name, isEnabled: definition?.isEnabled !== false }] : [];
    });
  } catch {
    return [];
  }
}

export function serializeTodaySpecialDefinitions(definitions: TodaySpecialDefinition[]) {
  return JSON.stringify(definitions.map((definition) => ({
    id: definition.id,
    prefix: definition.prefix.trim().toUpperCase(),
    name: definition.name.trim(),
    isEnabled: definition.isEnabled,
  })));
}

export const todaySpecialDefinitionsKey = definitionKey;
