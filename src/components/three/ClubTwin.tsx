import { Canvas, useFrame } from '@react-three/fiber'
import { Grid, Html, OrbitControls, RoundedBox } from '@react-three/drei'
import { useRef } from 'react'
import * as THREE from 'three'

export type TwinZone = { name: string; occupancy: number; capacity: number; position: [number, number]; size: [number, number] }
export type TwinPulse = { id: string; result: 'GRANTED' | 'DENIED' } | null

function Zone({ zone }: { zone: TwinZone }) {
  const pillar = useRef<THREE.Mesh>(null)
  const load = Math.min(1, zone.occupancy / Math.max(1, zone.capacity))
  const color = load > 0.8 ? '#ff9f5f' : load > 0.55 ? '#5ff4ff' : '#d7ff5f'
  const height = 0.25 + load * 2.2

  useFrame((_, delta) => {
    if (!pillar.current) return
    pillar.current.scale.y = THREE.MathUtils.damp(pillar.current.scale.y, height, 4, delta)
    pillar.current.position.y = pillar.current.scale.y / 2
  })

  return (
    <group position={[zone.position[0], 0, zone.position[1]]}>
      <RoundedBox args={[zone.size[0], 0.08, zone.size[1]]} radius={0.04} position={[0, 0.04, 0]}>
        <meshStandardMaterial color="#121712" metalness={0.4} roughness={0.6} />
      </RoundedBox>
      <mesh position={[0, 0.085, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[zone.size[0] - 0.08, zone.size[1] - 0.08]} />
        <meshBasicMaterial color={color} transparent opacity={0.08 + load * 0.12} />
      </mesh>
      <mesh ref={pillar} scale={[1, 0.01, 1]}>
        <boxGeometry args={[0.38, 1, 0.38]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.4} toneMapped={false} transparent opacity={0.92} />
      </mesh>
      <Html position={[0, height + 0.45, 0]} center distanceFactor={9} zIndexRange={[10, 0]}>
        <div className="twin-label">
          <strong>{zone.name}</strong>
          <span>{zone.occupancy}/{zone.capacity}</span>
        </div>
      </Html>
    </group>
  )
}

function GateArch({ pulse }: { pulse: TwinPulse }) {
  const light = useRef<THREE.MeshStandardMaterial>(null)
  const lastPulse = useRef<string | null>(null)
  const flash = useRef(0)

  useFrame((_, delta) => {
    if (pulse && pulse.id !== lastPulse.current) {
      lastPulse.current = pulse.id
      flash.current = 1
    }
    flash.current = Math.max(0, flash.current - delta * 0.9)
    if (!light.current) return
    const target = pulse?.result === 'DENIED' ? '#ff5f6d' : '#5fffa8'
    light.current.color.set(flash.current > 0 ? target : '#d7ff5f')
    light.current.emissive.set(flash.current > 0 ? target : '#d7ff5f')
    light.current.emissiveIntensity = 0.6 + flash.current * 4
  })

  return (
    <group position={[0, 0, 3.3]}>
      {[-0.7, 0.7].map((x) => (
        <mesh key={x} position={[x, 0.6, 0]}>
          <boxGeometry args={[0.12, 1.2, 0.12]} />
          <meshStandardMaterial color="#d9dcd6" metalness={1} roughness={0.2} />
        </mesh>
      ))}
      <mesh position={[0, 1.25, 0]}>
        <boxGeometry args={[1.55, 0.1, 0.14]} />
        <meshStandardMaterial ref={light} color="#d7ff5f" emissive="#d7ff5f" emissiveIntensity={0.6} toneMapped={false} />
      </mesh>
      <Html position={[0, 1.65, 0]} center distanceFactor={9} zIndexRange={[10, 0]}>
        <div className="twin-label twin-gate">Main gate</div>
      </Html>
    </group>
  )
}

export default function ClubTwin({ zones, pulse }: { zones: TwinZone[]; pulse: TwinPulse }) {
  return (
    <Canvas dpr={[1, 1.75]} camera={{ position: [7, 6.5, 8], fov: 38 }} gl={{ alpha: true, antialias: true }}>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 8, 4]} intensity={1.4} />
      <pointLight position={[0, 3, 3]} intensity={10} color="#d7ff5f" />
      <group position={[0, -0.6, -0.4]}>
        {zones.map((zone) => <Zone key={zone.name} zone={zone} />)}
        <GateArch pulse={pulse} />
        <Grid args={[20, 20]} cellSize={0.5} cellThickness={0.6} sectionSize={2.5} sectionThickness={1} sectionColor="#3a4a2a" cellColor="#1d241a" fadeDistance={22} infiniteGrid position={[0, -0.001, 0]} />
      </group>
      <OrbitControls enablePan={false} minDistance={7} maxDistance={16} maxPolarAngle={Math.PI / 2.3} autoRotate autoRotateSpeed={0.5} />
    </Canvas>
  )
}
