'use client';

import { useState, useEffect } from 'react';
import { adminApi } from '@/lib/api';
import { showToast } from '@/components/ui/Toast';
import VIPBadge from '@/components/ui/VIPBadge';

interface User {
  id: number;
  phone: string;
  nickname: string;
  avatar: string;
  vip: number;
  vip_expires_at: string;
  created_at: string;
}

function isExpired(expiresAt: string) {
  if (!expiresAt) return true;
  return new Date(expiresAt) < new Date();
}

export default function AdminUsersPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [newNick, setNewNick] = useState('');
  const [creating, setCreating] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = () => {
    setLoading(true);
    adminApi.getUsers().then((res) => {
      setUsers(res.users || []);
    }).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleCreate = async () => {
    if (!newPhone || !newPwd) { showToast('请填写手机号和密码', 'error'); return; }
    setCreating(true);
    try {
      await adminApi.createUser({ phone: newPhone, password: newPwd, nickname: newNick });
      showToast('创建成功', 'success');
      setShowCreate(false);
      setNewPhone(''); setNewPwd(''); setNewNick('');
      fetchUsers();
    } catch (err: any) { showToast(err.message, 'error'); }
    finally { setCreating(false); }
  };

  return (
    <>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3"><h1 className="text-lg font-semibold text-[#1e293b]">前台用户管理</h1><button onClick={() => setShowCreate(true)} className="btn btn-primary btn-sm">+ 创建用户</button></div>
        <span className="text-sm text-[#64748b]">共 {users.length} 位用户</span>
      </div>

      <div className="card">
        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-10 animate-pulse rounded bg-[#f1f5f9]" />)}</div>
        ) : users.length === 0 ? (
          <div className="py-12 text-center text-[#94a3b8]">暂无用户</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr>
                <th>ID</th>
                <th>手机号</th>
                <th>昵称</th>
                <th>VIP</th>
                <th>到期时间</th>
                <th>注册时间</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const expired = u.vip === 1 && isExpired(u.vip_expires_at);
                return (
                <tr key={u.id}>
                  <td className="text-xs font-mono">{u.id}</td>
                  <td className="font-medium">{u.phone}</td>
                  <td>{u.nickname || '-'}</td>
                  <td>
                    {u.vip === 1 && !expired ? (
                      <VIPBadge />
                    ) : expired ? (
                      <span className="text-xs text-[#94a3b8]">已过期</span>
                    ) : (
                      <span className="text-xs text-[#94a3b8]">-</span>
                    )}
                  </td>
                  <td className="text-xs text-[#94a3b8]">{u.vip_expires_at || '-'}</td>
                  <td className="text-xs text-[#94a3b8]">{u.created_at?.split(' ')[0]}</td>
                </tr>
              )})}
            </tbody>
          </table>
        )}
      </div>
    </div>
    {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowCreate(false)}>
          <div className="card w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-[#1e293b]">创建前台用户</h3>
            <div className="mt-4 space-y-3">
              <input value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="手机号" className="input text-sm" />
              <input value={newNick} onChange={e => setNewNick(e.target.value)} placeholder="昵称（可选）" className="input text-sm" />
              <input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} placeholder="密码" className="input text-sm" />
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowCreate(false)} className="flex-1 btn btn-secondary btn-sm justify-center">取消</button>
                <button onClick={handleCreate} disabled={creating} className="flex-1 btn btn-primary btn-sm justify-center">{creating ? '创建中...' : '创建'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
