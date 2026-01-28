# Setting Up TCDFYPmeditaionApp.com for Local Development

This guide will help you set up the meditation app to run on the custom domain `TCDFYPmeditaionApp.com` from localhost.

## Prerequisites

- Java 11 or higher
- Maven
- Node.js and npm
- macOS, Linux, or Windows

## Step 1: Set Up Local Domain

### macOS/Linux

Run the setup script:

```bash
chmod +x setup-local-domain.sh
./setup-local-domain.sh
```

This will add `127.0.0.1 TCDFYPmeditaionApp.com` to your `/etc/hosts` file.

### Windows

1. Open Notepad as Administrator
2. Open `C:\Windows\System32\drivers\etc\hosts`
3. Add this line at the end:
   ```
   127.0.0.1    TCDFYPmeditaionApp.com
   ```
4. Save the file

## Step 2: Install Dependencies

### Backend
```bash
mvn clean install
```

### Frontend
```bash
cd frontend
npm install
```

## Step 3: Start the Application

### Option A: Use the Start Script (Recommended)

```bash
chmod +x start-app.sh
./start-app.sh
```

This will start both backend and frontend servers.

### Option B: Manual Start

**Terminal 1 - Backend:**
```bash
mvn jetty:run
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

## Step 4: Access the Application

Once both servers are running, access the app at:

- **Frontend**: http://TCDFYPmeditaionApp.com:5173
- **Backend API**: http://TCDFYPmeditaionApp.com:8080


## Troubleshooting

### Domain not resolving?

1. Check hosts file entry:
   ```bash
   cat /etc/hosts | grep TCDFYPmeditaionApp
   ```
   Should show: `127.0.0.1 TCDFYPmeditaionApp.com`

2. Flush DNS cache:
   - **macOS**: `sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder`
   - **Linux**: `sudo systemd-resolve --flush-caches` or `sudo service network-manager restart`
   - **Windows**: `ipconfig /flushdns`

### Port already in use?

- Change port in `pom.xml` (backend) or `vite.config.ts` (frontend)
- Or stop the process using the port:
  ```bash
  # Find process on port 8080
  lsof -i :8080
  # Kill it
  kill -9 <PID>
  ```

### CORS errors?

The backend is configured to accept requests from `TCDFYPmeditaionApp.com`. If you see CORS errors, make sure you're accessing the frontend via the domain name, not `localhost`.

## Data Storage

Questionnaire responses are automatically saved to the `questionnaire_responses/` directory in the project root. Only you (the researcher) can access these files.

## Stopping the Servers

- If using the start script: Press `Ctrl+C`
- Manual stop:
  ```bash
  # Stop backend
  pkill -f 'jetty:run'
  
  # Stop frontend
  pkill -f 'vite'
  ```
