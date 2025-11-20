# AI Leaks Tweaker (Web Edition)

A modern, fully functional web-based AI modification tool. It intercepts and modifies network requests for AI web applications (Gemini, Copilot, Google Labs) to enable hidden features, debug, and explore capabilities.

**Now runs everywhere: PC, Docker, and Android (via Termux).**

## Features

- **Modern Web UI**: Beautiful, responsive Dark Mode interface built with React and TailwindCSS.
- **Universal Compatibility**: Runs on Windows, macOS, Linux, and **Android**.
- **Gemini Tweaks**: Enable, disable, and inject specific feature flags into Google Gemini.
- **Live Proxy Control**: Start/Stop the underlying `mitmproxy` engine directly from the browser.
- **Real-time Logs**: View proxy traffic logs instantly in the dashboard.
- **Connection Guide**: Built-in wizard to help you install CA Certificates and configure your device's proxy settings.

---

## Installation

### 1. Android (Termux) - *Highly Recommended for Mobile*
Turn your phone into a portable AI hacking station.

1.  Install **Termux** from F-Droid.
2.  Open Termux and run the following command to clone and install:

    ```bash
    pkg install git -y
    git clone <repository_url> AITweaker
    cd AITweaker
    bash app/scripts/install_termux.sh
    ```

3.  Once installed, start the app:
    ```bash
    ~/start_aitweaker.sh
    ```
4.  Open your browser and go to `http://localhost:8000`.

### 2. Docker (PC/Server) - *Easiest for PC*
Run the entire stack in a container with a single command.

1.  Ensure you have Docker installed.
2.  Build and run:

    ```bash
    docker build -t aitweaker ./app
    docker run -d -p 8000:8000 -p 8080:8080 aitweaker
    ```
3.  Access the UI at `http://localhost:8000`.

### 3. Manual Installation (PC - Dev Mode)

**Backend:**
```bash
cd app/backend
python3 -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
python main.py
```

**Frontend:**
```bash
cd app/frontend
npm install
npm run dev
```

---

## Usage Guide

### Step 1: Connect to the Dashboard
Open `http://localhost:8000` (or your server's IP) in your browser.

### Step 2: Start the Proxy
1.  On the Dashboard, click **Start Proxy**.
2.  Note the **Server IP** and **Port** (default 8080) displayed.

### Step 3: Configure Your Device
You need to route your traffic through the AI Tweaker.

*   **Android**: Go to WiFi Settings -> Edit Network -> Advanced -> Proxy -> Manual. Enter the IP and Port from the dashboard.
*   **PC**: Use system proxy settings or a browser extension like FoxyProxy.

### Step 4: Install Certificate
1.  Go to the **Connect Guide** page in the Web UI.
2.  Click **Download mitmproxy-ca-cert.pem**.
3.  Install it as a **Trusted Root Certificate** on your device.
    *   *Android*: Settings -> Security -> Encryption & Credentials -> Install a certificate -> CA Certificate.
    *   *PC*: Double click and install to "Trusted Root Certification Authorities".

### Step 5: Tweak!
Go to the **Gemini Tweaks** page, add flags, enable the injector, and refresh your Gemini tab to see the magic happen.

---

## Troubleshooting

*   **"Connection Refused"**: Ensure you are using the correct IP address. If running on Termux, use the IP shown in the dashboard, not `localhost` if you are connecting from another device (e.g., PC connecting to Phone).
*   **HTTPS Errors**: This means the Certificate is not installed correctly. Visit `http://mitm.it` on the device *while connected to the proxy* to download the cert again.

## Disclaimer
This tool is for educational and research purposes only. Use responsibly.
