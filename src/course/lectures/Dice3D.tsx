/** 3D-бросок кубиков (модель из Blender, three.js). Каждый бросок добавляет сумму в гистограмму. */
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { disposeScene } from './three-utils';
import dieUrl from '../../assets/models/die.glb?url';
import die16Url from '../../assets/models/die16.glb?url';

export type DieKind = 'fair' | 'skew' | 'edges';

// У кубика «только 1 и 6» по три грани с 1 и с 6.
const FACE16: Record<number, THREE.Vector3[]> = {
  1: [new THREE.Vector3(0, 1, 0), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, -1)],
  6: [new THREE.Vector3(0, -1, 0), new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 0, 1)],
};

// Нормаль грани (в осях модели glTF) для каждого значения.
const FACE: Record<number, THREE.Vector3> = {
  1: new THREE.Vector3(0, 1, 0),
  6: new THREE.Vector3(0, -1, 0),
  2: new THREE.Vector3(1, 0, 0),
  5: new THREE.Vector3(-1, 0, 0),
  3: new THREE.Vector3(0, 0, -1),
  4: new THREE.Vector3(0, 0, 1),
};
const UP = new THREE.Vector3(0, 1, 0);
const DURATION = 1.4;

interface Anim {
  mesh: THREE.Object3D;
  from: THREE.Vector3;
  to: THREE.Vector3;
  q0: THREE.Quaternion;
  q1: THREE.Quaternion;
  spin: THREE.Vector3;
  delay: number;
}

function targetQuat(value: number, kind: DieKind) {
  const normal = kind === 'edges' ? FACE16[value][Math.floor(Math.random() * 3)] : FACE[value];
  const q = new THREE.Quaternion().setFromUnitVectors(normal, UP);
  const yaw = new THREE.Quaternion().setFromAxisAngle(UP, Math.random() * Math.PI * 2);
  return yaw.multiply(q);
}

function layout(n: number) {
  const cols = Math.ceil(Math.sqrt(n * 1.6));
  const rows = Math.ceil(n / cols);
  return Array.from({ length: n }, (_, i) => {
    const c = i % cols;
    const r = Math.floor(i / cols);
    return new THREE.Vector3((c - (cols - 1) / 2) * 1.6 + (Math.random() - 0.5) * 0.4, 0.5, (r - (rows - 1) / 2) * 1.6 + (Math.random() - 0.5) * 0.4);
  });
}

function sample(probs: readonly number[]) {
  let u = Math.random();
  for (let i = 0; i < probs.length; i += 1) {
    u -= probs[i];
    if (u < 0) return i + 1;
  }
  return probs.length;
}

