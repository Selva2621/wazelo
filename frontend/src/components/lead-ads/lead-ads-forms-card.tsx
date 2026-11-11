"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { FileText, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLeadAdForms } from "@/hooks/use-lead-ads";
import { useAutomationRules } from "@/hooks/use-automation";
import { useProducts } from "@/hooks/use-products";
import { useProductTerms } from "@/lib/product-terms";
import type { LeadAdForm } from "@/lib/api/lead-ads";
import type { AutomationRule } from "@/lib/types/automation";
import { LinkFormDialog } from "./link-form-dialog";

interface LeadAdsFormsCardProps {
  /** Admins can link forms (it creates an automation rule) */
  canLink: boolean;
}

/** Each Meta lead form and the product its leads go to; unlinked forms get a one-step "Link" */
export function LeadAdsFormsCard({ canLink }: LeadAdsFormsCardProps) {
  const { data: forms } = useLeadAdForms();
  const { data: rules } = useAutomationRules({ triggerType: "LEAD_AD_RECEIVED", limit: 100 });
  const { data: products } = useProducts();
  const terms = useProductTerms();
  const [linking, setLinking] = useState<LeadAdForm | null>(null);

  const rulesByForm = useMemo(() => {
    const map = new Map<string, AutomationRule[]>();
    for (const r of rules?.data ?? []) {
      const formId = r.triggerConfig?.formId?.trim();
      if (!formId) continue;
      map.set(formId, [...(map.get(formId) ?? []), r]);
    }
    return map;
  }, [rules]);

  const productName = (id: unknown) => products?.find((p) => p.id === id)?.name;

  if (!forms?.length) return null;

  return (
    <div className="rounded-xl bg-surface-container-lowest border border-outline-variant/10 p-5 max-lg:p-4" data-tour="lead-forms">
      <h3 className="text-body font-medium text-on-surface-variant mb-3">Lead forms</h3>
      <ul className="divide-y divide-outline-variant/10">
        {forms.map((f) => {
          const formRules = rulesByForm.get(f.formId) ?? [];
          const linked = formRules
            .map((r) => {
              const productId = r.actions.find((a) => a.actionType === "ADD_TO_PRODUCT")?.actionConfig?.productId;
              return { rule: r, product: productName(productId) };
            })
            .filter((x) => x.product);
          const otherRule = !linked.length ? formRules[0] : undefined;

          return (
            <li key={`${f.pageId}:${f.formId}`} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0 max-sm:flex-wrap">
              <FileText className="h-4 w-4 text-on-surface-variant/50 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-body text-on-surface truncate">{f.campaignName || f.formId}</p>
                <p className="text-caption text-on-surface-variant truncate">
                  {[f.pageName, f.formId, `${f.leads} ${f.leads === 1 ? "lead" : "leads"}`].filter(Boolean).join(" · ")}
                </p>
              </div>

              {linked.length > 0 ? (
                <div className="flex flex-wrap items-center gap-1.5 max-sm:basis-full max-sm:pl-7">
                  {linked.map(({ rule, product }) => (
                    <Link
                      key={rule.id}
                      href={`/automation/${rule.id}`}
                      className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-caption font-medium text-primary hover:bg-primary/20"
                      title="Open the rule"
                    >
                      <Package className="h-3 w-3" />
                      {product}
                      {rule.status !== "ACTIVE" && <span className="text-on-surface-variant">(off)</span>}
                    </Link>
                  ))}
                </div>
              ) : otherRule ? (
                <Link href={`/automation/${otherRule.id}`} className="text-caption text-primary hover:underline max-sm:basis-full max-sm:pl-7">
                  Has a rule
                </Link>
              ) : canLink ? (
                <Button variant="secondary" size="sm" onClick={() => setLinking(f)} className="max-sm:ml-7">
                  Link to {terms.singular}
                </Button>
              ) : (
                <span className="text-caption text-on-surface-variant">Not linked</span>
              )}
            </li>
          );
        })}
      </ul>
      {canLink && <LinkFormDialog form={linking} onClose={() => setLinking(null)} />}
    </div>
  );
}
