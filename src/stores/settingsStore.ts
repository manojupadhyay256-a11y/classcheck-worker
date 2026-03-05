import { create } from 'zustand';
import { sql } from '../lib/db';

interface SchoolSettings {
    school_name: string;
    academic_year: string;
    five_day_week: boolean;
}

interface SettingsState {
    settings: SchoolSettings | null;
    loading: boolean;
    error: string | null;
    fetchSettings: () => Promise<void>;
    updateSettings: (newSettings: Partial<SchoolSettings>) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
    settings: null,
    loading: false,
    error: null,

    fetchSettings: async () => {
        set({ loading: true, error: null });
        try {
            const result = await sql`SELECT school_name, academic_year, five_day_week FROM school_settings WHERE id = 1`;
            if (result.length > 0) {
                set({ settings: result[0] as SchoolSettings });
            }
        } catch (err: any) {
            set({ error: err.message || 'Failed to fetch settings' });
        } finally {
            set({ loading: false });
        }
    },

    updateSettings: async (newSettings: Partial<SchoolSettings>) => {
        const currentSettings = get().settings;
        if (!currentSettings) return;

        const updated = { ...currentSettings, ...newSettings };
        set({ loading: true, error: null });

        try {
            await sql`
                UPDATE school_settings 
                SET school_name = ${updated.school_name}, 
                    academic_year = ${updated.academic_year}, 
                    five_day_week = ${updated.five_day_week},
                    updated_at = NOW()
                WHERE id = 1
            `;
            set({ settings: updated });
        } catch (err: any) {
            set({ error: err.message || 'Failed to update settings' });
            throw err;
        } finally {
            set({ loading: false });
        }
    }
}));
