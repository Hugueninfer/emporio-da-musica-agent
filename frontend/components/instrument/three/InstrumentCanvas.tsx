"use client";

/* eslint-disable react-hooks/immutability -- objetos do three.js são mutados a cada frame por design (padrão do react-three-fiber) */

import { Environment, Lightformer, useGLTF, useTexture } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import * as THREE from "three";
import type { Finish } from "@/lib/catalog";

/**
 * Alvo do instrumento no palco. O modelo persegue esse alvo com amortecimento a cada frame,
 * então quem controla (rolagem, arraste, botões) só precisa escrever aqui — sem re-render.
 */
export interface InstrumentTarget {
  /** Deslocamento a partir do centro do canvas, em % da largura / altura (y positivo = para baixo). */
  x: number;
  y: number;
  /** 1 = o violão ocupa 78% da altura do canvas (o ukulele fica proporcional ao tamanho real). */
  scale: number;
  /** Inclinação no plano da tela, em graus (positivo = horário, como CSS rotate). */
  tilt: number;
  /** Giro em torno do próprio eixo, em graus. */
  yaw: number;
  /** Inclinação para frente/trás, em graus. */
  pitch: number;
  /** Acabamento de origem e de destino da transição, e quanto já foi (0–1). */
  from: Finish;
  to: Finish;
  mix: number;
  /** Giro automático, em graus por segundo (0 = parado). */
  autoSpin: number;
}

export const defaultTarget = (finish: Finish, over: Partial<InstrumentTarget> = {}): InstrumentTarget => ({
  x: 0,
  y: 0,
  scale: 1,
  tilt: 0,
  yaw: 40,
  pitch: 4,
  from: finish,
  to: finish,
  mix: 0,
  autoSpin: 0,
  ...over,
});

const MODELS = { dread: "/instrumentos/3d/violao.glb", uke: "/instrumentos/3d/ukulele.glb" } as const;
const TOPS = { spruce: "/instrumentos/3d/tampo_spruce.jpg", sunburst: "/instrumentos/3d/tampo_sunburst.jpg" } as const;
const FOV = 30;
const CAMERA_Z = 3.2;
/** Velocidade do amortecimento (maior = acompanha mais rápido). */
const FOLLOW = 5.5;
/** Velocidade com que a presença de cada instrumento acompanha a rolagem na troca. */
const SWAP = 9;

useGLTF.preload(MODELS.dread);
useGLTF.preload(MODELS.uke);

const rad = THREE.MathUtils.degToRad;
const kindOf = (f: Finish) => (f === "uke" ? "uke" : "dread");
const damp = (cur: number, target: number, lambda: number, dt: number) => THREE.MathUtils.damp(cur, target, lambda, dt);
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/**
 * Presença (0–1) de violão e ukulele para uma transição. Quando o instrumento muda, a troca é
 * sequencial e presa à rolagem: o que sai some na 1ª metade, o que entra aparece na 2ª.
 */
function presenceTargets(from: Finish, to: Finish, mix: number): { dread: number; uke: number } {
  const a = kindOf(from);
  const b = kindOf(to);
  if (a === b) return a === "dread" ? { dread: 1, uke: 0 } : { dread: 0, uke: 1 };
  const out = 1 - smoothstep(0.15, 0.47, mix);
  const inn = smoothstep(0.53, 0.85, mix);
  return a === "dread" ? { dread: out, uke: inn } : { dread: inn, uke: out };
}

interface Prepared {
  root: THREE.Object3D;
  top?: THREE.MeshPhysicalMaterial;
  overlay?: THREE.MeshPhysicalMaterial;
  height: number;
}

