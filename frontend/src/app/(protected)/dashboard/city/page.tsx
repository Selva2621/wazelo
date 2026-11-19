"use client";

import { useEffect, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { usePageTitle } from "@/hooks/use-page-title";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useCityInsights, useLeadsToday, useLiveChannelStats, useWaitingChats } from "@/hooks/use-analytics";
import { useMessageCitySocket } from "@/hooks/use-message-city-socket";
import { CityStatsPanel } from "@/components/message-city/city-stats-panel";
import { useCityStore } from "@/components/message-city/use-city-store";
import { useCityTheme } from "@/components/message-city/use-city-theme";

// Three.js only runs in the browser, and it's heavy: load it with this page, not the app
const CityCanvas = dynamic(() => import("@/components/message-city/city-canvas"), {
  ssr: false,
  loading: () => <SceneSkeleton />,
});

function SceneSkeleton() {
  return <div className="h-full w-full animate-pulse rounded-xl bg-surface-container-lowest" aria-label="Loading 3D view" />;
}

let webglSupport: boolean | undefined;
function hasWebGL() {
  if (webglSupport === undefined) {
    try {
      const c = document.createElement("canvas");
      webglSupport = !!(c.getContext("webgl2") || c.getContext("webgl"));
    } catch {
      webglSupport = false;
    }
  }
  return webglSupport;
}
const noopSubscribe = () => () => {};

function BackToDashboard() {
  return (
    <Link
      href="/dashboard"
      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-outline-variant px-3 text-body text-on-surface hover:bg-surface-container-low"
    >
      <ArrowLeft className="size-4" />
      Dashboard
    </Link>
  );
}

function Notice({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl bg-surface-container-lowest p-8 text-center">
      <p className="text-body text-on-surface-variant">{text}</p>
      <BackToDashboard />
    </div>
  );
}

export default function MessageCityPage() {
  usePageTitle("Message City");
  const isMobile = useIsMobile();
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const theme = useCityTheme();
  // null on the server; checked once in the browser
  const webgl = useSyncExternalStore(noopSubscribe, hasWebGL, () => null);
  const { data, isError, refetch } = useLiveChannelStats();
  const { data: leads } = useLeadsToday();
  const { data: insights } = useCityInsights();
  const { data: waiting } = useWaitingChats();
  useMessageCitySocket();

  // Start from the whole city on each visit
  useEffect(() => () => useCityStore.getState().select(null), []);

  if (isMobile) {
    return (
      <div className="px-4 pt-4">
        <Notice text="The 3D view is made for a bigger screen. Open it on a computer." />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100dvh-var(--header-height))] flex-col gap-4 px-6 pb-6 pt-4">
      <PageHeader title="Message City" description="Messages today, live" actions={<BackToDashboard />} />

      {webgl === false ? (
        <Notice text="This browser can't show 3D graphics (WebGL is off)." />
      ) : isError ? (
        <div className="flex flex-col items-center gap-3 rounded-xl bg-error-container p-6 text-center">
          <p className="text-body text-error">Live numbers couldn&apos;t be loaded.</p>
          <Button variant="secondary" size="sm" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      ) : (
        <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_300px] gap-4">
          <div data-tour="city-canvas" className="relative min-h-0 overflow-hidden rounded-xl">
            {data && theme && webgl ? (
              <CityCanvas
                data={data}
                insights={insights}
                leadsToday={leads?.total ?? 0}
                waiting={waiting?.total ?? 0}
                theme={theme}
                reducedMotion={reducedMotion}
              />
            ) : (
              <SceneSkeleton />
            )}
            <p className="pointer-events-none absolute bottom-3 left-4 text-caption text-on-surface-variant">
              Drag to turn · scroll to zoom
            </p>
          </div>
          <div className="min-h-0 overflow-y-auto">
            {data ? (
              <CityStatsPanel data={data} leads={leads} insights={insights} />
            ) : (
              <div className="h-72 animate-pulse rounded-xl bg-surface-container-lowest" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
