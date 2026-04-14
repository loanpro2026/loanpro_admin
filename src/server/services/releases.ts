import { getEnv } from '@/config/env';

export type GitHubRelease = {
  id: number;
  tagName: string;
  name: string;
  prerelease: boolean;
  draft: boolean;
  publishedAt: string;
  htmlUrl: string;
};

export type GitHubReleaseFeed = {
  configured: boolean;
  owner?: string;
  repo?: string;
  items: GitHubRelease[];
  error?: string;
};

type GitHubApiRelease = {
  id: number;
  tag_name: string;
  name: string | null;
  prerelease: boolean;
  draft: boolean;
  published_at: string | null;
  html_url: string;
};

export async function getGitHubReleaseFeed(limit = 20): Promise<GitHubReleaseFeed> {
  const env = getEnv();
  const owner = String(env.GITHUB_RELEASE_OWNER || '').trim();
  const repo = String(env.GITHUB_RELEASE_REPO || '').trim();
  const token = String(env.GITHUB_TOKEN || '').trim();

  if (!owner || !repo || !token) {
    return {
      configured: false,
      owner: owner || undefined,
      repo: repo || undefined,
      items: [],
      error: 'GitHub release integration is not fully configured',
    };
  }

  const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/releases?per_page=${Math.min(50, Math.max(1, limit))}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      return {
        configured: true,
        owner,
        repo,
        items: [],
        error: `GitHub API returned ${response.status}`,
      };
    }

    const payload = (await response.json()) as GitHubApiRelease[];
    const items: GitHubRelease[] = payload.map((item) => ({
      id: item.id,
      tagName: item.tag_name,
      name: item.name || item.tag_name,
      prerelease: Boolean(item.prerelease),
      draft: Boolean(item.draft),
      publishedAt: item.published_at || '',
      htmlUrl: item.html_url,
    }));

    return {
      configured: true,
      owner,
      repo,
      items,
    };
  } catch (error) {
    return {
      configured: true,
      owner,
      repo,
      items: [],
      error: error instanceof Error ? error.message : 'Failed to fetch GitHub releases',
    };
  }
}
