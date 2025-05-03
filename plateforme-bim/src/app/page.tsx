"use client"
import { Building, FolderOpen, Users } from "lucide-react"
import { useSession } from "next-auth/react"
import { useEffect, useState } from "react"
import Hero3D from "@/components/hero-3d"

// Variable globale pour stocker les références au visualiseur
if (typeof window !== "undefined") {
  // S'assurer que cette initialisation ne se produit que côté client
  window.ifcViewerRefs = window.ifcViewerRefs || {
    viewer: null,
    ifcCamera: null,
  }
}

export default function Home() {
  const { status } = useSession()
  const [isMounted, setIsMounted] = useState(false)

  // Nettoyer les références globales au visualiseur lors du montage de la page d'accueil
  useEffect(() => {
    setIsMounted(true)

    // Nettoyer les références globales au visualiseur
    if (typeof window !== "undefined") {
      window.ifcViewerRefs = {
        viewer: null,
        ifcCamera: null,
      }
    }

    return () => {
      // Nettoyage supplémentaire si nécessaire lors du démontage
    }
  }, [])

  // Ne rendre le contenu que lorsque le composant est monté côté client
  if (!isMounted) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8 py-8">
      {/* Hero section avec animation 3D */}
      <Hero3D />

      {/* Fonctionnalités ou autres sections de la page d'accueil */}
      <section className="py-8">
        <div className="container">
          <h2 className="text-2xl font-bold mb-6 text-center text-gray-900 dark:text-white">
            Fonctionnalités principales
          </h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <div className="bg-card p-6 rounded-lg border shadow-sm hover:shadow-md transition-shadow duration-300">
              <Building className="h-10 w-10 text-primary mb-4" />
              <h3 className="text-xl font-medium mb-2 text-gray-900 dark:text-white">Visualisation 3D</h3>
              <p className="text-muted-foreground">
                Explorez vos modèles BIM en 3D avec des outils de navigation intuitifs.
              </p>
            </div>
            <div className="bg-card p-6 rounded-lg border shadow-sm hover:shadow-md transition-shadow duration-300">
              <Users className="h-10 w-10 text-primary mb-4" />
              <h3 className="text-xl font-medium mb-2 text-gray-900 dark:text-white">Collaboration</h3>
              <p className="text-muted-foreground">
                Travaillez en équipe sur vos projets avec des outils de partage et d'annotation.
              </p>
            </div>
            <div className="bg-card p-6 rounded-lg border shadow-sm hover:shadow-md transition-shadow duration-300">
              <FolderOpen className="h-10 w-10 text-primary mb-4" />
              <h3 className="text-xl font-medium mb-2 text-gray-900 dark:text-white">Gestion de projets</h3>
              <p className="text-muted-foreground">
                Organisez et suivez l'avancement de vos projets BIM de manière efficace.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
