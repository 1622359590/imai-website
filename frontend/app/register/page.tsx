'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authApi } from '@/lib/api';

export default function RegisterPage() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [nickname, setNickname] = useState('');
  const [company, setCompany] = useState('');
  const [companyRole, setCompanyRole] = useState('');
  const [industry, setIndustry] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [step, setStep] = useState(1); // 1=基本信息, 2=公司信息

  const validatePhone = (val: string) => {
    if (val && !/^1\d{10}$/.test(val)) {
      setPhoneError('手机号格式不正确');
      return false;
    }
    setPhoneError('');
    return true;
  };

  const handleNext = () => {
    setError('');
    if (!validatePhone(phone)) return;
    if (!phone || !password) { setError('请填写手机号和密码'); return; }
    if (password.length < 6) { setError('密码至少6位'); return; }
    if (password !== confirmPassword) { setError('两次密码不一致'); return; }
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authApi.register(phone, password, nickname || undefined, company || undefined, companyRole || undefined, industry || undefined);
      localStorage.setItem('imai-token', res.token);
      router.push('/');
    } catch (err: any) {
      setError(err.message || '注册失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-bg">
      <div className="login-card">
        {/* Logo */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#8b5cf6] to-[#6d28d9] text-white shadow-lg shadow-[#8b5cf6]/25">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2a7 7 0 017 7c0 2.38-1.19 4.47-3 5.74V17a2 2 0 01-2 2h-4a2 2 0 01-2-2v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 017-7z"/>
              <line x1="9" y1="21" x2="15" y2="21"/>
            </svg>
          </div>
          <h1 className="text-xl font-bold text-[#1e293b]">
            imai<span className="text-[#8b5cf6]">.work</span>
          </h1>
          <p className="mt-1 text-sm text-[#94a3b8]">创建你的账号</p>

          {/* 步骤指示 */}
          <div className="mt-4 flex items-center justify-center gap-2">
            <div className={`flex items-center gap-1.5 text-xs font-medium ${step === 1 ? 'text-[#8b5cf6]' : 'text-[#10b981]'}`}>
              <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${step === 1 ? 'bg-[#8b5cf6] text-white' : 'bg-[#10b981] text-white'}`}>{step > 1 ? '✓' : '1'}</span>
              基本信息
            </div>
            <div className={`h-px w-8 ${step > 1 ? 'bg-[#10b981]' : 'bg-[#e2e8f0]'}`} />
            <div className={`flex items-center gap-1.5 text-xs font-medium ${step === 2 ? 'text-[#8b5cf6]' : 'text-[#94a3b8]'}`}>
              <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${step === 2 ? 'bg-[#8b5cf6] text-white' : 'bg-[#e2e8f0] text-[#94a3b8]'}`}>2</span>
              公司信息
            </div>
          </div>
        </div>

        {/* 第一步：基本信息 */}
        {step === 1 && (
          <div className="space-y-3.5">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#64748b]">手机号 *</label>
              <input type="tel" value={phone} onChange={e => { setPhone(e.target.value); setPhoneError(''); }} onBlur={() => validatePhone(phone)}
                placeholder="请输入手机号" maxLength={11}
                className={`input input-lg ${phoneError ? '!border-red-400 !ring-red-400/20' : ''}`} />
              {phoneError && <p className="mt-1 text-xs text-red-500">{phoneError}</p>}
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#64748b]">昵称</label>
              <input type="text" value={nickname} onChange={e => setNickname(e.target.value)} placeholder="给自己取个名字" className="input input-lg" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#64748b]">密码 *</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="至少6位密码" className="input input-lg" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#64748b]">确认密码 *</label>
              <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="再次输入密码" className="input input-lg" />
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-600 flex items-center gap-2">
                <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                {error}
              </div>
            )}

            <button onClick={handleNext} className="btn btn-primary w-full justify-center text-base py-3 rounded-xl">
              下一步
            </button>
          </div>
        )}

        {/* 第二步：公司信息 */}
        {step === 2 && (
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#64748b]">公司名称</label>
              <input type="text" value={company} onChange={e => setCompany(e.target.value)} placeholder="你的公司或品牌名" className="input input-lg" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#64748b]">你的职位</label>
              <input type="text" value={companyRole} onChange={e => setCompanyRole(e.target.value)} placeholder="如：运营总监、创始人" className="input input-lg" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#64748b]">所在行业</label>
              <select value={industry} onChange={e => setIndustry(e.target.value)} className="input input-lg">
                <option value="">请选择行业</option>
                <option value="餐饮">餐饮</option>
                <option value="零售">零售</option>
                <option value="电商">电商</option>
                <option value="教育">教育</option>
                <option value="美业">美业</option>
                <option value="房产">房产</option>
                <option value="汽车">汽车</option>
                <option value="本地生活">本地生活</option>
                <option value="其他">其他</option>
              </select>
            </div>
            <p className="text-[11px] text-[#94a3b8]">公司信息选填，帮助我们更好地为你提供服务</p>

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-600 flex items-center gap-2">
                <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                {error}
              </div>
            )}

            <div className="flex gap-2">
              <button type="button" onClick={() => setStep(1)} className="btn btn-secondary flex-1 justify-center py-3 rounded-xl">上一步</button>
              <button type="submit" disabled={loading} className="btn btn-primary flex-1 justify-center py-3 rounded-xl">
                {loading ? <span className="flex items-center gap-2"><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />注册中...</span> : '完成注册'}
              </button>
            </div>
          </form>
        )}

        <div className="mt-5 text-center text-sm text-[#64748b]">
          已有账号？
          <Link href="/login" className="ml-1 font-medium text-[#8b5cf6] hover:underline">去登录</Link>
        </div>
      </div>
    </div>
  );
}
