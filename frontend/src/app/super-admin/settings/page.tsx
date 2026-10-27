"use client";

import { useState, type FormEvent } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { useSAPlatformSettings, useSAUpdatePlatformSettings } from "@/hooks/use-super-admin";
import type { PlatformSettings, SetupOrgType, UpdatePlatformSettingsBody } from "@/lib/api/super-admin";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";

const sectionClass = "bg-surface-container-lowest border border-outline-variant rounded-2xl p-5";
const CONSOLE_URL = "https://console.cloud.google.com/apis/credentials";

/** Server message from an API error (Nest sends a string or an array of strings). */
function errorMessage(err: unknown, fallback: string): string {
  const message = (err as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
  if (Array.isArray(message)) return message.join(", ");
  return typeof message === "string" && message ? message : fallback;
}

function Switch({
  on,
  disabled,
  onClick,
  ...aria
}: {
  on: boolean;
  disabled?: boolean;
  onClick: () => void;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      {...aria}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "relative h-5 w-9 shrink-0 rounded-full transition-colors outline-none",
        "focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-60 disabled:cursor-not-allowed",
        on ? "bg-primary" : "bg-outline",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "absolute top-0.5 left-0 h-4 w-4 rounded-full bg-on-primary shadow-sm transition-transform",
          on ? "translate-x-4" : "translate-x-0.5",
        )}
      />
    </button>
  );
}

const ORG_TYPE_ROWS: { type: SetupOrgType; label: string; field: "teamSetupEnabled" | "freelancerSetupEnabled" }[] = [
  { type: "TEAM", label: "Team / Company", field: "teamSetupEnabled" },
  { type: "FREELANCER", label: "Solo / Freelancer", field: "freelancerSetupEnabled" },
];

