import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { 
  Send, Sparkles, AlertCircle, RefreshCw, Sliders, Play, 
  HelpCircle, User, Bot, Check, ArrowRight, Info
} from 'lucide-react';
import * as API from '../services/api';

export default function AIChat() {
  // Chat States
  const [query, setQuery] = useState('');
  const [history, setHistory] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Hello! I am your **Monday.com Executive Copilot**. I analyze your live Deals and Work Order boards to answer business intelligence questions. \n\nTry asking me:\n* *How is our overall sales pipeline looking?*\n* *Which business sectors are growing but facing delivery delays?*\n* *Who are our top revenue clients?*\n* *List all delayed work orders.*",
      confidence: 100,
      ai_mode: 'Simulated'
    }
  ]);
  const [loading, setLoading] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState([
    "How is our pipeline?",
    "Which sector has poor execution?",
    "Show stale deals",
    "Generate weekly leadership update"
  ]);

  // What-If Slider States
  const [pendingClose, setPendingClose] = useState(20);
  const [sectorGrowth, setSectorGrowth] = useState(10);
  const [delayReduction, setDelayReduction] = useState(50);
  
  const [simResults, setSimResults] = useState(null);
  const [simLoading, setSimLoading] = useState(false);

  const messagesEndRef = useRef(null);

  // Scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [history, loading]);

  // Run initial default simulation to show baseline values
  useEffect(() => {
    triggerSimulation(true);
  }, []);

  const triggerSimulation = async (isInitial = false) => {
    setSimLoading(true);
    try {
      const res = await API.runWhatIf({
        pending_close_pct: parseFloat(pendingClose),
        sector_growth: parseFloat(sectorGrowth),
        delay_reduction: parseFloat(delayReduction)
      });
      setSimResults(res);
      
      // If user actively triggered, append an alert of success
      if (!isInitial) {
        // success state
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSimLoading(false);
    }
  };

  const handleSend = async (textToSend) => {
    const text = textToSend || query;
    if (!text.trim()) return;

    // Add user message to history
    const userMsg = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text
    };
    setHistory(prev => [...prev, userMsg]);
    setQuery('');
    setLoading(true);

    try {
      // Map history to server format (list of dicts with role/content)
      const formattedHistory = history.map(h => ({
        role: h.role,
        content: h.content
      }));

      const res = await API.queryChat(text, formattedHistory);

      // Add AI response
      const assistantMsg = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: res.response,
        confidence: res.confidence,
        ai_mode: res.ai_mode,
        is_clarification: res.is_clarification
      };
      
      setHistory(prev => [...prev, assistantMsg]);
      setSuggestedQuestions(res.suggested_questions || []);
    } catch (err) {
      console.error(err);
      setHistory(prev => [...prev, {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: "Sorry, I encountered an error querying the analytics engine. Please make sure the backend is active.",
        error: true
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestClick = (q) => {
    handleSend(q);
  };

  const askAiToSummarizeScenario = () => {
    if (!simResults) return;
    const sim = simResults.simulated;
    const base = simResults.baseline;
    
    const scenarioPrompt = (
      `Summarize this simulation scenario:\n` +
      `- Closing ${pendingClose}% of open pipeline\n` +
      `- Sector revenue growing by ${sectorGrowth}%\n` +
      `- Resolving ${delayReduction}% of delayed work orders\n\n` +
      `Outcomes:\n` +
      `- Won Revenue grows from ${fmtCurrency(base.won_revenue)} to ${fmtCurrency(sim.won_revenue)}\n` +
      `- Delayed Work Orders fall from ${base.delayed_work_orders} to ${sim.delayed_work_orders}\n` +
      `- Business Health Score goes from ${base.business_health_score}/100 to ${sim.business_health_score}/100.`
    );
    
    handleSend(scenarioPrompt);
  };

  const fmtCurrency = (val) => {
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)} L`;
    return `₹${val.toLocaleString()}`;
  };

  const deltaText = (val) => {
    if (val > 0) return `+${val.toLocaleString()}`;
    return val.toLocaleString();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-140px)]">
      {/* Left 2 Columns: Chat Workspace */}
      <div className="lg:col-span-2 bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border rounded-xl flex flex-col h-full overflow-hidden">
        {/* Chat Header */}
        <div className="p-4 border-b border-light-border dark:border-dark-border flex justify-between items-center bg-light-hover/20 dark:bg-dark-hover/10">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-primary animate-pulse" />
            <h3 className="text-sm font-bold text-light-text dark:text-dark-text">AI Executive Workspace</h3>
          </div>
          <span className="text-[10px] text-light-muted dark:text-dark-muted flex items-center">
            <Info className="w-3 h-3 mr-1" /> Multi-Board Context Armed
          </span>
        </div>

        {/* Message Log */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {history.map((msg) => (
            <div 
              key={msg.id} 
              className={`flex items-start space-x-3 max-w-[85%] ${
                msg.role === 'user' ? 'ml-auto flex-row-reverse space-x-reverse' : 'mr-auto'
              }`}
            >
              {/* Avatar Icon */}
              <div className={`p-2 rounded-lg shrink-0 ${
                msg.role === 'user' ? 'bg-primary/20 text-primary' : 
                msg.error ? 'bg-accent-red/20 text-accent-red' : 'bg-accent-purple/20 text-accent-purple'
              }`}>
                {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              {/* Message Bubble */}
              <div className="space-y-1.5">
                <div className={`p-4 rounded-xl text-sm leading-relaxed ${
                  msg.role === 'user' 
                    ? 'bg-primary text-white rounded-tr-none' 
                    : 'bg-light-hover dark:bg-dark-hover text-light-text dark:text-dark-text border border-light-border dark:border-dark-border rounded-tl-none'
                }`}>
                  <div className="markdown-content prose prose-sm dark:prose-invert">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                </div>
                
                {/* Meta details (Confidence score / AI source mode) */}
                {msg.role === 'assistant' && !msg.error && (
                  <div className="flex items-center space-x-3 text-[10px] text-light-muted dark:text-dark-muted px-1.5">
                    {msg.confidence && (
                      <span className="flex items-center">
                        Confidence: <strong className="ml-1 text-primary">{msg.confidence}%</strong>
                      </span>
                    )}
                    {msg.ai_mode && (
                      <span className="flex items-center">
                        AI Mode: <strong className="ml-1 text-accent-purple">{msg.ai_mode}</strong>
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Typing Indicator */}
          {loading && (
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-accent-purple/20 text-accent-purple rounded-lg">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-light-hover dark:bg-dark-hover border border-light-border dark:border-dark-border p-4 rounded-xl rounded-tl-none flex items-center justify-center min-w-[70px] min-h-[40px]">
                <div className="dot-flashing"></div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Chip list */}
        {suggestedQuestions.length > 0 && !loading && (
          <div className="px-4 py-2 border-t border-light-border dark:border-dark-border flex flex-wrap gap-1.5 overflow-x-auto bg-light-hover/10 dark:bg-dark-hover/5 max-h-24">
            {suggestedQuestions.map((q, idx) => (
              <button 
                key={idx} 
                onClick={() => handleSuggestClick(q)}
                className="px-2.5 py-1 text-[11px] bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border rounded-full hover:border-primary text-light-text dark:text-dark-text transition-all text-left truncate max-w-xs cursor-pointer hover:bg-light-hover dark:hover:bg-dark-hover"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {/* Input Footer */}
        <div className="p-3 border-t border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card flex items-center space-x-2">
          <input 
            type="text" 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask a business query (e.g. compare powerline and mining sectors)..."
            className="flex-1 px-4 py-2 bg-light-hover dark:bg-dark-hover border border-light-border dark:border-dark-border rounded-lg text-sm text-light-text dark:text-dark-text focus:outline-none focus:border-primary transition-all"
            disabled={loading}
          />
          <button 
            onClick={() => handleSend()}
            className="p-2.5 bg-primary hover:bg-primary-dark text-white rounded-lg transition-all shrink-0 cursor-pointer disabled:opacity-50"
            disabled={loading || !query.trim()}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Right Column: Scenario Simulator Panel */}
      <div className="bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border rounded-xl flex flex-col h-full overflow-hidden">
        {/* Sidebar Header */}
        <div className="p-4 border-b border-light-border dark:border-dark-border bg-light-hover/20 dark:bg-dark-hover/10 flex justify-between items-center">
          <h3 className="text-sm font-bold text-light-text dark:text-dark-text flex items-center">
            <Sliders className="w-4 h-4 text-primary mr-1.5" /> What-If Scenario Analysis
          </h3>
          <span className="text-[10px] text-accent-emerald bg-accent-emerald/10 px-2 py-0.5 rounded font-semibold">
            Deterministic
          </span>
        </div>

        {/* Controls & Metrics */}
        <div className="p-5 flex-1 overflow-y-auto space-y-6">
          <div className="space-y-4">
            {/* Slider 1: Close pipeline deals */}
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1 text-light-text dark:text-dark-text">
                <span>Pipeline Close Rate</span>
                <span className="text-primary">{pendingClose}%</span>
              </div>
              <input 
                type="range" min="0" max="100" step="5"
                value={pendingClose}
                onChange={(e) => setPendingClose(e.target.value)}
                className="w-full h-1.5 bg-light-border dark:bg-dark-border rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <p className="text-[10px] text-light-muted dark:text-dark-muted mt-0.5">Simulates closing a percentage of active open deals as Won.</p>
            </div>

            {/* Slider 2: Sector growth rate */}
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1 text-light-text dark:text-dark-text">
                <span>Sector Growth Target</span>
                <span className="text-primary">{sectorGrowth > 0 ? `+${sectorGrowth}` : sectorGrowth}%</span>
              </div>
              <input 
                type="range" min="-50" max="100" step="5"
                value={sectorGrowth}
                onChange={(e) => setSectorGrowth(e.target.value)}
                className="w-full h-1.5 bg-light-border dark:bg-dark-border rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <p className="text-[10px] text-light-muted dark:text-dark-muted mt-0.5">Simulates market growth/contraction on won revenues.</p>
            </div>

            {/* Slider 3: Delay reduction */}
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1 text-light-text dark:text-dark-text">
                <span>Resolve Overdue Orders</span>
                <span className="text-primary">{delayReduction}%</span>
              </div>
              <input 
                type="range" min="0" max="100" step="5"
                value={delayReduction}
                onChange={(e) => setDelayReduction(e.target.value)}
                className="w-full h-1.5 bg-light-border dark:bg-dark-border rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <p className="text-[10px] text-light-muted dark:text-dark-muted mt-0.5">Reduces delayed and overdue work orders, resolving backlog.</p>
            </div>
            
            <button 
              onClick={() => triggerSimulation(false)}
              className="w-full py-2 bg-primary hover:bg-primary-dark text-white rounded-lg font-medium text-xs flex items-center justify-center space-x-1.5 transition-all cursor-pointer shadow-md shadow-primary/20"
              disabled={simLoading}
            >
              {simLoading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current" />
              )}
              <span>{simLoading ? 'Recalculating Models...' : 'Run Scenario Models'}</span>
            </button>
          </div>

          <hr className="border-light-border dark:border-dark-border" />

          {/* Results Summary */}
          {simResults && (
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-light-text dark:text-dark-text uppercase tracking-wider">Projected Outcomes</h4>
              
              {/* Projected Revenue */}
              <div className="p-3 bg-light-hover/40 dark:bg-dark-hover/20 border border-light-border dark:border-dark-border rounded-lg flex justify-between items-center">
                <div>
                  <p className="text-[10px] text-light-muted dark:text-dark-muted font-semibold uppercase">Projected Won Revenue</p>
                  <p className="text-sm font-bold text-light-text dark:text-dark-text">{fmtCurrency(simResults.simulated.won_revenue)}</p>
                </div>
                <div className="text-right">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    simResults.deltas.won_revenue_change >= 0 ? 'bg-accent-emerald/10 text-accent-emerald' : 'bg-accent-red/10 text-accent-red'
                  }`}>
                    {deltaText(simResults.deltas.won_revenue_change)}
                  </span>
                </div>
              </div>

              {/* Projected Delayed Projects */}
              <div className="p-3 bg-light-hover/40 dark:bg-dark-hover/20 border border-light-border dark:border-dark-border rounded-lg flex justify-between items-center">
                <div>
                  <p className="text-[10px] text-light-muted dark:text-dark-muted font-semibold uppercase">Projected Overdue Projects</p>
                  <p className="text-sm font-bold text-light-text dark:text-dark-text">{simResults.simulated.delayed_work_orders}</p>
                </div>
                <div className="text-right">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    simResults.deltas.delayed_work_orders_change <= 0 ? 'bg-accent-emerald/10 text-accent-emerald' : 'bg-accent-red/10 text-accent-red'
                  }`}>
                    {simResults.deltas.delayed_work_orders_change}
                  </span>
                </div>
              </div>

              {/* Health Score Project */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-light-hover/40 dark:bg-dark-hover/20 border border-light-border dark:border-dark-border rounded-lg">
                  <p className="text-[10px] text-light-muted dark:text-dark-muted font-semibold uppercase">Health Score</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-base font-extrabold text-light-text dark:text-dark-text">{simResults.simulated.business_health_score}/100</span>
                    <span className={`text-[10px] font-semibold ${
                      simResults.deltas.business_health_change >= 0 ? 'text-accent-emerald' : 'text-accent-red'
                    }`}>
                      {simResults.deltas.business_health_change >= 0 ? `+${simResults.deltas.business_health_change}` : simResults.deltas.business_health_change}
                    </span>
                  </div>
                </div>
                
                <div className="p-3 bg-light-hover/40 dark:bg-dark-hover/20 border border-light-border dark:border-dark-border rounded-lg">
                  <p className="text-[10px] text-light-muted dark:text-dark-muted font-semibold uppercase">Risk Score</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-base font-extrabold text-light-text dark:text-dark-text">{simResults.simulated.risk_score}/100</span>
                  </div>
                </div>
              </div>

              <button 
                onClick={askAiToSummarizeScenario}
                className="w-full py-2 bg-gradient-to-r from-accent-purple to-primary hover:opacity-90 text-white rounded-lg font-medium text-xs flex items-center justify-center space-x-1.5 transition-all cursor-pointer shadow-md shadow-accent-purple/20"
                disabled={loading}
              >
                <Bot className="w-3.5 h-3.5" />
                <span>Ask Copilot to Summarize Scenario</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
