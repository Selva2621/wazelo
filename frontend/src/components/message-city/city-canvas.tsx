"use client";

import { Suspense, useMemo, useState } from "react";
import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useProgress } from "@react-three/drei";
import { EffectComposer, TiltShift2, Vignette } from "@react-three/postprocessing";
import type { CityInsightsResponse, LiveChannelStatsResponse } from "@/lib/types/analytics";
import { CITY_CHANNELS, formatMinutes, totalOf } from "./city-config";
import { ChannelShop } from "./channel-shop";
import { InboxHq, HQ_LABEL_POSITION } from "./inbox-hq";
import { TownGround } from "./town-ground";
import { AmbientTraffic, MessageTraffic } from "./town-traffic";
import { preloadTown } from "./town-model";
import { LabelProjector, type LabelRegistry } from "./city-labels";
import { DOCK_LABEL_POSITION, LeadsDock } from "./leads-dock";
import { HourSkyline } from "./hour-skyline";
import { CityHud } from "./city-hud";
import { useCityStore } from "./use-city-store";
import type { CityTheme } from "./use-city-theme";

preloadTown();

interface Props {
  data: LiveChannelStatsResponse;
  /** Hourly volume (today vs yesterday) and reply speed per channel */
  insights: CityInsightsResponse | undefined;
  /** Leads created today (the dock's parcels) */
  leadsToday: number;
  /** Chats waiting 15+ minutes (HUD) */
  waiting: number;
  theme: CityTheme;
  reducedMotion: boolean;
}

const INBOX_LABEL = "INBOX";
const DOCK_LABEL = "LEADS";

function makeRegistry(): LabelRegistry {
  const anchors = new Map<string, THREE.Vector3>(
    CITY_CHANNELS.map((c) => [c.key, new THREE.Vector3(c.position[0], 1.2, c.position[1])]),
  );
  anchors.set(INBOX_LABEL, HQ_LABEL_POSITION.clone());
  anchors.set(DOCK_LABEL, DOCK_LABEL_POSITION.clone());
  return { anchors, elements: new Map() };
}

function LoadingOverlay() {
  const { active, progress } = useProgress();
  if (!active) return null;
  return (
    <div className="pointer-events-none absolute inset-0 grid place-items-center">
      <p className="rounded-full bg-surface-container-lowest/90 px-3 py-1.5 text-label text-on-surface-variant shadow-sm">
        Building the town… {Math.round(progress)}%
      </p>
    </div>
  );
}

/**
 * Message City: a tilt-shift miniature town. The Inbox HQ stands in the square,
 * each channel is a shop that grows taller with today's messages, and vans carry
 * new messages in while trucks take replies out.
 */
