"use client"

import { useRef, useState, useEffect } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { useGLTF, Environment, Float, PresentationControls } from "@react-three/drei"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { Plus, FolderOpen } from "lucide-react"
import { useTheme } from "next-themes"

function Model({ url, scale = 1, position = [0, 0, 0], rotation = [0, 0, 0] }) {
  const { scene } = useGLTF(url)
  return <primitive object={scene} scale={scale} position={position} rotation={rotation} />
}

function BuildingModel(props) {
  const { theme } = useTheme()
  const meshRef = useRef()
  const [hovered, setHovered] = useState(false)

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.005
    }
  })

  const primaryColor = theme === "dark" ? "#3DA5D9" : "#3DA5D9"
  const secondaryColor = theme === "dark" ? "#7EA3CC" : "#7EA3CC"

  return (
    <group {...props}>
      <mesh
        ref={meshRef}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        scale={hovered ? 1.1 : 1}
      >
        <boxGeometry args={[1, 2, 1]} />
        <meshStandardMaterial color={primaryColor} />

        {/* Étages du bâtiment */}
        <mesh position={[0, -0.5, 0]}>
          <boxGeometry args={[1.2, 0.2, 1.2]} />
          <meshStandardMaterial color={secondaryColor} />
        </mesh>

        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[1.2, 0.2, 1.2]} />
          <meshStandardMaterial color={secondaryColor} />
        </mesh>

        <mesh position={[0, 0.5, 0]}>
          <boxGeometry args={[1.2, 0.2, 1.2]} />
          <meshStandardMaterial color={secondaryColor} />
        </mesh>

        {/* Toit */}
        <mesh position={[0, 1.2, 0]}>
          <coneGeometry args={[0.8, 0.6, 4]} />
          <meshStandardMaterial color={primaryColor} />
        </mesh>

        {/* Fenêtres */}
        {[
          [-0.35, 0.3, 0.51],
          [0.35, 0.3, 0.51],
          [-0.35, -0.3, 0.51],
          [0.35, -0.3, 0.51],
        ].map((pos, i) => (
          <mesh key={i} position={pos}>
            <boxGeometry args={[0.2, 0.3, 0.02]} />
            <meshStandardMaterial color="#ffffff" metalness={0.8} roughness={0.2} />
          </mesh>
        ))}

        {/* Porte */}
        <mesh position={[0, -0.6, 0.51]}>
          <boxGeometry args={[0.3, 0.6, 0.02]} />
          <meshStandardMaterial color="#1A2C56" />
        </mesh>
      </mesh>
    </group>
  )
}

function FloatingElements() {
  const { theme } = useTheme()
  const primaryColor = theme === "dark" ? "#3DA5D9" : "#3DA5D9"

  return (
    <group>
      {/* Éléments flottants autour du bâtiment */}
      <Float speed={1.5} rotationIntensity={0.5} floatIntensity={0.5}>
        <mesh position={[-2, 0, -1]}>
          <sphereGeometry args={[0.3, 16, 16]} />
          <meshStandardMaterial color={primaryColor} />
        </mesh>
      </Float>

      <Float speed={2} rotationIntensity={0.8} floatIntensity={0.5}>
        <mesh position={[2, 0.5, -1]}>
          <dodecahedronGeometry args={[0.4]} />
          <meshStandardMaterial color="#7EA3CC" />
        </mesh>
      </Float>

      <Float speed={1.8} rotationIntensity={0.7} floatIntensity={0.5}>
        <mesh position={[0, 2, -1]}>
          <octahedronGeometry args={[0.3]} />
          <meshStandardMaterial color="#1A2C56" />
        </mesh>
      </Float>

      <Float speed={1.2} rotationIntensity={0.6} floatIntensity={0.5}>
        <mesh position={[-1.5, -1, -1]}>
          <tetrahedronGeometry args={[0.4]} />
          <meshStandardMaterial color={primaryColor} />
        </mesh>
      </Float>

      <Float speed={1.7} rotationIntensity={0.9} floatIntensity={0.5}>
        <mesh position={[1.5, -1.2, -1]}>
          <icosahedronGeometry args={[0.3]} />
          <meshStandardMaterial color="#7EA3CC" />
        </mesh>
      </Float>
    </group>
  )
}

export default function Hero3D() {
  const { status } = useSession()
  const { theme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <section className="py-12 text-center space-y-4">
      <div className="h-[400px] w-full">
        <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
          <color attach="background" args={[theme === "dark" ? "#09090b" : "#ffffff"]} />
          <ambientLight intensity={0.5} />
          <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} castShadow />
          <PresentationControls
            global
            rotation={[0, 0, 0]}
            polar={[-Math.PI / 4, Math.PI / 4]}
            azimuth={[-Math.PI / 4, Math.PI / 4]}
            config={{ mass: 2, tension: 400 }}
            snap={{ mass: 4, tension: 400 }}
          >
            <BuildingModel position={[0, -0.5, 0]} />
            <FloatingElements />
          </PresentationControls>
          <Environment preset="city" />
        </Canvas>
      </div>

      <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">Plateforme BIM</h1>
      <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
        Visualisez, collaborez et gérez vos modèles BIM en toute simplicité
      </p>
      <div className="flex flex-wrap justify-center gap-4 pt-4">
        {status === "authenticated" ? (
          <>
            <Button asChild size="lg" className="relative overflow-hidden group">
              <Link href="/create-project" className="flex items-center">
                <Plus className="mr-2 h-5 w-5 relative z-10" />
                <span className="relative z-10">Créer un projet</span>
                <span className="absolute inset-0 bg-white/10 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300"></span>
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/projects" className="flex items-center">
                <FolderOpen className="mr-2 h-5 w-5" />
                <span>Afficher les projets</span>
              </Link>
            </Button>
          </>
        ) : (
          <Button asChild size="lg" className="relative overflow-hidden group">
            <Link href="/api/auth/signin" className="flex items-center">
              <span className="relative z-10">Se connecter</span>
              <span className="absolute inset-0 bg-white/10 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300"></span>
            </Link>
          </Button>
        )}
      </div>
    </section>
  )
}
