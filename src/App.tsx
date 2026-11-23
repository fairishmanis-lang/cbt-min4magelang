import React, { useState, useEffect, useMemo } from 'react';
import {
  BookOpen,
  FolderPlus,
  Folder,
  FileText,
  Users,
  CheckCircle2,
  Clock,
  LogOut,
  Plus,
  Trash2,
  Edit3,
  Printer,
  Search,
  Award,
  Layers,
  AlertCircle,
  Sparkles,
  Image as ImageIcon,
  Save,
  X,
  ChevronRight,
  School
} from 'lucide-react';

// ==========================================
// 1. TIPE DATA & KONFIGURASI AWAL
// ==========================================
type Role = 'admin' | 'teacher' | 'student';

interface SchoolIdentity {
  name: string;
  npsn: string;
  address: string;
  headmaster: string;
  academicYear: string;
  logoText: string;
}

interface ClassRoom {
  id: string;
  name: string; // Contoh: "VII A", "VIII B"
  grade: string; // Contoh: "Kelas 7", "Kelas 8"
}

interface UserAccount {
  id: string;
  username: string;
  password: string;
  name: string;
  role: Role;
  classId?: string;
}

interface QuestionFolder {
  id: string;
  title: string; // Nama Folder Soal baru, misal: "UH 1 Fiqih - Bab Thaharah"
  subject: string;
  targetClasses: string[];
  description?: string;
  createdBy: string;
  createdAt: string;
}

interface QuestionOption {
  label: 'A' | 'B' | 'C' | 'D';
  text: string;
  imageUrl?: string;
}

interface QuestionItem {
  id: string;
  folderId: string; // Mengikat soal ke Folder Soal tertentu
  type: 'multiple_choice' | 'essay';
  prompt: string;
  promptImage?: string;
  options: QuestionOption[];
  correctAnswer: 'A' | 'B' | 'C' | 'D' | string;
  points: number;
  isArabic?: boolean;
}

