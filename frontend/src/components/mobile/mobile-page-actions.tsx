"use client";

import { useState, type ReactNode } from "react";
import { Ellipsis, Plus } from "lucide-react";
import { MobileNavActions } from "@/hooks/use-mobile-chrome";
import { ActionSheet, type ActionSheetAction } from "@/components/ios/action-sheet";
import { haptic } from "@/lib/haptics";

interface MobilePageActionsProps {
  /** Main action: a "+" (or custom icon) button in the nav bar */
  primary?: { label: string; onClick: () => void; icon?: ReactNode };
  /** Secondary actions: listed in an action sheet behind a "…" button */
  more?: (ActionSheetAction | false | null | undefined)[];
  /** Title shown above the action sheet */
  moreTitle?: string;
}

/**
 * A page's buttons for the iOS nav bar (phones and tablets). Desktop keeps the page's
 * own header buttons; this renders nothing there.
 */
export function MobilePageActions({ primary, more, moreTitle }: MobilePageActionsProps) {
  const [open, setOpen] = useState(false);
  const items = (more ?? []).filter((a): a is ActionSheetAction => Boolean(a));

  return (
    <MobileNavActions>
      {items.length > 0 && (
        <button
          type="button"
          onClick={() => {
            haptic();
            setOpen(true);
          }}
          className="grid size-11 place-items-center rounded-full text-primary active:opacity-50"
          aria-label="More actions"
        >
          <Ellipsis className="h-6 w-6" strokeWidth={2.2} aria-hidden />
        </button>
      )}
      {primary && (
        <button
          type="button"
          onClick={() => {
            haptic();
            primary.onClick();
          }}
          className="grid size-11 place-items-center rounded-full text-primary active:opacity-50"
          aria-label={primary.label}
        >
          {primary.icon ?? <Plus className="h-[26px] w-[26px]" strokeWidth={2.2} aria-hidden />}
        </button>
      )}
      {items.length > 0 && (
        <ActionSheet open={open} onClose={() => setOpen(false)} title={moreTitle} actions={items} />
      )}
    </MobileNavActions>
  );
}
