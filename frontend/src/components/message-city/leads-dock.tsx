"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { LEADS_DOCK } from "./city-config";
import { useCityStore } from "./use-city-store";
import type { CityTheme } from "./use-city-theme";

const BOX = 0.2;
const MAX_BOXES = 24;
/** Stack layout: 4 across, 3 deep, then the next layer */
const COLS = 4;
const ROWS = 3;

/** Label anchor above the dock canopy */
export const DOCK_LABEL_POSITION = new THREE.Vector3(LEADS_DOCK.position[0], 1.25, LEADS_DOCK.position[1]);

/**
 * The leads dock: a loading platform under a canopy. Every lead today is a
 * parcel on the stack; click the dock for today's list.
 */
export function LeadsDock({ count, theme }: { count: number; theme: CityTheme }) {
  const isSelected = useCityStore((s) => s.selected === "LEADS");
  const isHovered = useCityStore((s) => s.hovered === "LEADS");
  const select = useCityStore((s) => s.select);
  const hover = useCityStore((s) => s.hover);
  const active = isSelected || isHovered;
  const accent = useMemo(() => new THREE.Color(theme.primary), [theme.primary]);

  const boxes = useMemo(() => {
    const out: [number, number, number][] = [];
    const n = Math.min(count, MAX_BOXES);
    for (let i = 0; i < n; i++) {
      const layer = Math.floor(i / (COLS * ROWS));
      const r = Math.floor((i % (COLS * ROWS)) / COLS);
      const c = i % COLS;
      out.push([(c - (COLS - 1) / 2) * (BOX + 0.03), 0.2 + BOX / 2 + layer * BOX, (r - (ROWS - 1) / 2) * (BOX + 0.03) - 0.1]);
    }
    return out;
  }, [count]);

  return (
    <group
      position={[LEADS_DOCK.position[0], 0, LEADS_DOCK.position[1]]}
      rotation-y={LEADS_DOCK.facing}
      onPointerOver={(e) => {
        e.stopPropagation();
        hover("LEADS");
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        hover(null);
        document.body.style.cursor = "";
      }}
      onClick={(e) => {
        e.stopPropagation();
        select(isSelected ? null : "LEADS");
      }}
    >
      {/* Concrete loading platform with a yellow safety edge */}
      <mesh position={[0, 0.1, -0.1]} castShadow receiveShadow>
        <boxGeometry args={[1.45, 0.2, 1.1]} />
        <meshStandardMaterial color={theme.dark ? "#8d939b" : "#c9ced4"} roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.201, 0.43]} receiveShadow>
        <boxGeometry args={[1.45, 0.005, 0.06]} />
        <meshStandardMaterial color="#f2c230" />
      </mesh>

      {/* Canopy on four posts, painted in the brand colour (glows when picked) */}
      {[
        [-0.66, -0.6],
        [0.66, -0.6],
        [-0.66, 0.4],
        [0.66, 0.4],
      ].map(([x, z]) => (
        <mesh key={`${x}${z}`} position={[x, 0.55, z]} castShadow>
          <cylinderGeometry args={[0.025, 0.025, 0.9, 8]} />
          <meshStandardMaterial color="#6b7280" />
        </mesh>
      ))}
      <mesh position={[0, 1.02, -0.1]} rotation-x={-0.08} castShadow>
        <boxGeometry args={[1.6, 0.05, 1.25]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={active ? 0.5 : 0.08} />
      </mesh>

      {/* Today's leads, one parcel each */}
      {boxes.map((p, i) => (
        <group key={i} position={p}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[BOX, BOX, BOX]} />
            <meshStandardMaterial color={i % 3 === 0 ? "#c79a62" : "#d2a873"} roughness={0.85} />
          </mesh>
          {/* Packing tape */}
          <mesh position={[0, BOX / 2 + 0.001, 0]}>
            <boxGeometry args={[BOX * 0.25, 0.002, BOX * 1.01]} />
            <meshStandardMaterial color="#e8dcc4" />
          </mesh>
        </group>
      ))}
    </group>
  );
}
