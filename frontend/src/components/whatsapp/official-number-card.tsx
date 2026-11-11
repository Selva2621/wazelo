"use client";

import { useState } from "react";
import { BadgeCheck, Check, Copy, KeyRound, Plus, RefreshCw, Trash2, Webhook } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Spinner } from "@/components/ui/spinner";
import { useAuthStore } from "@/stores/auth-store";
import {
  apiError,
  useCloudNumbers,
  useConnectCloudNumber,
  useRefreshCloudNumber,
  useRemoveCloudNumber,
  useUpdateCloudCredentials,
  useCloudTemplates,
  useSyncCloudTemplates,
} from "@/hooks/use-cloud-numbers";
import type { CloudNumber } from "@/lib/api/whatsapp";

const inputCls =
  "mt-1 w-full rounded-lg border border-outline-variant/20 bg-surface-container-low px-3 py-2.5 text-body text-on-surface placeholder:text-placeholder focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono";

/** TIER_1K → "1K people / day" */
function tierLabel(tier: string | null): string | null {
  if (!tier) return null;
  const t = tier.replace(/^TIER_/, "");
  return t === "UNLIMITED" ? "Unlimited / day" : `${t} people / day`;
}

const QUALITY: Record<string, { label: string; cls: string }> = {
  GREEN: { label: "Quality: High", cls: "text-success bg-success/10" },
  YELLOW: { label: "Quality: Medium", cls: "text-warning bg-warning/10" },
  RED: { label: "Quality: Low", cls: "text-error bg-error/10" },
};

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div>
      <p className="text-caption font-medium text-on-surface-variant">{label}</p>
      <div className="mt-1 flex items-center gap-2 rounded-lg bg-surface-container-low px-3 py-2">
        <code className="min-w-0 flex-1 truncate text-caption text-on-surface">{value}</code>
        <button
          type="button"
          aria-label={`Copy ${label}`}
          className="shrink-0 text-on-surface-variant hover:text-primary"
          onClick={async () => {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

/** The two values to paste in Meta → WhatsApp → Configuration → Webhook */
function WebhookSteps({ number }: { number: CloudNumber }) {
  return (
    <div className="space-y-3 rounded-xl border border-outline-variant/15 p-4">
      <p className="text-body text-on-surface">
        In Meta App Dashboard → <b>WhatsApp → Configuration → Webhook</b>, paste these, then subscribe to <b>messages</b>.
      </p>
      <CopyField label="Callback URL" value={number.webhookUrl} />
      {number.verifyToken && <CopyField label="Verify token" value={number.verifyToken} />}
      <p className="text-caption text-on-surface-variant">Without this, sending works but replies and ticks won&apos;t show in the inbox.</p>
    </div>
  );
}

const GUIDE_STEPS: { title: string; body: React.ReactNode }[] = [
  {
    title: "Open your Meta app",
    body: (
      <>
        <a href="https://developers.facebook.com/apps" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">developers.facebook.com/apps</a>
        {" "}→ My Apps → your app (with the WhatsApp product added).
      </>
    ),
  },
  {
    title: "Phone number ID and Business Account ID",
    body: <>WhatsApp → <b>API Setup</b> → pick your number in <b>From</b>. Both IDs show right under it.</>,
  },
  {
    title: "Permanent access token",
    body: (
      <>
        <a href="https://business.facebook.com/settings/system-users" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Business Settings → System users</a>
        {" "}→ add an Admin user → Assign assets (your app and WhatsApp account) → <b>Generate token</b>. Tick
        {" "}<code>whatsapp_business_messaging</code> and <code>whatsapp_business_management</code>, expiry <b>Never</b>.
        The token on API Setup works for 24 hours only: fine for a quick test.
      </>
    ),
  },
  {
    title: "App Secret",
    body: <>App settings → <b>Basic</b> → App secret → <b>Show</b> (Facebook asks your password) → copy the 32 characters.</>,
  },
  {
    title: "After connecting: turn on replies",
    body: (
      <>
        Wazelo shows a Callback URL and Verify token. Paste both in WhatsApp → <b>Configuration</b> → Webhook,
        then subscribe to <b>messages</b>. Replies and delivery ticks start arriving in the inbox.
      </>
    ),
  },
];

/** Where each value lives in Meta, next to the form (folds above it on phones) */
function SetupGuide() {
  const steps = (
    <ol className="space-y-3">
      {GUIDE_STEPS.map((s, i) => (
        <li key={s.title} className="flex gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-caption font-semibold text-primary">
            {i + 1}
          </span>
          <div className="min-w-0">
            <p className="text-body font-medium text-on-surface">{s.title}</p>
            <p className="mt-0.5 text-caption text-on-surface-variant [&_code]:rounded [&_code]:bg-surface-container [&_code]:px-1">{s.body}</p>
          </div>
        </li>
      ))}
    </ol>
  );
  const tip = (
    <p className="rounded-lg bg-warning/10 px-3 py-2 text-caption text-on-surface">
      <b>Using Meta&apos;s test number (+1 555…)?</b> It only sends to up to 5 numbers added under <b>To</b> on API Setup.
      Add and verify your own number there first.
    </p>
  );
  return (
    <>
      {/* Desktop: always open beside the form */}
      <aside className="space-y-4 rounded-xl bg-surface-container-low p-4 max-md:hidden" aria-label="Setup guide">
        <p className="text-label font-semibold uppercase tracking-wide text-on-surface-variant">Setup guide</p>
        {steps}
        {tip}
      </aside>
      {/* Phones: folded above the form */}
      <details className="rounded-xl bg-surface-container-low p-3 md:hidden">
        <summary className="cursor-pointer text-body font-medium text-primary">Where do I find these?</summary>
        <div className="mt-3 space-y-3">
          {steps}
          {tip}
        </div>
      </details>
    </>
  );
}

function ConnectDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const connect = useConnectCloudNumber();
  const [form, setForm] = useState({ phoneNumberId: "", wabaId: "", accessToken: "", appSecret: "" });
  const [connected, setConnected] = useState<CloudNumber | null>(null);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  function close() {
    setForm({ phoneNumberId: "", wabaId: "", accessToken: "", appSecret: "" });
    setConnected(null);
    connect.reset();
    onClose();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setConnected(await connect.mutateAsync(form));
    } catch {
      /* shown below */
    }
  }

  const filled = form.phoneNumberId.trim() && form.wabaId.trim() && form.accessToken.trim() && form.appSecret.trim();

  return (
    <Modal
      open={open}
      onClose={close}
      dismissible={!connect.isPending}
      className={`${connected ? "max-w-lg" : "max-w-4xl"} p-6 max-lg:p-4`}
      aria-labelledby="connect-official-title"
    >
      {() =>
        connected ? (
          <div className="space-y-4">
            <div>
              <h2 id="connect-official-title" className="text-title font-semibold text-on-surface">
                {connected.phoneNumber} connected
              </h2>
              <p className="mt-1 text-body text-on-surface-variant">
                It can send now from inbox, campaigns, automations and sequences. One last step for replies:
              </p>
            </div>
            <WebhookSteps number={connected} />
            <ModalFooter className="flex justify-end pt-2">
              <Button onClick={close} className="max-lg:flex-1">Done</Button>
            </ModalFooter>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div>
              <h2 id="connect-official-title" className="text-title font-semibold text-on-surface">Connect official number</h2>
              <p className="mt-1 text-body text-on-surface-variant">
                Four values from your Meta app, for sending and receiving. The guide shows where each one is.
              </p>
            </div>
            <div className="grid gap-5 md:grid-cols-2 md:items-start">
            <div className="space-y-4 md:order-1">
            <div>
              <Label htmlFor="cn-phone">Phone number ID</Label>
              <input id="cn-phone" className={inputCls} inputMode="numeric" autoComplete="off" value={form.phoneNumberId} onChange={set("phoneNumberId")} />
            </div>
            <div>
              <Label htmlFor="cn-waba">WhatsApp Business Account ID</Label>
              <input id="cn-waba" className={inputCls} inputMode="numeric" autoComplete="off" value={form.wabaId} onChange={set("wabaId")} />
            </div>
            <div>
              <Label htmlFor="cn-token">Access token</Label>
              <input id="cn-token" type="password" className={inputCls} autoComplete="off" value={form.accessToken} onChange={set("accessToken")} />
            </div>
            <div>
              <Label htmlFor="cn-secret">App Secret</Label>
              <input id="cn-secret" type="password" className={inputCls} autoComplete="off" value={form.appSecret} onChange={set("appSecret")} />
              <p className="mt-1 text-caption text-on-surface-variant">Lets customer replies and delivery ticks reach your inbox.</p>
            </div>
            {connect.isError && (
              <p className="rounded-lg bg-error-container px-3 py-2 text-body text-error">{apiError(connect.error, "Couldn't connect the number")}</p>
            )}
            </div>
            {/* Guide: right column on desktop, folded above the form on phones */}
            <div className="max-md:-order-1 md:order-2">
              <SetupGuide />
            </div>
            </div>
            <ModalFooter className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={close} disabled={connect.isPending} className="max-lg:flex-1">Cancel</Button>
              <Button type="submit" loading={connect.isPending} disabled={!filled} className="max-lg:flex-1">Verify & connect</Button>
            </ModalFooter>
          </form>
        )
      }
    </Modal>
  );
}

