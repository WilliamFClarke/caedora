import type { MetadataRoute } from 'next'

// Lets Caedora be added to a phone's Home Screen as an app. On iPhone and iPad this is
// what makes notifications, such as the workout rest alerts, possible at all.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Caedora',
    short_name: 'Caedora',
    description: 'Open Knowledge Format vaults stored on your own device or GitHub repository.',
    start_url: '/vault',
    scope: '/',
    display: 'standalone',
    // Where the browser hands a caedora.app link to the installed app (Chrome on
    // Android and desktop), open it in the window that is already open.
    launch_handler: { client_mode: ['navigate-existing', 'auto'] },
    background_color: '#ffffff',
    theme_color: '#ffffff',
    icons: [{ src: '/icon.png', sizes: '500x500', type: 'image/png', purpose: 'any' }],
  }
}
