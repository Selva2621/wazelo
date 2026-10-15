/**
 * Column sorting for the super admin lists. Each list has a whitelist of sortable
 * fields; anything else falls back to the list's default (newest first). Pure logic:
 * the result is a plain orderBy array the repositories hand to Prisma as-is.
 */

export type SortOrder = 'asc' | 'desc';

/** One orderBy entry: `{ field: 'asc' }` or, for nullable columns, `{ field: { sort, nulls } }`. */
export type OrderByEntry = Record<string, SortOrder | { sort: SortOrder; nulls: 'first' | 'last' }>;

interface SortableList {
  /** Sortable field → whether the column is nullable (nulls always sort last) */
  fields: Record<string, boolean>;
  defaultField: string;
  defaultOrder: SortOrder;
}

export const SORTABLE_LISTS = {
  organizations: { fields: { name: false, createdAt: false }, defaultField: 'createdAt', defaultOrder: 'desc' },
  subscriptions: {
    fields: { createdAt: false, currentPeriodEnd: false, priceInCents: false, status: false },
    defaultField: 'createdAt',
    defaultOrder: 'desc',
  },
  payments: { fields: { createdAt: false, amountInCents: false, paidAt: true }, defaultField: 'createdAt', defaultOrder: 'desc' },
  invoices: { fields: { createdAt: false, amountInCents: false }, defaultField: 'createdAt', defaultOrder: 'desc' },
  tickets: {
    fields: { createdAt: false, priority: false, status: false, updatedAt: false },
    defaultField: 'createdAt',
    defaultOrder: 'desc',
  },
  auditLogs: { fields: { createdAt: false }, defaultField: 'createdAt', defaultOrder: 'desc' },
} as const satisfies Record<string, SortableList>;

export type SortableListName = keyof typeof SORTABLE_LISTS;

export interface ResolvedSort {
  field: string;
  order: SortOrder;
}

/**
 * Whitelisted field + direction. An unknown (or missing) field means the list's default
 * ordering, whatever `order` says; an unknown direction means the default direction.
 */
export function resolveSort(list: SortableListName, sort?: string | null, order?: string | null): ResolvedSort {
  const spec: SortableList = SORTABLE_LISTS[list];
  if (!sort || !Object.prototype.hasOwnProperty.call(spec.fields, sort)) {
    return { field: spec.defaultField, order: spec.defaultOrder };
  }
  const dir = (order ?? '').toLowerCase();
  return { field: sort, order: dir === 'asc' || dir === 'desc' ? dir : spec.defaultOrder };
}

/** Prisma orderBy for a list, with `id` as a stable tiebreaker so paging never repeats or skips rows. */
export function listOrderBy(list: SortableListName, sort?: string | null, order?: string | null): OrderByEntry[] {
  const { field, order: dir } = resolveSort(list, sort, order);
  const spec: SortableList = SORTABLE_LISTS[list];
  const primary: OrderByEntry = spec.fields[field] ? { [field]: { sort: dir, nulls: 'last' } } : { [field]: dir };
  return [primary, { id: dir }];
}
