import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertCircle, ChevronRight, Eye, EyeOff, Loader2, Filter } from 'lucide-react';

// Types basés sur vos modèles Mongoose
interface ElementData {
  id: string;
  modelID: string;
  type: number;
  typeName: string;
  name: string;
}

interface Clash {
  _id: string;
  name: string;
  guid: string;
  description: string;
  status: 'open' | 'resolved' | 'reviewing';
  detectedAt: Date;
  resolvedAt?: Date;
  elementData: {
    element1: ElementData;
    element2: ElementData;
  };
  distance: number;
  severity: number;
  category: string;
  resolution?: string;
  snapshot?: string;
}

interface ClashDetectionJobParams {
  tolerance: number;
  types?: number[];
  limitResults?: number;
  automaticGrouping?: boolean;
}

// Types des props pour les composants
interface ClashTypeSelectorProps {
  onStartClashDetection: (files: string[], params: ClashDetectionJobParams) => void;
  projectId: string;
}

interface ClashDetectionPanelProps {
  clashes: Clash[];
  onClashSelect: (clash: Clash, shouldZoom?: boolean) => void;
  isLoading: boolean;
}

// Composant pour sélectionner les fichiers et paramètres de détection
export const ClashTypeSelector: React.FC<ClashTypeSelectorProps> = ({ onStartClashDetection, projectId }) => {
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [tolerance, setTolerance] = useState(0.05); // 5cm par défaut
  const [availableFiles, setAvailableFiles] = useState<any[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<number[]>([]);
  const [availableTypes, setAvailableTypes] = useState<{id: number, name: string}[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [limitResults, setLimitResults] = useState(100);
  const [automaticGrouping, setAutomaticGrouping] = useState(true);

  // Charger les fichiers du projet
  useEffect(() => {
    if (!projectId) return;
    
    const fetchFiles = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/projects/${projectId}/files`);
        if (!response.ok) throw new Error('Erreur lors du chargement des fichiers');
        const data = await response.json();
        setAvailableFiles(data);
      } catch (error) {
        console.error("Erreur lors du chargement des fichiers:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFiles();
  }, [projectId]);

  // Charger les types d'éléments disponibles
  useEffect(() => {
    const fetchElementTypes = async () => {
      setIsLoading(true);
      try {
        // Idéalement, cela devrait venir de votre API
        const types = [
          { id: 1, name: 'Structure' },
          { id: 2, name: 'Plomberie' },
          { id: 3, name: 'CVC' },
          { id: 4, name: 'Électricité' },
          { id: 5, name: 'Architecture' }
        ];
        setAvailableTypes(types);
      } catch (error) {
        console.error("Erreur lors du chargement des types:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchElementTypes();
  }, []);

  const handleToggleFile = (fileId: string) => {
    if (selectedFiles.includes(fileId)) {
      setSelectedFiles(selectedFiles.filter(id => id !== fileId));
    } else {
      setSelectedFiles([...selectedFiles, fileId]);
    }
  };

  const handleToggleType = (typeId: number) => {
    if (selectedTypes.includes(typeId)) {
      setSelectedTypes(selectedTypes.filter(id => id !== typeId));
    } else {
      setSelectedTypes([...selectedTypes, typeId]);
    }
  };

  const handleStartDetection = () => {
    const params: ClashDetectionJobParams = {
      tolerance,
      types: selectedTypes.length > 0 ? selectedTypes : undefined,
      limitResults,
      automaticGrouping
    };
    
    onStartClashDetection(selectedFiles, params);
  };

  return (
    <div className="p-4 space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Fichiers à analyser</label>
        {isLoading ? (
          <div className="flex items-center justify-center p-4">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            <span>Chargement...</span>
          </div>
        ) : (
          <div className="max-h-40 overflow-y-auto border rounded p-1">
            {availableFiles.map(file => (
              <div 
                key={file._id} 
                className="flex items-center p-1 hover:bg-gray-100"
              >
                <input 
                  type="checkbox"
                  checked={selectedFiles.includes(file._id)}
                  onChange={() => handleToggleFile(file._id)}
                  className="mr-2"
                />
                <span className="text-sm truncate">{file.name}</span>
              </div>
            ))}
            {availableFiles.length === 0 && (
              <div className="text-sm text-gray-500 p-2">
                Aucun fichier disponible
              </div>
            )}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Types d'éléments à vérifier</label>
        <div className="max-h-32 overflow-y-auto border rounded p-1">
          {availableTypes.map(type => (
            <div 
              key={type.id} 
              className="flex items-center p-1 hover:bg-gray-100"
            >
              <input 
                type="checkbox"
                checked={selectedTypes.includes(type.id)}
                onChange={() => handleToggleType(type.id)}
                className="mr-2"
              />
              <span className="text-sm">{type.name}</span>
            </div>
          ))}
        </div>
        <div className="text-xs text-gray-500">
          Laissez vide pour vérifier tous les types
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Tolérance: {tolerance.toFixed(3)} m</label>
        <div className="flex items-center space-x-2">
          <span className="text-xs">0,001</span>
          <input 
            type="range"
            min={0.001}
            max={0.5}
            step={0.001}
            value={tolerance}
            onChange={(e) => setTolerance(parseFloat(e.target.value))}
            className="w-full"
          />
          <span className="text-xs">0,5</span>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Limite de résultats</label>
        <Input 
          type="number" 
          min={1}
          value={limitResults}
          onChange={(e) => setLimitResults(parseInt(e.target.value))}
        />
      </div>

      <div className="flex items-center space-x-2 mt-2">
        <input 
          type="checkbox"
          checked={automaticGrouping}
          onChange={(e) => setAutomaticGrouping(e.target.checked)}
          id="grouping"
        />
        <label htmlFor="grouping" className="text-sm">
          Groupement automatique des conflits similaires
        </label>
      </div>

      <Button 
        className="w-full"
        disabled={selectedFiles.length === 0}
        onClick={handleStartDetection}
      >
        Démarrer la détection
      </Button>
    </div>
  );
};

// Composant pour afficher les résultats de la détection de clash
export const ClashDetectionPanel: React.FC<ClashDetectionPanelProps> = ({ clashes, onClashSelect, isLoading }) => {
  const [expandedClash, setExpandedClash] = useState<string | null>(null);
  const [filteredClashes, setFilteredClashes] = useState<Clash[]>([]);
  const [filter, setFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<number>(0);
  const [visibleClashes, setVisibleClashes] = useState<Record<string, boolean>>({});
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    // Initialiser tous les clashes comme visibles
    const initialVisibility: Record<string, boolean> = {};
    clashes.forEach(clash => {
      initialVisibility[clash._id] = true;
    });
    setVisibleClashes(initialVisibility);
  }, [clashes]);

  useEffect(() => {
    let filtered = [...clashes];
    
    // Filtrer par statut
    if (statusFilter !== 'all') {
      filtered = filtered.filter(clash => clash.status === statusFilter);
    }
    
    // Filtrer par catégorie
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(clash => clash.category === categoryFilter);
    }
    
    // Filtrer par sévérité
    if (severityFilter > 0) {
      filtered = filtered.filter(clash => clash.severity >= severityFilter);
    }
    
    // Filtrer par texte
    if (filter) {
      filtered = filtered.filter(clash => 
        clash.name.toLowerCase().includes(filter.toLowerCase()) ||
        clash.guid.toLowerCase().includes(filter.toLowerCase()) ||
        clash.description?.toLowerCase().includes(filter.toLowerCase()) ||
        clash.elementData.element1.name.toLowerCase().includes(filter.toLowerCase()) ||
        clash.elementData.element2.name.toLowerCase().includes(filter.toLowerCase())
      );
    }
    
    setFilteredClashes(filtered);
  }, [filter, statusFilter, categoryFilter, severityFilter, clashes]);

  const toggleClashVisibility = (clashId: string) => {
    setVisibleClashes(prev => ({
      ...prev,
      [clashId]: !prev[clashId]
    }));
  };

  const handleClashSelect = (clash: Clash) => {
    onClashSelect(clash);
    setExpandedClash(expandedClash === clash._id ? null : clash._id);
  };

  const getSeverityLabel = (severity: number) => {
    switch(severity) {
      case 1: return "Très faible";
      case 2: return "Faible";
      case 3: return "Moyenne";
      case 4: return "Élevée";
      case 5: return "Critique";
      default: return "Inconnue";
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch(status) {
      case 'open': return 'bg-red-100 text-red-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'reviewing': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch(status) {
      case 'open': return 'Ouvert';
      case 'resolved': return 'Résolu';
      case 'reviewing': return 'En revue';
      default: return status;
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 flex justify-center items-center">
        <span className="animate-spin mr-2">
          <Loader2 className="h-5 w-5" />
        </span>
        Détection en cours...
      </div>
    );
  }

  if (!clashes || clashes.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        Aucun conflit détecté ou lancez une détection
      </div>
    );
  }

  return (
    <div className="max-h-96 overflow-y-auto">
      <div className="p-2 sticky top-0 bg-white z-10 border-b">
        <div className="flex items-center justify-between mb-2">
          <Input
            type="text"
            placeholder="Rechercher..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full"
          />
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setShowFilters(!showFilters)}
            className="ml-2"
          >
            <Filter className="h-4 w-4" />
          </Button>
        </div>

        {showFilters && (
          <div className="space-y-2 pt-2 pb-2 border-t">
            <div>
              <label className="text-xs font-medium block">Statut</label>
              <select 
                className="text-xs p-1 border rounded w-full mt-1"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">Tous</option>
                <option value="open">Ouvert</option>
                <option value="resolved">Résolu</option>
                <option value="reviewing">En revue</option>
              </select>
            </div>
            
            <div>
              <label className="text-xs font-medium block">Catégorie</label>
              <select 
                className="text-xs p-1 border rounded w-full mt-1"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="all">Toutes</option>
                <option value="structural">Structure</option>
                <option value="MEP">MEP</option>
                <option value="architectural">Architecture</option>
                <option value="other">Autre</option>
              </select>
            </div>
            
            <div>
              <label className="text-xs font-medium block">Sévérité minimale</label>
              <select 
                className="text-xs p-1 border rounded w-full mt-1"
                value={severityFilter}
                onChange={(e) => setSeverityFilter(parseInt(e.target.value))}
              >
                <option value="0">Toutes</option>
                <option value="1">1 - Très faible</option>
                <option value="2">2 - Faible</option>
                <option value="3">3 - Moyenne</option>
                <option value="4">4 - Élevée</option>
                <option value="5">5 - Critique</option>
              </select>
            </div>
          </div>
        )}

        <div className="text-xs mt-1 text-gray-500">
          {filteredClashes.length} conflit(s) sur {clashes.length}
        </div>
      </div>

      <div className="divide-y">
        {filteredClashes.map(clash => (
          <div key={clash._id} className="p-2 hover:bg-gray-100">
            <div className="flex justify-between items-center cursor-pointer" onClick={() => handleClashSelect(clash)}>
              <div className="flex items-center space-x-2">
                <ChevronRight 
                  className={`h-4 w-4 transition-transform ${expandedClash === clash._id ? 'rotate-90' : ''}`}
                />
                <div className="font-medium">{clash.name}</div>
              </div>

              <div className="flex items-center space-x-2">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleClashVisibility(clash._id);
                  }}
                  className="p-1 rounded hover:bg-gray-200"
                >
                  {visibleClashes[clash._id] ? (
                    <Eye className="h-4 w-4" />
                  ) : (
                    <EyeOff className="h-4 w-4" />
                  )}
                </button>
                
                <div className={`rounded-full px-2 py-0.5 text-xs ${getStatusBadgeClass(clash.status)}`}>
                  {getStatusLabel(clash.status)}
                </div>
                
                <div className={`rounded-full px-2 py-0.5 text-xs ${clash.distance <= 0 ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                  {clash.distance <= 0 ? 'Intersection' : `${clash.distance.toFixed(3)}m`}
                </div>
              </div>
            </div>

            {expandedClash === clash._id && (
              <div className="mt-2 ml-6 text-sm space-y-1 bg-gray-50 p-2 rounded">
                <div className="flex justify-between">
                  <span className="font-medium">ID:</span>
                  <span className="text-gray-700">{clash.guid}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="font-medium">Détecté le:</span>
                  <span className="text-gray-700">{new Date(clash.detectedAt).toLocaleDateString()}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="font-medium">Sévérité:</span>
                  <span className="text-gray-700">{getSeverityLabel(clash.severity)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="font-medium">Catégorie:</span>
                  <span className="text-gray-700">{clash.category}</span>
                </div>
                
                <div className="pt-1 border-t mt-2">
                  <span className="font-medium">Élément 1:</span>
                  <div className="ml-2 mt-1">
                    <div><span className="text-xs font-medium">Nom:</span> {clash.elementData.element1.name}</div>
                    <div><span className="text-xs font-medium">Type:</span> {clash.elementData.element1.typeName}</div>
                    <div><span className="text-xs font-medium">ID:</span> {clash.elementData.element1.id}</div>
                  </div>
                </div>
                
                <div className="pt-1">
                  <span className="font-medium">Élément 2:</span>
                  <div className="ml-2 mt-1">
                    <div><span className="text-xs font-medium">Nom:</span> {clash.elementData.element2.name}</div>
                    <div><span className="text-xs font-medium">Type:</span> {clash.elementData.element2.typeName}</div>
                    <div><span className="text-xs font-medium">ID:</span> {clash.elementData.element2.id}</div>
                  </div>
                </div>
                
                {clash.description && (
                  <div className="pt-1">
                    <span className="font-medium">Description:</span>
                    <div className="ml-2 mt-1 text-gray-700">{clash.description}</div>
                  </div>
                )}
                
                {clash.resolution && clash.status === 'resolved' && (
                  <div className="pt-1">
                    <span className="font-medium">Résolution:</span>
                    <div className="ml-2 mt-1 text-gray-700">{clash.resolution}</div>
                  </div>
                )}
                
                <div className="flex space-x-2 pt-2">
                  <Button 
                    size="sm" 
                    onClick={() => onClashSelect(clash, true)}
                  >
                    Zoomer
                  </Button>
                  
                  {clash.status !== 'resolved' && (
                    <Button 
                      size="sm"
                      variant="outline"
                      onClick={() => window.location.href = `/clashes/${clash._id}/edit`}
                    >
                      Modifier
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// Service pour gérer les opérations de détection de clash
export const clashDetectionService = {
  // Créer un nouveau job de détection de clash
  async createJob(projectId: string, files: string[], parameters: ClashDetectionJobParams) {
    try {
      const response = await fetch('/api/clash-detection/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          project: projectId,
          files,
          parameters
        }),
      });

      if (!response.ok) throw new Error('Erreur lors de la création du job de détection');
      return await response.json();
    } catch (error) {
      console.error("Erreur lors de la création du job de détection:", error);
      throw error;
    }
  },
  
  // Récupérer le statut d'un job de détection
  async getJobStatus(jobId: string) {
    try {
      const response = await fetch(`/api/clash-detection/jobs/${jobId}`);
      if (!response.ok) throw new Error('Erreur lors de la récupération du statut du job');
      return await response.json();
    } catch (error) {
      console.error("Erreur lors de la récupération du statut du job:", error);
      throw error;
    }
  },
  
  // Récupérer les résultats de clash pour un job
  async getClashResults(jobId: string) {
    try {
      const response = await fetch(`/api/clash-detection/jobs/${jobId}/results`);
      if (!response.ok) throw new Error('Erreur lors de la récupération des résultats');
      return await response.json();
    } catch (error) {
      console.error("Erreur lors de la récupération des résultats:", error);
      throw error;
    }
  },
  
  // Récupérer tous les clashes pour un projet
  async getProjectClashes(projectId: string) {
    try {
      const response = await fetch(`/api/projects/${projectId}/clashes`);
      if (!response.ok) throw new Error('Erreur lors de la récupération des clashes du projet');
      return await response.json();
    } catch (error) {
      console.error("Erreur lors de la récupération des clashes du projet:", error);
      throw error;
    }
  },
  
  // Mettre à jour le statut d'un clash
  async updateClashStatus(clashId: string, status: string, resolution?: string) {
    try {
      const response = await fetch(`/api/clashes/${clashId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status,
          resolution,
          resolvedAt: status === 'resolved' ? new Date() : undefined
        }),
      });

      if (!response.ok) throw new Error('Erreur lors de la mise à jour du statut du clash');
      return await response.json();
    } catch (error) {
      console.error("Erreur lors de la mise à jour du statut du clash:", error);
      throw error;
    }
  }
};

// Fonction pour visualiser un clash dans le viewer 3D
export const visualizeClash = (viewer: IfcViewerAPI, clash: Clash) => {
    // Highlight les éléments en conflit
    const { element1, element2 } = clash.elementData;
    viewer.IFC.selector.pickIfcItemsByID(
      [element1.modelID], 
      [parseInt(element1.id)], 
      true, 
      new THREE.Color(0xff0000)
    );
    viewer.IFC.selector.pickIfcItemsByID(
      [element2.modelID], 
      [parseInt(element2.id)], 
      true, 
      new THREE.Color(0x00ff00)
    );
  };
  
  export const focusOnClash = (viewer: IfcViewerAPI, clash: Clash, shouldZoom = false) => {
    const elementId = parseInt(clash.elementData.element1.id);
    const modelID = clash.elementData.element1.modelID;
    
    viewer.IFC.loader.ifcManager.getSpatialStructure(modelID, (structure) => {
      const element = findElementById(structure, elementId);
      if (element && element.bbox) {
        const center = element.bbox.getCenter(new THREE.Vector3());
        viewer.context.ifcCamera.cameraControls.fitToSphere(
          element.bbox,
          shouldZoom,
          500
        );
      }
    });
  };



// Fonction pour nettoyer les visualisations de clash
export const clearClashResults = (viewer: any) => {
  // Cette fonction devrait supprimer toutes les visualisations de clash du viewer
  // Exemple:
  // viewer.clearHighlights();
  // viewer.resetView();
  
  console.log("Nettoyage des visualisations de clash");
};
