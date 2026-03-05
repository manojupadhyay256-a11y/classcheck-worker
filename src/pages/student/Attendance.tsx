import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    CalendarCheck,
    Loader2,
    TrendingUp,
    Calendar,
    CheckCircle2,
    XCircle,
    Clock,
    Info
} from 'lucide-react';
import { sql } from '../../lib/db';
import { useAuthStore } from '../../stores/authStore';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isWeekend, startOfWeek, endOfWeek } from 'date-fns';
import { clsx } from 'clsx';

interface AttendanceRecord {
    date: string;
    status: 'Present' | 'Absent' | 'Leave' | 'Holiday';
}

const StudentAttendance = () => {
    const { profile } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [records, setRecords] = useState<AttendanceRecord[]>([]);
    const [currentMonth, setCurrentMonth] = useState(new Date());

    useEffect(() => {
        if (profile?.id) {
            fetchAttendance();
        }
    }, [profile?.id]);

    const fetchAttendance = async () => {
        if (!profile?.email) return;
        setLoading(true);
        try {
            const admissionNo = profile.email.split('@')[0];
            const data = await sql`
                SELECT date, status 
                FROM attendance 
                WHERE student_id = (SELECT id FROM students WHERE admission_no = ${admissionNo} LIMIT 1)
                ORDER BY date DESC
            `;
            setRecords(data as AttendanceRecord[]);
        } catch (error) {
            console.error('Error fetching attendance:', error);
        } finally {
            setLoading(false);
        }
    };

    const stats = {
        total: records.length,
        present: records.filter(r => r.status === 'Present').length,
        absent: records.filter(r => r.status === 'Absent').length,
        leave: records.filter(r => r.status === 'Leave').length,
        percentage: records.length > 0
            ? Math.round((records.filter(r => r.status === 'Present').length / records.length) * 100)
            : 0
    };

    // Calendar logic
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);

    const days = eachDayOfInterval({
        start: calendarStart,
        end: calendarEnd,
    });

    const getStatusForDate = (date: Date) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        return records.find(r => format(new Date(r.date), 'yyyy-MM-dd') === dateStr)?.status;
    };

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC]">
                <Loader2 className="w-10 h-10 mb-4 animate-spin text-primary" />
                <p className="text-sm font-semibold text-slate-400 tracking-wide uppercase">Calculating Attendance...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 pb-24 font-inter text-[#1E1B4B]">
            {/* Header section */}
            <div className="bg-primary rounded-[32px] p-8 md:p-10 mb-8 shadow-2xl relative overflow-hidden group border border-primary/20">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full translate-x-32 -translate-y-32 group-hover:scale-110 transition-transform duration-700" />

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div className="flex items-center gap-6">
                        <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center border border-white/30 shadow-inner">
                            <CalendarCheck className="w-7 h-7 text-white" strokeWidth={2.5} />
                        </div>
                        <div>
                            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight leading-none mb-2 drop-shadow-md uppercase">
                                My Attendance
                            </h1>
                            <p className="text-white/70 text-sm font-medium">Tracking your classroom presence</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 bg-white/10 p-2 rounded-2xl border border-white/20 backdrop-blur-sm">
                        <div className="px-6 py-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-white/50 block mb-0.5">Attendance Rate</span>
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-black text-white">{stats.percentage}%</span>
                                <TrendingUp className="w-4 h-4 text-emerald-400" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                {[
                    { label: 'Total Marked', value: stats.total, icon: Calendar, color: 'text-indigo-500', bg: 'bg-indigo-50' },
                    { label: 'Present Days', value: stats.present, icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50' },
                    { label: 'Absent Days', value: stats.absent, icon: XCircle, color: 'text-rose-500', bg: 'bg-rose-50' },
                    { label: 'On Leave', value: stats.leave, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50' },
                ].map((stat, i) => (
                    <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-5 group hover:shadow-lg transition-all duration-300"
                    >
                        <div className={clsx("w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110", stat.bg)}>
                            <stat.icon className={clsx("w-6 h-6", stat.color)} />
                        </div>
                        <div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">{stat.label}</span>
                            <span className="text-2xl font-black text-slate-800">{stat.value}</span>
                        </div>
                    </motion.div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Calendar View */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-xl overflow-hidden">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
                                <Calendar className="w-6 h-6 text-primary" />
                                {format(currentMonth, 'MMMM yyyy')}
                            </h2>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1))}
                                    className="p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors border border-slate-100"
                                >
                                    <span className="sr-only">Previous Month</span>
                                    <TrendingUp className="w-4 h-4 rotate-270" />
                                </button>
                                <button
                                    onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1))}
                                    className="p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors border border-slate-100"
                                >
                                    <span className="sr-only">Next Month</span>
                                    <TrendingUp className="w-4 h-4 rotate-90" />
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-7 gap-px bg-slate-100 rounded-2xl overflow-hidden border border-slate-100">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                                <div key={day} className="bg-slate-50 py-4 text-center">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{day}</span>
                                </div>
                            ))}
                            {days.map((day) => {
                                const status = getStatusForDate(day);
                                return (
                                    <div
                                        key={day.toString()}
                                        className={clsx(
                                            "min-h-[100px] bg-white p-3 relative transition-all duration-300",
                                            !isSameMonth(day, monthStart) && "bg-slate-50/50 opacity-30",
                                            isToday(day) && "bg-primary/5 ring-1 ring-primary/20 inset-0"
                                        )}
                                    >
                                        <time
                                            dateTime={format(day, 'yyyy-MM-dd')}
                                            className={clsx(
                                                "text-sm font-black text-slate-400",
                                                isToday(day) && "text-primary"
                                            )}
                                        >
                                            {format(day, 'd')}
                                        </time>

                                        <div className="mt-2">
                                            {status === 'Present' && (
                                                <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100">
                                                    <CheckCircle2 className="w-3 h-3" />
                                                    <span className="text-[10px] font-black uppercase">Present</span>
                                                </div>
                                            )}
                                            {status === 'Absent' && (
                                                <div className="flex items-center gap-1.5 px-2 py-1 bg-rose-50 text-rose-600 rounded-lg border border-rose-100">
                                                    <XCircle className="w-3 h-3" />
                                                    <span className="text-[10px] font-black uppercase">Absent</span>
                                                </div>
                                            )}
                                            {status === 'Leave' && (
                                                <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-50 text-amber-600 rounded-lg border border-amber-100">
                                                    <Clock className="w-3 h-3" />
                                                    <span className="text-[10px] font-black uppercase">Leave</span>
                                                </div>
                                            )}
                                            {status === 'Holiday' && (
                                                <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-50 text-slate-500 rounded-lg border border-slate-100">
                                                    <Info className="w-3 h-3" />
                                                    <span className="text-[10px] font-black uppercase">Holiday</span>
                                                </div>
                                            )}
                                            {isWeekend(day) && !status && isSameMonth(day, monthStart) && (
                                                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest px-2">Weekend</span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* History List */}
                <div className="space-y-6">
                    <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-xl h-full">
                        <h2 className="text-xl font-black uppercase tracking-tight mb-8">Recent Activity</h2>
                        <div className="space-y-4">
                            {records.slice(0, 8).map((record, i) => (
                                <motion.div
                                    key={record.date}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:border-primary/20 transition-all group"
                                >
                                    <div>
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                                            {format(new Date(record.date), 'EEEE')}
                                        </span>
                                        <span className="text-sm font-bold text-slate-700">
                                            {format(new Date(record.date), 'MMMM do, yyyy')}
                                        </span>
                                    </div>
                                    <div className={clsx(
                                        "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                                        record.status === 'Present' ? "bg-emerald-500 text-white" :
                                            record.status === 'Absent' ? "bg-rose-500 text-white" :
                                                "bg-amber-500 text-white"
                                    )}>
                                        {record.status}
                                    </div>
                                </motion.div>
                            ))}
                            {records.length === 0 && (
                                <div className="text-center py-12">
                                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No history found</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudentAttendance;