export default function CityCanvas({ data, insights, leadsToday, waiting, theme, reducedMotion }: Props) {
  const replyOf = (key: string) => insights?.channels.find((c) => c.key === key)?.replyMinutes ?? null;
  const select = useCityStore((s) => s.select);
  const selected = useCityStore((s) => s.selected);
  const hovered = useCityStore((s) => s.hovered);
  const [labels] = useState(makeRegistry);

  // Warm afternoon sun in light mode; a softer evening light in dark mode
  const light = useMemo(
    () =>
      theme.dark
        ? { sky: "#9fb4d9", ground: "#3b3a2e", hemi: 0.75, sun: "#ffd9a8", sunI: 1.6 }
        : { sky: "#dfeeff", ground: "#9a8a62", hemi: 1.0, sun: "#fff0d6", sunI: 2.4 },
    [theme.dark],
  );

  const registerLabel = (id: string) => (el: HTMLElement | null) => {
    if (el) labels.elements.set(id, el);
    else labels.elements.delete(id);
  };

  return (
    <div className="relative h-full w-full">
      <Canvas
        frameloop="demand"
        shadows="percentage"
        dpr={[1, 1.75]}
        camera={{ position: [12, 11.5, 15], fov: 32, near: 0.1, far: 120 }}
        onPointerMissed={() => select(null)}
        gl={{ antialias: true, powerPreference: "high-performance" }}
      >
        <color attach="background" args={[theme.surface]} />

        <hemisphereLight args={[light.sky, light.ground, light.hemi]} />
        <directionalLight
          position={[6, 11, 4]}
          color={light.sun}
          intensity={light.sunI}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-bias={-0.0004}
          shadow-normalBias={0.02}
          shadow-camera-left={-8}
          shadow-camera-right={8}
          shadow-camera-top={8}
          shadow-camera-bottom={-8}
        />

        <Suspense fallback={null}>
          <TownGround dark={theme.dark} />
          <InboxHq unread={data.unread} theme={theme} reducedMotion={reducedMotion} />
          {CITY_CHANNELS.map((c) => {
            const stat = data.channels.find((s) => s.key === c.key);
            return stat ? (
              <ChannelShop
                key={c.key}
                channel={c}
                stat={stat}
                theme={theme}
                reducedMotion={reducedMotion}
                labelAnchor={labels.anchors.get(c.key)!}
                replyMinutes={replyOf(c.key)}
              />
            ) : null;
          })}
          <LeadsDock count={leadsToday} theme={theme} />
          {insights && <HourSkyline insights={insights} theme={theme} />}
          <MessageTraffic theme={theme} reducedMotion={reducedMotion} />
          <AmbientTraffic reducedMotion={reducedMotion} />
        </Suspense>

        <OrbitControls
          makeDefault
          enablePan={false}
          enableDamping
          minDistance={9}
          maxDistance={26}
          minPolarAngle={0.45}
          maxPolarAngle={1.2}
          target={[0, 0.9, 0.9]}
        />

        {/* Last: runs after the shops have moved their anchors */}
        <LabelProjector registry={labels} />

        {/* Tilt-shift: sharp band through the middle, soft blur top and bottom = tabletop miniature */}
        <EffectComposer multisampling={4}>
          <TiltShift2 blur={0.12} taper={0.6} start={[0.5, 0.25]} end={[0.5, 0.75]} />
          <Vignette offset={0.3} darkness={theme.dark ? 0.55 : 0.35} />
        </EffectComposer>
      </Canvas>

      {/* Label layer (DOM), positioned by LabelProjector */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          ref={registerLabel(INBOX_LABEL)}
          className="invisible absolute left-0 top-0 whitespace-nowrap rounded-full bg-primary px-3 py-1 text-[12px] font-semibold text-on-primary shadow-sm"
        >
          Inbox
          <span className="ml-1.5 tabular-nums opacity-80">
            {data.unread > 0
              ? `${data.unread.toLocaleString("en-IN")} unread`
              : `${data.openConversations.toLocaleString("en-IN")} open`}
          </span>
        </div>
        <div
          ref={registerLabel(DOCK_LABEL)}
          data-tour="city-dock"
          className={`invisible absolute left-0 top-0 flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[12px] font-medium shadow-sm transition-colors ${
            selected === "LEADS" || hovered === "LEADS"
              ? "border-transparent bg-on-surface text-surface"
              : "border-outline-variant bg-surface-container-lowest/90 text-on-surface"
          }`}
        >
          <span className="size-2 rounded-full bg-primary" aria-hidden />
          Leads today
          <span className="tabular-nums opacity-70">{leadsToday.toLocaleString("en-IN")}</span>
        </div>
        {CITY_CHANNELS.map((c) => {
          const stat = data.channels.find((s) => s.key === c.key);
          if (!stat) return null;
          const active = selected === c.key || hovered === c.key;
          return (
            <div
              key={c.key}
              ref={registerLabel(c.key)}
              data-tour="city-building"
              className={`invisible absolute left-0 top-0 flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[12px] font-medium shadow-sm transition-colors ${
                active
                  ? "border-transparent bg-on-surface text-surface"
                  : "border-outline-variant bg-surface-container-lowest/90 text-on-surface"
              }`}
            >
              <span className="size-2 rounded-full" style={{ background: `var(${c.colorVar})` }} aria-hidden />
              {c.label}
              <span className="tabular-nums opacity-70">{totalOf(stat).toLocaleString("en-IN")}</span>
              {replyOf(c.key) !== null && (
                <span className="tabular-nums opacity-70">· {formatMinutes(replyOf(c.key)!)} reply</span>
              )}
            </div>
          );
        })}
      </div>

      <CityHud insights={insights} waiting={waiting} leadsToday={leadsToday} />
      <LoadingOverlay />
    </div>
  );
}
