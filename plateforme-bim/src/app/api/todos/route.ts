import { NextResponse } from 'next/server';
import Todo from '@/models/todo';
import Viewpoint from '@/models/viewpoint';
import mongoose from 'mongoose';
import connectToDatabase from '@/lib/mongodb';

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');

    // Si projectId est fourni, filtrez
    const query = projectId ? { 
      project: new mongoose.Types.ObjectId(projectId) 
    } : {};

    // Assurez-vous que viewpoint est complètement peuplé
    const todos = await Todo.find(query)
      .populate({
        path: 'viewpoint',
        model: 'Viewpoint'
      });
      
    return NextResponse.json(todos);

  } catch (error) {
    console.error("Erreur GET todos:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    
    // Get data from request body
    const todoData = await request.json();
    
    // Log the todoData to debug
    console.log('Todo data received:', JSON.stringify(todoData, null, 2));
    
    let viewpointId = null;
    
    // Vérification et traitement du viewpoint
    if (todoData.viewpoint && typeof todoData.viewpoint === 'object') {
      console.log('Viewpoint data:', JSON.stringify(todoData.viewpoint, null, 2));
      
      // Vérifier si les propriétés requises existent
      const hasRequiredFields = 
        todoData.viewpoint.camera_view_point && 
        todoData.viewpoint.camera_direction && 
        todoData.viewpoint.camera_up_vector &&
        todoData.viewpoint.field_of_view &&
        todoData.viewpoint.project;
      
      if (hasRequiredFields) {
        try {
          // Assurez-vous que le GUID est présent ou générez-en un
          if (!todoData.viewpoint.guid) {
            todoData.viewpoint.guid = `viewpoint-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
          }
          
          // Créer une copie du viewpoint pour éviter les modifications directes
          const viewpointData = { ...todoData.viewpoint };
          
          // Vérifier si le projet est un ID valide
          try {
            if (typeof viewpointData.project === 'string') {
              viewpointData.project = new mongoose.Types.ObjectId(viewpointData.project);
            }
          } catch (err) {
            console.error("Erreur lors de la conversion de project en ObjectId:", err);
            // Continuer avec la chaîne si la conversion échoue
          }
          
          // createdBy reste une chaîne, pas besoin de conversion en ObjectId
          
          // Créer et sauvegarder le viewpoint
          const viewpoint = new Viewpoint(viewpointData);
          const savedViewpoint = await viewpoint.save();
          viewpointId = savedViewpoint._id;
          
          console.log('Viewpoint saved with ID:', viewpointId);
        } catch (viewpointError) {
          console.error('Error saving viewpoint:', viewpointError);
          // Continuer sans viewpoint, ne pas échouer l'opération complète
        }
      } else {
        console.log('Viewpoint object is missing required fields');
      }
    }
    
    // Remplacer l'objet viewpoint par l'ID ou null
    if (viewpointId) {
      todoData.viewpoint = viewpointId;
    } else {
      delete todoData.viewpoint;
    }
    
    // Create new Todo document with the modified data
    const newTodo = new Todo(todoData);
    
    // Save to database
    const savedTodo = await newTodo.save();
    
    // Populate le viewpoint pour le retourner dans la réponse
    const populatedTodo = await Todo.findById(savedTodo._id).populate('viewpoint');
    
    return NextResponse.json(populatedTodo);
  } catch (error) {
    console.error('Error creating todo:', error);
    return NextResponse.json(
      { error: 'Server error while creating todo', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    await connectToDatabase();
    
    const { id, ...updateData } = await request.json();
    
    // Si la mise à jour contient un viewpoint, le traiter séparément
    let viewpointId = null;
    if (updateData.viewpoint && typeof updateData.viewpoint === 'object') {
      try {
        // Vérifier si un viewpoint existe déjà pour ce todo
        const existingTodo = await Todo.findOne({ id }).populate('viewpoint');
        
        if (existingTodo?.viewpoint?._id) {
          // Mettre à jour le viewpoint existant
          await Viewpoint.findByIdAndUpdate(existingTodo.viewpoint._id, updateData.viewpoint);
          viewpointId = existingTodo.viewpoint._id;
        } else {
          // Créer un nouveau viewpoint
          if (!updateData.viewpoint.guid) {
            updateData.viewpoint.guid = `viewpoint-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
          }
          const viewpoint = new Viewpoint(updateData.viewpoint);
          const savedViewpoint = await viewpoint.save();
          viewpointId = savedViewpoint._id;
        }
        
        // Remplacer l'objet viewpoint par l'ID
        updateData.viewpoint = viewpointId;
      } catch (viewpointError) {
        console.error('Error handling viewpoint during update:', viewpointError);
        delete updateData.viewpoint;
      }
    }
    
    const updatedTodo = await Todo.findOneAndUpdate(
      { _id: id }, // Changed from { id } to { _id: id }
      updateData,
      { new: true }
    ).populate('viewpoint');
    
    if (!updatedTodo) {
      return NextResponse.json(
        { error: 'Todo not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(updatedTodo);
  } catch (error) {
    console.error('Error updating todo:', error);
    return NextResponse.json(
      { error: 'Server error while updating todo' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    // Validation stricte
    if (!id) {
      return NextResponse.json(
        { success: false, message: "ID requis" },
        { status: 400 }
      );
    }

    // Récupérer le todo pour obtenir l'ID du viewpoint associé si présent
    const todoToDelete = await Todo.findOne({
      $or: [
        { _id: id },
        { id: id }
      ]
    });

    if (!todoToDelete) {
      return NextResponse.json(
        { success: false, message: "Todo introuvable" },
        { status: 404 }
      );
    }

    // Si le todo a un viewpoint, le supprimer également
    if (todoToDelete.viewpoint) {
      try {
        await Viewpoint.findByIdAndDelete(todoToDelete.viewpoint);
        console.log(`Viewpoint ${todoToDelete.viewpoint} supprimé`);
      } catch (viewpointError) {
        console.error(`Erreur lors de la suppression du viewpoint: ${viewpointError}`);
        // Continuer même si la suppression du viewpoint échoue
      }
    }

    // Suppression du todo
    const deletionResult = await Todo.deleteOne({
      _id: todoToDelete._id
    });

    if (deletionResult.deletedCount === 0) {
      return NextResponse.json(
        { success: false, message: "Erreur lors de la suppression du todo" },
        { status: 500 }
      );
    }

    return new Response(null, { status: 204 }); // 204 No Content

  } catch (error) {
    console.error("Erreur DELETE:", error);
    return NextResponse.json(
      { 
        success: false,
        message: "Erreur serveur",
        error: error instanceof Error ? error.message : undefined
      },
      { status: 500 }
    );
  }
}