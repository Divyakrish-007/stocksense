import React, { useState } from 'react';
import type { InventoryActivity, ActivityStatus, FilterOptions } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { TypeBadge } from '../common/TypeBadge';
import { ActivityDetailsModal } from './ActivityDetailsModal';
import { NewActivityModal } from './NewActivityModal';
import { Eye, ArrowRight, Plus, PackageX, Calendar, Layers } from 'lucide-react';

interface ActivityTableProps {
  activities: InventoryActivity[];
  isLoading: boolean;
  filterOptions: FilterOptions;
  onRefresh: () => void;
  onUpdateStatus: (id: number, status: ActivityStatus) => Promise<void>;
}

export const ActivityTable: React.FC<ActivityTableProps> = ({
  activities,
  isLoading,
  filterOptions,
  onRefresh,
  onUpdateStatus,
}) => {
  const [selectedActivity, setSelectedActivity] = useState<InventoryActivity | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);

  const handleOpenDetails = (activity: InventoryActivity) => {
    setSelectedActivity(activity);
    setIsDetailsOpen(true);
  };

  const handleStatusUpdate = async (id: number, status: ActivityStatus) => {
    await onUpdateStatus(id, status);
    if (selectedActivity && selectedActivity.id === id) {
      setSelectedActivity({ ...selectedActivity, status });
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Table Section Header */}
      <div className="px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-600" />
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Recent Inventory Activity & Operations
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            Live movement records, receipts, customer dispatches, and warehouse transfers
          </p>
        </div>

        <button
          onClick={() => setIsNewModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm shadow-blue-600/20 active:scale-95 transition-all self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Stock Movement</span>
        </button>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-600">
          <thead className="bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200">
            <tr>
              <th scope="col" className="px-5 py-3">Document Ref</th>
              <th scope="col" className="px-4 py-3">Type</th>
              <th scope="col" className="px-4 py-3">Partner / Contact</th>
              <th scope="col" className="px-4 py-3">Route (From &rarr; To)</th>
              <th scope="col" className="px-4 py-3">Category</th>
              <th scope="col" className="px-4 py-3 text-right">Items / Units</th>
              <th scope="col" className="px-4 py-3">Scheduled</th>
              <th scope="col" className="px-4 py-3">Status</th>
              <th scope="col" className="px-5 py-3 text-right">Action</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 font-medium">
            {isLoading ? (
              // Loading Skeleton Rows
              Array.from({ length: 5 }).map((_, idx) => (
                <tr key={idx} className="animate-pulse">
                  <td className="px-5 py-4"><div className="h-4 w-24 bg-slate-200 rounded"></div></td>
                  <td className="px-4 py-4"><div className="h-4 w-16 bg-slate-200 rounded"></div></td>
                  <td className="px-4 py-4"><div className="h-4 w-32 bg-slate-200 rounded"></div></td>
                  <td className="px-4 py-4"><div className="h-4 w-40 bg-slate-200 rounded"></div></td>
                  <td className="px-4 py-4"><div className="h-4 w-20 bg-slate-200 rounded"></div></td>
                  <td className="px-4 py-4 text-right"><div className="h-4 w-12 bg-slate-200 rounded ml-auto"></div></td>
                  <td className="px-4 py-4"><div className="h-4 w-20 bg-slate-200 rounded"></div></td>
                  <td className="px-4 py-4"><div className="h-4 w-16 bg-slate-200 rounded"></div></td>
                  <td className="px-5 py-4 text-right"><div className="h-4 w-8 bg-slate-200 rounded ml-auto"></div></td>
                </tr>
              ))
            ) : activities.length === 0 ? (
              // Empty State
              <tr>
                <td colSpan={9} className="px-5 py-12 text-center">
                  <div className="flex flex-col items-center justify-center max-w-sm mx-auto text-slate-400">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                      <PackageX className="w-6 h-6 text-slate-400" />
                    </div>
                    <p className="text-sm font-semibold text-slate-700">No inventory operations found</p>
                    <p className="text-xs text-slate-500 mt-1 text-center">
                      No records match your selected filter criteria. Try resetting filters or log a new stock movement.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              // Real DB Rows
              activities.map((act) => (
                <tr
                  key={act.id}
                  className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                  onClick={() => handleOpenDetails(act)}
                >
                  {/* Reference */}
                  <td className="px-5 py-3.5 font-mono font-semibold text-slate-900 whitespace-nowrap">
                    {act.reference}
                  </td>

                  {/* Document Type Badge */}
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <TypeBadge type={act.type} />
                  </td>

                  {/* Partner / Contact */}
                  <td className="px-4 py-3.5 whitespace-nowrap text-slate-800 font-semibold max-w-[160px] truncate" title={act.contact}>
                    {act.contact}
                  </td>

                  {/* Route */}
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <div className="flex items-center gap-1.5 text-xs text-slate-700">
                      <span className="font-semibold text-slate-800">{act.source_location}</span>
                      <ArrowRight className="w-3 h-3 text-slate-400" />
                      <span className="font-semibold text-slate-800">{act.dest_location}</span>
                    </div>
                  </td>

                  {/* Category */}
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded text-[11px] bg-slate-100 text-slate-700 border border-slate-200">
                      {act.category}
                    </span>
                  </td>

                  {/* Items Count */}
                  <td className="px-4 py-3.5 whitespace-nowrap text-right font-bold text-slate-900">
                    {Math.abs(act.items_count).toLocaleString()}
                  </td>

                  {/* Scheduled Date */}
                  <td className="px-4 py-3.5 whitespace-nowrap text-slate-500">
                    <div className="flex items-center gap-1 text-[11px]">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      <span>{act.scheduled_date}</span>
                    </div>
                  </td>

                  {/* Status Badge */}
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <StatusBadge status={act.status} size="sm" />
                  </td>

                  {/* Action Button */}
                  <td className="px-5 py-3.5 text-right whitespace-nowrap">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenDetails(act);
                      }}
                      className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer info */}
      <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
        <span>Showing {activities.length} inventory documents</span>
        <span className="text-[11px] text-slate-400">Click any row to inspect manifest & update workflow status</span>
      </div>

      {/* Activity Details Modal */}
      <ActivityDetailsModal
        activity={selectedActivity}
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        onUpdateStatus={handleStatusUpdate}
      />

      {/* New Activity Creation Modal */}
      <NewActivityModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        options={filterOptions}
        onSuccess={onRefresh}
      />
    </div>
  );
};
