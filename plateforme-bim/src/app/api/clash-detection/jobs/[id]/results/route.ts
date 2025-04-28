// src/app/api/clash-detection/jobs/[id]/results/route.ts
import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from "@/lib/mongodb";
import clashDetectionJob from '@/models/clashDetectionJob';
import clash from '@/models/clash';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectToDatabase();
    
    const jobId = params.id;
    if (!jobId) {
      return NextResponse.json(
        { error: 'ID du job manquant' },
        { status: 400 }
      );
    }
    
    // Rechercher le job de détection
    const job = await clashDetectionJob.findById(jobId);
    if (!job) {
      return NextResponse.json(
        { error: 'Job de détection non trouvé' },
        { status: 404 }
      );
    }
    
    // Récupérer les clashes associés à ce job
    const clashes = await clash.find({ job: jobId });
    
    return NextResponse.json(clashes);
  } catch (error) {
    console.error('Erreur lors de la récupération des résultats:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des résultats de détection' },
      { status: 500 }
    );
  }
}

// Service de détection de clash amélioré
// Fonctions utiles pour la géométrie 3D
const geometryUtils = {
  // Calcule si deux boîtes englobantes (bounding boxes) se croisent avec une tolérance donnée
  checkBoxIntersection: (box1, box2, tolerance = 0) => {
    // Vérifier si les boîtes se chevauchent sur chaque axe
    const overlapX = (box1.max.x + tolerance >= box2.min.x) && (box1.min.x - tolerance <= box2.max.x);
    const overlapY = (box1.max.y + tolerance >= box2.min.y) && (box1.min.y - tolerance <= box2.max.y);
    const overlapZ = (box1.max.z + tolerance >= box2.min.z) && (box1.min.z - tolerance <= box2.max.z);
    
    // Les boîtes se croisent si elles se chevauchent sur tous les axes
    return overlapX && overlapY && overlapZ;
  },
  
  // Calcule la distance minimale entre deux boîtes englobantes
  calculateBoxDistance: (box1, box2) => {
    // Calculer la distance sur chaque axe
    const dx = Math.max(0, Math.max(box1.min.x - box2.max.x, box2.min.x - box1.max.x));
    const dy = Math.max(0, Math.max(box1.min.y - box2.max.y, box2.min.y - box1.max.y));
    const dz = Math.max(0, Math.max(box1.min.z - box2.max.z, box2.min.z - box1.max.z));
    
    // Distance euclidienne
    return Math.sqrt(dx*dx + dy*dy + dz*dz);
  },
  
  // Calcule la pénétration (distance négative) entre deux boîtes qui se croisent
  calculatePenetration: (box1, box2) => {
    // Calculer la pénétration sur chaque axe
    const px = Math.min(box1.max.x - box2.min.x, box2.max.x - box1.min.x);
    const py = Math.min(box1.max.y - box2.min.y, box2.max.y - box1.min.y);
    const pz = Math.min(box1.max.z - box2.min.z, box2.max.z - box1.min.z);
    
    // Retourner la pénétration minimale (qui représente la distance minimale pour séparer les boîtes)
    return -Math.min(px, py, pz);
  }
};