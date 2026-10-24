"use client";

import { useState } from "react";
import { Bell, Download, LogOut, Palette } from "lucide-react";
import { GroupedSection, ListRow } from "@/components/ios/grouped-list";
import { ActionSheet } from "@/components/ios/action-sheet";
import { BottomSheet } from "@/components/ios/bottom-sheet";
import { useNavSections } from "@/components/layout/nav-config";
import { Avatar } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { useAuthStore } from "@/stores/auth-store";
import { usePwaStore } from "@/stores/pwa-store";
import { THEMES, useThemeStore } from "@/stores/theme-store";
import { useLogout } from "@/hooks/use-auth";
import { useBrowserPush } from "@/hooks/use-browser-push";
import { useSubscription } from "@/hooks/use-billing";
import { usePageTitle } from "@/hooks/use-page-title";
import { cn } from "@/lib/utils";

/** Already on the tab bar, so not repeated here */
const ON_TAB_BAR = ["/inbox", "/contacts", "/dashboard", "/dashboard/freelancer"];

/** iOS-style coloured tiles per section */
const SECTION_TILE: Record<string, string> = {
  Overview: "bg-chart-2",
  Messaging: "bg-success",
  Sales: "bg-chart-5",
  Marketing: "bg-chart-4",
  Automation: "bg-chart-1",
  Service: "bg-warning",
  Settings: "bg-chart-6",
  Support: "bg-info",
  Team: "bg-chart-3",
  Admin: "bg-error",
};

function PushRow() {
  const push = useBrowserPush();
  const subtitle: Record<typeof push.status, string> = {
    loading: "Checking…",
    unsupported: "Add Wazelo to your Home Screen to get alerts",
    unavailable: "Not available right now",
    denied: "Blocked in your browser settings",
    off: "Off on this device",
    on: "On for this device",
  };
  const canToggle = push.status === "on" || push.status === "off";

  return (
    <ListRow
      icon={<Bell />}
      iconClassName="bg-error"
      title="Notifications"
      subtitle={subtitle[push.status]}
      detail={
        canToggle ? (
          <Switch
            checked={push.status === "on"}
            disabled={push.isPending}
            onChange={(on) => (on ? push.enable() : push.dismiss())}
            aria-label="Notifications on this device"
          />
        ) : undefined
      }
    />
  );
}

function InstallRow() {
  const standalone = usePwaStore((s) => s.standalone);
  const installEvent = usePwaStore((s) => s.installEvent);
  const setInstallEvent = usePwaStore((s) => s.setInstallEvent);
  const [howTo, setHowTo] = useState(false);
  if (standalone) return null;

  const install = async () => {
    if (installEvent) {
      await installEvent.prompt();
      await installEvent.userChoice;
      setInstallEvent(null);
    } else {
      setHowTo(true);
    }
  };

  return (
    <>
      <ListRow
        icon={<Download />}
        iconClassName="bg-primary"
        title="Install app"
        subtitle="Full screen, with notifications"
        onClick={install}
      />
      <BottomSheet open={howTo} onClose={() => setHowTo(false)} title="Install Wazelo">
        <ol className="space-y-4 px-5 pb-2 pt-1 text-[16px] text-on-surface">
          <li className="flex gap-3">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-surface-container-high text-[14px] font-semibold">1</span>
            <span>Tap the <strong>Share</strong> button in the browser toolbar.</span>
          </li>
          <li className="flex gap-3">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-surface-container-high text-[14px] font-semibold">2</span>
            <span>Choose <strong>Add to Home Screen</strong>.</span>
          </li>
          <li className="flex gap-3">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-surface-container-high text-[14px] font-semibold">3</span>
            <span>Open Wazelo from your Home Screen.</span>
          </li>
        </ol>
      </BottomSheet>
    </>
  );
}

function AppearanceRow() {
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const [open, setOpen] = useState(false);
  const current = THEMES.find((t) => t.id === theme)?.label ?? "";

  return (
    <>
      <ListRow
        icon={<Palette />}
        iconClassName="bg-chart-5"
        title="Appearance"
        detail={current}
        chevron
        onClick={() => setOpen(true)}
      />
      <BottomSheet open={open} onClose={() => setOpen(false)} title="Appearance">
        <GroupedSection>
          {THEMES.map((t) => (
            <ListRow
              key={t.id}
              title={t.label}
              subtitle={t.mode === "light" ? "Light" : "Dark"}
              chevron={false}
              detail={
                <span className={cn("text-[17px] font-semibold text-primary", t.id !== theme && "invisible")} aria-hidden>
                  ✓
                </span>
              }
              onClick={() => {
                setTheme(t.id);
                setOpen(false);
              }}
            />
          ))}
        </GroupedSection>
      </BottomSheet>
    </>
  );
}

export default function MorePage() {
  usePageTitle("More");
  const user = useAuthStore((s) => s.user);
  const { sections } = useNavSections();
  const { data: billing } = useSubscription();
  const logout = useLogout();
  const [confirmSignOut, setConfirmSignOut] = useState(false);

  const userName = user ? `${user.firstName} ${user.lastName}` : "User";
  const role = user?.role ? user.role.charAt(0) + user.role.slice(1).toLowerCase() : "";
  const plan = billing?.subscription?.plan?.name;

  return (
    <div className="ios-page pb-6">
      {/* Profile card */}
      <GroupedSection>
        <ListRow
          href="/settings/profile"
          className="ios-row-profile"
          icon={<Avatar name={userName} size="md" />}
          iconClassName="bg-transparent"
          title={<span className="text-[19px] font-semibold">{userName}</span>}
          subtitle={[user?.email, role, plan].filter(Boolean).join(" · ")}
        />
      </GroupedSection>

      {sections.map((section) => {
        const items = section.items.filter((i) => !ON_TAB_BAR.includes(i.href));
        if (items.length === 0) return null;
        return (
          <GroupedSection key={section.label} header={section.label}>
            {items.map((item) => (
              <ListRow
                key={item.href}
                href={item.href}
                icon={item.icon}
                iconClassName={SECTION_TILE[section.label] ?? "bg-chart-6"}
                title={item.label}
              />
            ))}
          </GroupedSection>
        );
      })}

      <GroupedSection header="This device">
        <PushRow />
        <AppearanceRow />
        <InstallRow />
      </GroupedSection>

      <GroupedSection>
        <ListRow
          icon={<LogOut />}
          iconClassName="bg-error"
          title="Sign out"
          destructive
          chevron={false}
          onClick={() => setConfirmSignOut(true)}
        />
      </GroupedSection>

      <ActionSheet
        open={confirmSignOut}
        onClose={() => setConfirmSignOut(false)}
        title="Sign out of Wazelo?"
        actions={[{ label: "Sign out", destructive: true, onSelect: () => logout.mutate() }]}
      />
    </div>
  );
}
