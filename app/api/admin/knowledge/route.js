// export const runtime = "nodejs";
// export const dynamic = "force-dynamic";

// import { NextResponse } from "next/server";
// import { getConnection } from "@/lib/db";

// function isAuthorized(req) {
//   const token = req.headers.get("x-admin-token");
//   return token === process.env.ADMIN_SECRET_TOKEN;
// }

// export async function GET(req) {
//   if (!isAuthorized(req))
//     return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

//   const pool = await getConnection();
//   const result = await pool.request().query(
//     `SELECT TOP 200 id, question, answer, category, tags, source_url, createdAt, updatedAt
//      FROM ChatKnowledge ORDER BY updatedAt DESC`
//   );
//   return NextResponse.json(result.recordset);
// }

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getConnection } from "@/lib/db";

const allowedOrigins = process.env.FRONTEND_URLS?.split(",") || [];

function getCorsHeaders(origin) {
  const isAllowed = allowedOrigins.includes(origin);
  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : "",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, x-admin-token",
  };
}

function isAuthorized(req) {
  const token = req.headers.get("x-admin-token");
  return token === process.env.ADMIN_SECRET_TOKEN;
}

export async function OPTIONS(req) {
  const origin = req.headers.get("origin") || "";
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(origin),
  });
}

export async function GET(req) {
  const origin = req.headers.get("origin") || "";
  if (!isAuthorized(req))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: getCorsHeaders(origin) });

  const pool = await getConnection();
  const result = await pool.request().query(
    `SELECT TOP 200 id, question, answer, category, tags, source_url, createdAt, updatedAt
     FROM ChatKnowledge ORDER BY updatedAt DESC`
  );
  return NextResponse.json(result.recordset, { headers: getCorsHeaders(origin) });
}