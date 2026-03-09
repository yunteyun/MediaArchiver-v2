import { create } from 'zustand';
import type {
    AutoOrganizeActionV1,
    AutoOrganizeApplyResult,
    AutoOrganizeConditionV1,
    AutoOrganizeDryRunResult,
    AutoOrganizeRuleV1,
} from '../types/autoOrganize';

interface AutoOrganizeState {
    rules: AutoOrganizeRuleV1[];
    lastDryRun: AutoOrganizeDryRunResult | null;
    lastApplyResult: AutoOrganizeApplyResult | null;
    isLoading: boolean;
    isMutating: boolean;
    isRunning: boolean;
    loadRules: () => Promise<void>;
    createRule: (payload: {
        name: string;
        enabled?: boolean;
        condition: AutoOrganizeConditionV1;
        action: AutoOrganizeActionV1;
    }) => Promise<AutoOrganizeRuleV1>;
    updateRule: (payload: {
        id: string;
        updates: {
            name?: string;
            enabled?: boolean;
            condition?: AutoOrganizeConditionV1;
            action?: AutoOrganizeActionV1;
            sortOrder?: number;
        };
    }) => Promise<AutoOrganizeRuleV1>;
    deleteRule: (id: string) => Promise<boolean>;
    duplicateRule: (id: string) => Promise<AutoOrganizeRuleV1>;
    dryRunRules: (ruleIds?: string[]) => Promise<AutoOrganizeDryRunResult>;
    applyRules: (ruleIds?: string[]) => Promise<AutoOrganizeApplyResult>;
    clearLastDryRun: () => void;
    clearLastApplyResult: () => void;
}

export const useAutoOrganizeStore = create<AutoOrganizeState>((set, get) => ({
    rules: [],
    lastDryRun: null,
    lastApplyResult: null,
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

    clearLastDryRun: () => set({ lastDryRun: null }),
    clearLastApplyResult: () => set({ lastApplyResult: null }),
}));
