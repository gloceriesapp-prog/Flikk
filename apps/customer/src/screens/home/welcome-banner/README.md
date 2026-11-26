# Home welcome banner

The All tab renders HomeWelcomeBanner below the Namma Brands block and before its configured sections, unless the `welcome-banner` row in admin Home Sections is switched off (no row = shown). Other tabs do not render it. The product-card strip that used to sit under it was removed.

The current artwork is `Coastal Karnataka shops welcome home (1).png` from public image storage. The image keeps its original 2172×724 proportions at full container width, with no crop, stretching or added overlay text. Matching the container to the artwork avoids letterboxing. A 16px top margin adds space below the categories. The bottom fade covers 24% of the image height and blends into the white (`#FFFFFF`) banner background. This panel is independent of the header palette. No card frame is added.

Only the welcome image occupies this white panel. The edge trim uses the same white; Stores near you and all other configured sections render outside as sibling sections with their own backgrounds.
