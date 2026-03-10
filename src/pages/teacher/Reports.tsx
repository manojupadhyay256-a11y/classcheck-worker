import { useState, useEffect } from 'react';
import { FileText, Download, Filter, BarChart, FileSpreadsheet, FileBox, Loader2 } from 'lucide-react';
import Button from '../../components/common/Button';
import { motion } from 'framer-motion';
import { sql } from '../../lib/db';
import { useAuthStore } from '../../stores/authStore';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend, parseISO } from 'date-fns';

const TeacherReports = () => {
    const { profile } = useAuthStore();
    const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
    const [isGenerating, setIsGenerating] = useState<string | null>(null);
    const [classInfo, setClassInfo] = useState<{ id: string; name: string } | null>(null);

    useEffect(() => {
        const fetchClassInfo = async () => {
            if (!profile?.email) return;
            try {
                const result = await sql`
                    SELECT c.id, c.name
                    FROM teachers t
                    JOIN classes c ON c.class_teacher_id = t.id
                    WHERE LOWER(t.email) = LOWER(${profile.email})
                    LIMIT 1
                `;
                if (result.length > 0) {
                    setClassInfo({ id: result[0].id, name: result[0].name });
                }
            } catch (error) {
                console.error('Error fetching class info:', error);
            }
        };
        fetchClassInfo();
    }, [profile]);

    const months = [
        { label: format(new Date(), 'MMMM yyyy'), value: format(new Date(), 'yyyy-MM') },
        { label: format(new Date(new Date().setMonth(new Date().getMonth() - 1)), 'MMMM yyyy'), value: format(new Date(new Date().setMonth(new Date().getMonth() - 1)), 'yyyy-MM') },
        { label: format(new Date(new Date().setMonth(new Date().getMonth() - 2)), 'MMMM yyyy'), value: format(new Date(new Date().setMonth(new Date().getMonth() - 2)), 'yyyy-MM') },
    ];

    const generateMonthlySummary = async () => {
        if (!classInfo) return;
        setIsGenerating('monthly');
        try {
            const start = startOfMonth(parseISO(`${selectedMonth}-01`));
            const end = endOfMonth(start);
            const days = eachDayOfInterval({ start, end });

            const [students, attendance] = await Promise.all([
                sql`SELECT id, student_name, admission_no FROM students WHERE class_id = ${classInfo.id} ORDER BY student_name`,
                sql`SELECT student_id, date, status FROM attendance WHERE class_id = ${classInfo.id} AND date >= ${format(start, 'yyyy-MM-dd')} AND date <= ${format(end, 'yyyy-MM-dd')}`
            ]);

            const doc = new jsPDF('l', 'mm', 'a4');
            const pageWidth = doc.internal.pageSize.width;

            // Header
            doc.setFontSize(20);
            doc.setFont('helvetica', 'bold');
            doc.text('Monthly Attendance Summary', pageWidth / 2, 15, { align: 'center' });

            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text(`Class: ${classInfo.name} | Month: ${format(start, 'MMMM yyyy')}`, pageWidth / 2, 22, { align: 'center' });

            const tableData = students.map((s, idx) => {
                const row: any[] = [idx + 1, s.student_name];
                let presentCount = 0;
                days.forEach(day => {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const record = attendance.find(a => a.student_id === s.id && format(new Date(a.date), 'yyyy-MM-dd') === dateStr);
                    if (record?.status === 'Present') presentCount++;
                    row.push(record ? record.status[0] : '-');
                });
                row.push(presentCount);
                return row;
            });

            const headers = ['#', 'Student Name', ...days.map(d => format(d, 'd')), 'Total'];

            autoTable(doc, {
                head: [headers],
                body: tableData,
                startY: 30,
                styles: { fontSize: 7, cellPadding: 1 },
                headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255] },
                columnStyles: {
                    0: { cellWidth: 8 },
                    1: { cellWidth: 35 },
                },
                didParseCell: (data) => {
                    if (data.section === 'body' && data.column.index > 1 && data.column.index < headers.length - 1) {
                        const content = data.cell.text[0];
                        if (content === 'P') data.cell.styles.textColor = [16, 185, 129];
                        if (content === 'A') data.cell.styles.textColor = [239, 68, 68];
                    }
                }
            });

            doc.save(`Attendance_Summary_${classInfo.name}_${selectedMonth}.pdf`);
            toast.success('Report generated successfully!');
        } catch (error) {
            console.error('Error generating report:', error);
            toast.error('Failed to generate report');
        } finally {
            setIsGenerating(null);
        }
    };

    const generateDefaultersList = async () => {
        if (!classInfo) return;
        setIsGenerating('defaulters');
        try {
            const start = startOfMonth(parseISO(`${selectedMonth}-01`));
            const end = endOfMonth(start);
            const workingDaysCount = eachDayOfInterval({ start, end }).filter(d => !isWeekend(d)).length;

            const [students, attendance] = await Promise.all([
                sql`SELECT id, student_name, admission_no, phone_number FROM students WHERE class_id = ${classInfo.id} ORDER BY student_name`,
                sql`SELECT student_id, status FROM attendance WHERE class_id = ${classInfo.id} AND date >= ${format(start, 'yyyy-MM-dd')} AND date <= ${format(end, 'yyyy-MM-dd')} AND status = 'Present'`
            ]);

            const defaulters = (students as any[]).map(s => {
                const presentCount = (attendance as any[]).filter(a => a.student_id === s.id).length;
                const percentage = workingDaysCount > 0 ? Math.round((presentCount / workingDaysCount) * 100) : 0;
                return {
                    admission_no: s.admission_no,
                    student_name: s.student_name,
                    phone_number: s.phone_number,
                    presentCount,
                    percentage
                };
            }).filter(s => s.percentage < 75);

            const doc = new jsPDF();
            doc.setFontSize(18);
            doc.text('Attendance Defaulters List', 105, 15, { align: 'center' });
            doc.setFontSize(10);
            doc.text(`Class: ${classInfo.name} | Month: ${format(start, 'MMMM yyyy')} | Criteria: < 75%`, 105, 22, { align: 'center' });

            autoTable(doc, {
                head: [['ADM No', 'Student Name', 'Present Days', 'Percentage', 'Contact']],
                body: defaulters.map(d => [d.admission_no, d.student_name, d.presentCount, `${d.percentage}%`, d.phone_number || 'N/A']),
                startY: 30,
                headStyles: { fillColor: [239, 68, 68] }
            });

            doc.save(`Defaulters_${classInfo.name}_${selectedMonth}.pdf`);
            toast.success('Defaulters list generated!');
        } catch (error) {
            console.error('Error:', error);
            toast.error('Failed to generate defaulters list');
        } finally {
            setIsGenerating(null);
        }
    };

    const exportToExcel = async () => {
        if (!classInfo) return;
        setIsGenerating('excel');
        try {
            const students = await sql`SELECT admission_no, student_name, father_name, phone_number, category FROM students WHERE class_id = ${classInfo.id} ORDER BY student_name`;

            const ws = XLSX.utils.json_to_sheet(students);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Students");
            XLSX.writeFile(wb, `Student_Directory_${classInfo.name}.xlsx`);
            toast.success('Excel exported successfully!');
        } catch (error) {
            console.error('Error:', error);
            toast.error('Failed to export Excel');
        } finally {
            setIsGenerating(null);
        }
    };

    const generateWeeklyBreakdown = async () => {
        if (!classInfo) return;
        setIsGenerating('weekly');
        try {
            const start = startOfMonth(parseISO(`${selectedMonth}-01`));
            const end = endOfMonth(start);

            const [students, attendance] = await Promise.all([
                sql`SELECT id, student_name FROM students WHERE class_id = ${classInfo.id} ORDER BY student_name`,
                sql`SELECT student_id, date, status FROM attendance WHERE class_id = ${classInfo.id} AND date >= ${format(start, 'yyyy-MM-dd')} AND date <= ${format(end, 'yyyy-MM-dd')}`
            ]);

            const doc = new jsPDF();
            doc.text('Weekly Attendance Breakdown', 105, 15, { align: 'center' });
            doc.setFontSize(10);
            doc.text(`${classInfo.name} - ${format(start, 'MMMM yyyy')}`, 105, 22, { align: 'center' });

            // Simple breakdown by week of month
            const tableData = students.map(s => {
                const sAttendance = attendance.filter(a => a.student_id === s.id && a.status === 'Present');
                const row = [s.student_name];
                for (let i = 0; i < 5; i++) {
                    const weekStart = new Date(start);
                    weekStart.setDate(weekStart.getDate() + (i * 7));
                    const weekEnd = new Date(weekStart);
                    weekEnd.setDate(weekEnd.getDate() + 6);

                    const count = sAttendance.filter(a => {
                        const d = new Date(a.date);
                        return d >= weekStart && d <= weekEnd && d <= end;
                    }).length;
                    row.push(count);
                }
                return row;
            });

            autoTable(doc, {
                head: [['Student Name', 'Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5']],
                body: tableData,
                startY: 30
            });

            doc.save(`Weekly_Breakdown_${classInfo.name}_${selectedMonth}.pdf`);
            toast.success('Weekly report generated!');
        } catch (error) {
            console.error('Error:', error);
            toast.error('Failed to generate weekly breakdown');
        } finally {
            setIsGenerating(null);
        }
    };

    const reportCards = [
        { id: 'monthly', title: 'Monthly Attendance Summary', desc: 'Detailed view of daily attendance for the selected month.', icon: BarChart, color: 'primary' as const, action: generateMonthlySummary },
        { id: 'defaulters', title: 'Defaulters List', desc: 'Identify students with attendance below 75%.', icon: FileText, color: 'danger' as const, action: generateDefaultersList },
        { id: 'excel', title: 'Excel Export', desc: 'Download student data in .xlsx format for record keeping.', icon: FileSpreadsheet, color: 'success' as const, action: exportToExcel },
        { id: 'weekly', title: 'Weekly Breakdown', desc: 'Analyze attendance patterns across the weeks.', icon: FileBox, color: 'secondary' as const, action: generateWeeklyBreakdown },
    ];

    return (
        <div className="space-y-8 pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-4xl font-black text-gray-900 tracking-tight">Reports & Analytics</h1>
                    <p className="text-gray-500 mt-1">
                        {classInfo ? `Generating reports for Class ${classInfo.name}` : 'Analyze and export class attendance data.'}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-700 shadow-sm outline-none focus:ring-4 focus:ring-primary/10"
                    >
                        {months.map(m => (
                            <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
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
                        <Button
                            variant="ghost"
                            className="w-full justify-between px-6 border border-gray-100 group-hover:border-primary group-hover:text-primary disabled:opacity-50"
                            onClick={card.action}
                            disabled={isGenerating !== null || !classInfo}
                        >
                            {isGenerating === card.id ? (
                                <>
                                    Generating...
                                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                                </>
                            ) : (
                                <>
                                    Generate Report
                                    <Download className="w-4 h-4 ml-2" />
                                </>
                            )}
                        </Button>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

export default TeacherReports;
