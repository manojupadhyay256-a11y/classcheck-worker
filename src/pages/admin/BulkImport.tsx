import { useState, useRef } from 'react';
import {
    Upload,
    FileSpreadsheet,
    Check,
    AlertCircle,
    Loader2,
    ChevronRight,
    Users,
    BookOpen,
    School,
    FileText,
    ArrowRight,
    UserCheck,
    Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '../../components/common/Button';
import { parseImportFile, executeImport, bulkDeleteData, type ParsedImport } from '../../lib/bulkImport';

type Step = 'upload' | 'preview' | 'import' | 'done';

const BulkImport = () => {
    const [step, setStep] = useState<Step>('upload');
    const [file, setFile] = useState<File | null>(null);
    const [parsedData, setParsedData] = useState<ParsedImport | null>(null);
    const [loading, setLoading] = useState(false);
    const [importProgress, setImportProgress] = useState(0);
    const [importStatus, setImportStatus] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<any>(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [confirmText, setConfirmText] = useState('');
    const [deleteLoading, setDeleteLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const uploadedFile = e.target.files?.[0];
        if (!uploadedFile) return;

        setFile(uploadedFile);
        setLoading(true);
        setError(null);
        try {
            const data = await parseImportFile(uploadedFile);
            setParsedData(data);
            setStep('preview');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to parse file');
        } finally {
            setLoading(false);
        }
    };

    const handleImport = async () => {
        if (!parsedData) return;
        setLoading(true);
        setImportProgress(0);
        setImportStatus('Starting import...');
        setError(null);
        try {
            const importResult = await executeImport(parsedData, (progress, status) => {
                setImportProgress(progress);
                setImportStatus(status);
            });
            setResult(importResult);
            setStep('done');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Import failed');
        } finally {
            setLoading(false);
            setImportProgress(0);
            setImportStatus('');
        }
    };

    const handleDeleteAll = async () => {
        if (confirmText.toUpperCase() !== 'DELETE ALL') return;
        setDeleteLoading(true);
        setError(null);
        try {
            const deleteResult = await bulkDeleteData();
            setResult(deleteResult);
            setStep('done');
            setShowDeleteModal(false);
            setConfirmText('');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Delete failed');
        } finally {
            setDeleteLoading(false);
        }
    };

    const steps = [
        { id: 'upload', icon: Upload, label: 'Upload' },
        { id: 'preview', icon: FileText, label: 'Preview' },
        { id: 'import', icon: ArrowRight, label: 'Import' },
        { id: 'done', icon: Check, label: 'Done' },
    ];

    const kpis = [
        { label: 'TEACHERS', value: parsedData?.teachers.length || 0, icon: Users, color: 'bg-blue-50', iconColor: 'text-blue-500' },
        { label: 'CLASSES', value: parsedData?.classes.length || 0, icon: School, color: 'bg-emerald-50', iconColor: 'text-emerald-500' },
        { label: 'SUBJECTS', value: parsedData?.subjects.length || 0, icon: BookOpen, color: 'bg-purple-50', iconColor: 'text-purple-500' },
        { label: 'TOTAL ROWS', value: parsedData?.totalRows || 0, icon: FileText, color: 'bg-yellow-50', iconColor: 'text-yellow-500' },
    ];

    return (
        <div className="space-y-8 pb-12">
            {/* Header */}
            <div className="hero-gradient rounded-[32px] p-8 md:p-12 relative overflow-hidden shadow-2xl shadow-indigo-900/20">
                <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 glass-card rounded-2xl flex items-center justify-center text-white">
                            <FileSpreadsheet className="w-6 h-6" />
                        </div>
                        <h1 className="text-3xl md:text-4xl font-bold text-white leading-none">Bulk Import</h1>
                    </div>
                    <p className="text-indigo-100 max-w-xl text-lg">
                        Import teachers, classes, subjects and assignments from Excel. Populate your database in seconds.
                    </p>
                </div>
                <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />

                {/* Bulk Delete Button */}
                <div className="absolute bottom-8 right-8 z-20">
                    <button
                        onClick={() => setShowDeleteModal(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-rose-500/20 hover:bg-rose-500/30 text-rose-100 rounded-2xl transition-all border border-rose-500/30 font-bold text-sm backdrop-blur-md"
                    >
                        <Trash2 className="w-4 h-4" />
                        Bulk Delete Data
                    </button>
                </div>
            </div>

            {/* Stepper */}
            <div className="flex items-center justify-center gap-4 md:gap-8">
                {steps.map((s, idx) => (
                    <div key={s.id} className="flex items-center gap-4">
                        <div className={`flex items-center gap-2 px-6 py-2 rounded-full transition-all duration-300 ${step === s.id ? 'bg-primary text-white shadow-lg' : idx < steps.findIndex(st => st.id === step) ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'
                            }`}>
                            <s.icon className="w-4 h-4" />
                            <span className="font-bold text-sm tracking-wide">{s.label}</span>
                        </div>
                        {idx < steps.length - 1 && <ChevronRight className="w-4 h-4 text-gray-300 hidden md:block" />}
                    </div>
                ))}
            </div>

            {/* Content Area */}
            <AnimatePresence mode="wait">
                {step === 'upload' && (
                    <motion.div
                        key="upload"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="bg-white rounded-[32px] p-12 border-2 border-dashed border-gray-100 flex flex-col items-center justify-center text-center space-y-6"
                    >
                        <div className="w-24 h-24 bg-primary/5 rounded-full flex items-center justify-center mb-4">
                            <Upload className="w-10 h-10 text-primary animate-bounce" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-[#1E1B4B]">Choose your file</h2>
                            <p className="text-gray-400 mt-1">Accepts .xlsx, .xls or .csv formats</p>
                            <p className="text-gray-300 mt-2 text-xs">Expected columns: Class, Class Teacher, Subject, Subject Teacher</p>
                        </div>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                            className="hidden"
                            accept=".xlsx, .xls, .csv"
                        />
                        <Button
                            className="px-12 py-4 rounded-2xl shadow-xl shadow-primary/20"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={loading}
                        >
                            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : "Select File"}
                        </Button>
                        {error && (
                            <div className="bg-rose-50 text-rose-600 px-6 py-3 rounded-xl flex items-center gap-2 font-medium">
                                <AlertCircle className="w-5 h-5" />
                                {error}
                            </div>
                        )}
                    </motion.div>
                )}

                {step === 'preview' && (
                    <motion.div
                        key="preview"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-8"
                    >
                        {/* KPI Row */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {kpis.map((kpi, i) => (
                                <div key={i} className="bg-white p-6 rounded-[28px] soft-shadow border border-gray-50 flex flex-col items-center text-center gap-3">
                                    <div className={`w-14 h-14 ${kpi.color} rounded-2xl flex items-center justify-center`}>
                                        <kpi.icon className={`w-7 h-7 ${kpi.iconColor}`} />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-black text-[#1E1B4B]">{kpi.value.toLocaleString()}</p>
                                        <p className="text-[10px] font-bold tracking-widest text-gray-400 uppercase">{kpi.label}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* File Info */}
                        <div className="bg-white rounded-2xl p-4 flex items-center justify-between border border-gray-100 px-8">
                            <div className="flex items-center gap-3">
                                <FileSpreadsheet className="w-5 h-5 text-emerald-500" />
                                <span className="font-bold text-[#1E1B4B]">{file?.name}</span>
                            </div>
                            <span className="text-xs font-bold text-primary bg-primary/5 px-3 py-1 rounded-full uppercase tracking-wider">
                                {parsedData?.totalRows} rows parsed
                            </span>
                        </div>

                        {/* Preview Table — 4 columns */}
                        <div className="bg-white rounded-[32px] soft-shadow border border-gray-50 overflow-hidden">
                            <div className="p-6 bg-saas-accent-hover flex items-center justify-between">
                                <h3 className="text-lg font-bold text-white">Data Preview</h3>
                                <div className="text-indigo-100 text-sm font-medium">Displaying first 5 rows</div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-gray-50/50">
                                            <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest w-12">#</th>
                                            <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Class</th>
                                            <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Class Teacher</th>
                                            <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Subject</th>
                                            <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Subject Teacher</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {parsedData?.assignments.slice(0, 7).map((row, i) => (
                                            <tr key={i} className="hover:bg-gray-50/80 transition-colors">
                                                <td className="px-6 py-5 text-gray-400 font-bold">{i + 1}</td>
                                                <td className="px-6 py-5 font-bold text-[#1E1B4B] uppercase">{row.className}</td>
                                                <td className="px-6 py-5 font-medium text-gray-600 uppercase">{row.classTeacher}</td>
                                                <td className="px-6 py-5 font-medium text-gray-600 uppercase tracking-wider text-xs">{row.subject}</td>
                                                <td className="px-6 py-5 font-medium text-gray-600 uppercase">{row.subjectTeacher}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Detail Grids */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Teachers with Emails */}
                            <div className="bg-white rounded-[28px] p-6 border border-gray-100 space-y-4">
                                <div className="flex items-center gap-2 text-saas-accent-hover font-bold uppercase tracking-wider text-xs">
                                    <Users className="w-4 h-4" />
                                    Teachers to Process ({parsedData?.teachers.length})
                                </div>
                                <div className="max-h-64 overflow-y-auto space-y-2 pr-2 scrollbar-style">
                                    {parsedData?.teachers.map((t, i) => (
                                        <div key={i} className="bg-gray-50 rounded-xl px-4 py-3 group hover:bg-indigo-50 transition-colors">
                                            <div className="flex justify-between items-center">
                                                <span className="font-bold text-sm text-[#1E1B4B] uppercase truncate">{t.name}</span>
                                                <Check className="w-4 h-4 text-emerald-500 opacity-0 group-hover:opacity-100 shrink-0" />
                                            </div>
                                            <p className="text-[10px] text-primary mt-1 tracking-wider">{t.email}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Classes with Class Teachers */}
                            <div className="bg-white rounded-[28px] p-6 border border-gray-100 space-y-4">
                                <div className="flex items-center gap-2 text-emerald-600 font-bold uppercase tracking-wider text-xs">
                                    <School className="w-4 h-4" />
                                    Classes ({parsedData?.classes.length})
                                </div>
                                <div className="max-h-48 overflow-y-auto space-y-2 pr-2 scrollbar-style">
                                    {parsedData?.classes.map((c, i) => (
                                        <div key={i} className="bg-gray-50 rounded-xl px-4 py-3 group hover:bg-emerald-50 transition-colors">
                                            <div className="flex justify-between items-center">
                                                <span className="font-bold text-sm text-[#1E1B4B] uppercase">{c}</span>
                                                <UserCheck className="w-4 h-4 text-emerald-500 opacity-0 group-hover:opacity-100" />
                                            </div>
                                            {parsedData?.classTeacherMap[c] && (
                                                <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-wider">CT: {parsedData.classTeacherMap[c]}</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Subjects with Class Info */}
                            <div className="bg-white rounded-[28px] p-6 border border-gray-100 space-y-4">
                                <div className="flex items-center gap-2 text-purple-600 font-bold uppercase tracking-wider text-xs">
                                    <BookOpen className="w-4 h-4" />
                                    Subjects ({parsedData?.subjects.length})
                                </div>
                                <div className="max-h-64 overflow-y-auto space-y-2 pr-2 scrollbar-style">
                                    {parsedData?.subjects.map((s, i) => {
                                        const firstClass = parsedData?.assignments.find(a => a.subject === s)?.className;
                                        return (
                                            <div key={i} className="bg-gray-50 rounded-xl px-4 py-3 flex justify-between items-center group hover:bg-purple-50 transition-colors">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-sm text-[#1E1B4B] uppercase">{s}</span>
                                                    {firstClass && <span className="text-[9px] text-gray-400 uppercase tracking-wider">({firstClass})</span>}
                                                </div>
                                                <Check className="w-4 h-4 text-emerald-500 opacity-0 group-hover:opacity-100 shrink-0" />
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>


                        {/* Action Buttons */}
                        <div className="flex items-center justify-end gap-4 pb-20">
                            <Button
                                variant="secondary"
                                onClick={() => { setStep('upload'); setFile(null); setParsedData(null); setError(null); }}
                                disabled={loading}
                            >
                                Start Over
                            </Button>
                            <Button onClick={handleImport} disabled={loading} className="px-12 py-4 relative overflow-hidden group">
                                <span className={loading ? 'opacity-0' : 'opacity-100 transition-opacity'}>
                                    Looks Good, Import Now
                                </span>
                                {loading && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-primary">
                                        <Loader2 className="w-6 h-6 animate-spin text-white" />
                                    </div>
                                )}
                            </Button>
                        </div>

                        {error && (
                            <div className="bg-rose-50 text-rose-600 px-6 py-3 rounded-xl flex items-center gap-2 font-medium">
                                <AlertCircle className="w-5 h-5" />
                                {error}
                            </div>
                        )}
                    </motion.div>
                )}

                {step === 'done' && (
                    <motion.div
                        key="done"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white rounded-[40px] p-16 text-center shadow-2xl shadow-indigo-900/10 border border-indigo-50 max-w-2xl mx-auto flex flex-col items-center"
                    >
                        <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mb-8 relative">
                            <Check className="w-12 h-12 text-emerald-500" />
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1.5, opacity: 0 }}
                                transition={{ repeat: Infinity, duration: 1.5 }}
                                className="absolute inset-0 bg-emerald-400/20 rounded-full"
                            />
                        </div>
                        <h2 className="text-3xl font-extrabold text-[#1E1B4B] mb-4">
                            {result?.teachersCount !== undefined ? "Import Successful!" : "Data Cleared Successfully!"}
                        </h2>
                        <p className="text-gray-500 text-lg mb-10 leading-relaxed text-center">
                            {result?.message}
                            {result?.teachersCount !== undefined && (
                                <>
                                    <br />
                                    Your database has been updated with <strong>{result?.teachersCount}</strong> teachers, <strong>{result?.subjectsCount}</strong> subjects, <strong>{result?.classesCount}</strong> classes, and <strong>{result?.assignmentsCount}</strong> assignments.
                                    {result?.accountsCreated > 0 && (
                                        <><br /><strong>{result.accountsCreated}</strong> teacher login accounts created (password: <code className="bg-gray-100 px-2 py-0.5 rounded text-sm">dps123</code>).</>
                                    )}
                                </>
                            )}
                        </p>
                        <div className="flex gap-4">
                            <Button variant="secondary" onClick={() => { setStep('upload'); setFile(null); setParsedData(null); setResult(null); }}>
                                New Import
                            </Button>
                            <Button onClick={() => window.location.href = '/admin/classes'}>
                                View Classes
                            </Button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Import Progress Modal */}
            <AnimatePresence>
                {loading && step === 'preview' && (
                    <div className="fixed inset-0 z-110 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-saas-dark/80 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="relative bg-white rounded-[40px] p-10 max-w-lg w-full shadow-2xl overflow-hidden text-center"
                        >
                            <div className="absolute top-0 left-0 w-full h-2 bg-linear-to-r from-primary via-purple-500 to-primary animate-pulse" />

                            <div className="flex flex-col items-center space-y-8">
                                <div className="w-24 h-24 bg-primary/5 rounded-full flex items-center justify-center relative">
                                    <div className="absolute inset-0 rounded-full border-4 border-primary/10 border-t-primary animate-spin" />
                                    <Upload className="w-10 h-10 text-primary animate-pulse" />
                                </div>

                                <div className="space-y-2">
                                    <h3 className="text-3xl font-black text-[#1E1B4B]">Importing Data</h3>
                                    <p className="text-gray-500 font-medium h-6">{importStatus}</p>
                                </div>

                                <div className="w-full space-y-4">
                                    <div className="flex justify-between items-center px-2">
                                        <span className="text-xs font-bold text-primary uppercase tracking-widest">Progress</span>
                                        <span className="text-2xl font-black text-primary">{importProgress}%</span>
                                    </div>

                                    <div className="h-5 w-full bg-gray-100 rounded-full overflow-hidden border-4 border-white shadow-inner">
                                        <motion.div
                                            className="h-full bg-linear-to-r from-primary to-purple-600 rounded-full shadow-lg"
                                            initial={{ width: 0 }}
                                            animate={{ width: `${importProgress}%` }}
                                            transition={{ type: "spring", bounce: 0, duration: 0.5 }}
                                        />
                                    </div>
                                </div>

                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">Please do not close this window</p>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {showDeleteModal && (
                    <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowDeleteModal(false)}
                            className="absolute inset-0 bg-saas-dark/80 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="relative bg-white rounded-[32px] p-8 md:p-10 max-w-lg w-full shadow-2xl overflow-hidden"
                        >
                            <div className="absolute top-0 left-0 w-full h-2 bg-rose-500" />
                            <div className="flex flex-col items-center text-center space-y-6">
                                <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center">
                                    <Trash2 className="w-10 h-10 text-rose-500" />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-2xl font-black text-[#1E1B4B]">Clear All Data?</h3>
                                    <p className="text-gray-400 font-medium">
                                        This will permanently delete all teachers, classes, subjects, and attendance records. <br />
                                        <span className="text-gray-600 font-bold">Admin account will be preserved.</span>
                                    </p>
                                </div>

                                <div className="w-full space-y-4">
                                    <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl">
                                        <p className="text-amber-800 text-xs font-bold uppercase tracking-wider mb-2">Type "DELETE ALL" to confirm</p>
                                        <input
                                            type="text"
                                            value={confirmText}
                                            onChange={(e) => setConfirmText(e.target.value)}
                                            placeholder="DELETE ALL"
                                            className="w-full px-4 py-3 rounded-xl border-2 border-amber-200 focus:border-rose-500 focus:ring-0 text-center font-black tracking-widest text-[#1E1B4B] uppercase"
                                        />
                                    </div>

                                    <div className="flex gap-4">
                                        <Button
                                            variant="secondary"
                                            className="flex-1 rounded-2xl"
                                            onClick={() => {
                                                setShowDeleteModal(false);
                                                setConfirmText('');
                                            }}
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            className="flex-1 bg-rose-500 hover:bg-rose-600 rounded-2xl text-white shadow-lg shadow-rose-500/20"
                                            onClick={handleDeleteAll}
                                            disabled={confirmText !== 'DELETE ALL' || deleteLoading}
                                        >
                                            {deleteLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Delete Everything"}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <style>{`
                .hero-gradient {
                    background: linear-gradient(135deg, #1E1B4B 0%, #312E81 50%, #4F46E5 100%);
                }
                .scrollbar-style::-webkit-scrollbar {
                    width: 6px;
                }
                .scrollbar-style::-webkit-scrollbar-track {
                    background: transparent;
                }
                .scrollbar-style::-webkit-scrollbar-thumb {
                    background: #E2E8F0;
                    border-radius: 10px;
                }
                .scrollbar-style::-webkit-scrollbar-thumb:hover {
                    background: #CBD5E1;
                }
            `}
            </style>
        </div>
    );
};

export default BulkImport;
