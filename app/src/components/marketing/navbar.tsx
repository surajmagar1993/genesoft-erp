"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { Menu, X, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function PublicNavbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
        setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav 
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b",
        isScrolled 
          ? "bg-white/80 dark:bg-slate-950/80 backdrop-blur-lg border-slate-200 dark:border-slate-800 py-3" 
          : "bg-transparent border-transparent py-5"
      )}
    >
      <div className="container mx-auto px-4 md:px-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="relative w-10 h-10 overflow-hidden rounded-xl bg-orange-500 flex items-center justify-center group-hover:scale-110 transition-transform">
             <Image 
               src="/favicon.png" 
               alt="Genesoft Logo" 
               width={40} 
               height={40}
               className="object-contain p-1.5"
             />
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Genesoft
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8">
          <Link href="#features" className="text-sm font-medium text-slate-600 hover:text-orange-500 transition-colors">Features</Link>
          <Link href="#solutions" className="text-sm font-medium text-slate-600 hover:text-orange-500 transition-colors">Solutions</Link>
          <Link href="/pricing" className="text-sm font-medium text-slate-600 hover:text-orange-500 transition-colors">Pricing</Link>
          <Link href="/contact" className="text-sm font-medium text-slate-600 hover:text-orange-500 transition-colors">Contact</Link>
        </div>

        <div className="hidden md:flex items-center gap-4">
          <Link 
            href="/login" 
            className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            Login
          </Link>
          <Link 
            href="/register" 
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-orange-600 text-white text-sm font-semibold hover:bg-orange-700 transition-all shadow-lg shadow-orange-600/20 active:scale-95"
          >
            Get Started
            <ArrowRight className="ml-2 w-4 h-4" />
          </Link>
        </div>

        {/* Mobile Toggle */}
        <button 
          className="md:hidden p-2 text-slate-600 hover:text-slate-900"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 p-4 flex flex-col gap-4 animate-in slide-in-from-top duration-200">
          <Link href="#features" className="text-lg font-medium p-2">Features</Link>
          <Link href="#solutions" className="text-lg font-medium p-2">Solutions</Link>
          <Link href="/pricing" className="text-lg font-medium p-2">Pricing</Link>
          <Link href="/login" className="text-lg font-medium p-2 border-t pt-4">Login</Link>
          <Link 
            href="/register" 
            className="inline-flex items-center justify-center w-full px-5 py-3 rounded-xl bg-orange-600 text-white font-semibold hover:bg-orange-700 transition-all"
          >
            Get Started Free
          </Link>
        </div>
      )}
    </nav>
  );
}
