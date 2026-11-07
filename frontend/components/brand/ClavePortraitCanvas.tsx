"use client";

/* eslint-disable react-hooks/immutability -- uniforms do three.js são mutados a cada frame por design */

import { useTexture } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import * as THREE from "three";

const COLOR = "/brand/clave.webp";
/** R = profundidade, G = peso do balanço da mão, B = tronco (respiração). scripts/gen_clave_depth.py */
const DEPTH = "/brand/clave-depth.png";

/** Medidas do retrato original (1254 px), convertidas para UV no shader. */
const IMG = 1254;
const uv = (x: number, y: number) => new THREE.Vector2(x / IMG, 1 - y / IMG);
/** Abertura de cada olho (centro e meia-largura/altura, sem o delineado), medida no retrato. */
const EYE_L = { c: uv(566, 377), h: new THREE.Vector2(38 / IMG, 20 / IMG), skin: new THREE.Vector3(0.961, 0.578, 0.292) };
const EYE_R = { c: uv(752, 349), h: new THREE.Vector2(40 / IMG, 21 / IMG), skin: new THREE.Vector3(0.957, 0.569, 0.291) };
/** Cada olho foi desenhado subindo um pouco para a direita (cabeça inclinada). */
const EYE_TILT = Math.atan2(12, 72);
const WRIST = uv(195, 870);

const vertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy * 2.0, 0.0, 1.0);
  }
`;

const fragment = /* glsl */ `
  uniform sampler2D uColor;
  uniform sampler2D uDepth;
  uniform vec2 uPointer;   // -1..1, já suavizado
  uniform float uStrength; // deslocamento máximo em UV
  uniform float uBlink;    // 0 aberto, 1 fechado
  uniform float uWiggle;   // ângulo da mão (rad)
  uniform float uBreath;   // esticada do tronco
  uniform vec2 uEyeLC, uEyeLH, uEyeRC, uEyeRH;
  uniform vec3 uSkinL, uSkinR; // cor média da pele em volta de cada olho
  uniform float uEyeTilt;
  uniform vec2 uWrist;
  varying vec2 vUv;

  vec2 rotate(vec2 v, float a) {
    float c = cos(a), s = sin(a);
    return vec2(c * v.x - s * v.y, s * v.x + c * v.y);
  }

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  // Pálpebra descendo sobre um olho: pele (cor local + granulado) acima da linha dos cílios.
  // Fechado, vira um arco ◡ — como um olho fechado desenhado.
  vec4 lid(vec2 p, vec2 c, vec2 h, vec3 skin, vec4 col) {
    vec2 e = rotate(p - c, -uEyeTilt) / (h * 1.06);
    float inside = 1.0 - smoothstep(0.9, 1.0, dot(e, e));
    float lidY = 1.0 - 1.7 * uBlink + 0.35 * uBlink * e.x * e.x; // topo do olho = +1
    float covered = max(smoothstep(lidY - 0.06, lidY + 0.06, e.y), smoothstep(0.85, 1.0, uBlink));
    covered *= inside * step(0.02, uBlink);
    vec3 lidCol = skin * 0.94 + (hash(floor(p * 1254.0)) - 0.5) * 0.05;
    float lash = (1.0 - smoothstep(0.0, 0.17, abs(e.y - lidY))) * inside * step(0.05, uBlink);
    vec3 outCol = mix(col.rgb, lidCol, covered);
    outCol = mix(outCol, vec3(0.12, 0.05, 0.03), lash);
    return vec4(outCol, col.a);
  }

  void main() {
    // Paralaxe por profundidade (2 iterações aproximam a oclusão).
    vec2 p = vUv;
    for (int i = 0; i < 2; i++) {
      float d = texture2D(uDepth, p).r;
      p = vUv - uPointer * uStrength * (d - 0.35);
    }

    // Mão balançando a palheta em torno do punho.
    float hand = texture2D(uDepth, p).g;
    p = uWrist + rotate(p - uWrist, uWiggle * hand);

    // Respiração: o tronco estica de leve a partir da base.
    float body = texture2D(uDepth, p).b;
    p.y = mix(p.y, p.y / (1.0 + uBreath), body);

    vec4 col = texture2D(uColor, p);
    col = lid(p, uEyeLC, uEyeLH, uSkinL, col);
    col = lid(p, uEyeRC, uEyeRH, uSkinR, col);
    gl_FragColor = col;
  }
