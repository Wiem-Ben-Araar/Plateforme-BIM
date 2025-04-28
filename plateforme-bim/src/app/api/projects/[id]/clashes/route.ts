// src/app/api/projects/[id]/clashes/route.ts
import clash from '@/models/clash';
import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from "@/lib/mongodb";


export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectToDatabase();
    
    const projectId = params.id;
    if (!projectId) {
      return NextResponse.json(
        { error: 'ID de projet manquant' },
        { status: 400 }
      );
    }

    // Récupérer tous les clashes associés à ce projet
    const clashes = await clash.find({ project: projectId })
      .sort({ detectedAt: -1 }) // Tri par date de détection (plus récents d'abord)
      .limit(500); // Limitation pour éviter de surcharger l'API

    return NextResponse.json(clashes);
  } catch (error) {
    console.error('Erreur lors de la récupération des clashes:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des clashes' },
      { status: 500 }
    );
  }
}