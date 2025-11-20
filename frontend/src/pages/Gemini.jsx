import { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Trash2, Search, Save } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function Gemini() {
  const [config, setConfig] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [newFlag, setNewFlag] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await axios.get(`${API_URL}/config`);
      setConfig(res.data);
    } catch (err) {
      console.error("Error fetching config", err);
    } finally {
      setLoading(false);
    }
  };

  const updateGeminiConfig = async (newGeminiConfig) => {
    // Optimistic UI update
    const updatedProfile = { ...config };
    updatedProfile.profiles[updatedProfile.active_profile].apps.gemini = newGeminiConfig;
    setConfig(updatedProfile);

    try {
      await axios.post(`${API_URL}/config`, {
        updates: {
          apps: {
            ...config.profiles[config.active_profile].apps,
            gemini: newGeminiConfig
          }
        }
      });
    } catch (err) {
      console.error("Error saving config", err);
      fetchConfig(); // Revert on error
    }
  };

  const toggleEnabled = () => {
    const current = getGeminiConfig();
    updateGeminiConfig({ ...current, enabled: !current.enabled });
  };

  const addFlag = () => {
    if (!newFlag) return;
    const current = getGeminiConfig();
    const newConfigs = {
      ...current.flag_configs,
      [newFlag]: { note: "", enabled: true }
    };
    updateGeminiConfig({ ...current, flag_configs: newConfigs });
    setNewFlag("");
  };

  const removeFlag = (flagId) => {
    const current = getGeminiConfig();
    const newConfigs = { ...current.flag_configs };
    delete newConfigs[flagId];
    updateGeminiConfig({ ...current, flag_configs: newConfigs });
  };

  const toggleFlag = (flagId) => {
    const current = getGeminiConfig();
    const flag = current.flag_configs[flagId];
    const newConfigs = {
      ...current.flag_configs,
      [flagId]: { ...flag, enabled: !flag.enabled }
    };
    updateGeminiConfig({ ...current, flag_configs: newConfigs });
  };

  const updateNote = (flagId, note) => {
    const current = getGeminiConfig();
    const flag = current.flag_configs[flagId];
    const newConfigs = {
      ...current.flag_configs,
      [flagId]: { ...flag, note }
    };
    updateGeminiConfig({ ...current, flag_configs: newConfigs });
  };

  const getGeminiConfig = () => {
    if (!config || !config.profiles) return { enabled: true, flag_configs: {} };
    const active = config.active_profile || 'default';
    const profile = config.profiles[active];
    if (!profile || !profile.apps) return { enabled: true, flag_configs: {} };
    return profile.apps.gemini || { enabled: true, flag_configs: {} };
  };

  if (loading) return <div className="text-white p-8">Loading configuration...</div>;

  const geminiConfig = getGeminiConfig();
  const flags = Object.entries(geminiConfig.flag_configs || {})
    .filter(([id, data]) => {
      const term = searchTerm.toLowerCase();
      const idMatch = id.toLowerCase().includes(term);
      const noteMatch = (data.note || "").toLowerCase().includes(term);
      return idMatch || noteMatch;
    });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        {/* Added role="heading" explicitly for testing */}
        <h1 role="heading" className="text-3xl font-bold text-white">Gemini Tweaks</h1>
        <div className="flex items-center space-x-3">
           <span className="text-gray-400 text-sm">Enable Injection</span>
           <button
             onClick={toggleEnabled}
             className={`w-12 h-6 rounded-full transition-colors relative ${geminiConfig.enabled ? 'bg-blue-600' : 'bg-gray-600'}`}
           >
             <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${geminiConfig.enabled ? 'left-7' : 'left-1'}`} />
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Flags List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-500" />
              <input
                type="text"
                placeholder="Search flags..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
            <div className="p-4 border-b border-gray-700 bg-gray-800/50 flex justify-between items-center">
              <span className="text-gray-400 font-medium">Active Flags ({flags.length})</span>
            </div>
            <div className="max-h-[600px] overflow-y-auto divide-y divide-gray-700">
              {flags.map(([id, data]) => (
                <div key={id} className="p-4 hover:bg-gray-750 transition-colors flex items-center space-x-4">
                  <input
                    type="checkbox"
                    checked={data.enabled}
                    onChange={() => toggleFlag(id)}
                    className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500 focus:ring-offset-gray-800"
                  />
                  <div className="flex-1">
                    <div className="text-white font-mono font-medium">{id}</div>
                    <input
                      type="text"
                      value={data.note}
                      onChange={(e) => updateNote(id, e.target.value)}
                      placeholder="Add a note..."
                      className="w-full bg-transparent text-sm text-gray-400 focus:text-white focus:outline-none mt-1 border-none p-0"
                    />
                  </div>
                  <button
                    onClick={() => removeFlag(id)}
                    className="p-2 text-gray-500 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
              {flags.length === 0 && (
                <div className="p-8 text-center text-gray-500">
                  No flags found matching your search.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Add Flag & Tools */}
        <div className="space-y-6">
          <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
            <h3 className="text-lg font-medium text-white mb-4">Add New Flag</h3>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Flag ID or Range (100-200)"
                value={newFlag}
                onChange={(e) => setNewFlag(e.target.value)}
                className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <button
                onClick={addFlag}
                disabled={!newFlag}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 text-white font-medium py-2 rounded-lg transition-colors flex items-center justify-center"
              >
                <Plus className="w-5 h-5 mr-2" />
                Add Flag
              </button>
            </div>
          </div>

          <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
             <h3 className="text-lg font-medium text-white mb-4">Binary Search</h3>
             <p className="text-gray-400 text-sm mb-4">
               Use this tool to find which specific flag in a range enables a hidden feature.
             </p>
             <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-200 text-sm">
               Coming soon in Web UI. For now, please add ranges manually above.
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
