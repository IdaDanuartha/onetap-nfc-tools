'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Fingerprint, Mail, Lock } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast.error(error.message);
      setIsLoading(false);
    } else {
      toast.success('Signed in successfully');
      router.push('/');
      router.refresh();
    }
  }

  return (
    <Card className="w-full bg-card border border-border/60 shadow-xl shadow-black/5 dark:shadow-black/20 animate-in fade-in zoom-in duration-500 rounded-2xl overflow-hidden">
      <CardHeader className="space-y-4 pb-6 pt-8 bg-card relative z-10">
        <div className="mx-auto transition-transform hover:scale-105">
          <img src="/images/logo_simple.png" alt="OneTap NFC Logo" className="w-16 h-16 rounded-2xl shadow-sm" />
        </div>
        <div className="text-center space-y-1.5">
          <CardTitle className="text-2xl font-bold tracking-tight text-foreground">Admin Access</CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            Sign in to your OneTap NFC workspace
          </CardDescription>
        </div>
      </CardHeader>

      <form onSubmit={handleLogin} className="bg-card relative z-10">
        <CardContent className="space-y-5 px-8 pt-2">
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-foreground" htmlFor="email">Email address</Label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                value={email}
                autoComplete="email"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                required
                className="pl-10 h-11 bg-background border-input text-foreground transition-all focus:ring-2 focus:ring-primary/20 rounded-xl"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold text-foreground" htmlFor="password">Password</Label>
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                autoComplete="current-password"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                required
                className="pl-10 h-11 bg-background border-input text-foreground transition-all focus:ring-2 focus:ring-primary/20 rounded-xl"
              />
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col space-y-4 px-8 pb-8 pt-4 mt-5">
          <Button
            className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-medium shadow-sm transition-all"
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Sign in
          </Button>

          <p className="text-[11px] text-center text-muted-foreground/80 font-medium uppercase tracking-widest mt-4">
            Secured System Environment
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
