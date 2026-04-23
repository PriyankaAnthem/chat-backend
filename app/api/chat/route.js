export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { searchQdrant } from "@/lib/qdrant";
import { buildSystemPrompt } from "@/lib/prompt";
import { sendUnansweredEmail } from "@/lib/sendEmail";

// ✅ CORS setup
const allowedOrigins = process.env.FRONTEND_URLS?.split(",") || [];

function getCorsHeaders(origin) {
  const isAllowed = allowedOrigins.includes(origin);
  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : "",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export async function OPTIONS(req) {
  const origin = req.headers.get("origin") || "";
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(origin),
  });
}

export async function POST(req) {
  const origin = req.headers.get("origin") || "";

  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400, headers: getCorsHeaders(origin) }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "API key not configured" },
        { status: 500, headers: getCorsHeaders(origin) }
      );
    }

    // ✅ Last user message
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");

    // ✅ RAG search
    const hits = lastUserMsg
      ? await searchQdrant(lastUserMsg.content, 3)
      : [];

    const systemPrompt = buildSystemPrompt(hits);

    // ✅ Claude API call
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 600,
        system: systemPrompt,
        messages: messages.slice(-4),
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(
        { error: error.error?.message || "API error" },
        { status: response.status, headers: getCorsHeaders(origin) }
      );
    }

    const data = await response.json();
    const rawText =
      data?.content?.find((b) => b.type === "text")?.text || "";

    // ✅ Parse structured JSON response from Claude
    let reply = "Sorry, I couldn't generate a response.";
    let isUnanswered = false;

    try {
      // Strip any accidental markdown fences just in case
      // const clean = rawText.replace(/```json|```/g, "").trim();
      const clean = rawText.replace(/^```[\w]*\n?/gm, "").replace(/```$/gm, "").trim();
      const parsed = JSON.parse(clean);
      reply = parsed.answer || reply;
      isUnanswered = parsed.unanswered === true;
    } catch {
      // Claude didn't return valid JSON — use raw text and don't trigger email
      console.warn("⚠️ Claude response was not valid JSON, using raw text");
      reply = rawText || reply;
      isUnanswered = false;
    }

    // ✅ Only send email when Claude explicitly flagged it as unanswered
    if (isUnanswered && lastUserMsg?.content?.length > 10) {
      console.log("📧 Sending unanswered email for:", lastUserMsg.content);
      // ✅ Fire immediately without awaiting
      await sendUnansweredEmail(lastUserMsg.content).catch((err) =>
        console.error("Email failed:", err.message)
      );
    }

    return NextResponse.json(
      { reply },
      { headers: getCorsHeaders(origin) }
    );

  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: getCorsHeaders(origin) }
    );
  }
}