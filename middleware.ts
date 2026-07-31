import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// 1. Definimos cuáles son las rutas VIP (solo para usuarios registrados)
const isProtectedRoute = createRouteMatcher([
  '/analisis(.*)',
  '/impuestos(.*)',
  '/facturas(.*)'
]);

// 2. El Guardaespaldas bloquea si alguien intenta entrar sin estar logueado (VERSIÓN ASÍNCRONA)
export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect(); // Fíjate en el await y que ya no lleva paréntesis en auth()
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};