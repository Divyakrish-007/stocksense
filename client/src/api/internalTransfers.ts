import { apiFetch } from './client';
import type {
  InternalTransfer,
  InternalTransferFormData,
  InternalTransferFilterState,
  InternalTransfersMeta,
} from '../types';

export const internalTransfersApi = {
  async getInternalTransfers(
    filters?: Partial<InternalTransferFilterState>
  ): Promise<{ count: number; internalTransfers: InternalTransfer[] }> {
    const params = new URLSearchParams();
    if (filters) {
      if (filters.search?.trim())              params.append('search',          filters.search.trim());
      if (filters.status && filters.status !== 'All')
                                               params.append('status',          filters.status);
      if (filters.sourceWarehouse && filters.sourceWarehouse !== 'All')
                                               params.append('sourceWarehouse', filters.sourceWarehouse);
      if (filters.destWarehouse && filters.destWarehouse !== 'All')
                                               params.append('destWarehouse',   filters.destWarehouse);
      if (filters.dateFrom)                    params.append('dateFrom',        filters.dateFrom);
      if (filters.dateTo)                      params.append('dateTo',          filters.dateTo);
      if (filters.sortBy)                      params.append('sortBy',          filters.sortBy);
      if (filters.order)                       params.append('order',           filters.order);
    }
    const qs = params.toString();
    return apiFetch<{ count: number; internalTransfers: InternalTransfer[] }>(
      qs ? `/api/internal-transfers?${qs}` : '/api/internal-transfers'
    );
  },

  async getMeta(): Promise<InternalTransfersMeta> {
    return apiFetch<InternalTransfersMeta>('/api/internal-transfers/meta');
  },

  async getInternalTransferById(id: number): Promise<{ internalTransfer: InternalTransfer }> {
    return apiFetch<{ internalTransfer: InternalTransfer }>(`/api/internal-transfers/${id}`);
  },

  async createInternalTransfer(
    data: InternalTransferFormData
  ): Promise<{ message: string; internalTransfer: InternalTransfer }> {
    return apiFetch<{ message: string; internalTransfer: InternalTransfer }>('/api/internal-transfers', {
      method: 'POST',
      body: JSON.stringify({
        sourceWarehouseCode: data.sourceWarehouseCode,
        destWarehouseCode:   data.destWarehouseCode,
        scheduledDate:       data.scheduledDate,
        status:              data.status,
        notes:               data.notes,
        items:               data.items,
      }),
    });
  },

  async updateInternalTransfer(
    id: number,
    data: Partial<InternalTransferFormData>
  ): Promise<{ message: string; internalTransfer: InternalTransfer }> {
    return apiFetch<{ message: string; internalTransfer: InternalTransfer }>(`/api/internal-transfers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        sourceWarehouseCode: data.sourceWarehouseCode,
        destWarehouseCode:   data.destWarehouseCode,
        scheduledDate:       data.scheduledDate,
        status:              data.status,
        notes:               data.notes,
        items:               data.items,
      }),
    });
  },

  async deleteInternalTransfer(id: number): Promise<{ message: string; id: number }> {
    return apiFetch<{ message: string; id: number }>(`/api/internal-transfers/${id}`, {
      method: 'DELETE',
    });
  },

  async getWarehouseStock(
    warehouseCode: string,
    productId?: number
  ): Promise<{ warehouseCode: string; products?: any[]; quantity?: number }> {
    const params = new URLSearchParams({ warehouseCode });
    if (productId) params.append('productId', String(productId));
    return apiFetch<any>(`/api/internal-transfers/stock?${params.toString()}`);
  },
};
