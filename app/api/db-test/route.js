import { NextResponse } from "next/server";
import { getConnection } from "@/lib/db";

export async function GET() {
  try {
    const pool = await getConnection();
    const result = await pool.request().query("SELECT TOP 5 * FROM ChatKnowledge");

    return NextResponse.json(result.recordset);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}