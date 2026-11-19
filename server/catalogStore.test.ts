import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { PersistentCatalogStore } from './catalogStore';
import { SeriesItem } from '../src/types/series';

function makeSeries(overrides: Partial<SeriesItem> & { id: string }): SeriesItem {
  return {
    id: overrides.id,
    title: overrides.title || 'ซีรีส์จีน(พากย์ไทย)',
    thaiTitle: overrides.thaiTitle || overrides.title || 'ซีรีส์จีน(พากย์ไทย)',
    poster: 'https://cdn.example.com/poster.jpg',
    platform: 'dramabox',
    additionalPlatforms: [],
    genres: ['ดราม่า'],
    rating: 9.0,
    reviewCountLabel: '10K',
    year: 2025,
    totalEpisodes: 40,
    episodeDurationMinutes: 2,
    badge: 'มาแรง',
    synopsis: 'เรื่องย่อ',
    studio: overrides.studio || 'FreeReels',
    isThaiDub: overrides.isThaiDub,
    updatedAt: overrides.updatedAt,
    sceneTheme: 'sakura',
    episodes: overrides.episodes || [
      {
        number: 1,
        title: 'ตอนที่ 1',
        durationSeconds: 120,
        durationLabel: '02:00',
        summary: 'ตอนที่ 1',
        thumbnail: 'https://cdn.example.com/poster.jpg',
      },
    ],
  };
}

test('PersistentCatalogStore stores ONLY Thai-dubbed series, persists to disk, and sorts latest updated first', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bannlai-store-'));
  const storePath = path.join(tmpDir, 'series-store.json');

  try {
    const store = new PersistentCatalogStore(storePath);
    const snap = store.upsertSeries([
      makeSeries({
        id: 'dub-old',
        title: 'เรื่องเก่า(พากย์เสียง)',
        isThaiDub: true,
        updatedAt: '2026-01-01T10:00:00Z',
      }),
      makeSeries({
        id: 'sub-only',
        title: 'เรื่องซับไทยเท่านั้น',
        isThaiDub: false,
        updatedAt: '2026-05-01T10:00:00Z',
      }),
      makeSeries({
        id: 'dub-new',
        title: 'เรื่องใหม่ล่าสุด(พากย์เสียง)',
        isThaiDub: true,
        updatedAt: '2026-06-01T10:00:00Z',
        studio: 'Melolo',
      }),
    ]);

    assert.equal(snap.totalStored, 2);
    assert.equal(snap.items[0].id, 'dub-new');
    assert.equal(snap.items[1].id, 'dub-old');
    assert.equal(snap.items.some((s) => s.id === 'sub-only'), false);
    assert.equal(fs.existsSync(storePath), true);

    // Reload from a brand new store instance to verify disk persistence
    const reloaded = new PersistentCatalogStore(storePath).loadFromDisk();
    assert.equal(reloaded.totalStored, 2);
    assert.equal(reloaded.items[0].id, 'dub-new');
    assert.equal(reloaded.platformCounts.Melolo, 1);
    assert.equal(reloaded.platformCounts.FreeReels, 1);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
