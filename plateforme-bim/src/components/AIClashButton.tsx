'use client';
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { AlertTriangle, Loader2 } from 'lucide-react';
import * as THREE from 'three';

export function AIClashButton({ viewer }) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleAIValidation = async () => {
    if (!viewer?.IFC?.selector) {
      console.error('Viewer ou sélecteur non initialisé');
      return;
    }
  
    try {
      setIsProcessing(true);
      
      // 1. Récupération des IDs sélectionnés avec vérification
      const selectedIds = viewer.IFC.selector.selectedIds ?? new Set();
      
      // 2. Vérification de la sélection avec optional chaining
      if (selectedIds?.size !== 2) {
        alert('Sélectionnez exactement 2 éléments !');
        return;
      }

      // 3. Conversion en array
      const idsArray = Array.from(selectedIds);

      // 4. Récupération des propriétés
      const elements = await Promise.all(
        idsArray.map(async (id) => {
          try {
            const props = await viewer.IFC.getProperties(0, id, true);
            const mesh = await viewer.IFC.loader.ifcManager.getMesh(id);
            const bbox = new THREE.Box3().setFromObject(mesh);
            
            return {
              id,
              type: props.type,
              bbox: {
                min: [bbox.min.x, bbox.min.y, bbox.min.z],
                max: [bbox.max.x, bbox.max.y, bbox.max.z]
              },
              properties: props
            };
          } catch (error) {
            console.error(`Erreur sur l'élément ${id}:`, error);
            return null;
          }
        })
      );

      // Filtrer les éléments null
      const validElements = elements.filter(Boolean);

      if (validElements.length !== 2) {
        alert('Erreur de chargement des éléments');
        return;
      }

      // 5. Appel à l'API IA
      const response = await fetch('/api/ai/clash-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          elements: validElements,
          projectId: viewer.projectId
        }),
      });

      // 6. Traitement des résultats
      const results = await response.json();
      
      viewer.context.clearHighlights();
      results.forEach(result => {
        viewer.IFC.selector.pickIfcItem(result.elementId);
        viewer.IFC.selector.highlightIfcItem(result.elementId);
      });

      setAiResults(results);

    } catch (error) {
      console.error('Erreur analyse IA:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Button 
      onClick={handleAIValidation}
      disabled={isProcessing}
    >
      {isProcessing ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <AlertTriangle className="mr-2 h-4 w-4" />
      )}
      Vérifier par IA
    </Button>
  );
}