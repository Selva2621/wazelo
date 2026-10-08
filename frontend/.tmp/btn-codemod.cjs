const fs = require("fs"), path = require("path");
const APPLY = process.argv.includes("--apply");
const SRC = path.join(__dirname, "..", "src");
const EXCLUDE = [/components.ui./, /app.csat./, /invoice-detail-modal/];

// Find end of a JSX opening tag starting at i ("<button"), respecting {} and quotes.
function tagEnd(s, i) {
  let depth = 0, q = null;
  for (let j = i; j < s.length; j++) {
    const c = s[j];
    if (q) { if (c === q && s[j-1] !== "\\") q = null; continue; }
    if (c === '"' || c === "'" || c === "`") { q = c; continue; }
    if (c === "{") depth++; else if (c === "}") depth--;
    else if (c === ">" && depth === 0) return j;
  }
  return -1;
}
// Find matching </button> for an opening tag ending at e (handles nested <button> unlikely).
function closeIdx(s, e) { return s.indexOf("</button>", e); }

const STRIP_COMMON = [/^(inline-)?flex$/, /^items-center$/, /^justify-center$/, /^gap-[\d.]+$/, /^rounded(-\w+)?$/, /^transition(-[\w[\],-]+)?$/, /^duration-\d+$/, /^ease-[\w-]+$/,
  /^disabled:/, /^focus:/, /^focus-visible:/, /^outline-none$/, /^active:/, /^cursor-pointer$/];
const STRIP_BOX = [/^p[xy]?-[\d.]+$/, /^h-[\d.]+$/, /^text-(caption|label|body|body-lg|title-sm|title)$/, /^font-(medium|semibold)$/, /^shadow(-\w+)?$/, /^hover:shadow/];
const STRIP_PRIMARY = [/^bg-primary$/, /^text-on-primary$/, /^hover:bg-primary/, /^hover:opacity-\d+$/, /^bg-gradient/, /^from-/, /^to-/];
const STRIP_SECONDARY = [/^border$/, /^border-outline-variant(\/\d+)?$/, /^bg-transparent$/, /^bg-surface(-container[\w-]*)?$/, /^hover:bg-surface/, /^text-on-surface(-variant)?$/, /^hover:text-on-surface$/, /^hover:border/];
const STRIP_ICON = [/^p-[\d.]+$/, /^h-[\d.]+$/, /^w-[\d.]+$/, /^text-on-surface-variant(\/\d+)?$/, /^hover:text-on-surface$/, /^hover:bg-surface-container[\w-]*$/, /^shrink-0$/];

const keep = (cls, rules) => cls.split(/\s+/).filter(Boolean).filter(c => !rules.some(r => r.test(c)));
function sizeFor(cls) {
  if (/\b(h-8|py-1|py-1\.5|text-caption|text-label)\b/.test(cls)) return "sm";
  if (/\b(h-1[0-2]|py-2\.5|py-3)\b/.test(cls)) return "lg";
  return "md";
}
function iconSize(cls, body) {
  const m = body.match(/\b[hw]-(3|3\.5|4|4\.5|5|6)\b/); const ic = m ? parseFloat(m[1]) : 4;
  const p = (cls.match(/\bp-([\d.]+)\b/) || [])[1];
  if (ic <= 3.5 || p === "0.5" || p === "1" && ic <= 3.5) return "xs";
  if (ic >= 5 || p === "2") return "md";
  return "sm";
}
function textless(body) { return !/[A-Za-z]{2,}/.test(body.replace(/<[^>]*>/g, "").replace(/\{[^}]*\}/g, "")); }

const report = { primary: 0, secondary: 0, icon: 0, skippedDynamic: 0, skippedNoLabel: [], files: 0 };
const samples = [];

