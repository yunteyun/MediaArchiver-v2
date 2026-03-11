export type DuplicateSearchMode = 'exact' | 'similar_name';

export type SimilarNameMatchKind = 'normalized_name' | 'numbered_series';

export interface SimilarNameCandidateKey {
    kind: SimilarNameMatchKind;
    value: string;
}

export interface SimilarNameCandidateFile {
    id: string;
    name: string;
    path: string;
    size: number;
    type: 'video' | 'image' | 'archive' | 'audio';
}

export interface SimilarNameCandidateGroup<TFile extends SimilarNameCandidateFile> {
    id: string;
    matchKind: SimilarNameMatchKind;
    matchLabel: string;
    size: number;
    sizeMin: number;
    sizeMax: number;
    count: number;
    files: TFile[];
}

function stripExtension(fileName: string): string {
    const lastDotIndex = fileName.lastIndexOf('.');
    if (lastDotIndex <= 0) {
        return fileName;
    }

    return fileName.slice(0, lastDotIndex);
}

function normalizeBaseName(baseName: string): string {
    return baseName
        .normalize('NFKC')
        .toLowerCase()
        .replace(/[【】\[\]{}()]+/g, ' ')
        .replace(/[_-]+/g, ' ')
        .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

export function getSimilarNameCandidateKeys(fileName: string): SimilarNameCandidateKey[] {
    const baseName = stripExtension(fileName);
    const normalizedBaseName = normalizeBaseName(baseName);
    if (!normalizedBaseName) {
        return [];
    }

    const compactName = normalizedBaseName.replace(/\s+/g, '');
    if (compactName.length < 4) {
        return [];
    }

    const keys = new Map<string, SimilarNameCandidateKey>();
    keys.set(`normalized:${compactName}`, {
        kind: 'normalized_name',
        value: compactName,
    });

    const seriesBase = compactName.replace(/\d+$/u, '');
    if (seriesBase.length >= 5 && seriesBase !== compactName) {
        keys.set(`series:${seriesBase}`, {
            kind: 'numbered_series',
            value: seriesBase,
        });
    }

    return [...keys.values()];
}

function getMatchLabel(kind: SimilarNameMatchKind): string {
    switch (kind) {
        case 'normalized_name':
            return '名前一致候補';
        case 'numbered_series':
            return '連番候補';
    }
}

function getMatchPriority(kind: SimilarNameMatchKind): number {
    switch (kind) {
        case 'normalized_name':
            return 2;
        case 'numbered_series':
            return 1;
    }
}

export function buildSimilarNameCandidateGroups<TFile extends SimilarNameCandidateFile>(
    files: TFile[],
): SimilarNameCandidateGroup<TFile>[] {
    const buckets = new Map<string, { kind: SimilarNameMatchKind; files: Map<string, TFile> }>();

    for (const file of files) {
        const keys = getSimilarNameCandidateKeys(file.name);
        for (const key of keys) {
            const bucketKey = `${file.type}:${key.kind}:${key.value}`;
            const bucket = buckets.get(bucketKey) ?? {
                kind: key.kind,
                files: new Map<string, TFile>(),
            };
            bucket.files.set(file.id, file);
            buckets.set(bucketKey, bucket);
        }
    }

    const deduped = new Map<string, SimilarNameCandidateGroup<TFile>>();

    for (const [bucketKey, bucket] of buckets) {
        const groupFiles = [...bucket.files.values()].sort((a, b) => b.size - a.size || a.name.localeCompare(b.name));
        if (groupFiles.length < 2) {
            continue;
        }

        const sizeValues = groupFiles.map((file) => file.size);
        const signature = groupFiles.map((file) => file.id).sort().join('|');
        const nextGroup: SimilarNameCandidateGroup<TFile> = {
            id: bucketKey,
            matchKind: bucket.kind,
            matchLabel: getMatchLabel(bucket.kind),
            size: Math.max(...sizeValues),
            sizeMin: Math.min(...sizeValues),
            sizeMax: Math.max(...sizeValues),
            count: groupFiles.length,
            files: groupFiles,
        };

        const existing = deduped.get(signature);
        if (!existing || getMatchPriority(nextGroup.matchKind) > getMatchPriority(existing.matchKind)) {
            deduped.set(signature, nextGroup);
        }
    }

    return [...deduped.values()].sort((a, b) =>
        b.size - a.size ||
        b.count - a.count ||
        a.matchLabel.localeCompare(b.matchLabel)
    );
}
