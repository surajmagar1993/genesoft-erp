import { Mail, Phone, MapPin } from "lucide-react"
import { PLATFORM, telHref } from "@/lib/constants/platform"
import { ContactForm } from "./contact-form"

export const metadata = {
    title: "Contact us | Genesoft ERP",
    description: "Talk to the Genesoft Infotech team about Genesoft ERP: sales questions, support, billing or partnerships.",
}

export default function ContactPage() {
    return (
        <section className="bg-gradient-to-b from-blue-50/60 to-white">
            <div className="mx-auto grid max-w-6xl gap-12 px-4 py-16 md:grid-cols-5 md:px-6 md:py-20">
                <div className="space-y-8 md:col-span-2">
                    <div>
                        <h1 className="text-balance text-4xl font-bold tracking-tight text-slate-900">Talk to us</h1>
                        <p className="mt-3 text-lg text-slate-600">
                            Questions about plans, setting up your company, or moving from another system? Send us a message and we&apos;ll reply by email.
                        </p>
                    </div>
                    <ul className="space-y-5 text-sm">
                        <li className="flex gap-3">
                            <Mail className="mt-0.5 h-5 w-5 text-blue-600" />
                            <div>
                                <p className="font-medium text-slate-900">Email</p>
                                <a href={`mailto:${PLATFORM.email}`} className="text-slate-600 hover:text-slate-900">{PLATFORM.email}</a>
                            </div>
                        </li>
                        <li className="flex gap-3">
                            <Phone className="mt-0.5 h-5 w-5 text-blue-600" />
                            <div>
                                <p className="font-medium text-slate-900">Phone</p>
                                <a href={telHref(PLATFORM.phone)} className="text-slate-600 hover:text-slate-900">{PLATFORM.phone}</a>
                            </div>
                        </li>
                        <li className="flex gap-3">
                            <MapPin className="mt-0.5 h-5 w-5 text-blue-600" />
                            <div>
                                <p className="font-medium text-slate-900">Office</p>
                                <p className="text-slate-600">
                                    {PLATFORM.legalName}<br />
                                    {PLATFORM.address.line1}<br />
                                    {PLATFORM.address.line2}, {PLATFORM.address.country}
                                </p>
                            </div>
                        </li>
                    </ul>
                </div>
                <div className="md:col-span-3">
                    <ContactForm />
                </div>
            </div>
        </section>
    )
}
