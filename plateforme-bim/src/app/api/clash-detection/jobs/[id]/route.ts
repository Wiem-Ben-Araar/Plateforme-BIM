// src/app/api/clash-detection/jobs/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from "@/lib/mongodb";
import clashDetectionJob from '@/models/clashDetectionJob';

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

    const job = await clashDetectionJob.findById(jobId);
    if (!job) {
      return NextResponse.json(
        { error: 'Job de détection non trouvé' },
        { status: 404 }
      );
    }

    return NextResponse.json(job);
  } catch (error) {
    console.error('Erreur lors de la récupération du job:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du statut du job' },
      { status: 500 }
    );
  }
}