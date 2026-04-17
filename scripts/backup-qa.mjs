

import { config } from "dotenv";
import { resolve }    from "path";
import { fileURLToPath } from "url";

// ── Load .env.local ────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname  = resolve(__filename, "..");
config({ path: resolve(__dirname, "../.env.local") }); // ✅ .env.local explicitly

import { QdrantClient } from "@qdrant/js-client-rest";
import { readFileSync } from "fs";

const QDRANT_URL     = process.env.QDRANT_URL;
const QDRANT_API_KEY = process.env.QDRANT_API_KEY;
const HF_TOKEN       = process.env.HF_TOKEN;
const COLLECTION     = "anthem_qa";

// ── Debug: confirm env loaded ──────────────────────────────
console.log("🔑 QDRANT_URL :", QDRANT_URL     ? "✅ loaded" : "❌ missing");
console.log("🔑 QDRANT_KEY :", QDRANT_API_KEY ? "✅ loaded" : "❌ missing");
console.log("🔑 HF_TOKEN   :", HF_TOKEN       ? "✅ loaded" : "❌ missing");

if (!QDRANT_URL || !QDRANT_API_KEY || !HF_TOKEN) {
  console.error("\n❌ Missing env vars. Check your .env.local file.\n");
  process.exit(1);
}

// ── Embed via HuggingFace ──────────────────────────────────
async function embed(text) {
  const res = await fetch(
    "https://router.huggingface.co/hf-inference/models/sentence-transformers/all-MiniLM-L6-v2/pipeline/feature-extraction",
    {
      method: "POST",
      headers: {
        Authorization:  `Bearer ${HF_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ inputs: text, options: { wait_for_model: true } }),
    }
  );

  if (!res.ok) throw new Error(`HF embed failed ${res.status}: ${await res.text()}`);

  const data = await res.json();
  if (Array.isArray(data[0])) {
    if (Array.isArray(data[0][0])) return data[0][0];
    return data[0];
  }
  return data;
}

// ── Convert "qa_069" → 69 for Qdrant point ID ─────────────
function mongoIdToInt(mongoId) {
  const match = mongoId.match(/\d+/);
  if (!match) throw new Error(`Cannot parse ID from: ${mongoId}`);
  return parseInt(match[0], 10);
}

// ── Main ───────────────────────────────────────────────────
async function main() {
  const filePath = resolve(__dirname, "../anthem_qa_holidays.json");

  console.log(`\n📂 Reading file: ${filePath}`);
  const raw    = readFileSync(filePath, "utf-8");
  const qaList = JSON.parse(raw);

  console.log(`📦 Found ${qaList.length} entries in file`);

  const qdrant = new QdrantClient({
    url:                QDRANT_URL,
    apiKey:             QDRANT_API_KEY,
    checkCompatibility: false,
  });

  console.log(`🚀 Starting upsert into "${COLLECTION}"...\n`);

  const points = [];

  for (const qa of qaList) {
    console.log(`  ⏳ Embedding: ${qa.mongo_id} — ${qa.question.slice(0, 55)}...`);

    const textToEmbed = qa.embedding_text || qa.question;
    const vector      = await embed(textToEmbed);

    points.push({
      id:      mongoIdToInt(qa.mongo_id),
      vector,
      payload: {
        mongo_id:       qa.mongo_id,
        question:       qa.question,
        answer:         qa.answer,
        category:       qa.category       || "",
        tags:           qa.tags           || [],
        page:           qa.page           || "",
        source_url:     qa.source_url     || "",
        embedding_text: qa.embedding_text || "",
      },
    });

    // Avoid HuggingFace rate limit
    await new Promise((r) => setTimeout(r, 500));
  }

  await qdrant.upsert(COLLECTION, { points });

  console.log(`\n✅ Successfully upserted ${points.length} points into Qdrant!\n`);
}

main().catch((err) => {
  console.error("\n❌ Failed:", err.message);
  process.exit(1);
});
