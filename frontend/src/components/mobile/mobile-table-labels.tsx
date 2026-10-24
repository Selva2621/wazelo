"use client";

import { useEffect } from "react";

/**
 * Phones and tablets only (mounted by AppShell below 1024px). Turns every table in the
 * page into iOS cards: copies each column header onto its cells as data-label and marks
 * the row's title, selection checkbox and action cells; globals.css lays them out.
 * Tables marked data-mobile-table="keep" (documents, previews) stay as tables.
 */
function labelTable(table: HTMLTableElement) {
  if (table.dataset.mobileTable === "keep") return;
  const headRow = table.tHead?.rows[table.tHead.rows.length - 1];
  if (!headRow) return;

  // Header text per column, expanding colspans
  const headers: string[] = [];
  for (const th of Array.from(headRow.cells)) {
    const text = (th.textContent ?? "").replace(/\s+/g, " ").trim();
    for (let i = 0; i < th.colSpan; i++) headers.push(text);
  }
  table.dataset.mobileCards = "";

  for (const body of Array.from(table.tBodies)) {
    for (const row of Array.from(body.rows)) {
      let col = 0;
      let primaryFound = false;
      for (const cell of Array.from(row.cells)) {
        const label = headers[col] ?? "";
        col += cell.colSpan;
        if (cell.colSpan > 1 && row.cells.length === 1) continue; // empty state / loader row

        if (cell.dataset.label !== label) cell.dataset.label = label;

        const hasCheckbox = cell.querySelector('input[type="checkbox"], [role="checkbox"]') !== null;
        const text = (cell.textContent ?? "").trim();
        const hasControl = cell.querySelector("button, a, input, select, img, svg, [role]") !== null;
        if (!text && !hasControl) cell.dataset.empty = "";
        else delete cell.dataset.empty;
        if (hasCheckbox && !text) {
          cell.dataset.select = "";
          continue;
        }
        if (!primaryFound && text) {
          primaryFound = true;
          cell.dataset.primary = "";
          continue;
        }
        delete cell.dataset.primary;
        if (!label && cell.querySelector("button, a")) cell.dataset.actions = "";
      }
    }
  }
}

export function MobileTableLabels() {
  useEffect(() => {
    const main = document.querySelector(".app-main");
    if (!main) return;
    let frame = 0;
    const run = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => main.querySelectorAll("table").forEach(labelTable));
    };
    run();
    const observer = new MutationObserver(run);
    observer.observe(main, { childList: true, subtree: true });
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      // Leaving mobile (resize to desktop): restore plain tables
      main.querySelectorAll("table[data-mobile-cards]").forEach((t) => {
        delete (t as HTMLElement).dataset.mobileCards;
      });
    };
  }, []);

  return null;
}
