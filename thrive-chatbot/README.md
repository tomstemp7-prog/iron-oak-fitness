# Thrive London AI Chatbot

A production-ready AI chatbot service for Thrive London, built with FastAPI and the Anthropic API. Embeddable on any website via a single `<script>` tag.

---

## 1. Local Setup

```bash
# Clone and enter the project
git clone <your-repo-url>
cd thrive-chatbot

# Create a virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Add your API key
cp .env.example .env
# Edit .env and set ANTHROPIC_API_KEY=sk-ant-...

# Run the server
uvicorn main:app --reload
# API is now live at http://localhost:8000
```

---

## 2. Test the /chat Endpoint

```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What coffee machines do you offer?",
    "client_id": "thrive",
    "conversation_history": []
  }'
```

Expected response:
```json
{
  "response": "...",
  "conversation_history": [...]
}
```

Health check:
```bash
curl http://localhost:8000/health
# {"status": "ok"}
```

---

## 3. Embed the Widget

Add this single line before `</body>` on any page:

```html
<script
  src="https://your-api-url.com/widget.js"
  data-client="thrive"
  data-api="https://your-api-url.com"
></script>
```

**Optional attributes:**
| Attribute | Default | Description |
|---|---|---|
| `data-client` | `thrive` | Client ID (must match a file in `clients/`) |
| `data-api` | *(required)* | Base URL of your deployed API |
| `data-color` | `#FF5C35` | Primary brand colour |
| `data-name` | `Thrive London` | Business name shown in the header |

To serve `widget.js` from your FastAPI app, add this to `main.py`:
```python
from fastapi.staticfiles import StaticFiles
app.mount("/", StaticFiles(directory=".", html=False), name="static")
```
Or serve it from a CDN/S3 bucket.

---

## 4. Deploy to Railway

1. **Push your code to GitHub** (make sure `.env` is in `.gitignore` — it is).

2. **Go to [railway.app](https://railway.app)** and click **New Project → Deploy from GitHub repo**.

3. **Select your repository.** Railway auto-detects Python.

4. **Set environment variables** in the Railway dashboard:
   - `ANTHROPIC_API_KEY` → your Anthropic API key

5. **Set the start command** in Railway settings (or add a `Procfile`):
   ```
   web: uvicorn main:app --host 0.0.0.0 --port $PORT
   ```
   Or create a `Procfile` in the project root:
   ```
   web: uvicorn main:app --host 0.0.0.0 --port $PORT
   ```

6. **Deploy.** Railway will install dependencies from `requirements.txt` and start the server.

7. **Copy your Railway URL** (e.g. `https://thrive-chatbot.up.railway.app`) and use it as `data-api` in the widget embed tag.

---

## 5. Adding a New Client

1. Copy the Thrive config:
   ```bash
   cp clients/thrive.json clients/acme.json
   ```

2. Edit `clients/acme.json` — update these fields:
   ```json
   {
     "client_id": "acme",
     "business_name": "Acme Corp",
     "primary_color": "#0057FF",
     "system_prompt": "You are an assistant for Acme Corp..."
   }
   ```

3. Embed the widget with `data-client="acme"`:
   ```html
   <script
     src="https://your-api-url.com/widget.js"
     data-client="acme"
     data-api="https://your-api-url.com"
     data-color="#0057FF"
     data-name="Acme Corp"
   ></script>
   ```

No backend code changes needed — the API reads client configs dynamically.

---

## Rate Limiting

The `/chat` endpoint is limited to **20 requests per IP per hour**. Exceeded requests return HTTP 429.

## Error Responses

All errors return clean JSON — never raw stack traces:

```json
{ "error": "Client 'unknown' not found" }
```
