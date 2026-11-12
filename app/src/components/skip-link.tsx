/** First stop for keyboard users: jumps past the menu straight to the page's content. */
export function SkipLink({ target = "main-content" }: { target?: string }) {
    return (
        <a
            href={`#${target}`}
            className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:shadow-lg focus:ring-2 focus:ring-ring"
        >
            Skip to main content
        </a>
    )
}
