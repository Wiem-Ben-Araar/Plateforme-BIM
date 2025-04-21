"use client";

import { useEffect, useRef, useState } from "react";
import { IfcViewerAPI } from "web-ifc-viewer";
import { Button } from "@/components/ui/button";
import { useSearchParams } from "next/navigation";
import { CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import { User2, Trash2, ClipboardList, Plus, Calendar, X, ArrowLeft, AlertTriangle, Loader2, Box, Home } from 'lucide-react';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import PropertySidebar from "@/components/PropertySidebar";
import JSZip from 'jszip';

import {
  Cuboid,
  Scissors,
  Ruler,
  Eye,
  EyeOff,
  MessageSquare, Cloud, ArrowRight, Type,
  RotateCcw,
  Filter,
  Download,
  Sun,
  Paintbrush,
  SplitSquareHorizontal
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import * as THREE from "three";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import ViewCubeComponent from "@/components/ViewCubeComponent";
import CameraControls from 'camera-controls';
import SectionTool from "@/components/SectionTool";
import { MeasurementTool } from "@/components/MeasurementTool";








type ViewStyle = 'shaded' | 'wireframe' | 'hidden-line';
type ViewDirection = 'top' | 'bottom' | 'front' | 'back' | 'left' | 'right' | 'iso';
type Comment = (CloudAnnotation | ArrowAnnotation | TextAnnotation) & { id: string; author: string };
type MeasurementMode = 'none' | 'distance' | 'perpendicular' | 'angle';
interface Measurement {
  id: string;
  type: MeasurementMode; // Ajoutez ce champ
  lines: THREE.Line[];  // Au lieu d'un seul line
  points: THREE.Vector3[];
  distance?: number;
  angle?: number;
  labels: CSS2DObject[];
}
interface BaseAnnotation {
  text: string;
  date: Date;
  viewpoint: {
    position: [number, number, number];
    target: [number, number, number];
    up: [number, number, number];
  };
}
interface CloudAnnotation extends BaseAnnotation {
  type: 'cloud';
  position: THREE.Vector3;
  size: number;
  segments: number;
}

interface Todo {
  _id: string;
  title: string;
  description?: string;
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high';
  createdBy: string;
  userId?: string;
  assignedTo?: string;
  project: string; // ou mongoose.Types.ObjectId
  createdAt: Date;
  updatedAt?: Date;
  screenshot?: string;
  viewpoint?: {
    _id?: string;
    guid?: string;
    camera_view_point?: { x: number; y: number; z: number };
    camera_direction?: { x: number; y: number; z: number };
    camera_up_vector?: { x: number; y: number; z: number };
    field_of_view?: number;
    // Support pour l'ancien format
    position?: { x: number; y: number; z: number };
    target?: { x: number; y: number; z: number };
    up?: { x: number; y: number; z: number };
    fieldOfView?: number;
  };
}
interface ArrowAnnotation extends BaseAnnotation {
  type: 'arrow';
  start: THREE.Vector3;
  end: THREE.Vector3;
  headSize: number;
}
interface TextAnnotation extends BaseAnnotation {
  type: 'text';
  position: THREE.Vector3;
}
interface PlaneData {
  normal: THREE.Vector3;
  initialDistance: number;
}


interface LoadedModel {
  id: number;
  name: string;
  visible: boolean;
  bbox?: THREE.Box3;
}




const TodoPanel = ({
  todos,
  onTodoSelect,
  onTodoDelete,
  onTodoStatusChange,
  onTodoAssign,
  activeTool
}: {
  todos: Todo[];
  onTodoSelect: (todo: Todo) => void;
  onTodoDelete: (id: string) => void;
  onTodoStatusChange: (id: string, status: Todo['status']) => void;
  onTodoAssign: (id: string, userId: string) => void;
  activeTool: string;
}) => {
  if (activeTool !== 'todos') return null;

  return (
    <div className="absolute right-4 top-20 w-96 bg-white rounded-lg shadow-lg p-4 max-h-[80vh] overflow-auto">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Todos</h3>
        <Badge variant="outline">{todos.length}</Badge>
      </div>

      <div className="space-y-3">
        {todos.map((todo) => (
          <div
            key={todo.id}
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
                  todo.status === 'open' ? 'bg-red-100 text-red-800' :
                    todo.status === 'in-progress' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                }
              >
                {todo.status}
              </Badge>
            </div>

            <div className="flex items-center justify-between text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <User2 className="h-4 w-4" />
                <Select
                  value={todo.assignedTo || ''}
                  onValueChange={(value) => onTodoAssign(todo.id, value)}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Assign to..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="user1">John Doe</SelectItem>
                      <SelectItem value="user2">Jane Smith</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Select
                  value={todo.status}
                  onValueChange={(value: Todo['status']) => onTodoStatusChange(todo.id, value)}
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onTodoDelete(todo.id);
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
  );
};


export default function ViewerPage() {
  ///////////details property
  const [selectedElement, setSelectedElement] = useState<number | null>(null);
  const [selectedModelID, setSelectedModelID] = useState<number | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
    ///////////details property
  const [activeTool, setActiveTool] = useState<'select' | null>(null);
  const [currentSection, setCurrentSection] = useState<'none' | 'x' | 'y' | 'z'>('none');
  const [activeStyle, setActiveStyle] = useState<ViewStyle | null>(null);
  const [loadedModels, setLoadedModels] = useState<LoadedModel[]>([]);
  const [sectionOffset, setSectionOffset] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<IfcViewerAPI | null>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const [measurementMode, setMeasurementMode] = useState<MeasurementMode>('none');
  const [measurements, setMeasurements] = useState<Measurement[]>([]);

  const [currentPoints, setCurrentPoints] = useState<THREE.Vector3[]>([]);
 
  const target = new THREE.Vector3();
  const [currentPlane, setCurrentPlane] = useState<PlaneData | null>(null);
  const [isIsolationActive, setIsIsolationActive] = useState(false);

  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState<string>('');
  const [commentPosition, setCommentPosition] = useState<THREE.Vector3 | null>(null);
  const [selectedAnnotationType, setSelectedAnnotationType] = useState<'cloud' | 'arrow' | 'text'>('cloud');
  const [clashResults, setClashResults] = useState([]);
  const [isClashDetectionRunning, setIsClashDetectionRunning] = useState(false);
  const [camera, setCamera] = useState<THREE.Camera | null>(null);
  const [controls, setControls] = useState<any>(null);
  const initializedRef = useRef(false);
  const [currentProject, setCurrentProject] = useState(null);
  const [cameraPosition, setCameraPosition] = useState<THREE.Vector3 | null>(null);
  const [cameraTarget, setCameraTarget] = useState<THREE.Vector3 | null>(null);
  const [cameraUp, setCameraUp] = useState<THREE.Vector3 | null>(null);
  const [todos, setTodos] = useState<Todo[]>([]);
  const { data: session, status } = useSession();
  const [isCreatingTodo, setIsCreatingTodo] = useState(false);
  const router = useRouter();
  const [newTodo, setNewTodo] = useState({
    title: '',
    description: '',
    priority: 'medium' as const,
  });
// Types IFC courants pour la détection de clash
const IFC_TYPES = {
  IFCWALLSTANDARDCASE: 4,
  IFCWALL: 5,
  IFCSLAB: 6, 
  IFCBEAM: 7,
  IFCCOLUMN: 8,
  IFCWINDOW: 15,
  IFCDOOR: 16,
  IFCPLATE: 20,
  IFCMEMBER: 23,
  IFCCOVERING: 29,
  IFCFURNISHINGELEMENT: 38,
};
const logAvailableTypesInModel = async (modelID) => {
  if (!viewerRef.current) return;
  
  try {
    const ifcManager = viewerRef.current.IFC.loader.ifcManager;
    console.log("Analyse des types disponibles dans le modèle", modelID);
    
    // Essayer de récupérer tous les types possibles
    const allTypeIds = [];
    // Tester un intervalle plus large de types IFC (1-100)
    for (let typeId = 1; typeId <= 100; typeId++) {
      try {
        const ids = await ifcManager.getAllItemsOfType(modelID, typeId, false);
        if (ids && ids.length > 0) {
          allTypeIds.push({ typeId, count: ids.length });
          console.log(`Type ${typeId}: ${ids.length} éléments trouvés`);
        }
      } catch (e) {
        // Ignorer les types non disponibles
      }
    }
    
    console.log("Types disponibles dans le modèle:", allTypeIds);
    return allTypeIds;
  } catch (error) {
    console.error("Erreur lors de l'analyse des types:", error);
    return [];
  }
};
// Fonction principale de détection de clash entre types spécifiques avec tolérance
const detectClashesBetweenTypes = async (typeId1, typeId2, tolerance = 0) => {
  if (!viewerRef.current || isClashDetectionRunning) return;
  
  setIsClashDetectionRunning(true);
  setClashResults([]);
  
  try {
    console.log(`Début de la détection de clash entre les types ${typeId1} et ${typeId2} avec tolérance ${tolerance}m`);
    console.log("Modèles chargés:", loadedModels);
    
    const viewer = viewerRef.current;
    const ifcManager = viewer.IFC.loader.ifcManager;
    
    const clashes = [];
    
    // Récupérer les modèles visibles
    const visibleModels = loadedModels.filter(model => model.visible);
    
    if (visibleModels.length === 0) {
      console.error("Aucun modèle visible trouvé");
      setIsClashDetectionRunning(false);
      return;
    }
    
    // Récupérer tous les éléments pour les deux types spécifiés
    let elements1 = [];
    let elements2 = [];
    
    for (const model of visibleModels) {
      const modelID = model.id;
      console.log(`Traitement du modèle ${modelID} pour les types ${typeId1} et ${typeId2}`);
      
      try {
        // Récupérer les éléments du premier type
        const ids1 = await ifcManager.getAllItemsOfType(modelID, typeId1, false);
        console.log(`Modèle ${modelID}, Type ${typeId1}: ${ids1.length} éléments trouvés`);
        
        elements1 = [
          ...elements1,
          ...ids1.map(id => ({ modelID, id, type: typeId1 }))
        ];
        
        // Récupérer les éléments du deuxième type
        const ids2 = await ifcManager.getAllItemsOfType(modelID, typeId2, false);
        console.log(`Modèle ${modelID}, Type ${typeId2}: ${ids2.length} éléments trouvés`);
        
        elements2 = [
          ...elements2,
          ...ids2.map(id => ({ modelID, id, type: typeId2 }))
        ];
      } catch (e) {
        console.error(`Erreur lors de la récupération des éléments des types ${typeId1} ou ${typeId2}:`, e);
      }
    }
    
    console.log(`Total: ${elements1.length} éléments de type ${typeId1}, ${elements2.length} éléments de type ${typeId2}`);
    
    // Vérifier s'il y a suffisamment d'éléments pour la détection
    if (elements1.length === 0 || elements2.length === 0) {
      console.log("Pas assez d'éléments pour la détection de clash");
      setIsClashDetectionRunning(false);
      return;
    }
    
    // Limiter à 100 éléments de chaque côté pour des raisons de performance
    if (elements1.length > 100) {
      console.log(`Limitation à 100 éléments de type ${typeId1} pour des raisons de performance`);
      elements1 = elements1.slice(0, 100);
    }
    
    if (elements2.length > 100) {
      console.log(`Limitation à 100 éléments de type ${typeId2} pour des raisons de performance`);
      elements2 = elements2.slice(0, 100);
    }
    
    // Comparer chaque élément du premier type avec chaque élément du deuxième type
    console.log("Début de la comparaison des éléments...");
    let comparisonCount = 0;
    
    // Convertir la tolérance en nombre
    const toleranceValue = parseFloat(tolerance);
    
    for (const elem1 of elements1) {
      const box1 = await getElementBoundingBox(elem1.modelID, elem1.id);
      if (!box1) continue;
      
      // Si une tolérance est définie, élargir la bounding box du premier élément
      if (toleranceValue > 0) {
        // Créer une copie pour ne pas modifier l'original
        const extendedBox1 = box1.clone();
        // Étendre la bounding box dans toutes les directions selon la tolérance
        extendedBox1.min.subScalar(toleranceValue);
        extendedBox1.max.addScalar(toleranceValue);
        
        for (const elem2 of elements2) {
          comparisonCount++;
          if (comparisonCount % 100 === 0) {
            console.log(`${comparisonCount} comparaisons effectuées...`);
          }
          
          // Éviter de comparer un élément avec lui-même
          if (elem1.id === elem2.id && elem1.modelID === elem2.modelID) continue;
          
          const box2 = await getElementBoundingBox(elem2.modelID, elem2.id);
          if (!box2) continue;
          
          // Vérifier l'intersection avec la bounding box étendue
          if (extendedBox1.intersectsBox(box2)) {
            console.log(`Clash détecté entre l'élément ${elem1.id} (${elem1.type}) et l'élément ${elem2.id} (${elem2.type}) avec tolérance ${toleranceValue}m`);
            
            try {
              // Récupérer des informations sur les éléments pour l'affichage
              const props1 = await viewer.IFC.getProperties(elem1.modelID, elem1.id, true);
              const props2 = await viewer.IFC.getProperties(elem2.modelID, elem2.id, true);
              
              // Calculer la distance minimale entre les deux bounding boxes
              const distance = calculateMinimumDistance(box1, box2);
              
              // Stocker les informations sur le clash
              clashes.push({
                id: `clash-${clashes.length}`,
                element1: {
                  id: elem1.id,
                  modelID: elem1.modelID,
                  type: elem1.type,
                  name: props1?.Name?.value || `Element-${elem1.id}`,
                },
                element2: {
                  id: elem2.id,
                  modelID: elem2.modelID,
                  type: elem2.type,
                  name: props2?.Name?.value || `Element-${elem2.id}`,
                },
                boundingBox1: box1,
                boundingBox2: box2,
                distance: distance,
                extendedBox: extendedBox1,
              });
            } catch (error) {
              console.error(`Erreur lors de la récupération des propriétés:`, error);
            }
          }
        }
      } else {
        // Détection sans tolérance (comme avant)
        for (const elem2 of elements2) {
          comparisonCount++;
          if (comparisonCount % 100 === 0) {
            console.log(`${comparisonCount} comparaisons effectuées...`);
          }
          
          // Éviter de comparer un élément avec lui-même
          if (elem1.id === elem2.id && elem1.modelID === elem2.modelID) continue;
          
          const box2 = await getElementBoundingBox(elem2.modelID, elem2.id);
          if (!box2) continue;
          
          // Vérifier l'intersection
          if (box1.intersectsBox(box2)) {
            console.log(`Clash détecté entre l'élément ${elem1.id} (${elem1.type}) et l'élément ${elem2.id} (${elem2.type})`);
            
            try {
              // Récupérer des informations sur les éléments pour l'affichage
              const props1 = await viewer.IFC.getProperties(elem1.modelID, elem1.id, true);
              const props2 = await viewer.IFC.getProperties(elem2.modelID, elem2.id, true);
              
              // Stocker les informations sur le clash
              clashes.push({
                id: `clash-${clashes.length}`,
                element1: {
                  id: elem1.id,
                  modelID: elem1.modelID,
                  type: elem1.type,
                  name: props1?.Name?.value || `Element-${elem1.id}`,
                },
                element2: {
                  id: elem2.id,
                  modelID: elem2.modelID,
                  type: elem2.type,
                  name: props2?.Name?.value || `Element-${elem2.id}`,
                },
                boundingBox1: box1,
                boundingBox2: box2,
                distance: 0, // Distance nulle pour un clash direct
              });
            } catch (error) {
              console.error(`Erreur lors de la récupération des propriétés:`, error);
            }
          }
        }
      }
    }
    
    console.log(`Total des clashs détectés: ${clashes.length}`);
    
    // Mettre à jour les résultats
    setClashResults(clashes);
    
    // Visualiser les clashs
    if (clashes.length > 0) {
      visualizeClashes(clashes);
    } else {
      console.log("Aucun clash détecté");
    }
    
  } catch (error) {
    console.error("Erreur lors de la détection de clash:", error);
  } finally {
    setIsClashDetectionRunning(false);
  }
};

// Fonction pour calculer la distance minimale entre deux bounding boxes
const calculateMinimumDistance = (box1, box2) => {
  // Calcul de la distance minimale entre deux bounding boxes
  const dx = Math.max(
    box1.min.x - box2.max.x,
    box2.min.x - box1.max.x,
    0
  );
  const dy = Math.max(
    box1.min.y - box2.max.y,
    box2.min.y - box1.max.y,
    0
  );
  const dz = Math.max(
    box1.min.z - box2.max.z,
    box2.min.z - box1.max.z,
    0
  );
  
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
};
const focusOnClash = (clash) => {
  if (!viewerRef.current || !clash) return;
  
  const viewer = viewerRef.current;
  
  // Centre du clash (où les bounding boxes se chevauchent)
  const intersectionBox = clash.boundingBox1.clone().intersect(clash.boundingBox2);
  const center = new THREE.Vector3();
  intersectionBox.getCenter(center);
  
  // Calculer la taille de la boîte pour déterminer la distance de la caméra
  const size = new THREE.Vector3();
  intersectionBox.getSize(size);
  const maxDim = Math.max(size.x, size.y, size.z);
  
  // Positionner la caméra pour voir le clash
  const camera = viewer.context.getCamera();
  const cameraPosition = center.clone().add(new THREE.Vector3(maxDim * 2, maxDim * 2, maxDim * 2));
  
  // Animer le déplacement de la caméra
  const cameraControls = viewer.context.ifcCamera.cameraControls;
  cameraControls.setLookAt(
    cameraPosition.x, cameraPosition.y, cameraPosition.z,
    center.x, center.y, center.z,
    true // Activer l'animation
  );
  
  // Optionnel: Mettre en évidence les éléments en clash
  highlightClashElements(clash);
};

// Fonction pour visualiser les clashs avec information de tolérance
const visualizeClashes = (clashes) => {
  if (!viewerRef.current) return;
  
  // Nettoyer les visualisations précédentes
  clearClashResults();
  
  const viewer = viewerRef.current;
  const scene = viewer.context.getScene();
  
  // Créer un groupe pour stocker toutes les visualisations de clash
  const clashGroup = new THREE.Group();
  clashGroup.name = "clashVisualizationGroup";
  
  // Pour chaque clash, créer une visualisation
  clashes.forEach(clash => {
    // Déterminer le centre du clash
    let center;
    if (clash.distance === 0) {
      // Pour les clashs directs, utiliser le centre de l'intersection
      const intersectionBox = clash.boundingBox1.clone().intersect(clash.boundingBox2);
      center = new THREE.Vector3();
      intersectionBox.getCenter(center);
    } else {
      // Pour les clashs avec tolérance, calculer un point entre les deux boxes
      center = calculatePointBetweenBoxes(clash.boundingBox1, clash.boundingBox2);
    }
    
    // Créer une sphère pour représenter le clash
    const geometry = new THREE.SphereGeometry(0.2, 16, 16);
    // Couleur différente selon le type de clash (direct ou avec tolérance)
    const color = clash.distance === 0 ? 0xFF0000 : 0xFFA500;
    const material = new THREE.MeshBasicMaterial({ color, opacity: 0.7, transparent: true });
    const sphere = new THREE.Mesh(geometry, material);
    sphere.position.copy(center);
    sphere.userData = { 
      isClashVisualization: true,
      clashData: clash
    };
    
    clashGroup.add(sphere);
    
    // Bounding box pour les éléments en clash
    const box1Helper = new THREE.Box3Helper(clash.boundingBox1, new THREE.Color(0x00FF00));
    const box2Helper = new THREE.Box3Helper(clash.boundingBox2, new THREE.Color(0x0000FF));
    box1Helper.userData = { isClashVisualization: true };
    box2Helper.userData = { isClashVisualization: true };
    
    clashGroup.add(box1Helper);
    clashGroup.add(box2Helper);
    
    // Ajouter la visualisation de la tolérance si applicable
    if (clash.extendedBox) {
      const toleranceHelper = new THREE.Box3Helper(clash.extendedBox, new THREE.Color(0xFFA500));
      toleranceHelper.userData = { isClashVisualization: true };
      toleranceHelper.material.opacity = 0.3;
      toleranceHelper.material.transparent = true;
      clashGroup.add(toleranceHelper);
    }
  });
  
  // Ajouter le groupe à la scène
  scene.add(clashGroup);
  
  // Forcer le rendu pour afficher les changements
  viewer.context.getRenderer().render(scene, viewer.context.getCamera());
};

// Fonction pour calculer un point entre deux bounding boxes
const calculatePointBetweenBoxes = (box1, box2) => {
  // Calculer les centres des deux boîtes
  const center1 = new THREE.Vector3();
  const center2 = new THREE.Vector3();
  
  box1.getCenter(center1);
  box2.getCenter(center2);
  
  // Retourner un point au milieu
  return new THREE.Vector3(
    (center1.x + center2.x) / 2,
    (center1.y + center2.y) / 2,
    (center1.z + center2.z) / 2
  );
};

// Interface utilisateur pour sélectionner les types à comparer avec tolérance
const ClashTypeSelector = ({ onStartClashDetection }) => {
  const [type1, setType1] = useState(IFC_TYPES.IFCWALL);
  const [type2, setType2] = useState(IFC_TYPES.IFCWINDOW);
  const [tolerance, setTolerance] = useState("0.0");
  const [availableTypes, setAvailableTypes] = useState([]);
  
  // Analyser les types disponibles dans les modèles chargés
  const analyzeAvailableTypes = async () => {
    const availableTypesData = [];
    
    // Récupérer les modèles visibles
    const visibleModels = loadedModels.filter(model => model.visible);
    
    for (const model of visibleModels) {
      const modelTypes = await logAvailableTypesInModel(model.id);
      if (modelTypes && modelTypes.length > 0) {
        availableTypesData.push(...modelTypes);
      }
    }
    
    // Convertir les types numériques en noms lisibles et ne garder que les uniques
    const typeMap = new Map();
    for (const typeData of availableTypesData) {
      // Trouver le nom du type à partir de l'ID
      const typeName = Object.keys(IFC_TYPES).find(
        key => IFC_TYPES[key] === typeData.typeId
      ) || `Type ${typeData.typeId}`;
      
      typeMap.set(typeData.typeId, {
        id: typeData.typeId,
        name: typeName,
        count: typeData.count
      });
    }
    
    setAvailableTypes(Array.from(typeMap.values()));
  };
  
  // Fonction pour gérer le changement de tolérance
  const handleToleranceChange = (e) => {
    // Limiter à 2 décimales et valeurs positives
    const value = e.target.value;
    if (value === "" || value === "0" || value === "0.") {
      setTolerance(value);
    } else {
      const numValue = parseFloat(value);
      if (!isNaN(numValue) && numValue >= 0) {
        setTolerance(value);
      }
    }
  };
  
  // Charger les types disponibles au montage du composant
  useEffect(() => {
    analyzeAvailableTypes();
  }, [loadedModels]);
  const handleMeasurementComplete = (measurement: Measurement) => {
    setMeasurements(prev => [...prev, measurement]);
  };



  return (
    <div className="p-4 bg-white">
      <h3 className="text-lg font-semibold mb-3">Détection de clash</h3>
      
      <div className="mb-4">
        <div className="grid grid-cols-2 gap-4 mb-3">
          <div>
            <label className="block text-sm font-medium mb-1">Type 1:</label>
            <select 
              className="w-full p-2 border rounded"
              value={type1}
              onChange={(e) => setType1(parseInt(e.target.value))}
            >
              {availableTypes.map(type => (
                <option key={`type1-${type.id}`} value={type.id}>
                  {type.name} ({type.count})
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Type 2:</label>
            <select 
              className="w-full p-2 border rounded"
              value={type2}
              onChange={(e) => setType2(parseInt(e.target.value))}
            >
              {availableTypes.map(type => (
                <option key={`type2-${type.id}`} value={type.id}>
                  {type.name} ({type.count})
                </option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="mb-3">
          <label className="block text-sm font-medium mb-1">
            Tolérance (m):
            <span className="text-xs text-gray-500 ml-1">
              (0 = collision directe uniquement)
            </span>
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            className="w-full p-2 border rounded"
            value={tolerance}
            onChange={handleToleranceChange}
            placeholder="Ex: 0.05 pour 5cm"
          />
        </div>
      </div>
      
      <div className="flex justify-between">
        <button 
          className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
          onClick={() => analyzeAvailableTypes()}
        >
          Rafraîchir les types
        </button>
        
        <button 
          className="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600"
          onClick={() => onStartClashDetection(type1, type2, tolerance)}
          disabled={isClashDetectionRunning}
        >
          {isClashDetectionRunning ? "Détection en cours..." : "Détecter les clashs"}
        </button>
      </div>
    </div>
  );
};
const getElementTypeName = (typeId) => {
  return Object.keys(IFC_TYPES).find(key => IFC_TYPES[key] === typeId) || `Type ${typeId}`;
};
const GlobalClashDetectionPanel = () => {
  const [tolerance, setTolerance] = useState("0.0");
  const [progress, setProgress] = useState(0);
  
  // Fonction pour gérer le changement de tolérance
  const handleToleranceChange = (e) => {
    // Limiter à 2 décimales et valeurs positives
    const value = e.target.value;
    if (value === "" || value === "0" || value === "0.") {
      setTolerance(value);
    } else {
      const numValue = parseFloat(value);
      if (!isNaN(numValue) && numValue >= 0) {
        setTolerance(value);
      }
    }
  };
  
  return (
    <div className="p-4 bg-white">
      <h3 className="text-lg font-semibold mb-3">Détection de clash globale</h3>
      
      <div className="mb-4">
        <div className="mb-3">
          <label className="block text-sm font-medium mb-1">
            Tolérance (m):
            <span className="text-xs text-gray-500 ml-1">
              (0 = collision directe uniquement)
            </span>
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            className="w-full p-2 border rounded"
            value={tolerance}
            onChange={handleToleranceChange}
            placeholder="Ex: 0.05 pour 5cm"
          />
        </div>
      </div>
      
      {isClashDetectionRunning && (
        <div className="mb-3">
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div 
              className="bg-blue-600 h-2.5 rounded-full" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="text-sm text-center mt-1">Analyse en cours... {progress}%</p>
        </div>
      )}
      
      <div className="flex justify-between">
        <button 
          className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600"
          onClick={() => clearClashResults()}
          disabled={isClashDetectionRunning}
        >
          Effacer les résultats
        </button>
        
        <button 
          className="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600"
          onClick={() => detectAllClashes(tolerance)}
          disabled={isClashDetectionRunning}
        >
          {isClashDetectionRunning ? "Détection en cours..." : "Détecter tous les clashs"}
        </button>
      </div>
    </div>
  );
};
const EnhancedClashDetectionPanel = ({ clashes, onClashSelect }) => {
  const [filterType1, setFilterType1] = useState("");
  const [filterType2, setFilterType2] = useState("");
  const [sortBy, setSortBy] = useState("id"); // "id", "distance", "type"
  
  // Générer la liste des types uniques présents dans les clashs
  const uniqueTypes = useMemo(() => {
    const types = new Set();
    
    clashes.forEach(clash => {
      types.add(clash.element1.typeName || getElementTypeName(clash.element1.type));
      types.add(clash.element2.typeName || getElementTypeName(clash.element2.type));
    });
    
    return ["", ...Array.from(types).sort()];
  }, [clashes]);
  
  // Filtrer et trier les clashs
  const filteredClashes = useMemo(() => {
    return clashes
      .filter(clash => {
        const type1 = clash.element1.typeName || getElementTypeName(clash.element1.type);
        const type2 = clash.element2.typeName || getElementTypeName(clash.element2.type);
        
        return (
          (filterType1 === "" || type1 === filterType1 || type2 === filterType1) &&
          (filterType2 === "" || type1 === filterType2 || type2 === filterType2)
        );
      })
      .sort((a, b) => {
        if (sortBy === "distance") {
          return a.distance - b.distance;
        } else if (sortBy === "type") {
          const typeA1 = a.element1.typeName || getElementTypeName(a.element1.type);
          const typeB1 = b.element1.typeName || getElementTypeName(b.element1.type);
          return typeA1.localeCompare(typeB1);
        } else {
          // Par défaut: trier par ID
          const idA = parseInt(a.id.split('-')[1]);
          const idB = parseInt(b.id.split('-')[1]);
          return idA - idB;
        }
      });
  }, [clashes, filterType1, filterType2, sortBy]);
  
  if (clashes.length === 0) {
    return <div className="p-4">Aucun clash détecté</div>;
  }
  
  return (
    <div className="p-4 max-h-96 overflow-y-auto">
      <h3 className="text-lg font-semibold mb-2">
        Clashs détectés: {filteredClashes.length}/{clashes.length}
      </h3>
      
      <div className="mb-3 grid grid-cols-3 gap-2">
        <div>
          <label className="block text-xs font-medium mb-1">Filtrer par type:</label>
          <select 
            className="w-full p-1 text-sm border rounded"
            value={filterType1}
            onChange={(e) => setFilterType1(e.target.value)}
          >
            {uniqueTypes.map(type => (
              <option key={`filter1-${type}`} value={type}>
                {type === "" ? "Tous les types" : type}
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-xs font-medium mb-1">Et/ou type:</label>
          <select 
            className="w-full p-1 text-sm border rounded"
            value={filterType2}
            onChange={(e) => setFilterType2(e.target.value)}
          >
            {uniqueTypes.map(type => (
              <option key={`filter2-${type}`} value={type}>
                {type === "" ? "Tous les types" : type}
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-xs font-medium mb-1">Trier par:</label>
          <select 
            className="w-full p-1 text-sm border rounded"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="id">Numéro</option>
            <option value="distance">Distance</option>
            <option value="type">Type</option>
          </select>
        </div>
      </div>
      
      <div className="space-y-2">
        {filteredClashes.map((clash) => (
          <div 
            key={clash.id}
            className={`p-2 ${clash.distance === 0 ? 'bg-red-50 border-red-200' : 'bg-orange-50 border-orange-200'} border rounded cursor-pointer hover:bg-gray-100`}
            onClick={() => onClashSelect(clash)}
          >
            <div className="flex justify-between">
              <p className="font-medium">Clash #{clash.id.split('-')[1]}</p>
              {clash.distance > 0 && (
                <p className="text-xs text-orange-700">
                  Distance: {clash.distance.toFixed(3)}m
                </p>
              )}
            </div>
            <p className="text-sm">
              {clash.element1.name} ({clash.element1.typeName || getElementTypeName(clash.element1.type)})
            </p>
            <p className="text-sm">
              {clash.element2.name} ({clash.element2.typeName || getElementTypeName(clash.element2.type)})
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};
const detectAllClashes = async (tolerance = 0) => {
  if (!viewerRef.current || isClashDetectionRunning) return;
  
  setIsClashDetectionRunning(true);
  setClashResults([]);
  
  try {
    console.log(`Début de la détection de clash globale avec tolérance ${tolerance}m`);
    
    const viewer = viewerRef.current;
    const ifcManager = viewer.IFC.loader.ifcManager;
    
    const clashes = [];
    
    // Récupérer les modèles visibles
    const visibleModels = loadedModels.filter(model => model.visible);
    
    if (visibleModels.length === 0) {
      console.error("Aucun modèle visible trouvé");
      setIsClashDetectionRunning(false);
      return;
    }
    
    // Collecter tous les éléments de tous les types dans tous les modèles visibles
    let allElements = [];
    
    for (const model of visibleModels) {
      const modelID = model.id;
      console.log(`Collecte des éléments pour le modèle ${modelID}`);
      
      try {
        // Pour tous les types IFC pertinents
        for (const [typeName, typeId] of Object.entries(IFC_TYPES)) {
          try {
            const ids = await ifcManager.getAllItemsOfType(modelID, typeId, false);
            if (ids && ids.length > 0) {
              console.log(`Modèle ${modelID}, Type ${typeName} (${typeId}): ${ids.length} éléments trouvés`);
              
              // Ajouter les éléments trouvés
              allElements = [
                ...allElements,
                ...ids.map(id => ({ modelID, id, type: typeId, typeName }))
              ];
            }
          } catch (e) {
            // Ignorer si le type n'est pas disponible dans ce modèle
          }
        }
      } catch (error) {
        console.error(`Erreur lors de la récupération des éléments du modèle ${modelID}:`, error);
      }
    }
    
    // Limiter le nombre d'éléments si nécessaire pour des raisons de performance
    const MAX_ELEMENTS = 500;
    if (allElements.length > MAX_ELEMENTS) {
      console.log(`Limitation à ${MAX_ELEMENTS} éléments pour des raisons de performance`);
      allElements = allElements.slice(0, MAX_ELEMENTS);
    }
    
    console.log(`Total: ${allElements.length} éléments collectés pour la détection de clash`);
    
    // Convertir la tolérance en nombre
    const toleranceValue = parseFloat(tolerance);
    
    // Récupérer toutes les bounding boxes en avance pour améliorer les performances
    console.log("Récupération des bounding boxes...");
    const boundingBoxes = new Map();
    
    for (const elem of allElements) {
      const box = await getElementBoundingBox(elem.modelID, elem.id);
      if (box) {
        boundingBoxes.set(`${elem.modelID}-${elem.id}`, box);
      }
    }
    
    console.log(`${boundingBoxes.size} bounding boxes récupérées`);
    
    // Comparer chaque élément avec tous les autres
    console.log("Début de la détection des clashs...");
    let comparisonCount = 0;
    const totalComparisons = (allElements.length * (allElements.length - 1)) / 2;
    const updateInterval = Math.max(Math.floor(totalComparisons / 20), 1000); // Mettre à jour tous les 5% ou 1000 comparaisons
    
    // Set pour éviter les duplications de clash
    const clashSet = new Set();
    
    for (let i = 0; i < allElements.length; i++) {
      const elem1 = allElements[i];
      const key1 = `${elem1.modelID}-${elem1.id}`;
      const box1 = boundingBoxes.get(key1);
      
      if (!box1) continue;
      
      // Créer une bounding box étendue si une tolérance est définie
      const extendedBox1 = toleranceValue > 0 ? box1.clone() : null;
      if (extendedBox1) {
        extendedBox1.min.subScalar(toleranceValue);
        extendedBox1.max.addScalar(toleranceValue);
      }
      
      for (let j = i + 1; j < allElements.length; j++) {
        const elem2 = allElements[j];
        comparisonCount++;
        
        // Afficher la progression
        if (comparisonCount % updateInterval === 0) {
          const progressPercent = (comparisonCount / totalComparisons * 100).toFixed(1);
          console.log(`Progression: ${progressPercent}% (${comparisonCount}/${totalComparisons})`);
        }
        
        // Éviter de comparer les éléments du même type (optionnel, peut être changé)
        if (elem1.type === elem2.type) continue;
        
        const key2 = `${elem2.modelID}-${elem2.id}`;
        const box2 = boundingBoxes.get(key2);
        
        if (!box2) continue;
        
        // Vérifier l'intersection
        let isClash = false;
        let distance = 0;
        
        if (toleranceValue > 0) {
          // Avec tolérance
          if (extendedBox1.intersectsBox(box2)) {
            distance = calculateMinimumDistance(box1, box2);
            isClash = distance <= toleranceValue;
          }
        } else {
          // Sans tolérance (collision directe uniquement)
          isClash = box1.intersectsBox(box2);
        }
        
        if (isClash) {
          // Créer une clé unique pour chaque paire d'éléments pour éviter les doublons
          const clashKey = [key1, key2].sort().join('_');
          
          if (!clashSet.has(clashKey)) {
            clashSet.add(clashKey);
            
            console.log(`Clash détecté entre ${elem1.typeName}(${elem1.id}) et ${elem2.typeName}(${elem2.id}), distance: ${distance}m`);
            
            try {
              // Récupérer des informations sur les éléments pour l'affichage
              const props1 = await viewer.IFC.getProperties(elem1.modelID, elem1.id, true);
              const props2 = await viewer.IFC.getProperties(elem2.modelID, elem2.id, true);
              
              // Stocker les informations sur le clash
              clashes.push({
                id: `clash-${clashes.length}`,
                element1: {
                  id: elem1.id,
                  modelID: elem1.modelID,
                  type: elem1.type,
                  typeName: elem1.typeName,
                  name: props1?.Name?.value || `Element-${elem1.id}`,
                },
                element2: {
                  id: elem2.id,
                  modelID: elem2.modelID,
                  type: elem2.type,
                  typeName: elem2.typeName,
                  name: props2?.Name?.value || `Element-${elem2.id}`,
                },
                boundingBox1: box1,
                boundingBox2: box2,
                distance: distance,
                extendedBox: extendedBox1,
              });
            } catch (error) {
              console.error(`Erreur lors de la récupération des propriétés:`, error);
            }
          }
        }
      }
    }
    
    console.log(`Total des clashs détectés: ${clashes.length}`);
    
    // Mettre à jour les résultats
    setClashResults(clashes);
    
    // Visualiser les clashs
    if (clashes.length > 0) {
      visualizeClashes(clashes);
    } else {
      console.log("Aucun clash détecté");
    }
    
  } catch (error) {
    console.error("Erreur lors de la détection de clash:", error);
  } finally {
    setIsClashDetectionRunning(false);
  }
};
// Affichage des résultats de clash avec distance
const ClashDetectionPanel = ({ clashes, onClashSelect }) => {
  if (clashes.length === 0) {
    return <div className="p-4">Aucun clash détecté</div>;
  }
  
  return (
    <div className="p-4 max-h-96 overflow-y-auto">
      <h3 className="text-lg font-semibold mb-2">Clashs détectés: {clashes.length}</h3>
      <div className="space-y-2">
        {clashes.map((clash) => (
          <div 
            key={clash.id}
            className={`p-2 ${clash.distance === 0 ? 'bg-red-50 border-red-200' : 'bg-orange-50 border-orange-200'} border rounded cursor-pointer hover:bg-gray-100`}
            onClick={() => onClashSelect(clash)}
          >
            <p className="font-medium">Clash #{clash.id.split('-')[1]}</p>
            <p className="text-sm">
              {clash.element1.name} ({getElementTypeName(clash.element1.type)})
            </p>
            <p className="text-sm">
              {clash.element2.name} ({getElementTypeName(clash.element2.type)})
            </p>
            {clash.distance > 0 && (
              <p className="text-xs text-orange-700 mt-1">
                Distance: {clash.distance.toFixed(3)}m
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};


  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      console.log("Utilisateur authentifié:", session.user);
    } else if (status === "unauthenticated") {
      console.log("Utilisateur non authentifié");
      // Redirection vers la page de connexion si nécessaire
      // router.push('/login');
    }
  }, [status, session]);
  
  const createTodo = async () => {
    if (!viewerRef.current || !newTodo.title) return
  
    try {
      // Récupérer la caméra et les contrôles de la vue
      const camera = viewerRef.current.context.getCamera()
      const controls = viewerRef.current.context.ifcCamera.cameraControls
  
      // Calculer le point cible à partir des contrôles de caméra
      const target = new THREE.Vector3()
      controls.getTarget(target)
  
      const currentUser = session?.user;
      console.log("Current user from session:", currentUser);
      
      if (!currentUser || !currentUser.id) {
        console.error("Utilisateur non connecté ou ID utilisateur manquant");
        toast?.error("Vous devez être connecté pour créer un todo");
        return;
      }
  
      const urlParams = new URLSearchParams(window.location.search);
      const projectId = urlParams.get('projectId');
  
      if (!projectId) {
        console.error("Project ID is missing");
        toast?.error("Project ID is required. Please open a project first.");
        return;
      }
  
      const fieldOfView = camera.fov || 45;
  
      const direction = {
        x: target.x - camera.position.x,
        y: target.y - camera.position.y,
        z: target.z - camera.position.z
      };
      
      // Normaliser la direction pour une visualisation précise
      const dirLength = Math.sqrt(
        direction.x * direction.x +
        direction.y * direction.y +
        direction.z * direction.z
      );
      
      if (dirLength > 0) {
        direction.x /= dirLength;
        direction.y /= dirLength;
        direction.z /= dirLength;
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
      };
  
      // Capturer une image de la vue actuelle
      const renderer = viewerRef.current.context.getRenderer()
      renderer.render(viewerRef.current.context.getScene(), camera)
      const screenshot = renderer.domElement.toDataURL()
  
      // Créer directement le todo avec l'objet viewpoint intégré
      // Votre API /api/todos gère déjà la création du viewpoint
      const todoData = {
        title: newTodo.title,
        description: newTodo.description,
        status: "open",
        priority: newTodo.priority,
        createdBy: currentUser?.name || currentUser?.email || "Unknown User",
        userId: currentUser.id,
        project: projectId,
        createdAt: new Date(),
        viewpoint: viewpoint, // Passez l'objet viewpoint complet
        screenshot: screenshot
      };
  
      console.log("Todo à envoyer:", todoData);
  
      const response = await fetch("/api/todos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(todoData),
      });
  
      // Vérifier le type de contenu avant de parser en JSON
      const contentType = response.headers.get("content-type");
      
      if (!response.ok) {
        let errorMessage = `Error: ${response.status}`;
        try {
          if (contentType && contentType.includes("application/json")) {
            const errorData = await response.json();
            errorMessage += ` - ${errorData.error || "Unknown error"}`;
          } else {
            const errorText = await response.text();
            console.error("Réponse non-JSON reçue:", errorText.substring(0, 200));
            errorMessage += " - Non-JSON response received";
          }
        } catch (e) {
          console.error("Erreur lors de la lecture de la réponse:", e);
        }
        throw new Error(errorMessage);
      }
  
      // S'assurer que la réponse est JSON avant de la parser
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("La réponse du serveur n'est pas au format JSON");
      }
  
      const savedTodo = await response.json()
      console.log("Todo sauvegardé avec succès:", savedTodo);
  
      setTodos((prev) => [...prev, savedTodo])
      setIsCreatingTodo(false)
      setNewTodo({ title: "", description: "", priority: "medium" })
  
      toast?.success("Todo created successfully");
    } catch (error) {
      console.error("Failed to save todo", error)
      toast?.error(`Failed to save todo: ${error.message}`);
    }
  };
  
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
        // Calculons un vecteur perpendiculaire à direction en utilisant un vecteur auxiliaire
        let auxVector = { x: 0, y: 1, z: 0 }; // Utiliser (0,1,0) comme vecteur auxiliaire
        
        // Si direction est proche de (0,1,0), utiliser (1,0,0) comme vecteur auxiliaire
        if (Math.abs(camera.direction.y) > 0.9) {
          auxVector = { x: 1, y: 0, z: 0 };
        }
        
        // Calculer le produit vectoriel pour obtenir un vecteur perpendiculaire à direction
        const crossX = camera.direction.y * auxVector.z - camera.direction.z * auxVector.y;
        const crossY = camera.direction.z * auxVector.x - camera.direction.x * auxVector.z;
        const crossZ = camera.direction.x * auxVector.y - camera.direction.y * auxVector.x;
        
        // Normaliser le résultat pour obtenir un vecteur up perpendiculaire unitaire
        const crossLength = Math.sqrt(crossX * crossX + crossY * crossY + crossZ * crossZ);
        
        if (crossLength > 0) {
          camera.up.x = crossX / crossLength;
          camera.up.y = crossY / crossLength;
          camera.up.z = crossZ / crossLength;
        } else {a
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
        case "medium": return "Medium";
        case "high": return "High";
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
  
    // Fonction de conversion pour ajuster les coordonnées au format BIMTrack/Revit
    function convertCoordinates(point) {
      // Facteur de conversion basé sur les exemples fournis
      // Environ 92.9 (3219.86 / 34.658278583894344)
      const conversionFactor = 92.9;
      
      // Conversion et inversion d'axes si nécessaire pour Revit/BIMTrack
      return {
        // Inversion axes y et z pour correspondre à la convention de Revit
        x: point.x * conversionFactor,
        y: point.z * conversionFactor, // z devient y
        z: point.y * conversionFactor  // y devient z
      };
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
  
      // Extraire les données de caméra du viewpoint
      let camera = {
        position: { x: 0, y: 0, z: 0 },
        direction: { x: 0, y: 0, z: -1 },
        up: { x: 0, y: 1, z: 0 }
      };
  
      if (todo.viewpoint) {
        // Utiliser les données du viewpoint avec conversion pour BIMTrack/Revit
        const convertedPosition = convertCoordinates({
          x: todo.viewpoint.camera_view_point.x,
          y: todo.viewpoint.camera_view_point.y,
          z: todo.viewpoint.camera_view_point.z
        });
  
     
        camera = {
          position: {
            x: -todo.viewpoint.camera_view_point.x,
            y: -todo.viewpoint.camera_view_point.z,
            z: todo.viewpoint.camera_view_point.y
          },
          direction: {
            x: -todo.viewpoint.camera_direction.x,
            y: -todo.viewpoint.camera_direction.z,
            z: todo.viewpoint.camera_direction.y
          },
          up: {
            x: -todo.viewpoint.camera_up_vector.x,
            y: -todo.viewpoint.camera_up_vector.z,
            z: todo.viewpoint.camera_up_vector.y
          }
        };
        
        
  
        // S'assurer que les vecteurs sont perpendiculaires
        camera = ensureVectorsPerpendicular(camera);
      } else {
        console.log("Viewpoint manquant, utilisation de valeurs par défaut");
        // Valeurs par défaut garanties perpendiculaires avec échelle BIMTrack
        camera = {
          position: { x: 10 * 92.9, y: 10 * 92.9, z: 10 * 92.9 },
          direction: { x: 0, y: 0, z: -1 },
          up: { x: 0, y: 1, z: 0 }
        };
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
      <FieldOfView>${todo.viewpoint?.field_of_view || 20.0}</FieldOfView>
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
  
  const handleGoBack = () => {
    router.back();
  };
  useEffect(() => {

    const fetchTodos = async () => {
      try {
        // Récupérer l'ID du projet depuis l'URL
        const urlParams = new URLSearchParams(window.location.search);
        const projectId = urlParams.get('projectId');

        if (!projectId) {
          console.error("Project ID is missing");
          return;
        }

        const response = await fetch(`/api/todos?projectId=${projectId}`);

        if (!response.ok) {
          throw new Error(`Error: ${response.status}`);
        }

        const data = await response.json();
        setTodos(data);
      } catch (error) {
        console.error("Failed to fetch todos", error);
      }
    };

    fetchTodos();
  }, []);

  const restoreTodoView = (todo: Todo) => {
    if (!viewerRef.current || !controls) {
      console.error("Contrôles de la caméra non initialisés");
      return;
    }
    
    // Vérifier si le viewpoint existe et est correctement structuré
    // Attention à la structure potentiellement imbriquée après un populate depuis MongoDB
    let viewpointData = todo.viewpoint;
    
    // Log pour débogage
    console.log("Structure du viewpoint reçu:", JSON.stringify(viewpointData, null, 2));
    
    // Si c'est un objet MongoDB avec _doc après populate
    if (viewpointData && typeof viewpointData === 'object' && '_doc' in viewpointData) {
      viewpointData = viewpointData._doc;
    }
    
    if (!viewpointData || typeof viewpointData !== 'object') {
      console.error("Données de viewpoint manquantes");
      return;
    }
    
    // Vérifier le format - selon le modèle MongoDB ou format direct
    let position, direction, up, fieldOfView;
    
    // Si le viewpoint vient d'être peuplé depuis MongoDB (IViewpoint)
    if ('camera_view_point' in viewpointData && 'camera_direction' in viewpointData) {
      position = viewpointData.camera_view_point;
      direction = viewpointData.camera_direction;
      up = viewpointData.camera_up_vector;
      fieldOfView = viewpointData.field_of_view || 45;
    } 
    // Si le viewpoint utilise l'ancien format avec position et target
    else if ('position' in viewpointData && 'target' in viewpointData) {
      position = viewpointData.position;
      // Calculer la direction à partir de position et target
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
    
    // Validation finale des vecteurs
    if (
      !position || !direction || !up ||
      typeof position.x !== 'number' ||
      typeof direction.x !== 'number' ||
      typeof up.x !== 'number'
    ) {
      console.error("Données de viewpoint invalides:", viewpointData);
      return;
    }
    
    // Calculer le point cible en ajoutant le vecteur direction à la position
    const target = {
      x: position.x + direction.x,
      y: position.y + direction.y,
      z: position.z + direction.z
    };
    
    // Définir la position et la cible de la caméra
    controls.setLookAt(
      position.x,
      position.y,
      position.z,
      target.x,
      target.y,
      target.z,
      true
    );
    
    // Définir le vecteur "up" de la caméra si les contrôles le supportent
    if (viewerRef.current.context.getCamera()) {
      viewerRef.current.context.getCamera().up.set(up.x, up.y, up.z);
    }
    
    // Mettre à jour les contrôles si fieldOfView est défini
    if (typeof fieldOfView === 'number' && viewerRef.current.context.getCamera()) {
      viewerRef.current.context.getCamera().fov = fieldOfView;
      viewerRef.current.context.getCamera().updateProjectionMatrix();
    }
    
    controls.update(true);
  };



  // Fonction pour changer le statut d'un todo
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
        prev.map(todo => todo.id === todoId ? updatedTodo : todo)
      );
    } catch (error) {
      console.error("Failed to update todo status", error);
    }
  };

  // Fonction pour assigner un todo
  const handleTodoAssign = async (todoId, userId) => {
    try {
      const response = await fetch('/api/todos', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: todoId,
          assignedTo: userId
        }),
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      const updatedTodo = await response.json();

      // Mettre à jour l'état local
      setTodos(prev =>
        prev.map(todo => todo.id === todoId ? updatedTodo : todo)
      );
    } catch (error) {
      console.error("Failed to assign todo", error);
    }
  };

  const handleTodoDelete = async (todoId: string) => {
    if (!todoId) {
      toast.error("ID manquant pour la suppression");
      return;
    }

    // Récupération du projectId depuis l'URL
    const urlParams = new URLSearchParams(window.location.search);
    const projectId = urlParams.get('projectId');

    const originalTodos = todos;

    // 1. Suppression optimiste
    setTodos(prev => prev.filter(t => t._id !== todoId && t.id !== todoId));

    try {
      // 2. Suppression réelle
      const response = await fetch(`/api/todos?id=${encodeURIComponent(todoId)}`, {
        method: "DELETE"
      });

      if (!response.ok) throw new Error("Échec de la suppression");

      // 3. Rechargement des todos du projet
      if (projectId) {
        const freshData = await fetch(`/api/todos?projectId=${projectId}`)
          .then(res => res.json());
        setTodos(freshData);
      }

      toast.success("Supprimé avec succès !");
    } catch (error) {
      // Rollback
      setTodos(originalTodos);
      toast.error("Échec de la suppression");
    }
  };

  const ModelList = () => (
    <div className="absolute right-0 top-0 h-full w-64 bg-white p-4 shadow-lg z-20">
      <h3 className="font-bold mb-2">Modèles chargés</h3>
      {loadedModels.length === 0 ? (
        <p className="text-gray-500">Aucun modèle disponible</p>
      ) : (
        loadedModels.map((model) => (
          <div key={model.id} className="flex items-center gap-2 mb-2">
            {/* Bouton avec l'icône d'œil */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => toggleModelVisibility(model.id, !model.visible)}
              title={model.visible ? "Masquer" : "Afficher"}
              className="flex-shrink-0" // Empêche le bouton de rétrécir
            >
              {model.visible ? (
                <Eye className="h-4 w-4" />
              ) : (
                <EyeOff className="h-4 w-4" />
              )}
            </Button>

            {/* Nom du modèle sans troncature */}
            <span className="text-sm flex-1 break-words text-xs">
              {model.name}
            </span>
          </div>
        ))
      )}
    </div>
  );
  // Récupération (ou mise à jour) de la position de la caméra dans un useEffect
  useEffect(() => {
    if (viewerRef.current?.context) {
      const camera = viewerRef.current.context.getCamera();
      setCameraPosition(camera.position.clone());
      setCameraTarget(new THREE.Vector3(0, 0, 0));
      setCameraUp(camera.up.clone());
    }
  }, []);
  useEffect(() => {
    const initViewer = async () => {
      if (!containerRef.current || initializedRef.current) return;
    
      try {
        initializedRef.current = true;
        const viewer = new IfcViewerAPI({
          container: containerRef.current,
          backgroundColor: new THREE.Color(0xeeeeee),
          powerPreference: "high-performance"
        });
    
        // Add proper lighting to the scene
        const scene = viewer.context.getScene();
        
        // Add ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        scene.add(ambientLight);
        
        // Add directional lights from multiple angles
        const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight1.position.set(1, 2, 3);
        scene.add(directionalLight1);
        
        const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.5);
        directionalLight2.position.set(-1, 1, -2);
        scene.add(directionalLight2);
    
        // Configuration avancée du renderer
        const renderer = viewer.context.getRenderer();
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.physicallyCorrectLights = true;
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
        // Configuration WASM - make sure the path is correct
        await viewer.IFC.setWasmPath("wasm/");
        viewer.clipper.active = true;
        viewer.IFC.loader.ifcManager.applyWebIfcConfig({
          COORDINATE_TO_ORIGIN: true,
          USE_FAST_BOOLS: false
        });
    
        // Chargement des modèles avec optimisation
       // 5. Chargement des modèles IFC avec gestion d'erreur
       const filesParam = searchParams.get("files");
       if (filesParam) {
         const fileURLs = JSON.parse(filesParam) as string[];
         const newModels = [];
 
         for (const url of fileURLs) {
           try {
             const model = await viewer.IFC.loadIfcUrl(url, {
               applyMaterials: true,
               coerceMaterials: false,
             });
 
             if (model?.mesh && model.modelID !== undefined) {
               const decodedUrl = decodeURIComponent(url);
               const match = decodedUrl.match(/(?:uploads\/)?\d+-(.+?)(?:\.ifc)?(?:\?.*)?$/);
               const cleanName = match ? match[1] : `Modèle-${model.modelID}`;
 
               newModels.push({
                 id: model.modelID,
                 name: cleanName,
                 visible: true,
               });
             }
           } catch (error) {
             console.error(`Échec du chargement: ${url}`, error);
           }
         }
 
         setLoadedModels(newModels);
    
          // Ajustement automatique de la caméra only if models were loaded
          if (newModels.length > 0) {
            console.log(`Adjusting camera for ${newModels.length} models`);
            
            try {
              // Force scene update to ensure bounding box is correct
              scene.updateMatrixWorld(true);
              
              // Créer une boîte englobante
              const bbox = new THREE.Box3();
              
              // Ajouter tous les objets à la boîte englobante
              scene.traverse((object) => {
                if (object.isMesh && object.geometry) {
                  bbox.expandByObject(object);
                }
              });
              
              // Vérifier que la boîte englobante est valide
              if (bbox.isEmpty()) {
                console.warn("Bounding box is empty, using fallback values");
                bbox.set(
                  new THREE.Vector3(-5, -5, -5),
                  new THREE.Vector3(5, 5, 5)
                );
              }
              
              // Créer des vecteurs pour le centre et la taille
              const center = new THREE.Vector3();
              const size = new THREE.Vector3();
              
              // Calculer le centre et la taille
              bbox.getCenter(center);
              bbox.getSize(size);
              
              const maxDim = Math.max(size.x, size.y, size.z);
        
              // Configuration caméra
              const camera = viewer.context.getCamera();
              camera.near = Math.max(0.1, maxDim * 0.001);
              camera.far = Math.max(1000, maxDim * 10);
              camera.updateProjectionMatrix();
        
              // Position initiale avec des valeurs sécurisées
              const cameraOffsetX = center.x + maxDim;
              const cameraOffsetY = center.y + maxDim * 0.5;
              const cameraOffsetZ = center.z + maxDim;
              
              // S'assurer que tous les paramètres sont des nombres
              if (
                isFinite(cameraOffsetX) && 
                isFinite(cameraOffsetY) && 
                isFinite(cameraOffsetZ) && 
                isFinite(center.x) && 
                isFinite(center.y) && 
                isFinite(center.z)
              ) {
                viewer.context.ifcCamera.cameraControls.setLookAt(
                  cameraOffsetX,
                  cameraOffsetY,
                  cameraOffsetZ,
                  center.x,
                  center.y,
                  center.z,
                  true
                );
                
                console.log("Camera positioned successfully", {
                  from: [cameraOffsetX, cameraOffsetY, cameraOffsetZ],
                  to: [center.x, center.y, center.z]
                });
              } else {
                console.warn("Invalid camera position values, using default positioning");
                viewer.context.ifcCamera.cameraControls.setLookAt(
                  10, 10, 10,
                  0, 0, 0,
                  true
                );
              }
            } catch (cameraError) {
              console.error("Error setting up camera:", cameraError);
              // Fallback camera positioning
              viewer.context.ifcCamera.cameraControls.setLookAt(
                10, 10, 10,
                0, 0, 0,
                true
              );
            }
          } else {
            console.warn("No models were successfully loaded");
            setError("No models were successfully loaded");
          }
        }
    
        viewerRef.current = viewer;
      } catch (error) {
        console.error("Initialization error:", error);
        setError("Failed to initialize viewer: " + (error instanceof Error ? error.message : String(error)));
        initializedRef.current = false;
      }
    };
  
    initViewer();
  
    // Cleanup avec vérification complète
    return () => {
      if (viewerRef.current) {
        try {
          viewerRef.current.dispose();
        } catch (cleanupError) {
          console.error("Erreur lors du nettoyage:", cleanupError);
        }
        viewerRef.current = null;
        initializedRef.current = false;
      }
    };
  }, [searchParams]);
  
  useEffect(() => {
    if (!viewerRef.current?.context) return;
  
    const viewer = viewerRef.current;
    const controls = viewer.context.ifcCamera.cameraControls;
  
    // Paramètres avancés pour une navigation fluide
    controls.smoothTime = 0.25;
    controls.maxDistance = 1000;
    controls.minDistance = 0.1;
    controls.infinityDolly = false;
    controls.dollyToCursor = true;
    controls.dollySpeed = 1.0;
    controls.truckSpeed = 2.0;
    controls.rotateSpeed = 1.0;
  
    // Configuration des touches
    controls.mouseButtons = {
      left: CameraControls.ACTION.TRUCK,
      middle: CameraControls.ACTION.DOLLY,
      right: CameraControls.ACTION.ROTATE,
      wheel: CameraControls.ACTION.DOLLY
    };
  
    // Gestion des FPS
    let lastTime = 0;
    const targetFPS = 60;
    const minFrameTime = 1000 / targetFPS;
  
    const updateControls = (time: number) => {
      const delta = time - lastTime;
      if (delta >= minFrameTime) {
        controls.update(delta / 1000);
        lastTime = time;
      }
      requestAnimationFrame(updateControls);
    };
  
    requestAnimationFrame(updateControls);
  
    return () => {
      // Cleanup
    };
  }, []);
  useEffect(() => {
    if (viewerRef.current && activeTool === 'select') {
      const viewer = viewerRef.current;


      const handleClick = (event: MouseEvent) => {
        try {
          if (!containerRef.current) {
            console.warn('Conteneur non disponible');
            return;
          }

          console.log('Événement de clic capturé');

          // Méthode alternative de sélection
          const rect = containerRef.current.getBoundingClientRect();
          const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
          const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

          console.log('Coordonnées normalisées:', { x, y });

          // Vérifier les méthodes disponibles
          console.log('Méthodes disponibles dans viewer:',
            Object.keys(viewer).filter(key => typeof viewer[key] === 'function')
          );

          // Tentative de sélection avec différentes approches
          if (viewer.IFC && viewer.IFC.selector) {
            console.log('Tentative de sélection avec IFC.selector');
            try {
              const result = viewer.IFC.selector.pickIfcItem();
              console.log('Résultat de la sélection:', result);
            } catch (ifcError) {
              console.error('Erreur avec IFC.selector:', ifcError);
            }
          }

          // Méthode alternative de ray casting
          if (viewer.context && viewer.context.castRay) {
            console.log('Tentative de ray casting');
            try {
              const result = viewer.context.castRay(x, y);
              console.log('Résultat du ray casting:', result);
            } catch (rayError) {
              console.error('Erreur de ray casting:', rayError);
            }
          }

        } catch (error) {
          console.error('Erreur globale lors de la sélection:', error);
        }
      };

      // Ajouter l'écouteur d'événements
      containerRef.current?.addEventListener('click', handleClick);

      // Nettoyage
      return () => {
        containerRef.current?.removeEventListener('click', handleClick);
      };
    }
  }, [activeTool, containerRef, viewerRef]);
  

  // Correction 4 : Vérification de l'état de chargement
  if (loading) {
    return <div className="p-4 text-blue-600">Chargement en cours...</div>;
  }

  const AnnotationTypeButton = ({
    type,
    label,
    icon,
    selected,
    onSelect,
  }: {
    type: 'cloud' | 'arrow' | 'text';
    label: string;
    icon: React.ReactNode;
    selected: string;
    onSelect: (type: 'cloud' | 'arrow' | 'text') => void;
  }) => (
    <Button
      variant={selected === type ? 'default' : 'outline'}
      className={`h-24 flex flex-col gap-2 ${selected === type ? 'border-2 border-blue-500' : ''
        }`}
      onClick={() => onSelect(type)}
    >
      {icon}
      <span className="text-xs">{label}</span>
    </Button>
  );


  const calculateCameraDistance = (bbox: THREE.Box3) => { 
    const size = bbox.getSize(new THREE.Vector3());
    return Math.max(size.x, size.y, size.z) * 2.5;
  };
  
  const setView = (direction: ViewDirection) => {
    const viewer = viewerRef.current;
    if (!viewer) return;
  
    viewer.clipper.deleteAllPlanes();
  
    const controls = viewer.context.ifcCamera.cameraControls;
    const scene = viewer.context.getScene();
  
    const bbox = new THREE.Box3();
    viewer.IFC.loader.ifcManager.state.models.forEach((model: any) => {
      if (model.mesh) {
        model.mesh.updateMatrixWorld(true);
        const modelBBox = new THREE.Box3().setFromObject(model.mesh);
        bbox.union(modelBBox);
      }
    });
  
    const distance = bbox.isEmpty() ? 50 : calculateCameraDistance(bbox);
    const center = bbox.isEmpty() ? new THREE.Vector3() : bbox.getCenter(new THREE.Vector3());
  
    // ✅ Décalage vertical du centre
    const size = bbox.getSize(new THREE.Vector3());
    center.z = bbox.min.z + size.z / 2; // centre vertical (au milieu de la hauteur)
  
    let position = new THREE.Vector3();
    let up = new THREE.Vector3(0, 0, 1);
  
    switch (direction) {
      case 'top':
        position.set(center.x, center.y + distance, center.z);
        up.set(0, 0, 1);
        break;
      case 'bottom':
        position.set(center.x, center.y - distance, center.z);
        up.set(0, 0, 1);
        break;
      case 'front':
        position.set(center.x, center.y, center.z + distance);
        up.set(0, 1, 0);
        break;
      case 'back':
        position.set(center.x, center.y, center.z - distance);
        up.set(0, 1, 0);
        break;
      case 'left':
        position.set(center.x - distance, center.y, center.z);
        up.set(0, 1, 0);
        break;
      case 'right':
        position.set(center.x + distance, center.y, center.z);
        up.set(0, 1, 0);
        break;
      case 'iso':
        position.set(center.x + distance * 0.7, center.y + distance * 0.7, center.z + distance * 0.7);
        up.set(0, 1, 0);
        break;
    }
  
    controls.setLookAt(
      position.x,
      position.y,
      position.z,
      center.x,
      center.y,
      center.z,
      true
    );
  
    controls.update(true);
    viewer.context.getRenderer().render(scene, viewer.context.getCamera());
  };
  




    useEffect(() => {
      // Si l'outil n'est plus 'measure', réinitialiser les points et le mode
      if (activeTool !== 'measure') {
        setMeasurementMode('none');
        setCurrentPoints([]);
        
        // Nettoyer les indicateurs visuels temporaires si nécessaire
        if (viewerRef.current) {
          const scene = viewerRef.current.context.getScene();
          // Si vous avez des marqueurs temporaires pour les points en cours, vous pouvez les supprimer ici
        }
      }
    }, [activeTool]);
    
 
  const handleAnnotationClick = (event: MouseEvent) => {
    if (!viewerRef.current || activeTool !== 'comment') return;

    const viewer = viewerRef.current;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Calculer la position du clic
    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, viewer.context.getCamera());

    // Trouver l'intersection
    const intersects = raycaster.intersectObjects(
      viewer.IFC.loader.ifcManager.state.models
        .filter((model: any) => model.mesh)
        .map((model: any) => model.mesh),
      true
    );

    if (intersects.length > 0) {
      const intersection = intersects[0];
      const position = new THREE.Vector3().copy(intersection.point);
      const normal = intersection.face?.normal.clone().normalize() || new THREE.Vector3(0, 1, 0);

      if (selectedAnnotationType === 'arrow') {
        // Calculer la direction de la flèche (opposée à la normale)
        const direction = normal.clone().negate();

        // Créer la flèche
        const newComment: ArrowAnnotation = {
          id: `comment-${Date.now()}`,
          type: 'arrow',
          text: '',
          author: user?.name || "Unknown User", // Afficher le nom de l'utilisateur connecté
          date: new Date(),
          start: position.clone().add(direction.clone().multiplyScalar(1)), // Début de la flèche
          end: position, // Fin de la flèche (point de positionnement)
          headSize: 0.3,
          viewpoint: {
            position: [camera.position.x, camera.position.y, camera.position.z], // Position réelle de la caméra
            target: [target.x, target.y, target.z],    // Cible réelle
            up: [camera.up.x, camera.up.y, camera.up.z]         // Orientation réelle
          }
        };

        // Ajouter la flèche à la scène
        const arrowObject = createArrowMarker(newComment);
        viewer.context.getScene().add(arrowObject);
        setComments((prev) => [...prev, newComment]);
      }
    }
  };
// Dans le useEffect qui configure les contrôles :
useEffect(() => {
  if (!viewerRef.current?.context) return;

  const viewer = viewerRef.current;
  const controls = viewer.context.ifcCamera.cameraControls;

  // Paramètres anti-vibration
  controls.dampingFactor = 0.25; // Plus élevé = plus stable
  controls.draggingDampingFactor = 0.25;
  controls.azimuthRotateSpeed = 0.5; // Réduire la vitesse
  controls.polarRotateSpeed = 0.5;
  controls.truckSpeed = 1.0;
  controls.maxDistance = 1000;
  controls.minDistance = 0.1;
  
  // Activer le damping
  controls.enableDamping = true;
  controls.dampingInertia = 0.95;

  // Configurer le renderer pour de meilleures performances
  const renderer = viewer.context.getRenderer();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); // Limiter le pixel ratio
  renderer.outputColorSpace = THREE.SRGBColorSpace;
}, []);
  // useEffect(() => {
  //   if (!viewerRef.current?.context) return;

  //   const viewer = viewerRef.current;
  //   const controls = viewer.context.ifcCamera.cameraControls;

  //   // Réduire les vibrations en ajustant les paramètres des contrôles
  //   controls.dampingFactor = 0.1; // Augmenter pour plus de stabilité
  //   controls.enableDamping = true;
  //   controls.rotateSpeed = 0.5; // Réduire pour plus de stabilité
  //   controls.zoomSpeed = 0.7;
  //   controls.panSpeed = 0.5;
  //   controls.minDistance = 0.1;
  //   controls.maxDistance = 1000;

  //   // Activer l'antialiasing pour une meilleure qualité visuelle
  //   const renderer = viewer.context.getRenderer();
  //   renderer.setPixelRatio(window.devicePixelRatio);
  //   renderer.antialias = true;

  // }, []);



  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if (activeTool === 'comment') {
      container.addEventListener('click', handleAnnotationClick);
      return () => container.removeEventListener('click', handleAnnotationClick);
    }
  }, [activeTool, selectedAnnotationType]);




  const resetIsolation = () => {
    if (!viewerRef.current) return;
    const scene = viewerRef.current.context.getScene();
    scene.traverse((object) => {
      object.visible = true;
    });
    setIsIsolationActive(false);
  };


  // --- Panneau Masquer/Afficher pour les modèles chargés ---
  const toggleModelVisibility = (modelId: number, visible: boolean) => {
    if (!viewerRef.current) return;

    const ifcManager = viewerRef.current.IFC.loader.ifcManager;
    const model = Object.values(ifcManager.state.models).find(m => m.modelID === modelId);

    if (model?.mesh) {
      model.mesh.visible = visible;
      setLoadedModels(prev =>
        prev.map(m => m.id === modelId ? { ...m, visible } : m)
      );
      const scene = viewerRef.current.context.getScene();
      const camera = viewerRef.current.context.getCamera();
      viewerRef.current.context.getRenderer().render(scene, camera);
    }
  };
  const viewCubeRef = useRef<any>(null);

  // Fonction pour gérer les changements de vue depuis le ViewCube
  const handleViewChange = (quaternion) => {
    if (!controls) return;
  
    // Get the current target and camera position
    const target = controls.getTarget(new THREE.Vector3());
    
    // Get current distance (if getDistance doesn't exist, calculate it)
    let distance;
    if (typeof controls.getDistance === 'function') {
      distance = controls.getDistance();
    } else {
      // Calculate distance manually
      const position = controls.getPosition(new THREE.Vector3());
      distance = position.distanceTo(target);
    }
  
    // Calculate new camera position based on quaternion
    const direction = new THREE.Vector3(0, 0, 1);
    direction.applyQuaternion(quaternion);
    direction.multiplyScalar(-distance);
  
    const newPosition = new THREE.Vector3().copy(target).add(direction);
  
    // Use the appropriate method to update camera position
    if (typeof controls.setLookAt === 'function') {
      controls.setLookAt(
        newPosition.x, newPosition.y, newPosition.z,
        target.x, target.y, target.z,
        true // Animation
      );
    } else if (typeof controls.moveTo === 'function') {
      controls.moveTo(newPosition.x, newPosition.y, newPosition.z, true);
      controls.lookAt(target.x, target.y, target.z, true);
    } else if (controls.position && controls.quaternion) {
      // Direct camera manipulation if no control methods exist
      controls.position.copy(newPosition);
      controls.quaternion.copy(quaternion);
    }
  };
  
  useEffect(() => {
    if (!viewerRef.current?.context) return;
    
    const viewer = viewerRef.current;
    const camera = viewer.context.getCamera();
    setCamera(camera);
    
    const cameraControls = viewer.context?.ifcCamera?.cameraControls;
    if (cameraControls) {
      setControls(cameraControls);
      

      cameraControls.mouseButtons.left = CameraControls.ACTION.TRUCK;
      cameraControls.mouseButtons.right = CameraControls.ACTION.ROTATE;
      
 

  
      const updateViewCube = () => {
        if (!viewCubeRef.current) return;
        
        // Synchroniser la rotation du ViewCube avec celle de la caméra
        viewCubeRef.current.setQuaternion(camera.quaternion);
      };
      
      // Ajouter l'écouteur d'événements
      cameraControls.addEventListener('control', updateViewCube);
      cameraControls.addEventListener('update', updateViewCube);
      
      return () => {
        cameraControls.removeEventListener('control', updateViewCube);
        cameraControls.removeEventListener('update', updateViewCube);
      };
    }
  }, [viewerRef.current]);






  const resetView = () => {
    setViewStyleMode(null);
    const camera = viewerRef.current?.context.getCamera();
    if (camera) {
      camera.position.set(0, 5, 10);
      camera.lookAt(0, 0, 0);
    }
    if (viewerRef.current?.context.getControls) {
      const controls = viewerRef.current.context.getControls();
      if (controls && typeof controls.reset === "function") {
        controls.reset();
      }
    }
  };

  // --- Changement de style d'affichage ---
  const initialMaterials = useRef(new WeakMap<THREE.Object3D, THREE.Material | THREE.Material[]>());
  const mainCameraRef = useRef<any>(null);
  
  // Fonction pour gérer les changements de vue

  const setViewStyleMode = (style: 'shaded' | 'wireframe' | 'hidden-line' | null) => {
    if (!viewerRef.current) return;

    const scene = viewerRef.current.context.getScene();

    // Réinitialisation si le style est déjà actif
    if (activeStyle === style) {
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          const original = initialMaterials.current.get(object);

          if (original) {
            // Restauration directe du matériau original
            object.material = original;

            // Important: pour les modèles IFC, parfois besoin de forcer la mise à jour
            object.material.needsUpdate = true;
            if (Array.isArray(object.material)) {
              object.material.forEach(m => m.needsUpdate = true);
            }
          }

          // Nettoyage des lignes
          const edges = object.children.filter(child => child instanceof THREE.LineSegments);
          edges.forEach(edge => object.remove(edge));
        }
      });
      setActiveStyle(null);
      return;
    }

    // Application du nouveau style
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        // Sauvegarde du matériau original seulement si pas déjà fait
        if (!initialMaterials.current.has(object)) {
          initialMaterials.current.set(object, object.material);
        }

        // Nettoyage des anciennes lignes
        const edges = object.children.filter(child => child instanceof THREE.LineSegments);
        edges.forEach(edge => object.remove(edge));

        // Création du nouveau matériau
        const createNewMaterial = () => {
          switch (style) {
            case 'shaded':
              return new THREE.MeshPhongMaterial({ color: 0xffffff, flatShading: false });
            case 'wireframe':
              return new THREE.MeshBasicMaterial({ wireframe: true, color: 0x000000 });
            case 'hidden-line':
              return new THREE.MeshBasicMaterial({ color: 0xffffff });
            default:
              return null;
          }
        };

        const newMaterial = createNewMaterial();
        if (!newMaterial) return;

        if (Array.isArray(object.material)) {
          object.material = object.material.map(() => newMaterial.clone());
        } else {
          object.material = newMaterial.clone();
        }

        // Ajout des edges pour le mode hidden-line
        if (style === 'hidden-line') {
          const edgesGeometry = new THREE.EdgesGeometry(object.geometry);
          const edgesMaterial = new THREE.LineBasicMaterial({ color: 0x000000 });
          const edges = new THREE.LineSegments(edgesGeometry, edgesMaterial);
          object.add(edges);
        }
      }
    });

    setActiveStyle(style);
  };
  const createAnnotationObject = (comment: Comment) => {
    const group = new THREE.Group();

    // Create marker based on type
    let marker: THREE.Object3D;

    switch (comment.type) {
      case 'cloud':
        marker = createCloudMarker();
        break;
      case 'arrow':
        marker = createArrowMarker();
        break;
      case 'text':
        marker = createTextMarker();
        break;
      default:
        marker = new THREE.Mesh(
          new THREE.SphereGeometry(0.1),
          new THREE.MeshBasicMaterial({ color: 0x4287f5 })
        );
    }

    // Add marker to group
    group.add(marker);

    // Create label
    const labelDiv = document.createElement('div');
    labelDiv.className = 'annotation-label';
    labelDiv.textContent = comment.text;

    const label = new CSS2DObject(labelDiv);
    label.position.set(0, 0.2, 0); // Offset above marker

    group.add(label);

    // Position the entire group
    group.position.copy(comment.position);

    return group;
  };

  const createCloudMarker = () => {
    // Créer une forme de nuage avec des courbes
    const shape = new THREE.Shape();
    const points = [];
    const radius = 0.3;
    const numPoints = 12;

    // Générer des points aléatoires autour d'un cercle
    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2;
      const variance = radius * 0.3 * Math.random();
      points.push(
        new THREE.Vector2(
          Math.cos(angle) * (radius + variance),
          Math.sin(angle) * (radius + variance)
        )
      );
    }

    // Lisser la forme avec des courbes
    shape.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      const p = points[i];
      shape.quadraticCurveTo(p.x, p.y, p.x, p.y);
    }
    shape.closePath();

    // Extruder la forme
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: 0.05,
      bevelEnabled: false,
      curveSegments: 32
    });

    return new THREE.Mesh(
      geometry,
      new THREE.MeshBasicMaterial({
        color: 0x4287f5,
        transparent: true,
        opacity: 0.8
      })
    );
  };

  const createArrowMarker = () => {
    const direction = new THREE.Vector3(0, 1, 0);
    return new THREE.ArrowHelper(
      direction,
      new THREE.Vector3(),
      1,
      0xff0000,
      0.2,
      0.1
    );
  };

  const createTextMarker = () => {
    const geometry = new THREE.CircleGeometry(0.1, 32);
    const material = new THREE.MeshBasicMaterial({
      color: 0x4287f5,
      side: THREE.DoubleSide
    });
    return new THREE.Mesh(geometry, material);
  };

// Gestionnaire pour les mesures complétées
const handleMeasurementComplete = (measurement: Measurement) => {
  setMeasurements(prev => [...prev, measurement]);
};

// Gestionnaire pour effacer toutes les mesures
const handleClearMeasurements = () => {
  if (!viewerRef.current) return;

  const scene = viewerRef.current.context.getScene();
  const renderer = viewerRef.current.context.getRenderer("css2d");

  // Nettoyage en une seule passe
  const toRemove = [];
  
  scene.traverse((object) => {
    if (object instanceof THREE.Line || object instanceof CSS2DObject) {
      toRemove.push(object);
      
      // Suppression spécifique pour CSS2D
      if (object instanceof CSS2DObject && object.element.parentNode) {
        object.element.parentNode.removeChild(object.element);
      }
    }
  });

  toRemove.forEach(obj => scene.remove(obj));
  
  // Nettoyage forcé du renderer CSS2D
  if (renderer) {
    renderer.domElement.innerHTML = "";
  }

  setMeasurements([]);
};
  useEffect(() => {
    if (!viewerRef.current || activeTool !== 'comment') return;
    const container = containerRef.current;
    if (!container) return;
    const handleClick = (event: MouseEvent) => {
      const viewer = viewerRef.current;
      if (!viewer) return;
      const rect = container.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1
      );
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, viewer.context.getCamera());
      // Supposons que tes modèles IFC sont dans viewer.IFC.loader.ifcManager.state.models
      const ifcMeshes = viewer.IFC.loader.ifcManager.state.models
        .filter((model: any) => model.mesh)
        .map((model: any) => model.mesh);
      const intersects = raycaster.intersectObjects(ifcMeshes, true);
      if (intersects.length > 0) {
        const intersection = intersects[0];
        setCommentPosition(intersection.point);
      } else {
        setCommentPosition(null);
      }
    };
    container.addEventListener('click', handleClick);
    return () => {
      container.removeEventListener('click', handleClick);
    };
  }, [activeTool]);
  useEffect(() => {
    if (!viewerRef.current || !commentPosition) return;

    const viewer = viewerRef.current;
    const scene = viewer.context.getScene();

    let marker: THREE.Object3D | null = null;

    // Créer un marqueur visuel en fonction du type d'annotation
    switch (selectedAnnotationType) {
      case 'cloud':
        // Marqueur nuage (un groupe de sphères)
        const cloudGroup = new THREE.Group();
        for (let i = 0; i < 6; i++) {
          const angle = (i / 6) * Math.PI * 2;
          const sphereGeometry = new THREE.SphereGeometry(0.15);
          const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0x4287f5, transparent: true, opacity: 0.6 });
          const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
          sphere.position.set(Math.cos(angle) * 0.3, Math.sin(angle) * 0.3, 0);
          cloudGroup.add(sphere);
        }
        marker = cloudGroup;
        break;

      case 'arrow':
        // Marqueur flèche (une flèche simple)
        const arrowDirection = new THREE.Vector3(1, 0, 0); // Direction par défaut
        const arrowHelper = new THREE.ArrowHelper(arrowDirection, new THREE.Vector3(0, 0, 0), 1, 0xff0000);
        marker = arrowHelper;
        break;

      case 'text':
        // Marqueur texte (une sphère avec un label CSS2D)
        const textDiv = document.createElement('div');
        //textDiv.className = 'annotation-text-preview';
        //textDiv.textContent = 'Texte';
        //textDiv.style.background = 'rgba(255, 255, 255, 0.9)';
        //textDiv.style.padding = '4px 8px';
        //textDiv.style.borderRadius = '4px';
        //  textDiv.style.border = '1px solid #4287f5';

        const textLabel = new CSS2DObject(textDiv);
        textLabel.position.set(0, 0.5, 0); // Décalage vertical

        const sphereGeometry = new THREE.SphereGeometry(0.15);
        const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0x4287f5 });
        const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);

        const textGroup = new THREE.Group();
        textGroup.add(sphere);
        textGroup.add(textLabel);
        marker = textGroup;
        break;

      default:
        // Marqueur par défaut (une sphère rouge)
        const defaultGeometry = new THREE.SphereGeometry(0.1);
        const defaultMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        marker = new THREE.Mesh(defaultGeometry, defaultMaterial);
        break;
    }

    // Positionner le marqueur
    if (marker) {
      marker.position.copy(commentPosition);
      scene.add(marker);
    }

    // Nettoyer le marqueur lors du démontage
    return () => {
      if (marker) {
        scene.remove(marker);
      }
    };
  }, [commentPosition, selectedAnnotationType]);
  const object3D = new THREE.Object3D(); // Exemple d'objet 3D, remplace-le par ton objet réel
  const bbox = new THREE.Box3().setFromObject(object3D); // Calcule la boîte de délimitation autour de l'objet
  

  // Définir la position de la caméra (initialisation si pas déjà défini)
  const position = new THREE.Vector3();  // Assurer que `position` est défini
  const up = new THREE.Vector3(0, 1, 0); // Axe "up" de la caméra

  const handleIsoView = () => {
    setView('iso'); // Changer la vue

    // Calculer la distance et le centre de la boîte de délimitation
    const distance = bbox.isEmpty() ? 50 : calculateCameraDistance(bbox);
    const center = bbox.isEmpty() ? new THREE.Vector3() : bbox.getCenter(new THREE.Vector3());

    // Définir la position de la caméra pour la vue iso
    position.set(center.x + distance * 0.7, center.y + distance * 0.7, center.z + distance * 0.7);
    up.set(0, 1, 0); // L'axe "up" reste inchangé
  };
  
  const handleCommentSubmit = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();

    if (!viewerRef.current?.context || !commentPosition || !camera) {
      console.error("Missing required data for annotation");
      return;
    }

    // Vérifier que commentPosition est une instance de THREE.Vector3
    if (!(commentPosition instanceof THREE.Vector3)) {
      console.error("commentPosition is not a valid THREE.Vector3");
      return;
    }

    const target = new THREE.Vector3();
    controls?.getTarget(target);

    const newComment: Comment = {
      id: `comment-${Date.now()}`,
      type: selectedAnnotationType,
      text: selectedAnnotationType === 'cloud' ? '' : commentText, // Texte facultatif pour les nuages
      author: user?.name || "Unknown User",
      date: new Date(),
      position: commentPosition.clone(), // Maintenant sûr d'appeler clone()
      viewpoint: {
        position: [camera.position.x, camera.position.y, camera.position.z],
        target: [target.x, target.y, target.z],
        up: [camera.up.x, camera.up.y, camera.up.z],
      },
    };

    // Créer l'objet 3D de l'annotation
    const annotationObject = createAnnotationObject(newComment);

    // Ajouter l'objet à la scène
    viewerRef.current.context.getScene().add(annotationObject);

    // Mettre à jour l'état
    setComments((prev) => [...prev, newComment]);
    setCommentText(""); // Réinitialiser le texte du commentaire
    setCommentPosition(null); // Réinitialiser la position
  };
  const changeView = (viewName) => {
    // Votre logique pour changer la vue
    console.log("Changing view to:", viewName);
  };
  // Charger les annotations de l'utilisateur
  useEffect(() => {
    const loadUserAnnotations = async () => {
      if (!user) return;

      try {
        const response = await fetch(`/api/annotations?userId=${user.id}`);
        const annotations = await response.json();
        setComments(annotations);

        // Ajouter les objets 3D à la scène
        annotations.forEach((comment: Comment) => {
          const obj = createAnnotationObject(comment);
          viewerRef.current?.context.getScene().add(obj);
        });
      } catch (error) {
        console.error("Erreur de chargement", error);
      }
    };
    loadUserAnnotations();
  }, [user]);
  const toggleTodosTool = () => {
    if (activeTool === 'todos') {
      // Si déjà actif, désactiver
      setActiveTool(null);
    } else {
      // Sinon, activer
      setActiveTool('todos');
    }
  };
  const toggleTool = (tool: string) => {
    if (activeTool === tool) {
      // Si l'outil cliqué est déjà actif, le désactiver
      setActiveTool(null);
    } else {
      // Sinon, activer cet outil (désactivant tout autre outil)
      setActiveTool(tool);
    }
  };


  return (


    <div className="flex h-screen bg-gray-100">

      {/* Barre latérale gauche */}
      <div className="w-16 bg-white shadow-lg flex flex-col items-center py-4 gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleGoBack}
          className="w-full flex items-center justify-center gap-2 hover:bg-gray-100"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="sr-only">Retour</span>
        </Button>


        <Button
          variant={activeTool === 'section' ? "default" : "ghost"}
          size="icon"
          onClick={() => {
            setActiveTool(activeTool === 'section' ? null : 'section');
          }}
          title="Plan de coupe"
        >
          <Scissors className="h-5 w-5" />
        </Button>
        <Button
          variant={activeTool === 'measure' ? "default" : "ghost"}
          size="icon"
          onClick={() => {
            if (activeTool === 'measure') {
              // Si déjà actif, désactiver
              setActiveTool(null);
              setMeasurementMode('none');
            } else {
              // Sinon, activer l'outil de mesure
              setActiveTool('measure');
              setMeasurementMode('distance');
            }
          }}
          title="Mesurer"
        >
          <Ruler className="h-5 w-5" />
        </Button>

        <Button
          variant={activeTool === 'hide' ? "default" : "ghost"}
          size="icon"
          onClick={() => toggleTool('hide')}
          title="Masquer/Afficher"
        >
          <Eye className="h-5 w-5" />
        </Button>

        <Button
          variant={activeTool === 'todos' ? "default" : "ghost"}
          size="icon"
          onClick={toggleTodosTool}
          title="Notes"
          className="relative"
        >
          <ClipboardList className="h-5 w-5" />
          {todos.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
              {todos.length}
            </span>
          )}
        </Button>
        <Button
          variant={activeTool === 'comment' ? "default" : "ghost"}
          size="icon"
          onClick={() => toggleTool('comment')}
          title="Comment"
        >
          <MessageSquare className="h-5 w-5" />
        </Button>
        <Button
          variant={activeStyle === 'shaded' ? 'default' : 'ghost'}
          size="icon"
          onClick={() => setViewStyleMode('shaded')}
          title="Vue ombrée"
          className="relative"
        >
          <Sun className="h-5 w-5" />
        </Button>

        <Button
          variant={activeStyle === 'wireframe' ? 'default' : 'ghost'}
          size="icon"
          onClick={() => setViewStyleMode('wireframe')}
          title="Filaire"
          className="relative"
        >
          <SplitSquareHorizontal className="h-5 w-5" />
        </Button>

        <Button
          variant={activeStyle === 'hidden-line' ? 'default' : 'ghost'}
          size="icon"
          onClick={() => setViewStyleMode('hidden-line')}
          title="Lignes cachées"
          className="relative"
        >
          <Paintbrush className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={exportBCF}
          title="Exporter BCF"
        >
          <Download className="h-5 w-5" />
        </Button>
        <Button
  variant={activeTool === 'clashDetection' ? "default" : "ghost"}
  size="icon"
  onClick={() => {
    if (activeTool === 'clashDetection') {
      // Désactiver l'outil si déjà actif
      setActiveTool(null);
      // Nettoyer les visualisations de clash
      clearClashResults();
    } else {
      // Activer l'outil
      setActiveTool('clashDetection');
    }
  }}
  title="Détection de clash"
