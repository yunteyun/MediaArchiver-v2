import Database from 'better-sqlite3';
import type { Migration } from './types';

const LEGACY_RATING_TAGS = ['★5(最高)', '★4(良)', '★3(普通)'];

export const removeLegacyRatingTags: Migration = {
    version: 14,
    description: 'Remove legacy preset star rating tags from tag_definitions',

    up: (db: Database.Database) => {
        const placeholders = LEGACY_RATING_TAGS.map(() => '?').join(', ');
        db.prepare(`
            DELETE FROM tag_definitions
            WHERE category_id = 'cat_rating'
              AND name IN (${placeholders})
        `).run(...LEGACY_RATING_TAGS);
    },

    down: (_db: Database.Database) => {
        // 削除済みタグの復元は不要
    }
};
