import dotenv from "dotenv";
dotenv.config();

import { getConnection } from "./lib/db.js";
import fs from "fs";
import { QdrantClient } from "@qdrant/js-client-rest";
import { embed } from "./lib/embed.js";

const COLLECTION = "anthem_qa";

const raw = fs.readFileSync(new URL("./data/knowledge.json", import.meta.url));
const data = JSON.parse(raw);

const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
});

async function recreateCollection() {
  try {
    await qdrant.deleteCollection(COLLECTION);
    console.log("🗑️ Old Qdrant collection deleted");
  } catch (err) {
    console.log("ℹ️ No existing collection (ok)");
  }

  await qdrant.createCollection(COLLECTION, {
    vectors: {
      size: 384,
      distance: "Cosine",
    },
  });

  console.log("✅ New Qdrant collection created");
}

async function seed() {
  const pool = await getConnection();

  await recreateCollection();

  for (let index = 0; index < data.length; index++) {
    const item = data[index];
    try {
      // ✅ Check duplicate in DB
      const exists = await pool
        .request()
        .input("mongo_id", item.mongo_id)
        .query(`SELECT mongo_id FROM ChatKnowledge WHERE mongo_id=@mongo_id`);

      if (exists.recordset.length === 0) {
        await pool
          .request()
          .input("mongo_id", item.mongo_id)
          .input("question", item.question)
          .input("answer", item.answer)
          .input("category", item.category)
          .input("tags", JSON.stringify(item.tags))
          .input("page", item.page)
          .input("source_url", item.source_url)
          .query(`
            INSERT INTO ChatKnowledge
            (mongo_id, question, answer, category, tags, page, source_url)
            VALUES (@mongo_id, @question, @answer, @category, @tags, @page, @source_url)
          `);
      }

      // ✅ Embed and upsert into Qdrant
      const text = item.embedding_text || `${item.question} ${item.answer}`;
      const vector = await embed(text);

      // ✅ FIXED: correct upsert API signature
      await qdrant.upsert(COLLECTION, {
        points: [
          {
            id: index + 1, // ✅ safe numeric ID
            vector,
            payload: item,
          },
        ],
      });

      console.log(`✅ Seeded: ${item.mongo_id}`);
    } catch (err) {
      console.error(`❌ Error in ${item.mongo_id}`, err.message);
    }
  }

  console.log("🎉 Seeding completed (DB + Qdrant)");
  process.exit(0); // ✅ cleanly exit after seeding
}

seed();