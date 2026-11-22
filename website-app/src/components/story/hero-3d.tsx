"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Environment, Html, Lightformer, RoundedBox, useGLTF, useProgress, useTexture, useVideoTexture } from "@react-three/drei";
import { DepthOfField, EffectComposer, SMAA, ToneMapping, Vignette } from "@react-three/postprocessing";
import { ToneMappingMode, type DepthOfFieldEffect } from "postprocessing";
import * as THREE from "three";
import { HERO_STEPS, type HeroDevice } from "./hero-steps";
import { useMediaSuffix, useStoryPrice } from "./story-media";

/**
 * Real-time version of the Blender hero (demo/blender-hero/build_scene.py), desktop only.
 * A team office table with three devices playing the real Wazelo app. The scene tells the
 * story in four steps (HERO_STEPS): at each one the camera glides to that device and pulls
 * focus onto it, so its real screen is readable, while a small tag says what is happening.
 * Visitors can click a device (or the step chips) to jump; the mouse adds gentle parallax.
 * Coordinates are the Blender ones converted to Y-up: (x, y, z)_blender -> (x, z, -y).
 */

const TOP = 0.75;
const deg = (d: number) => (d * Math.PI) / 180;
const M = "/media/hero3d";
const PHONE = new THREE.Vector3(-0.21, TOP, 0.0);
// Phone clip timeline (seconds): the lead lands at ~1.1, the "accepted" banner at ~7.9.
const PHONE_FROM = { lead: 0.5, won: 7.3, holdBefore: 7.2, banner: 7.9 };

// Screen centres of the three devices (world space) and where to frame each one from.
const CENTRE: Record<HeroDevice, THREE.Vector3> = {
  phone: new THREE.Vector3(PHONE.x, 0.84, PHONE.z),
  laptop: new THREE.Vector3(0.37, 0.867, -0.126),
  monitor: new THREE.Vector3(1.27, 1.07, -0.32),
};
const DIST: Record<HeroDevice, number> = { phone: 0.62, laptop: 0.9, monitor: 1.8 };
// Push-in: after PUSH_AFTER seconds on a step the camera glides this close to the detail.
const PUSH_AFTER = 1.1;
const PUSH: Record<HeroDevice, number> = { phone: 0.46, laptop: 0.58, monitor: 1.08 };
// While pushed in, keep the detail further right so the bright screen stays off the headline.
const PUSH_OFF: Record<HeroDevice, number> = { phone: 0.14, laptop: 0.2, monitor: 0.25 };
// How far right of centre each device sits (fraction of distance), clear of the headline.
const OFF: Record<HeroDevice, number> = { phone: 0.12, laptop: 0.12, monitor: 0.13 };
// Depth (metres) kept sharp around the focused device: enough for its whole screen.
// Wide enough that the whole active screen (angled away from the camera) stays sharp; only
// the desk and room behind fall out of focus.
const RANGE: Record<HeroDevice, number> = { phone: 0.3, laptop: 0.7, monitor: 1.0 };
const LIFT: Record<HeroDevice, number> = { phone: 0.0, laptop: 0.06, monitor: 0.02 };
const TAG_Y: Record<HeroDevice, number> = { phone: 0.1, laptop: 0.12, monitor: 0.21 };

function Screen({
  src,
  w,
  h,
  dim = 0.92,
  loop = true,
  onVideo,
}: {
  src: string;
  w: number;
  h: number;
  dim?: number;
  loop?: boolean;
  onVideo?: (v: HTMLVideoElement) => void;
}) {
  const tex = useVideoTexture(src, { muted: true, loop, start: true, playsInline: true });
  useEffect(() => {
    tex.colorSpace = THREE.SRGBColorSpace;
    // Mipmaps + anisotropy: app text shrinks cleanly at an angle instead of shimmering.
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.anisotropy = 16;
    tex.needsUpdate = true;
    onVideo?.(tex.image as HTMLVideoElement);
  }, [tex, onVideo]);
  return (
    <mesh>
      <planeGeometry args={[w, h]} />
      <meshBasicMaterial map={tex} toneMapped={false} color={[dim, dim, dim]} onBeforeCompile={sharpenMap} />
    </mesh>
  );
}

