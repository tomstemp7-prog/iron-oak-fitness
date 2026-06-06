# Thrive London — AI Chatbot Service

A production-ready, embeddable AI chatbot for Thrive London, built with FastAPI and the Anthropic API. A single JavaScript snippet embeds a fully branded chat widget on any website.

---

## Local Setup

### 1. Clone and install

```bash
git clone <your-repo-url>
cd thrive-chatbot
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure environment

```bash
cp .env.example .env
```

Open `.env` and add your key:

```
ANTHROPIC_API_KEY=sk-ant-...
```

### 3. Run the server

```bash
uvicorn main:app --reload
```

The API is now running at `http://localhost:8000`.

---

## Test the `/chat` endpoint

```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What coffee machines do you offer for a team of 40?",
    "client_id": "thrive",
    "conversation_history": []
  }'
```

Expected response shape:

```json
{
  "response": "For a team of 40...",
  "conversation_history": [
    { "role": "user", "content": "What coffee machines do you offer for a team of 40?" },
    { "role": "assistant", "content": "For a team of 40..." }
  ]
}
```

Health check:

```bash
curl http://localhost:8000/health
# {"status":"ok"}
```

---

## Embed the Widget

Add one line before the closing `</body>` tag on any webpage:

```html
<script
  src="https://your-api-url.com/widget.js"
  data-client="thrive"
  data-api="https://your-api-url.com"
></script>
```

### Optional attributes

| Attribute | Default | Description |
|---|---|---|
| `data-client` | `thrive` | Client ID — must match a file in `clients/` |
| `data-api` | *(required)* | Base URL of your deployed API |
| `data-color` | `#FF5C35` | Override the brand colour |
| `data-name` | `Thrive London` | Override the header business name |
| `data-welcome` | *(built-in message)* | Override the welcome message |

### Serving `widget.js`

The widget file can be served as a static file by FastAPI. Add this to `main.py` if you want to serve it from the same origin:

```python
from fastapi.staticfiles import StaticFiles
app.mount("/", StaticFiles(directory=".", html=False), name="static")
```

Or deploy `widget.js` to a CDN (e.g. Cloudflare R2, AWS S3) and reference it there.

---

## Deploy to Railway

Railway is the simplest zero-config deployment option for FastAPI.

### Step 1 — Create a Railway account

Go to [railway.app](https://railway.app) and sign up with GitHub.

### Step 2 — New project from GitHub

1. Click **New Project → Deploy from GitHub repo**
2. Select this repository
3. Railway auto-detects Python and will use `uvicorn main:app --host 0.0.0.0 --port $PORT`

### Step 3 — Add the environment variable

In your Railway project dashboard:

1. Click your service → **Variables**
2. Add `ANTHROPIC_API_KEY` = your Anthropic API key

### Step 4 — Deploy

Railway deploys automatically on every push to `main`. Your API will be live at a URL like `https://thrive-chatbot-production.up.railway.app`.

### Step 5 — Update the widget embed

Replace `https://your-api-url.com` in the embed snippet with your Railway URL.

### Optional: Add a `Procfile`

If Railway doesn't detect the start command automatically, add a `Procfile` to the repo root:

```
web: uvicorn main:app --host 0.0.0.0 --port $PORT
```

---

## Add a New Client

1. Copy the template:

```bash
cp clients/thrive.json clients/acme.json
```

2. Edit `clients/acme.json` — update `client_id`, `business_name`, `primary_color`, and `system_prompt` to match the new client.

3. Embed the widget with `data-client="acme"`:

```html
<script
  src="https://your-api-url.com/widget.js"
  data-client="acme"
  data-api="https://your-api-url.com"
  data-color="#0055FF"
  data-name="Acme Corp"
></script>
```

No code changes or redeployment needed — the API loads client configs at runtime.

---

## Rate Limiting

The `/chat` endpoint allows **20 requests per IP per hour**. Exceeding this returns a `429 Too Many Requests` response. Adjust the limit in `main.py`:

```python
@limiter.limit("20/hour")   # change as needed
```

---

## Project Structure

```
thrive-chatbot/
├── main.py              # FastAPI application
├── requirements.txt     # Python dependencies
├── .env.example         # Environment variable template
├── .gitignore
├── clients/
│   └── thrive.json      # Thrive London client config & system prompt
├── widget.js            # Self-contained embeddable chat widget
└── README.md
```
