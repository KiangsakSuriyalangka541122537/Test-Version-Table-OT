import React, { useState, useEffect } from 'react';
import { X, Calendar, User as UserIcon, Clock, CheckCircle, XCircle, AlertCircle, RefreshCw, ArrowRightLeft } from 'lucide-react';
import { Staff, Shift, ShiftType, ShiftSwapRequest, ShiftSwapStatus } from '../types';
import { format, addDays } from 'date-fns';
import { th } from 'date-fns/locale';
import clsx from 'clsx';
import { generateSwapOperations, validateShiftOperations } from '../lib/[TEST]-shiftOperations';
import { SHIFT_ORDER } from '../utils/[TEST]-shiftUtils';

interface ShiftSwapRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendRequest: (request: Omit<ShiftSwapRequest, 'id' | 'status' | 'created_at' | 'updated_at'>) => void;
  currentStaff: Staff | null; // The logged-in staff
  initialRequesterShift: Shift | null; // Optional: The shift the user clicked (if it's theirs)
  initialShiftType: ShiftType | null; // Optional: The specific shift type clicked (e.g. 'M' from 'M|N')
  initialTargetShift: Shift | null; // Optional: The shift the user clicked (if it's someone else's)
  allStaff: Staff[];
  allShifts: Shift[];
  currentMonth: Date;
}

const shiftLabels: Record<ShiftType, string> = {
  M: 'เช้า', A: 'บ่าย', N: 'ดึก', O: 'หยุด'
};

const shiftColors: Record<ShiftType, string> = {
  M: 'bg-blue-100 text-blue-800 border-blue-200',
  A: 'bg-orange-100 text-orange-800 border-orange-200',
  N: 'bg-purple-100 text-purple-800 border-purple-200',
  O: 'bg-gray-100 text-gray-500 border-gray-200',
};

