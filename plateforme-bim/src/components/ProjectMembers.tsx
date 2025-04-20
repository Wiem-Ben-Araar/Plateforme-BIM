"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Users, Plus, UserPlus, Mail, RefreshCw, AlertCircle } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { toast } from "sonner"
import { useSession } from "next-auth/react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface Member {
  id: string
  name: string
  email: string
  role?: string
  image?: string
}

interface ProjectMembersProps {
  projectId: string
  projectName?: string
}

export default function ProjectMembers({ projectId, projectName = "this project" }: ProjectMembersProps) {
  const { data: session } = useSession()
  const [members, setMembers] = useState<Member[]>([])
  const [invitations, setInvitations] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
  const [emails, setEmails] = useState("")
  const [message, setMessage] = useState("")
  const [sendingInvites, setSendingInvites] = useState(false)
  const [loadingMembers, setLoadingMembers] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Charger les membres et invitations existants
  useEffect(() => {
    const fetchMembersAndInvitations = async () => {
      setLoadingMembers(true)
      setError(null)

      try {
        console.log("Fetching members for project:", projectId)
        // Charger les membres
        const membersResponse = await fetch(`/api/projects/${projectId}/members`)
        console.log("Members response status:", membersResponse.status)

        if (membersResponse.ok) {
          const membersData = await membersResponse.json()
          console.log("Members data:", membersData)
          setMembers(membersData.members || [])
        } else {
          const errorData = await membersResponse.json().catch(() => ({}))
          console.error("Failed to fetch members:", membersResponse.status, errorData)
          setError(`Failed to load members: ${errorData.message || membersResponse.statusText}`)
        }

        console.log("Fetching invitations for project:", projectId)
        // Charger les invitations
        const invitationsResponse = await fetch(`/api/projects/${projectId}/invitations`)
        console.log("Invitations response status:", invitationsResponse.status)

        if (invitationsResponse.ok) {
          const invitationsData = await invitationsResponse.json()
          console.log("Invitations data:", invitationsData)
          setInvitations(invitationsData.invitations || [])
        } else {
          const errorData = await invitationsResponse.json().catch(() => ({}))
          console.error("Failed to fetch invitations:", invitationsResponse.status, errorData)
          if (!error) {
            // Ne pas écraser l'erreur des membres si elle existe déjà
            setError(`Failed to load invitations: ${errorData.message || invitationsResponse.statusText}`)
          }
        }
      } catch (error) {
        console.error("Error fetching members and invitations:", error)
        setError("Failed to load project members and invitations. Please try again later.")
      } finally {
        setLoadingMembers(false)
      }
    }

    if (projectId) {
      fetchMembersAndInvitations()
    }
  }, [projectId])

  // Préparer le message d'invitation par défaut
  useEffect(() => {
    if (session?.user?.name) {
      setMessage(
        `Hello,\n\n${session.user.name} has invited you to collaborate on the project "${projectName}" on our BIM platform.\n\nClick the link in this email to join the project and start collaborating.\n\nBest regards,\nWiVision BIM Team`,
      )
    }
  }, [session?.user?.name, projectName])

  const handleInvite = async () => {
    if (!emails.trim()) {
      toast.error("Please enter at least one email address")
      return
    }

    // Validation simple des emails
    const emailList = emails
      .split(/[,;\n]/)
      .map((email) => email.trim())
      .filter((email) => email.length > 0)

    const invalidEmails = emailList.filter((email) => !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/))
    if (invalidEmails.length > 0) {
      toast.error(`Invalid email format: ${invalidEmails.join(", ")}`)
      return
    }

    setSendingInvites(true)
    try {
      console.log("Sending invitations to:", emailList)
      const response = await fetch(`/api/projects/${projectId}/invite`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          emails: emailList,
          message: message,
          projectName,
        }),
      })

      console.log("Invite response status:", response.status)

      if (response.ok) {
        const data = await response.json()
        console.log("Invite response data:", data)
        toast.success(`Invitations sent to ${emailList.length} email(s)`)
        setInviteDialogOpen(false)
        setEmails("")

        // Ajouter les nouvelles invitations à la liste
        if (data.invitations && data.invitations.length > 0) {
          setInvitations((prev) => [...prev, ...data.invitations])
        }
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error("Failed to send invitations:", response.status, errorData)
        toast.error(errorData.message || "Failed to send invitations")
      }
    } catch (error) {
      console.error("Error sending invitations:", error)
      toast.error("An error occurred while sending invitations")
    } finally {
      setSendingInvites(false)
    }
  }

  // Obtenir les initiales à partir du nom
  const getInitials = (name: string) => {
    if (!name) return "??"
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .substring(0, 2)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Project Members</h2>
        <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              Invite Member
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Invite Team Members</DialogTitle>
              <DialogDescription>
                Enter the email addresses of people you want to invite to this project.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="emails">Email Addresses</Label>
                <textarea
                  id="emails"
                  placeholder="Enter email addresses (separated by commas, semicolons, or new lines)"
                  value={emails}
                  onChange={(e) => setEmails(e.target.value)}
                  className="min-h-[100px]"
                />
                <p className="text-sm text-muted-foreground">
                  Enter multiple email addresses separated by commas, semicolons, or new lines
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Invitation Message</Label>
                <textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="min-h-[150px]"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setInviteDialogOpen(false)} disabled={sendingInvites}>
                  Cancel
                </Button>
                <Button onClick={handleInvite} disabled={sendingInvites || !emails.trim()}>
                  {sendingInvites ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4 mr-2" />
                      Send Invitations
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loadingMembers ? (
        <div className="flex justify-center items-center p-8">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : members.length === 0 && invitations.length === 0 && !error ? (
        <Card className="p-8 text-center">
          <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium mb-2">No team members yet</h3>
          <p className="text-gray-500 mb-4">Invite team members to collaborate on this project</p>
          <Button onClick={() => setInviteDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Invite Team Members
          </Button>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Liste des membres */}
          {members.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Members ({members.length})</h3>
              <div className="grid gap-4 md:grid-cols-2">
                {members.map((member) => (
                  <Card key={member.id} className="p-4 flex items-center">
                    <div className="flex items-center space-x-4">
                      <Avatar>
                        <AvatarImage src={member.image || "/placeholder.svg"} alt={member.name} />
                        <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{member.name}</p>
                        <p className="text-sm text-muted-foreground">{member.email}</p>
                        {member.role && (
                          <Badge variant="outline" className="mt-1">
                            {member.role}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Liste des invitations en attente */}
          {invitations.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Pending Invitations ({invitations.length})</h3>
              <div className="grid gap-4 md:grid-cols-2">
                {invitations.map((invitation) => (
                  <Card key={invitation.id || invitation._id} className="p-4">
                    <div className="flex items-center">
                      <Mail className="h-4 w-4 mr-2 text-blue-500" />
                      <div>
                        <p className="font-medium">{invitation.email}</p>
                       <p className="text-sm text-muted-foreground">
  Invited {invitation.invitedAt ? new Date(invitation.invitedAt).toLocaleDateString() : 
          invitation.createdAt ? new Date(invitation.createdAt).toLocaleDateString() : 
          "recently"}
</p>
                        <Badge variant="outline" className="mt-1">
                          {invitation.status || "pending"}
                        </Badge>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
