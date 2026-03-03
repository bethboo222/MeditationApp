# Setting Up the Meditation App for Local Development

## Prerequisites

- Node.js and npm
- An OpenAI API key
- A Google account (for questionnaire data collection)

---

## Step 1: Set Up the API Server

The server securely holds your OpenAI API key and generates personalised meditation scripts.

```bash
cd server
npm install
```

Create `server/.env` (copy from `server/.env.example`):

```
OPENAI_API_KEY=sk-...
PORT=3001
```

Get your API key from [platform.openai.com/api-keys](https://platform.openai.com/api-keys).

---

## Step 2: Set Up Google Sheets Data Collection

Questionnaire responses are saved to a Google Sheet via a Google Apps Script Web App.

1. **Create a new Google Sheet** at [sheets.google.com](https://sheets.google.com)

2. **Open the Apps Script editor**
   - In your sheet, go to **Extensions > Apps Script**

3. **Paste the script**
   - Delete any existing code and paste the contents of [`apps-script/Code.gs`](apps-script/Code.gs)
   - Click **Save**

4. **Deploy as a Web App**
   - Click **Deploy > New deployment**
   - Set type to **Web app**
   - Set **Execute as:** Me
   - Set **Who has access:** Anyone
   - Click **Deploy** and authorise when prompted
   - Copy the **Web app URL** (looks like `https://script.google.com/macros/s/ABC123.../exec`)

5. **Configure the frontend**
   - Create `frontend/.env.local` (copy from `frontend/.env.example`)
   - Paste your Web App URL as the value of `VITE_SHEETS_URL`:
     ```
     VITE_SHEETS_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
     ```

> **Note:** The first questionnaire submission will write a header row to the sheet automatically. Each subsequent submission appends a new row.

---

## Step 3: Install Frontend Dependencies

```bash
cd frontend
npm install
```

---

## Step 4: Run the App

You need **two terminals** running simultaneously:

**Terminal 1 — API server (port 3001):**
```bash
cd server
npm run dev
```

**Terminal 2 — Frontend (port 5173):**
```bash
cd frontend
npm run dev
```

Then open your browser at **http://localhost:5173**

---

## Deploying to a Hosting Platform (e.g. Render, Railway)

Set the following environment variables in your hosting dashboard:

| Variable | Where | Value |
|---|---|---|
| `OPENAI_API_KEY` | Server service | Your OpenAI key |
| `PORT` | Server service | Platform default |
| `VITE_SHEETS_URL` | Frontend build | Your Apps Script URL |

The `server/` and `frontend/` can be deployed as two separate services. Point the frontend's `VITE_API_URL` to the deployed server URL if needed.

---

## Stopping the Servers

Press `Ctrl+C` in each terminal.

---

## Troubleshooting

### Script not generating?
- Check the server terminal for error output
- Make sure `server/.env` exists with a valid `OPENAI_API_KEY`
- Ensure the server is running on port 3001 **before** starting the frontend

### Questionnaire responses not appearing in the sheet?
- Check that `VITE_SHEETS_URL` is set correctly in `frontend/.env.local`
- Make sure the Apps Script is deployed with **Who has access: Anyone**
- If you re-deploy the script, the URL changes — update `.env.local` with the new URL
- Open the browser console (F12) and look for errors after submitting the questionnaire

### Port already in use?
```bash
lsof -i :3001
lsof -i :5173
kill -9 <PID>
```
