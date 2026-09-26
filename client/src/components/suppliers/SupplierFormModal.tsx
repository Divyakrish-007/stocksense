import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { useToast } from '../../context/ToastContext';
import { suppliersApi } from '../../api/suppliers';
import type { Supplier, SupplierFormData } from '../../types';
import { Loader2 } from 'lucide-react';

interface SupplierFormModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  supplier?: Supplier | null;
}

export const SupplierFormModal: React.FC<SupplierFormModalProps> = ({
  open,
  onClose,
  onSaved,
  supplier,
}) => {
  const { showToast } = useToast();
  const isEdit = !!supplier;

  const [form, setForm] = useState<SupplierFormData>({
    code: '',
    name: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    taxId: '',
    paymentTerms: 'Net 30',
    notes: '',
    status: 'Active',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isEdit && supplier) {
      setForm({
        code: supplier.code,
        name: supplier.name,
        contactPerson: supplier.contact_person || '',
        email: supplier.email || '',
        phone: supplier.phone || '',
        address: supplier.address || '',
        city: supplier.city || '',
        taxId: supplier.tax_id || '',
        paymentTerms: supplier.payment_terms || 'Net 30',
        notes: supplier.notes || '',
        status: supplier.status || 'Active',
      });
    } else {
      setForm({
        code: '',
        name: '',
        contactPerson: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        taxId: '',
        paymentTerms: 'Net 30',
        notes: '',
        status: 'Active',
      });
    }
    setError('');
  }, [open, isEdit, supplier]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code.trim()) {
      setError('Supplier code is required');
      return;
    }
    if (!form.name.trim()) {
      setError('Supplier name is required');
      return;
    }

    setLoading(true);
    setError('');
    try {
      if (isEdit && supplier) {
        await suppliersApi.updateSupplier(supplier.id, form);
        showToast('success', 'Supplier Updated', `Updated details for ${form.name}`);
      } else {
        await suppliersApi.createSupplier(form);
        showToast('success', 'Supplier Created', `Added ${form.name} to vendor directory`);
      }
      onSaved();
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Failed to save supplier record');
      showToast('error', 'Error', err?.message || 'Failed to save supplier record');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={isEdit ? `Edit Supplier: ${supplier?.code}` : 'Add New Supplier'}
      subtitle="Register vendor contacts, payment terms, and billing details"
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Supplier Code */}
          <div>
            <label htmlFor="supplier-code" className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
              Supplier Code *
            </label>
            <input
              id="supplier-code"
              type="text"
              name="code"
              placeholder="e.g. SUP-009"
              value={form.code}
              onChange={handleChange}
              disabled={isEdit}
              required
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase font-mono disabled:bg-slate-100 disabled:text-slate-500"
            />
          </div>

          {/* Supplier Name */}
          <div>
            <label htmlFor="supplier-name" className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
              Supplier Name *
            </label>
            <input
              id="supplier-name"
              type="text"
              name="name"
              placeholder="Company or Vendor Name"
              value={form.name}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Contact Person */}
          <div>
            <label htmlFor="contact-person" className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
              Contact Person
            </label>
            <input
              id="contact-person"
              type="text"
              name="contactPerson"
              placeholder="Account Manager / Contact"
              value={form.contactPerson}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Email */}
          <div>
            <label htmlFor="supplier-email" className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
              Email Address
            </label>
            <input
              id="supplier-email"
              type="email"
              name="email"
              placeholder="vendor@company.com"
              value={form.email}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Phone */}
          <div>
            <label htmlFor="supplier-phone" className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
              Phone Number
            </label>
            <input
              id="supplier-phone"
              type="text"
              name="phone"
              placeholder="+1-555-0199"
              value={form.phone}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* City */}
          <div>
            <label htmlFor="supplier-city" className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
              City
            </label>
            <input
              id="supplier-city"
              type="text"
              name="city"
              placeholder="e.g. Chicago, Detroit"
              value={form.city}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Tax ID */}
          <div>
            <label htmlFor="supplier-taxid" className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
              Tax ID / VAT Registration
            </label>
            <input
              id="supplier-taxid"
              type="text"
              name="taxId"
              placeholder="US-TAX-12345"
              value={form.taxId}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            />
          </div>

          {/* Payment Terms */}
          <div>
            <label htmlFor="payment-terms" className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
              Payment Terms
            </label>
            <select
              id="payment-terms"
              name="paymentTerms"
              value={form.paymentTerms}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="Net 30">Net 30</option>
              <option value="Net 45">Net 45</option>
              <option value="Net 60">Net 60</option>
              <option value="Net 15">Net 15</option>
              <option value="Immediate">Immediate</option>
              <option value="COD">COD</option>
            </select>
          </div>

          {/* Status */}
          <div>
            <label htmlFor="supplier-status" className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
              Status
            </label>
            <select
              id="supplier-status"
              name="status"
              value={form.status}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* Address */}
        <div>
          <label htmlFor="supplier-address" className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
            Street Address
          </label>
          <input
            id="supplier-address"
            type="text"
            name="address"
            placeholder="123 Industrial Way, Suite 400"
            value={form.address}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Notes */}
        <div>
          <label htmlFor="supplier-notes" className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
            Internal Procurement Notes
          </label>
          <textarea
            id="supplier-notes"
            name="notes"
            rows={2}
            placeholder="Additional details, preferred shipping carriers, contract notes..."
            value={form.notes}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Modal Actions */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm shadow-blue-600/20 active:scale-95 transition-all disabled:opacity-60 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Saving Supplier...</span>
              </>
            ) : (
              <span>{isEdit ? 'Save Changes' : 'Create Supplier'}</span>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};
