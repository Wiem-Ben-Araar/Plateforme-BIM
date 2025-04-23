"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { User2, Trash2, X, Plus } from "lucide-react"
import * as THREE from "three"

// Interface Todo
export interface Todo {
  _id: string
  id?: string
  title: string
  description?: string
  status: "new" | "in-progress" | "waiting" | "done" | "closed" 
  priority: "low" | "normal" | "high" | "critical"
  createdBy: string
  userId?: string
  assignedTo?: string
  project: string
  createdAt: Date
  updatedAt?: Date
  screenshot?: string
  viewpoint?: {
    _id?: string
    guid?: string
    camera_view_point?: { x: number; y: number; z: number }
    camera_direction?: { x: number; y: number; z: number }
    camera_up_vector?: { x: number; y: number; z: number }
    field_of_view?: number
    position?: { x: number; y: number; z: number }
    target?: { x: number; y: number; z: number }
    up?: { x: number; y: number; z: number }
    fieldOfView?: number
    _doc?: any
  }
}

// Sous-composant TodoPanel
function TodoPanel({
  todos,
  onTodoSelect,
  onTodoDelete,
  onTodoStatusChange,
  onTodoAssign,
  activeTool,
  onCreateNote,
  projectMembers,
}: {
  todos: Todo[]
  onTodoSelect: (todo: Todo) => void
  onTodoDelete: (id: string) => void
  onTodoStatusChange: (id: string, status: Todo["status"]) => void
  onTodoAssign: (id: string, userId: string) => void
  activeTool: string | null
  onCreateNote: () => void
  projectMembers: any[] 
}) {
  if (activeTool !== "todos") return null

  return (
    <div className="absolute right-4 top-20 w-96 bg-white rounded-lg shadow-lg p-4 max-h-[80vh] overflow-auto z-10">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Todos</h3>
        <div className="flex gap-2 items-center">
          <Badge variant="outline">{todos.length}</Badge>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onCreateNote}
             className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
             New Todo
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {todos.map((todo) => (
          <div
            key={todo._id || todo.id}
            className="border rounded-lg p-3 hover:border-blue-500 transition-colors cursor-pointer"
            onClick={() => onTodoSelect(todo)}
          >
            <div className="flex justify-between items-start mb-2">
              <div>
                <h4 className="font-medium">{todo.title}</h4>
                <p className="text-sm text-gray-600 line-clamp-2">{todo.description}</p>
              </div>
              <Badge
                className={
                  todo.status === "open"
                    ? "bg-red-100 text-red-800"
                    : todo.status === "in-progress"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-green-100 text-green-800"
                }
              >
                {todo.status}
              </Badge>
            </div>

            <div className="flex items-center justify-between text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <User2 className="h-4 w-4" />
                <Select
                  value={todo.assignedTo || ""}
                  onValueChange={(value) => onTodoAssign(todo._id || todo.id || "", value)}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Assign to..." />
                  </SelectTrigger>
                  <SelectContent>
  <SelectGroup>
    {projectMembers && projectMembers.length > 0 ? (
      projectMembers.map(member => (
        <SelectItem key={member.id || member._id} value={member.id || member._id}>
          {member.name || member.email || "Unnamed user"}
        </SelectItem>
      ))
    ) : (
      <SelectItem value="none">Aucun membre disponible</SelectItem>
    )}
  </SelectGroup>
</SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Select
                  value={todo.status}
                  onValueChange={(value: Todo["status"]) => onTodoStatusChange(todo._id || todo.id || "", value)}
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                    <SelectItem value="new">New</SelectItem>
      <SelectItem value="in-progress">In Progress</SelectItem>
      <SelectItem value="waiting">Waiting</SelectItem>
      <SelectItem value="done">Done</SelectItem>
      <SelectItem value="closed">Closed</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>

             
                <button
                  onClick={(e) => {
                    e.stopPropagation() // Empêche le déclenchement du onClick du parent
                    onTodoSelect(todo)  // Cette ligne appelle déjà restoreTodoView
                  }}
                  className="text-blue-500 hover:text-blue-700"
                  title="Restore View"
                >
                  {/* Icône de caméra au lieu de Eye */}
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"></path>
                    <circle cx="12" cy="13" r="3"></circle>
                  </svg>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onTodoDelete(todo._id || todo.id || "")
                  }}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="mt-2 text-xs text-gray-400">
              Created by {todo.createdBy} on {new Date(todo.createdAt).toLocaleDateString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Sous-composant TodoCreationModal
function TodoCreationModal({
  isOpen,
  onClose,
  newTodo,
  setNewTodo,
  onCreateTodo,
}: {
  isOpen: boolean
  onClose: () => void
  newTodo: {
    title: string
    description: string
    priority: "low" | "normal" | "high" | "critical"
  }
  setNewTodo: React.Dispatch<
    React.SetStateAction<{
      title: string
      description: string
      priority: "low" | "normal" | "high" | "critical"
    }>
  >
  onCreateTodo: () => void
}) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-[480px] max-h-[90vh] overflow-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold">Create New Todo</h3>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="Enter todo title"
                value={newTodo.title}
                onChange={(e) => setNewTodo((prev) => ({ ...prev, title: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                className="w-full min-h-[100px] p-2 border rounded-md"
                placeholder="Enter todo description"
                value={newTodo.description}
                onChange={(e) => setNewTodo((prev) => ({ ...prev, description: e.target.value }))}
                rows={4}
              />
            </div>

            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={newTodo.priority}
                onValueChange={(value: "low" | "normal" | "high" | "critical") =>
                  setNewTodo((prev) => ({ ...prev, priority: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={onCreateTodo} disabled={!newTodo.title}>
              Create Todo
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Composant principal TodoManager
interface TodoManagerProps {
  viewerRef: React.RefObject<any>
  session: any
  toast: any
}

export function TodoManager({ viewerRef, session, toast }: TodoManagerProps) {
  const [todos, setTodos] = useState<Todo[]>([])
  const [isCreatingTodo, setIsCreatingTodo] = useState(false)
  const [projectMembers, setProjectMembers] = useState([]);
  const [activeTool, setActiveTool] = useState<string | null>(null)
  const [newTodo, setNewTodo] = useState({
    title: '',
    description: '',
    priority: 'normal' as const,
  })

  useEffect(() => {
    const fetchTodos = async () => {
      try {
        // Récupérer l'ID du projet depuis l'URL
        const urlParams = new URLSearchParams(window.location.search)
        const projectId = urlParams.get('projectId')

        if (!projectId) {
          console.error("Project ID is missing")
          return
        }

        const response = await fetch(`/api/todos?projectId=${projectId}`)

        if (!response.ok) {
          throw new Error(`Error: ${response.status}`)
        }

        const data = await response.json()
        setTodos(data)
      } catch (error) {
        console.error("Failed to fetch todos", error)
      }
    }

    fetchTodos()
  }, [])
  useEffect(() => {
    const fetchTodos = async () => {
      try {
        // Code existant pour récupérer les todos...
      } catch (error) {
        console.error("Failed to fetch todos", error)
      }
    }
  
    const fetchProjectMembers = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search)
        const projectId = urlParams.get('projectId')
    
        if (!projectId) {
          console.error("Project ID is missing")
          return
        }
    
        console.log("Fetching members for project:", projectId);
        const response = await fetch(`/api/projects/${projectId}/members`)
    
        if (!response.ok) {
          throw new Error(`Error: ${response.status}`)
        }
    
        const data = await response.json()
        console.log("Project members received:", data); // Ajoutez ce log pour voir le format des données
        
        // Si les données ont une structure différente, ajustez la manière dont vous les stockez
        if (Array.isArray(data)) {
          setProjectMembers(data)
        } else if (data.members && Array.isArray(data.members)) {
          setProjectMembers(data.members)
        } else {
          console.error("Unexpected data format for members:", data)
        }
      } catch (error) {
        console.error("Failed to fetch project members", error)
      }
    }
  
    fetchTodos()
    fetchProjectMembers()
  }, [])
  const createTodo = async () => {
    if (!viewerRef.current || !newTodo.title) return
  
    try {
      // Récupérer la caméra et les contrôles de la vue
      const camera = viewerRef.current.context.getCamera()
      const controls = viewerRef.current.context.ifcCamera.cameraControls
  
      // Calculer le point cible à partir des contrôles de caméra
      const target = new THREE.Vector3()
      controls.getTarget(target)
  
      const currentUser = session?.user
      console.log("Current user from session:", currentUser)
      
      if (!currentUser || !currentUser.id) {
        console.error("Utilisateur non connecté ou ID utilisateur manquant")
        toast.error("Vous devez être connecté pour créer un todo")
        return
      }
  
      const urlParams = new URLSearchParams(window.location.search)
      const projectId = urlParams.get('projectId')
  
      if (!projectId) {
        console.error("Project ID is missing")
        toast.error("Project ID is required. Please open a project first.")
        return
      }
  
      const fieldOfView = camera.fov || 45
  
      const direction = {
        x: target.x - camera.position.x,
        y: target.y - camera.position.y,
        z: target.z - camera.position.z
      }
      
      // Normaliser la direction pour une visualisation précise
      const dirLength = Math.sqrt(
        direction.x * direction.x +
        direction.y * direction.y +
        direction.z * direction.z
      )
      
      if (dirLength > 0) {
        direction.x /= dirLength
        direction.y /= dirLength
        direction.z /= dirLength
      }
  
      // Préparer l'objet viewpoint
      const viewpoint = {
        guid: `viewpoint-${Date.now()}`,
        camera_view_point: {
          x: camera.position.x,
          y: camera.position.y,
          z: camera.position.z,
        },
        camera_direction: {
          x: direction.x,
          y: direction.y,
          z: direction.z,
        },
        camera_up_vector: {
          x: camera.up.x,
          y: camera.up.y,
          z: camera.up.z,
        },
        field_of_view: fieldOfView,
        project: projectId,
        createdBy: currentUser.id,
        createdAt: new Date()
      }
  
      // Capturer une image de la vue actuelle
      const renderer = viewerRef.current.context.getRenderer()
      renderer.render(viewerRef.current.context.getScene(), camera)
      const screenshot = renderer.domElement.toDataURL()
  
      // Créer directement le todo avec l'objet viewpoint intégré
      const todoData = {
        title: newTodo.title,
        description: newTodo.description,
        status: "new",
        priority: newTodo.priority,
        createdBy: currentUser?.name || currentUser?.email || "Unknown User",
        userId: currentUser.id,
        project: projectId,
        createdAt: new Date(),
        viewpoint: viewpoint,
        screenshot: screenshot
      }
  
      console.log("Todo à envoyer:", todoData)
  
      const response = await fetch("/api/todos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(todoData),
      })
  
      // Vérifier le type de contenu avant de parser en JSON
      const contentType = response.headers.get("content-type")
      
      if (!response.ok) {
        let errorMessage = `Error: ${response.status}`
        try {
          if (contentType && contentType.includes("application/json")) {
            const errorData = await response.json()
            errorMessage += ` - ${errorData.error || "Unknown error"}`
          } else {
            const errorText = await response.text()
            console.error("Réponse non-JSON reçue:", errorText.substring(0, 200))
            errorMessage += " - Non-JSON response received"
          }
        } catch (e) {
          console.error("Erreur lors de la lecture de la réponse:", e)
        }
        throw new Error(errorMessage)
      }
  
      // S'assurer que la réponse est JSON avant de la parser
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("La réponse du serveur n'est pas au format JSON")
      }
  
      const savedTodo = await response.json()
      console.log("Todo sauvegardé avec succès:", savedTodo)
  
      setTodos((prev) => [...prev, savedTodo])
      setIsCreatingTodo(false)
      setNewTodo({ title: "", description: "", priority: "normal" })
  
      toast.success("Todo created successfully")
    } catch (error) {
      console.error("Failed to save todo", error)
      toast.error(`Failed to save todo: ${error.message}`)
    }
  }
  
  const restoreTodoView = (todo: Todo) => {
    if (!viewerRef.current) {
      console.error("Viewer reference not available");
      return;
    }
    
    const controls = viewerRef.current.context?.ifcCamera?.cameraControls;
    
    if (!controls) {
      console.error("Contrôles de la caméra non initialisés");
      return;
    }
    
    // Récupérer les données du viewpoint
    let viewpointData = todo.viewpoint;
    
    // Gérer les structures potentiellement imbriquées de MongoDB
    if (viewpointData && typeof viewpointData === 'object' && '_doc' in viewpointData) {
      viewpointData = viewpointData._doc;
    }
    
    if (!viewpointData || typeof viewpointData !== 'object') {
      console.error("Données de viewpoint manquantes");
      return;
    }
    
    // Extraire les données nécessaires selon le format
    let position, direction, up, fieldOfView;
    
    if ('camera_view_point' in viewpointData && 'camera_direction' in viewpointData) {
      position = viewpointData.camera_view_point;
      direction = viewpointData.camera_direction;
      up = viewpointData.camera_up_vector;
      fieldOfView = viewpointData.field_of_view || 45;
    } 
    else if ('position' in viewpointData && 'target' in viewpointData) {
      position = viewpointData.position;
      direction = {
        x: viewpointData.target.x - viewpointData.position.x,
        y: viewpointData.target.y - viewpointData.position.y,
        z: viewpointData.target.z - viewpointData.position.z
      };
      up = viewpointData.up || { x: 0, y: 1, z: 0 };
      fieldOfView = viewpointData.fieldOfView || 45;
    }
    else {
      console.error("Format de viewpoint non reconnu:", viewpointData);
      return;
    }
    
    // Validation des données
    if (
      !position || !direction || !up ||
      typeof position.x !== 'number' ||
      typeof direction.x !== 'number' ||
      typeof up.x !== 'number'
    ) {
      console.error("Données de viewpoint invalides:", viewpointData);
      return;
    }
    
    // Calculer le point cible
    const target = {
      x: position.x + direction.x,
      y: position.y + direction.y,
      z: position.z + direction.z
    };
    
    // Récupérer la caméra
    const camera = viewerRef.current.context.getCamera();
    
    // Appliquer le vecteur "up" avant l'animation pour une orientation correcte
    if (camera) {
      camera.up.set(up.x, up.y, up.z);
    }
    
    // Définir le champ de vision si présent
    if (typeof fieldOfView === 'number' && camera) {
      camera.fov = fieldOfView;
      camera.updateProjectionMatrix();
    }
    
    // Paramètres d'animation pour une transition plus fluide (comme Trimble)
    const animationDuration = 1.2; // durée en secondes
    const enableDamping = true;    // activer l'amortissement pour une animation plus naturelle
    const dampingFactor = 0.05;    // facteur d'amortissement (plus petit = plus fluide)
    
    // Animation fluide de la caméra vers la nouvelle position
    controls.setLookAt(
      position.x,
      position.y,
      position.z,
      target.x,
      target.y,
      target.z,
      true, // animation activée
      animationDuration
    );
    
    // Configurer l'amortissement si disponible
    if (controls.dampingFactor !== undefined) {
      const originalDamping = controls.dampingFactor;
      controls.dampingFactor = dampingFactor;
      controls.enableDamping = enableDamping;
      
      // Restaurer les valeurs originales après l'animation
      setTimeout(() => {
        if (controls.dampingFactor !== undefined) {
          controls.dampingFactor = originalDamping;
        }
      }, animationDuration * 1000 + 100);
    }
    
    // Mettre à jour les contrôles
    controls.update(true);
    
    // Feedback utilisateur
    toast.success(`Vue restaurée: ${todo.title}`, {
      duration: 2000,
      position: "bottom-right"
    });
  }

  // Mise à jour de handleTodoSelect pour utiliser la nouvelle fonction restoreTodoView
  const handleTodoSelect = (todo: Todo) => {
    restoreTodoView(todo);
  }
  const handleTodoStatusChange = async (todoId, newStatus) => {
    try {
      const response = await fetch('/api/todos', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: todoId,
          status: newStatus
        }),
      });
  
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
  
      const updatedTodo = await response.json();
  
      // Mettre à jour l'état local
      setTodos(prev =>
        prev.map(todo => (todo._id === todoId || todo.id === todoId) ? updatedTodo : todo)
      );
      
      toast.success(`Status changed to ${newStatus}`);
    } catch (error) {
      console.error("Failed to update todo status", error);
      toast.error(`Failed to update status: ${error.message}`);
    }
  };

  const handleTodoAssign = async (todoId: string, userId: string) => {
    try {
      console.log(`Assigning todo ${todoId} to user ${userId}`);
      
      // Chercher d'abord le todo dans la liste pour vérifier son ID
      const todoToUpdate = todos.find(t => t._id === todoId || t.id === todoId);
      if (!todoToUpdate) {
        console.error("Todo not found in local state:", todoId);
        return;
      }
      
      // Utiliser l'ID approprié (MongoDB utilise généralement _id)
      const actualId = todoToUpdate._id || todoToUpdate.id;
      console.log("Using actual todo ID:", actualId);
      
      const apiUrl = '/api/todos';
      const body = {
        id: actualId,
        assignedTo: userId
      };
      
      console.log("Request URL:", apiUrl);
      console.log("Request body:", body);
      
      const response = await fetch(apiUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
  
      if (!response.ok) {
        const errorText = await response.text();
        console.error("API Error response:", errorText);
        throw new Error(`Error: ${response.status}`);
      }
  
      const updatedTodo = await response.json();
      console.log("Todo updated successfully:", updatedTodo);
  
      // Mettre à jour l'état local
      setTodos(prev =>
        prev.map(todo => (todo._id === actualId || todo.id === actualId) ? updatedTodo : todo)
      );
      
      toast.success("Assigné avec succès");
    } catch (error) {
      console.error("Failed to assign todo", error);
      toast.error(`Échec de l'assignation: ${error.message}`);
    }
  }

  const handleTodoDelete = async (todoId: string) => {
    if (!todoId) {
      toast.error("ID manquant pour la suppression")
      return
    }

    // Récupération du projectId depuis l'URL
    const urlParams = new URLSearchParams(window.location.search)
    const projectId = urlParams.get('projectId')

    const originalTodos = todos

    // 1. Suppression optimiste
    setTodos(prev => prev.filter(t => t._id !== todoId && t.id !== todoId))

    try {
      // 2. Suppression réelle
      const response = await fetch(`/api/todos?id=${encodeURIComponent(todoId)}`, {
        method: "DELETE"
      })

      if (!response.ok) throw new Error("Échec de la suppression")

      // 3. Rechargement des todos du projet
      if (projectId) {
        const freshData = await fetch(`/api/todos?projectId=${projectId}`)
          .then(res => res.json())
        setTodos(freshData)
      }

      toast.success("Supprimé avec succès !")
    } catch (error) {
      // Rollback
      setTodos(originalTodos)
      toast.error("Échec de la suppression")
    }
  }
  const exportBCF = () => {
    const JSZip = require("jszip");
    const zip = new JSZip();
  
    // Fichier de version BCF - obligatoire et conforme à la spécification BCF 2.1
    zip.file(
      "bcf.version",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
  <Version VersionId="2.1">
    <DetailedVersion>2.1</DetailedVersion>
  </Version>`
    );
  
    console.log("Création du fichier BCF avec", todos.length, "todos");
  
    // Limiter à maximum 10 todos pour éviter les problèmes de taille
    const todosToExport = todos.slice(0, 10);
  
    // Fonction pour s'assurer que les vecteurs direction et up sont perpendiculaires
    function ensureVectorsPerpendicular(camera) {
      // Normaliser le vecteur direction
      const dirLength = Math.sqrt(
        camera.direction.x * camera.direction.x +
        camera.direction.y * camera.direction.y +
        camera.direction.z * camera.direction.z
      );
      
      if (dirLength > 0) {
        camera.direction.x /= dirLength;
        camera.direction.y /= dirLength;
        camera.direction.z /= dirLength;
      }
      
      // Normaliser le vecteur up initial
      const upLength = Math.sqrt(
        camera.up.x * camera.up.x +
        camera.up.y * camera.up.y +
        camera.up.z * camera.up.z
      );
      
      if (upLength > 0) {
        camera.up.x /= upLength;
        camera.up.y /= upLength;
        camera.up.z /= upLength;
      }
      
      // Calculer le produit scalaire entre direction et up
      const dotProduct = 
        camera.direction.x * camera.up.x +
        camera.direction.y * camera.up.y +
        camera.direction.z * camera.up.z;
      
      // Si les vecteurs ne sont pas perpendiculaires
      if (Math.abs(dotProduct) > 0.0001) {
        // Utiliser un produit vectoriel pour créer un vecteur perpendiculaire
        // Calculer le produit vectoriel entre direction et (0,1,0)
        const auxVector = { x: 0, y: 1, z: 0 };
        
        // Si direction est trop proche de auxVector, utiliser un autre vecteur auxiliaire
        if (Math.abs(camera.direction.y) > 0.9) {
          auxVector.x = 1;
          auxVector.y = 0;
        }
        
        // Calculer le produit vectoriel
        const crossX = camera.direction.y * auxVector.z - camera.direction.z * auxVector.y;
        const crossY = camera.direction.z * auxVector.x - camera.direction.x * auxVector.z;
        const crossZ = camera.direction.x * auxVector.y - camera.direction.y * auxVector.x;
        
        // Normaliser le résultat
        const crossLength = Math.sqrt(crossX * crossX + crossY * crossY + crossZ * crossZ);
        
        if (crossLength > 0) {
          camera.up.x = crossX / crossLength;
          camera.up.y = crossY / crossLength;
          camera.up.z = crossZ / crossLength;
        } else {
          // Fallback si le produit vectoriel est nul
          camera.up = { x: 0, y: 1, z: 0 };
          if (Math.abs(camera.direction.y) > 0.9) {
            camera.up = { x: 1, y: 0, z: 0 };
          }
        }
      }
      
      return camera;
    }
  
    // Fonction pour mapper les priorités du schéma Mongoose aux valeurs BCF
    function mapPriority(priority) {
      switch (priority) {
        case "low": return "Low";
        case "normal": return "Normal";
        case "high": return "High";
        case "critical": return "Critical";
        default: return "Medium";
      }
    }
  
    // Fonction pour générer un UUID au format standard
    function generateUUID() {
      return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16).toUpperCase();
      });
    }
  
    // Pour chaque todo, créer un dossier avec un GUID standard
    todosToExport.forEach((todo, index) => {
      // Utiliser un GUID fixe pour le premier todo (pour le débogage)
      const topicGuid = index === 0
        ? "63E78882-7C6A-4BF7-8982-FC478AFB9C97"
        : generateUUID();
  
      console.log(`Création du dossier pour todo '${todo.title}' avec GUID ${topicGuid}`);
      const topicFolder = zip.folder(topicGuid);
      
      // Vérifier que le viewpoint est bien chargé
      if (!todo.viewpoint) {
        console.log(`Todo '${todo.title}' n'a pas de viewpoint associé, utilisation de valeurs par défaut.`);
      }
      
      const viewpointGuid = todo.viewpoint?.guid || generateUUID();
  
      // Nettoyer les textes pour éviter les problèmes XML
      const safeTitle = (todo.title || "Todo").replace(/[<>&'"]/g, "");
      const safeDesc = (todo.description || "Description").replace(/[<>&'"]/g, "");
      const safeAuthor = (todo.createdBy || "User").replace(/[<>&'"]/g, "");
  
      // Fichier markup.bcf - contient les métadonnées du todo
      // Format strictement conforme à BCF 2.1
      topicFolder.file(
        "markup.bcf",
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
  <Markup>
    <Topic Guid="${topicGuid}" TopicType="Issue" TopicStatus="${todo.status || 'Open'}">
      <Title>${safeTitle}</Title>
      <Description>${safeDesc}</Description>
      <CreationDate>${new Date(todo.createdAt).toISOString()}</CreationDate>
      <CreationAuthor>${safeAuthor}</CreationAuthor>
      <ModifiedDate>${new Date(todo.updatedAt || todo.createdAt).toISOString()}</ModifiedDate>
      <ModifiedAuthor>${safeAuthor}</ModifiedAuthor>
      <Priority>${mapPriority(todo.priority)}</Priority>
    </Topic>
    <Viewpoints>
      <Viewpoint Guid="${viewpointGuid}">
        <ViewpointReference>viewpoint.bcfv</ViewpointReference>
        <Snapshot>snapshot.png</Snapshot>
      </Viewpoint>
    </Viewpoints>
  </Markup>`
      );
  
      // Extraire et transformer les données de caméra du viewpoint pour Revit/BIMTrack
      let camera = {
        position: { x: 0, y: 0, z: 0 },
        direction: { x: 0, y: 0, z: -1 },
        up: { x: 0, y: 1, z: 0 }
      };
  
      if (todo.viewpoint) {
        // Nouvelle structure avec camera_view_point, camera_direction et camera_up_vector
        if (todo.viewpoint.camera_view_point && todo.viewpoint.camera_direction && todo.viewpoint.camera_up_vector) {
          // Transform coordinates - adapté pour les nouvelles propriétés
          const transformCoord = (p) => ({
            x: p.x,       // X inchangé
            y: -p.z,      // Y prend -Z (inversion de la hauteur)
            z: p.y        // Z prend Y (verticale)
          });
          
          const viewPoint = transformCoord(todo.viewpoint.camera_view_point);
          
          // Calculate target point by adding direction vector to view point
          // (Le point cible se trouve à une distance de 1 unité dans la direction indiquée)
          const targetPoint = {
            x: todo.viewpoint.camera_view_point.x + todo.viewpoint.camera_direction.x,
            y: todo.viewpoint.camera_view_point.y + todo.viewpoint.camera_direction.y,
            z: todo.viewpoint.camera_view_point.z + todo.viewpoint.camera_direction.z
          };
          
          const target = transformCoord(targetPoint);
          const upVector = transformCoord(todo.viewpoint.camera_up_vector);
          
          camera = {
            position: viewPoint,
            target: target,
            up: upVector
          };
          
          // Calculate forward direction
          const forward = {
            x: camera.target.x - camera.position.x,
            y: camera.target.y - camera.position.y,
            z: camera.target.z - camera.position.z
          };
          
          // Normalize forward
          const forwardLength = Math.sqrt(forward.x ** 2 + forward.y ** 2 + forward.z ** 2);
          if (forwardLength > 0) {
            forward.x /= forwardLength;
            forward.y /= forwardLength;
            forward.z /= forwardLength;
          }
          
          // Assigner le forward normalisé comme direction
          camera.direction = forward;
          
          // Ensure up is orthogonal to forward
          const dot = forward.x * camera.up.x + forward.y * camera.up.y + forward.z * camera.up.z;
          const correctedUp = {
            x: camera.up.x - forward.x * dot,
            y: camera.up.y - forward.y * dot,
            z: camera.up.z - forward.z * dot
          };
          
          // Normalize corrected up
          const upLength = Math.sqrt(correctedUp.x ** 2 + correctedUp.y ** 2 + correctedUp.z ** 2);
          if (upLength > 0) {
            camera.up = {
              x: correctedUp.x / upLength,
              y: correctedUp.y / upLength,
              z: correctedUp.z / upLength
            };
          }
          
        
        }
      } else {
        console.log("Viewpoint manquant, utilisation de valeurs par défaut");
        // Valeurs par défaut basées sur les échelles observées
        camera = {
          position: { x: -37000, y: 36000, z: 24000 },
          direction: { x: -0.5, y: -0.5, z: -0.5 },
          up: { x: 0, y: 1, z: 0 }
        };
        camera = ensureVectorsPerpendicular(camera);
      }
  
      // Fichier viewpoint.bcfv - contient les informations de caméra
      // Format strictement conforme à BCF 2.1 pour Revit
      topicFolder.file(
        "viewpoint.bcfv",
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
  <VisualizationInfo Guid="${viewpointGuid}">
    <PerspectiveCamera>
      <CameraViewPoint>
        <X>${camera.position.x.toFixed(6)}</X>
        <Y>${camera.position.y.toFixed(6)}</Y>
        <Z>${camera.position.z.toFixed(6)}</Z>
      </CameraViewPoint>
      <CameraDirection>
        <X>${camera.direction.x.toFixed(6)}</X>
        <Y>${camera.direction.y.toFixed(6)}</Y>
        <Z>${camera.direction.z.toFixed(6)}</Z>
      </CameraDirection>
      <CameraUpVector>
        <X>${camera.up.x.toFixed(6)}</X>
        <Y>${camera.up.y.toFixed(6)}</Y>
        <Z>${camera.up.z.toFixed(6)}</Z>
      </CameraUpVector>
      <FieldOfView>${todo.viewpoint?.field_of_view || 45.0}</FieldOfView>
    </PerspectiveCamera>
    <Components>
      <ViewSetupHints SpacesVisible="false" SpaceBoundariesVisible="false" OpeningsVisible="false"/>
    </Components>
  </VisualizationInfo>`
      );
  
      // Ajouter la capture d'écran
      if (todo.screenshot) {
        try {
          // Extraire la partie base64 de l'URL data
          let base64Data = todo.screenshot;
          if (base64Data.includes("data:image/png;base64,")) {
            base64Data = base64Data.split("data:image/png;base64,")[1];
          }
  
          if (base64Data && base64Data.trim() !== "") {
            topicFolder.file("snapshot.png", base64Data, { base64: true });
            console.log("Capture d'écran ajoutée pour:", todo.title);
          } else {
            throw new Error("Données d'image invalides");
          }
        } catch (error) {
          console.error("Erreur lors du traitement de l'image:", error);
          // Image de secours en cas d'erreur (pixel transparent 1x1)
          const fallbackPng = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
          topicFolder.file("snapshot.png", fallbackPng, { base64: true });
        }
      } else {
        // Image par défaut si pas de capture
        const defaultPng = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
        topicFolder.file("snapshot.png", defaultPng, { base64: true });
      }
  
      // Ajouter un fichier project.bcfp pour la compatibilité Revit
      topicFolder.file(
        "project.bcfp",
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
  <ProjectExtension>
    <Project ProjectId="${generateUUID()}">
      <Name>BIM Project</Name>
    </Project>
  </ProjectExtension>`
      );
    });
  
    // Générer et télécharger le fichier
    zip.generateAsync({ type: "blob" })
      .then((content) => {
        console.log("Fichier BCF généré avec succès");
        const url = URL.createObjectURL(content);
        const a = document.createElement("a");
        a.href = url;
        a.download = "revit_issues.bcf";
        a.click();
        URL.revokeObjectURL(url);
      })
      .catch((error) => {
        console.error("Erreur lors de la génération du fichier BCF:", error);
      });
  };
  // Fonction pour basculer l'affichage du panneau de todos
  const toggleTodosTool = () => {
    if (activeTool === 'todos') {
      setActiveTool(null)
    } else {
      setActiveTool('todos')
    }
  }

  // Fonction pour ouvrir la modal de création de todo
  const handleCreateNote = () => {
    setIsCreatingTodo(true)
  }

  // Exposer les fonctions et données nécessaires en tant qu'API globale
  useEffect(() => {
    if (window && typeof window !== 'undefined') {
      window.todoManager = {
        createTodo: () => setIsCreatingTodo(true),
        toggleTodoPanel: toggleTodosTool,
        restoreView: restoreTodoView,
        getTodos: () => todos,
        getActiveTool: () => activeTool,
        exportBCF: exportBCF 
      };
    }
    
    return () => {
      if (window && typeof window !== 'undefined') {
        delete window.todoManager;
      }
    };
  }, [todos, activeTool, exportBCF]);

  return (
    <>
      {/* Panneau des Todos */}
      <TodoPanel 
        todos={todos} 
        onTodoSelect={handleTodoSelect} 
        onTodoDelete={handleTodoDelete}
        onTodoStatusChange={handleTodoStatusChange}
        onTodoAssign={handleTodoAssign}
        activeTool={activeTool}
        onCreateNote={handleCreateNote}
        projectMembers={projectMembers}
      />

      {/* Modal de création de Todo */}
      <TodoCreationModal
        isOpen={isCreatingTodo}
        onClose={() => setIsCreatingTodo(false)}
        newTodo={newTodo}
        setNewTodo={setNewTodo}
        onCreateTodo={createTodo}
      />
    </>
  )
}

// Fonctions exportées pour être utilisées par les boutons externes
export const openTodoCreation = () => {
  if (window && window.todoManager) {
    window.todoManager.createTodo();
  }
};

export const toggleTodoPanel = () => {
  if (window && window.todoManager) {
    window.todoManager.toggleTodoPanel();
  }
};

export const restoreTodoView = (todo: Todo) => {
  if (window && window.todoManager) {
    window.todoManager.restoreView(todo);
  }
};

export const getTodosCount = () => {
  if (window && window.todoManager) {
    const todos = window.todoManager.getTodos();
    return todos ? todos.length : 0;
  }
  return 0;
};

export const isActiveTool = () => {
  if (window && window.todoManager) {
    return window.todoManager.getActiveTool() === 'todos';
  }
  return false;
};