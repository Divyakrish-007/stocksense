import { apiFetch } from './client';
import type {
  DeliveryOrder,
  DeliveryOrderFormData,
  DeliveryOrderFilterState,
  DeliveryOrdersMeta,
} from '../types';

export const deliveryOrdersApi = {
  async getDeliveryOrders(
    filters?: Partial<DeliveryOrderFilterState>
  ): Promise<{ count: number; deliveryOrders: DeliveryOrder[] }> {
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
    return apiFetch<{ count: number; deliveryOrders: DeliveryOrder[] }>(
      qs ? `/api/delivery-orders?${qs}` : '/api/delivery-orders'
    );
  },

  async getMeta(): Promise<DeliveryOrdersMeta> {
    return apiFetch<DeliveryOrdersMeta>('/api/delivery-orders/meta');
  },

  async getDeliveryOrderById(id: number): Promise<{ deliveryOrder: DeliveryOrder }> {
    return apiFetch<{ deliveryOrder: DeliveryOrder }>(`/api/delivery-orders/${id}`);
  },

  async createDeliveryOrder(
    data: DeliveryOrderFormData
  ): Promise<{ message: string; deliveryOrder: DeliveryOrder }> {
    return apiFetch<{ message: string; deliveryOrder: DeliveryOrder }>('/api/delivery-orders', {
      method: 'POST',
      body: JSON.stringify({
        customer:           data.customer,
        warehouseCode:      data.warehouseCode,
        destinationAddress: data.destinationAddress,
        scheduledDate:      data.scheduledDate,
        status:             data.status,
        notes:              data.notes,
        items:              data.items,
      }),
    });
  },

  async updateDeliveryOrder(
    id: number,
    data: Partial<DeliveryOrderFormData>
  ): Promise<{ message: string; deliveryOrder: DeliveryOrder }> {
    return apiFetch<{ message: string; deliveryOrder: DeliveryOrder }>(`/api/delivery-orders/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        customer:           data.customer,
        warehouseCode:      data.warehouseCode,
        destinationAddress: data.destinationAddress,
        scheduledDate:      data.scheduledDate,
        status:             data.status,
        notes:              data.notes,
        items:              data.items,
      }),
    });
  },

  async deleteDeliveryOrder(id: number): Promise<{ message: string; id: number }> {
    return apiFetch<{ message: string; id: number }>(`/api/delivery-orders/${id}`, {
      method: 'DELETE',
    });
  },
};
