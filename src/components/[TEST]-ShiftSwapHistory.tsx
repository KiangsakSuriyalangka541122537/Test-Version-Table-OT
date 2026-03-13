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

  const getStaffName = (id: string) => {
    const staff = staffList.find(s => s.id === id);
    return staff ? staff.name : 'Unknown';
  };

  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr), 'd MMM', { locale: th });
  };

  const getShiftLabel = (type: string) => {
    switch (type) {
      case 'M': return 'เช้า';
      case 'A': return 'บ่าย';
      case 'N': return 'ดึก';
      case 'O': return 'หยุด';
      default: return type;
    }
  };

  if (loading) {
    return (
      <div className="mt-8 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm animate-pulse">
        <div className="h-6 bg-slate-100 rounded w-1/4 mb-4"></div>
        <div className="space-y-3">
          <div className="h-12 bg-slate-50 rounded-xl"></div>
          <div className="h-12 bg-slate-50 rounded-xl"></div>
          <div className="h-12 bg-slate-50 rounded-xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-12 bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
      <div className="px-8 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-200">
            <ArrowRightLeft className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-lg tracking-tight">บันทึกประวัติการย้ายเวร</h3>
            <p className="text-slate-500 text-xs font-medium">รายการย้ายเวรที่เกิดขึ้นในเดือน{format(currentMonth, 'MMMM', { locale: th })}</p>
          </div>
        </div>
        <div className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-[10px] font-bold uppercase tracking-wider border border-indigo-100">
          {history.length} รายการ
        </div>
      </div>
      
      <div className="p-0">
        {history.length === 0 ? (
           <div className="p-20 text-center">
             <div className="mx-auto w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4 border border-slate-100">
               <Calendar className="w-8 h-8 text-slate-300" />
             </div>
             <p className="text-slate-400 text-sm font-medium">ยังไม่มีประวัติการย้ายเวรในเดือนนี้</p>
           </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {history.map((item) => (
              <div key={item.id} className="p-6 hover:bg-slate-50/50 transition-all group">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-4">
                      <div className={clsx(
                        "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border",
                        item.status === ShiftSwapStatus.APPROVED ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                        item.status === ShiftSwapStatus.REJECTED ? "bg-rose-50 text-rose-700 border-rose-100" :
                        item.status === ShiftSwapStatus.WAITING_TARGET ? "bg-amber-50 text-amber-700 border-amber-100" : "bg-slate-50 text-slate-600 border-slate-200"
                      )}>
                        {item.status === ShiftSwapStatus.APPROVED ? 'ดำเนินการสำเร็จ' :
                         item.status === ShiftSwapStatus.REJECTED ? 'ถูกปฏิเสธ' :
                         item.status === ShiftSwapStatus.WAITING_TARGET ? 'รอการยืนยัน' : 'รอดำเนินการ'}
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-semibold">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{format(new Date(item.updated_at), 'd MMMM yyyy HH:mm', { locale: th })}</span>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      {/* Requester */}
                      <div className="flex-1 flex items-center gap-4 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm group-hover:border-indigo-100 transition-colors">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0 border border-indigo-100">
                          <User className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">ผู้ขอเปลี่ยน</p>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800 truncate">{getStaffName(item.requester_staff_id)}</span>
                            <span className={clsx(
                              "text-[10px] font-black px-2 py-0.5 rounded-md shrink-0 shadow-sm",
                              item.requester_shift_type === 'M' ? "bg-blue-500 text-white" :
                              item.requester_shift_type === 'A' ? "bg-orange-500 text-white" :
                              item.requester_shift_type === 'N' ? "bg-purple-500 text-white" : "bg-slate-400 text-white"
                            )}>
                              {getShiftLabel(item.requester_shift_type)}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 font-bold mt-1 bg-slate-100 inline-block px-1.5 py-0.5 rounded">
                            {format(new Date(item.requester_date), 'EEEE d MMM', { locale: th })}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-center shrink-0">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-inner">
                          <ArrowRightLeft className="w-4 h-4" />
                        </div>
                      </div>

                      {/* Target */}
                      <div className="flex-1 flex items-center gap-4 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm group-hover:border-indigo-100 transition-colors">
                        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100">
                          <User className="w-5 h-5 text-slate-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">ผู้รับเปลี่ยน</p>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800 truncate">{getStaffName(item.target_staff_id)}</span>
                            <span className={clsx(
                              "text-[10px] font-black px-2 py-0.5 rounded-md shrink-0 shadow-sm",
                              item.target_shift_type === 'M' ? "bg-blue-500 text-white" :
                              item.target_shift_type === 'A' ? "bg-orange-500 text-white" :
                              item.target_shift_type === 'N' ? "bg-purple-500 text-white" : "bg-slate-400 text-white"
                            )}>
                              {getShiftLabel(item.target_shift_type)}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 font-bold mt-1 bg-slate-100 inline-block px-1.5 py-0.5 rounded">
                            {format(new Date(item.target_date), 'EEEE d MMM', { locale: th })}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
