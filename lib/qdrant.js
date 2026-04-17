import { QdrantClient } from "@qdrant/js-client-rest";
import { embed } from "./embed";

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
    console.error("Qdrant error:", err.message);
    return [];
  }
}