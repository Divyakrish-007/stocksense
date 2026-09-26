import React from 'react';
import { Link } from 'react-router-dom';
import { Clock, ArrowLeft, CheckCircle2, Sparkles, Layers } from 'lucide-react';

interface PlaceholderPageProps {
  title: string;
  description: string;
  moduleKey: string;
  features: string[];
}

export const PlaceholderPage: React.FC<PlaceholderPageProps> = ({
  title,
  description,
  moduleKey,
  features,
}) => {
  return (
    <div className="space-y-6" data-module={moduleKey}>
      {/* Module Roadmap Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">{title}</h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-semibold flex items-center gap-1">
                  <Clock className="w-3 h-3 text-amber-600" />
                  Scheduled for Phase 2
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">{description}</p>
            </div>
          </div>

          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors self-start sm:self-auto"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Dashboard</span>
          </Link>
        </div>

        {/* Development Scope & Features */}
        <div className="mt-6 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span>Target Capabilities in Next Phase:</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {features.map((feature, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2.5 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-700"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span className="font-medium">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Phase 1 Status Banner */}
        <div className="mt-8 p-4 rounded-xl bg-blue-50/60 border border-blue-200/60 text-xs text-blue-900 flex items-center justify-between">
          <p>
            <strong>Phase 1 Scope Note:</strong> This route is wired to the sidebar navigation. Full CRUD operations, batch printing, and advanced workflows will activate in Phase 2.
          </p>
        </div>
      </div>
    </div>
  );
};
