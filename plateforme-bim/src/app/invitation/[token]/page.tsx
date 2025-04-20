"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { useSession, signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { RefreshCw, CheckCircle, XCircle } from "lucide-react"
import { toast } from "sonner"

export default function InvitationPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const token = params.token as string
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [invitationDetails, setInvitationDetails] = useState<any>(null)
  const [acceptingInvitation, setAcceptingInvitation] = useState(false)

  useEffect(() => {
    const verifyInvitation = async () => {
      try {
        const response = await fetch(`/api/invitations/${token}/verify`)
        const data = await response.json()

        if (response.ok) {
          setInvitationDetails(data.invitation)
        } else {
          setError(data.message || "Invitation invalide ou expirée")
        }
      } catch (error) {
        console.error("Erreur de vérification:", error)
        setError("Échec de la vérification de l'invitation")
      } finally {
        setLoading(false)
      }
    }

    if (token) {
      verifyInvitation()
    }
  }, [token])

  const handleAcceptInvitation = async () => {
    if (!session) {
      sessionStorage.setItem("pendingInvitation", token)
      signIn(undefined, { callbackUrl: `/invitation/${token}` })
      return
    }

    setAcceptingInvitation(true)
    try {
      const response = await fetch(`/api/invitations/${token}/accept`, {
        method: "POST",
      })
      const data = await response.json()

      if (response.ok) {
        toast.success("Invitation acceptée avec succès")
        router.push(`/projects/${data.projectId}`)
      } else {
        setError(data.message || "Échec de l'acceptation")
        toast.error(data.message || "Échec de l'acceptation")
      }
    } catch (error) {
      console.error("Erreur d'acceptation:", error)
      setError("Une erreur est survenue")
      toast.error("Une erreur est survenue")
    } finally {
      setAcceptingInvitation(false)
    }
  }

  const handleDeclineInvitation = async () => {
    if (!session) {
      router.push("/")
      return
    }

    setAcceptingInvitation(true)
    try {
      const response = await fetch(`/api/invitations/${token}/decline`, {
        method: "POST",
      })

      if (response.ok) {
        toast.success("Invitation refusée")
        router.push("/")
      } else {
        const error = await response.json()
        setError(error.message || "Échec du refus")
        toast.error(error.message || "Échec du refus")
      }
    } catch (error) {
      console.error("Erreur de refus:", error)
      setError("Une erreur est survenue")
      toast.error("Une erreur est survenue")
    } finally {
      setAcceptingInvitation(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="h-12 w-12 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-lg">Vérification de l'invitation...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-red-500">Erreur d'invitation</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <p className="text-lg">{error}</p>
            <p className="text-muted-foreground mt-2">Cette invitation peut être invalide ou expirée.</p>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button onClick={() => router.push("/")}>Retour à l'accueil</Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex justify-center items-center min-h-screen p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">Invitation au projet</CardTitle>
          <CardDescription className="text-center">Vous avez été invité à rejoindre un projet</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {invitationDetails && (
            <>
              <div className="text-center mb-6">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <p className="text-lg font-medium">Invitation à collaborer sur un projet</p>
              </div>
              <div className="space-y-2 bg-muted p-4 rounded-md">
                <div>
                  <span className="font-medium">Projet : </span>
                  <span>{invitationDetails.projectName || "Projet BIM"}</span>
                </div>
                <div>
                  <span className="font-medium">Invité par : </span>
                  <span>{invitationDetails.invitedBy?.name || "Un membre de l'équipe"}</span>
                </div>
                <div>
                  <span className="font-medium">Email : </span>
                  <span>{invitationDetails.email}</span>
                </div>
              </div>
              {status === "unauthenticated" && (
                <p className="text-sm text-muted-foreground">
                  Vous devez vous connecter pour accepter cette invitation.
                </p>
              )}
            </>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={handleDeclineInvitation} disabled={acceptingInvitation}>
            Refuser
          </Button>
          <Button onClick={handleAcceptInvitation} disabled={acceptingInvitation}>
            {acceptingInvitation ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Traitement...
              </>
            ) : status === "unauthenticated" ? (
              "Se connecter et accepter"
            ) : (
              "Accepter l'invitation"
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}