'use client';

import { useState } from 'react';
import { 
  Layers, Plus, Search, Tag as TagIcon, Calendar, 
  Trash2, Edit, Loader2, X, Save, Link as LinkIcon, 
  Type, MessageSquare, AlertTriangle, CheckCircle2,
  GraduationCap, User, GraduationCap as ClassIcon, Phone,
  ClipboardList
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Template {
  id: string;
  label: string;
  payload_data: any;
  status: string;
  serial_number?: string;
  created_at: string;
}

type ContentType = 'url' | 'text' | 'phone' | 'attendance';

export function TagsManager({ initialTemplates }: { initialTemplates: Template[] }) {
  const [templates, setTemplates] = useState<Template[]>(initialTemplates);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // CRUD State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  // Form State
  const [label, setLabel] = useState('');
  const [contentType, setContentType] = useState<ContentType>('url');
  
  // Form Values - Common
  const [commonValue, setCommonValue] = useState('');
  
  // Form Values - Attendance
  const [attName, setAttName] = useState('');
  const [attSchool, setAttSchool] = useState('');
  const [attClass, setAttClass] = useState('');

  const filteredTemplates = templates.filter(t => 
    t.label.toLowerCase().includes(search.toLowerCase()) ||
    (typeof t.payload_data === 'string' && t.payload_data.toLowerCase().includes(search.toLowerCase()))
  );

  const openCreateModal = () => {
    setEditingId(null);
    setLabel('');
    setContentType('url');
    setCommonValue('');
    setAttName('');
    setAttSchool('');
    setAttClass('');
    setIsModalOpen(true);
  };

  const openEditModal = (template: Template) => {
    setEditingId(template.id);
    setLabel(template.label);
    
    let data = template.payload_data;
    
    // Try to parse if it's a string JSON
    if (typeof data === 'string' && data.trim().startsWith('{')) {
      try {
        data = JSON.parse(data);
      } catch (e) {}
    }
    
    // Detect type and populate fields
    if (typeof data === 'object' && data !== null) {
      if (data.type === 'attendance' || data.student_name || data.school_name) {
        setContentType('attendance');
        setAttName(data.name || data.student_name || '');
        setAttSchool(data.school || data.school_name || '');
        setAttClass(data.class || data.class_name || '');
        setCommonValue('');
      } else if (data.assigned_to || data.label) {
        // Special case for old registration tags seen in screenshot
        setContentType('text');
        setCommonValue(data.assigned_to ? `User: ${data.assigned_to}` : data.label || JSON.stringify(data));
      } else {
        setContentType('text');
        setCommonValue(JSON.stringify(data));
      }
    } else if (typeof data === 'string' && (data.startsWith('tel:') || data.startsWith('https://wa.me/'))) {
      setContentType('phone');
      setCommonValue(data.replace('tel:', '').replace('https://wa.me/', ''));
    } else if (typeof data === 'string' && (data.startsWith('http') || data.includes('.'))) {
      setContentType('url');
      setCommonValue(data);
    } else {
      setContentType('text');
      setCommonValue(data || '');
    }
    
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label) return toast.error('Lengkapi label template!');

    let finalPayload: any = commonValue;
    
    if (contentType === 'attendance') {
      if (!attName || !attSchool) return toast.error('Nama dan Instansi wajib diisi!');
      finalPayload = {
        type: 'attendance',
        name: attName,
        school: attSchool,
        class: attClass,
        version: '2.0'
      };
    } else if (contentType === 'phone') {
      const clean = commonValue.replace(/\D/g, '');
      finalPayload = `https://wa.me/${clean}`;
    }

    setIsLoading(true);
    try {
      const method = editingId ? 'PATCH' : 'POST';
      const res = await fetch('/api/tags', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingId,
          label,
          payload_data: finalPayload
        })
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      if (editingId) {
        setTemplates(prev => prev.map(t => t.id === editingId ? data : t));
        toast.success('Template diperbarui');
      } else {
        setTemplates(prev => [data, ...prev]);
        toast.success('Template dibuat');
      }

      setIsModalOpen(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const confirmDelete = (id: string) => {
    setDeletingId(id);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingId) return;

    setIsLoading(true);
    try {
      const res = await fetch(`/api/tags?id=${deletingId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setTemplates(prev => prev.filter(t => t.id !== deletingId));
      toast.success('Template dihapus');
      setIsDeleteModalOpen(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2 tracking-tight">
            <Layers className="w-7 h-7 text-primary" />
            NFC TEMPLATES
          </h1>
          <p className="text-sm text-muted-foreground font-medium">Kelola template data untuk penulisan NFC cepat.</p>
        </div>
        <Button onClick={openCreateModal} className="rounded-xl font-bold gap-2 h-11 px-6 shadow-lg shadow-primary/20">
          <Plus className="w-5 h-5" /> Buat Template Baru
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input 
          placeholder="Cari template berdasarkan label atau data..." 
          className="pl-9 h-12 bg-card/50 backdrop-blur-sm border-none shadow-sm rounded-xl"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredTemplates.map((template) => (
          <Card key={template.id} className="border-none shadow-xl bg-card/50 backdrop-blur-sm group hover:ring-2 hover:ring-primary/20 transition-all overflow-hidden rounded-2xl">
            <CardHeader className="pb-3 flex flex-row items-start justify-between space-y-0">
              <div className="space-y-1">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                    <TagIcon className="w-4 h-4" />
                  </div>
                  {template.label}
                </CardTitle>
                <CardDescription className="text-[10px] uppercase font-bold tracking-widest flex items-center gap-1.5 ml-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(template.created_at).toLocaleDateString('id-ID')}
                </CardDescription>
              </div>
              <div className="flex gap-1">
                 <Button onClick={() => openEditModal(template)} variant="ghost" size="icon" className="rounded-full h-8 w-8 hover:bg-primary/10 text-muted-foreground hover:text-primary">
                    <Edit className="w-3.5 h-3.5" />
                 </Button>
                 <Button onClick={() => confirmDelete(template.id)} variant="ghost" size="icon" className="rounded-full h-8 w-8 hover:bg-red-50 text-muted-foreground hover:text-red-500">
                    <Trash2 className="w-3.5 h-3.5" />
                 </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-muted/40 rounded-2xl space-y-2 border border-border/10">
                <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2 mb-2">
                   <div className="w-1 h-3 bg-primary rounded-full" /> 
                   {typeof template.payload_data === 'object' || (typeof template.payload_data === 'string' && template.payload_data.trim().startsWith('{')) ? 'Structured Data' : 'Payload Data'}
                </div>
                <p className="text-xs font-mono break-all line-clamp-2 text-foreground/80 leading-relaxed">
                  {typeof template.payload_data === 'object' 
                    ? template.payload_data.type === 'attendance' || template.payload_data.student_name
                      ? `${template.payload_data.name || template.payload_data.student_name} (${template.payload_data.school || template.payload_data.school_name})`
                      : JSON.stringify(template.payload_data) 
                    : template.payload_data}
                </p>
              </div>
              
              <div className="flex items-center justify-between px-1">
                <Badge variant={template.status === 'active' ? 'default' : 'secondary'} className="rounded-md px-2 py-0.5 text-[9px] font-black uppercase tracking-tighter">
                  {template.serial_number?.startsWith('TEMPLATE') ? 'preset' : 'tag'}
                </Badge>
                <CheckCircle2 className="w-4 h-4 text-primary opacity-20" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* CREATE/EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
          <Card className="w-full max-w-md border-none shadow-2xl animate-in zoom-in-95 duration-200 rounded-[2rem] overflow-hidden bg-card p-0">
            {/* Custom Header pinned to top */}
            <div className="bg-primary text-primary-foreground p-8 relative">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl font-black tracking-tight uppercase">
                    {editingId ? 'Edit Template' : 'Template Baru'}
                  </CardTitle>
                  <CardDescription className="text-primary-foreground/70 font-medium">
                    Pilih tipe dan isi data untuk template NFC.
                  </CardDescription>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setIsModalOpen(false)} className="rounded-full hover:bg-white/10 text-white">
                  <X className="w-6 h-6" />
                </Button>
              </div>
            </div>
            <form onSubmit={handleSave}>
              <CardContent className="p-8 space-y-6">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Label Template</Label>
                  <Input 
                    value={label} 
                    onChange={e => setLabel(e.target.value)} 
                    placeholder="Misal: Tag Siswa Budi" 
                    className="h-12 rounded-xl bg-muted/30 border-none focus-visible:ring-primary"
                  />
                </div>

                <div className="space-y-3">
                  <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Tipe Konten</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { id: 'url', label: 'URL', icon: LinkIcon },
                      { id: 'attendance', label: 'ABSEN', icon: ClipboardList },
                      { id: 'phone', label: 'WA', icon: Phone },
                      { id: 'text', label: 'TEKS', icon: Type },
                    ].map((type) => (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => {
                          setContentType(type.id as ContentType);
                          setCommonValue('');
                        }}
                        className={cn(
                          "flex flex-col items-center justify-center p-2.5 rounded-2xl border-2 transition-all gap-1.5",
                          contentType === type.id 
                            ? "border-primary bg-primary/5 text-primary" 
                            : "border-transparent bg-muted/40 text-muted-foreground hover:bg-muted/60"
                        )}
                      >
                        <type.icon className="w-5 h-5" />
                        <span className="text-[9px] font-black uppercase tracking-tighter">{type.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {contentType === 'attendance' ? (
                  <div className="space-y-4 animate-in slide-in-from-bottom-2 duration-300">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Nama Peserta</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input 
                          value={attName} 
                          onChange={e => setAttName(e.target.value)} 
                          placeholder="Nama lengkap..." 
                          className="pl-10 h-11 rounded-xl bg-muted/30 border-none"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Instansi/Sekolah</Label>
                        <div className="relative">
                          <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input 
                            value={attSchool} 
                            onChange={e => setAttSchool(e.target.value)} 
                            placeholder="Nama sekolah..." 
                            className="pl-10 h-11 rounded-xl bg-muted/30 border-none"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Grup/Kelas</Label>
                        <div className="relative">
                          <ClassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input 
                            value={attClass} 
                            onChange={e => setAttClass(e.target.value)} 
                            placeholder="Kelas/Grup..." 
                            className="pl-10 h-11 rounded-xl bg-muted/30 border-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 animate-in slide-in-from-bottom-2 duration-300">
                    <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                      {contentType === 'url' ? 'URL Link' : contentType === 'phone' ? 'Nomor WhatsApp' : 'Isi Teks'}
                    </Label>
                    <Input 
                      value={commonValue} 
                      onChange={e => setCommonValue(e.target.value)} 
                      placeholder={
                        contentType === 'url' ? 'https://example.com' : 
                        contentType === 'phone' ? '628123456xxx' : 
                        'Ketik teks di sini...'
                      } 
                      className="h-12 rounded-xl bg-muted/30 border-none focus-visible:ring-primary"
                    />
                  </div>
                )}
              </CardContent>
              <div className="p-8 pt-0 flex gap-3">
                <Button type="submit" disabled={isLoading} className="flex-1 h-12 rounded-xl font-bold gap-2 text-lg shadow-xl shadow-primary/20">
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  Simpan Template
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <Card className="w-full max-w-sm border-none shadow-2xl animate-in zoom-in-95 duration-200 rounded-[2rem] overflow-hidden">
            <div className="p-8 text-center space-y-6">
              <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto text-red-500 shadow-inner">
                <AlertTriangle className="w-10 h-10" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black tracking-tight uppercase">Hapus Template?</h3>
                <p className="text-sm text-muted-foreground font-medium px-4">
                  Tindakan ini tidak bisa dibatalkan. Template akan dihapus selamanya.
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <Button 
                  onClick={handleDelete} 
                  disabled={isLoading}
                  className="w-full h-12 rounded-2xl bg-red-500 hover:bg-red-600 font-bold text-lg gap-2"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                  Ya, Hapus Data
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={() => setIsDeleteModalOpen(false)} 
                  className="w-full h-12 rounded-2xl font-bold text-muted-foreground hover:text-foreground"
                >
                  Batalkan
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
