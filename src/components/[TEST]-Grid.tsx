import React from 'react';
import { format, getDaysInMonth, isWeekend, isToday, addDays } from 'date-fns';
import { th } from 'date-fns/locale';
import { User as UserIcon } from 'lucide-react';
import { Staff, Shift, ShiftType, User, ShiftSwapRequest } from '../types';
import { calculateShiftCount, calculateTotalPay } from '../utils/[TEST]-shiftUtils';
import clsx from 'clsx';

interface GridProps {
  currentMonth: Date;
  staffList: Staff[];
  shifts: Shift[];
  isAdmin: boolean;
  isPublished: boolean;
  user: User | null;
  onCellClick: (staffId: string, date: string, currentShifts: ShiftType[]) => void;
  onShiftSwapRequest: (staff: Staff, dateStr: string, shift: Shift | null, specificType?: ShiftType) => void;
  selectedShiftForMove?: { staffId: string; dateStr: string; shiftType: ShiftType | undefined } | null;
  shiftToSwap?: Shift | null;
  selectedShiftType?: ShiftType | null;
  targetShiftToSwap?: Shift | null;
  pendingSwaps?: ShiftSwapRequest[];
  approvedSwaps?: ShiftSwapRequest[];
  hoveredSwapIds: string[];
  setHoveredSwapIds: (ids: string[]) => void;
}

const shiftColors: Record<ShiftType, string> = {
  M: 'text-blue-600',
  A: 'text-orange-600',
  N: 'text-purple-600',
  O: 'text-slate-400',
};

const shiftLabels: Record<ShiftType, string> = {
  M: 'ช',
  A: 'บ',
  N: 'ด',
  O: 'หยุด',
};

const parseDateSafe = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

