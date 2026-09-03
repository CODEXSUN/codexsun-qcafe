export function isHierarchyLabelVisible(id: string, selected: string, highlighting: boolean): boolean {
  if (!id.includes(".")) return true;
  if (!highlighting) return false;
  const current = selected.replace(/^0+(?=\d)/, "");
  const parent = id.slice(0, id.lastIndexOf("."));
  return id === current || parent === current;
}
