import React, { useEffect, useState } from 'react';
import { 
  Sparkles, CheckCircle2, AlertTriangle, AlertOctagon, 
  HelpCircle, RefreshCw, Layers, ShieldAlert, Check
} from 'lucide-react';
import * as API from '../services/api';

export default function DataQuality() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [checkedRecs, setCheckedRecs] = useState({});

  const fetchQuality = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await API.getQualityReport();
      setReport(data);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch data quality scorecard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuality();
  }, []);

  const toggleCheck = (idx) => {
    setCheckedRecs(prev => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-12 h-12 border-4 rounded-full border-primary border-t-transparent animate-spin"></div>
        <p className="text-dark-muted dark:text-light-muted">Auditing live datasets and duplicates...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center glass border border-red-500/20 rounded-xl mt-10 max-w-md mx-auto">
        <AlertOctagon className="w-12 h-12 text-red-500 mx-auto mb-3" />
        <p className="text-light-text dark:text-dark-text mb-4">{error}</p>
        <button onClick={fetchQuality} className="px-4 py-2 bg-primary text-white rounded-lg">Retry Audit</button>
      </div>
    );
  }

  const deals = report.deals_metrics;
  const wo = report.wo_metrics;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-extrabold text-light-text dark:text-dark-text">Data Quality & Resiliency Scorecard</h2>
          <p className="text-xs text-light-muted dark:text-dark-muted mt-0.5">Monitoring layer tracking nulls, unmapped values, and duplicate rows.</p>
        </div>
        <button 
          onClick={fetchQuality}
          className="p-2 bg-light-hover dark:bg-dark-hover border border-light-border dark:border-dark-border text-light-text dark:text-dark-text hover:border-primary rounded-lg transition-all cursor-pointer flex items-center space-x-1.5 text-xs font-semibold"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Re-Audit Raw Data</span>
        </button>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Score Dial & Casing Summary */}
        <div className="bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border rounded-xl p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-light-text dark:text-dark-text mb-4">Overall Quality Index</h3>
            <div className="relative w-40 h-40 mx-auto flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="80" cy="80" r="65" stroke="currentColor" className="text-light-border dark:text-dark-border" strokeWidth="10" fill="transparent" />
                <circle cx="80" cy="80" r="65" stroke="currentColor" className={
                  report.overall_score >= 90 ? 'text-accent-emerald' : 
                  report.overall_score >= 75 ? 'text-accent-amber' : 
                  'text-accent-red'
                } strokeWidth="10" fill="transparent" strokeDasharray={408.2} strokeDashoffset={408.2 - (408.2 * report.overall_score) / 100} strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-extrabold text-light-text dark:text-dark-text">{report.overall_score}%</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded mt-1.5 ${
                  report.overall_score >= 90 ? 'bg-accent-emerald/10 text-accent-emerald' : 
                  report.overall_score >= 75 ? 'bg-accent-amber/10 text-accent-amber' : 
                  'bg-accent-red/10 text-accent-red'
                }`}>{report.grade} Data</span>
              </div>
            </div>
          </div>

          <div className="mt-6 space-y-2 text-xs">
            <div className="flex justify-between items-center text-light-muted dark:text-dark-muted">
              <span>Deals Source:</span>
              <span className="font-semibold text-primary">{report.deals_data_source}</span>
            </div>
            <div className="flex justify-between items-center text-light-muted dark:text-dark-muted">
              <span>Work Orders Source:</span>
              <span className="font-semibold text-primary">{report.work_orders_data_source}</span>
            </div>
            <p className="text-[11px] text-light-muted dark:text-dark-muted leading-relaxed mt-3 border-t border-light-border dark:border-dark-border pt-3">
              {report.description}
            </p>
          </div>
        </div>

        {/* Board Breakdown statistics */}
        <div className="lg:col-span-2 bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border rounded-xl p-6">
          <h3 className="text-sm font-bold text-light-text dark:text-dark-text mb-4">Cleansing Normalization Metrics</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Deals metrics */}
            <div>
              <h4 className="text-xs font-bold text-primary dark:text-primary uppercase tracking-wider mb-3 flex items-center">
                <Layers className="w-3.5 h-3.5 mr-1.5" /> Deals Board Audit
              </h4>
              <div className="space-y-3.5 text-xs text-light-text dark:text-dark-text">
                <div className="flex justify-between border-b border-light-border dark:border-dark-border pb-1.5">
                  <span className="text-light-muted dark:text-dark-muted">Total Cleaned Rows:</span>
                  <span className="font-bold">{deals.total_records}</span>
                </div>
                <div className="flex justify-between border-b border-light-border dark:border-dark-border pb-1.5">
                  <span className="text-light-muted dark:text-dark-muted">Duplicates Removed:</span>
                  <span className={`font-semibold ${deals.duplicates_removed > 0 ? 'text-accent-amber' : ''}`}>{deals.duplicates_removed}</span>
                </div>
                <div className="flex justify-between border-b border-light-border dark:border-dark-border pb-1.5">
                  <span className="text-light-muted dark:text-dark-muted">Null Revenue Fields filled (0.0):</span>
                  <span className="font-semibold text-light-text dark:text-dark-text">{deals.null_deal_values}</span>
                </div>
                <div className="flex justify-between border-b border-light-border dark:border-dark-border pb-1.5">
                  <span className="text-light-muted dark:text-dark-muted">Unassigned Sectors mapped:</span>
                  <span className="font-semibold text-light-text dark:text-dark-text">{deals.null_sectors}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-light-muted dark:text-dark-muted">Data Board Score:</span>
                  <span className="font-bold text-accent-emerald">{deals.quality_score.toFixed(1)}%</span>
                </div>
              </div>
            </div>

            {/* Work orders metrics */}
            <div>
              <h4 className="text-xs font-bold text-accent-purple uppercase tracking-wider mb-3 flex items-center">
                <Layers className="w-3.5 h-3.5 mr-1.5" /> Work Orders Board Audit
              </h4>
              <div className="space-y-3.5 text-xs text-light-text dark:text-dark-text">
                <div className="flex justify-between border-b border-light-border dark:border-dark-border pb-1.5">
                  <span className="text-light-muted dark:text-dark-muted">Total Cleaned Rows:</span>
                  <span className="font-bold">{wo.total_records}</span>
                </div>
                <div className="flex justify-between border-b border-light-border dark:border-dark-border pb-1.5">
                  <span className="text-light-muted dark:text-dark-muted">Duplicates Removed:</span>
                  <span className={`font-semibold ${wo.duplicates_removed > 0 ? 'text-accent-amber' : ''}`}>{wo.duplicates_removed}</span>
                </div>
                <div className="flex justify-between border-b border-light-border dark:border-dark-border pb-1.5">
                  <span className="text-light-muted dark:text-dark-muted">Zero Valued Work Orders:</span>
                  <span className="font-semibold text-light-text dark:text-dark-text">{wo.null_order_values}</span>
                </div>
                <div className="flex justify-between border-b border-light-border dark:border-dark-border pb-1.5">
                  <span className="text-light-muted dark:text-dark-muted">Missing Due Dates (N/A):</span>
                  <span className="font-semibold text-light-text dark:text-dark-text">{wo.null_end_dates}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-light-muted dark:text-dark-muted">Data Board Score:</span>
                  <span className="font-bold text-accent-emerald">{wo.quality_score.toFixed(1)}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Discovered Anomalies Log */}
        <div className="bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border rounded-xl p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-light-text dark:text-dark-text mb-4 flex items-center">
              <ShieldAlert className="w-4 h-4 text-accent-amber mr-1.5" /> Discovered Audit Log
            </h3>
            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {report.anomalies.length > 0 ? (
                report.anomalies.map((an, idx) => (
                  <div key={idx} className="p-3 bg-light-hover/40 dark:bg-dark-hover/10 border border-light-border dark:border-dark-border rounded-lg text-xs leading-relaxed text-light-text dark:text-dark-text flex items-start space-x-2">
                    <span className="mt-0.5 text-accent-amber shrink-0">•</span>
                    <span>{an}</span>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center text-light-muted dark:text-dark-muted py-10 space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-accent-emerald" />
                  <p className="text-xs">No critical structure anomalies discovered.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Data Cleanliness recommendations checklist */}
        <div className="bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border rounded-xl p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-light-text dark:text-dark-text mb-4 flex items-center">
              <CheckCircle2 className="w-4 h-4 text-accent-emerald mr-1.5" /> Hygiene Actions Checklist
            </h3>
            <p className="text-xs text-light-muted dark:text-dark-muted mb-4 leading-relaxed">
              Check off these operational corrections as you clean the records in Monday.com to reach 100% forecasting precision.
            </p>
            <div className="space-y-3.5 pr-1 max-h-72 overflow-y-auto">
              {report.recommendations.map((rec, idx) => (
                <div 
                  key={idx} 
                  onClick={() => toggleCheck(idx)}
                  className={`p-3 border rounded-lg text-xs flex items-center space-x-3 cursor-pointer transition-all ${
                    checkedRecs[idx] 
                      ? 'bg-accent-emerald/5 border-accent-emerald/20 text-light-muted dark:text-dark-muted line-through opacity-70' 
                      : 'bg-light-card dark:bg-dark-card border-light-border dark:border-dark-border hover:border-primary text-light-text dark:text-dark-text'
                  }`}
                >
                  <div className={`w-4.5 h-4.5 border rounded flex items-center justify-center shrink-0 transition-all ${
                    checkedRecs[idx] ? 'bg-accent-emerald border-accent-emerald text-white' : 'border-light-border dark:border-dark-border'
                  }`}>
                    {checkedRecs[idx] && <Check className="w-3 h-3" />}
                  </div>
                  <span>{rec}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
