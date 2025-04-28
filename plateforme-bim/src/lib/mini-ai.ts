import { pipeline } from '@xenova/transformers';

const clashClassifier = await pipeline('text-classification', 
  'Xenova/distilbert-base-uncased-finetuned-sst-2-english');

export async function runMiniAI(data) {
  // 1. Préparation des features
  const features = `Type1:${data.types[0]}, Type2:${data.types[1]}, ` +
                   `Dist:${calculateDistance(data.bbox1, data.bbox2)}`;

  // 2. Classification avec modèle léger
  const result = await clashClassifier(features);

  // 3. Réponse formatée
  return {
    isClash: result[0].label === 'CLASH',
    confidence: result[0].score,
    severity: Math.floor(result[0].score * 5)
  };
}