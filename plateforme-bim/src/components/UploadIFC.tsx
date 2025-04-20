"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";

interface UploadIFCProps {
  projectId: string;
}

const UploadIFC = ({ projectId }: UploadIFCProps) => {
  const [files, setFiles] = useState<FileList | null>(null);
  const [uploading, setUploading] = useState(false);
  const router = useRouter();
  const { data: session } = useSession();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setFiles(event.target.files);
    }
  };

  const handleUpload = async () => {
    if (!files || files.length === 0) {
      alert("Veuillez sélectionner un fichier.");
      return;
    }

    if (!session?.user) {
      alert("Vous devez être connecté pour uploader des fichiers.");
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      Array.from(files).forEach(file => {
        formData.append("file", file);
      });
      formData.append("projectId", projectId);
      formData.append("uploadedBy", session.user.id);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        router.refresh(); // Rafraîchir la page pour montrer les nouveaux fichiers
        router.push(`/projects/${projectId}/viewer?files=${encodeURIComponent(JSON.stringify(result.downloadURLs))}`);
      } else {
        const error = await response.json();
        console.error("Erreur lors de l'upload :", error);
        alert("Erreur lors de l'upload du fichier.");
      }
    } catch (error) {
      console.error("Erreur réseau :", error);
      alert("Erreur réseau.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-white">
      <div className="flex items-center gap-4">
        <Input
          type="file"
          accept=".ifc"
          multiple
          onChange={handleFileChange}
          className="flex-1"
        />
        <Button
          onClick={handleUpload}
          disabled={uploading || !files}
          className="min-w-[120px]"
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4 mr-2" />
          )}
          {uploading ? "Upload..." : "Uploader"}
        </Button>
      </div>
      <p className="text-sm text-gray-500">
        Formats acceptés: .ifc (plusieurs fichiers peuvent être sélectionnés)
      </p>
    </div>
  );
};

export default UploadIFC;