/** 3D-опыт «π из случайных точек»: капли падают в лоток 1 × 1 (модель из Blender), внутри четверти круга — жёлтые. */
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { disposeScene } from './three-utils';
import trayUrl from '../../assets/models/mc-tray.glb?url';
import { formatStatistic as f } from '../../lib/format';

const MAX = 5000;
const FALL = 0.55;
const R = 0.011;

export function MonteCarlo3D() {
  const host = useRef<HTMLDivElement>(null);
  const api = useRef<{ add: (k: number) => void; reset: () => void } | null>(null);
  const [stats, setStats] = useState({ n: 0, k: 0 });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const el = host.current!;
    let alive = true;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1.6, 0.01, 50);
    camera.position.set(0.5, 1.45, 1.05);
    camera.lookAt(0.5, 0, -0.5);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x223344, 1.2));
    const sun = new THREE.DirectionalLight(0xffffff, 1.8);
    sun.position.set(1, 3, 2);
    scene.add(sun);

    const inMat = new THREE.MeshStandardMaterial({ color: 0xffd34d, roughness: 0.35, emissive: 0x3a2a00 });
    const outMat = new THREE.MeshStandardMaterial({ color: 0x8fb4ff, roughness: 0.35, emissive: 0x0b1530 });
    const geo = new THREE.SphereGeometry(R, 10, 8);
    const inMesh = new THREE.InstancedMesh(geo, inMat, MAX);
    const outMesh = new THREE.InstancedMesh(geo, outMat, MAX);
    inMesh.count = 0;
    inMesh.frustumCulled = false;
    outMesh.frustumCulled = false;
    outMesh.count = 0;
    scene.add(inMesh, outMesh);

    type Drop = { x: number; z: number; t0: number; inside: boolean };
    let drops: Drop[] = [];
    let queue = 0;
    let last = performance.now() / 1000;
    let raf = 0;
    const mtx = new THREE.Matrix4();

    api.current = {
      add: (k) => {
        queue += Math.min(k, MAX - drops.length - queue);
      },
      reset: () => {
        drops = [];
        queue = 0;
        setStats({ n: 0, k: 0 });
      },
    };

    const loop = () => {
      raf = requestAnimationFrame(loop);
      const now = performance.now() / 1000;
      if (queue > 0) {
        // большие партии сыплются быстрее: всё падает примерно за 1,5 с
        const rate = Math.max(60, queue / 1.2);
        const k = Math.min(queue, Math.floor((now - last) * rate));
        for (let j = 0; j < k; j += 1) {
          const u = Math.random();
          const v = Math.random();
          drops.push({ x: u, z: -v, t0: now, inside: u * u + v * v <= 1 });
        }
        if (k > 0) {
          queue -= k;
          last = now;
        }
      } else last = now;
      let ni = 0;
      let no = 0;
      let landed = 0;
      let landedIn = 0;
      for (const d of drops) {
        const t = Math.min(1, (now - d.t0) / FALL);
        const y = R + 0.6 * (1 - t * t);
        mtx.makeTranslation(d.x, y, d.z);
        if (d.inside) inMesh.setMatrixAt(ni++, mtx);
        else outMesh.setMatrixAt(no++, mtx);
        if (t >= 1) {
          landed += 1;
          if (d.inside) landedIn += 1;
        }
      }
      inMesh.count = ni;
      outMesh.count = no;
      inMesh.instanceMatrix.needsUpdate = true;
      outMesh.instanceMatrix.needsUpdate = true;
      setStats((s) => (s.n === landed && s.k === landedIn ? s : { n: landed, k: landedIn }));
      renderer.render(scene, camera);
    };

    const resize = () => {
      const w = el.clientWidth;
      const h = Math.round(w * 0.6);
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);

    new GLTFLoader().load(trayUrl, (g) => {
      if (!alive) return;
      scene.add(g.scene);
      setReady(true);
    });
    loop();
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      alive = false;
      disposeScene(scene, renderer);
      el.removeChild(renderer.domElement);
    };
  }, []);

  const { n, k } = stats;
  return (
    <div className="c-3d">
      <div ref={host} className="c-3d-canvas" role="img" aria-label={`Лоток 1 × 1: ${n} капель, в четверти круга ${k}`} />
      <div className="c-actions">
        {[10, 100, 1000].map((c) => (
          <button key={c} type="button" className="c-btn c-btn--small" disabled={!ready} onClick={() => api.current?.add(c)}>
            +{c} капель
          </button>
        ))}
        <button type="button" className="c-btn c-btn--small c-btn--ghost" disabled={!ready} onClick={() => api.current?.reset()}>
          Сначала
        </button>
      </div>
      <dl className="c-readout">
        <div>
          <dt>Капель N / в круге k</dt>
          <dd>
            {n} / {k}
          </dd>
        </div>
        <div>
          <dt>Оценка π = 4k / N</dt>
          <dd className="c-theory-text">{n ? f(Math.round((4000 * k) / n) / 1000) : '—'}</dd>
        </div>
        <div>
          <dt>Ошибка</dt>
          <dd>{n ? f(Math.round(Math.abs((4 * k) / n - Math.PI) * 1000) / 1000) : '—'}</dd>
        </div>
      </dl>
      <p className="c-widget-note">Капли падают равномерно по всему лотку. Доля жёлтых — это площадь четверти круга π/4, поэтому 4k / N ≈ π. Максимум {MAX} капель.</p>
    </div>
  );
}
