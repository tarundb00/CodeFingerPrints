export function normalizeGitHubRepoPath(value, fallbackOwner = '') {
  if (value == null) return '';

  const text = String(value).trim();
  if (!text) return '';

  const withoutPrefix = text
    .replace(/^https?:\/\/github\.com\//i, '')
    .replace(/^github\.com\//i, '')
    .replace(/\.git$/i, '')
    .replace(/^\/+|\/+$/g, '');

  if (!withoutPrefix) return '';

  if (withoutPrefix.includes('/')) {
    return withoutPrefix;
  }

  const owner = String(fallbackOwner || '').trim().replace(/^\/+|\/+$/g, '');
  if (owner) {
    return `${owner}/${withoutPrefix}`;
  }

  return withoutPrefix;
}

export function buildGitHubRepoUrl(value, fallbackOwner = '') {
  const normalized = normalizeGitHubRepoPath(value, fallbackOwner);
  return normalized ? `https://github.com/${normalized}` : '';
}

export function buildGitHubCloneUrl(value, fallbackOwner = '') {
  const normalized = normalizeGitHubRepoPath(value, fallbackOwner);
  return normalized ? `https://github.com/${normalized}.git` : '';
}
