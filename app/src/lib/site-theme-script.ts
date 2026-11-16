/**
 * The public website follows the visitor's device setting (light or dark); there is no toggle.
 * The class goes on #site-root (globals.css .site / .site.dark). Kept out of the "use client"
 * site-theme.tsx so the server layout gets the real string, not a client reference.
 */
export const SITE_ROOT_ID = "site-root"

/**
 * Runs before the page paints, so there is no flash of the wrong theme. Also clears the
 * "site-theme" choice older versions saved, so nobody stays stuck on a mode they once picked.
 */
export const SITE_THEME_SCRIPT = `(function(){try{localStorage.removeItem("site-theme")}catch(e){}var r=document.getElementById("${SITE_ROOT_ID}");if(r){var d=window.matchMedia("(prefers-color-scheme: dark)").matches;r.classList.remove("light","dark");r.classList.add(d?"dark":"light");}})();`
