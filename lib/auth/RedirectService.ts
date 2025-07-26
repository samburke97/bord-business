export class RedirectService {
  static handleRedirect(url: string, baseUrl: string): string {
    // OAuth error redirects
    if (url.includes("/oauth/error")) {
      return url.startsWith(baseUrl) ? url : `${baseUrl}${url}`;
    }

    // OAuth setup redirect
    if (url === baseUrl || url === `${baseUrl}/`) {
      return `${baseUrl}/oauth/setup`;
    }

    // Specific OAuth routes
    if (url.includes("oauth/setup") || url.includes("signup/complete")) {
      return url.startsWith(baseUrl) ? url : `${baseUrl}${url}`;
    }

    // Error cases
    if (
      url.includes("error=OAuthAccountNotLinked") ||
      url.includes("error=AccessDenied")
    ) {
      return `${baseUrl}/oauth/error?error=AccountExistsWithDifferentMethod&attempted=oauth`;
    }

    // Relative URLs
    if (url.startsWith("/")) {
      return `${baseUrl}${url}`;
    }

    // Same domain URLs
    if (url.startsWith(baseUrl)) {
      return url;
    }

    return baseUrl;
  }
}
