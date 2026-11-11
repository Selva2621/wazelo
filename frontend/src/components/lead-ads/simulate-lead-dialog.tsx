"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useSimulateLeadAd } from "@/hooks/use-lead-ads";

const inputCls =
  "mt-1 w-full rounded-lg border border-outline-variant/20 bg-surface-container-low px-3 py-2.5 text-body text-on-surface placeholder:text-placeholder focus:outline-none focus:ring-2 focus:ring-primary/30";

interface SimulateLeadDialogProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Dev only: send a lead as if a Meta lead form was submitted — runs the real contact
 * and automation flow (Lead ad received / Contact created rules) without Meta.
 */
export function SimulateLeadDialog({ open, onClose }: SimulateLeadDialogProps) {
  const simulate = useSimulateLeadAd();
  const [name, setName] = useState("Test Lead");
  const [phone, setPhone] = useState("");
  const [platform, setPlatform] = useState<"facebook" | "instagram">("facebook");
  const [campaignName, setCampaignName] = useState("Test campaign");
  const [formId, setFormId] = useState("");
  const [city, setCity] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const entry = await simulate.mutateAsync({
        name: name.trim(),
        phone: phone.trim(),
        platform,
        campaignName: campaignName.trim() || undefined,
        formId: formId.trim() || undefined,
        ...(city.trim() && { fields: { city: city.trim() } }),
      });
      if (entry.status === "COMPLETED") {
        toast.success("Test lead added. Check Contacts and the rule's logs.");
        onClose();
      } else {
        toast.error(entry.errorMessage || "The test lead failed");
      }
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string | string[] } } }).response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || "Couldn't send the test lead");
    }
  }

  return (
    <Modal open={open} onClose={onClose} dismissible={!simulate.isPending} className="max-w-md p-6 max-lg:p-4" aria-labelledby="simulate-lead-title">
      {() => (
        <form onSubmit={submit} className="space-y-4">
          <div>
            <h2 id="simulate-lead-title" className="text-title font-semibold text-on-surface">Send a test lead</h2>
            <p className="mt-1 text-body text-on-surface-variant">
              Dev only. Runs your lead automations without Meta. Use your own number to get the welcome.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
            <div>
              <Label htmlFor="sim-name">Name</Label>
              <input id="sim-name" className={inputCls} value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="sim-phone">WhatsApp number</Label>
              <input id="sim-phone" className={inputCls} type="tel" placeholder="+91 98765 43210" value={phone} onChange={(e) => setPhone(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="sim-platform">Platform</Label>
              <Select id="sim-platform" className="mt-1" value={platform} onValueChange={(v) => setPlatform(v as "facebook" | "instagram")}>
                <option value="facebook">Facebook</option>
                <option value="instagram">Instagram</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="sim-campaign">Campaign</Label>
              <input id="sim-campaign" className={inputCls} value={campaignName} onChange={(e) => setCampaignName(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="sim-form">Form ID (optional)</Label>
              <input id="sim-form" className={inputCls} value={formId} onChange={(e) => setFormId(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="sim-city">City (optional)</Label>
              <input id="sim-city" className={inputCls} placeholder="{{lead.city}}" value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
          </div>

          <ModalFooter className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={simulate.isPending} className="max-lg:flex-1">
              Cancel
            </Button>
            <Button type="submit" loading={simulate.isPending} disabled={!phone.trim() || !name.trim()} className="max-lg:flex-1">
              Send test lead
            </Button>
          </ModalFooter>
        </form>
      )}
    </Modal>
  );
}
