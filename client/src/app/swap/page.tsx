'use client';

import { useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Header } from '@/components/Header';
import { Navbar } from '@/components/Navbar';
import { SwapView } from '@/components/views/SwapView';
import { LoadingOverlay } from '@/components/LoadingOverlay';
import { Starfield } from '@/components/Starfield';
import { NebulaBg } from '@/components/NebulaBg';
import { globalStyles } from '@/styles/global-styles';

export default function SwapPage() {
  const mountRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!mountRef.current) return;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x030014, 0.01);

    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 20, 50);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    mountRef.current.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enablePan = false;
    controls.minDistance = 30;
    controls.maxDistance = 80;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.15;

    // Galaxy lighting
    scene.add(new THREE.AmbientLight(0x1a1030, 1.0));
    const purpleLight = new THREE.PointLight(0x7B2FBE, 4, 150);
    purpleLight.position.set(0, 20, 20);
    scene.add(purpleLight);
    const blueLight = new THREE.PointLight(0x2D5BFF, 2, 100);
    blueLight.position.set(-30, -10, 30);
    scene.add(blueLight);

    // Particles
    const geo = new THREE.BufferGeometry();
    const count = 1500;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 120;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 120;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 120;

      const c = Math.random();
      if (c < 0.5) { colors[i*3]=0.9; colors[i*3+1]=0.9; colors[i*3+2]=1; }
      else if (c < 0.8) { colors[i*3]=0.6; colors[i*3+1]=0.3; colors[i*3+2]=0.9; }
      else { colors[i*3]=0.3; colors[i*3+1]=0.5; colors[i*3+2]=1; }
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const mat = new THREE.PointsMaterial({
      size: 0.08,
      transparent: true,
      opacity: 0.5,
      vertexColors: true,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
    });
    const particles = new THREE.Points(geo, mat);
    scene.add(particles);

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      controls.update();
      particles.rotation.y += 0.0002;
      particles.rotation.x += 0.0001;
      renderer.render(scene, camera);
    };
    animate();

    setTimeout(() => setLoading(false), 500);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
      if (mountRef.current) mountRef.current.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div className="relative w-full h-screen bg-void overflow-hidden font-sans text-white noise-overlay">
      <style>{globalStyles}</style>
      {loading && <LoadingOverlay />}

      <NebulaBg />
      <Starfield count={150} />
      <div ref={mountRef} className="absolute inset-0 z-2 opacity-30" />

      <div className="absolute inset-0 z-10 pointer-events-none flex flex-col p-6">
        <Header />
        <Navbar currentView="swap" />
        <div className="flex-1 flex items-center justify-center pointer-events-auto">
          <SwapView />
        </div>
      </div>
    </div>
  );
}
