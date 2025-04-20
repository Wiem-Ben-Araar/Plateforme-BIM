import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Annotation from '@/models/annotation';
import connectDB from '@/lib/mongoose';

// Connexion à la base de données
connectDB();

// Types de requête
type CreateAnnotationRequest = {
  type: 'cloud' | 'arrow' | 'text';
  title: string;
  description?: string;
  position: { x: number; y: number; z: number };
  viewpoint: {
    camera_view_point: { x: number; y: number; z: number };
    camera_direction: { x: number; y: number; z: number };
    camera_up_vector: { x: number; y: number; z: number };
    field_of_view: number;
  };
  selectedElements: string[];
  project: string;
};

type UpdateAnnotationRequest = {
  status?: 'open' | 'in-progress' | 'resolved';
  priority?: 'low' | 'medium' | 'high';
  assignedTo?: string;
};

// GET - Récupérer les annotations
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    const annotations = await Annotation.findByProject(projectId);
    return NextResponse.json(annotations);
  } catch (error) {
    console.error('Error fetching annotations:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST - Créer une nouvelle annotation
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body: CreateAnnotationRequest = await request.json();
    const { type, title, position, viewpoint, selectedElements, project } = body;

    const newAnnotation = new Annotation({
      guid: crypto.randomUUID(),
      type,
      title,
      position,
      viewpoint: {
        guid: crypto.randomUUID(),
        perspective_camera: viewpoint,
        components: {
          selection: selectedElements,
          visibility: {
            default_visibility: true,
            exceptions: [],
            view_setup_hints: {
              spaces_visible: true,
              space_boundaries_visible: true,
              openings_visible: true
            }
          }
        }
      },
      selectedElements,
      project,
      author: session.user.id
    });

    await newAnnotation.save();
    return NextResponse.json(newAnnotation, { status: 201 });
  } catch (error) {
    console.error('Error creating annotation:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// PUT - Mettre à jour une annotation
export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const annotationId = searchParams.get('id');
    const body: UpdateAnnotationRequest = await request.json();

    if (!annotationId) {
      return NextResponse.json({ error: 'Annotation ID is required' }, { status: 400 });
    }

    const updatedAnnotation = await Annotation.findByIdAndUpdate(
      annotationId,
      { $set: body },
      { new: true }
    );

    if (!updatedAnnotation) {
      return NextResponse.json({ error: 'Annotation not found' }, { status: 404 });
    }

    return NextResponse.json(updatedAnnotation);
  } catch (error) {
    console.error('Error updating annotation:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE - Supprimer une annotation
export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const annotationId = searchParams.get('id');

    if (!annotationId) {
      return NextResponse.json({ error: 'Annotation ID is required' }, { status: 400 });
    }

    await Annotation.findByIdAndDelete(annotationId);
    return NextResponse.json({ success: true }, { status: 204 });
  } catch (error) {
    console.error('Error deleting annotation:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}