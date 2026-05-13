export const environment = {
  production: false,

  // All AJAX/API calls go through the gateway at 8080
  apiBase: 'http://localhost:8080',

  // Google OAuth MUST go directly to auth-service at 8081 — NOT through gateway.
  // Reason: OAuth2 is a browser redirect (not AJAX), so CORS doesn't apply.
  // The reactive gateway (WebFlux) cannot preserve the stateful HttpSession that
  // Spring Security OAuth2 needs for the Google callback round-trip.
  googleOAuthUrl: 'http://localhost:8081/oauth2/authorization/google'
};
