import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Calendar, 
  CheckCircle2, 
  Heart, 
  User, 
  BookOpen, 
  CloudSun, 
  MessageCircle, 
  Plus, 
  ChevronRight,
  Clock,
  Home,
  Dog,
  Apple
} from 'lucide-react';
import { motion } from 'motion/react';
import { GoogleGenAI } from "@google/genai";

// Types
interface User {
  id: string;
  name: string;
  student_id: string;
  college?: string;
  mom_phone?: string;
  genie_name: string | null;
  genie_personality: string | null;
  has_pet: number;
  pet_name: string | null;
  is_setup_complete: number;
  focus_hours: number;
  tasks_completed: number;
  medals_count: number;
  consecutive_days: number;
}

interface Course {
  id: number;
  name: string;
  location?: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  total_lessons: number;
  completed_lessons: number;
}

interface Task {
  id: number;
  title: string;
  description: string;
  status: 'pending' | 'completed';
  source: 'self' | 'family';
  created_at: string;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function App() {
  const [screen, setScreen] = useState<'startup' | 'login' | 'register-1' | 'register-2' | 'register-3' | 'setup' | 'dashboard' | 'study' | 'family' | 'pet' | 'profile' | 'timetable'>('startup');
  const [user, setUser] = useState<User | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // Form States
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [college, setCollege] = useState('');
  const [momPhone, setMomPhone] = useState('');
  
  const [courses, setCourses] = useState<Course[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [genieMessage, setGenieMessage] = useState<string>("来啦？");
  const [isLoading, setIsLoading] = useState(false);
  const [weather] = useState({ city: '西安', home: '长沙', temp: 22, condition: 'Sunny' });

  // Genie/Pet Setup
  const [setupGenieName, setSetupGenieName] = useState('');
  const [setupPersonality, setSetupPersonality] = useState('Friendly & Encouraging');
  const [setupHasPet, setSetupHasPet] = useState(false);
  const [setupPetName, setSetupPetName] = useState('');

  const [showFocusPopup, setShowFocusPopup] = useState(false);
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [checkInTask, setCheckInTask] = useState<Task | null>(null);

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showPetChat, setShowPetChat] = useState(false);
  const [petMessages, setPetMessages] = useState<{ role: 'pet' | 'user', text: string }[]>([]);
  const [petInput, setPetInput] = useState('');

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
  const [selectedDay, setSelectedDay] = useState(1);

  useEffect(() => {
    if (user && user.is_setup_complete) {
      fetchData();
    }
  }, [user]);

  useEffect(() => {
    if (user && user.is_setup_complete && courses.length > 0) {
      generateGenieAdvice();
    }
  }, [courses, tasks]);

  const fetchData = async () => {
    if (!user) return;
    try {
      const [coursesRes, tasksRes] = await Promise.all([
        fetch(`/api/courses/${user.id}`),
        fetch(`/api/tasks/${user.id}`)
      ]);
      setCourses(await coursesRes.json());
      setTasks(await tasksRes.json());
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const handleRegister = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, studentId, college, password, momPhone })
      });
      const userData = await res.json();
      if (res.ok) {
        setUser(userData);
        setScreen('setup');
      } else {
        alert(userData.error);
      }
    } catch (error) {
      alert("Registration failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, password })
      });
      const userData = await res.json();
      if (res.ok) {
        setUser(userData);
        if (userData.is_setup_complete) {
          setScreen('dashboard');
          setGenieMessage(`早安，${userData.name.split(' ')[1] || userData.name}！今天周二，有两节课哦`);
        } else {
          setScreen('setup');
        }
      } else {
        alert(userData.error);
      }
    } catch (error) {
      alert("Login failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          genieName: setupGenieName,
          geniePersonality: setupPersonality,
          hasPet: setupHasPet,
          petName: setupPetName
        })
      });
      const updatedUser = await res.json();
      setUser(updatedUser);
      setScreen('dashboard');
      setShowOnboarding(true);
    } catch (error) {
      alert("Setup failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const generateGenieAdvice = async () => {
    if (!user || !user.is_setup_complete) return;
    
    const today = new Date().getDay();
    const todayCourses = courses.filter(c => c.day_of_week === today);
    const pendingTasks = tasks.filter(t => t.status === 'pending');

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `
          You are "${user.genie_name}", a magical university companion with a "${user.genie_personality}" personality.
          Context:
          - Student: ${user.name}
          - Today's Courses: ${todayCourses.map(c => c.name).join(', ') || 'No classes today'}
          - Pending Tasks: ${pendingTasks.map(t => t.title).join(', ')}
          - Weather: ${weather.condition}, ${weather.temp}°C
          - Pet: ${user.has_pet ? `You have a pet named ${user.pet_name}` : 'No pet'}
          
          Provide a short, encouraging, and helpful advice for the student's day in Chinese. 
          Include a study suggestion and a life suggestion.
          Mention the pet if relevant.
          Keep it under 100 words. Use emojis.
        `,
      });
      setGenieMessage(response.text || "I'm here to help you!");
    } catch (error) {
      console.error("Genie advice error:", error);
    }
  };

  const toggleTask = async (id: number, currentStatus: string) => {
    const newStatus = currentStatus === 'pending' ? 'completed' : 'pending';
    try {
      await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      fetchData();
    } catch (error) {
      console.error("Error updating task:", error);
    }
  };

  const updateCourseProgress = async (id: number, completed: number) => {
    try {
      await fetch(`/api/courses/${id}/progress`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed_lessons: completed })
      });
      fetchData();
    } catch (error) {
      console.error("Error updating course progress:", error);
    }
  };

  const getNextClass = () => {
    const today = new Date().getDay();
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    const todayClasses = courses
      .filter(c => c.day_of_week === today)
      .sort((a, b) => {
        const [aH, aM] = a.start_time.split(':').map(Number);
        const [bH, bM] = b.start_time.split(':').map(Number);
        return (aH * 60 + aM) - (bH * 60 + bM);
      });

    const nextToday = todayClasses.find(c => {
      const [h, m] = c.start_time.split(':').map(Number);
      return (h * 60 + m) > currentTime;
    });

    if (nextToday) return { ...nextToday, isToday: true };

    // Find first class of next available day
    for (let i = 1; i <= 7; i++) {
      const nextDay = (today + i) % 7;
      const nextDayClasses = courses
        .filter(c => c.day_of_week === nextDay)
        .sort((a, b) => {
          const [aH, aM] = a.start_time.split(':').map(Number);
          const [bH, bM] = b.start_time.split(':').map(Number);
          return (aH * 60 + aM) - (bH * 60 + bM);
        });
      if (nextDayClasses.length > 0) return { ...nextDayClasses[0], isToday: false };
    }

    return null;
  };

  const handlePetChat = async () => {
    if (!petInput.trim()) return;
    const newMessages = [...petMessages, { role: 'user' as const, text: petInput }];
    setPetMessages(newMessages);
    setPetInput('');
    
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `
          You are "${user?.pet_name}", a cute pet. 
          The user is your owner who is away at university.
          Respond in a very cute, pet-like way in Chinese (e.g., using "汪汪", "喵喵", "想你啦").
          Keep it short.
          User says: ${petInput}
        `,
      });
      setPetMessages([...newMessages, { role: 'pet', text: response.text || "汪汪！" }]);
    } catch (error) {
      setPetMessages([...newMessages, { role: 'pet', text: "汪汪！(网络不太好，但我还是想你)" }]);
    }
  };
  const totalCompleted = courses.reduce((acc, c) => acc + c.completed_lessons, 0);
  const totalLessons = courses.reduce((acc, c) => acc + c.total_lessons, 0);
  const semesterProgress = totalLessons > 0 ? (totalCompleted / totalLessons) * 100 : 0;

  // Screen Renderers
  if (screen === 'startup') {
    return (
      <div className="min-h-screen bg-pink-200 flex items-center justify-center cursor-pointer" onClick={() => setScreen('login')}>
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex flex-col items-center"
        >
          <div className="w-48 h-48 bg-pink-300 rounded-full flex items-center justify-center relative shadow-inner">
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ repeat: Infinity, duration: 3 }}
              className="text-8xl"
            >
              🐱
            </motion.div>
          </div>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-8 bg-white px-6 py-3 rounded-2xl shadow-lg relative"
          >
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white rotate-45"></div>
            <span className="text-pink-600 font-bold text-xl">来啦？</span>
          </motion.div>
          <p className="mt-12 text-pink-500 text-sm animate-pulse">轻点屏幕叫醒Genie...</p>
        </motion.div>
      </div>
    );
  }

  if (screen === 'login') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-pink-100 to-pink-200 flex flex-col items-center p-8">
        <motion.div initial={{ y: -50 }} animate={{ y: 0 }} className="mt-12 mb-12 flex flex-col items-center">
          <div className="text-9xl mb-4">🐱</div>
          <h1 className="text-3xl font-bold text-pink-600">XD Genie</h1>
        </motion.div>

        <div className="w-full max-w-sm space-y-4">
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-pink-300" />
            <input 
              type="text" 
              placeholder="学号" 
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className="w-full bg-white/80 border-none rounded-3xl py-4 pl-12 pr-4 outline-none focus:ring-2 focus:ring-pink-300 shadow-sm"
            />
          </div>
          <div className="relative">
            <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-pink-300" />
            <input 
              type="password" 
              placeholder="密码" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white/80 border-none rounded-3xl py-4 pl-12 pr-4 outline-none focus:ring-2 focus:ring-pink-300 shadow-sm"
            />
          </div>
          
          <button 
            onClick={() => handleLogin()}
            className="w-16 h-16 bg-pink-500 rounded-full mx-auto flex items-center justify-center shadow-lg hover:bg-pink-600 transition-all active:scale-95"
          >
            <ChevronRight className="w-8 h-8 text-white" />
          </button>

          <div className="text-center pt-4">
            <p className="text-pink-400 text-sm">还没有账号？<button onClick={() => setScreen('register-1')} className="font-bold underline">点这里</button></p>
          </div>
        </div>
      </div>
    );
  }

  if (screen.startsWith('register')) {
    const step = parseInt(screen.split('-')[1]);
    return (
      <div className="min-h-screen bg-pink-50 p-8 flex flex-col items-center">
        <div className="w-full flex justify-between items-center mb-12">
          <button onClick={() => setScreen(step === 1 ? 'login' : `register-${step-1}` as any)} className="p-2 text-pink-400">
            <ChevronRight className="w-6 h-6 rotate-180" />
          </button>
          <span className="text-pink-400 font-bold">注册 {step}/3</span>
          <div className="w-10"></div>
        </div>

        <motion.div key={screen} initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="w-full max-w-sm flex flex-col items-center">
          <div className="text-8xl mb-12">
            {step === 1 && "🤩"}
            {step === 2 && "👂"}
            {step === 3 && "💃"}
          </div>

          {step === 1 && (
            <div className="w-full space-y-4">
              <input type="text" placeholder="真实姓名" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-white rounded-2xl py-4 px-6 outline-none shadow-sm" />
              <input type="text" placeholder="学号" value={studentId} onChange={(e) => setStudentId(e.target.value)} className="w-full bg-white rounded-2xl py-4 px-6 outline-none shadow-sm" />
              <input type="text" placeholder="学院" value={college} onChange={(e) => setCollege(e.target.value)} className="w-full bg-white rounded-2xl py-4 px-6 outline-none shadow-sm" />
              <button onClick={() => setScreen('register-2')} className="w-full bg-pink-500 text-white font-bold py-4 rounded-2xl shadow-lg mt-4">下一步</button>
            </div>
          )}

          {step === 2 && (
            <div className="w-full space-y-4">
              <input type="password" placeholder="设置密码" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-white rounded-2xl py-4 px-6 outline-none shadow-sm" />
              <input type="password" placeholder="确认密码" className="w-full bg-white rounded-2xl py-4 px-6 outline-none shadow-sm" />
              <div className="relative">
                <input type="text" placeholder="妈妈的手机号 (选填)" value={momPhone} onChange={(e) => setMomPhone(e.target.value)} className="w-full bg-white rounded-2xl py-4 px-6 outline-none shadow-sm" />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-pink-300 cursor-help" title="绑定后可以接收家庭任务">❓</div>
              </div>
              <button onClick={() => setScreen('register-3')} className="w-full bg-pink-500 text-white font-bold py-4 rounded-2xl shadow-lg mt-4">下一步</button>
            </div>
          )}

          {step === 3 && (
            <div className="w-full space-y-4">
              <button className="w-full bg-white p-6 rounded-3xl shadow-sm flex items-center gap-4 hover:bg-pink-100 transition-colors">
                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-2xl">☁️</div>
                <span className="font-bold text-gray-700">一键同步教务系统课表</span>
              </button>
              <button className="w-full bg-white p-6 rounded-3xl shadow-sm flex items-center gap-4 hover:bg-pink-100 transition-colors">
                <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center text-2xl">🖼️</div>
                <span className="font-bold text-gray-700">从相册上传课表截图</span>
              </button>
              <button className="w-full bg-white p-6 rounded-3xl shadow-sm flex items-center gap-4 hover:bg-pink-100 transition-colors">
                <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center text-2xl">📊</div>
                <span className="font-bold text-gray-700">下载Excel模板再上传</span>
              </button>
              <div className="text-center pt-4">
                <p className="text-pink-400 text-xs mb-4">完成后Genie会给你一个大大的拥抱</p>
                <button onClick={handleRegister} className="w-full bg-pink-500 text-white font-bold py-4 rounded-2xl shadow-lg">完成注册</button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  // Setup Screen
  if (user && !user.is_setup_complete) {
    return (
      <div className="min-h-screen bg-[#FDFCFB] flex items-center justify-center p-4 font-sans">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-white rounded-[2rem] shadow-2xl p-8 border border-orange-50"
        >
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900">First Time Setup</h2>
            <p className="text-gray-500 text-sm mt-2">Let's personalize your magical experience. These settings cannot be changed later!</p>
          </div>

          <form onSubmit={handleSetup} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Genie's Name</label>
              <input 
                type="text" 
                value={setupGenieName}
                onChange={(e) => setSetupGenieName(e.target.value)}
                placeholder="e.g. Sparky, Wisdom..."
                className="w-full bg-gray-50 rounded-2xl py-4 px-4 outline-none focus:ring-2 focus:ring-orange-200"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Genie's Personality</label>
              <select 
                value={setupPersonality}
                onChange={(e) => setSetupPersonality(e.target.value)}
                className="w-full bg-gray-50 rounded-2xl py-4 px-4 outline-none focus:ring-2 focus:ring-orange-200"
              >
                <option>Friendly & Encouraging</option>
                <option>Strict & Disciplined</option>
                <option>Funny & Playful</option>
                <option>Wise & Calm</option>
              </select>
            </div>

            <div className="flex items-center justify-between bg-gray-50 p-4 rounded-2xl">
              <div className="flex items-center gap-3">
                <Dog className="w-6 h-6 text-blue-500" />
                <span className="font-bold text-gray-700">Do you have a pet?</span>
              </div>
              <button 
                type="button"
                onClick={() => setSetupHasPet(!setupHasPet)}
                className={`w-12 h-6 rounded-full transition-colors relative ${setupHasPet ? 'bg-orange-500' : 'bg-gray-300'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${setupHasPet ? 'left-7' : 'left-1'}`}></div>
              </button>
            </div>

            {setupHasPet && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Pet's Name</label>
                <input 
                  type="text" 
                  value={setupPetName}
                  onChange={(e) => setSetupPetName(e.target.value)}
                  placeholder="What's your pet called?"
                  className="w-full bg-gray-50 rounded-2xl py-4 px-4 outline-none focus:ring-2 focus:ring-orange-200"
                  required
                />
              </motion.div>
            )}

            <button 
              type="submit"
              disabled={isLoading}
              className="w-full bg-orange-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-orange-200"
            >
              {isLoading ? "Saving..." : "Complete Setup"}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  // Dashboard Renderer
  if (user && screen === 'dashboard') {
    return (
      <div className={`min-h-screen ${isDarkMode ? 'bg-slate-900 text-gray-100' : 'bg-pink-50 text-gray-900'} font-sans pb-24 transition-colors duration-500`}>
        {/* Header */}
        <header className="px-6 pt-8 pb-4 flex justify-between items-center sticky top-0 z-30 bg-inherit/80 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <div className="text-xs font-bold text-pink-400 flex flex-col">
              <span>西安 {weather.temp}°C</span>
              <span className="opacity-60">家乡 {weather.home}</span>
            </div>
          </div>
          <button className="w-10 h-10 bg-white/50 rounded-full flex items-center justify-center shadow-sm">
            <MessageCircle className="w-5 h-5 text-pink-500" />
          </button>
        </header>

        <main className="px-6 space-y-6">
          <section>
            <h1 className="text-3xl font-bold">早安，{user.name.split(' ')[1] || user.name}！</h1>
            <div className="flex items-center gap-3 mt-4">
              <div className="w-12 h-12 bg-pink-200 rounded-full flex items-center justify-center text-2xl">🐱</div>
              <div className="bg-white/80 px-4 py-2 rounded-2xl rounded-tl-none shadow-sm text-sm font-medium text-pink-600">
                {genieMessage}
              </div>
            </div>
          </section>

          {/* Quick Shortcuts */}
          <div className="grid grid-cols-5 gap-2">
            {[
              { id: 'timetable', icon: '📅', label: '课表', color: 'bg-pink-100' },
              { id: 'study', icon: '🎯', label: '学习', color: 'bg-indigo-100' },
              { id: 'family', icon: '👪', label: '家庭', color: 'bg-orange-100' },
              { id: 'pet', icon: '🐱', label: '宠物', color: 'bg-yellow-100' },
              { id: 'profile', icon: '📊', label: '统计', color: 'bg-blue-100' }
            ].map(item => (
              <button 
                key={item.id}
                onClick={() => setScreen(item.id as any)}
                className="flex flex-col items-center gap-2"
              >
                <div className={`w-12 h-12 ${item.color} rounded-full flex items-center justify-center text-xl shadow-sm hover:scale-105 transition-transform`}>
                  {item.icon}
                </div>
                <span className="text-[10px] font-bold text-gray-500">{item.label}</span>
              </button>
            ))}
          </div>

          {/* Today's Tasks (Glassmorphism) */}
          <section className="bg-white/40 backdrop-blur-md border border-white/20 rounded-[2.5rem] p-6 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold flex items-center gap-2">
                <span className="text-xl">😴</span> 今日待办
              </h3>
              <Plus className="w-5 h-5 text-gray-400" />
            </div>
            <div className="space-y-4">
              {tasks.map(task => (
                <div key={task.id} className="flex items-center gap-4">
                  <button 
                    onClick={() => toggleTask(task.id, task.status)}
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                      task.status === 'completed' ? 'bg-pink-500 border-pink-500' : 'border-pink-200'
                    }`}
                  >
                    {task.status === 'completed' && <CheckCircle2 className="w-4 h-4 text-white" />}
                  </button>
                  <div className="flex-1">
                    <h4 className={`text-sm font-bold ${task.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                      {task.title}
                    </h4>
                    <p className="text-[10px] text-gray-400">{task.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Smart Advice (Light Blue) */}
          <section className="bg-blue-50 rounded-[2rem] p-6 border border-blue-100">
            <ul className="space-y-2 text-sm font-medium text-blue-700">
              <li className="flex items-center gap-2">🌧️ 今天下雨，记得带伞</li>
              <li className="flex items-center gap-2">📚 距离数电考试还有15天</li>
              <li className="flex items-center gap-2">🏃 晚上没课，适合去乐跑</li>
            </ul>
          </section>

          {/* Pet Interaction (Light Yellow) */}
          {user.has_pet === 1 && (
            <section className="bg-yellow-50 rounded-[2.5rem] p-6 border border-yellow-100 flex items-center gap-4">
              <div className="w-16 h-16 bg-white rounded-full overflow-hidden border-2 border-white shadow-sm">
                <img src="https://picsum.photos/seed/dog/200" alt="pet" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-yellow-800">家里的{user.pet_name}想你啦！</h4>
                <p className="text-xs text-yellow-700 mt-1">妈妈晚上带我出去遛弯啦</p>
                <p className="text-[10px] text-yellow-600/60 mt-2">[图片：{user.pet_name}在撒欢]</p>
              </div>
            </section>
          )}
        </main>

        <BottomNav screen={screen} setScreen={setScreen} />

        {showOnboarding && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-8">
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-white rounded-[2.5rem] p-8 text-center max-w-sm">
              <div className="text-6xl mb-4">✨</div>
              <h3 className="text-2xl font-bold text-gray-800">欢迎来到XD Genie</h3>
              <p className="text-gray-500 mt-4 text-sm leading-relaxed">
                我是你的专属精灵，我会帮你同步课表、规划学习，还会帮你连接远方的家人和宠物。
              </p>
              <button onClick={() => setShowOnboarding(false)} className="w-full bg-pink-500 text-white font-bold py-4 rounded-2xl mt-8">开始探索</button>
            </motion.div>
          </div>
        )}
      </div>
    );
  }

  if (user && screen === 'timetable') {
    const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const filteredCourses = courses.filter(c => c.day_of_week === selectedDay).sort((a, b) => a.start_time.localeCompare(b.start_time));

    return (
      <div className={`min-h-screen ${isDarkMode ? 'bg-slate-900 text-gray-100' : 'bg-pink-50 text-gray-900'} font-sans pb-24`}>
        <header className="px-6 pt-8 pb-4 flex items-center justify-between sticky top-0 z-30 bg-inherit/80 backdrop-blur-md">
          <button onClick={() => setScreen('dashboard')} className="w-10 h-10 bg-white/50 rounded-full flex items-center justify-center shadow-sm">
            <ChevronRight className="w-5 h-5 text-pink-500 rotate-180" />
          </button>
          <h2 className="text-xl font-bold">我的课表</h2>
          <div className="w-10"></div>
        </header>

        <main className="px-6 mt-4">
          <div className="flex gap-2 mb-8 overflow-x-auto no-scrollbar">
            {days.map((day, i) => (
              <button 
                key={day}
                onClick={() => setSelectedDay(i)}
                className={`px-6 py-2 rounded-full text-xs font-bold transition-all shrink-0 ${i === selectedDay ? 'bg-pink-500 text-white shadow-lg shadow-pink-200' : 'bg-white text-gray-400'}`}
              >
                {day}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {filteredCourses.map((course, i) => (
              <motion.div 
                key={course.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-white/80 backdrop-blur-sm p-6 rounded-[2.5rem] shadow-sm border border-white/20 flex items-center gap-6"
              >
                <div className="flex flex-col items-center justify-center border-r border-pink-100 pr-6">
                  <span className="text-sm font-bold text-pink-500">{course.start_time}</span>
                  <div className="w-px h-4 bg-pink-100 my-1"></div>
                  <span className="text-[10px] text-gray-400">{course.end_time}</span>
                </div>
                <div className="flex-1">
                  <h4 className="text-lg font-bold text-gray-800">{course.name}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] bg-pink-50 text-pink-500 px-2 py-0.5 rounded-full font-bold">{course.location}</span>
                    <span className="text-[10px] text-gray-400">第 {i + 1} 节</span>
                  </div>
                </div>
                <div className="w-12 h-12 bg-pink-50 rounded-2xl flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-pink-400" />
                </div>
              </motion.div>
            ))}
            {filteredCourses.length === 0 && (
              <div className="text-center py-20">
                <div className="text-6xl mb-4">☕️</div>
                <p className="text-gray-400">今天没有课哦，休息一下吧</p>
              </div>
            )}
          </div>

          {selectedDay === 1 && (
            <section className="mt-12 bg-indigo-50 rounded-[2.5rem] p-8 border border-indigo-100">
              <h3 className="text-sm font-bold text-indigo-800 mb-4 flex items-center gap-2">
                <Sparkles className="w-4 h-4" /> Genie 的提醒
              </h3>
              <p className="text-sm text-indigo-700 leading-relaxed">
                周一的课程比较满哦，记得中午睡个午觉。操作系统和信号系统都是硬课，加油！
              </p>
            </section>
          )}
        </main>

        <BottomNav screen={screen} setScreen={setScreen} />
      </div>
    );
  }

  if (screen === 'study') {
    return (
      <div className="min-h-screen bg-pink-600 text-white p-8 flex flex-col items-center">
        <header className="w-full flex justify-between items-center mb-12">
          <h2 className="text-xl font-bold">学习模式</h2>
          <button className="p-2"><Plus className="w-6 h-6" /></button>
        </header>

        <div className="relative w-64 h-64 flex items-center justify-center mb-12">
          <motion.div 
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ repeat: Infinity, duration: 4 }}
            className="absolute inset-0 bg-pink-400/30 rounded-full blur-2xl"
          ></motion.div>
          <div className="w-full h-full border-4 border-pink-400 rounded-full flex flex-col items-center justify-center relative z-10">
            <span className="text-6xl font-bold font-mono tracking-tighter">25:00</span>
            <div className="text-4xl mt-4">🤓</div>
          </div>
        </div>

        <div className="text-center mb-12">
          <h3 className="text-2xl font-bold">数电 · 第4章 触发器</h3>
          <p className="text-pink-200 text-sm mt-2">预计完成时间：25分钟后</p>
        </div>

        <div className="w-full grid grid-cols-4 gap-4 mb-12">
          {[
            { id: 'lib', icon: '📚', label: '图书馆' },
            { id: 'cafe', icon: '☕', label: '咖啡厅' },
            { id: 'rain', icon: '🌧️', label: '雨声' },
            { id: 'fire', icon: '🔥', label: '篝火' }
          ].map(item => (
            <button key={item.id} className={`flex flex-col items-center gap-2 p-2 rounded-2xl ${item.id === 'lib' ? 'bg-pink-400' : 'bg-pink-500/50'}`}>
              <span className="text-2xl">{item.icon}</span>
              <span className="text-[8px] font-bold">{item.label}</span>
            </button>
          ))}
        </div>

        <div className="w-full space-y-4 mb-12">
          <div className="bg-pink-500/50 p-4 rounded-2xl flex justify-between items-center">
            <div className="flex items-center gap-3">
              <span className="text-xl">📱</span>
              <div>
                <p className="text-sm font-bold">已屏蔽4个应用</p>
                <p className="text-[10px] text-pink-200">抖音 · 微博 · 游戏 · 视频</p>
              </div>
            </div>
          </div>
          <div className="bg-pink-500/50 p-4 rounded-2xl">
            <p className="text-xs font-bold mb-2">好友在学习</p>
            <div className="space-y-2">
              <div className="flex justify-between text-[10px]">
                <span>张三 - 英语四级</span>
                <span className="text-pink-200">专注中</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span>李四 - 高数</span>
                <span className="text-pink-200">已专注1h</span>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full grid grid-cols-2 gap-4">
          <button onClick={() => setScreen('dashboard')} className="bg-white/20 py-4 rounded-3xl font-bold">暂停</button>
          <button onClick={() => {
            setShowFocusPopup(true);
            setScreen('dashboard');
          }} className="bg-white text-pink-600 py-4 rounded-3xl font-bold">完成</button>
        </div>

        {showFocusPopup && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-8">
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[3rem] p-8 text-center max-w-sm w-full">
              <div className="text-6xl mb-4">🎉</div>
              <h3 className="text-2xl font-bold text-gray-800">专注完成！</h3>
              <p className="text-gray-500 mt-2">你已经专注了25分钟，Genie为你感到骄傲！</p>
              <div className="mt-6 bg-pink-50 p-4 rounded-2xl flex items-center justify-between">
                <span className="text-pink-600 font-bold">获得勋章</span>
                <span className="text-2xl">🏅</span>
              </div>
              <button onClick={() => setShowFocusPopup(false)} className="w-full bg-pink-500 text-white font-bold py-4 rounded-2xl mt-8 shadow-lg">太棒了</button>
            </motion.div>
          </div>
        )}
      </div>
    );
  }

  if (screen === 'family') {
    return (
      <div className="min-h-screen bg-yellow-50 p-8 pb-24">
        <header className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold text-yellow-800">家庭</h2>
          <button className="bg-white px-4 py-2 rounded-2xl text-yellow-600 text-xs font-bold shadow-sm">+ 发布任务</button>
        </header>

        <div className="flex items-center gap-3 mb-8">
          <div className="text-3xl">👩‍🍳</div>
          <div className="bg-white px-4 py-2 rounded-2xl shadow-sm text-sm font-bold text-yellow-700">
            Genie：记得按时完成任务哦！
          </div>
        </div>

        <div className="space-y-6">
          <section>
            <h3 className="text-sm font-bold text-yellow-600 uppercase tracking-widest mb-4">待完成任务</h3>
            <div className="space-y-4">
              {tasks.filter(t => t.source === 'family' && t.status === 'pending').map(task => (
                <div key={task.id} className="bg-white p-6 rounded-[2.5rem] shadow-sm flex items-center gap-4">
                  <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center text-3xl">
                    {task.title.includes('苹果') ? '🍎' : '📋'}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-800">{task.title}</h4>
                    <p className="text-[10px] text-gray-400">来自家人</p>
                    <div className="flex gap-2 mt-3">
                      <button 
                        onClick={() => {
                          setCheckInTask(task);
                          setShowCheckIn(true);
                        }}
                        className="bg-yellow-500 text-white text-[10px] font-bold px-4 py-2 rounded-xl"
                      >
                        打卡
                      </button>
                      <button onClick={() => toggleTask(task.id, 'pending')} className="bg-gray-100 text-gray-400 text-[10px] font-bold px-4 py-2 rounded-xl">忽略</button>
                    </div>
                  </div>
                </div>
              ))}
              {tasks.filter(t => t.source === 'family' && t.status === 'pending').length === 0 && (
                <p className="text-center text-gray-400 text-xs py-8">暂无家庭任务</p>
              )}
            </div>
          </section>

          <section>
            <h3 className="text-sm font-bold text-yellow-600 uppercase tracking-widest mb-4">已完成任务</h3>
            <div className="space-y-4 opacity-50">
              <div className="bg-white/50 p-4 rounded-3xl border border-dashed border-yellow-200">
                <p className="text-sm font-bold text-gray-600">✓ 喝水打卡 昨天</p>
                <p className="text-[10px] text-yellow-600">妈妈点赞了 👍</p>
              </div>
            </div>
          </section>

          <section className="bg-white p-6 rounded-[2.5rem] shadow-sm">
            <h3 className="text-sm font-bold text-gray-800 mb-4">家庭日历</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">妈妈生日：12月25日</span>
                <span className="font-bold text-pink-500">还有15天</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">回家倒计时</span>
                <span className="font-bold text-yellow-600">25天</span>
              </div>
            </div>
          </section>
        </div>

        <BottomNav screen={screen} setScreen={setScreen} />

        {showCheckIn && (
          <div className="fixed inset-0 bg-black z-50 flex flex-col">
            <div className="flex-1 flex items-center justify-center relative">
              <div className="absolute top-8 left-8 right-8 flex justify-between items-center z-10">
                <button onClick={() => setShowCheckIn(false)} className="text-white"><Plus className="w-8 h-8 rotate-45" /></button>
                <div className="bg-white/20 backdrop-blur-md px-4 py-1 rounded-full text-white text-xs">打卡：{checkInTask?.title}</div>
                <div className="w-8"></div>
              </div>
              <div className="w-full h-full bg-gray-900 flex items-center justify-center">
                <div className="text-white text-center">
                  <div className="text-6xl mb-4">📷</div>
                  <p className="opacity-60">相机预览区域</p>
                </div>
              </div>
              <div className="absolute bottom-12 left-0 right-0 flex flex-col items-center gap-8">
                <div className="flex gap-12 items-center">
                  <div className="w-12 h-12 rounded-full border-2 border-white/30"></div>
                  <button onClick={() => {
                    if (checkInTask) toggleTask(checkInTask.id, 'pending');
                    setShowCheckIn(false);
                  }} className="w-20 h-20 bg-white rounded-full border-4 border-white/30 shadow-xl"></button>
                  <div className="w-12 h-12 rounded-full border-2 border-white/30"></div>
                </div>
                <p className="text-white/60 text-xs">Genie：拍一张漂亮的照片发给妈妈吧！</p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (screen === 'pet') {
    return (
      <div className="min-h-screen bg-yellow-50 p-8 pb-24">
        <header className="mb-8">
          <h2 className="text-2xl font-bold text-yellow-800">我的宠物</h2>
        </header>

        <div className="flex flex-col items-center mb-8">
          <div className="w-48 h-48 rounded-full overflow-hidden border-8 border-white shadow-xl">
            <img src="https://picsum.photos/seed/dog/400" alt="pet" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          </div>
          <h3 className="text-xl font-bold text-gray-800 mt-6">🐕 {user.pet_name || '大黄'} · 5岁 · 金毛</h3>
          <button onClick={() => setShowPetChat(true)} className="mt-4 bg-white px-6 py-2 rounded-full text-yellow-600 font-bold shadow-sm border border-yellow-100">和{user.pet_name}聊天</button>
        </div>

        {showPetChat && (
          <div className="fixed inset-0 bg-white z-50 flex flex-col">
            <header className="p-6 border-b flex items-center gap-4">
              <button onClick={() => setShowPetChat(false)}><ChevronRight className="w-6 h-6 rotate-180 text-gray-400" /></button>
              <h3 className="font-bold text-gray-800">与 {user.pet_name} 聊天中</h3>
            </header>
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-yellow-50/30">
              {petMessages.length === 0 && (
                <div className="text-center text-gray-400 text-xs mt-12">快和{user.pet_name}说句话吧！</div>
              )}
              {petMessages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] px-4 py-2 rounded-2xl ${m.role === 'user' ? 'bg-pink-500 text-white rounded-tr-none' : 'bg-white text-gray-800 rounded-tl-none shadow-sm'}`}>
                    {m.text}
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 bg-white border-t flex gap-2">
              <input 
                type="text" 
                value={petInput}
                onChange={(e) => setPetInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handlePetChat()}
                placeholder="输入消息..." 
                className="flex-1 bg-gray-50 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-pink-200"
              />
              <button onClick={handlePetChat} className="bg-pink-500 text-white px-6 rounded-2xl font-bold">发送</button>
            </div>
          </div>
        )}

        <div className="space-y-6">
          <section>
            <h3 className="text-sm font-bold text-yellow-600 uppercase tracking-widest mb-4">最新消息</h3>
            <div className="space-y-4">
              <div className="bg-white p-6 rounded-[2.5rem] shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-pink-100 rounded-full flex items-center justify-center text-xl">👩</div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-800">妈妈 10分钟前</h4>
                    <p className="text-xs text-gray-600">汪汪！今天出去玩了！</p>
                  </div>
                </div>
                <div className="w-full h-40 bg-gray-100 rounded-2xl overflow-hidden mb-3">
                  <img src="https://picsum.photos/seed/dogrun/400/200" alt="run" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
                <div className="flex gap-4 text-xs text-gray-400">
                  <span className="flex items-center gap-1">❤️ 12</span>
                  <span className="flex items-center gap-1">💬 3</span>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-sm font-bold text-yellow-600 uppercase tracking-widest mb-4">家庭相册</h3>
            <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="w-24 h-24 bg-white rounded-2xl overflow-hidden shrink-0 shadow-sm">
                  <img src={`https://picsum.photos/seed/pet${i}/200`} alt="album" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
              ))}
              <button className="w-24 h-24 bg-white rounded-2xl flex items-center justify-center text-gray-300 shrink-0 shadow-sm">
                <ChevronRight className="w-8 h-8" />
              </button>
            </div>
          </section>
        </div>

        <BottomNav screen={screen} setScreen={setScreen} />
      </div>
    );
  }

  if (screen === 'profile') {
    return (
      <div className="min-h-screen bg-pink-50 p-8 pb-24">
        <header className="mb-12">
          <h2 className="text-2xl font-bold text-pink-600">我的</h2>
        </header>

        <div className="flex flex-col items-center mb-12">
          <div className="w-24 h-24 bg-white rounded-full p-1 shadow-lg mb-4">
            <div className="w-full h-full bg-pink-200 rounded-full flex items-center justify-center text-5xl">👨‍🎓</div>
          </div>
          <div className="text-center">
            <h3 className="text-xl font-bold text-gray-800 flex items-center justify-center gap-2">
              {user.name.split(' ')[1] || user.name} <span className="text-2xl">🐱</span>
            </h3>
            <p className="text-sm text-gray-500 mt-1">大二 · {user.college || '电子工程'}</p>
            <p className="text-[10px] text-gray-400 mt-1">📍 西安 · 来自湖南</p>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-12">
          {[
            { value: user.focus_hours, label: '专注小时' },
            { value: user.tasks_completed, label: '任务完成' },
            { value: user.medals_count, label: '勋章获得' },
            { value: user.consecutive_days, label: '连续天数' }
          ].map((stat, i) => (
            <div key={i} className="bg-white p-3 rounded-2xl shadow-sm text-center">
              <p className="text-lg font-bold text-pink-500">{stat.value}</p>
              <p className="text-[8px] font-bold text-gray-400 uppercase">{stat.label}</p>
            </div>
          ))}
        </div>

        <section className="mb-12">
          <h3 className="text-xs font-bold text-pink-400 uppercase tracking-widest mb-4">成就墙</h3>
          <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
            {['专注达人', '早起鸟', '学霸', '爱心大使', '运动健将', '社交达人'].map((medal, i) => (
              <div key={i} className="flex flex-col items-center gap-2 shrink-0">
                <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center text-2xl shadow-sm">🏅</div>
                <span className="text-[8px] font-bold text-gray-500">{medal}</span>
              </div>
            ))}
          </div>
        </section>

        <div className="bg-white rounded-[2.5rem] shadow-sm overflow-hidden">
          {[
            '账号安全', '通知设置', '隐私设置', '绑定家人', '关于我们'
          ].map((item, i) => (
            <button key={i} className="w-full px-8 py-5 flex justify-between items-center border-b border-gray-50 last:border-none hover:bg-pink-50 transition-colors">
              <span className="text-sm font-bold text-gray-700">{item}</span>
              <ChevronRight className="w-4 h-4 text-gray-300" />
            </button>
          ))}
        </div>

        <div className="mt-8 flex justify-center">
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="bg-white p-2 rounded-full shadow-md flex items-center gap-4"
          >
            <div className={`p-2 rounded-full ${!isDarkMode ? 'bg-pink-500 text-white' : 'text-gray-400'}`}><CloudSun className="w-5 h-5" /></div>
            <div className={`p-2 rounded-full ${isDarkMode ? 'bg-pink-500 text-white' : 'text-gray-400'}`}><Clock className="w-5 h-5" /></div>
          </button>
        </div>

        <BottomNav screen={screen} setScreen={setScreen} />
      </div>
    );
  }
}

function BottomNav({ screen, setScreen }: { screen: string, setScreen: (s: any) => void }) {
  return (
    <nav className="fixed bottom-6 left-6 right-6 bg-white/80 backdrop-blur-xl border border-white/20 rounded-[2.5rem] p-3 shadow-2xl flex justify-around items-center z-40">
      <button 
        onClick={() => setScreen('dashboard')}
        className={`p-3 rounded-2xl transition-all hover:scale-110 ${screen === 'dashboard' ? 'bg-pink-500 text-white shadow-lg shadow-pink-200' : 'text-gray-400'}`}
      >
        <Home className="w-6 h-6" />
      </button>
      <button 
        onClick={() => setScreen('timetable')}
        className={`p-3 rounded-2xl transition-all hover:scale-110 ${screen === 'timetable' ? 'bg-pink-500 text-white shadow-lg shadow-pink-200' : 'text-gray-400'}`}
      >
        <Calendar className="w-6 h-6" />
      </button>
      <button 
        onClick={() => setScreen('study')}
        className={`p-3 rounded-2xl transition-all hover:scale-110 ${screen === 'study' ? 'bg-pink-500 text-white shadow-lg shadow-pink-200' : 'text-gray-400'}`}
      >
        <BookOpen className="w-6 h-6" />
      </button>
      <button 
        onClick={() => setScreen('family')}
        className={`p-3 rounded-2xl transition-all hover:scale-110 ${screen === 'family' ? 'bg-pink-500 text-white shadow-lg shadow-pink-200' : 'text-gray-400'}`}
      >
        <Heart className="w-6 h-6" />
      </button>
      <button 
        onClick={() => setScreen('profile')}
        className={`p-3 rounded-2xl transition-all hover:scale-110 ${screen === 'profile' ? 'bg-pink-500 text-white shadow-lg shadow-pink-200' : 'text-gray-400'}`}
      >
        <User className="w-6 h-6" />
      </button>
    </nav>
  );
}
