"use client";

import Link from 'next/link';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Menu, BarChart2, LogOut } from 'lucide-react';
import NavMenu from '@/components/layout/nav-menu';
import { useAuth } from '@/contexts/auth-context';
import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export default function Header() {
  const { logout } = useAuth();
  const [isSheetOpen, setSheetOpen] = useState(false);
  const [isLogoutAlertOpen, setLogoutAlertOpen] = useState(false);

  const handleLogout = () => {
    logout();
  };

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur-sm">
        <div className="container flex h-16 items-center px-4 md:px-6">
          <Link href="/dashboard" className="mr-6 flex items-center space-x-2">
            <BarChart2 className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg hidden sm:inline-block bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
              Interest Insight
            </span>
          </Link>
          <div className="hidden md:flex flex-1 items-center justify-start">
            <nav className="flex items-center gap-6 text-sm">
              <NavMenu onLinkClick={() => setSheetOpen(false)} />
            </nav>
          </div>
          <div className="flex flex-1 items-center justify-end space-x-2">
            <Button variant="ghost" size="icon" onClick={() => setLogoutAlertOpen(true)}>
              <LogOut className="h-5 w-5 text-muted-foreground hover:text-destructive" />
              <span className="sr-only">Logout</span>
            </Button>
            <div className="md:hidden">
              <Sheet open={isSheetOpen} onOpenChange={setSheetOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Menu className="h-6 w-6" />
                    <span className="sr-only">Toggle Menu</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[250px] sm:w-[300px]">
                  <Link href="/dashboard" className="mb-6 flex items-center space-x-2" onClick={() => setSheetOpen(false)}>
                      <BarChart2 className="h-6 w-6 text-primary" />
                      <span className="font-bold text-lg">Interest Insight</span>
                  </Link>
                  <nav className="flex flex-col gap-4">
                    <NavMenu onLinkClick={() => setSheetOpen(false)} />
                  </nav>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>
      <AlertDialog open={isLogoutAlertOpen} onOpenChange={setLogoutAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to log out?</AlertDialogTitle>
            <AlertDialogDescription>
              You will be returned to the login page.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Logout</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
