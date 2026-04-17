export async function embed(text) {
  const res = await fetch(
    "https://api-inference.huggingface.co/models/sentence-transformers/all-MiniLM-L6-v2",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.HF_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: text,
        options: { wait_for_model: true },
      }),
    }
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HF embed failed ${res.status}: ${body}`);
  }

  const data = await res.json();

  if (Array.isArray(data[0])) {
    if (Array.isArray(data[0][0])) return data[0][0];
    return data[0];
  }
  return data;
}