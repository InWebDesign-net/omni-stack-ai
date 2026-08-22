# Demo media

The creator avatars and stock thumbnails the demo content refers to.

These used to be loaded from `images.unsplash.com` at runtime, which meant every
visitor's browser contacted a third party before the page finished rendering —
the same objection that got the web fonts self-hosted (#142). They are served
from here instead, so the site makes no third-party requests at all.

## Where they come from

Each file is named after its Unsplash photo id, so the original is findable:
`photo-1507003211169-0a1dd7228f2d.jpg` is
`https://unsplash.com/photos/1507003211169-0a1dd7228f2d`.

They are covered by the [Unsplash License](https://unsplash.com/license), which
permits free use, including commercially, without attribution — attribution is
appreciated rather than required, and the filenames preserve it.

## Replacing them

This is demo material. A deployment that is not the public preview should swap
these for its own images, or drop them and let `resolveAvatarUrl` fall back to
`/avatar-placeholder.svg` — it already treats the two oldest of these ids as
"no avatar" for exactly that reason.

One id referenced in the code (`photo-1536240478700-b869070f9279`) no longer
exists on Unsplash and had been a broken image for a while; that reference now
points at the default cover.
