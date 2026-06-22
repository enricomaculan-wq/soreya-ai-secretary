const DEFAULT_POST_LOGIN_PATH = "/dashboard";

export function resolvePostLoginPath(nextPath: string | null | undefined) {
  if (!nextPath || !nextPath.startsWith("/") || nextPath.startsWith("//")) {
    return DEFAULT_POST_LOGIN_PATH;
  }

  if (nextPath.startsWith("/login") || nextPath.startsWith("/app")) {
    return DEFAULT_POST_LOGIN_PATH;
  }

  return nextPath;
}
