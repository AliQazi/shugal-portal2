// Reads a fetch() Response body as newline-delimited JSON (NDJSON) and
// invokes onLine for every parsed JSON object as soon as it arrives —
// used to progressively render results from streaming API endpoints.
export const streamNdjson = async (
  response: Response,
  onLine: (data: any) => void,
): Promise<void> => {
  if (!response.body || !response.body.getReader) {
    // Fallback for environments without a readable stream
    const text = await response.text();
    text
      .split("\n")
      .filter(Boolean)
      .forEach((line) => onLine(JSON.parse(line)));
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.trim()) continue;
      onLine(JSON.parse(line));
    }
  }

  if (buffer.trim()) {
    onLine(JSON.parse(buffer));
  }
};
