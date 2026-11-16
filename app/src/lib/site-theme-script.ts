/**
 * The public website's light/dark theme: "site-theme" in localStorage, else the device setting.
 * The class goes on #site-root (globals.css .site / .site.dark). Kept out of the "use client"
 * site-theme.tsx so the server layout gets the real string, not a client reference.
 */
export const SITE_THEME_KEY = "site-theme"
export const SITE_ROOT_ID = "site-root"

/** Runs before the page paints, so there is no flash of the wrong theme. */
export const SITE_THEME_SCRIPT = `(function(){try{var c=localStorage.getItem("${SITE_THEME_KEY}");var d=c==="dark"||(c!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);var r=document.getElementById("${SITE_ROOT_ID}");if(r){r.classList.remove("light","dark");r.classList.add(d?"dark":"light");}}catch(e){}})();`
