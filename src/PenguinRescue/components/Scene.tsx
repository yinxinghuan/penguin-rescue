import { useEffect, useRef, useState } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { CAMERA_FOV, CAMERA_POS, PLAYFIELD } from '../constants';
import { Penguin } from './Penguin';
import { Skua } from './Skua';
import { Seal } from './Seal';
import { Iceberg } from './Iceberg';
import { useGameLoop, GameRef } from '../hooks/useGameLoop';
import type { Stick } from '../types';

interface SceneProps {
  state: React.MutableRefObject<GameRef>;
  playing: boolean;
  stickRef: React.MutableRefObject<Stick>;
  onScore: (s: number) => void;
  onGameOver: (final: number) => void;
  playSfx: (k: any) => void;
  haptic?: (k: 'light' | 'heavy') => void;
}

// Set up the default camera position and orientation once.
function CameraSetup() {
  const { camera, size } = useThree();
  useEffect(() => {
    camera.position.set(...CAMERA_POS);
    (camera as THREE.PerspectiveCamera).fov = CAMERA_FOV;
    (camera as THREE.PerspectiveCamera).near = 0.1;
    (camera as THREE.PerspectiveCamera).far = 200;
    camera.lookAt(0, 0, 0);
    (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
  }, [camera, size.width, size.height]);
  return null;
}

// Per-actor follower component — uses refs directly to avoid React re-renders.
function FollowMesh({
  posRef, rotRef, children,
}: { posRef: () => THREE.Vector3; rotRef: () => number; children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (!ref.current) return;
      ref.current.position.copy(posRef());
      ref.current.rotation.y = rotRef();
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [posRef, rotRef]);
  return <group ref={ref}>{children}</group>;
}

export function Scene({ state, playing, stickRef, onScore, onGameOver, playSfx, haptic }: SceneProps) {
  // Run the game loop hook inside <Canvas> (it uses useFrame).
  useGameLoop({
    state,
    playing,
    stick: stickRef.current,
    onScore,
    onGameOver,
    playSfx,
    haptic,
  });

  // Tick lightly so dynamic arrays (babies/seals/bodyParts) reflect spawning/despawn.
  const [, force] = useState(0);
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      force(t => (t + 1) % 1_000_000);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const d = state.current;

  return (
    <>
      <CameraSetup />
      <fog attach="fog" args={['#0a2238', PLAYFIELD * 0.9, PLAYFIELD * 2.2]} />
      <ambientLight intensity={0.45} />
      <directionalLight
        position={[18, 38, 8]}
        intensity={1.5}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
        shadow-camera-near={0.5}
        shadow-camera-far={80}
        shadow-bias={-0.0008}
      />
      {/* sky-ish hemisphere fill */}
      <hemisphereLight args={['#9bc1e0', '#4a5a78', 0.35]} />

      {/* outer water — extends well beyond the visible playfield */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
        <planeGeometry args={[PLAYFIELD * 4, PLAYFIELD * 4]} />
        <meshStandardMaterial color="#1f4a6b" />
      </mesh>
      {/* dark water ripple ring just outside the ice */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <ringGeometry args={[PLAYFIELD / 2 + 2.5, PLAYFIELD / 2 + 12, 64]} />
        <meshStandardMaterial color="#0d2c46" />
      </mesh>
      {/* main ice rink — round disc that fully contains the iceberg ring */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <circleGeometry args={[PLAYFIELD / 2 + 4, 64]} />
        <meshStandardMaterial color="#bfd9ea" roughness={0.95} />
      </mesh>
      {/* inner brighter ice patch — gives a soft glow center for contrast */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <circleGeometry args={[PLAYFIELD / 2 - 2, 48]} />
        <meshStandardMaterial color="#e0eef7" roughness={0.85} />
      </mesh>
      {/* dark sea-ice cracks — non-radial, off-center so they don't form a star.
          Hand-picked seeds for an organic broken-floe look. */}
      {[
        { x: -7, z:  3, rot: 0.4,  len: 14, w: 0.30 },
        { x:  5, z: -6, rot: 1.7,  len: 10, w: 0.22 },
        { x:  8, z:  6, rot: -0.6, len: 12, w: 0.28 },
        { x: -3, z: -9, rot: 2.6,  len:  9, w: 0.20 },
        { x:  2, z:  9, rot: 0.9,  len:  7, w: 0.18 },
        { x: -9, z: -2, rot: 1.2,  len:  6, w: 0.16 },
      ].map((c, i) => (
        <mesh
          key={`crack_${i}`}
          rotation={[-Math.PI / 2, 0, c.rot]}
          position={[c.x, 0.01, c.z]}
        >
          <planeGeometry args={[c.w, c.len]} />
          <meshStandardMaterial color="#0a2238" transparent opacity={0.85} />
        </mesh>
      ))}

      {/* Icebergs */}
      {d.icebergs.map(ice => (
        <Iceberg key={ice.id} id={ice.id} position={[ice.position.x, ice.position.y, ice.position.z]} scale={1.4} />
      ))}

      {/* Leader penguin */}
      <FollowMesh posRef={() => d.headPos} rotRef={() => d.headRot}>
        <Penguin isLeader />
      </FollowMesh>

      {/* Skua — flying overhead, hunts the leader */}
      <FollowMesh posRef={() => d.skuaPos} rotRef={() => d.skuaRot}>
        <Skua />
      </FollowMesh>

      {/* Body chain */}
      {d.bodyParts.map(seg => (
        <FollowMesh
          key={`b_${seg.id}`}
          posRef={() => seg.position}
          rotRef={() => seg.rotation}
        >
          <Penguin colorType={seg.colorType} />
        </FollowMesh>
      ))}

      {/* Stray babies */}
      {d.babies.map(baby => (
        <FollowMesh
          key={`s_${baby.id}`}
          posRef={() => baby.position}
          rotRef={() => 0}
        >
          <Penguin colorType={baby.colorType} />
        </FollowMesh>
      ))}

      {/* Seals */}
      {d.seals.map(seal => (
        <FollowMesh
          key={`d_${seal.id}`}
          posRef={() => seal.position}
          rotRef={() => seal.rotation}
        >
          <Seal />
        </FollowMesh>
      ))}
    </>
  );
}
