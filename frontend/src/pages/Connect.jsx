import { Download, Smartphone, Monitor, Wifi } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function Connect() {

  const downloadCert = () => {
    window.open(`${API_URL}/cert`, '_blank');
  };

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-white">Connection Guide</h1>

      {/* Step 1: CA Certificate */}
      <div className="bg-gray-800 p-8 rounded-xl border border-gray-700">
        <div className="flex items-start space-x-6">
          <div className="p-4 bg-blue-500/10 rounded-xl">
            <Download className="w-8 h-8 text-blue-400" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-white mb-2">1. Install CA Certificate</h2>
            <p className="text-gray-400 mb-4">
              To intercept and modify HTTPS traffic (Gemini, Copilot), you must install the mitmproxy CA certificate on your device.
            </p>
            <button
              onClick={downloadCert}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors flex items-center"
            >
              <Download className="w-5 h-5 mr-2" />
              Download mitmproxy-ca-cert.pem
            </button>
            <p className="mt-4 text-sm text-gray-500">
              Note: If the button doesn't work, visit <code className="bg-gray-900 px-1 py-0.5 rounded text-gray-300">http://mitm.it</code>
              on your device <strong>after</strong> configuring the proxy.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Android Guide */}
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <div className="flex items-center mb-6">
            <Smartphone className="w-6 h-6 text-green-400 mr-3" />
            <h2 className="text-xl font-bold text-white">Android Setup</h2>
          </div>
          <ol className="space-y-4 text-gray-300 list-decimal list-inside">
            <li>Go to <strong>Settings {'>'} Network & internet {'>'} Wi-Fi</strong>.</li>
            <li>Tap the gear icon next to your current Wi-Fi network.</li>
            <li>Tap the <strong>Edit</strong> (pencil) button.</li>
            <li>Expand <strong>Advanced options</strong>.</li>
            <li>Set <strong>Proxy</strong> to <code className="text-blue-400">Manual</code>.</li>
            <li>
              Set <strong>Proxy hostname</strong> to the IP shown on the Dashboard.
            </li>
            <li>Set <strong>Proxy port</strong> to <code className="text-blue-400">8080</code> (or your custom port).</li>
            <li>Save changes.</li>
            <li>Open a browser and go to <code className="text-blue-400">http://mitm.it</code> to install the cert if you haven't already.</li>
          </ol>
        </div>

        {/* PC Guide */}
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <div className="flex items-center mb-6">
            <Monitor className="w-6 h-6 text-purple-400 mr-3" />
            <h2 className="text-xl font-bold text-white">PC (Windows/Mac/Linux)</h2>
          </div>
          <ol className="space-y-4 text-gray-300 list-decimal list-inside">
            <li>
              <strong>Windows:</strong> Settings {'>'} Network & Internet {'>'} Proxy.
              Turn on "Use a proxy server".
            </li>
            <li>
              <strong>macOS:</strong> System Settings {'>'} Network {'>'} Wi-Fi {'>'} Details {'>'} Proxies.
              Check "Web Proxy (HTTP)" and "Secure Web Proxy (HTTPS)".
            </li>
            <li>
              <strong>Linux:</strong> System Settings {'>'} Network {'>'} Network Proxy.
            </li>
            <li>
              Enter Address: <code className="text-blue-400">127.0.0.1</code> (if running locally)
              or the Server IP.
            </li>
            <li>Port: <code className="text-blue-400">8080</code>.</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
