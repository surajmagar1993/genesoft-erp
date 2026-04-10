"use client"

import { 
    Area, 
    AreaChart, 
    ResponsiveContainer, 
    Tooltip, 
    XAxis, 
    YAxis, 
    CartesianGrid,
    BarChart,
    Bar,
    Cell
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

interface ChartProps {
    data: any[]
    currencySymbol?: string
}

export function RevenueChart({ data, currencySymbol = "₹" }: ChartProps) {
    return (
        <Card className="shadow-sm border-none ring-1 ring-slate-200 dark:ring-slate-800">
            <CardHeader>
                <CardTitle className="text-lg">Revenue Growth</CardTitle>
                <CardDescription>Monthly turnover from accepted quotes</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[300px] w-full mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data}>
                            <defs>
                                <linearGradient id="colorTurnover" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--color-primary, #ea580c)" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="var(--color-primary, #ea580c)" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                            <XAxis 
                                dataKey="name" 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fontSize: 12, fill: 'currentColor', opacity: 0.5 }}
                                dy={10}
                            />
                            <YAxis 
                                hide 
                            />
                            <Tooltip 
                                contentStyle={{ 
                                    backgroundColor: 'rgba(255, 255, 255, 0.9)', 
                                    borderRadius: '12px', 
                                    border: 'none', 
                                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                                    color: '#0f172a'
                                }}
                                formatter={(value: number) => [`${currencySymbol}${value.toLocaleString()}`, "Turnover"]}
                            />
                            <Area 
                                type="monotone" 
                                dataKey="turnover" 
                                stroke="var(--color-primary, #ea580c)" 
                                strokeWidth={3}
                                fillOpacity={1} 
                                fill="url(#colorTurnover)" 
                                animationDuration={1500}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    )
}

export function LeadsChart({ data }: ChartProps) {
    return (
        <Card className="shadow-sm border-none ring-1 ring-slate-200 dark:ring-slate-800">
            <CardHeader>
                <CardTitle className="text-lg">Lead Generation</CardTitle>
                <CardDescription>New prospects acquired per month</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[300px] w-full mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                            <XAxis 
                                dataKey="name" 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fontSize: 12, fill: 'currentColor', opacity: 0.5 }}
                                dy={10}
                            />
                            <YAxis hide />
                            <Tooltip 
                                cursor={{ fill: 'rgba(234, 88, 12, 0.05)' }}
                                contentStyle={{ 
                                    backgroundColor: 'rgba(255, 255, 255, 0.9)', 
                                    borderRadius: '12px', 
                                    border: 'none', 
                                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                                    color: '#0f172a'
                                }}
                            />
                            <Bar 
                                dataKey="leads" 
                                radius={[4, 4, 0, 0]}
                                animationDuration={1500}
                            >
                                {data.map((entry, index) => (
                                    <Cell 
                                        key={`cell-${index}`} 
                                        fill={index === data.length - 1 ? "var(--color-primary, #ea580c)" : "var(--color-primary, #ea580c66)"} 
                                    />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    )
}