function UpdateTokenDialog({ number, onClose }: { number: CloudNumber | null; onClose: () => void }) {
  const update = useUpdateCloudCredentials();
  const [accessToken, setAccessToken] = useState("");
  const [appSecret, setAppSecret] = useState("");

  function close() {
    setAccessToken("");
    setAppSecret("");
    update.reset();
    onClose();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!number) return;
    try {
      await update.mutateAsync({
        id: number.id,
        ...(accessToken.trim() && { accessToken: accessToken.trim() }),
        ...(appSecret.trim() && { appSecret: appSecret.trim() }),
      });
      toast.success("Credentials updated");
      close();
    } catch {
      /* shown below */
    }
  }

  return (
    <Modal open={!!number} onClose={close} dismissible={!update.isPending} className="max-w-md p-6 max-lg:p-4" aria-labelledby="update-token-title">
      {() => (
        <form onSubmit={submit} className="space-y-4">
          <h2 id="update-token-title" className="text-title font-semibold text-on-surface">Update credentials</h2>
          <div>
            <Label htmlFor="ut-token">New access token</Label>
            <input id="ut-token" type="password" className={inputCls} autoComplete="off" value={accessToken} onChange={(e) => setAccessToken(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="ut-secret">New App Secret</Label>
            <input id="ut-secret" type="password" className={inputCls} autoComplete="off" value={appSecret} onChange={(e) => setAppSecret(e.target.value)} />
          </div>
          <p className="text-caption text-on-surface-variant">Leave a box empty to keep the current one.</p>
          {update.isError && (
            <p className="rounded-lg bg-error-container px-3 py-2 text-body text-error">{apiError(update.error, "Couldn't update")}</p>
          )}
          <ModalFooter className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={close} disabled={update.isPending} className="max-lg:flex-1">Cancel</Button>
            <Button type="submit" loading={update.isPending} disabled={!accessToken.trim() && !appSecret.trim()} className="max-lg:flex-1">Save</Button>
          </ModalFooter>
        </form>
      )}
    </Modal>
  );
}

function NumberRow({ number, canManage, onUpdate, onRemove }: {
  number: CloudNumber;
  canManage: boolean;
  onUpdate: () => void;
  onRemove: () => void;
}) {
  const refresh = useRefreshCloudNumber();
  const sync = useSyncCloudTemplates();
  const { data: templates } = useCloudTemplates(number.id);
  const [showWebhook, setShowWebhook] = useState(false);
  const quality = number.qualityRating ? QUALITY[number.qualityRating] : undefined;
  const tier = tierLabel(number.messagingTier);

  return (
    <li className="space-y-3 py-4 first:pt-0 last:pb-0">
      <div className="flex items-start gap-3 max-sm:flex-wrap">
        <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-success" />
        <div className="min-w-0 flex-1">
          <p className="text-body-lg font-medium text-on-surface">{number.phoneNumber || "Official number"}</p>
          <p className="text-caption text-on-surface-variant">{number.verifiedName || "Name pending Meta review"}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {quality && <span className={`rounded-full px-2 py-0.5 text-caption font-medium ${quality.cls}`}>{quality.label}</span>}
            {tier && <span className="rounded-full bg-surface-container px-2 py-0.5 text-caption text-on-surface-variant">Limit: {tier}</span>}
            <span className="rounded-full bg-surface-container px-2 py-0.5 text-caption text-on-surface-variant">
              {templates?.length ?? 0} approved template{templates?.length === 1 ? "" : "s"}
            </span>
            <button
              type="button"
              onClick={() => sync.mutate(number.id)}
              disabled={sync.isPending}
              className="text-caption font-medium text-primary hover:underline disabled:opacity-50"
            >
              {sync.isPending ? "Syncing…" : "Sync templates"}
            </button>
          </div>
        </div>
        {canManage && (
          <div className="flex shrink-0 items-center gap-1 max-sm:basis-full max-sm:pl-8">
            <Button variant="ghost" size="sm" onClick={() => setShowWebhook((v) => !v)}>
              <Webhook className="h-4 w-4" /> Webhook
            </Button>
            <Button variant="ghost" size="sm" onClick={() => refresh.mutate(number.id)} loading={refresh.isPending} aria-label="Refresh from Meta">
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onUpdate} aria-label="Update credentials">
              <KeyRound className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onRemove} aria-label="Remove number">
              <Trash2 className="h-4 w-4 text-error" />
            </Button>
          </div>
        )}
      </div>
      {showWebhook && <WebhookSteps number={number} />}
    </li>
  );
}

