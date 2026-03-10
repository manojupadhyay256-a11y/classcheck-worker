import { useState, useEffect } from 'react';
import {
    CalendarCheck,
    BookOpen,
    Sparkles,
    Bell,
    TrendingUp,
    Loader2,
    ChevronRight,
    CheckCircle2,
    BookMarked,
    Clock,
    Users
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { clsx } from 'clsx';
import { useAuthStore } from '../../stores/authStore';
import { sql } from '../../lib/db';
import { getGreeting } from '../../lib/dateUtils';
import StatsCard from '../../components/common/StatsCard';
import { type Notification, notificationService } from '../../lib/notifications';
import { studentTips, getWeeklyTip } from '../../lib/tips';

const StudentDashboard = () => {
    const { profile } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<any[]>([]);
    const [recentNotifications, setRecentNotifications] = useState<Notification[]>([]);
    const [attendanceRate, setAttendanceRate] = useState<number | null>(null);
    const [subjectCount, setSubjectCount] = useState(0);
    const [syllabusProgress, setSyllabusProgress] = useState(0);
    const [unreadNotifications, setUnreadNotifications] = useState(0);
    const [tip, setTip] = useState(getWeeklyTip(studentTips));

    useEffect(() => {
        setTip(getWeeklyTip(studentTips));
    }, []);

    useEffect(() => {
        const fetchDashboardData = async () => {
            if (!profile?.email) return;
            setLoading(true);
            try {
                const admissionNo = profile.email.split('@')[0];

                // 1. Get Student & Class Data
                const studentRes = await sql`
                    SELECT id, class_id FROM students WHERE admission_no = ${admissionNo} LIMIT 1
                `;

                if (studentRes.length > 0) {
                    const studentId = studentRes[0].id;
                    const classId = studentRes[0].class_id;

                    // 2. Attendance Stats
                    const attendanceRes = await sql`
                        SELECT 
                            CAST(COUNT(*) FILTER (WHERE status = 'Present') AS FLOAT) / 
                            NULLIF(COUNT(*), 0) * 100 as rate
                        FROM attendance
                        WHERE student_id = ${studentId}
                    `;
                    setAttendanceRate(attendanceRes[0].rate ? Math.round(parseFloat(attendanceRes[0].rate)) : 0);

                    // 3. Subject Count
                    const subjectsRes = await sql`
                        SELECT COUNT(*) as count FROM class_subjects WHERE class_id = ${classId}
                    `;
                    setSubjectCount(parseInt(subjectsRes[0].count));

                    // 4. Syllabus Progress
                    const syllabusRes = await sql`
                        SELECT 
                            CAST(COUNT(*) FILTER (WHERE status = 'Completed') AS FLOAT) / 
                            NULLIF(COUNT(*), 0) * 100 as progress
                        FROM syllabus
                        WHERE class_subject_id IN (SELECT id FROM class_subjects WHERE class_id = ${classId})
                    `;
                    setSyllabusProgress(syllabusRes[0].progress ? Math.round(parseFloat(syllabusRes[0].progress)) : 0);
                }

                // 5. Notifications
                const notifs = await notificationService.fetchByRecipient(profile.id);
                setRecentNotifications(notifs.slice(0, 3) as Notification[]);
                const unread = await notificationService.getUnreadCount(profile.id);
                setUnreadNotifications(unread);

            } catch (err) {
                console.error('Error fetching student dashboard data:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, [profile]);

    useEffect(() => {
        const statsData = [
            { label: 'Attendance', value: attendanceRate !== null ? `${attendanceRate}%` : '—', icon: CalendarCheck, color: 'success' as const },
            { label: 'My Subjects', value: subjectCount.toString(), icon: BookOpen, color: 'primary' as const },
            { label: 'Course Progress', value: `${syllabusProgress}%`, icon: TrendingUp, color: 'secondary' as const },
            { label: 'New Alerts', value: unreadNotifications.toString(), icon: Bell, color: 'accent' as const },
        ];
        setStats(statsData);
    }, [attendanceRate, subjectCount, syllabusProgress, unreadNotifications]);

    const todayDate = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric'
    });

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-32 gap-4">
                <Loader2 className="w-10 h-10 text-amber-600 animate-spin" strokeWidth={3} />
                <p className="text-slate-400 font-bold tracking-widest uppercase text-[10px]">Loading Your World...</p>
            </div>
        );
    }

    const shortcuts = [
        { label: 'Class Work', to: '/student/classwork', icon: Sparkles, color: 'bg-amber-50 text-amber-600', description: 'Check daily work' },
        { label: 'My Subjects', to: '/student/subjects', icon: BookOpen, color: 'bg-amber-50 text-amber-600', description: 'Course materials' },
        { label: 'Attendance', to: '/student/attendance', icon: CalendarCheck, color: 'bg-emerald-50 text-emerald-600', description: 'View your records' },
        { label: 'Notifications', to: '/student/notifications', icon: Bell, color: 'bg-rose-50 text-rose-600', description: 'Messages & alerts' },
        { label: 'My Profile', to: '/student/profile', icon: Users, color: 'bg-slate-50 text-slate-600', description: 'Manage account' },
    ];

    return (
        <div className="space-y-8 pb-12">
            {/* Hero Section */}
            <div className="relative overflow-hidden bg-amber-600 rounded-3xl p-6 md:p-10 text-white shadow-2xl">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full translate-x-16 -translate-y-16 blur-3xl" />
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-2xl md:text-4xl font-black tracking-tight mb-2">
                            {(() => {
                                const nameParts = profile?.full_name?.split(' ') || [];
                                const firstName = (nameParts[0]?.match(/^(Mr|Mrs|Ms|Dr|Prof)\.?$/i) && nameParts[1])
                                    ? `${nameParts[0]} ${nameParts[1]}`
                                    : nameParts[0] || 'Student';
                                return `${getGreeting()}, ${firstName}!`;
                            })()}
                        </h1>
                        <p className="text-amber-100 font-medium md:text-lg opacity-80 uppercase tracking-widest text-xs flex items-center gap-2">
                            <Clock className="w-4 h-4" /> {todayDate}
                        </p>
                    </div>

                    {/* Study Tip in Header */}
                    <div className="bg-white p-6 rounded-3xl flex items-center gap-5 max-w-md shadow-2xl transition-all hover:-translate-y-1 group">
                        <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center shadow-inner shrink-0 group-hover:scale-110 transition-transform">
                            <BookMarked className="w-7 h-7" />
                        </div>
                        <div>
                            <h4 className="text-amber-600 font-extrabold uppercase tracking-wider text-[10px] mb-2 flex items-center gap-2">
                                <Sparkles className="w-3 h-3 animate-pulse" />
                                Weekly Study Tip
                            </h4>
                            <p className="text-slate-900 text-[13px] font-semibold leading-relaxed tracking-wide">
                                "{tip.content}"
                                {tip.author && <span className="block mt-2 text-slate-700 text-[10px] font-black opacity-90">— {tip.author}</span>}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                {stats.map((stat, index) => (
                    <StatsCard key={index} {...stat} />
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Shortcuts Grid */}
                <div className="lg:col-span-2">
                    <h2 className="text-xl font-bold text-slate-800 uppercase tracking-wider mb-6 flex items-center gap-3">
                        Quick Shortcuts
                        <div className="h-0.5 flex-1 bg-slate-100 rounded-full" />
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {shortcuts.map((shortcut) => (
                            <Link
                                key={shortcut.to}
                                to={shortcut.to}
                                className="group bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:border-amber-100 transition-all duration-300"
                            >
                                <div className="flex items-center gap-5">
                                    <div className={clsx("w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110", shortcut.color)}>
                                        <shortcut.icon className="w-7 h-7" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-black text-slate-800 text-lg group-hover:text-amber-600 transition-colors uppercase tracking-tight">{shortcut.label}</h3>
                                        <p className="text-slate-400 text-xs font-medium leading-tight mt-0.5">{shortcut.description}</p>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-amber-400 transition-all group-hover:translate-x-1" />
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Recent Activity / Notifications */}
                <div className="flex flex-col h-full">
                    <h2 className="text-xl font-bold text-slate-800 uppercase tracking-wider mb-6 flex items-center gap-3">
                        Recent Alerts
                        <div className="h-0.5 flex-1 bg-slate-100 rounded-full" />
                    </h2>
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden flex-1">
                        {recentNotifications.length > 0 ? (
                            <div className="divide-y divide-slate-50">
                                {recentNotifications.map((notif) => (
                                    <div key={notif.id} className="p-6 hover:bg-slate-50 transition-colors">
                                        <div className="flex items-start gap-4">
                                            <div className={clsx(
                                                "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                                                notif.is_read ? "bg-slate-100 text-slate-400" : "bg-amber-50 text-amber-600"
                                            )}>
                                                <Bell className="w-5 h-5" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className={clsx(
                                                    "font-black text-sm tracking-tight truncate",
                                                    notif.is_read ? "text-slate-500" : "text-slate-800"
                                                )}>
                                                    {notif.title}
                                                </p>
                                                <p className="text-slate-400 text-[10px] font-semibold uppercase mt-1 truncate">
                                                    {notif.sender_name || 'System'}
                                                </p>
                                            </div>
                                            {!notif.is_read && (
                                                <div className="w-2 h-2 rounded-full bg-rose-500 mt-2 shrink-0 animate-pulse" />
                                            )}
                                        </div>
                                    </div>
                                ))}
                                <Link to="/student/notifications" className="block p-5 text-center text-xs font-bold text-amber-600 hover:bg-amber-50 transition-all uppercase tracking-wider">
                                    View All Notifications
                                </Link>
                            </div>
                        ) : (
                            <div className="p-12 text-center h-full flex flex-col items-center justify-center">
                                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4">
                                    <CheckCircle2 className="w-8 h-8 text-slate-200" />
                                </div>
                                <p className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">No new alerts</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

        </div>
    );
};

export default StudentDashboard;
