# Image assets

Files in this folder are served at `/assets/images/<filename>` at runtime
(Angular's `public/` directory is exposed as the web root).

## Drop your images here

| File path                            | Used by                                  | Suggested format               |
|--------------------------------------|-------------------------------------------|--------------------------------|
| `/assets/images/login-bg.png`        | Login screen full-page background         | JPG/WebP, 1920×1080+, ~200 KB |
| `/assets/images/app-bg.png`          | Authenticated main-layout background      | JPG/WebP, subtle/dim image     |
| `/assets/images/logo.svg` (optional) | Future replacement for the inline "W" logo| SVG with transparent background|

## How the CSS uses them

- **Login** ([features/auth/login.component.css](../../src/app/features/auth/login.component.css))
  layers a translucent dark overlay over `login-bg.png` and falls back to
  the existing radial-gradient design when the file is missing.
- **Main layout** ([shared/components/app-shell.component.ts](../../src/app/shared/components/app-shell.component.ts))
  uses `app-bg.png` with `background-attachment: fixed` and a soft overlay
  for readability.

## Replacing or removing

Just drop the file with the matching name and refresh the browser. If you
don't supply an image, the gradient backgrounds remain — no code change
required.
