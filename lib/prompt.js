const BASE_SYSTEM_PROMPT = `...PASTE YOUR FULL PROMPT HERE...`;

export function buildSystemPrompt(hits) {
  if (!hits || hits.length === 0) return BASE_SYSTEM_PROMPT;

  const context = hits
    .map((h, i) => `[${i + 1}] Q: ${h.question}\nA: ${h.answer}`)
    .join("\n\n");

  return `${BASE_SYSTEM_PROMPT}

RELEVANT KNOWLEDGE BASE:
${context}

Use above info if relevant.`;
}