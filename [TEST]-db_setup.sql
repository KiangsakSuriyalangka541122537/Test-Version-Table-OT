-- [TEST] - Database Setup Script for public schema with test_ prefix
-- 1. Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create Users Table (with 'staff' role)
DROP TABLE IF EXISTS public.test_users CASCADE;
CREATE TABLE public.test_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT CHECK (role IN ('admin', 'user', 'staff')) NOT NULL DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create Staff Table
DROP TABLE IF EXISTS public.test_staff CASCADE;
CREATE TABLE public.test_staff (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    phone TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create Shifts Table
DROP TABLE IF EXISTS public.test_shifts CASCADE;
CREATE TABLE public.test_shifts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    staff_id UUID REFERENCES public.test_staff(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    shift_type TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(staff_id, date)
);

-- 5. Create Roster Status Table
DROP TABLE IF EXISTS public.test_roster_status CASCADE;
CREATE TABLE public.test_roster_status (
    month_key TEXT PRIMARY KEY,
    is_published BOOLEAN DEFAULT FALSE,
    original_assignments JSONB,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Create Logs Table
DROP TABLE IF EXISTS public.test_logs CASCADE;
CREATE TABLE public.test_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    message TEXT NOT NULL,
    action_type TEXT NOT NULL
);

-- 7. Create Shift Swap Requests Table
DROP TABLE IF EXISTS public.test_shift_swap_requests CASCADE;
-- Check if type exists first, or just use TEXT for status to avoid schema issues
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'test_shift_swap_status') THEN
        CREATE TYPE public.test_shift_swap_status AS ENUM ('pending', 'approved', 'rejected', 'waiting_target');
    END IF;
END $$;

CREATE TABLE public.test_shift_swap_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    requester_staff_id UUID REFERENCES public.test_staff(id) ON DELETE CASCADE NOT NULL,
    requester_shift_id UUID REFERENCES public.test_shifts(id) ON DELETE CASCADE,
    requester_date DATE NOT NULL,
    requester_shift_type TEXT NOT NULL,
    target_staff_id UUID REFERENCES public.test_staff(id) ON DELETE CASCADE NOT NULL,
    target_shift_id UUID REFERENCES public.test_shifts(id) ON DELETE CASCADE,
    target_date DATE NOT NULL,
    target_shift_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- Using TEXT for simplicity with the enum values
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Row Level Security (RLS) Policies
ALTER TABLE public.test_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_roster_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_shift_swap_requests ENABLE ROW LEVEL SECURITY;

-- Create policies to allow all operations
CREATE POLICY "Allow all on test_users" ON public.test_users FOR ALL USING (true);
CREATE POLICY "Allow all on test_staff" ON public.test_staff FOR ALL USING (true);
CREATE POLICY "Allow all on test_shifts" ON public.test_shifts FOR ALL USING (true);
CREATE POLICY "Allow all on test_roster_status" ON public.test_roster_status FOR ALL USING (true);
CREATE POLICY "Allow all on test_logs" ON public.test_logs FOR ALL USING (true);
CREATE POLICY "Allow all on test_shift_swap_requests" ON public.test_shift_swap_requests FOR ALL USING (true);

-- 9. Insert Initial Data
-- Insert Staff first
INSERT INTO public.test_staff (name) VALUES 
('นายกิตติพงษ์ ชัยศรี'),
('นางสาววรรณภา สอนเสือ'),
('นางสาวศิรินชา พึ่งวงษ์เขียน'),
('นางสาวนิธิพร ใสปา'),
('นายเกรียงศักดิ์ สุริยะลังกา'),
('นายวิทวัส หมายมั่น'),
('นายอาร์ม');

-- Insert Users
INSERT INTO public.test_users (username, password, name, role) VALUES 
('admin', 'admin123', 'System Admin', 'admin'),
('kik', 'kik123', 'นางสาววรรณภา สอนเสือ', 'admin'),
('tor', 'tor', 'นายกิตติพงษ์ ชัยศรี', 'staff'),
('jhim', 'jhim', 'นางสาวศิรินชา พึ่งวงษ์เขียน', 'staff'),
('parn', 'parn', 'นางสาวนิธิพร ใสปา', 'staff'),
('top', 'top', 'นายเกรียงศักดิ์ สุริยะลังกา', 'staff'),
('team', 'team', 'นายวิทวัส หมายมั่น', 'staff'),
('arm', 'arm', 'นายอาร์ม', 'staff');
