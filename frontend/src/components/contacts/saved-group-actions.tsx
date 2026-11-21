/** "Leads, VIP, Group 3 and 2 more" (also used by the create-campaign modal) */
export function groupNamesSummary(groups: { name: string }[]): string {
  const names = groups.slice(0, 3).map((g) => g.name);
  const rest = groups.length - names.length;
  if (rest > 0) return `${names.join(", ")} and ${rest} more`;
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}
