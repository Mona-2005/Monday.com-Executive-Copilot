import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { FileText, Download, Printer, RefreshCw, AlertCircle, FileCheck2, Calendar } from 'lucide-react';
import * as API from '../services/api';

export default function LeadershipReports() {
  const [briefType, setBriefType] = useState('weekly');
  const [report, setReport] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await API.generateBrief(briefType);
      setReport(res.report);
    } catch (err) {
      console.error(err);
      setError('Failed to generate report. Make sure the backend is active.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadMD = () => {
    if (!report) return;
    const blob = new Blob([report], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Executive_Brief_${briefType}_${new Date().toISOString().slice(0,10)}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center no-print">
        <div>
          <h2 className="text-xl font-extrabold text-light-text dark:text-dark-text">Executive Briefings & Reports</h2>
          <p className="text-xs text-light-muted dark:text-dark-muted mt-0.5">Generate, export, or print tactical updates compiled by Gemini AI.</p>
        </div>
      </div>

      {/* Controls Container */}
      <div className="bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border rounded-xl p-5 no-print">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold text-light-text dark:text-dark-text">Report Type:</span>
            </div>
            
            <div className="flex bg-light-hover dark:bg-dark-hover p-1 rounded-lg border border-light-border dark:border-dark-border text-xs">
              <button 
                onClick={() => setBriefType('daily')}
                className={`px-3 py-1.5 rounded-md transition-all cursor-pointer font-medium ${
                  briefType === 'daily' ? 'bg-primary text-white' : 'text-light-muted dark:text-dark-muted'
                }`}
              >
                Daily Brief
              </button>
              <button 
                onClick={() => setBriefType('weekly')}
                className={`px-3 py-1.5 rounded-md transition-all cursor-pointer font-medium ${
                  briefType === 'weekly' ? 'bg-primary text-white' : 'text-light-muted dark:text-dark-muted'
                }`}
              >
                Weekly Update
              </button>
              <button 
                onClick={() => setBriefType('monthly')}
                className={`px-3 py-1.5 rounded-md transition-all cursor-pointer font-medium ${
                  briefType === 'monthly' ? 'bg-primary text-white' : 'text-light-muted dark:text-dark-muted'
                }`}
              >
                Monthly Review
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-2.5">
            <button 
              onClick={handleGenerate}
              className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer shadow-md shadow-primary/20"
              disabled={loading}
            >
              {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
              <span>{loading ? 'Synthesizing...' : 'Generate Executive Report'}</span>
            </button>
            
            {report && (
              <>
                <button 
                  onClick={handleDownloadMD}
                  className="px-3 py-2 bg-light-hover dark:bg-dark-hover border border-light-border dark:border-dark-border rounded-lg text-xs font-semibold hover:border-primary text-light-text dark:text-dark-text flex items-center space-x-1.5 transition-all cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .md</span>
                </button>
                <button 
                  onClick={handlePrint}
                  className="px-3 py-2 bg-light-hover dark:bg-dark-hover border border-light-border dark:border-dark-border rounded-lg text-xs font-semibold hover:border-primary text-light-text dark:text-dark-text flex items-center space-x-1.5 transition-all cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print / PDF</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div className="p-4 bg-accent-red/10 border border-accent-red/20 rounded-xl flex items-center space-x-2 no-print">
          <AlertCircle className="w-5 h-5 text-accent-red shrink-0" />
          <p className="text-xs text-accent-red">{error}</p>
        </div>
      )}

      {/* Report Showcase Workspace */}
      {report ? (
        <div className="bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border rounded-xl p-8 card-print min-h-[50vh] shadow-sm animate-in fade-in slide-in-from-bottom-3 duration-250">
          <div className="prose dark:prose-invert max-w-none text-light-text dark:text-dark-text leading-relaxed text-sm">
            <ReactMarkdown>
              {report}
            </ReactMarkdown>
          </div>
        </div>
      ) : (
        <div className="border-2 border-dashed border-light-border dark:border-dark-border rounded-xl p-12 text-center text-light-muted dark:text-dark-muted min-h-[40vh] flex flex-col items-center justify-center space-y-3 no-print">
          <FileText className="w-12 h-12 stroke-[1.25] text-light-muted dark:text-dark-muted animate-pulse" />
          <div>
            <h3 className="font-semibold text-sm text-light-text dark:text-dark-text">No Report Generated</h3>
            <p className="text-xs mt-1 max-w-sm">Select a briefing cycle above and click generate. Gemini AI will map, parse and build a markdown brief based on raw records.</p>
          </div>
          <button 
            onClick={handleGenerate}
            className="px-4 py-2 bg-light-hover dark:bg-dark-hover border border-light-border dark:border-dark-border text-light-text dark:text-dark-text rounded-lg hover:border-primary text-xs font-semibold transition-all cursor-pointer"
            disabled={loading}
          >
            Generate Default Weekly Brief
          </button>
        </div>
      )}

      {/* Print only Header */}
      <div className="hidden print-only text-center border-b pb-4 mb-6">
        <h1 className="text-2xl font-bold">Monday.com Executive Copilot</h1>
        <p className="text-xs text-gray-500">Corporate Intelligence and Decision Report (Vite served)</p>
      </div>
    </div>
  );
}
