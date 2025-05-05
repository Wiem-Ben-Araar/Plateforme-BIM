import { GridFsStorage } from 'multer-gridfs-storage';
import multer from 'multer';
import mongoose from 'mongoose';
import { NextResponse } from 'next/server';
import connectToDatabase from './mongodb';

// Initialisez la connexion au début
let _db;
let _gfs;
let _bucket;

// Cette fonction garantit que la connexion est établie
export async function getGridFSBucket() {
  if (!_bucket) {
    await connectToDatabase();
    _db = mongoose.connection.db;
    _bucket = new mongoose.mongo.GridFSBucket(_db, { bucketName: 'uploads' });
  }
  return _bucket;
}

// Cette fonction renvoie l'instance GridFS pour d'autres opérations
export async function getGridFS() {
  if (!_gfs) {
    const Grid = require('gridfs-stream');
    await connectToDatabase();
    _db = mongoose.connection.db;
    _gfs = Grid(_db, mongoose.mongo);
    _gfs.collection('uploads');
  }
  return _gfs;
}

// Configuration de multer et multer-gridfs-storage pour Next.js API routes
const storage = new GridFsStorage({
  url: process.env.MONGODB_URI,
  options: { useNewUrlParser: true, useUnifiedTopology: true },
  file: (req, file) => {
    return new Promise((resolve, reject) => {
      // Créer un nom de fichier unique
      const filename = `${Date.now()}-${file.originalname}`;
      
      const fileInfo = {
        filename: filename,
        bucketName: 'uploads',
        metadata: {
          projectId: req.body.projectId,
          uploadedBy: req.session?.user?.id,
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size
        }
      };
      
      resolve(fileInfo);
    });
  }
});

// Upload middleware pour multer
export const uploadMiddleware = multer({ 
  storage,
  limits: { fileSize: 50 * 1024 * 1024 } // Limite à 50MB
}).array('file');

// Wrapper pour utiliser multer dans les API routes de Next.js
export function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
}