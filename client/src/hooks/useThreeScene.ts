import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Token, Pool } from '@/types/token';
import { createLabel, getSphericalPosition, createCurve } from '@/utils/three-helpers';

interface UseThreeSceneProps {
  tokens: Token[];
  pools: Pool[];
  centralTokenId?: string;
  onNodeSelect: (token: Token | null) => void;
}

export function useThreeScene({ tokens, pools, centralTokenId = 'DOT', onNodeSelect }: UseThreeSceneProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const onNodeSelectRef = useRef(onNodeSelect);

  useEffect(() => {
    onNodeSelectRef.current = onNodeSelect;
  }, [onNodeSelect]);

  useEffect(() => {
    if (!mountRef.current) return;

    const container = mountRef.current;

    // ═══════════════════════════════════════
    // Scene Setup — Deep space void
    // ═══════════════════════════════════════
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x030014, 0.008);

    const camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.1,
      2000
    );
    camera.position.set(0, 30, 60);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enablePan = true;
    controls.minDistance = 5;
    controls.maxDistance = 150;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.3;

    // ═══════════════════════════════════════
    // Background Stars (deep field)
    // ═══════════════════════════════════════
    const starsGeo = new THREE.BufferGeometry();
    const starsCount = 3000;
    const starPositions = new Float32Array(starsCount * 3);
    const starColors = new Float32Array(starsCount * 3);
    const starSizes = new Float32Array(starsCount);

    for (let i = 0; i < starsCount; i++) {
      // Spread stars in a large sphere
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 200 + Math.random() * 500;
      starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      starPositions[i * 3 + 2] = r * Math.cos(phi);

      // Vary star colors — mostly white with hints of blue, purple, warm
      const colorChoice = Math.random();
      if (colorChoice < 0.6) {
        // White/blue
        starColors[i * 3] = 0.8 + Math.random() * 0.2;
        starColors[i * 3 + 1] = 0.8 + Math.random() * 0.2;
        starColors[i * 3 + 2] = 1.0;
      } else if (colorChoice < 0.8) {
        // Purple-ish
        starColors[i * 3] = 0.7 + Math.random() * 0.3;
        starColors[i * 3 + 1] = 0.5 + Math.random() * 0.2;
        starColors[i * 3 + 2] = 1.0;
      } else {
        // Warm golden
        starColors[i * 3] = 1.0;
        starColors[i * 3 + 1] = 0.85 + Math.random() * 0.15;
        starColors[i * 3 + 2] = 0.6 + Math.random() * 0.2;
      }

      starSizes[i] = Math.random() < 0.05 ? 2.5 : Math.random() * 1.2 + 0.3;
    }

    starsGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starsGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
    const starsMat = new THREE.PointsMaterial({
      size: 0.8,
      transparent: true,
      opacity: 0.9,
      vertexColors: true,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
    });
    const starField = new THREE.Points(starsGeo, starsMat);
    scene.add(starField);

    // ═══════════════════════════════════════
    // Nebula Clouds (volumetric feel)
    // ═══════════════════════════════════════
    const nebulaGroup = new THREE.Group();
    scene.add(nebulaGroup);

    // Create several large transparent planes with nebula-like colors
    const nebulaColors = [
      { color: 0x7B2FBE, x: -30, y: 10, z: -40, scale: 60, opacity: 0.015 },
      { color: 0x2D5BFF, x: 40, y: -15, z: -50, scale: 50, opacity: 0.012 },
      { color: 0xE6007A, x: 0, y: 0, z: -30, scale: 40, opacity: 0.008 },
      { color: 0x00FF88, x: 20, y: 20, z: -60, scale: 45, opacity: 0.006 },
    ];

    nebulaColors.forEach((n) => {
      const geo = new THREE.SphereGeometry(n.scale, 16, 16);
      const mat = new THREE.MeshBasicMaterial({
        color: n.color,
        transparent: true,
        opacity: n.opacity,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(n.x, n.y, n.z);
      nebulaGroup.add(mesh);
    });

    // ═══════════════════════════════════════
    // Graph Construction
    // ═══════════════════════════════════════
    const graphGroup = new THREE.Group();
    scene.add(graphGroup);

    const nodeGroups: Record<string, THREE.Group> = {};
    const edgeLines: THREE.Mesh[] = [];
    const nodeMeshes: { mesh: THREE.Mesh; baseEmissive: number; time: number }[] = [];

    // Create Nodes
    tokens.forEach((token, i) => {
      const pos = getSphericalPosition(i, tokens.length);
      const group = new THREE.Group();
      group.position.set(pos.x, pos.y, pos.z);
      group.userData = { ...token };

      const isCentral = token.id === centralTokenId;
      const displayName = token.symbol || token.name || token.id;

      if (isCentral) {
        // Central node — a radiant star
        const geo = new THREE.SphereGeometry(3.5, 64, 64);
        const mat = new THREE.MeshPhysicalMaterial({
          color: 0x7B2FBE,
          emissive: 0x7B2FBE,
          emissiveIntensity: 2.0,
          roughness: 0.15,
          metalness: 0.9,
          clearcoat: 1,
          clearcoatRoughness: 0.1,
        });
        const mesh = new THREE.Mesh(geo, mat);
        group.add(mesh);
        nodeMeshes.push({ mesh, baseEmissive: 2.0, time: Math.random() * 100 });

        // Glow halo
        const haloGeo = new THREE.SphereGeometry(5, 32, 32);
        const haloMat = new THREE.MeshBasicMaterial({
          color: 0x7B2FBE,
          transparent: true,
          opacity: 0.06,
          blending: THREE.AdditiveBlending,
          side: THREE.BackSide,
          depthWrite: false,
        });
        group.add(new THREE.Mesh(haloGeo, haloMat));

        // Second ring halo
        const ring2Geo = new THREE.RingGeometry(4.5, 5.5, 64);
        const ring2Mat = new THREE.MeshBasicMaterial({
          color: 0x7B2FBE,
          transparent: true,
          opacity: 0.08,
          blending: THREE.AdditiveBlending,
          side: THREE.DoubleSide,
          depthWrite: false,
        });
        const ring = new THREE.Mesh(ring2Geo, ring2Mat);
        ring.rotation.x = Math.PI / 2;
        group.add(ring);

        const label = createLabel(displayName, true, 60);
        label.position.set(0, 5.5, 0);
        group.add(label);
      } else {
        // Satellite nodes — small glowing orbs
        const size = 0.5 + (token.totalPools || 1) * 0.08;
        const core = new THREE.Mesh(
          new THREE.SphereGeometry(Math.min(size, 1.2), 32, 32),
          new THREE.MeshPhysicalMaterial({
            color: token.color,
            emissive: token.color,
            emissiveIntensity: 1.2,
            roughness: 0.3,
            metalness: 0.7,
            clearcoat: 0.8,
          })
        );
        group.add(core);
        nodeMeshes.push({ mesh: core, baseEmissive: 1.2, time: Math.random() * 100 });

        // Small glow
        const glowGeo = new THREE.SphereGeometry(Math.min(size, 1.2) * 2, 16, 16);
        const glowMat = new THREE.MeshBasicMaterial({
          color: token.color,
          transparent: true,
          opacity: 0.04,
          blending: THREE.AdditiveBlending,
          side: THREE.BackSide,
          depthWrite: false,
        });
        group.add(new THREE.Mesh(glowGeo, glowMat));

        if (token.symbol || !token.id.startsWith('T')) {
          const label = createLabel(displayName, false, 30);
          label.position.set(0, Math.min(size, 1.2) + 1.2, 0);
          group.add(label);
        }
      }
      graphGroup.add(group);
      nodeGroups[token.id] = group;
    });

    // Create Edges (pool connections)
    const edgeMats = {
      relay: new THREE.MeshBasicMaterial({
        color: 0x7B2FBE,
        transparent: true,
        opacity: 0.25,
        blending: THREE.AdditiveBlending,
      }),
      xcm: new THREE.MeshBasicMaterial({
        color: 0x2D5BFF,
        transparent: true,
        opacity: 0.15,
        blending: THREE.AdditiveBlending,
      }),
    };

    pools.forEach(pool => {
      const s = nodeGroups[pool.source];
      const t = nodeGroups[pool.target];
      if (s && t) {
        const curve = createCurve(s.position, t.position);
        const geometry = new THREE.TubeGeometry(curve, 24, 0.04, 6, false);
        const line = new THREE.Mesh(geometry, edgeMats[pool.type].clone());

        line.userData = {
          ...pool,
          baseOpacity: edgeMats[pool.type].opacity,
          baseColor: edgeMats[pool.type].color.clone(),
        };
        graphGroup.add(line);
        edgeLines.push(line);
      }
    });

    // ═══════════════════════════════════════
    // Lighting — multi-colored galactic
    // ═══════════════════════════════════════
    scene.add(new THREE.AmbientLight(0x1a1030, 2.0));

    const mainLight = new THREE.PointLight(0x7B2FBE, 6, 200);
    mainLight.position.set(0, 5, 0);
    scene.add(mainLight);

    const blueLight = new THREE.PointLight(0x2D5BFF, 4, 150);
    blueLight.position.set(40, 20, 30);
    scene.add(blueLight);

    const greenLight = new THREE.PointLight(0x00FF88, 2, 120);
    greenLight.position.set(-30, -10, 40);
    scene.add(greenLight);

    const dirLight = new THREE.DirectionalLight(0xE8E4F0, 1.5);
    dirLight.position.set(50, 50, 50);
    scene.add(dirLight);

    const rimLight = new THREE.PointLight(0xE6007A, 2, 100);
    rimLight.position.set(-40, 20, -40);
    scene.add(rimLight);

    // ═══════════════════════════════════════
    // Interaction
    // ═══════════════════════════════════════
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let hoveredGroup: THREE.Group | null = null;

    const onMouseMove = (e: MouseEvent) => {
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };

    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      if (hoveredGroup) {
        onNodeSelectRef.current(hoveredGroup.userData as Token);
      } else {
        onNodeSelectRef.current(null);
      }
    };

    const onWindowResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('resize', onWindowResize);

    // ═══════════════════════════════════════
    // Animation Loop
    // ═══════════════════════════════════════
    let animationId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      controls.update();

      // Slow star rotation for immersion
      starField.rotation.y = elapsed * 0.005;
      starField.rotation.x = elapsed * 0.002;

      // Nebula clouds gentle drift
      nebulaGroup.rotation.y = elapsed * 0.003;

      // Node breathing (pulsing emissive)
      nodeMeshes.forEach((n) => {
        const mat = n.mesh.material as THREE.MeshPhysicalMaterial;
        const pulse = Math.sin(elapsed * 1.5 + n.time) * 0.3;
        mat.emissiveIntensity = n.baseEmissive + pulse;
      });

      // Raycasting for hover
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(graphGroup.children, true);

      let found: THREE.Group | null = null;
      for (const hit of intersects) {
        let obj: THREE.Object3D = hit.object;
        while (obj.parent && obj.parent !== graphGroup) obj = obj.parent;
        if (obj.userData && obj.userData.id) {
          found = obj as THREE.Group;
          break;
        }
      }

      // Reset edges
      edgeLines.forEach(l => {
        const mat = l.material as THREE.MeshBasicMaterial;
        mat.opacity = l.userData.baseOpacity;
        mat.color.copy(l.userData.baseColor);
      });

      if (found) {
        document.body.style.cursor = 'pointer';
        hoveredGroup = found;
        edgeLines.forEach(l => {
          const isConn = l.userData.source === found!.userData.id ||
                         l.userData.target === found!.userData.id;
          const mat = l.material as THREE.MeshBasicMaterial;
          if (isConn) {
            mat.opacity = 0.8;
            mat.color.setHex(0xffffff);
          } else {
            mat.opacity = 0.03;
          }
        });
      } else {
        hoveredGroup = null;
        document.body.style.cursor = 'default';
      }

      renderer.render(scene, camera);
    };
    animate();

    setTimeout(() => setLoading(false), 800);

    // Cleanup
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('resize', onWindowResize);
      cancelAnimationFrame(animationId);

      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry?.dispose();
          if (object.material instanceof THREE.Material) {
            object.material.dispose();
          } else if (Array.isArray(object.material)) {
            object.material.forEach(material => material.dispose());
          }
        }
      });

      renderer.dispose();
      controls.dispose();

      if (container && renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }

      document.body.style.cursor = 'default';
    };
  }, [tokens, pools, centralTokenId]);

  return { mountRef, loading };
}
