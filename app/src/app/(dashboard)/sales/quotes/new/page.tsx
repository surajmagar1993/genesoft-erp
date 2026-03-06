"use client"

import { QuoteForm } from "@/components/sales/quote-form"

export default function NewQuotePage() {
    const handleSave = (data: any) => {
        // TODO: API call to save quote
        console.log("Quote saved:", data)
    }

    return <QuoteForm onSave={handleSave} />
}
