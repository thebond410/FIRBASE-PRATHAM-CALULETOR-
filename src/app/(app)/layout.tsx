"use client";

import { useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/header';
import { Skeleton } from '@/components/ui/skeleton';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || !isAuthenticated) {
    return (
        <div className="flex flex-col h-screen bg-background">
            <header className="sticky top-0 z-50 w-full border-b bg-card/80 backdrop-blur-sm">
                <div className="container flex h-16 items-center px-4 md:px-6">
                    <Skeleton className="h-8 w-36" />
                    <div className="flex-1" />
                    <Skeleton className="h-8 w-24" />
                </div>
            </header>
            <main className="flex-1 p-4 sm:p-6 lg:p-8">
                <Skeleton className="h-64 w-full" />
            </main>
        </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </div>
  );
}
