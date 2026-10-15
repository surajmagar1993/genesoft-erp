import { WEEK_DAYS, type OfficeHours } from "@/lib/site-cms-shared"

/** Office hours from Site settings; nothing at all when they aren't set. */
export function OfficeHoursList({ hours, note, className }: { hours: OfficeHours[]; note?: string; className?: string }) {
    if (!hours.length) return null
    const byDay = WEEK_DAYS.map((d) => hours.find((h) => h.day === d)).filter(Boolean) as OfficeHours[]
    return (
        <div className={className}>
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-sm">
                {byDay.map((h) => (
                    <div key={h.day} className="contents">
                        <dt>{h.day}</dt>
                        <dd className="text-s-ink">{h.closed ? "Closed" : `${h.open} – ${h.close}`}</dd>
                    </div>
                ))}
            </dl>
            {note && <p className="mt-2 text-xs text-s-muted">{note}</p>}
        </div>
    )
}
