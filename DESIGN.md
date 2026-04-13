# Photo Route Mapper Design System

## Direction
- Warm editorial travel product, not a dev tool dashboard
- Feels like a trip journal laid over an atlas
- Prioritize calm hierarchy, legible metadata, and photo-first storytelling

## Brand Voice
- Grounded
- Curious
- Precise
- Human

## Color System
- **Canvas** `#f3ecdf`: Main page background
- **Canvas Deep** `#e5dac7`: Secondary background gradients and separators
- **Surface** `rgba(255, 250, 242, 0.9)`: Elevated panels
- **Surface Strong** `#fffaf2`: Cards and modal surfaces
- **Ink** `#1b2430`: Primary text
- **Ink Soft** `#51606f`: Secondary text
- **Accent** `#c46334`: Primary CTA, route line, highlighted states
- **Accent Deep** `#8e3f1f`: Hover/pressed CTA
- **Accent Soft** `rgba(196, 99, 52, 0.12)`: Pills and subtle emphasis
- **Forest** `#1f6b5c`: Start state
- **Rose** `#b4415f`: End state
- **Line** `rgba(87, 67, 39, 0.14)`: Borders

## Typography
- **Display**: Cormorant Garamond, serif, used for hero headlines and section accents
- **Body**: Manrope, sans-serif, used for product UI and metadata
- Hero should feel editorial, not SaaS
- Labels should be compact and uppercase with generous tracking

## Spacing and Shape
- Large rounded containers: `28px` to `36px`
- Inner cards: `20px` to `24px`
- Use generous whitespace in shell layout
- Avoid cramped control clusters

## Components
- **Hero shell**: oversized editorial headline on the left, compact action cluster on the right
- **Panels**: layered paper-like surfaces with soft borders and shadows
- **Trip cards**: more like collection cards than admin rows
- **Timeline cards**: thumbnail-led with minimal chrome
- **Map badges**: quiet, translucent, atlas-like
- **Popup card**: compact journal card, not a form-heavy admin modal

## Motion
- Keep motion subtle
- Favor opacity, shadow, and slight translate changes over large scale effects

## Do Not
- Do not use generic dashboard blue/purple styling
- Do not make controls visually heavier than photos and route content
- Do not flatten everything onto pure white
