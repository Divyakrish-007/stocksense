import { apiFetch } from './client';
import type { KpiStats, InventoryActivity, FilterOptions, DashboardFilterState, ActivityStatus } from '../types';

export const dashboardApi = {
  async getStats(): Promise<KpiStats> {
    return apiFetch<KpiStats>('/api/dashboard/stats');
  },

  async getActivities(filters?: Partial<DashboardFilterState>): Promise<{ count: number; activities: InventoryActivity[] }> {
    const params = new URLSearchParams();

    if (filters) {
      if (filters.type && filters.type !== 'All') params.append('type', filters.type);
      if (filters.status && filters.status !== 'All') params.append('status', filters.status);
      if (filters.warehouse && filters.warehouse !== 'All') params.append('warehouse', filters.warehouse);
      if (filters.category && filters.category !== 'All') params.append('category', filters.category);
      if (filters.search && filters.search.trim()) params.append('search', filters.search.trim());
    }

    const queryString = params.toString();
    const endpoint = queryString ? `/api/dashboard/activities?${queryString}` : '/api/dashboard/activities';

    return apiFetch<{ count: number; activities: InventoryActivity[] }>(endpoint);
  },

  async getFilterOptions(): Promise<FilterOptions> {
    return apiFetch<FilterOptions>('/api/dashboard/filter-options');
  },

  async createActivity(activity: {
    type: string;
    contact: string;
    sourceLocation: string;
    destLocation: string;
    category: string;
    itemsCount: number;
    scheduledDate: string;
    status: string;
    notes?: string;
  }): Promise<{ message: string; reference: string }> {
    return apiFetch<{ message: string; reference: string }>('/api/dashboard/activities', {
      method: 'POST',
      body: JSON.stringify(activity),
    });
  },

  async updateActivityStatus(id: number, status: ActivityStatus): Promise<{ message: string }> {
    return apiFetch<{ message: string }>(`/api/dashboard/activities/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },
};
