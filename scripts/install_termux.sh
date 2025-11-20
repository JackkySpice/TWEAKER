#!/bin/bash

echo "AI Tweaker - Termux Installation Script"
echo "======================================="

# Update packages
echo "[+] Updating Termux packages..."
pkg update -y && pkg upgrade -y

# Install dependencies
echo "[+] Installing Python, Node.js, Rust, and build tools..."
pkg install python nodejs rust binutils build-essential openssl git -y

# Setup Backend
echo "[+] Setting up Backend..."
cd ~/AITweaker/app/backend
# Create virtual env to avoid polluting global
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Setup Frontend
echo "[+] Setting up Frontend..."
cd ~/AITweaker/app/frontend
npm install
npm run build

# Create a unified runner script
echo "[+] Creating runner script..."
cat <<EOF > ~/start_aitweaker.sh
#!/bin/bash
cd ~/AITweaker/app/backend
source venv/bin/activate

# Start Backend (which also serves Frontend now)
echo "Starting AI Tweaker Server..."
# We run uvicorn on 0.0.0.0 to allow access from local network if needed
uvicorn main:app --host 0.0.0.0 --port 8000

EOF

chmod +x ~/start_aitweaker.sh

echo "======================================="
echo "Installation complete!"
echo "Run ~/start_aitweaker.sh to start the app."
