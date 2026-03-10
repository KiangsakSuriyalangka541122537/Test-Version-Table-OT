-- [TEST] - Database Setup Script for test_env schema
-- 1. Create Schema
CREATE SCHEMA IF NOT EXISTS test_env;

-- 2. Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 3. Create Users Table
CREATE TABLE test_env.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT CHECK (role IN ('admin', 'user')) NOT NULL DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create Staff Table
CREATE TABLE test_env.staff (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    phone TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create Shifts Table
CREATE TABLE test_env.shifts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    staff_id UUID REFERENCES test_env.staff(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    shift_type TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(staff_id, date)
);

-- 6. Create Roster Status Table
CREATE TABLE test_env.roster_status (
    month_key TEXT PRIMARY KEY,
    is_published BOOLEAN DEFAULT FALSE,
    original_assignments JSONB,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Create Logs Table
CREATE TABLE test_env.logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    message TEXT NOT NULL,
    action_type TEXT NOT NULL
);

-- 8. Create Shift Swap Requests Table
-- Check if type exists first, or just use TEXT for status to avoid schema issues
DO $$ BEGIN
    CREATE TYPE test_env.shift_swap_status AS ENUM ('pending', 'approved', 'rejected', 'waiting_target');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE test_env.shift_swap_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    requester_staff_id UUID REFERENCES test_env.staff(id) ON DELETE CASCADE NOT NULL,
    requester_shift_id UUID REFERENCES test_env.shifts(id) ON DELETE CASCADE,
    requester_date DATE NOT NULL,
    requester_shift_type TEXT NOT NULL,
    target_staff_id UUID REFERENCES test_env.staff(id) ON DELETE CASCADE NOT NULL,
    target_shift_id UUID REFERENCES test_env.shifts(id) ON DELETE CASCADE,
    target_date DATE NOT NULL,
    target_shift_type TEXT NOT NULL,
    status test_env.shift_swap_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Row Level Security (RLS) Policies
ALTER TABLE test_env.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_env.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_env.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_env.roster_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_env.logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_env.shift_swap_requests ENABLE ROW LEVEL SECURITY;

-- Create policies to allow all operations
CREATE POLICY "Allow all on users" ON test_env.users FOR ALL USING (true);
CREATE POLICY "Allow all on staff" ON test_env.staff FOR ALL USING (true);
CREATE POLICY "Allow all on shifts" ON test_env.shifts FOR ALL USING (true);
CREATE POLICY "Allow all on roster_status" ON test_env.roster_status FOR ALL USING (true);
CREATE POLICY "Allow all on logs" ON test_env.logs FOR ALL USING (true);
CREATE POLICY "Allow all on shift_swap_requests" ON test_env.shift_swap_requests FOR ALL USING (true);
