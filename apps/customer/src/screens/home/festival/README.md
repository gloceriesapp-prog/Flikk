# Festival content

`FestivalTab.tsx` renders the published `home_content` document with tab key
`festivals`, using the same production `ManagedHomeTab` renderer as other
category tabs. Seasonal names such as Navratri decorate this one managed
destination; they do not create another tab with different shelves.

## Admin controls

Open **Customer home → Festival sections & layout** (`/festival-layout`).
The editor opens Festivals directly and supports titles, visibility, section
ordering, automatic or curated products, product limits, grid/horizontal
layouts, explore buttons and empty-state visibility. Add missing festival
sections creates a draft and preserves all existing edits and product picks.
Publishing is explicit and uses the protected, revision-checked API; history
can restore an earlier document.

The eight named sections are defined once in
`packages/home-content/festival.js`: Puja essentials, Flowers & garlands,
Sweets to share, Fruits for the festival, Light up your home, Rangoli & decor,
From local shops and Festival offers. Offers require a real discount. New
preset shelves hide when no relevant nearby catalogue products exist.

**Festival products** still manages the shared curated rail. Add a Festival
shelf section to the layout to display that rail; picking products there no
longer removes all the individual shelves. **Festival tab & greeting** owns
seasonal artwork, colours and greeting copy. The layout's Show this tab switch
is authoritative: seasonal artwork cannot resurrect a disabled managed tab.
A generic Festivals tab may remain visible without seasonal artwork.

## Production and rollout

No new database tables or migration are required beyond existing Home-content
and festival configuration migrations. Deploy the updated admin and customer
code together. Existing stored layouts are intentionally preserved: open the
editor, use Add missing festival sections, review selections and publish to
activate them. The backend serves the same validated data and existing Home
sync invalidates layout and inventory previews after a publication.

The customer renderer only selects real delivery-address-scoped catalogue
products. It does not import the legacy development sample shelves. Explore
buttons use HomeContentCollection with the same published rules. Legacy
section/collection files remain for older route compatibility, not as an
unmanaged production fallback.
