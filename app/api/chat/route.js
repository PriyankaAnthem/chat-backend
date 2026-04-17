
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { searchQdrant } from "@/lib/qdrant";
import { buildSystemPrompt } from "@/lib/prompt";

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

// ✅ Handle preflight request
export async function OPTIONS(req) {
  const origin = req.headers.get("origin") || "";

  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(origin),
  });
}

// ✅ Main POST API
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

    // last user message
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");

    // RAG search
    const hits = lastUserMsg
      ? await searchQdrant(lastUserMsg.content, 3)
      : [];

    const systemPrompt = buildSystemPrompt(hits);

    // Claude API call
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 300,
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

    const reply =
      data?.content?.find((b) => b.type === "text")?.text ||
      "Sorry, I couldn't generate a response.";

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