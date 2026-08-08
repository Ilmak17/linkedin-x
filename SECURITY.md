# Security policy

## Reporting a vulnerability

Use GitHub's private vulnerability reporting: **Security → Report a vulnerability** on <https://github.com/Ilmak17/linkedin-x>. Do not open a public issue for a security problem.

Expect an acknowledgement within a week. If a fix is warranted it will ship as a patch release with the reporter credited, unless you prefer otherwise.

## What is in scope

This extension runs with access to a logged-in LinkedIn session, so the interesting failure modes are:

- **Injection into the page.** Post text and author names come from LinkedIn and are rendered by Preact as text nodes, never as HTML. A path that gets attacker-controlled markup executing as HTML or script is a real vulnerability.
- **Leaking session data.** The extension makes no network requests. Any path that sends page content, cookies, or tokens anywhere is a vulnerability, including via a dependency.
- **Acting without the user.** Actions fire only from a click in the UI. A path that likes, comments, reposts, or follows without a corresponding user gesture is a vulnerability.
- **Escaping the shadow root.** Our UI is isolated in a shadow root. A path that lets page CSS or scripts reach into it, or ours reach out, is worth reporting.
- **Supply chain.** A compromised or typosquatted dependency reaching the built `dist/`.

## What is not in scope

- LinkedIn's own vulnerabilities. Report those to [LinkedIn](https://www.linkedin.com/help/linkedin/answer/a1340557).
- Selectors breaking after a LinkedIn redesign. That is a bug, not a vulnerability: use the [selector break template](https://github.com/Ilmak17/linkedin-x/issues/new?template=selector-break.yml).
- The extension being visible to LinkedIn. It runs in the page and does not try to hide, and requests to make it harder to detect will be declined.
- Terms-of-service concerns. Real, but not a security issue; see the caveat in the README.

## Supported versions

The latest release only. This is a small project with no long-term support branches.
