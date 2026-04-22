// import { QdrantClient } from "@qdrant/js-client-rest";
// import { embed } from "./embed.js"; // ✅ fixed

// const qdrant = new QdrantClient({
//   url: process.env.QDRANT_URL,
//   apiKey: process.env.QDRANT_API_KEY,
// });

// const COLLECTION = "anthem_qa";

// export async function searchQdrant(query, topK = 3) {
//   try {
//     const vector = await embed(query);

//     const results = await qdrant.search(COLLECTION, {
//       vector,
//       limit: topK,
//       with_payload: true,
//       score_threshold: 0.45,
//     });

//     return results.map((r) => r.payload);
//   } catch (err) {
//     console.error("Qdrant error:", err.message);
//     return [];
//   }
// }


import { QdrantClient } from "@qdrant/js-client-rest";
import { embed } from "./embed.js";

const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
});

const COLLECTION = "anthem_qa";

export async function searchQdrant(query, topK = 3) {
  try {
    const vector = await embed(query);
    const results = await qdrant.search(COLLECTION, {
      vector,
      limit: topK,
      with_payload: true,
      score_threshold: 0.45,
    });
    return results.map((r) => r.payload);
  } catch (err) {
    console.error("Qdrant search error:", err.message);
    return [];
  }
}

// ✅ Upsert a Q&A into Qdrant (used on add/edit)
export async function upsertQdrant(id, question, answer, payload = {}) {
  const vector = await embed(`${question} ${answer}`);
  await qdrant.upsert(COLLECTION, {
    points: [
      {
        id,           // use SQL row id (integer)
        vector,
        payload: { question, answer, ...payload },
      },
    ],
  });
}

// ✅ Delete a vector from Qdrant (used on delete)
export async function deleteFromQdrant(id) {
  await qdrant.delete(COLLECTION, {
    points: [id],
  });
}