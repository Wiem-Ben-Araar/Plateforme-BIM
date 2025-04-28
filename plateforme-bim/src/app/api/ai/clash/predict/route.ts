import { NextResponse } from 'next/server';
import { runMiniAI } from '@/lib/mini-ai';

export async function POST(req: Request) {
  const { bbox1, bbox2, elementTypes } = await req.json();
  
  // Appel de l'IA
  const result = await runMiniAI({
    bbox1, 
    bbox2,
    types: elementTypes
  });

  return NextResponse.json(result);
}