/** The workspace's official WhatsApp numbers (Meta Cloud API). Admins connect; managers see them. */
export function OfficialNumberCard() {
  const role = useAuthStore((s) => s.user?.role);
  const canView = role === "ADMIN" || role === "MANAGER";
  const canManage = role === "ADMIN";
  const { data: numbers, isLoading } = useCloudNumbers(canView);
  const remove = useRemoveCloudNumber();
  const [connectOpen, setConnectOpen] = useState(false);
  const [updating, setUpdating] = useState<CloudNumber | null>(null);
  const [removing, setRemoving] = useState<CloudNumber | null>(null);

  if (!canView) return null;

  return (
    <Card className="w-full max-w-2xl">
      {/* Card doesn't pass extra props through, so the tour anchor sits on this wrapper */}
      <div data-tour="whatsapp-official">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-title-sm font-semibold text-on-surface">Business number · Official API</h2>
          <p className="mt-1 text-body text-on-surface-variant">
            Meta&apos;s official API: no QR, no phone needed, no ban risk. Shared by your whole team.
          </p>
        </div>
        {canManage && numbers && numbers.length > 0 && (
          <Button variant="secondary" size="sm" onClick={() => setConnectOpen(true)}>
            <Plus className="h-4 w-4" /> Add
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-6"><Spinner /></div>
      ) : numbers && numbers.length > 0 ? (
        <ul className="divide-y divide-outline-variant/10">
          {numbers.map((n) => (
            <NumberRow key={n.id} number={n} canManage={canManage} onUpdate={() => setUpdating(n)} onRemove={() => setRemoving(n)} />
          ))}
        </ul>
      ) : (
        <div className="rounded-xl bg-surface-container-low p-4">
          <ul className="space-y-1 text-body text-on-surface-variant">
            <li>• Reply any time to people who messaged in the last 24 hours</li>
            <li>• After that, and for first messages (campaigns, lead welcome), use a Meta-approved template</li>
            <li>• Meta charges per template message; the daily limit grows with quality</li>
          </ul>
          {canManage ? (
            <Button className="mt-4" onClick={() => setConnectOpen(true)}>Connect official number</Button>
          ) : (
            <p className="mt-3 text-caption text-on-surface-variant">An admin can connect one.</p>
          )}
        </div>
      )}

      {canManage && (
        <>
          <ConnectDialog open={connectOpen} onClose={() => setConnectOpen(false)} />
          <UpdateTokenDialog number={updating} onClose={() => setUpdating(null)} />
          <ConfirmDialog
            open={!!removing}
            title="Remove official number?"
            message={`${removing?.phoneNumber ?? "This number"} stops sending from Wazelo. Chats and history stay. Campaigns or automations using it will need another number.`}
            confirmLabel="Remove"
            variant="danger"
            loading={remove.isPending}
            onConfirm={() => removing && remove.mutate(removing.id, { onSuccess: () => setRemoving(null) })}
            onCancel={() => setRemoving(null)}
          />
        </>
      )}
      </div>
    </Card>
  );
}
