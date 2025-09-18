import { NextResponse } from "next/server"

export async function GET() {
  try {
    return NextResponse.json({
      status: "ok",
      message: "Servidor funcionando",
      timestamp: new Date().toISOString(),
      version: "1.0.0"
    })
  } catch (error) {
    return NextResponse.json(
      { 
        status: "error", 
        message: "Erro interno do servidor",
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

export async function POST() {
  return GET()
}