export function ShiftSwapRequestModal({
  isOpen,
  onClose,
  onSendRequest,
  currentStaff,
  initialRequesterShift,
  initialShiftType,
  initialTargetShift,
  allStaff,
  allShifts,
  currentMonth,
}: ShiftSwapRequestModalProps) {
  const [requesterShiftId, setRequesterShiftId] = useState<string>('');
  const [selectedShiftType, setSelectedShiftType] = useState<ShiftType | null>(null);
  const [targetStaffId, setTargetStaffId] = useState<string>('');
  const [targetShiftId, setTargetShiftId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setRequesterShiftId(initialRequesterShift?.id || '');
      setSelectedShiftType(initialShiftType || null);
      setTargetStaffId(initialTargetShift?.staff_id || '');
      setTargetShiftId(initialTargetShift?.id || '');
      setError(null);
      setLoading(false);
    }
  }, [isOpen, initialRequesterShift, initialShiftType, initialTargetShift]);

  if (!isOpen || !currentStaff) return null;

  // Shifts belonging to the logged-in user that they can give away
  const myShifts = allShifts.filter(s => s.staff_id === currentStaff.id);

  const handleSendRequest = async () => {
    setError(null);
    if (!requesterShiftId || !targetStaffId || !targetShiftId) {
      setError('กรุณาเลือกกะของคุณและกะที่ต้องการย้ายไปรวมด้วย');
      return;
    }

    const requesterShift = allShifts.find(s => s.id === requesterShiftId);
    let targetShift = allShifts.find(s => s.id === targetShiftId);

    // Handle virtual shift (empty)
    if (!targetShift && targetShiftId.startsWith('empty-')) {
      const dateStr = targetShiftId.slice(-10);
      const staffId = targetShiftId.slice(6, -11);
      targetShift = {
        id: targetShiftId,
        staff_id: staffId,
        date: dateStr,
        shift_type: '' // Empty string for empty slot
      };
    }

    if (!requesterShift) {
      setError('ไม่พบข้อมูลกะของคุณ');
      return;
    }

    // Validation logic
    if (targetShift) {
      const targetTypes = targetShift.shift_type ? targetShift.shift_type.split(',').map(t => t.trim()).filter(Boolean) : [];
      const sourceTypes = requesterShift.shift_type ? requesterShift.shift_type.split(',').map(t => t.trim()).filter(Boolean) : [];

      // Rule: No more than 2 shifts
      if (targetTypes.length + sourceTypes.length > 2) {
        setError('ไม่สามารถมีมากกว่า 2 เวรในช่องเดียวกันได้');
        return;
      }

      // Rule: Cannot move same type (e.g., M to M, A to A, N to N)
      const hasOverlap = sourceTypes.some(s => targetTypes.includes(s));
      if (hasOverlap) {
        setError('ไม่สามารถย้ายเวรประเภทเดียวกันไปรวมกันได้');
        return;
      }
    }

    const targetDate = targetShift?.date || (targetShiftId.startsWith('empty-') ? targetShiftId.slice(-10) : '');

    if (!targetDate) {
      setError('ไม่สามารถระบุวันที่ของกะเป้าหมายได้ กรุณาลองใหม่อีกครั้ง');
      return;
    }

    // Determine which shift type to move
    let shiftTypeToMove = selectedShiftType || requesterShift.shift_type;

    // Validate using virtual state logic
    try {
      const operations = generateSwapOperations(
        currentStaff.id,
        requesterShift.date,
        shiftTypeToMove,
        targetStaffId,
        targetDate,
        targetShift?.shift_type || 'O'
      );
      validateShiftOperations(allShifts, operations);
    } catch (err: any) {
      setError(err.message);
      return;
    }
    
    setLoading(true);
    try {
      await onSendRequest({
        requester_staff_id: currentStaff.id,
        requester_shift_id: requesterShift.id,
        requester_date: requesterShift.date,
        requester_shift_type: shiftTypeToMove,
        target_staff_id: targetStaffId,
        target_shift_id: targetShiftId.startsWith('empty-') ? null : targetShiftId,
        target_date: targetDate,
        target_shift_type: targetShift?.shift_type || 'O', // Default to 'O' for empty slots
      });
      onClose();
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการส่งคำขอย้ายเวร');
      console.error('Error sending swap request:', err);
    } finally {
      setLoading(false);
    }
  };

  const getShiftLabel = (type: string) => {
    if (!type || type === 'O') return shiftLabels['O'];
    return type.split(',').map(t => shiftLabels[t as ShiftType] || t).join(' + ');
  };

  const getSummaryShiftLabel = (type: string) => {
    if (!type || type === 'O') return 'หยุด';
    const types = type.split(',').map(t => t.trim());
    if (types.includes('A') || types.includes('N')) {
      return 'บ่าย + ดึก';
    }
    return types.map(t => shiftLabels[t as ShiftType] || t).join(' + ');
  };

  const selectedRequesterShift = allShifts.find(s => s.id === requesterShiftId);

  let selectedTargetShift = allShifts.find(s => s.id === targetShiftId);
  
  // Handle virtual shift for display
  if (!selectedTargetShift && targetShiftId.startsWith('empty-')) {
    const dateStr = targetShiftId.slice(-10);
    const staffId = targetShiftId.slice(6, -11);
    selectedTargetShift = {
      id: targetShiftId,
      staff_id: staffId,
      date: dateStr,
      shift_type: 'O'
    };
  }

  const selectedTargetStaff = allStaff.find(s => s.id === targetStaffId);

  // Generate all days in the current month for the dropdown
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const days = [];
    const lastDay = new Date(year, month + 1, 0).getDate();
    for (let i = 1; i <= lastDay; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const monthDays = getDaysInMonth(currentMonth);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex justify-center items-center p-4">
      <div className="relative bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg mx-auto overflow-hidden animate-in fade-in zoom-in duration-300">
        <button 
          onClick={onClose} 
          className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-full transition-all z-10"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="p-8 pt-10">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">ขอย้ายเวร</h2>
            <p className="text-slate-500 mt-1 text-sm font-medium">ยืนยันการย้ายเวรของคุณไปรวมกับคนอื่น</p>
          </div>

          {error && (
            <div className="bg-rose-50 text-rose-600 p-4 rounded-2xl text-sm font-bold flex items-center gap-3 mb-6 border border-rose-100 animate-in slide-in-from-top-2">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <div className="space-y-6">
            {/* Summary Section */}
            {selectedRequesterShift && selectedTargetShift && selectedTargetStaff && (
              <div className="bg-indigo-50/50 rounded-[2rem] p-6 border border-indigo-100 shadow-sm space-y-6">
                <div className="grid grid-cols-[1fr,auto,1fr] items-center gap-4">
                  {/* Requester Side */}
                  <div className="text-center space-y-2">
                    <div className="relative mx-auto">
                      <div className={clsx(
                        "w-16 h-16 rounded-2xl flex items-center justify-center mx-auto shadow-md border-2 transition-all",
                        selectedShiftType === 'M' || (!selectedShiftType && selectedRequesterShift.shift_type.includes('M')) ? "bg-blue-500 border-blue-200 text-white" :
                        selectedShiftType === 'A' || (!selectedShiftType && selectedRequesterShift.shift_type.includes('A')) ? "bg-orange-500 border-orange-200 text-white" :
                        selectedShiftType === 'N' || (!selectedShiftType && selectedRequesterShift.shift_type.includes('N')) ? "bg-purple-500 border-purple-200 text-white" : "bg-slate-400 border-slate-200 text-white"
                      )}>
                        <span className={clsx(
                          "font-black text-center leading-tight",
                          (selectedShiftType || selectedRequesterShift.shift_type).includes('A') || (selectedShiftType || selectedRequesterShift.shift_type).includes('N') ? "text-[10px]" : "text-sm"
                        )}>
                          {getSummaryShiftLabel(selectedShiftType || selectedRequesterShift.shift_type)}
                        </span>
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">เวรของคุณ</p>
                      <p className="font-bold text-slate-900 text-sm">
                        {format(new Date(selectedRequesterShift.date), 'd MMM', { locale: th })}
                      </p>
                    </div>
                  </div>

                  {/* Arrow */}
                  <div className="flex flex-col items-center justify-center">
                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-md border border-indigo-100 text-indigo-600">
                      <ArrowRightLeft className="w-5 h-5" />
                    </div>
                  </div>

                  {/* Target Side */}
                  <div className="text-center space-y-2">
                    <div className="relative mx-auto">
                      <div className={clsx(
                        "w-16 h-16 rounded-2xl flex items-center justify-center mx-auto shadow-md border-2 transition-all",
                        selectedTargetShift.shift_type.includes('M') ? "bg-blue-500 border-blue-200 text-white" :
                        selectedTargetShift.shift_type.includes('A') ? "bg-orange-500 border-orange-200 text-white" :
                        selectedTargetShift.shift_type.includes('N') ? "bg-purple-500 border-purple-200 text-white" : "bg-slate-100 border-slate-200 text-slate-400"
                      )}>
                        <span className={clsx(
                          "font-black text-center leading-tight",
                          selectedTargetShift.shift_type.includes('A') || selectedTargetShift.shift_type.includes('N') ? "text-[10px]" : "text-sm"
                        )}>
                          {getSummaryShiftLabel(selectedTargetShift.shift_type)}
                        </span>
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">ย้ายไปให้ {selectedTargetStaff.name.split(' ')[0]}</p>
                      <p className="font-bold text-slate-900 text-sm">
                        {format(new Date(selectedTargetShift.date), 'd MMM', { locale: th })}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 text-[11px] text-slate-600 border border-indigo-100/50 shadow-inner">
                  <div className="flex items-start gap-2 mb-2">
                    <div className="p-1 bg-amber-100 rounded-lg shrink-0">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 mb-0.5">สรุปการดำเนินการ:</p>
                      <p>เวร <span className="font-bold text-indigo-600">{getSummaryShiftLabel(selectedShiftType || selectedRequesterShift.shift_type)}</span> ของคุณจะถูกนำไปรวมกับตารางของ <span className="font-bold text-slate-800">{selectedTargetStaff.name}</span></p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Selectors Section */}
            {(!initialRequesterShift || !initialTargetShift) && (
              <div className="space-y-5 pt-2">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center" aria-hidden="true">
                    <div className="w-full border-t border-slate-100"></div>
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-white px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">หรือเลือกกะที่ต้องการเปลี่ยน</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 gap-5">
                  {/* Requester Shift Selection */}
                  <div className="space-y-2">
                    <label htmlFor="requesterShift" className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">
                      <UserIcon className="w-3 h-3" /> กะของคุณ
                    </label>
                    <div className="relative">
                      <select
                        id="requesterShift"
                        value={requesterShiftId}
                        onChange={(e) => setRequesterShiftId(e.target.value)}
                        className="block w-full px-5 py-4 text-sm border-slate-200 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 rounded-2xl bg-slate-50/50 transition-all font-bold appearance-none text-slate-900"
                      >
                        <option value="">-- เลือกกะของคุณ --</option>
                        {myShifts.map(shift => (
                          <option key={shift.id} value={shift.id}>
                            {getShiftLabel(shift.shift_type)} - {format(new Date(shift.date), 'd MMM yyyy', { locale: th })}
                          </option>
                        ))}
                      </select>
                      <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-400">
                        <Clock className="w-4 h-4" />
                      </div>
                    </div>
                  </div>

                  {/* Target Staff Selection */}
                  <div className="space-y-2">
                    <label htmlFor="targetStaff" className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">
                      <UserIcon className="w-3 h-3" /> พนักงานที่ต้องการย้ายไปให้
                    </label>
                    <div className="relative">
                      <select
                        id="targetStaff"
                        value={targetStaffId}
                        onChange={(e) => {
                          setTargetStaffId(e.target.value);
                          setTargetShiftId(''); 
                        }}
                        className="block w-full px-5 py-4 text-sm border-slate-200 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 rounded-2xl bg-slate-50/50 transition-all font-bold appearance-none text-slate-900"
                      >
                        <option value="">-- เลือกพนักงาน --</option>
                        {allStaff.filter(s => s.id !== currentStaff.id).map(staff => (
                          <option key={staff.id} value={staff.id}>{staff.name}</option>
                        ))}
                      </select>
                      <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-400">
                        <UserIcon className="w-4 h-4" />
                      </div>
                    </div>
                  </div>

                  {/* Target Shift Selection */}
                  {targetStaffId && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                      <label htmlFor="targetShift" className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">
                        <Calendar className="w-3 h-3" /> เลือกวันที่/เวรของเขา
                      </label>
                      <div className="relative">
                        <select
                          id="targetShift"
                          value={targetShiftId}
                          onChange={(e) => setTargetShiftId(e.target.value)}
                          className="block w-full px-5 py-4 text-sm border-slate-200 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 rounded-2xl bg-slate-50/50 transition-all font-bold appearance-none text-slate-900"
                        >
                          <option value="">-- เลือกวันที่เป้าหมาย --</option>
                          {monthDays.map(day => {
                            const dateStr = format(day, 'yyyy-MM-dd');
                            const existingShift = allShifts.find(s => s.staff_id === targetStaffId && s.date === dateStr);
                            const value = existingShift ? existingShift.id : `empty-${targetStaffId}-${dateStr}`;
                            const label = existingShift 
                              ? `${getShiftLabel(existingShift.shift_type)} - ${format(day, 'd MMM yyyy', { locale: th })}`
                              : `หยุด - ${format(day, 'd MMM yyyy', { locale: th })}`;
                            
                            return (
                              <option key={value} value={value}>
                                {label}
                              </option>
                            );
                          })}
                        </select>
                        <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-400">
                          <Calendar className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-8 bg-slate-50/80 border-t border-slate-100 flex gap-4">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-4 border border-slate-200 rounded-2xl text-sm font-black text-slate-600 bg-white hover:bg-slate-100 transition-all active:scale-95"
          >
            ยกเลิก
          </button>
          <button
            onClick={handleSendRequest}
            disabled={loading || !requesterShiftId || !targetStaffId || !targetShiftId}
            className="flex-[2] px-6 py-4 bg-indigo-600 text-white rounded-2xl text-sm font-black hover:bg-indigo-700 shadow-xl shadow-indigo-200 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>กำลังส่งคำขอ...</span>
              </>
            ) : (
              <span>ส่งคำขอย้ายเวร</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