/** Clona a cena do .glb e cria, no tampo, uma camada extra para o crossfade de acabamento. */
function prepare(scene: THREE.Object3D): Prepared {
  const root = scene.clone(true);
  const box = new THREE.Box3().setFromObject(root);
  const height = box.max.y - box.min.y;
  const topMesh = root.getObjectByName("Tampo") as THREE.Mesh | undefined;
  if (!topMesh) return { root, height };
  const top = (topMesh.material as THREE.MeshPhysicalMaterial).clone();
  topMesh.material = top;
  const overlay = top.clone();
  overlay.transparent = true;
  overlay.opacity = 0;
  overlay.depthWrite = false;
  overlay.polygonOffset = true;
  overlay.polygonOffsetFactor = -2;
  overlay.polygonOffsetUnits = -2;
  const layer = new THREE.Mesh(topMesh.geometry, overlay);
  layer.position.copy(topMesh.position);
  layer.quaternion.copy(topMesh.quaternion);
  layer.scale.copy(topMesh.scale);
  layer.renderOrder = 1;
  topMesh.parent?.add(layer);
  return { root, top, overlay, height };
}

function Rig({ target }: { target: RefObject<InstrumentTarget> }) {
  const dreadGltf = useGLTF(MODELS.dread);
  const ukeGltf = useGLTF(MODELS.uke);
  const extraTops = useTexture(TOPS);
  const dread = useMemo(() => prepare(dreadGltf.scene), [dreadGltf.scene]);
  const uke = useMemo(() => prepare(ukeGltf.scene), [ukeGltf.scene]);

  const textures = useMemo(() => {
    for (const t of Object.values(extraTops)) {
      t.flipY = false; // mesma convenção das texturas do glTF
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 8;
      t.needsUpdate = true;
    }
    return { natural: dread.top?.map ?? null, spruce: extraTops.spruce, sunburst: extraTops.sunburst } as Record<string, THREE.Texture | null>;
  }, [extraTops, dread]);

  const outer = useRef<THREE.Group>(null);
  const spin = useRef<THREE.Group>(null);
  const cur = useRef<(InstrumentTarget & { presDread: number; presUke: number; auto: number }) | null>(null);
  const { camera, size } = useThree();

  useFrame((_, rawDt) => {
    const t = target.current;
    const dt = Math.min(rawDt, 1 / 20);
    if (!t || !outer.current || !spin.current) return;
    if (!cur.current) {
      const start = presenceTargets(t.from, t.to, t.mix);
      cur.current = { ...t, presDread: start.dread, presUke: start.uke, auto: 0 };
    }
    const c = cur.current;

    c.x = damp(c.x, t.x, FOLLOW, dt);
    c.y = damp(c.y, t.y, FOLLOW, dt);
    c.scale = damp(c.scale, t.scale, FOLLOW, dt);
    c.tilt = damp(c.tilt, t.tilt, FOLLOW, dt);
    c.yaw = damp(c.yaw, t.yaw, FOLLOW, dt);
    c.pitch = damp(c.pitch, t.pitch, FOLLOW, dt);
    c.mix = damp(c.mix, t.mix, FOLLOW * 1.4, dt);
    c.auto += t.autoSpin * dt;

    // Troca violão ↔ ukulele: quem sai encolhe girando; quem entra só cresce depois.
    const want = presenceTargets(t.from, t.to, t.mix);
    c.presDread = damp(c.presDread, want.dread, SWAP, dt);
    c.presUke = damp(c.presUke, want.uke, SWAP, dt);
    // Trava: nunca os dois na tela. Se a rolagem pular (ex.: clique numa aba), quem entra
    // espera quem sai sumir de vez.
    const dreadEntering = want.dread > want.uke;
    const showDread = dreadEntering ? c.presDread * clamp01(1 - c.presUke * 12) : c.presDread;
    const showUke = dreadEntering ? c.presUke : c.presUke * clamp01(1 - c.presDread * 12);

    const persp = camera as THREE.PerspectiveCamera;
    const visibleH = 2 * Math.tan(rad(persp.fov) / 2) * CAMERA_Z;
    const visibleW = visibleH * (size.width / size.height);
    const unit = (0.78 * visibleH) / dread.height;

    outer.current.position.set((c.x / 100) * visibleW, (-c.y / 100) * visibleH, 0);
    outer.current.rotation.set(rad(c.pitch), 0, -rad(c.tilt));
    spin.current.rotation.y = rad(c.yaw + c.auto);

    const wd = easeOut(showDread);
    const wu = easeOut(showUke);
    dread.root.visible = wd > 0.002;
    uke.root.visible = wu > 0.002;
    dread.root.scale.setScalar(unit * c.scale * Math.max(wd, 0.0001));
    uke.root.scale.setScalar(unit * c.scale * Math.max(wu, 0.0001));
    dread.root.rotation.y = (1 - wd) * Math.PI * 0.6;
    uke.root.rotation.y = -(1 - wu) * Math.PI * 0.6;

    // Tampo: crossfade entre acabamentos do violão (o ukulele tem um só).
    if (dread.top && dread.overlay) {
      const a = t.from === "uke" ? t.to : t.from;
      const b = t.to === "uke" ? t.from : t.to;
      const texA = textures[a] ?? textures.natural;
      const texB = textures[b] ?? textures.natural;
      if (dread.top.map !== texA) {
        dread.top.map = texA;
        dread.top.needsUpdate = true;
      }
      if (dread.overlay.map !== texB) {
        dread.overlay.map = texB;
        dread.overlay.needsUpdate = true;
      }
      dread.overlay.opacity = a === b ? 0 : THREE.MathUtils.clamp(c.mix, 0, 1);
    }
  });

  return (
    <group ref={outer}>
      <group ref={spin}>
        <primitive object={dread.root} />
        <primitive object={uke.root} />
      </group>
    </group>
  );
}