/** Which org types new workspaces may pick on the "How will you use Wazelo?" screen. */
function WorkspaceTypesCard({ settings }: { settings: PlatformSettings }) {
  const update = useSAUpdatePlatformSettings();
  const [pending, setPending] = useState<{ row: (typeof ORG_TYPE_ROWS)[number]; next: boolean } | null>(null);

  const confirm = () => {
    if (!pending) return;
    const { row, next } = pending;
    update.mutate(
      { [row.field]: next },
      {
        onSuccess: () => {
          toast.success(`${row.label} setup is ${next ? "on" : "off"}`);
          setPending(null);
        },
        onError: (err) => {
          toast.error(errorMessage(err, "Could not update the setting"));
          setPending(null);
        },
      },
    );
  };

  return (
    <section aria-labelledby="org-types-heading" className="space-y-3">
      <h2 id="org-types-heading" className="text-title-sm font-semibold text-on-surface">
        Workspace types
      </h2>

      <div className={cn(sectionClass, "p-0 overflow-hidden")}>
        <table className="w-full text-body">
          <thead>
            <tr className="border-b border-outline-variant text-left text-label text-on-surface-variant">
              <th scope="col" className="px-5 py-3 font-medium">Type</th>
              <th scope="col" className="px-5 py-3 font-medium text-right">Workspaces</th>
              <th scope="col" className="px-5 py-3 font-medium text-right">New setup</th>
            </tr>
          </thead>
          <tbody>
            {ORG_TYPE_ROWS.map((row) => {
              const { setupEnabled, orgCount } = settings.orgTypes[row.type];
              return (
                <tr key={row.type} className="border-b border-outline-variant last:border-0">
                  <th scope="row" className="px-5 py-3 text-left font-medium text-on-surface">{row.label}</th>
                  <td className="px-5 py-3 text-right tabular-nums text-on-surface-variant">{orgCount}</td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end">
                      <Switch
                        on={setupEnabled}
                        disabled={update.isPending}
                        onClick={() => setPending({ row, next: !setupEnabled })}
                        aria-label={`Allow new ${row.label} workspaces`}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-label text-on-surface-variant">
        Off hides the type when a new workspace is set up. Existing workspaces aren&apos;t affected.
      </p>

      <ConfirmDialog
        open={pending !== null}
        title={pending?.next ? `Allow new ${pending.row.label} workspaces?` : `Stop new ${pending?.row.label} workspaces?`}
        message={
          pending?.next
            ? "New workspaces can choose this type during setup."
            : "New workspaces can't choose this type during setup. Existing ones keep working."
        }
        confirmLabel={pending?.next ? "Turn on" : "Turn off"}
        variant={pending?.next ? "default" : "warning"}
        loading={update.isPending}
        onConfirm={confirm}
        onCancel={() => setPending(null)}
      />
    </section>
  );
}

/** Client ID / secret / redirect URI form. Re-mounted (keyed) whenever the saved values change. */
function GoogleCredentialsCard({ settings }: { settings: PlatformSettings }) {
  const google = settings.google;
  const update = useSAUpdatePlatformSettings();
  const [clientId, setClientId] = useState(google.clientId ?? "");
  const [clientSecret, setClientSecret] = useState("");
  const [redirectUri, setRedirectUri] = useState(google.redirectUri ?? google.suggestedRedirectUri);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [copied, setCopied] = useState(false);

  const dirty =
    clientId.trim() !== (google.clientId ?? "") ||
    redirectUri.trim() !== (google.redirectUri ?? "") ||
    clientSecret.trim() !== "";

  const save = (e: FormEvent) => {
    e.preventDefault();
    const body: UpdatePlatformSettingsBody = {
      googleClientId: clientId.trim(),
      googleRedirectUri: redirectUri.trim(),
      // Blank keeps the saved secret
      googleClientSecret: clientSecret.trim(),
    };
    update.mutate(body, {
      onSuccess: (data) =>
        toast.success(data.google.configured ? "Google sign-in saved and ready" : "Google sign-in settings saved"),
      onError: (err) => toast.error(errorMessage(err, "Could not save Google sign-in settings")),
    });
  };

  const removeSecret = () => {
    update.mutate(
      { googleClientSecret: null },
      {
        onSuccess: () => {
          toast.success("Client secret removed");
          setConfirmRemove(false);
        },
        onError: (err) => {
          toast.error(errorMessage(err, "Could not remove the client secret"));
          setConfirmRemove(false);
        },
      },
    );
  };

  const copyRedirect = async () => {
    try {
      await navigator.clipboard.writeText(redirectUri.trim() || google.suggestedRedirectUri);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy. Select the URL and copy it manually.");
    }
  };

  return (
    <div className={cn(sectionClass, "space-y-5")}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-body-lg font-medium text-on-surface">Google sign-in</h3>
        {google.configured ? <Badge variant="success">Configured</Badge> : <Badge variant="muted">Not configured</Badge>}
      </div>

      <ol className="list-decimal space-y-1 pl-5 text-body text-on-surface-variant">
        <li>
          In{" "}
          <a href={CONSOLE_URL} target="_blank" rel="noopener noreferrer" className="text-primary underline-offset-2 hover:underline">
            Google Cloud Console → Credentials
          </a>
          , create an OAuth client ID of type <span className="text-on-surface">Web application</span>.
        </li>
        <li>
          Add the redirect URI below under <span className="text-on-surface">Authorized redirect URIs</span>.
        </li>
        <li>
          On the OAuth consent screen, add the scopes <span className="font-mono text-on-surface">openid</span>,{" "}
          <span className="font-mono text-on-surface">email</span> and <span className="font-mono text-on-surface">profile</span>.
        </li>
        <li>Publish the app to production, so anyone with a Google account can sign in (not just test users).</li>
        <li>Paste the client ID and secret here and save.</li>
      </ol>

      <form onSubmit={save} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="google-client-id">Client ID</Label>
          <Input
            id="google-client-id"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            placeholder="1234567890-abc123.apps.googleusercontent.com"
            autoComplete="off"
            spellCheck={false}
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="google-client-secret">Client secret</Label>
            {google.clientSecretSet && (
              <button
                type="button"
                onClick={() => setConfirmRemove(true)}
                disabled={update.isPending}
                className="rounded text-label font-medium text-error underline-offset-2 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-60"
              >
                Remove secret
              </button>
            )}
          </div>
          <Input
            id="google-client-secret"
            type="password"
            value={clientSecret}
            onChange={(e) => setClientSecret(e.target.value)}
            placeholder={google.clientSecretSet ? "•••••• (saved)" : "GOCSPX-…"}
            autoComplete="new-password"
            spellCheck={false}
            aria-describedby="google-client-secret-hint"
          />
          <p id="google-client-secret-hint" className="text-label text-on-surface-variant">
            {google.clientSecretSet
              ? "Stored encrypted and never shown again. Leave blank to keep the saved secret."
              : "Stored encrypted and never shown again."}
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="google-redirect-uri">Redirect URI</Label>
          <div className="flex items-center gap-2">
            <Input
              id="google-redirect-uri"
              value={redirectUri}
              onChange={(e) => setRedirectUri(e.target.value)}
              placeholder={google.suggestedRedirectUri}
              autoComplete="off"
              spellCheck={false}
              className="font-mono"
              aria-describedby="google-redirect-uri-hint"
            />
            <IconButton type="button" aria-label="Copy redirect URI" title="Copy redirect URI" onClick={copyRedirect}>
              {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
            </IconButton>
          </div>
          <p id="google-redirect-uri-hint" className="text-label text-on-surface-variant">
            Add this exact URL under Authorized redirect URIs in Google Cloud Console
          </p>
        </div>

        <div className="flex justify-end">
          <Button type="submit" loading={update.isPending} disabled={!dirty}>
            Save
          </Button>
        </div>
      </form>

      <ConfirmDialog
        open={confirmRemove}
        title="Remove the client secret?"
        message={
          settings.googleSignupEnabled
            ? "Google sign-in stops working for everyone, and sign-up with Google is turned off."
            : "Google sign-in stops working for everyone until a new secret is saved."
        }
        confirmLabel="Remove"
        variant="danger"
        loading={update.isPending}
        onConfirm={removeSecret}
        onCancel={() => setConfirmRemove(false)}
      />
    </div>
  );
}

export default function SuperAdminSettingsPage() {
  const { data: settings, isLoading, isError, refetch } = useSAPlatformSettings();
  const update = useSAUpdatePlatformSettings();
  // The value the super admin is about to switch to (confirm dialog open while set)
  const [pending, setPending] = useState<boolean | null>(null);

  const confirm = () => {
    if (pending === null) return;
    const next = pending;
    update.mutate(
      { googleSignupEnabled: next },
      {
        onSuccess: () => {
          toast.success(next ? "Sign-up with Google is on" : "Sign-up with Google is off");
          setPending(null);
        },
        onError: (err) => {
          toast.error(errorMessage(err, "Could not update the setting"));
          setPending(null);
        },
      },
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12" role="status">
        <Spinner />
        <span className="sr-only">Loading settings…</span>
      </div>
    );
  }

  if (isError || !settings) {
    return (
      <div className="p-6 max-w-2xl">
        <Alert variant="error">
          Could not load platform settings.{" "}
          <button type="button" onClick={() => refetch()} className="underline hover:no-underline">
            Try again
          </button>
        </Alert>
      </div>
    );
  }

  const google = settings.google;
  const on = settings.googleSignupEnabled;
  const switchDisabled = !google.configured || update.isPending;

  return (
    <div className="p-4 lg:p-6 space-y-5 max-w-2xl">
      <PageHeader title="Settings" />

      <section aria-labelledby="sign-in-heading" className="space-y-3">
        <h2 id="sign-in-heading" className="text-title-sm font-semibold text-on-surface">
          Sign-in
        </h2>

        {!google.configured && (
          <Alert variant="warning">
            Google sign-in isn&apos;t configured yet. Save the client ID, client secret and redirect URI below to turn it on.
          </Alert>
        )}

        <GoogleCredentialsCard
          key={`${google.clientId ?? ""}|${google.redirectUri ?? ""}|${google.clientSecretSet}`}
          settings={settings}
        />

        <div className={cn(sectionClass, "flex items-start gap-4")}>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span id="google-signup-label" className="text-body-lg font-medium text-on-surface">
                Allow sign-up with Google
              </span>
              {on ? <Badge variant="success">On</Badge> : <Badge variant="muted">Off</Badge>}
            </div>
            <p id="google-signup-desc" className="mt-0.5 text-body text-on-surface-variant">
              New users can create a workspace with “Continue with Google”. When off, the button is hidden on the
              sign-up page; people who already linked Google can still sign in with it.
              {!google.configured && " Available once Google sign-in is configured."}
            </p>
          </div>
          <div className="mt-1">
            <Switch
              on={on}
              disabled={switchDisabled}
              onClick={() => setPending(!on)}
              aria-labelledby="google-signup-label"
              aria-describedby="google-signup-desc"
            />
          </div>
        </div>
      </section>

      <WorkspaceTypesCard settings={settings} />

      <ConfirmDialog
        open={pending !== null}
        title={pending ? "Allow sign-up with Google?" : "Turn off sign-up with Google?"}
        message={
          pending
            ? "Anyone with a verified Google account can create a new workspace from the sign-up page."
            : "New users can no longer sign up with Google. People who already linked Google can still sign in."
        }
        confirmLabel={pending ? "Turn on" : "Turn off"}
        variant={pending ? "default" : "warning"}
        loading={update.isPending}
        onConfirm={confirm}
        onCancel={() => setPending(null)}
      />
    </div>
  );
}
