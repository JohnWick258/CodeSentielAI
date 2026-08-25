'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ShieldCheck, ArrowRight, Loader2, AlertCircle, Mail, Lock } from 'lucide-react';
import { useAuth } from '@/lib/supabase/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function AuthPage() {
  const router = useRouter();
  const params = useSearchParams();
  const { user, loading, signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (params.get('mode') === 'signin') setMode('signin');
  }, [params]);

  useEffect(() => {
    if (!loading && user) {
      router.push('/app');
    }
  }, [user, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      setSubmitting(false);
      return;
    }

    const { error } = mode === 'signin'
      ? await signIn(email, password)
      : await signUp(email, password);

    if (error) {
      setError(error);
      setSubmitting(false);
    } else if (mode === 'signup') {
      // After signup, try to sign in immediately
      const { error: signInError } = await signIn(email, password);
      if (signInError) {
        setError('Account created. Please sign in.');
        setMode('signin');
        setSubmitting(false);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">
      <div className="absolute inset-0 grid-bg opacity-20" />
      <div className="absolute left-1/2 top-0 -z-10 h-[400px] w-[600px] -translate-x-1/2 rounded-full bg-primary/10 blur-[120px]" />

      <div className="relative w-full max-w-md">
        <Link href="/" className="mb-6 flex items-center justify-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <span className="font-mono text-lg font-semibold tracking-tight">CodeSentinel</span>
          <span className="text-sm text-muted-foreground">AI</span>
        </Link>

        <Card className="border-border bg-card/80 backdrop-blur">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl">
              {mode === 'signin' ? 'Welcome back' : 'Create your account'}
            </CardTitle>
            <CardDescription>
              {mode === 'signin'
                ? 'Sign in to access your security dashboard'
                : 'Start finding vulnerabilities with AI-powered analysis'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="pl-9"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="pl-9"
                    required
                    autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-md border border-severity-critical/30 bg-severity-critical/10 px-3 py-2 text-sm text-severity-critical">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {mode === 'signin' ? 'Signing in...' : 'Creating account...'}</>
                ) : (
                  <>{mode === 'signin' ? 'Sign in' : 'Create account'} <ArrowRight className="ml-2 h-4 w-4" /></>
                )}
              </Button>
            </form>

            <div className="mt-4 text-center text-sm text-muted-foreground">
              {mode === 'signin' ? (
                <>Don&apos;t have an account? <button onClick={() => { setMode('signup'); setError(null); }} className="font-medium text-primary hover:underline">Sign up</button></>
              ) : (
                <>Already have an account? <button onClick={() => { setMode('signin'); setError(null); }} className="font-medium text-primary hover:underline">Sign in</button></>
              )}
            </div>
          </CardContent>
        </Card>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          By continuing, you agree to use CodeSentinel AI for authorized security testing only.
        </p>
      </div>
    </div>
  );
}
