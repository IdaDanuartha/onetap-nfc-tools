'use client';

import * as React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function ThemeToggle({ className }: { className?: string }) {
  const { setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium hover:bg-accent hover:text-accent-foreground h-10 w-10 border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
        <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-foreground" />
        <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-foreground" />
        <span className="sr-only">Toggle theme</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-popover border-border">
        <DropdownMenuItem className="text-popover-foreground hover:bg-accent cursor-pointer" onClick={() => setTheme('light')}>Light</DropdownMenuItem>
        <DropdownMenuItem className="text-popover-foreground hover:bg-accent cursor-pointer" onClick={() => setTheme('dark')}>Dark</DropdownMenuItem>
        <DropdownMenuItem className="text-popover-foreground hover:bg-accent cursor-pointer" onClick={() => setTheme('system')}>System</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
