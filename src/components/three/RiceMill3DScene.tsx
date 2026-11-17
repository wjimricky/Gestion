import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { Box, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';
import { useFinancial } from '../../context/FinancialContext';
import { getResolvedStorageOptimization, STORAGE_METHOD_META } from '../../utils/storage';
import { getResolvedPaddyStock } from '../../utils/stockSecurity';
import { formatAriary, formatKg, formatPercent } from '../../utils/formatters';

interface InspectedZoneInfo {
  id: 'silos' | 'mill' | 'hangar';
  title: string;
  subtitle: string;
  metrics: Array<{ label: string; value: string }>;
}

function createConcreteTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#2c303a';
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 4500; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const shade = 38 + Math.floor(Math.random() * 24);
      ctx.fillStyle = `rgb(${shade}, ${shade + 2}, ${shade + 6})`;
      ctx.fillRect(x, y, 2, 2);
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 2;
    for (let g = 0; g <= 512; g += 64) {
      ctx.beginPath();
      ctx.moveTo(g, 0);
      ctx.lineTo(g, 512);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, g);
      ctx.lineTo(512, g);
      ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 6);
  return tex;
}

export const RiceMill3DScene: React.FC = () => {
  const { assumptions, model, unitDisplay } = useFinancial();
  const inM = unitDisplay === 'millions';

  const storageOpt = getResolvedStorageOptimization(assumptions);
  const paddyStock = getResolvedPaddyStock(assumptions);
  const storageMeta = STORAGE_METHOD_META[storageOpt.storageMethod];

  const liveParamsRef = useRef({
    stockRatio: Math.min(1, Math.max(0.15, paddyStock.currentStockKg / Math.max(1000, storageOpt.storageCapacityKg || 40000))),
    storageMethod: storageOpt.storageMethod,
    yieldRatio: model.hauteSaison.yieldRatio,
  });

  liveParamsRef.current = {
    stockRatio: Math.min(
      1,
      Math.max(0.15, paddyStock.currentStockKg / Math.max(1000, storageOpt.storageCapacityKg || 40000))
    ),
    storageMethod: storageOpt.storageMethod,
    yieldRatio: model.hauteSaison.yieldRatio,
  };

  const canvasMountRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const [hudExpanded, setHudExpanded] = useState(false);
  const [selectedZone, setSelectedZone] = useState<'silos' | 'mill' | 'hangar'>('mill');
  const [webglError, setWebglError] = useState<string | null>(null);

  const zoneDetails = useMemo<Record<'silos' | 'mill' | 'hangar', InspectedZoneInfo>>(
    () => ({
      silos: {
        id: 'silos',
        title: 'Silos de Réception & Pré-Nettoyage Paddy',
        subtitle: 'Réception bord-champ, pesage et tamisage avant usinage',
        metrics: [
          { label: 'Paddy annuel traité', value: formatKg(model.hauteSaison.totalPaddyKg + model.basseSaison.totalPaddyKg) },
          { label: 'Humidité moyenne lot', value: `${storageOpt.moisturePercent.toFixed(1)} %` },
          { label: 'Lot HS / rotation', value: formatKg(model.hauteSaison.paddyKgPerRotation) },
        ],
      },
      mill: {
        id: 'mill',
        title: 'Ligne Décorticage, Polissage & Ensachage',
        subtitle: 'Unité industrielle de transformation paddy → riz blanchi',
        metrics: [
          { label: 'Rendement usinage HS', value: formatPercent(model.hauteSaison.yieldRatio, 1) },
          { label: 'Production riz annuelle', value: formatKg(model.year1.totalRiceKgSold) },
          { label: 'CA annuel généré', value: formatAriary(model.year1.totalTurnoverAr, { inMillions: inM }) },
        ],
      },
      hangar: {
        id: 'hangar',
        title: `Hangar Stockage — ${storageMeta.shortLabel}`,
        subtitle: storageMeta.description,
        metrics: [
          { label: 'Stock paddy actuel', value: formatKg(paddyStock.currentStockKg) },
          { label: 'Capacité entrepôt', value: formatKg(storageOpt.storageCapacityKg || 40000) },
          { label: 'Durée conservation', value: `${storageOpt.storageDurationDays} jours` },
        ],
      },
    }),
    [inM, model, paddyStock.currentStockKg, storageMeta, storageOpt]
  );

  useEffect(() => {
    const container = canvasMountRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer;
    let scene: THREE.Scene;
    let camera: THREE.PerspectiveCamera;
    let controls: OrbitControls;
    let rafId = 0;
    let isSoftwareGl = false;

    try {
      const probeCanvas = document.createElement('canvas');
      const gl = probeCanvas.getContext('webgl2') || probeCanvas.getContext('webgl');
      if (gl) {
        const dbg = gl.getExtension('WEBGL_debug_renderer_info');
        const rendererStr = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || '') : '';
        isSoftwareGl = /swiftshader|llvmpipe|software/i.test(rendererStr);
      }

      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
      });
    } catch {
      setWebglError('WebGL indisponible sur ce navigateur.');
      return;
    }

    const width = Math.max(320, container.clientWidth);
    const height = Math.max(360, container.clientHeight);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    if (!isSoftwareGl) {
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    scene = new THREE.Scene();
    scene.background = new THREE.Color('#131624');
    scene.fog = new THREE.Fog('#131624', 28, 72);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTarget = pmrem.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envTarget.texture;
    pmrem.dispose();

    camera = new THREE.PerspectiveCamera(44, width / height, 0.2, 120);
    camera.position.set(16, 11, 18);
    cameraRef.current = camera;

    controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1.8, 0);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.minDistance = 8;
    controls.maxDistance = 38;
    controls.maxPolarAngle = Math.PI / 2 - 0.06;
    controls.update();
    controlsRef.current = controls;

    // 3-Point Lighting: warm directional key + cool sky/ground HemisphereLight + subtle rim
    const keyLight = new THREE.DirectionalLight('#fff2df', 2.4);
    keyLight.position.set(14, 20, 12);
    if (!isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(1024, 1024);
      keyLight.shadow.camera.near = 2;
      keyLight.shadow.camera.far = 55;
      keyLight.shadow.camera.left = -16;
      keyLight.shadow.camera.right = 16;
      keyLight.shadow.camera.top = 16;
      keyLight.shadow.camera.bottom = -16;
    }
    scene.add(keyLight);

    const hemiLight = new THREE.HemisphereLight('#a5c9ff', '#2b241c', 0.9);
    scene.add(hemiLight);

    const rimLight = new THREE.DirectionalLight('#60a5fa', 0.7);
    rimLight.position.set(-14, 9, -12);
    scene.add(rimLight);

    // Concrete Industrial Slab Ground
    const concreteTex = createConcreteTexture();
    concreteTex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    const groundGeo = new THREE.PlaneGeometry(64, 64);
    const groundMat = new THREE.MeshStandardMaterial({
      map: concreteTex,
      roughness: 0.88,
      metalness: 0.08,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = !isSoftwareGl;
    scene.add(ground);

    // Helper for tagging interactive groups
    const interactiveRoots: THREE.Object3D[] = [];
    const tagZone = (obj: THREE.Object3D, zoneId: 'silos' | 'mill' | 'hangar') => {
      obj.userData.zoneId = zoneId;
      obj.traverse((child) => {
        child.userData.zoneId = zoneId;
      });
      interactiveRoots.push(obj);
    };

    // 1. Receiving Silos Composite Group (x = -7)
    const silosGroup = new THREE.Group();
    silosGroup.position.set(-6.8, 0, -1.5);
    const steelMat = new THREE.MeshStandardMaterial({
      color: '#cbd5e1',
      metalness: 0.72,
      roughness: 0.28,
    });
    const trimMat = new THREE.MeshStandardMaterial({
      color: '#4f46e5',
      metalness: 0.35,
      roughness: 0.45,
    });

    [-1.9, 1.9].forEach((zOff) => {
      const plinth = new THREE.Mesh(new THREE.CylinderGeometry(1.75, 1.9, 0.45, 24), trimMat);
      plinth.position.set(0, 0.225, zOff);
      const body = new THREE.Mesh(new THREE.CylinderGeometry(1.65, 1.65, 4.4, 24), steelMat);
      body.position.set(0, 2.65, zOff);
      const cone = new THREE.Mesh(new THREE.ConeGeometry(1.72, 1.35, 24), steelMat);
      cone.position.set(0, 5.525, zOff);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.68, 0.07, 10, 28), trimMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.set(0, 4.5, zOff);
      [plinth, body, cone, ring].forEach((m) => {
        m.castShadow = !isSoftwareGl;
        m.receiveShadow = !isSoftwareGl;
        silosGroup.add(m);
      });
    });

    const augerBridge = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.4, 0.55), trimMat);
    augerBridge.position.set(2.3, 4.1, 0);
    augerBridge.rotation.z = -0.18;
    silosGroup.add(augerBridge);
    tagZone(silosGroup, 'silos');
    scene.add(silosGroup);

    // 2. Husker & Polisher Mill Line Composite Group (center x = -0.5)
    const millGroup = new THREE.Group();
    millGroup.position.set(-0.5, 0, -0.8);
    const machineBlueMat = new THREE.MeshStandardMaterial({
      color: '#1e3a8a',
      metalness: 0.45,
      roughness: 0.38,
    });
    const accentTealMat = new THREE.MeshStandardMaterial({
      color: '#0d9488',
      metalness: 0.4,
      roughness: 0.35,
    });

    const baseDeck = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.35, 3.6), groundMat);
    baseDeck.position.set(0, 0.175, 0);
    const huskerTower = new THREE.Mesh(new THREE.BoxGeometry(1.8, 3.3, 1.8), machineBlueMat);
    huskerTower.position.set(-1.5, 2.0, 0);
    const polisherUnit = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.82, 2.4, 20), steelMat);
    polisherUnit.position.set(0.7, 1.55, 0.35);
    const cycloneSep = new THREE.Mesh(new THREE.ConeGeometry(0.6, 1.6, 18), accentTealMat);
    cycloneSep.rotation.x = Math.PI;
    cycloneSep.position.set(0.7, 3.35, -0.75);
    const conveyorBed = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.28, 0.9), trimMat);
    conveyorBed.position.set(0.3, 0.9, 1.25);

    const rotorWheel = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.25, 16), accentTealMat);
    rotorWheel.rotation.x = Math.PI / 2;
    rotorWheel.position.set(-1.5, 2.3, 1.05);

    [baseDeck, huskerTower, polisherUnit, cycloneSep, conveyorBed, rotorWheel].forEach((m) => {
      m.castShadow = !isSoftwareGl;
      m.receiveShadow = !isSoftwareGl;
      millGroup.add(m);
    });
    tagZone(millGroup, 'mill');
    scene.add(millGroup);

    // 3. Storage Hangar & Procedural Paddy Bag Pallets (x = +6.5)
    const hangarGroup = new THREE.Group();
    hangarGroup.position.set(6.4, 0, -0.5);
    const slabMat = new THREE.MeshStandardMaterial({ color: '#475569', roughness: 0.85 });
    const frameMat = new THREE.MeshStandardMaterial({ color: '#334155', metalness: 0.6, roughness: 0.4 });
    const roofMat = new THREE.MeshStandardMaterial({
      color: '#1e293b',
      metalness: 0.5,
      roughness: 0.45,
      transparent: true,
      opacity: 0.72,
    });

    const hangarFloor = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.22, 6.2), slabMat);
    hangarFloor.position.set(0, 0.11, 0);
    hangarGroup.add(hangarFloor);

    // 4 Corner Steel Columns + Translucent Roof Canopy
    [
      [-3.1, -2.8],
      [3.1, -2.8],
      [-3.1, 2.8],
      [3.1, 2.8],
    ].forEach(([px, pz]) => {
      const col = new THREE.Mesh(new THREE.BoxGeometry(0.24, 4.2, 0.24), frameMat);
      col.position.set(px, 2.2, pz);
      col.castShadow = !isSoftwareGl;
      hangarGroup.add(col);
    });
    const roofCanopy = new THREE.Mesh(new THREE.BoxGeometry(7.0, 0.18, 6.4), roofMat);
    roofCanopy.position.set(0, 4.35, 0);
    hangarGroup.add(roofCanopy);

    // Procedural Bag Pallets (color shifts by storageMethod; height scales smoothly by stockRatio)
    const bagMat = new THREE.MeshStandardMaterial({ color: '#d97706', roughness: 0.78 });
    const stackMeshes: THREE.Mesh[] = [];
    for (let gx = -1.7; gx <= 1.8; gx += 1.75) {
      for (let gz = -1.5; gz <= 1.6; gz += 1.55) {
        const pallet = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.14, 1.25), frameMat);
        pallet.position.set(gx, 0.29, gz);
        hangarGroup.add(pallet);

        const bagStack = new THREE.Mesh(new THREE.BoxGeometry(1.22, 2.2, 1.12), bagMat);
        bagStack.position.set(gx, 0.36 + 1.1, gz);
        bagStack.castShadow = !isSoftwareGl;
        bagStack.receiveShadow = !isSoftwareGl;
        hangarGroup.add(bagStack);
        stackMeshes.push(bagStack);
      }
    }

    tagZone(hangarGroup, 'hangar');
    scene.add(hangarGroup);

    // Raycaster Click Handler
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const handlePointerDown = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(interactiveRoots, true);
      if (hits.length > 0) {
        const zId = hits[0].object.userData.zoneId as 'silos' | 'mill' | 'hangar' | undefined;
        if (zId) setSelectedZone(zId);
      }
    };
    renderer.domElement.addEventListener('click', handlePointerDown);

    // ResizeObserver
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.max(320, entry.contentRect.width);
        const h = Math.max(360, entry.contentRect.height);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      }
    });
    ro.observe(container);

    if (!isSoftwareGl) {
      try {
        renderer.compile(scene, camera);
      } catch {
        // Ignore shader compile guard
      }
    }

    let lastTime = performance.now();
    let smoothedStock = liveParamsRef.current.stockRatio;
    let lastSoftDraw = 0;

    const animate = (now: number) => {
      rafId = window.requestAnimationFrame(animate);
      if (isSoftwareGl && now - lastSoftDraw < 80) return;
      lastSoftDraw = now;

      const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;

      const live = liveParamsRef.current;
      rotorWheel.rotation.z -= dt * (1.2 + live.yieldRatio * 2.5);

      smoothedStock = THREE.MathUtils.damp(smoothedStock, live.stockRatio, 4, dt);
      stackMeshes.forEach((mesh) => {
        mesh.scale.y = Math.max(0.12, smoothedStock);
        mesh.position.y = 0.36 + (2.2 * mesh.scale.y) / 2;
      });

      const targetBagHex =
        live.storageMethod === 'sacs_hermetiques_pics'
          ? '#0d9488'
          : live.storageMethod === 'grenier_ventile'
          ? '#3b82f6'
          : '#d97706';
      bagMat.color.lerp(new THREE.Color(targetBagHex), Math.min(1, dt * 4));

      controls.update();
      renderer.render(scene, camera);
    };

    rafId = window.requestAnimationFrame(animate);

    return () => {
      window.cancelAnimationFrame(rafId);
      ro.disconnect();
      renderer.domElement.removeEventListener('click', handlePointerDown);
      controls.dispose();
      concreteTex.dispose();
      envTarget.dispose();
      scene.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const m = obj as THREE.Mesh;
          m.geometry?.dispose();
          if (Array.isArray(m.material)) {
            m.material.forEach((mat) => mat.dispose());
          } else {
            m.material?.dispose();
          }
        }
      });
      renderer.dispose();
    };
  }, []);

  const handleResetView = () => {
    if (cameraRef.current && controlsRef.current) {
      cameraRef.current.position.set(16, 11, 18);
      controlsRef.current.target.set(0, 1.8, 0);
      controlsRef.current.update();
    }
  };

  const activeInfo = zoneDetails[selectedZone];

  return (
    <div className="space-y-4">
      <div className="pb-4 border-b border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
            <Box className="w-5 h-5 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
            <span>Jumeau Numérique 3D — Rizerie, Silos &amp; Hangar de Stockage</span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-0.5">
            Cliquez sur une installation (Silos, Unité de décorticage ou Hangar) pour inspecter ses indicateurs liés en temps réel à vos hypothèses.
          </p>
        </div>
        <button
          type="button"
          onClick={handleResetView}
          className="min-h-10 px-3 py-1.5 rounded-xl border border-zinc-300 dark:border-white/[0.12] bg-white dark:bg-[#191828] hover:bg-zinc-100 dark:hover:bg-[#222038] text-xs font-semibold text-zinc-800 dark:text-zinc-100 inline-flex items-center gap-1.5 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Réinitialiser caméra</span>
        </button>
      </div>

      {/* Interactive 3D Viewport Wrapper */}
      <div className="relative h-[500px] w-full rounded-2xl overflow-hidden border border-zinc-200 dark:border-white/[0.1] bg-[#131624]">
        {webglError ? (
          <div className="h-full flex items-center justify-center p-6 text-xs text-rose-300">
            {webglError}
          </div>
        ) : (
          <div ref={canvasMountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
        )}

        {/* Solid Bottom HUD Dock (NO backdrop-blur over WebGL) */}
        <div className="absolute bottom-3 left-3 right-3 rounded-xl border border-white/15 bg-zinc-950/92 text-zinc-100 p-3 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              {(['silos', 'mill', 'hangar'] as const).map((zKey) => (
                <button
                  key={zKey}
                  type="button"
                  onClick={() => setSelectedZone(zKey)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                    selectedZone === zKey
                      ? 'border-indigo-400 bg-indigo-600 text-white'
                      : 'border-white/15 bg-zinc-900 text-zinc-300 hover:bg-zinc-800'
                  }`}
                >
                  {zKey === 'silos' ? 'Silos Paddy' : zKey === 'mill' ? 'Ligne Usinage' : 'Hangar Stock'}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setHudExpanded((prev) => !prev)}
              className="px-2.5 py-1 rounded-lg border border-white/15 bg-zinc-900 hover:bg-zinc-800 text-xs font-semibold inline-flex items-center gap-1 transition-colors"
            >
              <span>{hudExpanded ? 'Réduire fiche' : 'Détails zone'}</span>
              {hudExpanded ? (
                <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
              ) : (
                <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
              )}
            </button>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div>
              <div className="font-bold text-white">{activeInfo.title}</div>
              {hudExpanded && (
                <div className="text-[11px] text-zinc-400 mt-0.5">{activeInfo.subtitle}</div>
              )}
            </div>
            <div className="flex flex-wrap gap-3 font-mono tabular-nums">
              {activeInfo.metrics.map((m) => (
                <div key={m.label} className="text-right">
                  <div className="font-sans text-[10px] text-zinc-400">{m.label}</div>
                  <div className="font-bold text-teal-300">{m.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
