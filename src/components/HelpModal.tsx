import React from 'react';
import { X, HelpCircle, LogIn, Calendar, RefreshCw, Bell, Info } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HelpModal({ isOpen, onClose }: HelpModalProps) {
  if (!isOpen) return null;

  const steps = [
    {
      icon: <LogIn className="w-5 h-5 text-indigo-500" />,
      title: 'เข้าสู่ระบบ',
      desc: 'ใช้บัญชีของคุณเพื่อเริ่มใช้งาน'
    },
    {
      icon: <Calendar className="w-5 h-5 text-blue-500" />,
      title: 'ดูตารางเวร',
      desc: 'เช้า (น้ำเงิน) | บ่าย (ส้ม) | ดึก (ม่วง) | หยุด (เทา)'
    },
    {
      icon: <RefreshCw className="w-5 h-5 text-orange-500" />,
      title: 'ขอย้ายเวร',
      desc: 'คลิกเวรตัวเอง > เลือก "ขอย้ายเวร" > เลือกเพื่อนและวันที่ > ยืนยัน'
    },
    {
      icon: <Bell className="w-5 h-5 text-purple-500" />,
      title: 'รับคำขอย้าย',
      desc: 'ดูที่รายการแจ้งเตือนเพื่อกด "อนุมัติ" หรือ "ปฏิเสธ"'
    }
  ];

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm overflow-y-auto h-full w-full z-[100] flex justify-center items-center p-4">
      <div className="relative bg-white rounded-[2rem] shadow-2xl w-full max-w-md mx-auto overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 rounded-xl">
                <HelpCircle className="w-6 h-6 text-slate-600" />
              </div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">วิธีใช้งานระบบ</h2>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-full transition-all">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            {steps.map((step, idx) => (
              <div key={idx} className="flex gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100/50">
                <div className="shrink-0 mt-1">{step.icon}</div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm mb-0.5">{step.title}</h3>
                  <p className="text-slate-500 text-xs leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={onClose}
            className="w-full mt-8 py-4 bg-slate-900 text-white rounded-2xl text-sm font-black hover:bg-slate-800 transition-all active:scale-95"
          >
            เข้าใจแล้ว
          </button>
        </div>
      </div>
    </div>
  );
}
