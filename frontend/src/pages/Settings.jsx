import { useState, useEffect } from 'react';
import axios from 'axios';
import { Save, RefreshCw } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function Settings() {
  const [config, setConfig] = useState(null);
  const [port, setPort] = useState(8080);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await axios.get(`${API_URL}/config`);
      setConfig(res.data);
      // Assuming active_profile is present and has 'default'
      const active = res.data.active_profile || 'default';
      if (res.data.profiles && res.data.profiles[active]) {
          setPort(res.data.profiles[active].proxy_port || 8080);
      }
    } catch (err) {
      console.error("Error fetching config", err);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    setMessage(null);
    try {
        // Update active profile
        await axios.post(`${API_URL}/config`, {
            updates: {
                proxy_port: parseInt(port)
            }
        });
        setMessage({ type: 'success', text: 'Settings saved! You may need to restart the proxy.' });
    } catch (err) {
        console.error("Error saving settings", err);
        setMessage({ type: 'error', text: 'Failed to save settings.' });
    } finally {
        setSaving(false);
    }
  };

  if (loading) return <div className="text-white p-8">Loading settings...</div>;

  return (
    <div className="space-y-6">
      <h1 role="heading" className="text-3xl font-bold text-white">Settings</h1>

      <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
        <h2 className="text-xl font-semibold text-white mb-4">Proxy Configuration</h2>

        <div className="space-y-4">
            <div>
                <label htmlFor="proxy-port" className="block text-gray-400 mb-2">Proxy Port</label>
                <input
                    id="proxy-port"
                    type="number"
                    value={port}
                    onChange={(e) => setPort(e.target.value)}
                    className="w-full max-w-xs bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <p className="text-xs text-gray-500 mt-1">Default is 8080. Change this if you have port conflicts.</p>
            </div>

            {message && (
                <div className={`p-3 rounded-lg ${message.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                    {message.text}
                </div>
            )}

            <div className="pt-4">
                <button
                    onClick={saveSettings}
                    disabled={saving}
                    className="flex items-center px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
                >
                    {saving ? <RefreshCw className="w-5 h-5 mr-2 animate-spin" /> : <Save className="w-5 h-5 mr-2" />}
                    {saving ? 'Saving...' : 'Save Changes'}
                </button>
            </div>
        </div>
      </div>
    </div>
  );
}
