"use client";

import { useState } from "react";
import { Copy, Download, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

/**
 * Shows freshly generated recovery codes. They are never shown again, so the
 * admin must confirm they saved them before `onDone` is enabled.
 */
export function RecoveryCodesPanel({
  codes,
  doneLabel = "Done",
  onDone,
}: {
  codes: string[];
  doneLabel?: string;
  onDone: () => void;
}) {
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const text = codes.join("\n");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const download = () => {
    const blob = new Blob(
      [`Wazelo super admin recovery codes\nEach code works once.\n\n${text}\n`],
      { type: "text/plain" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "wazelo-recovery-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section aria-labelledby="recovery-heading" className="space-y-4">
      <div className="flex items-start gap-3">
        <KeyRound className="h-5 w-5 text-primary shrink-0 mt-0.5" aria-hidden />
        <div>
          <h2 id="recovery-heading" className="text-title-sm font-semibold text-on-surface">
            Save your recovery codes
          </h2>
          <p className="text-body text-on-surface-variant mt-1">
            If you lose your authenticator, each code signs you in once. They won&apos;t be shown again.
          </p>
        </div>
      </div>

      <ul className="grid grid-cols-2 gap-2 rounded-lg bg-surface-container p-4 font-mono text-body-lg text-on-surface">
        {codes.map((c) => (
          <li key={c} className="select-all">{c}</li>
        ))}
      </ul>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" onClick={copy}>
          <Copy className="h-4 w-4" aria-hidden />
          {copied ? "Copied" : "Copy"}
        </Button>
        <Button type="button" variant="secondary" onClick={download}>
          <Download className="h-4 w-4" aria-hidden />
          Download
        </Button>
      </div>

      <Alert variant="warning">Store them somewhere safe, like a password manager.</Alert>

      <label className="flex items-center gap-2 text-body-lg text-on-surface">
        <input
          type="checkbox"
          checked={saved}
          onChange={(e) => setSaved(e.target.checked)}
          className="h-4 w-4 accent-primary"
        />
        I&apos;ve saved my recovery codes
      </label>

      <Button type="button" onClick={onDone} disabled={!saved}>
        {doneLabel}
      </Button>
    </section>
  );
}
