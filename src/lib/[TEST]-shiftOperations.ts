import { supabase } from './supabase';
import { format, addDays } from 'date-fns';
import { ShiftType } from '../types';

export interface ShiftOperation {
  staffId: string;
  date: string;
  type: ShiftType;
  action: 'add' | 'remove';
}

import { SHIFT_ORDER } from '../utils/[TEST]-shiftUtils';

/**
 * Safely parses a date string in YYYY-MM-DD format to a Date object at 00:00:00 local time.
 */
const parseDateSafe = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

export const applyShiftOperations = async (operations: ShiftOperation[]) => {
  if (operations.length === 0) return;

  const affectedDates = [...new Set(operations.map(op => op.date))];
  
  // 1. Fetch ALL existing shifts for the affected dates
  const { data: allShifts, error: fetchError } = await supabase
    .from('test_shifts')
    .select('*')
    .in('date', affectedDates);
    
  if (fetchError) {
    console.error('Error fetching shifts:', fetchError);
    throw new Error('Failed to fetch shifts for validation');
  }

  // 2. Build virtual state: date -> staffId -> Set of shift types
  const virtualState: Record<string, Record<string, Set<string>>> = {};
  
  if (allShifts) {
    for (const s of allShifts) {
      if (!virtualState[s.date]) virtualState[s.date] = {};
      if (!virtualState[s.date][s.staff_id]) virtualState[s.date][s.staff_id] = new Set();
      
      if (s.shift_type) {
        const types = s.shift_type.split(',').map(t => t.trim()).filter(Boolean);
        for (const t of types) {
          virtualState[s.date][s.staff_id].add(t);
        }
      }
    }
  }

  // Keep track of which cells were actually modified
  const modifiedCells = new Set<string>(); // "staffId_date"

  // 3. Apply operations to virtual state
  for (const op of operations) {
    if (!virtualState[op.date]) virtualState[op.date] = {};
    if (!virtualState[op.date][op.staffId]) virtualState[op.date][op.staffId] = new Set();
    
    const cellKey = `${op.staffId}_${op.date}`;
    modifiedCells.add(cellKey);
    
    if (op.action === 'add') {
      virtualState[op.date][op.staffId].add(op.type);
    } else {
      virtualState[op.date][op.staffId].delete(op.type);
    }
  }

  // 4. Validate virtual state
  for (const date in virtualState) {
    const dailyCounts: Record<string, number> = { 'M': 0, 'A': 0, 'N': 0 };
    
    for (const staffId in virtualState[date]) {
      const types = Array.from(virtualState[date][staffId]);
      
      // Rule 1: Max 2 shifts per person per day
      if (types.length > 2) {
        throw new Error(`ไม่สามารถมีมากกว่า 2 เวรใน 1 วันได้ (วันที่ ${date})`);
      }
      
      // Rule 2: Cannot have A and N in the same day
      if (types.includes('A') && types.includes('N')) {
        throw new Error(`ไม่สามารถมีเวรบ่าย (บ) และเวรดึก (ด) ในช่องเดียวกันได้ (วันที่ ${date})`);
      }
      
      // Count for daily uniqueness
      for (const t of types) {
        if (t === 'M' || t === 'A' || t === 'N') {
          dailyCounts[t]++;
        }
      }
    }
    
    // Rule 3: Daily uniqueness (M, A, N cannot duplicate across staff)
    if (dailyCounts['M'] > 1) throw new Error(`เวรเช้า (ช) มีผู้รับผิดชอบแล้ว ห้ามจัดซ้ำในวันเดียวกัน (วันที่ ${date})`);
    if (dailyCounts['A'] > 1) throw new Error(`เวรบ่าย (บ) มีผู้รับผิดชอบแล้ว ห้ามจัดซ้ำในวันเดียวกัน (วันที่ ${date})`);
    if (dailyCounts['N'] > 1) throw new Error(`เวรดึก (ด) มีผู้รับผิดชอบแล้ว ห้ามจัดซ้ำในวันเดียวกัน (วันที่ ${date})`);
  }

  // 5. Prepare cell updates for modified cells
  const cellUpdates: { staffId: string; date: string; existingIds: string[]; newTypes: string[] }[] = [];
  
  for (const cellKey of modifiedCells) {
    const [staffId, date] = cellKey.split('_');
    const newTypes = Array.from(virtualState[date][staffId]);
    newTypes.sort((a, b) => (SHIFT_ORDER[a] || 99) - (SHIFT_ORDER[b] || 99));
    
    // Find existing IDs for this cell to delete them
    const existingIds = allShifts
      ? allShifts.filter(s => s.staff_id === staffId && s.date === date).map(s => s.id)
      : [];
      
    cellUpdates.push({ staffId, date, existingIds, newTypes });
  }

  // 6. Apply changes to database
  for (const update of cellUpdates) {
    const { staffId, date, existingIds, newTypes } = update;
    const newShiftTypeStr = newTypes.join(',');

    // Clean up: Delete all existing rows for this staff/date
    if (existingIds.length > 0) {
      const { error: deleteError } = await supabase.from('test_shifts').delete().in('id', existingIds);
      if (deleteError) {
        console.error('Error deleting shifts:', deleteError);
        throw new Error(`Failed to delete old shifts for ${staffId} on ${date}`);
      }
    }

    // Insert the single merged row (if not empty)
    if (newTypes.length > 0) {
      const { error: insertError } = await supabase.from('test_shifts').insert({
        staff_id: staffId,
        date: date,
        shift_type: newShiftTypeStr
      });
      if (insertError) {
        console.error('Error inserting shift:', insertError);
        throw new Error(`Failed to insert new shift for ${staffId} on ${date}`);
      }
    }
  }
};

export const generateMoveOperations = (
  sourceStaffId: string,
  sourceDateStr: string,
  targetStaffId: string,
  targetDateStr: string,
  typeToMove: ShiftType
): ShiftOperation[] => {
  const operations: ShiftOperation[] = [];

  // Remove from source
  operations.push({ staffId: sourceStaffId, date: sourceDateStr, type: typeToMove, action: 'remove' });
  
  // Add to target
  operations.push({ staffId: targetStaffId, date: targetDateStr, type: typeToMove, action: 'add' });

  // Handle A/N pairing
  if (typeToMove === 'A') {
    const sourceNextDay = format(addDays(parseDateSafe(sourceDateStr), 1), 'yyyy-MM-dd');
    const targetNextDay = format(addDays(parseDateSafe(targetDateStr), 1), 'yyyy-MM-dd');
    
    operations.push({ staffId: sourceStaffId, date: sourceNextDay, type: 'N', action: 'remove' });
    operations.push({ staffId: targetStaffId, date: targetNextDay, type: 'N', action: 'add' });
  } else if (typeToMove === 'N') {
    const sourcePrevDay = format(addDays(parseDateSafe(sourceDateStr), -1), 'yyyy-MM-dd');
    const targetPrevDay = format(addDays(parseDateSafe(targetDateStr), -1), 'yyyy-MM-dd');
    
    operations.push({ staffId: sourceStaffId, date: sourcePrevDay, type: 'A', action: 'remove' });
    operations.push({ staffId: targetStaffId, date: targetPrevDay, type: 'A', action: 'add' });
  }

  return operations;
};
