# Omni Viewer & Content Visibility Architecture

This document explains how the Omni Stack enforces content visibility across Strapi 5. It serves as an authoritative reference for frontend and backend developers building on top of this platform.

---

## 🎯 Scope

The default-deny visibility enforcement applies to the following content types in Strapi 5:

- `api::article.article` — Editorial articles, blog posts, and rich text content.
- `api::video.video` — Video media items, metadata, and HLS stream manifests.
- `api::image.image` — Image gallery items, WebP previews, and OpenGraph assets.
- `api::feed-item.feed-item` — Dynamic feed item containers (planned for expansion as unified rich feed cards combining articles, media embeds, and interactive blocks).

---

## 🔒 Core Rule: Default-Deny Visibility (`visibility: 'public'`)

All document queries (`findMany`, `findOne`, `findFirst`) executed against the Strapi Document Service that are **not** made by a Strapi admin user are automatically filtered to `visibility: 'public'` by default.

This security policy is enforced centrally via a Strapi 5 Document Service middleware in [`cms/src/index.ts`](file:///root/omni-stack-ai/cms/src/index.ts).

---

## 🔑 When Private / Draft Content is Accessible

Non-public content (`visibility: 'private'` or draft status) is accessible under the following specific conditions:

1. **Admin Panel Requests**  
   Requests originating from `/admin` or `/content-manager` bypass the middleware completely so editors and administrators can inspect and manage all entries in the Strapi Admin Panel.

2. **Owner Queries ("My Channel / My Content")**  
   When a request is authenticated and explicitly filters by relation to the current user:
   - `creator` ID for `video`, `image`, and `article`.
   - `author` ID for `feed-item`.
   This allows creators to view and manage their own private or draft content in user dashboard views.

3. **Single Item Previews & Direct Links**  
   When a query filters by a specific identifier (`slug`, `documentId`, or `id`) AND the caller provides an authenticated session (`x-omni-user-id`, JWT token, or preview secret). This powers preview links and shareable owner previews without exposing private items in public feeds.

4. **Explicit Visibility Filters**  
   If the caller already supplies an explicit `visibility` filter (e.g. `{ visibility: { $in: ['public', 'private'] } }`), the middleware respects the explicit filter provided by authorized callers.

5. **Strapi Admin Preview Mode**  
   Clicking *"Vorschau"* in Strapi Content Manager generates a signed Next.js preview URL (`/api/preview?secret=...&slug=...&type=...`) verified against `STRAPI_PREVIEW_SECRET`, enabling live draft previews.

---

## 🛠️ Authentication Resolution Hierarchy

The middleware resolves the current user ID (`uidNum`) in the following order of precedence:

1. `context.params.omniViewer.userId` — Passed explicitly by internal backend services (e.g., `feed-assembly.ts`).
2. `koaCtx.state.user.id` — Extracted from a validated Strapi JWT bearer token.
3. `x-omni-user-id` header — Passed by Next.js server-side API proxy routes.
4. `omniUserId` query parameter — Passed in query strings where headers cannot be set.

Only the first resolved user ID is used.

---

## 🚀 Future Roadmap: Feed Item Expansion & Articles

As the platform evolves, `feed-item` containers will be expanded into rich, modular cards:
- **Articles & Long-form Content**: Seamless integration between `api::article.article` and `api::feed-item.feed-item` using reusable block components.
- **Embedded Media**: Direct embedding of video streams and WebP image carousels within feed items.
- **Interactive Widgets**: Polls, comments, and reaction counters integrated directly into feed items.

---

## 🛠️ Code Implementation Reference

```typescript
// cms/src/index.ts
strapi.documents.use(async (context: any, next: any) => {
  const targetUIDs = [
    'api::video.video',
    'api::feed-item.feed-item',
    'api::image.image',
    'api::article.article'
  ];
  const action = context.action;

  if (targetUIDs.includes(context.uid) && ['findMany', 'findOne', 'findFirst'].includes(action)) {
    // 1. Bypass for Strapi Admin Panel
    if (isAdminRequest) return next();

    // 2. Resolve User ID
    const uidNum = resolveUserId(context, koaCtx);

    // 3. Bypass for Owner Queries or Single Item Slugs
    const usesCreator = ['api::video.video', 'api::image.image', 'api::article.article'].includes(context.uid);
    const targetRelFilter = usesCreator ? filters.creator : filters.author;
    
    if (isOwnerQuery || (isSpecificItemQuery && uidNum != null)) return next();

    // 4. Default-deny fallback: Enforce visibility = 'public'
    context.params.filters = {
      ...filters,
      visibility: { $eq: 'public' },
    };
  }

  return next();
});
```

---

## 🚫 Never symlink the media directory into `web/public/`

Anything reachable under `web/public/` is served by Next.js as a static asset **before** App Router route handlers run. A `web/public/media -> /path/to/media` symlink therefore bypasses `app/media/[...path]/route.ts` entirely, taking the visibility check, the traversal guard and the Range implementation out of the request path.

Point `MEDIA_ROOT` in the route handler at the media directory instead, and let every `/media/*` request go through it.

The same reasoning applies to any future asset root: a file that is meant to be gated has to be served by something capable of gating it.
