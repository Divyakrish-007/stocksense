import { apiFetch } from './client';
import type {
  ReportOverview,
  InventoryReport,
  PurchaseReport,
  SalesReport,
  MovementReport,
  WarehouseReport,
} from '../types';

function buildParams(filters?: { dateFrom?: string; dateTo?: string; warehouse?: string }): string {
  const params = new URLSearchParams();
  if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom);
  if (filters?.dateTo) params.append('dateTo', filters.dateTo);
  if (filters?.warehouse && filters.warehouse !== 'All') params.append('warehouse', filters.warehouse);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export const reportsApi = {
  async getOverview(): Promise<ReportOverview> {
    return apiFetch<ReportOverview>('/api/reports/overview');
  },

  async getInventoryReport(filters?: { warehouse?: string }): Promise<InventoryReport> {
    const params = new URLSearchParams();
    if (filters?.warehouse && filters.warehouse !== 'All') params.append('warehouse', filters.warehouse);
    const qs = params.toString();
    return apiFetch<InventoryReport>(qs ? `/api/reports/inventory?${qs}` : '/api/reports/inventory');
  },

  async getPurchaseReport(filters?: { dateFrom?: string; dateTo?: string }): Promise<PurchaseReport> {
    return apiFetch<PurchaseReport>(`/api/reports/purchases${buildParams(filters)}`);
  },

  async getSalesReport(filters?: { dateFrom?: string; dateTo?: string }): Promise<SalesReport> {
    return apiFetch<SalesReport>(`/api/reports/sales${buildParams(filters)}`);
  },

  async getMovementReport(filters?: { dateFrom?: string; dateTo?: string }): Promise<MovementReport> {
    return apiFetch<MovementReport>(`/api/reports/movements${buildParams(filters)}`);
  },

  async getWarehouseReport(): Promise<WarehouseReport> {
    return apiFetch<WarehouseReport>('/api/reports/warehouses');
  },

  async exportReport(
    type: string,
    format: 'csv' | 'json' = 'json',
    filters?: { dateFrom?: string; dateTo?: string }
  ): Promise<{ filename: string; data: Record<string, unknown>[]; csv?: string }> {
    const params = new URLSearchParams();
    params.append('type', type);
    params.append('format', format);
    if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters?.dateTo) params.append('dateTo', filters.dateTo);
    return apiFetch(`/api/reports/export?${params.toString()}`);
  },
};
