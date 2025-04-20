"use client";

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import Link from 'next/link';
import { Loader2, Upload, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function UploadPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // Récupérer l'ID du projet depuis les paramètres d'URL
  const projectId = searchParams.get('projectId');
  
  // Vérifier si l'ID du projet est valide au chargement
  useEffect(() => {
    if (!projectId || projectId === 'undefined') {
      setError("ID de projet invalide ou manquant");
    } else {
      setError(null);
    }
  }, [projectId]);

  const handleFileUpload = async () => {
    if (!selectedFile) {
      setError('Veuillez sélectionner un fichier');
      return;
    }
    
    if (!projectId || projectId === 'undefined') {
      setError('ID de projet invalide');
      return;
    }

    setError(null);
    setIsLoading(true);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('projectId', projectId);
    // Ajouter l'ID de l'utilisateur (à remplacer par l'ID réel de l'utilisateur connecté)
    formData.append('uploadedBy', 'current-user-id'); // Remplacez par la méthode pour récupérer l'ID de l'utilisateur actuel

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const file = await response.json();
        console.log('Fichier uploadé:', file);
        
        // Rediriger vers la page du projet
        router.push(`/projects/${projectId}`);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Échec de l\'upload du fichier');
      }
    } catch (error) {
      console.error('Erreur lors de l\'upload :', error);
      setError(error instanceof Error ? error.message : 'Une erreur est survenue lors de l\'upload');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">Uploader un fichier IFC</CardTitle>
          <CardDescription className="text-center">
            Sélectionnez un fichier IFC à uploader pour le projet.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <div>
            <Label htmlFor="file">Fichier IFC</Label>
            <Input
              id="file"
              type="file"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              accept=".ifc"
              disabled={isLoading || !projectId || projectId === 'undefined'}
              required
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <Button 
            onClick={handleFileUpload} 
            disabled={isLoading || !selectedFile || !projectId || projectId === 'undefined'} 
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Upload en cours...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Uploader
              </>
            )}
          </Button>
          
          <Button variant="outline" className="w-full" asChild>
            <Link href={projectId && projectId !== 'undefined' ? `/projects/${projectId}` : "/"}>
              Annuler
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}