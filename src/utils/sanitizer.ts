const HTML_ENTITIES: Record<string, string> = {
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#x27;",
  "&": "&amp;",
};

export function sanitizeInput(input: string): string {
  return input.replace(/[<>\"'&]/g, (match) => HTML_ENTITIES[match] || match);
}
