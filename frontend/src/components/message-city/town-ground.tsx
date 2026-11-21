"use client";

import { memo } from "react";
import { RoundedBox } from "@react-three/drei";
import { BASE_HALF, model, RING, type Vec2 } from "./city-config";
import { TownModel } from "./town-model";

const PI = Math.PI;

/** Road tiles run along z; this turns a tile to run along x */
const ALONG_X = PI / 2;
/** Bend tile rotation for the corner at (+RING, +RING); the others turn by 90° steps */
const BEND_BASE = PI;

interface Placed {
  url: string;
  at: Vec2;
  rot?: number;
  scale?: number;
}

/** Faces the plaza from position p (models face +z) */
const faceCenter = ([x, z]: Vec2) => Math.atan2(-x, -z);

function buildLayout(): Placed[] {
  const out: Placed[] = [];

  // Plaza: 3×3 paving around the HQ
  for (let x = -1; x <= 1; x++)
    for (let z = -1; z <= 1; z++) out.push({ url: model("roads", "tile-low"), at: [x, z] });

  // Ring road
  for (let x = -RING; x <= RING; x++)
    for (let z = -RING; z <= RING; z++) {
      if (Math.max(Math.abs(x), Math.abs(z)) !== RING) continue;
      const corner = Math.abs(x) === RING && Math.abs(z) === RING;
      if (corner) {
        // (+,+) base; (−,+) +90°; (−,−) +180°; (+,−) +270°
        const quadrant = x > 0 ? (z > 0 ? 0 : 3) : z > 0 ? 1 : 2;
        out.push({ url: model("roads", "road-bend"), at: [x, z], rot: BEND_BASE + (quadrant * PI) / 2 });
      } else {
        out.push({ url: model("roads", "road-straight"), at: [x, z], rot: Math.abs(z) === RING ? ALONG_X : 0 });
      }
    }

  // Street lamps at the plaza corners, facing the road
  for (const [x, z] of [[1.45, 1.45], [-1.45, 1.45], [-1.45, -1.45], [1.45, -1.45]] as Vec2[])
    out.push({ url: model("roads", "light-curved"), at: [x, z], rot: Math.atan2(x, z) });

  // Plaza life: parasols and planters
  out.push({ url: model("commercial", "detail-parasol-a"), at: [0.95, 0.95] });
  out.push({ url: model("commercial", "detail-parasol-b"), at: [-0.95, 0.95] });
  out.push({ url: model("suburban", "planter"), at: [0.95, -0.95] });
  out.push({ url: model("suburban", "planter"), at: [-0.95, -0.95] });

  // Houses between the shops, all facing the square
  const houses = ["building-type-a", "building-type-c", "building-type-h", "building-type-m", "building-type-q"];
  const homeSpots: Vec2[] = [
    [1.9, 3.15], [-1.9, 3.15], [3.15, 1.9], [3.15, -1.9],
    [1.9, -3.15], [-1.9, -3.15], [-3.15, 1.9], [-3.15, -1.9],
  ];
  homeSpots.forEach((at, i) =>
    out.push({ url: model("suburban", houses[i % houses.length]), at, rot: faceCenter(at), scale: 0.82 }),
  );

  // Little parks on the two free corners (the front-right corner is the leads dock)
  for (const [x, z] of [[3.3, -3.3], [-3.3, 3.3]] as Vec2[]) {
    out.push({ url: model("nature", "tree_oak"), at: [x, z], scale: 0.55 });
    out.push({ url: model("nature", "plant_bushDetailed"), at: [x - 0.45 * Math.sign(x), z], scale: 0.6 });
    out.push({ url: model("nature", "flower_redA"), at: [x, z - 0.45 * Math.sign(z)], scale: 0.9 });
    out.push({ url: model("nature", "flower_yellowA"), at: [x - 0.3 * Math.sign(x), z - 0.5 * Math.sign(z)], scale: 0.9 });
  }

  // Outer edge: a ring of trees, bushes and fences (deterministic, no randomness between renders)
  const trees = [model("nature", "tree_default"), model("nature", "tree_detailed"), model("suburban", "tree-large"), model("nature", "tree_oak")];
  const edge = 4.75;
  let i = 0;
  for (let t = -edge; t <= edge + 0.01; t += 0.95) {
    for (const at of [[t, edge], [t, -edge], [edge, t], [-edge, t]] as Vec2[]) {
      i++;
      if (i % 5 === 0) {
        out.push({ url: model("nature", "plant_bushDetailed"), at, scale: 0.65 });
      } else if (i % 7 === 0) {
        out.push({ url: model("suburban", "fence-1x3"), at, rot: Math.abs(at[1]) === edge ? 0 : ALONG_X, scale: 0.8 });
      } else {
        const url = trees[i % trees.length];
        out.push({ url, at, scale: url.includes("/suburban/") ? 1.3 : 0.5, rot: (i * 1.7) % (2 * PI) });
      }
    }
  }

  return out;
}

/** Fixed town plan, built once */
const LAYOUT = buildLayout();

/** The static diorama: base, plaza, roads, homes and greenery */
export const TownGround = memo(function TownGround({ dark }: { dark: boolean }) {
  const layout = LAYOUT;

  return (
    <group>
      {/* Tabletop base: soil block with a grass top, like a model-railway board */}
      <RoundedBox
        args={[BASE_HALF * 2 + 0.4, 0.7, BASE_HALF * 2 + 0.4]}
        radius={0.18}
        smoothness={3}
        position={[0, -0.36, 0]}
        receiveShadow
      >
        <meshStandardMaterial color={dark ? "#4a3a2c" : "#8a6a4c"} roughness={0.95} />
      </RoundedBox>
      <mesh rotation-x={-PI / 2} position={[0, -0.005, 0]} receiveShadow>
        <planeGeometry args={[BASE_HALF * 2, BASE_HALF * 2]} />
        <meshStandardMaterial color={dark ? "#3f6b3a" : "#7fb35f"} roughness={1} />
      </mesh>

      {layout.map((p, idx) => (
        <TownModel
          key={idx}
          url={p.url}
          position={[p.at[0], 0, p.at[1]]}
          rotation-y={p.rot ?? 0}
          scale={p.scale ?? 1}
        />
      ))}
    </group>
  );
});
