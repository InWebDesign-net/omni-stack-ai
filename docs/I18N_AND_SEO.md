# Localization & SEO

How Omni serves two languages: what the URL says, what the markup declares, and the two Strapi i18n rules that are easy to learn the hard way.

---

## 🌐 The language is in the URL

German is the default and stays unprefixed. English lives under `/en`.

```
/article/the-hour-before-departure       → de
/en/article/the-hour-before-departure    → en
```

`web/src/proxy.ts` rewrites `/en/<path>` to `<path>` and passes the language to the server as a request header. The app therefore keeps one set of routes rather than duplicating every page into a `[lang]` segment that would only ever hold two values.

> The file is named `proxy.ts`, not `middleware.ts`: the `middleware` convention is deprecated in this version of Next and the file is expected at `src/proxy.ts`.

Because the server knows the language before it renders, the first byte is already correct — `<html lang>`, the headline and the body text need no correction after hydration.

### Staying in the language you are reading

A bare `/videos` on an English page is a link *out* of English. Internal links go through `LocaleLink` and programmatic navigation through `useLocaleRouter`, so the prefix is applied in two places rather than at every call site. External URLs, anchors and `mailto:` are passed through untouched.

The stored language preference records the reader's choice; it does not decide the page. The URL does.

---

## 🔗 What each page declares about itself

```html
<link rel="canonical"  href=".../en/article/the-hour-before-departure"/>
<link rel="alternate" hreflang="de"        href=".../article/the-hour-before-departure"/>
<link rel="alternate" hreflang="en"        href=".../en/article/the-hour-before-departure"/>
<link rel="alternate" hreflang="x-default" href=".../article/the-hour-before-departure"/>
```

Canonical points at the page's own language; `hreflang` names the other, with `x-default` on German. Without the pair, a crawler cannot learn that two URLs are the same article.

A canonical describes exactly one page, which is why it is never declared in a layout: metadata in a layout is inherited by every page that does not set its own.

`/sitemap.xml` lists every public video, image and article plus the list pages, each with both language addresses. `/robots.txt` points at it.

---

## 🗂️ Localized content types

Articles, images and videos are Strapi i18n documents. The editor exposes both languages side by side, block structure stays in sync across them, and per-locale save failures come back as a `422` naming the language and the upstream message rather than a bare status.

Comments are localized too. A comment is written in one language and gets an **empty counterpart** in the other; an empty version is not rendered, so a reader of the other language sees no comment rather than one they cannot read. Nothing is ever copied across, which keeps "not translated yet" and "translated" distinguishable by construction rather than by a flag somebody has to maintain.

---

## ⚠️ Two Strapi i18n rules worth knowing before you need them

### 1. "No locale" means the default locale, not "all"

Strapi resolves an unspecified `locale` to the default one. Creating, saving and deleting each need it stated explicitly — a `DELETE` without `?locale=*` removes only the default language and reports success.

### 2. A localized relation target must exist in the referencing locale

Pointing an article's image block at a document that has no entry in the locale being written fails the whole write:

```
400 ValidationError: Document with id "<id>", locale "en" not found
```

Because block structure is mirrored across languages, one media item existing in only one language breaks the save for the entire document — including the language that was perfectly valid.

Media is therefore created in **every** configured locale from the start. The file, URLs and dimensions are identical across languages anyway; only title, summary and tags ever differ.

### 3. A relation points at a row, not at a document

A draft-and-publish type keeps two rows per language, and the Document Service answers with the draft unless asked otherwise. Anything that writes a relation from a lookup — seeding, imports, migrations — has to ask for `status: 'published'`, or it will reference a row the public API never serves. Nothing fails; the relation simply resolves to nothing.
