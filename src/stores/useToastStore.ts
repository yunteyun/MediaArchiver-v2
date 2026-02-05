import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastData {
    id: string;
    message: string;
    type: ToastType;
    duration?: number;
}

interface ToastStore {
    toasts: ToastData[];
    addToast: (message: string, type: ToastType, duration?: number) => void;
    removeToast: (id: string) => void;
    success: (message: string, duration?: number) => void;
    error: (message: string, duration?: number) => void;
    info: (message: string, duration?: number) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
    toasts: [],

    addToast: (message, type, duration = 3000) => {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        set((state) => ({
            toasts: [...state.toasts, { id, message, type, duration }]
        }));
    },

    removeToast: (id) => {
        set((state) => ({
            toasts: state.toasts.filter((t) => t.id !== id)
        }));
    },

    success: (message, duration) => {
        useToastStore.getState().addToast(message, 'success', duration);
    },

    error: (message, duration) => {
        useToastStore.getState().addToast(message, 'error', duration);
    },

    info: (message, duration) => {
        useToastStore.getState().addToast(message, 'info', duration);
    }
}));
