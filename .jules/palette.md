## 2026-08-14 - Custom Video Player Accessibility
**Learning:** Custom video controls often lack keyboard focus indicators and ARIA labels, making them difficult or impossible to use for screen reader and keyboard-only users.
**Action:** Always ensure custom interactive elements like buttons and range inputs have `aria-label`s, `focus-visible` styles, and state attributes like `aria-expanded` when applicable.

## 2026-08-15 - [Added ARIA Labels & Form Associations]
**Learning:** React inputs within Modals need proper ID generation and htmlFor mapping to support screen readers effectively, especially when component logic separates the label from the input element structure.
**Action:** Always include `id` and `htmlFor` pairs on newly created inputs inside modals and complex forms to assure a11y compliance.

## 2024-05-15 - ARIA Labels and Focus Styles on Chat Widget Controls
**Learning:** Icon-only buttons (e.g. Expand, Collapse, Close, Settings) in floating components like the ChatWidget often lack `aria-label` attributes and keyboard focus indicators, relying solely on `title` attributes which are insufficient for full screen-reader and keyboard navigation accessibility.
**Action:** When creating or modifying interactive icon-only components, ensure `aria-label` is always provided alongside `title` for screen readers, and add standard Tailwind focus rings (`focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400`) for keyboard users.
