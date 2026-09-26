import { apiFetch } from './client';
import type {
  InventoryAdjustment,
  InventoryAdjustmentFormData,
  InventoryAdjustmentFilterState,
  InventoryAdjustmentsMeta,
} from '../types';

export const inventoryAdjustmentsApi = {
  async getInventoryAdjustments(
    filters?: Partial<InventoryAdjustmentFilterState>
  ): Promise<{ count: number; inventoryAdjustments: InventoryAdjustment[] }> {
    const params = new URLSearchParams();
    if (filters) {
      if (filters.search?.trim()) params.append('search', filters.search.trim());
      if (filters.status && filters.status !== 'All') params.append('status', filters.status);
      if (filters.warehouse && filters.warehouse !== 'All') params.append('warehouse', filters.warehouse);
      if (filters.adjustmentType && filters.adjustmentType !== 'All') params.append('adjustmentType', filters.adjustmentType);
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.append('dateTo', filters.dateTo);
      if (filters.sortBy) params.append('sortBy', filters.sortBy);
      if (filters.order) params.append('order', filters.order);
    }
    const qs = params.toString();
    return apiFetch<{ count: number; inventoryAdjustments: InventoryAdjustment[] }>(
      qs ? `/api/inventory-adjustments?${qs}` : '/api/inventory-adjustments'
    );
  },

  async getMeta(): Promise<InventoryAdjustmentsMeta> {
    return apiFetch<InventoryAdjustmentsMeta>('/api/inventory-adjustments/meta');
  },

  async getInventoryAdjustmentById(id: number): Promise<{ inventoryAdjustment: InventoryAdjustment }> {
    return apiFetch<{ inventoryAdjustment: InventoryAdjustment }>(`/api/inventory-adjustments/${id}`);
  },

  async createInventoryAdjustment(
    data: InventoryAdjustmentFormData
  ): Promise<{ message: string; inventoryAdjustment: InventoryAdjustment }> {
    return apiFetch<{ message: string; inventoryAdjustment: InventoryAdjustment }>('/api/inventory-adjustments', {
      method: 'POST',
      body: JSON.stringify({
        warehouseCode:  data.warehouseCode,
        reason:         data.reason,
        adjustmentType: data.adjustmentType,
        status:         data.status,
        notes:          data.notes,
        items:          data.items,
      }),
    });
  },

  async updateInventoryAdjustment(
    id: number,
    data: Partial<InventoryAdjustmentFormData>
  ): Promise<{ message: string; inventoryAdjustment: InventoryAdjustment }> {
    return apiFetch<{ message: string; inventoryAdjustment: InventoryAdjustment }>(`/api/inventory-adjustments/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        warehouseCode:  data.warehouseCode,
        reason:         data.reason,
        adjustmentType: data.adjustmentType,
        status:         data.status,
        notes:          data.notes,
        items:          data.items,
      }),
    });
  },

  async deleteInventoryAdjustment(id: number): Promise<{ message: string; id: number }> {
    return apiFetch<{ message: string; id: number }>(`/api/inventory-adjustments/${id}`, {
      method: 'DELETE',
    });
  },
};
