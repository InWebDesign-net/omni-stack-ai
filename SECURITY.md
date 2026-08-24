# Security Policy

## Reporting a vulnerability

**Please do not open a public issue for a security problem.**

Use GitHub's private reporting instead: the **Security** tab of this repository → **Report a vulnerability**. That opens a private advisory visible only to you and the maintainers, and it is the fastest route to someone who can act on it.

If private reporting is unavailable to you, get in touch through <https://inwebdesign.net> and say up front that it concerns a security issue in `omni-stack-ai`, without describing the problem in a public channel.

### What helps

A report is easier to act on when it includes:

- what an attacker can do, not only what looks wrong
- the smallest set of steps that reproduces it — a request, a URL, a sequence of clicks
- which part it affects: the Next.js frontend, the Strapi CMS, the WebSocket gateway, or the media pipeline
- the commit or version you tested against

A proof of concept is welcome. Please keep it against your own installation rather than the public preview at `omni-web.inwebdesign.net`.

### What to expect

- **Acknowledgement within three working days.** If you have not heard anything, assume the mail went astray and send it again.
- **An assessment within a week**, saying whether we consider it a vulnerability and, if so, roughly when a fix will land.
- **Fixed before it is described.** Details are published once a fix is available, not while the problem is still open — including in the commit history, where a security fix is committed as a fix and explained afterwards rather than announced in advance.
- **Credit where you want it.** Tell us how you would like to be named, or that you would rather not be.

We do not run a paid bounty programme.

## Supported versions

This is a boilerplate, developed and released from `main`. Security fixes land there; there are no maintained release branches, and no backports to older tags.

If you have forked or deployed this code, updating means merging from `main`. A fork that has diverged is yours to maintain — we cannot patch it for you, but a report about code that originated here is still welcome.

## Scope

**In scope** — anything in this repository:

- authentication and session handling, including the socket handshake
- the visibility model: default-deny in the CMS middleware, the media route, and the key endpoint for encrypted HLS
- the BFF routes under `web/src/app/api/`, which hold the Strapi token the browser never sees
- the upload and ingest path
- the consent gate, when something is stored without permission

**Out of scope:**

- **Findings in third-party dependencies** — report those to the project concerned. Dependabot watches this repository's dependency graph and we act on what it reports.
- **The demo data on the public preview.** The demo accounts and their passwords are published in the README on purpose, and the preview is reset nightly. Logging in as `demotech` is not a finding.
- **Missing hardening without an attack** — a header that could be stricter, a version that could be newer. Useful as a normal issue or pull request; not a vulnerability report.
- **Denial of service through volume.** The preview is a single container and makes no claim otherwise.

## A note on this repository's own practice

Security work here follows the same rule we ask of you: a defect is fixed first and described afterwards. Findings are tracked privately until a fix ships, and only then written up. If you see a commit that fixes something without explaining much, that is usually why — and the explanation follows.
