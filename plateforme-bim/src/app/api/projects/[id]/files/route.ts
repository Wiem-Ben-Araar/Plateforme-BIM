// src/app/api/projects/[id]/files/route.ts
import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import File from "@/models/file";
import User from "@/models/user";
import mongoose from "mongoose";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    await connectToDatabase();
    
    const { id } = params;
    console.log("Fetching files for project:", id);
    
    if (!id) {
      return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
    }
    
    // Convert to ObjectId
    const projectId = new mongoose.Types.ObjectId(id);
    
    // Get files that belong to this project
    const files = await File.find({ project: projectId })
      .sort({ uploadedAt: -1 });
    
    console.log(`Found ${files.length} files for project ${id}`);
    
    // Gather all user IDs referenced in the files
    const userIds = files
      .map(file => file.uploadedBy)
      .filter(id => id && mongoose.Types.ObjectId.isValid(id));
    
    // Fetch all relevant users in one query
    const users = userIds.length > 0 
      ? await User.find({ _id: { $in: userIds } })
      : [];
    
    // Create a map of user IDs to emails for quick lookup
    const userEmailMap = new Map();
    users.forEach(user => {
      if (user && user._id) {
        userEmailMap.set(user._id.toString(), user.email);
      }
    });
    
    // Format the response with user emails included
    const formattedFiles = files.map(file => {
      let uploadedByEmail = file.uploadedByEmail;
      
      // If uploadedByEmail is not already set and uploadedBy is a valid ObjectId, try to get the email from the map
      if (!uploadedByEmail && file.uploadedBy && mongoose.Types.ObjectId.isValid(file.uploadedBy)) {
        const userId = file.uploadedBy.toString();
        uploadedByEmail = userEmailMap.get(userId);
      } 
      // If uploadedBy is a string that looks like an email, use it directly
      else if (!uploadedByEmail && file.uploadedBy && typeof file.uploadedBy === 'string' && file.uploadedBy.includes('@')) {
        uploadedByEmail = file.uploadedBy;
      }
      
      return {
        _id: file._id.toString(),
        name: file.name,
        version: file.version,
        file_size: file.file_size,
        file_url: file.file_url,
        fileType: file.fileType,
        firebasePath: file.firebasePath,
        uploadedAt: file.uploadedAt || new Date(),
        uploadedBy: file.uploadedBy 
          ? (typeof file.uploadedBy === 'string' ? file.uploadedBy : file.uploadedBy.toString())
          : "unknown",
        uploadedByEmail: uploadedByEmail
      };
    });
    
    console.log("Files processed:", formattedFiles.length);
    
    return NextResponse.json(formattedFiles);
  } catch (error) {
    console.error("Error retrieving files:", error);
    return NextResponse.json({
      error: "Failed to retrieve files",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}