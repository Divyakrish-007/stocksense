import React from 'react';
import type { Supplier } from '../../types';
import { SupplierStatusBadge } from './SupplierStatusBadge';
import { Edit2, Trash2, Building2, Mail, Phone, MapPin, PackageCheck, DollarSign } from 'lucide-react';

interface SuppliersTableProps {
  suppliers: Supplier[];
  isLoading: boolean;
  onEdit: (supplier: Supplier) => void;
  onDelete: (supplier: Supplier) => void;
  onAddClick: () => void;
}

export const SuppliersTable: React.FC<SuppliersTableProps> = ({
  suppliers,
  isLoading,
  onEdit,
  onDelete,
  onAddClick,
}) => {
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-slate-100 rounded-lg w-full" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-14 bg-slate-50 rounded-lg w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (suppliers.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
        <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-100">
          <Building2 className="w-8 h-8 text-blue-600" />
        </div>
        <h3 className="text-base font-semibold text-slate-800 mb-1">No Suppliers Found</h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto mb-6">
          No supplier records match your current filter criteria or none have been created yet.
        </p>
        <button
          onClick={onAddClick}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm shadow-blue-600/20 transition-all cursor-pointer"
        >
          <span>Add First Supplier</span>
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <th className="py-3 px-4">Code & Supplier</th>
              <th className="py-3 px-4">Contact Person</th>
              <th className="py-3 px-4">Communication</th>
              <th className="py-3 px-4">Location</th>
              <th className="py-3 px-4">Terms & Tax</th>
              <th className="py-3 px-4 text-center">PO History</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
            {suppliers.map((supplier) => (
              <tr key={supplier.id} className="hover:bg-slate-50/70 transition-colors group">
                {/* Code & Name */}
                <td className="py-3.5 px-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                      <Building2 className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                        {supplier.name}
                      </div>
                      <span className="font-mono text-[11px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/60">
                        {supplier.code}
                      </span>
                    </div>
                  </div>
                </td>

                {/* Contact Person */}
                <td className="py-3.5 px-4 font-medium text-slate-800">
                  {supplier.contact_person || <span className="text-slate-400 italic">Not assigned</span>}
                </td>

                {/* Communication */}
                <td className="py-3.5 px-4 space-y-1">
                  {supplier.email ? (
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <a
                        href={`mailto:${supplier.email}`}
                        className="hover:text-blue-600 font-mono text-[11px] truncate max-w-[180px]"
                      >
                        {supplier.email}
                      </a>
                    </div>
                  ) : (
                    <span className="text-slate-400 text-[11px] italic">No email</span>
                  )}
                  {supplier.phone && (
                    <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{supplier.phone}</span>
                    </div>
                  )}
                </td>

                {/* Location */}
                <td className="py-3.5 px-4">
                  <div className="flex items-center gap-1.5 text-slate-700">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{supplier.city || 'N/A'}</span>
                  </div>
                  {supplier.address && (
                    <p className="text-[11px] text-slate-400 truncate max-w-[160px] pl-5">
                      {supplier.address}
                    </p>
                  )}
                </td>

                {/* Terms & Tax */}
                <td className="py-3.5 px-4 space-y-1">
                  <span className="inline-block text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                    {supplier.payment_terms || 'Net 30'}
                  </span>
                  {supplier.tax_id && (
                    <p className="text-[10px] text-slate-400 font-mono">
                      Tax: {supplier.tax_id}
                    </p>
                  )}
                </td>

                {/* PO History */}
                <td className="py-3.5 px-4 text-center">
                  <div className="inline-flex flex-col items-center">
                    <span className="inline-flex items-center gap-1 font-mono font-semibold text-slate-800 text-xs">
                      <PackageCheck className="w-3.5 h-3.5 text-blue-500" />
                      {supplier.total_orders || 0} orders
                    </span>
                    <span className="text-[10px] text-emerald-700 font-mono font-medium flex items-center">
                      <DollarSign className="w-3 h-3" />
                      {(supplier.total_value || 0).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                </td>

                {/* Status */}
                <td className="py-3.5 px-4">
                  <SupplierStatusBadge status={supplier.status} />
                </td>

                {/* Actions */}
                <td className="py-3.5 px-4 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      onClick={() => onEdit(supplier)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                      title="Edit Supplier"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDelete(supplier)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Delete Supplier"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
