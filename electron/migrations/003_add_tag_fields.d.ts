/**
 * Migration 003: Add Tag Fields
 *
 * tag_definitions テーブルに icon と description 列を追加。
 * タグにアイコンと説明文を設定可能にする。
 */
import type { Migration } from './types';
export declare const addTagFields: Migration;
