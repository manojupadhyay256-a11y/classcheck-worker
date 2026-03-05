import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Plus, Search, Edit2, Trash2, Download, FileSpreadsheet, Loader2, Filter, X, Check, Users as UsersIcon } from 'lucide-react';
import Button from '../../components/common/Button';
import { motion, AnimatePresence } from 'framer-motion';
import { sql } from '../../lib/db';
import { clsx } from 'clsx';
import { parseStudentImport, executeStudentImport } from '../../lib/bulkImport';

interface Student {
    id: string;
    admission_no: string;
    student_name: string;
    father_name: string;
    mother_name: string;
    phone_number: string;
    dob?: string;
    address?: string;
    category: string;
    class_id: string;
    class_name?: string;
}

interface Class {
    id: string;
    name: string;
}

const Students = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [students, setStudents] = useState<Student[]>([]);
    const [classes, setClasses] = useState<Class[]>([]);
    const [selectedClass, setSelectedClass] = useState('All');
    const [isLoading, setIsLoading] = useState(true);
    const [isImporting, setIsImporting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [importStatus, setImportStatus] = useState('');
    const [importProgress, setImportProgress] = useState(0);
    const [showSuccessPopup, setShowSuccessPopup] = useState(false);
    const [importStats, setImportStats] = useState<{ total: number; added: number } | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editingStudent, setEditingStudent] = useState<Student | null>(null);
    const [formData, setFormData] = useState({
        admission_no: '',
        student_name: '',
        father_name: '',
        mother_name: '',
        phone_number: '',
        dob: '',
        address: '',
        category: 'General',
        class_id: ''
    });
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchData = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const [studentsRes, classesRes] = await Promise.all([
                sql`
                    SELECT s.*, c.name as class_name 
                    FROM public.students s
                    LEFT JOIN public.classes c ON s.class_id = c.id
                    ORDER BY s.student_name ASC
                `,
                sql`SELECT * FROM public.classes ORDER BY name`
            ]);
            setStudents(studentsRes as any);
            setClasses(classesRes as any);
        } catch (err) {
            console.error('Fetch error:', err);
            setError('Failed to fetch data');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsImporting(true);
        setError(null);
        setImportStatus('Parsing file...');

        const importPromise = (async () => {
            const parsedData = await parseStudentImport(file);
            setImportStatus(`Importing ${parsedData.students.length} students...`);

            await executeStudentImport(parsedData, (progress, status) => {
                setImportStatus(status);
                setImportProgress(progress);
            });

            setImportStats({
                total: parsedData.students.length,
                added: parsedData.students.length
            });
            setShowSuccessPopup(true);

            await fetchData();
        })();

        toast.promise(importPromise, {
            loading: 'Importing students...',
            success: 'Students imported successfully!',
            error: (err: any) => err?.message || 'Import failed'
        });

        try {
            await importPromise;
        } catch (err: any) {
            console.error('Import error:', err);
            setError(err instanceof Error ? err.message : 'Import failed');
        } finally {
            setIsImporting(false);
            setImportStatus('');
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleOpenModal = (student: Student | null = null) => {
        if (student) {
            setEditingStudent(student);
            setFormData({
                admission_no: student.admission_no,
                student_name: student.student_name,
                father_name: student.father_name,
                mother_name: student.mother_name,
                phone_number: student.phone_number,
                dob: student.dob || '',
                address: student.address || '',
                category: student.category || 'General',
                class_id: student.class_id
            });
        } else {
            setEditingStudent(null);
            setFormData({
                admission_no: '',
                student_name: '',
                father_name: '',
                mother_name: '',
                phone_number: '',
                dob: '',
                address: '',
                category: 'General',
                class_id: selectedClass !== 'All' ? selectedClass : ''
            });
        }
        setError(null);
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setError(null);

        const savePromise = (async () => {
            if (!formData.student_name || !formData.admission_no || !formData.class_id) {
                throw new Error('Please fill in all required fields');
            }
            if (editingStudent) {
                await sql`
                    UPDATE public.students 
                    SET 
                        admission_no = ${formData.admission_no},
                        student_name = ${formData.student_name},
                        father_name = ${formData.father_name},
                        mother_name = ${formData.mother_name},
                        phone_number = ${formData.phone_number},
                        dob = ${formData.dob || null},
                        address = ${formData.address},
                        category = ${formData.category},
                        class_id = ${formData.class_id}
                    WHERE id = ${editingStudent.id}
                `;
            } else {
                await sql`
                    INSERT INTO public.students (
                        admission_no, student_name, father_name, mother_name, 
                        phone_number, dob, address, category, class_id
                    ) VALUES (
                        ${formData.admission_no}, ${formData.student_name}, 
                        ${formData.father_name}, ${formData.mother_name}, 
                        ${formData.phone_number}, ${formData.dob || null}, 
                        ${formData.address}, ${formData.category}, ${formData.class_id}
                    )
                `;
            }
            await fetchData();
            setIsModalOpen(false);
        })();

        toast.promise(savePromise, {
            loading: editingStudent ? 'Updating student...' : 'Adding student...',
            success: editingStudent ? 'Student updated successfully!' : 'Student added successfully!',
            error: (err: any) => err.message || 'Failed to save student record.'
        });

        try {
            await savePromise;
        } catch (err: any) {
            console.error('Save error:', err);
            setError(err.message || 'Failed to save student');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this student?')) return;

        const deletePromise = (async () => {
            await sql`DELETE FROM public.students WHERE id = ${id}`;
            await fetchData();
        })();

        toast.promise(deletePromise, {
            loading: 'Deleting student...',
            success: 'Student deleted successfully!',
            error: 'Failed to delete student.'
        });

        try {
            await deletePromise;
        } catch (err) {
            console.error('Delete error:', err);
        }
    };

    const filteredStudents = students.filter(s => {
        const matchesSearch = s.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.admission_no.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesClass = selectedClass === 'All' || s.class_id === selectedClass;
        return matchesSearch && matchesClass;
    });

    return (
        <div className="min-h-screen bg-[#F8FAFC] pb-24 font-inter">
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleExcelImport}
                className="hidden"
                accept=".xlsx, .xls, .csv"
            />

            {/* SaaS Header */}
            <div className="bg-saas-dark text-white">
                <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 sm:py-12">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 sm:gap-10">
                        <div className="flex items-center gap-4 sm:gap-5">
                            <div className="p-3.5 sm:p-4 bg-saas-accent/10 rounded-2xl border border-saas-accent/20 shrink-0">
                                <UsersIcon className="w-7 h-7 sm:w-8 sm:h-8 text-saas-accent" strokeWidth={2.5} />
                            </div>
                            <div className="min-w-0">
                                <h1 className="text-2xl sm:text-3xl font-black tracking-tight mb-1 truncate">Student Registry</h1>
                                <p className="text-slate-400 text-[13px] sm:text-sm font-medium">Manage student profiles, registrations, and bulk imports.</p>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full md:w-auto">
                            <Button
                                variant="outline"
                                onClick={() => fileInputRef.current?.click()}
                                isLoading={isImporting}
                                className="border-white/10 hover:bg-white/5 text-white shadow-none px-6 py-3 sm:py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 flex-1 sm:flex-none"
                            >
                                <FileSpreadsheet className="w-5 h-5" />
                                <span className="font-bold">{isImporting ? importStatus || 'Importing...' : 'Import Excel'}</span>
                            </Button>
                            <Button
                                onClick={() => handleOpenModal()}
                                className="bg-saas-accent hover:bg-saas-accent-hover text-white shadow-xl shadow-saas-accent/20 px-6 py-3 sm:py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 shrink-0"
                            >
                                <Plus className="w-5 h-5" strokeWidth={3} />
                                <span className="font-bold">Add Student</span>
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filter Section */}
            <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-8 -mt-6">
                <div className="bg-white rounded-2xl saas-shadow border border-saas-border p-4 sm:p-6 flex flex-col lg:flex-row items-center justify-between gap-4">
                    <div className="relative w-full lg:max-w-md">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by name or admission no..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm text-saas-dark placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-saas-accent/20 focus:border-saas-accent transition-all"
                        />
                    </div>

                    <div className="flex items-center gap-3 w-full lg:w-auto">
                        <div className="relative flex-1 lg:w-64">
                            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                            <select
                                value={selectedClass}
                                onChange={(e) => setSelectedClass(e.target.value)}
                                className="w-full pl-11 pr-10 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-semibold text-slate-600 focus:outline-none focus:ring-2 focus:ring-saas-accent/20 appearance-none cursor-pointer"
                            >
                                <option value="All">All Classes</option>
                                {classes.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </div>
                        <button className="p-3 bg-slate-50 text-slate-400 hover:text-saas-accent hover:bg-saas-accent/5 rounded-xl border border-slate-100 transition-all active:scale-95 shrink-0">
                            <Download className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-8 mt-6 sm:mt-10">
                {isLoading ? (
                    <div className="bg-white rounded-2xl saas-shadow border border-saas-border flex flex-col items-center justify-center py-24 sm:py-32 gap-4">
                        <Loader2 className="w-10 h-10 text-saas-accent animate-spin" strokeWidth={3} />
                        <p className="text-slate-400 font-semibold tracking-wide uppercase text-[10px] sm:text-[11px] animate-pulse">Loading student records...</p>
                    </div>
                ) : filteredStudents.length === 0 ? (
                    <div className="bg-white rounded-2xl saas-shadow border border-saas-border flex flex-col items-center justify-center py-24 text-center p-6">
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6 border border-slate-100">
                            <Search className="w-8 h-8 text-slate-300" />
                        </div>
                        <h3 className="text-lg font-bold text-saas-dark">No Students Found</h3>
                        <p className="text-slate-400 mt-2 max-w-xs text-[13px] font-medium leading-relaxed">Refine your search or class filter to locate students.</p>
                        <Button onClick={() => handleOpenModal()} className="mt-8 bg-saas-accent shadow-none px-6 py-3 rounded-xl font-bold">
                            <Plus className="w-5 h-5 mr-2" />
                            Add Student
                        </Button>
                    </div>
                ) : (
                    <>
                        {/* Desktop Table View */}
                        <div className="hidden md:block bg-white rounded-2xl saas-shadow border border-saas-border overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-slate-50/50 border-b border-saas-border">
                                            <th className="px-8 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-widest w-16">#</th>
                                            <th className="px-8 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Student Details</th>
                                            <th className="px-8 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Class</th>
                                            <th className="px-8 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-widest">DOB</th>
                                            <th className="px-8 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Caregiver Info</th>
                                            <th className="px-8 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-saas-border">
                                        <AnimatePresence mode="popLayout">
                                            {filteredStudents.map((student, index) => (
                                                <motion.tr
                                                    key={student.id}
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, scale: 0.95 }}
                                                    transition={{ delay: index * 0.02 }}
                                                    className="group hover:bg-slate-50/50 transition-colors duration-200"
                                                >
                                                    <td className="px-8 py-6">
                                                        <span className="font-mono text-xs font-bold text-slate-300">#AD-{student.admission_no}</span>
                                                    </td>
                                                    <td className="px-8 py-6">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-black text-sm uppercase">
                                                                {student.student_name.charAt(0)}
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="font-bold text-saas-dark text-[15px] tracking-tight">{student.student_name}</span>
                                                                <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">{student.category}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-6">
                                                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-saas-accent/5 text-saas-accent text-[11px] font-bold ring-1 ring-inset ring-saas-accent/10">
                                                            {student.class_name}
                                                        </span>
                                                    </td>
                                                    <td className="px-8 py-6">
                                                        <span className="text-[14px] font-medium text-slate-600">
                                                            {student.dob ? new Date(student.dob).toLocaleDateString() : '-'}
                                                        </span>
                                                    </td>
                                                    <td className="px-8 py-6 text-sm">
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-slate-700">{student.father_name}</span>
                                                            <span className="text-[11px] text-slate-400 font-medium">{student.phone_number}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-6 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <button
                                                                onClick={() => handleOpenModal(student)}
                                                                className="p-2.5 text-slate-400 hover:text-saas-accent hover:bg-saas-accent/5 rounded-xl transition-all duration-200 cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center border border-transparent hover:border-saas-accent/10"
                                                            >
                                                                <Edit2 className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(student.id)}
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

                        {/* Mobile Card View */}
                        <div className="md:hidden space-y-4">
                            <AnimatePresence mode="popLayout">
                                {filteredStudents.map((student, index) => (
                                    <motion.div
                                        key={student.id}
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        transition={{ delay: index * 0.05 }}
                                        className="bg-white rounded-2xl p-5 saas-shadow border border-saas-border"
                                    >
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-black text-[13px]">
                                                    {student.student_name.charAt(0)}
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <span className="font-bold text-saas-dark text-[15px] leading-tight tracking-tight truncate uppercase">
                                                        {student.student_name}
                                                    </span>
                                                    <span className="text-[11px] text-slate-400 font-medium">
                                                        ADM: #AD-{student.admission_no}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex gap-1 shrink-0 ml-2">
                                                <button
                                                    onClick={() => handleOpenModal(student)}
                                                    className="p-2 text-slate-400 hover:text-saas-accent hover:bg-saas-accent/5 rounded-lg active:scale-95 transition-all outline-none"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(student.id)}
                                                    className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg active:scale-95 transition-all outline-none"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 py-4 border-t border-slate-50">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-1">Class</span>
                                                <span className="text-[13px] font-bold text-saas-accent">{student.class_name}</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-1">Parent Info</span>
                                                <span className="text-[13px] font-bold text-slate-700 truncate">{student.father_name}</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 pt-4 border-t border-slate-50">
                                            <span className="inline-flex items-center px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold uppercase rounded-md border border-slate-200 font-mono">
                                                {student.category}
                                            </span>
                                            {student.dob && (
                                                <span className="text-[11px] text-slate-400 font-medium ml-1">
                                                    DOB: {new Date(student.dob).toLocaleDateString()}
                                                </span>
                                            )}
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    </>
                )}
            </div>

            {/* Progress Overlay */}
            <AnimatePresence>
                {isImporting && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-100 bg-saas-dark/60 backdrop-blur-sm flex items-center justify-center p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="bg-white rounded-3xl p-8 max-w-md w-full saas-shadow border border-saas-border text-center"
                        >
                            <div className="w-20 h-20 rounded-2xl bg-saas-accent/10 flex items-center justify-center text-saas-accent mx-auto mb-6">
                                <Loader2 className="w-10 h-10 animate-spin" />
                            </div>
                            <h3 className="text-xl font-bold text-saas-dark mb-2">Importing Students</h3>
                            <p className="text-slate-500 mb-8">{importStatus}</p>

                            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden mb-4">
                                <motion.div
                                    className="h-full bg-saas-accent"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${importProgress}%` }}
                                    transition={{ type: "spring", bounce: 0, duration: 0.5 }}
                                />
                            </div>
                            <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                <span>Progress</span>
                                <span>{importProgress}%</span>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Success Popup */}
            <AnimatePresence>
                {showSuccessPopup && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-110 bg-saas-dark/60 backdrop-blur-sm flex items-center justify-center p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            className="bg-white rounded-3xl p-8 max-w-sm w-full saas-shadow border border-saas-border text-center"
                        >
                            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 mx-auto mb-6">
                                <Check className="w-8 h-8" />
                            </div>
                            <h3 className="text-lg font-bold text-saas-dark mb-2">Import Complete!</h3>
                            <p className="text-slate-500 mb-8 text-sm">
                                Successfully imported <strong>{importStats?.added}</strong> students.
                            </p>
                            <Button
                                className="w-full bg-saas-accent hover:bg-saas-accent-hover text-white rounded-xl py-4 font-bold"
                                onClick={() => setShowSuccessPopup(false)}
                            >
                                Continue
                            </Button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ERROR NOTIFICATION */}
            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: 100 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 100 }}
                        className="fixed bottom-8 left-0 right-0 z-150 flex justify-center px-4 pointer-events-none"
                    >
                        <div className="bg-rose-600 text-white px-6 py-4 rounded-2xl saas-shadow flex items-center gap-4 pointer-events-auto max-w-md w-full">
                            <X className="w-5 h-5 shrink-0" />
                            <p className="text-sm font-bold flex-1">{error}</p>
                            <button onClick={() => setError(null)} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Add/Edit Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-100 flex items-center justify-center p-4 sm:p-6">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => !isSaving && setIsModalOpen(false)}
                            className="absolute inset-0 bg-saas-dark/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-saas-border"
                        >
                            <div className="p-5 sm:p-8 max-h-[90vh] overflow-y-auto">
                                <div className="flex items-center justify-between mb-8">
                                    <div>
                                        <h2 className="text-xl sm:text-2xl font-bold text-saas-dark">
                                            {editingStudent ? 'Refine Student Profile' : 'Student Enrollment'}
                                        </h2>
                                        <p className="text-slate-400 text-[13px] sm:text-sm mt-1">
                                            {editingStudent ? 'Update registration and academic info.' : 'Complete the registration for the new pupil.'}
                                        </p>
                                    </div>
                                    <div className="p-3 bg-saas-accent/10 rounded-2xl hidden sm:block">
                                        <UsersIcon className={clsx("w-6 h-6 text-saas-accent")} />
                                    </div>
                                </div>

                                <form onSubmit={handleSave} className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Admission No *</label>
                                            <input
                                                type="text"
                                                required
                                                value={formData.admission_no}
                                                onChange={(e) => setFormData({ ...formData, admission_no: e.target.value })}
                                                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-[15px] focus:outline-none focus:ring-2 focus:ring-saas-accent/20 focus:border-saas-accent transition-all"
                                                placeholder="e.g. 10245"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Class *</label>
                                            <div className="relative">
                                                <select
                                                    required
                                                    value={formData.class_id}
                                                    onChange={(e) => setFormData({ ...formData, class_id: e.target.value })}
                                                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-[15px] focus:outline-none focus:ring-2 focus:ring-saas-accent/20 focus:border-saas-accent transition-all appearance-none cursor-pointer"
                                                >
                                                    <option value="">Select Class</option>
                                                    {classes.map(c => (
                                                        <option key={c.id} value={c.id}>{c.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Student Name *</label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.student_name}
                                            onChange={(e) => setFormData({ ...formData, student_name: e.target.value })}
                                            className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-[15px] focus:outline-none focus:ring-2 focus:ring-saas-accent/20 focus:border-saas-accent transition-all"
                                            placeholder="Enter full name"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Father's Name</label>
                                            <input
                                                type="text"
                                                value={formData.father_name}
                                                onChange={(e) => setFormData({ ...formData, father_name: e.target.value })}
                                                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-[15px] focus:outline-none focus:ring-2 focus:ring-saas-accent/20 focus:border-saas-accent transition-all"
                                                placeholder="Father's name"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Mother's Name</label>
                                            <input
                                                type="text"
                                                value={formData.mother_name}
                                                onChange={(e) => setFormData({ ...formData, mother_name: e.target.value })}
                                                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-[15px] focus:outline-none focus:ring-2 focus:ring-saas-accent/20 focus:border-saas-accent transition-all"
                                                placeholder="Mother's name"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Phone Number</label>
                                            <input
                                                type="text"
                                                value={formData.phone_number}
                                                onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                                                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-[15px] focus:outline-none focus:ring-2 focus:ring-saas-accent/20 focus:border-saas-accent transition-all"
                                                placeholder="Mobile number"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Date of Birth</label>
                                            <input
                                                type="date"
                                                value={formData.dob}
                                                onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                                                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-[15px] focus:outline-none focus:ring-2 focus:ring-saas-accent/20 focus:border-saas-accent transition-all"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Address</label>
                                        <textarea
                                            value={formData.address}
                                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                            className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-[15px] focus:outline-none focus:ring-2 focus:ring-saas-accent/20 focus:border-saas-accent transition-all resize-none h-24"
                                            placeholder="Resident address"
                                        />
                                    </div>

                                    <div className="flex flex-col sm:flex-row gap-3 pt-4">
                                        <button
                                            type="button"
                                            onClick={() => setIsModalOpen(false)}
                                            className="flex-1 px-6 py-4 border border-slate-200 text-slate-600 font-bold rounded-2xl hover:bg-slate-50 transition-all active:scale-95 disabled:opacity-50 text-[15px]"
                                            disabled={isSaving}
                                        >
                                            Dismiss
                                        </button>
                                        <button
                                            type="submit"
                                            className="flex-1 px-6 py-4 bg-saas-accent text-white font-bold rounded-2xl hover:bg-saas-accent-hover shadow-lg shadow-saas-accent/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 text-[15px]"
                                            disabled={isSaving}
                                        >
                                            {isSaving ? (
                                                <>
                                                    <Loader2 className="w-5 h-5 animate-spin" />
                                                    <span>Propagating...</span>
                                                </>
                                            ) : (
                                                <span>{editingStudent ? 'Sync Profile' : 'Complete Enrollment'}</span>
                                            )}
                                        </button>
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

export default Students;
