export function formatCurrency(
  amount: number | string | Decimal,
  currencyCode: string = "INR",
  locale: string = "en-IN"
) {
  const value = typeof amount === "string" ? parseFloat(amount) : Number(amount)
  
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

type Decimal = {
  toNumber(): number
}
