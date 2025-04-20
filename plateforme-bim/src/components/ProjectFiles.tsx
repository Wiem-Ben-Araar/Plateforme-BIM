"use client";
import { useState, useEffect } from 'react';
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FileBox, Eye, Download, Trash2, Upload, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ProjectFile {
  id: string;
  name: string;
  version?: number;
  file_size?: number;
  file_url: string;
  firebasePath?: string;
}

interface ProjectFilesProps {
  projectId: string;
  files: ProjectFile[];
}

export default function ProjectFiles({ projectId, files = [] }: ProjectFilesProps) {
  const [loading, setLoading] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const router = useRouter();
  
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewAllUrl, setViewAllUrl] = useState("#");
  const [hasValidFiles, setHasValidFiles] = useState(false);
  const [projectFiles, setProjectFiles] = useState<ProjectFile[]>([]);

  // Vérifier si une URL de fichier est valide
  const isValidFileUrl = (url: string | undefined): boolean => {
    return !!url && 
           typeof url === "string" && 
           url.trim() !== "" && 
           url !== "undefined" &&
           !url.includes("undefined");
  };

  // Préparer les fichiers initiaux avec une adaptation minimale
  const adaptFiles = (inputFiles: ProjectFile[]) => {
    return inputFiles.map((file) => {
      // S'assurer que nous stockons l'URL complète et non seulement une référence
      let fileUrl = file.file_url;
      
      // Si l'URL est invalide, essayer d'obtenir à partir de firebasePath
      if (!isValidFileUrl(fileUrl) && isValidFileUrl(file.firebasePath)) {
        fileUrl = file.firebasePath;
      }
  
      return {
        id: file.id || `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: file.name || "Fichier sans nom",
        version: file.version || 1,
        file_size: file.file_size || 0,
        file_url: fileUrl,
        // Assurons-nous de conserver firebasePath si disponible
        firebasePath: file.firebasePath
      };
    });
  };

  // Mettre à jour viewAllUrl en fonction des URL valides des fichiers et ajouter le projectId
  const updateViewAllUrl = () => {
    // Ne filtrer que les fichiers avec des URLs valides
    const validFiles = projectFiles.filter(file => isValidFileUrl(file.file_url));
    const validUrls = validFiles.map(file => file.file_url);
    
    const valid = validUrls.length > 0;
    setHasValidFiles(valid);
    
    if (valid) {
      // Sauvegarder les URLs valides et le projectId dans sessionStorage
      sessionStorage.setItem(`valid_urls_${projectId}`, JSON.stringify(validUrls));
      sessionStorage.setItem(`current_project_id`, projectId);
      
      const urlStr = JSON.stringify(validUrls);
      // Ajouter le projectId comme paramètre d'URL
      const newViewAllUrl = `/viewer?files=${encodeURIComponent(urlStr)}&projectId=${encodeURIComponent(projectId)}`;
      setViewAllUrl(newViewAllUrl);
    } else {
      setViewAllUrl("#");
      sessionStorage.removeItem(`valid_urls_${projectId}`);
    }
  };

  const handleDelete = async (fileId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce fichier ?")) return;
  
    setLoading(true);
    try {
      // Trouver le fichier à supprimer pour obtenir son chemin Firebase
      const fileToDelete = projectFiles.find(file => file.id === fileId);
      
      if (!fileToDelete) {
        throw new Error("Fichier non trouvé");
      }
  
      const response = await fetch("/api/upload", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          fileId, 
          projectId,
          firebasePath: fileToDelete.firebasePath
        }),
      });
  
      const data = await response.json();
  
      if (!response.ok) {
        throw new Error(data.error || "Erreur lors de la suppression");
      }
  
      // Mettre à jour l'état local après la suppression réussie
      const updatedFiles = projectFiles.filter((file) => file.id !== fileId);
      setProjectFiles(updatedFiles);
  
      // Mettre à jour localStorage
      localStorage.setItem(
        `project_files_${projectId}`,
        JSON.stringify(updatedFiles)
      );
  
      // Mettre à jour viewAllUrl
      updateViewAllUrl();
  
      // Rafraîchir la page
      router.refresh();
  
      // Afficher un message de succès
      alert("Fichier supprimé avec succès");
      
    } catch (error) {
      console.error("Erreur lors de la suppression du fichier:", error);
      alert(`Erreur lors de la suppression: ${error instanceof Error ? error.message : "Une erreur inconnue s'est produite"}`);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    const loadFiles = () => {
      try {
        const savedFiles = localStorage.getItem(`project_files_${projectId}`);
        
        if (savedFiles) {
          const parsedFiles = JSON.parse(savedFiles);
          
          if (Array.isArray(parsedFiles) && parsedFiles.length > 0) {
            console.log("Loading files from localStorage:", parsedFiles);
            setProjectFiles(parsedFiles);
            return;
          }
        }
        
        // Si pas de fichiers valides sauvegardés, utiliser les props
        console.log("Loading files from props:", files);
        const adaptedFiles = adaptFiles(files);
        setProjectFiles(adaptedFiles);
        localStorage.setItem(`project_files_${projectId}`, JSON.stringify(adaptedFiles));
      } catch (e) {
        console.error("Error loading files:", e);
        const adaptedFiles = adaptFiles(files);
        setProjectFiles(adaptedFiles);
        localStorage.setItem(`project_files_${projectId}`, JSON.stringify(adaptedFiles));
      }
    };
    
    loadFiles();
  }, [projectId, files]);

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      setError("Veuillez sélectionner au moins un fichier.");
      return;
    }
  
    // Vérifier que tous les fichiers ont l'extension IFC
    for (const file of selectedFiles) {
      if (!file.name.toLowerCase().endsWith('.ifc')) {
        setError("Tous les fichiers doivent être au format IFC.");
        return;
      }
    }
  
    setUploading(true);
    setError(null);
    const formData = new FormData();
  
    // Ajouter des fichiers à FormData
    selectedFiles.forEach((file) => {
      formData.append("file", file); // Assurez-vous que "file" est le bon nom de champ
    });
  
    // Ajouter l'ID du projet à FormData
    formData.append("projectId", projectId);
  
    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData, // Pas besoin de headers pour FormData
      });
  
      const data = await response.json();
  
      if (response.ok) {
        setUploadDialogOpen(false);
  
        if (data.fileMetadata && data.fileMetadata.length > 0) {
          const newFiles = data.fileMetadata.map((fileInfo: any) => ({
            id: fileInfo.id,
            name: fileInfo.name,
            version: 1,
            file_size: selectedFiles.find((f) => f.name === fileInfo.name)?.size || 0,
            file_url: fileInfo.url || "",
            firebasePath: fileInfo.firebasePath || fileInfo.url || "",
          }));
  
          // Mettre à jour les fichiers et s'assurer de déclencher une mise à jour d'état
          const updatedFiles = [...projectFiles, ...newFiles];
          setProjectFiles(updatedFiles);
  
          // Mettre à jour localStorage
          localStorage.setItem(
            `project_files_${projectId}`,
            JSON.stringify(updatedFiles)
          );
  
          // Mettre à jour sessionStorage avec les URLs valides
          updateViewAllUrl();
        }
  
        router.refresh();
      } else {
        setError(data.error || "Une erreur est survenue lors de l'upload.");
      }
    } catch (error) {
      setError("Erreur de connexion au serveur.");
      console.error("Erreur lors de l'upload :", error);
    } finally {
      setUploading(false);
    }
  };

  // Initialiser et mettre à jour l'état des fichiers
  useEffect(() => {
    // Essayer de récupérer les URLs valides de sessionStorage
    const savedUrls = sessionStorage.getItem(`valid_urls_${projectId}`);
    if (savedUrls) {
      try {
        const validUrls = JSON.parse(savedUrls);
        if (Array.isArray(validUrls) && validUrls.length > 0) {
          setHasValidFiles(true);
          const urlStr = JSON.stringify(validUrls);
          // Ajouter le projectId au lien
          setViewAllUrl(`/viewer?files=${encodeURIComponent(urlStr)}&projectId=${encodeURIComponent(projectId)}`);
          // Stocker le projectId actuel
          sessionStorage.setItem(`current_project_id`, projectId);
        }
      } catch (e) {
        console.error("Erreur lors de la récupération des URLs:", e);
      }
    }
  }, [projectId]);

  // Mettre à jour viewAllUrl chaque fois que les fichiers du projet changent
  useEffect(() => {
    if (projectFiles.length > 0) {
      updateViewAllUrl();
    }
  }, [projectFiles]);

  function formatFileSize(size: number): string {
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(2)} KB`;
    if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(2)} MB`;
    return `${(size / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Project Files</h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex items-center gap-2"
            asChild={hasValidFiles}
            disabled={!hasValidFiles}
          >
            {hasValidFiles ? (
              <Link href={viewAllUrl}>
                <Eye className="h-4 w-4" />
                View All
              </Link>
            ) : (
              <>
                <Eye className="h-4 w-4" />
                View All
              </>
            )}
          </Button>

          <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Upload className="h-4 w-4 mr-2" />
                Upload New File
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Uploader des fichiers IFC</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {error && (
                  <Alert>
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </div>
                  </Alert>
                )}
                <div className="border rounded-lg p-4 bg-muted/50">
                  <Input
                    type="file"
                    accept=".ifc"
                    multiple
                    onChange={(e) => {
                      const files = e.target.files ? Array.from(e.target.files) : [];
                      setSelectedFiles(files);
                      setError(null);
                    }}
                    className="cursor-pointer"
                  />
                  <div className="text-sm text-muted-foreground mt-2">
                    Formats acceptés: .ifc (plusieurs fichiers peuvent être sélectionnés)
                  </div>
                </div>
                
                {selectedFiles.length > 0 && (
                  <div className="text-sm">
                    <div>{selectedFiles.length} fichier(s) sélectionné(s)</div>
                    <ul className="list-disc pl-5 mt-1">
                      {selectedFiles.slice(0, 3).map((file, index) => (
                        <li key={`selected-file-${index}`}>{file.name} ({formatFileSize(file.size)})</li>
                      ))}
                      {selectedFiles.length > 3 && <li key="more-files">...et {selectedFiles.length - 3} autre(s)</li>}
                    </ul>
                  </div>
                )}
                
                <div className="flex justify-end gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setUploadDialogOpen(false)}
                    disabled={uploading}
                  >
                    Annuler
                  </Button>
                  <Button 
                    onClick={handleUpload} 
                    disabled={uploading || selectedFiles.length === 0}
                  >
                    {uploading ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        <span>Upload en cours...</span>
                      </div>
                    ) : (
                      "Uploader"
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      
      {projectFiles.length === 0 ? (
        <Card className="p-8 text-center">
          <FileBox className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium mb-2">No files uploaded yet</h3>
          <div className="text-gray-500 mb-4">Upload an IFC file to get started</div>
          <Button onClick={() => setUploadDialogOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Upload File
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projectFiles.map((file) => (
            <Card key={file.id} className="p-4">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  <FileBox className="h-8 w-8 text-blue-500 mr-3" />
                  <div>
                    <h3 className="font-medium">{file.name}</h3>
                    <div className="text-sm text-gray-500">
                      Version {file.version} • {formatFileSize(file.file_size || 0)}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2">
                {isValidFileUrl(file.file_url) ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => window.open(file.file_url)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    disabled
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Unavailable
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="icon"
                  className="text-red-500 hover:text-red-700"
                  onClick={() => handleDelete(file.id)}
                  disabled={loading}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}