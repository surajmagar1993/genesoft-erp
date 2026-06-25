"use client";

import { useState } from "react";
import { Mail, Phone, MapPin, Send, MessageSquare, Building2, User } from "lucide-react";
import { PublicNavbar } from "@/components/marketing/navbar";
import { PublicFooter } from "@/components/marketing/footer";

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate API request
    setTimeout(() => {
      setSubmitted(true);
      setFormData({ name: "", email: "", company: "", message: "" });
    }, 800);
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-950">
      <PublicNavbar />

      <main className="flex-1 pt-32 pb-24">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center max-w-3xl mx-auto mb-16 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <h1 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white mb-6 leading-tight">
              Get in <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-orange-400">Touch</span>.
            </h1>
            <p className="text-lg text-slate-500 dark:text-slate-400">
              Have questions about Genesoft ERP & CRM? Reach out to our team of product experts for answers.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 max-w-6xl mx-auto items-start">
            {/* Info Column */}
            <div className="lg:col-span-2 space-y-8 animate-in fade-in slide-in-from-left duration-1000">
              <div className="p-8 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-xl space-y-6">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Contact Information</h3>
                
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-orange-600/10 flex items-center justify-center text-orange-600 flex-shrink-0">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Email Us</p>
                    <a href="mailto:hello@genesoftinfotech.com" className="text-base font-semibold text-slate-800 dark:text-slate-200 hover:text-orange-500 transition-colors">
                      hello@genesoftinfotech.com
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-600/10 flex items-center justify-center text-blue-600 flex-shrink-0">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Call Us</p>
                    <a href="tel:+918888885285" className="text-base font-semibold text-slate-800 dark:text-slate-200 hover:text-blue-500 transition-colors">
                      +91 8888885285
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 flex items-center justify-center text-indigo-600 flex-shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Office Location</p>
                    <p className="text-base font-semibold text-slate-800 dark:text-slate-200 leading-snug">
                      Shivtirtha Bungalow Lane 15,<br />
                      Khese Park Lohegaon Pune,<br />
                      Maharashtra, India 411032
                    </p>
                  </div>
                </div>
              </div>

              {/* Quick Help Box */}
              <div className="p-8 bg-gradient-to-r from-orange-600 to-orange-400 rounded-[2rem] text-white space-y-4 shadow-xl shadow-orange-600/20">
                <h4 className="text-xl font-bold">15-Day Free Trial</h4>
                <p className="text-orange-50/80 text-sm leading-relaxed">
                  Start using CRM, ERP, and CoA with no credit card required. Free deployment in minutes.
                </p>
              </div>
            </div>

            {/* Form Column */}
            <div className="lg:col-span-3 animate-in fade-in slide-in-from-right duration-1000">
              <div className="p-8 md:p-10 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-2xl relative overflow-hidden">
                {submitted ? (
                  <div className="text-center py-16 space-y-6">
                    <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl">
                      ✓
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Message Sent!</h3>
                    <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                      Thank you for reaching out. A product expert will contact you shortly.
                    </p>
                    <button 
                      onClick={() => setSubmitted(false)}
                      className="inline-flex items-center justify-center px-6 py-2.5 rounded-full border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all font-medium text-sm"
                    >
                      Send another message
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Send Us a Message</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
                          <User className="w-3.5 h-3.5" /> Full Name
                        </label>
                        <input 
                          type="text" 
                          required
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="Enter contact full name"
                          className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
                          <Mail className="w-3.5 h-3.5" /> Work Email
                        </label>
                        <input 
                          type="email" 
                          required
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder="Enter work email address"
                          className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
                        <Building2 className="w-3.5 h-3.5" /> Company Name
                      </label>
                      <input 
                        type="text" 
                        value={formData.company}
                        onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                        placeholder="Enter registered company name"
                        className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
                        <MessageSquare className="w-3.5 h-3.5" /> Your Message
                      </label>
                      <textarea 
                        required
                        rows={4}
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        placeholder="Enter message or inquiries"
                        className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all resize-none"
                      />
                    </div>

                    <button 
                      type="submit"
                      className="w-full inline-flex items-center justify-center py-4 rounded-2xl bg-orange-600 text-white font-bold hover:bg-orange-700 transition-all shadow-lg shadow-orange-600/20 active:scale-95 group"
                    >
                      Send Message
                      <Send className="ml-2 w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-0.5 transition-transform" />
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>

          {/* Map Mockup and Departmental Directories */}
            <div className="mt-20 grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
              {/* Styled Mockup Map */}
              <div className="p-8 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-xl space-y-6">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Our Headquarters Location</h3>
                <div className="relative h-64 bg-slate-100 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col items-center justify-center p-4 text-center">
                  <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#000_1px,transparent_1px),linear-gradient(to_bottom,#000_1px,transparent_1px)] bg-[size:24px_24px] dark:bg-[linear-gradient(to_right,#fff_1px,transparent_1px),linear-gradient(to_bottom,#fff_1px,transparent_1px)]" />
                  <div className="w-10 h-10 rounded-full bg-orange-600/20 flex items-center justify-center text-orange-600 relative z-10 animate-bounce mb-3">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-bold text-slate-850 dark:text-slate-100 relative z-10">Shivtirtha Bungalow Lane 15</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto mt-1 relative z-10">Khese Park, Lohegaon, Pune, Maharashtra, India 411032</p>
                  <div className="mt-4 text-xs font-semibold px-4 py-2 rounded-full bg-orange-600 text-white relative z-10 shadow-sm hover:scale-105 active:scale-95 transition-all cursor-pointer">
                    Get GPS Directions
                  </div>
                </div>
              </div>

              {/* Departmental Directory */}
              <div className="p-8 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-xl space-y-6">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Departmental Contacts</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800">
                    <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Sales & Growth</h4>
                    <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 break-all">info@genesoftinfotech.com</p>
                    <p className="text-xs text-slate-500 mt-1">For custom plans & quotes</p>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800">
                    <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Technical Support</h4>
                    <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 break-all">hello@genesoftinfotech.com</p>
                    <p className="text-xs text-slate-500 mt-1">For client setup assistance</p>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800">
                    <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">PR & Inquiries</h4>
                    <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 break-all">hello@genesoftinfotech.com</p>
                    <p className="text-xs text-slate-500 mt-1">For corporate communications</p>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800">
                    <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Global Partnerships</h4>
                    <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 break-all">info@genesoftinfotech.com</p>
                    <p className="text-xs text-slate-500 mt-1">For partner integration programs</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Frequently Asked Questions Accordion */}
            <div className="mt-20 max-w-4xl mx-auto space-y-8">
              <div className="text-center">
                <h2 className="text-2xl md:text-4xl font-bold text-slate-900 dark:text-white mb-2">Frequently Asked Questions</h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm">Quick answers to common inquiries about Genesoft ERP & CRM</p>
              </div>
              
              <div className="space-y-4">
                {[
                  {
                    q: "How long does it take to deploy Genesoft ERP?",
                    a: "Standard deployment is instantaneous upon signup. Your multi-tenant sandbox will be initialized automatically, including dynamic configurations and Chart of Accounts seeds within 5 minutes."
                  },
                  {
                    q: "Is there a credit card requirement for the free trial?",
                    a: "No. You can register for the 15-day trial plan without entering any billing details. You can test all core CRM, Invoicing, and accounting functions immediately."
                  },
                  {
                    q: "Do you support custom tax slabs for other regions?",
                    a: "Yes. Our centralized tax calculation engine is designed for multiple countries. You can configure custom tax categories, VAT parameters, HSN codes, and Sales tax calculations in the ERP settings."
                  },
                  {
                    q: "How is my company data isolated and secured?",
                    a: "Genesoft leverages strict database-level Row-Level Security (RLS) rules. Every query, write, and relation check automatically enforces tenant-id segregation, preventing any cross-tenant data leaks."
                  }
                ].map((faq, index) => (
                  <div key={index} className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
                    <h4 className="text-base font-bold text-slate-900 dark:text-white mb-2">{faq.q}</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{faq.a}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>

        <PublicFooter />
      </div>
  );
}
