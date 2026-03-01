import React from 'react';
import type { MediaFile } from '../../types/file';
import { RatingSection } from './RatingSection';
import { TagSection } from './TagSection';
import { SectionTitle } from './SectionTitle';

interface EditMetaSectionProps {
    file: MediaFile;
}

export const EditMetaSection = React.memo<EditMetaSectionProps>(({ file }) => (
    <section className="px-4 py-3 space-y-3 border-b border-surface-700">
        <SectionTitle>評価・タグ</SectionTitle>
        <RatingSection file={file} embedded />
        <TagSection file={file} embedded />
    </section>
));

EditMetaSection.displayName = 'EditMetaSection';
