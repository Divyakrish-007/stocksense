import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Input } from '../ui/input';
import { Select } from '../ui/select';
import { Button } from '../ui/button';
import { useToast } from '../../../context/ToastContext';
import { suppliersApi } from '../../api/suppliers';
import type { SupplierFormData, SupplierStatus } from '../../types';

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  supplier?: any; // populated for edit, otherwise undefined
};

export const SupplierFormModal: React.FC<Props> = ({ open, onClose, onSaved, supplier }) => {
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

  useEffect(() => {
    if (isEdit && supplier) {
      setForm({
        code: supplier.code,
        name: supplier.name,
        contactPerson: supplier.contact_person,
        email: supplier.email,
        phone: supplier.phone,
        address: supplier.address,
        city: supplier.city,
        taxId: supplier.tax_id,
        paymentTerms: supplier.payment_terms,
        notes: supplier.notes ?? '',
        status: supplier.status,
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
  }, [open, isEdit, supplier]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value } as any));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isEdit) {
        await suppliersApi.updateSupplier(supplier.id, form);
        showToast('success', 'Supplier updated', 'Supplier information saved');
      } else {
        await suppliersApi.createSupplier(form);
        showToast('success', 'Supplier created', 'New supplier added');
      }
      onSaved();
      onClose();
    } catch (err: any) {
      console.error(err);
      showToast('error', 'Error', err?.message ?? 'Failed to save supplier');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Supplier' : 'Add Supplier'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input name="code" label="Code" value={form.code} onChange={handleChange} required disabled={isEdit} />
            <Input name="name" label="Name" value={form.name} onChange={handleChange} required />
            <Input name="contactPerson" label="Contact Person" value={form.contactPerson} onChange={handleChange} />
            <Input name="email" label="Email" type="email" value={form.email} onChange={handleChange} />
            <Input name="phone" label="Phone" value={form.phone} onChange={handleChange} />
            <Input name="address" label="Address" value={form.address} onChange={handleChange} />
            <Input name="city" label="City" value={form.city} onChange={handleChange} />
            <Input name="taxId" label="Tax ID" value={form.taxId} onChange={handleChange} />
            <Select name="paymentTerms" label="Payment Terms" value={form.paymentTerms} onChange={handleChange} options={['Net 30','Net 45','Net 60','Net 15','Immediate','COD']} />
            <Select name="status" label="Status" value={form.status} onChange={handleChange} options={['Active','Inactive']} />
            <Input name="notes" label="Notes" value={form.notes} onChange={handleChange} />
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
