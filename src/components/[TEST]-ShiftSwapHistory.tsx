import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { ShiftSwapRequest, ShiftSwapStatus, Staff } from '../types';
import { format, isValid } from 'date-fns';
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
      console.log('Fetching history for month:', format(currentMonth, 'yyyy-MM'));
      
      // Fetch more records to ensure we don't miss any after filtering
      const { data, error } = await supabase
        .from('test_shift_swap_requests')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Supabase error fetching history:', error);
        throw error;
      }
      
      console.log('Total records fetched:', data?.length);

      // Filter to show swaps relevant to the current month view
      // We show swaps where:
      // 1. Either the requester date or target date is in the current month
      // 2. OR the action (updated_at or created_at) was performed in the current month
      const currentMonthStr = format(currentMonth, 'yyyy-MM');
      const filtered = (data || []).filter(item => {
        const isShiftInMonth = (item.requester_date && item.requester_date.startsWith(currentMonthStr)) || 
                               (item.target_date && item.target_date.startsWith(currentMonthStr));
        
        const actionDate = new Date(item.updated_at || item.created_at);
        const isActionInMonth = isValid(actionDate) && format(actionDate, 'yyyy-MM') === currentMonthStr;
        
        return isShiftInMonth || isActionInMonth;
      });

      // Sort by updated_at (or created_at if updated_at is null)
      const sorted = filtered.sort((a, b) => {
        const dateA = new Date(a.updated_at || a.created_at).getTime();
        const dateB = new Date(b.updated_at || b.created_at).getTime();
        return dateB - dateA;
      });

      console.log('Filtered and sorted records for', currentMonthStr, ':', sorted.length);
      setHistory(sorted);
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
            <p className="text-slate-500 text-xs font-medium">รายการย้ายเวรที่เกี่ยวข้องกับเดือน{format(currentMonth, 'MMMM', { locale: th })}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => fetchHistory()}
            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
            title="รีเฟรชประวัติ"
          >
            <Clock className={clsx("w-4 h-4", loading && "animate-spin")} />
          </button>
          <div className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-[10px] font-bold uppercase tracking-wider border border-indigo-100">
            {history.length} รายการ
          </div>
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
