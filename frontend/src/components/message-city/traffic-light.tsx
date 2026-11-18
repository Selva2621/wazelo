"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { replyLevel } from "./city-config";
import type { CityTheme } from "./use-city-theme";

const LAMP_Y = { slow: 0.62, ok: 0.5, fast: 0.38 } as const;

/**
 * A street traffic light showing how fast this channel is answered today:
 * green under 5 min, amber under 30 min, red slower, all dark when nothing was answered.
 * The shop label and panel always say it in words too.
 */
export function TrafficLight({ replyMinutes, theme }: { replyMinutes: number | null; theme: CityTheme }) {
  const level = replyLevel(replyMinutes);
  const colors = useMemo(
    () => ({
      slow: new THREE.Color(theme.error),
      ok: new THREE.Color(theme.warning),
      fast: new THREE.Color(theme.success),
      off: new THREE.Color("#2b2f36"),
    }),
    [theme.error, theme.warning, theme.success],
  );

  return (
    <group>
      {/* Pole */}
      <mesh position={[0, 0.22, 0]} castShadow>
        <cylinderGeometry args={[0.018, 0.022, 0.44, 8]} />
        <meshStandardMaterial color="#5b6370" />
      </mesh>
      {/* Housing */}
      <mesh position={[0, 0.5, 0]} castShadow>
        <boxGeometry args={[0.1, 0.36, 0.08]} />
        <meshStandardMaterial color="#1f2329" roughness={0.6} />
      </mesh>
      {(["slow", "ok", "fast"] as const).map((lamp) => {
        const on = lamp === level;
        return (
          <mesh key={lamp} position={[0, LAMP_Y[lamp], 0.042]}>
            <sphereGeometry args={[0.032, 12, 10]} />
            <meshStandardMaterial
              color={on ? colors[lamp] : colors.off}
              emissive={on ? colors[lamp] : colors.off}
              emissiveIntensity={on ? 2.2 : 0}
              toneMapped={!on}
            />
          </mesh>
        );
      })}
    </group>
  );
}
