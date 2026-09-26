import { apiFetch } from './client';
import type {
  PurchaseOrder,
  PurchaseOrderFormData,
  PurchaseOrderFilterState,
  PurchaseOrdersMeta,
  ReceiveItem,
} from '../types';

export const purchaseOrdersApi = {
  async getMeta(): Promise<PurchaseOrdersMeta> {
    return apiFetch<PurchaseOrdersMeta>('/api/purchase-orders/meta');
  },

  async getPurchaseOrders(
    filters?: Partial<PurchaseOrderFilterState>
  ): Promise<{ count: number; purchaseOrders: PurchaseOrder[] }> {
    const params = new URLSearchParams();
    if (filters) {
      if (filters.search?.trim()) params.append('search', filters.search.trim());
      if (filters.status && filters.status !== 'All') params.append('status', filters.status);
      if (filters.warehouse && filters.warehouse !== 'All') params.append('warehouse', filters.warehouse);
      if (filters.supplier && filters.supplier !== 'All') params.append('supplier', filters.supplier);
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.append('dateTo', filters.dateTo);
      if (filters.sortBy) params.append('sortBy', filters.sortBy);
      if (filters.order) params.append('order', filters.order);
    }
    const qs = params.toString();
    return apiFetch<{ count: number; purchaseOrders: PurchaseOrder[] }>(
      qs ? `/api/purchase-orders?${qs}` : '/api/purchase-orders'
    );
  },

  async getPurchaseOrderById(id: number): Promise<{ purchaseOrder: PurchaseOrder }> {
    return apiFetch<{ purchaseOrder: PurchaseOrder }>(`/api/purchase-orders/${id}`);
  },

  async createPurchaseOrder(
    data: PurchaseOrderFormData
  ): Promise<{ message: string; purchaseOrder: PurchaseOrder }> {
    return apiFetch<{ message: string; purchaseOrder: PurchaseOrder }>('/api/purchase-orders', {
      method: 'POST',
      body: JSON.stringify({
        supplierId: data.supplierId,
        warehouseCode: data.warehouseCode,
        orderDate: data.orderDate,
        expectedDate: data.expectedDate,
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

  async updatePurchaseOrder(
    id: number,
    data: Partial<PurchaseOrderFormData>
  ): Promise<{ message: string; purchaseOrder: PurchaseOrder }> {
    return apiFetch<{ message: string; purchaseOrder: PurchaseOrder }>(`/api/purchase-orders/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        supplierId: data.supplierId,
        warehouseCode: data.warehouseCode,
        orderDate: data.orderDate,
        expectedDate: data.expectedDate,
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

  async deletePurchaseOrder(id: number): Promise<{ message: string; id: number }> {
    return apiFetch<{ message: string; id: number }>(`/api/purchase-orders/${id}`, {
      method: 'DELETE',
    });
  },

  async approvePurchaseOrder(id: number): Promise<{ message: string; purchaseOrder: PurchaseOrder }> {
    return apiFetch<{ message: string; purchaseOrder: PurchaseOrder }>(`/api/purchase-orders/${id}/approve`, {
      method: 'POST',
    });
  },

  async markAsOrdered(id: number): Promise<{ message: string; purchaseOrder: PurchaseOrder }> {
    return apiFetch<{ message: string; purchaseOrder: PurchaseOrder }>(`/api/purchase-orders/${id}/order`, {
      method: 'POST',
    });
  },

  async receiveGoods(
    id: number,
    receiveItems: ReceiveItem[],
    notes?: string,
    receivedDate?: string
  ): Promise<{ message: string; purchaseOrder: PurchaseOrder }> {
    return apiFetch<{ message: string; purchaseOrder: PurchaseOrder }>(`/api/purchase-orders/${id}/receive`, {
      method: 'POST',
      body: JSON.stringify({ receiveItems, notes, receivedDate }),
    });
  },
};
