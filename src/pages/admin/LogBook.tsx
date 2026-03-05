import { useState, useEffect } from 'react';
import {
    BookOpen,
    Calendar,
    Search,
    Loader2,
    User,
    ChevronDown,
    CalendarDays
} from 'lucide-react';
import { sql } from '../../lib/db';
import { format } from 'date-fns';

interface AdminLog {
    id: string;
    date: string;
    period: string;
    class_name: string;
    subject_name: string;
    teacher_name: string;
    topics_covered: string;
    remarks: string | null;
    created_at: string;
}

const AdminLogBook = () => {
    const [loading, setLoading] = useState(true);
    const [logs, setLogs] = useState<AdminLog[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [dateFilter, setDateFilter] = useState('');
    const [teacherFilter, setTeacherFilter] = useState('');
    const [teachers, setTeachers] = useState<{ id: string, full_name: string }[]>([]);

    useEffect(() => {
        fetchData();
        fetchTeachers();
    }, []);

    const fetchTeachers = async () => {
        try {
            const data = await sql`SELECT id, full_name FROM profiles WHERE role = 'teacher' ORDER BY full_name`;
            setTeachers(data as { id: string, full_name: string }[]);
        } catch (error) {
            console.error('Error fetching teachers:', error);
        }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const data = await sql`
                SELECT 
                    cl.id,
                    cl.date,
                    cl.period,
                    c.name as class_name,
                    s.name as subject_name,
                    p.full_name as teacher_name,
                    cl.topics_covered,
                    cl.remarks,
                    cl.created_at
                FROM class_logs cl
                JOIN class_subjects cs ON cl.class_subject_id = cs.id
                JOIN classes c ON cs.class_id = c.id
                JOIN subjects s ON cs.subject_id = s.id
                JOIN teachers t ON cl.teacher_id = t.id
                JOIN profiles p ON t.email = p.email
                ORDER BY cl.date DESC, cl.created_at DESC
            `;
            setLogs(data as AdminLog[]);
        } catch (error) {
            console.error('Error fetching all logs:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredLogs = logs.filter(log => {
        const matchesSearch =
            log.class_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.subject_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.topics_covered.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.teacher_name.toLowerCase().includes(searchTerm.toLowerCase());

        const logDateStr = log.date ? format(new Date(log.date), 'yyyy-MM-dd') : '';
        const matchesDate = !dateFilter || logDateStr === dateFilter;
        const matchesTeacher = !teacherFilter || log.teacher_name === teacherFilter;

        return matchesSearch && matchesDate && matchesTeacher;
    });

    if (loading && logs.length === 0) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC]">
                <Loader2 className="w-10 h-10 mb-4 animate-spin text-[#008B74]" />
                <p className="text-sm font-semibold text-slate-400 tracking-wide uppercase">Gathers Logs...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 pb-24 font-inter">
            {/* Header section */}
            <div className="bg-[#1E293B] rounded-[32px] p-8 md:p-10 mb-8 shadow-2xl relative overflow-hidden group border border-slate-700/50">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full translate-x-32 -translate-y-32 group-hover:scale-110 transition-transform duration-700" />

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div className="flex items-center gap-6">
                        <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center border border-white/20 shadow-inner">
                            <CalendarDays className="w-7 h-7 text-white" strokeWidth={2.5} />
                        </div>
                        <div>
                            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight leading-none mb-2 drop-shadow-md">
                                Academic Log Book
                            </h1>
                            <p className="text-slate-300 text-sm font-medium">Monitor classroom teaching activity across all classes</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative col-span-1 md:col-span-1">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search logs..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-14 pr-6 py-4 bg-white border border-slate-200 rounded-3xl focus:ring-2 focus:ring-[#008B74] outline-none font-bold text-slate-600 shadow-sm transition-all"
                    />
                </div>

                <div className="relative">
                    <Calendar className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type="date"
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                        className="w-full pl-14 pr-6 py-4 bg-white border border-slate-200 rounded-3xl focus:ring-2 focus:ring-[#008B74] outline-none font-bold text-slate-600 shadow-sm transition-all"
                    />
                </div>

                <div className="relative">
                    <User className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <select
                        value={teacherFilter}
                        onChange={(e) => setTeacherFilter(e.target.value)}
                        className="w-full pl-14 pr-10 py-4 bg-white border border-slate-200 rounded-3xl focus:ring-2 focus:ring-[#008B74] outline-none font-bold text-slate-600 shadow-sm appearance-none transition-all"
                    >
                        <option value="">All Teachers</option>
                        {teachers.map(t => (
                            <option key={t.id} value={t.full_name}>{t.full_name}</option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                </div>
            </div>

            {/* Stats Summary */}
            <div className="mb-8 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Total Entries</span>
                    <span className="text-2xl font-black text-slate-800">{filteredLogs.length}</span>
                </div>
                {/* Add more stats if needed */}
            </div>

            {/* Table View for Admin */}
            <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Date & Period</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Class & Subject</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Teacher</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Topics Covered</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredLogs.map((log) => (
                                <tr key={log.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-8 py-6">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-black text-slate-800">{format(new Date(log.date), 'dd MMM yyyy')}</span>
                                            <span className="text-[10px] font-bold text-[#008B74] uppercase tracking-wider mt-0.5">{log.period}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-slate-800">{log.class_name}</span>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{log.subject_name}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
                                                <span className="text-[10px] font-black text-slate-500">{log.teacher_name.charAt(0)}</span>
                                            </div>
                                            <span className="text-sm font-bold text-slate-600">{log.teacher_name}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 max-w-md">
                                        <p className="text-sm font-medium text-slate-600 line-clamp-2 leading-relaxed">
                                            {log.topics_covered}
                                        </p>
                                        {log.remarks && (
                                            <span className="text-[10px] font-bold text-saas-accent-hover bg-[#EEF2FF] px-2 py-0.5 rounded-md mt-2 inline-block">
                                                RMK: {log.remarks}
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {filteredLogs.length === 0 && (
                    <div className="py-24 text-center">
                        <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-100">
                            <BookOpen className="w-8 h-8 text-slate-200" />
                        </div>
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">No entries match your search</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminLogBook;