>
  <AlertTriangle className="h-5 w-5" />
</Button>
        {isIsolationActive && (
          <Button
            variant="destructive"
            size="icon"
            onClick={resetIsolation}
            title="Réinitialiser l'isolation"
          >
            <EyeOff className="h-5 w-5" />
          </Button>
        )}

      </div>
   
   
      {/* Zone principale du visualiseur */}
      <div className="flex-1 relative">
        <div
          ref={containerRef}
          className="absolute inset-0 bg-white"
          style={{ pointerEvents: loading ? 'none' : 'auto' }}
        />
<div className="absolute top-4 right-4 flex flex-col gap-3 z-20">
  {/* Bouton Iso View */}
  <Button
      variant="outline"
      size="sm"
      onClick={handleIsoView}
      className="aspect-square rounded-xl p-2 shadow-md hover:shadow-lg transition-all duration-300 flex items-center justify-center bg-white/10 backdrop-blur border border-white/20"
    >
      <Home className="h-5 w-5 text-gray-700" />
    </Button>


</div>


{/* Panneau de propriété flottant */}
  {isSidebarOpen && selectedElement && (
  <div 
    className="absolute top-4 right-4 bottom-4 w-72 bg-white rounded-lg shadow-xl flex flex-col z-10 border border-gray-200"
    style={{ maxHeight: 'calc(100% - 2rem)' }}
  >
    <PropertySidebar 
      viewer={viewerRef.current} 
      selectedElement={selectedElement} 
      modelID={selectedModelID} 
      onClose={() => setIsSidebarOpen(false)}
    />
    
  </div>
)}


        {/* Panneau Section */}
        {viewerRef.current && (
        <SectionTool
          viewer={viewerRef.current}
          containerRef={containerRef}
          isActive={activeTool === 'section'}
          onSectionCreated={(plane) => {
            console.log('Nouveau plan de coupe créé:', plane);
            // Vous pouvez faire des actions supplémentaires ici
          }}
        />
      )}
   
