import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Play, Square, Activity, Terminal as TerminalIcon, Download, Copy, Check } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function Dashboard() {
  const [status, setStatus] = useState({ running: false, port: 8080, ip: 'Loading...' });
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const logContainerRef = useRef(null);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // WebSocket for logs
    const ws = new WebSocket(`${API_URL.replace('http', 'ws')}/ws/logs`);

    ws.onmessage = (event) => {
      setLogs((prev) => [...prev.slice(-100), event.data]); // Keep last 100 logs
    };

    return () => ws.close();
  }, []);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const fetchStatus = async () => {
    try {
      const res = await axios.get(`${API_URL}/status`);
      setStatus(res.data);
    } catch (err) {
      console.error("Failed to fetch status", err);
    }
  };

  const toggleProxy = async () => {
    setLoading(true);
    try {
      await axios.post(`${API_URL}/control`, {
        action: status.running ? 'stop' : 'start',
        port: status.port
      });
      await new Promise(r => setTimeout(r, 1000)); // Wait a bit
      await fetchStatus();
    } catch (err) {
      console.error("Failed to toggle proxy", err);
    } finally {
      setLoading(false);
    }
  };

  const copyLogs = () => {
    if (logs.length === 0) return;
    const text = logs.join('\n');

    // Fallback for non-secure contexts (HTTP)
    if (!navigator.clipboard) {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed"; // Avoid scrolling to bottom
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Fallback: Oops, unable to copy', err);
      }
      document.body.removeChild(textArea);
      return;
    }

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(err => {
      console.error('Failed to copy logs:', err);
    });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-white">Dashboard</h1>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-400 font-medium">Proxy Status</h3>
            <Activity className={`w-5 h-5 ${status.running ? 'text-green-400' : 'text-red-400'}`} />
          </div>
          <div className="flex items-center space-x-3">
            <span className={`text-2xl font-bold ${status.running ? 'text-green-400' : 'text-white'}`}>
              {status.running ? 'Online' : 'Offline'}
            </span>
            <span className="text-sm text-gray-500">Port: {status.port}</span>
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-400 font-medium">Server IP</h3>
            <WifiIcon className="w-5 h-5 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {status.ip}
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg flex items-center justify-center">
          <button
            onClick={toggleProxy}
            disabled={loading}
            className={`
              w-full h-full min-h-[80px] rounded-lg flex flex-col items-center justify-center space-y-2 font-bold text-lg transition-all
              ${status.running
                ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/50'
                : 'bg-green-500/10 text-green-500 hover:bg-green-500/20 border border-green-500/50'}
              ${loading ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            {loading ? (
              <span>Processing...</span>
            ) : status.running ? (
              <>
                <Square className="w-6 h-6" />
                <span>Stop Proxy</span>
              </>
            ) : (
              <>
                <Play className="w-6 h-6" />
                <span>Start Proxy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Live Logs */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 shadow-lg overflow-hidden flex flex-col h-[500px]">
        <div className="px-6 py-4 border-b border-gray-700 bg-gray-800/50 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <TerminalIcon className="w-5 h-5 text-gray-400" />
            <h3 className="font-medium text-white">Live Logs</h3>
          </div>
          <button
            onClick={copyLogs}
            className="flex items-center space-x-1 text-xs px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
            title="Copy logs to clipboard"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-green-400" />
                <span className="text-green-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
        <div
          ref={logContainerRef}
          className="flex-1 p-4 overflow-y-auto font-mono text-sm space-y-1 bg-[#0d1117]"
        >
          {logs.length === 0 && (
            <div className="text-gray-600 italic">Waiting for logs...</div>
          )}
          {logs.map((log, i) => (
            <div key={i} className="text-gray-300 break-all border-l-2 border-transparent hover:border-gray-600 pl-2">
              <span className="opacity-50 select-none mr-2">
                {new Date().toLocaleTimeString()}
              </span>
              {log}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function WifiIcon(props) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>
  )
}
