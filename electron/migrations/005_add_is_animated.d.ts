/**
 * Migration 005: Add is_animated column
 *
 * アニメーション画像（GIF/WebP等）を識別するためのフラグを追加。
 * 将来的にAPNG/AVIF等にも対応可能な設計。
 */
import type { Migration } from './types';
export declare const addIsAnimated: Migration;
