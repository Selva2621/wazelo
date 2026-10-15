"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

/** The 8-character code shown as ABCD-1234, with a copy button. */
export function PairingCodeDisplay({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — the code is still visible */
    }
  };

  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center gap-2">
        <span
          className="rounded-xl bg-surface-container px-5 py-3 font-mono text-title font-semibold tracking-[0.3em] text-on-surface"
          aria-label={`Pairing code ${code.split("").join(" ")}`}
        >
          {code.slice(0, 4)}-{code.slice(4)}
        </span>
        <Button type="button" variant="ghost" size="sm" onClick={handleCopy} aria-label="Copy code">
          {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
      <p className="mt-3 text-label text-on-surface-variant animate-pulse">
        Waiting for you to enter the code…
      </p>
    </div>
  );
}

const STEPS = [
  "Open WhatsApp → Settings → Linked Devices",
  "Tap 'Link a Device' → 'Link with phone number instead'",
  "Enter the code shown here",
];

export function PairingSteps({ className }: { className?: string }) {
  return (
    <div className={className}>
      <div className="space-y-3">
        {STEPS.map((text, i) => (
          <div key={text} className="flex items-center gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-label font-semibold text-primary">
              {i + 1}
            </span>
            <span className="text-body text-on-surface-variant">{text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
