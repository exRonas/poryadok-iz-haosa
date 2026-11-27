/** 3D-монета (модель из Blender): подбрасывание с вращением. Орёл — малиновая сторона «О», решка — синяя «Р». */
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { disposeScene } from './three-utils';
import coinUrl from '../../assets/models/coin.glb?url';

const DURATION = 1.3;

export function Coin3D({ onFlip }: { onFlip: (heads: boolean) => void }) {
  const host = useRef<HTMLDivElement>(null);
  const api = useRef<{ flip: () => void } | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const onFlipRef = useRef(onFlip);
  onFlipRef.current = onFlip;

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
    // окружение для блеска металла
    const pm = new THREE.PMREMGenerator(renderer);
    const envScene = new THREE.Scene();
    envScene.add(new THREE.Mesh(new THREE.SphereGeometry(20), new THREE.MeshBasicMaterial({ color: 0x6f7fa8, side: THREE.BackSide })));
    const lamp = new THREE.Mesh(new THREE.PlaneGeometry(12, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    lamp.position.set(2, 10, 4);
    lamp.lookAt(0, 0, 0);
    envScene.add(lamp);
    scene.environment = pm.fromScene(envScene).texture;

    const camera = new THREE.PerspectiveCamera(35, 2, 0.1, 100);
    camera.position.set(0, 3.4, 4.6);
    camera.lookAt(0, 0.9, 0);
    const sun = new THREE.DirectionalLight(0xffffff, 1.8);
    sun.position.set(3, 8, 4);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    scene.add(sun, new THREE.HemisphereLight(0xffffff, 0x223344, 0.6));
    const table = new THREE.Mesh(new THREE.CircleGeometry(6, 64), new THREE.MeshStandardMaterial({ color: 0x1f5e4a, roughness: 0.95 }));
    table.rotation.x = -Math.PI / 2;
    table.receiveShadow = true;
    scene.add(table);

    let coin: THREE.Object3D | null = null;
    let anim: { t0: number; heads: boolean; turns: number; tilt: number } | null = null;
    let raf = 0;
    const REST = 0.07;

    const flip = () => {
      const heads = Math.random() < 0.5;
      anim = { t0: performance.now() / 1000, heads, turns: 3 + Math.floor(Math.random() * 3), tilt: (Math.random() - 0.5) * 0.6 };
      setBusy(true);
    };
    api.current = { flip };

    const loop = () => {
      raf = requestAnimationFrame(loop);
      if (coin && anim) {
        const t = Math.min(1, (performance.now() / 1000 - anim.t0) / DURATION);
        const air = Math.min(1, t / 0.8);
        // полёт по параболе, потом небольшой отскок
        const h = air < 1 ? 4 * 1.8 * air * (1 - air) : Math.abs(Math.sin(((t - 0.8) / 0.2) * Math.PI)) * 0.15 * (1 - (t - 0.8) / 0.2);
        coin.position.y = REST + h;
        const finalAngle = anim.turns * Math.PI * 2 + (anim.heads ? 0 : Math.PI);
        const e = 1 - (1 - air) ** 2;
        coin.rotation.set(finalAngle * e, anim.tilt * (1 - t), 0);
        if (t >= 1) {
          coin.rotation.set(anim.heads ? 0 : Math.PI, 0, 0);
          const res = anim.heads;
          anim = null;
          setBusy(false);
          onFlipRef.current(res);
        }
      }
      renderer.render(scene, camera);
    };

    const resize = () => {
      const w = el.clientWidth;
      const h = Math.round(w * 0.42);
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);

    new GLTFLoader().load(coinUrl, (g) => {
      if (!alive) return;
      coin = g.scene;
      coin.scale.setScalar(0.75);
      coin.traverse((o) => {
        if ((o as THREE.Mesh).isMesh) o.castShadow = true;
      });
      coin.position.y = REST;
      scene.add(coin);
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
      <div ref={host} className="c-3d-canvas" role="img" aria-label="Монета на столе" />
      <div className="c-actions">
        <button type="button" className="c-btn c-btn--small" disabled={!ready || busy} onClick={() => api.current?.flip()}>
          {ready ? 'Подбросить монету' : 'Загрузка…'}
        </button>
      </div>
    </div>
  );
}