function processFile(p) {
  let s = fs.readFileSync(p, "utf8"); const orig = s;
  if (/import\s*\{[^}]*\bButton\b[^}]*\}\s*from\s*["'](?!@\/components\/ui\/button)/.test(s)) return; // foreign Button
  let out = "", i = 0, needButton = false, needIcon = false;
  while (true) {
    const k = s.indexOf("<button", i);
    if (k < 0 || !/[\s>]/.test(s[k + 7])) { out += s.slice(i); break; }
    const e = tagEnd(s, k); const c = closeIdx(s, e);
    if (e < 0 || c < 0) { out += s.slice(i); break; }
    const attrs = s.slice(k + 7, e); const body = s.slice(e + 1, c);
    out += s.slice(i, k);
    const cm = attrs.match(/\sclassName="([^"]*)"/);
    const dyn = /className=\{/.test(attrs);
    let kind = null;
    if (cm) {
      const cls = cm[1];
      if (/(^|\s)bg-primary(\s|$)/.test(cls) && !textless(body)) kind = "primary";
      else if (textless(body)) kind = "icon";
      else if (/(^|\s)border(\s|$)/.test(cls) && /rounded/.test(cls)) kind = "secondary";
    } else if (dyn) report.skippedDynamic++;
    if (!kind) { out += s.slice(k, c + 9); i = c + 9; continue; }
    const cls = cm[1]; let newAttrs, tag;
    if (kind === "icon") {
      const title = (attrs.match(/\stitle=("[^"]*"|\{[^}]*\})/) || [])[1];
      if (!/aria-label=/.test(attrs) && !title) { report.skippedNoLabel.push(path.relative(SRC, p)); out += s.slice(k, c + 9); i = c + 9; continue; }
      const size = iconSize(cls, body);
      let rest = keep(cls, [...STRIP_COMMON, ...STRIP_ICON]);
      let variant = "";
      if (rest.includes("hover:text-error") || rest.some(x => /^hover:bg-error/.test(x))) { variant = ' variant="danger"'; rest = rest.filter(x => x !== "hover:text-error" && !/^hover:bg-error/.test(x)); }
      if (rest.includes("bg-primary")) { variant = ' variant="primary"'; rest = keep(rest.join(" "), STRIP_PRIMARY); }
      newAttrs = attrs.replace(/\sclassName="[^"]*"/, rest.length ? ` className="${rest.join(" ")}"` : "");
      if (!/aria-label=/.test(attrs)) newAttrs += ` aria-label=${title}`;
      newAttrs = ` size="${size}"${variant}` + newAttrs;
      tag = "IconButton"; needIcon = true; report.icon++;
    } else {
      const size = sizeFor(cls);
      const rules = [...STRIP_COMMON, ...STRIP_BOX, ...(kind === "primary" ? STRIP_PRIMARY : STRIP_SECONDARY)];
      const rest = keep(cls, rules);
      newAttrs = attrs.replace(/\sclassName="[^"]*"/, rest.length ? ` className="${rest.join(" ")}"` : "");
      newAttrs = (kind === "secondary" ? ' variant="secondary"' : "") + (size !== "md" ? ` size="${size}"` : "") + newAttrs;
      tag = "Button"; needButton = true; report[kind]++;
    }
    const before = s.slice(k, e + 1).replace(/\s+/g, " ");
    const after = `<${tag}${newAttrs}>`.replace(/\s+/g, " ");
    if (samples.length < 400) samples.push(`${path.relative(SRC, p)}\n  - ${before.slice(0, 260)}\n  + ${after.slice(0, 260)}`);
    out += `<${tag}${newAttrs}>${body}</${tag}>`; i = c + 9;
  }
  if (out === orig) return;
  const imports = [];
  if (needButton && !/from\s*["']@\/components\/ui\/button["']/.test(out)) imports.push(`import { Button } from "@/components/ui/button";`);
  if (needIcon && !/from\s*["']@\/components\/ui\/icon-button["']/.test(out)) imports.push(`import { IconButton } from "@/components/ui/icon-button";`);
  if (imports.length) {
    const nl = out.includes("\r\n") ? "\r\n" : "\n";
    const lastImp = [...out.matchAll(/^import[\s\S]*?from\s*["'][^"']+["'];?[ \t]*$/gm)].pop();
    if (lastImp) { const at = lastImp.index + lastImp[0].length; out = out.slice(0, at) + nl + imports.join(nl) + out.slice(at); }
    else out = imports.join(nl) + nl + out;
  }
  report.files++;
  if (APPLY) fs.writeFileSync(p, out);
}
(function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (p.endsWith(".tsx") && !EXCLUDE.some(r => r.test(p))) processFile(p); } })(SRC);
fs.writeFileSync(path.join(__dirname, "btn-samples.txt"), samples.join("\n"));
console.log(JSON.stringify({ ...report, skippedNoLabel: report.skippedNoLabel.length + " (" + [...new Set(report.skippedNoLabel)].length + " files)" }, null, 1));
