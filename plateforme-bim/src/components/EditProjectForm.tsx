"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

interface Project {
  _id?: string;
  name: string;
  description?: string;
  // Ajoutez d'autres champs selon votre modèle de projet
}

export default function EditProjectForm({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [project, setProject] = useState<Project>({
    name: "",
    description: ""
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Charger les détails du projet
  useEffect(() => {
    async function fetchProject() {
      try {
        const response = await fetch(`/api/projects/${projectId}`);
        
        if (!response.ok) {
          throw new Error('Impossible de charger le projet');
        }
        
        const data = await response.json();
        setProject(data);
        setIsLoading(false);
      } catch (error) {
        console.error("Erreur de chargement du projet:", error);
        toast.error("Impossible de charger le projet");
        setIsLoading(false);
      }
    }

    fetchProject();
  }, [projectId]);

  // Gérer les changements dans le formulaire
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProject(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Soumettre le formulaire de mise à jour
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation de base
    if (!project.name.trim()) {
      toast.error("Le nom du projet est requis");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(project)
      });

      if (!response.ok) {
        throw new Error('Échec de la mise à jour du projet');
      }

      toast.success("Projet mis à jour avec succès");
      router.push('/projects');
    } catch (error) {
      console.error("Erreur de mise à jour du projet:", error);
      toast.error("Impossible de mettre à jour le projet");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Bouton de retour
  const handleGoBack = () => {
    router.back();
  };

  // Gestion du chargement
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <p>Chargement du projet...</p>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={handleGoBack} 
        className="mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Retour
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Modifier le Projet</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Nom du Projet</Label>
              <Input
                id="name"
                name="name"
                value={project.name}
                onChange={handleChange}
                required
                placeholder="Entrez le nom du projet"
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                name="description"
                value={project.description || ""}
                onChange={handleChange}
                placeholder="Description du projet (optionnel)"
                rows={4}
              />
            </div>

            <Button 
              type="submit" 
              disabled={isSubmitting}
            >
              {isSubmitting ? "Mise à jour en cours..." : "Mettre à jour le projet"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}