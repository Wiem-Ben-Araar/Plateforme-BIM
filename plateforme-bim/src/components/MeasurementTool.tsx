// src/components/MeasurementTool.tsx
import { useEffect, useState, useRef } from 'react';
import * as THREE from 'three';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer';

export type MeasurementMode = 'none' | 'distance' | 'perpendicular' | 'angle';

export interface Measurement {
  id: string;
  points: THREE.Vector3[];
  distance?: number;
  angle?: number;
  line?: THREE.Line;
  labels: CSS2DObject[];
}

interface MeasurementToolProps {
  viewer: any; // Référence au viewer IFC.js
  containerRef: React.RefObject<HTMLDivElement>;
  active: boolean;
  measurementMode: MeasurementMode;
  onMeasurementComplete?: (measurement: Measurement) => void;
  onClearMeasurements?: () => void;
}

export const MeasurementTool: React.FC<MeasurementToolProps> = ({
  viewer,
  containerRef,
  active,
  measurementMode,
  onMeasurementComplete,
  onClearMeasurements,
}) => {
  const [currentPoints, setCurrentPoints] = useState<THREE.Vector3[]>([]);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const previewLineRef = useRef<THREE.Line | null>(null);
  const snapMarkerRef = useRef<THREE.Mesh | null>(null);
  const snapDistanceThreshold = 0.5; // Distance en mètres pour le snap
  const originalClickHandlerRef = useRef<((event: MouseEvent) => void) | null>(null);
  
  // Créer un label pour les mesures
  const createLabel = (text: string, position: THREE.Vector3) => {
    const labelDiv = document.createElement('div');
    labelDiv.className = 'measurement-label';
    labelDiv.textContent = text;
    labelDiv.style.color = 'red';
    labelDiv.style.fontSize = '14px';
    const labelObj = new CSS2DObject(labelDiv);
    labelObj.position.copy(position);
    return labelObj;
  };

  // Créer un marqueur visuel pour le snap
  const createSnapMarker = (position: THREE.Vector3) => {
    if (snapMarkerRef.current) {
      viewer.context.getScene().remove(snapMarkerRef.current);
    }
    
    const geometry = new THREE.SphereGeometry(0.05, 16, 16);
    const material = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    const sphere = new THREE.Mesh(geometry, material);
    sphere.position.copy(position);
    viewer.context.getScene().add(sphere);
    snapMarkerRef.current = sphere;
    
    return sphere;
  };

  // Trouver le point le plus proche pour le snap
  const findSnapPoint = (point: THREE.Vector3): THREE.Vector3 | null => {
    // 1. Vérifier le snap aux points existants des mesures
    for (const measurement of measurements) {
      for (const existingPoint of measurement.points) {
        if (existingPoint.distanceTo(point) < snapDistanceThreshold) {
          return existingPoint.clone();
        }
      }
    }
    
    return null; // Retourne null si aucun snap n'est trouvé
  };

  // Obtenir le point d'intersection avec le modèle via raycasting
  const getIntersectionPoint = (event: MouseEvent): THREE.Vector3 | null => {
    const container = containerRef.current;
    if (!container || !viewer) return null;
    
    const rect = container.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );
    
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, viewer.context.getCamera());

    // Collect all visible IFC meshes
    const ifcMeshes: THREE.Mesh[] = [];
    
    if (viewer.IFC?.loader?.ifcManager?.state?.models) {
      Object.values(viewer.IFC.loader.ifcManager.state.models).forEach((model: any) => {
        if (model.mesh) {
          ifcMeshes.push(model.mesh);
        }
      });
    }
    
    if (ifcMeshes.length > 0) {
      const intersects = raycaster.intersectObjects(ifcMeshes, true);
      if (intersects.length > 0) {
        return intersects[0].point.clone();
      }
    }
    
    // Fallback: intersection avec un plan horizontal (y = 0)
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const intersectionPoint = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(groundPlane, intersectionPoint)) {
      return intersectionPoint;
    }
    
    return null;
  };

  // Gestionnaire de clic pour les mesures
  const handleMeasureClick = (event: MouseEvent) => {
    if (!active || measurementMode === 'none' || !viewer) return;
    
    event.preventDefault(); // Empêcher le comportement par défaut
    event.stopPropagation(); // Empêcher la propagation aux autres gestionnaires
    
    let point = getIntersectionPoint(event);
    if (!point) return;
    
    // Vérifier s'il y a un point de snap à proximité
    const snapPoint = findSnapPoint(point);
    if (snapPoint) {
      point = snapPoint;
    }

    // Mettre à jour les points de la mesure actuelle
    setCurrentPoints(prev => {
      const newPoints = [...prev, point];
      
      // Mode "distance" : 2 clics
      if (measurementMode === 'distance' && newPoints.length === 2) {
        finalizeMeasurement(newPoints, 'distance');
        return [];
      }

      // Mode "angle" : 3 clics
      if (measurementMode === 'angle' && newPoints.length === 3) {
        finalizeMeasurement(newPoints, 'angle');
        return [];
      }

      // Mode "perpendicular" : 3 clics
      if (measurementMode === 'perpendicular' && newPoints.length === 3) {
        finalizeMeasurement(newPoints, 'perpendicular');
        return [];
      }
      
      return newPoints;
    });
  };

  // Finaliser une mesure (séparé pour éviter les setState durant le rendu)
  const finalizeMeasurement = (points: THREE.Vector3[], mode: MeasurementMode) => {
    if (!viewer) return;
    
    let distance, angle;
    let line: THREE.Line | undefined;
    const labels: CSS2DObject[] = [];
    
    if (mode === 'distance') {
      distance = points[0].distanceTo(points[1]);
      const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
      const lineMaterial = new THREE.LineBasicMaterial({ color: 0xff0000 });
      line = new THREE.Line(lineGeometry, lineMaterial);
      const midPoint = new THREE.Vector3().addVectors(points[0], points[1]).multiplyScalar(0.5);
      const label = createLabel(`${distance.toFixed(2)} m`, midPoint);
      viewer.context.getScene().add(line);
      viewer.context.getScene().add(label);
      labels.push(label);
    } 
    else if (mode === 'angle') {
      const v1 = new THREE.Vector3().subVectors(points[0], points[1]);
      const v2 = new THREE.Vector3().subVectors(points[2], points[1]);
      angle = v1.angleTo(v2);
      const angleDeg = THREE.MathUtils.radToDeg(angle);
      
      const line1 = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([points[1], points[0]]),
        new THREE.LineBasicMaterial({ color: 0x0000ff })
      );
      const line2 = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([points[1], points[2]]),
        new THREE.LineBasicMaterial({ color: 0x0000ff })
      );
      
      const label = createLabel(`${angleDeg.toFixed(2)}°`, points[1]);
      viewer.context.getScene().add(line1);
      viewer.context.getScene().add(line2);
      viewer.context.getScene().add(label);
      labels.push(label);
      line = line1; // Gardons une référence au moins à une ligne
    } 
    else if (mode === 'perpendicular') {
      const line3D = new THREE.Line3(points[0], points[1]);
      const closestPoint = new THREE.Vector3();
      line3D.closestPointToPoint(points[2], true, closestPoint);
      distance = points[2].distanceTo(closestPoint);
      
      // Créer une ligne pour montrer la distance de base
      const baseLineGeometry = new THREE.BufferGeometry().setFromPoints([points[0], points[1]]);
      const baseLineMaterial = new THREE.LineBasicMaterial({ color: 0x0000ff });
      const baseLine = new THREE.Line(baseLineGeometry, baseLineMaterial);
      
      // Créer la ligne perpendiculaire
      const perpLineGeometry = new THREE.BufferGeometry().setFromPoints([points[2], closestPoint]);
      const perpLineMaterial = new THREE.LineDashedMaterial({ 
        color: 0x00ffff, 
        dashSize: 0.1, 
        gapSize: 0.05 
      });
      line = new THREE.Line(perpLineGeometry, perpLineMaterial);
      if (line.computeLineDistances) {
        line.computeLineDistances();
      }
      
      const label = createLabel(`${distance.toFixed(2)} m`, new THREE.Vector3().addVectors(points[2], closestPoint).multiplyScalar(0.5));
      viewer.context.getScene().add(baseLine);
      viewer.context.getScene().add(line);
      viewer.context.getScene().add(label);
      labels.push(label);
    }
    
    const newMeasurement = {
      id: Math.random().toString(),
      points,
      distance,
      angle,
      line,
      labels
    };
    
    setMeasurements(prevMeas => [...prevMeas, newMeasurement]);
    
    if (onMeasurementComplete) {
      onMeasurementComplete(newMeasurement);
    }
  };

  // Effet pour gérer les changements de mode/activité
  useEffect(() => {
    // Quand le composant est activé, sauvegarder le gestionnaire de clic original
    if (active && measurementMode !== 'none' && containerRef.current) {
      // Sauvegarder le gestionnaire de clic existant
      originalClickHandlerRef.current = containerRef.current.onclick as ((event: MouseEvent) => void) | null;
      
      // Remplacer par notre gestionnaire de mesure
      containerRef.current.onclick = handleMeasureClick as any;
      
      // Réinitialiser les points de mesure en cours
      setCurrentPoints([]);
    } else if (!active && containerRef.current && originalClickHandlerRef.current) {
      // Restaurer le gestionnaire de clic original quand on désactive l'outil
      containerRef.current.onclick = originalClickHandlerRef.current;
      originalClickHandlerRef.current = null;
    }
    
    // Nettoyer les indicateurs visuels temporaires
    return () => {
      if (viewer && previewLineRef.current) {
        viewer.context.getScene().remove(previewLineRef.current);
        previewLineRef.current = null;
      }
      if (viewer && snapMarkerRef.current) {
        viewer.context.getScene().remove(snapMarkerRef.current);
        snapMarkerRef.current = null;
      }
    };
  }, [active, measurementMode]);

  // Effet pour la prévisualisation lors du déplacement de la souris
  useEffect(() => {
    if (!viewer || measurementMode === 'none' || currentPoints.length === 0 || !active || !containerRef.current) {
      return;
    }

    const onMouseMove = (event: MouseEvent) => {
      let point = getIntersectionPoint(event);
      if (!point) return;
      
      // Vérifier s'il y a un point de snap à proximité
      const snapPoint = findSnapPoint(point);
      if (snapPoint) {
        point = snapPoint;
        createSnapMarker(snapPoint);
      } else if (snapMarkerRef.current) {
        viewer.context.getScene().remove(snapMarkerRef.current);
        snapMarkerRef.current = null;
      }

      // Mise à jour de la ligne de prévisualisation
      if (!previewLineRef.current) {
        const lineGeometry = new THREE.BufferGeometry().setFromPoints([currentPoints[0], point]);
        const lineMaterial = new THREE.LineDashedMaterial({ 
          color: 0x00ff00, 
          dashSize: 0.1, 
          gapSize: 0.05 
        });
        previewLineRef.current = new THREE.Line(lineGeometry, lineMaterial);
        if (previewLineRef.current.computeLineDistances) {
          previewLineRef.current.computeLineDistances();
        }
        viewer.context.getScene().add(previewLineRef.current);
      } else {
        const pointsArray = [currentPoints[0], point];
        previewLineRef.current.geometry.setFromPoints(pointsArray);
        previewLineRef.current.geometry.attributes.position.needsUpdate = true;
        if (previewLineRef.current.computeLineDistances) {
          previewLineRef.current.computeLineDistances();
        }
      }
    };

    containerRef.current.addEventListener('mousemove', onMouseMove);
    
    return () => {
      if (containerRef.current) {
        containerRef.current.removeEventListener('mousemove', onMouseMove);
      }
      if (viewer && previewLineRef.current) {
        viewer.context.getScene().remove(previewLineRef.current);
        previewLineRef.current = null;
      }
      if (viewer && snapMarkerRef.current) {
        viewer.context.getScene().remove(snapMarkerRef.current);
        snapMarkerRef.current = null;
      }
    };
  }, [measurementMode, currentPoints, active]);

  // Fonction pour supprimer toutes les mesures
  const clearAllMeasurements = () => {
    if (viewer) {
      const scene = viewer.context.getScene();
      measurements.forEach(m => {
        if (m.line) scene.remove(m.line);
        m.labels.forEach(label => scene.remove(label));
      });
      setMeasurements([]);
      setCurrentPoints([]);
      if (onClearMeasurements) {
        onClearMeasurements();
      }
    }
  };

  // Effet pour nettoyer lorsque le composant est démonté
  useEffect(() => {
    return () => {
      // Restaurer le gestionnaire de clic original si nécessaire
      if (containerRef.current && originalClickHandlerRef.current) {
        containerRef.current.onclick = originalClickHandlerRef.current;
      }
      // Nettoyer les mesures si nécessaire
      clearAllMeasurements();
    };
  }, []);

  // Effet pour appeler clearAllMeasurements lorsque l'outil est désactivé
  useEffect(() => {
    if (!active && measurements.length > 0) {
      // Nous ne nettoyons pas automatiquement - cela serait fait par le parent via onClearMeasurements
    }
  }, [active]);

  // Ce composant n'a pas de rendu propre
  return null;
};