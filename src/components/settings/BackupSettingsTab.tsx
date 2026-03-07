import React from 'react';
import { FileCode2, FileSpreadsheet, FolderOpen } from 'lucide-react';
import type { CsvImportDryRunSummary, MediaArchiverCsvImportRow } from '../../utils/fileImport';

interface BackupSettingsTabProps {
    currentLoadedExportRowsCount: number;
    activeProfileLabel: string;
    exportScopeLabel: string;
    exportScope: 'profile' | 'folder';
    canExportCurrentFolderScope: boolean;
    onExportScopeChange: (scope: 'profile' | 'folder') => void;
    isExporting: 'csv' | 'html' | null;
    onExport: (format: 'csv' | 'html') => void;
    isImportingCsv: boolean;
    onSelectImportCsv: () => void;
    onSelectLegacyImportCsv: () => void;
    onApplyCsvImport: () => void;
    parsedImportRows: MediaArchiverCsvImportRow[] | null;
    selectedImportCsvPath: string;
    importSourceLabel: string;
    importDryRun: CsvImportDryRunSummary | null;
    importWarnings: string[];
    onCreateBackup: () => void;
}

export const BackupSettingsTab = React.memo(({
    currentLoadedExportRowsCount,
    activeProfileLabel,
    exportScopeLabel,
    exportScope,
    canExportCurrentFolderScope,
    onExportScopeChange,
    isExporting,
    onExport,
    isImportingCsv,
    onSelectImportCsv,
    onSelectLegacyImportCsv,
    onApplyCsvImport,
    parsedImportRows,
    selectedImportCsvPath,
    importSourceLabel,
    importDryRun,
    importWarnings,
    onCreateBackup,
}: BackupSettingsTabProps) => (
    <div className="px-4 py-4 space-y-6">
        <div>
            <h3 className="text-sm font-semibold text-white mb-3">データベースバックアップ</h3>

            <button
                onClick={onCreateBackup}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded transition-colors"
            >
                今すぐバックアップを作成
            </button>

            <p className="text-xs text-surface-500 mt-2">
                現在のデータベースを安全にバックアップします（VACUUM INTO使用）
            </p>
        </div>

        <div className="text-xs text-surface-400 bg-surface-800 p-3 rounded">
            <p className="font-semibold mb-1">⚠️ 注意事項</p>
            <ul className="list-disc list-inside space-y-1">
                <li>バックアップにはDBサイズの1.5倍のディスク容量が必要です</li>
                <li>リストアを実行するとアプリが再起動されます</li>
                <li>バックアップファイルは自動的に世代管理されます（最大5世代）</li>
            </ul>
        </div>

        <div className="border border-surface-700 rounded-lg p-3 bg-surface-900/40">
            <div className="flex items-center justify-between gap-3 mb-2">
                <div>
                    <h3 className="text-sm font-medium text-surface-200">一覧エクスポート（CSV / HTML）</h3>
                    <p className="text-xs text-surface-500 mt-0.5">
                        利用頻度が低い操作のためバックアップ系タブに集約。タグ色も出力に含めます。
                    </p>
                    <p className="text-xs text-surface-500">
                        ※ インポート対応は現在 `CSV` のみです（`HTML` は閲覧用）。
                    </p>
                </div>
                <span className="text-xs text-surface-400 whitespace-nowrap">現在読込 {currentLoadedExportRowsCount} 件</span>
            </div>

            <div className="space-y-2 text-xs mb-3">
                <div className="text-surface-400">
                    プロファイル: <span className="text-surface-300">{activeProfileLabel}</span>
                </div>
                <div className="text-surface-400">
                    現在選択: <span className="text-surface-300">{exportScopeLabel}</span>
                </div>
                <div className="text-surface-400">
                    タグ色: <span className="text-surface-300">含める（CSV列 / HTMLタグチップ）</span>
                </div>
            </div>

            <div className="space-y-2 mb-3">
                <label className="flex items-start gap-2 cursor-pointer">
                    <input
                        type="radio"
                        name="exportScope"
                        value="profile"
                        checked={exportScope === 'profile'}
                        onChange={() => onExportScopeChange('profile')}
                        className="mt-0.5 w-4 h-4 accent-primary-500"
                    />
                    <div>
                        <span className="text-sm text-surface-200">プロファイル全体</span>
                        <span className="block text-xs text-surface-500">現在のアクティブプロファイルに登録されている全ファイルを出力</span>
                    </div>
                </label>
                <label className={`flex items-start gap-2 ${canExportCurrentFolderScope ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}>
                    <input
                        type="radio"
                        name="exportScope"
                        value="folder"
                        checked={exportScope === 'folder'}
                        onChange={() => canExportCurrentFolderScope && onExportScopeChange('folder')}
                        disabled={!canExportCurrentFolderScope}
                        className="mt-0.5 w-4 h-4 accent-primary-500"
                    />
                    <div>
                        <span className="text-sm text-surface-200">現在選択フォルダ全体</span>
                        <span className="block text-xs text-surface-500">
                            {canExportCurrentFolderScope
                                ? '現在選択しているフォルダ配下を再帰的に出力'
                                : 'フォルダを選択している時のみ使用できます（全ファイル/ドライブ選択中は不可）'}
                        </span>
                    </div>
                </label>
            </div>

            <div className="flex flex-wrap gap-2">
                <button
                    onClick={() => onExport('csv')}
                    disabled={isExporting !== null || (exportScope === 'folder' && !canExportCurrentFolderScope)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-surface-800 hover:bg-surface-700 disabled:bg-surface-800/60 disabled:text-surface-600 text-surface-200 border border-surface-700 text-sm transition-colors"
                >
                    <FileSpreadsheet size={15} />
                    {isExporting === 'csv' ? 'CSV出力中...' : 'CSV出力'}
                </button>
                <button
                    onClick={() => onExport('html')}
                    disabled={isExporting !== null || (exportScope === 'folder' && !canExportCurrentFolderScope)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-surface-800 hover:bg-surface-700 disabled:bg-surface-800/60 disabled:text-surface-600 text-surface-200 border border-surface-700 text-sm transition-colors"
                >
                    <FileCode2 size={15} />
                    {isExporting === 'html' ? 'HTML出力中...' : 'HTML出力'}
                </button>
            </div>
        </div>

        <div className="border border-surface-700 rounded-lg p-3 bg-surface-900/40">
            <div className="flex items-center justify-between gap-3 mb-2">
                <div>
                    <h3 className="text-sm font-medium text-surface-200">CSVインポート（このアプリ形式 / 旧アプリ互換）</h3>
                    <p className="text-xs text-surface-500 mt-0.5">
                        `path` をキーにタグを復元します（追記型）。旧アプリCSV（Shift_JIS / 可変列）は互換モードで解析します。
                    </p>
                    <p className="text-xs text-surface-500">
                        旧アプリCSVは `コメント１` をメモへ追記し、末尾の追加列をタグ/星評価として解釈します。
                    </p>
                </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-3">
                <button
                    onClick={onSelectImportCsv}
                    disabled={isImportingCsv}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-surface-800 hover:bg-surface-700 disabled:bg-surface-800/60 disabled:text-surface-600 text-surface-200 border border-surface-700 text-sm transition-colors"
                >
                    <FolderOpen size={15} />
                    このアプリCSVを解析
                </button>
                <button
                    onClick={onSelectLegacyImportCsv}
                    disabled={isImportingCsv}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-surface-800 hover:bg-surface-700 disabled:bg-surface-800/60 disabled:text-surface-600 text-surface-200 border border-surface-700 text-sm transition-colors"
                >
                    <FolderOpen size={15} />
                    旧アプリCSVを解析（互換）
                </button>
                <button
                    onClick={onApplyCsvImport}
                    disabled={isImportingCsv || !parsedImportRows || parsedImportRows.length === 0}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-primary-700 hover:bg-primary-600 disabled:bg-surface-800/60 disabled:text-surface-600 text-white border border-primary-700 text-sm transition-colors"
                >
                    <FileSpreadsheet size={15} />
                    {isImportingCsv ? 'インポート中...' : 'インポート実行（タグ）'}
                </button>
            </div>

            {selectedImportCsvPath && (
                <div className="mb-3 text-xs text-surface-400">
                    {importSourceLabel && <div>形式: <span className="text-surface-300">{importSourceLabel}</span></div>}
                    CSV: <span className="text-surface-300 break-all">{selectedImportCsvPath}</span>
                </div>
            )}

            {importDryRun && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs mb-3">
                    <div className="bg-surface-800 rounded px-2 py-1 text-surface-300">行数: {importDryRun.totalRows}</div>
                    <div className="bg-surface-800 rounded px-2 py-1 text-surface-300">一致: {importDryRun.matchedRows}</div>
                    <div className="bg-surface-800 rounded px-2 py-1 text-surface-300">未一致: {importDryRun.unmatchedRows}</div>
                    <div className="bg-surface-800 rounded px-2 py-1 text-surface-300">タグ行: {importDryRun.rowsWithTags}</div>
                    <div className="bg-surface-800 rounded px-2 py-1 text-surface-300">追加予定タグ付与: {importDryRun.tagLinksToAdd}</div>
                    <div className="bg-surface-800 rounded px-2 py-1 text-surface-300">新規タグ作成予定: {importDryRun.newTagsToCreate}</div>
                    <div className="bg-surface-800 rounded px-2 py-1 text-surface-300">評価行: {importDryRun.rowsWithRating}</div>
                    <div className="bg-surface-800 rounded px-2 py-1 text-surface-300">評価更新予定: {importDryRun.ratingUpdates}</div>
                    <div className="bg-surface-800 rounded px-2 py-1 text-surface-300">メモ行: {importDryRun.rowsWithMemo}</div>
                    <div className="bg-surface-800 rounded px-2 py-1 text-surface-300">メモ追記予定: {importDryRun.memoUpdates}</div>
                </div>
            )}

            {(importWarnings.length > 0 || (importDryRun?.unmatchedPaths.length ?? 0) > 0 || (importDryRun?.missingTagNames.length ?? 0) > 0) && (
                <div className="space-y-2">
                    {importWarnings.length > 0 && (
                        <div className="text-xs text-yellow-300 bg-yellow-900/20 border border-yellow-800/40 rounded p-2">
                            <div className="font-semibold mb-1">解析警告（先頭{Math.min(importWarnings.length, 5)}件）</div>
                            {importWarnings.slice(0, 5).map((warning, index) => (
                                <div key={`${warning}-${index}`}>{warning}</div>
                            ))}
                        </div>
                    )}
                    {(importDryRun?.unmatchedPaths.length ?? 0) > 0 && (
                        <div className="text-xs text-surface-300 bg-surface-800 border border-surface-700 rounded p-2">
                            <div className="font-semibold mb-1">未一致パス（先頭{importDryRun!.unmatchedPaths.length}件）</div>
                            {importDryRun!.unmatchedPaths.map((path) => (
                                <div key={path} className="break-all text-surface-400">{path}</div>
                            ))}
                        </div>
                    )}
                    {(importDryRun?.missingTagNames.length ?? 0) > 0 && (
                        <div className="text-xs text-surface-300 bg-surface-800 border border-surface-700 rounded p-2">
                            <div className="font-semibold mb-1">新規作成されるタグ（先頭{importDryRun!.missingTagNames.length}件）</div>
                            <div className="flex flex-wrap gap-1">
                                {importDryRun!.missingTagNames.map((name) => (
                                    <span key={name} className="px-2 py-0.5 rounded bg-surface-700 text-surface-200">#{name}</span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    </div>
));

BackupSettingsTab.displayName = 'BackupSettingsTab';
