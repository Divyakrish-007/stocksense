import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { Product, ProductFormData, ProductFilterState, ProductsMeta } from '../types';
import { productsApi } from '../api/products';
import { useToast } from '../context/ToastContext';

import { ProductFilters } from '../components/products/ProductFilters';
import { ProductsTable } from '../components/products/ProductsTable';
import { ProductFormModal } from '../components/products/ProductFormModal';
import { DeleteProductModal } from '../components/products/DeleteProductModal';

import { Package, Plus, AlertTriangle, RefreshCw, TrendingDown } from 'lucide-react';

// ─── Default filter state ──────────────────────────────────────────────────────
const DEFAULT_FILTERS: ProductFilterState = {
  search: '',
  category: 'All',
  warehouse: 'All',
  status: 'All',
  sortBy: 'id',
  order: 'DESC',
};

// ─── Stat Card ─────────────────────────────────────────────────────────────────
interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  accent: 'blue' | 'amber' | 'rose' | 'emerald';
}

const StatCard: React.FC<StatCardProps> = ({ label, value, sub, icon, accent }) => {
  const accentMap = {
    blue:    'bg-blue-50 border-blue-200 text-blue-600',
    amber:   'bg-amber-50 border-amber-200 text-amber-600',
    rose:    'bg-rose-50 border-rose-200 text-rose-600',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-600',
  };
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 ${accentMap[accent]}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">{label}</p>
        <p className="text-xl font-bold text-slate-900 leading-tight">{value}</p>
        {sub && <p className="text-[11px] text-slate-500 truncate">{sub}</p>}
      </div>
    </div>
  );
};

