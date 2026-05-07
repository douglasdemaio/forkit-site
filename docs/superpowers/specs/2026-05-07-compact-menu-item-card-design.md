# Compact menu-item card with inline expand

**Date:** 2026-05-07
**Status:** Approved by user, ready for implementation plan
**Scope:** UI redesign of menu-item display in `forkit-site` and `forkme`

## Problem

The current menu-item card in `forkit-site` (`components/menu-item-card.tsx`) uses a 192px-tall hero image rendered in a 2–3-column grid. It dominates the viewport, requires lots of scroll for a typical 15–20-item menu, and de-emphasizes the structural information (name, price, category) the user actually scans for. The same component is used by both the admin dashboard (`app/[locale]/dashboard/menu/page.tsx`) and the customer-facing restaurant page (`app/[locale]/restaurants/[slug]/page.tsx`), so the problem appears in two places.

In `forkme` (`components/menu-item-card.tsx`), the row is already compact — but tapping a row does nothing. There's no path to a hero image or a longer description.

## Goal

Replace the always-large hero image with a compact list row whose item expands inline on click to reveal the hero image and full description. Apply the same compact-row pattern to admin and customer views. Editing in the admin continues to use the existing modal form — no inline editing.

## Non-goals

- **Promoted-item slot** (paid placement using a restaurant's loyalty mint, billed per order). Reserved as a placeholder in the layout but specified separately in a follow-up spec.
- Visual theme unification between `forkit-site` (light, template-driven) and `forkme` (dark, brand-driven). They keep their own palettes; only the interaction pattern is shared.
- Cross-repo component sharing. Each repo gets its own implementation styled to its theme.
- Restaurant directory or homepage cards.

## Decisions (with rationale)

| Decision | Choice | Why |
| --- | --- | --- |
| Expand pattern | **Inline expand** (item grows in place; surrounding rows shift) | User selected over modal and bottom-sheet. Keeps the user anchored in the list; no overlay mental model. |
| Compact row's "Add" button | **Always-visible quick-add** in the compact row | One-tap add for repeat customers; row body click expands. |
| Admin editing flow | **Compact-row pattern + existing form modal** for edits | User chose to drop the inline quick-edit hybrid. Reuses the working modal in `dashboard/menu/page.tsx`. |
| Component sharing | **Two parallel implementations** (one per repo) | Repos are independent Next.js apps; no shared package today. Same interaction model, theme-specific styling. |
| Promoted slot | **Not in this spec.** Layout reserves a slot above the category tabs in the customer view. | Promoted slot is a multi-day cross-cutting feature (Solana program calls, DB schema, admin purchase UI, ranking). Bundling would couple a fast UI ship to a slow on-chain feature. |

## Affected files

### `forkit-site` (`/home/douglas/forkit-site`)

- **`components/menu-item-card.tsx`** — full rewrite. New compact-row layout; manages its own `expanded` state; accepts the existing `editable` prop; same callback contract (`onEdit`, `onDelete`, `addItem`).
- **`components/sortable-menu-item.tsx`** — small change. The drag handle is repositioned from the current absolute `top-2 left-2` overlay into the compact row's left edge (rendered as the first child inside the row, before the thumbnail) so it can't visually overlap the now-smaller thumb. The wrapper's `attributes`/`listeners` from `useSortable` get applied to that handle, not the whole article. The handle's `onClick`/`onPointerDown` should `stopPropagation` so grabbing it doesn't toggle expand.
- **`app/[locale]/dashboard/menu/page.tsx`** (line 393) — change `grid sm:grid-cols-2 lg:grid-cols-3 gap-6` → flex column with row spacing.
- **`app/[locale]/restaurants/[slug]/page.tsx`** (line 206) — same grid → list change. Also reserve a placeholder div above the category tabs for the future promoted slot (commented `<!-- featured slot reserved -->`); zero render output today, just the structural anchor.

### `forkme` (`/home/douglas/forkme`)

- **`components/menu-item-card.tsx`** — extend with `expanded` state and an expanded panel below the existing compact layout. Compact layout stays (already a good size); add a chevron and the expand panel containing hero image + full description + larger qty stepper.
- **`app/restaurants/[slug]/page.tsx`** — reserve the same featured-slot placeholder above the category tabs; otherwise no layout change (already a single-column list).

## Component contract — `MenuItemCard`

### `forkit-site/components/menu-item-card.tsx`

Props (existing props unchanged; two new props added so the parent can enforce single-row expand):
```ts
interface MenuItemCardProps {
  item: MenuItemData;
  restaurantId: string;
  restaurantSlug: string;
  restaurantName: string;
  currency?: string;
  editable?: boolean;
  onEdit?: (item: MenuItemData) => void;
  onDelete?: (itemId: string) => void;
  // NEW
  expanded: boolean;
  onToggle: () => void;
}
```

Expansion state lives in the parent (`restaurants/[slug]/page.tsx` and `dashboard/menu/page.tsx`) as a single `expandedId: string | null`. `onToggle` sets `expandedId` to this item's id, or clears it if already open. This guarantees only one row is expanded at a time without prop-drilling a list-wide state object.

Render structure:

```
<article expanded={expanded}>
  <button row onClick={() => setExpanded(!expanded)}>
    <Thumbnail 56x56 />
    <Meta name + 1-line truncated description />
    <Price />
    {!editable && <QuickAdd onClick={(e) => { e.stopPropagation(); addItem(...) }} />}
    <Chevron rotated={expanded} />
  </button>
  {expanded && (
    <Panel>
      <HeroImage 16:9 />
      <CategoryTag />
      <FullDescription />
      {editable
        ? <AdminActions onEdit onDelete />
        : <CustomerActions qtyStepper + addToCart />}
    </Panel>
  )}
</article>
```

Notes:
- "Sold out" still rendered as a small badge on the thumb in compact view; keeps the dark overlay on the hero in expanded view.
- `editable=true` hides the compact-row quick-add (admin doesn't add items to a cart).
- `onEdit` from the admin path opens the existing form modal in `dashboard/menu/page.tsx`.

### `forkme/components/menu-item-card.tsx`

Same shape, customer-only branch (no `editable` / `onEdit` / `onDelete`). Adds the same `expanded` + `onToggle` props; the parent (`app/restaurants/[slug]/page.tsx`) holds `expandedId`.

The current compact row already shows `category` as a sub-line under the description — drop it from the compact row (it appears as a tag inside the expanded panel instead) so the row is one consistent height across both apps.

## Interaction & UX details

- **Single-row expand:** opening one row collapses any other expanded row in the same list. Implemented via parent-held `expandedId` state passed to each card as `expanded` + `onToggle`.
- **Quick-add doesn't expand:** `event.stopPropagation()` on the quick-add button.
- **Expand affordance:** chevron rotates 180° on expand. Whole row is clickable (cursor: pointer; `role="button"`; keyboard Enter/Space toggles).
- **Animation:** CSS height grow via the `grid-template-rows: 0fr → 1fr` trick (no JS measurement, no layout flicker). Duration ~180ms ease-out.
- **Drag-and-drop (admin):** dragging a row collapses it. The drag handle inside the compact row gets `event.stopPropagation()` so grabbing it doesn't toggle expand.
- **Hero image:** uses `next/image fill` inside a `relative aspect-[16/9]` container, capped at 240px tall on desktop and 200px on mobile.
- **Empty image:** the same gradient-with-emoji fallback the current cards use; sized to the new compact thumb / hero respectively.
- **Click outside / Escape:** out of scope for v1. Only "click another row" or "click the same row" collapse. Escape support can come later if users ask.
- **Featured-slot placeholder:** a div with `data-featured-slot` rendered above the category tabs on the customer page. Empty in this spec; the follow-up promoted-slot spec will populate it.

## Visual specs

| Element | `forkit-site` | `forkme` |
| --- | --- | --- |
| Row background | white, border `gray-100` | `dark-900` |
| Row padding | `p-3` (12px) | `p-3` |
| Thumbnail | 56×56, `rounded-lg` | 56×56, `rounded-lg` (was 80×80; trimmed for consistency) |
| Name | `text-gray-900 font-semibold` | `text-white font-medium` |
| Description | `text-gray-500 truncate` | `text-dark-300 truncate` |
| Price | `text-forkit-orange font-bold` | `text-brand-500 font-semibold` |
| Quick-add | `bg-forkit-orange text-white rounded-full w-8 h-8` | `bg-brand-500 text-dark-950 rounded-full w-8 h-8` |
| Hero (expanded) | `aspect-[16/9] max-h-60` | `aspect-[16/9] max-h-60` |
| Panel background | `bg-gray-50` | `bg-dark-800` |

## Error handling

- Image load failure: existing `next/image` fallback behavior preserved. The compact-row thumb gracefully falls back to the gradient + emoji block already in use.
- Item becomes unavailable while expanded: the customer-side "Add to cart" button switches to a disabled "Unavailable" state on next render; if a quantity is already in cart, existing reducer behavior is unchanged.
- No new failure modes are introduced (no new network calls, no new state external to the component).

## Testing

- **Manual UI verification (required):** start each app's dev server, browse a restaurant menu, click rows to expand/collapse, add items to cart from compact and expanded states, verify drag-to-reorder still works in admin, verify the existing form modal still opens from the admin's "Edit" button.
- **Type check + build:** `npm run build` in each repo passes.
- **Cart integration:** verify `useCartStore.addItem` (forkit-site) and `useAppStore.addToCart` (forkme) still receive the same arguments — these are unchanged.
- **Sortable behavior (admin):** open one row, drag a different row; expanded row should collapse on drag start.
- **Mobile viewport (375px):** compact row legible, hero image not overflowing, quick-add tappable (≥32px target).

No new automated tests. The repos don't have an existing UI test suite for these components; adding one is out of scope.

## Open questions

None — all clarifying questions resolved during brainstorming. The promoted-slot feature is intentionally deferred and tracked as a follow-up spec.

## Follow-up spec (not in this design)

**Promoted top-of-menu slot.** A restaurant burns its own loyalty mint to pin one of its menu items above the category tabs. Slot consumption is **per order placed for that item** — not impressions, not clicks. Requires:

- DB: `MenuItem.promotedRemainingOrders` (or a new `Promotion` row) + activation/expiry timestamps.
- Solana program call to burn loyalty tokens at promotion start (one-time burn for budget).
- Order-completion hook decrements `promotedRemainingOrders`; when it hits 0, slot clears.
- Admin "Promote item" action in the dashboard.
- Customer-page rendering: read the placeholder slot reserved in this spec.
