import {
  extractEpisodePlayback,
  filterThaiDubbedSeries,
  mapExternalCatalogPayload,
  normalizePlatform,
  parseExternalEpisodes,
} from '../src/services/chineseSeriesAdapter.ts';
import type { ResolvedEpisodePlayback } from '../src/services/chineseSeriesAdapter.ts';
import type { SeriesItem } from '../src/types/series.ts';

export const SERIESJEEN_V1_URL = 'https://api.seriesjeen.online';
export const SERIESJEEN_V2_URL = 'https://api-v2.seriesjeen.online';

export const ALLOWED_SERIESJEEN_ORIGINS: ReadonlySet<string> = new Set([
  SERIESJEEN_V1_URL,
  SERIESJEEN_V2_URL,
]);

export interface SeriesJeenV2Platform {
  id: number;
  name: string;
  drama_count: number;
  episode_count: number;
  has_access: boolean;
}

export interface SeriesJeenConfig {
  v1BaseUrl: string;
  v2BaseUrl: string;
  preferVersion: 'v2' | 'v1';
  apiKey: string;
  platforms: string[];
  locale: string;
  pageSize: number;
  timeoutMs: number;
  cacheTtlMs: number;
}

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const DEFAULT_V1_PLATFORMS = ['dramabox', 'reelshort', 'shortmax', 'wetv', 'iqiyi'];
const SAFE_SLUG_RE = /^[a-z0-9_-]{1,32}$/i;
const SAFE_ID_RE = /^[a-zA-Z0-9_-]{1,80}$/;

const responseCache = new Map<string, CacheEntry<unknown>>();
const inflightRequests = new Map<string, Promise<unknown>>();

export function isValidPlatformSlug(value: string): boolean {
  return SAFE_SLUG_RE.test(value);
}

export function isValidSeriesIdentifier(value: string): boolean {
  return SAFE_ID_RE.test(value);
}

export function normalizeAllowedSeriesJeenOrigin(raw: string | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    const origin = parsed.origin.replace(/\/+$/, '');
    return ALLOWED_SERIESJEEN_ORIGINS.has(origin) ? origin : null;
  } catch {
    return null;
  }
}

export function clearSeriesJeenCache(): void {
  responseCache.clear();
  inflightRequests.clear();
}

export function getSeriesJeenConfig(env: NodeJS.ProcessEnv = process.env): SeriesJeenConfig | null {
  const apiKey = (env.SERIESJEEN_API_KEY || '').trim();
  if (!apiKey) return null;

  const baseHint = normalizeAllowedSeriesJeenOrigin(env.SERIESJEEN_API_BASE_URL);
  const preferVersion: 'v2' | 'v1' =
    env.SERIESJEEN_PREFER_VERSION === 'v1' || baseHint === SERIESJEEN_V1_URL ? 'v1' : 'v2';

  const rawPlatforms = (env.SERIESJEEN_PLATFORMS || DEFAULT_V1_PLATFORMS.join(','))
    .split(',')
    .map((p) => p.trim().toLowerCase())
    .filter((p) => isValidPlatformSlug(p));

  const platforms =
    rawPlatforms.length > 0 ? Array.from(new Set(rawPlatforms)) : DEFAULT_V1_PLATFORMS;
  const locale = (env.SERIESJEEN_LOCALE || 'th').trim().slice(0, 12) || 'th';
  const pageSize = Math.min(50, Math.max(5, Number(env.SERIESJEEN_PAGE_SIZE || 20) || 20));
  const timeoutMs = Math.min(
    20_000,
    Math.max(2_000, Number(env.SERIESJEEN_TIMEOUT_MS || 8_000) || 8_000)
  );
  const cacheTtlMs = Math.min(
    600_000,
    Math.max(5_000, Number(env.SERIESJEEN_CACHE_TTL_MS || 60_000) || 60_000)
  );

  return {
    v1BaseUrl: SERIESJEEN_V1_URL,
    v2BaseUrl: SERIESJEEN_V2_URL,
    preferVersion,
    apiKey,
    platforms,
    locale,
    pageSize,
    timeoutMs,
    cacheTtlMs,
  };
}

