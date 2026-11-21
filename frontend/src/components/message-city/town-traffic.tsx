"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { channelConfig, LEADS_DOCK, model, RING, VEHICLE_SCALE } from "./city-config";
import { TownModel } from "./town-model";
import { useCityStore } from "./use-city-store";
import type { CityTheme } from "./use-city-theme";

const SLOTS = 8;
const SPEED = 0.9; // units per second: slow enough to follow with the eye
const PI = Math.PI;

interface Trip {
  active: boolean;
  points: THREE.Vector3[];
  /** Cumulative distance at each point */
  dist: number[];
  travelled: number;
}

const emptyTrip = (): Trip => ({ active: false, points: [], dist: [], travelled: 0 });

/**
 * Message traffic: a van brings each new customer message from its channel's shop
 * to the Inbox HQ; a delivery truck takes each reply back out. A coloured bubble
 * above the vehicle shows the channel.
 */
export function MessageTraffic({ theme, reducedMotion }: { theme: CityTheme; reducedMotion: boolean }) {
  const invalidate = useThree((s) => s.invalidate);
  const trips = useRef<Trip[]>([]);
  const groups = useRef<(THREE.Group | null)[]>([]);
  const vans = useRef<(THREE.Group | null)[]>([]);
  const trucks = useRef<(THREE.Group | null)[]>([]);
  const bubbles = useRef<(THREE.MeshBasicMaterial | null)[]>([]);
  const tmp = useMemo(() => ({ p: new THREE.Vector3(), d: new THREE.Vector3() }), []);

  useEffect(() => {
    trips.current = Array.from({ length: SLOTS }, emptyTrip);
  }, []);

  // Wake the render loop when a message arrives while the scene is idle
  useEffect(
    () =>
      useCityStore.subscribe((s) => {
        if (s.pending.length) invalidate();
      }),
    [invalidate],
  );

  useFrame((state, dt) => {
    const all = trips.current;
    if (!all.length) return;
    const incoming = useCityStore.getState().drainPackets();

    if (!reducedMotion) {
      for (const pk of incoming) {
        const slot = all.findIndex((t) => !t.active);
        if (slot < 0) break;
        // A new lead: a delivery truck drives in off the ring road to the dock
        const isLead = pk.channel === "LEADS";
        const base = pk.channel === "LEADS" ? LEADS_DOCK.route : channelConfig(pk.channel).route;
        const route = isLead || pk.direction === "in" ? base : [...base].reverse();
        const points = route.map(([x, z]) => new THREE.Vector3(x, 0, z));
        const dist = [0];
        for (let i = 1; i < points.length; i++) dist.push(dist[i - 1] + points[i].distanceTo(points[i - 1]));
        all[slot] = { active: true, points, dist, travelled: 0 };
        const van = vans.current[slot];
        const truck = trucks.current[slot];
        if (van) van.visible = !isLead && pk.direction === "in";
        if (truck) truck.visible = isLead || pk.direction === "out";
        bubbles.current[slot]?.color.set(
          pk.channel === "LEADS" ? theme.primary : theme.chart[channelConfig(pk.channel).colorVar],
        );
      }
    }

    let moving = false;
    for (let i = 0; i < SLOTS; i++) {
      const trip = all[i];
      const g = groups.current[i];
      if (!g) continue;
      if (!trip.active) {
        g.visible = false;
        continue;
      }
      trip.travelled += Math.min(dt, 0.1) * SPEED;
      const total = trip.dist[trip.dist.length - 1];
      if (trip.travelled >= total) {
        trip.active = false;
        g.visible = false;
        continue;
      }
      moving = true;
      // Find the segment we're on
      let seg = 1;
      while (seg < trip.dist.length - 1 && trip.dist[seg] < trip.travelled) seg++;
      const a = trip.points[seg - 1];
      const b = trip.points[seg];
      const f = (trip.travelled - trip.dist[seg - 1]) / Math.max(trip.dist[seg] - trip.dist[seg - 1], 1e-6);
      tmp.p.copy(a).lerp(b, f);
      tmp.d.copy(b).sub(a);
      g.position.copy(tmp.p);
      g.rotation.y = Math.atan2(tmp.d.x, tmp.d.z);
      // Pop in at the start, shrink away on arrival
      const edge = Math.min(trip.travelled, total - trip.travelled);
      g.scale.setScalar(Math.min(1, edge / 0.25));
      g.visible = true;
    }
    if (moving) state.invalidate();
  });

  return (
    <>
      {Array.from({ length: SLOTS }, (_, i) => (
        <group
          key={i}
          visible={false}
          ref={(el) => {
            groups.current[i] = el;
          }}
        >
          <group
            ref={(el) => {
              vans.current[i] = el;
            }}
          >
            <TownModel url={model("cars", "van")} scale={VEHICLE_SCALE} />
          </group>
          <group
            visible={false}
            ref={(el) => {
              trucks.current[i] = el;
            }}
          >
            <TownModel url={model("cars", "delivery")} scale={VEHICLE_SCALE} />
          </group>
          {/* Message bubble in the channel colour */}
          <mesh position={[0, 0.62, 0]}>
            <sphereGeometry args={[0.11, 16, 12]} />
            <meshBasicMaterial
              toneMapped={false}
              ref={(el) => {
                bubbles.current[i] = el;
              }}
            />
          </mesh>
        </group>
      ))}
    </>
  );
}

/** A closed lane around the ring road (rounded corners), offset from the road centre */
function ringLane(offset: number, clockwise: boolean) {
  const r = RING + offset;
  const c = 0.35; // corner rounding
  const pts: [number, number][] = [
    [r - c, r], [r, r - c], [r, -r + c], [r - c, -r], [-r + c, -r], [-r, -r + c], [-r, r - c], [-r + c, r],
  ];
  const ordered = clockwise ? pts : [...pts].reverse();
  return new THREE.CatmullRomCurve3(ordered.map(([x, z]) => new THREE.Vector3(x, 0, z)), true, "centripetal");
}

/** Everyday traffic: two cars looping the ring road, so the town never looks frozen */
export function AmbientTraffic({ reducedMotion }: { reducedMotion: boolean }) {
  const cars = useRef<(THREE.Group | null)[]>([]);
  const lanes = useMemo(
    () => [
      { curve: ringLane(0.2, true), speed: 0.032, offset: 0, url: model("cars", "taxi") },
      { curve: ringLane(-0.2, false), speed: 0.026, offset: 0.5, url: model("cars", "sedan") },
    ],
    [],
  );
  const tmp = useMemo(() => ({ p: new THREE.Vector3(), t: new THREE.Vector3() }), []);

  useFrame((state) => {
    if (reducedMotion) return;
    const time = state.clock.elapsedTime;
    lanes.forEach((lane, i) => {
      const car = cars.current[i];
      if (!car) return;
      const u = (lane.offset + time * lane.speed) % 1;
      lane.curve.getPointAt(u, tmp.p);
      lane.curve.getTangentAt(u, tmp.t);
      car.position.copy(tmp.p);
      car.rotation.y = Math.atan2(tmp.t.x, tmp.t.z);
    });
    state.invalidate();
  });

  return (
    <>
      {lanes.map((lane, i) => (
        <group
          key={lane.url}
          position={i === 0 ? [RING + 0.2, 0, 0] : [-(RING - 0.2), 0, 0]}
          rotation-y={i === 0 ? PI : 0}
          ref={(el) => {
            cars.current[i] = el;
          }}
        >
          <TownModel url={lane.url} scale={VEHICLE_SCALE} />
        </group>
      ))}
    </>
  );
}
