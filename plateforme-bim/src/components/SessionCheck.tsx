"use client"

import { useSession, signOut } from "next-auth/react"
import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { toast } from "sonner"

export default function SessionCheck() {
  const { data: session, status, update } = useSession()
  const pathname = usePathname()
  const router = useRouter()

  // Vérifier si l'utilisateur existe dans la base de données
  const checkUserExists = async (userId: string) => {
    try {
      const response = await fetch("/api/check-user-exists", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId }),
      })

      const data = await response.json()
      return data.exists
    } catch (error) {
      console.error("Erreur lors de la vérification de l'utilisateur:", error)
      return true // En cas d'erreur, on suppose que l'utilisateur existe
    }
  }

  // Mettre à jour la session à chaque changement de page
  useEffect(() => {
    const checkSession = async () => {
      if (status === "authenticated" && session?.user?.id) {
        // Vérifier si l'utilisateur existe toujours dans la base de données
        const userExists = await checkUserExists(session.user.id)

        if (!userExists) {
          toast.error("Votre compte a été supprimé")
          signOut({ redirect: true, callbackUrl: "/?deleted=true" })
        } else {
          // Force la mise à jour de la session
          await update()
        }
      }
    }

    checkSession()
  }, [pathname, status, session, update])

  // Vérifier périodiquement la session (toutes les 5 minutes)
  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.id) return

    const interval = setInterval(
      async () => {
        const userExists = await checkUserExists(session.user.id)

        if (!userExists) {
          toast.error("Votre compte a été supprimé")
          signOut({ redirect: true, callbackUrl: "/?deleted=true" })
        } else {
          // Force la mise à jour de la session
          await update()
        }
      },
      5 * 60 * 1000,
    ) // 5 minutes

    return () => clearInterval(interval)
  }, [status, session, update])

  return null // Ce composant ne rend rien, il effectue simplement la vérification
}
