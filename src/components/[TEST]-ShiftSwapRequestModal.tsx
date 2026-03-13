import React, { useState, useEffect } from 'react';
import { X, Calendar, User as UserIcon, Clock, CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { Staff, Shift, ShiftType, ShiftSwapRequest, ShiftSwapStatus } from '../types';
import { format, addDays } from 'date-fns';
import clsx from 'clsx';

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

      // Rule: Cannot have both A (บ่าย) and N (ดึก) in the same cell
      const combinedTypes = [...targetTypes, ...sourceTypes];
      const hasA = combinedTypes.includes('A');
      const hasN = combinedTypes.includes('N');
      if (hasA && hasN) {
        setError('ไม่สามารถมีเวรบ่าย (บ) และเวรดึก (ด) ในช่องเดียวกันได้');
        return;
      }

      // Rule: Daily uniqueness (M, A, N cannot duplicate across staff)
      const targetDateStr = targetShift?.date || (targetShiftId.startsWith('empty-') ? targetShiftId.slice(-10) : '');
      if (targetDateStr) {
        for (const type of sourceTypes) {
          if (['M', 'A', 'N'].includes(type)) {
            const isAssignedToOther = allShifts.some(s => 
              s.date === targetDateStr && 
              s.staff_id !== targetStaffId && 
              s.staff_id !== requesterShift.staff_id && // Ignore the requester
              s.shift_type && 
              s.shift_type.split(',').map(t => t.trim()).includes(type)
            );
            if (isAssignedToOther) {
              const typeLabel = type === 'M' ? 'เช้า (ช)' : type === 'A' ? 'บ่าย (บ)' : 'ดึก (ด)';
              setError(`ไม่สามารถย้ายได้เนื่องจากเวร${typeLabel} มีผู้รับผิดชอบแล้ว ห้ามจัดซ้ำในวันเดียวกัน`);
              return;
            }
          }
        }
      }
    }

    const targetDate = targetShift?.date || (targetShiftId.startsWith('empty-') ? targetShiftId.slice(-10) : '');

    if (!targetDate) {
      setError('ไม่สามารถระบุวันที่ของกะเป้าหมายได้ กรุณาลองใหม่อีกครั้ง');
      return;
    }

    // Check for A/N conflict on next day if moving A
    if (requesterShift.shift_type.includes('A')) {
      const nextDay = format(addDays(new Date(targetDate), 1), 'yyyy-MM-dd');
      const targetNextShift = allShifts.find(s => s.staff_id === targetStaffId && s.date === nextDay);
      const targetNextTypes = targetNextShift && targetNextShift.shift_type ? targetNextShift.shift_type.split(',').map(t => t.trim()).filter(Boolean) : [];
      if (targetNextTypes.includes('A')) {
        setError('ไม่สามารถย้ายได้เนื่องจากจะทำให้เกิดเวรบ่าย (บ) และเวรดึก (ด) ในวันถัดไปของพนักงานปลายทาง');
        return;
      }
      if (targetNextTypes.length >= 2 && !targetNextTypes.includes('N')) {
        setError('ไม่สามารถย้ายได้เนื่องจากจะทำให้วันถัดไปของพนักงานปลายทางมีเวรเกิน 2 เวร');
        return;
      }
    }
    
    // Check for A/N conflict on previous day if moving N
    if (requesterShift.shift_type.includes('N')) {
      const prevDay = format(addDays(new Date(targetDate), -1), 'yyyy-MM-dd');
      const targetPrevShift = allShifts.find(s => s.staff_id === targetStaffId && s.date === prevDay);
      const targetPrevTypes = targetPrevShift && targetPrevShift.shift_type ? targetPrevShift.shift_type.split(',').map(t => t.trim()).filter(Boolean) : [];
      if (targetPrevTypes.includes('N')) {
        setError('ไม่สามารถย้ายได้เนื่องจากจะทำให้เกิดเวรบ่าย (บ) และเวรดึก (ด) ในวันก่อนหน้าของพนักงานปลายทาง');
        return;
      }
      if (targetPrevTypes.length >= 2 && !targetPrevTypes.includes('A')) {
        setError('ไม่สามารถย้ายได้เนื่องจากจะทำให้วันก่อนหน้าของพนักงานปลายทางมีเวรเกิน 2 เวร');
        return;
      }
    }

    // Determine which shift type to move
    let shiftTypeToMove = selectedShiftType || requesterShift.shift_type;
    const types = requesterShift.shift_type.split(',').map(t => t.trim()).filter(Boolean);
    
    if (!selectedShiftType && types.length > 1) {
      const hasM = types.includes('M');
      const hasA = types.includes('A');
      const hasN = types.includes('N');
      
      if (hasM && (hasA || hasN)) {
        // User specifically requested: if M is paired with A or N, ONLY move M
        shiftTypeToMove = 'M';
      } else if (targetShiftId.startsWith('empty-')) {
        // If moving to an empty slot and it's a double shift (e.g., A|N - though A|N is forbidden on same day)
        // we keep them together if they are A or N to maintain pairing logic
        if (hasA || hasN) {
          shiftTypeToMove = requesterShift.shift_type;
        } else {
          shiftTypeToMove = types[0];
        }
      }
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
    if (!type) return shiftLabels['O'];
    return type.split(',').map(t => shiftLabels[t as ShiftType] || t).join(' + ');
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

  // Helper for UI display
  const getShiftTypeToDisplay = () => {
    if (!selectedRequesterShift || !selectedTargetShift) return '';
    if (selectedShiftType) return selectedShiftType;
    
    const types = selectedRequesterShift.shift_type.split(',').map(t => t.trim()).filter(Boolean);
    
    if (types.length > 1) {
      const hasM = types.includes('M');
      const hasA = types.includes('A');
      const hasN = types.includes('N');
      
      if (hasM && (hasA || hasN)) {
        return 'M';
      }
      
      if (selectedTargetShift.id.startsWith('empty-')) {
        if (!hasA && !hasN) {
          return types[0];
        }
      }
    }
    return selectedRequesterShift.shift_type;
  };

  const isPartialDisplay = getShiftTypeToDisplay() !== selectedRequesterShift?.shift_type;

  // Helper to find paired shift
  const getPairedShift = (shift: Shift | undefined, shifts: Shift[]) => {
    if (!shift) return null;
    if (shift.shift_type?.includes('A')) {
      const nextDay = new Date(shift.date);
      nextDay.setDate(nextDay.getDate() + 1);
      const nextDayStr = format(nextDay, 'yyyy-MM-dd');
      return shifts.find(s => s.staff_id === shift.staff_id && s.date === nextDayStr && s.shift_type?.includes('N'));
    }
    if (shift.shift_type?.includes('N')) {
      const prevDay = new Date(shift.date);
      prevDay.setDate(prevDay.getDate() - 1);
      const prevDayStr = format(prevDay, 'yyyy-MM-dd');
      return shifts.find(s => s.staff_id === shift.staff_id && s.date === prevDayStr && s.shift_type?.includes('A'));
    }
    return null;
  };

  const requesterPairedShift = getPairedShift(selectedRequesterShift, allShifts);
  const targetPairedShift = getPairedShift(selectedTargetShift, allShifts);

  const selectedTargetStaff = allStaff.find(s => s.id === targetStaffId);

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex justify-center items-center">
      <div className="relative bg-white rounded-xl shadow-xl p-8 w-full max-w-md mx-4">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <X className="w-6 h-6" />
        </button>

        <div className="text-center mb-6">
          <div className="mx-auto w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="w-6 h-6 text-indigo-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">ขอย้ายเวร</h2>
          <p className="text-gray-500 mt-2">ยืนยันการย้ายเวรของคุณไปรวมกับคนอื่น</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center mb-4">
            {error}
          </div>
        )}

        <div className="space-y-4 mb-6">
          {/* Summary (Always show if both are selected) */}
          {selectedRequesterShift && selectedTargetShift && selectedTargetStaff && (
            <div className="bg-emerald-50 rounded-xl p-5 border border-emerald-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600">
                <span>ยืนยันการย้ายเวร</span>
              </div>
              <div className="flex items-center justify-between gap-6">
                <div className="flex-1 text-center">
                  <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center mx-auto mb-2 shadow-sm border border-emerald-100">
                    <span className="text-emerald-600 font-bold text-xs">
                      {getShiftTypeToDisplay()}
                    </span>
                  </div>
                  <p className="text-[10px] text-emerald-700/60 uppercase font-bold mb-0.5">เวรของคุณ</p>
                  <p className="font-bold text-emerald-900 text-sm">{format(new Date(selectedRequesterShift.date), 'dd/MM')}</p>
                  {isPartialDisplay ? (
                    <p className="text-[10px] text-amber-600 mt-1 font-medium">
                      (ย้ายเฉพาะ {getShiftTypeToDisplay()})
                    </p>
                  ) : requesterPairedShift && (
                    <p className="text-[10px] text-emerald-600 mt-1">
                      + {requesterPairedShift.shift_type} ({format(new Date(requesterPairedShift.date), 'dd/MM')})
                    </p>
                  )}
                </div>
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center shadow-lg shadow-emerald-200">
                    <RefreshCw className="w-4 h-4 text-white animate-spin-slow" />
                  </div>
                </div>
                <div className="flex-1 text-center">
                  <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center mx-auto mb-2 shadow-sm border border-emerald-100">
                    <span className="text-emerald-600 font-bold text-xs">
                      {selectedTargetShift.id.startsWith('empty-') ? '-' : selectedTargetShift.shift_type}
                    </span>
                  </div>
                  <p className="text-[10px] text-emerald-700/60 uppercase font-bold mb-0.5">ย้ายไปให้ {selectedTargetStaff.name ? selectedTargetStaff.name.split(' ')[0] : 'เพื่อน'}</p>
                  <p className="font-bold text-emerald-900 text-sm">
                    {selectedTargetShift.id.startsWith('empty-') ? 'ช่องว่าง' : format(new Date(selectedTargetShift.date), 'dd/MM')}
                  </p>
                  {targetPairedShift && (
                    <p className="text-[10px] text-emerald-600 mt-1">
                      + {targetPairedShift.shift_type} ({format(new Date(targetPairedShift.date), 'dd/MM')})
                    </p>
                  )}
                </div>
              </div>
              <div className="bg-white/50 rounded-lg p-3 text-[10px] text-emerald-800 border border-emerald-100/50">
                <p className="font-bold mb-1">💡 ข้อมูลการย้าย:</p>
                <p>เวรของคุณจะถูกนำไปรวมกับเวรของ {selectedTargetStaff.name} ในวันดังกล่าว หาก {selectedTargetStaff.name} มีเวรอยู่แล้ว เวรของคุณจะถูกเพิ่มเข้าไป (เช่น {selectedTargetShift.shift_type} → {selectedRequesterShift.shift_type}/{selectedTargetShift.shift_type})</p>
                <p className="mt-1 text-emerald-600 font-medium">✨ สามารถย้ายเวรได้ทุกวัน รวมถึงวันหยุดราชการและวันหยุดนักขัตฤกษ์</p>
              </div>
            </div>
          )}

          {/* Only show selectors if not fully pre-selected */}
          {(!initialRequesterShift || !initialTargetShift) && (
            <div className="space-y-4 pt-2">
              <div className="h-px bg-slate-100 w-full"></div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">หรือเลือกกะอื่น</p>
              
              {/* Requester Shift Selection */}
              <div>
                <label htmlFor="requesterShift" className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">กะของคุณ</label>
                <select
                  id="requesterShift"
                  value={requesterShiftId}
                  onChange={(e) => setRequesterShiftId(e.target.value)}
                  className="block w-full pl-3 pr-10 py-2.5 text-sm border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 rounded-xl bg-slate-50/50 transition-all font-medium"
                >
                  <option value="">-- เลือกกะของคุณ --</option>
                  {myShifts.map(shift => (
                    <option key={shift.id} value={shift.id}>
                      {getShiftLabel(shift.shift_type)} ({shift.shift_type}) - {format(new Date(shift.date), 'dd/MM/yyyy')}
                    </option>
                  ))}
                </select>
              </div>

              {/* Target Staff Selection */}
              <div>
                <label htmlFor="targetStaff" className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">พนักงานที่ต้องการย้ายไปให้</label>
                <select
                  id="targetStaff"
                  value={targetStaffId}
                  onChange={(e) => {
                    setTargetStaffId(e.target.value);
                    setTargetShiftId(''); 
                  }}
                  className="block w-full pl-3 pr-10 py-2.5 text-sm border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 rounded-xl bg-slate-50/50 transition-all font-medium"
                >
                  <option value="">-- เลือกพนักงาน --</option>
                  {allStaff.filter(s => s.id !== currentStaff.id).map(staff => (
                    <option key={staff.id} value={staff.id}>{staff.name}</option>
                  ))}
                </select>
              </div>

              {/* Target Shift Selection */}
              {targetStaffId && (
                <div>
                  <label htmlFor="targetShift" className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">เลือกวันที่/เวรของเขา</label>
                  <select
                    id="targetShift"
                    value={targetShiftId}
                    onChange={(e) => setTargetShiftId(e.target.value)}
                    className="block w-full pl-3 pr-10 py-2.5 text-sm border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 rounded-xl bg-slate-50/50 transition-all font-medium"
                  >
                    <option value="">-- เลือกกะเป้าหมาย --</option>
                    {allShifts
                      .filter(shift => shift.staff_id === targetStaffId)
                      .map(shift => (
                        <option key={shift.id} value={shift.id}>
                          {getShiftLabel(shift.shift_type)} ({shift.shift_type}) - {format(new Date(shift.date), 'dd/MM/yyyy')}
                        </option>
                      ))}
                  </select>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            ยกเลิก
          </button>
          <button
            onClick={handleSendRequest}
            disabled={loading || !requesterShiftId || !targetStaffId || !targetShiftId}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'กำลังส่งคำขอ...' : 'ส่งคำขอย้ายเวร'}
          </button>
        </div>
      </div>
    </div>
  );
}
