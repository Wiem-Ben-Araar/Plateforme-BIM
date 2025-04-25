"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building, Users, FileBox, ArrowLeft } from "lucide-react";
import Link from "next/link";
import ProjectFiles from "@/components/ProjectFiles";
import ProjectMembers from "@/components/ProjectMembers";
import { useSession } from "next-auth/react";

// Définition des types
interface Project {
  id: string;
  name: string;
  description: string;
  status: string;
}

interface ProjectFile {
  id: string;
  name: string;
  version: number;
  file_size: number;
  file_url: string;
}

interface ProjectMember {
  id: string;
  name: string;
  email: string;
  image: string;
  role: string;
}

export default function ProjectDetailsPage() {
  const { data: session } = useSession(); 
  const params = useParams();
  const router = useRouter();
  
  // Extraction sécurisée de l'ID du projet
  const projectId = typeof params.id === "string" ? params.id : 
                    Array.isArray(params.id) ? params.id[0] : "";

  const [project, setProject] = useState<Project | null>(null);
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<"owner" | "member">("member");

  // Fetch project details
  useEffect(() => {
    if (!projectId) return;

    const fetchProject = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/projects/${projectId}`);

        if (!response.ok) {
          throw new Error(`Failed to fetch project: ${response.status}`);
        }

        const data = await response.json();
        console.log("Projet récupéré:", data);
        setProject(data);
      } catch (error) {
        console.error("Erreur lors de la récupération du projet:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
  }, [projectId]);

  // Fetch project files
  useEffect(() => {
    if (!projectId) return;
    
    const fetchFiles = async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}/files`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch files: ${response.status}`);
        }
        
        const data = await response.json();
        setFiles(data);
      } catch (error) {
        console.error("Erreur lors de la récupération des fichiers:", error);
      }
    };
    
    fetchFiles();
  }, [projectId]);

  // Fetch project members
  useEffect(() => {
    if (!projectId) return;
    
    const fetchMembers = async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}/members`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch members: ${response.status}`);
        }
        
        const data = await response.json();
        setMembers(data.members || []);
      } catch (error) {
        console.error("Erreur lors de la récupération des membres:", error);
      }
    };
    
    fetchMembers();
  }, [projectId]);

  // Fetch user role
  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}/role`);
        const data = await response.json();
        setUserRole(data.role);
      } catch (error) {
        console.error("Error fetching user role:", error);
      }
    };
  
    if (session) {
      fetchUserRole();
    }
  }, [session, projectId]);

  // Gestion du chargement
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Gestion du projet non trouvé
  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-2xl font-bold mb-4">Project not found</h1>
        <Button asChild>
          <Link href="/">Return to Home</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/projects">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Projects
          </Link>
        </Button>

        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">{project.name}</h1>
            <p className="text-gray-600 mt-1">{project.description}</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="files">Files</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileBox className="h-5 w-5 mr-2" />
                  Files
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{files.length}</p>
                <p className="text-sm text-gray-500">IFC files uploaded</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  Team Members
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{members.length}</p>
                <p className="text-sm text-gray-500">Active members</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Building className="h-5 w-5 mr-2" />
                  Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold capitalize">{project.status}</p>
                <p className="text-sm text-gray-500">Project status</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="files">
          <ProjectFiles projectId={projectId} files={files} userRole={userRole} />
        </TabsContent>

        <TabsContent value="members">
          <ProjectMembers projectId={projectId} userRole={userRole} />
        </TabsContent>
      </Tabs>
    </div>
  );
}