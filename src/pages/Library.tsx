import React, { useState, useRef, useEffect } from 'react';
import { BookOpen, Upload, Search, Library as LibraryIcon, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import Button from '../components/common/Button';
import { parseBookImport, executeBookImport } from '../lib/bulkImport';
import type { BookParsedImport } from '../lib/bulkImport';
import { sql } from '../lib/db';

const Library = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<'books' | 'issues'>('books');
    const [books, setBooks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Import states
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [parsedData, setParsedData] = useState<BookParsedImport | null>(null);
    const [isImporting, setIsImporting] = useState(false);
    const [importProgress, setImportProgress] = useState(0);
    const [importStatus, setImportStatus] = useState('');

    const fetchBooks = async () => {
        setLoading(true);
        try {
            const data = await sql`SELECT * FROM books ORDER BY title ASC`;
            setBooks(data);
        } catch (error) {
            console.error('Error fetching books:', error);
            toast.error('Failed to load library inventory');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBooks();
    }, []);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            toast.loading('Reading Excel file...');
            const data = await parseBookImport(file);
            setParsedData(data);
            setIsImportModalOpen(true);
            toast.dismiss();
        } catch (error: any) {
            toast.dismiss();
            toast.error(error.message || 'Failed to parse Excel file. Please check the format.');
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleExecuteImport = async () => {
        if (!parsedData) return;
        setIsImporting(true);
        setImportProgress(0);
        setImportStatus('Starting import...');

        try {
            await executeBookImport(parsedData, (progress, status) => {
                setImportProgress(progress);
                setImportStatus(status);
            });
            toast.success(`Successfully imported ${parsedData.books.length} books!`);
            setIsImportModalOpen(false);
            setParsedData(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
            fetchBooks();
        } catch (error: any) {
            toast.error(error.message || 'Failed to import books. Please try again.');
        } finally {
            setIsImporting(false);
        }
    };

    const filteredBooks = books.filter(b => 
        (b.title?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || 
        (b.author?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (b.isbn?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (b.category?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-8 pb-24">
            {/* Hero Header */}
            <div className="relative overflow-hidden bg-amber-600 rounded-2xl md:rounded-3xl p-4 md:p-10 text-white shadow-lg">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full translate-x-16 -translate-y-16 blur-3xl" />
                <div className="relative z-10">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6">
                        <div>
                            <p className="text-amber-100/80 font-medium text-[11px] md:text-xs uppercase tracking-widest flex items-center gap-1.5 mb-1">
                                <LibraryIcon className="w-3.5 h-3.5" />
                                Resources
                            </p>
                            <h1 className="text-xl md:text-4xl font-black tracking-tight">Library Management</h1>
                            <p className="text-amber-100/60 text-sm font-medium mt-1">Manage books, issues, and returns</p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full md:w-auto">
                            <div className="relative flex-1 sm:w-80">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
                                <input
                                    type="text"
                                    placeholder="Search books..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-sm text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 transition-all"
                                />
                            </div>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileUpload}
                                accept=".xlsx,.xls"
                                className="hidden"
                            />
                            <Button
                                onClick={() => fileInputRef.current?.click()}
                                className="bg-white/15 hover:bg-white/25 text-white shadow-lg px-5 py-3 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 shrink-0 border border-white/20"
                            >
                                <Upload className="w-5 h-5" strokeWidth={3} />
                                <span className="font-bold">Import Excel</span>
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Dashboard Stats & Tabs */}
            <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-8 -mt-6">
                <div className="bg-white rounded-2xl saas-shadow border border-saas-border p-2 sm:p-3 flex items-center gap-2 overflow-x-auto custom-scrollbar">
                    <button
                        onClick={() => setActiveTab('books')}
                        className={`flex items-center gap-2 px-6 py-3 sm:py-4 rounded-xl font-bold text-[13px] sm:text-[14px] transition-all whitespace-nowrap ${
                            activeTab === 'books'
                                ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-100'
                                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                        }`}
                    >
                        <BookOpen className="w-4 h-4" />
                        Book Inventory
                    </button>
                    <button
                        onClick={() => setActiveTab('issues')}
                        className={`flex items-center gap-2 px-6 py-3 sm:py-4 rounded-xl font-bold text-[13px] sm:text-[14px] transition-all whitespace-nowrap ${
                            activeTab === 'issues'
                                ? 'bg-amber-50 text-amber-700 shadow-sm border border-amber-100'
                                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                        }`}
                    >
                        <LibraryIcon className="w-4 h-4" />
                        Issued Books
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-8 mt-6 sm:mt-8">
                {loading ? (
                    <div className="bg-white rounded-2xl saas-shadow border border-saas-border flex flex-col items-center justify-center py-20 sm:py-32 gap-4">
                        <Loader2 className="w-8 h-8 sm:w-10 sm:h-10 text-blue-500 animate-spin" strokeWidth={3} />
                        <p className="text-slate-400 font-semibold tracking-wide uppercase text-[10px] sm:text-[11px]">Loading Library...</p>
                    </div>
                ) : activeTab === 'books' ? (
                    filteredBooks.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                            {filteredBooks.map((book) => (
                                <div key={book.id} className="bg-white p-5 rounded-2xl saas-shadow border border-saas-border hover:shadow-lg transition-shadow">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 shrink-0">
                                            <BookOpen className="w-5 h-5" />
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-1 rounded-md">{book.category || 'General'}</span>
                                            {book.rack_number && <span className="text-[10px] font-bold text-slate-400 mt-1">Rack: {book.rack_number}</span>}
                                        </div>
                                    </div>
                                    <h4 className="text-lg font-bold text-saas-dark leading-tight mb-1 line-clamp-2" title={book.title}>{book.title}</h4>
                                    <p className="text-sm font-medium text-slate-500 mb-4 truncate" title={book.author}>By {book.author}</p>
                                    
                                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Availability</span>
                                            <div className="flex items-baseline gap-1.5 mt-0.5">
                                                <span className={`text-lg font-black ${book.available_copies > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                    {book.available_copies}
                                                </span>
                                                <span className="text-xs font-bold text-slate-400">/ {book.total_copies}</span>
                                            </div>
                                        </div>
                                        <Button variant="secondary" className="px-4 py-2 text-[13px] rounded-lg">
                                            Issue Book
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl saas-shadow border border-saas-border flex flex-col items-center justify-center py-20 text-center p-6">
                            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6 border border-slate-100">
                                <BookOpen className="w-8 h-8 text-slate-300" />
                            </div>
                            <h3 className="text-lg font-bold text-saas-dark">No Books Found</h3>
                            <p className="text-slate-400 mt-2 max-w-xs text-[13px] font-medium leading-relaxed">Import an Excel file containing the book collection.</p>
                        </div>
                    )
                ) : null}
            </div>

            {/* Import Modal */}
            {isImportModalOpen && parsedData && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div 
                        className="absolute inset-0 bg-saas-dark/80 backdrop-blur-sm"
                        onClick={() => !isImporting && setIsImportModalOpen(false)}
                    />
                    <div className="relative bg-white rounded-[32px] p-8 md:p-10 max-w-md w-full shadow-2xl overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-2 bg-blue-500" />
                        
                        {!isImporting && (
                            <button 
                                onClick={() => setIsImportModalOpen(false)}
                                className="absolute top-6 right-6 p-2 text-slate-400 hover:text-saas-dark hover:bg-slate-100 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        )}

                        <div className="flex flex-col items-center text-center space-y-6">
                            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center border border-blue-100">
                                <Upload className="w-8 h-8 text-blue-500" />
                            </div>
                            
                            <div className="space-y-2">
                                <h3 className="text-2xl font-black text-saas-dark tracking-tight">Import Books</h3>
                                <p className="text-slate-500 text-sm font-medium leading-relaxed">
                                    Found <strong>{parsedData.books.length}</strong> valid records in your Excel file.
                                </p>
                            </div>

                            <div className="w-full bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-3">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="font-bold text-slate-400">Total Rows Scaled</span>
                                    <span className="font-black text-saas-dark">{parsedData.totalRows}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="font-bold text-slate-400">Valid Book Entries</span>
                                    <span className="font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">{parsedData.books.length}</span>
                                </div>
                            </div>

                            {isImporting ? (
                                <div className="w-full space-y-4 py-4">
                                    <div className="flex justify-between text-sm font-bold mb-2">
                                        <span className="text-blue-600">{importStatus}</span>
                                        <span className="text-saas-dark">{importProgress}%</span>
                                    </div>
                                    <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                                        <div 
                                            className="bg-blue-500 h-3 rounded-full transition-all duration-300 relative"
                                            style={{ width: `${importProgress}%` }}
                                        >
                                            <div className="absolute inset-0 bg-white/20 animate-pulse" />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col sm:flex-row gap-3 w-full pt-4">
                                    <Button 
                                        variant="secondary" 
                                        onClick={() => setIsImportModalOpen(false)}
                                        className="sm:flex-1 py-3.5 rounded-xl font-bold"
                                    >
                                        Cancel
                                    </Button>
                                    <Button 
                                        onClick={handleExecuteImport}
                                        className="sm:flex-1 py-3.5 rounded-xl font-bold bg-blue-500 hover:bg-blue-600 text-white shadow-xl shadow-blue-500/20"
                                    >
                                        Start Import
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            
        </div>
    );
};

export default Library;
