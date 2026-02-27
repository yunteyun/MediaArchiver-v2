import React from 'react';
import { FileImage, Tags, BarChart3, Star } from 'lucide-react';
import type { MediaFile } from '../../types/file';
import { useImageInfoReadModel } from './useImageInfoReadModel';

interface ImageInfoPaneReadOnlyProps {
    file: MediaFile;
}

const SectionTitle = React.memo<{ icon: React.ReactNode; title: string }>(({ icon, title }) => (
    <div className="flex items-center gap-2 text-sm font-semibold text-surface-200">
        <span className="text-surface-400">{icon}</span>
        <span>{title}</span>
    </div>
));
SectionTitle.displayName = 'SectionTitle';

const InfoTable = React.memo<{ rows: Array<{ label: string; value: string }> }>(({ rows }) => (
    <dl className="grid grid-cols-[96px_1fr] gap-x-3 gap-y-1.5 text-xs">
        {rows.map((row) => (
            <React.Fragment key={row.label}>
                <dt className="text-surface-500">{row.label}</dt>
                <dd className="text-surface-200 break-all">{row.value}</dd>
            </React.Fragment>
        ))}
    </dl>
));
InfoTable.displayName = 'InfoTable';

export const ImageInfoPaneReadOnly = React.memo<ImageInfoPaneReadOnlyProps>(({ file }) => {
    const { tagNames, ratingRows, fileInfoRows, statsRows } = useImageInfoReadModel(file);

    return (
        <div className="h-full overflow-y-auto p-4 space-y-4 bg-surface-950">
            <section className="rounded-lg border border-surface-700 bg-surface-900 px-3 py-3">
                <SectionTitle icon={<FileImage size={16} />} title="基本情報" />
                <div className="mt-3">
                    <InfoTable rows={fileInfoRows} />
                </div>
            </section>

            <section className="rounded-lg border border-surface-700 bg-surface-900 px-3 py-3">
                <SectionTitle icon={<Star size={16} />} title="評価（読み取り専用）" />
                <div className="mt-3 space-y-1.5">
                    {ratingRows.length === 0 && (
                        <p className="text-xs text-surface-500">評価軸が見つかりません</p>
                    )}
                    {ratingRows.map((row) => (
                        <div key={row.id} className="flex items-center justify-between text-xs">
                            <span className="text-surface-400">{row.label}</span>
                            <span className="font-semibold text-surface-100">{row.value}</span>
                        </div>
                    ))}
                </div>
            </section>

            <section className="rounded-lg border border-surface-700 bg-surface-900 px-3 py-3">
                <SectionTitle icon={<Tags size={16} />} title="タグ（読み取り専用）" />
                <div className="mt-3 flex flex-wrap gap-1.5">
                    {tagNames.length === 0 && (
                        <p className="text-xs text-surface-500">タグなし</p>
                    )}
                    {tagNames.map((name) => (
                        <span
                            key={name}
                            className="inline-flex items-center rounded-md border border-surface-600 bg-surface-800 px-2 py-1 text-[11px] text-surface-200"
                        >
                            {name}
                        </span>
                    ))}
                </div>
            </section>

            <section className="rounded-lg border border-surface-700 bg-surface-900 px-3 py-3">
                <SectionTitle icon={<BarChart3 size={16} />} title="統計" />
                <div className="mt-3">
                    <InfoTable rows={statsRows} />
                </div>
            </section>
        </div>
    );
});

ImageInfoPaneReadOnly.displayName = 'ImageInfoPaneReadOnly';
