import React from 'react';
import type { InventoryActivity, ActivityStatus } from '../../types';
import { Modal } from '../common/Modal';
import { StatusBadge } from '../common/StatusBadge';
import { TypeBadge } from '../common/TypeBadge';
import { ArrowRight, Calendar, User, Package, MapPin, FileText, CheckCircle2 } from 'lucide-react';

interface ActivityDetailsModalProps {
  activity: InventoryActivity | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateStatus: (id: number, status: ActivityStatus) => Promise<void>;
}

export const ActivityDetailsModal: React.FC<ActivityDetailsModalProps> = ({
  activity,
  isOpen,
  onClose,
  onUpdateStatus,
}) => {
  if (!activity) return null;

  const statuses: ActivityStatus[] = ['Draft', 'Waiting', 'Ready', 'Done', 'Canceled'];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Operation Details: ${activity.reference}`}
      subtitle="Complete document manifest and routing metadata"
      maxWidth="lg"
    >
      <div className="space-y-6 text-sm">
        {/* Top Badges & Status */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <TypeBadge type={activity.type} />
            <span className="text-xs text-slate-400">|</span>
            <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md">
              {activity.category}
            </span>
          </div>
          <StatusBadge status={activity.status} size="md" />
        </div>

        {/* Route / Movement Path */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-blue-600" />
            Transfer Logistics Path
          </p>
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <span className="text-xs text-slate-500 block">Origin</span>
              <span className="text-sm font-bold text-slate-800">{activity.source_location}</span>
            </div>
            <div className="p-2 rounded-full bg-blue-100 text-blue-600 shrink-0">
              <ArrowRight className="w-4 h-4" />
            </div>
            <div className="flex-1 text-right">
              <span className="text-xs text-slate-500 block">Destination</span>
              <span className="text-sm font-bold text-slate-800">{activity.dest_location}</span>
            </div>
          </div>
        </div>

        {/* Detailed Metadata Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-start gap-2.5">
            <User className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <div>
              <span className="text-[11px] font-medium text-slate-500 block">Partner / Contact</span>
              <span className="font-semibold text-slate-800">{activity.contact}</span>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <Package className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <div>
              <span className="text-[11px] font-medium text-slate-500 block">Quantity / Items</span>
              <span className="font-semibold text-slate-800">{Math.abs(activity.items_count)} Units</span>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <Calendar className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <div>
              <span className="text-[11px] font-medium text-slate-500 block">Scheduled Date</span>
              <span className="font-semibold text-slate-800">{activity.scheduled_date}</span>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <FileText className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <div>
              <span className="text-[11px] font-medium text-slate-500 block">Internal Doc ID</span>
              <span className="font-mono text-xs text-slate-700">#{activity.id}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {activity.notes && (
          <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-200/60 text-xs text-amber-900">
            <span className="font-semibold block mb-0.5">Operation Notes:</span>
            {activity.notes}
          </div>
        )}

        {/* Quick Status Workflow Action */}
        <div className="pt-4 border-t border-slate-200">
          <label className="block text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Update Operation Workflow Status:
          </label>
          <div className="flex flex-wrap gap-2">
            {statuses.map((s) => (
              <button
                key={s}
                onClick={() => onUpdateStatus(activity.id, s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activity.status === s
                    ? 'bg-slate-900 text-white shadow-sm ring-2 ring-slate-900/20'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
};
