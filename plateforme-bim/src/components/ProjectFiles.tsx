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
import { useSession } from 'next-auth/react';

interface ProjectFile {
  id: string;
  name: string;
  version?: number;
  file_size?: number;
  file_url: string;
  firebasePath?: string;
  uploadedBy?: string;
  uploadedByEmail?: string;
}

interface ProjectFilesProps {
  projectId: string;
  files: ProjectFile[];
  userRole: "owner" | "member";
}

export default function ProjectFiles({ projectId, files = [], userRole }: ProjectFilesProps) {
  const [loading, setLoading] = useState(false);
  const { data: session } = useSession();
  const currentUserEmail = session?.user?.email;
  const currentUserId = session?.user?.id;

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

  // Préparer les fichiers initiaux
  const adaptFiles = (inputFiles: any[]): ProjectFile[] => {
    return inputFiles.map((file) => {
      // Create a proper ID - use MongoDB ID if available, otherwise create a temp ID
      const id = file._id?.$oid || file._id?.toString() || `temp-${Math.random()}`;
      
      return {
        id: id,
        name: file.name,
        version: file.version,
        file_size: file.file_size,
        file_url: file.file_url,
        firebasePath: file.firebasePath,
        uploadedBy: file.uploadedBy,
        uploadedByEmail: file.uploadedByEmail
      };
    });
  };

  // Mettre à jour viewAllUrl et stocker les URLs valides pour la visualisation
  const updateViewAllUrl = () => {
    // Récupérer tous les fichiers avec des URLs valides
    const validFiles = projectFiles.filter(file => isValidFileUrl(file.file_url));
    const validUrls = validFiles.map(file => file.file_url);
    
    const valid = validUrls.length > 0;
    setHasValidFiles(valid);
    
    if (valid) {
      // Sauvegarder les URLs et projectId
      sessionStorage.setItem(`valid_urls_${projectId}`, JSON.stringify(validUrls));
      sessionStorage.setItem(`current_project_id`, projectId);
      
      const urlStr = JSON.stringify(validUrls);
      const newViewAllUrl = `/viewer?files=${encodeURIComponent(urlStr)}&projectId=${encodeURIComponent(projectId)}`;
      setViewAllUrl(newViewAllUrl);
    } else {
      setViewAllUrl("#");
      sessionStorage.removeItem(`valid_urls_${projectId}`);
    }
  };

  // FONCTION AMÉLIORÉE: Vérifier si l'utilisateur peut supprimer un fichier
  const canDeleteFile = (file: ProjectFile) => {
    // Les propriétaires peuvent toujours supprimer
    if (userRole === "owner") return true;
    
    // Pour les fichiers temporaires, comparer avec l'email actuel
    if (file.id.startsWith('temp-')) {
      // Si uploadedBy est un email, comparer avec l'email actuel
      if (typeof file.uploadedBy === 'string' && file.uploadedBy.includes('@')) {
        return file.uploadedBy === currentUserEmail;
      }
    }
    
    // Vérifier si l'utilisateur actuel est celui qui a uploadé le fichier
    // Priorité à l'email pour la vérification (plus fiable)
    if (currentUserEmail && file.uploadedByEmail) {
      return file.uploadedByEmail === currentUserEmail;
    }
    
    // Sinon, vérifier l'ID si disponible
    if (currentUserId && file.uploadedBy) {
      return file.uploadedBy === currentUserId;
    }
    
    return false;
  };

  // Suppression de fichier avec l'email de l'utilisateur
  const handleDelete = async (fileId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce fichier ?")) return;

    setLoading(true);
    try {
      // Find the file to delete
      const fileToDelete = projectFiles.find(file => file.id === fileId);
      
      if (!fileToDelete) {
        throw new Error("Fichier non trouvé");
      }
      
      // Check if this is a MongoDB ID or a temporary ID
      const isMongoId = !fileId.startsWith('temp-');
      
      const response = await fetch("/api/upload", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          fileId, 
          projectId,
          firebasePath: fileToDelete.firebasePath,
          // Send both user ID and email for permission checking
          userEmail: currentUserEmail,
          userId: currentUserId,
          isTemporary: !isMongoId
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erreur lors de la suppression");
      }
      
      const data = await response.json();
      
      // Update local state
      const updatedFiles = projectFiles.filter((file) => file.id !== fileId);
      setProjectFiles(updatedFiles);

      // Update localStorage
      localStorage.setItem(
        `project_files_${projectId}`,
        JSON.stringify(updatedFiles)
      );

      // Update viewAllUrl
      updateViewAllUrl();

      // Refresh the page only if it was a real MongoDB file
      if (isMongoId) {
        router.refresh();
        // Also refresh the file list from server
        await fetchFiles();
      }

      alert("Fichier supprimé avec succès");
      
    } catch (error) {
      console.error("Erreur lors de la suppression du fichier:", error);
      alert(`Erreur lors de la suppression: ${error instanceof Error ? error.message : "Une erreur inconnue s'est produite"}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Chargement initial des fichiers
  useEffect(() => {
    const loadFiles = () => {
      try {
        // Essayer de charger depuis localStorage d'abord
        const savedFiles = localStorage.getItem(`project_files_${projectId}`);
        
        if (savedFiles) {
          const parsedFiles = JSON.parse(savedFiles);
          
          if (Array.isArray(parsedFiles) && parsedFiles.length > 0) {
            console.log("Loading files from localStorage:", parsedFiles);
            setProjectFiles(parsedFiles);
            return;
          }
        }
        
        // Sinon utiliser les props
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

  // Gestion du téléversement avec l'email de l'utilisateur
  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      setError("Veuillez sélectionner au moins un fichier.");
      return;
    }
  
    // Vérifier le format des fichiers
    for (const file of selectedFiles) {
      if (!file.name.toLowerCase().endsWith('.ifc')) {
        setError("Tous les fichiers doivent être au format IFC.");
        return;
      }
    }
  
    setUploading(true);
    setError(null);
    const formData = new FormData();
  
    selectedFiles.forEach((file) => {
      formData.append("file", file);
    });
  
    formData.append("projectId", projectId);
    
    // Toujours ajouter l'email de l'utilisateur à l'upload
    if (currentUserEmail) {
      formData.append("userEmail", currentUserEmail);
    }
    if (currentUserId) {
      formData.append("userId", currentUserId);
    }
  
    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
  
      const data = await response.json();
  
      if (response.ok) {
        setUploadDialogOpen(false);
        
        // Actualiser directement les fichiers depuis l'API
        await fetchFiles();
        
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

  // Initialiser viewAllUrl depuis sessionStorage
  useEffect(() => {
    const savedUrls = sessionStorage.getItem(`valid_urls_${projectId}`);
    if (savedUrls) {
      try {
        const validUrls = JSON.parse(savedUrls);
        if (Array.isArray(validUrls) && validUrls.length > 0) {
          setHasValidFiles(true);
          const urlStr = JSON.stringify(validUrls);
          setViewAllUrl(`/viewer?files=${encodeURIComponent(urlStr)}&projectId=${encodeURIComponent(projectId)}`);
          sessionStorage.setItem(`current_project_id`, projectId);
        }
      } catch (e) {
        console.error("Erreur lors de la récupération des URLs:", e);
      }
    }
  }, [projectId]);

  // Mettre à jour viewAllUrl quand les fichiers changent
  useEffect(() => {
    if (projectFiles.length > 0) {
      updateViewAllUrl();
    }
  }, [projectFiles]);

  // Formater la taille du fichier
  function formatFileSize(size: number): string {
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(2)} KB`;
    if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(2)} MB`;
    return `${(size / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }
 
  // Récupérer les fichiers depuis l'API
  const fetchFiles = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/files`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erreur de chargement");
      }
      
      const data = await response.json();
      console.log("Fetched files:", data);
      const adaptedFiles = adaptFiles(data);
      setProjectFiles(adaptedFiles);
      
      // Update local storage
      localStorage.setItem(
        `project_files_${projectId}`,
        JSON.stringify(adaptedFiles)
      );
    } catch (error) {
      console.error("Erreur lors du chargement des fichiers:", error);
    }
  };

  // Récupérer les fichiers au chargement du composant
  useEffect(() => {
    fetchFiles();
    
    // Rafraîchir périodiquement
    const interval = setInterval(() => {
      fetchFiles();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [projectId]); 
  
  // Fonction pour tronquer les noms de fichier trop longs
  const truncateFileName = (fileName: string, maxLength: number = 35) => {
    if (fileName.length <= maxLength) return fileName;
    
    const extension = fileName.split('.').pop() || '';
    const nameWithoutExt = fileName.substring(0, fileName.length - extension.length - 1);
    
    if (nameWithoutExt.length <= maxLength - 3 - extension.length) {
      return fileName;
    }
    
    return `${nameWithoutExt.substring(0, maxLength - 3 - extension.length)}...${extension ? `.${extension}` : ''}`;
  };
  
  const extractUsername = (email?: string) => {
    if (!email) return "Unknown";
    
    // Si c'est un email, extraire la partie avant @
    if (email.includes('@')) {
      return email.split('@')[0];
    }
    
    // Si c'est un ID MongoDB (ou autre ID)
    if (/^[0-9a-f]{24}$/.test(email)) {
      return `User ${email.slice(0, 5)}...`;
    }
    
    return email;
  };
  
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
          {projectFiles.map((file) => {
            // Vérifier si l'URL est valide pour le téléchargement
            const validUrl = isValidFileUrl(file.file_url);
            
            // Déterminer si l'utilisateur peut supprimer ce fichier
            const canDelete = canDeleteFile(file);
            
            // Tronquer le nom du fichier pour l'affichage
            const displayName = truncateFileName(file.name);
            
            // Extraire le nom d'utilisateur depuis l'email
            const username = file.uploadedByEmail ? extractUsername(file.uploadedByEmail) : 
                            (file.uploadedBy ? extractUsername(file.uploadedBy) : "Unknown");
            
            // Pour déboguer
            console.log(`File ${file.name}:
            - Can delete: ${canDelete}
            - uploadedBy: ${file.uploadedBy}
            - uploadedByEmail: ${file.uploadedByEmail}
            - currentUserId: ${currentUserId}
            - currentUserEmail: ${currentUserEmail}
            - userRole: ${userRole}`);
            
            return (
              <Card key={file.id} className="p-4">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center">
                    <FileBox className="h-8 w-8 text-blue-500 mr-3 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium truncate" title={file.name}>
                        {displayName}
                      </h3>
                      <div className="text-sm text-gray-500">
                        Version {file.version} • {formatFileSize(file.file_size || 0)}
                      </div>
                      
                      {/* Afficher l'utilisateur qui a téléversé le fichier */}
                      {(file.uploadedByEmail || file.uploadedBy) && (
                        <div className="text-sm text-gray-500">
                          Created by{' '}
                          <span className="font-medium">
                            {username}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  {/* Bouton de téléchargement toujours disponible si URL valide */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => window.open(file.file_url)}
                    disabled={!validUrl}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {validUrl ? "Download" : "Download Unavailable"}
                  </Button>
                  
                  {/* Afficher le bouton de suppression SEULEMENT si l'utilisateur peut supprimer */}
                  {canDelete && (
                    <Button
                      onClick={() => handleDelete(file.id)}
                      variant="destructive"
                      size="sm"
                      disabled={loading}
                    >
                      {loading ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}