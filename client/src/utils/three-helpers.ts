import * as THREE from 'three';

export function createLabel(text: string, isBold: boolean, size: number): THREE.Sprite {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Cannot get canvas context');
  
  canvas.width = 256;
  canvas.height = 128;
  
  ctx.font = `${isBold ? '900' : '600'} ${size}px "Inter", sans-serif`;
  ctx.fillStyle = 'white';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.9)';
  ctx.shadowBlur = 6;
  ctx.fillText(text, 128, 64);
  
  const tex = new THREE.CanvasTexture(canvas);
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false })
  );
  sprite.scale.set(4, 2, 1);
  sprite.renderOrder = 99;
  
  return sprite;
}

export function getSphericalPosition(
  index: number,
  total: number
): { x: number; y: number; z: number } {
  if (index === 0) return { x: 0, y: 0, z: 0 };
  
  const phi = Math.acos(-1 + (2 * index) / total);
  const theta = Math.sqrt(total * Math.PI) * phi;
  const baseRadius = 25;
  const variance = (Math.random() * 10) - 5;
  const radius = baseRadius + variance;
  
  return {
    x: radius * Math.cos(theta) * Math.sin(phi),
    y: radius * Math.sin(theta) * Math.sin(phi),
    z: radius * Math.cos(phi)
  };
}

export function createCurve(p1: THREE.Vector3, p2: THREE.Vector3): THREE.QuadraticBezierCurve3 {
  const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
  const len = mid.length();
  if (len > 1) mid.setLength(len * 0.7);
  return new THREE.QuadraticBezierCurve3(p1, mid, p2);
}
