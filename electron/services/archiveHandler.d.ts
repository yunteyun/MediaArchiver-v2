/**
 * Archive Handler - 譖ｸ蠎ｫ繝輔ぃ繧､繝ｫ蜃ｦ逅・し繝ｼ繝薙せ
 *
 * ZIP, RAR, 7Z, CBZ, CBR 縺ｪ縺ｩ縺ｮ譖ｸ蠎ｫ繝輔ぃ繧､繝ｫ繧貞・逅・＠縲・
 * 繝｡繧ｿ繝・・繧ｿ蜿門ｾ励√し繝�繝阪う繝ｫ逕滓・縲√・繝ｬ繝薙Η繝ｼ逕ｻ蜒乗歓蜃ｺ繧定｡後≧縲・
 */
export interface ArchiveMetadata {
    fileCount: number;
    firstImageEntry: string | null;
    imageEntries: string[];
    audioEntries: string[];
    hasAudio: boolean;
}
export interface ArchiveError {
    code: 'NO_IMAGES' | 'EXTRACTION_FAILED' | 'PASSWORD_PROTECTED' | 'CORRUPTED' | 'UNKNOWN';
    message: string;
}
/**
 * 繝輔ぃ繧､繝ｫ縺梧嶌蠎ｫ繝輔ぃ繧､繝ｫ縺九←縺・°繧貞愛螳・
 */
export declare function isArchive(filePath: string): boolean;
/**
 * 譖ｸ蠎ｫ繝輔ぃ繧､繝ｫ縺ｮ繝｡繧ｿ繝・・繧ｿ・育判蜒上Μ繧ｹ繝茨ｼ峨ｒ蜿門ｾ・
 */
export declare function getArchiveMetadata(filePath: string): Promise<ArchiveMetadata | null>;
/**
 * 譖ｸ蠎ｫ繝輔ぃ繧､繝ｫ縺九ｉ繧ｵ繝�繝阪う繝ｫ逕ｨ縺ｮ譛蛻昴・逕ｻ蜒上ｒ謚ｽ蜃ｺ
 */
export declare function getArchiveThumbnail(filePath: string): Promise<string | null>;
/**
 * 譖ｸ蠎ｫ繝輔ぃ繧､繝ｫ縺九ｉ隍・焚縺ｮ繝励Ξ繝薙Η繝ｼ逕ｻ蜒上ｒ謚ｽ蜃ｺ
 * @param filePath - 譖ｸ蠎ｫ繝輔ぃ繧､繝ｫ繝代せ
 * @param limit - 蜿門ｾ励☆繧狗判蜒上・譛螟ｧ謨ｰ・医ョ繝輔か繝ｫ繝・ 9・・
 */
export declare function getArchivePreviewFrames(filePath: string, limit?: number): Promise<string[]>;
/**
 * 荳譎ゅョ繧｣繝ｬ繧ｯ繝医Μ繧偵け繝ｪ繝ｼ繝ｳ繧｢繝・・
 */
export declare function cleanTempArchives(): void;
/**
 * 譖ｸ蠎ｫ繝輔ぃ繧､繝ｫ蜀・・髻ｳ螢ｰ繝輔ぃ繧､繝ｫ繝ｪ繧ｹ繝医ｒ蜿門ｾ・
 */
export declare function getArchiveAudioFiles(archivePath: string): Promise<string[]>;
/**
 * 譖ｸ蠎ｫ繝輔ぃ繧､繝ｫ縺九ｉ迚ｹ螳壹・髻ｳ螢ｰ繝輔ぃ繧､繝ｫ繧呈歓蜃ｺ縺励∽ｸ譎ゅヵ繧｡繧､繝ｫ繝代せ繧定ｿ斐☆
 */
export declare function extractArchiveAudioFile(archivePath: string, entryName: string): Promise<string | null>;
