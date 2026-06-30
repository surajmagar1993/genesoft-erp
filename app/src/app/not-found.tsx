import React from "react"
import Link from "next/link"
import { ShieldAlert, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export const metadata = {
    title: "Page Not Found | Genesoft ERP",
    description: "The requested page could not be found.",
}

export default function NotFound() {
    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-[#090d16] text-slate-100 font-sans">
            {/* Ambient Background Glows */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-[120px] pointer-events-none" />

            <div className="w-full max-w-md relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <Card className="border-primary/10 shadow-2xl bg-card/30 backdrop-blur-xl overflow-hidden relative text-center py-6 px-4">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
                    
                    <CardHeader className="space-y-4">
                        <div className="mx-auto h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                            <ShieldAlert className="h-8 w-8" />
                        </div>
                        <div className="space-y-1">
                            <Badge404 />
                            <CardTitle className="text-3xl font-black tracking-tight text-white mt-2">
                                404 — Lost in Space
                            </CardTitle>
                        </div>
                        <CardDescription className="text-sm text-slate-400 leading-relaxed max-w-sm mx-auto">
                            The page you are looking for doesn't exist, has been moved, or you might not have authorization to view it.
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="pt-2">
                        <Button className="gap-2 font-bold shadow-lg shadow-primary/20 hover:shadow-primary/35 transition-all w-full py-6 text-sm" asChild>
                            <Link href="/reports">
                                <ArrowLeft className="h-4 w-4" />
                                Return to Safety
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

function Badge404() {
    return (
        <span className="inline-flex items-center rounded-full bg-rose-500/10 px-2.5 py-0.5 text-xs font-bold text-rose-500 border border-rose-500/20 uppercase tracking-widest mx-auto">
            Route Invalid
        </span>
    )
}