export function buildSeriesJeenHeaders(apiKey: string): Record<string, string> {
  const cleanKey = apiKey.trim();
  return {
    Authorization: /^bearer\s+/i.test(cleanKey) ? cleanKey : `Bearer ${cleanKey}`,
    Accept: 'application/json',
  };
}

async function getJsonStrict(
  baseUrl: string,
  endpointPath: string,
  config: SeriesJeenConfig,
  options?: {
    params?: Record<string, string | number | undefined>;
    ttlMs?: number;
    fetchImpl?: typeof fetch;
  }
): Promise<unknown> {
  // Enforce hard allowlist: ONLY api.seriesjeen.online & api-v2.seriesjeen.online
  if (!ALLOWED_SERIESJEEN_ORIGINS.has(baseUrl)) {
    throw new Error('DISALLOWED_ORIGIN');
  }

  const search = new URLSearchParams();
  if (options?.params) {
    for (const [key, val] of Object.entries(options.params)) {
      if (val !== undefined && val !== '') {
        search.set(key, String(val));
      }
    }
  }

  const qs = search.toString();
  const fullUrl = `${baseUrl}${endpointPath}${qs ? `?${qs}` : ''}`;
  const ttlMs = options?.ttlMs ?? config.cacheTtlMs;
  const fetchImpl = options?.fetchImpl ?? fetch;

  if (ttlMs > 0) {
    const cached = responseCache.get(fullUrl);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }
  }

  const inflight = inflightRequests.get(fullUrl);
  if (inflight) return inflight;

  const promise = (async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), config.timeoutMs);

    try {
      const res = await fetchImpl(fullUrl, {
        method: 'GET',
        headers: buildSeriesJeenHeaders(config.apiKey),
        signal: controller.signal,
      });
      if (!res.ok) {
        throw new Error(`UPSTREAM_STATUS_${res.status}`);
      }
      const json = (await res.json()) as unknown;
      if (ttlMs > 0) {
        responseCache.set(fullUrl, {
          value: json,
          expiresAt: Date.now() + ttlMs,
        });
      }
      return json;
    } finally {
      clearTimeout(timer);
      inflightRequests.delete(fullUrl);
    }
  })();

  inflightRequests.set(fullUrl, promise);
  return promise;
}

/**
 * Series Jeen V2 (`https://api-v2.seriesjeen.online`):
 * Discovers accessible platforms via `GET /api/platforms`.
 */
export async function fetchSeriesJeenV2Platforms(
  config: SeriesJeenConfig,
  fetchImpl: typeof fetch = fetch
): Promise<SeriesJeenV2Platform[]> {
  const raw = (await getJsonStrict(config.v2BaseUrl, '/api/platforms', config, {
    ttlMs: Math.max(config.cacheTtlMs, 120_000),
    fetchImpl,
  })) as Record<string, unknown>;

  const items = Array.isArray(raw?.items) ? raw.items : [];
  return items
    .filter((p): p is Record<string, unknown> => Boolean(p && typeof p === 'object'))
    .map((p) => ({
      id: Number(p.id),
      name: String(p.name || ''),
      drama_count: Number(p.drama_count || 0),
      episode_count: Number(p.episode_count || 0),
      has_access: Boolean(p.has_access),
    }))
    .filter((p) => Number.isFinite(p.id) && p.id > 0 && p.has_access && p.drama_count > 0);
}

/**
 * Fetches live dramas from Series Jeen V2 (`GET /api/platforms/{platform_id}/dramas`).
 */
