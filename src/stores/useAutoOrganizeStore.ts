import { create } from 'zustand';
import type {
    AutoOrganizeActionV1,
    AutoOrganizeApplyResult,
    AutoOrganizeConditionV1,
    AutoOrganizeDryRunResult,
    AutoOrganizeRollbackApplyResult,
    AutoOrganizeRollbackPreviewResult,
    AutoOrganizeRuleV1,
    AutoOrganizeRunSummary,
    AutoOrganizeSettingsV1,
} from '../types/autoOrganize';

interface AutoOrganizeState {
    rules: AutoOrganizeRuleV1[];
    settings: AutoOrganizeSettingsV1;
    runs: AutoOrganizeRunSummary[];
    lastDryRun: AutoOrganizeDryRunResult | null;
    lastApplyResult: AutoOrganizeApplyResult | null;
    lastRollbackPreview: AutoOrganizeRollbackPreviewResult | null;
    lastRollbackApplyResult: AutoOrganizeRollbackApplyResult | null;
    isLoading: boolean;
    isMutating: boolean;
    isRunning: boolean;
    loadRules: () => Promise<void>;
    loadSettings: () => Promise<void>;
    updateSettings: (updates: Partial<AutoOrganizeSettingsV1>) => Promise<AutoOrganizeSettingsV1>;
    loadRuns: (limit?: number) => Promise<void>;
    createRule: (payload: {
        name: string;
        enabled?: boolean;
        condition: AutoOrganizeConditionV1;
        action: AutoOrganizeActionV1;
        automation?: AutoOrganizeRuleV1['automation'];
    }) => Promise<AutoOrganizeRuleV1>;
    updateRule: (payload: {
        id: string;
        updates: {
            name?: string;
            enabled?: boolean;
            condition?: AutoOrganizeConditionV1;
            action?: AutoOrganizeActionV1;
            automation?: AutoOrganizeRuleV1['automation'];
            sortOrder?: number;
        };
    }) => Promise<AutoOrganizeRuleV1>;
    deleteRule: (id: string) => Promise<boolean>;
    duplicateRule: (id: string) => Promise<AutoOrganizeRuleV1>;
    dryRunRules: (ruleIds?: string[]) => Promise<AutoOrganizeDryRunResult>;
    applyRules: (ruleIds?: string[]) => Promise<AutoOrganizeApplyResult>;
    dryRunRollback: (runId: string) => Promise<AutoOrganizeRollbackPreviewResult>;
    applyRollback: (runId: string) => Promise<AutoOrganizeRollbackApplyResult>;
    clearLastDryRun: () => void;
    clearLastApplyResult: () => void;
    clearLastRollbackPreview: () => void;
    clearLastRollbackApplyResult: () => void;
}

export const useAutoOrganizeStore = create<AutoOrganizeState>((set, get) => ({
    rules: [],
    settings: {
        enabled: false,
        runOnManualScan: false,
        runOnStartupScan: false,
        runOnWatchScan: true,
        historyLimit: 20,
    },
    runs: [],
    lastDryRun: null,
    lastApplyResult: null,
    lastRollbackPreview: null,
    lastRollbackApplyResult: null,
    isLoading: false,
    isMutating: false,
    isRunning: false,

    loadRules: async () => {
        set({ isLoading: true });
        try {
            const rules = await window.electronAPI.getAutoOrganizeRules();
            set({ rules });
        } finally {
            set({ isLoading: false });
        }
    },

    loadSettings: async () => {
        set({ isLoading: true });
        try {
            const settings = await window.electronAPI.getAutoOrganizeSettings();
            set({ settings });
        } finally {
            set({ isLoading: false });
        }
    },

    updateSettings: async (updates) => {
        set({ isMutating: true });
        try {
            const settings = await window.electronAPI.updateAutoOrganizeSettings(updates);
            set({ settings });
            return settings;
        } finally {
            set({ isMutating: false });
        }
    },

    loadRuns: async (limit) => {
        set({ isLoading: true });
        try {
            const runs = await window.electronAPI.getAutoOrganizeRuns(limit);
            set({ runs });
        } finally {
            set({ isLoading: false });
        }
    },

    createRule: async (payload) => {
        set({ isMutating: true });
        try {
            const created = await window.electronAPI.createAutoOrganizeRule(payload);
            set((state) => ({
                rules: [...state.rules, created].sort((a, b) => a.sortOrder - b.sortOrder),
            }));
            return created;
        } finally {
            set({ isMutating: false });
        }
    },

    updateRule: async (payload) => {
        set({ isMutating: true });
        try {
            const updated = await window.electronAPI.updateAutoOrganizeRule(payload);
            set((state) => ({
                rules: state.rules
                    .map((rule) => (rule.id === payload.id ? updated : rule))
                    .sort((a, b) => a.sortOrder - b.sortOrder),
            }));
            return updated;
        } finally {
            set({ isMutating: false });
        }
    },

    deleteRule: async (id) => {
        set({ isMutating: true });
        try {
            const result = await window.electronAPI.deleteAutoOrganizeRule(id);
            if (result.success) {
                set((state) => ({
                    rules: state.rules.filter((rule) => rule.id !== id),
                }));
            }
            return result.success;
        } finally {
            set({ isMutating: false });
        }
    },

    duplicateRule: async (id) => {
        const source = get().rules.find((rule) => rule.id === id);
        if (!source) {
            throw new Error('複製元ルールが見つかりません');
        }
        return get().createRule({
            name: `${source.name} のコピー`,
            enabled: source.enabled,
            condition: source.condition,
            action: source.action,
            automation: source.automation,
        });
    },

    dryRunRules: async (ruleIds) => {
        set({ isRunning: true, lastApplyResult: null });
        try {
            const result = await window.electronAPI.dryRunAutoOrganize(ruleIds);
            set({ lastDryRun: result });
            return result;
        } finally {
            set({ isRunning: false });
        }
    },

    applyRules: async (ruleIds) => {
        set({ isRunning: true });
        try {
            const result = await window.electronAPI.applyAutoOrganize(ruleIds);
            set({ lastApplyResult: result });
            return result;
        } finally {
            set({ isRunning: false });
        }
    },

    dryRunRollback: async (runId) => {
        set({ isRunning: true, lastRollbackApplyResult: null });
        try {
            const result = await window.electronAPI.dryRunAutoOrganizeRollback(runId);
            set({ lastRollbackPreview: result });
            return result;
        } finally {
            set({ isRunning: false });
        }
    },

    applyRollback: async (runId) => {
        set({ isRunning: true });
        try {
            const result = await window.electronAPI.applyAutoOrganizeRollback(runId);
            set({ lastRollbackApplyResult: result });
            return result;
        } finally {
            set({ isRunning: false });
        }
    },

    clearLastDryRun: () => set({ lastDryRun: null }),
    clearLastApplyResult: () => set({ lastApplyResult: null }),
    clearLastRollbackPreview: () => set({ lastRollbackPreview: null }),
    clearLastRollbackApplyResult: () => set({ lastRollbackApplyResult: null }),
}));
