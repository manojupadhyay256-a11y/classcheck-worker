import { useState, useEffect } from 'react';
import { Users, CalendarCheck, Clock, BookOpen, ChevronRight, Loader2, Bell, BookMarked, Sparkles } from 'lucide-react';
import StatsCard from '../../components/common/StatsCard';
import { Link } from 'react-router-dom';
import { clsx } from 'clsx';
import { useAuthStore } from '../../stores/authStore';
import { sql } from '../../lib/db';
import { getGreeting } from '../../lib/dateUtils';
import { teacherTips, getWeeklyTip } from '../../lib/tips';

const TeacherDashboard = () => {
    const { profile } = useAuthStore();
    const [assignedClass, setAssignedClass] = useState<any>(null);
    const [studentCount, setStudentCount] = useState(0);
    const [presentToday, setPresentToday] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<any[]>([]);
    const [attendanceRate, setAttendanceRate] = useState<number | null>(null);
    const [mostPresent, setMostPresent] = useState<string | null>(null);
    const [needsAttention, setNeedsAttention] = useState<string | null>(null);
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
                            setMostPresent(sorted[0].student_name);
                            if (sorted.length > 1) {
                                setNeedsAttention(sorted[sorted.length - 1].student_name);
                            }
                        }
                    }
                }
            } catch (err) {
                console.error('Error fetching dashboard data:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, [profile]);

    useEffect(() => {
        const statsData = [
            { label: 'My Students', value: studentCount.toString(), icon: Users, color: 'primary' as const },
            { label: 'Present Today', value: presentToday !== null ? presentToday.toString() : '—', icon: CalendarCheck, color: 'success' as const },
            { label: 'Attendance Rate', value: attendanceRate !== null ? `${attendanceRate}%` : '—', icon: Clock, color: 'secondary' as const },
            { label: 'Assigned Class', value: assignedClass?.name || 'None', icon: BookOpen, color: 'accent' as const },
        ];
        setStats(statsData);
    }, [studentCount, presentToday, attendanceRate, assignedClass]);

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
        <div className="space-y-8">
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
                                    : nameParts[0] || 'Teacher';
                                return `${getGreeting()}, ${firstName}!`;
                            })()}
                        </h1>
                        <p className="text-amber-100 font-medium md:text-lg opacity-80 uppercase tracking-widest text-xs flex items-center gap-2">
                            <Clock className="w-4 h-4 text-amber-200" />
                            {assignedClass ? `Class Teacher of ${assignedClass.name}` : 'No class assigned'} • {todayDate}
                        </p>
                    </div>

                    {/* Teacher Tip in Header */}
                    <div className="bg-white p-6 rounded-3xl flex items-center gap-5 max-w-md shadow-2xl transition-all hover:-translate-y-1 group">
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

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {stats.map((stat, index) => (
                    <StatsCard key={index} {...stat} />
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-bold text-gray-900">Class Overview</h3>
                        <div className="flex gap-4">
                            <Link to="/teacher/notifications" className="text-sm font-bold text-amber-600 flex items-center gap-1 hover:underline">
                                <Bell className="w-4 h-4" /> Notifications
                            </Link>
                            <Link to="/teacher/attendance" className="text-sm font-bold text-primary flex items-center gap-1 hover:underline">
                                View All <ChevronRight className="w-4 h-4" />
                            </Link>
                        </div>
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

                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-emerald-50 rounded-xl">
                                <p className="text-xs font-bold text-emerald-600 uppercase mb-1">Most Present</p>
                                <p className="text-lg font-bold text-gray-900 truncate">{mostPresent || '—'}</p>
                            </div>
                            <div className="p-4 bg-rose-50 rounded-xl">
                                <p className="text-xs font-bold text-rose-600 uppercase mb-1">Needs Attention</p>
                                <p className="text-lg font-bold text-gray-900 truncate">{needsAttention || '—'}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-center items-center text-center">
                    <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mb-4">
                        <CalendarCheck className="w-10 h-10 text-amber-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Ready for Today?</h3>
                    <p className="text-gray-500 mb-8 max-w-xs uppercase text-[10px] font-semibold tracking-wider leading-loose">
                        {assignedClass ? `Manage attendance for class ${assignedClass.name}` : 'Check your class assignment'}
                    </p>
                    <Link to="/teacher/attendance" className="w-full">
                        <button className="w-full py-5 bg-amber-600 text-white font-bold text-lg rounded-2xl shadow-xl shadow-amber-200 hover:bg-amber-700 transition-all">
                            {attendanceStatus === 'Marked' ? "Update Today's Attendance" : "Mark Today's Attendance"}
                        </button>
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default TeacherDashboard;
