"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { HQ_HEIGHT, HQ_MODEL, HQ_SCALE } from "./city-config";
import { TownModel } from "./town-model";
import { useCityStore } from "./use-city-store";
import type { CityTheme } from "./use-city-theme";

/** World point for the HQ's DOM label */
export const HQ_LABEL_POSITION = new THREE.Vector3(0, HQ_HEIGHT + 0.7, 0);

/** The Inbox HQ in the middle of the square. Its rooftop beacon pulses while chats are unread. */
export function InboxHq({ unread, theme, reducedMotion }: { unread: number; theme: CityTheme; reducedMotion: boolean }) {
  const beacon = useRef<THREE.MeshStandardMaterial>(null);
  const select = useCityStore((s) => s.select);
  const glow = useMemo(() => new THREE.Color(theme.primary), [theme.primary]);
  const pulsing = unread > 0 && !reducedMotion;

  useFrame((state) => {
    if (!beacon.current) return;
    beacon.current.emissiveIntensity = pulsing
      ? 1.2 + Math.sin(state.clock.elapsedTime * 3) * 0.8
      : unread > 0
        ? 1.6
        : 0.4;
    if (pulsing) state.invalidate();
  });

  return (
    <group onClick={(e) => (e.stopPropagation(), select(null))}>
      <TownModel url={HQ_MODEL} scale={HQ_SCALE} />
      {/* Rooftop beacon */}
      <mesh position={[0, HQ_HEIGHT + 0.12, 0]} castShadow>
        <cylinderGeometry args={[0.025, 0.025, 0.24, 8]} />
        <meshStandardMaterial color="#9aa3ad" />
      </mesh>
      <mesh position={[0, HQ_HEIGHT + 0.28, 0]}>
        <sphereGeometry args={[0.09, 16, 12]} />
        <meshStandardMaterial ref={beacon} color={glow} emissive={glow} emissiveIntensity={0.4} toneMapped={false} />
      </mesh>
    </group>
  );
}