/**
 * App text on the screens is drawn much smaller than it was recorded, so the GPU samples a
 * pre-shrunk (blurrier) mip level. A -1 LOD bias picks the next sharper level: crisp text,
 * still filtered (no shimmer).
 */
function sharpenMap(shader: { fragmentShader: string }) {
  shader.fragmentShader = shader.fragmentShader.replace(
    "vec4 sampledDiffuseColor = texture2D( map, vMapUv );",
    "vec4 sampledDiffuseColor = texture2D( map, vMapUv, -1.0 );",
  );
}

/** Placeholder screen while a recording streams in: the app's light background, softly lit. */
function BlankScreen({ w, h }: { w: number; h: number }) {
  return (
    <mesh>
      <planeGeometry args={[w, h]} />
      <meshBasicMaterial color="#e6eaef" toneMapped={false} />
    </mesh>
  );
}

const alu = { color: "#b9bcc2", metalness: 1, roughness: 0.3 };
const dark = { color: "#3b3c40", metalness: 1, roughness: 0.35 };
const black = { color: "#0b0b0c", roughness: 0.3 };

function Laptop({
  position,
  rotY,
  src,
  still,
  onVideo,
  detail,
  live = false,
}: {
  position: [number, number, number];
  rotY: number;
  src?: string;
  still?: string;
  onVideo?: (v: HTMLVideoElement) => void;
  detail?: React.Ref<THREE.Group>;
  /** Load the screen content (after the first frame is up). */
  live?: boolean;
}) {
  return (
    <group position={position} rotation={[0, rotY, 0]}>
      <RoundedBox args={[0.312, 0.011, 0.218]} radius={0.003} position={[0, 0.0055, 0]} castShadow receiveShadow>
        <meshStandardMaterial {...alu} />
      </RoundedBox>
      <mesh position={[0, 0.0112, -0.02]}>
        <boxGeometry args={[0.268, 0.001, 0.092]} />
        <meshStandardMaterial color="#1b1c1f" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.0112, 0.065]}>
        <boxGeometry args={[0.11, 0.0008, 0.07]} />
        <meshStandardMaterial {...dark} />
      </mesh>
      {/* Lid, hinged at the back edge, opened to 108 degrees */}
      <group position={[0, 0.011, -0.109]} rotation={[deg(-18), 0, 0]}>
        <RoundedBox args={[0.312, 0.214, 0.006]} radius={0.003} position={[0, 0.107, 0]} castShadow>
          <meshStandardMaterial {...alu} />
        </RoundedBox>
        <mesh position={[0, 0.107, 0.0032]}>
          <boxGeometry args={[0.308, 0.21, 0.001]} />
          <meshStandardMaterial {...black} />
        </mesh>
        <group position={[0, 0.111, 0.0042]}>
          {live ? (
            <Suspense fallback={<BlankScreen w={0.292} h={(0.292 * 9) / 16} />}>
              {still ? (
                <StillScreen src={still} w={0.292} h={(0.292 * 9) / 16} />
              ) : (
                <Screen src={src!} w={0.292} h={(0.292 * 9) / 16} dim={1} onVideo={onVideo} />
              )}
            </Suspense>
          ) : (
            <BlankScreen w={0.292} h={(0.292 * 9) / 16} />
          )}
          {/* Push-in target: the AI reply suggestions in the inbox */}
          <group ref={detail} position={[0.023, -0.036, 0]} />
        </group>
      </group>
    </group>
  );
}

