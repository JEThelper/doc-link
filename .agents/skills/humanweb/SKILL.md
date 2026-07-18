---
name: Humanweb
description: Use this skill to audit, design, and refactor websites to ensure they feel authentically human-crafted and avoid the common pitfalls of "AI-generated" or "vibe-coded" aesthetics. Triggers when asked to make a website look "human", "authentic", "custom", or to avoid "AI", "vibe-coding", or "generic" designs.
---

# Humanweb Skill: Authenticity & Craft in UI/UX

This skill provides a framework for avoiding the "vibe-coded" or AI-generated look when building or auditing websites. AI models naturally regress to the mean, producing polished but highly predictable, generic, and sometimes functionally shallow designs. Use this guide to inject character, intentionality, and deep usability into web projects.

## 1. Avoid the "SaaS Skeleton" & Layout Monotony
AI-generated sites almost always use the same boilerplate layout. 
- **The Cliché:** Top navbar -> Centered hero with "eyebrow" text and a primary CTA -> 3-column features grid with icons -> 3-column pricing table.
- **The Human Fix:** Break the grid. Use asymmetric layouts, side-anchored hero sections, or editorial-style typography. Design the layout around the actual content and brand narrative, not a one-size-fits-all template. Avoid the overused "eyebrow" badge above every H1 unless it serves a distinct functional purpose.

## 2. Refine the Aesthetic: Ditch the "AI Palette"
AI tends to over-index on trendy "safe" designs, resulting in visual clutter.
- **The Cliché:** Purple-to-blue gradients, neon "aurora" glows, excessive glassmorphism, huge drop shadows, and maximum border-radii on every element.
- **The Human Fix:** Develop a specific, intentional color palette rooted in the brand's identity (e.g., warm neutrals, desaturated tones, or striking monochrome with a single, unique accent color). Use shadows and blur effects sparingly and only to establish true functional depth (Z-index hierarchy), not just for decoration. Customize component libraries (like Tailwind or shadcn) so they don't look like default installations.

## 3. Design for the "Unhappy Path" & Real Data
AI makes idealized designs that break when confronted with reality.
- **The Cliché:** Symmetrical, perfectly sized placeholder text (Lorem Ipsum), buttons with no loading states, carousels that don't swipe, and a lack of empty/error states.
- **The Human Fix:** Stress-test the UI. How does it look with a 40-character username? What happens when a grid has 5 items instead of 6? Ensure every interactive element has defined `:hover`, `:focus-visible`, `:active`, and `disabled` states. Add clear, well-designed empty states and error messages.

## 4. Eliminate "AI-Speak" Copy
Generic copy is the fastest way to make a site feel artificially generated.
- **The Cliché:** "Revolutionize your workflow," "Unlock your potential," "Seamlessly integrate," or vague feature descriptions.
- **The Human Fix:** Write specific, opinionated copy. If you can swap the company name for a competitor and the copy still makes sense, it needs to be rewritten. Focus on concrete benefits, real features, and a distinct brand voice.

## 5. Technical Rigor & Clean Architecture
Vibe-coded sites often have messy, prototype-level code.
- **The Cliché:** Spaghetti code, orphaned unused logic, massive unoptimized JS bundles, missing accessibility (no ARIA, missing alt text, poor contrast), and broken semantic HTML.
- **The Human Fix:** Ensure semantic HTML5. Implement strict accessibility standards (WCAG guidelines). Clean up dead code, optimize image assets, and ensure the component architecture is modular, maintainable, and built for scale.

## Audit Checklist
When reviewing a project with the Humanweb skill, ask:
- [ ] Is the layout specific to the content, or is it a generic SaaS template?
- [ ] Does the color scheme and typography feel uniquely branded?
- [ ] Are we relying too heavily on default UI components without stylistic overrides?
- [ ] Do all buttons and inputs have proper interactive states (hover, focus, disabled, loading)?
- [ ] Does the design gracefully handle awkward or lengthy real-world data?
- [ ] Is the copy concrete and distinct, avoiding cliché "AI" buzzwords?
- [ ] Is the underlying code clean, accessible, and free of orphaned logic?
