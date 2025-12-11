// Global callback for logout on 401 (used by API interceptor)
let logoutCallback: (() => void) | null = null;

export function setLogoutCallback(callback: () => void) {
  logoutCallback = callback;
}

export function triggerLogout() {
  if (logoutCallback) {
    logoutCallback();
  }
}
