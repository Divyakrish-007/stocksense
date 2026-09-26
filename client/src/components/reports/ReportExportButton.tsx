import React, { useState } from 'react';
import { Download, FileJson, FileText, Loader2 } from 'lucide-react';
import { reportsApi } from '../../api/reports';
import type { ReportTab } from '../../types';

interface ReportExportButtonProps {
  activeTab: ReportTab;
  dateFrom?: string;
  dateTo?: string;
}

export const ReportExportButton: React.FC<ReportExportButtonProps> = ({
  activeTab,
  dateFrom,
  dateTo,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const exportableTypes: ReportTab[] = ['inventory', 'purchases', 'sales', 'movements', 'warehouses'];
  if (!exportableTypes.includes(activeTab)) return null;

  const handleExport = async (format: 'csv' | 'json') => {
    setIsExporting(true);
    setShowMenu(false);
    try {
      const result = await reportsApi.exportReport(activeTab, format, { dateFrom, dateTo });

      let blob: Blob;
      let filename: string;

      if (format === 'csv' && result.csv) {
        blob = new Blob([result.csv], { type: 'text/csv;charset=utf-8;' });
        filename = result.filename || `StockSense_Report.csv`;
      } else {
        blob = new Blob([JSON.stringify(result.data, null, 2)], { type: 'application/json' });
        filename = result.filename || `StockSense_Report.json`;
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        disabled={isExporting}
        className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm disabled:opacity-50"
      >
        {isExporting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Download className="w-4 h-4" />
        )}
        Export
      </button>

      {showMenu && !isExporting && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setShowMenu(false)} />
          <div className="absolute right-0 top-full mt-1 z-40 bg-white rounded-xl border border-slate-200 shadow-lg py-1 min-w-[150px]">
            <button
              onClick={() => handleExport('csv')}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <FileText className="w-4 h-4 text-emerald-500" />
              Export as CSV
            </button>
            <button
              onClick={() => handleExport('json')}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <FileJson className="w-4 h-4 text-blue-500" />
              Export as JSON
            </button>
          </div>
        </>
      )}
    </div>
  );
};
