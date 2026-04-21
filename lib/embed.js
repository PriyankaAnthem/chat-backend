import "dotenv/config";
import { HfInference } from "@huggingface/inference";

const hf = new HfInference(process.env.HF_TOKEN);

export async function embed(text) {
  try {
    const embedding = await hf.featureExtraction({
      model: "sentence-transformers/all-MiniLM-L6-v2",
      inputs: text,
    });

    if (!embedding) {
      throw new Error("Empty embedding response");
    }

    // handle nested response
    if (Array.isArray(embedding) && Array.isArray(embedding[0])) {
      return embedding[0];
    }

    return embedding;
  } catch (err) {
    console.error("❌ Embedding Error:", err.message);
    throw err;
  }
}