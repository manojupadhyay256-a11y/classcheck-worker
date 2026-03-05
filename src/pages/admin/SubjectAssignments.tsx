import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users,
    BookOpen,
    Search,
    ArrowLeft,
    UserPlus,
    Loader2,
    X,
    RefreshCw,
    LayoutGrid,
    Minus
} from 'lucide-react';
import { sql } from '../../lib/db';
import { toast } from 'sonner';

interface Teacher {
    id: string;
    name: string;
    email: string;
}

interface Assignment {
    id: string;
    class_id: string;
    subject_id: string;
    teacher_id: string | null;
    class_name: string;
    subject_name: string;
    teacher_name: string | null;
}

const SubjectAssignments = () => {
    const [view, setView] = useState<'teacher' | 'class'>('teacher');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
    const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
    const [reassignLoading, setReassignLoading] = useState(false);
    const [teacherSearchQuery, setTeacherSearchQuery] = useState('');

    useEffect(() => {
        fetchData(false);
    }, []);

    const fetchData = async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);

        try {
            const [assignmentsData, teachersData] = await Promise.all([
                sql`
                    SELECT 
                        cs.id,
                        cs.class_id,
                        cs.subject_id,
                        cs.teacher_id,
                        c.name as class_name,
                        s.name as subject_name,
                        t.name as teacher_name
                    FROM class_subjects cs
                    JOIN classes c ON cs.class_id = c.id
                    JOIN subjects s ON cs.subject_id = s.id
                    LEFT JOIN teachers t ON cs.teacher_id = t.id
                    ORDER BY c.name, s.name
                `,
                sql`SELECT id, name, email FROM teachers ORDER BY name`
            ]);
            setAssignments(assignmentsData as Assignment[]);
            setTeachers(teachersData as Teacher[]);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleUnassign = async (assignmentId: string) => {
        if (!confirm('Are you sure you want to unassign this teacher?')) return;

        const promise = (async () => {
            await sql`
                UPDATE class_subjects 
                SET teacher_id = NULL 
                WHERE id = ${assignmentId}
            `;
            fetchData(true);
        })();

        toast.promise(promise, {
            loading: 'Unassigning teacher...',
            success: 'Teacher unassigned successfully!',
            error: 'Failed to unassign teacher'
        });
    };

    const handleReassign = async (teacherId: string) => {
        if (!selectedAssignment) return;
        setReassignLoading(true);

        const promise = (async () => {
            await sql`
                UPDATE class_subjects 
                SET teacher_id = ${teacherId} 
                WHERE id = ${selectedAssignment.id}
            `;
            setIsReassignModalOpen(false);
            setSelectedAssignment(null);
            setTeacherSearchQuery('');
            fetchData(true);
        })();

        toast.promise(promise, {
            loading: 'Reassigning teacher...',
            success: 'Teacher reassigned successfully!',
            error: 'Failed to reassign teacher'
        });

        try {
            await promise;
        } catch (error) {
            console.error('Error reassigning:', error);
        } finally {
            setReassignLoading(false);
        }
    };

    const filteredAssignments = assignments.filter(a =>
        a.class_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.subject_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (a.teacher_name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
    );

    const teacherWiseData = teachers.map(teacher => ({
        ...teacher,
        assignments: filteredAssignments.filter(a => a.teacher_id === teacher.id)
    })).filter(t => t.assignments.length > 0 || (searchQuery === '' && view === 'teacher'));

    const classWiseData = Array.from(new Set(filteredAssignments.map(a => a.class_id))).map(classId => {
        const classAssignments = filteredAssignments.filter(a => a.class_id === classId);
        return {
            id: classId,
            name: classAssignments[0]?.class_name || 'N/A',
            assignments: classAssignments
        };
    });

    /* ── Loading state ─────────────────────────────── */
    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC] font-inter">
                <Loader2 className="w-10 h-10 mb-4 animate-spin text-saas-accent" />
                <p className="text-sm font-semibold text-slate-400 tracking-wide">Loading assignments…</p>
            </div>
        );
    }

    const toggleOptions = [
        { key: 'teacher' as const, label: 'Teacher Wise', icon: Users },
        { key: 'class' as const, label: 'Class Wise', icon: BookOpen },
    ];

    /* ── Main render ───────────────────────────────── */
    return (
        <div className="min-h-screen bg-[#F8FAFC] pb-24 font-inter">

            {/* ── Header ────────────────────────────── */}
            <div className="bg-saas-dark text-white">
                <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
                    {/* Top row: back + sync */}
                    <div className="flex items-center justify-between mb-8">
                        <button
                            onClick={() => window.history.back()}
                            className="hidden md:flex items-center gap-2 text-slate-400 hover:text-white transition-colors duration-200 cursor-pointer min-h-[44px]"
                        >
                            <ArrowLeft className="w-4 h-4" strokeWidth={2} />
                            <span className="text-sm font-medium">Back</span>
                        </button>
                        {refreshing && (
                            <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                Syncing…
                            </div>
                        )}
                    </div>

                    {/* Title row */}
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-saas-accent/10 rounded-xl border border-saas-accent/20">
                                <LayoutGrid className="w-6 h-6 text-saas-accent" strokeWidth={2} />
                            </div>
                            <div>
                                <h1 className="text-2xl md:text-3xl font-semibold tracking-tight leading-none mb-1">Subject Assignments</h1>
                                <p className="text-slate-500 text-sm font-normal">Manage teacher-to-subject mappings across all classes.</p>
                            </div>
                        </div>

                        {/* Search */}
                        <div className="relative w-full md:w-80">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" strokeWidth={2} />
                            <input
                                type="text"
                                placeholder="Search teachers, subjects…"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-saas-accent/40 focus:border-saas-accent/40 transition-all duration-200 search-inset min-h-[44px]"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Content ───────────────────────────── */}
            <div className="max-w-7xl mx-auto px-4 md:px-8 mt-8">

                {/* ── Pill Switch Toggle ─────────────── */}
                <div className="relative bg-slate-100 p-1 rounded-xl inline-flex gap-0.5 mb-10">
                    {toggleOptions.map(opt => (
                        <button
                            key={opt.key}
                            onClick={() => setView(opt.key)}
                            className="relative flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold cursor-pointer transition-colors duration-200 min-h-[44px] z-10"
                            style={{ color: view === opt.key ? '#fff' : '#64748b' }}
                        >
                            <opt.icon className="w-4 h-4" strokeWidth={2} />
                            {opt.label}
                            {view === opt.key && (
                                <motion.div
                                    layoutId="pill-indicator"
                                    className="absolute inset-0 bg-saas-accent rounded-lg shadow-lg"
                                    style={{ zIndex: -1 }}
                                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                                />
                            )}
                        </button>
                    ))}
                </div>

                {/* ── Cards Grid ─────────────────────── */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <AnimatePresence mode="wait">
                        {view === 'teacher' ? (
                            teacherWiseData.map((teacher, index) => (
                                <motion.div
                                    key={teacher.id}
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.04, duration: 0.25 }}
                                    className="bg-white rounded-2xl border border-saas-border saas-shadow hover:saas-shadow-hover transition-all duration-200 overflow-hidden flex flex-col"
                                >
                                    {/* Card header */}
                                    <div className="p-6 flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-saas-accent/10 rounded-xl flex items-center justify-center text-saas-accent text-lg font-semibold">
                                                {teacher.name.charAt(0)}
                                            </div>
                                            <div>
                                                <h3 className="text-base font-semibold text-saas-dark leading-tight">{teacher.name}</h3>
                                                <p className="text-xs text-slate-400 mt-0.5 font-mono">{teacher.email}</p>
                                            </div>
                                        </div>
                                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-saas-accent/10 text-saas-accent text-xs font-semibold rounded-lg">
                                            {teacher.assignments.length}
                                            <span className="hidden sm:inline">subjects</span>
                                        </span>
                                    </div>

                                    {/* Assignment rows */}
                                    <div className="px-6 pb-6 flex-1">
                                        <div className="border border-saas-border rounded-xl overflow-hidden">
                                            {/* Table header */}
                                            <div className="grid grid-cols-[1fr_1.2fr_auto] gap-2 px-4 py-2.5 bg-slate-50/80 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                                                <span>Class</span>
                                                <span>Subject</span>
                                                <span className="text-right">Action</span>
                                            </div>
                                            {/* Rows */}
                                            {teacher.assignments.map((a, i) => (
                                                <div
                                                    key={a.id}
                                                    className={`grid grid-cols-[1fr_1.2fr_auto] gap-2 items-center px-4 py-3 text-sm transition-colors duration-200 hover:bg-slate-50 ${i > 0 ? 'border-t border-saas-border' : ''}`}
                                                >
                                                    <span className="font-semibold text-saas-dark">{a.class_name}</span>
                                                    <span className="text-slate-500">{a.subject_name}</span>
                                                    <div className="text-right">
                                                        <button
                                                            onClick={() => handleUnassign(a.id)}
                                                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 transition-all duration-200 cursor-pointer min-h-[32px]"
                                                        >
                                                            <Minus className="w-3 h-3" strokeWidth={2} />
                                                            <span className="hidden sm:inline">Unassign</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                            {teacher.assignments.length === 0 && (
                                                <div className="px-4 py-10 text-center">
                                                    <p className="text-sm text-slate-400 italic">No active assignments</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            ))
                        ) : (
                            classWiseData.map((cls, index) => (
                                <motion.div
                                    key={cls.id}
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.04, duration: 0.25 }}
                                    className="bg-white rounded-2xl border border-saas-border saas-shadow hover:saas-shadow-hover transition-all duration-200 overflow-hidden"
                                >
                                    {/* Card header — white with left indigo accent */}
                                    <div className="p-6 flex items-center gap-4 border-b border-saas-border relative">
                                        <div className="absolute left-0 top-4 bottom-4 w-1 bg-saas-accent rounded-r-full" />
                                        <div className="p-2.5 bg-saas-accent/10 rounded-xl">
                                            <BookOpen className="w-5 h-5 text-saas-accent" strokeWidth={2} />
                                        </div>
                                        <div>
                                            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Class</p>
                                            <h3 className="text-lg font-semibold text-saas-dark leading-tight">{cls.name}</h3>
                                        </div>
                                    </div>

                                    {/* Subject rows */}
                                    <div className="p-4 space-y-2">
                                        {cls.assignments.map(a => (
                                            <div
                                                key={a.id}
                                                className="flex items-center justify-between p-4 rounded-xl border border-transparent hover:border-saas-border hover:bg-slate-50/50 transition-all duration-200 group"
                                            >
                                                <div className="min-w-0">
                                                    <p className="text-xs font-semibold text-saas-accent mb-1">{a.subject_name}</p>
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 bg-slate-100 rounded-md flex items-center justify-center text-[10px] font-semibold text-slate-400">
                                                            {a.teacher_name?.charAt(0) || '?'}
                                                        </div>
                                                        <span className={`text-sm ${a.teacher_name ? 'text-saas-dark font-medium' : 'text-rose-500 italic text-xs'}`}>
                                                            {a.teacher_name || 'Unassigned'}
                                                        </span>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        setSelectedAssignment(a);
                                                        setIsReassignModalOpen(true);
                                                    }}
                                                    className="px-4 py-2 rounded-lg text-xs font-medium text-slate-500 bg-slate-100 hover:bg-saas-accent hover:text-white transition-all duration-200 active:scale-95 cursor-pointer min-h-[36px] whitespace-nowrap"
                                                >
                                                    Change
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* ── Reassign Modal ─────────────────────── */}
            <AnimatePresence>
                {isReassignModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            onClick={() => setIsReassignModalOpen(false)}
                            className="absolute inset-0 bg-saas-dark/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 10 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 10 }}
                            transition={{ duration: 0.2 }}
                            className="relative bg-white rounded-2xl max-w-lg w-full saas-shadow overflow-hidden flex flex-col max-h-[85vh]"
                        >
                            {/* Indigo accent bar */}
                            <div className="h-1 bg-saas-accent w-full shrink-0" />

                            {/* Modal header */}
                            <div className="p-6 border-b border-saas-border shrink-0">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="text-lg font-semibold text-saas-dark">Assign Teacher</h3>
                                        <div className="flex items-center gap-2 mt-2">
                                            <span className="px-2.5 py-1 bg-saas-accent/10 text-saas-accent text-xs font-semibold rounded-md">
                                                {selectedAssignment?.subject_name}
                                            </span>
                                            <span className="text-slate-400 text-xs">
                                                Class {selectedAssignment?.class_name}
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setIsReassignModalOpen(false)}
                                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors duration-200 cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center"
                                    >
                                        <X className="w-5 h-5 text-slate-400" strokeWidth={2} />
                                    </button>
                                </div>

                                {/* Search in modal */}
                                <div className="relative mt-4">
                                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" strokeWidth={2} />
                                    <input
                                        type="text"
                                        placeholder="Search by name or email…"
                                        value={teacherSearchQuery}
                                        onChange={(e) => setTeacherSearchQuery(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-saas-border rounded-xl text-sm text-saas-dark placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-saas-accent/20 focus:border-saas-accent/30 transition-all duration-200 search-inset min-h-[44px]"
                                    />
                                </div>
                            </div>

                            {/* Teacher list */}
                            <div className="flex-1 overflow-y-auto p-3 space-y-1">
                                {teachers
                                    .filter(t =>
                                        t.name.toLowerCase().includes(teacherSearchQuery.toLowerCase()) ||
                                        t.email.toLowerCase().includes(teacherSearchQuery.toLowerCase())
                                    )
                                    .map(teacher => (
                                        <button
                                            key={teacher.id}
                                            onClick={() => handleReassign(teacher.id)}
                                            disabled={reassignLoading}
                                            className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-slate-50 border border-transparent hover:border-saas-border transition-all duration-200 group disabled:opacity-50 cursor-pointer min-h-[60px]"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-saas-accent/10 rounded-lg flex items-center justify-center text-saas-accent text-sm font-semibold group-hover:bg-saas-accent group-hover:text-white transition-all duration-200">
                                                    {teacher.name.charAt(0)}
                                                </div>
                                                <div className="text-left">
                                                    <p className="text-sm font-semibold text-saas-dark group-hover:text-saas-accent transition-colors duration-200">{teacher.name}</p>
                                                    <p className="text-xs text-slate-400 font-mono">{teacher.email}</p>
                                                </div>
                                            </div>
                                            {reassignLoading && selectedAssignment?.teacher_id === teacher.id ? (
                                                <Loader2 className="w-5 h-5 text-saas-accent animate-spin" />
                                            ) : (
                                                <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center group-hover:bg-saas-accent/10 transition-all duration-200">
                                                    <UserPlus className="w-4 h-4 text-slate-400 group-hover:text-saas-accent transition-colors duration-200" strokeWidth={2} />
                                                </div>
                                            )}
                                        </button>
                                    ))}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default SubjectAssignments;
