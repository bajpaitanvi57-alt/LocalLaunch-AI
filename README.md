# LocalLaunch AI ✳

A local-first marketing copy assistant for freelancers, Etsy/eBay sellers, home businesses, and solo founders. It turns product notes into a product listing, benefits, social caption, WhatsApp promo, and search keywords.

**Stack:** HTML, CSS, vanilla JavaScript, Node.js (built-in modules only), and [Ollama](https://ollama.com/) running an open-weight model locally.

## Features

- Generates a complete mini marketing pack from a seller's real product facts.
- Supports different brand voices and platforms.
- Detects models installed in Ollama and lets you select one.
- Uses a small Node server as a same-origin bridge to Ollama, avoiding browser CORS issues.
- No hosted AI API key and no per-generation API charge.
- Prompt instructs the model not to invent product features, discounts, certifications, or delivery promises.

## Requirements

- Node.js 18 or newer
- [Ollama](https://ollama.com/download)
- A model pulled into Ollama; `llama3.2` is the default example

## Run locally

1. Install Ollama from https://ollama.com/download and start it.
2. Open a terminal and download the default model:

   ```bash
   ollama pull llama3.2
   ```

3. Unzip this project and open a terminal in the `LocalLaunch-AI` folder.
4. Start the app:

   ```bash
   npm start
   ```

5. Open http://localhost:3000 in your browser.

The first model response may take a little while because Ollama may need to load the model into memory.

## Use a different model

Pull a model first, for example:

```bash
ollama pull qwen2.5:3b
```

Restart the app and select it from the Ollama model dropdown. Or set the default model when starting the server:

**Windows PowerShell**
```powershell
$env:OLLAMA_MODEL="qwen2.5:3b"
npm start
```

**macOS / Linux**
```bash
OLLAMA_MODEL=qwen2.5:3b npm start
```

If Ollama runs on another local host/port, set `OLLAMA_URL` before starting the server. The default is `http://127.0.0.1:11434`.

## How the integration works

- `public/app.js` sends the seller's form to the local `/api/generate` route.
- `server.js` calls Ollama's `POST /api/chat` endpoint with `stream: false`.
- `/api/health` checks Ollama's `/api/tags` endpoint and returns the installed model names.
- The server sends the generated text back to the browser. It does not store prompts or outputs in a database.

## Privacy and honest claims

The app sends the submitted form to the Ollama service configured on your machine. With the default configuration, that is `127.0.0.1`, so the prompt is processed locally rather than by a hosted AI API. This app itself does not save the prompt to disk. Check your Ollama setup and any other software running on your computer if you need stronger privacy assurances.

Local inference does not mean zero cost: it uses your device's memory, power, and processing resources. A model download requires internet access, but generation can work offline after the model is installed.

## Troubleshooting

- **“Ollama is not reachable”**: Open/start Ollama, then visit `http://127.0.0.1:11434/api/tags`.
- **Model missing**: Run `ollama pull llama3.2` or choose a model already installed.
- **Slow generation**: Try a smaller model supported by your computer.
- **Port 3000 already in use**: PowerShell: `$env:PORT="3001"; npm start`; then open `http://localhost:3001`.

## Side Hustle submission angle

**Problem:** Solo sellers spend time writing the same product descriptions and promotional copy for multiple channels.

**Solution:** LocalLaunch turns a few product facts into a reusable marketing pack.

**Why open innovation matters:** Open-weight models can run on the seller's own machine, keep draft customer/product information away from a hosted AI API, allow model switching, and avoid per-prompt API charges. This makes repeat use more predictable for a tiny business. The trade-off is that users provide the hardware and may need to download/manage the model.

**First-user test idea:** Ask one local seller, home baker, craft maker, or student freelancer to enter a real product. Let them edit the output and ask whether it saved time, what was inaccurate, and whether they'd use it weekly. Do not claim a paying user until someone has actually paid.
