/**
 * Migration 001: Initial Schema
 *
 * MediaArchiver v2の初期スキーマを定義。
 * 既存DBとの互換性を確保するため、CREATE TABLE IF NOT EXISTSを使用。
 */
import type { Migration } from './types';
export declare const initialSchema: Migration;