interface ExamSchedule {
  id: string;
  title: string;
  subject: string;
  folderIds: string[]; // Bisa mengambil dari satu atau beberapa Folder Soal
  classIds: string[]; // Multi-kelas
  durationMinutes: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

interface StudentSubmission {
  id: string;
  examId: string;
  studentId: string;
  studentName: string;
  className: string;
  answers: Record<string, string>;
  score: number;
  maxScore: number;
  submittedAt: string;
}

const DEFAULT_SCHOOL: SchoolIdentity = {
  name: 'MIN 4 MAGELANG',
  npsn: '60713604',
  address: 'Jl. Pendidikan No. 4, Kabupaten Magelang, Jawa Tengah',
  headmaster: 'Kepala Madrasah MIN 4 Magelang',
  academicYear: '2026/2027',
  logoText: 'M4M'
};

const INITIAL_CLASSES: ClassRoom[] = [
  { id: 'cls-1', name: '4A', grade: 'Kelas 4' },
  { id: 'cls-2', name: '4B', grade: 'Kelas 4' },
  { id: 'cls-3', name: '5A', grade: 'Kelas 5' },
  { id: 'cls-4', name: '6A', grade: 'Kelas 6' }
];

const INITIAL_USERS: UserAccount[] = [
  { id: 'u-admin', username: 'admin', password: '123', name: 'Administrator CBT', role: 'admin' },
  { id: 'u-guru1', username: 'guru', password: '123', name: 'Ustadz Ahmad Fauzi, S.Pd.', role: 'teacher' },
  { id: 'u-siswa1', username: 'siswa1', password: '123', name: 'Muhammad Rizky', role: 'student', classId: 'cls-4' },
  { id: 'u-siswa2', username: 'siswa2', password: '123', name: 'Aisyah Zahra', role: 'student', classId: 'cls-4' }
];

const INITIAL_FOLDERS: QuestionFolder[] = [
  {
    id: 'fld-sample-1',
    title: 'Latihan Awal - Al-Qur’an Hadits (Contoh)',
    subject: 'Al-Qur’an Hadits',
    targetClasses: ['cls-4'],
    description: 'Folder contoh bawaan. Saat membuat soal baru, sistem akan membuat folder terpisah.',
    createdBy: 'Ustadz Ahmad Fauzi, S.Pd.',
    createdAt: '2026-11-01'
  }
];

const INITIAL_QUESTIONS: QuestionItem[] = [
  {
    id: 'q-sample-1',
    folderId: 'fld-sample-1',
    type: 'multiple_choice',
    prompt: 'Apa arti dari kata "Al-Falaq" secara bahasa?',
    options: [
      { label: 'A', text: 'Waktu subuh / fajar menyingsing' },
      { label: 'B', text: 'Manusia' },
      { label: 'C', text: 'Pertolongan' },
      { label: 'D', text: 'Matahari terbit' }
    ],
    correctAnswer: 'A',
    points: 10
  }
];

const INITIAL_EXAMS: ExamSchedule[] = [
  {
    id: 'ex-1',
    title: 'Penilaian Harian Al-Qur’an Hadits',
    subject: 'Al-Qur’an Hadits',
    folderIds: ['fld-sample-1'],
    classIds: ['cls-4'],
    durationMinutes: 45,
    startTime: '2026-11-23T07:30',
    endTime: '2026-11-25T23:59',
    isActive: true
  }
];

const STORAGE_KEYS = {
  SCHOOL: 'cbt_m4m_school_v2',
  CLASSES: 'cbt_m4m_classes_v2',
  USERS: 'cbt_m4m_users_v2',
  FOLDERS: 'cbt_m4m_folders_v2',
  QUESTIONS: 'cbt_m4m_questions_v2',
  EXAMS: 'cbt_m4m_exams_v2',
  SUBMISSIONS: 'cbt_m4m_submissions_v2'
};

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

// ==========================================
// 2. KOMPONEN KOP SURAT RESMI
// ==========================================
const KopSurat: React.FC<{ school: SchoolIdentity; subtitle: string }> = ({ school, subtitle }) => (
  <div className="border-b-4 border-double border-emerald-900 pb-4 mb-6 text-center print:block">
    <div className="flex items-center justify-center gap-4">
      <div className="w-14 h-14 rounded-full bg-emerald-800 text-white flex items-center justify-center font-bold text-lg shrink-0">
        {school.logoText}
      </div>
      <div>
        <p className="text-xs font-semibold tracking-wider uppercase text-emerald-700">
          Kementerian Agama Republik Indonesia
        </p>
        <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 uppercase">
          {school.name}
        </h1>
        <p className="text-xs text-slate-600">
          {school.address} • NPSN: {school.npsn} • Tahun Pelajaran {school.academicYear}
        </p>
      </div>
    </div>
    <div className="mt-3 pt-2 border-t border-slate-200">
      <p className="text-sm font-bold uppercase tracking-wide text-emerald-900">{subtitle}</p>
    </div>
  </div>
);

// ==========================================
// 3. APLIKASI UTAMA
// ==========================================
export function App() {
  const [school, setSchool] = useState<SchoolIdentity>(() => loadFromStorage(STORAGE_KEYS.SCHOOL, DEFAULT_SCHOOL));
  const [classes, setClasses] = useState<ClassRoom[]>(() => loadFromStorage(STORAGE_KEYS.CLASSES, INITIAL_CLASSES));
  const [users, setUsers] = useState<UserAccount[]>(() => loadFromStorage(STORAGE_KEYS.USERS, INITIAL_USERS));
  const [folders, setFolders] = useState<QuestionFolder[]>(() => loadFromStorage(STORAGE_KEYS.FOLDERS, INITIAL_FOLDERS));
  const [questions, setQuestions] = useState<QuestionItem[]>(() => loadFromStorage(STORAGE_KEYS.QUESTIONS, INITIAL_QUESTIONS));
  const [exams, setExams] = useState<ExamSchedule[]>(() => loadFromStorage(STORAGE_KEYS.EXAMS, INITIAL_EXAMS));
  const [submissions, setSubmissions] = useState<StudentSubmission[]>(() => loadFromStorage(STORAGE_KEYS.SUBMISSIONS, []));

  // State Login (Selalu kosong saat pertama kali dibuka)
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');

  // Navigasi Menu
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'folders_builder' | 'bank_soal' | 'exams' | 'classes' | 'users' | 'results' | 'school'
  >('dashboard');

  // Persistensi ke localStorage
  useEffect(() => localStorage.setItem(STORAGE_KEYS.SCHOOL, JSON.stringify(school)), [school]);
  useEffect(() => localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(classes)), [classes]);
  useEffect(() => localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users)), [users]);
  useEffect(() => localStorage.setItem(STORAGE_KEYS.FOLDERS, JSON.stringify(folders)), [folders]);
  useEffect(() => localStorage.setItem(STORAGE_KEYS.QUESTIONS, JSON.stringify(questions)), [questions]);
  useEffect(() => localStorage.setItem(STORAGE_KEYS.EXAMS, JSON.stringify(exams)), [exams]);
  useEffect(() => localStorage.setItem(STORAGE_KEYS.SUBMISSIONS, JSON.stringify(submissions)), [submissions]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const found = users.find(
      (u) => u.username.trim().toLowerCase() === usernameInput.trim().toLowerCase() && u.password === passwordInput
    );
    if (!found) {
      setLoginError('Username atau password tidak sesuai.');
      return;
    }
    setCurrentUser(found);
    setLoginError('');
    setUsernameInput('');
    setPasswordInput('');
    setActiveTab(found.role === 'student' ? 'exams' : 'folders_builder');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setUsernameInput('');
    setPasswordInput('');
  };

  // ==========================================
  // HALAMAN LOGIN
  // ==========================================
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-emerald-900 to-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-emerald-800 p-6 text-white text-center">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-white/15 flex items-center justify-center font-extrabold text-2xl mb-3">
              {school.logoText}
            </div>
            <h1 className="text-xl font-bold">CBT {school.name}</h1>
            <p className="text-emerald-100 text-xs mt-1">Computer Based Test • TP {school.academicYear}</p>
          </div>

          <form onSubmit={handleLogin} className="p-6 space-y-4" autoComplete="off">
            {loginError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Username / NIS / NIP</label>
              <input
                type="text"
                name="cbt_login_user"
                autoComplete="off"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                placeholder="Masukkan username Anda"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <input
                type="password"
                name="cbt_login_pass"
                autoComplete="new-password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Masukkan password Anda"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold transition shadow-lg shadow-emerald-900/20"
            >
              Masuk ke Sistem CBT
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ==========================================
  // LAYOUT UTAMA SETELAH LOGIN
  // ==========================================
  const navItems: { id: typeof activeTab; label: string; icon: React.ReactNode; roles: Role[] }[] = [
    { id: 'dashboard', label: 'Ringkasan', icon: <Award className="w-4 h-4" />, roles: ['admin', 'teacher'] },
    { id: 'folders_builder', label: 'Buat Folder & Soal Baru', icon: <FolderPlus className="w-4 h-4" />, roles: ['admin', 'teacher'] },
    { id: 'bank_soal', label: 'Kelola Folder Soal', icon: <Folder className="w-4 h-4" />, roles: ['admin', 'teacher'] },
    { id: 'exams', label: currentUser.role === 'student' ? 'Daftar Ujian' : 'Jadwal Ujian', icon: <Clock className="w-4 h-4" />, roles: ['admin', 'teacher', 'student'] },
    { id: 'results', label: 'Hasil & Rekap Nilai', icon: <FileText className="w-4 h-4" />, roles: ['admin', 'teacher', 'student'] },
    { id: 'classes', label: 'Data Kelas', icon: <Layers className="w-4 h-4" />, roles: ['admin'] },
    { id: 'users', label: 'Akun Pengguna', icon: <Users className="w-4 h-4" />, roles: ['admin'] },
    { id: 'school', label: 'Identitas Madrasah', icon: <School className="w-4 h-4" />, roles: ['admin'] }
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-emerald-950 text-white flex flex-col shrink-0 print:hidden">
        <div className="p-5 border-b border-emerald-800/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center font-bold">
              {school.logoText}
            </div>
            <div>
              <h2 className="font-bold text-sm leading-tight">{school.name}</h2>
              <p className="text-[11px] text-emerald-300 uppercase">{currentUser.role}</p>
            </div>
          </div>
          <p className="text-xs text-emerald-100/80 mt-3 truncate">{currentUser.name}</p>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems
            .filter((item) => item.roles.includes(currentUser.role))
            .map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
                  activeTab === item.id
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-emerald-100/80 hover:bg-emerald-900/70 hover:text-white'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
        </nav>

        <div className="p-3 border-t border-emerald-800/70">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-red-600/20 hover:bg-red-600 text-red-200 hover:text-white text-sm font-medium transition"
          >
            <LogOut className="w-4 h-4" />
            <span>Keluar</span>
          </button>
        </div>
      </aside>

      {/* Konten Utama */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        {activeTab === 'dashboard' && (
          <DashboardView
            folders={folders}
            questions={questions}
            exams={exams}
            submissions={submissions}
            classes={classes}
          />
        )}

        {activeTab === 'folders_builder' && (
          <NewQuestionFolderBuilderView
            classes={classes}
            currentUser={currentUser}
            onCreateFolderWithQuestions={(newFolder, newQuestions) => {
              setFolders((prev) => [newFolder, ...prev]);
              setQuestions((prev) => [...newQuestions, ...prev]);
              setActiveTab('bank_soal');
            }}
          />
        )}

        {activeTab === 'bank_soal' && (
          <QuestionFolderManagerView
            folders={folders}
            questions={questions}
            classes={classes}
            onRenameFolder={(folderId, newTitle, newSubject) => {
              setFolders((prev) =>
                prev.map((f) => (f.id === folderId ? { ...f, title: newTitle, subject: newSubject } : f))
              );
            }}
            onDeleteFolder={(folderId) => {
              setFolders((prev) => prev.filter((f) => f.id !== folderId));
              setQuestions((prev) => prev.filter((q) => q.folderId !== folderId));
            }}
            onAddQuestionToFolder={(q) => setQuestions((prev) => [q, ...prev])}
            onDeleteQuestion={(qId) => setQuestions((prev) => prev.filter((q) => q.id !== qId))}
          />
        )}

        {activeTab === 'exams' && (
          <ExamsView
            currentUser={currentUser}
            classes={classes}
            folders={folders}
            questions={questions}
            exams={exams}
            submissions={submissions}
            onCreateExam={(ex) => setExams((prev) => [ex, ...prev])}
            onToggleExam={(id) =>
              setExams((prev) => prev.map((e) => (e.id === id ? { ...e, isActive: !e.isActive } : e)))
            }
            onDeleteExam={(id) => setExams((prev) => prev.filter((e) => e.id !== id))}
            onSubmitExam={(sub) => setSubmissions((prev) => [sub, ...prev])}
          />
        )}

        {activeTab === 'results' && (
          <ResultsView
            school={school}
            currentUser={currentUser}
            classes={classes}
            exams={exams}
            submissions={submissions}
          />
        )}

        {activeTab === 'classes' && currentUser.role === 'admin' && (
          <ClassesManagerView
            classes={classes}
            onAddClass={(cls) => setClasses((prev) => [...prev, cls])}
            onDeleteClass={(id) => setClasses((prev) => prev.filter((c) => c.id !== id))}
          />
        )}

        {activeTab === 'users' && currentUser.role === 'admin' && (
          <UsersManagerView
            users={users}
            classes={classes}
            onAddUser={(u) => setUsers((prev) => [...prev, u])}
            onDeleteUser={(id) => setUsers((prev) => prev.filter((u) => u.id !== id))}
          />
        )}

        {activeTab === 'school' && currentUser.role === 'admin' && (
          <SchoolIdentityView school={school} onSave={setSchool} />
        )}
      </main>
    </div>
  );
}

// ==========================================
// 4. MODUL: BUAT FOLDER SOAL BARU (TIDAK DIGABUNG)
// ==========================================
interface DraftQuestion {
  tempId: string;
  type: 'multiple_choice' | 'essay';
  prompt: string;
  promptImage: string;
  options: QuestionOption[];
  correctAnswer: string;
  points: number;
  isArabic: boolean;
}

const createEmptyDraftQuestion = (): DraftQuestion => ({
  tempId: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  type: 'multiple_choice',
  prompt: '',
  promptImage: '',
  options: [
    { label: 'A', text: '', imageUrl: '' },
    { label: 'B', text: '', imageUrl: '' },
    { label: 'C', text: '', imageUrl: '' },
    { label: 'D', text: '', imageUrl: '' }
  ],
  correctAnswer: 'A',
  points: 10,
  isArabic: false
});

const NewQuestionFolderBuilderView: React.FC<{
  classes: ClassRoom[];
  currentUser: UserAccount;
  onCreateFolderWithQuestions: (folder: QuestionFolder, items: QuestionItem[]) => void;
}> = ({ classes, currentUser, onCreateFolderWithQuestions }) => {
  const [folderTitle, setFolderTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [drafts, setDrafts] = useState<DraftQuestion[]>([createEmptyDraftQuestion()]);
  const [errorMsg, setErrorMsg] = useState('');

  const toggleClass = (classId: string) => {
    setSelectedClasses((prev) =>
      prev.includes(classId) ? prev.filter((id) => id !== classId) : [...prev, classId]
    );
  };

  const addDraftQuestion = () => {
    setDrafts((prev) => [...prev, createEmptyDraftQuestion()]);
  };

  const removeDraftQuestion = (tempId: string) => {
    if (drafts.length === 1) return;
    setDrafts((prev) => prev.filter((d) => d.tempId !== tempId));
  };

  const updateDraft = (tempId: string, patch: Partial<DraftQuestion>) => {
    setDrafts((prev) => prev.map((d) => (d.tempId === tempId ? { ...d, ...patch } : d)));
  };

  const updateOption = (tempId: string, idx: number, field: 'text' | 'imageUrl', value: string) => {
    setDrafts((prev) =>
      prev.map((d) => {
        if (d.tempId !== tempId) return d;
        const nextOpts = [...d.options];
        nextOpts[idx] = { ...nextOpts[idx], [field]: value };
        return { ...d, options: nextOpts };
      })
    );
  };

  const insertSymbol = (tempId: string, symbol: string) => {
    const target = drafts.find((d) => d.tempId === tempId);
    if (!target) return;
    updateDraft(tempId, { prompt: `${target.prompt}${symbol}` });
  };

  const handleSaveNewFolder = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!folderTitle.trim()) {
      setErrorMsg('Nama Folder Soal baru wajib diisi agar tidak tercampur dengan soal lain.');
      return;
    }
    if (!subject.trim()) {
      setErrorMsg('Mata pelajaran wajib diisi.');
      return;
    }
    const validDrafts = drafts.filter((d) => d.prompt.trim().length > 0);
    if (validDrafts.length === 0) {
      setErrorMsg('Minimal isi 1 butir soal sebelum menyimpan folder baru.');
      return;
    }

    // Selalu membuat ID Folder Soal baru yang unik
    const newFolderId = `fld-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newFolder: QuestionFolder = {
      id: newFolderId,
      title: folderTitle.trim(),
      subject: subject.trim(),
      targetClasses: selectedClasses,
      description: description.trim() || undefined,
      createdBy: currentUser.name,
      createdAt: new Date().toISOString().slice(0, 10)
    };

    const builtQuestions: QuestionItem[] = validDrafts.map((d, index) => ({
      id: `q-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`,
      folderId: newFolderId,
      type: d.type,
      prompt: d.prompt.trim(),
      promptImage: d.promptImage.trim() || undefined,
      options: d.options,
      correctAnswer: d.correctAnswer,
      points: Number(d.points) || 10,
      isArabic: d.isArabic
    }));

    onCreateFolderWithQuestions(newFolder, builtQuestions);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Buat Folder Soal Baru</h1>
          <p className="text-sm text-slate-600">
            Setiap sesi pembuatan soal akan membuat <strong>Folder Soal baru</strong> tersendiri dan tidak digabung ke soal yang sudah ada.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold">
          <FolderPlus className="w-4 h-4" /> Mode Folder Terpisah Aktif
        </span>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSaveNewFolder} className="space-y-6">
        {/* Identitas Folder Soal Baru */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-emerald-800 font-bold border-b border-slate-100 pb-3">
            <Folder className="w-5 h-5" />
            <h2>1. Informasi Folder Soal Baru</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Nama Folder Soal Baru <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={folderTitle}
                onChange={(e) => setFolderTitle(e.target.value)}
                placeholder="Contoh: PAS Ganjil Fiqih Kelas 6 - Set A"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Mata Pelajaran <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Contoh: Fiqih / Matematika / Bahasa Arab"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Keterangan Folder (Opsional)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Catatan materi, BAB, atau paket soal"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Target Kelas (Bisa pilih lebih dari 1)</label>
            <div className="flex flex-wrap gap-2">
              {classes.map((cls) => {
                const active = selectedClasses.includes(cls.id);
                return (
                  <button
                    type="button"
                    key={cls.id}
                    onClick={() => toggleClass(cls.id)}
                    className={`px-3.5 py-1.5 rounded-xl text-sm font-medium border transition ${
                      active
                        ? 'bg-emerald-700 text-white border-emerald-700'
                        : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    {cls.name} ({cls.grade})
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Daftar Butir Soal di Dalam Folder Baru */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">
              2. Butir Soal untuk Folder Ini ({drafts.length} Soal)
            </h2>
            <button
              type="button"
              onClick={addDraftQuestion}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold text-sm border border-emerald-200"
            >
              <Plus className="w-4 h-4" /> Tambah Butir Soal
            </button>
          </div>

          {drafts.map((d, idx) => (
            <div key={d.tempId} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-emerald-900 text-white font-bold text-sm flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <select
                    value={d.type}
                    onChange={(e) => updateDraft(d.tempId, { type: e.target.value as 'multiple_choice' | 'essay' })}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm font-medium"
                  >
                    <option value="multiple_choice">Pilihan Ganda (A/B/C/D)</option>
                    <option value="essay">Uraian / Isian</option>
                  </select>

                  <label className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 bg-slate-100 px-2.5 py-1.5 rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      checked={d.isArabic}
                      onChange={(e) => updateDraft(d.tempId, { isArabic: e.target.checked })}
                    />
                    Teks Arab (RTL)
                  </label>
                </div>

                <div className="flex items-center gap-3">
                  <label className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
                    Bobot:
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={d.points}
                      onChange={(e) => updateDraft(d.tempId, { points: Number(e.target.value) })}
                      className="w-16 px-2 py-1 rounded-lg border border-slate-300 text-sm"
                    />
                  </label>

                  {drafts.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeDraftQuestion(d.tempId)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      title="Hapus butir soal"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Simbol cepat kimia/pecahan */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-slate-500 mr-1">Sisipkan simbol:</span>
                {['H₂O', 'CO₂', '½', '¾', '×', '÷', '≈', '≠', '°C'].map((sym) => (
                  <button
                    type="button"
                    key={sym}
                    onClick={() => insertSymbol(d.tempId, sym)}
                    className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium"
                  >
                    {sym}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Pertanyaan / Soal</label>
                <textarea
                  rows={3}
                  dir={d.isArabic ? 'rtl' : 'ltr'}
                  value={d.prompt}
                  onChange={(e) => updateDraft(d.tempId, { prompt: e.target.value })}
                  placeholder={d.isArabic ? 'اكتب السؤال هنا...' : 'Tuliskan pertanyaan soal di sini...'}
                  className={`w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-600 focus:outline-none ${
                    d.isArabic ? 'text-lg font-semibold' : ''
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1 flex items-center gap-1">
                  <ImageIcon className="w-3.5 h-3.5" /> URL Gambar Soal (Opsional)
                </label>
                <input
                  type="text"
                  value={d.promptImage}
                  onChange={(e) => updateDraft(d.tempId, { promptImage: e.target.value })}
                  placeholder="https://contoh.com/gambar-soal.png"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>

              {d.type === 'multiple_choice' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {d.options.map((opt, optIdx) => (
                    <div key={opt.label} className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-emerald-900">Opsi {opt.label}</span>
                        <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 cursor-pointer">
                          <input
                            type="radio"
                            name={`correct-${d.tempId}`}
                            checked={d.correctAnswer === opt.label}
                            onChange={() => updateDraft(d.tempId, { correctAnswer: opt.label })}
                          />
                          Kunci Jawaban
                        </label>
                      </div>
                      <input
                        type="text"
                        dir={d.isArabic ? 'rtl' : 'ltr'}
                        value={opt.text}
                        onChange={(e) => updateOption(d.tempId, optIdx, 'text', e.target.value)}
                        placeholder={`Isi jawaban ${opt.label}`}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-sm"
                      />
                      <input
                        type="text"
                        value={opt.imageUrl || ''}
                        onChange={(e) => updateOption(d.tempId, optIdx, 'imageUrl', e.target.value)}
                        placeholder={`URL gambar opsi ${opt.label} (opsional)`}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Kunci / Pedoman Jawaban Uraian</label>
                  <input
                    type="text"
                    value={d.correctAnswer}
                    onChange={(e) => updateDraft(d.tempId, { correctAnswer: e.target.value })}
                    placeholder="Kata kunci atau jawaban acuan"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold shadow-lg"
          >
            <Save className="w-5 h-5" />
            Simpan Sebagai Folder Soal Baru
          </button>
        </div>
      </form>
    </div>
  );
};

// ==========================================
// 5. MODUL: KELOLA FOLDER SOAL & ISI SOAL PER FOLDER
// ==========================================
const QuestionFolderManagerView: React.FC<{
  folders: QuestionFolder[];
  questions: QuestionItem[];
  classes: ClassRoom[];
  onRenameFolder: (folderId: string, title: string, subject: string) => void;
  onDeleteFolder: (folderId: string) => void;
  onAddQuestionToFolder: (q: QuestionItem) => void;
  onDeleteQuestion: (qId: string) => void;
}> = ({
  folders,
  questions,
  classes,
  onRenameFolder,
  onDeleteFolder,
  onAddQuestionToFolder,
  onDeleteQuestion
}) => {
  const [search, setSearch] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(folders[0]?.id || null);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editSubject, setEditSubject] = useState('');

  // Form tambah soal cepat ke folder yang sedang dibuka
  const [newPrompt, setNewPrompt] = useState('');
  const [optA, setOptA] = useState('');
  const [optB, setOptB] = useState('');
  const [optC, setOptC] = useState('');
  const [optD, setOptD] = useState('');
  const [correct, setCorrect] = useState<'A' | 'B' | 'C' | 'D'>('A');

  const filteredFolders = useMemo(
    () =>
      folders.filter(
        (f) =>
          f.title.toLowerCase().includes(search.toLowerCase()) ||
          f.subject.toLowerCase().includes(search.toLowerCase())
      ),
    [folders, search]
  );

  const activeFolder = folders.find((f) => f.id === selectedFolderId) || null;
  const folderQuestions = activeFolder ? questions.filter((q) => q.folderId === activeFolder.id) : [];

  const startEditFolder = (f: QuestionFolder) => {
    setEditingFolderId(f.id);
    setEditTitle(f.title);
    setEditSubject(f.subject);
  };

  const saveEditFolder = (id: string) => {
    if (!editTitle.trim() || !editSubject.trim()) return;
    onRenameFolder(id, editTitle.trim(), editSubject.trim());
    setEditingFolderId(null);
  };

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFolder || !newPrompt.trim()) return;
    const item: QuestionItem = {
      id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      folderId: activeFolder.id,
      type: 'multiple_choice',
      prompt: newPrompt.trim(),
      options: [
        { label: 'A', text: optA || 'Opsi A' },
        { label: 'B', text: optB || 'Opsi B' },
        { label: 'C', text: optC || 'Opsi C' },
        { label: 'D', text: optD || 'Opsi D' }
      ],
      correctAnswer: correct,
      points: 10
    };
    onAddQuestionToFolder(item);
    setNewPrompt('');
    setOptA('');
    setOptB('');
    setOptC('');
    setOptD('');
    setCorrect('A');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Kelola Folder Soal</h1>
          <p className="text-sm text-slate-600">
            Setiap kumpulan soal tersimpan rapi dalam folder terpisah. Klik folder untuk melihat atau menambah soal di dalamnya.
          </p>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama folder / mapel..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-300 text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Daftar Folder */}
        <div className="lg:col-span-5 space-y-3">
          {filteredFolders.map((f) => {
            const count = questions.filter((q) => q.folderId === f.id).length;
            const isSelected = activeFolder?.id === f.id;
            const classNames = classes
              .filter((c) => f.targetClasses.includes(c.id))
              .map((c) => c.name)
              .join(', ');

            return (
              <div
                key={f.id}
                onClick={() => setSelectedFolderId(f.id)}
                className={`p-4 rounded-2xl border cursor-pointer transition ${
                  isSelected
                    ? 'bg-emerald-50/80 border-emerald-600 shadow-sm'
                    : 'bg-white border-slate-200 hover:border-emerald-300'
                }`}
              >
                {editingFolderId === f.id ? (
                  <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-sm font-semibold"
                    />
                    <input
                      type="text"
                      value={editSubject}
                      onChange={(e) => setEditSubject(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => saveEditFolder(f.id)}
                        className="px-3 py-1 rounded-lg bg-emerald-700 text-white text-xs font-semibold"
                      >
                        Simpan
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingFolderId(null)}
                        className="px-3 py-1 rounded-lg bg-slate-200 text-slate-700 text-xs"
                      >
                        Batal
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5">
                        <Folder className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                        <div>
                          <h3 className="font-bold text-slate-900 text-sm">{f.title}</h3>
                          <p className="text-xs text-emerald-700 font-medium">{f.subject}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => startEditFolder(f)}
                          className="p-1.5 text-slate-500 hover:text-emerald-700 rounded-lg"
                          title="Ubah nama folder"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onDeleteFolder(f.id);
                            if (selectedFolderId === f.id) setSelectedFolderId(null);
                          }}
                          className="p-1.5 text-slate-500 hover:text-red-600 rounded-lg"
                          title="Hapus folder beserta isinya"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                      <span>
                        <strong>{count}</strong> soal • {classNames || 'Semua kelas'}
                      </span>
                      <span className="inline-flex items-center text-emerald-700 font-semibold">
                        Buka <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </>
                )}
              </div>
            );
          })}

          {filteredFolders.length === 0 && (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
              Belum ada folder soal yang cocok.
            </div>
          )}
        </div>

        {/* Isi Folder Terpilih */}
        <div className="lg:col-span-7">
          {activeFolder ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
              <div className="border-b border-slate-100 pb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                  Isi Folder Terpilih
                </span>
                <h2 className="text-xl font-bold text-slate-900 mt-0.5">{activeFolder.title}</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Mapel: {activeFolder.subject} • Dibuat oleh {activeFolder.createdBy} ({activeFolder.createdAt})
                </p>
                {activeFolder.description && (
                  <p className="text-sm text-slate-600 mt-2">{activeFolder.description}</p>
                )}
              </div>

              {/* Form tambah soal langsung ke folder ini */}
              <form onSubmit={handleQuickAdd} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <p className="text-xs font-bold uppercase text-slate-700">
                  + Tambah Soal ke Folder "{activeFolder.title}"
                </p>
                <input
                  type="text"
                  value={newPrompt}
                  onChange={(e) => setNewPrompt(e.target.value)}
                  placeholder="Tulis butir pertanyaan baru..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm"
                  required
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={optA}
                    onChange={(e) => setOptA(e.target.value)}
                    placeholder="Pilihan A"
                    className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
                  />
                  <input
                    type="text"
                    value={optB}
                    onChange={(e) => setOptB(e.target.value)}
                    placeholder="Pilihan B"
                    className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
                  />
                  <input
                    type="text"
                    value={optC}
                    onChange={(e) => setOptC(e.target.value)}
                    placeholder="Pilihan C"
                    className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
                  />
                  <input
                    type="text"
                    value={optD}
                    onChange={(e) => setOptD(e.target.value)}
                    placeholder="Pilihan D"
                    className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
                  />
                </div>
                <div className="flex items-center justify-between pt-1">
                  <label className="text-xs font-medium text-slate-700 flex items-center gap-2">
                    Kunci:
                    <select
                      value={correct}
                      onChange={(e) => setCorrect(e.target.value as 'A' | 'B' | 'C' | 'D')}
                      className="px-2 py-1 rounded border border-slate-300 bg-white text-xs font-bold"
                    >
                      <option value="A">A</option>
                      <option value="B">B</option>
                      <option value="C">C</option>
                      <option value="D">D</option>
                    </select>
                  </label>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold"
                  >
                    Tambahkan ke Folder Ini
                  </button>
                </div>
              </form>

              {/* List soal dalam folder */}
              <div className="space-y-3">
                {folderQuestions.map((q, idx) => (
                  <div key={q.id} className="p-4 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <p
                        dir={q.isArabic ? 'rtl' : 'ltr'}
                        className="font-semibold text-sm text-slate-900"
                      >
                        {idx + 1}. {q.prompt}
                      </p>
                      <button
                        type="button"
                        onClick={() => onDeleteQuestion(q.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    {q.promptImage && (
                      <img src={q.promptImage} alt="Gambar soal" className="max-h-36 rounded-lg border" />
                    )}
                    {q.type === 'multiple_choice' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
                        {q.options.map((o) => (
                          <div
                            key={o.label}
                            className={`px-2.5 py-1.5 rounded-lg border ${
                              q.correctAnswer === o.label
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold'
                                : 'bg-slate-50 border-slate-200 text-slate-700'
                            }`}
                          >
                            {o.label}. {o.text}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {folderQuestions.length === 0 && (
                  <p className="text-center text-sm text-slate-500 py-6">
                    Folder ini belum memiliki butir soal.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-slate-500">
              Pilih salah satu folder soal di sebelah kiri untuk melihat isinya.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 6. MODUL: JADWAL UJIAN & PORTAL UJIAN SISWA
// ==========================================
const ExamsView: React.FC<{
  currentUser: UserAccount;
  classes: ClassRoom[];
  folders: QuestionFolder[];
  questions: QuestionItem[];
  exams: ExamSchedule[];
  submissions: StudentSubmission[];
  onCreateExam: (ex: ExamSchedule) => void;
  onToggleExam: (id: string) => void;
  onDeleteExam: (id: string) => void;
  onSubmitExam: (sub: StudentSubmission) => void;
}> = ({
  currentUser,
  classes,
  folders,
  questions,
  exams,
  submissions,
  onCreateExam,
  onToggleExam,
  onDeleteExam,
  onSubmitExam
}) => {
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [selectedFolderIds, setSelectedFolderIds] = useState<string[]>([]);
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [duration, setDuration] = useState(60);

  // Mode mengerjakan ujian (Siswa)
  const [activeExam, setActiveExam] = useState<ExamSchedule | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const toggleFolder = (id: string) => {
    setSelectedFolderIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const toggleClass = (id: string) => {
    setSelectedClassIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleAddExam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || selectedFolderIds.length === 0 || selectedClassIds.length === 0) return;

    const newEx: ExamSchedule = {
      id: `ex-${Date.now()}`,
      title: title.trim(),
      subject: subject.trim() || 'Umum',
      folderIds: selectedFolderIds,
      classIds: selectedClassIds,
      durationMinutes: Number(duration) || 60,
      startTime: new Date().toISOString().slice(0, 16),
      endTime: '2026-12-31T23:59',
      isActive: true
    };
    onCreateExam(newEx);
    setTitle('');
    setSubject('');
    setSelectedFolderIds([]);
    setSelectedClassIds([]);
  };

  // Mengambil soal dari folder-folder yang dipilih pada jadwal ujian
  const examQuestions = useMemo(() => {
    if (!activeExam) return [];
    return questions.filter((q) => activeExam.folderIds.includes(q.folderId));
  }, [activeExam, questions]);

  const finishExam = () => {
    if (!activeExam) return;
    let score = 0;
    let maxScore = 0;

    examQuestions.forEach((q) => {
      maxScore += q.points;
      if (q.type === 'multiple_choice' && answers[q.id] === q.correctAnswer) {
        score += q.points;
      }
    });

    const studentClass = classes.find((c) => c.id === currentUser.classId)?.name || '-';
    onSubmitExam({
      id: `sub-${Date.now()}`,
      examId: activeExam.id,
      studentId: currentUser.id,
      studentName: currentUser.name,
      className: studentClass,
      answers,
      score,
      maxScore,
      submittedAt: new Date().toLocaleString('id-ID')
    });

    setActiveExam(null);
    setAnswers({});
  };

  if (activeExam) {
    return (
      <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">{activeExam.title}</h1>
            <p className="text-xs text-slate-500">
              {activeExam.subject} • Durasi {activeExam.durationMinutes} menit • {examQuestions.length} Soal
            </p>
          </div>
          <button
            type="button"
            onClick={() => setActiveExam(null)}
            className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-5">
          {examQuestions.map((q, idx) => (
            <div key={q.id} className="p-4 rounded-xl border border-slate-200 space-y-3">
              <p className="font-semibold text-slate-900" dir={q.isArabic ? 'rtl' : 'ltr'}>
                {idx + 1}. {q.prompt} <span className="text-xs text-slate-400">({q.points} poin)</span>
              </p>

              {q.type === 'multiple_choice' ? (
                <div className="space-y-2">
                  {q.options.map((opt) => (
                    <label
                      key={opt.label}
                      className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer text-sm ${
                        answers[q.id] === opt.label
                          ? 'bg-emerald-50 border-emerald-600 font-semibold'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name={`ans-${q.id}`}
                        checked={answers[q.id] === opt.label}
                        onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: opt.label }))}
                      />
                      <span>
                        {opt.label}. {opt.text}
                      </span>
                    </label>
                  ))}
                </div>
              ) : (
                <textarea
                  rows={3}
                  value={answers[q.id] || ''}
                  onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                  placeholder="Tulis jawaban uraian Anda..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                />
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={finishExam}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold"
          >
            <CheckCircle2 className="w-5 h-5" /> Kumpulkan Jawaban Ujian
          </button>
        </div>
      </div>
    );
  }

  const visibleExams =
    currentUser.role === 'student'
      ? exams.filter((e) => e.isActive && (!currentUser.classId || e.classIds.includes(currentUser.classId)))
      : exams;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          {currentUser.role === 'student' ? 'Ujian Tersedia' : 'Manajemen Jadwal Ujian'}
        </h1>
        <p className="text-sm text-slate-600">
          Hubungkan jadwal ujian langsung ke satu atau beberapa <strong>Folder Soal</strong>.
        </p>
      </div>

      {currentUser.role !== 'student' && (
        <form onSubmit={handleAddExam} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h2 className="font-bold text-slate-900">Buat Jadwal Ujian Baru</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nama Ujian (misal: UH 1 Fiqih)"
              className="px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
              required
            />
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Mata Pelajaran"
              className="px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
            />
            <input
              type="number"
              min={5}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              placeholder="Durasi (menit)"
              className="px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
            />
          </div>

          <div>
            <p className="text-xs font-bold text-slate-700 mb-2">Pilih Folder Soal:</p>
            <div className="flex flex-wrap gap-2">
              {folders.map((f) => (
                <button
                  type="button"
                  key={f.id}
                  onClick={() => toggleFolder(f.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium border ${
                    selectedFolderIds.includes(f.id)
                      ? 'bg-emerald-700 text-white border-emerald-700'
                      : 'bg-slate-50 text-slate-700 border-slate-300'
                  }`}
                >
                  {f.title}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-bold text-slate-700 mb-2">Pilih Kelas Peserta:</p>
            <div className="flex flex-wrap gap-2">
              {classes.map((c) => (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => toggleClass(c.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium border ${
                    selectedClassIds.includes(c.id)
                      ? 'bg-emerald-700 text-white border-emerald-700'
                      : 'bg-slate-50 text-slate-700 border-slate-300'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold"
          >
            Simpan Jadwal Ujian
          </button>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {visibleExams.map((ex) => {
          const alreadyDone = submissions.some((s) => s.examId === ex.id && s.studentId === currentUser.id);
          const totalQ = questions.filter((q) => ex.folderIds.includes(q.folderId)).length;
          const folderNames = folders
            .filter((f) => ex.folderIds.includes(f.id))
            .map((f) => f.title)
            .join(', ');

          return (
            <div key={ex.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span
                    className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                      ex.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {ex.isActive ? 'AKTIF' : 'DITUTUP'}
                  </span>
                  <h3 className="font-bold text-slate-900 text-base mt-1.5">{ex.title}</h3>
                  <p className="text-xs text-slate-500">
                    {ex.subject} • {ex.durationMinutes} menit • {totalQ} soal
                  </p>
                </div>

                {currentUser.role !== 'student' && (
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => onToggleExam(ex.id)}
                      className="px-2.5 py-1 rounded-lg border text-xs font-medium hover:bg-slate-50"
                    >
                      {ex.isActive ? 'Tutup' : 'Buka'}
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteExam(ex.id)}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl">
                <strong>Folder Soal:</strong> {folderNames || '-'}
              </p>

              {currentUser.role === 'student' && (
                <button
                  type="button"
                  disabled={alreadyDone || totalQ === 0}
                  onClick={() => setActiveExam(ex)}
                  className="w-full py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white text-sm font-bold"
                >
                  {alreadyDone ? 'Sudah Dikerjakan' : totalQ === 0 ? 'Soal Belum Tersedia' : 'Mulai Kerjakan'}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ==========================================
// 7. MODUL RINGKASAN, REKAP NILAI, KELAS, USER & IDENTITAS
// ==========================================
const DashboardView: React.FC<{
  folders: QuestionFolder[];
  questions: QuestionItem[];
  exams: ExamSchedule[];
  submissions: StudentSubmission[];
  classes: ClassRoom[];
}> = ({ folders, questions, exams, submissions, classes }) => (
  <div className="space-y-6">
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Ringkasan Sistem CBT</h1>
      <p className="text-sm text-slate-600">Pantauan folder soal terpisah, jadwal ujian, dan hasil pengerjaan siswa.</p>
    </div>

    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="bg-white p-5 rounded-2xl border border-slate-200">
        <p className="text-xs text-slate-500">Total Folder Soal</p>
        <p className="text-2xl font-extrabold text-emerald-800 mt-1">{folders.length}</p>
      </div>
      <div className="bg-white p-5 rounded-2xl border border-slate-200">
        <p className="text-xs text-slate-500">Total Butir Soal</p>
        <p className="text-2xl font-extrabold text-slate-900 mt-1">{questions.length}</p>
      </div>
      <div className="bg-white p-5 rounded-2xl border border-slate-200">
        <p className="text-xs text-slate-500">Jadwal Ujian</p>
        <p className="text-2xl font-extrabold text-slate-900 mt-1">{exams.length}</p>
      </div>
      <div className="bg-white p-5 rounded-2xl border border-slate-200">
        <p className="text-xs text-slate-500">Submisi Siswa ({classes.length} Kelas)</p>
        <p className="text-2xl font-extrabold text-slate-900 mt-1">{submissions.length}</p>
      </div>
    </div>
  </div>
);

const ResultsView: React.FC<{
  school: SchoolIdentity;
  currentUser: UserAccount;
  classes: ClassRoom[];
  exams: ExamSchedule[];
  submissions: StudentSubmission[];
}> = ({ school, currentUser, exams, submissions }) => {
  const rows =
    currentUser.role === 'student'
      ? submissions.filter((s) => s.studentId === currentUser.id)
      : submissions;

  return (
    <div className="space-y-6">
      <div className="flex justify-end print:hidden">
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-700 text-white text-sm font-semibold"
        >
          <Printer className="w-4 h-4" /> Cetak Rekap Nilai
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <KopSurat school={school} subtitle="Rekapitulasi Hasil Penilaian CBT" />

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-600">
                <th className="py-2.5 px-3">Nama Siswa</th>
                <th className="py-2.5 px-3">Kelas</th>
                <th className="py-2.5 px-3">Ujian</th>
                <th className="py-2.5 px-3">Nilai</th>
                <th className="py-2.5 px-3">Waktu</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const exTitle = exams.find((e) => e.id === r.examId)?.title || r.examId;
                return (
                  <tr key={r.id} className="border-b border-slate-100">
                    <td className="py-2.5 px-3 font-medium">{r.studentName}</td>
                    <td className="py-2.5 px-3">{r.className}</td>
                    <td className="py-2.5 px-3">{exTitle}</td>
                    <td className="py-2.5 px-3 font-bold text-emerald-800">
                      {r.score} / {r.maxScore}
                    </td>
                    <td className="py-2.5 px-3 text-xs text-slate-500">{r.submittedAt}</td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    Belum ada data nilai yang masuk.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const ClassesManagerView: React.FC<{
  classes: ClassRoom[];
  onAddClass: (c: ClassRoom) => void;
  onDeleteClass: (id: string) => void;
}> = ({ classes, onAddClass, onDeleteClass }) => {
  const [name, setName] = useState('');
  const [grade, setGrade] = useState('Kelas 4');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAddClass({ id: `cls-${Date.now()}`, name: name.trim(), grade });
    setName('');
  };

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Manajemen Kelas</h1>
      <form onSubmit={submit} className="bg-white p-5 rounded-2xl border border-slate-200 flex flex-wrap gap-3">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nama Rombel (misal: 5B)"
          className="px-3.5 py-2 rounded-xl border border-slate-300 text-sm flex-1"
          required
        />
        <input
          type="text"
          value={grade}
          onChange={(e) => setGrade(e.target.value)}
          placeholder="Jenjang Kelas"
          className="px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
        />
        <button type="submit" className="px-4 py-2 rounded-xl bg-emerald-700 text-white text-sm font-semibold">
          Tambah Kelas
        </button>
      </form>

      <div className="bg-white rounded-2xl border border-slate-200 divide-y">
        {classes.map((c) => (
          <div key={c.id} className="p-4 flex items-center justify-between">
            <div>
              <p className="font-bold text-sm">{c.name}</p>
              <p className="text-xs text-slate-500">{c.grade}</p>
            </div>
            <button onClick={() => onDeleteClass(c.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

const UsersManagerView: React.FC<{
  users: UserAccount[];
  classes: ClassRoom[];
  onAddUser: (u: UserAccount) => void;
  onDeleteUser: (id: string) => void;
}> = ({ users, classes, onAddUser, onDeleteUser }) => {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('student');
  const [classId, setClassId] = useState(classes[0]?.id || '');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !username.trim() || !password.trim()) return;
    onAddUser({
      id: `u-${Date.now()}`,
      name: name.trim(),
      username: username.trim(),
      password: password.trim(),
      role,
      classId: role === 'student' ? classId : undefined
    });
    setName('');
    setUsername('');
    setPassword('');
  };

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Akun Pengguna</h1>
      <form onSubmit={submit} className="bg-white p-5 rounded-2xl border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-3">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nama Lengkap"
          className="px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
          required
        />
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Username"
          className="px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
          required
        />
        <input
          type="text"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
          required
        />
        <div className="flex gap-2">
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            className="px-3 py-2 rounded-xl border border-slate-300 text-sm flex-1"
          >
            <option value="student">Siswa</option>
            <option value="teacher">Guru</option>
            <option value="admin">Admin</option>
          </select>
          {role === 'student' && (
            <select
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-300 text-sm"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
        </div>
        <button type="submit" className="md:col-span-2 py-2.5 rounded-xl bg-emerald-700 text-white text-sm font-semibold">
          Tambah Akun
        </button>
      </form>

      <div className="bg-white rounded-2xl border border-slate-200 divide-y">
        {users.map((u) => (
          <div key={u.id} className="p-4 flex items-center justify-between text-sm">
            <div>
              <p className="font-bold">{u.name}</p>
              <p className="text-xs text-slate-500">
                @{u.username} • Role: {u.role}
              </p>
            </div>
            {u.username !== 'admin' && (
              <button onClick={() => onDeleteUser(u.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const SchoolIdentityView: React.FC<{
  school: SchoolIdentity;
  onSave: (s: SchoolIdentity) => void;
}> = ({ school, onSave }) => {
  const [form, setForm] = useState(school);
  const [saved, setSaved] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Identitas Madrasah</h1>
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">Nama Madrasah</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">NPSN</label>
            <input
              type="text"
              value={form.npsn}
              onChange={(e) => setForm({ ...form, npsn: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Tahun Pelajaran</label>
            <input
              type="text"
              value={form.academicYear}
              onChange={(e) => setForm({ ...form, academicYear: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">Alamat</label>
          <input
            type="text"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
          />
        </div>
        <button type="submit" className="px-5 py-2.5 rounded-xl bg-emerald-700 text-white text-sm font-semibold">
          Simpan Identitas
        </button>
        {saved && <span className="ml-3 text-xs font-semibold text-emerald-700">Tersimpan!</span>}
      </form>
    </div>
  );
};

export default App;
