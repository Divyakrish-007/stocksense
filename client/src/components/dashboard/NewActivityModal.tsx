import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import type { FilterOptions, DocumentType, ActivityStatus } from '../../types';
import { useToast } from '../../context/ToastContext';
import { dashboardApi } from '../../api/dashboard';
import { PlusCircle, Loader2 } from 'lucide-react';

interface NewActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  options: FilterOptions;
  onSuccess: () => void;
}

export const NewActivityModal: React.FC<NewActivityModalProps> = ({
  isOpen,
  onClose,
  options,
  onSuccess,
}) => {
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    type: 'Receipts' as DocumentType,
    contact: '',
    sourceLocation: 'Vendor / Inbound',
    destLocation: 'WH-MAIN',
    category: 'Electronics',
    itemsCount: 50,
    scheduledDate: new Date().toISOString().split('T')[0],
    status: 'Ready' as ActivityStatus,
    notes: '',
  });

  const handleTypeChange = (newType: DocumentType) => {
    let source = 'Vendor / Inbound';
    let dest = 'WH-MAIN';

    if (newType === 'Delivery') {
      source = 'WH-MAIN';
      dest = 'Customer Delivery';
    } else if (newType === 'Internal') {
      source = 'WH-MAIN';
      dest = 'WH-NORTH';
    } else if (newType === 'Adjustments') {
      source = 'WH-MAIN';
      dest = 'Physical Count Rec';
    }

    setFormData((prev) => ({
      ...prev,
      type: newType,
      sourceLocation: source,
      destLocation: dest,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.contact.trim()) {
      showToast('error', 'Validation Error', 'Please enter a contact, vendor, or partner name.');
      return;
    }

    if (!formData.itemsCount || formData.itemsCount === 0) {
      showToast('error', 'Validation Error', 'Please enter a valid items count.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await dashboardApi.createActivity({
        type: formData.type,
        contact: formData.contact.trim(),
        sourceLocation: formData.sourceLocation,
        destLocation: formData.destLocation,
        category: formData.category,
        itemsCount: Number(formData.itemsCount),
        scheduledDate: formData.scheduledDate,
        status: formData.status,
        notes: formData.notes.trim(),
      });

      showToast('success', 'Operation Created', `Document ${res.reference} has been logged to SQLite DB.`);
      onSuccess();
      onClose();
    } catch (err: any) {
      showToast('error', 'Submission Failed', err.message || 'Failed to log inventory operation');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Log New Inventory Operation"
      subtitle="Creates a real-time tracking document in the SQLite database"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {/* Document Type Selector */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Operation Document Type *
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(['Receipts', 'Delivery', 'Internal', 'Adjustments'] as DocumentType[]).map((t) => (
              <button
                type="button"
                key={t}
                onClick={() => handleTypeChange(t)}
                className={`py-2 px-3 rounded-lg border font-medium text-center transition-all ${
                  formData.type === t
                    ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm font-semibold'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Contact / Partner / Vendor */}
        <div>
          <label htmlFor="modal-contact" className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Contact / Partner / Supplier / Customer *
          </label>
          <input
            id="modal-contact"
            type="text"
            required
            placeholder="e.g. Apex Industrial Supplies Ltd"
            value={formData.contact}
            onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs"
          />
        </div>

        {/* Source & Destination Locations */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="modal-source" className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Source Location *
            </label>
            <input
              id="modal-source"
              type="text"
              required
              value={formData.sourceLocation}
              onChange={(e) => setFormData({ ...formData, sourceLocation: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
            />
          </div>

          <div>
            <label htmlFor="modal-dest" className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Destination Location *
            </label>
            <input
              id="modal-dest"
              type="text"
              required
              value={formData.destLocation}
              onChange={(e) => setFormData({ ...formData, destLocation: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
            />
          </div>
        </div>

        {/* Category & Items Count */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="modal-category" className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Product Category *
            </label>
            <select
              id="modal-category"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
            >
              {options.categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="modal-qty" className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Total Units / Items Count *
            </label>
            <input
              id="modal-qty"
              type="number"
              required
              min="1"
              value={formData.itemsCount}
              onChange={(e) => setFormData({ ...formData, itemsCount: parseInt(e.target.value, 10) || 0 })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
            />
          </div>
        </div>

        {/* Date & Initial Status */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="modal-date" className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Scheduled Execution Date *
            </label>
            <input
              id="modal-date"
              type="date"
              required
              value={formData.scheduledDate}
              onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
            />
          </div>

          <div>
            <label htmlFor="modal-status" className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Initial Workflow Status *
            </label>
            <select
              id="modal-status"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as ActivityStatus })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
            >
              <option value="Ready">Ready (Actionable)</option>
              <option value="Waiting">Waiting (Pending Arrival/Clearance)</option>
              <option value="Draft">Draft (Preliminary)</option>
              <option value="Done">Done (Completed)</option>
            </select>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label htmlFor="modal-notes" className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Operation Notes / Special Instructions
          </label>
          <textarea
            id="modal-notes"
            rows={2}
            placeholder="Dock bay number, carrier tracking, or handling instructions..."
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
          />
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium rounded-lg hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm shadow-blue-600/20 disabled:opacity-60 transition-all"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <PlusCircle className="w-4 h-4" />
            )}
            <span>Log Movement to Database</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