export async function fetchSeriesJeenV2Catalog(
  config: SeriesJeenConfig,
  options?: {
    platform?: string;
    query?: string;
    genre?: string;
    sort?: 'latest' | 'title' | 'episodes';
    page?: number;
    pageSize?: number;
    maxPlatforms?: number;
    thaiDubOnly?: boolean;
    compactEpisodes?: boolean;
  },
  fetchImpl: typeof fetch = fetch
): Promise<SeriesItem[]> {
  const accessible = await fetchSeriesJeenV2Platforms(config, fetchImpl);
  if (accessible.length === 0) {
    throw new Error('V2_NO_ACCESSIBLE_PLATFORMS');
  }

  const requestedPlatform = options?.platform?.trim().toLowerCase();
  let selected = accessible;
  if (requestedPlatform && requestedPlatform !== 'all') {
    const matched = accessible.filter(
      (p) =>
        p.name.toLowerCase().includes(requestedPlatform) ||
        normalizePlatform(p.name) === requestedPlatform
    );
    if (matched.length > 0) {
      selected = matched;
    }
  }

  const maxPlatforms = options?.maxPlatforms
    ? Math.max(1, Math.floor(options.maxPlatforms))
    : selected.length;
  const batch = selected.slice(0, maxPlatforms);
  const page = Math.max(1, Math.floor(options?.page || 1));
  const pageSize = Math.min(50, Math.max(1, Math.floor(options?.pageSize || config.pageSize)));
  const q = options?.query?.trim().slice(0, 80) || undefined;
  const genre =
    options?.genre && options.genre !== 'ทั้งหมด' ? options.genre.trim().slice(0, 40) : undefined;
  const sort = options?.sort || 'latest';

  const settled = await Promise.allSettled(
    batch.map(async (plat) => {
      const json = await getJsonStrict(
        config.v2BaseUrl,
        `/api/platforms/${encodeURIComponent(String(plat.id))}/dramas`,
        config,
        {
          params: {
            page,
            page_size: pageSize,
            sort,
            q,
            genre,
          },
          fetchImpl,
        }
      );

      const mapped = mapExternalCatalogPayload(json, {
        defaultPlatform: String(plat.id),
        platformDisplayName: plat.name,
        apiVersion: 'v2',
        compactEpisodes: options?.compactEpisodes,
      });
      return options?.thaiDubOnly ? filterThaiDubbedSeries(mapped) : mapped;
    })
  );

  const merged: SeriesItem[] = [];
  const seen = new Set<string>();
  let okCount = 0;

  for (const res of settled) {
    if (res.status === 'fulfilled') {
      okCount += 1;
      for (const item of res.value) {
        if (!seen.has(item.id)) {
          seen.add(item.id);
          merged.push(item);
        }
      }
    }
  }

  if (okCount === 0) {
    throw new Error('V2_CATALOG_FAILED');
  }

  return merged;
}

/**
 * Deeply harvests the latest updated and additional Thai-dubbed dramas across ALL accessible
 * Series Jeen V2 platforms (with V1 fallback), paginating at max page_size (50) and invoking
 * `onBatch` incrementally so the server can persist collected movies immediately.
 */
