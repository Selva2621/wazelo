export type SortOrder = "asc" | "desc";

export interface ListSort {
  field: string;
  order: SortOrder;
}

/** Every super admin list's default ordering (matches the server default). */
export const NEWEST_FIRST: ListSort = { field: "createdAt", order: "desc" };

/** Clicking the active column flips the direction; another column starts at `firstOrder`. */
export function nextSort(current: ListSort, field: string, firstOrder: SortOrder = "desc"): ListSort {
  if (current.field === field) return { field, order: current.order === "asc" ? "desc" : "asc" };
  return { field, order: firstOrder };
}
