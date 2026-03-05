import { useState, useEffect } from 'react';
import {
    Users,
    BookOpen,
    TrendingUp,
    Settings as SettingsIcon,
    ChevronRight,
    School,
    UserPlus,
    Activity,
    Clock,
    UserCheck,
    Bell,
    LayoutDashboard
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { sql } from '../../lib/db';
import { format } from 'date-fns';

const AdminDashboard = () => {
    const navigate = useNavigate();
    const { profile } = useAuthStore();
    const { fetchSettings } = useSettingsStore();
    const [loading, setLoading] = useState(true);
    const [metrics, setMetrics] = useState({
        totalStudents: 0,
        presentToday: 0,
        totalTeachers: 0,
        totalClasses: 0,
        syllabusProgress: 0,
        lateAttendance: 0,
        staffPresent: 0
    });

    useEffect(() => {
        const init = async () => {
            await fetchSettings();
            await fetchMetrics();
        };
        init();
    }, [fetchSettings]);

    const fetchMetrics = async () => {
        try {
            setLoading(true);
            const today = format(new Date(), 'yyyy-MM-dd');

            const [
                studentsRes,
                teachersRes,
                classesRes,
                attendanceRes,
                syllabusRes,
                lateRes,
                staffRes
            ] = await Promise.all([
                sql`SELECT COUNT(*) FROM students`,
                sql`SELECT COUNT(*) FROM public.teachers`,
                sql`SELECT COUNT(*) FROM classes`,
                sql`SELECT COUNT(*) FROM attendance WHERE date = ${today} AND status = 'Present'`,
                sql`SELECT status FROM syllabus`,
                sql`SELECT COUNT(*) FROM attendance WHERE date = ${today} AND status = 'Present' AND created_at::time > '09:00:00'`,
                sql`SELECT COUNT(DISTINCT marked_by) FROM attendance WHERE date = ${today}`
            ]);

            const completed = syllabusRes.filter((s: any) => s.status === 'Completed').length;
            const total = syllabusRes.length;
            const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

            setMetrics({
                totalStudents: Number(studentsRes[0].count),
                totalTeachers: Number(teachersRes[0].count),
                totalClasses: Number(classesRes[0].count),
                presentToday: Number(attendanceRes[0].count),
                syllabusProgress: progress,
                lateAttendance: Number(lateRes[0].count),
                staffPresent: Number(staffRes[0].count)
            });
        } catch (error) {
            console.error('Error fetching dashboard metrics:', error);
        } finally {
            setLoading(false);
        }
    };

    const attendanceRate = metrics.totalStudents > 0
        ? Math.round((metrics.presentToday / metrics.totalStudents) * 100)
        : 0;

    const kpis = [
        {
            label: 'Total Students',
            value: metrics.totalStudents.toLocaleString(),
            icon: Users,
            trend: 'Live Database',
            color: 'bg-indigo-50',
            iconColor: 'text-indigo-600'
        },
        {
            label: 'Present Today',
            value: `${metrics.presentToday} students`,
            icon: UserCheck,
            trend: `${attendanceRate}% Attendance`,
            color: 'bg-emerald-50',
            iconColor: 'text-emerald-600'
        },
        {
            label: 'Total Teachers',
            value: metrics.totalTeachers.toLocaleString(),
            icon: UserPlus,
            trend: 'Staff Strength',
            color: 'bg-amber-50',
            iconColor: 'text-amber-600'
        },
        {
            label: 'Total Classes',
            value: metrics.totalClasses.toLocaleString(),
            icon: School,
            trend: 'Active Batches',
            color: 'bg-rose-50',
            iconColor: 'text-rose-600'
        }
    ];

    const categories = [
        {
            title: 'School Management',
            icon: School,
            actions: [
                { title: 'Teachers', desc: 'Faculty & staff profiles', icon: Users, color: 'bg-indigo-50', iconColor: 'text-indigo-600', path: '/admin/teachers' },
                { title: 'Classes', desc: 'Set up class & sections', icon: School, color: 'bg-emerald-50', iconColor: 'text-emerald-600', path: '/admin/classes' },
                { title: 'Students', desc: 'Manage student records', icon: UserPlus, color: 'bg-amber-50', iconColor: 'text-amber-600', path: '/admin/students' },
                { title: 'Subjects', desc: 'Assign roles to teachers', icon: BookOpen, color: 'bg-rose-50', iconColor: 'text-rose-600', path: '/admin/subject-assignments' }
            ]
        },
        {
            title: 'Administrative',
            icon: LayoutDashboard,
            actions: [
                { title: 'Analytics', desc: 'Daily activity & logs', icon: Activity, color: 'bg-indigo-50', iconColor: 'text-indigo-600', path: '/admin/log-book' },
                { title: 'Syllabus', desc: 'Academic progression', icon: BookOpen, color: 'bg-emerald-50', iconColor: 'text-emerald-600', path: '/admin/syllabus' },
                { title: 'Notifications', desc: 'Broadcast to everyone', icon: Bell, color: 'bg-rose-50', iconColor: 'text-rose-600', path: '/admin/notifications' },
                { title: 'Settings', desc: 'System configuration', icon: SettingsIcon, color: 'bg-amber-50', iconColor: 'text-amber-600', path: '/admin/settings' }
            ]
        }
    ];

    return (
        <div className="space-y-12 pb-12 overflow-x-hidden">
            {/* Minimal Header */}
            <div className="flex justify-between items-center bg-white/50 backdrop-blur-md p-6 rounded-[32px] border border-white/20 soft-shadow">
                <div>
                    <h1 className="text-4xl font-black text-[#1E1B4B] tracking-tight">Admin Dashboard</h1>
                    <p className="text-gray-500 font-bold mt-1">ClassCheck • School Control Center</p>
                </div>
                <div className="flex items-center gap-4">
                    <button className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center soft-shadow hover:scale-105 transition-all text-gray-400 hover:text-indigo-600">
                        <Bell className="w-6 h-6" />
                    </button>
                    <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-indigo-200">
                        {profile?.full_name?.charAt(0) || 'A'}
                    </div>
                </div>
            </div>

            {/* Premium KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                {kpis.map((kpi, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="bg-white p-7 rounded-[32px] soft-shadow border border-gray-100 flex flex-col gap-6 hover:shadow-2xl hover:shadow-indigo-900/5 transition-all group"
                    >
                        <div className="flex justify-between items-start">
                            <div className={`w-14 h-14 ${kpi.color} rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                                <kpi.icon className={`w-7 h-7 ${kpi.iconColor}`} />
                            </div>
                            {kpi.trend && (
                                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full">
                                    {kpi.trend}
                                </span>
                            )}
                        </div>
                        <div>
                            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">{kpi.label}</p>
                            <p className="text-3xl font-black text-[#1E1B4B]">{kpi.value}</p>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Categories and Actions */}
            <div className="space-y-12">
                {categories.map((category, catIdx) => (
                    <div key={catIdx}>
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                                    <category.icon className="w-5 h-5 text-indigo-600" />
                                </div>
                                <h2 className="text-2xl font-black text-[#1E1B4B] tracking-tight">{category.title}</h2>
                            </div>
                            <div className="h-px flex-1 bg-gray-100 mx-8 hidden md:block" />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {category.actions.map((action, i) => (
                                <motion.div
                                    key={i}
                                    whileHover={{ y: -8, scale: 1.02 }}
                                    onClick={() => navigate(action.path)}
                                    className="bg-white p-6 rounded-[28px] soft-shadow border border-gray-50 hover:shadow-2xl hover:shadow-indigo-900/10 cursor-pointer group transition-all"
                                >
                                    <div className={`w-12 h-12 ${action.color} rounded-xl flex items-center justify-center mb-5 group-hover:rotate-6 transition-all`}>
                                        <action.icon className={`w-6 h-6 ${action.iconColor}`} />
                                    </div>
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <h3 className="text-lg font-black text-[#1E1B4B] mb-1">{action.title}</h3>
                                            <p className="text-sm text-gray-400 font-bold leading-tight">{action.desc}</p>
                                        </div>
                                        <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-indigo-600 transition-colors">
                                            <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" />
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Today's Insights Section */}
            <div className="bg-indigo-50 rounded-[40px] p-10 border border-indigo-100/50 relative overflow-hidden">
                {loading && (
                    <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-50 flex items-center justify-center">
                        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    </div>
                )}
                <div className="flex items-center gap-3 mb-8">
                    <TrendingUp className="w-6 h-6 text-indigo-600" />
                    <h2 className="text-2xl font-black text-[#1E1B4B] tracking-tight">Today's Insights</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-3xl soft-shadow border border-white">
                        <div className="flex items-center gap-3 mb-4">
                            <Clock className="w-5 h-5 text-amber-500" />
                            <span className="text-sm font-black text-gray-400 uppercase tracking-widest">Late Attendance</span>
                        </div>
                        <p className="text-3xl font-black text-[#1E1B4B]">{metrics.lateAttendance} Records</p>
                        <p className="text-xs font-bold text-gray-400 mt-2 italic">Based on 9:00 AM threshold</p>
                    </div>

                    <div className="bg-white p-6 rounded-3xl soft-shadow border border-white">
                        <div className="flex items-center gap-3 mb-4">
                            <Activity className="w-5 h-5 text-indigo-600" />
                            <span className="text-sm font-black text-gray-400 uppercase tracking-widest">Syllabus Completion</span>
                        </div>
                        <p className="text-3xl font-black text-[#1E1B4B]">{metrics.syllabusProgress}% Overall</p>
                        <div className="w-full bg-gray-50 h-2 rounded-full mt-4 overflow-hidden">
                            <div className={`h-full bg-indigo-600 rounded-full transition-all duration-1000`} style={{ width: `${metrics.syllabusProgress}%` }} />
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-3xl soft-shadow border border-white">
                        <div className="flex items-center gap-3 mb-4">
                            <Users className="w-5 h-5 text-emerald-600" />
                            <span className="text-sm font-black text-gray-400 uppercase tracking-widest">Teacher Presence</span>
                        </div>
                        <p className="text-3xl font-black text-[#1E1B4B]">{metrics.staffPresent} / {metrics.totalTeachers}</p>
                        <p className="text-xs font-bold text-emerald-600 mt-2">Faculty members active</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
