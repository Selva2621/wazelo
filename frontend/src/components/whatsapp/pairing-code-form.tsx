"use client";

import { useState, type FormEvent } from "react";
import { Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PairingCodeDisplay, PairingSteps } from "@/components/whatsapp/pairing-code-display";

interface PairingCodeFormProps {
  pairingCode: string | null;
  defaultPhone?: string | null;
  onSubmit: (phoneNumber: string) => void;
  loading?: boolean;
  error?: string | null;
}

/** Link WhatsApp by phone number: the user types the code into WhatsApp on the same phone. */
export function PairingCodeForm({
  pairingCode,
  defaultPhone,
  onSubmit,
  loading,
  error,
}: PairingCodeFormProps) {
  const [phone, setPhone] = useState(defaultPhone ?? "");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (phone.trim()) onSubmit(phone.trim());
  };

  return (
    <div className="w-full max-w-[360px]">
      <form onSubmit={handleSubmit} className="space-y-3">
        <Label htmlFor="wa-pairing-phone" className="block">
          WhatsApp number
        </Label>
        <Input
          id="wa-pairing-phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="+91 98765 43210"
          leadingIcon={<Phone />}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          error={error ?? undefined}
        />
        <Button type="submit" className="w-full" loading={loading} disabled={!phone.trim()}>
          {pairingCode ? "Get a new code" : "Get code"}
        </Button>
      </form>

      {pairingCode && (
        <div className="mt-8">
          <PairingCodeDisplay code={pairingCode} />
        </div>
      )}

      <PairingSteps className="mt-8" />
    </div>
  );
}