export function Dice3D({ n, onRoll, kind, probs }: { n: number; onRoll: (sum: number) => void; kind: DieKind; probs: readonly number[] }) {
  const host = useRef<HTMLDivElement>(null);
  const api = useRef<{ roll: () => void } | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState<number[] | null>(null);
  const nRef = useRef(n);
  nRef.current = n;
  const onRollRef = useRef(onRoll);
  onRollRef.current = onRoll;

  useEffect(() => {
    const el = host.current!;
    let alive = true;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 2, 0.1, 100);
    camera.position.set(0, 9, 8.5);
    camera.lookAt(0, 0, 0.3);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x334466, 1.1));
    const sun = new THREE.DirectionalLight(0xffffff, 2.2);
    sun.position.set(4, 10, 5);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7 });
    scene.add(sun);

    const table = new THREE.Mesh(new THREE.CircleGeometry(9, 64), new THREE.MeshStandardMaterial({ color: 0x1f5e4a, roughness: 0.95 }));
    table.rotation.x = -Math.PI / 2;
    table.receiveShadow = true;
    scene.add(table);

    let proto: THREE.Object3D | null = null;
    let dice: THREE.Object3D[] = [];
    let anims: Anim[] = [];
    let t0 = 0;
    let values: number[] = [];
    let raf = 0;

    const resize = () => {
      const w = el.clientWidth;
      const h = Math.round(w * 0.5);
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);

    const syncCount = (count: number) => {
      if (!proto) return;
      while (dice.length < count) {
        const d = proto.clone();
        d.traverse((o) => {
          if ((o as THREE.Mesh).isMesh) o.castShadow = true;
        });
        scene.add(d);
        dice.push(d);
      }
      while (dice.length > count) scene.remove(dice.pop()!);
      const pos = layout(count);
      dice.forEach((d, i) => d.position.copy(pos[i]));
      const k = 0.45 + 0.55 * Math.sqrt(count / 12);
      camera.position.set(0, 9 * k + 1.2, 8.5 * k + 1);
      camera.lookAt(0, 0, -0.9);
    };

    const roll = () => {
      const count = nRef.current;
      syncCount(count);
      values = dice.map(() => sample(probs));
      const pos = layout(count);
      anims = dice.map((d, i) => ({
        mesh: d,
        from: new THREE.Vector3(pos[i].x * 0.3 - 3, 3 + Math.random() * 1.5, 4),
        to: pos[i],
        q0: new THREE.Quaternion().random(),
        q1: targetQuat(values[i], kind),
        spin: new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize(),
        delay: Math.random() * 0.15,
      }));
      t0 = performance.now() / 1000;
      setBusy(true);
    };
    api.current = { roll };

    const tmpQ = new THREE.Quaternion();
    const loop = () => {
      raf = requestAnimationFrame(loop);
      if (anims.length) {
        const now = performance.now() / 1000 - t0;
        let done = true;
        for (const a of anims) {
          const t = Math.min(1, Math.max(0, (now - a.delay) / DURATION));
          if (t < 1) done = false;
          const e = 1 - (1 - t) ** 3;
          a.mesh.position.lerpVectors(a.from, a.to, e);
          // подпрыгивания с затуханием
          a.mesh.position.y = 0.5 + Math.abs(Math.cos(t * Math.PI * 3.5)) * (a.from.y - 0.5) * (1 - t) ** 2;
          // вращение: быстрое кручение, затухающее к итоговой грани
          tmpQ.setFromAxisAngle(a.spin, (1 - e) * 14);
          a.mesh.quaternion.copy(a.q1).premultiply(tmpQ);
        }
        if (done) {
          anims = [];
          setBusy(false);
          setLast(values);
          if (values.length === nRef.current) onRollRef.current(values.reduce((s, v) => s + v, 0));
        }
      }
      renderer.render(scene, camera);
    };

    new GLTFLoader().load(kind === 'edges' ? die16Url : dieUrl, (g) => {
      if (!alive) return;
      proto = g.scene;
      if (kind === 'skew') {
        // утяжелённый кубик: тёплый полупрозрачный пластик, видно грузик у грани 6
        proto.traverse((o) => {
          const mesh = o as THREE.Mesh;
          if (!mesh.isMesh) return;
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          mats.forEach((mm) => {
            const sm = mm as THREE.MeshStandardMaterial;
            if (sm.name === 'DieBody') {
              const c = sm.clone();
              c.color.set(0xffc46b);
              mesh.material = Array.isArray(mesh.material) ? mesh.material.map((x) => (x === mm ? c : x)) : c;
            }
          });
        });
        const weight = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.12, 0.7), new THREE.MeshStandardMaterial({ color: 0x555a66, metalness: 0.9, roughness: 0.3 }));
        weight.position.y = -0.53;
        proto.add(weight);
      }
      proto.scale.setScalar(0.95);
      syncCount(nRef.current);
      dice.forEach((d) => d.quaternion.copy(targetQuat(sample(probs), kind)));
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

  return (
    <div className="c-3d">
      <div ref={host} className="c-3d-canvas" aria-label="Трёхмерный стол с кубиками" role="img" />
      <div className="c-actions">
        <button type="button" className="c-btn c-btn--small" disabled={!ready || busy} onClick={() => api.current?.roll()}>
          {ready ? 'Бросить кубики' : 'Загрузка…'}
        </button>
        {last ? (
          <span className="c-3d-result">
            {last.join(' + ')} = <b>{last.reduce((s, v) => s + v, 0)}</b>
          </span>
        ) : null}
      </div>
    </div>
  );
}
