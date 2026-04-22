// export const runtime = "nodejs";
// export const dynamic = "force-dynamic";

// import { NextResponse } from "next/server";
// import { getConnection } from "@/lib/db";        // ✅ your existing db.js export
// import sql from "mssql";                          // ✅ import sql directly from mssql
// import { upsertQdrant, deleteFromQdrant } from "@/lib/qdrant";

// // ✅ No NextAuth here — backend verifies admin email via a shared secret token instead
// function isAuthorized(req) {
//   const token = req.headers.get("x-admin-token");
//   return token === process.env.ADMIN_SECRET_TOKEN;
// }

// // GET — list all unanswered queries
// export async function GET(req) {
//   if (!isAuthorized(req))
//     return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

//   const pool = await getConnection();
//   const result = await pool.request().query(
//     `SELECT id, question, status, createdAt, resolvedAt
//      FROM UnansweredQueries ORDER BY createdAt DESC`
//   );
//   return NextResponse.json(result.recordset);
// }

// // POST — add answer → insert into ChatKnowledge + upsert Qdrant + mark resolved
// export async function POST(req) {
//   if (!isAuthorized(req))
//     return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

//   const { unansweredId, question, answer, category, tags, sourceUrl } =
//     await req.json();

//   const pool = await getConnection();

//   const ins = await pool
//     .request()
//     .input("question", sql.NVarChar(sql.MAX), question)
//     .input("answer", sql.NVarChar(sql.MAX), answer)
//     .input("category", sql.NVarChar(255), category || "")
//     .input("tags", sql.NVarChar(sql.MAX), tags || "")
//     .input("sourceUrl", sql.NVarChar(500), sourceUrl || "")
//     .query(
//       `INSERT INTO ChatKnowledge (question, answer, category, tags, source_url, createdAt, updatedAt)
//        OUTPUT INSERTED.id
//        VALUES (@question, @answer, @category, @tags, @sourceUrl, GETDATE(), GETDATE())`
//     );

//   const newId = ins.recordset[0].id;

//   await upsertQdrant(newId, question, answer, { category, tags, source_url: sourceUrl });

//   if (unansweredId) {
//     await pool
//       .request()
//       .input("id", sql.Int, unansweredId)
//       .query(
//         `UPDATE UnansweredQueries
//          SET status='resolved', resolvedAt=GETDATE()
//          WHERE id=@id`
//       );
//   }

//   return NextResponse.json({ success: true, id: newId });
// }

// // PUT — edit existing ChatKnowledge + re-upsert Qdrant
// export async function PUT(req) {
//   if (!isAuthorized(req))
//     return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

//   const { id, question, answer, category, tags, sourceUrl } = await req.json();

//   const pool = await getConnection();
//   await pool
//     .request()
//     .input("id", sql.Int, id)
//     .input("question", sql.NVarChar(sql.MAX), question)
//     .input("answer", sql.NVarChar(sql.MAX), answer)
//     .input("category", sql.NVarChar(255), category || "")
//     .input("tags", sql.NVarChar(sql.MAX), tags || "")
//     .input("sourceUrl", sql.NVarChar(500), sourceUrl || "")
//     .query(
//       `UPDATE ChatKnowledge
//        SET question=@question, answer=@answer, category=@category,
//            tags=@tags, source_url=@sourceUrl, updatedAt=GETDATE()
//        WHERE id=@id`
//     );

//   await upsertQdrant(id, question, answer, { category, tags, source_url: sourceUrl });

//   return NextResponse.json({ success: true });
// }

// // DELETE — remove from ChatKnowledge + Qdrant
// export async function DELETE(req) {
//   if (!isAuthorized(req))
//     return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

//   const { id } = await req.json();

//   const pool = await getConnection();
//   await pool
//     .request()
//     .input("id", sql.Int, id)
//     .query(`DELETE FROM ChatKnowledge WHERE id=@id`);

//   await deleteFromQdrant(id);

//   return NextResponse.json({ success: true });
// }

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getConnection } from "@/lib/db";
import sql from "mssql";
import { upsertQdrant, deleteFromQdrant } from "@/lib/qdrant";

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
    `SELECT id, question, status, createdAt, resolvedAt
     FROM UnansweredQueries ORDER BY createdAt DESC`
  );
  return NextResponse.json(result.recordset, { headers: getCorsHeaders(origin) });
}

export async function POST(req) {
  const origin = req.headers.get("origin") || "";
  if (!isAuthorized(req))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: getCorsHeaders(origin) });

  const { unansweredId, question, answer, category, tags, sourceUrl } = await req.json();
  const pool = await getConnection();

  const ins = await pool
    .request()
    .input("question", sql.NVarChar(sql.MAX), question)
    .input("answer", sql.NVarChar(sql.MAX), answer)
    .input("category", sql.NVarChar(255), category || "")
    .input("tags", sql.NVarChar(sql.MAX), tags || "")
    .input("sourceUrl", sql.NVarChar(500), sourceUrl || "")
    .query(
      `INSERT INTO ChatKnowledge (question, answer, category, tags, source_url, createdAt, updatedAt)
       OUTPUT INSERTED.id
       VALUES (@question, @answer, @category, @tags, @sourceUrl, GETDATE(), GETDATE())`
    );

  const newId = ins.recordset[0].id;

  await upsertQdrant(newId, question, answer, { category, tags, source_url: sourceUrl });

  if (unansweredId) {
    await pool
      .request()
      .input("id", sql.Int, unansweredId)
      .query(
        `UPDATE UnansweredQueries
         SET status='resolved', resolvedAt=GETDATE()
         WHERE id=@id`
      );
  }

  return NextResponse.json({ success: true, id: newId }, { headers: getCorsHeaders(origin) });
}

export async function PUT(req) {
  const origin = req.headers.get("origin") || "";
  if (!isAuthorized(req))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: getCorsHeaders(origin) });

  const { id, question, answer, category, tags, sourceUrl } = await req.json();
  const pool = await getConnection();

  await pool
    .request()
    .input("id", sql.Int, id)
    .input("question", sql.NVarChar(sql.MAX), question)
    .input("answer", sql.NVarChar(sql.MAX), answer)
    .input("category", sql.NVarChar(255), category || "")
    .input("tags", sql.NVarChar(sql.MAX), tags || "")
    .input("sourceUrl", sql.NVarChar(500), sourceUrl || "")
    .query(
      `UPDATE ChatKnowledge
       SET question=@question, answer=@answer, category=@category,
           tags=@tags, source_url=@sourceUrl, updatedAt=GETDATE()
       WHERE id=@id`
    );

  await upsertQdrant(id, question, answer, { category, tags, source_url: sourceUrl });

  return NextResponse.json({ success: true }, { headers: getCorsHeaders(origin) });
}

export async function DELETE(req) {
  const origin = req.headers.get("origin") || "";
  if (!isAuthorized(req))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: getCorsHeaders(origin) });

  const { id } = await req.json();
  const pool = await getConnection();

  await pool
    .request()
    .input("id", sql.Int, id)
    .query(`DELETE FROM ChatKnowledge WHERE id=@id`);

  await deleteFromQdrant(id);

  return NextResponse.json({ success: true }, { headers: getCorsHeaders(origin) });
}