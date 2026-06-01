'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, User, Mail, Lock, Sparkles, CheckCircle2, ShieldAlert } from 'lucide-react';
import type { AdminUser } from '@/lib/types';

interface SettingsFormProps {
  user: AdminUser;
}

export function SettingsForm({ user }: SettingsFormProps) {
  const supabase = createClient();
  
  // Profile state
  const [displayName, setDisplayName] = useState(user.display_name || '');
  const [email, setEmail] = useState(user.email || '');
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  
  // Password state
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      toast.error('Nama Lengkap tidak boleh kosong!');
      return;
    }
    setIsProfileLoading(true);

    try {
      // 1. Update Auth metadata
      const { error: authError } = await supabase.auth.updateUser({
        data: { full_name: displayName.trim() }
      });
      if (authError) throw authError;

      // 2. Update users_profile display_name
      const { error: profileError } = await supabase
        .from('users_profile')
        .update({ display_name: displayName.trim() })
        .eq('id', user.id);
      if (profileError) throw profileError;

      // 3. Update email if changed
      if (email.trim().toLowerCase() !== user.email.toLowerCase()) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: email.trim()
        });
        if (emailError) throw emailError;
        toast.success('Profil diperbarui! Konfirmasi perubahan telah dikirim ke email baru Anda.');
      } else {
        toast.success('Profil berhasil diperbarui!');
      }
      
      // Force page refresh to update display name in sidebar/navbar
      window.location.reload();
    } catch (err: any) {
      console.error('[UpdateProfile] Error:', err);
      toast.error(err.message || 'Gagal memperbarui profil.');
    } finally {
      setIsProfileLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      toast.error('Password baru tidak boleh kosong!');
      return;
    }
    if (password.length < 6) {
      toast.error('Password minimal terdiri dari 6 karakter!');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Konfirmasi password tidak cocok!');
      return;
    }
    setIsPasswordLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });
      if (error) throw error;
      toast.success('Kata sandi berhasil diperbarui!');
      setPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      console.error('[UpdatePassword] Error:', err);
      toast.error(err.message || 'Gagal memperbarui kata sandi.');
    } finally {
      setIsPasswordLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black flex items-center gap-2 tracking-tight">
          <Sparkles className="w-7 h-7 text-primary" />
          PENGATURAN ADMIN
        </h1>
        <p className="text-sm text-muted-foreground font-medium">
          Kelola informasi profil, email, dan kata sandi keamanan akun admin Anda.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Card */}
        <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm rounded-3xl overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-black tracking-tight uppercase flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Detail Profil
            </CardTitle>
            <CardDescription className="text-xs font-semibold text-muted-foreground">
              Ubah nama tampilan dan alamat email Anda.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="display-name" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Nama Lengkap
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                  <Input
                    id="display-name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="pl-9 h-12 bg-muted/30 border-none shadow-sm rounded-xl focus-visible:ring-primary font-medium"
                    placeholder="Nama Lengkap Admin"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Alamat Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9 h-12 bg-muted/30 border-none shadow-sm rounded-xl focus-visible:ring-primary font-mono font-medium"
                    placeholder="name@example.com"
                  />
                </div>
                {email.trim().toLowerCase() !== user.email.toLowerCase() && (
                  <div className="flex gap-2 p-3 bg-primary/5 border border-primary/20 rounded-xl mt-2 text-xs font-medium text-primary">
                    <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>Perubahan email membutuhkan konfirmasi verifikasi dari alamat email lama dan baru.</span>
                  </div>
                )}
              </div>

              <Button
                type="submit"
                disabled={isProfileLoading}
                className="w-full h-12 rounded-xl font-bold gap-2 text-sm shadow-lg shadow-primary/20 mt-2"
              >
                {isProfileLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                Simpan Perubahan Profil
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Security Card */}
        <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm rounded-3xl overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-black tracking-tight uppercase flex items-center gap-2">
              <Lock className="w-5 h-5 text-primary" />
              Keamanan Akun
            </CardTitle>
            <CardDescription className="text-xs font-semibold text-muted-foreground">
              Ubah sandi login admin untuk meningkatkan proteksi akun.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Kata Sandi Baru
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                  <Input
                    id="new-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 h-12 bg-muted/30 border-none shadow-sm rounded-xl focus-visible:ring-primary font-medium"
                    placeholder="Sandi baru minimal 6 karakter"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Konfirmasi Kata Sandi Baru
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-9 h-12 bg-muted/30 border-none shadow-sm rounded-xl focus-visible:ring-primary font-medium"
                    placeholder="Ketik ulang sandi baru"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={isPasswordLoading}
                className="w-full h-12 rounded-xl font-bold gap-2 text-sm shadow-lg shadow-primary/20 mt-2"
              >
                {isPasswordLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                Perbarui Kata Sandi
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
