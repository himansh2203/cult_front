import { Canvas, useFrame } from '@react-three/fiber'
import { Environment, Float, Lightformer, Sparkles } from '@react-three/drei'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'

const VOLT = '#d7ff5f'
const CYAN = '#5ff4ff'

function Plate({ x, radius, depth }: { x: number; radius: number; depth: number }) {
  return (
    <group position={[x, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
      <mesh castShadow>
        <cylinderGeometry args={[radius, radius, depth, 64, 1]} />
        <meshStandardMaterial color="#141814" metalness={0.85} roughness={0.32} />
      </mesh>
      <mesh position={[0, depth / 2 + 0.001, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[radius * 0.82, 0.018, 12, 96]} />
        <meshStandardMaterial color={VOLT} emissive={VOLT} emissiveIntensity={2.4} toneMapped={false} />
      </mesh>
      <mesh position={[0, -depth / 2 - 0.001, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[radius * 0.82, 0.018, 12, 96]} />
        <meshStandardMaterial color={VOLT} emissive={VOLT} emissiveIntensity={2.4} toneMapped={false} />
      </mesh>
    </group>
  )
}

function Dumbbell() {
  const group = useRef<THREE.Group>(null)

  useFrame((state, delta) => {
    if (!group.current) return
    const targetY = state.pointer.x * 0.6 + state.clock.elapsedTime * 0.25
    const targetX = -state.pointer.y * 0.35 + 0.35
    group.current.rotation.y = THREE.MathUtils.damp(group.current.rotation.y, targetY, 3, delta)
    group.current.rotation.x = THREE.MathUtils.damp(group.current.rotation.x, targetX, 3, delta)
  })

  return (
    <Float speed={1.6} rotationIntensity={0.35} floatIntensity={1.1}>
      <group ref={group} rotation={[0.35, 0, -0.32]} scale={1.05}>
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.085, 0.085, 3.4, 32]} />
          <meshStandardMaterial color="#d9dcd6" metalness={1} roughness={0.18} />
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.11, 0.11, 1.1, 32]} />
          <meshStandardMaterial color="#2a2f2a" metalness={0.6} roughness={0.7} />
        </mesh>
        {[-1, 1].map((side) => (
          <group key={side}>
            <Plate x={side * 0.82} radius={0.82} depth={0.16} />
            <Plate x={side * 1.0} radius={0.68} depth={0.14} />
            <Plate x={side * 1.16} radius={0.52} depth={0.12} />
            <mesh position={[side * 1.3, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.16, 0.16, 0.1, 32]} />
              <meshStandardMaterial color="#e8eae4" metalness={1} roughness={0.12} />
            </mesh>
          </group>
        ))}
      </group>
    </Float>
  )
}

function EnergyRings() {
  const ringA = useRef<THREE.Mesh>(null)
  const ringB = useRef<THREE.Mesh>(null)
  useFrame((_, delta) => {
    if (ringA.current) ringA.current.rotation.z += delta * 0.35
    if (ringB.current) ringB.current.rotation.z -= delta * 0.22
  })
  return (
    <group rotation={[1.25, 0, 0]}>
      <mesh ref={ringA}>
        <torusGeometry args={[2.35, 0.012, 16, 200, Math.PI * 1.6]} />
        <meshBasicMaterial color={VOLT} toneMapped={false} />
      </mesh>
      <mesh ref={ringB} rotation={[0.3, 0.2, 0]}>
        <torusGeometry args={[2.75, 0.008, 16, 200, Math.PI * 1.2]} />
        <meshBasicMaterial color={CYAN} toneMapped={false} transparent opacity={0.8} />
      </mesh>
    </group>
  )
}

function ParticleField({ count = 1400 }: { count?: number }) {
  const points = useRef<THREE.Points>(null)
  const [positions, colors] = useMemo(() => {
    const position = new Float32Array(count * 3)
    const color = new Float32Array(count * 3)
    const volt = new THREE.Color(VOLT)
    const cyan = new THREE.Color(CYAN)
    for (let i = 0; i < count; i += 1) {
      const radius = 3.2 + Math.random() * 4.5
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      position.set([radius * Math.sin(phi) * Math.cos(theta), radius * Math.cos(phi) * 0.6, radius * Math.sin(phi) * Math.sin(theta)], i * 3)
      const mixed = volt.clone().lerp(cyan, Math.random())
      color.set([mixed.r, mixed.g, mixed.b], i * 3)
    }
    return [position, color]
  }, [count])

  useFrame((state, delta) => {
    if (!points.current) return
    points.current.rotation.y += delta * 0.04
    points.current.rotation.x = THREE.MathUtils.damp(points.current.rotation.x, state.pointer.y * 0.15, 2, delta)
  })

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.035} vertexColors transparent opacity={0.85} sizeAttenuation depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  )
}

export default function HeroScene() {
  return (
    <Canvas dpr={[1, 1.75]} camera={{ position: [0, 0.4, 6.4], fov: 40 }} gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}>
      <ambientLight intensity={0.25} />
      <spotLight position={[4, 6, 4]} angle={0.4} penumbra={1} intensity={60} color="#ffffff" />
      <pointLight position={[-4, -2, 2]} intensity={25} color={VOLT} />
      <pointLight position={[3, -1, -3]} intensity={18} color={CYAN} />
      <Dumbbell />
      <EnergyRings />
      <ParticleField />
      <Sparkles count={60} scale={[7, 4, 4]} size={3} speed={0.4} color={VOLT} />
      <Environment resolution={256}>
        <Lightformer intensity={3} position={[0, 4, -6]} scale={[10, 2, 1]} />
        <Lightformer intensity={2} color={VOLT} position={[-6, 0, 0]} rotation-y={Math.PI / 2} scale={[8, 2, 1]} />
        <Lightformer intensity={2} color={CYAN} position={[6, 1, 0]} rotation-y={-Math.PI / 2} scale={[8, 2, 1]} />
      </Environment>
    </Canvas>
  )
}
