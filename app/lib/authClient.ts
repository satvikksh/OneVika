const AUTH_ERROR_MESSAGES: Record<string, string> = {
  Configuration:
    "Google authentication is not configured correctly on the server.",
  AccessDenied: "Google sign-in was cancelled or access was denied.",
  Verification: "The sign-in link is no longer valid. Please try again.",
  OAuthSignin: "Could not start Google sign-in. Please try again.",
  OAuthCallback: "Google sign-in could not be completed. Please try again.",
  OAuthCreateAccount:
    "We could not create your Google account session. Please try again.",
  Callback: "Authentication could not be completed. Please try again.",
  OAuthAccountNotLinked:
    "This email already exists with another sign-in method. Please use the original method first.",
};

export function getSafeCallbackUrl(
  callbackUrl: string | null | undefined,
  fallback = "/"
) {
  if (!callbackUrl) return fallback;

  // Keep redirects inside this application. NextAuth also validates redirects
  // server-side, but normalizing here prevents confusing client-side behavior.
  if (callbackUrl.startsWith("/") && !callbackUrl.startsWith("//")) {
    return callbackUrl;
  }

  return fallback;
}

export function getAuthErrorMessage(errorCode: string | null | undefined) {
  if (!errorCode) return "";
  return (
    AUTH_ERROR_MESSAGES[errorCode] ||
    "Authentication failed. Please try again."
  );
}
