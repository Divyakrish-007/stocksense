import { apiFetch } from './client';
import type { Supplier, SupplierFormData, SupplierFilterState, SuppliersMeta } from '../types';

export const suppliersApi = {
  async getMeta(): Promise<SuppliersMeta> {
    return apiFetch<SuppliersMeta>('/api/suppliers/meta');
  },

  async getSuppliers(
    filters?: Partial<SupplierFilterState>
  ): Promise<{ count: number; suppliers: Supplier[] }> {
    const params = new URLSearchParams();
    if (filters) {
      if (filters.search?.trim()) params.append('search', filters.search.trim());
      if (filters.status && filters.status !== 'All') params.append('status', filters.status);
      if (filters.city && filters.city !== 'All') params.append('city', filters.city);
      if (filters.sortBy) params.append('sortBy', filters.sortBy);
      if (filters.order) params.append('order', filters.order);
    }
    const qs = params.toString();
    return apiFetch<{ count: number; suppliers: Supplier[] }>(
      qs ? `/api/suppliers?${qs}` : '/api/suppliers'
    );
  },

  async getSupplierById(id: number): Promise<{ supplier: Supplier }> {
    return apiFetch<{ supplier: Supplier }>(`/api/suppliers/${id}`);
  },

  async createSupplier(data: SupplierFormData): Promise<{ message: string; supplier: Supplier }> {
    return apiFetch<{ message: string; supplier: Supplier }>('/api/suppliers', {
      method: 'POST',
      body: JSON.stringify({
        code: data.code,
        name: data.name,
        contactPerson: data.contactPerson,
        email: data.email,
        phone: data.phone,
        address: data.address,
        city: data.city,
        taxId: data.taxId,
        paymentTerms: data.paymentTerms,
        notes: data.notes,
        status: data.status,
      }),
    });
  },

  async updateSupplier(
    id: number,
    data: Partial<SupplierFormData>
  ): Promise<{ message: string; supplier: Supplier }> {
    return apiFetch<{ message: string; supplier: Supplier }>(`/api/suppliers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        name: data.name,
        contactPerson: data.contactPerson,
        email: data.email,
        phone: data.phone,
        address: data.address,
        city: data.city,
        taxId: data.taxId,
        paymentTerms: data.paymentTerms,
        notes: data.notes,
        status: data.status,
      }),
    });
  },

  async deleteSupplier(id: number): Promise<{ message: string; id: number }> {
    return apiFetch<{ message: string; id: number }>(`/api/suppliers/${id}`, {
      method: 'DELETE',
    });
  },
};
