"use client";
import React, { useState, useEffect } from 'react';
import {
  Thermometer, Droplets, Wind, CloudRain, History,
  Bluetooth, Mail, Lock, User, ArrowRight, LogOut
} from 'lucide-react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

// --- DỮ LIỆU GIẢ (MOCK DATA) - KHÔNG ĐỔI ---
const mockChartData = [
  { time: '08:00', temp: 24, humidity: 60 },
  { time: '10:00', temp: 26, humidity: 58 },
  { time: '12:00', temp: 29, humidity: 55 },
  { time: '14:00', temp: 31, humidity: 52 },
  { time: '16:00', temp: 30, humidity: 54 },
  { time: '18:00', temp: 27, humidity: 59 },
  { time: '20:00', temp: 25, humidity: 62 },
];

const mockWeekData = [
  { time: 'T2', temp: 22 }, { time: 'T3', temp: 25 }, { time: 'T4', temp: 28 }, 
  { time: 'T5', temp: 26 }, { time: 'T6', temp: 24 }, { time: 'T7', temp: 29 }, { time: 'CN', temp: 27 },
];

export default function App() {
  const [view, setView] = useState('login'); // login | register | dashboard
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Khắc phục lỗi Hydration (Next.js)
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  // Xử lý logic Đăng nhập/Đăng ký giả lập
  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggedIn(true);
    setView('dashboard');
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setView('login');
  };

  // --- MÀN HÌNH ĐĂNG NHẬP / ĐĂNG KÝ VỚI NỀN ĐÁM MÂY ĐỘNG ---
  const AuthForm = ({ type }: { type: 'login' | 'register' }) => (
    // Thêm style và class để tạo nền đám mây động
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden font-sans" style={{ background: 'linear-gradient(to bottom, #d6eaf8, #b0d4f1)' }}>
      {/* Background Decor - Hình ảnh đám mây với hiệu ứng chuyển động lăn nhẹ */}
      <div className="absolute inset-0 opacity-40 bg-[url('https://images.thegioididong.com/Files/2010/06/18/12771/1_Verizon-tung-ra-dich-vu-luu-tru-dam-may.jpg')] animate-[cloud-move_60s_linear_infinite]"></div>

      {/* Card Auth với chiều rộng nhỏ, góc bo nhỏ, và kính mờ được tăng cường */}
      <div className="relative z-10 w-full max-w-sm bg-white/70 backdrop-blur-3xl p-8 rounded-[2rem] border border-white shadow-2xl shadow-slate-200/50">
        <div className="text-center mb-6 flex flex-col items-center">
          {/* Icon nhỏ và padding ít */}
          <div className="inline-flex p-3 bg-blue-600 rounded-xl text-white mb-4 shadow-lg shadow-blue-200 group transition-transform hover:scale-105">
            <Wind size={20} className="group-hover:rotate-12 transition-transform" />
          </div>
          {/* Phông chữ tiêu đề nhỏ */}
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight leading-snug">
            {type === 'login' ? 'Chào mừng trở lại' : 'Đăng ký tài khoản mới'}
          </h2>
          {/* Chip text nhỏ, font nhỏ */}
          <div className="inline-block mt-2 px-3 py-1 bg-slate-100/70 rounded-full border border-slate-200">
            <p className="text-[11px] text-slate-600 font-medium tracking-tight">Hệ thống giám sát thời tiết WS-A109</p>
          </div>
        </div>

        {/* Form space nhỏ */}
        <form onSubmit={handleAuth} className="space-y-4">
          {type === 'register' && (
            <div className="relative group">
              {/* Icon input nhỏ */}
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-700 transition-colors" size={16} />
              {/* Input nhỏ, padding ít, font nhỏ, góc bo nhỏ */}
              <input 
                type="text" placeholder="Họ và tên của bạn" 
                className="w-full pl-11 pr-4 py-3 bg-slate-100 backdrop-blur-sm border border-slate-200/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-800 text-sm font-medium placeholder:text-slate-400"
                required 
              />
            </div>
          )}
          <div className="relative group">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-700 transition-colors" size={16} />
            <input 
              type="email" placeholder="Email đăng nhập (ví dụ: name@email.com)" 
              className="w-full pl-11 pr-4 py-3 bg-slate-100 backdrop-blur-sm border border-slate-200/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-800 text-sm font-medium placeholder:text-slate-400"
              required 
            />
          </div>
          <div className="relative group">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-700 transition-colors" size={16} />
            <input 
              type="password" placeholder="Mật khẩu của bạn" 
              className="w-full pl-11 pr-4 py-3 bg-slate-100 backdrop-blur-sm border border-slate-200/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-800 text-sm font-medium placeholder:text-slate-400"
              required 
            />
          </div>

          {/* Button nhỏ, font nhỏ */}
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2 group active:scale-[0.98] text-sm">
            {type === 'login' ? 'Đăng nhập ngay' : 'Đăng ký ngay'}
            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </form>

        {/* Link nhỏ và padding trên nhỏ */}
        <div className="mt-6 text-center pt-4 border-t border-slate-200/80">
          <button 
            onClick={() => setView(type === 'login' ? 'register' : 'login')}
            className="text-[11px] font-medium text-blue-600 hover:text-blue-700 transition-colors"
          >
            {type === 'login' ? 'Bạn chưa có tài khoản? Đăng ký tại đây' : 'Đã có tài khoản? Đăng nhập'}
          </button>
        </div>
      </div>
    </div>
  );

  // Render dựa trên trạng thái view
  if (view === 'login') return <AuthForm type="login" />;
  if (view === 'register') return <AuthForm type="register" />;

  return <WeatherDashboard onLogout={handleLogout} />;
}

