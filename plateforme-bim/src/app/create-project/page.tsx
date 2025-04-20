"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import ProjectCreation from "@/components/ProjectCreation";
import { Building, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function CreateProjectPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Rediriger vers la page de connexion si l'utilisateur n'est pas connecté
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/sign-in");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Link>
        </Button>
      </div>

      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader className="text-center">
            <Building className="h-12 w-12 mx-auto text-primary mb-4" />
            <CardTitle className="text-2xl">Créer un nouveau projet</CardTitle>
            <CardDescription>
              Commencez par donner un nom et une description à votre projet.
              Vous pourrez ensuite ajouter des fichiers IFC et inviter des collaborateurs.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProjectCreation />
          </CardContent>
        </Card>

        <div className="mt-8 grid gap-6 text-center text-sm text-muted-foreground">
          <div>
            <h3 className="font-medium text-foreground mb-2">Que pouvez-vous faire avec un projet ?</h3>
            <ul className="list-disc text-left space-y-2 pl-4">
              <li>Importer et visualiser des fichiers IFC</li>
              <li>Collaborer avec votre équipe en temps réel</li>
              <li>Ajouter des annotations et des commentaires</li>
              <li>Gérer les accès et les permissions</li>
              <li>Suivre les modifications et l'historique</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}