import subprocess
import threading
import asyncio
import os

class ProxyManager:
    def __init__(self):
        self.process = None
        self.log_queue = asyncio.Queue()
        self.is_running = False
        self.port = 8080

    async def start_proxy(self, port=8080):
        if self.is_running:
            return

        self.port = port
        # Command to run mitmdump with the addon script
        # --set block_global=false is needed to allow remote connections
        cmd = ["mitmdump", "-s", "addon_proxy.py", "-p", str(port), "--set", "block_global=false"]

        try:
            # Use unbuffered output
            self.process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                bufsize=1,
                universal_newlines=True,
                cwd=os.path.dirname(os.path.abspath(__file__))
            )
            self.is_running = True

            # Start threads to read logs
            threading.Thread(target=self._read_stream, args=(self.process.stdout, "INFO"), daemon=True).start()
            threading.Thread(target=self._read_stream, args=(self.process.stderr, "ERROR"), daemon=True).start()

            await self.log_queue.put(f"Proxy started on port {port}")
        except Exception as e:
            await self.log_queue.put(f"Failed to start proxy: {str(e)}")
            self.is_running = False

    async def stop_proxy(self):
        if self.process:
            self.process.terminate()
            self.process = None
            self.is_running = False
            await self.log_queue.put("Proxy stopped")

    def _read_stream(self, stream, level):
        """Reads stdout/stderr from the subprocess and puts lines into the async queue."""
        for line in iter(stream.readline, ''):
            if line:
                # We need to run the async put in a thread-safe way
                asyncio.run_coroutine_threadsafe(self.log_queue.put(line.strip()), asyncio.get_event_loop())

    async def get_logs(self):
        """Generator to stream logs to WebSocket."""
        while True:
            log = await self.log_queue.get()
            yield log
