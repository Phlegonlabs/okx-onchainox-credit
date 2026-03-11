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

**Aesthetic:** Vercel-style — pure black/white/gray, minimal, flat, clean typography, sharp corners, no decorative effects. Financial infrastructure that feels precise and developer-grade.

**Color palette:**
```css
--background: #000;           /* pure black */
--foreground: #fff;            /* primary text */
--card: #0a0a0a;               /* card surface */
--border: #2a2a2a;             /* borders */
--muted: #1a1a1a;              /* muted surface */
--text-primary: #fff;          /* primary text */
--text-secondary: #888;        /* secondary text */
--text-dim: #666;              /* dim / label text */
--text-faint: #444;            /* placeholder, disabled */

/* Score tier colours (muted functional — only used for data) */
--score-excellent: #059669;
--score-good: #2563eb;
--score-fair: #d97706;
--score-poor: #dc2626;
```

**Typography:**
- Body / UI: `Geist Sans` via `geist/font/sans` — clean, geometric sans-serif
- Data / addresses: `Geist Mono` via `geist/font/mono` — monospaced for numbers and wallet addresses
- No display/serif fonts — headings use Geist Sans with `font-medium` or `font-semibold`

**Component patterns:**
- Cards: `bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-5`
- Primary button: `bg-white text-black rounded-md px-4 py-2.5 text-sm font-medium`
- Secondary button: `border border-[#333] text-white rounded-md px-4 py-2.5 text-sm`
- Input: `bg-transparent border border-[#2a2a2a] rounded-md h-10 px-3 text-sm`
- Labels: `text-xs text-[#666]` or `text-xs text-[#888]`
- Border radius: `rounded-lg` (8px) max, `rounded-md` (6px) for small elements
- No gradients, no blurs, no glows, no shadows, no decorative elements

**Score gauge:** Arc-style gauge (SVG), not a bar. Score animates counting up from 300 on load. Needle-like indicator. Colored in tier color against `#2a2a2a` track. No glow effects.

**Wallet addresses:** Always truncated `0xABCD...1234` in Geist Mono. Full address on hover via title attribute.

**Motion:** Subtle `animate-rise` (8px translateY, 500ms) on page load with staggered delays. No bouncy animations — everything is precise and minimal.
