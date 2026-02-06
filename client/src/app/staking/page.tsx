'use client';

import { useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Header } from '@/components/Header';
import { Navbar } from '@/components/Navbar';
import { StakingView } from '@/components/views/StakingView';
import { LoadingOverlay } from '@/components/LoadingOverlay';
import { globalStyles } from '@/styles/global-styles';

export default function StakingPage() {
  const mountRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!mountRef.current) return;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000000, 0.015);

    const camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
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
    controls.autoRotateSpeed = 0.3;

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const pointLight = new THREE.PointLight(0x9D4EDD, 3, 150);
    pointLight.position.set(0, 20, 20);
    scene.add(pointLight);

    // Particle system
    const particlesGeometry = new THREE.BufferGeometry();
    const particlesCount = 1000;
    const positions = new Float32Array(particlesCount * 3);

    for (let i = 0; i < particlesCount * 3; i++) {
      positions[i] = (Math.random() - 0.5) * 100;
    }

    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particlesMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.1,
      transparent: true,
      opacity: 0.6,
    });

    const particles = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particles);

    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      controls.update();
      particles.rotation.y += 0.0005;
      renderer.render(scene, camera);
    };
    animate();

    setTimeout(() => setLoading(false), 500);

    return () => {
      cancelAnimationFrame(animationId);
      if (mountRef.current) mountRef.current.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden font-sans text-white">
      <style>{globalStyles}</style>
      {loading && <LoadingOverlay />}

      <div ref={mountRef} className="absolute inset-0 z-0 opacity-30 blur-[1px]" />

      <div className="absolute inset-0 z-10 pointer-events-none flex flex-col p-6">
        <Header />
        <Navbar currentView="staking" />

        <div className="flex-1 flex items-center justify-center pointer-events-auto">
          <StakingView />
        </div>
      </div>
    </div>
  );
}
