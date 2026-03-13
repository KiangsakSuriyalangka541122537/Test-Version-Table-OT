-- [TEST] - Fix database constraints to prevent history deletion
-- Run this script in your Supabase SQL Editor

-- 1. ลบ Constraint เดิมออก
ALTER TABLE public.test_shift_swap_requests 
DROP CONSTRAINT IF EXISTS test_shift_swap_requests_requester_shift_id_fkey,
DROP CONSTRAINT IF EXISTS test_shift_swap_requests_target_shift_id_fkey;

-- 2. เพิ่ม Constraint ใหม่แบบ ON DELETE SET NULL
ALTER TABLE public.test_shift_swap_requests 
ADD CONSTRAINT test_shift_swap_requests_requester_shift_id_fkey 
FOREIGN KEY (requester_shift_id) REFERENCES public.test_shifts(id) ON DELETE SET NULL,
ADD CONSTRAINT test_shift_swap_requests_target_shift_id_fkey 
FOREIGN KEY (target_shift_id) REFERENCES public.test_shifts(id) ON DELETE SET NULL;