function Monitor({
  position,
  rotY,
  src,
  onVideo,
  detail,
  live = false,
}: {
  position: [number, number, number];
  rotY: number;
  src: string;
  onVideo?: (v: HTMLVideoElement) => void;
  detail?: React.Ref<THREE.Group>;
  live?: boolean;
}) {
  return (
    <group position={position} rotation={[0, rotY, 0]}>
      <RoundedBox args={[0.22, 0.008, 0.17]} radius={0.003} position={[0, 0.004, -0.03]} castShadow receiveShadow>
        <meshStandardMaterial {...alu} />
      </RoundedBox>
      <RoundedBox args={[0.05, 0.3, 0.02]} radius={0.004} position={[0, 0.15, -0.06]} castShadow>
        <meshStandardMaterial {...alu} />
      </RoundedBox>
      <RoundedBox args={[0.6, 0.345, 0.018]} radius={0.004} position={[0, 0.32, -0.04]} castShadow>
        <meshStandardMaterial {...alu} />
      </RoundedBox>
      <mesh position={[0, 0.32, -0.0305]}>
        <boxGeometry args={[0.594, 0.339, 0.001]} />
        <meshStandardMaterial {...black} />
      </mesh>
      <group position={[0, 0.32, -0.0298]}>
        {live ? (
          <Suspense fallback={<BlankScreen w={0.58} h={(0.58 * 9) / 16} />}>
            <Screen src={src} w={0.58} h={(0.58 * 9) / 16} dim={0.95} onVideo={onVideo} />
          </Suspense>
        ) : (
          <BlankScreen w={0.58} h={(0.58 * 9) / 16} />
        )}
        {/* Push-in target: the phone preview with the AI-written follow-ups */}
        <group ref={detail} position={[0.12, -0.03, 0]} />
      </group>
    </group>
  );
}

function Phone({ onVideo, detail, sfx = "" }: { onVideo: (v: HTMLVideoElement) => void; detail?: React.Ref<THREE.Group>; sfx?: string }) {
  const oak = { color: "#8a6a4a", roughness: 0.5 };
  return (
    <group position={PHONE.toArray()} rotation={[0, deg(-62), 0]}>
      <RoundedBox args={[0.09, 0.012, 0.08]} radius={0.003} position={[0, 0.006, 0]} castShadow receiveShadow>
        <meshStandardMaterial {...oak} />
      </RoundedBox>
      <group position={[0, 0.012, 0.02]} rotation={[deg(-16), 0, 0]}>
        <RoundedBox args={[0.085, 0.11, 0.012]} radius={0.003} position={[0, 0.055, -0.012]} castShadow>
          <meshStandardMaterial {...oak} />
        </RoundedBox>
        <RoundedBox args={[0.09, 0.012, 0.016]} radius={0.002} position={[0, 0.006, 0.012]} castShadow>
          <meshStandardMaterial {...oak} />
        </RoundedBox>
        <RoundedBox args={[0.0716, 0.1545, 0.0082]} radius={0.0045} position={[0, 0.0813, 0]} castShadow>
          <meshStandardMaterial {...dark} />
        </RoundedBox>
        <group position={[0, 0.0813, 0.0043]}>
          <Screen src={`${M}/phone-screen${sfx}.mp4`} w={0.0656} h={0.1485} dim={1.3} loop={false} onVideo={onVideo} />
          {/* Push-in target: the chat */}
          <group ref={detail} position={[0, -0.01, 0]} />
        </group>
      </group>
    </group>
  );
}

/** Makes a device clickable: pointer cursor on hover, jumps the story to it on click. */
function Pick({ onPick, children }: { onPick: () => void; children: React.ReactNode }) {
  return (
    <group
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        onPick();
      }}
      onPointerOver={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "";
      }}
    >
      {children}
    </group>
  );
}

