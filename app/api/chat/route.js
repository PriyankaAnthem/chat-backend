export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { searchQdrant } from "@/lib/qdrant";
import { buildSystemPrompt } from "@/lib/prompt";

export async function POST(req) {
  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "API key not configured" }, { status: 500 });
    }

    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");

    const hits = lastUserMsg
      ? await searchQdrant(lastUserMsg.content, 3)
      : [];

    const systemPrompt = buildSystemPrompt(hits);

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 300, // optimized
        system: systemPrompt,
        messages: messages.slice(-4), // optimized
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(
        { error: error.error?.message || "API error" },
        { status: response.status }
      );
    }

    const data = await response.json();

    const reply =
      data?.content?.find((b) => b.type === "text")?.text ||
      "Sorry, I couldn't generate a response.";

    return NextResponse.json({ reply });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}