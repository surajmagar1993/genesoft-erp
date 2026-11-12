/**
 * Areas of the signed-in app. Signed-out visitors to these are sent to sign
 * in; everything else that doesn't exist is a plain 404. Also kept out of
 * search engines (robots.ts).
 */
export const APP_AREAS = ["/admin", "/settings", "/reports", "/crm", "/sales", "/finance", "/purchase", "/inventory", "/manufacturing", "/hr", "/projects", "/support", "/workspace-settings"]
