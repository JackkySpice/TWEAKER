import { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Trash2, Search, Save, Edit2, X } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function Gemini() {
  const [config, setConfig] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [newFlag, setNewFlag] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Edit Flag State
  const [editingFlagId, setEditingFlagId] = useState(null);
  const [editFlagValue, setEditFlagValue] = useState("");

  // Binary Search State
  const [binarySearchRange, setBinarySearchRange] = useState("");
  const [binarySearchState, setBinarySearchState] = useState(null);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setError(null);
      const res = await axios.get(`${API_URL}/config`);
      setConfig(res.data);
    } catch (err) {
      console.error("Error fetching config", err);
      setError("Failed to load configuration.");
    } finally {
      setLoading(false);
    }
  };

  const updateGeminiConfig = async (newGeminiConfig) => {
    setError(null);
    // Optimistic UI update
    const updatedProfile = { ...config };
    if (!updatedProfile.profiles || !updatedProfile.active_profile) {
        console.error("Config structure invalid for update");
        return;
    }
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
      setError("Failed to save changes. Reverting...");
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

    if (current.flag_configs && current.flag_configs[newFlag]) {
        setError(`Flag ${newFlag} already exists.`);
        return;
    }

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

  const startEditingFlag = (id) => {
    setEditingFlagId(id);
    setEditFlagValue(id);
    setError(null);
  };

  const saveEditedFlag = (oldId) => {
      if (!editFlagValue) {
          setError("Flag ID cannot be empty.");
          return;
      }
      if (editFlagValue === oldId) {
          setEditingFlagId(null);
          return;
      }

      const current = getGeminiConfig();

      if (current.flag_configs && current.flag_configs[editFlagValue]) {
          setError(`Flag ${editFlagValue} already exists.`);
          return;
      }

      const newConfigs = { ...current.flag_configs };
      const flagData = newConfigs[oldId];

      // Remove old key
      delete newConfigs[oldId];
      // Add new key with same data
      newConfigs[editFlagValue] = flagData;

      updateGeminiConfig({ ...current, flag_configs: newConfigs });
      setEditingFlagId(null);
  };

  const cancelEditFlag = () => {
      setEditingFlagId(null);
      setEditFlagValue("");
      setError(null);
  };

  // Binary Search Logic
  const startBinarySearch = () => {
      setError(null);
      if (!binarySearchRange) return;

      const parts = binarySearchRange.split('-').map(p => parseInt(p.trim()));
      if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1])) {
          setError("Invalid range format. Use format: 100-200");
          return;
      }

      const [start, end] = parts;
      if (start >= end) {
          setError("Invalid range: Start must be less than end.");
          return;
      }

      const mid = Math.floor((start + end) / 2);

      // Add the lower half range as a flag to enable checking
      const rangeFlag = `${start}-${mid}`;

      const current = getGeminiConfig();
      const newConfigs = {
          ...current.flag_configs,
          [rangeFlag]: { note: "Binary Search: Lower Half", enabled: true }
      };
      updateGeminiConfig({ ...current, flag_configs: newConfigs });
      setBinarySearchState({ start, end, currentRange: rangeFlag, step: 1 });
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
        <h1 className="text-3xl font-bold text-white">Gemini Tweaks</h1>
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

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg flex justify-between items-center">
            <span>{error}</span>
            <button onClick={() => setError(null)}><X className="w-4 h-4" /></button>
        </div>
      )}

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
                    {editingFlagId === id ? (
                        <div className="flex items-center space-x-2">
                            <input
                                type="text"
                                value={editFlagValue}
                                onChange={(e) => setEditFlagValue(e.target.value)}
                                className="bg-gray-900 text-white px-2 py-1 rounded border border-blue-500 focus:outline-none"
                            />
                            <button onClick={() => saveEditedFlag(id)} className="text-green-400"><Save className="w-4 h-4" /></button>
                            <button onClick={cancelEditFlag} className="text-red-400"><X className="w-4 h-4" /></button>
                        </div>
                    ) : (
                        <div className="flex items-center space-x-2 group">
                            <div className="text-white font-mono font-medium">{id}</div>
                            <button onClick={() => startEditingFlag(id)} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-white transition-opacity">
                                <Edit2 className="w-3 h-3" />
                            </button>
                        </div>
                    )}
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
               Enter a range to start a binary search. This will automatically add flags to help you isolate features.
             </p>
             <div className="space-y-3">
                 <input
                    type="text"
                    placeholder="e.g. 45000-46000"
                    value={binarySearchRange}
                    onChange={(e) => setBinarySearchRange(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                 />
                 <button
                    onClick={startBinarySearch}
                    disabled={!binarySearchRange}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium py-2 rounded-lg transition-colors"
                 >
                    Start Search
                 </button>
             </div>
             {binarySearchState && (
                 <div className="mt-4 p-3 bg-blue-900/30 rounded border border-blue-500/30 text-sm text-blue-200">
                     <p>Search Active: {binarySearchState.currentRange}</p>
                     <p className="text-xs mt-1 text-gray-400">If the feature works, keep this range. If not, try the other half.</p>
                 </div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
}
