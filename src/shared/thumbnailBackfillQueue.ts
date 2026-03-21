export function mergePriorityIds(
    currentQueue: string[],
    incomingIds: string[],
    activeIds: Iterable<string> = []
): string[] {
    const activeIdSet = new Set(activeIds);
    const prioritizedIncomingIds = Array.from(
        new Set(
            incomingIds.filter((id): id is string => typeof id === 'string' && id.length > 0 && !activeIdSet.has(id))
        )
    );
    const trailingQueue = currentQueue.filter((id) => !activeIdSet.has(id) && !prioritizedIncomingIds.includes(id));
    return [...prioritizedIncomingIds, ...trailingQueue];
}