// --- MÀN HÌNH DASHBOARD CHÍNH (GIỮ NGUYÊN) ---
function WeatherDashboard({ onLogout }: { onLogout: () => void }) {
  const [timeRange, setTimeRange] = useState('24h');
  const displayData = timeRange === '24h' ? mockChartData : mockWeekData;

  const data = {
    temp: 28.5, humidity: 65, windSpeed: 12.4, rain: "Vừa", location: "Khu vực Phía Bắc"
  };

  return (
    <div className="relative min-h-screen bg-[#f0f4f8] p-4 md:p-10 font-sans text-slate-900 overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-100/30 blur-[120px] rounded-full"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[40%] bg-indigo-100/30 blur-[100px] rounded-full"></div>

      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4 p-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="relative flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-bold uppercase tracking-widest text-emerald-600">Hệ thống giám sát trực tuyến</span>
            </div>
            <h1 className="text-4xl font-black tracking-tight text-slate-800 leading-tight">WS Dashboard</h1>
            <p className="text-slate-600 mt-2 font-semibold">📍 {data.location} • Trạm: WS-A109</p>
          </div>
          
          <div className="flex gap-3">
            <button onClick={onLogout} className="flex items-center gap-2 px-5 py-3 bg-red-50 text-red-600 border border-red-100 rounded-2xl shadow-sm hover:bg-red-100 transition-all active:scale-95 text-sm font-bold">
              <LogOut size={16} />
              <span>Đăng xuất</span>
            </button>
            <button className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95 group text-sm font-bold">
              <Bluetooth size={16} className="group-hover:rotate-12 transition-transform animate-pulse" />
              <span>Kết nối BLE</span>
            </button>
          </div>
        </header>

        {/* Thông số chi tiết */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {[
            { label: 'Nhiệt độ', val: `${data.temp}°C`, sub: 'Cảm giác như 30°C', Icon: Thermometer, color: 'text-orange-500', bg: 'bg-orange-50' },
            { label: 'Độ ẩm', val: `${data.humidity}%`, sub: 'Độ ẩm lý tưởng', Icon: Droplets, color: 'text-blue-500', bg: 'bg-blue-50' },
            { label: 'Tốc độ gió', val: `${data.windSpeed}km/h`, sub: 'Hướng: Đông Bắc', Icon: Wind, color: 'text-cyan-500', bg: 'bg-cyan-50' },
            { label: 'Lượng mưa', val: data.rain, sub: 'Cập nhật 1 phút trước', Icon: CloudRain, color: 'text-indigo-500', bg: 'bg-indigo-50' }
          ].map((item, idx) => (
            <div key={idx} className="bg-white/60 backdrop-blur-2xl p-6 rounded-3xl border border-white shadow-xl hover:-translate-y-1 transition-all group">
              <div className={`inline-flex p-3.5 rounded-2xl ${item.bg} ${item.color} mb-5 group-hover:scale-105 transition-transform`}>
                <item.Icon size={22} />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">{item.label}</p>
              <h2 className="text-3xl font-black text-slate-800">{item.val}</h2>
              <p className="text-xs text-slate-500 mt-2 font-medium">● {item.sub}</p>
            </div>
          ))}
        </div>

        {/* Phần Biểu đồ */}
        <div className="bg-white/60 backdrop-blur-3xl p-8 rounded-[3rem] border border-white shadow-2xl MB-10">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="text-xl font-black text-slate-800">Phân tích Diễn biến</h3>
              <p className="text-sm text-slate-500 font-medium mt-1">Dữ liệu thời gian thực</p>
            </div>
            <div className="bg-slate-100/60 p-1.5 rounded-xl flex gap-2 border border-slate-200/80">
              {['24h', '7d'].map((r) => (
                <button 
                  key={r}
                  onClick={() => setTimeRange(r)}
                  className={`px-5 py-2 rounded-lg text-xs font-bold transition-all ${
                    timeRange === r ? 'bg-white shadow-md text-blue-600' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {r === '24h' ? '24 Giờ' : '7 Ngày'}
                </button>
              ))}
            </div>
          </div>

          <div className="h-[320px] w-full p-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={displayData}>
                <defs>
                  <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" strokeOpacity={0.7}/>
                <XAxis 
                  dataKey="time" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#64748b', fontSize: 11, fontWeight: 500}} 
                  dy={10} 
                />
                <YAxis hide domain={['auto', 'auto']} />
                <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                <Area type="monotone" dataKey="temp" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorTemp)" animationDuration={1000}/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}