export async function fetchSeriesJeenDeepCatalog(
  config: SeriesJeenConfig,
  options?: {
    startPage?: number;
    maxPagesPerPlatform?: number;
    pageSize?: number;
    sort?: 'latest' | 'title' | 'episodes';
    thaiDubOnly?: boolean;
    compactEpisodes?: boolean;
    onBatch?: (batch: SeriesItem[]) => void;
  },
  fetchImpl: typeof fetch = fetch
): Promise<SeriesItem[]> {
  const startPage = Math.max(1, Math.floor(options?.startPage || 1));
  const maxPages = Math.min(25, Math.max(1, Math.floor(options?.maxPagesPerPlatform || 6)));
  const pageSize = Math.min(50, Math.max(10, Math.floor(options?.pageSize || 50)));
  const sort = options?.sort || 'latest';
  const thaiDubOnly = options?.thaiDubOnly !== false;
  const compactEpisodes = options?.compactEpisodes !== false;

  const collected = new Map<string, SeriesItem>();

  try {
    const accessible = await fetchSeriesJeenV2Platforms(config, fetchImpl);
    if (accessible.length === 0) {
      throw new Error('V2_NO_ACCESSIBLE_PLATFORMS');
    }

    // Track per-platform pagination caps so we stop as soon as a platform finishes
    const platformTotalPages = new Map<number, number>();
    const exhaustedPlatforms = new Set<number>();

    // Fetch page-by-page across all platforms (so page 1 latest of EVERY platform arrives first!)
    for (let page = startPage; page < startPage + maxPages; page++) {
      const activePlatforms = accessible.filter((plat) => {
        if (exhaustedPlatforms.has(plat.id)) return false;
        const knownMax = platformTotalPages.get(plat.id);
        return knownMax === undefined || page <= knownMax;
      });

      if (activePlatforms.length === 0) break;

      // Gentle concurrency of 3 platforms at a time to stay respectful of upstream rate limits
      for (let i = 0; i < activePlatforms.length; i += 3) {
        const chunk = activePlatforms.slice(i, i + 3);
        const settled = await Promise.allSettled(
          chunk.map(async (plat) => {
            const json = (await getJsonStrict(
              config.v2BaseUrl,
              `/api/platforms/${encodeURIComponent(String(plat.id))}/dramas`,
              config,
              {
                params: {
                  page,
                  page_size: pageSize,
                  sort,
                },
                ttlMs: config.cacheTtlMs,
                fetchImpl,
              }
            )) as Record<string, unknown>;

            const totalPages = Number(json?.total_pages || 0);
            if (Number.isFinite(totalPages) && totalPages > 0) {
              platformTotalPages.set(plat.id, totalPages);
            }

            const rawItems = Array.isArray(json?.items) ? json.items : [];
            if (rawItems.length < pageSize) {
              exhaustedPlatforms.add(plat.id);
            }

            const mapped = mapExternalCatalogPayload(json, {
              defaultPlatform: String(plat.id),
              platformDisplayName: plat.name,
              apiVersion: 'v2',
              compactEpisodes,
            });

            return thaiDubOnly ? filterThaiDubbedSeries(mapped) : mapped;
          })
        );

        const batchNew: SeriesItem[] = [];
        for (let idx = 0; idx < settled.length; idx++) {
          const result = settled[idx];
          const plat = chunk[idx];
          if (result.status === 'fulfilled') {
            for (const item of result.value) {
              if (!collected.has(item.id)) {
                collected.set(item.id, item);
                batchNew.push(item);
              }
            }
          } else {
            const msg = result.reason instanceof Error ? result.reason.message : '';
            if (msg.includes('429') || msg.includes('403')) {
              exhaustedPlatforms.add(plat.id);
            }
          }
        }

        if (batchNew.length > 0) {
          options?.onBatch?.(batchNew);
        }
      }
    }

    if (collected.size > 0) {
      return Array.from(collected.values());
    }
  } catch {
    // Fall through to V1 fallback
  }

  // Automatic V1 fallback (`https://api.seriesjeen.online`)
  const v1Items = await fetchSeriesJeenV1Catalog(
    config,
    {
      page: startPage,
      pageSize,
    },
    fetchImpl
  );
  const filteredV1 = thaiDubOnly ? filterThaiDubbedSeries(v1Items) : v1Items;
  if (filteredV1.length > 0) {
    options?.onBatch?.(filteredV1);
  }
  return filteredV1;
}

/**
 * Fetches live series from Series Jeen V1 (`https://api.seriesjeen.online`).
 */
