/** Route matchers and shared anchors for tour definitions */

export const exact =
  (...paths: string[]) =>
  (pathname: string) =>
    paths.includes(pathname);

/** One level under `base`, e.g. detail("/contacts") matches /contacts/123 */
export const detail = (base: string) => {
  const re = new RegExp(`^${base.replace(/\//g, "\\/")}\\/[^/]+$`);
  return (pathname: string) => re.test(pathname);
};

/** Page's main button: desktop header actions first, then the mobile top-bar "+" */
export const primaryAction = (desktop = "page-actions") => [desktop, "m-primary"];

/** A list that is either a table/cards or its empty state */
export const listOrEmpty = ["data-table", "empty-state"];
