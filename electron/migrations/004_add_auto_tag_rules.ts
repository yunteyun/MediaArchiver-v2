/**
 * Migration 004 - Add Auto Tag Rules Table
 * Phase 12-8 フェーズ2: 自動タグ割り当て機能
 */

import Database from 'better-sqlite3';
import type { Migration } from './types';

export const addAutoTagRules: Migration = {
    version: 4,
    description: 'Add auto_tag_rules table for automatic tag assignment',
    up: (db: Database.Database) => {
        // 自動タグ割り当てルールテーブル
        db.exec(`
            CREATE TABLE IF NOT EXISTS auto_tag_rules (
                id TEXT PRIMARY KEY,
                tag_id TEXT NOT NULL,
                keywords TEXT NOT NULL,
                target TEXT NOT NULL,
                match_mode TEXT NOT NULL,
                enabled INTEGER NOT NULL DEFAULT 1,
                sort_order INTEGER NOT NULL DEFAULT 0,
                created_at INTEGER NOT NULL,
                FOREIGN KEY (tag_id) REFERENCES tag_definitions(id) ON DELETE CASCADE
            );
            
            CREATE INDEX IF NOT EXISTS idx_auto_tag_rules_enabled 
            ON auto_tag_rules(enabled);
            
            CREATE INDEX IF NOT EXISTS idx_auto_tag_rules_sort_order 
            ON auto_tag_rules(sort_order);
            
            CREATE INDEX IF NOT EXISTS idx_auto_tag_rules_tag_id 
            ON auto_tag_rules(tag_id);
        `);
    }
};
