import { apiFetch } from './client';
import type {
  Receipt,
  ReceiptFormData,
  ReceiptFilterState,
  ReceiptsMeta,
} from '../types';

export const receiptsApi = {
  async getReceipts(
    filters?: Partial<ReceiptFilterState>
  ): Promise<{ count: number; receipts: Receipt[] }> {
    const params = new URLSearchParams();
    if (filters) {
      if (filters.search?.trim())       params.append('search',    filters.search.trim());
      if (filters.status && filters.status !== 'All')
                                         params.append('status',    filters.status);
      if (filters.warehouse && filters.warehouse !== 'All')
                                         params.append('warehouse', filters.warehouse);
      if (filters.dateFrom)              params.append('dateFrom',  filters.dateFrom);
      if (filters.dateTo)                params.append('dateTo',    filters.dateTo);
      if (filters.sortBy)                params.append('sortBy',    filters.sortBy);
      if (filters.order)                 params.append('order',     filters.order);
    }
    const qs = params.toString();
    return apiFetch<{ count: number; receipts: Receipt[] }>(
      qs ? `/api/receipts?${qs}` : '/api/receipts'
    );
  },

  async getMeta(): Promise<ReceiptsMeta> {
    return apiFetch<ReceiptsMeta>('/api/receipts/meta');
  },

  async getReceiptById(id: number): Promise<{ receipt: Receipt }> {
    return apiFetch<{ receipt: Receipt }>(`/api/receipts/${id}`);
  },

  async createReceipt(data: ReceiptFormData): Promise<{ message: string; receipt: Receipt }> {
    return apiFetch<{ message: string; receipt: Receipt }>('/api/receipts', {
      method: 'POST',
      body: JSON.stringify({
        vendor:        data.vendor,
        warehouseCode: data.warehouseCode,
        scheduledDate: data.scheduledDate,
        status:        data.status,
        notes:         data.notes,
        items:         data.items,
      }),
    });
  },

  async updateReceipt(
    id: number,
    data: Partial<ReceiptFormData>
  ): Promise<{ message: string; receipt: Receipt }> {
    return apiFetch<{ message: string; receipt: Receipt }>(`/api/receipts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        vendor:        data.vendor,
        warehouseCode: data.warehouseCode,
        scheduledDate: data.scheduledDate,
        status:        data.status,
        notes:         data.notes,
        items:         data.items,
      }),
    });
  },

  async deleteReceipt(id: number): Promise<{ message: string; id: number }> {
    return apiFetch<{ message: string; id: number }>(`/api/receipts/${id}`, {
      method: 'DELETE',
    });
  },
};