export function Grid({ 
  currentMonth, 
  staffList, 
  shifts, 
  isAdmin, 
  isPublished,
  user, 
  onCellClick, 
  onShiftSwapRequest, 
  selectedShiftForMove,
  shiftToSwap,
  selectedShiftType,
  targetShiftToSwap,
  pendingSwaps = [],
  approvedSwaps = [],
  hoveredSwapIds,
  setHoveredSwapIds
}: GridProps) {
  const daysInMonth = getDaysInMonth(currentMonth);
  const days = Array.from({ length: daysInMonth }, (_, i) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i + 1);
    return date;
  });

  const getShiftsForStaffAndDate = (staffId: string, dateStr: string): ShiftType[] => {
    const shift = shifts.find(s => s.staff_id === staffId && s.date === dateStr);
    if (!shift || !shift.shift_type) return [];
    
    const shiftTypes = shift.shift_type.split(',') as ShiftType[];
    const sortOrder: Record<string, number> = {
      'N': 1, // ดึก
      'M': 2, // เช้า
      'A': 3, // บ่าย
      'O': 4  // หยุด
    };
    
    return shiftTypes.sort((a, b) => (sortOrder[a] || 99) - (sortOrder[b] || 99));
  };

  return (
    <div className="overflow-x-auto bg-white shadow-xl shadow-slate-200/50 rounded-2xl border border-slate-200">
      <table className="w-full table-fixed divide-y divide-slate-200" id="roster-table">
        <thead className="bg-slate-50 sticky top-0 z-10">
          <tr>
            <th scope="col" className="px-3 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest sticky left-0 bg-slate-50 z-20 border-r border-slate-200 w-40">
              รายชื่อบุคลากร
            </th>
            {days.map((day) => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const isWknd = isWeekend(day);
              const isTdy = isToday(day);
              const isColHighlighted = !!user && ((selectedShiftForMove?.dateStr === dateStr) || (shiftToSwap?.date === dateStr));
              
              return (
                <th
                  key={day.toISOString()}
                  scope="col"
                  className={clsx(
                    "px-0.5 py-2 text-center text-[9px] font-bold uppercase tracking-tighter border-r border-slate-200 transition-colors",
                    isWknd ? "bg-rose-50/50 text-rose-600" : "text-slate-400",
                    isTdy && "bg-indigo-50/50 text-indigo-600",
                    isColHighlighted && "bg-yellow-100/50! text-yellow-700"
                  )}
                >
                  <div className="flex flex-col items-center gap-0">
                    <span className="opacity-60 text-[8px]">{format(day, 'E', { locale: th })}</span>
                    <span className={clsx(
                      "text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full transition-all",
                      isTdy ? "bg-indigo-600 text-white shadow-md shadow-indigo-200" : ""
                    )}>{format(day, 'd')}</span>
                  </div>
                </th>
              );
            })}
            <th scope="col" className="px-1 py-4 text-center text-[11px] font-bold text-indigo-600 uppercase tracking-tighter bg-indigo-50/30 border-l border-slate-200 w-16">
              รวมเวร
            </th>
            {user && (
              <th scope="col" className="px-1 py-4 text-center text-[11px] font-bold text-emerald-600 uppercase tracking-tighter bg-emerald-50/30 border-l border-slate-200 w-20">
                รวมเงิน
              </th>
            )}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-slate-100">
          {staffList.map((staff) => {
            const staffShifts = shifts.filter(s => s.staff_id === staff.id);
            let allShiftTypes: string[] = [];
            staffShifts.forEach(s => {
              if (s.shift_type) {
                allShiftTypes.push(...s.shift_type.split(','));
              }
            });
            
            const totalShifts = calculateShiftCount(allShiftTypes);
            const totalPay = calculateTotalPay(totalShifts);

            return (
              <tr key={staff.id} className="hover:bg-slate-50/50 transition-colors group">
                <td className={clsx(
                  "px-3 py-3 whitespace-nowrap text-xs font-semibold text-slate-700 sticky left-0 z-10 border-r border-slate-200 transition-colors overflow-hidden text-ellipsis",
                  (!!user && (selectedShiftForMove?.staffId === staff.id || shiftToSwap?.staff_id === staff.id)) ? "bg-yellow-100!" : "bg-white group-hover:bg-slate-50"
                )}>
                  <div className="flex items-center gap-2">
                    <div className={`h-7 w-7 shrink-0 rounded-lg flex items-center justify-center border transition-all ${
                      staff.name.startsWith('นาย') 
                        ? 'bg-blue-50 text-blue-600 border-blue-100 group-hover:bg-blue-100' 
                        : staff.name.startsWith('น.ส.') || staff.name.startsWith('นางสาว') || staff.name.startsWith('นาง')
                          ? 'bg-pink-50 text-pink-600 border-pink-100 group-hover:bg-pink-100'
                          : 'bg-slate-100 text-slate-500 border-slate-200 group-hover:bg-indigo-50 group-hover:text-indigo-600 group-hover:border-indigo-100'
                    }`}>
                      <UserIcon className="w-4 h-4" />
                    </div>
                    <span className="tracking-tight truncate">{staff.name}</span>
                  </div>
                </td>
                {days.map((day) => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const currentShifts = getShiftsForStaffAndDate(staff.id, dateStr);
                  const isTdy = isToday(day);
                  const isWknd = isWeekend(day);
                  const isSelectedForMove = !!user && selectedShiftForMove?.staffId === staff.id && selectedShiftForMove?.dateStr === dateStr;
                  const isSelectedRequester = !!user && shiftToSwap?.id === (shifts.find(s => s.staff_id === staff.id && s.date === dateStr)?.id || '');
                  const currentShift = shifts.find(s => s.staff_id === staff.id && s.date === dateStr);
                  const isSelectedTarget = !!user && targetShiftToSwap?.id === (currentShift?.id || `empty-${staff.id}-${dateStr}`);

                  // Crosshair highlighting logic
                  const isRowHighlighted = !!user && ((selectedShiftForMove?.staffId === staff.id) || (shiftToSwap?.staff_id === staff.id));
                  const isColHighlighted = !!user && ((selectedShiftForMove?.dateStr === dateStr) || (shiftToSwap?.date === dateStr));
                  const isCrosshair = isRowHighlighted || isColHighlighted;

                  // Check for pending swaps
                  const isPendingTarget = !!user && pendingSwaps.some(s => 
                    s.target_staff_id === staff.id && s.target_date === dateStr
                  );
                  const isPendingRequester = !!user && pendingSwaps.some(s => 
                    s.requester_staff_id === staff.id && s.requester_date === dateStr
                  );

                  // Check for approved swaps
                  const approvedSwap = approvedSwaps.find(s => 
                    (s.requester_staff_id === staff.id && s.requester_date === dateStr) ||
                    (s.target_staff_id === staff.id && s.target_date === dateStr)
                  );
                  
                  // Check if this cell is part of any currently hovered swap
                  const isHoveredSwap = approvedSwaps.some(s => {
                    if (!hoveredSwapIds.includes(s.id)) return false;
                    
                    const isRequester = s.requester_staff_id === staff.id;
                    const isTarget = s.target_staff_id === staff.id;
                    
                    if (!isRequester && !isTarget) return false;

                    // Base dates
                    if (s.requester_date === dateStr || s.target_date === dateStr) return true;

                    // Handle A/N pairing: if A is moved, N on next day is also moved for BOTH
                    if (s.requester_shift_type?.includes('A') || s.target_shift_type?.includes('A')) {
                      const reqNextDay = format(addDays(parseDateSafe(s.requester_date), 1), 'yyyy-MM-dd');
                      const tarNextDay = format(addDays(parseDateSafe(s.target_date), 1), 'yyyy-MM-dd');
                      if (reqNextDay === dateStr || tarNextDay === dateStr) return true;
                    }
                    
                    // If N is moved, A on previous day is also moved for BOTH
                    if (s.requester_shift_type?.includes('N') || s.target_shift_type?.includes('N')) {
                      const reqPrevDay = format(addDays(parseDateSafe(s.requester_date), -1), 'yyyy-MM-dd');
                      const tarPrevDay = format(addDays(parseDateSafe(s.target_date), -1), 'yyyy-MM-dd');
                      if (reqPrevDay === dateStr || tarPrevDay === dateStr) return true;
                    }
                    
                    return false;
                  });

                    return (
                      <td
                        key={dateStr}
                        onClick={() => {
                          const staffObj = staffList.find(s => s.id === staff.id);
                          const shiftObj = shifts.find(s => s.staff_id === staff.id && s.date === dateStr) || null;
                          
                          if (isAdmin && !isPublished) {
                            onCellClick(staff.id, dateStr, currentShifts);
                          } else if (user && staffObj) {
                            onShiftSwapRequest(staffObj, dateStr, shiftObj);
                          }
                        }}
                        onMouseEnter={() => {
                          const relatedSwaps = approvedSwaps.filter(s => {
                            const isRequester = s.requester_staff_id === staff.id;
                            const isTarget = s.target_staff_id === staff.id;
                            
                            if (!isRequester && !isTarget) return false;

                            // Direct match
                            if (s.requester_date === dateStr || s.target_date === dateStr) return true;

                            // Pairing match
                            if (s.requester_shift_type?.includes('A') || s.target_shift_type?.includes('A')) {
                              const reqNextDay = format(addDays(parseDateSafe(s.requester_date), 1), 'yyyy-MM-dd');
                              const tarNextDay = format(addDays(parseDateSafe(s.target_date), 1), 'yyyy-MM-dd');
                              if (reqNextDay === dateStr || tarNextDay === dateStr) return true;
                            }
                            if (s.requester_shift_type?.includes('N') || s.target_shift_type?.includes('N')) {
                              const reqPrevDay = format(addDays(parseDateSafe(s.requester_date), -1), 'yyyy-MM-dd');
                              const tarPrevDay = format(addDays(parseDateSafe(s.target_date), -1), 'yyyy-MM-dd');
                              if (reqPrevDay === dateStr || tarPrevDay === dateStr) return true;
                            }

                            return false;
                          });
                          
                          if (relatedSwaps.length > 0) {
                            setHoveredSwapIds(relatedSwaps.map(s => s.id));
                          }
                        }}
                        onMouseLeave={() => setHoveredSwapIds([])}
                        className={clsx(
                          "px-1 py-3 whitespace-nowrap text-center text-xs border-r border-slate-100 cursor-pointer transition-all relative",
                          isTdy && "bg-indigo-50/30",
                          isWknd && "bg-rose-50/10",
                          isCrosshair && "bg-yellow-50/40",
                          isHoveredSwap && "bg-yellow-100! z-10",
                          (isSelectedForMove || isSelectedRequester || isPendingRequester) && "bg-yellow-400! z-10",
                          (isSelectedTarget || isPendingTarget) && "bg-yellow-200! z-10",
                        )}
                      >
                        <div className="flex items-center justify-center gap-0.5 min-h-[24px]">
                          {currentShifts.length > 0 ? (
                            currentShifts.map((shiftType, idx) => {
                              const isThisTypeSelected = isSelectedRequester && selectedShiftType === shiftType;
                              return (
                                <React.Fragment key={`${dateStr}-${idx}`}>
                                  <span 
                                    className={clsx(
                                      "font-bold text-sm px-0.5 rounded transition-all", 
                                      shiftColors[shiftType],
                                      isThisTypeSelected ? "bg-yellow-400 text-yellow-900 shadow-sm scale-110" : ""
                                    )}
                                  >
                                    {shiftLabels[shiftType]}
                                  </span>
                                  {idx < currentShifts.length - 1 && <span className="text-slate-300 mx-0.5">|</span>}
                                </React.Fragment>
                              );
                            })
                          ) : (
                            <span className="text-slate-200 text-[10px]">•</span>
                          )}
                        </div>
                      </td>
                    );
                })}
                <td className="px-1 py-3 whitespace-nowrap text-center bg-indigo-50/10 border-l border-slate-100">
                  <span className="text-sm font-bold text-indigo-600">{totalShifts}</span>
                </td>
                {user && (
                  <td className="px-1 py-3 whitespace-nowrap text-center bg-emerald-50/10 border-l border-slate-100">
                    <span className="text-sm font-bold text-emerald-600">{totalPay.toLocaleString()}</span>
                  </td>
                )}
              </tr>
            );
          })}
          {staffList.length > 0 && (
            <tr className="bg-slate-50/80 font-bold">
              <td className="px-3 py-3 whitespace-nowrap text-xs text-slate-900 sticky left-0 bg-slate-50 z-10 border-r border-slate-200">
              </td>
              <td colSpan={days.length} className="px-4 py-3 text-right text-xs text-slate-900 border-r border-slate-100">
                รวมทั้งหมด
              </td>
              <td className="px-1 py-3 whitespace-nowrap text-center bg-indigo-100/30 border-l border-slate-200">
                <span className="text-sm font-black text-indigo-700">
                  {staffList.reduce((acc, staff) => {
                    const staffShifts = shifts.filter(s => s.staff_id === staff.id);
                    let types: string[] = [];
                    staffShifts.forEach(s => {
                      if (s.shift_type) {
                        types.push(...s.shift_type.split(','));
                      }
                    });
                    return acc + calculateShiftCount(types);
                  }, 0)}
                </span>
              </td>
              {user && (
                <td className="px-1 py-3 whitespace-nowrap text-center bg-emerald-100/30 border-l border-slate-200">
                <span className="text-sm font-black text-emerald-700">
                  ฿{staffList.reduce((acc, staff) => {
                    const staffShifts = shifts.filter(s => s.staff_id === staff.id);
                    let types: string[] = [];
                    staffShifts.forEach(s => {
                      if (s.shift_type) {
                        types.push(...s.shift_type.split(','));
                      }
                    });
                    const count = calculateShiftCount(types);
                    return acc + calculateTotalPay(count);
                  }, 0).toLocaleString()}
                </span>
                </td>
              )}
            </tr>
          )}
          {staffList.length === 0 && (
            <tr>
              <td colSpan={daysInMonth + (user ? 3 : 2)} className="px-6 py-12 text-center text-slate-400 italic">
                ไม่พบพนักงานในระบบ
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
