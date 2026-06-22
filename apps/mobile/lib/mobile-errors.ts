export function translateMobileError(code: string, translate: (key: string) => string) {
  switch (code) {
    case 'session_required':
      return translate('mobile.errors.sessionRequired');
    case 'web_app_url_missing':
      return translate('mobile.errors.webAppUrlMissing');
    case 'request_failed':
      return translate('mobile.errors.requestFailed');
    default:
      return code.includes('_') ? translate('common.unavailable') : code;
  }
}
