"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";

/**
 * Labels are plain DOM over the canvas (one layer, no React root per label).
 * Scene objects write their label's world position into `anchors`; the projector
 * moves each label element to that point on screen every rendered frame.
 */
export interface LabelRegistry {
  anchors: Map<string, THREE.Vector3>;
  elements: Map<string, HTMLElement>;
}

export function createLabelRegistry(): LabelRegistry {
  return { anchors: new Map(), elements: new Map() };
}

/** Mount inside <Canvas>, after the objects that move their anchors. */
export function LabelProjector({ registry }: { registry: LabelRegistry }) {
  const size = useThree((s) => s.size);
  const v = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ camera }) => {
    registry.elements.forEach((el, id) => {
      const anchor = registry.anchors.get(id);
      if (!anchor) return;
      v.copy(anchor).project(camera);
      const behind = v.z > 1;
      el.style.visibility = behind ? "hidden" : "visible";
      if (behind) return;
      const x = ((v.x + 1) / 2) * size.width;
      const y = ((1 - v.y) / 2) * size.height;
      const dist = camera.position.distanceTo(anchor);
      const scale = THREE.MathUtils.clamp(18 / dist, 0.75, 1.15);
      el.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px) scale(${scale})`;
      // Nearer labels on top
      el.style.zIndex = String(Math.round(1000 - dist * 10));
    });
  });

  return null;
}
