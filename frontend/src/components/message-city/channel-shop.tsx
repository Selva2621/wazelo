"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import type { LiveChannelStat } from "@/lib/types/analytics";
import { shopTier, totalOf, type CityChannel } from "./city-config";
import { TownModel } from "./town-model";
import { TrafficLight } from "./traffic-light";
import { useCityStore } from "./use-city-store";
import type { CityTheme } from "./use-city-theme";

interface Props {
  channel: CityChannel;
  stat: LiveChannelStat;
  theme: CityTheme;
  reducedMotion: boolean;
  /** World point the DOM label follows (kept above the roof) */
  labelAnchor: THREE.Vector3;
  /** Average first-reply minutes today (drives the traffic light) */
  replyMinutes: number | null;
}

const LOT = 1.45;

/** One channel = one shop on the square. More messages today → a taller building. */
export function ChannelShop({ channel, stat, theme, reducedMotion, labelAnchor, replyMinutes }: Props) {
  const building = useRef<THREE.Group>(null);
  const grow = useRef(1);
  const total = totalOf(stat);
  const tier = shopTier(total);

  const isSelected = useCityStore((s) => s.selected === channel.key);
  const isHovered = useCityStore((s) => s.hovered === channel.key);
  const select = useCityStore((s) => s.select);
  const hover = useCityStore((s) => s.hover);
  const active = isSelected || isHovered;

  const accent = theme.chart[channel.colorVar];
  const lotColor = useMemo(() => new THREE.Color(accent), [accent]);

  // A new tier "builds up" from 60% height
  useEffect(() => {
    if (!reducedMotion) grow.current = 0.6;
  }, [tier.model, reducedMotion]);

  useFrame((state, dt) => {
    const g = grow.current;
    const next = g >= 0.999 ? 1 : THREE.MathUtils.damp(g, 1, 5, dt);
    grow.current = next;
    // Selected shop lifts a touch, like picking up a model piece
    const lift = isSelected && !reducedMotion ? 0.08 : 0;
    if (building.current) {
      building.current.scale.y = next;
      building.current.position.y = THREE.MathUtils.damp(building.current.position.y, lift, 8, dt);
    }
    labelAnchor.set(channel.position[0], tier.height * next + lift + 0.35, channel.position[1]);
    if (next !== 1 || Math.abs((building.current?.position.y ?? 0) - lift) > 0.001) state.invalidate();
  });

  return (
    <group
      position={[channel.position[0], 0, channel.position[1]]}
      rotation-y={channel.facing}
      onPointerOver={(e) => {
        e.stopPropagation();
        hover(channel.key);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        hover(null);
        document.body.style.cursor = "";
      }}
      onClick={(e) => {
        e.stopPropagation();
        select(isSelected ? null : channel.key);
      }}
    >
      {/* The shop's lot, painted in the channel colour */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.012, 0]} receiveShadow>
        <planeGeometry args={[LOT, LOT]} />
        <meshStandardMaterial
          color={lotColor}
          emissive={lotColor}
          emissiveIntensity={active ? 0.55 : 0.12}
          roughness={0.8}
          transparent
          opacity={active ? 0.95 : 0.7}
        />
      </mesh>

      <group ref={building}>
        <TownModel url={tier.model} />
      </group>

      {/* Reply-speed traffic light on the lot's front corner, facing the square */}
      <group position={[0.62, 0, 0.62]}>
        <TrafficLight replyMinutes={replyMinutes} theme={theme} />
      </group>
    </group>
  );
}
