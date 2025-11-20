import os
import socket
from fastapi import FastAPI, WebSocket, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Dict, Any, Optional
import uvicorn
import asyncio

from config_manager import ConfigManager
from proxy_manager import ProxyManager

app = FastAPI()

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

config_manager = ConfigManager()
proxy_manager = ProxyManager()

class ProfileUpdate(BaseModel):
    updates: Dict[str, Any]

class ProxyControl(BaseModel):
    action: str # "start" or "stop"
    port: Optional[int] = 8080

@app.on_event("startup")
async def startup_event():
    # Ensure rules.json exists on startup
    config_manager.generate_rules_json()
    # Auto-start proxy if configured? For now, let user start it manually.
    # Or we can check the profile settings.
    profile = config_manager.get_active_profile()
    # Optional: auto-start

@app.get("/status")
async def get_status():
    hostname = socket.gethostname()
    local_ip = socket.gethostbyname(hostname)
    try:
        # Try to find the actual outbound IP
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        local_ip = s.getsockname()[0]
        s.close()
    except Exception:
        pass

    return {
        "running": proxy_manager.is_running,
        "port": proxy_manager.port,
        "ip": local_ip
    }

@app.post("/control")
async def control_proxy(control: ProxyControl):
    if control.action == "start":
        await proxy_manager.start_proxy(control.port)
    elif control.action == "stop":
        await proxy_manager.stop_proxy()
    return {"status": "ok", "running": proxy_manager.is_running}

@app.get("/config")
async def get_config():
    return config_manager.get_active_profile()

@app.post("/config")
async def update_config(data: ProfileUpdate):
    updated_profile = config_manager.update_active_profile(data.updates)
    return updated_profile

@app.get("/cert")
async def get_cert():
    # The mitmproxy cert is usually in ~/.mitmproxy/mitmproxy-ca-cert.pem
    # We need to find where mitmproxy stores it.
    # By default on Linux it is ~/.mitmproxy
    cert_path = os.path.expanduser("~/.mitmproxy/mitmproxy-ca-cert.pem")
    if os.path.exists(cert_path):
        return FileResponse(cert_path, filename="mitmproxy-ca-cert.pem", media_type="application/x-pem-file")
    else:
        raise HTTPException(status_code=404, detail="Certificate not found. Start the proxy once to generate it.")

@app.websocket("/ws/logs")
async def websocket_logs(websocket: WebSocket):
    await websocket.accept()
    try:
        async for log in proxy_manager.get_logs():
            await websocket.send_text(log)
    except Exception:
        pass

# Mount frontend if available (for production/docker)
frontend_path = "/app/frontend/dist"
if os.path.exists(frontend_path):
    # Serve index.html for any path that isn't an API route to support React Router
    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        if full_path.startswith("api") or full_path.startswith("ws") or full_path == "status" or full_path == "control" or full_path == "config" or full_path == "cert":
             raise HTTPException(status_code=404, detail="Not Found")

        # Check if file exists in dist (assets, etc)
        file_path = os.path.join(frontend_path, full_path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)

        # Otherwise serve index.html (SPA)
        return FileResponse(os.path.join(frontend_path, "index.html"))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
