'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ShieldCheck, LayoutDashboard, FolderGit2, FlaskConical, BookText, Play, Settings, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/supabase/auth-context';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const nav = [
  { href: '/app', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/app/projects', label: 'Projects', icon: FolderGit2 },
  { href: '/app/evaluation', label: 'AI Evaluation', icon: FlaskConical },
  { href: '/app/audit', label: 'Audit Log', icon: BookText },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();

  const handleDemo = () => {
    try { sessionStorage.setItem('codesentinel.tour', 'true'); } catch {}
    window.location.href = '/app';
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/15 text-primary">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <span className="font-mono text-sm font-semibold tracking-tight">CodeSentinel</span>
          <span className="hidden text-xs text-muted-foreground sm:inline">AI</span>
        </Link>
        <nav className="flex items-center gap-1">
          {nav.map((n) => {
            const active = pathname === n.href || (n.href !== '/app' && pathname.startsWith(n.href));
            return (
              <Link
                key={n.href}
                href={n.href}
                className={cn(
                  'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors',
                  active ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                )}
              >
                <n.icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{n.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <button
            onClick={handleDemo}
            className="flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
          >
            <Play className="h-3 w-3" />
            <span className="hidden sm:inline">Watch demo</span>
          </button>
          <div className="hidden items-center gap-2 rounded-md border border-border px-2.5 py-1 sm:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse-ring" />
            <span className="text-xs text-muted-foreground">Demo Workspace</span>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-secondary text-xs font-medium text-foreground transition-colors hover:bg-secondary/70">
                {user?.email?.[0]?.toUpperCase() ?? '?'}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-1.5">
                <div className="text-sm font-medium">{user?.email ?? 'User'}</div>
                <div className="text-xs text-muted-foreground">Demo plan</div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/app/settings"><Settings className="mr-2 h-4 w-4" /> Settings</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-severity-critical">
                <LogOut className="mr-2 h-4 w-4" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
