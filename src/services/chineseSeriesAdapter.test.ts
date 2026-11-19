import test from 'node:test';
import assert from 'node:assert/strict';
import {
  extractEpisodePlayback,
  extractStreamUrl,
  mapExternalCatalogPayload,
  parseExternalEpisodes,
  sanitizeMediaUrl,
} from './chineseSeriesAdapter';

test('sanitizeMediaUrl allows safe https/http/local paths and blocks XSS schemes', () => {
  assert.equal(
    sanitizeMediaUrl('https://cdn.seriesjeen.online/poster.jpg'),
    'https://cdn.seriesjeen.online/poster.jpg'
  );
  assert.equal(sanitizeMediaUrl('/assets/bannlai/01.png'), '/assets/bannlai/01.png');
  assert.equal(sanitizeMediaUrl('javascript:alert(1)', '/assets/fallback.png'), '/assets/fallback.png');
  assert.equal(sanitizeMediaUrl('data:text/html,<script>', '/assets/fallback.png'), '/assets/fallback.png');
});

test('extractEpisodePlayback extracts Series Jeen v2 Part URL and WebVTT subtitles cleanly', () => {
  const playback = extractEpisodePlayback({
    drama_id: 101,
    title: 'รักข้ามกาลเวลา',
    episode_count: 60,
    episodes: [
      {
        episode: 1,
        parts: [
          {
            part: 1,
            of: 1,
            url: 'https://cdn.seriesjeen.online/signed-token-abc',
            url_expires_at: '2026-11-19T12:00:00Z',
            size_bytes: 12345678,
            duration_sec: 125,
            subtitles: [
              {
                language: 'th',
                language_tag: 'th-TH',
                label: 'ไทย',
                format: 'webvtt',
                default: true,
                forced: false,
                sdh: false,
                url: 'https://cdn.seriesjeen.online/sub-th.vtt',
              },
              {
                language: 'en',
                url: 'javascript:alert(1)',
                format: 'webvtt',
                default: false,
                forced: false,
                sdh: false,
              },
            ],
          },
        ],
      },
    ],
  });

  assert.equal(playback.streamUrl, 'https://cdn.seriesjeen.online/signed-token-abc');
  assert.equal(playback.subtitles.length, 1);
  assert.equal(playback.subtitles[0].language, 'th');
  assert.equal(playback.subtitles[0].url, 'https://cdn.seriesjeen.online/sub-th.vtt');
  assert.equal(extractStreamUrl({ video_url: 'javascript:alert(1)' }), null);
});

test('parseExternalEpisodes parses Series Jeen v2 DramaDetailResponse episodes cleanly', () => {
  const episodes = parseExternalEpisodes(
    [
      { episode: 1, parts: 1, size_bytes: 9000000, duration_sec: 128 },
      { episode: 2, parts: 1, size_bytes: 9500000, duration_sec: 135 },
    ],
    '/assets/bannlai/06-character-portrait-01.png',
    2
  );
  assert.equal(episodes.length, 2);
  assert.equal(episodes[0].number, 1);
  assert.equal(episodes[0].durationSeconds, 128);
  assert.equal(episodes[0].durationLabel, '02:08');
});

test('mapExternalCatalogPayload maps Series Jeen v2 DramaListResponse accurately', () => {
  const v2Payload = {
    platform: { id: 1, name: 'DramaBox' },
    page: 1,
    page_size: 20,
    total: 1,
    total_pages: 1,
    items: [
      {
        id: 4201,
        series_id: 'db-4201',
        platform_id: 1,
        title: 'จอมนางซ่อนลาย',
        description: 'ซีรีส์จีนย้อนยุคสุดเข้มข้น',
        episode_count: 60,
        episodes_available: 60,
        genres: ['ย้อนยุค', 'โรแมนติก'],
        locale: 'th',
        thai_dub: true,
        thai_sub: true,
        updated_at: '2026-11-18T10:00:00Z',
        poster: 'https://cdn.seriesjeen.online/poster-4201.jpg',
        poster_expires_at: '2026-11-19T12:00:00Z',
      },
    ],
  };

  const mapped = mapExternalCatalogPayload(v2Payload, {
    defaultPlatform: '1',
    platformDisplayName: 'DramaBox',
    apiVersion: 'v2',
  });

  assert.equal(mapped.length, 1);
  assert.equal(mapped[0].id, 'sj2-4201');
  assert.equal(mapped[0].externalId, '4201');
  assert.equal(mapped[0].apiVersion, 'v2');
  assert.equal(mapped[0].platform, 'dramabox');
  assert.equal(mapped[0].thaiTitle, 'จอมนางซ่อนลาย');
  assert.equal(mapped[0].totalEpisodes, 60);
  assert.equal(mapped[0].episodes.length, 60);
  assert.equal(mapped[0].badge, 'มาแรง');
  assert.ok(mapped[0].genres.includes('โรแมนติก'));
  assert.ok(mapped[0].genres.includes('ดราม่า'));
});
