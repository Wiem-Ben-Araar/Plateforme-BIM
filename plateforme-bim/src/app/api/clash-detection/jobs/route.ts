// src/app/api/clash-detection/jobs/route.ts
import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from "@/lib/mongodb";
import clashDetectionJob from '@/models/clashDetectionJob';

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    
    // Optionnel: vérifier l'authentification
    // const session = await auth();
    // if (!session?.user) {
    //   return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    // }

    const data = await request.json();
    const { project, files, parameters } = data;

    if (!project || !files || !Array.isArray(files) || files.length === 0) {
      return NextResponse.json(
        { error: 'Données invalides pour la création du job' },
        { status: 400 }
      );
    }

    // Créer un nouveau job de détection de clash
    const job = await clashDetectionJob.create({
      project,
      files,
      parameters,
      status: 'pending',
      createdAt: new Date(),
      // createdBy: session?.user?.id, // Si vous avez l'authentification
    });

    // Ici, vous pourriez déclencher un processus en arrière-plan pour exécuter le job
    // Par exemple, via une queue de tâches ou un webhook à un service externe
    
    // Pour l'instant, simulons juste que le job est en cours
    setTimeout(async () => {
      await clashDetectionJob.findByIdAndUpdate(job._id, { status: 'processing' });
      
      // Vous pourriez ensuite implémenter la logique réelle de détection de clash ici
      // ou l'externaliser vers un worker/service dédié
    }, 100);

    return NextResponse.json(job);
  } catch (error) {
    console.error('Erreur lors de la création du job de détection:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création du job de détection' },
      { status: 500 }
    );
  }
}