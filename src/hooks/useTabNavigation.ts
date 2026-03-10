import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

export const useTabNavigation = () => {
    const { profile } = useAuthStore();
    const location = useLocation();
    const navigate = useNavigate();
    const role = profile?.role;

    const getNavItems = () => {
        switch (role) {
            case 'admin':
                return [
                    { to: '/admin', label: 'Explore' },
                    { to: '/admin/teachers', label: 'Teachers' },
                    { to: '/admin/students', label: 'Students' },
                    { to: '/admin/log-book', label: 'Logs' },
                    { to: '/admin/settings', label: 'Settings' },
                ];
            case 'teacher':
                return [
                    { to: '/teacher', label: 'Explore' },
                    { to: '/teacher/attendance', label: 'Attend' },
                    { to: '/teacher/my-subjects', label: 'Subjects' },
                    { to: '/teacher/homework', label: 'Homework' },
                    { to: '/teacher/notifications', label: 'Inbox' },
                ];
            case 'student':
                return [
                    { to: '/student', label: 'Explore' },
                    { to: '/student/classwork', label: 'Tasks' },
                    { to: '/student/subjects', label: 'Subjects' },
                    { to: '/student/homework', label: 'HW' },
                    { to: '/student/notifications', label: 'Inbox' },
                ];
            default:
                return [];
        }
    };

    const navItems = getNavItems();
    const currentPath = location.pathname;

    // Find exact match or falls back to parent path for deep routes
    const currentIndex = navItems.findIndex(item =>
        currentPath === item.to || (item.to !== '/' && currentPath.startsWith(item.to))
    );

    const swipeLeft = () => {
        if (currentIndex < navItems.length - 1) {
            navigate(navItems[currentIndex + 1].to);
        }
    };

    const swipeRight = () => {
        if (currentIndex > 0) {
            navigate(navItems[currentIndex - 1].to);
        }
    };

    return { navItems, currentIndex, swipeLeft, swipeRight };
};
