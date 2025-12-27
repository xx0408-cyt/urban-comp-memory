
import React, { useRef, useMemo, useContext, useState, useEffect } from 'react';
import { useFrame, extend, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { shaderMaterial, Text, Line } from '@react-three/drei';
import * as random from 'maath/random/dist/maath-random.esm';
import { TreeContext, ParticleData, TreeContextType } from '../types';

// ... (FoliageMaterial shader 代码保持不变) ...
const FoliageMaterial = shaderMaterial(
  { uTime: 0, uColor: new THREE.Color('#000000'), uColorAccent: new THREE.Color('#00ffff'), uPixelRatio: 1 },
  ` uniform float uTime; uniform float uPixelRatio; attribute float size; varying vec3 vPosition; varying float vBlink; vec3 curl(float x, float y, float z) { float eps=1.,n1,n2,a,b;x/=eps;y/=eps;z/=eps;vec3 curl=vec3(0.);n1=sin(y+cos(z+uTime));n2=cos(x+sin(z+uTime));curl.x=n1-n2;n1=sin(z+cos(x+uTime));n2=cos(y+sin(x+uTime));curl.z=n1-n2;n1=sin(x+cos(y+uTime));n2=cos(z+sin(y+uTime));curl.z=n1-n2;return curl*0.1; } void main() { vPosition=position; vec3 distortedPosition=position+curl(position.x,position.y,position.z); vec4 mvPosition=modelViewMatrix*vec4(distortedPosition,1.0); gl_Position=projectionMatrix*mvPosition; gl_PointSize=size*uPixelRatio*(60.0/-mvPosition.z); vBlink=sin(uTime*2.0+position.y*5.0+position.x); } `,
  ` uniform vec3 uColor; uniform vec3 uColorAccent; varying float vBlink; void main() { vec2 xy=gl_PointCoord.xy-vec2(0.5); float ll=length(xy); if(ll>0.5) discard; float strength=pow(1.0-ll*2.0,3.0); vec3 color=mix(uColor,uColorAccent,smoothstep(-0.8,0.8,vBlink)); gl_FragColor=vec4(color,strength); } `
);
extend({ FoliageMaterial });

declare module '@react-three/fiber' {
  interface ThreeElements {
    foliageMaterial: any
    shimmerMaterial: any
  }
}

// --- Shimmer Material ---
const ShimmerMaterial = shaderMaterial(
  { uTime: 0, uColor: new THREE.Color('#ffffff') },
  // Vertex Shader
  `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  // Fragment Shader
  `
    uniform float uTime;
    uniform vec3 uColor;
    varying vec2 vUv;
    void main() {
      // 扫光条纹位置，周期性移动
      float pos = mod(uTime * 0.8, 2.5) - 0.5;
      // 计算条纹强度 (倾斜)
      float bar = smoothstep(0.0, 0.2, 0.2 - abs(vUv.x + vUv.y * 0.5 - pos));

      // 基础透明度 0，扫光处透明度降低以减少对照片的影响
      float alpha = bar * 0.05;

      gl_FragColor = vec4(uColor, alpha);
    }
  `
);
extend({ ShimmerMaterial });

// --- Photo Component ---
const PolaroidPhoto: React.FC<{ url: string; position: THREE.Vector3; rotation: THREE.Euler; scale: number; id: string; shouldLoad: boolean; year: number }> = ({ url, position, rotation, scale, id, shouldLoad, year }) => {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const [loadStatus, setLoadStatus] = useState<'pending' | 'loading' | 'local' | 'fallback'>('pending');


  useEffect(() => {
    if (!shouldLoad || loadStatus !== 'pending') return;

    setLoadStatus('loading');
    const loader = new THREE.TextureLoader();

    // 先尝试加载本地照片
    loader.load(
      url,
      (tex) => {
        // 本地照片加载成功
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.wrapS = THREE.ClampToEdgeWrapping;
        tex.wrapT = THREE.ClampToEdgeWrapping;
        tex.needsUpdate = true;
        setTexture(tex);
        setLoadStatus('local');
        console.log(`✅ Successfully loaded local image: ${url}`, {
          width: tex.image?.width,
          height: tex.image?.height,
          format: tex.format,
          type: tex.type
        });
      },
      undefined, // onProgress
      (error) => {
        // 本地照片加载失败，使用 Picsum 随机照片
        console.warn(`⚠️ Local image not found: ${url}, loading random photo...`);
        const seed = id.split('-')[1] || '55';
        const fallbackUrl = `https://picsum.photos/seed/${parseInt(seed) + 100}/400/500`;

        loader.load(
          fallbackUrl,
          (fbTex) => {
            fbTex.colorSpace = THREE.SRGBColorSpace;
            fbTex.wrapS = THREE.ClampToEdgeWrapping;
            fbTex.wrapT = THREE.ClampToEdgeWrapping;
            fbTex.needsUpdate = true;
            setTexture(fbTex);
            setLoadStatus('fallback');
            console.log(`✅ Loaded fallback image for ${url}`);
          },
          undefined,
          (fallbackError) => {
            console.error(`❌ Failed to load both local and fallback images for ${url}`, fallbackError);
          }
        );
      }
    );
  }, [url, id, shouldLoad, loadStatus]);

  return (
    <group position={position} rotation={rotation} scale={scale * 1.2}>
      {/* 相框边框 - 恢复白色，保持照片原色 */}
      <mesh position={[0, 0, 0]} userData={{ photoId: id, photoUrl: url }}>
        <boxGeometry args={[1, 1.25, 0.02]} />
        <meshStandardMaterial
          color="#ffffff"
          emissive="#ffffff"
          emissiveIntensity={0.1}
          roughness={0.2}
          metalness={0.2}
        />
      </mesh>
      {/* 照片内容 - 方案1: meshStandardMaterial */}
      <mesh position={[0, 0.15, 0.015]} userData={{ photoId: id, photoUrl: url }}>
        <planeGeometry args={[0.9, 0.9]} />
        {texture ? (
          <meshStandardMaterial
            key={texture.uuid}
            map={texture}
            roughness={0.5}
            metalness={0.0}
          />
        ) : (
          <meshStandardMaterial color="#333" />
        )}
      </mesh>
      {/* 扫光效果覆盖层 */}
      <mesh position={[0, 0.15, 0.02]} scale={[0.9, 0.9, 1]}>
        <planeGeometry args={[1, 1]} />
        <shimmerMaterial transparent depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  );
};