function Table() {
  const [map, normalMap, roughnessMap] = useTexture([`${M}/walnut_diff.jpg`, `${M}/walnut_nor.jpg`, `${M}/walnut_rough.jpg`]);
  useMemo(() => {
    for (const t of [map, normalMap, roughnessMap]) {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(14, 3.9);
      t.anisotropy = 8;
    }
    map.colorSpace = THREE.SRGBColorSpace;
  }, [map, normalMap, roughnessMap]);
  const legs: [number, number][] = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) legs.push([1.15 + sx * 1.68, -0.25 + sz * 0.4]);
  return (
    <group>
      <mesh position={[1.15, TOP - 0.02, -0.25]} receiveShadow castShadow>
        <boxGeometry args={[3.6, 0.04, 1.0]} />
        <meshStandardMaterial map={map} normalMap={normalMap} roughnessMap={roughnessMap} color="#8a6446" normalScale={[0.35, 0.35]} envMapIntensity={0.6} />
      </mesh>
      {legs.map(([x, z], i) => (
        <mesh key={i} position={[x, (TOP - 0.04) / 2, z]} castShadow>
          <boxGeometry args={[0.04, TOP - 0.04, 0.04]} />
          <meshStandardMaterial color="#151515" metalness={0.8} roughness={0.45} />
        </mesh>
      ))}
    </group>
  );
}

function Props({ late }: { late: boolean }) {
  return (
    <group>
      {/* Rust notebook */}
      <group position={[0.62, TOP, 0.06]} rotation={[0, deg(18), 0]}>
        <RoundedBox args={[0.15, 0.012, 0.21]} radius={0.002} position={[0, 0.006, 0]} castShadow receiveShadow>
          <meshStandardMaterial color="#c2410c" roughness={0.55} />
        </RoundedBox>
        <mesh position={[0, 0.0135, 0]}>
          <boxGeometry args={[0.145, 0.004, 0.205]} />
          <meshStandardMaterial color="#f3eee6" roughness={0.8} />
        </mesh>
      </group>
      <Mug position={[0.5, TOP, 0.22]} />
      {late && (
        <Suspense fallback={null}>
          <Model url={`${M}/potted_plant_01.glb`} position={[1.85, TOP, -0.62]} rotY={0.4} scale={0.8} />
        </Suspense>
      )}
    </group>
  );
}

/** Ceramic mug: a lathed profile (outer wall, rim, inner wall) with a half-torus handle. */
function Mug({ position }: { position: [number, number, number] }) {
  const geo = useMemo(() => {
    const p = [
      [0, 0], [0.036, 0], [0.039, 0.004], [0.04, 0.09], [0.038, 0.095],
      [0.035, 0.093], [0.034, 0.008], [0, 0.008],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    return new THREE.LatheGeometry(p, 48);
  }, []);
  const mat = { color: "#efe7dc", roughness: 0.35 };
  return (
    <group position={position} rotation={[0, deg(-30), 0]}>
      <mesh geometry={geo} castShadow receiveShadow>
        <meshStandardMaterial {...mat} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0.04, 0.05, 0]} rotation={[0, 0, -Math.PI / 2]} castShadow>
        <torusGeometry args={[0.022, 0.0055, 12, 32, Math.PI]} />
        <meshStandardMaterial {...mat} />
      </mesh>
      <mesh position={[0, 0.07, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.034, 32]} />
        <meshStandardMaterial color="#2a1a10" roughness={0.15} />
      </mesh>
    </group>
  );
}

/** Poly Haven prop (CC0), exported as a compact GLB by demo/blender-hero/export_props.py. */
function Model({ url, position, rotY = 0, scale = 1 }: { url: string; position: [number, number, number]; rotY?: number; scale?: number }) {
  const { scene } = useGLTF(url);
  const obj = useMemo(() => {
    const c = scene.clone(true);
    c.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) o.castShadow = o.receiveShadow = true;
    });
    return c;
  }, [scene]);
  return <primitive object={obj} position={position} rotation={[0, rotY, 0]} scale={scale} />;
}

