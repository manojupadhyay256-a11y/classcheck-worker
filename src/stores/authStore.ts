import { create } from 'zustand';
import { authClient } from '../lib/auth-client';
import { sql } from '../lib/db';

interface UserProfile {
    id: string;
    full_name: string;
    email: string;
    role: 'admin' | 'principal' | 'teacher' | 'student';
    created_at?: string;
    updated_at?: string;
}

interface AuthState {
    user: any | null;
    profile: UserProfile | null;
    loading: boolean;
    isAdmin: boolean;
    isTeacher: boolean;
    isStudent: boolean;
    setAuth: (user: any, profile: UserProfile | null) => void;
    setStudentProfile: (profile: UserProfile | null) => void;
    clearAuth: () => void;
    fetchProfile: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => {
    return {
        user: null,
        profile: null,
        loading: true,
        isAdmin: false,
        isTeacher: false,
        isStudent: false,
        setAuth: (user, profile) => {
            console.log('[Auth] setAuth called', { userId: user?.id, role: profile?.role });
            if (user && profile) {
                localStorage.setItem('cc_user', JSON.stringify(user));
                localStorage.setItem('cc_profile', JSON.stringify(profile));
            } else {
                localStorage.removeItem('cc_user');
                localStorage.removeItem('cc_profile');
            }
            set({
                user,
                profile,
                loading: false,
                isAdmin: profile?.role === 'admin' || profile?.role === 'principal',
                isTeacher: profile?.role === 'teacher',
                isStudent: profile?.role === 'student'
            });
        },
        setStudentProfile: (profile) => {
            console.log('[Auth] setStudentProfile called', { profileId: profile?.id });
            if (profile) {
                const user = { id: profile.id, email: profile.email, name: profile.full_name };
                localStorage.setItem('cc_user', JSON.stringify(user));
                localStorage.setItem('cc_profile', JSON.stringify(profile));
                set({
                    user,
                    profile,
                    loading: false,
                    isAdmin: false,
                    isTeacher: false,
                    isStudent: true
                });
            } else {
                localStorage.removeItem('cc_user');
                localStorage.removeItem('cc_profile');
                set({
                    user: null,
                    profile: null,
                    loading: false,
                    isAdmin: false,
                    isTeacher: false,
                    isStudent: false
                });
            }
        },
        clearAuth: async () => {
            console.log('[Auth] clearAuth called');
            try {
                const profile = useAuthStore.getState().profile;
                if (profile?.role !== 'student') {
                    await authClient.signOut();
                }
            } catch (error) {
                console.error('[Auth] Error during sign out:', error);
            }

            localStorage.removeItem('cc_user');
            localStorage.removeItem('cc_profile');
            set({
                user: null,
                profile: null,
                loading: false,
                isAdmin: false,
                isTeacher: false,
                isStudent: false
            });
        },
        fetchProfile: async () => {
            console.log('[Auth] fetchProfile started');
            try {
                // 1. Initial hydration from localStorage for immediate UI display
                const savedUser = localStorage.getItem('cc_user');
                const savedProfile = localStorage.getItem('cc_profile');

                if (savedUser && savedProfile) {
                    try {
                        const user = JSON.parse(savedUser);
                        const profile = JSON.parse(savedProfile) as UserProfile;
                        console.log('[Auth] Hydrated from localStorage', { userId: user.id, role: profile.role });
                        set({
                            user,
                            profile,
                            loading: false,
                            isAdmin: profile.role === 'admin' || profile.role === 'principal',
                            isTeacher: profile.role === 'teacher',
                            isStudent: profile.role === 'student'
                        });
                    } catch (e) {
                        console.error('[Auth] Failed to parse cached auth:', e);
                    }
                } else {
                    console.log('[Auth] No cached session found in localStorage');
                }

                // 2. Network verification with Better Auth
                console.log('[Auth] Verifying session with Better Auth...');
                const { data: session } = await authClient.getSession();
                console.log('[Auth] Session response:', { hasUser: !!session?.user, userId: session?.user?.id });

                if (session?.user) {
                    // Fetch fresh profile from the database
                    console.log('[Auth] Fetching profile from database for user:', session.user.id);
                    const results = await sql`
                        SELECT * FROM public.profiles 
                        WHERE id = ${session.user.id}
                        LIMIT 1
                    `;

                    const profile = results[0] as UserProfile | undefined;
                    console.log('[Auth] Database profile result:', { found: !!profile, role: profile?.role });

                    if (profile) {
                        set({
                            user: session.user,
                            profile,
                            loading: false,
                            isAdmin: profile.role === 'admin' || profile.role === 'principal',
                            isTeacher: profile.role === 'teacher',
                            isStudent: profile.role === 'student'
                        });
                        localStorage.setItem('cc_user', JSON.stringify(session.user));
                        localStorage.setItem('cc_profile', JSON.stringify(profile));
                    } else {
                        // User exists in auth but NOT in database — handle gracefully
                        console.warn('[Auth] User exists in auth but profile NOT found in DB. Clearing session to prevent blank screen.');
                        localStorage.removeItem('cc_user');
                        localStorage.removeItem('cc_profile');
                        set({
                            user: null,
                            profile: null,
                            loading: false,
                            isAdmin: false,
                            isTeacher: false,
                            isStudent: false
                        });
                    }
                } else {
                    // No Better Auth session - checking if it was a manual student session
                    const profile = useAuthStore.getState().profile;
                    if (profile?.role === 'student') {
                        console.log('[Auth] No Better Auth session, but student session is active — keeping it.');
                        // Keep the student session (it's managed via localStorage/password check)
                        set({ loading: false });
                    } else {
                        // Clear everything if not specifically a student session
                        console.log('[Auth] No session found, clearing auth state.');
                        localStorage.removeItem('cc_user');
                        localStorage.removeItem('cc_profile');
                        set({
                            user: null,
                            profile: null,
                            loading: false,
                            isAdmin: false,
                            isTeacher: false,
                            isStudent: false
                        });
                    }
                }
            } catch (error) {
                console.error('[Auth] Error fetching profile:', error);
                set({ loading: false });
            }
        }
    };
});
