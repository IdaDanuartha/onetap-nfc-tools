'use client';

import { useState } from 'react';
import { 
  Users, Search, Edit, Calendar, Loader2, X, Save, 
  Mail, Phone, Clock, Sparkles, AlertCircle, CheckCircle2, User as UserIcon
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export interface UserProfile {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  plan: string;
  created_at: string;
  updated_at: string;
  role: string | null;
  plan_expires_at: string | null;
  email: string | null;
  whatsapp: string | null;
}

export function UsersManager({ initialUsers }: { initialUsers: UserProfile[] }) {
  const [users, setUsers] = useState<UserProfile[]>(initialUsers);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState<'all' | 'free' | 'professional' | 'education'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Selected user for editing plan
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  
  // Form State
  const [plan, setPlan] = useState<string>('free');
  const [expiryType, setExpiryType] = useState<'30' | '90' | '365' | 'lifetime' | 'custom'>('30');
  const [customExpiryDate, setCustomExpiryDate] = useState<string>('');

  const filteredUsers = users.filter(u => {
    const matchesSearch =
      (u.display_name?.toLowerCase() || '').includes(search.toLowerCase()) ||
      (u.username?.toLowerCase() || '').includes(search.toLowerCase()) ||
      (u.email?.toLowerCase() || '').includes(search.toLowerCase()) ||
      (u.whatsapp?.toLowerCase() || '').includes(search.toLowerCase());

    const matchesPlan = planFilter === 'all' || u.plan === planFilter;

    return matchesSearch && matchesPlan;
  });

  const openPlanModal = (user: UserProfile) => {
    setSelectedUser(user);
    setPlan(user.plan || 'free');
    
    if (!user.plan_expires_at) {
      setExpiryType('lifetime');
      setCustomExpiryDate('');
    } else {
      const expDate = new Date(user.plan_expires_at);
      // Format as YYYY-MM-DD for date input
      const formattedDate = expDate.toISOString().split('T')[0];
      setCustomExpiryDate(formattedDate);
      
      // Attempt to match presets
      const now = Date.now();
      const diffDays = Math.round((expDate.getTime() - now) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 30) {
        setExpiryType('30');
      } else if (diffDays === 90) {
        setExpiryType('90');
      } else if (diffDays === 365) {
        setExpiryType('365');
      } else {
        setExpiryType('custom');
      }
    }
    
    setIsModalOpen(true);
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    let finalExpiryDate: string | null = null;
    
    if (plan !== 'free') {
      const now = new Date();
      if (expiryType === '30') {
        now.setDate(now.getDate() + 30);
        finalExpiryDate = now.toISOString();
      } else if (expiryType === '90') {
        now.setDate(now.getDate() + 90);
        finalExpiryDate = now.toISOString();
      } else if (expiryType === '365') {
        now.setDate(now.getDate() + 365);
        finalExpiryDate = now.toISOString();
      } else if (expiryType === 'custom') {
        if (!customExpiryDate) {
          toast.error('Pilih tanggal kadaluarsa kustom terlebih dahulu!');
          return;
        }
        // Set to end of the day
        const customDateObj = new Date(customExpiryDate);
        customDateObj.setHours(23, 59, 59, 999);
        finalExpiryDate = customDateObj.toISOString();
      } else {
        // lifetime
        finalExpiryDate = null;
      }
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/users/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUser.id,
          plan,
          plan_expires_at: finalExpiryDate
        })
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      // Update local state immediately
      setUsers(prev => prev.map(u => u.id === selectedUser.id ? { 
        ...u, 
        plan, 
        plan_expires_at: finalExpiryDate,
        updated_at: new Date().toISOString() 
      } : u));
      
      toast.success(`Plan untuk ${selectedUser.display_name || selectedUser.username} berhasil diperbarui!`);
      setIsModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Gagal memperbarui plan pengguna');
    } finally {
      setIsLoading(false);
    }
  };

  // Stat calculations
  const totalUsersCount = users.length;
  const premiumCount = users.filter(u => u.plan === 'professional' || u.plan === 'education').length;
  const professionalCount = users.filter(u => u.plan === 'professional').length;
  const educationCount = users.filter(u => u.plan === 'education').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2 tracking-tight">
            <Users className="w-7 h-7 text-primary" />
            MANAGE USERS
          </h1>
          <p className="text-sm text-muted-foreground font-medium">Aktifkan plan premium, kelola durasi, dan pantau status user OneTap.</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-none shadow-md bg-card/40 backdrop-blur-sm rounded-2xl">
          <CardContent className="p-4 flex flex-col justify-center items-center text-center">
            <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Total Users</p>
            <p className="text-2xl font-black text-foreground mt-1">{totalUsersCount}</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-md bg-gradient-to-br from-[#FF5FA2]/5 to-[#E8457E]/5 border border-[#FF5FA2]/10 rounded-2xl">
          <CardContent className="p-4 flex flex-col justify-center items-center text-center">
            <p className="text-[10px] uppercase font-black text-[#FF5FA2] tracking-widest flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> PRO
            </p>
            <p className="text-2xl font-black text-[#FF5FA2] mt-1">{professionalCount}</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-md bg-indigo-500/5 border border-indigo-500/10 rounded-2xl">
          <CardContent className="p-4 flex flex-col justify-center items-center text-center">
            <p className="text-[10px] uppercase font-black text-indigo-500 tracking-widest font-extrabold">EDU</p>
            <p className="text-2xl font-black text-indigo-500 mt-1">{educationCount}</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-md bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
          <CardContent className="p-4 flex flex-col justify-center items-center text-center">
            <p className="text-[10px] uppercase font-black text-emerald-600 tracking-widest">Premium Active</p>
            <p className="text-2xl font-black text-emerald-600 mt-1">{premiumCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Search + Plan Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Cari user berdasarkan nama, username, email, atau whatsapp..." 
            className="pl-9 h-12 bg-card/50 backdrop-blur-sm border-none shadow-sm rounded-xl focus-visible:ring-primary"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="h-12 px-4 rounded-xl bg-card/50 backdrop-blur-sm shadow-sm font-bold text-xs uppercase tracking-wider outline-none focus:ring-2 focus:ring-primary/20 border-r-8 border-transparent shrink-0"
          value={planFilter}
          onChange={(e) => setPlanFilter(e.target.value as any)}
        >
          <option value="all">Semua Plan</option>
          <option value="free">Free</option>
          <option value="professional">Professional</option>
          <option value="education">Education</option>
        </select>
      </div>

      {/* Grid List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredUsers.length === 0 ? (
          <div className="col-span-full py-12 flex flex-col items-center justify-center text-center space-y-3 bg-card/30 backdrop-blur-sm rounded-3xl border border-dashed border-border/20">
            <Users className="w-12 h-12 text-muted-foreground/40 animate-pulse" />
            <div>
              <p className="text-base font-bold text-foreground/80">User Tidak Ditemukan</p>
              <p className="text-xs text-muted-foreground">Coba cari dengan kata kunci yang berbeda.</p>
            </div>
          </div>
        ) : (
          filteredUsers.map((user) => {
            const initials = (user.display_name || user.username || 'US')
              .slice(0, 2)
              .toUpperCase();

            // Plan style details
            let planBadgeClass = 'bg-muted/40 text-muted-foreground border-transparent';
            let planText = 'FREE';
            
            if (user.plan === 'professional') {
              planBadgeClass = 'bg-gradient-to-r from-[#FF5FA2]/15 to-[#E8457E]/15 text-[#FF5FA2] border-[#FF5FA2]/20 font-black';
              planText = 'PRO';
            } else if (user.plan === 'education') {
              planBadgeClass = 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20';
              planText = 'EDU';
            }

            // Expiry details
            let expiryText = 'Selamanya';
            let isExpired = false;
            let daysLeft = null;

            if (user.plan !== 'free' && user.plan_expires_at) {
              const expDate = new Date(user.plan_expires_at);
              isExpired = expDate.getTime() < Date.now();
              
              const diffTime = expDate.getTime() - Date.now();
              daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              
              expiryText = expDate.toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
              });
            } else if (user.plan === 'free') {
              expiryText = '-';
            }

            return (
              <Card key={user.id} className="border-none shadow-xl bg-card/50 backdrop-blur-sm group hover:ring-2 hover:ring-primary/20 transition-all overflow-hidden rounded-2xl flex flex-col justify-between">
                <CardHeader className="pb-3 flex flex-row items-start justify-between space-y-0">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-12 h-12 rounded-xl ring-2 ring-primary/10 shadow-inner shrink-0">
                      {user.avatar_url && <AvatarImage src={user.avatar_url} alt={user.display_name || user.username} className="object-cover" />}
                      <AvatarFallback className="bg-primary/10 text-primary text-sm font-black uppercase">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <CardTitle className="text-base font-bold truncate pr-2" title={user.display_name || user.username}>
                        {user.display_name || user.username}
                      </CardTitle>
                      <CardDescription className="text-xs font-semibold text-muted-foreground truncate">
                        @{user.username}
                      </CardDescription>
                    </div>
                  </div>
                  <Button 
                    onClick={() => openPlanModal(user)} 
                    variant="outline" 
                    size="icon" 
                    className="rounded-full h-8 w-8 hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all shrink-0 shadow-sm"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4 flex-1 flex flex-col justify-between">
                  {/* Bio details or user tags */}
                  <div className="space-y-2 p-3 bg-muted/30 rounded-xl text-xs font-medium text-muted-foreground border border-border/10">
                    <div className="flex items-center gap-2 truncate">
                      <Mail className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
                      <span className="truncate text-foreground/80 font-mono select-all" title={user.email || 'Tidak ada email'}>
                        {user.email || 'Tidak ada email'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 truncate">
                      <Phone className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
                      <span className="truncate text-foreground/80 font-mono select-all">
                        {user.whatsapp || 'Tidak ada WA'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 truncate">
                      <Calendar className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
                      <span>Terdaftar: <span className="font-semibold text-foreground/80">{new Date(user.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span></span>
                    </div>
                  </div>

                  {/* Plan display area */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[9px] uppercase font-black text-muted-foreground tracking-wider">Plan Status</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="outline" className={cn("rounded-md px-2 py-0.5 text-[9px] uppercase tracking-wider font-extrabold border-2", planBadgeClass)}>
                          {planText}
                        </Badge>
                        {isExpired && user.plan !== 'free' && (
                          <Badge variant="destructive" className="rounded-md px-1.5 py-0.5 text-[8px] font-black uppercase tracking-tighter animate-pulse">
                            Expired
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-0.5">
                      <span className="text-[9px] uppercase font-black text-muted-foreground tracking-wider">Masa Berlaku</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Clock className="w-3 h-3 text-muted-foreground/60" />
                        <span className={cn(
                          "text-xs font-bold font-mono",
                          isExpired && user.plan !== 'free' ? "text-destructive" : "text-foreground/80"
                        )}>
                          {expiryText}
                        </span>
                      </div>
                      {daysLeft !== null && daysLeft > 0 && !isExpired && (
                        <span className="text-[9px] font-black text-emerald-500 uppercase tracking-tighter mt-0.5">
                          ({daysLeft} Hari Lagi)
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* PLAN CONFIGURATION MODAL */}
      {isModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
          <Card className="w-full max-w-md border-none shadow-2xl animate-in zoom-in-95 duration-200 rounded-[2rem] overflow-hidden bg-card p-0">
            {/* Modal Header */}
            <div className="bg-primary text-primary-foreground p-8 relative">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary-foreground/75 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-primary-foreground/90" /> Aktivasi Plan Manual
                  </span>
                  <CardTitle className="text-xl font-black tracking-tight uppercase leading-snug">
                    {selectedUser.display_name || selectedUser.username}
                  </CardTitle>
                  <CardDescription className="text-primary-foreground/70 font-medium">
                    Atur subscription plan dan durasi secara instan.
                  </CardDescription>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setIsModalOpen(false)} 
                  className="rounded-full hover:bg-white/10 text-white shrink-0"
                >
                  <X className="w-6 h-6" />
                </Button>
              </div>
            </div>

            <form onSubmit={handleSavePlan}>
              <CardContent className="p-8 space-y-6">
                
                {/* Plan Selection */}
                <div className="space-y-3">
                  <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Pilih Subscription Plan</Label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: 'free', label: 'FREE', desc: 'Akses Standar', activeClass: 'border-muted-foreground/60 bg-muted/10 text-muted-foreground' },
                      { id: 'professional', label: 'PRO', desc: 'Fitur Unggulan', activeClass: 'border-[#FF5FA2] bg-[#FF5FA2]/5 text-[#FF5FA2]' },
                      { id: 'education', label: 'EDU', desc: 'Siswa / Kampus', activeClass: 'border-indigo-500 bg-indigo-500/5 text-indigo-500' },
                    ].map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setPlan(p.id);
                          if (p.id === 'free') {
                            setExpiryType('lifetime');
                          } else if (expiryType === 'lifetime') {
                            // default back to 30 days if enabling plan
                            setExpiryType('30');
                          }
                        }}
                        className={cn(
                          "flex flex-col items-start justify-center p-3 rounded-2xl border-2 transition-all gap-0.5 text-left",
                          plan === p.id 
                            ? p.activeClass 
                            : "border-transparent bg-muted/40 text-muted-foreground hover:bg-muted/60"
                        )}
                      >
                        <span className="text-xs font-black uppercase tracking-tight">{p.label}</span>
                        <span className="text-[9px] font-medium opacity-80 leading-tight">{p.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Expiry Duration Options - disabled if free */}
                {plan !== 'free' && (
                  <div className="space-y-4 animate-in slide-in-from-bottom-2 duration-300">
                    <div className="space-y-3">
                      <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Durasi Paket</Label>
                      <div className="grid grid-cols-4 gap-2">
                        {[
                          { id: '30', label: '30 Hari' },
                          { id: '90', label: '90 Hari' },
                          { id: '365', label: '1 Tahun' },
                          { id: 'lifetime', label: 'Lifetime' },
                        ].map((d) => (
                          <button
                            key={d.id}
                            type="button"
                            onClick={() => setExpiryType(d.id as any)}
                            className={cn(
                              "py-2 px-1 rounded-xl border text-[10px] font-bold text-center transition-all",
                              expiryType === d.id 
                                ? "border-primary bg-primary/5 text-primary" 
                                : "border-transparent bg-muted/40 text-muted-foreground hover:bg-muted/60"
                            )}
                          >
                            {d.label}
                          </button>
                        ))}
                      </div>
                      
                      {/* Presets shortcut trigger */}
                      <button
                        type="button"
                        onClick={() => setExpiryType('custom')}
                        className={cn(
                          "w-full py-2.5 rounded-xl border text-[10px] font-bold text-center transition-all mt-2 block",
                          expiryType === 'custom' 
                            ? "border-primary bg-primary/5 text-primary" 
                            : "border-transparent bg-muted/40 text-muted-foreground hover:bg-muted/60"
                        )}
                      >
                        Pilih Tanggal Kustom (Custom Date)
                      </button>
                    </div>

                    {/* Custom Expiry Date picker */}
                    {expiryType === 'custom' && (
                      <div className="space-y-2 animate-in slide-in-from-bottom-1 duration-200">
                        <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Pilih Tanggal Kadaluarsa</Label>
                        <div className="relative">
                          <Input 
                            type="date"
                            value={customExpiryDate} 
                            onChange={e => setCustomExpiryDate(e.target.value)} 
                            className="h-12 rounded-xl bg-muted/30 border-none focus-visible:ring-primary font-mono text-sm"
                            required
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {plan === 'free' && (
                  <div className="p-4 bg-muted/30 border border-border/10 rounded-2xl flex gap-3 text-muted-foreground items-start animate-in fade-in duration-300">
                    <AlertCircle className="w-5 h-5 shrink-0 text-muted-foreground/60" />
                    <p className="text-xs font-medium leading-relaxed">
                      Pengguna dengan <strong>Free Plan</strong> tidak membutuhkan masa aktif plan (durasi) karena fitur premium dinonaktifkan secara otomatis.
                    </p>
                  </div>
                )}
                
              </CardContent>
              <div className="p-8 pt-0 flex gap-3">
                <Button 
                  type="submit" 
                  disabled={isLoading} 
                  className="flex-1 h-12 rounded-xl font-bold gap-2 text-lg shadow-xl shadow-primary/20"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  Simpan Plan User
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
