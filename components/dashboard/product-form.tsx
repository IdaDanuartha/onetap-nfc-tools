'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ShoppingBag, ArrowLeft, Save, Upload, Loader2, 
  Tag, Layers, Package, Sparkles, Check, X
} from 'lucide-react';
import { Card, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { CatalogProduct } from './products-table';

export function ProductForm({ product }: { product?: CatalogProduct }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // Form states
  const [name, setName] = useState(product?.name || '');
  const [slug, setSlug] = useState(product?.slug || '');
  const [character, setCharacter] = useState(product?.character || '');
  const [category, setCategory] = useState(product?.category || 'Keychain');
  const [price, setPrice] = useState(product?.price?.toString() || '30000');
  const [originalPrice, setOriginalPrice] = useState(product?.original_price?.toString() || '');
  const [minOrder, setMinOrder] = useState(product?.min_order?.toString() || '1');
  const [sold, setSold] = useState(product?.sold?.toString() || '5');
  const [description, setDescription] = useState(product?.description || '');
  const [isCustom, setIsCustom] = useState(product?.is_custom || false);
  const [isBestSeller, setIsBestSeller] = useState(product?.is_best_seller || false);
  const [status, setStatus] = useState(product?.status || 'active');
  
  // Sizes state
  const [selectedSizes, setSelectedSizes] = useState<string[]>(product?.sizes || ['5x5']);
  
  // Images states
  const [existingImages, setExistingImages] = useState<string[]>(product?.images || []);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [newPreviews, setNewPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Track if slug was edited manually
  const [isSlugEdited, setIsSlugEdited] = useState(() => {
    if (!product) return false;
    const generatedFromInitialName = product.name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
    return product.slug !== generatedFromInitialName;
  });

  // Auto-generate slug from name if not manually edited
  useEffect(() => {
    if (!isSlugEdited && name) {
      const generated = name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
      setSlug(generated);
    }
  }, [name, isSlugEdited]);

  // Clean up Object URLs
  useEffect(() => {
    return () => {
      newPreviews.forEach(p => URL.revokeObjectURL(p));
    };
  }, [newPreviews]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const selected = Array.from(e.target.files);
    
    setNewFiles(prev => [...prev, ...selected]);
    const newUrls = selected.map(file => URL.createObjectURL(file));
    setNewPreviews(prev => [...prev, ...newUrls]);
  };

  const removeExistingImage = (index: number) => {
    setExistingImages(prev => prev.filter((_, i) => i !== index));
  };

  const removeNewFile = (index: number) => {
    URL.revokeObjectURL(newPreviews[index]);
    setNewFiles(prev => prev.filter((_, i) => i !== index));
    setNewPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (files.length === 0) return;
    setNewFiles(prev => [...prev, ...files]);
    const urls = files.map(f => URL.createObjectURL(f));
    setNewPreviews(prev => [...prev, ...urls]);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const toggleSize = (size: string) => {
    setSelectedSizes(prev => 
      prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size]
    );
  };

  const slugify = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error('Nama produk wajib diisi.');
    if (!character.trim()) return toast.error('Karakter wajib diisi.');

    // Auto-generate slug from name if empty
    let finalSlug = slug.trim().toLowerCase();
    if (!finalSlug) {
      finalSlug = slugify(name);
    }

    setIsLoading(true);
    try {
      const supabase = createClient();

      // 1. Upload new image files (if any)
      const uploadedUrls: string[] = [];
      
      for (let i = 0; i < newFiles.length; i++) {
        const file = newFiles[i];
        const fileExt = file.name.split('.').pop();
        const uniqueId = Math.random().toString(36).substring(2, 9);
        const fileName = `${Date.now()}-${uniqueId}.${fileExt}`;
        const path = `product-images/${finalSlug}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('products')
          .upload(path, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          throw new Error(`Gagal upload gambar ${file.name}: ${uploadError.message}`);
        }

        const { data: { publicUrl } } = supabase.storage
          .from('products')
          .getPublicUrl(path);

        uploadedUrls.push(publicUrl);
      }

      // Combine images
      const finalImages = [...existingImages, ...uploadedUrls];

      if (finalImages.length === 0) {
        throw new Error('Minimal harus mengupload 1 foto produk.');
      }

      const payload = {
        name: name.trim(),
        slug: finalSlug,
        character: character.trim(),
        category,
        price: parseInt(price) || 0,
        original_price: originalPrice.trim() ? parseInt(originalPrice) : null,
        min_order: parseInt(minOrder) || 1,
        sold: parseInt(sold) || 0,
        description: description.trim(),
        sizes: selectedSizes,
        images: finalImages,
        is_custom: isCustom,
        is_best_seller: isBestSeller,
        status: status
      };

      if (product) {
        // Edit mode
        const { error } = await supabase
          .from('catalog_products')
          .update(payload)
          .eq('id', product.id);

        if (error) throw error;
        toast.success(`Produk "${name}" berhasil diperbarui.`);
      } else {
        // Create mode
        const { error } = await supabase
          .from('catalog_products')
          .insert(payload);

        if (error) throw error;
        toast.success(`Produk "${name}" berhasil ditambahkan.`);
      }

      router.push('/products');
      router.refresh();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Terjadi kesalahan saat menyimpan produk.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center justify-between">
        <Button 
          variant="outline" 
          onClick={() => router.push('/products')}
          className="rounded-xl h-10 px-3 gap-1.5 font-bold shadow-sm bg-card/60 backdrop-blur-sm border-none hover:bg-muted"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali ke Daftar
        </Button>

        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          Catalog Manager
        </span>
      </div>

      {/* Form Card */}
      <Card className="border-none shadow-2xl bg-card rounded-[2rem] overflow-hidden p-0 py-0 gap-0 ring-0">
        {/* Header */}
        <div className="bg-primary text-primary-foreground p-6 md:p-8">
          <h2 className="text-xl md:text-2xl font-black tracking-tight uppercase leading-snug">
            {product ? 'Edit Detail Produk' : 'Tambah Produk Baru'}
          </h2>
          <p className="text-primary-foreground/75 font-medium text-xs md:text-sm mt-1">
            {product ? `Memperbarui data produk: ${product.name}` : 'Masukkan spesifikasi lengkap produk untuk ditampilkan di katalog.'}
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit}>
          <CardContent className="p-6 md:p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Nama Produk</Label>
                <Input 
                  id="name"
                  placeholder="Contoh: Frieren Sleepy" 
                  value={name} 
                  onChange={e => setName(e.target.value)}
                  className="h-11 rounded-xl bg-muted/30 border-none focus-visible:ring-primary font-medium"
                  required
                />
              </div>

              {/* Slug */}
              <div className="space-y-2">
                <Label htmlFor="slug" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Slug URL (Terisi Otomatis)</Label>
                <Input 
                  id="slug"
                  placeholder="Contoh: frieren-sleepy" 
                  value={slug} 
                  onChange={e => {
                    setSlug(e.target.value);
                    setIsSlugEdited(true);
                  }}
                  className="h-11 rounded-xl bg-muted/30 border-none focus-visible:ring-primary font-mono text-sm"
                />
              </div>

              {/* Character */}
              <div className="space-y-2">
                <Label htmlFor="character" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Karakter</Label>
                <Input 
                  id="character"
                  placeholder="Contoh: Frieren / Himmel / Custom" 
                  value={character} 
                  onChange={e => setCharacter(e.target.value)}
                  className="h-11 rounded-xl bg-muted/30 border-none focus-visible:ring-primary font-medium"
                  required
                />
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label htmlFor="category" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Kategori</Label>
                <select
                  id="category"
                  className="w-full h-11 px-3 rounded-xl bg-muted/30 font-semibold text-sm outline-none focus:ring-2 focus:ring-primary/20 border-r-8 border-transparent"
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                >
                  <option value="Keychain">Keychain</option>
                  <option value="Sticker">Sticker</option>
                  <option value="Bundle">Bundle</option>
                </select>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label htmlFor="status" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Status Keaktifan</Label>
                <select
                  id="status"
                  className="w-full h-11 px-3 rounded-xl bg-muted/30 font-semibold text-sm outline-none focus:ring-2 focus:ring-primary/20 border-r-8 border-transparent"
                  value={status}
                  onChange={e => setStatus(e.target.value)}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="coming_soon">Coming Soon</option>
                </select>
              </div>

              {/* Price */}
              <div className="space-y-2">
                <Label htmlFor="price" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Harga Jual (Rp)</Label>
                <Input 
                  id="price"
                  type="number"
                  placeholder="30000" 
                  value={price} 
                  onChange={e => setPrice(e.target.value)}
                  className="h-11 rounded-xl bg-muted/30 border-none focus-visible:ring-primary font-medium"
                  required
                />
              </div>

              {/* Original Price */}
              <div className="space-y-2">
                <Label htmlFor="originalPrice" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Harga Coret / Asli (Rp - Opsional)</Label>
                <Input 
                  id="originalPrice"
                  type="number"
                  placeholder="35000" 
                  value={originalPrice} 
                  onChange={e => setOriginalPrice(e.target.value)}
                  className="h-11 rounded-xl bg-muted/30 border-none focus-visible:ring-primary"
                />
              </div>

              {/* Min Order */}
              <div className="space-y-2">
                <Label htmlFor="minOrder" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Min. Order (Pcs)</Label>
                <Input 
                  id="minOrder"
                  type="number"
                  placeholder="1" 
                  value={minOrder} 
                  onChange={e => setMinOrder(e.target.value)}
                  className="h-11 rounded-xl bg-muted/30 border-none focus-visible:ring-primary"
                  required
                />
              </div>

              {/* Sold */}
              <div className="space-y-2">
                <Label htmlFor="sold" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Sold Counter (Pcs)</Label>
                <Input 
                  id="sold"
                  type="number"
                  placeholder="5" 
                  value={sold} 
                  onChange={e => setSold(e.target.value)}
                  className="h-11 rounded-xl bg-muted/30 border-none focus-visible:ring-primary font-medium"
                  required
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Deskripsi Produk</Label>
              <Textarea
                id="description"
                placeholder="Tuliskan detail deskripsi produk..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="rounded-xl bg-muted/30 border-none focus-visible:ring-primary min-h-[100px] text-sm leading-relaxed"
              />
            </div>

            {/* Status & Sizes Checkbox Box */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5 bg-muted/20 border border-border/10 rounded-2xl">
              {/* Status switches */}
              <div className="space-y-4">
                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Status Produk</Label>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="isCustom" className="text-sm font-bold">Produk Custom Design</Label>
                    <p className="text-[10px] text-muted-foreground font-medium">Bebas memesan gambar custom apa saja.</p>
                  </div>
                  <Switch 
                    checked={isCustom} 
                    onCheckedChange={setIsCustom} 
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="isBestSeller" className="text-sm font-bold text-amber-500">Lencana Best Seller</Label>
                    <p className="text-[10px] text-muted-foreground font-medium">Menandai produk sebagai paling laris.</p>
                  </div>
                  <Switch 
                    checked={isBestSeller} 
                    onCheckedChange={setIsBestSeller} 
                  />
                </div>
              </div>

              {/* Sizes list */}
              <div className="space-y-3">
                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Daftar Ukuran Tersedia</Label>
                <div className="flex flex-wrap gap-2">
                  {['5x5', '6x6', '7x7'].map(size => {
                    const active = selectedSizes.includes(size);
                    return (
                      <button
                        key={size}
                        type="button"
                        onClick={() => toggleSize(size)}
                        className={cn(
                          "h-10 px-4 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all",
                          active 
                            ? "bg-primary border-primary text-primary-foreground shadow-sm shadow-primary/10" 
                            : "bg-card border-border/40 text-muted-foreground hover:bg-muted/40"
                        )}
                      >
                        {active && <Check className="w-3.5 h-3.5" />}
                        {size} cm
                      </button>
                    );
                  })}
                </div>
                <p className="text-[9px] text-muted-foreground font-medium leading-relaxed">Pilih satu atau beberapa ukuran standar akrilik keychain.</p>
              </div>
            </div>

            {/* Images upload */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Galeri Foto Produk (Multiple Files)</Label>
                <span className="text-[10px] font-bold text-muted-foreground">Min. 1 Foto</span>
              </div>
              
              {/* File Input trigger / Drop Zone */}
              <div 
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDragEnter={handleDragOver}
                className={cn(
                  "border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all duration-200",
                  isDragOver
                    ? "border-primary bg-primary/10 scale-[1.01] shadow-md shadow-primary/10"
                    : "border-muted-foreground/30 hover:border-primary/50 bg-muted/10 hover:bg-primary/5"
                )}
              >
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200",
                  isDragOver ? "bg-primary/20" : "bg-muted/40"
                )}>
                  <Upload className={cn("w-6 h-6 transition-colors", isDragOver ? "text-primary" : "text-muted-foreground/60")} />
                </div>
                <p className={cn("text-xs font-bold transition-colors", isDragOver ? "text-primary" : "text-foreground/80")}>
                  {isDragOver ? "Lepaskan untuk upload!" : "Drag & drop foto, atau klik untuk pilih"}
                </p>
                <p className="text-[10px] text-muted-foreground font-medium">
                  Bisa memilih beberapa file sekaligus (.png, .jpg, .jpeg)
                </p>
                <input 
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  multiple
                  className="hidden"
                />
              </div>

              {/* Photos Gallery Previews */}
              {(existingImages.length > 0 || newPreviews.length > 0) && (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 p-4 bg-muted/10 border border-border/10 rounded-2xl">
                  {/* Existing database images */}
                  {existingImages.map((url, i) => (
                    <div key={`existing-${i}`} className="relative aspect-square w-full bg-muted rounded-xl overflow-hidden group shadow-sm border border-border/10">
                      <img src={url} alt={`product-${i}`} className="object-cover w-full h-full" />
                      <button 
                        type="button"
                        onClick={() => removeExistingImage(i)}
                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-destructive hover:scale-105 transition-all opacity-0 group-hover:opacity-100"
                        title="Hapus gambar"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                      <span className="absolute bottom-1 left-1 bg-black/50 text-[8px] font-black text-white px-1.5 py-0.5 rounded uppercase">DB {i + 1}</span>
                    </div>
                  ))}

                  {/* Newly selected files previews */}
                  {newPreviews.map((url, i) => (
                    <div key={`new-${i}`} className="relative aspect-square w-full bg-muted rounded-xl overflow-hidden group shadow-sm border border-[#FF5FA2]/20">
                      <img src={url} alt={`new-file-${i}`} className="object-cover w-full h-full" />
                      <button 
                        type="button"
                        onClick={() => removeNewFile(i)}
                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-destructive hover:scale-105 transition-all opacity-0 group-hover:opacity-100"
                        title="Hapus file"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                      <span className="absolute bottom-1 left-1 bg-primary text-[8px] font-black text-white px-1.5 py-0.5 rounded uppercase">NEW</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>

          {/* Form Footer */}
          <div className="p-6 md:p-8 pt-0 flex gap-3">
            <Button 
              type="submit" 
              disabled={isLoading} 
              className="flex-1 h-12 rounded-xl font-bold gap-2 text-base shadow-xl shadow-primary/20"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              {product ? 'Perbarui Produk' : 'Simpan Produk'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
