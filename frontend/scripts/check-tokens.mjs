// Design-token guardrail (design-system/DESIGN.md §11 step 7).
// Fails when feature code bypasses the type scale or the colour roles.
// Run: npm run lint:tokens
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../src/", import.meta.url));

// Surfaces intentionally outside the app theme (see DESIGN.md §3.3).
const EXCLUDE = [
  /app[\\/]csat[\\/]/, // public customer survey, standalone light page
  /invoice-detail-modal/, // printable invoice rendered to PDF
];

const RULES = [
  {
    name: "arbitrary font size",
    re: /(?<![\w-])text-\[\d+(?:\.\d+)?px\]/g,
    fix: "use text-caption | label | body | body-lg | title-sm | title | headline | display",
  },
  {
    name: "default Tailwind font size",
    re: /(?<![\w-])text-(?:xs|sm|base|lg|xl|[2-9]xl)(?![\w-])/g,
    fix: "use the design-system type scale",
  },
  {
    name: "raw palette colour",
    re: /(?<![\w-])(?:bg|text|border|ring|fill|stroke|from|via|to|divide|outline|accent|shadow)-(?:gray|slate|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}(?![\w-])/g,
    fix: "use a colour role (primary, surface-*, on-surface*, success, warning, error, info, chart-*)",
  },
];

const violations = [];

function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path);
    else if (/\.tsx?$/.test(entry.name) && !EXCLUDE.some((r) => r.test(path))) check(path);
  }
}

function check(path) {
  const lines = readFileSync(path, "utf8").split(/\r?\n/);
  lines.forEach((line, i) => {
    for (const rule of RULES) {
      for (const match of line.matchAll(rule.re)) {
        violations.push({ file: relative(ROOT, path), line: i + 1, rule, token: match[0] });
      }
    }
  });
}

walk(ROOT);

if (violations.length === 0) {
  console.log("check-tokens: no violations");
  process.exit(0);
}

for (const v of violations) {
  console.log(`src/${v.file.replace(/\\/g, "/")}:${v.line}  ${v.token}  (${v.rule.name}: ${v.rule.fix})`);
}
console.log(`\ncheck-tokens: ${violations.length} violation(s)`);
process.exit(1);