// --- Network Lines Component ---
const NetworkLines: React.FC<{ photoObjects: any[] }> = ({ photoObjects }) => {
  const geometryRef = useRef<THREE.BufferGeometry>(null);
  
  useFrame(() => {
    if (!geometryRef.current) return;
    
    const positions: number[] = [];
    const threshold = 5.0; // Connection distance
    
    // Extract valid positions
    const validObjs = photoObjects.filter(obj => obj.ref.current);
    
    for (let i = 0; i < validObjs.length; i++) {
      const posA = validObjs[i].ref.current!.position;
      
      for (let j = i + 1; j < validObjs.length; j++) {
        const posB = validObjs[j].ref.current!.position;
        
        const dist = posA.distanceTo(posB);
        if (dist < threshold) {
           positions.push(posA.x, posA.y, posA.z);
           positions.push(posB.x, posB.y, posB.z);
        }
      }
    }
    
    geometryRef.current.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometryRef.current.setDrawRange(0, positions.length / 3);
    // geometryRef.current.attributes.position.needsUpdate = true; // Not needed if we replace the attribute
  });

  return (
    <lineSegments>
      <bufferGeometry ref={geometryRef}>
         <bufferAttribute attach="attributes-position" count={0} array={new Float32Array(0)} itemSize={3} />
      </bufferGeometry>
      <lineBasicMaterial color="#00ffff" transparent opacity={0.15} depthWrite={false} blending={THREE.AdditiveBlending} />
    </lineSegments>
  );
};

