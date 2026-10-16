import { useSyncExternalStore } from "react"

const subscribe = () => () => {}

/**
 * false while the server renders (and during hydration), true in the browser.
 * For text that depends on the viewer (their local time): render it only when
 * true, so the server and browser output match.
 */
export function useIsClient(): boolean {
    return useSyncExternalStore(subscribe, () => true, () => false)
}
