"use client";

import { useState, type ReactNode } from "react";
import { Ellipsis, EllipsisVertical, Plus } from "lucide-react";
import { MobileNavActions } from "@/hooks/use-mobile-chrome";
import { ActionSheet, type ActionSheetAction } from "@/components/ios/action-sheet";
import { haptic } from "@/lib/haptics";
import { usePlatform } from "@/lib/platform";

interface MobilePageActionsProps {
  /** Main action: a "+" (or custom icon) button in the nav bar */
  primary?: { label: string; onClick: () => void; icon?: ReactNode };
  /** Secondary actions: listed in an action sheet behind a "…" button */
  more?: (ActionSheetAction | false | null | undefined)[];
  /** Title shown above the action sheet */
  moreTitle?: string;
}

/**
 * A page's buttons for the mobile top bar (phones and tablets). Desktop keeps the page's
 * own header buttons; this renders nothing there.
 * iOS: "…" then "+". Android: "+" then "⋮" (overflow menu last). The tab bar's centre
 * button is the only floating button, so page actions stay in the top bar.
 */
export function MobilePageActions({ primary, more, moreTitle }: MobilePageActionsProps) {
  const [open, setOpen] = useState(false);
  const android = usePlatform() === "android";
  const items = (more ?? []).filter((a): a is ActionSheetAction => Boolean(a));

  const moreButton = items.length > 0 && (
    <button
      type="button"
      onClick={() => {
        haptic();
        setOpen(true);
      }}
      className={
        android
          ? "m3-icon-button text-on-surface-variant"
          : "grid size-11 place-items-center rounded-full text-primary active:opacity-50"
      }
      aria-label="More actions"
    >
      {android ? (
        <EllipsisVertical className="h-6 w-6" strokeWidth={2} aria-hidden />
      ) : (
        <Ellipsis className="h-6 w-6" strokeWidth={2.2} aria-hidden />
      )}
    </button>
  );

  const primaryButton = primary && (
    <button
      type="button"
      onClick={() => {
        haptic();
        primary.onClick();
      }}
      className={
        android
          ? "m3-icon-button text-primary"
          : "grid size-11 place-items-center rounded-full text-primary active:opacity-50"
      }
      aria-label={primary.label}
    >
      {primary.icon ?? <Plus className={android ? "h-6 w-6" : "h-[26px] w-[26px]"} strokeWidth={2.2} aria-hidden />}
    </button>
  );

  return (
    <MobileNavActions>
      {android ? (
        <>
          {primaryButton}
          {moreButton}
        </>
      ) : (
        <>
          {moreButton}
          {primaryButton}
        </>
      )}
      {items.length > 0 && (
        <ActionSheet open={open} onClose={() => setOpen(false)} title={moreTitle} actions={items} />
      )}
    </MobileNavActions>
  );
}
