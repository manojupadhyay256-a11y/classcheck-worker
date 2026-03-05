import { useState } from 'react';
import { FileText, Download, Filter, BarChart, FileSpreadsheet, FileBox } from 'lucide-react';
import Button from '../../components/common/Button';
import { motion } from 'framer-motion';

const TeacherReports = () => {
    const [selectedMonth, setSelectedMonth] = useState('March 2026');

    const reportCards = [
        { title: 'Monthly Attendance Summary', desc: 'Detailed view of daily attendance for the selected month.', icon: BarChart, color: 'primary' as const },
        { title: 'Defaulters List', desc: 'Identify students with attendance below 75%.', icon: FileText, color: 'danger' as const },
        { title: 'Excel Export', desc: 'Download student data in .xlsx format for record keeping.', icon: FileSpreadsheet, color: 'success' as const },
        { title: 'Weekly Breakdown', desc: 'Analyze attendance patterns across the weeks.', icon: FileBox, color: 'secondary' as const },
    ];

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Reports & Analytics</h1>
                    <p className="text-gray-500 mt-1">Analyze and export class attendance data.</p>
                </div>
                <div className="flex items-center gap-3">
                    <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-700 shadow-sm outline-none focus:ring-4 focus:ring-primary/10"
                    >
                        <option>March 2026</option>
                        <option>February 2026</option>
                        <option>January 2026</option>
                    </select>
                    <Button variant="outline">
                        <Filter className="w-5 h-5" />
                        <span className="hidden sm:inline">More Filters</span>
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {reportCards.map((card, index) => (
                    <motion.div
                        initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        key={index}
                        className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all group"
                    >
                        <div className={`w-14 h-14 rounded-2xl mb-6 flex items-center justify-center ${card.color === 'primary' ? 'bg-primary/10 text-primary' :
                                card.color === 'danger' ? 'bg-rose-50 text-rose-600' :
                                    card.color === 'success' ? 'bg-emerald-50 text-emerald-600' :
                                        'bg-secondary/10 text-secondary'
                            }`}>
                            <card.icon className="w-8 h-8" />
                        </div>
                        <h3 className="text-xl font-extrabold text-gray-900 mb-2">{card.title}</h3>
                        <p className="text-gray-500 mb-8 leading-relaxed max-w-sm">{card.desc}</p>
                        <Button variant="ghost" className="w-full justify-between px-6 border border-gray-100 group-hover:border-primary group-hover:text-primary">
                            Generate Report
                            <Download className="w-4 h-4 ml-2" />
                        </Button>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

export default TeacherReports;
