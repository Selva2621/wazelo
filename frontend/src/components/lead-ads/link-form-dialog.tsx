"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ProductSelectField } from "@/components/ui/product-select-field";
import { SessionSelect } from "@/components/automation/action-pickers";
import { useCreateAutomationRule } from "@/hooks/use-automation";
import { useProducts } from "@/hooks/use-products";
import { useOrgMembers } from "@/hooks/use-contacts";
import Link from "next/link";
import { useProductTerms } from "@/lib/product-terms";
import type { LeadAdForm } from "@/lib/api/lead-ads";
import type { ActionInput } from "@/lib/types/automation";
import { OfficialTemplateToggle } from "@/components/automation/official-template-toggle";
import { CONTACT_VAR_CHIPS, triggerVarChips } from "@/lib/constants/automation-variables";

const inputCls =
  "mt-1 w-full rounded-lg border border-outline-variant/20 bg-surface-container-low px-3 py-2.5 text-body text-on-surface placeholder:text-placeholder focus:outline-none focus:ring-2 focus:ring-primary/30";

const DEFAULT_WELCOME =
  "Hi {{contact.name}}, thanks for your interest in {{lead.campaign}}! We'll get back to you shortly.";

interface LinkFormDialogProps {
  form: LeadAdForm | null;
  onClose: () => void;
}

/**
 * One step instead of building a rule by hand: creates a "Lead ad received" rule for this
 * form that adds the lead to a product and (optionally) sends that product's welcome.
 */
export function LinkFormDialog({ form, onClose }: LinkFormDialogProps) {
  const createRule = useCreateAutomationRule();
  const { data: products } = useProducts();
  const terms = useProductTerms();
  const [productId, setProductId] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [message, setMessage] = useState(DEFAULT_WELCOME);
  /** Official numbers: welcome as an approved template (templateId, templateParams, headerImageUrl) */
  const [template, setTemplate] = useState<Record<string, unknown>>({});

  // Fresh fields each time a form is opened
  useEffect(() => {
    if (form) {
      setProductId("");
      setSessionId("");
      setMessage(DEFAULT_WELCOME);
      setTemplate({});
    }
  }, [form]);

  const usesTemplate = typeof template.templateId === "string" && template.templateId !== "";

  const { data: members } = useOrgMembers();
  const selectedProduct = products?.find((p) => p.id === productId);
  const teamNames = (selectedProduct?.leadHandlerIds ?? [])
    .map((id) => {
      const m = members?.find((x) => x.id === id);
      return m ? (`${m.firstName} ${m.lastName}`.trim() || m.email) : null;
    })
    .filter((n): n is string => !!n);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form || !productId) return;
    const productName = products?.find((p) => p.id === productId)?.name ?? terms.Singular;
    const actions: ActionInput[] = [
      { actionType: "ADD_TO_PRODUCT", actionConfig: { productId }, orderIndex: 0 },
    ];
    if (usesTemplate || message.trim()) {
      actions.push({
        actionType: "SEND_MESSAGE",
        actionConfig: {
          ...(usesTemplate
            ? { templateId: template.templateId, templateParams: template.templateParams, headerImageUrl: template.headerImageUrl }
            : { messageBody: message.trim() }),
          ...(sessionId && { sessionId }),
        },
        orderIndex: 1,
      });
    }
    try {
      await createRule.mutateAsync({
        name: `${productName} lead welcome`,
        description: `Leads from ${form.campaignName || form.formId}`,
        triggerType: "LEAD_AD_RECEIVED",
        triggerConfig: { formId: form.formId },
        actions,
      });
      onClose();
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string | string[] } } }).response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || "Couldn't link the form");
    }
  }

  return (
    <Modal open={!!form} onClose={onClose} dismissible={!createRule.isPending} className="max-w-md p-6 max-lg:p-4" aria-labelledby="link-form-title">
      {() => (
        <form onSubmit={submit} className="space-y-4">
          <div>
            <h2 id="link-form-title" className="text-title font-semibold text-on-surface">
              Link to {terms.singular}
            </h2>
            <p className="mt-1 text-body text-on-surface-variant truncate">
              {form?.campaignName || "Lead form"} · {form?.formId}
            </p>
          </div>

          <ProductSelectField
            label="Add leads to"
            optional={false}
            value={productId}
            onChange={setProductId}
            onBeforeRedirect={onClose}
          />

          {/* Who gets these leads: the product's team (set once on the product) */}
          {selectedProduct && (
            <p className="rounded-lg bg-surface-container-low px-3 py-2 text-body text-on-surface-variant">
              {teamNames.length > 0 ? (
                <>
                  Handled by <b className="text-on-surface">{teamNames.join(", ")}</b>
                  {" "}· reminder after {selectedProduct.leadReminderMinutes ?? 30} min
                </>
              ) : (
                <>No team for this {terms.singular} yet: leads stay with the contact&apos;s owner.</>
              )}{" "}
              <Link href="/settings/products" className="text-primary hover:underline" onClick={onClose}>
                {teamNames.length > 0 ? "Change" : "Set team"}
              </Link>
            </p>
          )}

          <div>
            <Label>Send from</Label>
            <SessionSelect value={sessionId} onValueChange={setSessionId} className="mt-1" />
          </div>

          <OfficialTemplateToggle
            config={template}
            chips={[...CONTACT_VAR_CHIPS, ...triggerVarChips("LEAD_AD_RECEIVED")]}
            onChange={(patch) => setTemplate((t) => ({ ...t, ...patch }))}
          />

          <div className={usesTemplate ? "hidden" : undefined}>
            <Label htmlFor="link-form-message">Welcome message</Label>
            <textarea
              id="link-form-message"
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className={`${inputCls} resize-none`}
            />
            <p className="mt-1 text-caption text-on-surface-variant">
              Leave empty to only add them to the {terms.singular}. Form answers work too: {"{{lead.city}}"}
            </p>
          </div>

          <ModalFooter className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={createRule.isPending} className="max-lg:flex-1">
              Cancel
            </Button>
            <Button type="submit" loading={createRule.isPending} disabled={!productId} className="max-lg:flex-1">
              Save
            </Button>
          </ModalFooter>
        </form>
      )}
    </Modal>
  );
}
