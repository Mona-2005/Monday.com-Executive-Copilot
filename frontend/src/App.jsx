import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { 
  TrendingUp, MessageSquare, BarChart3, FileText, Database, 
  Settings as SettingsIcon, Sun, Moon, Sparkles, RefreshCw, AlertCircle
} from 'lucide-react';

// Import Pages
import Dashboard from './pages/Dashboard';
import AIChat from './pages/AIChat';
import Analytics from './pages/Analytics';
import LeadershipReports from './pages/LeadershipReports';
import DataQuality from './pages/DataQuality';
import Settings from './pages/Settings';

import * as API from './services/api';

function AppContent() {
  const location = useLocation();
  const [darkMode, setDarkMode] = useState(true);
  const [sysStatus, setSysStatus] = useState({
    connection_mode: 'Simulated',
    ai_mode: 'Simulated'
  });

  // Apply dark mode theme class to document
  useEffect(() => {
    const root = window.document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [darkMode]);

  // Load system integration status
  const fetchStatus = async () => {
    try {
      const data = await API.getSettings();
      setSysStatus({
        connection_mode: data.connection_mode,
        ai_mode: data.ai_mode
      });
    } catch (err) {
      console.error('Error fetching backend status:', err);
    }
  };

  useEffect(() => {
    fetchStatus();
    // Poll status occasionally to catch settings changes
    const interval = setInterval(fetchStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleManualSync = async () => {
    try {
      await API.clearCache();
      fetchStatus();
      // Reload page content by firing custom event or let state handle it
      window.location.reload();
    } catch (err) {
      alert('Sync failed');
    }
  };

  // Nav items configuration
  const navItems = [
    { path: '/', label: 'Executive Dashboard', icon: TrendingUp },
    { path: '/chat', label: 'AI Chat Advisor', icon: MessageSquare },
    { path: '/analytics', label: 'Deep Analytics', icon: BarChart3 },
    { path: '/reports', label: 'Leadership Reports', icon: FileText },
    { path: '/quality', label: 'Data Quality', icon: Database },
    { path: '/settings', label: 'System Settings', icon: SettingsIcon },
  ];

  return (
    <div className="flex h-screen bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text overflow-hidden transition-colors duration-200">
      
      {/* Sidebar - HIDDEN in print */}
      <aside className="w-64 bg-light-card dark:bg-dark-card border-r border-light-border dark:border-dark-border flex flex-col justify-between shrink-0 no-print">
        {/* Sidebar Logo */}
        <div>
          <div className="p-6 border-b border-light-border dark:border-dark-border flex items-center space-x-2.5">
            <div className="p-2 bg-primary/20 text-primary rounded-lg">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h1 className="text-xs font-black uppercase tracking-wider text-light-text dark:text-dark-text">Monday.com</h1>
              <p className="text-[10px] font-semibold text-primary dark:text-primary leading-none mt-0.5">EXECUTIVE COPILOT</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link 
                  key={item.path} 
                  to={item.path}
                  className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                    isActive 
                      ? 'bg-primary text-white shadow-md shadow-primary/20' 
                      : 'text-light-muted dark:text-dark-muted hover:bg-light-hover dark:hover:bg-dark-hover hover:text-light-text hover:dark:text-dark-text'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer Controls */}
        <div className="p-4 border-t border-light-border dark:border-dark-border space-y-4">
          {/* Status Badges */}
          <div className="space-y-2 text-[10px] font-semibold">
            <div className="flex justify-between items-center text-light-muted dark:text-dark-muted">
              <span>Data Mode:</span>
              <span className={`px-1.5 py-0.5 rounded ${
                sysStatus.connection_mode === 'Live' ? 'bg-accent-emerald/10 text-accent-emerald' : 'bg-primary/10 text-primary'
              }`}>{sysStatus.connection_mode}</span>
            </div>
            <div className="flex justify-between items-center text-light-muted dark:text-dark-muted">
              <span>AI Mode:</span>
              <span className={`px-1.5 py-0.5 rounded ${
                sysStatus.ai_mode === 'Live' ? 'bg-accent-emerald/10 text-accent-emerald' : 'bg-primary/10 text-primary'
              }`}>{sysStatus.ai_mode}</span>
            </div>
          </div>

          {/* Theme & Sync button */}
          <div className="flex justify-between items-center">
            <button 
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-lg bg-light-hover dark:bg-dark-hover border border-light-border dark:border-dark-border hover:border-primary text-light-text dark:text-dark-text transition-colors cursor-pointer"
              title="Toggle Theme"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            
            <button 
              onClick={handleManualSync}
              className="px-3 py-2 bg-light-hover dark:bg-dark-hover border border-light-border dark:border-dark-border hover:border-primary rounded-lg text-[10px] font-semibold text-light-text dark:text-dark-text flex items-center space-x-1.5 transition-colors cursor-pointer"
              title="Clear Cache & Sync Fresh"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Clear Cache</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Workspace Frame */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header Navbar - HIDDEN in print */}
        <header className="h-16 border-b border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card px-6 flex justify-between items-center shrink-0 no-print">
          <div>
            <h2 className="text-sm font-bold text-light-text dark:text-dark-text">
              {navItems.find(n => n.path === location.pathname)?.label || 'Workspace'}
            </h2>
          </div>

          {/* System Date Badge */}
          <div className="flex items-center space-x-4 text-xs font-semibold text-light-muted dark:text-dark-muted">
            <span>July 27, 2026</span>
          </div>
        </header>

        {/* Content Body Container */}
        <div className="flex-1 overflow-y-auto p-6 bg-light-bg dark:bg-dark-bg">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/chat" element={<AIChat />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/reports" element={<LeadershipReports />} />
            <Route path="/quality" element={<DataQuality />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </div>
      </main>

    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
