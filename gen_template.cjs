const XLSX = require('xlsx');
const path = require('path');

const data = [
    {
        "Admission No": "2024001",
        "Student Name": "Aarav Sharma",
        "Father's Name": "Rajesh Sharma",
        "Mother's Name": "Priya Sharma",
        "Date of Birth": "2010-05-15",
        "Address": "House No. 123, Street 4, Patel Nagar, Delhi",
        "Phone Number": "9876543210",
        "Category": "General",
        "Class": "10-A"
    },
    {
        "Admission No": "2024002",
        "Student Name": "Ishita Verma",
        "Father's Name": "Sanjay Verma",
        "Mother's Name": "Sunita Verma",
        "Date of Birth": "2010-08-22",
        "Address": "Flat 405, Sky Apartments, Sector 15, Gurgaon",
        "Phone Number": "9876543211",
        "Category": "OBC",
        "Class": "10-A"
    }
];

const ws = XLSX.utils.json_to_sheet(data);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, "Students");

const filePath = path.join(process.cwd(), 'Student_Import_Template.xlsx');
XLSX.writeFile(wb, filePath);

console.log(`Updated template created at: ${filePath}`);
