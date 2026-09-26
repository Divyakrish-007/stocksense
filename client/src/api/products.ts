import { apiFetch } from './client';
import type { Product, ProductFormData, ProductFilterState, ProductsMeta } from '../types';

export const productsApi = {
  async getProducts(filters?: Partial<ProductFilterState>): Promise<{ count: number; products: Product[] }> {
    const params = new URLSearchParams();

    if (filters) {
      if (filters.search && filters.search.trim()) params.append('search', filters.search.trim());
      if (filters.category && filters.category !== 'All') params.append('category', filters.category);
      if (filters.warehouse && filters.warehouse !== 'All') params.append('warehouse', filters.warehouse);
      if (filters.status && filters.status !== 'All') params.append('status', filters.status);
      if (filters.sortBy) params.append('sortBy', filters.sortBy);
      if (filters.order) params.append('order', filters.order);
    }

    const queryString = params.toString();
    const endpoint = queryString ? `/api/products?${queryString}` : '/api/products';

    return apiFetch<{ count: number; products: Product[] }>(endpoint);
  },

  async getMeta(): Promise<ProductsMeta> {
    return apiFetch<ProductsMeta>('/api/products/meta');
  },

  async getProductById(id: number): Promise<{ product: Product }> {
    return apiFetch<{ product: Product }>(`/api/products/${id}`);
  },

  async createProduct(data: ProductFormData): Promise<{ message: string; product: Product }> {
    return apiFetch<{ message: string; product: Product }>('/api/products', {
      method: 'POST',
      body: JSON.stringify({
        sku: data.sku,
        name: data.name,
        category: data.category,
        quantity: data.quantity,
        minStockLevel: data.min_stock_level,
        unitPrice: data.unit_price,
        warehouseCode: data.warehouse_code,
      }),
    });
  },

  async updateProduct(id: number, data: ProductFormData): Promise<{ message: string; product: Product }> {
    return apiFetch<{ message: string; product: Product }>(`/api/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        sku: data.sku,
        name: data.name,
        category: data.category,
        quantity: data.quantity,
        minStockLevel: data.min_stock_level,
        unitPrice: data.unit_price,
        warehouseCode: data.warehouse_code,
      }),
    });
  },

  async deleteProduct(id: number): Promise<{ message: string; id: number }> {
    return apiFetch<{ message: string; id: number }>(`/api/products/${id}`, {
      method: 'DELETE',
    });
  },
};
