import React, { useEffect, useState } from 'react';
import { 
  DollarSign, BarChart2, TrendingUp, CheckCircle, AlertTriangle, 
  HelpCircle, Sparkles, AlertOctagon, Clock, RefreshCw, X 
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend
} from 'recharts';
import * as API from '../services/api';

const COLORS = ['#00C6FF', '#8B5CF6', '#EC4899', '#10B981', '#F59E0B', '#EF4444', '#3B82F6'];

export default function Dashboard() {
  const [kpis, setKpis] = useState(null);
  const [sectors, setSectors] = useState([]);
  const [trends, setTrends] = useState([]);
  const [funnel, setFunnel] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [insight, setInsight] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Explanation Modal/Popover State
  const [explanation, setExplanation] = useState(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [kpiData, sectorData, trendData, funnelData, alertData, timelineData, insightData] = await Promise.all([
        API.getKPIs(),
        API.getSectors(),
        API.getTrends(),
        API.getFunnel(),
        API.getAlerts(),
        API.getTimeline(),
        API.getInsight()
      ]);
      
      setKpis(kpiData);
      setSectors(sectorData);
      setTrends(trendData);
      setFunnel(funnelData);
      setAlerts(alertData);
      setTimeline(timelineData);
      setInsight(insightData.insight);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch dashboard data. Make sure the backend server is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleClearCache = async () => {
    try {
      await API.clearCache();
      fetchDashboardData();
    } catch (err) {
      alert('Failed to clear cache');
    }
  };

  const explainMetric = (title, why, calculation) => {
    setExplanation({ title, why, calculation });
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        {/* Loading Header Skeleton */}
        <div className="h-14 bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border rounded-xl flex items-center justify-between px-6">
          <div className="h-4 w-64 bg-light-border dark:bg-dark-border rounded"></div>
          <div className="h-4 w-32 bg-light-border dark:bg-dark-border rounded"></div>
        </div>

        {/* Loading Skeletons for 4 KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border rounded-xl p-5 space-y-3">
              <div className="flex justify-between">
                <div className="w-8 h-8 rounded-lg bg-light-border dark:bg-dark-border"></div>
                <div className="w-4 h-4 rounded-full bg-light-border dark:bg-dark-border"></div>
              </div>
              <div className="h-3 w-20 bg-light-border dark:bg-dark-border rounded"></div>
              <div className="h-6 w-32 bg-light-border dark:bg-dark-border rounded"></div>
            </div>
          ))}
        </div>

        {/* Loading Skeletons for Charts & Health */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-48 bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border rounded-xl"></div>
          <div className="h-48 bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border rounded-xl"></div>
        </div>

        <p className="text-center text-xs text-light-muted dark:text-dark-muted font-medium animate-pulse">
          Fetching cached Monday.com GraphQL datasets & analyzing executive risk signals...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 mx-auto max-w-xl text-center glass border border-red-500/20 rounded-xl mt-10">
        <AlertOctagon className="w-12 h-12 text-red-500 mx-auto mb-3" />
        <h3 className="text-xl font-semibold mb-2">Service Error</h3>
        <p className="text-dark-muted mb-4">{error}</p>
        <button 
          onClick={fetchDashboardData}
          className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg transition-all"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  // Format currency helper
  const fmtCurrency = (val) => {
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)} L`;
    return `₹${val.toLocaleString()}`;
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Insight of the Day */}
      {insight && (
        <div className="bg-gradient-to-r from-primary/10 via-accent-purple/10 to-transparent border border-primary/20 rounded-xl p-4 flex items-start space-x-3 shadow-sm relative overflow-hidden animate-pulse-slow">
          <div className="p-2 bg-primary/20 text-primary rounded-lg shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-primary dark:text-primary mb-0.5">Insight of the Day</h4>
            <p className="text-sm text-light-text dark:text-dark-text opacity-90">{insight}</p>
          </div>
          <button 
            onClick={handleClearCache}
            title="Refresh Live Data"
            className="absolute right-4 top-4 text-light-muted dark:text-dark-muted hover:text-primary transition-colors cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Won Revenue */}
        <div className="bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border rounded-xl p-5 hover:border-primary/40 transition-all group relative">
          <div className="flex justify-between items-start mb-3">
            <div className="p-2 bg-primary/10 text-primary rounded-lg">
              <DollarSign className="w-5 h-5" />
            </div>
            <button 
              onClick={() => explainMetric(
                'Closed-Won Revenue', 
                'Won revenue measures completed or finalized deals where value is locked. It represents our realized top-line sales capture.',
                'SUM(Masked Deal value) WHERE Deal Status = "Won"'
              )}
              className="text-light-muted dark:text-dark-muted hover:text-primary transition-colors"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-light-muted dark:text-dark-muted uppercase tracking-wider font-semibold">Won Revenue</p>
          <h3 className="text-2xl font-bold mt-1 text-light-text dark:text-dark-text">{fmtCurrency(kpis.won_revenue)}</h3>
          <span className="text-xs text-accent-emerald flex items-center mt-2 font-medium">
            <TrendingUp className="w-3.5 h-3.5 mr-1" /> Healthy growth
          </span>
        </div>

        {/* Pipeline Value */}
        <div className="bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border rounded-xl p-5 hover:border-accent-purple/40 transition-all group relative">
          <div className="flex justify-between items-start mb-3">
            <div className="p-2 bg-accent-purple/10 text-accent-purple rounded-lg">
              <BarChart2 className="w-5 h-5" />
            </div>
            <button 
              onClick={() => explainMetric(
                'Sales Pipeline', 
                'Pipeline measures the total potential value of all active open deals currently under negotiation or at early sales stages.',
                'SUM(Masked Deal value) WHERE Deal Status = "Open"'
              )}
              className="text-light-muted dark:text-dark-muted hover:text-accent-purple transition-colors"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-light-muted dark:text-dark-muted uppercase tracking-wider font-semibold">Open Pipeline</p>
          <h3 className="text-2xl font-bold mt-1 text-light-text dark:text-dark-text">{fmtCurrency(kpis.pipeline)}</h3>
          <span className="text-xs text-light-muted dark:text-dark-muted flex items-center mt-2">
            In-flight deal flow
          </span>
        </div>

        {/* Conversion Rate */}
        <div className="bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border rounded-xl p-5 hover:border-accent-pink/40 transition-all group relative">
          <div className="flex justify-between items-start mb-3">
            <div className="p-2 bg-accent-pink/10 text-accent-pink rounded-lg">
              <TrendingUp className="w-5 h-5" />
            </div>
            <button 
              onClick={() => explainMetric(
                'Sales Conversion Rate', 
                'Indicates the percentage of finalized sales opportunities that closed as "Won" instead of "Lost". A higher conversion points to quality sales leads.',
                'Count(Won Deals) / Count(Won + Lost Deals) * 100'
              )}
              className="text-light-muted dark:text-dark-muted hover:text-accent-pink transition-colors"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-light-muted dark:text-dark-muted uppercase tracking-wider font-semibold">Conversion Rate</p>
          <h3 className="text-2xl font-bold mt-1 text-light-text dark:text-dark-text">{kpis.conversion_rate}%</h3>
          <span className="text-xs text-light-muted dark:text-dark-muted flex items-center mt-2">
            Target benchmark: 35.0%
          </span>
        </div>

        {/* Completion Rate */}
        <div className="bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border rounded-xl p-5 hover:border-accent-emerald/40 transition-all group relative">
          <div className="flex justify-between items-start mb-3">
            <div className="p-2 bg-accent-emerald/10 text-accent-emerald rounded-lg">
              <CheckCircle className="w-5 h-5" />
            </div>
            <button 
              onClick={() => explainMetric(
                'Operational Completion Rate', 
                'Measures execution efficiency. Represents the percentage of work orders that have been successfully fully delivered/completed.',
                'Count(Completed Work Orders) / Count(Total Work Orders) * 100'
              )}
              className="text-light-muted dark:text-dark-muted hover:text-accent-emerald transition-colors"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-light-muted dark:text-dark-muted uppercase tracking-wider font-semibold">Completion Rate</p>
          <h3 className="text-2xl font-bold mt-1 text-light-text dark:text-dark-text">{kpis.completion_rate}%</h3>
          <span className="text-xs text-light-muted dark:text-dark-muted flex items-center mt-2">
            Target benchmark: 80.0%
          </span>
        </div>
      </div>

      {/* Health & Risk Score Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Business Health Score */}
        <div className="bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border rounded-xl p-6 relative overflow-hidden">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-base font-bold text-light-text dark:text-dark-text">Business Health Score</h3>
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
              kpis.business_health_score >= 85 ? 'bg-accent-emerald/10 text-accent-emerald' : 
              kpis.business_health_score >= 70 ? 'bg-accent-amber/10 text-accent-amber' : 
              'bg-accent-red/10 text-accent-red'
            }`}>
              {kpis.business_health_score >= 85 ? 'Healthy' : 
               kpis.business_health_score >= 70 ? 'Warning' : 
               'Critical'}
            </span>
          </div>
          <div className="flex items-center space-x-6">
            <div className="relative shrink-0">
              <svg className="w-24 h-24 transform -rotate-90">
                <circle cx="48" cy="48" r="40" stroke="currentColor" className="text-light-border dark:text-dark-border" strokeWidth="8" fill="transparent" />
                <circle cx="48" cy="48" r="40" stroke="currentColor" className={
                  kpis.business_health_score >= 85 ? 'text-accent-emerald' : 
                  kpis.business_health_score >= 70 ? 'text-accent-amber' : 
                  'text-accent-red'
                } strokeWidth="8" fill="transparent" strokeDasharray={251.2} strokeDashoffset={251.2 - (251.2 * kpis.business_health_score) / 100} strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xl font-extrabold text-light-text dark:text-dark-text">{kpis.business_health_score}</span>
              </div>
            </div>
            <div className="text-sm">
              <p className="text-light-text dark:text-dark-text leading-relaxed">{kpis.business_health_explanation}</p>
            </div>
          </div>
        </div>

        {/* Risk Score & Alert summary */}
        <div className="bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border rounded-xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-base font-bold text-light-text dark:text-dark-text">Execution Risk Score</h3>
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
              kpis.risk_score >= 60 ? 'bg-accent-red/10 text-accent-red' : 
              kpis.risk_score >= 30 ? 'bg-accent-amber/10 text-accent-amber' : 
              'bg-accent-emerald/10 text-accent-emerald'
            }`}>
              {kpis.risk_score >= 60 ? 'High Risk' : 
               kpis.risk_score >= 30 ? 'Medium Risk' : 
               'Low Risk'}
            </span>
          </div>
          <div className="flex items-center space-x-6">
            <div className="relative shrink-0">
              <svg className="w-24 h-24 transform -rotate-90">
                <circle cx="48" cy="48" r="40" stroke="currentColor" className="text-light-border dark:text-dark-border" strokeWidth="8" fill="transparent" />
                <circle cx="48" cy="48" r="40" stroke="currentColor" className={
                  kpis.risk_score >= 60 ? 'text-accent-red' : 
                  kpis.risk_score >= 30 ? 'text-accent-amber' : 
                  'text-accent-emerald'
                } strokeWidth="8" fill="transparent" strokeDasharray={251.2} strokeDashoffset={251.2 - (251.2 * kpis.risk_score) / 100} strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xl font-extrabold text-light-text dark:text-dark-text">{kpis.risk_score}</span>
              </div>
            </div>
            <div className="text-sm">
              <p className="text-light-text dark:text-dark-text leading-relaxed">{kpis.risk_explanation}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Revenue Trend Chart (2/3 width on xl) */}
        <div className="xl:col-span-2 bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border rounded-xl p-5">
          <h4 className="text-sm font-bold text-light-text dark:text-dark-text mb-4">Revenue Growth Trend (Won Deals)</h4>
          <div className="h-72">
            {trends.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00C6FF" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#00C6FF" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#232D45" opacity={0.2} />
                  <XAxis dataKey="MonthName" stroke="#9CA3AF" fontSize={11} />
                  <YAxis stroke="#9CA3AF" fontSize={11} tickFormatter={(val) => `₹${(val / 100000).toFixed(0)}L`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#121829', border: '1px solid #1E2943', borderRadius: '8px' }}
                    labelStyle={{ color: '#F3F4F6', fontWeight: 'bold' }}
                    formatter={(val) => [`₹${val.toLocaleString()}`, 'Won Revenue']}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#00C6FF" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-light-muted dark:text-dark-muted">No won revenue history found in active range.</div>
            )}
          </div>
        </div>

        {/* Sector Revenue Pie Chart (1/3 width) */}
        <div className="bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border rounded-xl p-5">
          <h4 className="text-sm font-bold text-light-text dark:text-dark-text mb-4">Won Revenue by Sector</h4>
          <div className="h-72 flex flex-col justify-between">
            <div className="h-56 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sectors.filter(s => s.won_revenue > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="won_revenue"
                    nameKey="Sector"
                  >
                    {sectors.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#121829', border: '1px solid #1E2943', borderRadius: '8px' }}
                    formatter={(val) => [`₹${val.toLocaleString()}`, 'Revenue']}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none flex-col">
                <span className="text-xs text-light-muted dark:text-dark-muted">Total Revenue</span>
                <span className="text-base font-bold text-light-text dark:text-dark-text">{fmtCurrency(kpis.won_revenue)}</span>
              </div>
            </div>
            
            {/* Legend */}
            <div className="grid grid-cols-2 gap-2 text-xs text-light-muted dark:text-dark-muted max-h-16 overflow-y-auto mt-2">
              {sectors.filter(s => s.won_revenue > 0).map((sec, idx) => (
                <div key={sec.Sector} className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                  <span className="truncate">{sec.Sector}: {((sec.won_revenue / kpis.won_revenue) * 100).toFixed(0)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Pipeline Funnel horizontal bar chart (1/3) */}
        <div className="bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border rounded-xl p-5">
          <h4 className="text-sm font-bold text-light-text dark:text-dark-text mb-4">Pipeline Funnel by Stage</h4>
          <div className="h-72">
            {funnel.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnel} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#232D45" opacity={0.1} horizontal={false} />
                  <XAxis type="number" stroke="#9CA3AF" fontSize={9} tickFormatter={(val) => `₹${(val/1000000).toFixed(0)}M`} />
                  <YAxis dataKey="StageClean" type="category" stroke="#9CA3AF" fontSize={9} width={90} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#121829', border: '1px solid #1E2943', borderRadius: '8px' }}
                    formatter={(val) => [`₹${val.toLocaleString()}`, 'Pipeline Value']}
                  />
                  <Bar dataKey="value" fill="#8B5CF6" radius={[0, 4, 4, 0]}>
                    {funnel.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-light-muted dark:text-dark-muted">No open pipeline deals.</div>
            )}
          </div>
        </div>

        {/* AI Alerts Center (1/3) */}
        <div className="bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border rounded-xl p-5 flex flex-col">
          <h4 className="text-sm font-bold text-light-text dark:text-dark-text mb-3 flex items-center">
            <AlertTriangle className="w-4 h-4 text-accent-amber mr-1.5" /> AI Alerts Center
          </h4>
          <div className="space-y-3 overflow-y-auto flex-1 max-h-72 pr-1">
            {alerts.length > 0 ? (
              alerts.map((al) => (
                <div key={al.id} className={`p-3 border rounded-lg transition-all flex items-start space-x-2.5 ${
                  al.type === 'Danger' ? 'bg-accent-red/5 border-accent-red/20' :
                  al.type === 'Warning' ? 'bg-accent-amber/5 border-accent-amber/20' :
                  'bg-primary/5 border-primary/20'
                }`}>
                  <AlertCircleIcon type={al.type} />
                  <div className="text-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-light-text dark:text-dark-text">{al.title}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                        al.category === 'Sales' ? 'bg-primary/10 text-primary' :
                        al.category === 'Operations' ? 'bg-accent-purple/10 text-accent-purple' :
                        'bg-light-hover dark:bg-dark-hover text-light-muted dark:text-dark-muted'
                      }`}>{al.category}</span>
                    </div>
                    <p className="text-light-muted dark:text-dark-muted mt-1 leading-relaxed">{al.message}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-light-muted dark:text-dark-muted py-10">
                <CheckCircle className="w-8 h-8 text-accent-emerald mb-2" />
                <p>System operational. No active risk alerts.</p>
              </div>
            )}
          </div>
        </div>

        {/* Decision Timeline (1/3) */}
        <div className="bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border rounded-xl p-5 flex flex-col">
          <h4 className="text-sm font-bold text-light-text dark:text-dark-text mb-3 flex items-center">
            <Clock className="w-4 h-4 text-primary mr-1.5" /> Decision Timeline
          </h4>
          <div className="space-y-4 overflow-y-auto flex-1 max-h-72 pr-1 relative pl-3 border-l border-light-border dark:border-dark-border ml-1">
            {timeline.length > 0 ? (
              timeline.slice(0, 8).map((ev, index) => (
                <div key={index} className="relative text-xs">
                  {/* Circle dot on line */}
                  <span className={`absolute -left-[17.5px] top-1.5 w-2 h-2 rounded-full border border-light-card dark:border-dark-card ${
                    ev.tag === 'Sales' ? 'bg-primary' :
                    ev.tag === 'Delivery' ? 'bg-accent-emerald' :
                    'bg-accent-purple'
                  }`}></span>
                  <div className="flex justify-between items-center mb-0.5">
                    <span className="font-semibold text-light-text dark:text-dark-text">{ev.title}</span>
                    <span className="text-[10px] text-light-muted dark:text-dark-muted">{ev.date}</span>
                  </div>
                  <p className="text-light-muted dark:text-dark-muted leading-relaxed">{ev.description}</p>
                </div>
              ))
            ) : (
              <div className="flex items-center justify-center h-full text-light-muted dark:text-dark-muted py-10">
                No recent timeline actions logged.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Explanation Modal */}
      {explanation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border w-full max-w-md rounded-xl p-6 shadow-xl relative animate-in fade-in zoom-in duration-150">
            <button 
              onClick={() => setExplanation(null)}
              className="absolute right-4 top-4 p-1 rounded-lg text-light-muted dark:text-dark-muted hover:bg-light-hover dark:hover:bg-dark-hover"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-light-text dark:text-dark-text mb-3 flex items-center">
              <Sparkles className="w-5 h-5 text-primary mr-1.5" /> Explain: {explanation.title}
            </h3>
            <div className="space-y-4 text-sm text-light-text dark:text-dark-text">
              <div>
                <h4 className="font-semibold text-xs text-light-muted dark:text-dark-muted uppercase tracking-wider mb-1">Business Meaning</h4>
                <p className="leading-relaxed">{explanation.why}</p>
              </div>
              <div className="p-3 bg-light-hover dark:bg-dark-hover rounded-lg border border-light-border dark:border-dark-border">
                <h4 className="font-semibold text-xs text-light-muted dark:text-dark-muted uppercase tracking-wider mb-1.5">Deterministic Formula</h4>
                <code className="text-xs text-primary font-mono block break-all">{explanation.calculation}</code>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AlertCircleIcon({ type }) {
  if (type === 'Danger') return <AlertOctagon className="w-4 h-4 text-accent-red shrink-0 mt-0.5" />;
  if (type === 'Warning') return <AlertTriangle className="w-4 h-4 text-accent-amber shrink-0 mt-0.5" />;
  return <HelpCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />;
}
