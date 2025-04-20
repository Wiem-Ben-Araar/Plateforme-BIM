"use client"
import { Button } from "@/components/ui/button"
import { Building, Plus, FolderOpen, Users } from "lucide-react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { useEffect, useState } from "react"

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
    return null // ou un indicateur de chargement
  }

  return (
    <div className="space-y-8">
      {/* Hero section */}
      <section className="py-12 text-center space-y-4">
        <Building className="h-16 w-16 mx-auto text-primary" />
        <h1 className="text-4xl font-bold tracking-tight">Plateforme BIM</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Visualisez, collaborez et gérez vos modèles BIM en toute simplicité
        </p>
        <div className="flex justify-center gap-4 pt-4">
          {status === "authenticated" ? (
            <>
              <Button asChild size="lg">
                <Link href="/create-project">
                  <Plus className="mr-2 h-5 w-5" />
                  Créer un projet
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/projects">
                  <FolderOpen className="mr-2 h-5 w-5" />
                  Afficher les projets
                </Link>
              </Button>
            </>
          ) : (
            <Button asChild size="lg">
              <Link href="/api/auth/signin">Se connecter</Link>
            </Button>
          )}
        </div>
      </section>

      {/* Fonctionnalités ou autres sections de la page d'accueil */}
      <section className="py-8">
        <div className="container">
          <h2 className="text-2xl font-bold mb-6 text-center">Fonctionnalités principales</h2>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="bg-card p-6 rounded-lg border">
              <Building className="h-10 w-10 text-primary mb-4" />
              <h3 className="text-xl font-medium mb-2">Visualisation 3D</h3>
              <p className="text-muted-foreground">
                Explorez vos modèles BIM en 3D avec des outils de navigation intuitifs.
              </p>
            </div>
            <div className="bg-card p-6 rounded-lg border">
              <Users className="h-10 w-10 text-primary mb-4" />
              <h3 className="text-xl font-medium mb-2">Collaboration</h3>
              <p className="text-muted-foreground">
                Travaillez en équipe sur vos projets avec des outils de partage et d'annotation.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

