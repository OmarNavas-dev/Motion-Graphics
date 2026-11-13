// Exact aliases for old Motion Studio font URLs in imported projects.
const legacyFonts = new Map([
  ['/assets/fonts/Inter-Regular.woff2', 'inter-500.woff2'],
  ['/assets/fonts/Inter-Medium.woff2', 'inter-500.woff2'],
  ['/assets/fonts/Inter-Bold.woff2', 'inter-800.woff2'],
  ['/assets/fonts/Inter-ExtraBold.woff2', 'inter-800.woff2'],
]);

export function legacyFontFilename(pathname) {
  return typeof pathname === 'string' ? legacyFonts.get(pathname) ?? null : null;
}
