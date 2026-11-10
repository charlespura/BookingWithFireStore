# Club Victorina rebuild

Assumption: event venue in Lipa, Batangas for families and local event planners. The appointment product is a venue visit; event rentals remain quotation-based. No verified rental rates or package durations were present.

## Existing application audit

Both original HTML files were read before implementation and preserved byte-for-byte in `legacy/`.

`reservations`: firstName, lastName, email, phone, eventType, venue, preferredDate (YYYY-MM-DD), guestCount (number), message, createdAt (server timestamp). The public page called addDoc; the admin used getDocs ordered by createdAt. No update workflow, Firebase Auth or explicit admin check existed. Security rules were not provided, so actual deployed permissions could not be established.

Firebase web config was embedded in both files. Client config identifies a Firebase project and is not a private server credential. Access must be protected by rules. No password was found. Admin used innerHTML with unsanitized guest input (stored-XSS risk). Other gaps: no atomic slot locks, no explicit timezone, incomplete email validation, no enforced date bounds, and a calendar fallback to January 2025. Placeholder phone numbers and unsupported star/event-count claims were removed. The photographs are stock illustrations, now labelled as such. The original garden photograph showed an indoor hall, so it was replaced with a celebration-table detail.

## Design plan

Subject: a visit to one of Club Victorina's three event spaces.
Audience: families and event planners in and around Lipa.
Primary job: choose a space and reserve a visit before discussing an event package.

Palette: porcelain #F5F7F4; pine #23483E; ink #20332E; sage #DCE6DC; marigold #E2BD65; slate #53665E. Fraunces 500 for expressive display; Public Sans 400/500/600 for text and controls. Fonts are self-hosted through Fontsource and restricted to Latin subsets.

Layout: an event planner's venue dossier. Shared left edges; aligned lists for services; consistent right-aligned operational actions. Mobile stacks content in reading order. The large arched garden photograph carries the one bold visual gesture. Admin uses flat tables, dividers and restrained status colours.

Landing: header / split hero / venue note / three spaces / visit service list and availability / location and FAQ / footer.
Booking: five-step progress / compact visit summary / single active panel / confirmation and calendar.
Admin: staff header / working navigation / day or table view / services and hours.

Principles: real venue names, useful capacities, a Philippine timezone, event-specific questions, honest quotation-based rental pricing. No fabricated testimonials, event counts or contact phone number.

Self-review: revised an initial rental-checkout concept into a venue-visit reservation to avoid invented package prices and durations. The schedule stays unpublished until an admin deliberately initializes it. Defaults are editable assumptions: one-hour complimentary visits, 9 AM–9 PM daily. The decorative overlapping monogram proposed for the hero was omitted; the photograph has enough presence.

Motion: a single horizontal reveal opens the garden image, like opening the space for a visitor. Small panel transitions, slot feedback and confirmation respond to actions. Reduced motion removes transforms and uses immediate transitions. No section entrance effects or repeated hover lifts.
