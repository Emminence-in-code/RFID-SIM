export interface Student {
  id: string;
  student_id: string; // The visual ID (e.g., S12345)
  first_name: string;
  last_name: string;
  email: string;
  rfid_tag: string; // The raw RFID card value
  created_at?: string;
}

export interface Lecturer {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  department: string;
  created_at?: string;
}

export interface Course {
  id: string;
  code: string;
  name: string;
  lecturer_id: string;
  lecturer?: Lecturer; // Joined data
  description?: string;
  created_at?: string;
}

export interface Session {
  id: string;
  course_id: string;
  lecturer_id: string;
  start_time: string;
  end_time: string | null;
  is_active: boolean;
  course?: Course;
  lecturer?: Lecturer;
}

export interface AttendanceLog {
  id: string;
  student_id: string;
  course_id: string;
  session_id?: string;
  timestamp: string;
  status: 'present' | 'late' | 'absent';
  student?: Student; // Joined
  course?: Course; // Joined
}

export interface Enrollment {
  id: string;
  student_id: string;
  course_id: string;
}

// Supabase Config Types
export interface SupabaseConfig {
  url: string;
  key: string;
}