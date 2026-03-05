import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Clock, BookOpen, FileText, Loader2, Save } from 'lucide-react';
import { sql } from '../../lib/db';
import { useAuthStore } from '../../stores/authStore';
import Button from '../common/Button';
import { toast } from 'sonner';

interface LogEntryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

interface AssignedSubject {
    id: string; // class_subject_id
    class_id: string;
    subject_id: string;
    class_name: string;
    subject_name: string;
}

interface SyllabusChapter {
    id: string;
    chapter_name: string;
}

export const LogEntryModal: React.FC<LogEntryModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const { profile } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [subjects, setSubjects] = useState<AssignedSubject[]>([]);
    const [chapters, setChapters] = useState<SyllabusChapter[]>([]);

    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        period: '',
        class_subject_id: '',
        chapter_id: '',
        topics_covered: '',
        remarks: ''
    });

    useEffect(() => {
        if (isOpen && profile?.email) {
            fetchTeacherSubjects();
        }
    }, [isOpen, profile?.email]);

    useEffect(() => {
        if (formData.class_subject_id) {
            fetchSyllabusChapters(formData.class_subject_id);
        } else {
            setChapters([]);
        }
    }, [formData.class_subject_id]);

    const fetchTeacherSubjects = async () => {
        try {
            const data = await sql`
                SELECT 
                    cs.id,
                    cs.class_id,
                    cs.subject_id,
                    c.name as class_name,
                    s.name as subject_name
                FROM class_subjects cs
                JOIN classes c ON cs.class_id = c.id
                JOIN subjects s ON cs.subject_id = s.id
                JOIN teachers t ON cs.teacher_id = t.id
                WHERE t.email = ${profile?.email}
                ORDER BY c.name, s.name
            `;
            setSubjects(data as AssignedSubject[]);
        } catch (error) {
            console.error('Error fetching subjects:', error);
        }
    };

    const fetchSyllabusChapters = async (classSubjectId: string) => {
        try {
            const data = await sql`
                SELECT id, chapter_name 
                FROM syllabus 
                WHERE class_subject_id = ${classSubjectId}
                ORDER BY order_index ASC
            `;
            setChapters(data as SyllabusChapter[]);
        } catch (error) {
            console.error('Error fetching chapters:', error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!profile?.id) return;

        const savePromise = (async () => {
            // Get the teacher_id from the teachers table based on profile email
            const teacherRes = await sql`SELECT id FROM teachers WHERE email = ${profile.email} LIMIT 1`;
            const teacherId = teacherRes[0]?.id;

            if (!teacherId) throw new Error('Teacher record not found');

            await sql`
                INSERT INTO class_logs (
                    teacher_id, 
                    class_subject_id, 
                    date, 
                    period, 
                    chapter_id, 
                    topics_covered, 
                    remarks
                ) VALUES (
                    ${teacherId},
                    ${formData.class_subject_id},
                    ${formData.date},
                    ${formData.period},
                    ${formData.chapter_id || null},
                    ${formData.topics_covered},
                    ${formData.remarks || null}
                )
            `;
            onSuccess();
            onClose();
            // Reset form
            setFormData({
                date: new Date().toISOString().split('T')[0],
                period: '',
                class_subject_id: '',
                chapter_id: '',
                topics_covered: '',
                remarks: ''
            });
        })();

        toast.promise(savePromise, {
            loading: 'Saving log entry...',
            success: 'Log entry saved successfully!',
            error: 'Failed to save log entry.'
        });

        setLoading(true);
        try {
            await savePromise;
        } catch (error) {
            console.error('Error saving log:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative bg-white rounded-[32px] shadow-2xl w-full max-w-xl overflow-hidden font-inter"
                    >
                        <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">New Log Entry</h2>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Classroom Teaching Record</p>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-slate-50 rounded-xl transition-colors text-slate-400 hover:text-slate-600"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-8 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Date */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Date</label>
                                    <div className="relative">
                                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input
                                            type="date"
                                            required
                                            value={formData.date}
                                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                            className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-[#008B74] focus:border-transparent outline-none font-bold text-slate-700"
                                        />
                                    </div>
                                </div>

                                {/* Period */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Period / Lecture</label>
                                    <div className="relative">
                                        <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input
                                            type="text"
                                            required
                                            placeholder="e.g. 1st, 2nd"
                                            value={formData.period}
                                            onChange={(e) => setFormData({ ...formData, period: e.target.value })}
                                            className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-[#008B74] focus:border-transparent outline-none font-bold text-slate-700"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Class & Subject */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Class & Subject</label>
                                    <div className="relative">
                                        <BookOpen className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <select
                                            required
                                            value={formData.class_subject_id}
                                            onChange={(e) => setFormData({ ...formData, class_subject_id: e.target.value, chapter_id: '' })}
                                            className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-[#008B74] focus:border-transparent outline-none font-bold text-slate-700 appearance-none"
                                        >
                                            <option value="">Select Class / Subject</option>
                                            {subjects.map(s => (
                                                <option key={s.id} value={s.id}>
                                                    {s.class_name} - {s.subject_name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Chapter */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Chapter (Optional)</label>
                                    <div className="relative">
                                        <BookOpen className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <select
                                            value={formData.chapter_id}
                                            onChange={(e) => setFormData({ ...formData, chapter_id: e.target.value })}
                                            disabled={!formData.class_subject_id}
                                            className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-[#008B74] focus:border-transparent outline-none font-bold text-slate-700 appearance-none disabled:opacity-50"
                                        >
                                            <option value="">Select Chapter</option>
                                            {chapters.map(c => (
                                                <option key={c.id} value={c.id}>
                                                    {c.chapter_name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Topics */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Topics Covered</label>
                                <div className="relative">
                                    <FileText className="absolute left-4 top-4 w-4 h-4 text-slate-400" />
                                    <textarea
                                        required
                                        rows={3}
                                        placeholder="Details of topics taught..."
                                        value={formData.topics_covered}
                                        onChange={(e) => setFormData({ ...formData, topics_covered: e.target.value })}
                                        className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-[#008B74] focus:border-transparent outline-none font-bold text-slate-700 resize-none"
                                    />
                                </div>
                            </div>

                            {/* Remarks */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Remarks (Optional)</label>
                                <div className="relative">
                                    <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Any additional notes..."
                                        value={formData.remarks}
                                        onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                                        className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-[#008B74] focus:border-transparent outline-none font-bold text-slate-700"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="flex-1 py-4"
                                    onClick={onClose}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-1 py-4 bg-[#008B74] hover:bg-[#007663]"
                                >
                                    {loading ? (
                                        <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                                    ) : (
                                        <div className="flex items-center justify-center gap-2">
                                            <Save className="w-4 h-4" />
                                            Save Log
                                        </div>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
