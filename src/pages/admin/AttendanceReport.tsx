import { useState, useEffect } from 'react';
import {
    Users,
    Calendar as CalendarIcon,
    ArrowLeft,
    Search,
    TrendingUp,
    ChevronRight,
    School
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { sql } from '../../lib/db';
import { format } from 'date-fns';
import { clsx } from 'clsx';

interface ClassAttendance {
    id: string;
    name: string;
    teacher_name: string;
    total_students: number;
    present_today: number;
    percentage: number;
}

const AttendanceReport = () => {
    const navigate = useNavigate();
    const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [attendances, setAttendances] = useState<ClassAttendance[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchAttendanceData();
    }, [date]);

    const fetchAttendanceData = async () => {
        try {
            setLoading(true);
            const data = await sql`
                SELECT 
                    c.id,
                    c.name,
                    t.name as teacher_name,
                    (SELECT COUNT(*) FROM students s WHERE s.class_id = c.id) as total_students,
                    (SELECT COUNT(*) FROM attendance a WHERE a.class_id = c.id AND a.date = ${date} AND a.status = 'Present') as present_today
                FROM classes c
                LEFT JOIN teachers t ON c.class_teacher_id = t.id
                ORDER BY c.name ASC
            `;

            const processedData = data.map((row: any) => {
                const total = Number(row.total_students) || 0;
                const present = Number(row.present_today) || 0;
                return {
                    id: row.id,
                    name: row.name,
                    teacher_name: row.teacher_name || 'Not Assigned',
                    total_students: total,
                    present_today: present,
                    percentage: total > 0 ? Math.round((present / total) * 100) : 0
                };
            });

            setAttendances(processedData);
        } catch (error) {
            console.error('Error fetching attendance report:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredData = attendances.filter(a =>
        a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.teacher_name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const averageAttendance = attendances.length > 0
        ? Math.round(attendances.reduce((acc, curr) => acc + curr.percentage, 0) / attendances.length)
        : 0;

    return (
        <div className="space-y-8 pb-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/admin')}
                        className="hidden md:flex w-12 h-12 bg-white rounded-2xl items-center justify-center shadow-sm border border-gray-100 hover:bg-gray-50 transition-all font-bold group"
                    >
                        <ArrowLeft className="w-6 h-6 text-gray-600 group-hover:-translate-x-1 transition-transform" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-black text-[#1E1B4B] tracking-tight">Attendance Report</h1>
                        <p className="text-gray-500 font-medium">Daily class-wise attendance analytics</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-white rounded-2xl border border-gray-100 focus:ring-2 focus:ring-indigo-600 outline-none shadow-sm transition-all font-bold text-[#1E1B4B]"
                        />
                    </div>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-[32px] soft-shadow border border-gray-100">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center">
                            <TrendingUp className="w-6 h-6 text-indigo-600" />
                        </div>
                        <span className="text-sm font-black text-gray-400 uppercase tracking-widest">Global Attendance</span>
                    </div>
                    <p className="text-4xl font-black text-[#1E1B4B]">{averageAttendance}%</p>
                    <p className="text-xs font-bold text-gray-400 mt-2 italic">Average across all {attendances.length} classes</p>
                </div>

                <div className="bg-white p-6 rounded-[32px] soft-shadow border border-gray-100 md:col-span-2">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center">
                            <Users className="w-6 h-6 text-emerald-600" />
                        </div>
                        <span className="text-sm font-black text-gray-400 uppercase tracking-widest">Attendance Status Summary</span>
                    </div>
                    <div className="w-full bg-gray-50 h-3 rounded-full overflow-hidden mt-6 flex">
                        <div
                            className="h-full bg-indigo-600 transition-all duration-1000"
                            style={{ width: `${averageAttendance}%` }}
                        />
                    </div>
                    <div className="flex justify-between mt-3 text-xs font-black text-gray-400 tracking-widest">
                        <span>0%</span>
                        <span>TARGET 95%</span>
                        <span>100%</span>
                    </div>
                </div>
            </div>

            {/* List Section */}
            <div className="bg-white rounded-[32px] soft-shadow border border-gray-100 overflow-hidden">
                <div className="p-8 border-b border-gray-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <h2 className="text-xl font-black text-[#1E1B4B]">Class Statistics</h2>
                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search class or teacher..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-indigo-600 outline-none transition-all font-bold text-[#1E1B4B]"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50/50">
                                <th className="px-8 py-5 text-xs font-black text-gray-400 uppercase tracking-widest">Class</th>
                                <th className="px-8 py-5 text-xs font-black text-gray-400 uppercase tracking-widest">Class Teacher</th>
                                <th className="px-8 py-5 text-xs font-black text-gray-400 uppercase tracking-widest">Present / Total</th>
                                <th className="px-8 py-5 text-xs font-black text-gray-400 uppercase tracking-widest">Attendance %</th>
                                <th className="px-8 py-5 text-xs font-black text-gray-400 uppercase tracking-widest">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={5} className="px-8 py-6 h-20 bg-gray-50/20" />
                                    </tr>
                                ))
                            ) : filteredData.length > 0 ? (
                                filteredData.map((a, i) => (
                                    <motion.tr
                                        key={a.id}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.05 }}
                                        className="group hover:bg-gray-50/50 transition-colors"
                                    >
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                                                    <School className="w-5 h-5 text-indigo-600" />
                                                </div>
                                                <span className="text-lg font-black text-[#1E1B4B]">{a.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className="font-bold text-gray-600">{a.teacher_name}</span>
                                        </td>
                                        <td className="px-8 py-6 text-center">
                                            <div className="flex flex-col items-center">
                                                <span className="text-lg font-black text-[#1E1B4B]">{a.present_today} / {a.total_students}</span>
                                                <span className="text-xs font-bold text-gray-400">Students</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="flex-1 w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                                                    <div
                                                        className={clsx(
                                                            "h-full rounded-full transition-all duration-1000",
                                                            a.percentage >= 90 ? "bg-emerald-500" :
                                                                a.percentage >= 75 ? "bg-amber-500" : "bg-rose-500"
                                                        )}
                                                        style={{ width: `${a.percentage}%` }}
                                                    />
                                                </div>
                                                <span className={clsx(
                                                    "text-lg font-black w-14",
                                                    a.percentage >= 90 ? "text-emerald-600" :
                                                        a.percentage >= 75 ? "text-amber-600" : "text-rose-600"
                                                )}>
                                                    {a.percentage}%
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <button className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                                <ChevronRight className="w-5 h-5" />
                                            </button>
                                        </td>
                                    </motion.tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-8 py-12 text-center text-gray-400 font-bold">
                                        No class attendance records found for this date.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AttendanceReport;
