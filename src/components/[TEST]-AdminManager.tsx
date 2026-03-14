import React, { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import { X, Users, Trash2, Plus, Edit2, User as UserIcon, Settings } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Staff, Shift } from '../types';

interface AdminManagerProps {
  isOpen: boolean;
  onClose: () => void;
  staffList: Staff[];
  onStaffUpdate: () => void;
  allShifts: Shift[];
}

export function AdminManager({ isOpen, onClose, staffList, onStaffUpdate, allShifts }: AdminManagerProps) {
  const [newStaffName, setNewStaffName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  if (!isOpen) return null;

  const handleUpdateStaffName = async (id: string, oldName: string) => {
    if (!editingName.trim()) return;
    setLoading(true);
    setError('');

    try {
      // 1. Update Staff
      const { error: staffError } = await supabase
        .from('test_staff')
        .update({ name: editingName })
        .eq('id', id);

      if (staffError) throw staffError;

      // 2. Update User (by name)
      const { error: userError } = await supabase
        .from('test_users')
        .update({ name: editingName })
        .eq('name', oldName);

      if (userError) throw userError;

      setEditingStaffId(null);
      onStaffUpdate();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName.trim() || !username.trim() || !password.trim()) {
      setError('กรุณากรอกข้อมูลให้ครบถ้วน (ชื่อ, ชื่อผู้ใช้งาน, รหัสผ่าน)');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 1. Create Staff
      const { data: staffData, error: staffError } = await supabase
        .from('test_staff')
        .insert([{ name: newStaffName }])
        .select()
        .single();

      if (staffError) throw staffError;

      // 2. Create User
      const { error: userError } = await supabase
        .from('test_users')
        .insert([{
          username,
          password,
          name: newStaffName,
          role: isAdmin ? 'admin' : 'staff'
        }]);

      if (userError) throw userError;

      setNewStaffName('');
      setUsername('');
      setPassword('');
      setIsAdmin(false);
      onStaffUpdate();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStaff = async (id: string, name: string) => {
    if (!window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบ ${name}? ข้อมูลการอยู่เวรและบัญชีผู้ใช้งานจะถูกลบออกทั้งหมด`)) return;

    setLoading(true);
    setError('');

    try {
      // 1. Delete from staff
      const { error: deleteStaffError } = await supabase
        .from('test_staff')
        .delete()
        .eq('id', id);

      if (deleteStaffError) throw deleteStaffError;

      // 2. Delete from users (by name, since we don't have a direct link in this schema)
      const { error: deleteUserError } = await supabase
        .from('test_users')
        .delete()
        .eq('name', name);

      if (deleteUserError) throw deleteUserError;

      onStaffUpdate();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 relative animate-in fade-in zoom-in duration-200 h-[80vh] flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center mr-4">
              <Settings className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">จัดการระบบ</h2>
              <p className="text-gray-500 text-sm">จัดการบุคลากร</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4">
              {error}
            </div>
          )}

            {/* Staff Management Section */}
            <div className="bg-gray-50 p-4 rounded-xl mb-6 border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                <Plus className="w-4 h-4 mr-2" /> เพิ่มบุคลากรใหม่
              </h3>
              <form onSubmit={handleAddStaff} className="space-y-3">
                <div>
                  <input
                    type="text"
                    placeholder="ชื่อ-นามสกุล"
                    value={newStaffName}
                    onChange={(e) => setNewStaffName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="ชื่อผู้ใช้งาน (Username)"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    required
                  />
                  <input
                    type="password"
                    placeholder="รหัสผ่าน (Password)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    required
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isAdmin}
                      onChange={(e) => setIsAdmin(e.target.checked)}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-gray-600">สิทธิ์ผู้ดูแลระบบ (Admin)</span>
                  </label>
                  <button
                    type="submit"
                    disabled={loading || !newStaffName.trim() || !username.trim() || !password.trim()}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors font-medium text-sm"
                  >
                    {loading ? 'กำลังบันทึก...' : 'เพิ่มบุคลากร'}
                  </button>
                </div>
              </form>
            </div>

            <div className="flex-1 min-h-[250px] overflow-y-auto border border-gray-200 rounded-xl shadow-sm">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ชื่อ</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">การดำเนินการ</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {staffList.map((staff) => (
                    <tr key={staff.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        <div className="flex items-center">
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold mr-3 ${
                            staff.name.startsWith('นาย') 
                              ? 'bg-blue-100 text-blue-700' 
                              : staff.name.startsWith('น.ส.') || staff.name.startsWith('นางสาว') || staff.name.startsWith('นาง')
                                ? 'bg-pink-100 text-pink-700'
                                : 'bg-indigo-100 text-indigo-700'
                          }`}>
                            <UserIcon className="w-4 h-4" />
                          </div>
                          {editingStaffId === staff.id ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                className="px-2 py-1 border border-indigo-300 rounded focus:ring-1 focus:ring-indigo-500 text-sm"
                                autoFocus
                              />
                              <button
                                onClick={() => handleUpdateStaffName(staff.id, staff.name)}
                                className="text-emerald-600 hover:text-emerald-700 text-xs font-bold"
                              >
                                บันทึก
                              </button>
                              <button
                                onClick={() => setEditingStaffId(null)}
                                className="text-gray-400 hover:text-gray-600 text-xs"
                              >
                                ยกเลิก
                              </button>
                            </div>
                          ) : (
                            staff.name
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              setEditingStaffId(staff.id);
                              setEditingName(staff.name);
                            }}
                            disabled={loading}
                            className="text-indigo-600 hover:text-indigo-900 p-2 hover:bg-indigo-50 rounded-full transition-colors"
                            title="แก้ไขชื่อ"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteStaff(staff.id, staff.name)}
                            disabled={loading}
                            className="text-red-600 hover:text-red-900 p-2 hover:bg-red-50 rounded-full transition-colors"
                            title="ลบพนักงาน"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {staffList.length === 0 && (
                    <tr>
                      <td colSpan={2} className="px-6 py-8 text-center text-gray-500">
                        ไม่พบพนักงาน เพิ่มพนักงานใหม่ด้านบน
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
}
