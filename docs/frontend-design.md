---
name: frontend-design
description: Create distinctive, production-grade frontend interfaces with high design quality. Use this skill when the user asks to build web components, pages, artifacts, posters, or applications (examples include websites, landing pages, dashboards, React components, HTML/CSS layouts, or when styling/beautifying any web UI). Generates creative, polished code and UI design that avoids generic AI aesthetics.
license: Complete terms in LICENSE.txt
---

This skill guides creation of distinctive, production-grade frontend interfaces that avoid generic "AI slop" aesthetics. Implement real working code with exceptional attention to aesthetic details and creative choices.

The user provides frontend requirements: a component, page, application, or interface to build. They may include context about the purpose, audience, or technical constraints.

## Design Thinking

Before coding, understand the context and commit to a BOLD aesthetic direction:
- **Purpose**: What problem does this interface solve? Who uses it?
- **Tone**: Pick an extreme: brutally minimal, maximalist chaos, retro-futuristic, organic/natural, luxury/refined, playful/toy-like, editorial/magazine, brutalist/raw, art deco/geometric, soft/pastel, industrial/utilitarian, etc. There are so many flavors to choose from. Use these for inspiration but design one that is true to the aesthetic direction.
- **Constraints**: Technical requirements (framework, performance, accessibility).
- **Differentiation**: What makes this UNFORGETTABLE? What's the one thing someone will remember?

**CRITICAL**: Choose a clear conceptual direction and execute it with precision. Bold maximalism and refined minimalism both work - the key is intentionality, not intensity.

Then implement working code (HTML/CSS/JS, React, Vue, etc.) that is:
- Production-grade and functional
- Visually striking and memorable
- Cohesive with a clear aesthetic point-of-view
- Meticulously refined in every detail

## Frontend Aesthetics Guidelines

Focus on:
- **Typography**: Choose fonts that are beautiful, unique, and interesting. Avoid generic fonts like Arial and Inter; opt instead for distinctive choices that elevate the frontend's aesthetics; unexpected, characterful font choices. Pair a distinctive display font with a refined body font.
- **Color & Theme**: Commit to a cohesive aesthetic. Use CSS variables for consistency. Dominant colors with sharp accents outperform timid, evenly-distributed palettes.
- **Motion**: Use animations for effects and micro-interactions. Prioritize CSS-only solutions for HTML. Use Motion library for React when available. Focus on high-impact moments: one well-orchestrated page load with staggered reveals (animation-delay) creates more delight than scattered micro-interactions. Use scroll-triggering and hover states that surprise.
- **Spatial Composition**: Unexpected layouts. Asymmetry. Overlap. Diagonal flow. Grid-breaking elements. Generous negative space OR controlled density.
- **Backgrounds & Visual Details**: Create atmosphere and depth rather than defaulting to solid colors. Add contextual effects and textures that match the overall aesthetic. Apply creative forms like gradient meshes, noise textures, geometric patterns, layered transparencies, dramatic shadows, decorative borders, custom cursors, and grain overlays.

NEVER use generic AI-generated aesthetics like overused font families (Inter, Roboto, Arial, system fonts), cliched color schemes (particularly purple gradients on white backgrounds), predictable layouts and component patterns, and cookie-cutter design that lacks context-specific character.

Interpret creatively and make unexpected choices that feel genuinely designed for the context. No design should be the same. Vary between light and dark themes, different fonts, different aesthetics. NEVER converge on common choices (Space Grotesk, for example) across generations.

**IMPORTANT**: Match implementation complexity to the aesthetic vision. Maximalist designs need elaborate code with extensive animations and effects. Minimalist or refined designs need restraint, precision, and careful attention to spacing, typography, and subtle details. Elegance comes from executing the vision well.

Remember: Claude is capable of extraordinary creative work. Don't hold back, show what can truly be created when thinking outside the box and committing fully to a distinctive vision.

## Project-Specific Design Direction: OKX OnchainOS Credit

