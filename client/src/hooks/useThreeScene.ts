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

    // Scene Setup
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000000, 0.012);

    const camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 30, 60);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enablePan = true;
    controls.minDistance = 5;
    controls.maxDistance = 150;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.5;

    // Graph Construction
    const graphGroup = new THREE.Group();
    scene.add(graphGroup);

    const nodeGroups: Record<string, THREE.Group> = {};
    const edgeLines: THREE.Mesh[] = [];

    // Create Nodes
    tokens.forEach((token, i) => {
      const pos = getSphericalPosition(i, tokens.length);
      const group = new THREE.Group();
      group.position.set(pos.x, pos.y, pos.z);
      group.userData = { ...token };

      const isCentral = token.id === centralTokenId;
      const displayName = token.symbol || token.name || token.id;

      if (isCentral) {
        const geo = new THREE.SphereGeometry(3, 64, 64);
        const mat = new THREE.MeshPhysicalMaterial({
          color: token.color,
          emissive: token.color,
          emissiveIntensity: 1.5,
          roughness: 0.2,
          metalness: 0.8,
          clearcoat: 1
        });
        const mesh = new THREE.Mesh(geo, mat);
        group.add(mesh);
        const label = createLabel(displayName, true, 60);
        label.position.set(0, 4.5, 0);
        group.add(label);
      } else {
        const size = 0.6;
        const core = new THREE.Mesh(
          new THREE.SphereGeometry(size, 32, 32),
          new THREE.MeshStandardMaterial({
            color: token.color,
            emissive: token.color,
            emissiveIntensity: 0.8
          })
        );
        group.add(core);

        // Show label for tokens with a known symbol/name
        if (token.symbol || !token.id.startsWith('T')) {
          const label = createLabel(displayName, false, 30);
          label.position.set(0, 1.5, 0);
          group.add(label);
        }
      }
      group.lookAt(0, 0, 0);
      graphGroup.add(group);
      nodeGroups[token.id] = group;
    });

    // Create Lines (Pools)
    const lineMats = {
      relay: new THREE.MeshBasicMaterial({
        color: 0xE6007A,
        transparent: true,
        opacity: 0.4,
        blending: THREE.AdditiveBlending
      }),
      xcm: new THREE.MeshBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0.3,
        blending: THREE.AdditiveBlending
      }),
    };

    pools.forEach(pool => {
      const s = nodeGroups[pool.source];
      const t = nodeGroups[pool.target];
      if (s && t) {
        const curve = createCurve(s.position, t.position);
        const geometry = new THREE.TubeGeometry(curve, 20, 0.05, 6, false);
        const line = new THREE.Mesh(geometry, lineMats[pool.type].clone());

        line.userData = {
          ...pool,
          baseOpacity: lineMats[pool.type].opacity,
          baseColor: lineMats[pool.type].color
        };
        graphGroup.add(line);
        edgeLines.push(line);
      }
    });

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 1.2));
    const pointLight = new THREE.PointLight(0xE6007A, 5, 200);
    scene.add(pointLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 2.0);
    dirLight.position.set(50, 50, 50);
    scene.add(dirLight);
    const rimLight = new THREE.PointLight(0x00d4ff, 3, 100);
    rimLight.position.set(-40, 20, -40);
    scene.add(rimLight);

    // Interaction State
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let hoveredGroup: THREE.Group | null = null;

    // Event Listeners
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

    // Animation Loop
    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);

      controls.update();

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(graphGroup.children, true);

      let found: THREE.Group | null = null;
      for (let hit of intersects) {
        let obj: THREE.Object3D = hit.object;
        while (obj.parent && obj.parent !== graphGroup) obj = obj.parent;
        if (obj.userData && obj.userData.id) {
          found = obj as THREE.Group;
          break;
        }
      }

      // Hover Effects
      edgeLines.forEach(l => {
        (l.material as THREE.MeshBasicMaterial).opacity = l.userData.baseOpacity;
        (l.material as THREE.MeshBasicMaterial).color = l.userData.baseColor;
      });

      if (found) {
        document.body.style.cursor = 'pointer';
        hoveredGroup = found;
        edgeLines.forEach(l => {
          const isConn = l.userData.source === found!.userData.id || 
                         l.userData.target === found!.userData.id;
          if (isConn) {
            (l.material as THREE.MeshBasicMaterial).opacity = 0.9;
            (l.material as THREE.MeshBasicMaterial).color = new THREE.Color(0xffffff);
          } else {
            (l.material as THREE.MeshBasicMaterial).opacity = 0.05;
          }
        });
      } else {
        hoveredGroup = null;
        document.body.style.cursor = 'default';
      }

      renderer.render(scene, camera);
    };
    animate();

    // Init Fade out
    setTimeout(() => setLoading(false), 800);

    // Cleanup
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('resize', onWindowResize);
      cancelAnimationFrame(animationId);
      
      // Dispose of Three.js resources
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
