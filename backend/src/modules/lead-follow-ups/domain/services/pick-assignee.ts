/**
 * Who on a product's team gets the next lead: the person with the fewest leads
 * still waiting for contact; on a tie, the one who got a lead longest ago, then
 * the order the team was listed in. Pure: the caller supplies the numbers.
 */
export interface HandlerLoad {
  userId: string;
  /** Leads assigned to them and not contacted yet */
  open: number;
  /** When they were last given a lead (null = never) */
  lastAssignedAt: Date | null;
}

export function pickAssignee(team: string[], loads: HandlerLoad[]): string | null {
  const byUser = new Map(loads.map((l) => [l.userId, l]));
  let best: string | null = null;
  let bestKey: [number, number, number] | null = null;
  team.forEach((userId, index) => {
    const load = byUser.get(userId);
    const key: [number, number, number] = [load?.open ?? 0, load?.lastAssignedAt?.getTime() ?? 0, index];
    const better =
      !bestKey ||
      key[0] < bestKey[0] ||
      (key[0] === bestKey[0] && (key[1] < bestKey[1] || (key[1] === bestKey[1] && key[2] < bestKey[2])));
    if (better) {
      best = userId;
      bestKey = key;
    }
  });
  return best;
}
