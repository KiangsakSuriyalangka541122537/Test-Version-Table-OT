import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { ShiftSwapRequest, ShiftSwapStatus, Staff } from '../types';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { ArrowRightLeft, Calendar, User, Clock } from 'lucide-react';
import clsx from 'clsx';

interface ShiftSwapHistoryProps {
  staffList: Staff[];
  currentMonth: Date;
  lastUpdated: number; // Prop to trigger refetch
}

export function ShiftSwapHistory({ staffList, currentMonth, lastUpdated }: ShiftSwapHistoryProps) {
  const [history, setHistory] = useState<ShiftSwapRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, [currentMonth, lastUpdated]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      // Get start and end of the current month to filter history?
      // Or just show latest 10-20 swaps regardless of month?
      // User said "below the roster calendar", implying it might be relevant to the displayed month.
      // However, swaps are actions. Usually we want to see recent actions.
      // Let's filter by the month of the *requester_date* or *target_date* matching the current month.
      
      const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).toISOString();
      const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).toISOString();

      // Supabase doesn't support complex OR filtering easily across different columns with dates in one go without raw SQL or multiple queries.
      // Let's just fetch recent approved swaps and filter client side or just fetch last 50.
      // "History of shift swaps" usually implies recent activity.
      
      const { data, error } = await supabase
        .from('test_shift_swap_requests')
        .select('*')
        .eq('status', ShiftSwapStatus.APPROVED)
        .order('updated_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      
      // Filter to show only swaps relevant to the current month view?
      // Or just show all recent history?
      // "History of shift swaps" usually means "What happened recently".
      // But if it's "below the roster", maybe it should show swaps *for this month*.
      // Let's filter client side for relevance to current month if possible, or just show all recent.
      // Showing all recent is safer to ensure visibility of actions.
      // But user said "flexible according to screen like the roster".
      
      // Let's try to show swaps that involve dates in the current month.
      const currentMonthStr = format(currentMonth, 'yyyy-MM');
      const filtered = (data || []).filter(item => 
        item.requester_date.startsWith(currentMonthStr) || 
        item.target_date.startsWith(currentMonthStr)
      );

      setHistory(filtered);
    } catch (err) {
      console.error('Error fetching history:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStaffFirstName = (id: string) => {
    const staff = staffList.find(s => s.id === id);
    if (!staff) return 'Unknown';
    // Split by space and take the first part
    return staff.name.split(' ')[0];
  };

  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr), 'd MMM', { locale: th });
  };

  const getShiftLabel = (type: string) => {
    if (!type) return 'หยุด';
    return type.split(',').map(t => {
      const trimmed = t.trim();
      switch (trimmed) {
        case 'M': return 'ช';
        case 'A': return 'บ';
        case 'N': return 'ด';
        case 'O': return 'หยุด';
        default: return trimmed;
      }
    }).join(' + ');
  };

  if (loading) {
    return (
      <div className="mt-6 bg-white rounded-xl border border-slate-200 p-4 shadow-sm animate-pulse">
        <div className="h-4 bg-slate-100 rounded w-1/4 mb-4"></div>
        <div className="space-y-2">
          <div className="h-8 bg-slate-50 rounded-lg"></div>
          <div className="h-8 bg-slate-50 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
        <ArrowRightLeft className="w-4 h-4 text-indigo-600" />
        <h3 className="font-bold text-sm text-slate-800">ประวัติการย้ายเวร (เดือน{format(currentMonth, 'MMMM', { locale: th })})</h3>
      </div>
      
      <div className="p-4">
        {history.length === 0 ? (
           <div className="text-center text-slate-400 text-xs py-4">
             ยังไม่มีประวัติการย้ายเวรในเดือนนี้
           </div>
        ) : (
          <div className="flex flex-col">
            {history.map((item) => (
              <div key={item.id} className="text-[13px] text-slate-700 py-2 border-b border-slate-100 last:border-0 truncate">
                <span className="font-medium text-indigo-700">{getStaffFirstName(item.requester_staff_id)}</span>{' '}
                <span className="text-slate-500">{formatDate(item.requester_date)}</span>{' '}
                <span className="font-medium">{getShiftLabel(item.requester_shift_type)}</span>
                <span className="text-slate-400 mx-1">แลกกับ</span>
                <span className="font-medium text-emerald-700">{getStaffFirstName(item.target_staff_id)}</span>{' '}
                <span className="text-slate-500">{formatDate(item.target_date)}</span>{' '}
                <span className="font-medium">{getShiftLabel(item.target_shift_type)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
