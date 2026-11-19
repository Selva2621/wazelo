"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MediaPicker, mediaKindFor } from "@/components/ui/media-picker";
import { useReplaceCampaignMedia } from "@/hooks/use-campaigns";

interface Props {
  campaignId: string;
  messageType: string;
  /** Paused or scheduled: the media can be replaced now */
  canReplace: boolean;
}

/**
 * Shown when the campaign's uploaded file was cleared from the server (a restart
 * or deploy wipes local uploads). The campaign pauses instead of failing everyone;
 * upload the file again here, then resume.
 */
export function CampaignMediaMissing({ campaignId, messageType, canReplace }: Props) {
  const [picked, setPicked] = useState<{ url: string; mimeType?: string } | null>(null);
  const replace = useReplaceCampaignMedia();

  return (
    <div role="alert" data-tour="campaign-media-missing" className="rounded-xl bg-warning-container px-4 py-3 space-y-3">
      <p className="text-label text-warning">
        The campaign&apos;s {messageType.toLowerCase()} is missing on the server, so nothing can be sent.{" "}
        {canReplace ? "Upload it again, then resume." : "Pause the campaign to replace it."}
      </p>
      {canReplace && (
        <div className="space-y-2">
          <MediaPicker
            kind={mediaKindFor(messageType)}
            value={picked?.url ?? ""}
            onChange={(url, media) => setPicked(url ? { url, mimeType: media?.mimeType } : null)}
          />
          <Button
            size="sm"
            disabled={!picked}
            loading={replace.isPending}
            onClick={() =>
              picked &&
              replace.mutate(
                { campaignId, mediaUrl: picked.url, mediaMimeType: picked.mimeType },
                { onSuccess: () => setPicked(null) },
              )
            }
          >
            Save new file
          </Button>
        </div>
      )}
    </div>
  );
}
