"use client";

import { useEffect, useState } from "react";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MemberSelect, SessionSelect } from "@/components/automation/action-pickers";
import { useSaveBrand } from "@/hooks/use-products";
import type { Brand } from "@/lib/types/products";

interface BrandFormModalProps {
  open: boolean;
  onClose: () => void;
  /** Edit this brand; omit to create one */
  brand?: Brand;
}

/** A brand groups products. Its manager gets the day-end lead summary. */
export function BrandFormModal({ open, onClose, brand }: BrandFormModalProps) {
  const save = useSaveBrand();
  const [name, setName] = useState("");
  const [managerId, setManagerId] = useState("");
  const [sessionId, setSessionId] = useState("");

  useEffect(() => {
    if (!open) return;
    setName(brand?.name ?? "");
    setManagerId(brand?.managerId ?? "");
    setSessionId(brand?.sessionId ?? "");
  }, [open, brand]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    save.mutate(
      { id: brand?.id, name: name.trim(), managerId: managerId || null, sessionId: sessionId || null },
      { onSuccess: onClose },
    );
  }

  return (
    <Modal open={open} onClose={onClose} dismissible={!save.isPending} className="max-w-md p-6 max-lg:p-4" aria-labelledby="brand-form-title">
      {() => (
        <form onSubmit={submit} className="space-y-4">
          <div>
            <h2 id="brand-form-title" className="text-title font-semibold text-on-surface">
              {brand ? "Edit brand" : "New brand"}
            </h2>
            <p className="mt-1 text-body text-on-surface-variant">Group the products you sell under one name.</p>
          </div>
          <div>
            <Label htmlFor="brand-name">Name</Label>
            <Input id="brand-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Kavya Homes" autoFocus maxLength={120} />
          </div>
          <div>
            <Label htmlFor="brand-manager">
              Manager <span className="font-normal text-on-surface-variant/60">(optional)</span>
            </Label>
            <MemberSelect id="brand-manager" value={managerId} onValueChange={setManagerId} className="mt-1" />
            <p className="mt-1 text-caption text-on-surface-variant">Gets the day-end summary of this brand&apos;s leads.</p>
          </div>
          <div>
            <Label htmlFor="brand-session">
              Sends from <span className="font-normal text-on-surface-variant/60">(optional)</span>
            </Label>
            <SessionSelect id="brand-session" value={sessionId} onValueChange={setSessionId} className="mt-1" />
          </div>
          <ModalFooter className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={save.isPending} className="max-lg:flex-1">Cancel</Button>
            <Button type="submit" loading={save.isPending} disabled={!name.trim()} className="max-lg:flex-1">
              {brand ? "Save" : "Create brand"}
            </Button>
          </ModalFooter>
        </form>
      )}
    </Modal>
  );
}