function Lights() {
  return (
    <>
      <ambientLight intensity={0.12} />
      {/* chave quente (frente-esquerda), preenchimento frio, dois recortes laranja por trás e topo */}
      <directionalLight position={[-2.2, 1.2, 2.8]} intensity={2.6} color="#FFE6CC" />
      <directionalLight position={[2.6, -0.5, 2.0]} intensity={0.8} color="#DCE6FF" />
      <directionalLight position={[-2.2, 0.9, -2.0]} intensity={3.2} color="#FFB27A" />
      <directionalLight position={[2.2, 0.3, -1.8]} intensity={2.8} color="#FF9A5C" />
      <directionalLight position={[0, 3, 0.6]} intensity={0.7} color="#FFF4E8" />
      {/* Reflexos do verniz: ambiente gerado localmente, sem baixar HDR */}
      <Environment resolution={128} frames={1} environmentIntensity={0.55}>
        <Lightformer form="rect" intensity={2.2} color="#FFE6CC" position={[-3, 1.5, 3]} scale={[3, 1.6, 1]} />
        <Lightformer form="rect" intensity={1.4} color="#FF9A5C" position={[3, 0.5, -2]} scale={[2, 3, 1]} />
        <Lightformer form="ring" intensity={0.8} color="#FFF4E8" position={[0, 4, 0]} scale={2} />
      </Environment>
    </>
  );
}

/**
 * Canvas WebGL com o violão/ukulele. Só renderiza quadros enquanto está visível na tela.
 * `fallback` aparece se o navegador não tiver WebGL.
 */
export function InstrumentCanvas({
  target,
  className,
  fallback,
}: {
  target: RefObject<InstrumentTarget>;
  className?: string;
  fallback?: ReactNode;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { rootMargin: "120px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={wrap} className={className}>
      <Canvas
        frameloop={inView ? "always" : "never"}
        dpr={[1, 2]}
        camera={{ fov: FOV, position: [0, 0, CAMERA_Z], near: 0.05, far: 20 }}
        gl={{ antialias: true, alpha: true, toneMapping: THREE.NeutralToneMapping, toneMappingExposure: 1.05 }}
        fallback={fallback}
        style={{ pointerEvents: "none" }}
      >
        <Lights />
        <Suspense fallback={null}>
          <Rig target={target} />
        </Suspense>
      </Canvas>
    </div>
  );
}
