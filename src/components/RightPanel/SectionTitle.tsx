import React from 'react';

interface SectionTitleProps {
    children: React.ReactNode;
}

export const SectionTitle = React.memo<SectionTitleProps>(({ children }) => (
    <h3 className="text-xs font-semibold text-surface-400 uppercase tracking-wider">{children}</h3>
));

SectionTitle.displayName = 'SectionTitle';