{activeTool === 'clashDetection' && (
  <div className="absolute top-0 right-0 w-80 bg-white shadow-lg">
    <div className="flex justify-between items-center p-2 bg-gray-100">
      <h3 className="font-medium">Détection de clash</h3>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          setActiveTool(null);
          clearClashResults();
        }}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
    
    {/* Panneau de sélection des types et tolérance */}
    <ClashTypeSelector
      onStartClashDetection={(type1, type2, tolerance) => 
        detectClashesBetweenTypes(type1, type2, tolerance)
      }
    />
    
    {/* Affichage des résultats */}
    {isClashDetectionRunning ? (
      <div className="p-4 flex justify-center items-center">
        <span className="animate-spin mr-2">
          <Loader2 className="h-5 w-5" />
        </span>
        Détection en cours...
      </div>
    ) : (
      <ClashDetectionPanel
        clashes={clashResults}
        onClashSelect={focusOnClash}
      />
    )}
  </div>
)}
       {/* Panneau Mesure */}
       {activeTool === 'measure' && (
  <div className="absolute bottom-20 left-4 bg-white p-4 rounded-lg shadow-lg">
    <div className="flex flex-col gap-2">
      <Button 
        variant={measurementMode === 'distance' ? 'default' : 'ghost'} 
        onClick={() => setMeasurementMode('distance')}
      >
        Distance simple
      </Button>
      <Button 
        variant={measurementMode === 'angle' ? 'default' : 'ghost'} 
        onClick={() => setMeasurementMode('angle')}
      >
        Mesure d'angle
      </Button>
      <Button 
        variant={measurementMode === 'perpendicular' ? 'default' : 'ghost'} 
        onClick={() => setMeasurementMode('perpendicular')}
      >
        Distance perpendiculaire
      </Button>
      <Button 
        variant="destructive" 
        onClick={handleClearMeasurements}
      >
        Effacer toutes les mesures
      </Button>
    </div>
  </div>
)}

      {/* Composant de mesure */}
      {viewerRef.current && (
    <MeasurementTool
    viewer={viewerRef.current}
    containerRef={containerRef}
    active={activeTool === 'measure'}
    measurementMode={measurementMode}
    onMeasurementComplete={handleMeasurementComplete}
    onClearMeasurements={handleClearMeasurements}
  />
      )}
        <TodoPanel
          todos={todos}
          onTodoSelect={restoreTodoView}
          onTodoDelete={handleTodoDelete}
          onTodoStatusChange={handleTodoStatusChange}
          onTodoAssign={handleTodoAssign}
        />
        {activeTool === 'todos' && (
          <div className="absolute right-20 top-0 h-screen w-96 bg-white shadow-lg flex flex-col">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold">Todos</h2>
              <Button
                size="sm"
                onClick={() => setIsCreatingTodo(true)}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                New Todo
              </Button>
            </div>

            <div className="flex-1 overflow-auto p-4">
              <div className="space-y-4">
                {todos.map((todo) => (
                  <div
                    key={todo._id}
                    className="bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">{todo.title}</h3>
                          <p className="text-sm text-gray-500 mt-1">{todo.description}</p>
                        </div>
                        <Badge
                          variant={
                            todo.status === 'open' ? 'destructive' :
                              todo.status === 'in-progress' ? 'default' :
                                'outline'
                          }
                          className="ml-2"
                        >
                          {todo.status}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-4 mt-4">
                        <div className="flex-1">
                          <Select
                            value={todo.assignedTo || ''}
                            onValueChange={(value) => handleTodoAssign(todo.id, value)}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Assign to..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user1">John Doe</SelectItem>
                              <SelectItem value="user2">Jane Smith</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => restoreTodoView(todo)}
                            title="View"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (!todo?._id && !todo?.id) {
                                console.error("Todo invalide :", todo);
                                return;
                              }
                              handleTodoDelete(todo._id?.toString() || todo.id);
                            }}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t flex items-center justify-between text-sm text-gray-500">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          {new Date(todo.createdAt).toLocaleDateString()}
                        </div>
                        <div className="flex items-center gap-2">
                          <User2 className="h-4 w-4" />
                          {todo.createdBy}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Modal de création de todo amélioré */}
        {isCreatingTodo && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-[480px] max-h-[90vh] overflow-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold">Create New Todo</h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsCreatingTodo(false)}
                  >
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
                      onChange={(e) => setNewTodo(prev => ({ ...prev, title: e.target.value }))}
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <textarea
                      id="description"
                      placeholder="Enter todo description"
                      value={newTodo.description}
                      onChange={(e) => setNewTodo(prev => ({ ...prev, description: e.target.value }))}
                      rows={4}
                    />
                  </div>

                  <div>
                    <Label htmlFor="priority">Priority</Label>
                    <Select
                      value={newTodo.priority}
                      onValueChange={(value: 'low' | 'medium' | 'high') =>
                        setNewTodo(prev => ({ ...prev, priority: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setIsCreatingTodo(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={createTodo}
                    disabled={!newTodo.title}
                  >
                    Create Todo
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
        {activeTool === 'comment' && (
          <div className="absolute bottom-20 left-4 bg-white p-4 rounded-lg shadow-lg w-96">
            <div className="mb-4">
              <h3 className="font-semibold mb-2">Create Annotation</h3>
              <div className="grid grid-cols-3 gap-2 mb-4">
                <AnnotationTypeButton
                  type="cloud"
                  label="Cloud"
                  icon={<Cloud className="h-4 w-4" />}
                  selected={selectedAnnotationType}
                  onSelect={setSelectedAnnotationType}
                />
                <AnnotationTypeButton
                  type="arrow"
                  label="Arrow"
                  icon={<ArrowRight className="h-4 w-4" />}
                  selected={selectedAnnotationType}
                  onSelect={setSelectedAnnotationType}
                />
                <AnnotationTypeButton
                  type="text"
                  label="Text"
                  icon={<Type className="h-4 w-4" />}
                  selected={selectedAnnotationType}
                  onSelect={setSelectedAnnotationType}
                />
              </div>

              {/* Afficher le champ de texte uniquement pour les annotations de type "text" */}
              {selectedAnnotationType === 'text' && (
                <textarea
                  placeholder="Add comment..."
                  className="w-full mb-3"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                />
              )}

              <div className="flex justify-between items-center mb-3">
                <div className="text-sm text-gray-500">
                  {commentPosition ? (
                    `Position: ${commentPosition.x?.toFixed(2)}, ${commentPosition.y?.toFixed(2)}, ${commentPosition.z?.toFixed(2)}`
                  ) : (
                    "Click on model to place marker"
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCommentPosition(null)}
                >
                  Reposition
                </Button>
              </div>

              {/* Afficher le bouton de soumission uniquement si une position est définie */}
              {commentPosition && (
                <Button
                  className="w-full"
                  onClick={handleCommentSubmit}
                >
                  <MessageSquare className="mr-2 h-4 w-4" />
                  {selectedAnnotationType === 'cloud' ? 'Place Cloud' : 'Create Annotation'}
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Panneau Masquer/Afficher pour les modèles chargés */}
        {activeTool === 'hide' && <ModelList />}
        {error && (
          <Alert className="absolute bottom-4 left-4 w-auto z-10">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>
    </div>

  );
}

function useFrame(arg0: () => void) {
  throw new Error("Function not implemented.");
} 