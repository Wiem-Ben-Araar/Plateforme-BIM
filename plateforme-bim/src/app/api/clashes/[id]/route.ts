// src/app/api/clashes/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from "@/lib/mongodb";
import clash from '@/models/clash';


export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectToDatabase();
    
    const clashId = params.id;
    if (!clashId) {
      return NextResponse.json(
        { error: 'ID du clash manquant' },
        { status: 400 }
      );
    }

    const data = await request.json();
    const { status, resolution, resolvedAt } = data;

    // Validation des données
    if (!status || !['open', 'resolved', 'reviewing'].includes(status)) {
      return NextResponse.json(
        { error: 'Statut invalide' },
        { status: 400 }
      );
    }

    // Si le statut est 'resolved', une résolution devrait être fournie
    if (status === 'resolved' && !resolution) {
      return NextResponse.json(
        { error: 'Une résolution est requise pour un clash résolu' },
        { status: 400 }
      );
    }

    // Mettre à jour le clash
    const updatedClash = await clash.findByIdAndUpdate(
      clashId,
      { status, resolution, resolvedAt },
      { new: true } // Retourne le document mis à jour au lieu de l'ancien
    );

    if (!updatedClash) {
      return NextResponse.json(
        { error: 'Clash non trouvé' },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedClash);
  } catch (error) {
    console.error('Erreur lors de la mise à jour du clash:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour du clash' },
      { status: 500 }
    );
  }
}