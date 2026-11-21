// Smoke test for the Neon Object Storage "uploads" bucket.
// Run from backend/:  node --env-file=.env scripts/neon-storage-smoke.mjs
import { Files } from "files-sdk";
import { neon } from "files-sdk/neon";

const files = new Files({ adapter: neon({ bucket: "uploads" }) });
const key = `smoke-test/hello-${Date.now()}.txt`;
const body = `Hello from Wazelo! Neon Object Storage smoke test at ${new Date().toISOString()}\n`;

console.log(`1. Uploading ${key} (${Buffer.byteLength(body)} bytes)...`);
await files.upload(key, body, { contentType: "text/plain" });

console.log("2. Listing bucket 'uploads' (prefix smoke-test/):");
const listing = await files.list({ prefix: "smoke-test/" });
const items = listing.items ?? listing.files ?? listing.objects ?? listing;
for (const item of Array.isArray(items) ? items : []) {
  console.log(`   - ${item.key ?? item.name ?? JSON.stringify(item)}${item.size != null ? ` (${item.size} B)` : ""}`);
}

console.log(`3. Exists check: ${await files.exists(key)}`);

console.log("4. Reading it back:");
const file = await files.download(key);
const text = await file.text();
console.log(`   contents: ${JSON.stringify(text)}`);
console.log(`   round-trip match: ${text === body}`);
