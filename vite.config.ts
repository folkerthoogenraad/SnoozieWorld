import { defineConfig } from 'vite'

// Hostnames (besides localhost and IP addresses) the dev/preview servers accept,
// e.g. http://FolkertsPC:5173. Vite rejects other hostnames to prevent DNS rebinding.
// Vite compares them case-sensitively; browsers send hostnames in lowercase.
const allowedHosts = ['folkertspc', 'FolkertsPC']

export default defineConfig({
  // Listen on all network interfaces, so the app can be opened from other
  // devices on the LAN (e.g. a phone) at http://<this-machine's-ip>:5173.
  server: { host: true, allowedHosts },
  preview: { host: true, allowedHosts },
})
