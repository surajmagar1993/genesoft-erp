import React from "react"
import { LucideIcon, ArrowLeft, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

interface FeatureItem {
    title: string
    description: string
}

interface ModulePlaceholderProps {
    title: string
    description: string
    icon: LucideIcon
    phase: string
    progress: number
    features: FeatureItem[]
}

export function ModulePlaceholder({
    title,
    description,
    icon: Icon,
    phase,
    progress,
    features
}: ModulePlaceholderProps) {
    return (
        <div className="min-h-[80vh] flex items-center justify-center p-4">
            <div className="w-full max-w-4xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Back Link */}
                <Link 
                    href="/reports" 
                    className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-primary transition-colors group"
                >
                    <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                    Back to Dashboard
                </Link>

                <div className="grid md:grid-cols-5 gap-8 items-start">
                    {/* Info Card */}
                    <Card className="md:col-span-3 border-primary/10 shadow-xl bg-card/45 backdrop-blur-md overflow-hidden relative group">
                        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary/50 via-primary to-primary/30" />
                        
                        <CardHeader className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-300">
                                    <Icon className="h-6 w-6" />
                                </div>
                                <div>
                                    <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-widest border-primary/20 bg-primary/5 text-primary mb-1">
                                        Roadmap Phase {phase}
                                    </Badge>
                                    <CardTitle className="text-2xl font-bold tracking-tight">{title} Module</CardTitle>
                                </div>
                            </div>
                            <CardDescription className="text-base text-muted-foreground leading-relaxed pt-2">
                                {description}
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="space-y-6 pt-2">
                            {/* Development Progress */}
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm font-bold tracking-tight">
                                    <span className="text-muted-foreground">Development Progress</span>
                                    <span className="text-primary">{progress}%</span>
                                </div>
                                <div className="h-2 w-full bg-primary/10 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full transition-all duration-1000"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex flex-col sm:flex-row gap-3 pt-4">
                                <Button className="gap-2 font-semibold shadow-lg hover:shadow-primary/20 transition-all">
                                    <Send className="h-4 w-4" />
                                    Request Early Access
                                </Button>
                                <Button variant="outline" className="border-primary/10 hover:bg-primary/5 hover:text-primary transition-colors font-semibold" asChild>
                                    <Link href="/settings">
                                        Configure Module Settings
                                    </Link>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Features List */}
                    <div className="md:col-span-2 space-y-4">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground pl-1">
                            Planned Features
                        </h3>
                        <div className="space-y-3">
                            {features.map((feature, idx) => (
                                <div 
                                    key={idx} 
                                    className="p-4 rounded-xl border border-primary/5 bg-card/30 backdrop-blur-sm hover:border-primary/20 hover:bg-card/50 transition-all duration-300"
                                >
                                    <h4 className="font-semibold text-sm text-foreground mb-1">
                                        {feature.title}
                                    </h4>
                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                        {feature.description}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
