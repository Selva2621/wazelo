"use client";

import type { ComponentProps } from "react";
import { Clone, useGLTF } from "@react-three/drei";
import { ALL_MODELS } from "./city-config";

type GroupProps = Omit<ComponentProps<typeof Clone>, "object">;

/** One Kenney model, cloned so it can appear many times; casts and receives shadows. */
export function TownModel({ url, ...props }: { url: string } & GroupProps) {
  const { scene } = useGLTF(url);
  return <Clone object={scene} castShadow receiveShadow {...props} />;
}

/** Start fetching every model as soon as the scene module loads */
export function preloadTown() {
  ALL_MODELS.forEach((url) => useGLTF.preload(url));
}
