# Privacy

Short version: the extension makes no network requests and sends nothing anywhere.

## What it collects

Nothing.

## What it stores

Your settings, and only your settings: whether the extension is on, your theme choice, and the four "show anyway" toggles. They live in `chrome.storage.sync`, which is Chrome's own storage, synced by your browser to your Google account if you have browser sync enabled. Neither this extension nor its authors can read that.

Post content, author names, avatars and comments are held in memory for as long as the LinkedIn tab is open, because that is what rendering them requires. Closing the tab discards them. Nothing is written to disk.

## What it sends

Nothing. There is no server, no analytics, no telemetry, no crash reporting, and no remote configuration.

Fonts are bundled inside the extension rather than loaded from Google Fonts or Fontshare, specifically so that opening LinkedIn does not tell a font CDN you did.

The only outbound requests on the page are LinkedIn's own, which would have happened anyway.

## Permissions, and why each one exists

| Permission | Why |
|---|---|
| `storage` | To remember your settings between sessions |
| `https://www.linkedin.com/*` | The content script runs on the LinkedIn feed. It cannot run anywhere else |

The extension requests no other host, no `tabs`, no `cookies`, no `webRequest`, and no background service worker.

## What it does on your behalf

When you press like, comment, repost or save in the new interface, the extension finds LinkedIn's own button for that action and clicks it. It performs exactly the action you asked for, at the moment you asked for it, and nothing else. It never acts on its own, never batches, never retries in the background, and never touches a post you did not interact with.

## Third parties

There are none.

## Changes

If a future version ever needs a network request or an additional permission, it will be stated here and in the release notes before that version ships, and the reason will be specific.

## Contact

Open an issue: <https://github.com/ilmak/linkedin-x/issues>
