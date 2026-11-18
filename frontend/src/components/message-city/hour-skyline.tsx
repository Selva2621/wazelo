"use client";

import { useMemo } from "react";
import * as THREE from "three";
import type { CityInsightsResponse } from "@/lib/types/analytics";
import { useCityStore } from "./use-city-store";
import type { CityTheme } from "./use-city-theme";

/** Along the board's front edge, between the tree line and the rim */
const Z = 5.22;
const X0 = -4.6;
const STEP = 0.4;
const WIDTH = 0.26;
const MAX_H = 0.65;
const MIN_H = 0.04;

const totalAt = (insights: CityInsightsResponse, day: "today" | "yesterday", h: number) =>
  insights.channels.reduce((n, c) => n + c[day][h].in + c[day][h].out, 0);

/**
 * A 24-hour skyline of today's messages: one bar per local hour (solid = today,
 * faded = yesterday). The current hour glows; hover a bar for its numbers in the HUD.
 */
export function HourSkyline({ insights, theme }: { insights: CityInsightsResponse; theme: CityTheme }) {
  const hoveredHour = useCityStore((s) => s.hoveredHour);
  const hoverHour = useCityStore((s) => s.hoverHour);
  const today = useMemo(() => Array.from({ length: 24 }, (_, h) => totalAt(insights, "today", h)), [insights]);
  const yesterday = useMemo(() => Array.from({ length: 24 }, (_, h) => totalAt(insights, "yesterday", h)), [insights]);
  const max = Math.max(1, ...today, ...yesterday);
  const height = (v: number) => MIN_H + (v / max) * MAX_H;

  const colors = useMemo(
    () => ({ today: new THREE.Color(theme.primary), ghost: new THREE.Color(theme.onSurface) }),
    [theme.primary, theme.onSurface],
  );

  return (
    <group>
      {/* A slim base strip so the bars read as one chart */}
      <mesh position={[X0 + (23 * STEP) / 2, 0.006, Z]} rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[24 * STEP + 0.1, 0.42]} />
        <meshStandardMaterial color={theme.dark ? "#2b2f36" : "#d9dde3"} roughness={1} />
      </mesh>

      {today.map((v, h) => {
        const x = X0 + h * STEP;
        const future = h > insights.currentHour;
        const isNow = h === insights.currentHour;
        const isHover = h === hoveredHour;
        const hy = height(yesterday[h]);
        const ht = height(v);
        return (
          <group key={h} position={[x, 0, Z]}>
            {/* Yesterday: a faded bar just behind */}
            <mesh position={[0, hy / 2, -0.12]}>
              <boxGeometry args={[WIDTH, hy, 0.1]} />
              <meshBasicMaterial color={colors.ghost} transparent opacity={isHover ? 0.35 : 0.16} depthWrite={false} />
            </mesh>
            {/* Today (nothing yet for hours still to come) */}
            {!future && (
              <mesh position={[0, ht / 2, 0.02]} castShadow>
                <boxGeometry args={[WIDTH, ht, 0.16]} />
                <meshStandardMaterial
                  color={colors.today}
                  emissive={colors.today}
                  emissiveIntensity={isNow ? 0.9 : isHover ? 0.5 : 0.12}
                  roughness={0.5}
                />
              </mesh>
            )}
            {/* Hit target: bigger than the bar, so thin hours are easy to point at */}
            <mesh
              position={[0, MAX_H / 2, -0.04]}
              onPointerOver={(e) => {
                e.stopPropagation();
                hoverHour(h);
                document.body.style.cursor = "default";
              }}
              onPointerOut={() => hoverHour(null)}
            >
              <boxGeometry args={[STEP, MAX_H + 0.2, 0.4]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

/** Today / yesterday totals for one hour (used by the HUD tooltip) */
export function hourTotals(insights: CityInsightsResponse, h: number) {
  return { today: totalAt(insights, "today", h), yesterday: totalAt(insights, "yesterday", h) };
}