function Room() {
  const [map, normalMap] = useTexture([`${M}/plaster_diff.jpg`, `${M}/plaster_nor.jpg`]);
  useMemo(() => {
    for (const t of [map, normalMap]) {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(6, 2.2);
    }
    map.colorSpace = THREE.SRGBColorSpace;
  }, [map, normalMap]);
  const wall = { map, normalMap, color: "#8a7a6a", roughness: 0.95, normalScale: new THREE.Vector2(0.8, 0.8) };
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial color="#2a2420" roughness={0.9} />
      </mesh>
      <mesh position={[0, 2.5, -2.6]} receiveShadow>
        <planeGeometry args={[14, 5]} />
        <meshStandardMaterial {...wall} />
      </mesh>
      <mesh position={[4.6, 2.5, 1]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[10, 5]} />
        <meshStandardMaterial {...wall} />
      </mesh>
    </group>
  );
}

function Lights({ phoneVideo, step }: { phoneVideo: React.RefObject<HTMLVideoElement | null>; step: number }) {
  const spot = useRef<THREE.SpotLight>(null);
  const win = useRef<THREE.PointLight>(null);
  const { scene } = useThree();
  useEffect(() => {
    const s = spot.current;
    if (!s) return;
    s.target.position.copy(PHONE);
    scene.add(s.target);
    return () => {
      scene.remove(s.target);
    };
  }, [scene]);
  // Green spill from the phone when the deal is accepted.
  useFrame((_, dt) => {
    const v = phoneVideo.current;
    if (!win.current || !v) return;
    const goal = step === 3 && v.currentTime >= PHONE_FROM.banner ? 0.06 : 0;
    win.current.intensity += (goal - win.current.intensity) * Math.min(1, dt * 4);
  });
  return (
    <>
      <hemisphereLight args={["#d9c3a5", "#1a1410", 0.25]} />
      <spotLight
        ref={spot}
        position={[-0.35, 1.3, -0.25]}
        angle={0.62}
        penumbra={0.75}
        intensity={14}
        decay={2}
        color="#ffc690"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0004}
        shadow-radius={6}
      />
      {/* Warm "window" wash raking across the back wall, so the room has depth */}
      <spotLight position={[3.2, 2.6, 0.8]} angle={0.5} penumbra={1} intensity={30} decay={2} color="#ffb877" target-position={[0.8, 1.4, -2.6]} />
      <directionalLight position={[3.8, 2.2, 1.2]} intensity={0.55} color="#ffdcb8" />
      <directionalLight position={[-1.4, 2.0, -2.2]} intensity={0.35} color="#d8e0ff" />
      <pointLight ref={win} position={[PHONE.x - 0.07, TOP + 0.09, PHONE.z + 0.06]} intensity={0} distance={0.7} decay={2} color="#3fdc78" />
    </>
  );
}

// One viewing direction for the whole film, so every move feels like the same camera.
const DIR = new THREE.Vector3(0.85, -0.158, -0.5).normalize();
const RIGHT = new THREE.Vector3(-DIR.z, 0, DIR.x).normalize();

