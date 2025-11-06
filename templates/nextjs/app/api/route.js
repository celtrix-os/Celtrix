import { NextRequest, NextResponse } from "next/server";

export async function GET(req) {
    return NextResponse.json({message:"Hello from Backend:3000"});
}

// Test API http://localhost:3000/api/router in postman or bruno !