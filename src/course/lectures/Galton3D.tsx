/** 3D-доска Гальтона: штырьки и шарики из Blender (galton.glb), анимация three.js. */
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { disposeScene } from './three-utils';
import galtonUrl from '../../assets/models/galton.glb?url';
import { binomial } from './lectureMath';
import { Slider } from './parts';

const MAX_BALLS = 400;
const ROW_TIME = 0.11;
const BALL_R = 0.22;
const BIN_H = 6;

interface Ball {
  path: number[]; // x после каждого ряда
  t0: number;
  bin: number;
  landed: boolean;
}

export function Galton3D() {
  const host = useRef<HTMLDivElement>(null);
  const [rows, setRows] = useState(8);
  const [p, setP] = useState(50);
  const [counts, setCounts] = useState<number[]>(() => Array(9).fill(0));
  const [ready, setReady] = useState(false);
  const api = useRef<{ drop: (k: number) => void; reset: (rows: number, p: number) => void } | null>(null);

  useEffect(() => {
    const el = host.current!;
    let alive = true;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const env = new THREE.PMREMGenerator(renderer);
    // простое окружение для отражений металла
    const envScene = new THREE.Scene();
    envScene.add(new THREE.Mesh(new THREE.SphereGeometry(20), new THREE.MeshBasicMaterial({ color: 0x8899bb, side: THREE.BackSide })));
    const lamp = new THREE.Mesh(new THREE.PlaneGeometry(10, 4), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    lamp.position.set(0, 8, 6);
    lamp.lookAt(0, 0, 0);
    envScene.add(lamp);
    scene.environment = env.fromScene(envScene).texture;

    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 200);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x223344, 0.9));
    const sun = new THREE.DirectionalLight(0xffffff, 1.6);
    sun.position.set(3, 6, 10);
    scene.add(sun);

    const board = new THREE.Group();
    scene.add(board);
    let pegGeo: THREE.BufferGeometry | null = null;
    let pegMat: THREE.Material | null = null;
    let ballGeo: THREE.BufferGeometry | null = null;
    let ballMat: THREE.Material | null = null;
    let balls: Ball[] = [];
    let ballMesh: THREE.InstancedMesh | null = null;
    let queue = 0;
    let lastSpawn = 0;
    let m = 8;
    let prob = 0.5;
    let binCounts: number[] = [];
    let curve: THREE.Line | null = null;
    let raf = 0;
    const s = 1; // шаг штырьков
    const rowDy = 0.85;
    const top = () => (m * rowDy) / 2 + 1;
    const bottom = () => top() - m * rowDy - 0.6;

    const build = () => {
      board.traverse((o) => {
        const mm = o as THREE.Mesh;
        if (mm.geometry && mm.geometry !== pegGeo && mm.geometry !== ballGeo) mm.geometry.dispose();
      });
      board.clear();
      if (!pegGeo || !pegMat || !ballGeo || !ballMat) return;
      const backMat = new THREE.MeshStandardMaterial({ color: 0x1a2236, roughness: 0.8 });
      const width = (m + 2) * s;
      const height = m * rowDy + BIN_H + 2.5;
      const back = new THREE.Mesh(new THREE.BoxGeometry(width, height, 0.2), backMat);
      back.position.set(0, top() - height / 2 + 1, -0.45);
      board.add(back);
      let count = 0;
      for (let r = 0; r < m; r += 1) count += r + 1;
      const pegs = new THREE.InstancedMesh(pegGeo, pegMat, count);
      const mtx = new THREE.Matrix4();
      const sc = new THREE.Vector3(0.3, 0.3, 0.25);
      let i = 0;
      for (let r = 0; r < m; r += 1)
        for (let j = 0; j <= r; j += 1) {
          mtx.compose(new THREE.Vector3((j - r / 2) * s, top() - r * rowDy, 0), new THREE.Quaternion(), sc);
          pegs.setMatrixAt(i, mtx);
          i += 1;
        }
      board.add(pegs);
      const wallMat = new THREE.MeshStandardMaterial({ color: 0x9fb3d9, roughness: 0.3, metalness: 0.2, transparent: true, opacity: 0.55 });
      for (let k = 0; k <= m + 1; k += 1) {
        const w = new THREE.Mesh(new THREE.BoxGeometry(0.06, BIN_H, 0.5), wallMat);
        w.position.set((k - (m + 1) / 2) * s, bottom() - BIN_H / 2, 0);
        board.add(w);
      }
      const floor = new THREE.Mesh(new THREE.BoxGeometry(width, 0.12, 0.6), wallMat);
      floor.position.set(0, bottom() - BIN_H, 0);
      board.add(floor);
      ballMesh = new THREE.InstancedMesh(ballGeo, ballMat, MAX_BALLS);
      ballMesh.count = 0;
      ballMesh.frustumCulled = false;
      board.add(ballMesh);
      curve = null;
      const h = m * rowDy + BIN_H + 3;
      camera.position.set(0, top() - h / 2 + 0.6, (h / 2 / Math.tan((16 * Math.PI) / 180)) * 1.05);
      camera.lookAt(0, top() - h / 2 + 0.6, 0);
    };

    const layerH = () => {
      const max = Math.max(1, ...binCounts);
      return Math.min(2 * BALL_R, (BIN_H - 0.2) / max);
    };

    const drawCurve = () => {
      if (curve) board.remove(curve);
      const total = balls.length;
      if (!total) return;
      const probs = binomial(m, prob);
      const lh = layerH();
      const pts = probs.map((q, k) => new THREE.Vector3((k - m / 2) * s, bottom() - BIN_H + 0.06 + q * total * lh, 0.35));
      const g = new THREE.BufferGeometry().setFromPoints(new THREE.CatmullRomCurve3(pts).getPoints(120));
      curve = new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0xff4f8b }));
      board.add(curve);
    };

    const spawn = (now: number) => {
      if (balls.length >= MAX_BALLS) return;
      const path: number[] = [0];
      let k = 0;
      for (let r = 0; r < m; r += 1) {
        if (Math.random() < prob) k += 1;
        path.push((k - (r + 1) / 2) * s);
      }
      balls.push({ path, t0: now, bin: k, landed: false });
    };

    const mtx = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const one = new THREE.Vector3(1, 1, 1).multiplyScalar(BALL_R * 2);
    const pos = new THREE.Vector3();
    const stackIndex: number[] = [];
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const now = performance.now() / 1000;
      if (queue > 0) {
        // 40 шариков в секунду при любой частоте кадров
        const k = Math.min(queue, Math.floor((now - lastSpawn) * 40));
        for (let j = 0; j < k; j += 1) spawn(now - j / 40);
        if (k > 0) {
          queue -= k;
          lastSpawn = now;
        }
      } else lastSpawn = now;
      if (ballMesh) {
        let changed = false;
        stackIndex.length = 0;
        const lh = layerH();
        const fallTime = 0.35;
        balls.forEach((b, i) => {
          const t = (now - b.t0) / ROW_TIME;
          if (t < m) {
            const r = Math.floor(t);
            const f = t - r;
            const x = b.path[r] + (b.path[r + 1] - b.path[r]) * f;
            const y = top() + 0.4 - r * rowDy - f * rowDy + Math.sin(f * Math.PI) * 0.28;
            pos.set(x, y, 0);
          } else {
            const f = Math.min(1, (t - m) * ROW_TIME / fallTime);
            const idx = (stackIndex[b.bin] = (stackIndex[b.bin] ?? -1) + 1);
            const x = (b.bin - m / 2) * s;
            const yEnd = bottom() - BIN_H + 0.06 + BALL_R + idx * lh;
            const yStart = top() + 0.4 - m * rowDy;
            pos.set(x, yStart + (yEnd - yStart) * f * f, 0);
            if (f >= 1 && !b.landed) {
              b.landed = true;
              binCounts[b.bin] += 1;
              changed = true;
            }
          }
          mtx.compose(pos, q, one);
          ballMesh!.setMatrixAt(i, mtx);
        });
        ballMesh.count = balls.length;
        ballMesh.instanceMatrix.needsUpdate = true;
        if (changed) {
          setCounts([...binCounts]);
          drawCurve();
        }
      }
      renderer.render(scene, camera);
    };

    const resize = () => {
      const w = el.clientWidth;
      const h = Math.round(w * 0.75);
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);

    api.current = {
      drop: (k) => {
        queue += Math.max(0, Math.min(k, MAX_BALLS - balls.length - queue));
      },
      reset: (rows, pp) => {
        m = rows;
        prob = pp;
        balls = [];
        queue = 0;
        binCounts = Array(m + 1).fill(0);
        setCounts([...binCounts]);
        build();
      },
    };

    new GLTFLoader().load(galtonUrl, (g) => {
      if (!alive) return;
      g.scene.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh) return;
        const geo = mesh.geometry.clone();
        geo.applyMatrix4(mesh.matrixWorld.clone().setPosition(0, 0, 0));
        if (o.name.startsWith('Peg')) {
          pegGeo = geo;
          pegMat = mesh.material as THREE.Material;
        } else {
          geo.computeBoundingSphere();
          geo.scale(0.5 / geo.boundingSphere!.radius, 0.5 / geo.boundingSphere!.radius, 0.5 / geo.boundingSphere!.radius);
          ballGeo = geo;
          ballMat = mesh.material as THREE.Material;
        }
      });
      g.scene.updateMatrixWorld(true);
      api.current!.reset(m, prob);
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

  const total = counts.reduce((a, b) => a + b, 0);
  const mean = total ? counts.reduce((a, c, k) => a + c * k, 0) / total : 0;
  const change = (r: number, pp: number) => {
    setRows(r);
    setP(pp);
    api.current?.reset(r, pp / 100);
  };
  return (
    <div className="c-3d">
      <div ref={host} className="c-3d-canvas" role="img" aria-label={`Доска Гальтона: ${rows} рядов, упало ${total} шариков`} />
      <div className="c-demo-sliders">
        <Slider label="Рядов штырьков m" value={rows} min={3} max={12} onChange={(v) => change(v, p)} />
        <Slider label="Вероятность отскока вправо p, %" value={p} min={10} max={90} step={5} onChange={(v) => change(rows, v)} show={`${p} %`} />
      </div>
      <div className="c-actions">
        <button type="button" className="c-btn c-btn--small" disabled={!ready} onClick={() => api.current?.drop(1)}>
          1 шарик
        </button>
        <button type="button" className="c-btn c-btn--small" disabled={!ready} onClick={() => api.current?.drop(50)}>
          +50
        </button>
        <button type="button" className="c-btn c-btn--small" disabled={!ready} onClick={() => api.current?.drop(300)}>
          +300
        </button>
        <button type="button" className="c-btn c-btn--small c-btn--ghost" disabled={!ready} onClick={() => change(rows, p)}>
          Сначала
        </button>
      </div>
      <p className="c-status" role="status">
        {total
          ? `Упало ${total} шариков. Средняя ячейка ${mean.toFixed(2).replace('.', ',')}, теория mp = ${((rows * p) / 100).toFixed(2).replace('.', ',')}. Розовая линия — биномиальный закон B(m, p).${total >= MAX_BALLS ? ` Доска заполнена (${MAX_BALLS}), нажмите «Сначала».` : ''}`
          : 'Пустите шарики: на каждом штырьке шарик отскакивает вправо с вероятностью p. Номер ячейки — число отскоков вправо.'}
      </p>
    </div>
  );
}
