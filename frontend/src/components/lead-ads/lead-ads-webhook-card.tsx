"use client";

import { useState } from "react";
import {
  Link2,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Save,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { useSaveLeadAdsConfig } from "@/hooks/use-lead-ads";
import type { LeadAdConfigStatus } from "@/lib/types/lead-ads";

interface LeadAdsWebhookCardProps {
  config: LeadAdConfigStatus;
}

export function LeadAdsWebhookCard({ config }: LeadAdsWebhookCardProps) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(!config.isFullyConfigured);
  const [showSecret, setShowSecret] = useState(false);
  const [appSecret, setAppSecret] = useState("");
  const [verifyToken, setVerifyToken] = useState("");

  const saveConfig = useSaveLeadAdsConfig();

  const handleCopy = async () => {
    await navigator.clipboard.writeText(config.webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = () => {
    const payload: Record<string, string> = {};
    if (appSecret.trim()) payload.metaAppSecret = appSecret.trim();
    if (verifyToken.trim()) payload.webhookVerifyToken = verifyToken.trim();
    if (Object.keys(payload).length === 0) return;

    saveConfig.mutate(payload, {
      onSuccess: () => {
        setAppSecret("");
        setVerifyToken("");
      },
    });
  };

  return (
    <div className="rounded-xl bg-surface-container-lowest border border-outline-variant/10 p-5">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <Link2 className="h-4 w-4 text-primary" />
          <h3 className="text-[13px] font-medium text-on-surface">
            Webhook Configuration
          </h3>
          {config.isFullyConfigured ? (
            <span className="inline-flex items-center gap-1 text-[11px] text-success bg-success/10 rounded-full px-2 py-0.5 font-medium">
              <CheckCircle2 className="h-3 w-3" />
              Configured
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] text-warning bg-warning/10 rounded-full px-2 py-0.5 font-medium">
              <AlertCircle className="h-3 w-3" />
              Setup Required
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-on-surface-variant" />
        ) : (
          <ChevronDown className="h-4 w-4 text-on-surface-variant" />
        )}
      </button>

      {expanded && (
        <div className="mt-4 space-y-4">
          {/* Webhook URL */}
          <div>
            <p className="text-[11px] text-on-surface-variant/60 uppercase tracking-wide mb-1.5">
              Your Webhook URL
            </p>
            <div className="flex items-center gap-2 bg-surface-container rounded-lg px-3 py-2">
              <code className="text-[12px] text-on-surface font-mono flex-1 truncate">
                {config.webhookUrl}
              </code>
              <Button variant="ghost" size="sm" onClick={handleCopy}>
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-success" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
          </div>

          {/* Config Form */}
          <div className="space-y-3">
            <p className="text-[11px] text-on-surface-variant/60 uppercase tracking-wide">
              Meta App Credentials
            </p>

            {/* App Secret */}
            <div>
              <label className="text-[12px] font-medium text-on-surface-variant mb-1 block">
                Meta App Secret
                {config.hasAppSecret && (
                  <span className="text-success ml-2 font-normal">Saved</span>
                )}
              </label>
              <div className="relative">
                <Input
                  type={showSecret ? "text" : "password"}
                  placeholder={
                    config.hasAppSecret
                      ? "Enter new secret to update"
                      : "Paste from App Dashboard → Settings → Basic"
                  }
                  value={appSecret}
                  onChange={(e) => setAppSecret(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant/40 hover:text-on-surface-variant"
                >
                  {showSecret ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Verify Token */}
            <div>
              <label className="text-[12px] font-medium text-on-surface-variant mb-1 block">
                Webhook Verify Token
                {config.hasVerifyToken && (
                  <span className="text-success ml-2 font-normal">Saved</span>
                )}
              </label>
              <Input
                type="text"
                placeholder={
                  config.hasVerifyToken
                    ? "Enter new token to update"
                    : "Choose any random string"
                }
                value={verifyToken}
                onChange={(e) => setVerifyToken(e.target.value)}
              />
            </div>

            {/* Save Button */}
            <Button
              onClick={handleSave}
              disabled={
                (!appSecret.trim() && !verifyToken.trim()) ||
                saveConfig.isPending
              }
              loading={saveConfig.isPending}
              size="sm"
            >
              <Save className="h-3.5 w-3.5 mr-1.5" />
              Save Configuration
            </Button>
          </div>

          {/* Setup Instructions */}
          <Alert variant="info">
            <strong>Setup steps:</strong>
            <ol className="mt-1 ml-3 list-decimal space-y-0.5 text-[12px]">
              <li>
                Get your App Secret from{" "}
                <strong>Meta App Dashboard → Settings → Basic</strong>
              </li>
              <li>Choose a Webhook Verify Token (any random string)</li>
              <li>Save both above, then copy your Webhook URL</li>
              <li>
                In Meta App Dashboard → <strong>Webhooks → Page</strong> →
                subscribe to <strong>leadgen</strong>
              </li>
              <li>Paste your Webhook URL and Verify Token there</li>
            </ol>
          </Alert>

          {/* Subscribed Pages */}
          {config.subscribedPages.length > 0 && (
            <div>
              <p className="text-[11px] text-on-surface-variant/60 uppercase tracking-wide mb-1.5">
                Connected Channels
              </p>
              <div className="space-y-1.5">
                {config.subscribedPages.map((page) => (
                  <div
                    key={page.pageId}
                    className="flex items-center justify-between rounded-lg bg-surface-container/50 px-3 py-2"
                  >
                    <span className="text-[12px] text-on-surface">
                      {page.pageName || page.pageId}
                    </span>
                    <span className="text-[11px] text-on-surface-variant capitalize">
                      {page.channelType.toLowerCase().replace(/_/g, " ")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
