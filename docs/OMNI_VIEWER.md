# Omni Viewer & Content Visibility

This document explains how the Omni Stack enforces content visibility across
Strapi 5. It is intended as a reference for frontend and backend developers
who build on top of this boilerplate.

## Scope

The visibility rules apply to these content types:

- `api::feed-item.feed-item`
- `api::video.video`
- `api::image.image`

## Core rule: default-deny

All document queries (`findMany`, `findOne`, `findFirst`) that are **not**
made by a Strapi admin user are filtered to `visibility: 'public'` by
default.

This is implemented as a Strapi Document Service middleware in
`cms/src/index.ts`.

## When private content is visible

A user can see non-public content in the following cases:

1. **Admin request** — requests to `/admin` or `/content-manager` bypass the
   middleware so editors can manage all entries in the Strapi admin panel.

2. **Owner query** — when the request is authenticated and the query filters
   by `author` (feed-item) or `creator` (video/image) matching the current
   user's ID. This powers "My channel / my content" views.

3. **Specific item query** — when the query filters by `slug`, `documentId`,
   or `id` and the request is authenticated. This allows the owner to preview
   or share a single private item without exposing the whole library.

4. **Explicit visibility filter** — if the caller already supplies a
   `visibility` filter, the middleware leaves it untouched.

## How authentication is resolved

The middleware looks for the current user ID in this order:

1. `context.params.omniViewer.userId` — passed explicitly by backend services
   such as `feed-assembly.ts`.
2. `ctx.state.user.id` — set by Strapi JWT authentication.
3. `x-omni-user-id` header.
4. `omniUserId` query parameter.

Only the first resolved ID is used.

## Frontend / API contract

- Authenticated frontend routes should continue sending the standard
  `Authorization: Bearer <jwt>` header.
- Internal CMS services that need owner-aware queries can pass
  `{ omniViewer: { userId: <id> } }` in Document Service calls.
- Public feeds and listings never expose `visibility: 'private'` entries.

## Why this pattern exists

The boilerplate is designed for multi-tenant content platforms where users can
publish public content and keep drafts/private content separate. Instead of
relying on Strapi role permissions alone, the middleware adds a defense-in-depth
layer that guarantees private content is never accidentally returned by an
unscoped query.

## Changing the behavior

To add new content types to the visibility enforcement, extend
`targetUIDs` in the middleware (`cms/src/index.ts`). To change the default
visibility value or add extra bypass rules, modify the conditions before the
`context.params.filters` assignment.
