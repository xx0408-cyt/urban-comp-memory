
import React, { useContext, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TreeContext, TreeContextType } from '../types';

const CrystalOrnaments: React.FC = () => {
  // 1. 引入 panOffset
  const { state, rotationSpeed, panOffset } = useContext(TreeContext) as TreeContextType;
  const groupRef = useRef<THREE.Group>(null);

  const progress = useRef(0);
  const treeRotation = useRef(0);

  // 2. 增加平滑位移 Ref
  const currentPan = useRef({ x: 0, y: 0 });

  const ornaments = useMemo(() => {
    const count = 50; // 减少装饰物数量，让照片更突出
    const items = [];

    // Cosmic colors: Cyan, Purple, Gold, Silver
    const colors = ['#00FFFF', '#9D00FF', '#FFD700', '#C0C0C0'];

    for (let i = 0; i < count; i++) {
      // Tree Form Data (Planet Surface)
      // 使用球体分布
      const planetR = 8.8; // 介于星球表面和照片之间
      const pPhi = Math.acos(1 - 2 * (i + 0.5) / count);
      const pTheta = Math.PI * (1 + Math.sqrt(5)) * (i + 0.5);
      
      const treeX = planetR * Math.sin(pPhi) * Math.cos(pTheta);
      const treeY = planetR * Math.sin(pPhi) * Math.sin(pTheta);
      const treeZ = planetR * Math.cos(pPhi);

      // Chaos Form Data (Outside photos)
      const radius = 10 + Math.random() * 12;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      const chaosPos = [
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.sin(phi) * Math.sin(theta),
        radius * Math.cos(phi)
      ];

      // Type
      const type = Math.random() > 0.5 ? 'sphere' : 'box';

      // Random color
      const color = colors[Math.floor(Math.random() * colors.length)];

      items.push({
        id: i,
        chaosPos: new THREE.Vector3(...chaosPos),
        treePos: new THREE.Vector3(treeX, treeY, treeZ),
        type,
        color,
        scale: Math.random() * 0.2 + 0.15
      });
    }
    return items;
  }, []);

  useFrame((state3d, delta) => {
    const targetProgress = state === 'FORMED' ? 1 : 0;
    progress.current = THREE.MathUtils.damp(progress.current, targetProgress, 2.0, delta);
    const p = progress.current;
    const ease = p * p * (3 - 2 * p);

    const spinFactor = state === 'FORMED' ? rotationSpeed : 0.05;
    treeRotation.current += spinFactor * delta;

    // 3. 应用平移逻辑 (与 TreeSystem 保持一致)
    // 允许在任何状态下平移，使用较快的跟随速度
    const targetPanX = panOffset.x;
    const targetPanY = panOffset.y;

    currentPan.current.x = THREE.MathUtils.lerp(currentPan.current.x, targetPanX, 0.2);
    currentPan.current.y = THREE.MathUtils.lerp(currentPan.current.y, targetPanY, 0.2);

    if (groupRef.current) {
      groupRef.current.position.x = currentPan.current.x;
      groupRef.current.position.y = currentPan.current.y;

      groupRef.current.children.forEach((child, i) => {
        if (child.name === 'STAR') {
          const starY = THREE.MathUtils.lerp(10, 7.5, ease);
          child.position.set(0, starY, 0);
          child.rotation.y += delta * 0.5;
          const s = 1.0 + Math.sin(state3d.clock.elapsedTime * 3) * 0.1;
          child.scale.setScalar(THREE.MathUtils.lerp(0, s, ease));
          return;
        }

        const data = ornaments[i];
        if (!data) return;

        const cx = data.chaosPos.x;
        const cy = data.chaosPos.y;
        const cz = data.chaosPos.z;
        
        // Chaos Rotation
        const cAngle = Math.atan2(cz, cx);
        const cr = Math.sqrt(cx * cx + cz * cz);
        const cRotatedX = cr * Math.cos(cAngle + treeRotation.current * 0.1);
        const cRotatedZ = cr * Math.sin(cAngle + treeRotation.current * 0.1);

        // Tree Position (Planet)
        // @ts-ignore
        const tx = data.treePos.x;
        // @ts-ignore
        const ty = data.treePos.y;
        // @ts-ignore
        const tz = data.treePos.z;
        
        // Apply rotation to tree position
        const tr = Math.sqrt(tx * tx + tz * tz);
        const tAngle = Math.atan2(tz, tx);
        const currentAngle = tAngle + treeRotation.current;
        
        const rotatedTx = tr * Math.cos(currentAngle);
        const rotatedTz = tr * Math.sin(currentAngle);

        child.position.x = THREE.MathUtils.lerp(cRotatedX, rotatedTx, ease);
        child.position.y = THREE.MathUtils.lerp(cy, ty, ease);
        child.position.z = THREE.MathUtils.lerp(cRotatedZ, rotatedTz, ease);

        child.rotation.x += delta * (1 - ease);
        child.rotation.y += delta * (1 - ease);
      });
    }
  });

  return (
    <group ref={groupRef}>
      {ornaments.map((o, i) => (
        <mesh key={i} scale={o.scale * 0.7} castShadow receiveShadow>
          {o.type === 'sphere' && <sphereGeometry args={[1, 16, 16]} />}
          {o.type === 'box' && <boxGeometry args={[1, 1, 1]} />}

          <meshStandardMaterial
            color={o.color}
            roughness={0.1}
            metalness={0.9}
            emissive={o.color}
            emissiveIntensity={2.0}
            transparent
            opacity={0.9}
          />
        </mesh>
      ))}
    </group>
  );
};

export default CrystalOrnaments;
