import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    BookOpen,
    Loader2,
    Calendar,
    Filter,
    Search,
    ChevronDown,
    X
} from 'lucide-react';
import { sql } from '../../lib/db';
import { useAuthStore } from '../../stores/authStore';
import { toast } from 'sonner';
import type { Homework } from '../../types';

interface ClassInfo {
    id: string;
    name: string;
}

const AdminHomework = () => {
    const { profile } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [homework, setHomework] = useState<Homework[]>([]);
    const [classes, setClasses] = useState<ClassInfo[]>([]);

    // Filters
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [selectedClass, setSelectedClass] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (profile?.id) {
            fetchData();
        }
    }, [profile]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [classesData, homeworkData] = await Promise.all([
                sql`SELECT id, name FROM classes ORDER BY name`,
                sql`
                    SELECT h.*, c.name as class_name, s.name as subject_name, t.full_name as teacher_name
                    FROM homework h
                    JOIN classes c ON h.class_id = c.id
                    JOIN subjects s ON h.subject_id = s.id
                    LEFT JOIN profiles t ON h.teacher_id = t.id
                    ORDER BY h.date DESC, h.created_at DESC
                `
            ]);

            setClasses(classesData as ClassInfo[]);
            setHomework(homeworkData as Homework[]);
        } catch (error) {
            console.error('Error fetching admin homework data:', error);
            toast.error('Failed to load homework');
        } finally {
            setLoading(false);
        }
    };

    const filteredHomework = homework.filter(hw => {
        const matchesDate = selectedDate ? hw.date === selectedDate : true;
        const matchesClass = selectedClass !== 'all' ? hw.class_id === selectedClass : true;
        const matchesSearch = searchQuery
            ? hw.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
            hw.subject_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            hw.description.toLowerCase().includes(searchQuery.toLowerCase())
            : true;

        return matchesDate && matchesClass && matchesSearch;
    });

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC]">
                <Loader2 className="w-10 h-10 mb-4 animate-spin text-amber-600" />
                <p className="text-sm font-semibold text-slate-400 tracking-wide uppercase">Fetching School Homework...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] pb-24 font-inter">
            {/* Premium Header */}
            <div className="bg-slate-900 overflow-hidden relative">
                <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full -translate-y-48 translate-x-48 blur-3xl" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-amber-600/5 rounded-full translate-y-32 -translate-x-32 blur-2xl" />

                <div className="max-w-5xl mx-auto px-6 pt-12 pb-20 relative z-10">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                        <div className="flex items-center gap-6">
                            <div className="w-20 h-20 bg-amber-600 rounded-[28px] flex items-center justify-center shadow-2xl shadow-amber-900/20 border border-amber-500/50">
                                <BookOpen className="w-10 h-10 text-white" strokeWidth={2.5} />
                            </div>
                            <div>
                                <div className="flex items-center gap-3 mb-3">
                                    <span className="px-3 py-1 bg-white/5 text-amber-500 text-[10px] font-black uppercase tracking-[0.2em] rounded-lg border border-white/5">
                                        School Overview
                                    </span>
                                </div>
                                <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-tight uppercase">
                                    Homework Log
                                </h1>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-5xl mx-auto px-4 -mt-10 relative z-20 pb-20">

                {/* Filters */}
                <div className="bg-white rounded-3xl p-6 shadow-xl shadow-slate-200/50 border border-slate-100 mb-8 flex flex-col md:flex-row gap-4 items-center">
                    <div className="relative flex-1 w-full">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search topics, subjects or description..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500/40 transition-all outline-none text-sm font-bold text-slate-700 placeholder:text-slate-400"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                    <div className="flex gap-4 w-full md:w-auto">
                        <div className="relative flex-1 md:w-48">
                            <select
                                value={selectedClass}
                                onChange={(e) => setSelectedClass(e.target.value)}
                                className="w-full pl-4 pr-10 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500/40 transition-all outline-none text-sm font-bold text-slate-700 appearance-none"
                            >
                                <option value="all">All Classes</option>
                                {classes.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>
                        <div className="relative flex-1 md:w-48">
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500/40 transition-all outline-none text-sm font-bold text-slate-700"
                            />
                            {selectedDate && (
                                <button
                                    onClick={() => setSelectedDate('')}
                                    className="absolute right-8 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors bg-slate-50"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {filteredHomework.length > 0 ? (
                    <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                        <div className="bg-amber-600 px-6 py-4 flex justify-between items-center">
                            <h3 className="text-white font-black text-sm uppercase tracking-widest">Homework Records</h3>
                            <span className="text-white/80 text-xs font-bold bg-white/10 px-3 py-1 rounded-full">
                                {filteredHomework.length} Tasks
                            </span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <tbody>
                                    {filteredHomework.map((hw) => (
                                        <tr key={hw.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-6 py-6 w-32">
                                                <div className="flex flex-col items-center justify-center p-3 bg-amber-50 rounded-2xl border border-amber-100/50">
                                                    <Calendar className="w-5 h-5 text-amber-600 mb-1" />
                                                    <span className="text-[10px] font-black text-amber-900 uppercase tracking-widest text-center">
                                                        {new Date(hw.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-6">
                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-3 mb-1">
                                                        <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest rounded-lg">
                                                            Class {hw.class_name}
                                                        </span>
                                                        <span className="text-xs font-bold text-amber-600 uppercase tracking-widest">
                                                            {hw.subject_name}
                                                        </span>
                                                        <span className="text-xs font-medium text-slate-400 ml-auto">
                                                            By {hw.teacher_name || 'Teacher'}
                                                        </span>
                                                    </div>
                                                    <span className="text-base font-black text-slate-800 tracking-tight mt-1">{hw.topic}</span>
                                                    <p className="text-xs text-slate-500 font-medium mt-2 max-w-lg leading-relaxed whitespace-pre-wrap">
                                                        {hw.description}
                                                    </p>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="py-20 text-center bg-white rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden flex flex-col items-center justify-center px-4"
                    >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-linear-to-br from-amber-500/5 to-transparent rounded-full translate-x-16 -translate-y-16" />
                        <div className="w-24 h-24 bg-linear-to-br from-amber-50 to-amber-100 rounded-[32px] flex items-center justify-center mb-8 border border-amber-200 shadow-inner group-hover:scale-110 transition-transform duration-500">
                            <Filter className="w-10 h-10 text-amber-600" />
                        </div>
                        <h3 className="text-2xl font-black text-slate-800 mb-2 tracking-tight">No Results Found</h3>
                        <p className="text-slate-400 text-sm font-medium max-w-sm mx-auto">
                            No homework assignments match your current filters. Try adjusting your search criteria.
                        </p>
                    </motion.div>
                )}
            </div>
        </div>
    );
};

export default AdminHomework;
