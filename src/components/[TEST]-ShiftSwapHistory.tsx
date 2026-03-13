import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { ShiftSwapRequest, ShiftSwapStatus, Staff } from '../types';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { ArrowRightLeft, Calendar, User, Clock, History } from 'lucide-react';
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
      const monthStr = format(currentMonth, 'yyyy-MM');
      console.log('Fetching history for month:', monthStr);
      
      const { data, error } = await supabase
        .from('test_shift_swap_requests')
        .select('*')
        .eq('status', ShiftSwapStatus.APPROVED)
        .order('updated_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      
      console.log('Total approved swaps fetched:', data?.length);

      const filtered = (data || []).filter(item => {
        const reqMonth = item.requester_date ? item.requester_date.substring(0, 7) : '';
        const tarMonth = item.target_date ? item.target_date.substring(0, 7) : '';
        return reqMonth === monthStr || tarMonth === monthStr;
      });

      console.log('Filtered swaps for current month:', filtered.length);
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
    switch (type) {
      case 'M': return 'ช';
      case 'A': return 'บ';
      case 'N': return 'ด';
      case 'O': return 'หยุด';
      default: return type;
    }
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
           <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center shadow-sm">
             <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
               <History className="w-6 h-6 text-slate-300" />
             </div>
             <p className="text-slate-400 text-sm">ยังไม่มีประวัติการย้ายเวรในเดือน {format(currentMonth, 'MMMM yyyy', { locale: th })}</p>
             <button 
               onClick={fetchHistory}
               className="mt-4 text-xs font-semibold text-indigo-600 hover:text-indigo-700 underline"
             >
               ลองโหลดข้อมูลอีกครั้ง
             </button>
           </div>
        ) : (
          <div className="flex flex-col gap-2">
            {history.map((item) => (
              <div key={item.id} className="text-[13px] text-slate-700 flex items-center gap-2 py-1 border-b border-slate-50 last:border-0">
                <span className="font-bold text-indigo-700">{getStaffFirstName(item.requester_staff_id)}</span>
                <span className="text-slate-500">{formatDate(item.requester_date)}</span>
                <span className={clsx(
                  "font-bold px-1 rounded text-[11px]",
                  item.requester_shift_type === 'M' ? "text-blue-600 bg-blue-50" :
                  item.requester_shift_type === 'A' ? "text-orange-600 bg-orange-50" :
                  item.requester_shift_type === 'N' ? "text-purple-600 bg-purple-50" : "text-slate-500 bg-slate-50"
                )}>
                  {getShiftLabel(item.requester_shift_type)}
                </span>
                
                <span className="text-slate-400 mx-1">แลกกับ</span>
                
                <span className="font-bold text-emerald-700">{getStaffFirstName(item.target_staff_id)}</span>
                <span className="text-slate-500">{formatDate(item.target_date)}</span>
                <span className={clsx(
                  "font-bold px-1 rounded text-[11px]",
                  item.target_shift_type === 'M' ? "text-blue-600 bg-blue-50" :
                  item.target_shift_type === 'A' ? "text-orange-600 bg-orange-50" :
                  item.target_shift_type === 'N' ? "text-purple-600 bg-purple-50" : "text-slate-500 bg-slate-50"
                )}>
                  {getShiftLabel(item.target_shift_type)}
                </span>

                <span className="ml-auto text-[10px] text-slate-300 italic">
                  ({format(new Date(item.updated_at), 'd MMM HH:mm', { locale: th })})
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