**Aesthetic:** Institutional Finance — deep midnight navy surfaces, warm gold accent, serif display typography. Sharp rectangles (no rounded corners). Editorial precision with restrained luxury. Dark-mode-only.

**Color palette (CSS custom properties in `globals.css`):**
```css
/* Surfaces — deep navy, not pure black */
--surface-base: #090c14;
--surface-raised: #0f1320;
--surface-overlay: #161b2e;

/* Borders */
--border-subtle: #1c2438;
--border-default: #252e42;

/* Text — warm off-white, not pure white */
--text-primary: #e8e6e1;
--text-secondary: #7c8597;
--text-tertiary: #4a5568;

/* Brand accent — warm gold */
--accent-gold: #c5a24d;
--accent-gold-hover: #d4b36a;
--accent-gold-dim: rgba(197, 162, 77, 0.12);

/* Score tier colours (functional — data only) */
--score-excellent: #2dd4a0;
--score-good: #5b9cf0;
--score-fair: #c5a24d;
--score-poor: #ef6b6b;

/* Semantic */
--error: #ef6b6b;
--error-bg: rgba(239, 107, 107, 0.06);
--error-border: rgba(239, 107, 107, 0.2);
--success-bg: rgba(45, 212, 160, 0.06);
--success-border: rgba(45, 212, 160, 0.2);
```

**Typography:**
- Display / headings: `Instrument Serif` via `next/font/google` — weight 400, normal + italic. Applied via `font-display` class (CSS variable `--font-instrument-serif`).
- Body / UI: `Geist Sans` via `geist/font/sans` — clean, geometric sans-serif
- Data / addresses: `Geist Mono` via `geist/font/mono` — monospaced for numbers and wallet addresses
- Headings use `font-display` (Instrument Serif) for editorial feel

**Component patterns:**
- Sections: `border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-5 md:p-6` — no rounded corners
- Primary button: `bg-[var(--accent-gold)] text-[var(--surface-base)] px-4 py-2.5 text-sm font-medium` — gold, sharp edges
- Secondary button: `border border-[var(--border-default)] text-[var(--text-secondary)] py-2 text-sm`
- Input: `bg-transparent border border-[var(--border-subtle)] h-10 px-3 text-sm text-[var(--text-primary)]` — gold focus ring via `focus:border-[var(--accent-gold)]`
- Labels: `text-[11px] uppercase tracking-[0.15em] text-[var(--text-tertiary)]` — uppercase tracking for editorial precision
- Border radius: none (sharp rectangles throughout). No `rounded-*` classes.
- No gradients, no blurs (except header backdrop), no shadows, no decorative elements

**Layout:**
- Max width: `max-w-6xl` for content containers
- Page padding: `px-6 pb-12 pt-8 md:px-10`
- Section gap: `gap-8`
- Header: `backdrop-blur-md` with gold dot indicator before logo text

**Score gauge:** Arc-style SVG gauge. Score animates counting up from 300. Thin needle indicator (w-px). Colored in tier color against `var(--border-subtle)` track. Subtle glow: `boxShadow: '0 0 12px ${accent}40'`. Easing: `cubic-bezier(0.16, 1, 0.3, 1)`, 1200ms duration. Score number in serif font (`font-display`).

**Wallet addresses:** Always truncated `0xABCD...1234` in Geist Mono. Full address on hover via title attribute.

**Motion:** `animate-enter` (12px translateY, 600ms, `cubic-bezier(0.16, 1, 0.3, 1)`) on page load with staggered delays (`--stagger` CSS variable). Gold selection color: `::selection { background: rgba(197, 162, 77, 0.3) }`. No bouncy animations.

**Key differentiators:**
- Serif headlines create editorial gravitas uncommon in Web3
- Gold accent avoids the cyan/purple AI aesthetic
- Deep navy (not pure black) adds warmth and sophistication
- Sharp rectangles feel more institutional than rounded corners
- Uppercase tracking on labels adds precision without complexity
