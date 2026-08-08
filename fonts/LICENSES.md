# Bundled fonts

These files are not in git; `npm run fonts` downloads them, and release builds include them. All three are freely redistributable, which is why they can be bundled into a distributed extension at all.

| Family | Files | License | Source |
|---|---|---|---|
| General Sans | `general-sans-400.woff2`, `general-sans-500.woff2`, `general-sans-600.woff2` | [ITF Free Font License](https://www.fontshare.com/licenses/itf-ffl) | [Fontshare](https://www.fontshare.com/fonts/general-sans) |
| Source Serif 4 | `source-serif-4-variable.woff2`, `source-serif-4-italic.woff2` | [SIL Open Font License 1.1](https://openfontlicense.org/) | [Google Fonts](https://fonts.google.com/specimen/Source+Serif+4) |
| JetBrains Mono | `jetbrains-mono-400.woff2` | [SIL Open Font License 1.1](https://openfontlicense.org/) | [Google Fonts](https://fonts.google.com/specimen/JetBrains+Mono) |

The fonts are bundled rather than loaded from a CDN so that opening LinkedIn does not send a request to Google or Fontshare. See [PRIVACY.md](../PRIVACY.md).

If a font fails to download, the extension falls back to the system stack declared in `src/ui/styles.css` and still works.