export async function fetchSeriesJeenV1Catalog(
  config: SeriesJeenConfig,
  options?: {
    platform?: string;
    query?: string;
    page?: number;
    pageSize?: number;
  },
  fetchImpl: typeof fetch = fetch
): Promise<SeriesItem[]> {
  const page = Math.max(1, Math.floor(options?.page || 1));
  const pageSize = Math.min(50, Math.max(1, Math.floor(options?.pageSize || config.pageSize)));
  const requestedPlatform = options?.platform?.trim().toLowerCase();

  const targetPlatforms =
    requestedPlatform && requestedPlatform !== 'all' && isValidPlatformSlug(requestedPlatform)
      ? [requestedPlatform]
      : config.platforms;

  const query = options?.query?.trim().slice(0, 80) || '';

  const settled = await Promise.allSettled(
    targetPlatforms.map(async (platform) => {
      const path = query
        ? `/api/platform/${encodeURIComponent(platform)}/search`
        : `/api/platform/${encodeURIComponent(platform)}/list`;

      const json = await getJsonStrict(config.v1BaseUrl, path, config, {
        params: {
          ...(query ? { q: query, keyword: query } : {}),
          page,
          page_size: pageSize,
          locale: config.locale,
        },
        fetchImpl,
      });

      return mapExternalCatalogPayload(json, {
        defaultPlatform: platform,
        apiVersion: 'v1',
      });
    })
  );

  const merged: SeriesItem[] = [];
  const seen = new Set<string>();
  let okCount = 0;

  for (const res of settled) {
    if (res.status === 'fulfilled') {
      okCount += 1;
      for (const item of res.value) {
        if (!seen.has(item.id)) {
          seen.add(item.id);
          merged.push(item);
        }
      }
    }
  }

  if (okCount === 0) {
    throw new Error('V1_CATALOG_FAILED');
  }

  return merged;
}

/**
 * Fetches live catalog using Series Jeen V2 (`api-v2.seriesjeen.online`) and V1 (`api.seriesjeen.online`)
 * with automatic failover between the two allowed domains.
 */
