import React, { useEffect, useState } from 'react';
import { 
  Key, Database, Link, Save, CheckCircle2, 
  HelpCircle, AlertCircle, Info, RefreshCw, Sparkles 
} from 'lucide-react';
import * as API from '../services/api';

export default function Settings() {
  const [config, setConfig] = useState(null);
  const [mondayKey, setMondayKey] = useState('');
  const [dealsId, setDealsId] = useState('');
  const [woId, setWoId] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const fetchSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await API.getSettings();
      setConfig(data);
      setDealsId(data.deals_board_id || '');
      setWoId(data.work_orders_board_id || '');
    } catch (err) {
      console.error(err);
      setError('Failed to load active server settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      await API.updateSettings({
        monday_api_key: mondayKey ? mondayKey : undefined,
        deals_board_id: dealsId ? dealsId : undefined,
        work_orders_board_id: woId ? woId : undefined,
        gemini_api_key: geminiKey ? geminiKey : undefined
      });
      setMessage('Configuration saved successfully. Services have re-initialized.');
      setMondayKey('');
      setGeminiKey('');
      fetchSettings();
    } catch (err) {
      console.error(err);
      setError('Failed to update workspace configuration settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-12 h-12 border-4 rounded-full border-primary border-t-transparent animate-spin"></div>
        <p className="text-dark-muted dark:text-light-muted">Reading environment settings configs...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Page Header */}
      <div>
        <h2 className="text-xl font-extrabold text-light-text dark:text-dark-text">System Configuration & Integration</h2>
        <p className="text-xs text-light-muted dark:text-dark-muted mt-0.5">Configure live Monday.com GraphQL connections and Google Gemini API keys.</p>
      </div>

      {/* Success/Error Alerts */}
      {message && (
        <div className="p-4 bg-accent-emerald/10 border border-accent-emerald/20 rounded-xl flex items-center space-x-2.5">
          <CheckCircle2 className="w-5 h-5 text-accent-emerald shrink-0" />
          <p className="text-xs text-accent-emerald font-medium">{message}</p>
        </div>
      )}
      {error && (
        <div className="p-4 bg-accent-red/10 border border-accent-red/20 rounded-xl flex items-center space-x-2.5">
          <AlertCircle className="w-5 h-5 text-accent-red shrink-0" />
          <p className="text-xs text-accent-red font-medium">{error}</p>
        </div>
      )}

      {/* Connections Mode Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border rounded-xl p-5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-2.5 rounded-lg ${
              config.connection_mode === 'Live' ? 'bg-accent-emerald/10 text-accent-emerald' : 'bg-primary/10 text-primary animate-pulse-slow'
            }`}>
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-light-text dark:text-dark-text uppercase tracking-wider">Data Source Connection</h4>
              <p className="text-sm font-extrabold text-light-text dark:text-dark-text mt-0.5">{config.connection_mode} Data Mode</p>
            </div>
          </div>
          <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
            config.connection_mode === 'Live' ? 'bg-accent-emerald/10 text-accent-emerald' : 'bg-primary/10 text-primary'
          }`}>
            {config.connection_mode === 'Live' ? 'Active GraphQL API' : 'Simulated CSV Active'}
          </span>
        </div>

        <div className="bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border rounded-xl p-5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-2.5 rounded-lg ${
              config.ai_mode === 'Live' ? 'bg-accent-emerald/10 text-accent-emerald' : 'bg-primary/10 text-primary animate-pulse-slow'
            }`}>
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-light-text dark:text-dark-text uppercase tracking-wider">Gemini Engine Status</h4>
              <p className="text-sm font-extrabold text-light-text dark:text-dark-text mt-0.5">{config.ai_mode} Intelligence</p>
            </div>
          </div>
          <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
            config.ai_mode === 'Live' ? 'bg-accent-emerald/10 text-accent-emerald' : 'bg-primary/10 text-primary'
          }`}>
            {config.ai_mode === 'Live' ? 'Gemini 1.5 Active' : 'Semantic Renderer Active'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Settings Entry Form (2/3 width) */}
        <form onSubmit={handleSave} className="lg:col-span-2 bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border rounded-xl p-6 space-y-5">
          <h3 className="text-sm font-bold text-light-text dark:text-dark-text border-b border-light-border dark:border-dark-border pb-3 flex items-center">
            <Link className="w-4 h-4 text-primary mr-1.5" /> Workspace Connections Manager
          </h3>

          <div className="space-y-4">
            {/* Monday.com API key */}
            <div>
              <label className="block text-xs font-bold text-light-text dark:text-dark-text mb-1 flex items-center uppercase tracking-wider">
                <Key className="w-3.5 h-3.5 mr-1 text-primary" /> Monday.com Personal API Token
              </label>
              <input 
                type="password" 
                value={mondayKey}
                onChange={(e) => setMondayKey(e.target.value)}
                placeholder={config.monday_api_key_set ? '••••••••••••••••••••••••••••' : 'Enter Monday API Token...'}
                className="w-full px-3 py-2 bg-light-hover dark:bg-dark-hover border border-light-border dark:border-dark-border rounded-lg text-xs text-light-text dark:text-dark-text focus:outline-none focus:border-primary font-mono"
              />
            </div>

            {/* Board ID grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-light-text dark:text-dark-text mb-1 uppercase tracking-wider">
                  Deals Board ID
                </label>
                <input 
                  type="text" 
                  value={dealsId}
                  onChange={(e) => setDealsId(e.target.value)}
                  placeholder="e.g. 7894561230"
                  className="w-full px-3 py-2 bg-light-hover dark:bg-dark-hover border border-light-border dark:border-dark-border rounded-lg text-xs text-light-text dark:text-dark-text focus:outline-none focus:border-primary font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-light-text dark:text-dark-text mb-1 uppercase tracking-wider">
                  Work Orders Board ID
                </label>
                <input 
                  type="text" 
                  value={woId}
                  onChange={(e) => setWoId(e.target.value)}
                  placeholder="e.g. 9876543210"
                  className="w-full px-3 py-2 bg-light-hover dark:bg-dark-hover border border-light-border dark:border-dark-border rounded-lg text-xs text-light-text dark:text-dark-text focus:outline-none focus:border-primary font-mono"
                />
              </div>
            </div>

            {/* Gemini API key */}
            <div>
              <label className="block text-xs font-bold text-light-text dark:text-dark-text mb-1 flex items-center uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 mr-1 text-accent-purple" /> Google Gemini API Key
              </label>
              <input 
                type="password" 
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                placeholder={config.gemini_api_key_set ? '••••••••••••••••••••••••••••' : 'Enter Gemini API Key...'}
                className="w-full px-3 py-2 bg-light-hover dark:bg-dark-hover border border-light-border dark:border-dark-border rounded-lg text-xs text-light-text dark:text-dark-text focus:outline-none focus:border-primary font-mono"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-light-border dark:border-dark-border flex justify-end">
            <button 
              type="submit"
              className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer shadow-md shadow-primary/20"
              disabled={saving}
            >
              {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>{saving ? 'Updating env file...' : 'Save Configurations'}</span>
            </button>
          </div>
        </form>

        {/* Integration Instructions Sidebar (1/3 width) */}
        <div className="bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border rounded-xl p-5 space-y-4">
          <h3 className="text-xs font-bold text-light-text dark:text-dark-text uppercase tracking-wider flex items-center">
            <Info className="w-4 h-4 text-accent-purple mr-1.5" /> Quick Setup Instructions
          </h3>

          <div className="text-[11px] text-light-muted dark:text-dark-muted space-y-3.5 leading-relaxed">
            <div>
              <p className="font-bold text-light-text dark:text-dark-text">1. Mock Mode (Default)</p>
              <p className="mt-0.5">Leave inputs blank. The server will run in simulation mode using the prepackaged CSV backups downloaded from Google Sheets.</p>
            </div>
            
            <div>
              <p className="font-bold text-light-text dark:text-dark-text">2. Gemini API Token</p>
              <p className="mt-0.5">Generate a free key at the Google AI Studio console and enter it in the key field to enable advanced natural language explanations.</p>
            </div>

            <div>
              <p className="font-bold text-light-text dark:text-dark-text">3. Monday.com live connection</p>
              <p className="mt-0.5">Retrieve your API key from **Monday.com Profile &gt; Developer Options**. Create two boards (Deals & Work Orders) using the spreadsheet columns, and input the board IDs here.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
