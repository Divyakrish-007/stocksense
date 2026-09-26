import { apiFetch } from './client';
import type {
  SalesOrder,
  SalesOrderFormData,
  SalesOrderFilterState,
  SalesOrdersMeta,
} from '../types';

export const salesOrdersApi = {
  async getMeta(): Promise<SalesOrdersMeta> {
    return apiFetch<SalesOrdersMeta>('/api/sales-orders/meta');
  },

  async getSalesOrders(
    filters?: Partial<SalesOrderFilterState>
  ): Promise<{ count: number; salesOrders: SalesOrder[] }> {
    const params = new URLSearchParams();
    if (filters) {
      if (filters.search?.trim()) params.append('search', filters.search.trim());
      if (filters.status && filters.status !== 'All') params.append('status', filters.status);
      if (filters.warehouse && filters.warehouse !== 'All') params.append('warehouse', filters.warehouse);
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.append('dateTo', filters.dateTo);
      if (filters.sortBy) params.append('sortBy', filters.sortBy);
      if (filters.order) params.append('order', filters.order);
    }
    const qs = params.toString();
    return apiFetch<{ count: number; salesOrders: SalesOrder[] }>(
      qs ? `/api/sales-orders?${qs}` : '/api/sales-orders'
    );
  },

  async getSalesOrderById(id: number): Promise<{ salesOrder: SalesOrder }> {
    return apiFetch<{ salesOrder: SalesOrder }>(`/api/sales-orders/${id}`);
  },

  async createSalesOrder(
    data: SalesOrderFormData
  ): Promise<{ message: string; salesOrder: SalesOrder }> {
    return apiFetch<{ message: string; salesOrder: SalesOrder }>('/api/sales-orders', {
      method: 'POST',
      body: JSON.stringify({
        customer: data.customer,
        warehouseCode: data.warehouseCode,
        orderDate: data.orderDate,
        expectedDate: data.expectedDate,
        shippingAddress: data.shippingAddress,
        paymentTerms: data.paymentTerms,
        notes: data.notes,
        status: data.status,
        items: data.items.map(it => ({
          productId: it.productId,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          taxRate: it.taxRate,
          discount: it.discount,
        })),
      }),
    });
  },

  async updateSalesOrder(
    id: number,
    data: Partial<SalesOrderFormData>
  ): Promise<{ message: string; salesOrder: SalesOrder }> {
    return apiFetch<{ message: string; salesOrder: SalesOrder }>(`/api/sales-orders/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        customer: data.customer,
        warehouseCode: data.warehouseCode,
        orderDate: data.orderDate,
        expectedDate: data.expectedDate,
        shippingAddress: data.shippingAddress,
        paymentTerms: data.paymentTerms,
        notes: data.notes,
        status: data.status,
        items: data.items?.map(it => ({
          productId: it.productId,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          taxRate: it.taxRate,
          discount: it.discount,
        })),
      }),
    });
  },

  async deleteSalesOrder(id: number): Promise<{ message: string; id: number }> {
    return apiFetch<{ message: string; id: number }>(`/api/sales-orders/${id}`, {
      method: 'DELETE',
    });
  },
};
