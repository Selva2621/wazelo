"use client";

import type { ReactNode } from "react";
import { SegmentedControl } from "@/components/ios/segmented-control";
import { cn } from "@/lib/utils";

export type EditorView = "edit" | "preview";

const EDIT_PREVIEW: { value: EditorView; label: string }[] = [
  { value: "edit", label: "Edit" },
  { value: "preview", label: "Preview" },
];

/** The labelled region that holds a template's live preview */
export function TemplatePreviewPanel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section aria-label="Preview" data-tour="template-preview" className={cn("space-y-3", className)}>
      {/* Same heading as the campaign modal's preview; phones have the Edit | Preview switch */}
      <p className="text-caption font-semibold uppercase tracking-widest text-on-surface-variant max-lg:sr-only">Preview</p>
      {children}
    </section>
  );
}

/** Phones: Edit | Preview switch inside the editor sheet */
export function EditPreviewSwitch({
  value,
  onChange,
  className,
}: {
  value: EditorView;
  onChange: (next: EditorView) => void;
  className?: string;
}) {
  return <SegmentedControl label="Edit or preview" value={value} onChange={onChange} options={EDIT_PREVIEW} className={className} />;
}
