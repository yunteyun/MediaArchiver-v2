/**
 * Hash Service - ファイルハッシュ計算サービス
 * 
 * SHA256ハッシュを計算。大ファイルにはストリーム処理を使用。
 * エラー時（EBUSY等）はnullを返し、呼び出し元でスキップ処理を行う。
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import { logger } from './logger';

const log = logger.scope('HashService');

// 部分ハッシュ用の読み取りサイズ（1MB）
const PARTIAL_CHUNK_SIZE = 1024 * 1024;

export interface HashOptions {
    /** 部分ハッシュモード（先頭1MB + 末尾1MBのみ計算） */
    partial?: boolean;
}

/**
 * ファイルのSHA256ハッシュを計算
 * 
 * @param filePath ファイルパス
 * @param options オプション
 * @returns ハッシュ値（16進数文字列）、エラー時はnull
 */
export async function calculateFileHash(
    filePath: string,
    options: HashOptions = {}
): Promise<string | null> {
    try {
        const stats = await fs.promises.stat(filePath);

        if (options.partial && stats.size > PARTIAL_CHUNK_SIZE * 2) {
            // 部分ハッシュ: 先頭1MB + 末尾1MB
            return await calculatePartialHash(filePath, stats.size);
        } else {
            // 完全ハッシュ: ファイル全体を読み込み
            return await calculateFullHash(filePath);
        }
    } catch (err: any) {
        // EBUSY, ENOENT, EPERM 等のエラーはスキップ
        if (err.code === 'EBUSY') {
            log.warn(`File is busy, skipping: ${filePath}`);
        } else if (err.code === 'ENOENT') {
            log.warn(`File not found, skipping: ${filePath}`);
        } else if (err.code === 'EPERM' || err.code === 'EACCES') {
            log.warn(`Permission denied, skipping: ${filePath}`);
        } else {
            log.error(`Failed to calculate hash for ${filePath}:`, err);
        }
        return null;
    }
}

/**
 * 完全ハッシュ計算（ストリーム処理）
 */
async function calculateFullHash(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash('sha256');
        const stream = fs.createReadStream(filePath);

        stream.on('data', (chunk) => {
            hash.update(chunk);
        });

        stream.on('end', () => {
            resolve(hash.digest('hex'));
        });

        stream.on('error', (err) => {
            reject(err);
        });
    });
}

/**
 * 部分ハッシュ計算（先頭1MB + 末尾1MB）
 * 大ファイルの高速比較用
 */
async function calculatePartialHash(filePath: string, fileSize: number): Promise<string> {
    const hash = crypto.createHash('sha256');
    const fd = await fs.promises.open(filePath, 'r');

    try {
        // 先頭1MB読み取り
        const headBuffer = Buffer.alloc(PARTIAL_CHUNK_SIZE);
        await fd.read(headBuffer, 0, PARTIAL_CHUNK_SIZE, 0);
        hash.update(headBuffer);

        // 末尾1MB読み取り
        const tailBuffer = Buffer.alloc(PARTIAL_CHUNK_SIZE);
        const tailPosition = fileSize - PARTIAL_CHUNK_SIZE;
        await fd.read(tailBuffer, 0, PARTIAL_CHUNK_SIZE, tailPosition);
        hash.update(tailBuffer);

        // ファイルサイズも含める（同じ先頭/末尾でもサイズ違いを区別）
        hash.update(fileSize.toString());

        return hash.digest('hex');
    } finally {
        await fd.close();
    }
}

/**
 * 複数ファイルのハッシュを一括計算
 * 
 * @param filePaths ファイルパス配列
 * @param options オプション
 * @param onProgress 進捗コールバック
 * @returns Map<filePath, hash | null>
 */
export async function calculateMultipleHashes(
    filePaths: string[],
    options: HashOptions = {},
    onProgress?: (current: number, total: number, filePath: string) => void
): Promise<Map<string, string | null>> {
    const results = new Map<string, string | null>();
    const total = filePaths.length;

    for (let i = 0; i < filePaths.length; i++) {
        const filePath = filePaths[i];
        const hash = await calculateFileHash(filePath, options);
        results.set(filePath, hash);

        if (onProgress) {
            onProgress(i + 1, total, filePath);
        }
    }

    return results;
}