// --- Main Tree System ---
const TreeSystem: React.FC = () => {
  const { state, rotationSpeed, rotationBoost, pointer, clickTrigger, setSelectedPhotoUrl, selectedPhotoUrl, panOffset } = useContext(TreeContext) as TreeContextType;
  const { camera, raycaster } = useThree();
  const pointsRef = useRef<THREE.Points>(null);
  const lightsRef = useRef<THREE.InstancedMesh>(null);
  const trunkRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);

  const progress = useRef(0);
  const treeRotation = useRef(0);

  // 用于平滑过渡 Pan
  const currentPan = useRef({ x: 0, y: 0 });

  // Staggered Loading State
  const [loadedCount, setLoadedCount] = useState(0);

  const [photoObjects, setPhotoObjects] = useState<{ id: string; url: string; ref: React.MutableRefObject<THREE.Group | null>; data: ParticleData; pos: THREE.Vector3; rot: THREE.Euler; scale: number; }[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setLoadedCount(prev => {
        if (prev >= photoObjects.length) {
          clearInterval(interval);
          return prev;
        }
        return prev + 1; // Load 1 photo per tick (smoother)
      });
    }, 100); // 100ms interval
    return () => clearInterval(interval);
  }, [photoObjects.length]);

  // --- Data Generation ---
  const { foliageData, photosData, lightsData } = useMemo(() => {
    const particleCount = 4500;
    const foliage = new Float32Array(particleCount * 3); const foliageChaos = new Float32Array(particleCount * 3); const foliageTree = new Float32Array(particleCount * 3); const sizes = new Float32Array(particleCount);
    const sphere = random.inSphere(new Float32Array(particleCount * 3), { radius: 18 }); for (let i = 0; i < particleCount * 3; i++) foliageChaos[i] = sphere[i];
    
    // PLANET SHAPE (Sphere)
    // 使用球体分布代替圆锥体
    const planetRadius = 8;
    const planetSphere = random.onSphere(new Float32Array(particleCount * 3), { radius: planetRadius });
    for (let i = 0; i < particleCount; i++) { 
        const i3 = i * 3; 
        // 增加一些随机厚度，让星球表面有厚度感
        const r = planetRadius + (Math.random() - 0.5) * 1.5;
        // 归一化向量并乘以新的半径
        const x = planetSphere[i3];
        const y = planetSphere[i3+1];
        const z = planetSphere[i3+2];
        const len = Math.sqrt(x*x + y*y + z*z);
        
        foliageTree[i3] = (x / len) * r;
        foliageTree[i3 + 1] = (y / len) * r;
        foliageTree[i3 + 2] = (z / len) * r;
        
        sizes[i] = Math.random() * 1.5 + 0.5; 
    }

    const lightCount = 300;
    const lightChaos = new Float32Array(lightCount * 3); const lightTree = new Float32Array(lightCount * 3); const lSphere = random.inSphere(new Float32Array(lightCount * 3), { radius: 20 });
    for (let i = 0; i < lightCount * 3; i++) lightChaos[i] = lSphere[i];
    
    // PLANET LIGHTS (Sphere)
    const lightPlanetRadius = 8.5; // 稍微比叶子大一点
    const lightPlanetSphere = random.onSphere(new Float32Array(lightCount * 3), { radius: lightPlanetRadius });
    for (let i = 0; i < lightCount; i++) { 
        const i3 = i * 3; 
        lightTree[i3] = lightPlanetSphere[i3];
        lightTree[i3 + 1] = lightPlanetSphere[i3+1];
        lightTree[i3 + 2] = lightPlanetSphere[i3+2];
    }

    // 实际存在的照片文件列表
    const photoFiles = Array.from({ length: 31 }, (_, i) => `${i + 1}.jpg`);

    // 按文件名排序 (数字顺序)
    photoFiles.sort((a, b) => parseInt(a) - parseInt(b));

    const photoCount = photoFiles.length;
    const photos: ParticleData[] = [];

    for (let i = 0; i < photoCount; i++) {
      const fileName = photoFiles[i];
      // 简单的文件名，没有日期信息，使用默认值
      const year = 2026;
      const month = "01";

      // --- FORMED: Planet Surface Layout ---
      // 使用斐波那契球体分布将照片均匀分布在星球表面
      // 黄金角度
      const phi = Math.acos(1 - 2 * (i + 0.5) / photoCount);
      const theta = Math.PI * (1 + Math.sqrt(5)) * (i + 0.5);
      
      const planetR = 9.5; // 照片浮在星球表面上方

      const treeX = planetR * Math.sin(phi) * Math.cos(theta);
      const treeY = planetR * Math.sin(phi) * Math.sin(theta);
      const treeZ = planetR * Math.cos(phi);
      
      // 计算旋转，使照片面向球心（或背向球心）
      const dummyObj = new THREE.Object3D();
      dummyObj.position.set(treeX, treeY, treeZ);
      dummyObj.lookAt(0, 0, 0); // 面向球心
      // 如果要面向外，可以 lookAt 2*x, 2*y, 2*z
      
      // 这里我们需要手动计算欧拉角，或者直接使用 lookAt 的结果
      // 为了简单，我们存储位置，在渲染时让它们面向中心
      // 但我们的系统是基于位置和旋转插值的，所以需要计算好旋转
      
      // 让照片面向外侧
      const normal = new THREE.Vector3(treeX, treeY, treeZ).normalize();
      const lookAtPos = new THREE.Vector3(treeX, treeY, treeZ).add(normal);
      dummyObj.lookAt(lookAtPos);
      
      const treeRotX = dummyObj.rotation.x;
      const treeRotY = dummyObj.rotation.y;
      const treeRotZ = dummyObj.rotation.z;


      // --- CHAOS: Fibonacci Sphere Layout (Even Distribution) ---
      // 使用斐波那契球体分布，确保照片均匀分布，减少重叠

      // 基础半径 (稍微随机化一点，避免完全在一个球面上)
      const r = 12 + Math.random() * 4;

      const chaosX = r * Math.sin(phi) * Math.cos(theta);
      const chaosY = r * Math.sin(phi) * Math.sin(theta) * 0.6; // Y轴压扁一点，形成椭球
      const chaosZ = r * Math.cos(phi);

      const imageUrl = `photos/${fileName}`;

      photos.push({
        id: `photo-${i}`,
        type: 'PHOTO',
        year: year,
        month: month,
        chaosPos: [chaosX, chaosY, chaosZ],
        treePos: [treeX, treeY, treeZ],
        chaosRot: [
          (Math.random() - 0.5) * 0.2, // X: 微小随机倾斜
          0 + (Math.random() - 0.5) * 0.2, // Y: 正面朝向 (0) + 微扰
          (Math.random() - 0.5) * 0.1 // Z: 微小倾斜
        ],
        treeRot: [treeRotX, treeRotY, treeRotZ], // 面向外
        scale: 0.9 + Math.random() * 0.3,
        image: imageUrl,
        color: 'white'
      });
    }
    return { foliageData: { current: foliage, chaos: foliageChaos, tree: foliageTree, sizes }, photosData: photos, lightsData: { chaos: lightChaos, tree: lightTree, count: lightCount } };
  }, []);

  useEffect(() => {
    setPhotoObjects(photosData.map(p => ({ id: p.id, url: p.image!, ref: React.createRef(), data: p, pos: new THREE.Vector3(), rot: new THREE.Euler(), scale: p.scale })));
  }, [photosData]);

  // --- 处理点击事件 ---
  // --- 处理点击事件 (Screen-Space Distance Selection) ---
  const photoOpenTimeRef = useRef<number>(0);

  useEffect(() => {
    if (state === 'CHAOS' && pointer) {
      // 如果已经有选中的照片，检查是否需要关闭
      if (selectedPhotoUrl) {
        // 检查锁定时间 (增加到 3 秒)
        if (Date.now() - photoOpenTimeRef.current < 3000) {
          return; // 锁定期间禁止关闭
        }

        // 点击任意位置关闭 (除了照片本身，但这里简化为再次点击关闭)
        // 实际上 App.tsx 里的 PhotoModal 遮罩层点击也会触发 setSelectedPhotoUrl(null)
        // 这里主要处理点击"空地"的情况

        // 重新计算是否点到了照片 (为了避免误触关闭)
        // 但根据需求"单指照片可以精准选中并关闭了"，说明用户希望点击照片也能关闭?
        // 现在的逻辑是: 如果有点到照片 -> 切换; 如果没点到 -> 关闭

        // 让我们简化逻辑: 只要过了2秒，点击任何地方都尝试关闭或切换
        // 但为了防止误触，我们还是检测一下

        // ... (保持原有检测逻辑，但增加关闭逻辑)
      }

      // 1. 转换 Pointer 到 NDC (-1 to 1)
      const ndcX = pointer.x * 2 - 1;
      const ndcY = -(pointer.y * 2) + 1;

      // 2. 遍历所有照片，计算屏幕空间距离
      let closestPhotoId: string | null = null;
      let minDistance = Infinity;
      const SELECTION_THRESHOLD = 0.05; // Reduced from 0.15 to 0.05 for higher precision

      photoObjects.forEach(obj => {
        if (!obj.ref.current) return;

        // 获取照片世界坐标
        const worldPos = new THREE.Vector3();
        obj.ref.current.getWorldPosition(worldPos);

        // 投影到屏幕空间
        const screenPos = worldPos.clone().project(camera);

        // 检查是否在相机前方 (z < 1)
        if (screenPos.z < 1) {
          // 计算 NDC 距离
          const dist = Math.hypot(screenPos.x - ndcX, screenPos.y - ndcY);

          if (dist < SELECTION_THRESHOLD && dist < minDistance) {
            minDistance = dist;
            closestPhotoId = obj.data.image!;
          }
        }
      });

      if (closestPhotoId) {
        // 如果点击的是当前照片，且过了锁定时间 -> 关闭
        if (selectedPhotoUrl === closestPhotoId) {
          if (Date.now() - photoOpenTimeRef.current > 3000) {
            setSelectedPhotoUrl(null);
          }
        } else {
          // 选中新照片
          setSelectedPhotoUrl(closestPhotoId);
          photoOpenTimeRef.current = Date.now(); // 记录打开时间
        }
      } else if (selectedPhotoUrl) {
        // Clicked on empty space -> Close photo (if not locked)
        if (Date.now() - photoOpenTimeRef.current > 3000) {
          setSelectedPhotoUrl(null);
        }
      }
    }
  }, [clickTrigger]); // Remove selectedPhotoUrl dependency to avoid double-firing loop

  // --- Animation Loop ---
  useFrame((state3d, delta) => {
    const targetProgress = state === 'FORMED' ? 1 : 0;
    progress.current = THREE.MathUtils.damp(progress.current, targetProgress, 2.0, delta);
    const ease = progress.current * progress.current * (3 - 2 * progress.current);
    treeRotation.current += (state === 'FORMED' ? (rotationSpeed + rotationBoost) : 0.05) * delta;

    // 应用平移 (带阻尼)
    // 允许在任何状态下平移，使用较快的跟随速度
    const targetPanX = panOffset.x;
    const targetPanY = panOffset.y;

    currentPan.current.x = THREE.MathUtils.lerp(currentPan.current.x, targetPanX, 0.2);
    currentPan.current.y = THREE.MathUtils.lerp(currentPan.current.y, targetPanY, 0.2);

    if (groupRef.current) {
      groupRef.current.position.x = currentPan.current.x;
      groupRef.current.position.y = currentPan.current.y;
    }

    if (pointsRef.current) {
      // @ts-ignore
      pointsRef.current.material.uniforms.uTime.value = state3d.clock.getElapsedTime();
      const positions = pointsRef.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < positions.length / 3; i++) {
        const i3 = i * 3; const cx = foliageData.chaos[i3]; const cy = foliageData.chaos[i3 + 1]; const cz = foliageData.chaos[i3 + 2]; const tx = foliageData.tree[i3]; const ty = foliageData.tree[i3 + 1]; const tz = foliageData.tree[i3 + 2];
        
        // Planet Logic: Interpolate directly between positions
        // Chaos Rotation
        const cr = Math.sqrt(cx * cx + cz * cz);
        const cAngle = Math.atan2(cz, cx);
        const cRotatedX = cr * Math.cos(cAngle + treeRotation.current * 0.5);
        const cRotatedZ = cr * Math.sin(cAngle + treeRotation.current * 0.5);

        // Tree (Planet) Rotation
        const tr = Math.sqrt(tx * tx + tz * tz);
        const tAngle = Math.atan2(tz, tx);
        const currentAngle = tAngle + treeRotation.current;
        const formedX = tr * Math.cos(currentAngle);
        const formedZ = tr * Math.sin(currentAngle);

        positions[i3] = THREE.MathUtils.lerp(cRotatedX, formedX, ease); 
        positions[i3 + 1] = THREE.MathUtils.lerp(cy, ty, ease); 
        positions[i3 + 2] = THREE.MathUtils.lerp(cRotatedZ, formedZ, ease);
      }
      pointsRef.current.geometry.attributes.position.needsUpdate = true;
    }
    if (lightsRef.current) {
      const dummy = new THREE.Object3D();
      for (let i = 0; i < lightsData.count; i++) {
        const i3 = i * 3; const cx = lightsData.chaos[i3]; const cy = lightsData.chaos[i3 + 1]; const cz = lightsData.chaos[i3 + 2]; const tx = lightsData.tree[i3]; const ty = lightsData.tree[i3 + 1]; const tz = lightsData.tree[i3 + 2];
        
        // Planet Logic
        const cr = Math.sqrt(cx * cx + cz * cz);
        const cAngle = Math.atan2(cz, cx);
        const cRotatedX = cr * Math.cos(cAngle + treeRotation.current * 0.3);
        const cRotatedZ = cr * Math.sin(cAngle + treeRotation.current * 0.3);

        const tr = Math.sqrt(tx * tx + tz * tz);
        const tAngle = Math.atan2(tz, tx);
        const currentAngle = tAngle + treeRotation.current;
        const formedX = tr * Math.cos(currentAngle);
        const formedZ = tr * Math.sin(currentAngle);

        const fx = THREE.MathUtils.lerp(cRotatedX, formedX, ease); 
        const fy = THREE.MathUtils.lerp(cy, ty, ease);
        const fz = THREE.MathUtils.lerp(cRotatedZ, formedZ, ease);
        
        dummy.position.set(fx, fy, fz); dummy.scale.setScalar(1); dummy.updateMatrix(); lightsRef.current.setMatrixAt(i, dummy.matrix);
      }
      lightsRef.current.instanceMatrix.needsUpdate = true;
    }
    // 更新所有照片的扫光时间
    photoObjects.forEach(obj => {
      if (obj.ref.current) {
        // 查找 shimmerMaterial 并更新 uTime
        obj.ref.current.traverse((child) => {
          // @ts-ignore
          if (child.material && child.material.uniforms && child.material.uniforms.uTime) {
            // @ts-ignore
            child.material.uniforms.uTime.value = state3d.clock.getElapsedTime() + parseInt(obj.id.split('-')[1] || '0');
          }
        });
      }
    });
    if (trunkRef.current) {
      const trunkScale = THREE.MathUtils.smoothstep(ease, 0.3, 1.0); trunkRef.current.scale.set(trunkScale, ease, trunkScale); trunkRef.current.position.y = 1; trunkRef.current.rotation.y = treeRotation.current;
    }
    photoObjects.forEach((obj, index) => {
      if (!obj.ref.current) return;
      const { chaosPos, treePos, chaosRot, treeRot } = obj.data;
      const [cx, cy, cz] = chaosPos; const [tx, ty, tz] = treePos;
      const [crx, cry, crz] = chaosRot; const [trx, try_, trz] = treeRot;

      // Planet Logic
      const cr = Math.sqrt(cx * cx + cz * cz);
      const cAngle = Math.atan2(cz, cx);
      const cRotatedX = cr * Math.cos(cAngle + treeRotation.current * 0.5);
      const cRotatedZ = cr * Math.sin(cAngle + treeRotation.current * 0.5);

      const tr = Math.sqrt(tx * tx + tz * tz);
      const tAngle = Math.atan2(tz, tx);
      const currentAngle = tAngle + treeRotation.current;
      const formedX = tr * Math.cos(currentAngle);
      const formedZ = tr * Math.sin(currentAngle);

      // Add Sci-Fi Drift in CHAOS mode
      const time = state3d.clock.getElapsedTime();
      const driftX = Math.sin(time * 0.2 + index) * 0.5;
      const driftY = Math.cos(time * 0.3 + index) * 0.5;
      const driftZ = Math.sin(time * 0.4 + index) * 0.5;

      obj.ref.current.position.x = THREE.MathUtils.lerp(cRotatedX + driftX, formedX, ease);
      obj.ref.current.position.y = THREE.MathUtils.lerp(cy + driftY, ty, ease);
      obj.ref.current.position.z = THREE.MathUtils.lerp(cRotatedZ + driftZ, formedZ, ease);

      // Rotation interpolation
      if (state === 'FORMED') {
          if (ease > 0.9) {
             const pos = obj.ref.current.position;
             obj.ref.current.lookAt(pos.x * 2, pos.y * 2, pos.z * 2);
          } else {
             obj.ref.current.rotation.x = THREE.MathUtils.lerp(crx, trx, ease);
             obj.ref.current.rotation.y = THREE.MathUtils.lerp(cry, try_ + treeRotation.current, ease);
             obj.ref.current.rotation.z = THREE.MathUtils.lerp(crz, trz, ease);
          }
      } else {
          // Add slow rotation drift in CHAOS mode
          obj.ref.current.rotation.x = THREE.MathUtils.lerp(crx + Math.sin(time * 0.1 + index) * 0.1, trx, ease);
          obj.ref.current.rotation.y = THREE.MathUtils.lerp(cry + Math.cos(time * 0.1 + index) * 0.1, try_, ease);
          obj.ref.current.rotation.z = THREE.MathUtils.lerp(crz + Math.sin(time * 0.15 + index) * 0.1, trz, ease);
      }
      
      const s = obj.data.scale;
      // Increase scale in CHAOS state (ease=0) to make photos larger
      const currentScale = THREE.MathUtils.lerp(s * 1.5, s, ease);
      obj.ref.current.scale.setScalar(currentScale);
    });
  });

  return (
    <group ref={groupRef}>
      {/* 隐藏树干，因为星球不需要树干 */}
      <mesh ref={trunkRef} position={[0, 0, 0]} visible={false}><cylinderGeometry args={[0.2, 0.8, 14, 8]} /><meshStandardMaterial color="#3E2723" roughness={0.9} metalness={0.1} /></mesh>
      <points ref={pointsRef}> <bufferGeometry> <bufferAttribute attach="attributes-position" count={foliageData.current.length / 3} array={foliageData.current} itemSize={3} /> <bufferAttribute attach="attributes-size" count={foliageData.sizes.length} array={foliageData.sizes} itemSize={1} /> </bufferGeometry> <foliageMaterial transparent depthWrite={false} blending={THREE.AdditiveBlending} /> </points>
      <instancedMesh ref={lightsRef} args={[undefined, undefined, lightsData.count]}><sphereGeometry args={[0.05, 8, 8]} /><meshStandardMaterial color="#ffddaa" emissive="#ffbb00" emissiveIntensity={3} toneMapped={false} /></instancedMesh>
      
      {/* Network Lines connecting photos */}
      <NetworkLines photoObjects={photoObjects} />

      {photoObjects.map((obj, index) => (
        <group key={obj.id} ref={(el) => { obj.ref.current = el; }}>
          <PolaroidPhoto
            url={obj.url}
            position={obj.pos}
            rotation={obj.rot}
            scale={obj.scale}
            id={obj.id}
            shouldLoad={index < loadedCount}
            year={obj.data.year}
          />

          {/* Year Label - Only show for the first photo of each year */}
          {obj.data.year && (index === 0 || photoObjects[index - 1].data.year !== obj.data.year) && (
            <group position={[0, 0.65, 0.05]}>
              {/* Shadow Layer */}
              <Text
                position={[0.01, -0.01, -0.01]} // Slight offset for drop shadow
                fontSize={0.18}
                maxWidth={1.2} // Allow full width
                color="#000000"
                font="fonts/Cinzel-Bold.ttf"
                characters="0123456789-"
                anchorX="center"
                anchorY="bottom"
                fillOpacity={0.5}
              >
                {`${obj.data.year}-${obj.data.month}`}
              </Text>
              {/* Main Text Layer */}
              <Text
                fontSize={0.18} // Very small
                maxWidth={1.2}
                color="#ffd700" // Gold
                font="fonts/Cinzel-Bold.ttf"
                characters="0123456789-"
                anchorX="center"
                anchorY="bottom"
                fillOpacity={state === 'FORMED' ? 1 : 0.9}
                outlineWidth={0} // No outline
              >
                {`${obj.data.year}-${obj.data.month}`}
              </Text>
            </group>
          )
          }
        </group>
      ))}

      {/* Time Line Connection (Only visible in FORMED state) - REMOVED for cleaner planet look */}
      {/* {state === 'FORMED' && (
        <Line
          points={photoObjects.map(obj => new THREE.Vector3(...obj.data.treePos))}
          color="#ffd700"
          opacity={0.3}
          transparent
          lineWidth={1}
        />
      )} */}

      {/* Planet Core / Atmosphere */}
      {state === 'FORMED' && (
         <group>
            {/* Inner Core - Dark blocking sphere */}
            <mesh position={[0,0,0]}>
                <sphereGeometry args={[7.5, 32, 32]} />
                <meshBasicMaterial color="#000000" transparent opacity={0.9} />
            </mesh>
            {/* Tech Grid - Cyan */}
            <mesh position={[0,0,0]}>
                <sphereGeometry args={[7.6, 24, 24]} />
                <meshBasicMaterial color="#00ffff" wireframe transparent opacity={0.15} />
            </mesh>
            {/* Outer Grid - Purple Pulse */}
            <mesh position={[0,0,0]} rotation={[0.5, 0.5, 0]}>
                <sphereGeometry args={[7.8, 16, 16]} />
                <meshBasicMaterial color="#9D00FF" wireframe transparent opacity={0.1} />
            </mesh>
         </group>
      )}
    </group>
  );
};

export default TreeSystem;
