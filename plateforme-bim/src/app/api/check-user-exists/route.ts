import { type NextRequest, NextResponse } from "next/server"
import connectToDatabase from "@/lib/mongodb"
import User from "@/models/user"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId } = body

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    await connectToDatabase()
    const user = await User.findById(userId)

    return NextResponse.json({ exists: !!user })
  } catch (error) {
    console.error("Error checking user existence:", error)
    return NextResponse.json({ error: "An error occurred while checking the user" }, { status: 500 })
  }
}
