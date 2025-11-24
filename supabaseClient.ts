import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SupabaseConfig } from './types';

let supabaseInstance: SupabaseClient | null = null;

export const getSupabase = (): SupabaseClient | null => {
  return supabaseInstance;
};

export const initSupabase = (config: SupabaseConfig): SupabaseClient => {
  supabaseInstance = createClient(config.url, config.key);
  return supabaseInstance;
};

export const hasSupabaseConfig = (): boolean => {
  const stored = localStorage.getItem('supabase_config');
  if (stored) {
    const config = JSON.parse(stored);
    if (config.url && config.key) {
      initSupabase(config);
      return true;
    }
  }
  return false;
};

export const saveSupabaseConfig = (config: SupabaseConfig) => {
  localStorage.setItem('supabase_config', JSON.stringify(config));
  initSupabase(config);
};

export const clearSupabaseConfig = () => {
  localStorage.removeItem('supabase_config');
  supabaseInstance = null;
};

// SQL for setting up the database
export const SETUP_SQL = `
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create Students Table
create table if not exists public.students (
  id uuid default uuid_generate_v4() primary key,
  student_id text not null unique,
  first_name text not null,
  last_name text not null,
  email text,
  rfid_tag text unique,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create Lecturers Table
create table if not exists public.lecturers (
  id uuid default uuid_generate_v4() primary key,
  first_name text not null,
  last_name text not null,
  email text unique not null,
  department text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create Courses Table
create table if not exists public.courses (
  id uuid default uuid_generate_v4() primary key,
  code text not null unique,
  name text not null,
  lecturer_id uuid references public.lecturers(id) on delete set null,
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create Sessions Table (NEW)
create table if not exists public.sessions (
  id uuid default uuid_generate_v4() primary key,
  course_id uuid references public.courses(id) on delete cascade not null,
  lecturer_id uuid references public.lecturers(id) on delete set null,
  start_time timestamp with time zone default timezone('utc'::text, now()) not null,
  end_time timestamp with time zone,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create Enrollments (Many-to-Many)
create table if not exists public.enrollments (
  id uuid default uuid_generate_v4() primary key,
  student_id uuid references public.students(id) on delete cascade not null,
  course_id uuid references public.courses(id) on delete cascade not null,
  unique(student_id, course_id)
);

-- Create Attendance Logs
create table if not exists public.attendance_logs (
  id uuid default uuid_generate_v4() primary key,
  student_id uuid references public.students(id) on delete cascade not null,
  course_id uuid references public.courses(id) on delete cascade not null,
  session_id uuid references public.sessions(id) on delete set null,
  timestamp timestamp with time zone default timezone('utc'::text, now()) not null,
  status text check (status in ('present', 'late', 'absent')) default 'present',
  unique(student_id, session_id) -- Prevent duplicate scans per session
);

-- Enable Row Level Security (Optional for demo, but good practice)
alter table public.students enable row level security;
alter table public.lecturers enable row level security;
alter table public.courses enable row level security;
alter table public.sessions enable row level security;
alter table public.enrollments enable row level security;
alter table public.attendance_logs enable row level security;

-- Create simple policies (Public access for this demo app simplicity)
-- DROP policies if they exist to avoid errors on re-run
drop policy if exists "Allow all access" on public.students;
drop policy if exists "Allow all access" on public.lecturers;
drop policy if exists "Allow all access" on public.courses;
drop policy if exists "Allow all access" on public.sessions;
drop policy if exists "Allow all access" on public.enrollments;
drop policy if exists "Allow all access" on public.attendance_logs;

create policy "Allow all access" on public.students for all using (true) with check (true);
create policy "Allow all access" on public.lecturers for all using (true) with check (true);
create policy "Allow all access" on public.courses for all using (true) with check (true);
create policy "Allow all access" on public.sessions for all using (true) with check (true);
create policy "Allow all access" on public.enrollments for all using (true) with check (true);
create policy "Allow all access" on public.attendance_logs for all using (true) with check (true);
`;