// ─── Main Page Component ───────────────────────────────────────────────────────
export const ProductsPage: React.FC = () => {
  const { showToast } = useToast();

  // ── Data state ──────────────────────────────────────────────────────────────
  const [products, setProducts] = useState<Product[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [meta, setMeta] = useState<ProductsMeta | null>(null);
  const [filters, setFilters] = useState<ProductFilterState>(DEFAULT_FILTERS);

  // ── Loading / Error state ────────────────────────────────────────────────────
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [isLoadingMeta, setIsLoadingMeta] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  // ── Modal state ──────────────────────────────────────────────────────────────
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);


  // ── Fetch meta (categories / warehouses / stats) once ───────────────────────
  const fetchMeta = useCallback(async () => {
    try {
      setIsLoadingMeta(true);
      const data = await productsApi.getMeta();
      setMeta(data);
    } catch (err: any) {
      console.error('Failed to load catalog meta:', err);
      // Non-blocking — page can still show products
    } finally {
      setIsLoadingMeta(false);
    }
  }, []);

  // ── Fetch products (re-runs when filters change) ─────────────────────────────
  const fetchProducts = useCallback(async (activeFilters: ProductFilterState) => {
    try {
      setIsLoadingProducts(true);
      setPageError(null);
      const { count, products: data } = await productsApi.getProducts(activeFilters);
      setProducts(data);
      setTotalCount(count);
    } catch (err: any) {
      setPageError(err.message || 'Unable to load product catalog from server.');
      setProducts([]);
      setTotalCount(0);
    } finally {
      setIsLoadingProducts(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchMeta();
    fetchProducts(DEFAULT_FILTERS);
  }, [fetchMeta, fetchProducts]);

  // Re-fetch when filters change (debounced on search)
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts(filters);
    }, filters.search ? 350 : 0);
    return () => clearTimeout(timer);
  }, [filters, fetchProducts]);

  // ── Filter handlers ──────────────────────────────────────────────────────────
  const handleFilterChange = useCallback((key: keyof ProductFilterState, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleFilterReset = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  // ── Add / Edit modal handlers ────────────────────────────────────────────────
  const openAddModal = () => {
    setEditingProduct(null);
    setIsFormOpen(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setIsFormOpen(true);
  };

  const closeFormModal = () => {
    setIsFormOpen(false);
    setEditingProduct(null);
  };

  // ── CRUD operations ──────────────────────────────────────────────────────────
  const handleFormSubmit = async (data: ProductFormData) => {
    if (editingProduct) {
      // UPDATE
      const res = await productsApi.updateProduct(editingProduct.id, data);
      showToast('success', 'Product Updated', `${res.product.name} (${res.product.sku}) has been saved.`);
    } else {
      // CREATE
      const res = await productsApi.createProduct(data);
      showToast('success', 'Product Added', `${res.product.name} added to the inventory catalog.`);
    }
    // Refresh both list and stats
    await Promise.all([fetchProducts(filters), fetchMeta()]);
  };

  const openDeleteModal = (product: Product) => {
    setDeletingProduct(product);
    setIsDeleteOpen(true);
  };

  const closeDeleteModal = () => {
    setIsDeleteOpen(false);
    setDeletingProduct(null);
  };

  // onConfirm for DeleteProductModal receives the product id
  const handleDeleteConfirm = async (id: number) => {
    const target = deletingProduct;
    if (!target) return;
    await productsApi.deleteProduct(id);
    showToast('success', 'Product Removed', `${target.name} (${target.sku}) deleted from catalog.`);
    closeDeleteModal();
    await Promise.all([fetchProducts(filters), fetchMeta()]);
  };

  // ── Derived values ───────────────────────────────────────────────────────────
  const categories = useMemo(() => meta?.categories ?? [], [meta]);
  const warehouses  = useMemo(() => meta?.warehouses  ?? [], [meta]);
  const stats       = useMemo(() => meta?.stats, [meta]);

  const isFiltered = useMemo(() =>
    filters.search !== '' ||
    filters.category !== 'All' ||
    filters.warehouse !== 'All' ||
    filters.status !== 'All' ||
    filters.sortBy !== 'id',
  [filters]);

  const totalValuationFormatted = stats
    ? `$${stats.totalValuation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : '—';

  // ── Page Error State ─────────────────────────────────────────────────────────
  if (pageError && !isLoadingProducts) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-5 text-center px-6">
        <div className="w-16 h-16 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-rose-500" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-800 mb-1">Failed to Load Product Catalog</h2>
          <p className="text-sm text-slate-500 max-w-sm">{pageError}</p>
        </div>
        <button
          onClick={() => fetchProducts(filters)}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors shadow shadow-blue-600/20"
        >
          <RefreshCw className="w-4 h-4" />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-8">
      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Package className="w-7 h-7 text-blue-600" />
            Products &amp; Catalog
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage SKUs, stock levels, valuations, and warehouse assignments
          </p>
        </div>

        <button
          id="add-product-btn"
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white text-sm font-semibold rounded-xl shadow shadow-blue-600/20 transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          Add Product
        </button>
      </div>

      {/* ── KPI Stats Row ─────────────────────────────────────────────────────── */}
      {!isLoadingMeta && stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          <StatCard
            label="Total SKUs"
            value={stats.totalSkus.toLocaleString()}
            sub={`${stats.totalUnits.toLocaleString()} units on hand`}
            icon={<Package className="w-5 h-5" />}
            accent="blue"
          />
          <StatCard
            label="Catalog Valuation"
            value={totalValuationFormatted}
            sub="Across all warehouses"
            icon={<span className="text-sm font-bold">$</span>}
            accent="emerald"
          />
          <StatCard
            label="Low Stock Alerts"
            value={stats.lowStockCount}
            sub="Need restocking soon"
            icon={<TrendingDown className="w-5 h-5" />}
            accent="amber"
          />
          <StatCard
            label="Out of Stock"
            value={stats.outOfStockCount}
            sub="Zero quantity on hand"
            icon={<AlertTriangle className="w-5 h-5" />}
            accent="rose"
          />
        </div>
      )}

      {/* ── Filters Panel ─────────────────────────────────────────────────────── */}
      <ProductFilters
        filters={filters}
        categories={categories}
        warehouses={warehouses}
        totalCount={totalCount}
        onChange={handleFilterChange}
        onReset={handleFilterReset}
      />

      {/* ── Products Table ────────────────────────────────────────────────────── */}
      <ProductsTable
        products={products}
        isLoading={isLoadingProducts}
        onEdit={openEditModal}
        onDelete={openDeleteModal}
        onAddNew={openAddModal}
        onResetFilters={handleFilterReset}
        isFiltered={isFiltered}
      />

      {/* ── Add / Edit Form Modal ─────────────────────────────────────────────── */}
      <ProductFormModal
        isOpen={isFormOpen}
        onClose={closeFormModal}
        onSubmit={handleFormSubmit}
        initialProduct={editingProduct}
        warehouses={warehouses}
        existingCategories={categories.length > 0 ? categories : ['Electronics', 'Mechanical', 'Consumables', 'Tools', 'Packaging']}
      />

      {/* ── Delete Confirmation Modal ─────────────────────────────────────────── */}
      <DeleteProductModal
        isOpen={isDeleteOpen}
        product={deletingProduct}
        onClose={closeDeleteModal}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
};
