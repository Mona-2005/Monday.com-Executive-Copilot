import React, { useEffect, useState } from 'react';
import { 
  AlertTriangle, CheckCircle, BarChart2, ShieldAlert, 
  Users, TrendingUp, AlertOctagon, HelpCircle, Activity, Award
} from 'lucide-react';
import * as API from '../services/api';

export default function Analytics() {
  const [sectors, setSectors] = useState([]);
  const [workload, setWorkload] = useState([]);
  const [kpis, setKpis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const [secData, workData, kpiData] = await Promise.all([
        API.getSectors(),
        API.getWorkload(),
        API.getKPIs()
      ]);
      setSectors(secData);
      setWorkload(workData);
      setKpis(kpiData);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch analytics data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-12 h-12 border-4 rounded-full border-primary border-t-transparent animate-spin"></div>
        <p className="text-dark-muted dark:text-light-muted">Running mathematical multi-board joins...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center glass border border-red-500/20 rounded-xl mt-10 max-w-md mx-auto">
        <AlertOctagon className="w-12 h-12 text-red-500 mx-auto mb-3" />
        <p className="text-light-text dark:text-dark-text mb-4">{error}</p>
        <button onClick={fetchAnalytics} className="px-4 py-2 bg-primary text-white rounded-lg">Retry</button>
      </div>
    );
  }

  const fmtCurrency = (val) => {
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)} L`;
    return `₹${val.toLocaleString()}`;
  };

  return (
    <div className="space-y-6">
      {/* Top Section Headers */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-extrabold text-light-text dark:text-dark-text">Cross-Board Business Intelligence</h2>
          <p className="text-xs text-light-muted dark:text-dark-muted mt-0.5">Deep-dive sector performance, execution bottlenecks, and PM workloads.</p>
        </div>
      </div>

      {/* Module 5: Sector Performance and Cross-Board Bottlenecks */}
      <div className="bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border rounded-xl p-5">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-bold text-light-text dark:text-dark-text flex items-center">
            <BarChart2 className="w-4 h-4 text-primary mr-1.5" /> Sectoral Correlation Matrix (Sales vs Execution)
          </h3>
          <span className="text-[10px] text-light-muted dark:text-dark-muted flex items-center">
            <InfoIcon /> Joined on Sector keys
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-light-border dark:border-dark-border text-light-muted dark:text-dark-muted">
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">Sector</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider text-right">Won Revenue</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider text-right">Open Pipeline</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider text-center">Active Work Orders</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider text-center">Completion Rate</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider text-center">Delay Rate</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider text-center">Execution Bottleneck?</th>
              </tr>
            </thead>
            <tbody>
              {sectors.map((sec) => (
                <tr 
                  key={sec.Sector} 
                  className={`border-b border-light-border dark:border-dark-border hover:bg-light-hover/20 dark:hover:bg-dark-hover/10 transition-colors ${
                    sec.is_bottleneck ? 'bg-accent-red/[0.02]' : ''
                  }`}
                >
                  <td className="py-3 px-4 font-bold text-light-text dark:text-dark-text">{sec.Sector}</td>
                  <td className="py-3 px-4 text-right font-medium text-light-text dark:text-dark-text">{fmtCurrency(sec.won_revenue)}</td>
                  <td className="py-3 px-4 text-right text-light-muted dark:text-dark-muted">{fmtCurrency(sec.pipeline)}</td>
                  <td className="py-3 px-4 text-center text-light-text dark:text-dark-text">{sec.wo_count}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`font-semibold ${
                      sec.completion_rate >= 80 ? 'text-accent-emerald' : 
                      sec.completion_rate >= 50 ? 'text-accent-amber' : 
                      'text-accent-red'
                    }`}>
                      {sec.completion_rate}%
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`font-semibold ${
                      sec.delay_rate > 15 ? 'text-accent-red' : 'text-light-muted dark:text-dark-muted'
                    }`}>
                      {sec.delay_rate}%
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    {sec.is_bottleneck ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-accent-red/10 text-accent-red space-x-1 animate-pulse">
                        <AlertTriangle className="w-3 h-3" />
                        <span>Resource Bottleneck</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-accent-emerald/10 text-accent-emerald space-x-1">
                        <CheckCircle className="w-3 h-3" />
                        <span>Execution Stable</span>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Workload Distribution Card */}
        <div className="bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border rounded-xl p-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-bold text-light-text dark:text-dark-text flex items-center">
              <Users className="w-4 h-4 text-accent-purple mr-1.5" /> BD/KAM Workload & Delivery Balance
            </h3>
            <span className="text-[10px] text-light-muted dark:text-dark-muted">Active project tracking</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-light-border dark:border-dark-border text-light-muted dark:text-dark-muted">
                  <th className="py-2.5 px-3 font-semibold">PM / Owner Code</th>
                  <th className="py-2.5 px-3 font-semibold text-center">Total Projects</th>
                  <th className="py-2.5 px-3 font-semibold text-center">Active Load</th>
                  <th className="py-2.5 px-3 font-semibold text-center">Overdue/Delayed</th>
                  <th className="py-2.5 px-3 font-semibold">Capacity load</th>
                </tr>
              </thead>
              <tbody>
                {workload.map((wk) => (
                  <tr key={wk['BD/KAM Personnel code']} className="border-b border-light-border dark:border-dark-border hover:bg-light-hover/10 dark:hover:bg-dark-hover/5 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-light-text dark:text-dark-text">{wk['BD/KAM Personnel code']}</td>
                    <td className="py-2.5 px-3 text-center text-light-text dark:text-dark-text">{wk.total_orders}</td>
                    <td className="py-2.5 px-3 text-center font-medium text-primary">{wk.active_orders}</td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={wk.delayed_orders > 0 ? 'text-accent-red font-semibold' : 'text-light-muted dark:text-dark-muted'}>
                        {wk.delayed_orders}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      {/* Workload Progress Bar */}
                      <div className="w-full bg-light-border dark:bg-dark-border rounded-full h-1.5 overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${
                            wk.active_orders > 30 ? 'bg-accent-red' : 
                            wk.active_orders > 15 ? 'bg-accent-amber' : 
                            'bg-accent-emerald'
                          }`}
                          style={{ width: `${Math.min(100, (wk.active_orders / 45) * 100)}%` }}
                        ></div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pipeline Staleness & Stale Deals Card */}
        <div className="bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-light-text dark:text-dark-text flex items-center">
                <ShieldAlert className="w-4 h-4 text-accent-red mr-1.5" /> Pipeline Stagnation Risk
              </h3>
              <span className="text-[10px] text-accent-red bg-accent-red/10 px-2 py-0.5 rounded font-semibold">
                Stale Deals: {kpis?.stale_deals}
              </span>
            </div>
            
            <p className="text-xs text-light-muted dark:text-dark-muted leading-relaxed mb-4">
              Deals that have spent **180+ days** in progress or passed their tentative close dates without conversion are classified as **Stale**. They create statistical anomalies in revenue forecasting and must be audited immediately.
            </p>

            <div className="bg-light-hover/40 dark:bg-dark-hover/20 border border-light-border dark:border-dark-border rounded-xl p-4 space-y-3.5">
              <div className="flex justify-between text-xs">
                <span className="text-light-muted dark:text-dark-muted">Active Pipeline Opportunities:</span>
                <span className="font-bold text-light-text dark:text-dark-text">{kpis?.total_deals_count}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-light-muted dark:text-dark-muted">Pipeline Value at Risk (Stale):</span>
                <span className="font-bold text-accent-red">High Risk Exposure</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-light-muted dark:text-dark-muted">Average Pipeline Valuation:</span>
                <span className="font-bold text-light-text dark:text-dark-text">{fmtCurrency(kpis?.average_deal_size)}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-light-border dark:border-dark-border flex space-x-3 text-xs">
            <div className="p-2 bg-accent-amber/10 text-accent-amber rounded-lg shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold text-light-text dark:text-dark-text">Sales Strategy Caveat</p>
              <p className="text-light-muted dark:text-dark-muted mt-0.5 text-[11px]">Audit pipeline stages quarterly. Pruning unconvertible stale pipeline items raises team conversion accuracy by 14%.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoIcon() {
  return <HelpCircle className="w-3.5 h-3.5 mr-1" />;
}