/** Glides camera + focus to the active device; mouse parallax and scroll dolly on top. */
function Rig({
  step,
  device,
  details,
  mouse,
  scroll,
  focus,
}: {
  step: number;
  device: HeroDevice;
  details: Record<HeroDevice, React.RefObject<THREE.Group | null>>;
  mouse: React.RefObject<{ x: number; y: number }>;
  scroll: React.RefObject<number>;
  focus: THREE.Vector3;
}) {
  const { camera } = useThree();
  const v = useMemo(
    () => ({ pos: new THREE.Vector3(), look: CENTRE.phone.clone(), goal: new THREE.Vector3(), aim: new THREE.Vector3(), detail: new THREE.Vector3() }),
    [],
  );
  const started = useRef(-1);
  const lastStep = useRef(-1);
  useFrame((state, dt) => {
    const now = state.clock.elapsedTime;
    if (lastStep.current !== step) {
      lastStep.current = step;
      started.current = now;
    }
    // Each step opens on the whole device, then pushes in on the part that matters.
    const pushing = now - started.current > PUSH_AFTER;
    const anchor = details[device].current;
    const c = pushing && anchor ? anchor.getWorldPosition(v.detail) : CENTRE[device];
    const s = scroll.current ?? 0;
    const m = mouse.current ?? { x: 0, y: 0 };
    const base = pushing ? PUSH[device] : DIST[device];
    const d = base * (1 - 0.12 * s) * (1 + 0.015 * Math.sin(now * 0.5));
    const off = (pushing ? PUSH_OFF : OFF)[device] * d; // keeps the subject right of centre, clear of the headline
    v.goal.copy(c).addScaledVector(DIR, -d).addScaledVector(RIGHT, -off + m.x * 0.05);
    v.goal.y += (pushing ? 0 : LIFT[device]) - m.y * 0.03;
    v.aim.copy(c).addScaledVector(RIGHT, -off);
    const ease = 1 - Math.exp(-dt * (pushing ? 0.9 : 1.8));
    v.pos.copy(camera.position).lerp(v.goal, ease);
    camera.position.copy(v.pos);
    v.look.lerp(v.aim, ease);
    camera.lookAt(v.look);
    focus.lerp(c, 1 - Math.exp(-dt * 2.4));
  });
  return null;
}

function Tag({ device, text }: { device: HeroDevice; text: string }) {
  const c = CENTRE[device];
  return (
    <Html position={[c.x, c.y + TAG_Y[device], c.z]} center zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
      <div
        className="flex items-center gap-2 whitespace-nowrap rounded-full border border-white/15 bg-[#17130f]/85 px-3.5 py-1.5 text-[13px] font-medium text-[#f3eee6] shadow-[0_8px_30px_rgba(0,0,0,0.45)]"
        style={{ animation: "fadeUp 0.6s ease 0.4s both" }}
      >
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#f0b483] opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-[#f0b483]" />
        </span>
        {text}
      </div>
    </Html>
  );
}

/** Static screen (an app screenshot) for a device that never takes focus: no video decode. */
function StillScreen({ src, w, h }: { src: string; w: number; h: number }) {
  const tex = useTexture(src);
  useMemo(() => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 16;
  }, [tex]);
  return (
    <mesh>
      <planeGeometry args={[w, h]} />
      <meshBasicMaterial map={tex} toneMapped={false} onBeforeCompile={sharpenMap} />
    </mesh>
  );
}

/** Nothing in the room moves, so shadows are drawn for the first frames only, then reused. */
function FreezeShadows() {
  const gl = useThree((st) => st.gl);
  const frames = useRef(0);
  useEffect(() => {
    gl.shadowMap.autoUpdate = true;
    return () => {
      gl.shadowMap.autoUpdate = true;
    };
  }, [gl]);
  useFrame(() => {
    if (frames.current < 0) return;
    if (++frames.current > 30) {
      gl.shadowMap.autoUpdate = false;
      frames.current = -1;
    }
  });
  return null;
}

function Ready({ onReady }: { onReady: () => void }) {
  useEffect(() => {
    const id = requestAnimationFrame(() => requestAnimationFrame(onReady));
    return () => cancelAnimationFrame(id);
  }, [onReady]);
  return null;
}

/** Drives the depth-of-field focus point every frame (the effect keeps a reference to it). */
function FocusPull({ effect, focus, device }: { effect: React.RefObject<DepthOfFieldEffect | null>; focus: THREE.Vector3; device: HeroDevice }) {
  useFrame((_, dt) => {
    const e = effect.current;
    if (!e) return;
    if (e.target !== focus) e.target = focus;
    const m = e.cocMaterial;
    m.focusRange += (RANGE[device] - m.focusRange) * Math.min(1, dt * 2.4);
  });
  return null;
}

