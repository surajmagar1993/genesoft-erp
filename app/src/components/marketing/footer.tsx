import Link from "next/link";
import Image from "next/image";
import { Github, Twitter, Linkedin, Mail, Phone, MapPin } from "lucide-react";

export function PublicFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 pt-20 pb-10">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          <div className="col-span-1 md:col-span-1 border-b md:border-none pb-8 md:pb-0">
            <Link href="/" className="flex items-center gap-2 mb-6 group">
                <div className="relative w-8 h-8 rounded-lg bg-orange-600 flex items-center justify-center p-1.5 group-hover:scale-105 transition-transform">
                      <Image 
                        src="/favicon.png" 
                        alt="Genesoft Logo" 
                        width={32} 
                        height={32}
                        className="object-contain"
                      />
                </div>
              <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                Genesoft
              </span>
            </Link>
            <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-6">
              Empowering businesses with intelligent CRM, Sales, and ERP solutions. Modern, secure, and built for growth.
            </p>
            <div className="flex items-center gap-4">
              <Link href="#" className="text-slate-400 hover:text-orange-500 transition-colors bg-white dark:bg-slate-800 p-2 rounded-full shadow-sm hover:shadow-md transition-all">
                <Twitter className="w-4 h-4" />
              </Link>
              <Link href="#" className="text-slate-400 hover:text-orange-500 transition-colors bg-white dark:bg-slate-800 p-2 rounded-full shadow-sm hover:shadow-md transition-all">
                <Linkedin className="w-4 h-4" />
              </Link>
              <Link href="#" className="text-slate-400 hover:text-orange-500 transition-colors bg-white dark:bg-slate-800 p-2 rounded-full shadow-sm hover:shadow-md transition-all">
                <Github className="w-4 h-4" />
              </Link>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-6 uppercase tracking-wider">Product</h4>
            <ul className="space-y-4">
              <li><Link href="#features" className="text-slate-500 hover:text-orange-600 transition-colors text-sm">CRM & Sales</Link></li>
              <li><Link href="#solutions" className="text-slate-500 hover:text-orange-600 transition-colors text-sm">ERP Modules</Link></li>
              <li><Link href="/pricing" className="text-slate-500 hover:text-orange-600 transition-colors text-sm">Pricing Plans</Link></li>
              <li><Link href="#" className="text-slate-500 hover:text-orange-600 transition-colors text-sm">API Docs</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-6 uppercase tracking-wider">Solutions</h4>
            <ul className="space-y-4">
              <li><Link href="#" className="text-slate-500 hover:text-orange-600 transition-colors text-sm">Manufacturing</Link></li>
              <li><Link href="#" className="text-slate-500 hover:text-orange-600 transition-colors text-sm">Retail & POS</Link></li>
              <li><Link href="#" className="text-slate-500 hover:text-orange-600 transition-colors text-sm">Service Industry</Link></li>
              <li><Link href="#" className="text-slate-500 hover:text-orange-600 transition-colors text-sm">Enterprise ERP</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-6 uppercase tracking-wider">Contact Us</h4>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <Mail className="w-4 h-4 text-orange-600 mt-1" />
                <span className="text-slate-500 dark:text-slate-400 text-sm">hello@genesoft.in</span>
              </li>
              <li className="flex items-start gap-3">
                <Phone className="w-4 h-4 text-orange-600 mt-1" />
                <span className="text-slate-500 dark:text-slate-400 text-sm">+91 (800) GEN-SOFT</span>
              </li>
              <li className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-orange-600 mt-1" />
                <span className="text-slate-500 dark:text-slate-400 text-sm">Tech Hub, Pune, India</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-slate-400 dark:text-slate-500 text-sm">
            © {currentYear} Genesoft Infotech. All rights reserved.
          </p>
          <div className="flex items-center gap-6 text-sm text-slate-400 hover:text-slate-600 transition-colors">
            <Link href="/privacy">Privacy Policy</Link>
            <Link href="/terms">Terms of Service</Link>
            <Link href="/sitemap">Sitemap</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
