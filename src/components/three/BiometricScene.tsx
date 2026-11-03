import { Canvas, useFrame } from '@react-three/fiber'
import { Float } from '@react-three/drei'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'

export type ScanState = 'idle' | 'scanning' | 'granted' | 'denied'

const palette: Record<ScanState, string> = {
  idle: '#d7ff5f',
  scanning: '#5ff4ff',
  granted: '#5fffa8',
  denied: '#ff5f6d',
}

function FingerprintRings({ state }: { state: ScanState }) {
  const group = useRef<THREE.Group>(null)
  const target = useMemo(() => new THREE.Color(), [])
  const rings = useMemo(
    () => Array.from({ length: 11 }, (_, index) => ({
      radius: 0.18 + index * 0.1,
      arc: Math.PI * (1.15 + ((index * 37) % 7) / 10),
      start: ((index * 53) % 10) / 10 * Math.PI,
      tilt: index % 2 === 0 ? 0.06 : -0.06,
    })),
    [],
  )
  const materials = useRef<THREE.MeshStandardMaterial[]>([])

  useFrame((clock, delta) => {
    target.set(palette[state])
    materials.current.forEach((material, index) => {
      material.color.lerp(target, Math.min(1, delta * 6))
      material.emissive.lerp(target, Math.min(1, delta * 6))
      const wave = Math.sin(clock.clock.elapsedTime * (state === 'scanning' ? 7 : 2) - index * 0.55)
      material.emissiveIntensity = 0.8 + (wave + 1) * (state === 'scanning' ? 1.6 : 0.6)
    })
    if (group.current) {
      group.current.rotation.y = Math.sin(clock.clock.elapsedTime * 0.6) * 0.35 + clock.pointer.x * 0.4
      group.current.rotation.x = -clock.pointer.y * 0.3
    }
  })

  return (
    <group ref={group} scale={[1, 1.28, 1]}>
      {rings.map((ring, index) => (
        <mesh key={ring.radius} rotation={[ring.tilt, 0, ring.start]}>
          <torusGeometry args={[ring.radius, 0.022, 12, 120, ring.arc]} />
          <meshStandardMaterial
            ref={(material) => {
              if (material) materials.current[index] = material
            }}
            color={palette.idle}
            emissive={palette.idle}
            emissiveIntensity={1}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  )
}

function ScanBeam({ state }: { state: ScanState }) {
  const beam = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => {
    if (!beam.current) return
    const speed = state === 'scanning' ? 3.2 : 1.1
    beam.current.position.y = Math.sin(clock.elapsedTime * speed) * 1.25
    const material = beam.current.material as THREE.MeshBasicMaterial
    material.opacity = state === 'idle' ? 0.25 : 0.65
  })
  return (
    <mesh ref={beam} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[2.8, 0.05]} />
      <meshBasicMaterial color="#5ff4ff" transparent opacity={0.4} toneMapped={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
    </mesh>
  )
}

function Shell({ state }: { state: ScanState }) {
  const shell = useRef<THREE.Mesh>(null)
  useFrame((_, delta) => {
    if (!shell.current) return
    shell.current.rotation.y += delta * (state === 'scanning' ? 1.2 : 0.25)
    shell.current.rotation.z += delta * 0.1
    const material = shell.current.material as THREE.MeshBasicMaterial
    material.color.lerp(new THREE.Color(palette[state]), Math.min(1, delta * 4))
  })
  return (
    <mesh ref={shell}>
      <icosahedronGeometry args={[1.9, 1]} />
      <meshBasicMaterial color={palette.idle} wireframe transparent opacity={0.18} />
    </mesh>
  )
}

export default function BiometricScene({ state = 'idle' }: { state?: ScanState }) {
  return (
    <Canvas dpr={[1, 1.75]} camera={{ position: [0, 0, 6.2], fov: 42 }} gl={{ alpha: true, antialias: true }}>
      <ambientLight intensity={0.4} />
      <Float speed={2} floatIntensity={0.6} rotationIntensity={0.2}>
        <FingerprintRings state={state} />
        <ScanBeam state={state} />
      </Float>
      <Shell state={state} />
    </Canvas>
  )
}
