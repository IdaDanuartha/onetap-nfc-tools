'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  ShoppingBag, Search, Edit, Trash2, Plus, X, 
  Tag, Layers, Package, AlertTriangle, Loader2,
  SlidersHorizontal, ChevronDown, ArrowUpDown
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

export interface CatalogProduct {
  id: number;
  slug: string;
  name: string;
  character: string;
  category: string;
  price: number;
  original_price: number | null;
  min_order: number;
  sold: number;
  description: string;
  images: string[];
  sizes: string[];
  is_custom: boolean;
  is_best_seller: boolean;
  created_at?: string;
  status: string;
}

export function ProductsTable({ initialProducts }: { initialProducts: CatalogProduct[] }) {
  const [products, setProducts] = useState<CatalogProduct[]>(initialProducts);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedCharacter, setSelectedCharacter] = useState('');
  const [selectedBadge, setSelectedBadge] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [sortBy, setSortBy] = useState('default');
  const [productToDelete, setProductToDelete] = useState<CatalogProduct | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!productToDelete) return;
    setIsDeleting(true);

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('catalog_products')
        .delete()
        .eq('id', productToDelete.id);

      if (error) throw error;

      setProducts(prev => prev.filter(p => p.id !== productToDelete.id));
      toast.success(`Produk "${productToDelete.name}" berhasil dihapus.`);
      setProductToDelete(null);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Gagal menghapus produk.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Dynamically get unique values for filters
  const categories = Array.from(new Set(products.map(p => p.category))).filter(Boolean).sort();
  const characters = Array.from(new Set(products.map(p => p.character))).filter(Boolean).sort();

  const handleResetFilters = () => {
    setSearch('');
    setSelectedCategory('');
    setSelectedCharacter('');
    setSelectedBadge('');
    setSelectedStatus('');
    setSortBy('default');
  };

  const hasActiveFilters = search || selectedCategory || selectedCharacter || selectedBadge || selectedStatus || sortBy !== 'default';

  const filteredProducts = products
    .filter(p => {
      const matchesSearch = 
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.character.toLowerCase().includes(search.toLowerCase()) ||
        p.category.toLowerCase().includes(search.toLowerCase());
      
      const matchesCategory = !selectedCategory || p.category === selectedCategory;
      const matchesCharacter = !selectedCharacter || p.character === selectedCharacter;
      
      let matchesBadge = true;
      if (selectedBadge === 'best_seller') {
        matchesBadge = p.is_best_seller;
      } else if (selectedBadge === 'custom') {
        matchesBadge = p.is_custom;
      } else if (selectedBadge === 'standard') {
        matchesBadge = !p.is_best_seller && !p.is_custom;
      }

      const matchesStatus = !selectedStatus || p.status === selectedStatus;
      
      return matchesSearch && matchesCategory && matchesCharacter && matchesBadge && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === 'name-asc') {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === 'price-asc') {
        return a.price - b.price;
      }
      if (sortBy === 'price-desc') {
        return b.price - a.price;
      }
      if (sortBy === 'sold-desc') {
        return b.sold - a.sold;
      }
      return 0; // default (id ascending, ordering from database)
    });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2 tracking-tight">
            <ShoppingBag className="w-7 h-7 text-primary" />
            KELOLA PRODUK KATALOG
          </h1>
          <p className="text-sm text-muted-foreground font-medium">Tambah, edit, hapus, dan atur detail produk fisik catalog dinamis.</p>
        </div>
        <Link href="/products/new">
          <Button className="rounded-xl h-11 px-4 gap-2 font-bold shadow-lg shadow-primary/20">
            <Plus className="w-4 h-4" />
            Tambah Produk
          </Button>
        </Link>
      </div>

      {/* Filter Bar */}
      <div className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Cari produk berdasarkan nama, karakter, atau kategori..." 
            className="pl-9 h-12 bg-card/50 backdrop-blur-sm border-none shadow-sm rounded-xl focus-visible:ring-primary"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground mr-1">
            <SlidersHorizontal className="w-3.5 h-3.5 text-primary" />
            <span>Filter:</span>
          </div>

          {/* Category Dropdown */}
          <div className="relative shrink-0 min-w-[140px]">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full h-10 pl-3 pr-8 rounded-xl bg-card/60 backdrop-blur-sm border border-border/10 text-xs font-bold uppercase tracking-wider text-muted-foreground outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer hover:bg-muted/30 transition-all"
            >
              <option value="">Semua Kategori</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/60 pointer-events-none" />
          </div>

          {/* Character Dropdown */}
          <div className="relative shrink-0 min-w-[140px]">
            <select
              value={selectedCharacter}
              onChange={(e) => setSelectedCharacter(e.target.value)}
              className="w-full h-10 pl-3 pr-8 rounded-xl bg-card/60 backdrop-blur-sm border border-border/10 text-xs font-bold uppercase tracking-wider text-muted-foreground outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer hover:bg-muted/30 transition-all"
            >
              <option value="">Semua Karakter</option>
              {characters.map(char => (
                <option key={char} value={char}>{char}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/60 pointer-events-none" />
          </div>

          {/* Badge Dropdown */}
          <div className="relative shrink-0 min-w-[140px]">
            <select
              value={selectedBadge}
              onChange={(e) => setSelectedBadge(e.target.value)}
              className="w-full h-10 pl-3 pr-8 rounded-xl bg-card/60 backdrop-blur-sm border border-border/10 text-xs font-bold uppercase tracking-wider text-muted-foreground outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer hover:bg-muted/30 transition-all"
            >
              <option value="">Semua Lencana</option>
              <option value="best_seller">Best Seller</option>
              <option value="custom">Custom Design</option>
              <option value="standard">Standard</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/60 pointer-events-none" />
          </div>

          {/* Status Dropdown */}
          <div className="relative shrink-0 min-w-[140px]">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full h-10 pl-3 pr-8 rounded-xl bg-card/60 backdrop-blur-sm border border-border/10 text-xs font-bold uppercase tracking-wider text-muted-foreground outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer hover:bg-muted/30 transition-all"
            >
              <option value="">Semua Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="coming_soon">Coming Soon</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/60 pointer-events-none" />
          </div>

          {/* Sort Dropdown */}
          <div className="relative shrink-0 min-w-[140px] ml-auto sm:ml-0">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full h-10 pl-3 pr-8 rounded-xl bg-card/60 backdrop-blur-sm border border-border/10 text-xs font-bold uppercase tracking-wider text-muted-foreground outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer hover:bg-muted/30 transition-all"
            >
              <option value="default">Urutan: Default</option>
              <option value="name-asc">Urutan: Nama A-Z</option>
              <option value="price-asc">Urutan: Harga Terendah</option>
              <option value="price-desc">Urutan: Harga Tertinggi</option>
              <option value="sold-desc">Urutan: Terlaris</option>
            </select>
            <ArrowUpDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/60 pointer-events-none" />
          </div>

          {/* Reset Button */}
          {hasActiveFilters && (
            <Button
              onClick={handleResetFilters}
              variant="outline"
              size="sm"
              className="h-10 rounded-xl px-3 border border-destructive/20 text-destructive hover:bg-destructive/10 gap-1.5 font-bold text-xs uppercase tracking-wider transition-all"
            >
              <X className="w-3.5 h-3.5" />
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-card rounded-2xl border border-border/10 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border/30 bg-muted/20 text-[10px] uppercase font-black tracking-widest text-muted-foreground">
                <th className="p-4 pl-6 w-20">Foto</th>
                <th className="p-4">Nama / Karakter</th>
                <th className="p-4">Kategori</th>
                <th className="p-4">Ukuran</th>
                <th className="p-4">Harga Jual</th>
                <th className="p-4">Terjual</th>
                <th className="p-4">Lencana</th>
                <th className="p-4">Status</th>
                <th className="p-4 pr-6 text-right w-28">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20 text-sm font-medium text-foreground">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <ShoppingBag className="w-10 h-10 text-muted-foreground/45 animate-pulse" />
                      <p className="font-bold">Produk Tidak Ditemukan</p>
                      <p className="text-xs">Gunakan kata kunci pencarian lain atau buat produk baru.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredProducts.map(p => {
                  const hasDiscount = p.original_price && p.original_price > p.price;
                  return (
                    <tr key={p.id} className="hover:bg-muted/10 transition-colors">
                      {/* Photo */}
                      <td className="p-4 pl-6">
                        <div className="w-12 h-12 rounded-xl bg-muted/40 overflow-hidden border border-border/10 flex items-center justify-center shrink-0">
                          {p.images && p.images.length > 0 ? (
                            <img src={p.images[0]} alt={p.name} className="object-cover w-full h-full" />
                          ) : (
                            <ShoppingBag className="w-5 h-5 text-muted-foreground/30" />
                          )}
                        </div>
                      </td>

                      {/* Name / Character */}
                      <td className="p-4">
                        <div className="font-bold text-foreground leading-snug">{p.name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5 font-semibold uppercase tracking-wider flex items-center gap-1">
                          <Tag className="w-3 h-3 text-primary" />
                          {p.character}
                        </div>
                      </td>

                      {/* Category */}
                      <td className="p-4">
                        <span className="text-xs bg-muted border border-border/10 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider text-muted-foreground">
                          {p.category}
                        </span>
                      </td>

                      {/* Sizes */}
                      <td className="p-4 font-mono text-xs font-bold text-muted-foreground">
                        {p.sizes && p.sizes.length > 0 ? p.sizes.join(', ') : '-'}
                      </td>

                      {/* Price */}
                      <td className="p-4 font-semibold">
                        <div>
                          {p.is_custom ? 'Mulai ' : ''}Rp {p.price.toLocaleString('id-ID')}
                        </div>
                        {hasDiscount && (
                          <div className="text-[10px] text-muted-foreground line-through font-mono">
                            Rp {p.original_price!.toLocaleString('id-ID')}
                          </div>
                        )}
                      </td>

                      {/* Sold */}
                      <td className="p-4 text-xs font-bold text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Package className="w-3.5 h-3.5" />
                          {p.sold}
                        </div>
                      </td>

                      {/* Status Badges */}
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1">
                          {p.is_best_seller && (
                            <span className="bg-amber-400/10 text-amber-500 border border-amber-400/20 text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wide">
                              Best Seller
                            </span>
                          )}
                          {p.is_custom && (
                            <span className="bg-primary/10 text-primary border border-primary/20 text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wide">
                              Custom
                            </span>
                          )}
                          {!p.is_best_seller && !p.is_custom && (
                            <span className="text-muted-foreground/60 text-[9px] font-bold">-</span>
                          )}
                        </div>
                      </td>

                      {/* Visibility Status */}
                      <td className="p-4">
                        {p.status === 'active' && (
                          <span className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wide">
                            Active
                          </span>
                        )}
                        {p.status === 'inactive' && (
                          <span className="bg-destructive/10 text-destructive border border-destructive/20 text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wide">
                            Inactive
                          </span>
                        )}
                        {p.status === 'coming_soon' && (
                          <span className="bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wide">
                            Coming Soon
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-4 pr-6 text-right">
                        <div className="flex justify-end gap-2">
                          <Link href={`/products/${p.id}`}>
                            <Button 
                              variant="outline" 
                              size="icon" 
                              className="h-8 w-8 rounded-lg border-none bg-muted hover:bg-primary/10 hover:text-primary transition-all shadow-sm"
                              title="Edit produk"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </Button>
                          </Link>
                          <Button 
                            onClick={() => setProductToDelete(p)}
                            variant="outline" 
                            size="icon" 
                            className="h-8 w-8 rounded-lg border-none bg-destructive/10 hover:bg-destructive text-destructive hover:text-destructive-foreground transition-all shadow-sm"
                            title="Hapus produk"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CUSTOM DELETE CONFIRMATION MODAL */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
          <Card className="w-full max-w-md border-none shadow-2xl animate-in zoom-in-95 duration-200 rounded-[2rem] overflow-hidden bg-card p-6 flex flex-col items-center text-center space-y-4">
            
            {/* Warning Icon Badge */}
            <div className="w-16 h-16 rounded-full bg-destructive/10 text-destructive flex items-center justify-center shadow-inner">
              <AlertTriangle className="w-8 h-8" />
            </div>

            {/* Content */}
            <div className="space-y-1">
              <h3 className="text-lg font-black tracking-tight uppercase leading-snug text-foreground">
                Hapus Produk?
              </h3>
              <p className="text-sm text-muted-foreground font-medium px-2 leading-relaxed">
                Apakah Anda yakin ingin menghapus produk <strong>&ldquo;{productToDelete.name}&rdquo;</strong>? Tindakan ini akan menghapus data permanen dari database.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex w-full gap-3 pt-2">
              <Button 
                onClick={() => setProductToDelete(null)}
                variant="outline" 
                disabled={isDeleting}
                className="flex-1 h-12 rounded-xl font-bold text-sm bg-muted hover:bg-muted/80 border-none transition-all"
              >
                Batal
              </Button>
              <Button 
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 h-12 rounded-xl font-bold text-sm bg-destructive hover:bg-destructive/90 text-destructive-foreground transition-all shadow-lg shadow-destructive/20"
              >
                {isDeleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Ya, Hapus'
                )}
              </Button>
            </div>

          </Card>
        </div>
      )}
    </div>
  );
}
