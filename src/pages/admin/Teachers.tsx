import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
    Plus,
    Search,
    Edit2,
    Trash2,
    Users as UsersIcon,
    Loader2
} from 'lucide-react';
import Button from '../../components/common/Button';
import { motion, AnimatePresence } from 'framer-motion';
import { sql } from '../../lib/db';
import { clsx } from 'clsx';
import { deleteSelectedTeachers } from '../../lib/bulkImport';
import { authClient } from '../../lib/auth-client';

const Teachers = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [teachers, setTeachers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // CRUD States
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTeacher, setEditingTeacher] = useState<any>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState({ name: '', email: '', is_office: false, is_librarian: false });
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const fetchTeachers = async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        try {
            const data = await sql`
                SELECT 
                    t.id, 
                    t.name,
                    t.email,
                    t.created_at,
                    COALESCE(p.is_office, false) as is_office,
                    COALESCE(p.is_librarian, false) as is_librarian,
                    COALESCE(
                        ARRAY_AGG(DISTINCT ct_class.name) FILTER (WHERE ct_class.name IS NOT NULL),
                        ARRAY[]::text[]
                    ) as homeroom_classes,
                    COALESCE(
                        ARRAY_AGG(DISTINCT cs_class.name) FILTER (WHERE cs_class.name IS NOT NULL),
                        ARRAY[]::text[]
                    ) as teaching_classes,
                    COALESCE(
                        ARRAY_AGG(DISTINCT s.name) FILTER (WHERE s.name IS NOT NULL),
                        ARRAY[]::text[]
                    ) as subjects
                FROM teachers t
                LEFT JOIN profiles p ON t.email = p.email
                LEFT JOIN classes ct_class ON t.id = ct_class.class_teacher_id
                LEFT JOIN class_subjects cs ON t.id = cs.teacher_id
                LEFT JOIN classes cs_class ON cs.class_id = cs_class.id
                LEFT JOIN subjects s ON cs.subject_id = s.id
                GROUP BY t.id, t.name, t.email, t.created_at, p.is_office, p.is_librarian
                ORDER BY t.name ASC
            `;
            setTeachers(data);
        } catch (error) {
            console.error('Error fetching teachers:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchTeachers();
    }, []);

    const filteredTeachers = teachers.filter(t =>
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.email && t.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const handleOpenModal = (teacher?: any) => {
        if (teacher) {
            setEditingTeacher(teacher);
            setFormData({ name: teacher.name, email: teacher.email || '', is_office: !!teacher.is_office, is_librarian: !!teacher.is_librarian });
        } else {
            setEditingTeacher(null);
            setFormData({ name: '', email: '', is_office: false, is_librarian: false });
        }
        setError(null);
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim()) return;

        setIsSaving(true);
        setError(null);

        const savePromise = (async () => {
            if (editingTeacher) {
                await sql`
                    UPDATE teachers 
                    SET name = ${formData.name.trim()}, 
                        email = ${formData.email.trim() || null} 
                    WHERE id = ${editingTeacher.id}
                `;
                await sql`
                    UPDATE profiles
                    SET is_office = ${formData.is_office},
                        is_librarian = ${formData.is_librarian}
                    WHERE email = ${formData.email.trim()}
                `;
            } else {
                const email = formData.email.trim() || null;
                const name = formData.name.trim();
                
                // 1. Insert teacher record
                await sql`
                    INSERT INTO teachers (name, email)
                    VALUES (${name}, ${email})
                `;

                // 2. If email exists, create auth account and profile with roles
                if (email) {
                    try {
                        try {
                            await authClient.signUp.email({
                                email,
                                password: 'dps@12345',
                                name
                            });
                        } catch (err) {
                            console.log('Account might already exist in auth system', err);
                        }

                        const authUsers = await sql`
                            SELECT id FROM neon_auth."user" WHERE email = ${email} LIMIT 1
                        `;

                        if (authUsers.length > 0) {
                            await sql`
                                INSERT INTO public.profiles (id, full_name, email, role, is_office, is_librarian)
                                VALUES (${authUsers[0].id}, ${name}, ${email}, 'teacher', ${formData.is_office}, ${formData.is_librarian})
                                ON CONFLICT (email) DO UPDATE SET 
                                    id = EXCLUDED.id,
                                    full_name = EXCLUDED.full_name,
                                    role = 'teacher',
                                    is_office = EXCLUDED.is_office,
                                    is_librarian = EXCLUDED.is_librarian
                            `;
                        } else {
                            console.warn('Could not find auth user for profile creation');
                        }
                    } catch (err) {
                        console.error('Failed to create/sync profile for new teacher:', err);
                    }
                }
            }
            await fetchTeachers(true);
            setIsModalOpen(false);
        })();

        toast.promise(savePromise, {
            loading: editingTeacher ? 'Updating teacher record...' : 'Creating teacher record...',
            success: editingTeacher ? 'Teacher record updated successfully!' : 'New teacher record created successfully!',
            error: (err: any) => err?.message || 'Failed to save teacher. A teacher with this name might already exist.'
        });

        try {
            await savePromise;
        } catch (err: any) {
            console.error('Error saving teacher:', err);
            setError(err.message || 'Failed to save teacher');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to delete ${name}? This will also remove all subject assignments for this teacher.`)) return;

        try {
            // Nullify class teacher assignments first (to avoid FK issues)
            await sql`UPDATE classes SET class_teacher_id = NULL WHERE class_teacher_id = ${id}`;
            // Delete from teachers table (class_subjects has ON DELETE CASCADE)
            await sql`DELETE FROM teachers WHERE id = ${id}`;
            await fetchTeachers(true);
            const newSelected = new Set(selectedIds);
            newSelected.delete(id);
            setSelectedIds(newSelected);
            toast.success(`${name} has been removed from the directory.`);
        } catch (error) {
            console.error('Error deleting teacher:', error);
            toast.error('Failed to delete teacher. Please try again.');
        }
    };

    const handleBulkDelete = async () => {
        const count = selectedIds.size;
        if (count === 0) return;
        if (!confirm(`Are you sure you want to delete ${count} selected teachers? This will also remove their subject assignments.`)) return;

        const bulkDeletePromise = (async () => {
            const ids = Array.from(selectedIds);
            await deleteSelectedTeachers(ids);
            await fetchTeachers(true);
            setSelectedIds(new Set());
        })();

        toast.promise(bulkDeletePromise, {
            loading: `Removing ${count} teachers...`,
            success: 'Selected teachers removed successfully!',
            error: 'Failed to remove selected teachers.'
        });

        try {
            await bulkDeletePromise;
        } catch (err) {
            console.error('Bulk delete error:', err);
        }
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === filteredTeachers.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredTeachers.map(t => t.id)));
        }
    };

    const toggleSelectOne = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    return (
        <div className="space-y-8 pb-24">
            {/* Hero Header */}
            <div className="relative overflow-hidden bg-amber-600 rounded-2xl md:rounded-3xl p-4 md:p-10 text-white shadow-lg">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full translate-x-16 -translate-y-16 blur-3xl" />
                <div className="relative z-10">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 mb-6">
                        <div>
                            <p className="text-amber-100/80 font-medium text-[11px] md:text-xs uppercase tracking-widest flex items-center gap-1.5 mb-1">
                                <UsersIcon className="w-3.5 h-3.5" />
                                Faculty Management
                            </p>
                            <h1 className="text-xl md:text-4xl font-black tracking-tight">Teacher Directory</h1>
                            <p className="text-amber-100/60 text-sm font-medium mt-1">Manage staff profiles and teaching assignments • {teachers.length} Teachers</p>
                        </div>
                        <Button
                            onClick={() => handleOpenModal()}
                            className="bg-white text-amber-700 hover:bg-amber-50 shadow-xl px-6 py-3 sm:py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 shrink-0 self-start"
                        >
                            <Plus className="w-5 h-5" strokeWidth={3} />
                            <span className="font-bold">Add Teacher</span>
                        </Button>
                    </div>
                    <div className="relative sm:w-80">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
                        <input
                            type="text"
                            placeholder="Search by name or email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-sm text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 transition-all"
                        />
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div>
                {loading ? (
                    <div className="bg-white rounded-2xl saas-shadow border border-saas-border flex flex-col items-center justify-center py-20 sm:py-32 gap-4">
                        <Loader2 className="w-8 h-8 sm:w-10 sm:h-10 text-saas-accent animate-spin" strokeWidth={3} />
                        <p className="text-slate-400 font-semibold tracking-wide uppercase text-[10px] sm:text-[11px]">Syncing Directory...</p>
                    </div>
                ) : filteredTeachers.length > 0 ? (
                    <>
                        {/* Desktop Table View */}
                        <div className="hidden md:block bg-white rounded-2xl saas-shadow border border-saas-border overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-slate-50/50 border-b border-saas-border">
                                            <th className="px-8 py-5 w-12 text-center">
                                                <input
                                                    type="checkbox"
                                                    checked={filteredTeachers.length > 0 && selectedIds.size === filteredTeachers.length}
                                                    onChange={toggleSelectAll}
                                                    className="w-4 h-4 rounded border-slate-300 text-saas-accent focus:ring-saas-accent/20 cursor-pointer"
                                                />
                                            </th>
                                            <th className="px-8 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Educator Info</th>
                                            <th className="px-8 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Academic Focus</th>
                                            <th className="px-8 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-saas-border">
                                        <AnimatePresence mode="popLayout">
                                            {filteredTeachers.map((teacher, index) => (
                                                <motion.tr
                                                    key={teacher.id}
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, scale: 0.95 }}
                                                    transition={{ delay: index * 0.03 }}
                                                    className={clsx(
                                                        "group transition-colors duration-200",
                                                        selectedIds.has(teacher.id) ? "bg-saas-accent/5" : "hover:bg-slate-50/50"
                                                    )}
                                                >
                                                    <td className="px-8 py-6 text-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedIds.has(teacher.id)}
                                                            onChange={() => toggleSelectOne(teacher.id)}
                                                            className="w-4 h-4 rounded border-slate-300 text-saas-accent focus:ring-saas-accent/20 cursor-pointer"
                                                        />
                                                    </td>
                                                    <td className="px-8 py-6">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-12 h-12 rounded-xl bg-saas-accent/5 border border-saas-accent/10 flex items-center justify-center text-saas-accent font-bold text-lg">
                                                                {teacher.name.charAt(0)}
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="font-semibold text-saas-dark text-[15px] flex items-center gap-2">
                                                                    {teacher.name}
                                                                    {teacher.is_office && <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded uppercase font-bold border border-slate-200">Office I/C</span>}
                                                                    {teacher.is_librarian && <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded uppercase font-bold border border-blue-200">Librarian</span>}
                                                                </span>
                                                                <span className="text-xs text-slate-400 font-mono mt-0.5">{teacher.email || 'No email set'}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-6">
                                                        <div className="flex flex-col gap-2">
                                                            {teacher.homeroom_classes?.length > 0 && (
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded leading-none">CT</span>
                                                                    <div className="flex flex-wrap gap-1">
                                                                        {teacher.homeroom_classes.map((cls: string) => (
                                                                            <span key={cls} className="text-[11px] font-semibold text-amber-700 bg-amber-100/50 px-2 py-0.5 rounded-lg border border-amber-200/50">{cls}</span>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}
                                                            {teacher.subjects?.length > 0 && (
                                                                <div className="flex flex-wrap gap-1.5">
                                                                    {teacher.subjects.map((subj: string) => (
                                                                        <span key={subj} className="text-[11px] font-semibold text-saas-accent bg-saas-accent/5 px-2 py-0.5 rounded-lg border border-saas-accent/10 uppercase tracking-tight">{subj}</span>
                                                                    ))}
                                                                </div>
                                                            )}
                                                            {teacher.teaching_classes?.length > 0 && (
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-[10px] font-bold text-slate-400 uppercase">In:</span>
                                                                    <div className="flex flex-wrap gap-1">
                                                                        {teacher.teaching_classes.map((cls: string) => (
                                                                            <span key={cls} className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg">{cls}</span>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}
                                                            {(!teacher.homeroom_classes?.length && !teacher.subjects?.length) && (
                                                                <span className="text-slate-300 italic text-[13px] font-medium">Unassigned Profile</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-6 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <button
                                                                onClick={() => handleOpenModal(teacher)}
                                                                className="p-2.5 text-slate-400 hover:text-saas-accent hover:bg-saas-accent/5 rounded-xl transition-all duration-200 cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center border border-transparent hover:border-saas-accent/10"
                                                            >
                                                                <Edit2 className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(teacher.id, teacher.name)}
                                                                className="p-2.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all duration-200 cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center border border-transparent hover:border-rose-100"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </motion.tr>
                                            ))}
                                        </AnimatePresence>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Bulk Action Bar */}
                        <AnimatePresence>
                            {selectedIds.size > 0 && (
                                <motion.div
                                    initial={{ y: 100, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    exit={{ y: 100, opacity: 0 }}
                                    className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 bg-saas-dark/95 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/10 shadow-2xl flex items-center gap-8 min-w-[320px] md:min-w-[480px] justify-between"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-saas-accent/20 rounded-xl flex items-center justify-center text-saas-accent font-black">
                                            {selectedIds.size}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-white font-bold text-sm tracking-tight">Staff Selected</span>
                                            <span className="text-slate-400 text-[10px] uppercase font-bold tracking-widest">Bulk Actions Available</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => setSelectedIds(new Set())}
                                            className="px-4 py-2 text-slate-400 hover:text-white text-[13px] font-bold transition-colors"
                                        >
                                            Deselect
                                        </button>
                                        <button
                                            onClick={handleBulkDelete}
                                            className="bg-rose-500 hover:bg-rose-600 text-white px-6 py-2.5 rounded-xl font-bold text-[13px] flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-rose-500/20"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                            Remove Selected
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Mobile Card View */}
                        <div className="md:hidden space-y-4">
                            <AnimatePresence mode="popLayout">
                                {filteredTeachers.map((teacher, index) => (
                                    <motion.div
                                        key={teacher.id}
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        transition={{ delay: index * 0.05 }}
                                        className="bg-white rounded-2xl p-5 saas-shadow border border-saas-border"
                                    >
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex items-center gap-4">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.has(teacher.id)}
                                                    onChange={() => toggleSelectOne(teacher.id)}
                                                    className="w-4 h-4 rounded border-slate-300 text-saas-accent focus:ring-saas-accent/20 cursor-pointer mt-3"
                                                />
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-saas-accent/10 flex items-center justify-center text-saas-accent font-bold">
                                                        {teacher.name.charAt(0)}
                                                    </div>
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="font-bold text-saas-dark text-[15px] leading-tight truncate">{teacher.name}</span>
                                                        <span className="text-[11px] text-slate-400 font-medium truncate">{teacher.email || 'No email set'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex gap-1">
                                                <button
                                                    onClick={() => handleOpenModal(teacher)}
                                                    className="p-2 text-slate-400 hover:text-saas-accent hover:bg-saas-accent/5 rounded-lg active:scale-95 transition-all"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(teacher.id, teacher.name)}
                                                    className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg active:scale-95 transition-all"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="space-y-3 pt-3 border-t border-slate-50">
                                            {teacher.homeroom_classes?.length > 0 && (
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded shrink-0">CLASS TEACHER</span>
                                                    <div className="flex flex-wrap gap-1">
                                                        {teacher.homeroom_classes.map((cls: string) => (
                                                            <span key={cls} className="text-[10px] font-bold text-amber-700">{cls}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {teacher.subjects?.length > 0 && (
                                                <div className="flex flex-col gap-1.5">
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-0.5">Assigned Subjects</span>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {teacher.subjects.map((subj: string) => (
                                                            <span key={subj} className="text-[10px] font-bold text-saas-accent bg-saas-accent/5 px-2.5 py-1 rounded-lg border border-saas-accent/10">{subj}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {(!teacher.homeroom_classes?.length && !teacher.subjects?.length) && (
                                                <p className="text-[11px] text-slate-400 italic font-medium">No assignments yet</p>
                                            )}
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    </>
                ) : (
                    <div className="bg-white rounded-2xl saas-shadow border border-saas-border flex flex-col items-center justify-center py-20 text-center p-6">
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6 border border-slate-100">
                            <UsersIcon className="w-8 h-8 text-slate-300" />
                        </div>
                        <h3 className="text-lg font-bold text-saas-dark">No Educators Found</h3>
                        <p className="text-slate-400 mt-2 max-w-xs text-[13px] font-medium leading-relaxed">Adjust your search or add a new educator to your academic roster.</p>
                        <Button onClick={() => handleOpenModal()} className="mt-8 bg-saas-accent shadow-none px-6 py-3 rounded-xl">
                            <Plus className="w-5 h-5 mr-2" />
                            Add Teacher
                        </Button>
                    </div>
                )}
            </div>

            {/* Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsModalOpen(false)}
                            className="absolute inset-0 bg-saas-dark/80 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="relative bg-white rounded-[32px] p-8 md:p-10 max-w-md w-full shadow-2xl overflow-hidden"
                        >
                            <div className="absolute top-0 left-0 w-full h-2 bg-saas-accent" />
                            <div className="flex flex-col items-center text-center space-y-6">
                                <div className="w-16 h-16 bg-saas-accent/10 rounded-2xl flex items-center justify-center">
                                    <UsersIcon className="w-8 h-8 text-saas-accent" />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-2xl font-black text-saas-dark">
                                        {editingTeacher ? 'Edit Educator' : 'Add Educator'}
                                    </h3>
                                    <p className="text-slate-400 text-sm font-medium">
                                        {editingTeacher ? `Update details for ${editingTeacher.name}` : 'Create a new teacher record'}
                                    </p>
                                </div>

                                <form onSubmit={handleSave} className="w-full space-y-4">
                                    <div className="text-left space-y-1.5">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Full Name</label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-saas-dark focus:ring-2 focus:ring-saas-accent/20 focus:border-saas-accent transition-all outline-none"
                                            placeholder="e.g. Dr. Bhanu Prakash Sharma"
                                        />
                                    </div>
                                    <div className="text-left space-y-1.5">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Email (Optional)</label>
                                        <input
                                            type="email"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-saas-dark focus:ring-2 focus:ring-saas-accent/20 focus:border-saas-accent transition-all outline-none"
                                            placeholder="bhanu@class.com"
                                        />
                                    </div>
                                    <div className="flex items-center gap-4 pt-1">
                                        <label className="flex items-center gap-2 cursor-pointer group">
                                            <input
                                                type="checkbox"
                                                checked={formData.is_office}
                                                onChange={(e) => setFormData({ ...formData, is_office: e.target.checked })}
                                                className="w-4 h-4 rounded border-slate-300 text-saas-accent focus:ring-saas-accent/20 cursor-pointer"
                                            />
                                            <span className="text-sm font-bold text-slate-600 group-hover:text-saas-dark transition-colors">Office I/C</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer group">
                                            <input
                                                type="checkbox"
                                                checked={formData.is_librarian}
                                                onChange={(e) => setFormData({ ...formData, is_librarian: e.target.checked })}
                                                className="w-4 h-4 rounded border-slate-300 text-saas-accent focus:ring-saas-accent/20 cursor-pointer"
                                            />
                                            <span className="text-sm font-bold text-slate-600 group-hover:text-saas-dark transition-colors">Librarian</span>
                                        </label>
                                    </div>

                                    {error && (
                                        <p className="text-rose-500 text-xs font-semibold bg-rose-50 p-3 rounded-xl border border-rose-100 italic">
                                            {error}
                                        </p>
                                    )}

                                    <div className="pt-4 flex gap-4">
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            className="flex-1 rounded-2xl"
                                            onClick={() => setIsModalOpen(false)}
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            type="submit"
                                            disabled={isSaving}
                                            className="flex-1 rounded-2xl bg-saas-accent hover:bg-saas-accent-hover"
                                        >
                                            {isSaving ? (
                                                <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                                            ) : (
                                                editingTeacher ? 'Update Record' : 'Create Record'
                                            )}
                                        </Button>
                                    </div>
                                </form>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Teachers;
