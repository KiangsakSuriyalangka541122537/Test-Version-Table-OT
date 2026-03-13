import React from 'react';
import { X, Clock } from 'lucide-react';
import { ShiftType } from '../types';

interface ShiftTypeSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (type: ShiftType) => void;
  shiftTypes: ShiftType[];
  dateStr: string;
  staffName: string;
}

const shiftLabels: Record<string, string> = {
  M: 'เช้า (ช)',
  A: 'บ่าย (บ)',
  N: 'ดึก (ด)',
};

const shiftColors: Record<string, string> = {
  M: 'bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100',
  A: 'bg-orange-50 text-orange-700 border-orange-100 hover:bg-orange-100',
  N: 'bg-purple-50 text-purple-700 border-purple-100 hover:bg-purple-100',
};

export function ShiftTypeSelectionModal({
  isOpen,
  onClose,
  onSelect,
  shiftTypes,
  dateStr,
  staffName,
}: ShiftTypeSelectionModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm overflow-y-auto h-full w-full z-[60] flex justify-center items-center p-4">
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6">
          <button 
            onClick={onClose} 
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-indigo-50 rounded-2xl flex items-center justify-center">
              <Clock className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 leading-tight">เลือกเวรที่ต้องการย้าย</h3>
              <p className="text-xs text-slate-500 mt-0.5">{staffName} - {dateStr}</p>
            </div>
          </div>

          <div className="space-y-3">
            {shiftTypes.map((type) => (
              <button
                key={type}
                onClick={() => onSelect(type)}
                className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all group ${shiftColors[type] || 'bg-slate-50 text-slate-700 border-slate-100 hover:bg-slate-100'}`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg font-black">{type}</span>
                  <span className="font-bold text-sm">{shiftLabels[type] || type}</span>
                </div>
                <div className="w-8 h-8 rounded-full bg-white/50 flex items-center justify-center group-hover:bg-white transition-colors">
                  <div className="w-2 h-2 rounded-full bg-current"></div>
                </div>
              </button>
            ))}
            
            <button
              onClick={() => onSelect(shiftTypes.join(',') as ShiftType)}
              className="w-full flex items-center justify-between p-4 rounded-2xl border-2 border-dashed border-slate-200 text-slate-500 hover:bg-slate-50 transition-all font-bold text-sm"
            >
              <span>ย้ายทั้งคู่ ({shiftTypes.join('|')})</span>
            </button>
          </div>
        </div>
        
        <div className="bg-slate-50 p-4 text-center">
          <button 
            onClick={onClose}
            className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors"
          >
            ยกเลิก
          </button>
        </div>
      </div>
    </div>
  );
}