`;

function Portrait({ hovered, reducedMotion }: { hovered: RefObject<boolean>; reducedMotion: boolean }) {
  const [color, depth] = useTexture([COLOR, DEPTH]);
  const pointer = useRef(new THREE.Vector2());
  const target = useRef(new THREE.Vector2());
  const nextBlink = useRef(2);
  const lastMove = useRef(-10);

  const material = useMemo(() => {
    for (const t of [color, depth]) {
      t.colorSpace = THREE.NoColorSpace; // valores crus: o shader copia a cor da ilustração
      t.minFilter = THREE.LinearFilter;
      t.generateMipmaps = false;
      t.needsUpdate = true;
    }
    return new THREE.ShaderMaterial({
      vertexShader: vertex,
      fragmentShader: fragment,
      uniforms: {
        uColor: { value: color },
        uDepth: { value: depth },
        uPointer: { value: new THREE.Vector2() },
        uStrength: { value: 0.026 },
        uBlink: { value: 0 },
        uWiggle: { value: 0 },
        uBreath: { value: 0 },
        uEyeLC: { value: EYE_L.c },
        uEyeLH: { value: EYE_L.h },
        uEyeRC: { value: EYE_R.c },
        uEyeRH: { value: EYE_R.h },
        uSkinL: { value: EYE_L.skin },
        uSkinR: { value: EYE_R.skin },
        uEyeTilt: { value: EYE_TILT },
        uWrist: { value: WRIST },
      },
    });
  }, [color, depth]);

  // O retrato "olha" para o mouse em qualquer lugar da janela, não só por cima dele.
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      target.current.set((e.clientX / window.innerWidth) * 2 - 1, -((e.clientY / window.innerHeight) * 2 - 1));
      lastMove.current = performance.now() / 1000;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  useFrame(({ clock }, rawDt) => {
    const dt = Math.min(rawDt, 1 / 20);
    const t = clock.elapsedTime;
    const u = material.uniforms;
    if (reducedMotion) return;

    // Sem mouse recente (ou no celular): balanço lento, como quem respira e olha em volta.
    const idle = performance.now() / 1000 - lastMove.current > 2.5;
    const goal = idle ? new THREE.Vector2(Math.sin(t * 0.5) * 0.55, Math.cos(t * 0.37) * 0.35) : target.current;
    pointer.current.x = THREE.MathUtils.damp(pointer.current.x, goal.x, hovered.current ? 6 : 3, dt);
    pointer.current.y = THREE.MathUtils.damp(pointer.current.y, goal.y, hovered.current ? 6 : 3, dt);
    u.uPointer.value.copy(pointer.current);

    // Piscar a cada 3–6 s (às vezes duas vezes seguidas).
    if (t > nextBlink.current) {
      const phase = (t - nextBlink.current) / 0.16;
      u.uBlink.value = phase < 1 ? Math.sin(phase * Math.PI) : 0;
      if (phase >= 1) nextBlink.current = t + (Math.random() < 0.2 ? 0.25 : 3 + Math.random() * 3);
    }

    u.uWiggle.value = Math.sin(t * 2.1) * 0.035 + Math.sin(t * 5.3) * 0.008;
    u.uBreath.value = (Math.sin(t * 1.25) * 0.5 + 0.5) * 0.009;
  });

  return (
    <mesh frustumCulled={false} material={material}>
      <planeGeometry args={[1, 1]} />
    </mesh>
  );
}

type RefObject<T> = { readonly current: T };

/** Retrato 2.5D da Clave (WebGL). Mostra `fallback` sem WebGL e só anima quando está na tela. */
export function ClavePortraitCanvas({ fallback, reducedMotion }: { fallback: ReactNode; reducedMotion: boolean }) {
  const wrap = useRef<HTMLDivElement>(null);
  const hovered = useRef(false);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { rootMargin: "120px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={wrap}
      className="absolute inset-0"
      onPointerEnter={() => (hovered.current = true)}
      onPointerLeave={() => (hovered.current = false)}
    >
      <Canvas
        frameloop={inView && !reducedMotion ? "always" : "demand"}
        dpr={[1, 2]}
        gl={{ antialias: false, alpha: true, toneMapping: THREE.NoToneMapping }}
        fallback={fallback}
        style={{ pointerEvents: "none" }}
      >
        <Suspense fallback={null}>
          <Portrait hovered={hovered} reducedMotion={reducedMotion} />
        </Suspense>
      </Canvas>
    </div>
  );
}
