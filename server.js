import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, "public");
const PORT = Number(process.env.PORT || 3000);
const OLLAMA_URL = (process.env.OLLAMA_URL || "http://127.0.0.1:11434").replace(/\/$/, "");
const DEFAULT_MODEL = process.env.OLLAMA_MODEL || "llama3.2";

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml"
};

function send(res, status, data, type = "application/json; charset=utf-8") {
  res.writeHead(status, { "Content-Type": type, "Cache-Control": "no-store" });
  res.end(typeof data === "string" ? data : JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => {
      body += chunk;
      if (body.length > 1_000_000) {
        reject(new Error("Request is too large."));
        req.destroy();
      }
    });
    req.on("end", () => {
      try { resolve(JSON.parse(body || "{}")); }
      catch { reject(new Error("Please send valid JSON.")); }
    });
    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === "GET" && url.pathname === "/api/health") {
    try {
      const response = await fetch(`${OLLAMA_URL}/api/tags`, { signal: AbortSignal.timeout(2500) });
      if (!response.ok) throw new Error("Ollama did not respond successfully.");
      const data = await response.json();
      return send(res, 200, {
        ok: true,
        ollama: OLLAMA_URL,
        defaultModel: DEFAULT_MODEL,
        models: (data.models || []).map(item => item.name)
      });
    } catch {
      return send(res, 200, {
        ok: false,
        ollama: OLLAMA_URL,
        defaultModel: DEFAULT_MODEL,
        models: [],
        message: "Ollama is not reachable. Start Ollama and download a model."
      });
    }
  }

  if (req.method === "POST" && url.pathname === "/api/generate") {
    let input;
    try { input = await readBody(req); }
    catch (error) { return send(res, 400, { error: error.message }); }

    const { product, audience, tone, platform, details, model } = input;
    if (!product?.trim()) return send(res, 400, { error: "Add a product or service first." });

    const safeModel = typeof model === "string" && /^[a-zA-Z0-9._:-]+$/.test(model)
      ? model
      : DEFAULT_MODEL;

    const prompt = `You are LocalLaunch, a practical marketing assistant for tiny businesses and solo sellers.
Create useful, honest copy from the seller's notes. Never invent prices, materials, certifications, delivery promises, discounts, or product features. If information is missing, omit it.
Return these sections with clear headings:
1. PRODUCT LISTING TITLE (one option)
2. PRODUCT DESCRIPTION (short, persuasive, specific)
3. KEY BENEFITS (3 bullets based only on supplied facts)
4. SOCIAL / ${platform || "Instagram"} CAPTION (with a gentle call to action)
5. WHATSAPP PROMO (short and friendly)
6. SEARCH KEYWORDS (5 relevant phrases)
Keep the writing easy to edit and appropriate for a small business. Do not claim that the product is the best or guaranteed.

Seller input:
Product/service: ${product.trim()}
Target customer: ${(audience || "General customers").trim()}
Tone: ${(tone || "Friendly and trustworthy").trim()}
Platform priority: ${(platform || "Instagram").trim()}
Extra facts from seller: ${(details || "No extra details supplied").trim()}`;

    try {
      const response = await fetch(`${OLLAMA_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: safeModel,
          messages: [{ role: "user", content: prompt }],
          stream: false,
          options: { temperature: 0.7 }
        }),
        signal: AbortSignal.timeout(120000)
      });

      if (!response.ok) {
        const message = await response.text();
        return send(res, 502, {
          error: `Ollama returned ${response.status}. Is the model downloaded?`,
          detail: message.slice(0, 500)
        });
      }
      const data = await response.json();
      return send(res, 200, { text: data.message?.content || "The model returned an empty response.", model: safeModel });
    } catch (error) {
      const timedOut = error.name === "TimeoutError" || error.name === "AbortError";
      return send(res, 502, {
        error: timedOut
          ? "The model took too long. Try a smaller model or shorter notes."
          : "Could not connect to Ollama. Make sure Ollama is running at " + OLLAMA_URL + ".",
        detail: error.message
      });
    }
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    return send(res, 405, { error: "Method not allowed." });
  }

  const requestedPath = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
  const resolved = path.resolve(PUBLIC_DIR, "." + requestedPath);
  if (!resolved.startsWith(PUBLIC_DIR + path.sep) && resolved !== path.join(PUBLIC_DIR, "index.html")) {
    return send(res, 403, { error: "Forbidden." });
  }

  fs.readFile(resolved, (error, content) => {
    if (error) return send(res, 404, "Not found", "text/plain; charset=utf-8");
    res.writeHead(200, { "Content-Type": mimeTypes[path.extname(resolved)] || "application/octet-stream" });
    if (req.method === "HEAD") return res.end();
    res.end(content);
  });
});

server.listen(PORT, () => {
  console.log(`LocalLaunch AI is running at http://localhost:${PORT}`);
  console.log(`Ollama endpoint: ${OLLAMA_URL}`);
  console.log(`Default model: ${DEFAULT_MODEL}`);
});
