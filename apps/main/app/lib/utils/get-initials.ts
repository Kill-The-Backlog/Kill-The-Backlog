export function getInitials(name: string): string {
  const [first, ...rest] = name.split(" ").filter(Boolean);
  return ((first?.[0] ?? "") + (rest.at(-1)?.[0] ?? "")).toUpperCase();
}