export async function fetchSeriesJeenCatalog(
  config: SeriesJeenConfig,
  options?: {
    platform?: string;
    query?: string;
    genre?: string;
    page?: number;
    pageSize?: number;
  },
  fetchImpl: typeof fetch = fetch
): Promise<SeriesItem[]> {
  const order: Array<'v2' | 'v1'> =
    config.preferVersion === 'v1' ? ['v1', 'v2'] : ['v2', 'v1'];

  let lastError: unknown = new Error('UPSTREAM_FAILED');
  for (const version of order) {
    try {
      const items =
        version === 'v2'
          ? await fetchSeriesJeenV2Catalog(config, options, fetchImpl)
          : await fetchSeriesJeenV1Catalog(config, options, fetchImpl);
      if (items.length > 0) return items;
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError;
}

/**
 * Fetches full series details and episode list from V2 (`GET /api/dramas/{drama_id}`)
 * or V1 (`GET /api/platform/{platform}/detail/{id}` + `/alleps/{id}`).
 */
export async function fetchSeriesJeenDetail(
  config: SeriesJeenConfig,
  params: {
    seriesId: string;
    platform?: string;
    apiVersion?: 'v1' | 'v2';
  },
  fetchImpl: typeof fetch = fetch
): Promise<SeriesItem | null> {
  const cleanSeriesId = params.seriesId.trim();
  if (!isValidSeriesIdentifier(cleanSeriesId)) return null;

  const useV2 = params.apiVersion === 'v2' || (!params.apiVersion && config.preferVersion === 'v2');

  if (useV2) {
    const json = await getJsonStrict(
      config.v2BaseUrl,
      `/api/dramas/${encodeURIComponent(cleanSeriesId)}`,
      config,
      { fetchImpl }
    );
    const mapped = mapExternalCatalogPayload(json, {
      defaultPlatform: params.platform,
      apiVersion: 'v2',
    });
    return mapped[0] ?? null;
  }

  const cleanPlatform = (params.platform || config.platforms[0] || 'dramabox').trim().toLowerCase();
  if (!isValidPlatformSlug(cleanPlatform)) return null;

  const [detailSettled, epsSettled] = await Promise.allSettled([
    getJsonStrict(
      config.v1BaseUrl,
      `/api/platform/${encodeURIComponent(cleanPlatform)}/detail/${encodeURIComponent(cleanSeriesId)}`,
      config,
      { params: { locale: config.locale }, fetchImpl }
    ),
    getJsonStrict(
      config.v1BaseUrl,
      `/api/platform/${encodeURIComponent(cleanPlatform)}/alleps/${encodeURIComponent(cleanSeriesId)}`,
      config,
      { params: { locale: config.locale }, fetchImpl }
    ),
  ]);

  if (detailSettled.status !== 'fulfilled') {
    throw new Error('V1_DETAIL_FAILED');
  }

  const mappedList = mapExternalCatalogPayload(detailSettled.value, {
    defaultPlatform: cleanPlatform,
    apiVersion: 'v1',
  });
  const baseItem = mappedList[0];
  if (!baseItem) return null;

  if (epsSettled.status === 'fulfilled') {
    const parsedEpisodes = parseExternalEpisodes(
      epsSettled.value,
      baseItem.heroBanner || baseItem.poster,
      baseItem.episodeDurationMinutes
    );
    if (parsedEpisodes.length > 0) {
      return {
        ...baseItem,
        totalEpisodes: Math.max(baseItem.totalEpisodes, parsedEpisodes.length),
        episodes: parsedEpisodes,
      };
    }
  }

  return baseItem;
}

/**
 * Resolves a single episode playback URL & WebVTT subtitles:
 *  - V2: `GET https://api-v2.seriesjeen.online/api/dramas/{drama_id}/episodes?ep={ep}` (no long cache since signed CDN URLs expire)
 *  - V1: `GET https://api.seriesjeen.online/api/platform/{platform}/video`
 */
export async function fetchSeriesJeenVideoStream(
  config: SeriesJeenConfig,
  params: {
    seriesId: string;
    episodeNumber: number;
    episodeId?: string;
    platform?: string;
    apiVersion?: 'v1' | 'v2';
  },
  fetchImpl: typeof fetch = fetch
): Promise<ResolvedEpisodePlayback> {
  const cleanSeriesId = params.seriesId.trim();
  if (!isValidSeriesIdentifier(cleanSeriesId)) {
    return { streamUrl: null, subtitles: [] };
  }

  const safeEpNum = Math.max(1, Math.floor(params.episodeNumber || 1));
  const useV2 = params.apiVersion === 'v2' || (!params.apiVersion && config.preferVersion === 'v2');

  if (useV2) {
    const json = await getJsonStrict(
      config.v2BaseUrl,
      `/api/dramas/${encodeURIComponent(cleanSeriesId)}/episodes`,
      config,
      {
        params: { ep: safeEpNum },
        ttlMs: 0, // Always fetch fresh signed CDN URL to avoid 403 expired links
        fetchImpl,
      }
    );
    return extractEpisodePlayback(json);
  }

  const cleanPlatform = (params.platform || config.platforms[0] || 'dramabox').trim().toLowerCase();
  if (!isValidPlatformSlug(cleanPlatform)) {
    return { streamUrl: null, subtitles: [] };
  }

  const safeEpId =
    params.episodeId && isValidSeriesIdentifier(params.episodeId.trim())
      ? params.episodeId.trim()
      : undefined;

  const json = await getJsonStrict(
    config.v1BaseUrl,
    `/api/platform/${encodeURIComponent(cleanPlatform)}/video`,
    config,
    {
      params: {
        series_id: cleanSeriesId,
        episode: safeEpNum,
        ...(safeEpId ? { episode_id: safeEpId } : {}),
        locale: config.locale,
      },
      ttlMs: 0,
      fetchImpl,
    }
  );

  return extractEpisodePlayback(json);
}
