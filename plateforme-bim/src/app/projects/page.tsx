"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogClose 
} from "@/components/ui/dialog";
import { Building, Plus, ArrowLeft, Pencil, Trash2 } from 'lucide-react';
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner"; // Assuming you're using shadcn/ui toast

export default function ProjectsPage() {
  const { data: session, status } = useSession();
  const [projects, setProjects] = useState<{ 
    id: number; 
    name: string; 
    updatedAt: string; 
    _id?: string;
    owner?: string;
    userRole?: "owner" | "member";
  }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  
  const currentUserEmail = session?.user?.email;

  // Fetch projects
  const fetchProjects = () => {
    if (status === "authenticated") {
      setIsLoading(true);
      fetch("/api/projects")
        .then((res) => {
          if (!res.ok) {
            throw new Error(`Server responded with status: ${res.status}`);
          }
          return res.json();
        })
        .then((data) => {
          if (Array.isArray(data)) {
            setProjects(data);
          } else {
            console.error("API response is not an array:", data);
            setProjects([]);
          }
        })
        .catch((err) => {
          console.error("Erreur de récupération des projets:", err);
          setError("Impossible de charger les projets. Veuillez réessayer plus tard.");
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [status]);

  // Fetch user roles for each project
  useEffect(() => {
    if (projects.length > 0 && status === "authenticated") {
      const fetchRolesForProjects = async () => {
        const updatedProjects = [...projects];
        
        for (let i = 0; i < updatedProjects.length; i++) {
          const project = updatedProjects[i];
          const projectId = project._id || project.id;
          
          try {
            const response = await fetch(`/api/projects/${projectId}/role`);
            const data = await response.json();
            
            updatedProjects[i] = {
              ...project,
              userRole: data.role
            };
          } catch (err) {
            console.error(`Erreur lors de la récupération du rôle pour le projet ${projectId}:`, err);
          }
        }
        
        setProjects(updatedProjects);
      };
      
      fetchRolesForProjects();
    }
  }, [projects.length, status]);

  const handleGoBack = () => {
    router.back();
  };

  // Delete Project Handler
  const handleDeleteProject = async (projectId: string | number) => {
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Impossible de supprimer le projet');
      }

      // Remove the project from the local state
      setProjects(projects.filter(p => p.id !== projectId && p._id !== projectId));
      
      toast.success("Projet supprimé avec succès");
    } catch (err) {
      console.error("Erreur lors de la suppression du projet:", err);
      toast.error("Échec de la suppression du projet");
    }
  };

  // Check if user has permission to edit/delete project
  const canModifyProject = (project: any) => {
    // User can modify if they're the owner
    return project.userRole === "owner" || project.owner === currentUserEmail;
  };

  if (status === "unauthenticated") {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] space-y-4">
        <h1 className="text-2xl font-bold">Accès restreint</h1>
        <p className="text-muted-foreground">Veuillez vous connecter pour accéder à vos projets.</p>
        <Button asChild>
          <Link href="/api/auth/signin">Se connecter</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container py-8 space-y-8">
      <div className="flex items-center mb-4">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleGoBack} 
          className="mr-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>
      </div>

      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Mes Projets</h1>
        <Button asChild>
          <Link href="/create-project">
            <Plus className="mr-2 h-4 w-4" />
            Créer un projet
          </Link>
        </Button>
      </div>
      
      {isLoading && (
        <div className="flex justify-center items-center h-40">
          <p>Chargement des projets...</p>
        </div>
      )}
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md">
          {error}
        </div>
      )}
      
      {!isLoading && !error && projects.length === 0 && (
        <div className="text-center p-8 border border-dashed rounded-md">
          <p className="text-muted-foreground">Aucun projet disponible. Commencez par en créer un nouveau.</p>
        </div>
      )}
      
      {!isLoading && !error && projects.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project, index) => (
            <Card key={project.id || project._id || `project-${index}`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{project.name}</CardTitle>
                <CardDescription>Mis à jour {project.updatedAt}</CardDescription>
                {project.userRole && (
                  <CardDescription className="mt-1">
                    Rôle: <span className="font-medium capitalize">{project.userRole}</span>
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="h-32 bg-muted rounded-md flex items-center justify-center">
                  <Building className="h-10 w-10 text-muted-foreground/50" />
                </div>
              </CardContent>
              <CardFooter className="flex space-x-2">
                <Button 
                  variant="outline" 
                  className="w-full" 
                  asChild
                >
                  <Link href={`/projects/${project._id || project.id}`}>
                    Ouvrir
                  </Link>
                </Button>
                {canModifyProject(project) && (
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => router.push(`/edit-project/${project._id || project.id}`)}
                  title="Modifier le projet"
              
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                   )}
                <Dialog>
                  <DialogTrigger asChild>
                  {canModifyProject(project) && (
                    <Button 
                      variant="destructive" 
                      size="icon"
                      title="Supprimer le projet"
              
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    )}
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Confirmer la suppression</DialogTitle>
                      <DialogDescription>
                        Êtes-vous sûr de vouloir supprimer le projet "{project.name}" ? 
                        Cette action est irréversible.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-end space-x-2">
                      <DialogClose asChild>
                        <Button variant="ghost">Annuler</Button>
                      </DialogClose>
                      <Button 
                        variant="destructive" 
                        onClick={() => handleDeleteProject(project._id || project.id)}
                      >
                        Supprimer
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}