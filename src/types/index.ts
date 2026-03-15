export type UserRole = 'admin' | 'principal' | 'teacher';

export interface Profile {
    id: string;
    full_name: string;
    email: string;
    date_of_birth?: string;
    gender?: 'Male' | 'Female' | 'Other';
    role: UserRole;
    is_office?: boolean;
    is_librarian?: boolean;
    created_at: string;
    updated_at: string;
}

export interface Class {
    id: string;
    name: string;
    class_teacher_id: string | null;
    teacher_name?: string;
    student_count?: number;
    created_at: string;
}

export interface Student {
    id: string;
    admission_no: string;
    student_name: string;
    father_name: string;
    mother_name: string;
    phone_number: string;
    category: string;
    class_id: string;
    created_at: string;
    updated_at: string;
}

export interface Attendance {
    id: string;
    student_id: string;
    class_id: string;
    date: string;
    status: 'Present' | 'Absent' | 'Leave' | 'Holiday';
    marked_by: string;
    created_at: string;
}

export interface Holiday {
    id: string;
    date: string;
    description: string;
    created_at: string;
}

export interface Homework {
    id: string;
    class_id: string;
    subject_id: string;
    teacher_id: string;
    date: string;
    topic: string;
    description: string;
    created_at: string;
    updated_at: string;
    // Joined fields
    subject_name?: string;
    teacher_name?: string;
    class_name?: string;
}

export interface Book {
    id: string;
    title: string;
    author: string;
    isbn?: string;
    total_copies: number;
    available_copies: number;
    created_at: string;
}

export interface BookIssue {
    id: string;
    book_id: string;
    student_id: string;
    issue_date: string;
    due_date: string;
    return_date?: string;
    status: 'issued' | 'returned' | 'overdue';
    created_at: string;
    // Joined fields
    book_title?: string;
    student_name?: string;
    admission_no?: string;
}
