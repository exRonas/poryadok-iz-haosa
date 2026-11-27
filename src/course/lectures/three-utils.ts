/** Полная очистка three.js-сцены: геометрии, материалы, текстуры и сам WebGL-контекст. */
import * as THREE from 'three';

export function disposeScene(scene: THREE.Scene, renderer: THREE.WebGLRenderer) {
  scene.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    const mats = mesh.material ? (Array.isArray(mesh.material) ? mesh.material : [mesh.material]) : [];
    for (const m of mats) {
      for (const v of Object.values(m)) if (v instanceof THREE.Texture) v.dispose();
      m.dispose();
    }
  });
  scene.environment?.dispose();
  renderer.dispose();
  renderer.forceContextLoss();
}