/**
 * Reports three.js loader progress (0-100: textures, models) for the hero preloader's counter.
 * Lives outside the Canvas: drei's useProgress reads the global loading manager.
 */
function ReportProgress({ onProgress }: { onProgress: (p: number) => void }) {
  const progress = useProgress((s) => s.progress);
  useEffect(() => onProgress(progress), [progress, onProgress]);
  return null;
}

export function Hero3D({
  step,
  onStep,
  onReady,
  onProgress,
  className = "",
}: {
  step: number;
  onStep: (i: number) => void;
  onReady: () => void;
  /** Asset loading progress 0-100 until the first frame is up (the scene module has loaded). */
  onProgress?: (p: number) => void;
  className?: string;
}) {
  const mouse = useRef({ x: 0, y: 0 });
  const scroll = useRef(0);
  const phoneVideo = useRef<HTMLVideoElement | null>(null);
  const laptopVideo = useRef<HTMLVideoElement | null>(null);
  const monitorVideo = useRef<HTMLVideoElement | null>(null);
  const dof = useRef<DepthOfFieldEffect | null>(null);
  const focus = useMemo(() => CENTRE.phone.clone(), []);
  const phoneDetail = useRef<THREE.Group>(null);
  const laptopDetail = useRef<THREE.Group>(null);
  const monitorDetail = useRef<THREE.Group>(null);
  const details = useMemo(() => ({ phone: phoneDetail, laptop: laptopDetail, monitor: monitorDetail }), []);
  const wrap = useRef<HTMLDivElement>(null);
  const [onScreen, setOnScreen] = useState(true);
  // False until the first frame is on screen; then the laptop/monitor recordings and the
  // plant start loading, so they never delay the first paint.
  const [late, setLate] = useState(false);
  const ready = useCallback(() => {
    onReady();
    setLate(true);
  }, [onReady]);
  // Full device pixel density (up to 2x) so text on the screens stays crisp.
  const dpr = Math.min(2, typeof window === "undefined" ? 1 : window.devicePixelRatio);
  const device = HERO_STEPS[step].device;
  // ₹ (Mumbai) or $ (Dubai) recordings, like the pricing.
  // Client-only scene, so the currency is already known here.
  const sfx = useMediaSuffix() ?? "";
  const price = useStoryPrice();

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    const onScroll = () => {
      scroll.current = Math.min(1, Math.max(0, window.scrollY / window.innerHeight));
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    // Stop rendering once the hero has scrolled away.
    const io = new IntersectionObserver(([e]) => setOnScreen(e.isIntersecting));
    if (wrap.current) io.observe(wrap.current);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("scroll", onScroll);
      io.disconnect();
      document.body.style.cursor = "";
    };
  }, []);

  // Each step restarts the part of the story its device shows.
  const stepRef = useRef(step);
  useEffect(() => {
    stepRef.current = step;
    const play = (v: HTMLVideoElement | null, at: number) => {
      if (!v) return;
      v.currentTime = at;
      v.play().catch(() => {});
    };
    const pause = (v: HTMLVideoElement | null) => v?.pause();
    if (step !== 1) pause(laptopVideo.current);
    if (step !== 2) pause(monitorVideo.current);
    if (step === 1 || step === 2) pause(phoneVideo.current);
    if (step === 0) play(phoneVideo.current, PHONE_FROM.lead);
    if (step === 1) play(laptopVideo.current, 0);
    if (step === 2) play(monitorVideo.current, 0);
    if (step === 3) play(phoneVideo.current, PHONE_FROM.won);
  }, [step]);

  return (
    <div ref={wrap} className={className}>
      {/* Only the first-view load counts: late assets (laptop/monitor clips, plant) stream after. */}
      {onProgress && !late && <ReportProgress onProgress={onProgress} />}
      <Canvas
        shadows="percentage"
        dpr={dpr}
        // Size from the layout box, not the on-screen box: the hero's intro zoom (scale 1.1 -> 1)
        // would otherwise freeze the canvas ~5% too large, cropped and off-centre.
        resize={{ offsetSize: true }}
        camera={{ fov: 26, near: 0.05, far: 30, position: [-0.77, 0.94, 0.31] }}
        gl={{ antialias: false, toneMapping: THREE.AgXToneMapping, toneMappingExposure: 1.0, powerPreference: "high-performance" }}
        frameloop={onScreen ? "always" : "never"}
      >
        <color attach="background" args={["#120e0b"]} />
        <fog attach="fog" args={["#120e0b", 3.2, 9]} />
        <Suspense fallback={null}>
          <Environment resolution={256} environmentIntensity={0.35}>
            <Lightformer form="rect" intensity={2} color="#ffe2c4" position={[3, 2, 2]} scale={[3, 2, 1]} target={[0, 0.8, 0]} />
            <Lightformer form="rect" intensity={0.8} color="#c8d4ff" position={[-3, 2, -2]} scale={[2, 2, 1]} target={[0, 0.8, 0]} />
            <Lightformer form="ring" intensity={1.2} color="#ffc690" position={[-0.35, 1.6, -0.25]} scale={0.6} target={[0, 0.8, 0]} />
          </Environment>
          <Room />
          <Table />
          <Props late={late} />
          <Pick onPick={() => onStep(1)}>
            <Laptop position={[0.25, TOP, -0.05]} rotY={deg(-58)} src={`${M}/app-inbox-meera${sfx}.mp4`} onVideo={(v) => (laptopVideo.current = v)} detail={laptopDetail} live={late} />
          </Pick>
          <Pick onPick={() => onStep(2)}>
            <Monitor position={[1.25, TOP, -0.3]} rotY={deg(-50)} src={`${M}/app-followup${sfx}.mp4`} onVideo={(v) => (monitorVideo.current = v)} detail={monitorDetail} live={late} />
          </Pick>
          <Laptop position={[2.25, TOP, -0.2]} rotY={deg(-46)} still={`${M}/app-proposal${sfx}.jpg`} live={late} />
          <Pick onPick={() => onStep(step === 0 ? 3 : 0)}>
            <Phone onVideo={(v) => (phoneVideo.current = v)} detail={phoneDetail} sfx={sfx} />
          </Pick>
          <Lights phoneVideo={phoneVideo} step={step} />
          <PhoneHold phoneVideo={phoneVideo} stepRef={stepRef} />
          <Rig step={step} device={device} details={details} mouse={mouse} scroll={scroll} focus={focus} />
          <FocusPull effect={dof} focus={focus} device={device} />
          <Tag key={step} device={device} text={HERO_STEPS[step].tag.replace("{price}", price)} />
          <Ready onReady={ready} />
        </Suspense>
        <FreezeShadows />
        <EffectComposer multisampling={0} enableNormalPass={false}>
          {/* Full-resolution blur, and no film grain: both softened the small app text. */}
          <DepthOfField ref={dof} target={focus} focusRange={0.12} bokehScale={4} resolutionScale={1} />
          <ToneMapping mode={ToneMappingMode.NEUTRAL} />
          <Vignette offset={0.28} darkness={0.62} />
          <SMAA />
        </EffectComposer>
      </Canvas>
    </div>
  );
}

/** Until the "deal won" step, stop the phone clip just before the accepted banner. */
function PhoneHold({ phoneVideo, stepRef }: { phoneVideo: React.RefObject<HTMLVideoElement | null>; stepRef: React.RefObject<number> }) {
  // Reads a ref, not a prop: the canvas gets new props a frame after the page's effects run,
  // and a stale "step" here would pause the clip right after "Deal won" jumps it ahead.
  useFrame(() => {
    const v = phoneVideo.current;
    if (v && stepRef.current < 3 && v.currentTime > PHONE_FROM.holdBefore && !v.paused) v.pause();
  });
  return null;
}
