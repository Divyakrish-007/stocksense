import { apiFetch } from './client';
import type { Customer, CustomerFormData, CustomerFilterState, CustomersMeta } from '../types';

export const customersApi = {
  async getMeta(): Promise<CustomersMeta> {
    return apiFetch<CustomersMeta>('/api/customers/meta');
  },

  async getCustomers(
    filters?: Partial<CustomerFilterState>
  ): Promise<{ count: number; customers: Customer[] }> {
    const params = new URLSearchParams();
    if (filters) {
      if (filters.search?.trim()) params.append('search', filters.search.trim());
      if (filters.status && filters.status !== 'All') params.append('status', filters.status);
      if (filters.city && filters.city !== 'All') params.append('city', filters.city);
      if (filters.sortBy) params.append('sortBy', filters.sortBy);
      if (filters.order) params.append('order', filters.order);
    }
    const qs = params.toString();
    return apiFetch<{ count: number; customers: Customer[] }>(
      qs ? `/api/customers?${qs}` : '/api/customers'
    );
  },

  async getCustomerById(id: number): Promise<{ customer: Customer }> {
    return apiFetch<{ customer: Customer }>(`/api/customers/${id}`);
  },

  async createCustomer(data: CustomerFormData): Promise<{ message: string; customer: Customer }> {
    return apiFetch<{ message: string; customer: Customer }>('/api/customers', {
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

  async updateCustomer(
    id: number,
    data: Partial<CustomerFormData>
  ): Promise<{ message: string; customer: Customer }> {
    return apiFetch<{ message: string; customer: Customer }>(`/api/customers/${id}`, {
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

  async deleteCustomer(id: number): Promise<{ message: string; id: number }> {
    return apiFetch<{ message: string; id: number }>(`/api/customers/${id}`, {
      method: 'DELETE',
    });
  },
};
