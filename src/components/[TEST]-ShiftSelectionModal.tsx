import React from 'react';
import { X } from 'lucide-react';
import { Staff, Shift, ShiftType } from '../types';
import clsx from 'clsx';

interface ShiftSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  staff: Staff | null;
  dateStr: string;
  shift: Shift | null;
  shiftTypes: ShiftType[];
  onSelect: (selectedType: ShiftType | 'ALL') => void;
}

const shiftLabels: Record<ShiftType, string> = {
  M: 'เช้า (ช)',
  A: 'บ่ายและดึก (บ+ด)',
  N: 'บ่ายและดึก (บ+ด)',
  O: 'หยุด (O)',
};

const shiftColors: Record<ShiftType, string> = {
  M: 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200',
  A: 'bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-200',
  N: 'bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200',
  O: 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200',
};

export function ShiftSelectionModal({ isOpen, onClose, staff, dateStr, shift, shiftTypes, onSelect }: ShiftSelectionModalProps) {
  if (!isOpen || !staff || !shift) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h2 className="text-lg font-bold text-slate-800">เลือกเวรที่ต้องการย้าย</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6">
          <p className="text-sm text-slate-600 mb-4 text-center">
            คุณมีหลายเวรในวันที่ <span className="font-bold text-slate-800">{dateStr}</span><br/>
            กรุณาเลือกเวรที่คุณต้องการย้าย
          </p>

          <div className="flex flex-col gap-3">
            {shiftTypes.map((type) => (
              <button
                key={type}
                onClick={() => onSelect(type)}
                className={clsx(
                  "w-full py-3 px-4 rounded-xl border font-bold text-center transition-all",
                  shiftColors[type]
                )}
              >
                ย้ายเฉพาะเวร {shiftLabels[type]}
              </button>
            ))}
            
            {shiftTypes.length > 1 && (
              <button
                onClick={() => onSelect('ALL')}
                className="w-full py-3 px-4 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-center transition-all mt-2"
              >
                ย้ายทั้งหมด ({shiftTypes.map(t => shiftLabels[t].split(' ')[0]).join(' และ ')})
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
