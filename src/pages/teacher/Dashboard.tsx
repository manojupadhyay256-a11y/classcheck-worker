import { useState, useEffect } from 'react';
import { Users, CalendarCheck, Clock, BookOpen, ChevronRight, Loader2, Bell, BookMarked, Sparkles, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { clsx } from 'clsx';
import { useAuthStore } from '../../stores/authStore';
import { useNotificationStore } from '../../stores/notificationStore';
import { sql } from '../../lib/db';
import { getGreeting } from '../../lib/dateUtils';
import { teacherTips, getWeeklyTip } from '../../lib/tips';

const TeacherDashboard = () => {
    const { profile, isClassTeacher } = useAuthStore();
    const { notifications, fetchNotifications } = useNotificationStore();
    const [assignedClass, setAssignedClass] = useState<any>(null);
    const [studentCount, setStudentCount] = useState(0);
    const [presentToday, setPresentToday] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [attendanceRate, setAttendanceRate] = useState<number | null>(null);
    const [mostPresent, setMostPresent] = useState<any[]>([]);
    const [needsAttention, setNeedsAttention] = useState<any[]>([]);
    const [allStudentsRank, setAllStudentsRank] = useState<any[]>([]);
    const [isRankModalOpen, setIsRankModalOpen] = useState(false);
    const [attendanceStatus, setAttendanceStatus] = useState('Not marked yet');
    const [tip, setTip] = useState(getWeeklyTip(teacherTips));

    useEffect(() => {
        setTip(getWeeklyTip(teacherTips));
    }, []);

    useEffect(() => {
        const fetchDashboardData = async () => {
            if (!profile?.id) return;
            setLoading(true);
            try {
                // 1. Find teacher's ID
                const teacherResult = await sql`
                    SELECT id FROM teachers WHERE LOWER(email) = LOWER(${profile.email}) LIMIT 1
                `;

                if (teacherResult.length > 0) {
                    const teacherId = teacherResult[0].id;

                    // 2. Find assigned class
                    const classResult = await sql`
                        SELECT id, name FROM classes WHERE class_teacher_id = ${teacherId} LIMIT 1
                    `;

                    if (classResult.length > 0) {
                        const classId = classResult[0].id;
                        setAssignedClass(classResult[0]);

                        // 3. Count students
                        const studentResult = await sql`
                            SELECT COUNT(*) as count FROM students WHERE class_id = ${classId}
                        `;
                        const totalStudents = parseInt(studentResult[0].count);
                        setStudentCount(totalStudents);

                        // 4. Fetch today's attendance
                        const today = new Date().toISOString().split('T')[0];
                        const todayResult = await sql`
                            SELECT COUNT(*) as count FROM attendance 
                            WHERE class_id = ${classId} AND date = ${today} AND status = 'Present'
                        `;

                        const markedCheck = await sql`
                            SELECT id FROM attendance 
                            WHERE class_id = ${classId} AND date = ${today} 
                            LIMIT 1
                        `;

                        const presentCount = markedCheck.length > 0 ? parseInt(todayResult[0].count) : null;
                        setPresentToday(presentCount);
                        setAttendanceStatus(markedCheck.length > 0 ? 'Marked' : 'Not marked yet');

                        // 5. Calculate overall attendance rate for the class
                        const rateResult = await sql`
                            SELECT 
                                CAST(COUNT(*) FILTER (WHERE status = 'Present') AS FLOAT) / 
                                NULLIF(COUNT(*), 0) * 100 as rate
                            FROM attendance
                            WHERE class_id = ${classId}
                        `;
                        const rate = rateResult[0].rate ? Math.round(parseFloat(rateResult[0].rate)) : null;
                        setAttendanceRate(rate);

                        // 6. Most Present & Needs Attention (Top/Bottom by attendance)
                        const analyticsResult = await sql`
                            SELECT 
                                s.student_name,
                                CAST(COUNT(*) FILTER (WHERE a.status = 'Present') AS FLOAT) / 
                                NULLIF(COUNT(a.id), 0) as attendance_ratio
                            FROM students s
                            LEFT JOIN attendance a ON s.id = a.student_id
                            WHERE s.class_id = ${classId}
                            GROUP BY s.id, s.student_name
                            HAVING COUNT(a.id) > 0
                        `;

                        if (analyticsResult.length > 0) {
                            const sorted = [...analyticsResult].sort((a, b) => b.attendance_ratio - a.attendance_ratio);
                            setAllStudentsRank(sorted);
                            setMostPresent(sorted.slice(0, 5));
                            
                            // For needs attention, we take the bottom 5 who are NOT in the top 5 (if possible)
                            const bottom = sorted.length > 5 
                                ? sorted.slice(-5).reverse() 
                                : sorted.slice(1).reverse();
                            setNeedsAttention(bottom);
                        }
                    }
                }

                // 7. Fetch Notifications
                await fetchNotifications(profile.id);

            } catch (err) {
                console.error('Error fetching dashboard data:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, [profile, fetchNotifications]);

    const todayDate = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric'
    });

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-32 gap-4">
                <Loader2 className="w-10 h-10 text-amber-600 animate-spin" strokeWidth={3} />
                <p className="text-gray-400 font-semibold tracking-wide uppercase text-[11px]">Loading Your World...</p>
            </div>
        );
    }

    return (
        <div className="space-y-5 md:space-y-8">
            {/* Hero Section */}
            <div className="relative overflow-hidden bg-amber-600 rounded-2xl md:rounded-3xl p-4 md:p-10 text-white shadow-lg">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full translate-x-16 -translate-y-16 blur-3xl" />
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6">
                    <div>
                        <h1 className="text-xl md:text-4xl font-black tracking-tight mb-1">
                            {(() => {
                                const nameParts = profile?.full_name?.split(' ') || [];
                                const firstName = (nameParts[0]?.match(/^(Mr|Mrs|Ms|Dr|Prof)\.?$/i) && nameParts[1])
                                    ? `${nameParts[0]} ${nameParts[1]}`
                                    : nameParts[0] || 'Teacher';
                                return `${getGreeting()}, ${firstName}!`;
                            })()}
                        </h1>
                        <p className="text-amber-100/80 font-medium text-[11px] md:text-xs uppercase tracking-widest flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            {assignedClass ? `Class Teacher of ${assignedClass.name}` : 'No class assigned'} • {todayDate}
                        </p>
                    </div>

                    {/* Teacher Tip — hidden on mobile */}
                    <div className="hidden md:flex bg-white p-6 rounded-3xl items-center gap-5 max-w-md shadow-2xl transition-all hover:-translate-y-1 group">
                        <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center shadow-inner shrink-0 group-hover:scale-110 transition-transform">
                            <BookMarked className="w-7 h-7" />
                        </div>
                        <div>
                            <h4 className="text-amber-600 font-extrabold uppercase tracking-wider text-[10px] mb-2 flex items-center gap-2">
                                <Sparkles className="w-3 h-3 animate-pulse" />
                                Weekly Teaching Tip
                            </h4>
                            <p className="text-slate-900 text-[13px] font-semibold leading-relaxed tracking-wide">
                                "{tip.content}"
                                {tip.author && <span className="block mt-2 text-slate-700 text-[10px] font-black opacity-90">— {tip.author}</span>}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Consolidated Quick Stats Card */}
            {isClassTeacher && assignedClass && (
                <div className="mobile-card p-4 md:p-6">
                    <div className="flex items-center gap-2 mb-4 md:mb-6">
                        <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center">
                            <Sparkles className="w-4 h-4 text-amber-600" />
                        </div>
                        <h3 className="font-bold text-gray-900 tracking-tight uppercase text-xs">Class at a Glance</h3>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">My Students</span>
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-black text-slate-900 leading-none">{studentCount}</span>
                                <Users className="w-4 h-4 text-amber-500 opacity-50" />
                            </div>
                        </div>

                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Present Today</span>
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-black text-emerald-600 leading-none">
                                    {presentToday !== null ? presentToday : '—'}
                                </span>
                                <CalendarCheck className="w-4 h-4 text-emerald-500 opacity-50" />
                            </div>
                        </div>

                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Attendance Rate</span>
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-black text-violet-600 leading-none">
                                    {attendanceRate !== null ? `${attendanceRate}%` : '—'}
                                </span>
                                <Clock className="w-4 h-4 text-violet-500 opacity-50" />
                            </div>
                        </div>

                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Assigned Class</span>
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-black text-amber-600 leading-none truncate max-w-[120px]">
                                    {assignedClass?.name || 'None'}
                                </span>
                                <BookOpen className="w-4 h-4 text-amber-500 opacity-50" />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8">
                {isClassTeacher && assignedClass ? (
                    <>
                        <div className="mobile-card p-4 md:p-6 lg:col-span-1">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-bold text-gray-900">Class Overview</h3>
                                <Link to="/teacher/attendance" className="text-sm font-bold text-primary flex items-center gap-1 hover:underline">
                                    View All <ChevronRight className="w-4 h-4" />
                                </Link>
                            </div>
                            <div className="space-y-6">
                                <div>
                                    <div className="flex justify-between text-sm font-semibold mb-2">
                                        <span className="text-gray-600">Attendance Status</span>
                                        <span className={clsx(attendanceStatus === 'Marked' ? 'text-emerald-500' : 'text-primary')}>
                                            {attendanceStatus}
                                        </span>
                                    </div>
                                    <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden">
                                        <div
                                            className={clsx(
                                                "h-full rounded-full transition-all duration-500",
                                                attendanceStatus === 'Marked' ? 'bg-emerald-500' : 'bg-primary opacity-20'
                                            )}
                                            style={{ width: attendanceStatus === 'Marked' ? '100%' : '10%' }}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100/50 relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:rotate-12 transition-transform">
                                            <Sparkles className="w-8 h-8 text-emerald-600" />
                                        </div>
                                        <div className="flex justify-between items-center mb-3">
                                            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Most Present</p>
                                            <span className="text-[10px] font-bold text-emerald-600/50 bg-white px-2 py-0.5 rounded-full border border-emerald-100">Top 5</span>
                                        </div>
                                        <div className="space-y-2">
                                            {mostPresent.length > 0 ? mostPresent.map((s, i) => (
                                                <div key={i} className="flex items-center justify-between gap-2">
                                                    <span className="text-[13px] font-bold text-slate-800 truncate">{s.student_name}</span>
                                                    <span className="text-[11px] font-black text-emerald-600 shrink-0">{Math.round(s.attendance_ratio * 100)}%</span>
                                                </div>
                                            )) : <p className="text-sm font-bold text-slate-400">—</p>}
                                        </div>
                                    </div>
                                    
                                    <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100/50 relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:-rotate-12 transition-transform">
                                            <AlertCircle className="w-8 h-8 text-rose-600" />
                                        </div>
                                        <div className="flex justify-between items-center mb-3">
                                            <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest">Needs Attention</p>
                                            <span className="text-[10px] font-bold text-rose-600/50 bg-white px-2 py-0.5 rounded-full border border-rose-100">Bottom 5</span>
                                        </div>
                                        <div className="space-y-2">
                                            {needsAttention.length > 0 ? needsAttention.map((s, i) => (
                                                <div key={i} className="flex items-center justify-between gap-2">
                                                    <span className="text-[13px] font-bold text-slate-800 truncate">{s.student_name}</span>
                                                    <span className="text-[11px] font-black text-rose-600 shrink-0">{Math.round(s.attendance_ratio * 100)}%</span>
                                                </div>
                                            )) : <p className="text-sm font-bold text-slate-400">—</p>}
                                        </div>
                                    </div>
                                </div>
                                
                                <button 
                                    onClick={() => setIsRankModalOpen(true)}
                                    className="w-full py-3 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all mt-4 border border-slate-200/50"
                                >
                                    View Full Class Ranking
                                </button>
                            </div>
                        </div>

                        <div className="mobile-card p-5 md:p-6 flex flex-col justify-center items-center text-center">
                            <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mb-4">
                                <CalendarCheck className="w-10 h-10 text-amber-600" />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-2">Ready for Today?</h3>
                            <p className="text-gray-500 mb-8 max-w-xs uppercase text-[10px] font-semibold tracking-wider leading-loose">
                                {assignedClass ? `Manage attendance for class ${assignedClass.name}` : 'Check your class assignment'}
                            </p>
                            <Link to="/teacher/attendance" className="w-full">
                                <button className="w-full py-4 md:py-5 bg-amber-600 text-white font-bold text-base md:text-lg rounded-2xl shadow-lg shadow-amber-200 active:bg-amber-700 transition-all">
                                    {attendanceStatus === 'Marked' ? "Update Today's Attendance" : "Mark Today's Attendance"}
                                </button>
                            </Link>
                        </div>
                    </>
                ) : (
                    <div className="mobile-card p-5 md:p-6 lg:col-span-2 flex flex-col justify-center items-center text-center bg-linear-to-br from-amber-50/50 to-white">
                        <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mb-4">
                            <BookOpen className="w-10 h-10 text-amber-600" />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-2">Welcome to your Dashboard</h3>
                        <p className="text-slate-500 max-w-xs text-sm mt-2 mb-6 leading-relaxed">
                            Access your assigned subjects and manage your teaching schedule.
                        </p>
                        <div className="flex gap-4">
                            <Link to="/teacher/my-subjects">
                                <button className="px-6 py-3 bg-amber-600 text-white font-bold rounded-2xl shadow-md hover:bg-amber-700 transition-all hover:-translate-y-0.5">
                                    View Subjects
                                </button>
                            </Link>
                        </div>
                    </div>
                )}

                {/* Recent Alerts Card */}
                <div className="mobile-card overflow-hidden flex flex-col">
                    <div className="p-4 md:p-6 border-b border-slate-50">
                        <h3 className="text-xl font-bold text-gray-900">Recent Alerts</h3>
                    </div>
                    <div className="flex-1 overflow-y-auto max-h-[300px] hide-scrollbar">
                        {notifications.length > 0 ? (
                            <div className="divide-y divide-slate-50">
                                {notifications.slice(0, 5).map((notif) => (
                                    <div key={notif.id} className="p-4 hover:bg-slate-50 transition-colors">
                                        <div className="flex items-start gap-3">
                                            <div className={clsx(
                                                "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                                                notif.is_read ? "bg-slate-100 text-slate-400" : "bg-amber-50 text-amber-600"
                                            )}>
                                                <Bell className="w-4 h-4" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className={clsx(
                                                    "font-bold text-xs tracking-tight truncate",
                                                    notif.is_read ? "text-slate-500" : "text-slate-800"
                                                )}>
                                                    {notif.title}
                                                </p>
                                                <p className="text-slate-400 text-[10px] font-semibold uppercase mt-0.5 truncate">
                                                    {notif.sender_name || 'System'}
                                                </p>
                                            </div>
                                            {!notif.is_read && (
                                                <div className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0 animate-pulse" />
                                            )}
                                        </div>
                                    </div>
                                ))}
                                <Link to="/teacher/notifications" className="block p-4 text-center text-[10px] font-black text-amber-600 hover:bg-amber-50 transition-all uppercase tracking-widest border-t border-slate-50">
                                    View All Notifications
                                </Link>
                            </div>
                        ) : (
                            <div className="p-8 text-center h-full flex flex-col items-center justify-center">
                                <CheckCircle2 className="w-10 h-10 text-slate-100 mb-2" />
                                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">No new alerts</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Attendance Ranking Modal */}
            <AnimatePresence>
                {isRankModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsRankModalOpen(false)}
                            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="relative bg-white rounded-[32px] max-w-lg w-full shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
                        >
                            <div className="px-8 py-6 bg-slate-900 text-white relative">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full -translate-y-16 translate-x-16" />
                                <div className="relative z-10 flex items-center justify-between">
                                    <div>
                                        <h3 className="text-xl font-black tracking-tight">Class Attendance Ranking</h3>
                                        <p className="text-amber-500/60 text-[10px] font-black uppercase tracking-widest mt-1">
                                            {assignedClass?.name} • Overall {attendanceRate}%
                                        </p>
                                    </div>
                                    <button onClick={() => setIsRankModalOpen(false)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-3 custom-scrollbar">
                                {allStudentsRank.map((s, i) => (
                                    <div 
                                        key={i} 
                                        className={clsx(
                                            "flex items-center gap-4 p-4 rounded-2xl border transition-all duration-300",
                                            i < 3 ? "bg-emerald-50/30 border-emerald-100 group hover:bg-emerald-50" : 
                                            i > allStudentsRank.length - 4 ? "bg-rose-50/30 border-rose-100 hover:bg-rose-50" : 
                                            "bg-white border-slate-100 hover:bg-slate-50"
                                        )}
                                    >
                                        <div className={clsx(
                                            "w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0",
                                            i === 0 ? "bg-amber-100 text-amber-600 shadow-sm" : 
                                            i === 1 ? "bg-slate-100 text-slate-600" :
                                            i === 2 ? "bg-orange-100 text-orange-600" :
                                            "bg-slate-50 text-slate-400"
                                        )}>
                                            {i + 1}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-slate-900 truncate">{s.student_name}</p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden flex-1 max-w-[100px]">
                                                    <div 
                                                        className={clsx(
                                                            "h-full rounded-full transition-all duration-1000",
                                                            s.attendance_ratio >= 0.9 ? "bg-emerald-500" : 
                                                            s.attendance_ratio >= 0.75 ? "bg-amber-500" : "bg-rose-500"
                                                        )}
                                                        style={{ width: `${s.attendance_ratio * 100}%` }}
                                                    />
                                                </div>
                                                <span className={clsx(
                                                    "text-[10px] font-black uppercase tracking-widest",
                                                    s.attendance_ratio >= 0.9 ? "text-emerald-600" : 
                                                    s.attendance_ratio >= 0.75 ? "text-amber-600" : "text-rose-600"
                                                )}>
                                                    {Math.round(s.attendance_ratio * 100)}%
                                                </span>
                                            </div>
                                        </div>
                                        {i < 3 && <Sparkles className="w-5 h-5 text-amber-500 animate-pulse hidden md:block" />}
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default TeacherDashboard;
