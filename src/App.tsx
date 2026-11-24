import React, { useState, useEffect, useMemo } from "react";
import {
  LayoutDashboard,
  Building2,
  Users,
  GraduationCap,
  School,
  BookOpen,
  Database,
  CalendarClock,
  UserCheck,
  Award,
  BarChart3,
  FileSpreadsheet,
  HardDriveDownload,
  Settings,
  FilePlus2,
  PlayCircle,
  History,
  ShieldCheck,
  LogOut,
  Menu,
  X,
  Plus,
  Trash2,
  Search,
  Upload,
  Download,
  Printer,
  Clock,
  ChevronLeft,
  ChevronRight,
  Flag,
  FileText,
  RefreshCw,
  Save,
  Copy,
  Pencil,
  FolderPlus,
  Folder,
  Lock
} from "lucide-react";

// ============================================================================
// KLIEN SUPABASE REST & AUTH (TANPA DEPENDENSI BUNDLER EKSTERNAL)
// ============================================================================
class SupabaseRestQueryBuilder {
  constructor(baseUrl, apiKey, table, sessionTokenRef, isPublicLookup = false) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.apiKey = apiKey;
    this.table = table;
    this.sessionTokenRef = sessionTokenRef;
    this.isPublicLookup = isPublicLookup;
    this.method = "GET";
    this.queryParams = [];
    this.bodyData = null;
    this.preferHeaders = [];
    this.singleMode = null;
  }
  getHeaders(extra = {}) {
    const token =
      !this.isPublicLookup && this.sessionTokenRef?.current?.access_token
        ? this.sessionTokenRef.current.access_token
        : this.apiKey;
    return {
      apikey: this.apiKey,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...extra
    };
  }
  select(columns = "*") {
    if (this.method === "GET") {
      this.queryParams.push(`select=${encodeURIComponent(columns)}`);
    } else {
      this.preferHeaders.push("return=representation");
    }
    return this;
  }
  eq(col, val) {
    this.queryParams.push(`${encodeURIComponent(col)}=eq.${encodeURIComponent(String(val))}`);
    return this;
  }
  in(col, vals) {
    const arr = Array.isArray(vals) ? vals : [];
    const formatted = arr.map((v) => `"${String(v).replace(/"/g, "")}"`).join(",");
    this.queryParams.push(`${encodeURIComponent(col)}=in.(${encodeURIComponent(formatted)})`);
    return this;
  }
  or(filterStr) {
    const parts = String(filterStr || "")
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => {
        const idx = p.indexOf(".eq.");
        if (idx === -1) return p;
        const field = p.slice(0, idx);
        const val = p.slice(idx + 4);
        return `${field}.eq.${encodeURIComponent(val)}`;
      });
    if (parts.length > 0) {
      this.queryParams.push(`or=(${parts.join(",")})`);
    }
    return this;
  }
  order(col, opts = {}) {
    const dir = opts.ascending === false ? "desc" : "asc";
    this.queryParams.push(`order=${encodeURIComponent(col)}.${dir}`);
    return this;
  }
  limit(n) {
    this.queryParams.push(`limit=${Number(n) || 1000}`);
    return this;
  }
  insert(rows) {
    this.method = "POST";
    this.bodyData = Array.isArray(rows) ? rows : [rows];
    this.preferHeaders.push("return=representation");
    return this;
  }
  update(values) {
    this.method = "PATCH";
    this.bodyData = values;
    this.preferHeaders.push("return=representation");
    return this;
  }
  upsert(rowOrRows) {
    this.method = "POST";
    this.bodyData = Array.isArray(rowOrRows) ? rowOrRows : [rowOrRows];
    this.preferHeaders.push("resolution=merge-duplicates", "return=representation");
    return this;
  }
  delete() {
    this.method = "DELETE";
    this.preferHeaders.push("return=representation");
    return this;
  }
  maybeSingle() {
    this.singleMode = "maybeSingle";
    this.limit(1);
    return this;
  }
  single() {
    this.singleMode = "single";
    this.limit(1);
    return this;
  }
  async execute() {
    try {
      const qs = this.queryParams.length > 0 ? `?${this.queryParams.join("&")}` : "";
      const url = `${this.baseUrl}/rest/v1/${this.table}${qs}`;
      const prefer = this.preferHeaders.length > 0 ? { Prefer: this.preferHeaders.join(",") } : {};
      const res = await fetch(url, {
        method: this.method,
        headers: this.getHeaders(prefer),
        body: this.bodyData ? JSON.stringify(this.bodyData) : undefined
      });
      const text = await res.text();
      let parsed = null;
      try {
        parsed = text ? JSON.parse(text) : null;
      } catch {
        parsed = text;
      }
      if (!res.ok) {
        const msg =
          parsed?.message || parsed?.error_description || parsed?.msg || `HTTP ${res.status}`;
        return { data: null, error: { message: msg } };
      }
      if (this.singleMode === "maybeSingle") {
        const arr = Array.isArray(parsed) ? parsed : [];
        return { data: arr[0] || null, error: null };
      }
      if (this.singleMode === "single") {
        const arr = Array.isArray(parsed) ? parsed : [];
        if (!arr[0]) {
          return { data: null, error: { message: "Data tidak ditemukan." } };
        }
        return { data: arr[0], error: null };
      }
      return { data: parsed, error: null };
    } catch (err) {
      return { data: null, error: { message: err?.message || "Kesalahan jaringan Supabase." } };
    }
  }
  then(resolve, reject) {
    return this.execute().then(resolve, reject);
  }
}

function createSupabaseClient(url, anonKey, options = {}) {
  const cleanUrl = String(url || "").trim().replace(/\/+$/, "");
  const cleanKey = String(anonKey || "").trim();
  const persist = options?.auth?.persistSession !== false;
  const storageKey = "cbt_min4_sb_session";
  const sessionRef = {
    current: persist
      ? (() => {
          try {
            const raw = localStorage.getItem(storageKey);
            return raw ? JSON.parse(raw) : null;
          } catch {
            return null;
          }
        })()
      : null
  };
  const saveSession = (sess) => {
    sessionRef.current = sess;
    if (persist) {
      try {
        if (sess) localStorage.setItem(storageKey, JSON.stringify(sess));
        else localStorage.removeItem(storageKey);
      } catch {
        // Abaikan error storage
      }
    }
  };
  return {
    from(table) {
      const publicLookup = table === "profiles" && !sessionRef.current?.access_token;
      return new SupabaseRestQueryBuilder(cleanUrl, cleanKey, table, sessionRef, publicLookup);
    },
    auth: {
      async getSession() {
        return { data: { session: sessionRef.current }, error: null };
      },
      async signUp({ email, password }) {
        try {
          const res = await fetch(`${cleanUrl}/auth/v1/signup`, {
            method: "POST",
            headers: {
              apikey: cleanKey,
              Authorization: `Bearer ${cleanKey}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ email, password })
          });
          const data = await res.json();
          if (!res.ok) {
            return {
              data: { user: null, session: null },
              error: { message: data?.msg || data?.error_description || "Gagal mendaftar akun." }
            };
          }
          const sess = data?.access_token ? data : data?.session || null;
          if (sess && persist) saveSession(sess);
          const userObj = data?.user || sess?.user || null;
          return { data: { user: userObj, session: sess }, error: null };
        } catch (err) {
          return { data: { user: null, session: null }, error: { message: err.message } };
        }
      },
      async signInWithPassword({ email, password }) {
        try {
          const res = await fetch(`${cleanUrl}/auth/v1/token?grant_type=password`, {
            method: "POST",
            headers: {
              apikey: cleanKey,
              Authorization: `Bearer ${cleanKey}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ email, password })
          });
          const data = await res.json();
          if (!res.ok) {
            return {
              data: { user: null, session: null },
              error: {
                message:
                  data?.error_description || data?.msg || "Email atau password tidak valid."
              }
            };
          }
          if (persist) saveSession(data);
          return { data: { user: data.user, session: data }, error: null };
        } catch (err) {
          return { data: { user: null, session: null }, error: { message: err.message } };
        }
      },
      async signOut() {
        try {
          if (sessionRef.current?.access_token) {
            await fetch(`${cleanUrl}/auth/v1/logout`, {
              method: "POST",
              headers: {
                apikey: cleanKey,
                Authorization: `Bearer ${sessionRef.current.access_token}`,
                "Content-Type": "application/json"
              }
            });
          }
        } catch {
          // Abaikan error saat logout
        }
        saveSession(null);
        return { error: null };
      }
    }
  };
}

// ============================================================================
// KONFIGURASI SUPABASE & TEMPLATE DOKUMEN TERPUSAT MIN 4 MAGELANG
// ============================================================================
const DEFAULT_SUPABASE_URL = "https://qlyajgeyuyjbjvsmcdjj.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY = "sb_publishable_Xpj_iUpn2C-hA0QlKOLmLg_GnXTJZ6k";
const DEFAULT_KOP_IMAGE_SRC = "/image_3fe900.png";
const DEFAULT_FOLDER_LABEL = "Bank Soal Utama";

const DEFAULT_SCHOOL_SETTINGS = {
  school_name: "MIN 4 MAGELANG",
  app_name: "CBT MIN 4 MAGELANG",
  subtitle: "Sistem Ujian Digital Madrasah Ibtidaiyah",
  nsm: "",
  npsn: "",
  principal_name: "",
  principal_nip: "",
  academic_year: "2026/2027",
  semester: "Ganjil",
  address: "Mlangen, Menoreh, Salaman, Kabupaten Magelang - 56162",
  phone: "085100503658",
  email: "min.mlangen@gmail.com",
  logo_base64: ""
};

const DEFAULT_DOCUMENT_SETTINGS = {
  kop_image: DEFAULT_KOP_IMAGE_SRC,
  use_kop_pdf: true,
  use_kop_excel: true,
  use_kop_word: true,
  paper_size: "A4",
  orientation: "portrait",
  margin_top_mm: 15,
  margin_bottom_mm: 15,
  margin_left_mm: 15,
  margin_right_mm: 15,
  show_footer: true,
  footer_text: "Dokumen Resmi CBT MIN 4 MAGELANG - Sistem Ujian Digital Madrasah Ibtidaiyah",
  show_page_number: true,
  show_print_date: true
};

const DEFAULT_GRADING_FORMULA = {
  weight_mode: "EQUAL_PER_QUESTION",
  pg_kompleks_mode: "STRICT",
  isian_mode: "CASE_INSENSITIVE",
  rounding_mode: "2_DECIMALS",
  max_score: 100,
  kkm: 75
};

const SQL_SCHEMA_SCRIPT = `-- Jalankan di SQL Editor Supabase
create extension if not exists "pgcrypto";
create table if not exists public.school_settings (id text primary key, data jsonb not null default '{}'::jsonb, updated_at timestamptz not null default now());
create table if not exists public.profiles (id uuid primary key, full_name text not null, username text unique not null, email text unique not null, nisn text, nip text, role text not null check (role in ('ADMIN', 'GURU', 'SISWA')), is_active boolean not null default true, is_simulation boolean not null default false, created_at timestamptz not null default now());
create table if not exists public.classes (id uuid primary key default gen_random_uuid(), name text not null, grade_level text not null, is_simulation boolean not null default false, created_at timestamptz not null default now());
create table if not exists public.subjects (id uuid primary key default gen_random_uuid(), code text not null, name text not null, is_simulation boolean not null default false, created_at timestamptz not null default now());
create table if not exists public.teachers (id uuid primary key default gen_random_uuid(), full_name text not null, nip text, username text not null, subject_id uuid references public.subjects(id) on delete set null, is_active boolean not null default true, is_simulation boolean not null default false, created_at timestamptz not null default now());
create table if not exists public.students (id uuid primary key default gen_random_uuid(), nis text, nisn text, full_name text not null, class_id uuid references public.classes(id) on delete restrict, username text not null, password text, is_active boolean not null default true, is_simulation boolean not null default false, created_at timestamptz not null default now());
create table if not exists public.questions (id uuid primary key default gen_random_uuid(), created_by uuid references auth.users(id), subject_id uuid references public.subjects(id) on delete set null, folder_name text, topic text, type text not null, question_text text not null, options jsonb not null default '[]'::jsonb, correct_answer text not null, weight numeric not null default 1, is_verified boolean not null default true, is_simulation boolean not null default false, created_at timestamptz not null default now());
alter table if exists public.questions add column if not exists folder_name text;
create table if not exists public.exams (id uuid primary key default gen_random_uuid(), created_by uuid references auth.users(id), title text not null, subject_id uuid references public.subjects(id) on delete set null, class_id text, exam_date text, start_time text, end_time text, duration_minutes integer not null default 60, instructions text, question_ids jsonb not null default '[]'::jsonb, status text not null default 'AKTIF', show_result_to_student boolean not null default true, is_simulation boolean not null default false, created_at timestamptz not null default now());
create table if not exists public.exam_participants (id uuid primary key default gen_random_uuid(), exam_id uuid references public.exams(id) on delete cascade, student_id uuid, student_name text not null, nis text, nisn text, class_id uuid, is_eligible boolean not null default true, is_simulation boolean not null default false, created_at timestamptz not null default now());
create table if not exists public.exam_attempts (id uuid primary key default gen_random_uuid(), exam_id uuid references public.exams(id) on delete cascade, student_id text not null, student_name text not null, answers jsonb not null default '{}'::jsonb, status text not null default 'SELESAI', is_simulation boolean not null default false, submitted_at timestamptz not null default now());
create table if not exists public.student_answers (id text primary key, exam_id uuid references public.exams(id) on delete cascade, student_id text not null, question_id uuid references public.questions(id) on delete cascade, answer text, is_simulation boolean not null default false, updated_at timestamptz not null default now());
create table if not exists public.exam_results (id text primary key, exam_id uuid references public.exams(id) on delete cascade, exam_title text, student_id text not null, student_name text not null, score numeric not null default 0, correct_count integer not null default 0, wrong_count integer not null default 0, empty_count integer not null default 0, is_simulation boolean not null default false, updated_at timestamptz not null default now());`;

const MENU_CONFIG = {
  ADMIN: [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "school_identity", label: "Identitas Madrasah", icon: Building2 },
    { id: "teachers", label: "Data Guru", icon: Users },
    { id: "students", label: "Data Siswa", icon: GraduationCap },
    { id: "classes", label: "Data Kelas", icon: School },
    { id: "subjects", label: "Mata Pelajaran", icon: BookOpen },
    { id: "question_bank", label: "Bank Soal", icon: Database },
    { id: "exams", label: "Jadwal Ujian", icon: CalendarClock },
    { id: "participants", label: "Peserta Ujian", icon: UserCheck },
    { id: "results", label: "Hasil Ujian", icon: Award },
    { id: "analysis", label: "Analisis Soal", icon: BarChart3 },
    { id: "reports", label: "Laporan Resmi", icon: FileSpreadsheet },
    { id: "document_settings", label: "Pengaturan Dokumen", icon: FileText },
    { id: "backup", label: "Backup Data", icon: HardDriveDownload },
    { id: "settings", label: "Pengaturan & Akun", icon: Settings }
  ],
  GURU: [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "question_bank", label: "Bank Soal", icon: Database },
    { id: "exams", label: "Jadwal Ujian", icon: FilePlus2 },
    { id: "participants", label: "Peserta Ujian", icon: UserCheck },
    { id: "results", label: "Hasil Ujian", icon: Award },
    { id: "analysis", label: "Analisis Soal", icon: BarChart3 },
    { id: "reports", label: "Laporan Resmi", icon: FileSpreadsheet }
  ],
  SISWA: [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "available_exams", label: "Ujian Tersedia", icon: PlayCircle },
    { id: "student_history", label: "Riwayat & Nilai", icon: History }
  ]
};

// ============================================================================
// UTILITAS NORMALISASI NAMA & PENCOCOKAN DATA SISWA
// ============================================================================
const normalizePersonName = (val) =>
  String(val || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

const findMatchingStudentRecord = (students = [], { id = "", nisn = "", name = "" } = {}) => {
  const cleanId = String(id || "").trim();
  const cleanNisn = String(nisn || "").trim();
  const cleanName = normalizePersonName(name);
  if (cleanId) {
    const byId = students.find((s) => String(s.id) === cleanId);
    if (byId) return byId;
  }
  if (cleanNisn) {
    const byNisn = students.find((s) => String(s.nisn || "").trim() === cleanNisn);
    if (byNisn) return byNisn;
  }
  if (cleanName) {
    const byName = students.find((s) => normalizePersonName(s.full_name) === cleanName);
    if (byName) return byName;
  }
  return null;
};

// ============================================================================
// UTILITAS JADWAL UJIAN & FOLDER SOAL
// ============================================================================
const getQuestionFolderName = (q) => {
  if (!q) return DEFAULT_FOLDER_LABEL;
  const direct = String(q.folder_name || "").trim();
  if (direct) return direct;
  const topicStr = String(q.topic || "");
  const match = topicStr.match(/^\[Folder:\s*([^\]]+)\]/i);
  if (match && match[1]) return match[1].trim();
  return DEFAULT_FOLDER_LABEL;
};

const stripFolderPrefixFromTopic = (topicStr) => {
  return String(topicStr || "")
    .replace(/^\[Folder:\s*[^\]]+\]\s*/i, "")
    .trim();
};

const combineTopicWithFolder = (folderName, topicStr) => {
  const cleanFolder = String(folderName || "").trim() || DEFAULT_FOLDER_LABEL;
  const cleanTopic = stripFolderPrefixFromTopic(topicStr);
  return cleanTopic ? `[Folder: ${cleanFolder}] ${cleanTopic}` : `[Folder: ${cleanFolder}]`;
};

const parseDateTimeLocal = (dateStr, timeStr, fallbackTime = "00:00") => {
  if (!dateStr) return null;
  const cleanDate = String(dateStr).trim();
  const rawTime = String(timeStr || fallbackTime).trim();
  const normalizedTime = rawTime.length === 5 ? `${rawTime}:00` : rawTime || `${fallbackTime}:00`;
  const parts = cleanDate.split("-");
  if (parts.length === 3) {
    const [y, m, d] = parts.map((n) => Number(n));
    const [hh = 0, mm = 0, ss = 0] = normalizedTime.split(":").map((n) => Number(n));
    if (y && m && d) {
      const dt = new Date(y, m - 1, d, hh, mm, ss);
      if (!Number.isNaN(dt.getTime())) return dt;
    }
  }
  const dtFallback = new Date(`${cleanDate}T${normalizedTime}`);
  return Number.isNaN(dtFallback.getTime()) ? null : dtFallback;
};

const evaluateExamSchedule = (exam, nowMs = Date.now()) => {
  if (!exam) {
    return { canOpen: false, statusCode: "INVALID", message: "Jadwal ujian tidak ditemukan." };
  }
  if (String(exam.status || "").toUpperCase() === "NONAKTIF") {
    return {
      canOpen: false,
      statusCode: "INACTIVE",
      message: "Jadwal ujian sedang dinonaktifkan oleh pengawas/admin."
    };
  }
  if (!exam.exam_date) {
    return {
      canOpen: false,
      statusCode: "NO_SCHEDULE",
      message: "Tanggal pelaksanaan ujian belum dijadwalkan."
    };
  }
  const startDt = parseDateTimeLocal(exam.exam_date, exam.start_time, "00:00");
  const endDt = parseDateTimeLocal(exam.exam_date, exam.end_time, "23:59");
  if (!startDt || !endDt) {
    return {
      canOpen: false,
      statusCode: "INVALID_TIME",
      message: "Format tanggal atau jam jadwal ujian tidak valid."
    };
  }
  const effectiveEndDt = endDt.getTime() < startDt.getTime() ? endDt : endDt;
  if (nowMs < startDt.getTime()) {
    const diffSec = Math.max(1, Math.ceil((startDt.getTime() - nowMs) / 1000));
    const mins = Math.floor(diffSec / 60);
    const secs = diffSec % 60;
    const countdown =
      mins > 60
        ? `${Math.floor(mins / 60)}j ${mins % 60}m`
        : `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    return {
      canOpen: false,
      statusCode: "NOT_STARTED",
      countdown,
      startDt,
      endDt: effectiveEndDt,
      message: `Belum waktunya dikerjakan. Ujian dibuka pada ${exam.exam_date} pukul ${
        exam.start_time || "00:00"
      } (Mulai dalam ${countdown}).`
    };
  }
  if (nowMs > effectiveEndDt.getTime()) {
    return {
      canOpen: false,
      statusCode: "ENDED",
      startDt,
      endDt: effectiveEndDt,
      message: `Jadwal pengerjaan telah berakhir pada ${exam.exam_date} pukul ${
        exam.end_time || "selesai"
      }. Soal dikunci dan tidak dapat dibuka.`
    };
  }
  return {
    canOpen: true,
    statusCode: "OPEN",
    startDt,
    endDt: effectiveEndDt,
    remainingMs: Math.max(0, effectiveEndDt.getTime() - nowMs),
    message: `Sedang berlangsung (${exam.start_time || "-"} - ${exam.end_time || "-"})`
  };
};

// ============================================================================
// UTILITAS SPREADSHEET (.XLSX / .CSV), EXCELJS & TEMPLATE DOKUMEN TERPUSAT
// ============================================================================
const loadExternalScript = (src) =>
  new Promise((resolve, reject) => {
    if (typeof document === "undefined") return resolve(false);
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      if (existing.getAttribute("data-loaded") === "true") return resolve(true);
      existing.addEventListener("load", () => resolve(true));
      existing.addEventListener("error", () => reject(new Error(`Gagal memuat ${src}`)));
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => {
      script.setAttribute("data-loaded", "true");
      resolve(true);
    };
    script.onerror = () => reject(new Error(`Gagal memuat ${src}`));
    document.head.appendChild(script);
  });

const ensureXlsxLoaded = async () => {
  if (typeof window !== "undefined" && window.XLSX) {
    return window.XLSX?.default || window.XLSX;
  }
  await loadExternalScript("https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js");
  return window.XLSX?.default || window.XLSX;
};

const ensureExcelJsLoaded = async () => {
  if (typeof window !== "undefined" && window.ExcelJS) {
    return window.ExcelJS?.default || window.ExcelJS;
  }
  await loadExternalScript("https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js");
  return window.ExcelJS?.default || window.ExcelJS;
};

const downloadXlsxTemplateFile = async (filename, sheetName, sampleRows) => {
  const XLSX = await ensureXlsxLoaded();
  const ws = XLSX.utils.json_to_sheet(sampleRows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`);
};

const parseSpreadsheetFile = async (file) => {
  const XLSX = await ensureXlsxLoaded();
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json(firstSheet, { defval: "" });
};

const normalizeRowKeys = (row) => {
  const out = {};
  Object.entries(row || {}).forEach(([k, v]) => {
    out[String(k).trim().toLowerCase().replace(/\s+/g, "_")] =
      typeof v === "string" ? v.trim() : v;
  });
  return out;
};

const escapeHtml = (str) =>
  String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const getFormattedPrintDate = () =>
  new Date().toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  });

const buildOfficialDocumentHtml = ({
  title,
  subtitle = "",
  metaRows = [],
  bodyHtml = "",
  schoolSettings = DEFAULT_SCHOOL_SETTINGS,
  documentSettings = DEFAULT_DOCUMENT_SETTINGS,
  isSimulation = false,
  includeSignature = true
}) => {
  const cfg = { ...DEFAULT_DOCUMENT_SETTINGS, ...documentSettings };
  const sch = { ...DEFAULT_SCHOOL_SETTINGS, ...schoolSettings };
  const kopSrc = cfg.kop_image || DEFAULT_KOP_IMAGE_SRC;
  const printDate = getFormattedPrintDate();
  const metaHtml =
    metaRows.length > 0
      ? `<table class="meta-table">
          <tbody>
            ${metaRows
              .map(
                (r) =>
                  `<tr><td class="meta-label">${escapeHtml(r.label)}</td><td class="meta-sep">:</td><td class="meta-val">${escapeHtml(r.value || "-")}</td></tr>`
              )
              .join("")}
          </tbody>
        </table>`
      : "";
  const signatureHtml = includeSignature
    ? `<div class="signature-grid">
        <div></div>
        <div class="signature-box">
          <div>Magelang, ${escapeHtml(printDate)}</div>
          <div>Kepala ${escapeHtml(sch.school_name || "MIN 4 MAGELANG")},</div>
          <div class="signature-space"></div>
          <div class="signature-name">${escapeHtml(sch.principal_name || "_______________________")}</div>
          <div>NIP. ${escapeHtml(sch.principal_nip || "-")}</div>
        </div>
      </div>`
    : "";
  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(title)} - ${escapeHtml(sch.school_name)}</title>
  <style>
    @page {
      size: ${cfg.paper_size || "A4"} ${cfg.orientation || "portrait"};
      margin: ${cfg.margin_top_mm}mm ${cfg.margin_right_mm}mm ${cfg.margin_bottom_mm}mm ${cfg.margin_left_mm}mm;
    }
    body {
      font-family: "Times New Roman", Times, serif;
      font-size: 11pt;
      color: #111827;
      margin: 0;
      padding: 0;
    }
    .doc-wrapper { width: 100%; }
    .outer-table { width: 100%; border-collapse: collapse; }
    .outer-table thead { display: table-header-group; }
    .outer-table tfoot { display: table-footer-group; }
    .kop-container {
      width: 100%;
      text-align: center;
      margin-bottom: 10px;
    }
    .kop-img {
      width: 100%;
      max-height: 135px;
      object-fit: contain;
      display: block;
      margin: 0 auto;
    }
    .sim-badge {
      background: #fef3c7;
      color: #92400e;
      border: 1px solid #f59e0b;
      padding: 4px 8px;
      font-size: 9pt;
      font-weight: bold;
      text-align: center;
      margin-bottom: 8px;
    }
    .doc-title {
      text-align: center;
      font-size: 13pt;
      font-weight: bold;
      text-transform: uppercase;
      margin: 8px 0 2px 0;
      text-decoration: underline;
    }
    .doc-subtitle {
      text-align: center;
      font-size: 10.5pt;
      margin: 0 0 10px 0;
      color: #374151;
    }
    .meta-table {
      width: 100%;
      margin-bottom: 10px;
      font-size: 10.5pt;
      border-collapse: collapse;
    }
    .meta-table td { padding: 2px 4px; vertical-align: top; }
    .meta-label { width: 170px; font-weight: bold; }
    .meta-sep { width: 12px; }
    table.data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10pt;
      margin-top: 6px;
    }
    table.data-table th, table.data-table td {
      border: 1px solid #1f2937;
      padding: 5px 7px;
      vertical-align: top;
    }
    table.data-table th {
      background-color: #ecfdf5;
      font-weight: bold;
      text-align: center;
    }
    table.data-table tr { break-inside: avoid; page-break-inside: avoid; }
    .signature-grid {
      display: grid;
      grid-template-columns: 1fr 240px;
      margin-top: 22px;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .signature-box { text-align: left; font-size: 10.5pt; }
    .signature-space { height: 58px; }
    .signature-name { font-weight: bold; text-decoration: underline; }
    .doc-footer {
      border-top: 1px solid #d1d5db;
      margin-top: 12px;
      padding-top: 4px;
      font-size: 8.5pt;
      color: #6b7280;
      display: flex;
      justify-content: space-between;
    }
  </style>
</head>
<body>
  <div class="doc-wrapper">
    <table class="outer-table">
      ${
        cfg.use_kop_pdf
          ? `<thead>
              <tr>
                <td>
                  <div class="kop-container">
                    <img src="${kopSrc}" alt="Kop Resmi MIN 4 Magelang" class="kop-img" />
                  </div>
                </td>
              </tr>
            </thead>`
          : ""
      }
      <tbody>
        <tr>
          <td>
            ${isSimulation ? `<div class="sim-badge">DOKUMEN PENGUJIAN / SIMULASI — BUKAN DATA UJIAN RESMI</div>` : ""}
            <div class="doc-title">${escapeHtml(title)}</div>
            ${subtitle ? `<div class="doc-subtitle">${escapeHtml(subtitle)}</div>` : ""}
            ${metaHtml}
            ${bodyHtml}
            ${signatureHtml}
          </td>
        </tr>
      </tbody>
      ${
        cfg.show_footer || cfg.show_print_date
          ? `<tfoot>
              <tr>
                <td>
                  <div class="doc-footer">
                    <span>${cfg.show_footer ? escapeHtml(cfg.footer_text) : ""}</span>
                    <span>${cfg.show_print_date ? `Dicetak: ${escapeHtml(printDate)}` : ""}</span>
                  </div>
                </td>
              </tr>
            </tfoot>`
          : ""
      }
    </table>
  </div>
</body>
</html>`;
};

const openPrintDocumentWindow = (htmlContent) => {
  if (typeof window === "undefined") return false;
  const win = window.open("", "_blank", "width=960,height=760");
  if (!win) return false;
  win.document.open();
  win.document.write(htmlContent);
  win.document.close();
  setTimeout(() => {
    win.focus();
    win.print();
  }, 450);
  return true;
};

const downloadWordDocFile = (filename, htmlContent) => {
  const blob = new Blob(["\ufeff", htmlContent], { type: "application/msword;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".doc") ? filename : `${filename}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const fetchImageAsBase64 = async (src) => {
  if (!src) return null;
  if (src.startsWith("data:image/")) return src;
  try {
    const res = await fetch(src);
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
};

const exportOfficialExcelWithKop = async ({
  filename,
  sheetName = "Laporan",
  title,
  subtitle = "",
  columns = [],
  rows = [],
  documentSettings = DEFAULT_DOCUMENT_SETTINGS,
  isSimulation = false
}) => {
  const cfg = { ...DEFAULT_DOCUMENT_SETTINGS, ...documentSettings };
  const ExcelJS = await ensureExcelJsLoaded();
  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet(sheetName, {
    pageSetup: {
      paperSize: cfg.paper_size === "F4" ? 5 : 9,
      orientation: cfg.orientation || "portrait",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0
    }
  });
  const colCount = Math.max(columns.length, 4);
  ws.columns = columns.map((c) => ({ header: "", key: c.key, width: c.width || 18 }));
  let currentRow = 1;
  if (cfg.use_kop_excel) {
    const base64Img = await fetchImageAsBase64(cfg.kop_image || DEFAULT_KOP_IMAGE_SRC);
    if (base64Img && base64Img.startsWith("data:image/")) {
      const ext = base64Img.includes("image/jpeg") ? "jpeg" : "png";
      const imageId = workbook.addImage({ base64: base64Img, extension: ext });
      ws.addImage(imageId, {
        tl: { col: 0, row: 0 },
        ext: { width: 680, height: 115 }
      });
      for (let r = 1; r <= 6; r++) {
        ws.getRow(r).height = 20;
      }
      currentRow = 7;
    }
  }
  if (isSimulation) {
    ws.mergeCells(currentRow, 1, currentRow, colCount);
    const simCell = ws.getCell(currentRow, 1);
    simCell.value = "DOKUMEN SIMULASI / PENGUJIAN — BUKAN DATA RESMI";
    simCell.font = { bold: true, color: { argb: "FF92400E" }, size: 10 };
    simCell.alignment = { horizontal: "center" };
    currentRow++;
  }
  ws.mergeCells(currentRow, 1, currentRow, colCount);
  const titleCell = ws.getCell(currentRow, 1);
  titleCell.value = title;
  titleCell.font = { bold: true, size: 13 };
  titleCell.alignment = { horizontal: "center" };
  currentRow++;
  if (subtitle) {
    ws.mergeCells(currentRow, 1, currentRow, colCount);
    const subCell = ws.getCell(currentRow, 1);
    subCell.value = subtitle;
    subCell.font = { italic: true, size: 10 };
    subCell.alignment = { horizontal: "center" };
    currentRow++;
  }
  currentRow++;
  const headerRowIndex = currentRow;
  const headerRow = ws.getRow(headerRowIndex);
  columns.forEach((col, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = col.label;
    cell.font = { bold: true, color: { argb: "FF064E3B" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD1FAE5" } };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" }
    };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  });
  headerRow.height = 24;
  ws.pageSetup.printTitlesRow = `${headerRowIndex}:${headerRowIndex}`;
  currentRow++;
  rows.forEach((rowObj) => {
    const r = ws.getRow(currentRow);
    columns.forEach((col, i) => {
      const cell = r.getCell(i + 1);
      cell.value = rowObj[col.key] ?? "";
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" }
      };
      cell.alignment = { vertical: "middle", wrapText: true };
    });
    currentRow++;
  });
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const prefix = isSimulation ? "SIMULASI_" : "";
  a.download = `${prefix}${filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// ============================================================================
// MESIN KOREKSI OTOMATIS & EVALUASI NILAI (AKURAT UNTUK SEMUA TIPE SOAL)
// ============================================================================
const normalizeStatementToken = (val) => {
  const v = String(val || "").trim().toUpperCase();
  if (v === "B" || v === "BENAR" || v === "TRUE") return "B";
  if (v === "S" || v === "SALAH" || v === "FALSE") return "S";
  if (v === "T" || v === "TEPAT") return "T";
  if (v === "TT" || v === "TIDAK_TEPAT" || v === "TIDAK TEPAT") return "TT";
  return v;
};

const evaluateSingleQuestionAnswer = (
  question,
  studentAnswer,
  formula = DEFAULT_GRADING_FORMULA
) => {
  const activeFormula = { ...DEFAULT_GRADING_FORMULA, ...formula };
  const maxWeight =
    activeFormula.weight_mode === "EQUAL_PER_QUESTION" ? 1 : Number(question?.weight) || 1;
  const rawAns = String(studentAnswer ?? "").trim();
  const rawKey = String(question?.correct_answer ?? "").trim();
  if (!rawAns) {
    return { status: "EMPTY", earnedWeight: 0, maxWeight };
  }
  const qType = String(question?.type || "PG").trim().toUpperCase();
  if (qType === "PG") {
    const cleanAns = rawAns.replace(/[^A-Z0-9]/gi, "").toUpperCase();
    const cleanKey = rawKey.replace(/[^A-Z0-9]/gi, "").toUpperCase();
    const isMatch = cleanAns === cleanKey;
    return {
      status: isMatch ? "CORRECT" : "WRONG",
      earnedWeight: isMatch ? maxWeight : 0,
      maxWeight
    };
  }
  if (qType === "BENAR_SALAH" || qType === "TEPAT_TIDAK_TEPAT") {
    const keyList = rawKey
      .split(/[,;|]+/)
      .map(normalizeStatementToken)
      .filter(Boolean);
    const ansList = rawAns.split(/[,;|]+/).map(normalizeStatementToken);
    if (keyList.length <= 1) {
      const singleAns = normalizeStatementToken(rawAns);
      const singleKey = keyList[0] || normalizeStatementToken(rawKey);
      const isMatch = singleAns !== "" && singleAns === singleKey;
      return {
        status: isMatch ? "CORRECT" : "WRONG",
        earnedWeight: isMatch ? maxWeight : 0,
        maxWeight
      };
    }
    let correctHits = 0;
    keyList.forEach((k, idx) => {
      if (ansList[idx] && ansList[idx] === k) correctHits++;
    });
    if (activeFormula.pg_kompleks_mode === "STRICT") {
      const exact = correctHits === keyList.length;
      return {
        status: exact ? "CORRECT" : "WRONG",
        earnedWeight: exact ? maxWeight : 0,
        maxWeight
      };
    }
    const ratio = correctHits / keyList.length;
    const earned = ratio * maxWeight;
    return {
      status: correctHits === keyList.length ? "CORRECT" : earned > 0 ? "PARTIAL" : "WRONG",
      earnedWeight: earned,
      maxWeight
    };
  }
  if (qType === "PG_KOMPLEKS") {
    const ansSet = new Set(
      rawAns
        .split(/[,;|]+/)
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean)
    );
    const keySet = new Set(
      rawKey
        .split(/[,;|]+/)
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean)
    );
    if (keySet.size === 0) return { status: "WRONG", earnedWeight: 0, maxWeight };
    let correctHits = 0;
    let wrongHits = 0;
    ansSet.forEach((a) => {
      if (keySet.has(a)) correctHits++;
      else wrongHits++;
    });
    if (activeFormula.pg_kompleks_mode === "STRICT") {
      const exact = correctHits === keySet.size && wrongHits === 0;
      return {
        status: exact ? "CORRECT" : "WRONG",
        earnedWeight: exact ? maxWeight : 0,
        maxWeight
      };
    }
    const ratio = Math.max(0, (correctHits - wrongHits * 0.5) / keySet.size);
    const earned = ratio * maxWeight;
    return {
      status: ratio >= 0.9999 ? "CORRECT" : earned > 0 ? "PARTIAL" : "WRONG",
      earnedWeight: earned,
      maxWeight
    };
  }
  // ISIAN_SINGKAT & ESSAY
  const normAns = rawAns.replace(/\s+/g, " ");
  const normKey = rawKey.replace(/\s+/g, " ");
  if (activeFormula.isian_mode === "CASE_SENSITIVE") {
    const ok = normAns === normKey;
    return { status: ok ? "CORRECT" : "WRONG", earnedWeight: ok ? maxWeight : 0, maxWeight };
  }
  const ok = normAns.toLowerCase() === normKey.toLowerCase();
  return { status: ok ? "CORRECT" : "WRONG", earnedWeight: ok ? maxWeight : 0, maxWeight };
};

const computeExamScoreSummary = (examQuestions, answersMap, formula = DEFAULT_GRADING_FORMULA) => {
  const activeFormula = { ...DEFAULT_GRADING_FORMULA, ...formula };
  let totalWeight = 0;
  let earnedWeight = 0;
  let correctCount = 0;
  let wrongCount = 0;
  let emptyCount = 0;
  examQuestions.forEach((q) => {
    const ev = evaluateSingleQuestionAnswer(q, answersMap?.[q.id], activeFormula);
    totalWeight += ev.maxWeight;
    earnedWeight += ev.earnedWeight;
    if (ev.status === "CORRECT") {
      correctCount++;
    } else if (ev.status === "EMPTY") {
      emptyCount++;
    } else {
      wrongCount++;
    }
  });
  const maxScore = Number(activeFormula.max_score) || 100;
  const rawScore = totalWeight > 0 ? (earnedWeight / totalWeight) * maxScore : 0;
  const finalScore =
    activeFormula.rounding_mode === "INTEGER"
      ? Math.round(rawScore)
      : Number(rawScore.toFixed(2));
  return {
    totalQuestions: examQuestions.length,
    correctCount,
    wrongCount,
    emptyCount,
    finalScore
  };
};

// Ambil semua butir soal berdasarkan daftar ID secara aman (dibagi batch 20 ID agar tidak terpotong URL)
const fetchQuestionsByIdsSafe = async (supabase, questionIds, cachedQuestions = []) => {
  const orderedIds = Array.isArray(questionIds) ? questionIds.filter(Boolean) : [];
  if (orderedIds.length === 0) return [];
  const qMap = new Map();
  cachedQuestions.forEach((q) => {
    if (q && q.id && q.correct_answer !== undefined) {
      qMap.set(String(q.id), q);
    }
  });
  const missingIds = orderedIds.filter((id) => !qMap.has(String(id)));
  if (supabase && missingIds.length > 0) {
    const chunkSize = 20;
    for (let i = 0; i < missingIds.length; i += chunkSize) {
      const chunk = missingIds.slice(i, i + chunkSize);
      const { data } = await supabase.from("questions").select("*").in("id", chunk);
      if (Array.isArray(data)) {
        data.forEach((q) => qMap.set(String(q.id), q));
      }
    }
  }
  return orderedIds.map((id) => qMap.get(String(id))).filter(Boolean);
};

// ============================================================================
// KOMPONEN ERROR BOUNDARY & HELPER UI
// ============================================================================
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMessage: "" };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, errorMessage: error?.message || "Terjadi kesalahan tampilan." };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
          <div className="max-w-md w-full bg-white border border-red-200 rounded-2xl p-6 shadow-sm space-y-3">
            <h2 className="text-base font-extrabold text-red-700">Pemulihan Tampilan Aplikasi</h2>
            <p className="text-xs text-slate-600">{this.state.errorMessage}</p>
            <button
              type="button"
              onClick={() => this.setState({ hasError: false, errorMessage: "" })}
              className="px-4 py-2 rounded-xl bg-emerald-700 text-white text-xs font-bold"
            >
              Muat Ulang Tampilan
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const renderSafeIcon = (IconComp, className = "w-4 h-4") => {
  if (!IconComp) return null;
  return <IconComp className={className} />;
};

function AccessDeniedView({ role, onBack }) {
  return (
    <div className="bg-white border border-red-200 rounded-2xl p-8 text-center space-y-3">
      <ShieldCheck className="w-10 h-10 text-red-600 mx-auto" />
      <h2 className="text-base font-extrabold text-slate-900">Akses Ditolak (RBAC)</h2>
      <p className="text-xs text-slate-600">
        Peran <strong>{role}</strong> tidak memiliki izin untuk membuka halaman ini.
      </p>
      <button
        type="button"
        onClick={onBack}
        className="px-4 py-2 rounded-xl bg-emerald-700 text-white text-xs font-bold"
      >
        Kembali ke Dashboard
      </button>
    </div>
  );
}

// ============================================================================
// KOMPONEN PANEL PEMANTAU STATUS PENGERJAAN SISWA
// ============================================================================
function StudentMonitorPanel({
  students = [],
  classesList = [],
  participants = [],
  attempts = [],
  studentAnswers = [],
  examResults = [],
  selectedExamId = "",
  filterClassId = ""
}) {
  const [searchName, setSearchName] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const rows = useMemo(() => {
    const sumber = new Map();

    const addOrUpdate = (rawEntry) => {
      const matchedStd = findMatchingStudentRecord(students, {
        id: rawEntry.student_id,
        nisn: rawEntry.nisn,
        name: rawEntry.student_name
      });
      const canonicalId = String(matchedStd?.id || rawEntry.student_id || "").trim();
      const canonicalName = String(
        matchedStd?.full_name || rawEntry.student_name || ""
      ).trim();
      const normName = normalizePersonName(canonicalName);
      if (!normName && !canonicalId) return;

      const key = normName || canonicalId;
      const clsId = matchedStd?.class_id || rawEntry.class_id || "";
      const clsName = classesList.find((c) => String(c.id) === String(clsId))?.name || "-";

      const prev = sumber.get(key) || {
        key,
        studentId: canonicalId,
        nisn: matchedStd?.nisn || rawEntry.nisn || "-",
        name: canonicalName || "Siswa",
        classId: clsId,
        className: clsName,
        hasAttempt: false,
        hasAnswers: false,
        resultRow: null
      };

      if (canonicalId && !prev.studentId) prev.studentId = canonicalId;
      if (!prev.nisn || prev.nisn === "-") {
        prev.nisn = matchedStd?.nisn || rawEntry.nisn || "-";
      }
      if (!prev.classId && clsId) {
        prev.classId = clsId;
        prev.className = clsName;
      }
      if (rawEntry.hasAttempt) prev.hasAttempt = true;
      if (rawEntry.hasAnswers) prev.hasAnswers = true;
      if (rawEntry.resultRow) prev.resultRow = rawEntry.resultRow;

      sumber.set(key, prev);
    };

    students.forEach((st) => {
      addOrUpdate({
        student_id: st.id,
        student_name: st.full_name,
        nisn: st.nisn,
        class_id: st.class_id
      });
    });

    participants
      .filter((p) => !selectedExamId || p.exam_id === selectedExamId)
      .forEach((p) => {
        addOrUpdate({
          student_id: p.student_id,
          student_name: p.student_name,
          nisn: p.nisn,
          class_id: p.class_id
        });
      });

    attempts
      .filter((a) => !selectedExamId || a.exam_id === selectedExamId)
      .forEach((a) => {
        addOrUpdate({
          student_id: a.student_id,
          student_name: a.student_name,
          hasAttempt: true
        });
      });

    studentAnswers
      .filter((ans) => !selectedExamId || ans.exam_id === selectedExamId)
      .forEach((ans) => {
        if (ans.answer !== undefined && ans.answer !== null && String(ans.answer).trim() !== "") {
          addOrUpdate({
            student_id: ans.student_id,
            hasAnswers: true
          });
        }
      });

    examResults
      .filter((r) => !selectedExamId || r.exam_id === selectedExamId)
      .forEach((r) => {
        addOrUpdate({
          student_id: r.student_id,
          student_name: r.student_name,
          resultRow: r
        });
      });

    return Array.from(sumber.values())
      .map((item) => {
        let status = "BELUM MENGERJAKAN";
        let badgeClass = "bg-slate-100 text-slate-700 border-slate-200";
        if (item.resultRow) {
          status = "SUDAH MASUK NILAI";
          badgeClass = "bg-emerald-50 text-emerald-800 border-emerald-200";
        } else if (item.hasAttempt || item.hasAnswers) {
          status = "ADA JAWABAN / BELUM MASUK NILAI";
          badgeClass = "bg-amber-50 text-amber-900 border-amber-300";
        }
        return {
          ...item,
          status,
          badgeClass,
          score: item.resultRow ? item.resultRow.score : "-"
        };
      })
      .filter((item) => {
        const matchClass = !filterClassId || String(item.classId) === String(filterClassId);
        const q = normalizePersonName(searchName);
        const matchSearch =
          !q ||
          normalizePersonName(item.name).includes(q) ||
          String(item.nisn || "").toLowerCase().includes(q) ||
          normalizePersonName(item.className).includes(q);
        const matchStatus = statusFilter === "ALL" || item.status === statusFilter;
        return matchClass && matchSearch && matchStatus;
      })
      .sort((a, b) => a.name.localeCompare(b.name, "id"));
  }, [
    students,
    classesList,
    participants,
    attempts,
    studentAnswers,
    examResults,
    selectedExamId,
    filterClassId,
    searchName,
    statusFilter
  ]);

  const counts = useMemo(() => {
    const sudah = rows.filter((r) => r.status === "SUDAH MASUK NILAI").length;
    const belumMasuk = rows.filter((r) => r.status === "ADA JAWABAN / BELUM MASUK NILAI").length;
    const belum = rows.filter((r) => r.status === "BELUM MENGERJAKAN").length;
    return { sudah, belumMasuk, belum };
  }, [rows]);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 text-xs shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-extrabold text-slate-900">
            Panel Pemantau Status Pengerjaan Siswa
          </h3>
          <p className="text-[11px] text-slate-500">
            Memantau status siswa apakah sudah masuk nilai, punya jawaban/attempt tapi belum masuk nilai, atau belum mengerjakan.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
          <span className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800">
            Sudah Masuk Nilai: {counts.sudah}
          </span>
          <span className="px-2.5 py-1 rounded-full bg-amber-50 border border-amber-300 text-amber-900">
            Ada Jawaban / Belum Masuk Nilai: {counts.belumMasuk}
          </span>
          <span className="px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700">
            Belum Mengerjakan: {counts.belum}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <div className="flex items-center gap-2 border border-slate-300 rounded-xl px-3 py-2 flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            placeholder="Cari nama siswa (contoh: SALMA AZKA FADHILA) atau NISN..."
            className="w-full text-xs outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold bg-white"
        >
          <option value="ALL">Semua Status ({rows.length})</option>
          <option value="SUDAH MASUK NILAI">Sudah Masuk Nilai</option>
          <option value="ADA JAWABAN / BELUM MASUK NILAI">Ada Jawaban / Belum Masuk Nilai</option>
          <option value="BELUM MENGERJAKAN">Belum Mengerjakan</option>
        </select>
      </div>

      <div className="overflow-x-auto border border-slate-200 rounded-xl">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-700">
            <tr>
              <th className="p-2.5 text-center w-10">No</th>
              <th className="p-2.5 text-left">NISN</th>
              <th className="p-2.5 text-left">Nama Siswa</th>
              <th className="p-2.5 text-center">Kelas</th>
              <th className="p-2.5 text-center">Status Pantau</th>
              <th className="p-2.5 text-center">Nilai</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-5 text-center text-slate-500">
                  Tidak ada data siswa yang sesuai dengan filter.
                </td>
              </tr>
            ) : (
              rows.map((item, idx) => (
                <tr key={item.key} className="hover:bg-slate-50/60">
                  <td className="p-2.5 text-center text-slate-500">{idx + 1}</td>
                  <td className="p-2.5 font-mono">{item.nisn || "-"}</td>
                  <td className="p-2.5 font-bold text-slate-900">{item.name}</td>
                  <td className="p-2.5 text-center font-semibold">{item.className}</td>
                  <td className="p-2.5 text-center">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full border text-[11px] font-bold ${item.badgeClass}`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="p-2.5 text-center font-extrabold text-emerald-800">
                    {item.score}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================================
// KOMPONEN UTAMA APLIKASI CBT MIN 4 MAGELANG
// ============================================================================
function CbtMin4MagelangApp() {
  const [supabaseUrl, setSupabaseUrl] = useState(
    () => localStorage.getItem("cbt_min4_sb_url") || DEFAULT_SUPABASE_URL
  );
  const [supabaseKey, setSupabaseKey] = useState(
    () => localStorage.getItem("cbt_min4_sb_key") || DEFAULT_SUPABASE_ANON_KEY
  );
  const [showSchemaModal, setShowSchemaModal] = useState(false);
  const supabase = useMemo(() => {
    if (!supabaseUrl || !supabaseKey) return null;
    try {
      return createSupabaseClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: true, autoRefreshToken: true }
      });
    } catch {
      return null;
    }
  }, [supabaseUrl, supabaseKey]);
  const [currentUser, setCurrentUser] = useState(null);
  const [isSimulationMode, setIsSimulationMode] = useState(false);
  const [hasProductionAdmin, setHasProductionAdmin] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginRoleTab, setLoginRoleTab] = useState("ADMIN");
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState(0);
  const [setupName, setSetupName] = useState("");
  const [setupUsername, setSetupUsername] = useState("");
  const [setupEmail, setSetupEmail] = useState("");
  const [setupPassword, setSetupPassword] = useState("");
  const [activeMenu, setActiveMenu] = useState("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [banner, setBanner] = useState(null);
  const [schoolSettings, setSchoolSettings] = useState(DEFAULT_SCHOOL_SETTINGS);
  const [documentSettings, setDocumentSettings] = useState(DEFAULT_DOCUMENT_SETTINGS);
  const [gradingFormula, setGradingFormula] = useState(DEFAULT_GRADING_FORMULA);
  const [profilesList, setProfilesList] = useState([]);
  const [classesList, setClassesList] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [exams, setExams] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [studentAnswers, setStudentAnswers] = useState([]);
  const [examResults, setExamResults] = useState([]);

  const showBanner = (type, message) => {
    setBanner({ type, message });
    setTimeout(() => {
      setBanner((prev) => (prev?.message === message ? null : prev));
    }, 6000);
  };

  useEffect(() => {
    let mounted = true;
    const initAuthAndAdminCheck = async () => {
      if (!supabase) {
        if (mounted) setAuthLoading(false);
        return;
      }
      try {
        const { data: adminRows } = await supabase
          .from("profiles")
          .select("id")
          .eq("role", "ADMIN")
          .eq("is_simulation", false)
          .limit(1);
        if (mounted) {
          setHasProductionAdmin(Array.isArray(adminRows) && adminRows.length > 0);
        }
        const { data: sessionData } = await supabase.auth.getSession();
        const authUser = sessionData?.session?.user;
        if (authUser && mounted) {
          const { data: prof } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", authUser.id)
            .maybeSingle();
          if (prof && prof.is_active) {
            setCurrentUser(prof);
            setIsSimulationMode(Boolean(prof.is_simulation));
          }
        }
      } catch (err) {
        console.error("Init auth check:", err);
      } finally {
        if (mounted) setAuthLoading(false);
      }
    };
    initAuthAndAdminCheck();
    return () => {
      mounted = false;
    };
  }, [supabase]);

  const refreshAllData = async () => {
    if (!supabase) return;
    try {
      const { data: settingsRows } = await supabase.from("school_settings").select("*");
      if (Array.isArray(settingsRows)) {
        const defaultRow = settingsRows.find((r) => r.id === "default");
        if (defaultRow?.data) {
          setSchoolSettings((prev) => ({ ...prev, ...defaultRow.data }));
        }
        const docRow = settingsRows.find((r) => r.id === "document_template");
        if (docRow?.data) {
          setDocumentSettings((prev) => ({ ...prev, ...docRow.data }));
        }
        const formulaRow = settingsRows.find((r) => r.id === "grading_formula");
        if (formulaRow?.data) {
          setGradingFormula((prev) => ({ ...prev, ...formulaRow.data }));
        }
      }
      if (!currentUser) return;
      const simFlag = Boolean(isSimulationMode);
      const isGuruUser = currentUser.role === "GURU";
      const qBuilder = supabase
        .from("questions")
        .select("*")
        .eq("is_simulation", simFlag)
        .order("created_at", { ascending: false })
        .limit(5000);
      const exBuilder = supabase
        .from("exams")
        .select("*")
        .eq("is_simulation", simFlag)
        .order("created_at", { ascending: false })
        .limit(1000);
      if (isGuruUser && currentUser.id) {
        qBuilder.eq("created_by", currentUser.id);
        exBuilder.eq("created_by", currentUser.id);
      }
      const [
        profRes,
        clsRes,
        subRes,
        tchRes,
        stdRes,
        qRes,
        exRes,
        partRes,
        attRes,
        ansRes,
        resRes
      ] = await Promise.all([
        supabase.from("profiles").select("*").eq("is_simulation", simFlag).limit(2000),
        supabase.from("classes").select("*").eq("is_simulation", simFlag).order("name").limit(1000),
        supabase.from("subjects").select("*").eq("is_simulation", simFlag).order("name").limit(1000),
        supabase
          .from("teachers")
          .select("*")
          .eq("is_simulation", simFlag)
          .order("full_name")
          .limit(2000),
        supabase
          .from("students")
          .select("*")
          .eq("is_simulation", simFlag)
          .order("full_name")
          .limit(5000),
        qBuilder,
        exBuilder,
        supabase.from("exam_participants").select("*").eq("is_simulation", simFlag).limit(10000),
        supabase.from("exam_attempts").select("*").eq("is_simulation", simFlag).limit(10000),
        supabase.from("student_answers").select("*").eq("is_simulation", simFlag).limit(50000),
        supabase.from("exam_results").select("*").eq("is_simulation", simFlag).limit(10000)
      ]);
      if (profRes.data) setProfilesList(profRes.data);
      if (clsRes.data) setClassesList(clsRes.data);
      if (subRes.data) setSubjects(subRes.data);
      if (tchRes.data) setTeachers(tchRes.data);
      if (stdRes.data) setStudents(stdRes.data);
      if (qRes.data) {
        if (currentUser.role === "SISWA") {
          setQuestions(qRes.data.map(({ correct_answer, ...safeQuestion }) => safeQuestion));
        } else {
          setQuestions(qRes.data);
        }
      }
      const loadedExams = Array.isArray(exRes.data) ? exRes.data : [];
      setExams(loadedExams);
      const guruExamIds = new Set(loadedExams.map((e) => e.id));
      if (partRes.data) {
        setParticipants(
          isGuruUser
            ? partRes.data.filter((p) => guruExamIds.has(p.exam_id))
            : partRes.data
        );
      }
      if (attRes.data) {
        setAttempts(
          isGuruUser ? attRes.data.filter((a) => guruExamIds.has(a.exam_id)) : attRes.data
        );
      }
      if (ansRes.data) {
        setStudentAnswers(
          isGuruUser ? ansRes.data.filter((a) => guruExamIds.has(a.exam_id)) : ansRes.data
        );
      }
      if (resRes.data) {
        setExamResults(
          isGuruUser ? resRes.data.filter((r) => guruExamIds.has(r.exam_id)) : resRes.data
        );
      }
    } catch (err) {
      console.error("Refresh data error:", err);
    }
  };

  useEffect(() => {
    refreshAllData();
    if (!currentUser || !supabase) return;
    const timer = setInterval(refreshAllData, 15000);
    return () => clearInterval(timer);
  }, [supabase, currentUser, isSimulationMode]);

  const handleInitialAdminSetup = async (e) => {
    e.preventDefault();
    if (!supabase) return showBanner("error", "Koneksi Supabase belum terkonfigurasi.");
    if (setupPassword.length < 8) {
      return showBanner("error", "Password Administrator minimal 8 karakter.");
    }
    try {
      const cleanEmail = setupEmail.trim().toLowerCase();
      const cleanUser = setupUsername.trim().toLowerCase();
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: cleanEmail,
        password: setupPassword
      });
      if (signUpError) throw signUpError;
      const userId = signUpData?.user?.id;
      if (!userId) {
        throw new Error(
          "Akun Auth dibuat namun konfirmasi email aktif di Supabase. Nonaktifkan 'Confirm email' pada Auth Providers Supabase."
        );
      }
      const profilePayload = {
        id: userId,
        full_name: setupName.trim(),
        username: cleanUser,
        email: cleanEmail,
        role: "ADMIN",
        is_active: true,
        is_simulation: false
      };
      const { error: profError } = await supabase.from("profiles").insert([profilePayload]);
      if (profError) throw profError;
      setHasProductionAdmin(true);
      setCurrentUser(profilePayload);
      setIsSimulationMode(false);
      setActiveMenu("dashboard");
      showBanner("success", "Setup Administrator Utama berhasil disimpan ke Supabase!");
    } catch (err) {
      showBanner("error", `Setup Administrator gagal: ${err.message}`);
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!supabase) return showBanner("error", "Koneksi Supabase belum terkonfigurasi.");
    if (Date.now() < lockoutUntil) {
      return showBanner("error", "Terlalu banyak percobaan gagal. Silakan tunggu 30 detik.");
    }
    try {
      const rawId = loginIdentifier.trim().toLowerCase();
      if (loginRoleTab === "SISWA") {
        const { data: studentRows, error: stErr } = await supabase
          .from("students")
          .select("*")
          .eq("is_active", true)
          .eq("is_simulation", false)
          .or(`nisn.eq.${rawId},username.eq.${rawId}`);
        if (stErr) throw new Error(`Gagal memeriksa data siswa: ${stErr.message}`);
        const matchedStudent = Array.isArray(studentRows)
          ? studentRows.find(
              (s) =>
                String(s.nisn || "").trim().toLowerCase() === rawId ||
                String(s.username || "").trim().toLowerCase() === rawId
            )
          : null;
        if (!matchedStudent) {
          throw new Error(
            "Akun siswa tidak ditemukan, berstatus nonaktif, atau bukan akun siswa produksi."
          );
        }
        const expectedPassword = String(matchedStudent.password || "");
        if (!expectedPassword) {
          throw new Error(
            "Password login siswa belum diatur oleh Administrator pada menu Data Siswa."
          );
        }
        if (loginPassword !== expectedPassword) {
          throw new Error("Password siswa tidak sesuai.");
        }
        const syntheticEmail = `${(matchedStudent.username || matchedStudent.nisn || matchedStudent.id)
          .toString()
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9._-]/g, "")}@siswa.min4magelang.sch.id`;
        await supabase.auth.signInWithPassword({
          email: syntheticEmail,
          password: loginPassword
        });
        const studentProfile = {
          id: matchedStudent.id,
          full_name: matchedStudent.full_name,
          username: matchedStudent.username,
          nisn: matchedStudent.nisn,
          nis: matchedStudent.nis,
          class_id: matchedStudent.class_id,
          email: syntheticEmail,
          role: "SISWA",
          is_active: true,
          is_simulation: false
        };
        setFailedAttempts(0);
        setLoginIdentifier("");
        setLoginPassword("");
        setCurrentUser(studentProfile);
        setIsSimulationMode(false);
        setActiveMenu("dashboard");
        showBanner("success", `Selamat datang, ${matchedStudent.full_name} (SISWA).`);
        return;
      }
      let targetEmail = rawId;
      if (!rawId.includes("@")) {
        const { data: foundProf } = await supabase
          .from("profiles")
          .select("*")
          .or(`username.eq.${rawId},nisn.eq.${rawId},nip.eq.${rawId}`)
          .maybeSingle();
        if (!foundProf) {
          throw new Error("Username / NISN / NIP tidak ditemukan.");
        }
        targetEmail = foundProf.email;
      }
      const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
        email: targetEmail,
        password: loginPassword
      });
      if (authErr) throw authErr;
      const { data: prof, error: profErr } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", authData.user.id)
        .single();
      if (profErr || !prof) throw new Error("Profil pengguna tidak ditemukan di database.");
      if (!prof.is_active) {
        await supabase.auth.signOut();
        throw new Error("Akun Anda berstatus NONAKTIF. Hubungi Administrator.");
      }
      if (prof.role !== loginRoleTab) {
        await supabase.auth.signOut();
        throw new Error(`Akun ini terdaftar sebagai ${prof.role}, bukan ${loginRoleTab}.`);
      }
      setFailedAttempts(0);
      setLoginIdentifier("");
      setLoginPassword("");
      setCurrentUser(prof);
      setIsSimulationMode(Boolean(prof.is_simulation));
      setActiveMenu("dashboard");
      showBanner("success", `Selamat datang, ${prof.full_name} (${prof.role}).`);
    } catch (err) {
      const nextFails = failedAttempts + 1;
      setFailedAttempts(nextFails);
      if (nextFails >= 5) {
        setLockoutUntil(Date.now() + 30000);
        setFailedAttempts(0);
      }
      showBanner("error", `Login gagal: ${err.message}`);
    }
  };

  const handleLogout = async () => {
    if (supabase && !isSimulationMode) {
      await supabase.auth.signOut();
    }
    setCurrentUser(null);
    setIsSimulationMode(false);
    setLoginIdentifier("");
    setLoginPassword("");
    setActiveMenu("dashboard");
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-700 text-sm font-semibold">
        Memuat sistem CBT MIN 4 MAGELANG...
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-4">
        <div className="max-w-lg w-full bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
          <div className="bg-emerald-800 text-white px-6 py-5 text-center space-y-1">
            <h1 className="text-xl font-extrabold tracking-tight">
              {schoolSettings.app_name || "CBT MIN 4 MAGELANG"}
            </h1>
            <p className="text-xs text-emerald-100">
              {schoolSettings.subtitle || "Sistem Ujian Digital Madrasah Ibtidaiyah"}
            </p>
          </div>
          {banner && (
            <div
              className={`px-5 py-3 text-xs font-semibold ${
                banner.type === "error"
                  ? "bg-red-50 text-red-700 border-b border-red-200"
                  : banner.type === "warning"
                    ? "bg-amber-50 text-amber-800 border-b border-amber-200"
                    : "bg-emerald-50 text-emerald-800 border-b border-emerald-200"
              }`}
            >
              {banner.message}
            </div>
          )}
          <div className="p-6 space-y-5">
            {!hasProductionAdmin ? (
              <form onSubmit={handleInitialAdminSetup} className="space-y-3" autoComplete="off">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-900">
                  <strong>Setup Administrator Utama:</strong> Belum ditemukan akun Administrator
                  produksi di database Supabase. Silakan daftarkan Administrator Utama pertama.
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nama Lengkap Administrator
                  </label>
                  <input
                    type="text"
                    required
                    autoComplete="off"
                    value={setupName}
                    onChange={(e) => setSetupName(e.target.value)}
                    placeholder="Contoh: Operator CBT MIN 4 Magelang"
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Username</label>
                    <input
                      type="text"
                      required
                      autoComplete="off"
                      value={setupUsername}
                      onChange={(e) => setSetupUsername(e.target.value)}
                      placeholder="admin.min4"
                      className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Email Resmi
                    </label>
                    <input
                      type="email"
                      required
                      autoComplete="off"
                      value={setupEmail}
                      onChange={(e) => setSetupEmail(e.target.value)}
                      placeholder="admin@min4magelang.sch.id"
                      className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Password (Minimal 8 Karakter)
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={setupPassword}
                    onChange={(e) => setSetupPassword(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-extrabold transition"
                >
                  Simpan & Aktifkan Administrator Utama
                </button>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Pilih Peran Masuk
                  </span>
                  <div className="grid grid-cols-3 gap-1.5 bg-slate-100 border border-slate-200 p-1.5 rounded-2xl">
                    {[
                      { id: "ADMIN", label: "Admin" },
                      { id: "GURU", label: "Guru" },
                      { id: "SISWA", label: "Siswa" }
                    ].map((roleItem) => {
                      const active = loginRoleTab === roleItem.id;
                      return (
                        <button
                          key={roleItem.id}
                          type="button"
                          onClick={() => {
                            setLoginRoleTab(roleItem.id);
                            setLoginIdentifier("");
                            setLoginPassword("");
                          }}
                          className={`py-2 px-3 rounded-xl text-xs font-extrabold transition ${
                            active
                              ? "bg-emerald-700 text-white shadow-sm"
                              : "text-slate-600 hover:bg-white/70 hover:text-slate-900"
                          }`}
                        >
                          {roleItem.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <form onSubmit={handleLoginSubmit} className="space-y-3.5" autoComplete="off">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {loginRoleTab === "SISWA"
                        ? "NISN / Username / Email Siswa"
                        : loginRoleTab === "GURU"
                          ? "NIP / Username / Email Guru"
                          : "Username / Email Administrator"}
                    </label>
                    <input
                      type="text"
                      name={`cbt_login_id_${loginRoleTab.toLowerCase()}`}
                      autoComplete="off"
                      required
                      value={loginIdentifier}
                      onChange={(e) => setLoginIdentifier(e.target.value)}
                      className="w-full border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15 outline-none rounded-xl px-3 py-2.5 text-xs transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
                    <input
                      type="password"
                      name={`cbt_login_pass_${loginRoleTab.toLowerCase()}`}
                      autoComplete="new-password"
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="w-full border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15 outline-none rounded-xl px-3 py-2.5 text-xs transition"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-extrabold transition shadow-sm"
                  >
                    Masuk sebagai{" "}
                    {loginRoleTab === "ADMIN"
                      ? "Admin"
                      : loginRoleTab === "GURU"
                        ? "Guru"
                        : "Siswa"}
                  </button>
                </form>
              </div>
            )}
            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
              <span>Supabase: {supabase ? "Terhubung" : "Belum Terhubung"}</span>
              <button
                type="button"
                onClick={() => setShowSchemaModal(true)}
                className="text-emerald-700 font-bold hover:underline"
              >
                Lihat Skema SQL Supabase
              </button>
            </div>
          </div>
        </div>
        {showSchemaModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-2xl w-full p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-slate-900">Skema SQL Supabase</h3>
                <button
                  type="button"
                  onClick={() => setShowSchemaModal(false)}
                  className="p-1 text-slate-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <textarea
                readOnly
                value={SQL_SCHEMA_SCRIPT}
                rows={12}
                className="w-full font-mono text-[11px] bg-slate-900 text-emerald-300 p-3 rounded-xl"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(SQL_SCHEMA_SCRIPT);
                    showBanner("success", "Skema SQL disalin ke clipboard.");
                  }}
                  className="px-3.5 py-2 rounded-xl bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Salin SQL
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  const userRole = currentUser.role || "SISWA";
  const allowedMenus = MENU_CONFIG[userRole] || MENU_CONFIG.SISWA;
  const isMenuAllowed = allowedMenus.some((m) => m.id === activeMenu);

  const renderActiveContent = () => {
    if (!isMenuAllowed) {
      return <AccessDeniedView role={userRole} onBack={() => setActiveMenu("dashboard")} />;
    }
    switch (activeMenu) {
      case "dashboard":
        return (
          <DashboardView
            user={currentUser}
            isSimulation={isSimulationMode}
            schoolSettings={schoolSettings}
            stats={{
              teachers: teachers.length,
              students: students.length,
              classes: classesList.length,
              subjects: subjects.length,
              questions: questions.length,
              exams: exams.length,
              results: examResults.length
            }}
            onNavigate={setActiveMenu}
          />
        );
      case "school_identity":
        return (
          <SchoolIdentityView
            supabase={supabase}
            schoolSettings={schoolSettings}
            onSaved={(updated) => setSchoolSettings(updated)}
            showBanner={showBanner}
          />
        );
      case "classes":
        return (
          <ClassesManagerView
            supabase={supabase}
            classesList={classesList}
            students={students}
            isSimulation={isSimulationMode}
            onRefresh={refreshAllData}
            showBanner={showBanner}
          />
        );
      case "subjects":
        return (
          <SubjectsManagerView
            supabase={supabase}
            subjects={subjects}
            isSimulation={isSimulationMode}
            onRefresh={refreshAllData}
            showBanner={showBanner}
          />
        );
      case "teachers":
        return (
          <TeachersManagerView
            supabase={supabase}
            teachers={teachers}
            subjects={subjects}
            isSimulation={isSimulationMode}
            onRefresh={refreshAllData}
            showBanner={showBanner}
          />
        );
      case "students":
        return (
          <StudentsManagerView
            supabase={supabase}
            students={students}
            classesList={classesList}
            isSimulation={isSimulationMode}
            onRefresh={refreshAllData}
            showBanner={showBanner}
          />
        );
      case "question_bank":
        return (
          <QuestionBankManagerView
            supabase={supabase}
            currentUser={currentUser}
            questions={questions}
            subjects={subjects}
            schoolSettings={schoolSettings}
            documentSettings={documentSettings}
            isSimulation={isSimulationMode}
            onRefresh={refreshAllData}
            showBanner={showBanner}
          />
        );
      case "exams":
        return (
          <ExamsManagerView
            supabase={supabase}
            currentUser={currentUser}
            exams={exams}
            subjects={subjects}
            classesList={classesList}
            questions={questions}
            participants={participants}
            schoolSettings={schoolSettings}
            documentSettings={documentSettings}
            isSimulation={isSimulationMode}
            onRefresh={refreshAllData}
            showBanner={showBanner}
          />
        );
      case "participants":
        return (
          <ParticipantsManagerView
            supabase={supabase}
            exams={exams}
            students={students}
            classesList={classesList}
            subjects={subjects}
            participants={participants}
            attempts={attempts}
            examResults={examResults}
            schoolSettings={schoolSettings}
            documentSettings={documentSettings}
            isSimulation={isSimulationMode}
            onRefresh={refreshAllData}
            showBanner={showBanner}
          />
        );
      case "results":
        return (
          <ResultsAndGradingView
            supabase={supabase}
            exams={exams}
            questions={questions}
            students={students}
            classesList={classesList}
            subjects={subjects}
            participants={participants}
            attempts={attempts}
            studentAnswers={studentAnswers}
            examResults={examResults}
            gradingFormula={gradingFormula}
            schoolSettings={schoolSettings}
            documentSettings={documentSettings}
            isSimulation={isSimulationMode}
            onSaveFormula={async (nextFormula) => {
              setGradingFormula(nextFormula);
              if (supabase) {
                await supabase.from("school_settings").upsert({
                  id: "grading_formula",
                  data: nextFormula,
                  updated_at: new Date().toISOString()
                });
              }
              showBanner("success", "Konfigurasi rumus penilaian berhasil disimpan.");
            }}
            onRefresh={refreshAllData}
            showBanner={showBanner}
          />
        );
      case "analysis":
        return (
          <ItemAnalysisView
            exams={exams}
            questions={questions}
            studentAnswers={studentAnswers}
            examResults={examResults}
            subjects={subjects}
            schoolSettings={schoolSettings}
            documentSettings={documentSettings}
            isSimulation={isSimulationMode}
            showBanner={showBanner}
          />
        );
      case "reports":
        return (
          <OfficialReportsView
            exams={exams}
            students={students}
            classesList={classesList}
            subjects={subjects}
            participants={participants}
            examResults={examResults}
            schoolSettings={schoolSettings}
            documentSettings={documentSettings}
            isSimulation={isSimulationMode}
            showBanner={showBanner}
          />
        );
      case "document_settings":
        return (
          <DocumentSettingsView
            supabase={supabase}
            schoolSettings={schoolSettings}
            documentSettings={documentSettings}
            onSaveDocumentSettings={async (nextDoc) => {
              setDocumentSettings(nextDoc);
              if (supabase) {
                await supabase.from("school_settings").upsert({
                  id: "document_template",
                  data: nextDoc,
                  updated_at: new Date().toISOString()
                });
              }
              showBanner("success", "Pengaturan Template Dokumen & Kop Surat berhasil disimpan.");
            }}
            showBanner={showBanner}
          />
        );
      case "backup":
        return (
          <BackupDataView
            isSimulation={isSimulationMode}
            payload={{
              schoolSettings,
              documentSettings,
              classesList,
              subjects,
              teachers,
              students,
              questions,
              exams,
              participants,
              attempts,
              studentAnswers,
              examResults
            }}
            showBanner={showBanner}
          />
        );
      case "settings":
        return (
          <AdminSettingsView
            supabase={supabase}
            supabaseUrl={supabaseUrl}
            supabaseKey={supabaseKey}
            profilesList={profilesList}
            isSimulation={isSimulationMode}
            onUpdateCredentials={(url, key) => {
              setSupabaseUrl(url);
              setSupabaseKey(key);
              localStorage.setItem("cbt_min4_sb_url", url);
              localStorage.setItem("cbt_min4_sb_key", key);
              showBanner("success", "Kredensial Supabase diperbarui.");
            }}
            onRefresh={refreshAllData}
            showBanner={showBanner}
          />
        );
      case "available_exams":
      case "student_history":
        return (
          <StudentExamPortalView
            mode={activeMenu}
            supabase={supabase}
            currentUser={currentUser}
            exams={exams}
            subjects={subjects}
            classesList={classesList}
            questions={questions}
            participants={participants}
            attempts={attempts}
            studentAnswers={studentAnswers}
            examResults={examResults}
            gradingFormula={gradingFormula}
            isSimulation={isSimulationMode}
            onRefresh={refreshAllData}
            showBanner={showBanner}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-emerald-900 text-white transform transition-transform md:relative md:translate-x-0 flex flex-col ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-4 border-b border-emerald-800 flex items-center justify-between">
          <div>
            <div className="text-sm font-extrabold tracking-tight">
              {schoolSettings.app_name || "CBT MIN 4 MAGELANG"}
            </div>
            <div className="text-[11px] text-emerald-200">{schoolSettings.school_name}</div>
          </div>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="md:hidden p-1 text-emerald-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {allowedMenus.map((item) => {
            const active = activeMenu === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveMenu(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition ${
                  active
                    ? "bg-white text-emerald-900 shadow-sm"
                    : "text-emerald-100 hover:bg-emerald-800/70"
                }`}
              >
                {renderSafeIcon(item.icon, "w-4 h-4 shrink-0")}
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="p-3 border-t border-emerald-800 space-y-2">
          <div className="px-2 py-1.5 rounded-xl bg-emerald-950/60 text-[11px]">
            <div className="font-bold truncate">{currentUser.full_name}</div>
            <div className="text-emerald-300">Peran: {userRole}</div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full py-2 px-3 rounded-xl bg-red-600/90 hover:bg-red-700 text-white text-xs font-bold flex items-center justify-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            Keluar Aplikasi
          </button>
        </div>
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 rounded-xl border border-slate-200 text-slate-700"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-sm font-extrabold text-slate-900">
                {allowedMenus.find((m) => m.id === activeMenu)?.label || "Dashboard"}
              </h1>
              <p className="text-[11px] text-slate-500">
                Tahun Pelajaran {schoolSettings.academic_year || "-"} • Semester{" "}
                {schoolSettings.semester || "-"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isSimulationMode ? (
              <span className="px-3 py-1 rounded-full bg-amber-100 border border-amber-300 text-amber-900 text-[11px] font-extrabold">
                MODE SIMULASI
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-extrabold">
                DATA PRODUKSI
              </span>
            )}
          </div>
        </header>
        {isSimulationMode && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs text-amber-900 font-semibold">
            Perhatian: Anda berada di lingkungan pengujian SIMULASI. Seluruh data di sini terpisah
            dan diberi label SIMULASI pada file unduhan.
          </div>
        )}
        {banner && (
          <div
            className={`px-4 py-2.5 text-xs font-bold border-b ${
              banner.type === "error"
                ? "bg-red-50 text-red-800 border-red-200"
                : banner.type === "warning"
                  ? "bg-amber-50 text-amber-900 border-amber-200"
                  : "bg-emerald-50 text-emerald-900 border-emerald-200"
            }`}
          >
            {banner.message}
          </div>
        )}
        <main className="flex-1 p-4 md:p-6 max-w-7xl w-full mx-auto space-y-5">
          {renderActiveContent()}
        </main>
      </div>
    </div>
  );
}

// ============================================================================
// MODUL 1: DASHBOARD UTAMA (ZERO MOCK DATA)
// ============================================================================
function DashboardView({ user, isSimulation, schoolSettings, stats, onNavigate }) {
  const cards = [
    { label: "Data Guru", value: stats.teachers, menu: "teachers", roles: ["ADMIN"] },
    { label: "Data Siswa", value: stats.students, menu: "students", roles: ["ADMIN"] },
    { label: "Data Kelas", value: stats.classes, menu: "classes", roles: ["ADMIN"] },
    { label: "Mata Pelajaran", value: stats.subjects, menu: "subjects", roles: ["ADMIN"] },
    { label: "Bank Soal", value: stats.questions, menu: "question_bank", roles: ["ADMIN", "GURU"] },
    { label: "Jadwal Ujian", value: stats.exams, menu: "exams", roles: ["ADMIN", "GURU"] },
    { label: "Hasil Ujian", value: stats.results, menu: "results", roles: ["ADMIN", "GURU"] }
  ].filter((c) => c.roles.includes(user.role));
  return (
    <div className="space-y-5">
      <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {schoolSettings.logo_base64 ? (
            <img
              src={schoolSettings.logo_base64}
              alt="Logo Madrasah"
              className="w-14 h-14 object-contain rounded-xl border border-slate-200 p-1"
            />
          ) : (
            <div className="w-14 h-14 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 font-extrabold text-xs text-center">
              MIN 4
            </div>
          )}
          <div>
            <h2 className="text-base font-extrabold text-slate-900">
              {schoolSettings.school_name || "MIN 4 MAGELANG"}
            </h2>
            <p className="text-xs text-slate-600">{schoolSettings.address}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              NSM: {schoolSettings.nsm || "Belum diisi"} • NPSN:{" "}
              {schoolSettings.npsn || "Belum diisi"}
            </p>
          </div>
        </div>
        {user.role === "SISWA" && (
          <button
            type="button"
            onClick={() => onNavigate("available_exams")}
            className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-extrabold"
          >
            Lihat Ujian Tersedia
          </button>
        )}
      </div>
      {cards.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {cards.map((c) => (
            <button
              key={c.label}
              type="button"
              onClick={() => onNavigate(c.menu)}
              className="bg-white border border-slate-200 hover:border-emerald-400 rounded-2xl p-4 text-left transition shadow-sm"
            >
              <div className="text-xs font-bold text-slate-500">{c.label}</div>
              <div className="text-2xl font-extrabold text-emerald-800 mt-1">{c.value}</div>
              <div className="text-[11px] text-slate-400 mt-1">
                {c.value === 0 ? "Belum ada data di database" : "Data nyata tersimpan"}
              </div>
            </button>
          ))}
        </div>
      )}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2 text-xs text-slate-600">
        <div className="font-extrabold text-slate-900">
          Status Sistem {isSimulation ? "(Lingkungan Pengujian Simulasi)" : "(Produksi Madrasah)"}
        </div>
        <p>
          Seluruh statistik di atas dihitung secara nyata dari tabel PostgreSQL Supabase tanpa data
          fiktif. Soal yang diunggah dapat dipisahkan ke <strong>Folder Soal Baru</strong> agar tidak
          tercampur, dan ujian siswa dikunci otomatis di luar jadwal yang ditetapkan.
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// MODUL 2: IDENTITAS MADRASAH
// ============================================================================
function SchoolIdentityView({ supabase, schoolSettings, onSaved, showBanner }) {
  const [form, setForm] = useState(schoolSettings);
  useEffect(() => {
    setForm(schoolSettings);
  }, [schoolSettings]);
  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1024 * 1024) {
      return showBanner("error", "Ukuran logo maksimal 1 MB.");
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setForm((prev) => ({ ...prev, logo_base64: reader.result }));
    };
    reader.readAsDataURL(file);
  };
  const handleSave = async (e) => {
    e.preventDefault();
    if (!supabase) return showBanner("error", "Supabase belum terhubung.");
    try {
      const { error } = await supabase.from("school_settings").upsert({
        id: "default",
        data: form,
        updated_at: new Date().toISOString()
      });
      if (error) throw error;
      onSaved(form);
      showBanner("success", "Identitas Madrasah berhasil disimpan ke database.");
    } catch (err) {
      showBanner("error", `Gagal menyimpan identitas: ${err.message}`);
    }
  };
  return (
    <form
      onSubmit={handleSave}
      className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm"
    >
      <h2 className="text-sm font-extrabold text-slate-900">Identitas Resmi Madrasah</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div>
          <label className="block font-bold text-slate-700 mb-1">Nama Madrasah</label>
          <input
            type="text"
            value={form.school_name}
            onChange={(e) => setForm({ ...form, school_name: e.target.value })}
            className="w-full border border-slate-300 rounded-xl px-3 py-2"
          />
        </div>
        <div>
          <label className="block font-bold text-slate-700 mb-1">Nama Aplikasi</label>
          <input
            type="text"
            value={form.app_name}
            onChange={(e) => setForm({ ...form, app_name: e.target.value })}
            className="w-full border border-slate-300 rounded-xl px-3 py-2"
          />
        </div>
        <div>
          <label className="block font-bold text-slate-700 mb-1">NSM</label>
          <input
            type="text"
            value={form.nsm}
            onChange={(e) => setForm({ ...form, nsm: e.target.value })}
            className="w-full border border-slate-300 rounded-xl px-3 py-2"
          />
        </div>
        <div>
          <label className="block font-bold text-slate-700 mb-1">NPSN</label>
          <input
            type="text"
            value={form.npsn}
            onChange={(e) => setForm({ ...form, npsn: e.target.value })}
            className="w-full border border-slate-300 rounded-xl px-3 py-2"
          />
        </div>
        <div>
          <label className="block font-bold text-slate-700 mb-1">Nama Kepala Madrasah</label>
          <input
            type="text"
            value={form.principal_name}
            onChange={(e) => setForm({ ...form, principal_name: e.target.value })}
            className="w-full border border-slate-300 rounded-xl px-3 py-2"
          />
        </div>
        <div>
          <label className="block font-bold text-slate-700 mb-1">NIP Kepala Madrasah</label>
          <input
            type="text"
            value={form.principal_nip}
            onChange={(e) => setForm({ ...form, principal_nip: e.target.value })}
            className="w-full border border-slate-300 rounded-xl px-3 py-2"
          />
        </div>
        <div>
          <label className="block font-bold text-slate-700 mb-1">Tahun Pelajaran</label>
          <input
            type="text"
            value={form.academic_year}
            onChange={(e) => setForm({ ...form, academic_year: e.target.value })}
            className="w-full border border-slate-300 rounded-xl px-3 py-2"
          />
        </div>
        <div>
          <label className="block font-bold text-slate-700 mb-1">Semester</label>
          <select
            value={form.semester}
            onChange={(e) => setForm({ ...form, semester: e.target.value })}
            className="w-full border border-slate-300 rounded-xl px-3 py-2"
          >
            <option value="Ganjil">Ganjil</option>
            <option value="Genap">Genap</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="block font-bold text-slate-700 mb-1">Alamat Madrasah</label>
          <input
            type="text"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            className="w-full border border-slate-300 rounded-xl px-3 py-2"
          />
        </div>
        <div>
          <label className="block font-bold text-slate-700 mb-1">Telepon</label>
          <input
            type="text"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="w-full border border-slate-300 rounded-xl px-3 py-2"
          />
        </div>
        <div>
          <label className="block font-bold text-slate-700 mb-1">Email</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full border border-slate-300 rounded-xl px-3 py-2"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block font-bold text-slate-700 mb-1">Upload Logo Madrasah</label>
          <input type="file" accept="image/*" onChange={handleLogoUpload} className="text-xs" />
        </div>
      </div>
      <button
        type="submit"
        className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-extrabold"
      >
        Simpan Identitas Madrasah
      </button>
    </form>
  );
}

// ============================================================================
// MODUL 3: MANAJEMEN KELAS, MAPEL, GURU & SISWA
// ============================================================================
function ClassesManagerView({ supabase, classesList, students, isSimulation, onRefresh, showBanner }) {
  const [name, setName] = useState("");
  const [grade, setGrade] = useState("1");
  const [search, setSearch] = useState("");
  const [importSummary, setImportSummary] = useState(null);
  const filtered = useMemo(
    () =>
      classesList.filter(
        (c) =>
          (c.name || "").toLowerCase().includes(search.toLowerCase()) ||
          String(c.grade_level || "").includes(search)
      ),
    [classesList, search]
  );
  const handleDownloadTemplate = async () => {
    await downloadXlsxTemplateFile("Template_Data_Kelas_MIN4.xlsx", "Data_Kelas", [
      { name: "1A", grade_level: "1" },
      { name: "6A", grade_level: "6" }
    ]);
    showBanner("success", "Template Data Kelas (.xlsx) berhasil diunduh.");
  };
  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !supabase) return;
    try {
      const rawRows = await parseSpreadsheetFile(file);
      const existingNames = new Set(classesList.map((c) => (c.name || "").toLowerCase()));
      const validPayloads = [];
      const errors = [];
      rawRows.forEach((raw, idx) => {
        const r = normalizeRowKeys(raw);
        const className = String(r.name || r.nama_kelas || "").trim();
        const gradeLevel = String(r.grade_level || r.tingkat || "").trim();
        if (!className || !gradeLevel) {
          errors.push(`Baris ${idx + 2}: kolom name dan grade_level wajib diisi.`);
          return;
        }
        if (existingNames.has(className.toLowerCase())) {
          errors.push(`Baris ${idx + 2}: kelas "${className}" sudah terdaftar (dilewati).`);
          return;
        }
        existingNames.add(className.toLowerCase());
        validPayloads.push({
          name: className,
          grade_level: gradeLevel,
          is_simulation: Boolean(isSimulation)
        });
      });
      let insertedCount = 0;
      if (validPayloads.length > 0) {
        const { error } = await supabase.from("classes").insert(validPayloads);
        if (error) throw error;
        insertedCount = validPayloads.length;
        await onRefresh();
      }
      setImportSummary({
        total: rawRows.length,
        success: insertedCount,
        failed: errors.length,
        errors
      });
      showBanner(
        insertedCount > 0 ? "success" : "warning",
        `Impor Data Kelas selesai: ${insertedCount} berhasil masuk, ${errors.length} dilewati/gagal.`
      );
    } catch (err) {
      showBanner("error", `Gagal mengimpor Data Kelas: ${err.message}`);
    }
  };
  const handleAdd = async (e) => {
    e.preventDefault();
    if (!supabase || !name.trim()) return;
    const exists = classesList.some((c) => c.name.toLowerCase() === name.trim().toLowerCase());
    if (exists) return showBanner("error", "Nama kelas sudah ada.");
    const { error } = await supabase.from("classes").insert([
      { name: name.trim(), grade_level: grade, is_simulation: Boolean(isSimulation) }
    ]);
    if (error) return showBanner("error", error.message);
    setName("");
    await onRefresh();
    showBanner("success", "Kelas berhasil ditambahkan.");
  };
  const handleDelete = async (cls) => {
    const hasStudents = students.some((s) => s.class_id === cls.id);
    if (hasStudents) {
      return showBanner("error", "Kelas tidak dapat dihapus karena masih memiliki siswa terdaftar.");
    }
    const { error } = await supabase.from("classes").delete().eq("id", cls.id);
    if (error) return showBanner("error", error.message);
    await onRefresh();
    showBanner("success", "Kelas dihapus.");
  };
  return (
    <div className="space-y-4">
      <form
        onSubmit={handleAdd}
        className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-wrap gap-3 items-end"
      >
        <div className="flex-1 min-w-[180px]">
          <label className="block text-xs font-bold text-slate-700 mb-1">Nama Kelas</label>
          <input
            type="text"
            required
            placeholder="Contoh: 6A"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs"
          />
        </div>
        <div className="w-36">
          <label className="block text-xs font-bold text-slate-700 mb-1">Tingkat</label>
          <select
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs"
          >
            {["1", "2", "3", "4", "5", "6"].map((g) => (
              <option key={g} value={g}>
                Kelas {g}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="px-4 py-2 rounded-xl bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          Tambah Kelas
        </button>
      </form>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 max-w-sm flex-1">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama atau tingkat kelas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs outline-none"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold flex items-center gap-1.5"
          >
            <Download className="w-4 h-4" />
            Unduh Template (.xlsx)
          </button>
          <label className="cursor-pointer px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5">
            <Upload className="w-4 h-4" />
            Upload / Import (.csv / .xlsx)
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleImportFile}
              className="hidden"
            />
          </label>
        </div>
      </div>
      {importSummary && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs space-y-1">
          <div className="font-extrabold text-emerald-900">
            Ringkasan Impor Data Kelas: {importSummary.success} dari {importSummary.total} baris
            berhasil disimpan ke Supabase ({importSummary.failed} dilewati/gagal).
          </div>
          {importSummary.errors.length > 0 && (
            <ul className="list-disc pl-5 text-amber-900">
              {importSummary.errors.slice(0, 5).map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          )}
        </div>
      )}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
            <tr>
              <th className="p-3 text-left">Nama Kelas</th>
              <th className="p-3 text-left">Tingkat</th>
              <th className="p-3 text-center">Jumlah Siswa</th>
              <th className="p-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-6 text-center text-slate-500">
                  Belum ada data kelas pada ruang ini.
                </td>
              </tr>
            ) : (
              filtered.map((cls) => {
                const count = students.filter((s) => s.class_id === cls.id).length;
                return (
                  <tr key={cls.id}>
                    <td className="p-3 font-bold text-slate-900">{cls.name}</td>
                    <td className="p-3">Kelas {cls.grade_level}</td>
                    <td className="p-3 text-center">{count} siswa</td>
                    <td className="p-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleDelete(cls)}
                        className="text-red-600 hover:text-red-800 p-1"
                        title="Hapus Kelas"
                      >
                        <Trash2 className="w-4 h-4 inline" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SubjectsManagerView({ supabase, subjects, isSimulation, onRefresh, showBanner }) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [search, setSearch] = useState("");
  const [importSummary, setImportSummary] = useState(null);
  const filtered = useMemo(
    () =>
      subjects.filter(
        (s) =>
          (s.code || "").toLowerCase().includes(search.toLowerCase()) ||
          (s.name || "").toLowerCase().includes(search.toLowerCase())
      ),
    [subjects, search]
  );
  const handleDownloadTemplate = async () => {
    await downloadXlsxTemplateFile("Template_Mata_Pelajaran_MIN4.xlsx", "Mata_Pelajaran", [
      { code: "MTK", name: "Matematika" },
      { code: "IPA", name: "Ilmu Pengetahuan Alam" }
    ]);
    showBanner("success", "Template Mata Pelajaran (.xlsx) berhasil diunduh.");
  };
  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !supabase) return;
    try {
      const rawRows = await parseSpreadsheetFile(file);
      const existingCodes = new Set(subjects.map((s) => (s.code || "").toLowerCase()));
      const validPayloads = [];
      const errors = [];
      rawRows.forEach((raw, idx) => {
        const r = normalizeRowKeys(raw);
        const subCode = String(r.code || r.kode || "").trim().toUpperCase();
        const subName = String(r.name || r.nama_mapel || r.mata_pelajaran || "").trim();
        if (!subCode || !subName) {
          errors.push(`Baris ${idx + 2}: kolom code dan name wajib diisi.`);
          return;
        }
        if (existingCodes.has(subCode.toLowerCase())) {
          errors.push(`Baris ${idx + 2}: kode "${subCode}" sudah ada (dilewati).`);
          return;
        }
        existingCodes.add(subCode.toLowerCase());
        validPayloads.push({
          code: subCode,
          name: subName,
          is_simulation: Boolean(isSimulation)
        });
      });
      let insertedCount = 0;
      if (validPayloads.length > 0) {
        const { error } = await supabase.from("subjects").insert(validPayloads);
        if (error) throw error;
        insertedCount = validPayloads.length;
        await onRefresh();
      }
      setImportSummary({
        total: rawRows.length,
        success: insertedCount,
        failed: errors.length,
        errors
      });
      showBanner(
        insertedCount > 0 ? "success" : "warning",
        `Impor Mata Pelajaran selesai: ${insertedCount} berhasil masuk, ${errors.length} dilewati/gagal.`
      );
    } catch (err) {
      showBanner("error", `Gagal mengimpor Mata Pelajaran: ${err.message}`);
    }
  };
  const handleAdd = async (e) => {
    e.preventDefault();
    if (!supabase || !code.trim() || !name.trim()) return;
    const exists = subjects.some((s) => s.code.toLowerCase() === code.trim().toLowerCase());
    if (exists) return showBanner("error", "Kode mata pelajaran sudah digunakan.");
    const { error } = await supabase.from("subjects").insert([
      {
        code: code.trim().toUpperCase(),
        name: name.trim(),
        is_simulation: Boolean(isSimulation)
      }
    ]);
    if (error) return showBanner("error", error.message);
    setCode("");
    setName("");
    await onRefresh();
    showBanner("success", "Mata pelajaran berhasil ditambahkan.");
  };
  const handleDelete = async (id) => {
    const { error } = await supabase.from("subjects").delete().eq("id", id);
    if (error) return showBanner("error", error.message);
    await onRefresh();
    showBanner("success", "Mata pelajaran dihapus.");
  };
  return (
    <div className="space-y-4">
      <form
        onSubmit={handleAdd}
        className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-wrap gap-3 items-end"
      >
        <div className="w-36">
          <label className="block text-xs font-bold text-slate-700 mb-1">Kode Mapel</label>
          <input
            type="text"
            required
            placeholder="MTK"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs uppercase"
          />
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-bold text-slate-700 mb-1">Nama Mata Pelajaran</label>
          <input
            type="text"
            required
            placeholder="Matematika"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2 rounded-xl bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          Tambah Mapel
        </button>
      </form>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 max-w-sm flex-1">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari kode atau nama mapel..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs outline-none"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold flex items-center gap-1.5"
          >
            <Download className="w-4 h-4" />
            Unduh Template (.xlsx)
          </button>
          <label className="cursor-pointer px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5">
            <Upload className="w-4 h-4" />
            Upload / Import (.csv / .xlsx)
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleImportFile}
              className="hidden"
            />
          </label>
        </div>
      </div>
      {importSummary && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs space-y-1">
          <div className="font-extrabold text-emerald-900">
            Ringkasan Impor Mata Pelajaran: {importSummary.success} dari {importSummary.total} baris
            berhasil disimpan ke Supabase ({importSummary.failed} dilewati/gagal).
          </div>
          {importSummary.errors.length > 0 && (
            <ul className="list-disc pl-5 text-amber-900">
              {importSummary.errors.slice(0, 5).map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          )}
        </div>
      )}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
            <tr>
              <th className="p-3 text-left">Kode Mapel</th>
              <th className="p-3 text-left">Nama Mata Pelajaran</th>
              <th className="p-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={3} className="p-6 text-center text-slate-500">
                  Belum ada data mata pelajaran.
                </td>
              </tr>
            ) : (
              filtered.map((s) => (
                <tr key={s.id}>
                  <td className="p-3 font-mono font-bold text-emerald-800">{s.code}</td>
                  <td className="p-3 font-semibold text-slate-900">{s.name}</td>
                  <td className="p-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleDelete(s.id)}
                      className="text-red-600 hover:text-red-800 p-1"
                    >
                      <Trash2 className="w-4 h-4 inline" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TeachersManagerView({ supabase, teachers, subjects, isSimulation, onRefresh, showBanner }) {
  const [fullName, setFullName] = useState("");
  const [nip, setNip] = useState("");
  const [username, setUsername] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [search, setSearch] = useState("");
  const [importSummary, setImportSummary] = useState(null);
  const filtered = useMemo(
    () =>
      teachers.filter(
        (t) =>
          (t.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
          (t.nip || "").toLowerCase().includes(search.toLowerCase()) ||
          (t.username || "").toLowerCase().includes(search.toLowerCase())
      ),
    [teachers, search]
  );
  const handleDownloadTemplate = async () => {
    const sampleSubject = subjects[0]?.name || "Matematika";
    await downloadXlsxTemplateFile("Template_Data_Guru_MIN4.xlsx", "Data_Guru", [
      {
        full_name: "Contoh: Ahmad Fauzi, S.Pd.I",
        nip: "198504122010011005",
        username: "ahmad.fauzi",
        subject_id: sampleSubject,
        is_active: true
      }
    ]);
    showBanner("success", "Template Data Guru (.xlsx) berhasil diunduh.");
  };
  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !supabase) return;
    try {
      const rawRows = await parseSpreadsheetFile(file);
      const existingUsernames = new Set(teachers.map((t) => (t.username || "").toLowerCase()));
      const validPayloads = [];
      const errors = [];
      rawRows.forEach((raw, idx) => {
        const r = normalizeRowKeys(raw);
        const tName = String(r.full_name || r.nama || r.nama_guru || "").trim();
        const tNip = String(r.nip || "").trim();
        const tUser = String(r.username || tNip || "")
          .trim()
          .toLowerCase()
          .replace(/\s+/g, ".");
        const rawSub = String(r.subject_id || r.mata_pelajaran || r.mapel || "").trim();
        if (!tName || !tUser) {
          errors.push(`Baris ${idx + 2}: kolom full_name dan username wajib diisi.`);
          return;
        }
        if (existingUsernames.has(tUser)) {
          errors.push(`Baris ${idx + 2}: username "${tUser}" sudah terdaftar (dilewati).`);
          return;
        }
        let matchedSubjectId = null;
        if (rawSub) {
          const foundSub = subjects.find(
            (s) =>
              String(s.id) === rawSub ||
              (s.name || "").toLowerCase() === rawSub.toLowerCase() ||
              (s.code || "").toLowerCase() === rawSub.toLowerCase()
          );
          if (foundSub) {
            matchedSubjectId = foundSub.id;
          } else {
            errors.push(
              `Baris ${idx + 2}: mata pelajaran "${rawSub}" tidak ditemukan di tabel subjects.`
            );
            return;
          }
        }
        existingUsernames.add(tUser);
        validPayloads.push({
          full_name: tName,
          nip: tNip,
          username: tUser,
          subject_id: matchedSubjectId,
          is_active: r.is_active === "" ? true : String(r.is_active).toLowerCase() !== "false",
          is_simulation: Boolean(isSimulation)
        });
      });
      let insertedCount = 0;
      if (validPayloads.length > 0) {
        const { error } = await supabase.from("teachers").insert(validPayloads);
        if (error) throw error;
        insertedCount = validPayloads.length;
        await onRefresh();
      }
      setImportSummary({
        total: rawRows.length,
        success: insertedCount,
        failed: errors.length,
        errors
      });
      showBanner(
        insertedCount > 0 ? "success" : "warning",
        `Impor Data Guru selesai: ${insertedCount} berhasil masuk, ${errors.length} dilewati/gagal.`
      );
    } catch (err) {
      showBanner("error", `Gagal mengimpor Data Guru: ${err.message}`);
    }
  };
  const handleAdd = async (e) => {
    e.preventDefault();
    if (!supabase || !fullName.trim() || !username.trim()) return;
    const { error } = await supabase.from("teachers").insert([
      {
        full_name: fullName.trim(),
        nip: nip.trim(),
        username: username.trim().toLowerCase(),
        subject_id: subjectId || null,
        is_active: true,
        is_simulation: Boolean(isSimulation)
      }
    ]);
    if (error) return showBanner("error", error.message);
    setFullName("");
    setNip("");
    setUsername("");
    await onRefresh();
    showBanner("success", "Data guru berhasil disimpan.");
  };
  const handleDelete = async (id) => {
    const { error } = await supabase.from("teachers").delete().eq("id", id);
    if (error) return showBanner("error", error.message);
    await onRefresh();
    showBanner("success", "Data guru dihapus.");
  };
  return (
    <div className="space-y-4">
      <form
        onSubmit={handleAdd}
        className="bg-white border border-slate-200 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end"
      >
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Nama Lengkap Guru</label>
          <input
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">NIP (Opsional)</label>
          <input
            type="text"
            value={nip}
            onChange={(e) => setNip(e.target.value)}
            className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Username</label>
          <input
            type="text"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Mata Pelajaran</label>
          <select
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs"
          >
            <option value="">-- Pilih Mapel --</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="px-4 py-2 rounded-xl bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          Simpan Guru
        </button>
      </form>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 max-w-sm flex-1">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama, NIP, atau username guru..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs outline-none"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold flex items-center gap-1.5"
          >
            <Download className="w-4 h-4" />
            Unduh Template (.xlsx)
          </button>
          <label className="cursor-pointer px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5">
            <Upload className="w-4 h-4" />
            Upload / Import (.csv / .xlsx)
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleImportFile}
              className="hidden"
            />
          </label>
        </div>
      </div>
      {importSummary && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs space-y-1">
          <div className="font-extrabold text-emerald-900">
            Ringkasan Impor Data Guru: {importSummary.success} dari {importSummary.total} baris
            berhasil disimpan ke Supabase ({importSummary.failed} dilewati/gagal).
          </div>
          {importSummary.errors.length > 0 && (
            <ul className="list-disc pl-5 text-amber-900">
              {importSummary.errors.slice(0, 5).map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          )}
        </div>
      )}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
            <tr>
              <th className="p-3 text-left">Nama Guru</th>
              <th className="p-3 text-left">NIP</th>
              <th className="p-3 text-left">Username</th>
              <th className="p-3 text-left">Mapel</th>
              <th className="p-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-slate-500">
                  Belum ada data guru.
                </td>
              </tr>
            ) : (
              filtered.map((t) => {
                const sub = subjects.find((s) => s.id === t.subject_id);
                return (
                  <tr key={t.id}>
                    <td className="p-3 font-bold text-slate-900">{t.full_name}</td>
                    <td className="p-3 font-mono">{t.nip || "-"}</td>
                    <td className="p-3 font-mono text-emerald-800">{t.username}</td>
                    <td className="p-3">{sub?.name || "-"}</td>
                    <td className="p-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleDelete(t.id)}
                        className="text-red-600 hover:text-red-800 p-1"
                      >
                        <Trash2 className="w-4 h-4 inline" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StudentsManagerView({ supabase, students, classesList, isSimulation, onRefresh, showBanner }) {
  const [nis, setNis] = useState("");
  const [nisn, setNisn] = useState("");
  const [fullName, setFullName] = useState("");
  const [classId, setClassId] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [search, setSearch] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [importSummary, setImportSummary] = useState(null);
  const [lastCreatedCreds, setLastCreatedCreds] = useState(null);
  const filtered = useMemo(
    () =>
      students.filter((st) => {
        const matchClass = !filterClass || st.class_id === filterClass;
        const matchText =
          !search ||
          (st.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
          (st.nis || "").toLowerCase().includes(search.toLowerCase()) ||
          (st.nisn || "").toLowerCase().includes(search.toLowerCase()) ||
          (st.username || "").toLowerCase().includes(search.toLowerCase());
        return matchClass && matchText;
      }),
    [students, search, filterClass]
  );
  const handleDownloadTemplate = async () => {
    const sampleClass = classesList[0]?.name || "6A";
    await downloadXlsxTemplateFile("Template_Data_Siswa_MIN4.xlsx", "Data_Siswa", [
      {
        nis: "1234",
        nisn: "0145678901",
        full_name: "Contoh: Muhammad Ilham",
        class_id: sampleClass,
        username: "0145678901",
        password: "PasswordSiswa123",
        is_active: true
      }
    ]);
    showBanner("success", "Template Data Siswa (.xlsx) berhasil diunduh.");
  };
  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !supabase) return;
    try {
      const rawRows = await parseSpreadsheetFile(file);
      const existingNisn = new Set(
        students.map((s) => (s.nisn || "").trim().toLowerCase()).filter((v) => v !== "")
      );
      const validPayloads = [];
      const errors = [];
      rawRows.forEach((raw, idx) => {
        const r = normalizeRowKeys(raw);
        const stNis = String(r.nis || "").trim();
        const stNisn = String(r.nisn || "").trim();
        const stName = String(r.full_name || r.nama || r.nama_siswa || "").trim();
        const rawClass = String(r.class_id || r.kelas || r.nama_kelas || "").trim();
        const stUser = String(
          r.username || stNisn || stNis || stName.toLowerCase().replace(/\s+/g, "")
        )
          .trim()
          .toLowerCase();
        const stPass = String(r.password || r.sandi || stNisn || stNis || "123456").trim();
        if (!stName || !rawClass) {
          errors.push(`Baris ${idx + 2}: kolom full_name dan class_id (nama/ID kelas) wajib diisi.`);
          return;
        }
        if (stNisn && existingNisn.has(stNisn.toLowerCase())) {
          errors.push(`Baris ${idx + 2}: NISN "${stNisn}" sudah terdaftar (dilewati).`);
          return;
        }
        const matchedClass = classesList.find(
          (c) =>
            String(c.id) === rawClass || (c.name || "").toLowerCase() === rawClass.toLowerCase()
        );
        if (!matchedClass) {
          errors.push(
            `Baris ${idx + 2}: kelas "${rawClass}" tidak ditemukan di tabel classes. Tambahkan kelas terlebih dahulu.`
          );
          return;
        }
        if (stNisn) existingNisn.add(stNisn.toLowerCase());
        validPayloads.push({
          nis: stNis,
          nisn: stNisn,
          full_name: stName,
          class_id: matchedClass.id,
          username: stUser,
          password: stPass,
          is_active: r.is_active === "" ? true : String(r.is_active).toLowerCase() !== "false",
          is_simulation: Boolean(isSimulation)
        });
      });
      let insertedCount = 0;
      if (validPayloads.length > 0) {
        const { error } = await supabase.from("students").insert(validPayloads);
        if (error) throw error;
        insertedCount = validPayloads.length;
        await onRefresh();
      }
      setImportSummary({
        total: rawRows.length,
        success: insertedCount,
        failed: errors.length,
        errors
      });
      showBanner(
        insertedCount > 0 ? "success" : "warning",
        `Impor Data Siswa selesai: ${insertedCount} berhasil masuk, ${errors.length} dilewati/gagal.`
      );
    } catch (err) {
      showBanner("error", `Gagal mengimpor Data Siswa: ${err.message}`);
    }
  };
  const handleAdd = async (e) => {
    e.preventDefault();
    if (!supabase || !fullName.trim() || !classId) {
      return showBanner("error", "Nama siswa dan kelas wajib diisi.");
    }
    const cleanUsername = (
      username.trim() ||
      nisn.trim() ||
      nis.trim() ||
      fullName.trim().toLowerCase().replace(/\s+/g, "")
    ).toLowerCase();
    const cleanPassword = password.trim() || nisn.trim() || nis.trim() || "123456";
    const payload = {
      nis: nis.trim(),
      nisn: nisn.trim(),
      full_name: fullName.trim(),
      class_id: classId,
      username: cleanUsername,
      password: cleanPassword,
      is_active: true,
      is_simulation: Boolean(isSimulation)
    };
    const { error } = await supabase.from("students").insert([payload]);
    if (error) return showBanner("error", error.message);
    setLastCreatedCreds({
      full_name: payload.full_name,
      nisn: payload.nisn || "-",
      username: payload.username,
      password: payload.password
    });
    setNis("");
    setNisn("");
    setFullName("");
    setUsername("");
    setPassword("");
    await onRefresh();
    showBanner(
      "success",
      `Data & kredensial login siswa "${payload.full_name}" berhasil disimpan.`
    );
  };
  const handleDelete = async (id) => {
    const { error } = await supabase.from("students").delete().eq("id", id);
    if (error) return showBanner("error", error.message);
    await onRefresh();
    showBanner("success", "Data siswa dihapus.");
  };
  return (
    <div className="space-y-4">
      <form
        onSubmit={handleAdd}
        className="bg-white border border-slate-200 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end"
      >
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">NIS</label>
          <input
            type="text"
            value={nis}
            onChange={(e) => setNis(e.target.value)}
            className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">NISN</label>
          <input
            type="text"
            value={nisn}
            onChange={(e) => setNisn(e.target.value)}
            className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Nama Lengkap Siswa</label>
          <input
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Kelas</label>
          <select
            required
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs"
          >
            <option value="">-- Pilih Kelas --</option>
            {classesList.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Username Login</label>
          <input
            type="text"
            placeholder="Otomatis dari NISN jika kosong"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Password Login</label>
          <div className="flex gap-2">
            <input
              type="text"
              required
              placeholder="Password siswa"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono"
            />
            <button
              type="submit"
              className="px-3.5 py-2 rounded-xl bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1 shrink-0"
            >
              <Plus className="w-4 h-4" />
              Simpan
            </button>
          </div>
        </div>
      </form>
      {lastCreatedCreds && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="font-extrabold text-emerald-900">Kredensial Login Siswa Tersimpan: </span>
            <span className="font-semibold">{lastCreatedCreds.full_name}</span> • NISN:{" "}
            <span className="font-mono">{lastCreatedCreds.nisn}</span> • Username:{" "}
            <span className="font-mono font-bold">{lastCreatedCreds.username}</span> • Password:{" "}
            <span className="font-mono font-bold">{lastCreatedCreds.password}</span>
          </div>
          <button
            type="button"
            onClick={() => setLastCreatedCreds(null)}
            className="text-emerald-800 font-bold hover:underline"
          >
            Tutup
          </button>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama, NIS, NISN, atau username..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-xs outline-none"
            />
          </div>
          <select
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold"
          >
            <option value="">Semua Kelas</option>
            {classesList.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold flex items-center gap-1.5"
          >
            <Download className="w-4 h-4" />
            Unduh Template (.xlsx)
          </button>
          <label className="cursor-pointer px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5">
            <Upload className="w-4 h-4" />
            Upload / Import (.csv / .xlsx)
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleImportFile}
              className="hidden"
            />
          </label>
        </div>
      </div>
      {importSummary && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs space-y-1">
          <div className="font-extrabold text-emerald-900">
            Ringkasan Impor Data Siswa: {importSummary.success} dari {importSummary.total} baris
            berhasil disimpan ke Supabase ({importSummary.failed} dilewati/gagal).
          </div>
          {importSummary.errors.length > 0 && (
            <ul className="list-disc pl-5 text-amber-900">
              {importSummary.errors.slice(0, 5).map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          )}
        </div>
      )}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
            <tr>
              <th className="p-3 text-left">NIS</th>
              <th className="p-3 text-left">NISN</th>
              <th className="p-3 text-left">Nama Lengkap</th>
              <th className="p-3 text-left">Kelas</th>
              <th className="p-3 text-left">Username</th>
              <th className="p-3 text-left">Password</th>
              <th className="p-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-6 text-center text-slate-500">
                  Belum ada data siswa.
                </td>
              </tr>
            ) : (
              filtered.map((st) => {
                const cls = classesList.find((c) => c.id === st.class_id);
                return (
                  <tr key={st.id}>
                    <td className="p-3 font-mono">{st.nis || "-"}</td>
                    <td className="p-3 font-mono">{st.nisn || "-"}</td>
                    <td className="p-3 font-bold text-slate-900">{st.full_name}</td>
                    <td className="p-3">{cls?.name || "-"}</td>
                    <td className="p-3 font-mono text-emerald-800">{st.username || "-"}</td>
                    <td className="p-3 font-mono text-slate-700">{st.password || "-"}</td>
                    <td className="p-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleDelete(st.id)}
                        className="text-red-600 hover:text-red-800 p-1"
                      >
                        <Trash2 className="w-4 h-4 inline" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================================
// MODUL 4: BANK SOAL (FOLDER SOAL TERPISAH, TAMBAH, EDIT, IMPOR & CETAK)
// ============================================================================
function buildOptionsByType(qType, optA, optB, optC, optD, optE = "") {
  const rawList = [
    { key: "A", text: optA },
    { key: "B", text: optB },
    { key: "C", text: optC },
    { key: "D", text: optD },
    { key: "E", text: optE }
  ].filter((o) => String(o.text || "").trim() !== "");
  if (qType === "PG" || qType === "PG_KOMPLEKS") {
    return rawList;
  }
  if (qType === "BENAR_SALAH") {
    if (rawList.length > 0) {
      return rawList.map((o, idx) => ({ key: `P${idx + 1}`, text: o.text }));
    }
    return [
      { key: "BENAR", text: "Benar" },
      { key: "SALAH", text: "Salah" }
    ];
  }
  if (qType === "TEPAT_TIDAK_TEPAT") {
    if (rawList.length > 0) {
      return rawList.map((o, idx) => ({ key: `P${idx + 1}`, text: o.text }));
    }
    return [
      { key: "TEPAT", text: "Tepat" },
      { key: "TIDAK_TEPAT", text: "Tidak Tepat" }
    ];
  }
  return [];
}

function QuestionBankManagerView({
  supabase,
  currentUser,
  questions,
  subjects,
  schoolSettings,
  documentSettings,
  isSimulation,
  onRefresh,
  showBanner
}) {
  const [folderName, setFolderName] = useState(DEFAULT_FOLDER_LABEL);
  const [uploadFolderName, setUploadFolderName] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [topic, setTopic] = useState("");
  const [qType, setQType] = useState("PG");
  const [questionText, setQuestionText] = useState("");
  const [optA, setOptA] = useState("");
  const [optB, setOptB] = useState("");
  const [optC, setOptC] = useState("");
  const [optD, setOptD] = useState("");
  const [optE, setOptE] = useState("");
  const [correctAnswer, setCorrectAnswer] = useState("A");
  const [weight, setWeight] = useState(1);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [editFolderName, setEditFolderName] = useState(DEFAULT_FOLDER_LABEL);
  const [editSubjectId, setEditSubjectId] = useState("");
  const [editTopic, setEditTopic] = useState("");
  const [editType, setEditType] = useState("PG");
  const [editQuestionText, setEditQuestionText] = useState("");
  const [editOptA, setEditOptA] = useState("");
  const [editOptB, setEditOptB] = useState("");
  const [editOptC, setEditOptC] = useState("");
  const [editOptD, setEditOptD] = useState("");
  const [editOptE, setEditOptE] = useState("");
  const [editCorrectAnswer, setEditCorrectAnswer] = useState("");
  const [editWeight, setEditWeight] = useState(1);
  const [savingEdit, setSavingEdit] = useState(false);
  const [search, setSearch] = useState("");
  const [filterSubject, setFilterSubject] = useState("");
  const [filterFolder, setFilterFolder] = useState("");
  const [importSummary, setImportSummary] = useState(null);

  const availableFolders = useMemo(() => {
    const set = new Set([DEFAULT_FOLDER_LABEL]);
    questions.forEach((q) => {
      set.add(getQuestionFolderName(q));
    });
    if (folderName.trim()) set.add(folderName.trim());
    return Array.from(set);
  }, [questions, folderName]);

  const filteredQuestions = useMemo(
    () =>
      questions.filter((q) => {
        const qFolder = getQuestionFolderName(q);
        const matchFolder = !filterFolder || qFolder === filterFolder;
        const matchSub = !filterSubject || q.subject_id === filterSubject;
        const matchTxt =
          !search ||
          (q.question_text || "").toLowerCase().includes(search.toLowerCase()) ||
          stripFolderPrefixFromTopic(q.topic || "").toLowerCase().includes(search.toLowerCase()) ||
          qFolder.toLowerCase().includes(search.toLowerCase());
        return matchFolder && matchSub && matchTxt;
      }),
    [questions, filterFolder, filterSubject, search]
  );

  const insertQuestionsRows = async (rows) => {
    const rowsWithFolder = rows.map((r) => ({
      ...r,
      topic: combineTopicWithFolder(r.folder_name, r.topic)
    }));
    const { error } = await supabase.from("questions").insert(rowsWithFolder);
    if (!error) return;
    if (/folder_name/i.test(error.message)) {
      const fallbackRows = rowsWithFolder.map(({ folder_name, ...rest }) => rest);
      const { error: fallbackErr } = await supabase.from("questions").insert(fallbackRows);
      if (fallbackErr) throw fallbackErr;
      return;
    }
    throw error;
  };

  const updateQuestionRow = async (id, patch) => {
    const patchWithFolder = {
      ...patch,
      topic: combineTopicWithFolder(patch.folder_name, patch.topic)
    };
    const { error } = await supabase.from("questions").update(patchWithFolder).eq("id", id);
    if (!error) return;
    if (/folder_name/i.test(error.message)) {
      const { folder_name, ...rest } = patchWithFolder;
      const { error: fallbackErr } = await supabase.from("questions").update(rest).eq("id", id);
      if (fallbackErr) throw fallbackErr;
      return;
    }
    throw error;
  };

  const openEditModal = (q) => {
    const opts = Array.isArray(q.options) ? q.options : [];
    const findOpt = (key) => opts.find((o) => String(o.key || "").toUpperCase() === key)?.text || "";
    setEditingQuestion(q);
    setEditFolderName(getQuestionFolderName(q));
    setEditSubjectId(q.subject_id || "");
    setEditTopic(stripFolderPrefixFromTopic(q.topic || ""));
    setEditType(q.type || "PG");
    setEditQuestionText(q.question_text || "");
    setEditOptA(findOpt("A") || findOpt("P1"));
    setEditOptB(findOpt("B") || findOpt("P2"));
    setEditOptC(findOpt("C") || findOpt("P3"));
    setEditOptD(findOpt("D") || findOpt("P4"));
    setEditOptE(findOpt("E") || findOpt("P5"));
    setEditCorrectAnswer(q.correct_answer || "");
    setEditWeight(Number(q.weight) || 1);
  };

  const toggleEditMultiKey = (key) => {
    const currentKeys = String(editCorrectAnswer || "")
      .split(",")
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);
    const nextSet = new Set(currentKeys);
    if (nextSet.has(key)) nextSet.delete(key);
    else nextSet.add(key);
    const ordered = ["A", "B", "C", "D", "E"].filter((k) => nextSet.has(k));
    setEditCorrectAnswer(ordered.join(","));
  };

  const handleUpdateQuestion = async (e) => {
    e.preventDefault();
    if (!supabase || !editingQuestion) return;
    if (!editQuestionText.trim() || !editCorrectAnswer.trim()) {
      return showBanner("error", "Pertanyaan soal dan kunci jawaban wajib diisi.");
    }
    setSavingEdit(true);
    try {
      const updatedOptions = buildOptionsByType(
        editType,
        editOptA,
        editOptB,
        editOptC,
        editOptD,
        editOptE
      );
      await updateQuestionRow(editingQuestion.id, {
        folder_name: editFolderName.trim() || DEFAULT_FOLDER_LABEL,
        subject_id: editSubjectId || null,
        topic: editTopic.trim(),
        type: editType,
        question_text: editQuestionText.trim(),
        options: updatedOptions,
        correct_answer: editCorrectAnswer.trim(),
        weight: Number(editWeight) || 1
      });
      setEditingQuestion(null);
      await onRefresh();
      showBanner("success", "Butir soal, folder, dan kunci jawaban berhasil diperbarui.");
    } catch (err) {
      showBanner("error", `Gagal memperbarui soal: ${err.message}`);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDownloadQuestionTemplate = async () => {
    const sampleSubject = subjects[0]?.name || "Matematika";
    const targetFolder = uploadFolderName.trim() || folderName.trim() || "Folder_Soal_Baru";
    await downloadXlsxTemplateFile("Template_Bank_Soal_MIN4.xlsx", "Bank_Soal", [
      {
        folder_name: targetFolder,
        subject_id: sampleSubject,
        topic: "Bilangan Bulat",
        type: "PG",
        question_text: "Contoh: Hasil dari 15 + 25 adalah ...",
        option_a: "30",
        option_b: "35",
        option_c: "40",
        option_d: "45",
        option_e: "",
        correct_answer: "C",
        weight: 1,
        is_verified: true
      },
      {
        folder_name: targetFolder,
        subject_id: sampleSubject,
        topic: "Tajwid",
        type: "BENAR_SALAH",
        question_text: "Tentukan Benar (B) atau Salah (S) untuk setiap pernyataan berikut!",
        option_a: "Idgham bighunnah dibaca dengan dengung.",
        option_b: "Izhar halqi dibaca samar-samar.",
        option_c: "Iqlab mengubah nun sukun menjadi mim.",
        option_d: "",
        option_e: "",
        correct_answer: "B,S,B",
        weight: 1,
        is_verified: true
      },
      {
        folder_name: targetFolder,
        subject_id: sampleSubject,
        topic: "Bangun Datar",
        type: "ESSAY",
        question_text: "Contoh: Sebutkan 3 sifat bangun persegi!",
        option_a: "",
        option_b: "",
        option_c: "",
        option_d: "",
        option_e: "",
        correct_answer: "Memiliki 4 sisi sama panjang, 4 sudut siku-siku, dan 2 diagonal sama panjang",
        weight: 1,
        is_verified: true
      }
    ]);
    showBanner("success", "Template Bank Soal (.xlsx) berhasil diunduh.");
  };

  const handleImportQuestionsFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !supabase) return;
    const defaultBatchFolder =
      uploadFolderName.trim() ||
      `Upload_${file.name.replace(/\.[^/.]+$/, "")}_${new Date().toLocaleDateString("id-ID")}`;
    try {
      const rawRows = await parseSpreadsheetFile(file);
      const validPayloads = [];
      const errors = [];
      rawRows.forEach((raw, idx) => {
        const r = normalizeRowKeys(raw);
        const rowFolder =
          String(r.folder_name || r.folder || r.nama_folder || "").trim() || defaultBatchFolder;
        const rawSub = String(r.subject_id || r.mata_pelajaran || r.mapel || "").trim();
        const qTopic = String(r.topic || r.materi || "").trim();
        const rawType = String(r.type || r.jenis_soal || "PG")
          .trim()
          .toUpperCase();
        const qText = String(r.question_text || r.pertanyaan || r.soal || "").trim();
        const cAns = String(r.correct_answer || r.kunci_jawaban || r.kunci || "").trim();
        const qWeight = Number(r.weight || r.bobot || 1) || 1;
        if (!qText || !cAns) {
          errors.push(`Baris ${idx + 2}: kolom question_text dan correct_answer wajib diisi.`);
          return;
        }
        let matchedSubjectId = null;
        if (rawSub) {
          const foundSub = subjects.find(
            (s) =>
              String(s.id) === rawSub ||
              (s.name || "").toLowerCase() === rawSub.toLowerCase() ||
              (s.code || "").toLowerCase() === rawSub.toLowerCase()
          );
          if (foundSub) {
            matchedSubjectId = foundSub.id;
          } else {
            errors.push(
              `Baris ${idx + 2}: mata pelajaran "${rawSub}" tidak ditemukan di tabel subjects.`
            );
            return;
          }
        }
        let optionsJson = [];
        if (rawType === "PG" || rawType === "PG_KOMPLEKS") {
          const opts = [
            { key: "A", text: String(r.option_a || r.opsi_a || r.a || "").trim() },
            { key: "B", text: String(r.option_b || r.opsi_b || r.b || "").trim() },
            { key: "C", text: String(r.option_c || r.opsi_c || r.c || "").trim() },
            { key: "D", text: String(r.option_d || r.opsi_d || r.d || "").trim() },
            { key: "E", text: String(r.option_e || r.opsi_e || r.e || "").trim() }
          ].filter((o) => o.text !== "");
          if (opts.length < 2) {
            errors.push(
              `Baris ${idx + 2}: soal ${rawType} minimal memiliki 2 opsi (option_a, option_b).`
            );
            return;
          }
          optionsJson = opts;
        } else {
          optionsJson = buildOptionsByType(
            rawType,
            String(r.option_a || r.opsi_a || r.a || "").trim(),
            String(r.option_b || r.opsi_b || r.b || "").trim(),
            String(r.option_c || r.opsi_c || r.c || "").trim(),
            String(r.option_d || r.opsi_d || r.d || "").trim(),
            String(r.option_e || r.opsi_e || r.e || "").trim()
          );
        }
        validPayloads.push({
          created_by: currentUser?.id || null,
          folder_name: rowFolder,
          subject_id: matchedSubjectId,
          topic: qTopic,
          type: rawType,
          question_text: qText,
          options: optionsJson,
          correct_answer: cAns,
          weight: qWeight,
          is_verified: r.is_verified === "" ? true : String(r.is_verified).toLowerCase() !== "false",
          is_simulation: Boolean(isSimulation)
        });
      });
      let insertedCount = 0;
      if (validPayloads.length > 0) {
        await insertQuestionsRows(validPayloads);
        insertedCount = validPayloads.length;
        setFilterFolder(defaultBatchFolder);
        setFolderName(defaultBatchFolder);
        setUploadFolderName("");
        await onRefresh();
      }
      setImportSummary({
        total: rawRows.length,
        success: insertedCount,
        failed: errors.length,
        folder: defaultBatchFolder,
        errors
      });
      showBanner(
        insertedCount > 0 ? "success" : "warning",
        `Impor ke folder "${defaultBatchFolder}" selesai: ${insertedCount} soal masuk tanpa menggabung bank soal lama (${errors.length} dilewati/gagal).`
      );
    } catch (err) {
      showBanner("error", `Gagal mengimpor Bank Soal: ${err.message}`);
    }
  };

  const handleSaveQuestion = async (e) => {
    e.preventDefault();
    if (!supabase || !questionText.trim()) return;
    const targetFolder = folderName.trim() || DEFAULT_FOLDER_LABEL;
    const options = buildOptionsByType(qType, optA, optB, optC, optD, optE);
    try {
      await insertQuestionsRows([
        {
          created_by: currentUser?.id || null,
          folder_name: targetFolder,
          subject_id: subjectId || null,
          topic: topic.trim(),
          type: qType,
          question_text: questionText.trim(),
          options,
          correct_answer: correctAnswer.trim(),
          weight: Number(weight) || 1,
          is_verified: true,
          is_simulation: Boolean(isSimulation)
        }
      ]);
      setQuestionText("");
      setOptA("");
      setOptB("");
      setOptC("");
      setOptD("");
      setOptE("");
      await onRefresh();
      showBanner("success", `Butir soal berhasil disimpan ke folder "${targetFolder}".`);
    } catch (err) {
      showBanner("error", err.message);
    }
  };

  const handleDelete = async (id) => {
    const { error } = await supabase.from("questions").delete().eq("id", id);
    if (error) return showBanner("error", error.message);
    await onRefresh();
    showBanner("success", "Butir soal dihapus.");
  };

  const handlePrintBankSoal = (includeKey = false) => {
    if (filteredQuestions.length === 0) {
      return showBanner("error", "Belum ada soal pada filter ini untuk dicetak.");
    }
    const subName = filterSubject
      ? subjects.find((s) => s.id === filterSubject)?.name || "Semua Mapel"
      : "Semua Mata Pelajaran";
    const folderLabel = filterFolder || "Semua Folder Soal";
    const listHtml = `<ol style="padding-left:18px; line-height:1.5;">
      ${filteredQuestions
        .map((q) => {
          const optsHtml =
            Array.isArray(q.options) && q.options.length > 0
              ? `<div style="margin-top:4px; padding-left:12px;">
                  ${q.options.map((o) => `<div><strong>${escapeHtml(o.key)}.</strong> ${escapeHtml(o.text)}</div>`).join("")}
                </div>`
              : "";
          const keyHtml = includeKey
            ? `<div style="margin-top:4px; font-weight:bold; color:#065f46;">Kunci Jawaban: ${escapeHtml(q.correct_answer)} (Bobot: ${q.weight})</div>`
            : "";
          return `<li style="margin-bottom:10px; break-inside:avoid;">
            <div>[${escapeHtml(getQuestionFolderName(q))}] ${escapeHtml(q.question_text)}</div>
            ${optsHtml}
            ${keyHtml}
          </li>`;
        })
        .join("")}
    </ol>`;
    const html = buildOfficialDocumentHtml({
      title: includeKey ? "BANK SOAL & KUNCI JAWABAN" : "DAFTAR BANK SOAL",
      subtitle: `Folder: ${folderLabel} • Mapel: ${subName}`,
      metaRows: [
        { label: "Folder Soal", value: folderLabel },
        { label: "Mata Pelajaran", value: subName },
        { label: "Jumlah Butir Soal", value: `${filteredQuestions.length} Soal` },
        { label: "Tahun Pelajaran", value: schoolSettings.academic_year }
      ],
      bodyHtml: listHtml,
      schoolSettings,
      documentSettings,
      isSimulation
    });
    openPrintDocumentWindow(html);
  };

  return (
    <div className="space-y-4">
      <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-extrabold text-emerald-950">
            <FolderPlus className="w-4 h-4 text-emerald-700" />
            <span>Upload / Import Soal ke Folder Baru (Tidak Digabung dengan Soal Lama)</span>
          </div>
          <span className="text-[11px] text-emerald-800 font-semibold">
            Isi nama folder baru lalu pilih file (.xlsx / .csv)
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center text-xs">
          <div className="sm:col-span-2">
            <input
              type="text"
              value={uploadFolderName}
              onChange={(e) => setUploadFolderName(e.target.value)}
              placeholder="Nama Folder Soal Baru (contoh: PAS Matematika Kelas 6 - Paket A)"
              className="w-full bg-white border border-emerald-300 rounded-xl px-3 py-2 text-xs font-semibold"
            />
          </div>
          <label className="cursor-pointer px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-sm">
            <Upload className="w-4 h-4" />
            Pilih File & Buat Folder Baru
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleImportQuestionsFile}
              className="hidden"
            />
          </label>
        </div>
      </div>
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-extrabold text-slate-900">Tambah Butir Soal Baru</h2>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleDownloadQuestionTemplate}
              className="px-3 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-xs font-bold flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              Unduh Template (.xlsx)
            </button>
            <button
              type="button"
              onClick={() => handlePrintBankSoal(false)}
              className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-bold flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              Cetak / PDF Bank Soal
            </button>
            <button
              type="button"
              onClick={() => handlePrintBankSoal(true)}
              className="px-3 py-1.5 rounded-xl bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              Cetak PDF + Kunci
            </button>
          </div>
        </div>
        {importSummary && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs space-y-1">
            <div className="font-extrabold text-emerald-900">
              Folder &quot;{importSummary.folder}&quot;: {importSummary.success} dari{" "}
              {importSummary.total} soal berhasil disimpan ke Supabase ({importSummary.failed}{" "}
              dilewati/gagal).
            </div>
            {importSummary.errors.length > 0 && (
              <ul className="list-disc pl-5 text-amber-900">
                {importSummary.errors.slice(0, 5).map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            )}
          </div>
        )}
        <form onSubmit={handleSaveQuestion} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Folder Soal (Baru / Ada)
              </label>
              <input
                type="text"
                list="folder-options-datalist"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                placeholder="Ketik nama folder baru..."
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold"
              />
              <datalist id="folder-options-datalist">
                {availableFolders.map((f) => (
                  <option key={f} value={f} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Mata Pelajaran</label>
              <select
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs"
              >
                <option value="">-- Pilih Mapel --</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Materi / Topik</label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Jenis Soal</label>
              <select
                value={qType}
                onChange={(e) => setQType(e.target.value)}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs"
              >
                <option value="PG">Pilihan Ganda (PG)</option>
                <option value="ESSAY">Uraian / Essay (ESSAY)</option>
                <option value="PG_KOMPLEKS">Pilihan Ganda Kompleks</option>
                <option value="BENAR_SALAH">Benar / Salah</option>
                <option value="TEPAT_TIDAK_TEPAT">Tepat / Tidak Tepat</option>
                <option value="ISIAN_SINGKAT">Isian Singkat</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Bobot Nilai</label>
              <input
                type="number"
                min="1"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Pertanyaan Soal</label>
            <textarea
              required
              rows={3}
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs"
            />
          </div>
          {(qType === "PG" ||
            qType === "PG_KOMPLEKS" ||
            qType === "BENAR_SALAH" ||
            qType === "TEPAT_TIDAK_TEPAT") && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                placeholder={
                  qType === "BENAR_SALAH" || qType === "TEPAT_TIDAK_TEPAT"
                    ? "Pernyataan 1 (kosongkan jika hanya 1 pernyataan di atas)"
                    : "Opsi A"
                }
                value={optA}
                onChange={(e) => setOptA(e.target.value)}
                className="border border-slate-300 rounded-xl px-3 py-2 text-xs"
              />
              <input
                type="text"
                placeholder={
                  qType === "BENAR_SALAH" || qType === "TEPAT_TIDAK_TEPAT"
                    ? "Pernyataan 2"
                    : "Opsi B"
                }
                value={optB}
                onChange={(e) => setOptB(e.target.value)}
                className="border border-slate-300 rounded-xl px-3 py-2 text-xs"
              />
              <input
                type="text"
                placeholder={
                  qType === "BENAR_SALAH" || qType === "TEPAT_TIDAK_TEPAT"
                    ? "Pernyataan 3"
                    : "Opsi C"
                }
                value={optC}
                onChange={(e) => setOptC(e.target.value)}
                className="border border-slate-300 rounded-xl px-3 py-2 text-xs"
              />
              <input
                type="text"
                placeholder={
                  qType === "BENAR_SALAH" || qType === "TEPAT_TIDAK_TEPAT"
                    ? "Pernyataan 4 (Opsional)"
                    : "Opsi D"
                }
                value={optD}
                onChange={(e) => setOptD(e.target.value)}
                className="border border-slate-300 rounded-xl px-3 py-2 text-xs"
              />
              <input
                type="text"
                placeholder={
                  qType === "BENAR_SALAH" || qType === "TEPAT_TIDAK_TEPAT"
                    ? "Pernyataan 5 (Opsional)"
                    : "Opsi E (Opsional)"
                }
                value={optE}
                onChange={(e) => setOptE(e.target.value)}
                className="border border-slate-300 rounded-xl px-3 py-2 text-xs sm:col-span-2"
              />
            </div>
          )}
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Kunci Jawaban (Contoh: A, atau A,C untuk PG Kompleks, atau B,S,B / T,TT,T)
              </label>
              <input
                type="text"
                required
                value={correctAnswer}
                onChange={(e) => setCorrectAnswer(e.target.value)}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-emerald-700 text-white text-xs font-extrabold"
            >
              Simpan Soal ke Folder
            </button>
          </div>
        </form>
      </div>
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari teks pertanyaan, folder, atau topik..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs outline-none"
          />
        </div>
        <select
          value={filterFolder}
          onChange={(e) => setFilterFolder(e.target.value)}
          className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold"
        >
          <option value="">Semua Folder Soal ({questions.length})</option>
          {availableFolders.map((f) => {
            const cnt = questions.filter((q) => getQuestionFolderName(q) === f).length;
            return (
              <option key={f} value={f}>
                Folder: {f} ({cnt})
              </option>
            );
          })}
        </select>
        <select
          value={filterSubject}
          onChange={(e) => setFilterSubject(e.target.value)}
          className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold"
        >
          <option value="">Semua Mata Pelajaran</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        {filteredQuestions.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center text-xs text-slate-500">
            Belum ada butir soal pada folder/filter ini.
          </div>
        ) : (
          filteredQuestions.map((q, idx) => {
            const sub = subjects.find((s) => s.id === q.subject_id);
            const opts = Array.isArray(q.options) ? q.options : [];
            const qFolder = getQuestionFolderName(q);
            const cleanTopic = stripFolderPrefixFromTopic(q.topic || "");
            return (
              <div
                key={q.id}
                className="bg-white border border-slate-200 rounded-2xl p-4 flex items-start justify-between gap-4"
              >
                <div className="space-y-1.5 text-xs flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-extrabold text-emerald-800">#{idx + 1}</span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-900 font-bold">
                      <Folder className="w-3 h-3" />
                      {qFolder}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-100 font-bold">{q.type}</span>
                    <span className="text-slate-500">{sub?.name || "Umum"}</span>
                    {cleanTopic && <span className="text-slate-500">• Topik: {cleanTopic}</span>}
                    <span className="text-slate-500">• Bobot: {q.weight}</span>
                  </div>
                  <p className="font-semibold text-slate-900 whitespace-pre-line">
                    {q.question_text}
                  </p>
                  {opts.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 pt-1 text-[11px] text-slate-700">
                      {opts.map((o) => (
                        <div key={o.key} className="bg-slate-50 px-2.5 py-1 rounded-lg">
                          <strong>{o.key}.</strong> {o.text}
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="text-[11px] font-bold text-emerald-700 pt-0.5">
                    Kunci Jawaban: {q.correct_answer}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => openEditModal(q)}
                    className="px-2.5 py-1.5 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold inline-flex items-center gap-1"
                    title="Edit Soal"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(q.id)}
                    className="text-red-600 hover:text-red-800 p-1.5 rounded-xl hover:bg-red-50"
                    title="Hapus Soal"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
      {editingQuestion && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-5 space-y-4 shadow-lg my-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Edit Butir Soal</h3>
                <p className="text-[11px] text-slate-500">
                  Perubahan akan langsung disimpan ke tabel questions di Supabase.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingQuestion(null)}
                className="p-1 text-slate-500 hover:text-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleUpdateQuestion} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Folder Soal</label>
                  <input
                    type="text"
                    value={editFolderName}
                    onChange={(e) => setEditFolderName(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mata Pelajaran</label>
                  <select
                    value={editSubjectId}
                    onChange={(e) => setEditSubjectId(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2"
                  >
                    <option value="">-- Pilih Mapel --</option>
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Materi / Topik</label>
                  <input
                    type="text"
                    value={editTopic}
                    onChange={(e) => setEditTopic(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Jenis Soal</label>
                  <select
                    value={editType}
                    onChange={(e) => setEditType(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2"
                  >
                    <option value="PG">Pilihan Ganda (PG)</option>
                    <option value="ESSAY">Uraian / Essay (ESSAY)</option>
                    <option value="PG_KOMPLEKS">Pilihan Ganda Kompleks</option>
                    <option value="BENAR_SALAH">Benar / Salah</option>
                    <option value="TEPAT_TIDAK_TEPAT">Tepat / Tidak Tepat</option>
                    <option value="ISIAN_SINGKAT">Isian Singkat</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Bobot Nilai</label>
                  <input
                    type="number"
                    min="1"
                    value={editWeight}
                    onChange={(e) => setEditWeight(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2"
                  />
                </div>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Pertanyaan Soal</label>
                <textarea
                  required
                  rows={3}
                  value={editQuestionText}
                  onChange={(e) => setEditQuestionText(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2"
                />
              </div>
              {(editType === "PG" ||
                editType === "PG_KOMPLEKS" ||
                editType === "BENAR_SALAH" ||
                editType === "TEPAT_TIDAK_TEPAT") && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder={
                      editType === "BENAR_SALAH" || editType === "TEPAT_TIDAK_TEPAT"
                        ? "Pernyataan 1 (kosongkan jika 1 pernyataan)"
                        : "Opsi A"
                    }
                    value={editOptA}
                    onChange={(e) => setEditOptA(e.target.value)}
                    className="border border-slate-300 rounded-xl px-3 py-2"
                  />
                  <input
                    type="text"
                    placeholder={
                      editType === "BENAR_SALAH" || editType === "TEPAT_TIDAK_TEPAT"
                        ? "Pernyataan 2"
                        : "Opsi B"
                    }
                    value={editOptB}
                    onChange={(e) => setEditOptB(e.target.value)}
                    className="border border-slate-300 rounded-xl px-3 py-2"
                  />
                  <input
                    type="text"
                    placeholder={
                      editType === "BENAR_SALAH" || editType === "TEPAT_TIDAK_TEPAT"
                        ? "Pernyataan 3"
                        : "Opsi C"
                    }
                    value={editOptC}
                    onChange={(e) => setEditOptC(e.target.value)}
                    className="border border-slate-300 rounded-xl px-3 py-2"
                  />
                  <input
                    type="text"
                    placeholder={
                      editType === "BENAR_SALAH" || editType === "TEPAT_TIDAK_TEPAT"
                        ? "Pernyataan 4 (Opsional)"
                        : "Opsi D"
                    }
                    value={editOptD}
                    onChange={(e) => setEditOptD(e.target.value)}
                    className="border border-slate-300 rounded-xl px-3 py-2"
                  />
                  <input
                    type="text"
                    placeholder={
                      editType === "BENAR_SALAH" || editType === "TEPAT_TIDAK_TEPAT"
                        ? "Pernyataan 5 (Opsional)"
                        : "Opsi E (Opsional)"
                    }
                    value={editOptE}
                    onChange={(e) => setEditOptE(e.target.value)}
                    className="border border-slate-300 rounded-xl px-3 py-2 sm:col-span-2"
                  />
                </div>
              )}
              <div className="space-y-2">
                <label className="block font-bold text-slate-700">
                  Kunci Jawaban{" "}
                  {editType === "PG_KOMPLEKS"
                    ? "(Pilihan Ganda Kompleks — klik lebih dari satu huruf kunci)"
                    : editType === "PG"
                      ? "(Pilihan Ganda Biasa — pilih 1 huruf kunci)"
                      : editType === "BENAR_SALAH"
                        ? "(Contoh: B,S,B atau BENAR)"
                        : editType === "TEPAT_TIDAK_TEPAT"
                          ? "(Contoh: T,TT,T atau TEPAT)"
                          : ""}
                </label>
                {editType === "PG_KOMPLEKS" && (
                  <div className="flex flex-wrap gap-2">
                    {["A", "B", "C", "D", "E"].map((k) => {
                      const activeKeys = String(editCorrectAnswer || "")
                        .split(",")
                        .map((s) => s.trim().toUpperCase())
                        .filter(Boolean);
                      const isChecked = activeKeys.includes(k);
                      return (
                        <button
                          key={k}
                          type="button"
                          onClick={() => toggleEditMultiKey(k)}
                          className={`px-3 py-1.5 rounded-xl border text-xs font-extrabold transition ${
                            isChecked
                              ? "bg-emerald-700 border-emerald-700 text-white"
                              : "bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          Kunci {k} {isChecked ? "✓" : ""}
                        </button>
                      );
                    })}
                  </div>
                )}
                {editType === "PG" && (
                  <div className="flex flex-wrap gap-2">
                    {["A", "B", "C", "D", "E"].map((k) => {
                      const isChecked = String(editCorrectAnswer || "").trim().toUpperCase() === k;
                      return (
                        <button
                          key={k}
                          type="button"
                          onClick={() => setEditCorrectAnswer(k)}
                          className={`px-3 py-1.5 rounded-xl border text-xs font-extrabold transition ${
                            isChecked
                              ? "bg-emerald-700 border-emerald-700 text-white"
                              : "bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          Kunci {k}
                        </button>
                      );
                    })}
                  </div>
                )}
                <input
                  type="text"
                  required
                  value={editCorrectAnswer}
                  onChange={(e) => setEditCorrectAnswer(e.target.value)}
                  placeholder="Contoh: A atau A,C atau B,S,B"
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 font-mono"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingQuestion(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 font-bold text-slate-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold disabled:opacity-50"
                >
                  {savingEdit ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MODUL 5: JADWAL UJIAN & CETAK NASKAH SOAL BERKOP RESMI
// ============================================================================
function ExamsManagerView({
  supabase,
  currentUser,
  exams,
  subjects,
  classesList,
  questions,
  participants,
  schoolSettings,
  documentSettings,
  isSimulation,
  onRefresh,
  showBanner
}) {
  const [title, setTitle] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [examFolderFilter, setExamFolderFilter] = useState("");
  const [selectedClassIds, setSelectedClassIds] = useState([]);
  const [examDate, setExamDate] = useState("");
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("09:30");
  const [duration, setDuration] = useState(60);
  const [instructions, setInstructions] = useState(
    "Berdoalah sebelum mengerjakan ujian. Soal hanya dapat dibuka dan dikerjakan sesuai jadwal yang ditentukan."
  );
  const [selectedQuestionIds, setSelectedQuestionIds] = useState([]);

  const availableFolders = useMemo(() => {
    const set = new Set([DEFAULT_FOLDER_LABEL]);
    questions.forEach((q) => set.add(getQuestionFolderName(q)));
    return Array.from(set);
  }, [questions]);

  const availableQuestions = useMemo(
    () =>
      questions.filter((q) => {
        const matchSub = !subjectId || q.subject_id === subjectId;
        const matchFolder = !examFolderFilter || getQuestionFolderName(q) === examFolderFilter;
        return matchSub && matchFolder;
      }),
    [questions, subjectId, examFolderFilter]
  );

  const allQuestionIds = useMemo(
    () => availableQuestions.map((q) => q.id),
    [availableQuestions]
  );

  const isAllSelected = useMemo(
    () =>
      allQuestionIds.length > 0 &&
      allQuestionIds.every((id) => selectedQuestionIds.includes(id)),
    [allQuestionIds, selectedQuestionIds]
  );

  const handleToggleSelectAllQuestions = () => {
    if (isAllSelected) {
      setSelectedQuestionIds((prev) => prev.filter((id) => !allQuestionIds.includes(id)));
    } else {
      setSelectedQuestionIds((prev) => Array.from(new Set([...prev, ...allQuestionIds])));
    }
  };

  const toggleQuestionSelect = (id) => {
    setSelectedQuestionIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleClassSelect = (id) => {
    setSelectedClassIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleToggleAllClasses = () => {
    if (selectedClassIds.length === classesList.length) {
      setSelectedClassIds([]);
    } else {
      setSelectedClassIds(classesList.map((c) => c.id));
    }
  };

  const handleCreateExam = async (e) => {
    e.preventDefault();
    if (!supabase) return;
    if (!title.trim() || !examDate || !startTime || !endTime || selectedQuestionIds.length === 0) {
      return showBanner(
        "error",
        "Judul ujian, tanggal, jam mulai-selesai, dan minimal 1 soal wajib dipilih."
      );
    }
    const startDt = parseDateTimeLocal(examDate, startTime, "00:00");
    const endDt = parseDateTimeLocal(examDate, endTime, "23:59");
    if (startDt && endDt && endDt.getTime() <= startDt.getTime()) {
      return showBanner("error", "Jam selesai harus lebih akhir dari jam mulai.");
    }
    const classIdValue =
      selectedClassIds.length === 0 || selectedClassIds.length === classesList.length
        ? null
        : selectedClassIds.join(",");
    const { error } = await supabase.from("exams").insert([
      {
        created_by: currentUser?.id || null,
        title: title.trim(),
        subject_id: subjectId || null,
        class_id: classIdValue,
        exam_date: examDate,
        start_time: startTime,
        end_time: endTime,
        duration_minutes: Number(duration) || 60,
        instructions,
        question_ids: selectedQuestionIds,
        status: "AKTIF",
        show_result_to_student: true,
        is_simulation: Boolean(isSimulation)
      }
    ]);
    if (error) return showBanner("error", error.message);
    setTitle("");
    setSelectedClassIds([]);
    setSelectedQuestionIds([]);
    await onRefresh();
    showBanner(
      "success",
      "Paket jadwal ujian berhasil dibuat. Soal hanya akan terbuka pada jadwal yang ditentukan."
    );
  };

  const handleToggleExamStatus = async (exam) => {
    if (!supabase || !exam?.id) return;
    const isCurrentlyInactive = String(exam.status || "").toUpperCase() === "NONAKTIF";
    const nextStatus = isCurrentlyInactive ? "AKTIF" : "NONAKTIF";
    const { error } = await supabase
      .from("exams")
      .update({ status: nextStatus })
      .eq("id", exam.id);
    if (error) {
      return showBanner("error", `Gagal mengubah status paket ujian: ${error.message}`);
    }
    await onRefresh();
    showBanner("success", `Paket ujian "${exam.title}" diubah menjadi ${nextStatus}.`);
  };

  const handlePrintNaskahSoal = (exam) => {
    const qIds = Array.isArray(exam.question_ids) ? exam.question_ids : [];
    const examQuestions = qIds
      .map((id) => questions.find((q) => q.id === id))
      .filter(Boolean);
    if (examQuestions.length === 0) {
      return showBanner("error", "Butir soal untuk paket ujian ini tidak ditemukan.");
    }
    const sub = subjects.find((s) => s.id === exam.subject_id);
    const targetClassList = String(exam.class_id || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const targetClassLabel =
      targetClassList.length === 0
        ? "Semua Kelas"
        : targetClassList
            .map((id) => classesList.find((c) => c.id === id)?.name)
            .filter(Boolean)
            .join(", ") || "-";
    const bodyHtml = `
      <div style="border:1px solid #1f2937; padding:8px 10px; margin-bottom:10px; font-size:10pt;">
        <strong>PETUNJUK PENGERJAAN:</strong><br/>
        ${escapeHtml(exam.instructions || "Kerjakan soal dengan teliti dan jujur.")}
      </div>
      <ol style="padding-left:18px; line-height:1.55;">
        ${examQuestions
          .map((q) => {
            const opts =
              Array.isArray(q.options) && q.options.length > 0
                ? `<div style="margin-top:4px; padding-left:12px;">
                    ${q.options.map((o) => `<div><strong>${escapeHtml(o.key)}.</strong> ${escapeHtml(o.text)}</div>`).join("")}
                  </div>`
                : `<div style="margin-top:8px; border-bottom:1px dashed #6b7280; height:24px;"></div>`;
            return `<li style="margin-bottom:11px; break-inside:avoid;">
              <div>${escapeHtml(q.question_text)}</div>
              ${opts}
            </li>`;
          })
          .join("")}
      </ol>
    `;
    const html = buildOfficialDocumentHtml({
      title: `NASKAH SOAL ${exam.title}`,
      subtitle: `${schoolSettings.school_name} • Tahun Pelajaran ${schoolSettings.academic_year}`,
      metaRows: [
        { label: "Mata Pelajaran", value: sub?.name || "-" },
        { label: "Kelas", value: targetClassLabel },
        { label: "Hari / Tanggal", value: exam.exam_date || "-" },
        {
          label: "Waktu / Durasi",
          value: `${exam.start_time} - ${exam.end_time} (${exam.duration_minutes} Menit)`
        },
        { label: "Nama Peserta", value: "...................................................................." },
        { label: "Nomor Peserta", value: "...................................................................." }
      ],
      bodyHtml,
      schoolSettings,
      documentSettings,
      isSimulation,
      includeSignature: false
    });
    openPrintDocumentWindow(html);
  };

  return (
    <div className="space-y-4">
      <form
        onSubmit={handleCreateExam}
        className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 shadow-sm"
      >
        <h2 className="text-sm font-extrabold text-slate-900">Buat Paket & Jadwal Ujian</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Nama Ujian</label>
            <input
              type="text"
              required
              placeholder="Asesmen Sumatif Tengah Semester"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-3 py-2"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Mata Pelajaran</label>
            <select
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-3 py-2"
            >
              <option value="">-- Pilih Mapel --</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Filter Folder Soal</label>
            <select
              value={examFolderFilter}
              onChange={(e) => setExamFolderFilter(e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-3 py-2"
            >
              <option value="">Semua Folder Soal</option>
              {availableFolders.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block font-bold text-slate-700">
                Kelas Target (
                {selectedClassIds.length === 0
                  ? "Semua Kelas"
                  : `${selectedClassIds.length} kelas dipilih`}
                )
              </label>
              {classesList.length > 0 && (
                <button
                  type="button"
                  onClick={handleToggleAllClasses}
                  className="text-[11px] font-bold text-emerald-700 hover:underline"
                >
                  {selectedClassIds.length === classesList.length
                    ? "Kosongkan (Semua Kelas)"
                    : "Pilih Semua Kelas"}
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2 border border-slate-300 rounded-xl p-2.5 bg-slate-50">
              {classesList.length === 0 ? (
                <span className="text-slate-500">Belum ada data kelas.</span>
              ) : (
                classesList.map((c) => {
                  const checked = selectedClassIds.includes(c.id);
                  return (
                    <label
                      key={c.id}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold cursor-pointer transition ${
                        checked
                          ? "bg-emerald-700 border-emerald-700 text-white"
                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleClassSelect(c.id)}
                        className="hidden"
                      />
                      <span>{c.name}</span>
                    </label>
                  );
                })
              )}
            </div>
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Tanggal Ujian</label>
            <input
              type="date"
              required
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-3 py-2"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Jam Mulai - Selesai (Wajib)</label>
            <div className="flex gap-2">
              <input
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full border border-slate-300 rounded-xl px-2 py-2"
              />
              <input
                type="time"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full border border-slate-300 rounded-xl px-2 py-2"
              />
            </div>
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Durasi (Menit)</label>
            <input
              type="number"
              min="5"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-3 py-2"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <div className="text-xs font-bold text-slate-700">
            Pilih Butir Soal dari Bank Soal ({selectedQuestionIds.length} terpilih):
          </div>
          {availableQuestions.length > 0 && (
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs">
              <label className="flex items-center gap-2 font-bold text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={handleToggleSelectAllQuestions}
                  className="h-4 w-4 rounded border-slate-300"
                />
                <span>Pilih Semua ({allQuestionIds.length} soal)</span>
              </label>
              {selectedQuestionIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedQuestionIds([])}
                  className="text-[11px] font-bold text-red-600 hover:underline"
                >
                  Hapus Pilihan
                </button>
              )}
            </div>
          )}
          <div className="max-h-44 overflow-y-auto border border-slate-200 rounded-xl p-2 space-y-1 bg-slate-50">
            {availableQuestions.length === 0 ? (
              <div className="text-xs text-slate-500 p-2">
                Belum ada soal pada filter folder/mapel ini.
              </div>
            ) : (
              availableQuestions.map((q) => (
                <label
                  key={q.id}
                  className="flex items-start gap-2 p-2 bg-white rounded-lg border border-slate-200 text-xs cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedQuestionIds.includes(q.id)}
                    onChange={() => toggleQuestionSelect(q.id)}
                    className="mt-0.5"
                  />
                  <span className="line-clamp-2">
                    <strong className="text-emerald-800">[{getQuestionFolderName(q)}]</strong>{" "}
                    {q.question_text}
                  </span>
                </label>
              ))
            )}
          </div>
        </div>
        <button
          type="submit"
          className="px-4 py-2.5 rounded-xl bg-emerald-700 text-white text-xs font-extrabold"
        >
          Simpan & Terbitkan Jadwal Ujian
        </button>
      </form>
      <div className="bg-white border border-slate-200 rounded-2xl overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-700">
            <tr>
              <th className="p-3 text-left">Nama Ujian</th>
              <th className="p-3 text-left">Jadwal Aktif</th>
              <th className="p-3 text-center">Jumlah Soal</th>
              <th className="p-3 text-center">Peserta</th>
              <th className="p-3 text-center">Status Paket</th>
              <th className="p-3 text-right">Aksi & Cetak Naskah</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {exams.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-slate-500">
                  Belum ada jadwal ujian pada akun ini.
                </td>
              </tr>
            ) : (
              exams.map((ex) => {
                const pCount = participants.filter((p) => p.exam_id === ex.id).length;
                const isNonaktif = String(ex.status || "").toUpperCase() === "NONAKTIF";
                return (
                  <tr key={ex.id}>
                    <td className="p-3 font-bold text-slate-900">{ex.title}</td>
                    <td className="p-3">
                      {ex.exam_date} ({ex.start_time || "-"} - {ex.end_time || "-"})
                    </td>
                    <td className="p-3 text-center">
                      {Array.isArray(ex.question_ids) ? ex.question_ids.length : 0} soal
                    </td>
                    <td className="p-3 text-center">{pCount} siswa</td>
                    <td className="p-3 text-center">
                      <span
                        className={`px-2.5 py-0.5 rounded-full font-bold ${
                          isNonaktif
                            ? "bg-red-50 text-red-700 border border-red-200"
                            : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                        }`}
                      >
                        {isNonaktif ? "Nonaktif" : "Aktif"}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleToggleExamStatus(ex)}
                          className={`px-3 py-1.5 rounded-xl border font-bold ${
                            isNonaktif
                              ? "bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100"
                              : "bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
                          }`}
                        >
                          {isNonaktif ? "Aktifkan" : "Nonaktifkan"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePrintNaskahSoal(ex)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold inline-flex items-center gap-1"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          Cetak Naskah PDF
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================================
// MODUL 6: PESERTA UJIAN & DAFTAR HADIR BERKOP RESMI
// ============================================================================
function ParticipantsManagerView({
  supabase,
  exams,
  students,
  classesList,
  subjects,
  participants,
  attempts = [],
  examResults = [],
  schoolSettings,
  documentSettings,
  isSimulation,
  onRefresh,
  showBanner
}) {
  const [selectedExamId, setSelectedExamId] = useState("");
  const [selectedClassIds, setSelectedClassIds] = useState([]);
  const [filterClassIds, setFilterClassIds] = useState([]);

  const toggleAssignClass = (id) => {
    setSelectedClassIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleFilterClass = (id) => {
    setFilterClassIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const combinedParticipants = useMemo(() => {
    if (!selectedExamId) return [];
    const byStudentKey = new Map();
    const resolveStudent = (stId, stName, stNisn) =>
      findMatchingStudentRecord(students, { id: stId, nisn: stNisn, name: stName });

    participants
      .filter((p) => p.exam_id === selectedExamId)
      .forEach((p) => {
        const stObj = resolveStudent(p.student_id, p.student_name, p.nisn);
        const key = normalizePersonName(stObj?.full_name || p.student_name) || String(stObj?.id || p.student_id || p.nisn);
        const hasAttempt = attempts.some(
          (a) =>
            a.exam_id === selectedExamId &&
            (String(a.student_id) === String(stObj?.id || p.student_id) ||
              normalizePersonName(a.student_name) === normalizePersonName(p.student_name))
        );
        const resObj = examResults.find(
          (r) =>
            r.exam_id === selectedExamId &&
            (String(r.student_id) === String(stObj?.id || p.student_id) ||
              normalizePersonName(r.student_name) === normalizePersonName(p.student_name))
        );
        byStudentKey.set(key, {
          id: p.id,
          student_id: stObj?.id || p.student_id,
          student_name: stObj?.full_name || p.student_name,
          nis: stObj?.nis || p.nis || "",
          nisn: stObj?.nisn || p.nisn || "",
          class_id: stObj?.class_id || p.class_id || "",
          statusLabel:
            hasAttempt || resObj
              ? `Sudah Mengerjakan${resObj ? ` (Nilai: ${resObj.score})` : ""}`
              : "Terdaftar"
        });
      });

    examResults
      .filter((r) => r.exam_id === selectedExamId)
      .forEach((r) => {
        const stObj = resolveStudent(r.student_id, r.student_name, "");
        const key = normalizePersonName(stObj?.full_name || r.student_name) || String(stObj?.id || r.student_id);
        if (!byStudentKey.has(key)) {
          byStudentKey.set(key, {
            id: r.id,
            student_id: stObj?.id || r.student_id,
            student_name: stObj?.full_name || r.student_name,
            nis: stObj?.nis || "",
            nisn: stObj?.nisn || "",
            class_id: stObj?.class_id || "",
            statusLabel: `Sudah Mengerjakan (Nilai: ${r.score})`
          });
        }
      });

    attempts
      .filter((a) => a.exam_id === selectedExamId)
      .forEach((a) => {
        const stObj = resolveStudent(a.student_id, a.student_name, "");
        const key = normalizePersonName(stObj?.full_name || a.student_name) || String(stObj?.id || a.student_id);
        if (!byStudentKey.has(key)) {
          const resObj = examResults.find(
            (r) =>
              r.exam_id === selectedExamId &&
              (String(r.student_id) === String(a.student_id) ||
                normalizePersonName(r.student_name) === normalizePersonName(a.student_name))
          );
          byStudentKey.set(key, {
            id: a.id,
            student_id: stObj?.id || a.student_id,
            student_name: stObj?.full_name || a.student_name,
            nis: stObj?.nis || "",
            nisn: stObj?.nisn || "",
            class_id: stObj?.class_id || "",
            statusLabel: `Sudah Mengerjakan${resObj ? ` (Nilai: ${resObj.score})` : ""}`
          });
        }
      });

    return Array.from(byStudentKey.values()).sort((a, b) =>
      (a.student_name || "").localeCompare(b.student_name || "", "id")
    );
  }, [selectedExamId, participants, attempts, examResults, students]);

  const filteredExamParticipants = useMemo(() => {
    if (filterClassIds.length === 0) return combinedParticipants;
    return combinedParticipants.filter((p) => filterClassIds.includes(p.class_id));
  }, [combinedParticipants, filterClassIds]);

  const handleAssignByClasses = async () => {
    if (!supabase || !selectedExamId || selectedClassIds.length === 0) {
      return showBanner("error", "Pilih paket ujian dan minimal satu kelas terlebih dahulu.");
    }
    const targetStudents = students.filter((s) => selectedClassIds.includes(s.class_id));
    if (targetStudents.length === 0) {
      return showBanner("error", "Tidak ada siswa pada kelas yang dipilih.");
    }
    const existingStudentIds = new Set(
      participants.filter((p) => p.exam_id === selectedExamId).map((p) => p.student_id)
    );
    const payloads = targetStudents
      .filter((s) => !existingStudentIds.has(s.id))
      .map((s) => ({
        exam_id: selectedExamId,
        student_id: s.id,
        student_name: s.full_name,
        nis: s.nis || "",
        nisn: s.nisn || "",
        class_id: s.class_id,
        is_eligible: true,
        is_simulation: Boolean(isSimulation)
      }));
    if (payloads.length === 0) {
      return showBanner("warning", "Seluruh siswa di kelas terpilih sudah terdaftar.");
    }
    const { error } = await supabase.from("exam_participants").insert(payloads);
    if (error) return showBanner("error", error.message);
    await onRefresh();
    showBanner("success", `${payloads.length} peserta berhasil ditambahkan ke ujian.`);
  };

  const handlePrintDaftarPeserta = () => {
    const exam = exams.find((e) => e.id === selectedExamId);
    if (!exam || filteredExamParticipants.length === 0) {
      return showBanner("error", "Pilih ujian yang sudah memiliki peserta.");
    }
    const sub = subjects.find((s) => s.id === exam.subject_id);
    const selectedClassNames =
      filterClassIds.length > 0
        ? filterClassIds
            .map((id) => classesList.find((c) => c.id === id)?.name)
            .filter(Boolean)
            .join(", ")
        : "Semua Kelas Peserta";
    const bodyHtml = `
      <table class="data-table">
        <thead>
          <tr>
            <th style="width:36px;">No</th>
            <th>NIS / NISN</th>
            <th>Nama Peserta Didik</th>
            <th>Kelas</th>
            <th style="width:130px;">Tanda Tangan</th>
          </tr>
        </thead>
        <tbody>
          ${filteredExamParticipants
            .map((p, idx) => {
              const cls = classesList.find((c) => c.id === p.class_id);
              return `<tr>
                <td style="text-align:center;">${idx + 1}</td>
                <td>${escapeHtml(p.nis || "-")} / ${escapeHtml(p.nisn || "-")}</td>
                <td>${escapeHtml(p.student_name)}</td>
                <td style="text-align:center;">${escapeHtml(cls?.name || "-")}</td>
                <td>${idx + 1}. ....................</td>
              </tr>`;
            })
            .join("")}
        </tbody>
      </table>
    `;
    const html = buildOfficialDocumentHtml({
      title: "DAFTAR PESERTA & DAFTAR HADIR UJIAN",
      subtitle: `${exam.title} (${selectedClassNames})`,
      metaRows: [
        { label: "Nama Ujian", value: exam.title },
        { label: "Kelas", value: selectedClassNames },
        { label: "Mata Pelajaran", value: sub?.name || "-" },
        { label: "Tanggal Ujian", value: exam.exam_date || "-" },
        { label: "Jumlah Peserta", value: `${filteredExamParticipants.length} Siswa` }
      ],
      bodyHtml,
      schoolSettings,
      documentSettings,
      isSimulation
    });
    openPrintDocumentWindow(html);
  };

  const handleExportParticipantsExcel = async () => {
    const exam = exams.find((e) => e.id === selectedExamId);
    if (!exam || filteredExamParticipants.length === 0) {
      return showBanner("error", "Pilih ujian yang sudah memiliki peserta.");
    }
    await exportOfficialExcelWithKop({
      filename: `Daftar_Peserta_${exam.title.replace(/\s+/g, "_")}.xlsx`,
      sheetName: "Peserta_Ujian",
      title: "DAFTAR PESERTA UJIAN",
      subtitle: `${exam.title} (${exam.exam_date || "-"})`,
      columns: [
        { key: "no", label: "No", width: 8 },
        { key: "nis", label: "NIS", width: 16 },
        { key: "nisn", label: "NISN", width: 18 },
        { key: "nama", label: "Nama Peserta", width: 32 },
        { key: "kelas", label: "Kelas", width: 14 },
        { key: "status", label: "Status", width: 24 }
      ],
      rows: filteredExamParticipants.map((p, i) => ({
        no: i + 1,
        nis: p.nis || "-",
        nisn: p.nisn || "-",
        nama: p.student_name,
        kelas: classesList.find((c) => c.id === p.class_id)?.name || "-",
        status: p.statusLabel
      })),
      documentSettings,
      isSimulation
    });
  };

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Pilih Paket Ujian</label>
            <select
              value={selectedExamId}
              onChange={(e) => {
                setSelectedExamId(e.target.value);
                setFilterClassIds([]);
              }}
              className="w-full border border-slate-300 rounded-xl px-3 py-2"
            >
              <option value="">-- Pilih Ujian --</option>
              {exams.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.title}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block font-bold text-slate-700 mb-1">
              Tetapkan Peserta Multi-Kelas ({selectedClassIds.length} kelas dipilih)
            </label>
            <div className="flex flex-wrap gap-2">
              {classesList.map((c) => {
                const checked = selectedClassIds.includes(c.id);
                return (
                  <label
                    key={c.id}
                    className={`px-3 py-1.5 rounded-lg border font-bold cursor-pointer transition ${
                      checked
                        ? "bg-emerald-700 border-emerald-700 text-white"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleAssignClass(c.id)}
                      className="hidden"
                    />
                    <span>{c.name}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleAssignByClasses}
            className="px-4 py-2 rounded-xl bg-emerald-700 text-white font-bold"
          >
            Tetapkan Peserta Kelas Terpilih
          </button>
        </div>
      </div>
      {selectedExamId && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-bold text-slate-700">Filter Kelas Cetak Daftar Hadir:</span>
              <button
                type="button"
                onClick={() => setFilterClassIds([])}
                className={`px-2.5 py-1 rounded-lg border font-bold ${
                  filterClassIds.length === 0
                    ? "bg-emerald-700 border-emerald-700 text-white"
                    : "bg-slate-50 border-slate-200 text-slate-700"
                }`}
              >
                Semua ({combinedParticipants.length})
              </button>
              {classesList.map((c) => {
                const active = filterClassIds.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleFilterClass(c.id)}
                    className={`px-2.5 py-1 rounded-lg border font-bold ${
                      active
                        ? "bg-emerald-700 border-emerald-700 text-white"
                        : "bg-slate-50 border-slate-200 text-slate-700"
                    }`}
                  >
                    {c.name}
                  </button>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleExportParticipantsExcel}
                className="px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold flex items-center gap-1.5"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                Unduh Excel (.xlsx) Berkop
              </button>
              <button
                type="button"
                onClick={handlePrintDaftarPeserta}
                className="px-3.5 py-2 rounded-xl bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                Cetak Daftar Hadir PDF
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-700">
            <tr>
              <th className="p-3 text-left">NISN</th>
              <th className="p-3 text-left">Nama Peserta</th>
              <th className="p-3 text-left">Kelas</th>
              <th className="p-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredExamParticipants.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-6 text-center text-slate-500">
                  Pilih ujian di atas untuk melihat daftar peserta dan siswa yang sudah mengerjakan.
                </td>
              </tr>
            ) : (
              filteredExamParticipants.map((p) => (
                <tr key={p.id}>
                  <td className="p-3 font-mono">{p.nisn || "-"}</td>
                  <td className="p-3 font-bold">{p.student_name}</td>
                  <td className="p-3">
                    {classesList.find((c) => c.id === p.class_id)?.name || "-"}
                  </td>
                  <td className="p-3 text-center">
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-bold">
                      {p.statusLabel}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================================
// MODUL 7: PORTAL UJIAN SISWA (KUNCI KETAT SESUAI JADWAL, TIMER & SIMPAN)
// ============================================================================
function StudentExamPortalView({
  mode,
  supabase,
  currentUser,
  exams,
  subjects,
  classesList,
  questions,
  participants,
  attempts,
  studentAnswers = [],
  examResults,
  gradingFormula,
  isSimulation,
  onRefresh,
  showBanner
}) {
  const [activeExam, setActiveExam] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answersMap, setAnswersMap] = useState({});
  const [flaggedMap, setFlaggedMap] = useState({});
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [confirmFinishOpen, setConfirmFinishOpen] = useState(false);
  const [nowTick, setNowTick] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const myExams = useMemo(() => {
    const myPartExamIds = new Set(
      participants
        .filter(
          (p) =>
            p.student_id === currentUser.id ||
            (p.nisn &&
              currentUser.nisn &&
              String(p.nisn).trim() === String(currentUser.nisn).trim()) ||
            normalizePersonName(p.student_name) === normalizePersonName(currentUser.full_name)
        )
        .map((p) => p.exam_id)
    );
    return exams.filter((e) => {
      if (String(e.status || "").toUpperCase() === "NONAKTIF") return false;
      if (isSimulation) return true;
      const isAssignedAsParticipant = myPartExamIds.has(e.id);
      const targetClassList = String(e.class_id || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const matchesTargetClass =
        targetClassList.length === 0 ||
        (currentUser.class_id && targetClassList.includes(String(currentUser.class_id)));
      return isAssignedAsParticipant || matchesTargetClass;
    });
  }, [exams, participants, currentUser, isSimulation]);

  const activeQuestions = useMemo(() => {
    if (!activeExam) return [];
    const sched = evaluateExamSchedule(activeExam, nowTick);
    if (!sched.canOpen) return [];
    const qIds = Array.isArray(activeExam.question_ids) ? activeExam.question_ids : [];
    return qIds.map((id) => questions.find((q) => q.id === id)).filter(Boolean);
  }, [activeExam, questions, nowTick]);

  const handleSubmitExam = async (isAuto = false, targetExam = activeExam) => {
    if (!targetExam) return;
    setConfirmFinishOpen(false);
    const storageKey = `cbt_min4_ans_${targetExam.id}_${currentUser.id}`;
    let localSavedMap = {};
    try {
      const rawLocal = localStorage.getItem(storageKey);
      if (rawLocal) localSavedMap = JSON.parse(rawLocal) || {};
    } catch {
      localSavedMap = {};
    }
    const dbSavedMap = {};
    studentAnswers
      .filter((a) => a.exam_id === targetExam.id && String(a.student_id) === String(currentUser.id))
      .forEach((a) => {
        if (a.question_id && a.answer) dbSavedMap[a.question_id] = a.answer;
      });
    const currentAnswers = { ...dbSavedMap, ...localSavedMap, ...answersMap };
    if (supabase) {
      await supabase.from("exam_attempts").insert([
        {
          exam_id: targetExam.id,
          student_id: currentUser.id,
          student_name: currentUser.full_name,
          answers: currentAnswers,
          status: isAuto ? "AUTO_TIMEOUT" : "SELESAI",
          is_simulation: Boolean(isSimulation)
        }
      ]);
      const { data: latestDbAns } = await supabase
        .from("student_answers")
        .select("*")
        .eq("exam_id", targetExam.id)
        .eq("student_id", currentUser.id)
        .limit(1000);
      if (Array.isArray(latestDbAns)) {
        latestDbAns.forEach((a) => {
          if (a.question_id && a.answer && !currentAnswers[a.question_id]) {
            currentAnswers[a.question_id] = a.answer;
          }
        });
      }
      const fullQuestions = await fetchQuestionsByIdsSafe(
        supabase,
        targetExam.question_ids || [],
        []
      );
      if (Array.isArray(fullQuestions) && fullQuestions.length > 0) {
        const summary = computeExamScoreSummary(fullQuestions, currentAnswers, gradingFormula);
        await supabase.from("exam_results").upsert({
          id: `${targetExam.id}_${currentUser.id}`,
          exam_id: targetExam.id,
          exam_title: targetExam.title,
          student_id: currentUser.id,
          student_name: currentUser.full_name,
          score: summary.finalScore,
          correct_count: summary.correctCount,
          wrong_count: summary.wrongCount,
          empty_count: summary.emptyCount,
          is_simulation: Boolean(isSimulation),
          updated_at: new Date().toISOString()
        });
      }
      await onRefresh();
    }
    localStorage.removeItem(storageKey);
    setActiveExam(null);
    showBanner(
      "success",
      isAuto
        ? "Jadwal atau waktu ujian telah berakhir. Jawaban Anda telah diserahkan otomatis."
        : "Ujian berhasil diselesaikan dan jawaban tersimpan."
    );
  };

  useEffect(() => {
    if (!activeExam) return;
    const sched = evaluateExamSchedule(activeExam, nowTick);
    if (!sched.canOpen) {
      handleSubmitExam(true, activeExam);
      return;
    }
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleSubmitExam(true, activeExam);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [activeExam, nowTick]);

  const handleStartExam = (exam) => {
    const sched = evaluateExamSchedule(exam, Date.now());
    if (!sched.canOpen) {
      return showBanner("error", `Soal tidak dapat dibuka: ${sched.message}`);
    }
    const storageKey = `cbt_min4_ans_${exam.id}_${currentUser.id}`;
    const savedLocal = localStorage.getItem(storageKey);
    if (savedLocal) {
      try {
        setAnswersMap(JSON.parse(savedLocal));
      } catch {
        setAnswersMap({});
      }
    } else {
      setAnswersMap({});
    }
    const durationSecs = (Number(exam.duration_minutes) || 60) * 60;
    const remainingScheduleSecs = Math.max(
      1,
      Math.floor((sched.remainingMs || durationSecs * 1000) / 1000)
    );
    setCurrentIndex(0);
    setSecondsLeft(Math.min(durationSecs, remainingScheduleSecs));
    setActiveExam(exam);
  };

  const handleSelectAnswer = async (questionId, value) => {
    if (!activeExam) return;
    const sched = evaluateExamSchedule(activeExam, Date.now());
    if (!sched.canOpen) {
      showBanner("error", `Jawaban ditolak karena di luar jadwal ujian: ${sched.message}`);
      await handleSubmitExam(true, activeExam);
      return;
    }
    const updated = { ...answersMap, [questionId]: value };
    setAnswersMap(updated);
    const storageKey = `cbt_min4_ans_${activeExam.id}_${currentUser.id}`;
    localStorage.setItem(storageKey, JSON.stringify(updated));
    if (supabase) {
      await supabase.from("student_answers").upsert({
        id: `${activeExam.id}_${currentUser.id}_${questionId}`,
        exam_id: activeExam.id,
        student_id: currentUser.id,
        question_id: questionId,
        answer: String(value),
        is_simulation: Boolean(isSimulation),
        updated_at: new Date().toISOString()
      });
    }
  };

  if (mode === "student_history") {
    const myResults = examResults.filter(
      (r) =>
        String(r.student_id) === String(currentUser.id) ||
        normalizePersonName(r.student_name) === normalizePersonName(currentUser.full_name)
    );
    return (
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-700">
            <tr>
              <th className="p-3 text-left">Nama Ujian</th>
              <th className="p-3 text-center">Benar</th>
              <th className="p-3 text-center">Salah</th>
              <th className="p-3 text-center">Kosong</th>
              <th className="p-3 text-center">Nilai</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {myResults.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-slate-500">
                  Belum ada riwayat nilai ujian.
                </td>
              </tr>
            ) : (
              myResults.map((r) => {
                const relatedExam = exams.find((e) => e.id === r.exam_id);
                const canShowScore = relatedExam?.show_result_to_student !== false;
                return (
                  <tr key={r.id}>
                    <td className="p-3 font-bold">{r.exam_title}</td>
                    <td className="p-3 text-center">{canShowScore ? r.correct_count : "-"}</td>
                    <td className="p-3 text-center">{canShowScore ? r.wrong_count : "-"}</td>
                    <td className="p-3 text-center">{canShowScore ? r.empty_count : "-"}</td>
                    <td className="p-3 text-center font-extrabold text-emerald-800">
                      {canShowScore ? r.score : "Menunggu Pengumuman"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    );
  }

  if (activeExam && activeQuestions.length > 0) {
    const q = activeQuestions[currentIndex];
    const mins = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
    const secs = String(secondsLeft % 60).padStart(2, "0");
    const opts = Array.isArray(q.options) ? q.options : [];
    const currentAns = answersMap[q.id] || "";
    const isKompleks = String(q.type || "").toUpperCase() === "PG_KOMPLEKS";
    const isStatementType =
      String(q.type || "").toUpperCase() === "BENAR_SALAH" ||
      String(q.type || "").toUpperCase() === "TEPAT_TIDAK_TEPAT";
    const selectedMultiSet = new Set(
      String(currentAns)
        .split(",")
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean)
    );
    const statementAnswers = String(currentAns).split(",");
    const toggleMultiOption = (optKey) => {
      const next = new Set(selectedMultiSet);
      const k = String(optKey).toUpperCase();
      if (next.has(k)) next.delete(k);
      else next.add(k);
      handleSelectAnswer(q.id, Array.from(next).join(","));
    };
    const setStatementToken = (idx, token) => {
      const arr = Array.from({ length: Math.max(opts.length, idx + 1) }, (_, i) =>
        String(statementAnswers[i] || "").trim().toUpperCase()
      );
      arr[idx] = token;
      handleSelectAnswer(q.id, arr.join(","));
    };

    return (
      <div className="space-y-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs font-extrabold text-slate-900">{activeExam.title}</div>
            <div className="text-[11px] text-slate-500">
              Soal {currentIndex + 1} dari {activeQuestions.length} • Selesai{" "}
              {activeExam.end_time || "-"}
            </div>
          </div>
          <div className="px-3.5 py-1.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 font-mono font-extrabold text-sm flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            {mins}:{secs}
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-3 bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
            <div className="text-sm font-bold text-slate-900 whitespace-pre-line">
              {currentIndex + 1}. {q.question_text}
            </div>
            {isStatementType && opts.length > 0 ? (
              <div className="space-y-2.5">
                {opts.map((o, idx) => {
                  const chosen = statementAnswers[idx] || "";
                  const t1 =
                    String(q.type || "").toUpperCase() === "TEPAT_TIDAK_TEPAT" ? "T" : "B";
                  const t2 =
                    String(q.type || "").toUpperCase() === "TEPAT_TIDAK_TEPAT" ? "TT" : "S";
                  const lbl1 =
                    String(q.type || "").toUpperCase() === "TEPAT_TIDAK_TEPAT"
                      ? "Tepat (T)"
                      : "Benar (B)";
                  const lbl2 =
                    String(q.type || "").toUpperCase() === "TEPAT_TIDAK_TEPAT"
                      ? "Tidak Tepat (TT)"
                      : "Salah (S)";
                  return (
                    <div
                      key={o.key}
                      className="p-3 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                    >
                      <div className="font-semibold text-slate-800">
                        <strong>{idx + 1}.</strong> {o.text}
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setStatementToken(idx, t1)}
                          className={`px-3 py-1.5 rounded-lg border font-bold ${
                            chosen === t1
                              ? "bg-emerald-700 border-emerald-700 text-white"
                              : "bg-slate-50 border-slate-300 text-slate-700"
                          }`}
                        >
                          {lbl1}
                        </button>
                        <button
                          type="button"
                          onClick={() => setStatementToken(idx, t2)}
                          className={`px-3 py-1.5 rounded-lg border font-bold ${
                            chosen === t2
                              ? "bg-emerald-700 border-emerald-700 text-white"
                              : "bg-slate-50 border-slate-300 text-slate-700"
                          }`}
                        >
                          {lbl2}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : opts.length > 0 ? (
              <div className="space-y-2">
                {opts.map((o) => {
                  const checked = isKompleks
                    ? selectedMultiSet.has(String(o.key).toUpperCase())
                    : currentAns === o.key;
                  return (
                    <label
                      key={o.key}
                      className={`flex items-center gap-3 p-3 rounded-xl border text-xs cursor-pointer ${
                        checked
                          ? "bg-emerald-50 border-emerald-500 font-bold"
                          : "border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type={isKompleks ? "checkbox" : "radio"}
                        name={`q_${q.id}`}
                        checked={checked}
                        onChange={() =>
                          isKompleks ? toggleMultiOption(o.key) : handleSelectAnswer(q.id, o.key)
                        }
                      />
                      <span>
                        <strong>{o.key}.</strong> {o.text}
                      </span>
                    </label>
                  );
                })}
              </div>
            ) : (
              <textarea
                rows={4}
                placeholder="Ketik jawaban Anda di sini..."
                value={currentAns}
                onChange={(e) => handleSelectAnswer(q.id, e.target.value)}
                className="w-full border border-slate-300 rounded-xl p-3 text-xs"
              />
            )}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                disabled={currentIndex === 0}
                onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                className="px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-bold disabled:opacity-40 flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                Sebelumnya
              </button>
              <button
                type="button"
                onClick={() => setFlaggedMap((prev) => ({ ...prev, [q.id]: !prev[q.id] }))}
                className={`px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center gap-1 ${
                  flaggedMap[q.id]
                    ? "bg-amber-100 border-amber-400 text-amber-900"
                    : "border-slate-300 text-slate-700"
                }`}
              >
                <Flag className="w-3.5 h-3.5" />
                Ragu-ragu
              </button>
              {currentIndex < activeQuestions.length - 1 ? (
                <button
                  type="button"
                  onClick={() =>
                    setCurrentIndex((i) => Math.min(activeQuestions.length - 1, i + 1))
                  }
                  className="px-3.5 py-2 rounded-xl bg-emerald-700 text-white text-xs font-bold flex items-center gap-1"
                >
                  Berikutnya
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmFinishOpen(true)}
                  className="px-4 py-2 rounded-xl bg-emerald-800 text-white text-xs font-extrabold"
                >
                  Selesai & Kumpulkan
                </button>
              )}
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
            <div className="text-xs font-extrabold text-slate-800">Navigasi Nomor Soal</div>
            <div className="grid grid-cols-5 gap-1.5">
              {activeQuestions.map((item, idx) => {
                const answered = Boolean(answersMap[item.id]);
                const flagged = Boolean(flaggedMap[item.id]);
                const isCurr = idx === currentIndex;
                let cls = "bg-slate-100 text-slate-700 border-slate-200";
                if (flagged) cls = "bg-amber-100 text-amber-900 border-amber-400";
                else if (answered) cls = "bg-emerald-600 text-white border-emerald-600";
                if (isCurr) cls += " ring-2 ring-emerald-800";
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setCurrentIndex(idx)}
                    className={`py-2 rounded-lg border text-xs font-bold ${cls}`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => setConfirmFinishOpen(true)}
              className="w-full py-2 rounded-xl bg-red-600 text-white text-xs font-extrabold"
            >
              Akhiri Ujian
            </button>
          </div>
        </div>
        {confirmFinishOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-3">
              <h3 className="text-sm font-extrabold text-slate-900">Konfirmasi Pengumpulan</h3>
              <p className="text-xs text-slate-600">
                Terjawab <strong>{Object.keys(answersMap).length}</strong> dari{" "}
                <strong>{activeQuestions.length}</strong> soal. Setelah dikumpulkan, jawaban tidak
                dapat diubah.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmFinishOpen(false)}
                  className="px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-bold"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => handleSubmitExam(false, activeExam)}
                  className="px-4 py-2 rounded-xl bg-emerald-700 text-white text-xs font-extrabold"
                >
                  Ya, Kumpulkan Sekarang
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {myExams.length === 0 ? (
        <div className="md:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 text-center text-xs text-slate-500">
          Belum ada paket ujian yang dijadwalkan untuk akun Anda.
        </div>
      ) : (
        myExams.map((ex) => {
          const sub = subjects.find((s) => s.id === ex.subject_id);
          const alreadyDone =
            attempts.some(
              (a) =>
                a.exam_id === ex.id &&
                (String(a.student_id) === String(currentUser.id) ||
                  normalizePersonName(a.student_name) ===
                    normalizePersonName(currentUser.full_name))
            ) ||
            examResults.some(
              (r) =>
                r.exam_id === ex.id &&
                (String(r.student_id) === String(currentUser.id) ||
                  normalizePersonName(r.student_name) ===
                    normalizePersonName(currentUser.full_name))
            );
          const sched = evaluateExamSchedule(ex, nowTick);
          return (
            <div
              key={ex.id}
              className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between gap-4"
            >
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-extrabold text-emerald-800">{sub?.name || "Ujian"}</span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                      sched.canOpen
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                        : "bg-amber-50 text-amber-900 border border-amber-300"
                    }`}
                  >
                    {sched.canOpen ? "Terbuka" : "Terkunci Jadwal"}
                  </span>
                </div>
                <h3 className="text-sm font-extrabold text-slate-900">{ex.title}</h3>
                <p className="text-slate-600">
                  Jadwal: <strong>{ex.exam_date}</strong> • Jam{" "}
                  <strong>
                    {ex.start_time || "-"} - {ex.end_time || "-"}
                  </strong>{" "}
                  ({ex.duration_minutes} menit)
                </p>
                <p className="text-slate-500">
                  Jumlah Soal: {Array.isArray(ex.question_ids) ? ex.question_ids.length : 0} butir
                </p>
                {!alreadyDone && !sched.canOpen && (
                  <p className="text-[11px] font-semibold text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 mt-1 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 shrink-0" />
                    <span>{sched.message}</span>
                  </p>
                )}
              </div>
              {alreadyDone ? (
                <span className="inline-flex items-center justify-center px-3 py-2 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold">
                  Sudah Dikerjakan
                </span>
              ) : sched.canOpen ? (
                <button
                  type="button"
                  onClick={() => handleStartExam(ex)}
                  className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-extrabold"
                >
                  Mulai Kerjakan Ujian
                </button>
              ) : (
                <button
                  type="button"
                  disabled
                  className="px-4 py-2.5 rounded-xl bg-slate-200 text-slate-500 text-xs font-bold cursor-not-allowed flex items-center justify-center gap-1.5"
                >
                  <Lock className="w-3.5 h-3.5" />
                  {sched.statusCode === "NOT_STARTED"
                    ? `Belum Dibuka (${sched.countdown || ""})`
                    : "Jadwal Berakhir"}
                </button>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

// ============================================================================
// MODUL 8: HASIL UJIAN, RUMUS PENILAIAN TERPUSAT & KOREKSI ULANG OTOMATIS
// ============================================================================
function ResultsAndGradingView({
  supabase,
  exams,
  questions,
  students = [],
  classesList = [],
  subjects = [],
  participants = [],
  attempts = [],
  studentAnswers = [],
  examResults,
  gradingFormula = DEFAULT_GRADING_FORMULA,
  schoolSettings,
  documentSettings,
  isSimulation,
  onSaveFormula,
  onRefresh,
  showBanner
}) {
  const [selectedExamId, setSelectedExamId] = useState("");
  const [filterClassId, setFilterClassId] = useState("");
  const [searchStudent, setSearchStudent] = useState("");
  const [regrading, setRegrading] = useState(false);
  const [formulaDraft, setFormulaDraft] = useState({
    ...DEFAULT_GRADING_FORMULA,
    ...gradingFormula
  });

  useEffect(() => {
    setFormulaDraft({ ...DEFAULT_GRADING_FORMULA, ...gradingFormula });
  }, [gradingFormula]);

  const filteredResults = useMemo(() => {
    const base = selectedExamId
      ? examResults.filter((r) => r.exam_id === selectedExamId)
      : examResults;

    return base
      .map((r) => {
        const matchedStd = findMatchingStudentRecord(students, {
          id: r.student_id,
          name: r.student_name
        });
        const clsName =
          classesList.find((c) => String(c.id) === String(matchedStd?.class_id || ""))?.name ||
          "-";
        return {
          ...r,
          resolvedStudentName: matchedStd?.full_name || r.student_name,
          resolvedClassId: matchedStd?.class_id || "",
          resolvedClassName: clsName
        };
      })
      .filter((r) => {
        const matchClass =
          !filterClassId || String(r.resolvedClassId) === String(filterClassId);
        const q = normalizePersonName(searchStudent);
        const matchName =
          !q ||
          normalizePersonName(r.resolvedStudentName).includes(q) ||
          normalizePersonName(r.resolvedClassName).includes(q);
        return matchClass && matchName;
      });
  }, [examResults, selectedExamId, filterClassId, searchStudent, students, classesList]);

  const handleRecalculateAllResults = async () => {
    if (!supabase) return;
    setRegrading(true);
    try {
      const targetExams = selectedExamId
        ? exams.filter((e) => e.id === selectedExamId)
        : exams;
      let updatedCount = 0;

      for (const ex of targetExams) {
        const qIds = Array.isArray(ex.question_ids) ? ex.question_ids : [];
        const fullQuestions = await fetchQuestionsByIdsSafe(supabase, qIds, questions);
        if (fullQuestions.length === 0) continue;

        const examAtts = attempts.filter((a) => a.exam_id === ex.id);
        const examAnsRows = studentAnswers.filter((a) => a.exam_id === ex.id);
        const examResRows = examResults.filter((r) => r.exam_id === ex.id);

        const candidateMap = new Map();
        const registerCandidate = (stId, stName, answersObj = {}) => {
          const matchedStd = findMatchingStudentRecord(students, {
            id: stId,
            name: stName
          });
          const canonicalId = String(matchedStd?.id || stId || "").trim();
          const canonicalName = String(matchedStd?.full_name || stName || "Siswa").trim();
          const key = normalizePersonName(canonicalName) || canonicalId;
          if (!key) return;

          const prev = candidateMap.get(key) || {
            studentId: canonicalId || key,
            studentName: canonicalName,
            answers: {}
          };
          if (canonicalId && (!prev.studentId || prev.studentId === key)) {
            prev.studentId = canonicalId;
          }
          if (canonicalName && prev.studentName === "Siswa") {
            prev.studentName = canonicalName;
          }
          prev.answers = { ...prev.answers, ...(answersObj || {}) };
          candidateMap.set(key, prev);
        };

        examResRows.forEach((r) => registerCandidate(r.student_id, r.student_name, {}));
        examAtts.forEach((att) =>
          registerCandidate(att.student_id, att.student_name, att.answers || {})
        );
        examAnsRows.forEach((ans) => {
          if (ans.question_id) {
            registerCandidate(ans.student_id, "", { [ans.question_id]: ans.answer });
          }
        });

        for (const cand of candidateMap.values()) {
          const mergedAnswers = { ...cand.answers };
          examAnsRows
            .filter((a) => {
              const matchedStd = findMatchingStudentRecord(students, { id: a.student_id });
              const rowKey =
                normalizePersonName(matchedStd?.full_name || "") || String(a.student_id || "");
              const candKey =
                normalizePersonName(cand.studentName) || String(cand.studentId || "");
              return (
                String(a.student_id) === String(cand.studentId) ||
                (rowKey && candKey && rowKey === candKey)
              );
            })
            .forEach((a) => {
              if (
                a.question_id &&
                a.answer !== undefined &&
                a.answer !== null &&
                String(a.answer).trim() !== ""
              ) {
                mergedAnswers[a.question_id] = a.answer;
              }
            });

          const summary = computeExamScoreSummary(fullQuestions, mergedAnswers, formulaDraft);
          await supabase.from("exam_results").upsert({
            id: `${ex.id}_${cand.studentId}`,
            exam_id: ex.id,
            exam_title: ex.title,
            student_id: cand.studentId,
            student_name: cand.studentName,
            score: summary.finalScore,
            correct_count: summary.correctCount,
            wrong_count: summary.wrongCount,
            empty_count: summary.emptyCount,
            is_simulation: Boolean(isSimulation),
            updated_at: new Date().toISOString()
          });
          updatedCount++;
        }
      }

      await onRefresh();
      showBanner(
        "success",
        `Koreksi ulang selesai! ${updatedCount} rekap nilai diperbarui sesuai rumus penilaian aktif.`
      );
    } catch (err) {
      showBanner("error", `Gagal menjalankan koreksi ulang: ${err.message}`);
    } finally {
      setRegrading(false);
    }
  };

  const handleExportExcel = async () => {
    if (filteredResults.length === 0) {
      return showBanner("error", "Belum ada data hasil ujian untuk diekspor.");
    }
    const examObj = exams.find((e) => e.id === selectedExamId);
    const subObj = examObj ? subjects.find((s) => s.id === examObj.subject_id) : null;
    await exportOfficialExcelWithKop({
      filename: `Rekap_Nilai_${(examObj?.title || "Semua_Ujian").replace(/\s+/g, "_")}.xlsx`,
      sheetName: "Hasil_Ujian",
      title: "REKAPITULASI HASIL UJIAN SISWA",
      subtitle: examObj
        ? `${examObj.title} • Mapel: ${subObj?.name || "-"} • Tanggal: ${examObj.exam_date || "-"}`
        : "Semua Paket Ujian",
      columns: [
        { key: "no", label: "No", width: 8 },
        { key: "ujian", label: "Nama Ujian", width: 28 },
        { key: "nama", label: "Nama Siswa", width: 28 },
        { key: "kelas", label: "Kelas", width: 12 },
        { key: "benar", label: "Benar", width: 10 },
        { key: "salah", label: "Salah", width: 10 },
        { key: "kosong", label: "Kosong", width: 10 },
        { key: "nilai", label: "Nilai Akhir", width: 14 },
        { key: "ket", label: "Keterangan", width: 16 }
      ],
      rows: filteredResults.map((r, i) => ({
        no: i + 1,
        ujian: r.exam_title,
        nama: r.resolvedStudentName,
        kelas: r.resolvedClassName,
        benar: r.correct_count,
        salah: r.wrong_count,
        kosong: r.empty_count,
        nilai: r.score,
        ket: Number(r.score) >= (Number(formulaDraft.kkm) || 75) ? "Tuntas" : "Remedial"
      })),
      documentSettings,
      isSimulation
    });
  };

  const handlePrintResultsPdf = () => {
    if (filteredResults.length === 0) {
      return showBanner("error", "Belum ada data hasil ujian untuk dicetak.");
    }
    const examObj = exams.find((e) => e.id === selectedExamId);
    const bodyHtml = `
      <table class="data-table">
        <thead>
          <tr>
            <th style="width:36px;">No</th>
            <th>Nama Siswa</th>
            <th>Kelas</th>
            <th>Paket Ujian</th>
            <th>Benar</th>
            <th>Salah</th>
            <th>Kosong</th>
            <th>Nilai</th>
          </tr>
        </thead>
        <tbody>
          ${filteredResults
            .map(
              (r, idx) => `<tr>
                <td style="text-align:center;">${idx + 1}</td>
                <td>${escapeHtml(r.resolvedStudentName)}</td>
                <td style="text-align:center;">${escapeHtml(r.resolvedClassName)}</td>
                <td>${escapeHtml(r.exam_title)}</td>
                <td style="text-align:center;">${r.correct_count}</td>
                <td style="text-align:center;">${r.wrong_count}</td>
                <td style="text-align:center;">${r.empty_count}</td>
                <td style="text-align:center; font-weight:bold;">${escapeHtml(r.score)}</td>
              </tr>`
            )
            .join("")}
        </tbody>
      </table>
    `;
    const html = buildOfficialDocumentHtml({
      title: "DAFTAR NILAI HASIL UJIAN",
      subtitle: examObj ? examObj.title : "Seluruh Ujian",
      metaRows: [
        { label: "Paket Ujian", value: examObj ? examObj.title : "Semua Ujian" },
        { label: "KKM / Standar", value: String(formulaDraft.kkm || 75) },
        { label: "Jumlah Rekap", value: `${filteredResults.length} Siswa` }
      ],
      bodyHtml,
      schoolSettings,
      documentSettings,
      isSimulation
    });
    openPrintDocumentWindow(html);
  };

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 text-xs shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">
              Rumus & Aturan Penilaian Otomatis Terpusat
            </h3>
            <p className="text-[11px] text-slate-500">
              Menjamin konsistensi skor dan koreksi ulang pada seluruh rekap nilai siswa.
            </p>
          </div>
          <button
            type="button"
            disabled={regrading}
            onClick={handleRecalculateAllResults}
            className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold flex items-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${regrading ? "animate-spin" : ""}`} />
            {regrading ? "Menghitung Ulang..." : "Jalankan Koreksi Ulang Otomatis"}
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Skema Bobot Soal</label>
            <select
              value={formulaDraft.weight_mode}
              onChange={(e) => setFormulaDraft({ ...formulaDraft, weight_mode: e.target.value })}
              className="w-full border border-slate-300 rounded-xl px-3 py-2"
            >
              <option value="EQUAL_PER_QUESTION">Bobot Rata per Butir Soal</option>
              <option value="BY_QUESTION_WEIGHT">Sesuai Bobot Tiap Butir Soal</option>
            </select>
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">PG Kompleks & Benar/Salah</label>
            <select
              value={formulaDraft.pg_kompleks_mode}
              onChange={(e) =>
                setFormulaDraft({ ...formulaDraft, pg_kompleks_mode: e.target.value })
              }
              className="w-full border border-slate-300 rounded-xl px-3 py-2"
            >
              <option value="STRICT">Ketat (Harus Tepat Semua)</option>
              <option value="PROPORTIONAL">Proporsional (Poin Sebagian)</option>
            </select>
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Isian Singkat / Uraian</label>
            <select
              value={formulaDraft.isian_mode}
              onChange={(e) => setFormulaDraft({ ...formulaDraft, isian_mode: e.target.value })}
              className="w-full border border-slate-300 rounded-xl px-3 py-2"
            >
              <option value="CASE_INSENSITIVE">Abaikan Huruf Besar/Kecil</option>
              <option value="CASE_SENSITIVE">Persis Huruf Besar/Kecil</option>
            </select>
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Pembulatan Nilai</label>
            <select
              value={formulaDraft.rounding_mode}
              onChange={(e) =>
                setFormulaDraft({ ...formulaDraft, rounding_mode: e.target.value })
              }
              className="w-full border border-slate-300 rounded-xl px-3 py-2"
            >
              <option value="2_DECIMALS">2 Angka Desimal (Contoh: 87.50)</option>
              <option value="INTEGER">Bilangan Bulat (Contoh: 88)</option>
            </select>
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Skor Maksimal & KKM</label>
            <div className="flex gap-2">
              <input
                type="number"
                min="1"
                value={formulaDraft.max_score}
                onChange={(e) =>
                  setFormulaDraft({ ...formulaDraft, max_score: Number(e.target.value) || 100 })
                }
                placeholder="Max"
                className="w-1/2 border border-slate-300 rounded-xl px-2 py-2"
              />
              <input
                type="number"
                min="0"
                max="100"
                value={formulaDraft.kkm}
                onChange={(e) =>
                  setFormulaDraft({ ...formulaDraft, kkm: Number(e.target.value) || 75 })
                }
                placeholder="KKM"
                className="w-1/2 border border-slate-300 rounded-xl px-2 py-2"
              />
            </div>
          </div>
        </div>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => onSaveFormula?.(formulaDraft)}
            className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            Simpan Rumus Penilaian
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          <select
            value={selectedExamId}
            onChange={(e) => setSelectedExamId(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold"
          >
            <option value="">Semua Paket Ujian</option>
            {exams.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.title}
              </option>
            ))}
          </select>
          <select
            value={filterClassId}
            onChange={(e) => setFilterClassId(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold"
          >
            <option value="">Semua Kelas</option>
            {classesList.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchStudent}
              onChange={(e) => setSearchStudent(e.target.value)}
              placeholder="Cari nama siswa..."
              className="w-full text-xs outline-none"
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleExportExcel}
            className="px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
            Unduh Excel (.xlsx) Berkop
          </button>
          <button
            type="button"
            onClick={handlePrintResultsPdf}
            className="px-3.5 py-2 rounded-xl bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4" />
            Cetak Nilai PDF
          </button>
        </div>
      </div>

      <StudentMonitorPanel
        students={students}
        classesList={classesList}
        participants={participants}
        attempts={attempts}
        studentAnswers={studentAnswers}
        examResults={examResults}
        selectedExamId={selectedExamId}
        filterClassId={filterClassId}
      />

      <div className="bg-white border border-slate-200 rounded-2xl overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-700">
            <tr>
              <th className="p-3 text-left">Nama Siswa</th>
              <th className="p-3 text-center">Kelas</th>
              <th className="p-3 text-left">Paket Ujian</th>
              <th className="p-3 text-center">Benar</th>
              <th className="p-3 text-center">Salah</th>
              <th className="p-3 text-center">Kosong</th>
              <th className="p-3 text-center">Nilai</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredResults.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-6 text-center text-slate-500">
                  Belum ada data nilai ujian pada filter ini.
                </td>
              </tr>
            ) : (
              filteredResults.map((r) => (
                <tr key={r.id}>
                  <td className="p-3 font-bold text-slate-900">{r.resolvedStudentName}</td>
                  <td className="p-3 text-center font-semibold">{r.resolvedClassName}</td>
                  <td className="p-3">{r.exam_title}</td>
                  <td className="p-3 text-center text-emerald-700 font-bold">{r.correct_count}</td>
                  <td className="p-3 text-center text-red-600 font-bold">{r.wrong_count}</td>
                  <td className="p-3 text-center text-slate-500">{r.empty_count}</td>
                  <td className="p-3 text-center font-extrabold text-emerald-800">{r.score}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================================
// MODUL 9: ANALISIS BUTIR SOAL & REKAP LAPORAN RESMI BERKOP
// ============================================================================
function ItemAnalysisView({
  exams,
  questions,
  studentAnswers,
  examResults,
  subjects,
  schoolSettings,
  documentSettings,
  isSimulation,
  showBanner
}) {
  const [selectedExamId, setSelectedExamId] = useState("");
  const analysisRows = useMemo(() => {
    if (!selectedExamId) return [];
    const exam = exams.find((e) => e.id === selectedExamId);
    if (!exam) return [];
    const qIds = Array.isArray(exam.question_ids) ? exam.question_ids : [];
    const examQuestions = qIds
      .map((id) => questions.find((q) => q.id === id))
      .filter(Boolean);
    const examAns = studentAnswers.filter((a) => a.exam_id === selectedExamId);
    const totalParticipants = Math.max(
      examResults.filter((r) => r.exam_id === selectedExamId).length,
      new Set(examAns.map((a) => a.student_id)).size,
      1
    );
    return examQuestions.map((q, idx) => {
      const ansForQ = examAns.filter((a) => a.question_id === q.id);
      let correct = 0;
      ansForQ.forEach((a) => {
        const ev = evaluateSingleQuestionAnswer(q, a.answer);
        if (ev.status === "CORRECT") correct++;
      });
      const rate = Math.round((correct / totalParticipants) * 100);
      let kriteria = "Sedang";
      if (rate >= 75) kriteria = "Mudah";
      else if (rate < 35) kriteria = "Sukar";
      return {
        no: idx + 1,
        id: q.id,
        question_text: q.question_text,
        correct,
        totalParticipants,
        rate,
        kriteria
      };
    });
  }, [selectedExamId, exams, questions, studentAnswers, examResults]);

  const handlePrintAnalysis = () => {
    const exam = exams.find((e) => e.id === selectedExamId);
    if (!exam || analysisRows.length === 0) {
      return showBanner("error", "Pilih ujian yang memiliki soal untuk dicetak.");
    }
    const sub = subjects.find((s) => s.id === exam.subject_id);
    const bodyHtml = `
      <table class="data-table">
        <thead>
          <tr>
            <th style="width:36px;">No</th>
            <th>Butir Soal</th>
            <th>Menjawab Benar</th>
            <th>Tingkat Kemudahan</th>
            <th>Kriteria</th>
          </tr>
        </thead>
        <tbody>
          ${analysisRows
            .map(
              (r) => `<tr>
                <td style="text-align:center;">${r.no}</td>
                <td>${escapeHtml(r.question_text)}</td>
                <td style="text-align:center;">${r.correct} / ${r.totalParticipants}</td>
                <td style="text-align:center;">${r.rate}%</td>
                <td style="text-align:center;">${escapeHtml(r.kriteria)}</td>
              </tr>`
            )
            .join("")}
        </tbody>
      </table>
    `;
    const html = buildOfficialDocumentHtml({
      title: "LAPORAN ANALISIS BUTIR SOAL",
      subtitle: `${exam.title} (${sub?.name || "-"})`,
      metaRows: [
        { label: "Paket Ujian", value: exam.title },
        { label: "Mata Pelajaran", value: sub?.name || "-" },
        { label: "Jumlah Butir Soal", value: `${analysisRows.length} Soal` }
      ],
      bodyHtml,
      schoolSettings,
      documentSettings,
      isSimulation
    });
    openPrintDocumentWindow(html);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <select
          value={selectedExamId}
          onChange={(e) => setSelectedExamId(e.target.value)}
          className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold"
        >
          <option value="">-- Pilih Paket Ujian untuk Dianalisis --</option>
          {exams.map((ex) => (
            <option key={ex.id} value={ex.id}>
              {ex.title}
            </option>
          ))}
        </select>
        {selectedExamId && (
          <button
            type="button"
            onClick={handlePrintAnalysis}
            className="px-4 py-2 rounded-xl bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4" />
            Cetak Analisis Soal PDF
          </button>
        )}
      </div>
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-700">
            <tr>
              <th className="p-3 text-center w-12">No</th>
              <th className="p-3 text-left">Butir Soal</th>
              <th className="p-3 text-center">Benar</th>
              <th className="p-3 text-center">% Benar</th>
              <th className="p-3 text-center">Kriteria</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {analysisRows.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-slate-500">
                  Pilih ujian di atas untuk melihat analisis butir soal.
                </td>
              </tr>
            ) : (
              analysisRows.map((r) => (
                <tr key={r.id}>
                  <td className="p-3 text-center font-bold">{r.no}</td>
                  <td className="p-3">{r.question_text}</td>
                  <td className="p-3 text-center">
                    {r.correct} / {r.totalParticipants}
                  </td>
                  <td className="p-3 text-center font-bold">{r.rate}%</td>
                  <td className="p-3 text-center">{r.kriteria}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function OfficialReportsView({
  exams,
  students,
  classesList,
  subjects,
  participants,
  examResults,
  schoolSettings,
  documentSettings,
  isSimulation,
  showBanner
}) {
  const [selectedExamId, setSelectedExamId] = useState("");
  const [selectedClassIds, setSelectedClassIds] = useState([]);

  const toggleClass = (id) => {
    setSelectedClassIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const reportRows = useMemo(() => {
    if (!selectedExamId) return [];
    const examParticipants = participants.filter((p) => p.exam_id === selectedExamId);
    const examRes = examResults.filter((r) => r.exam_id === selectedExamId);
    const studentMap = new Map();

    examParticipants.forEach((p) => {
      const st = findMatchingStudentRecord(students, {
        id: p.student_id,
        nisn: p.nisn,
        name: p.student_name
      });
      const clsId = st?.class_id || p.class_id || "";
      const key = normalizePersonName(st?.full_name || p.student_name) || String(st?.id || p.student_id || p.nisn);
      studentMap.set(key, {
        student_id: st?.id || p.student_id,
        nis: st?.nis || p.nis || "-",
        nisn: st?.nisn || p.nisn || "-",
        student_name: st?.full_name || p.student_name,
        class_id: clsId,
        class_name: classesList.find((c) => c.id === clsId)?.name || "-",
        score: null
      });
    });

    examRes.forEach((r) => {
      const st = findMatchingStudentRecord(students, {
        id: r.student_id,
        name: r.student_name
      });
      const key = normalizePersonName(st?.full_name || r.student_name) || String(st?.id || r.student_id);
      const clsId = st?.class_id || "";
      const existing = studentMap.get(key) || {
        student_id: st?.id || r.student_id,
        nis: st?.nis || "-",
        nisn: st?.nisn || "-",
        student_name: st?.full_name || r.student_name,
        class_id: clsId,
        class_name: classesList.find((c) => c.id === clsId)?.name || "-",
        score: null
      };
      existing.score = r.score;
      studentMap.set(key, existing);
    });

    let list = Array.from(studentMap.values());
    if (selectedClassIds.length > 0) {
      list = list.filter((item) => selectedClassIds.includes(item.class_id));
    }
    return list.sort((a, b) => (a.student_name || "").localeCompare(b.student_name || "", "id"));
  }, [selectedExamId, selectedClassIds, participants, examResults, students, classesList]);

  const handlePrintOfficialReport = () => {
    const exam = exams.find((e) => e.id === selectedExamId);
    if (!exam || reportRows.length === 0) {
      return showBanner("error", "Pilih ujian dan pastikan ada data siswa/nilai.");
    }
    const sub = subjects.find((s) => s.id === exam.subject_id);
    const classLabel =
      selectedClassIds.length > 0
        ? selectedClassIds
            .map((id) => classesList.find((c) => c.id === id)?.name)
            .filter(Boolean)
            .join(", ")
        : "Semua Kelas";
    const bodyHtml = `
      <table class="data-table">
        <thead>
          <tr>
            <th style="width:36px;">No</th>
            <th>NIS / NISN</th>
            <th>Nama Peserta Didik</th>
            <th>Kelas</th>
            <th>Nilai</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${reportRows
            .map(
              (r, idx) => `<tr>
                <td style="text-align:center;">${idx + 1}</td>
                <td>${escapeHtml(r.nis)} / ${escapeHtml(r.nisn)}</td>
                <td>${escapeHtml(r.student_name)}</td>
                <td style="text-align:center;">${escapeHtml(r.class_name)}</td>
                <td style="text-align:center; font-weight:bold;">${r.score !== null ? escapeHtml(r.score) : "Belum Dinilai"}</td>
                <td style="text-align:center;">${r.score !== null ? "Tuntas / Tercatat" : "Belum Mengikuti"}</td>
              </tr>`
            )
            .join("")}
        </tbody>
      </table>
    `;
    const html = buildOfficialDocumentHtml({
      title: "LAPORAN RESMI HASIL UJIAN MADRASAH",
      subtitle: `${exam.title} • Kelas: ${classLabel}`,
      metaRows: [
        { label: "Nama Ujian", value: exam.title },
        { label: "Mata Pelajaran", value: sub?.name || "-" },
        { label: "Kelas", value: classLabel },
        {
          label: "Tahun / Semester",
          value: `${schoolSettings.academic_year} / ${schoolSettings.semester}`
        },
        { label: "Jumlah Siswa", value: `${reportRows.length} Peserta` }
      ],
      bodyHtml,
      schoolSettings,
      documentSettings,
      isSimulation
    });
    openPrintDocumentWindow(html);
  };

  const handleExportOfficialExcel = async () => {
    const exam = exams.find((e) => e.id === selectedExamId);
    if (!exam || reportRows.length === 0) {
      return showBanner("error", "Pilih ujian dan pastikan ada data untuk diekspor.");
    }
    const classLabel =
      selectedClassIds.length > 0
        ? selectedClassIds
            .map((id) => classesList.find((c) => c.id === id)?.name)
            .filter(Boolean)
            .join(", ")
        : "Semua_Kelas";
    await exportOfficialExcelWithKop({
      filename: `Laporan_Resmi_${exam.title.replace(/\s+/g, "_")}_${classLabel.replace(/\s+/g, "_")}.xlsx`,
      sheetName: "Laporan_Resmi",
      title: "LAPORAN RESMI HASIL UJIAN MADRASAH",
      subtitle: `${exam.title} • Kelas: ${classLabel.replace(/_/g, " ")}`,
      columns: [
        { key: "no", label: "No", width: 8 },
        { key: "nis", label: "NIS", width: 16 },
        { key: "nisn", label: "NISN", width: 18 },
        { key: "nama", label: "Nama Peserta Didik", width: 32 },
        { key: "kelas", label: "Kelas", width: 14 },
        { key: "nilai", label: "Nilai", width: 14 },
        { key: "status", label: "Status", width: 20 }
      ],
      rows: reportRows.map((r, i) => ({
        no: i + 1,
        nis: r.nis,
        nisn: r.nisn,
        nama: r.student_name,
        kelas: r.class_name,
        nilai: r.score !== null ? r.score : "Belum Dinilai",
        status: r.score !== null ? "Tercatat" : "Belum Mengikuti"
      })),
      documentSettings,
      isSimulation
    });
  };

  const handleDownloadOfficialWord = () => {
    const exam = exams.find((e) => e.id === selectedExamId);
    if (!exam || reportRows.length === 0) {
      return showBanner("error", "Pilih ujian dan pastikan ada data untuk diunduh.");
    }
    const sub = subjects.find((s) => s.id === exam.subject_id);
    const classLabel =
      selectedClassIds.length > 0
        ? selectedClassIds
            .map((id) => classesList.find((c) => c.id === id)?.name)
            .filter(Boolean)
            .join(", ")
        : "Semua Kelas";
    const bodyHtml = `
      <table class="data-table">
        <thead>
          <tr>
            <th>No</th>
            <th>NIS / NISN</th>
            <th>Nama Peserta Didik</th>
            <th>Kelas</th>
            <th>Nilai</th>
          </tr>
        </thead>
        <tbody>
          ${reportRows
            .map(
              (r, idx) => `<tr>
                <td>${idx + 1}</td>
                <td>${escapeHtml(r.nis)} / ${escapeHtml(r.nisn)}</td>
                <td>${escapeHtml(r.student_name)}</td>
                <td>${escapeHtml(r.class_name)}</td>
                <td>${r.score !== null ? escapeHtml(r.score) : "Belum Dinilai"}</td>
              </tr>`
            )
            .join("")}
        </tbody>
      </table>
    `;
    const html = buildOfficialDocumentHtml({
      title: "LAPORAN RESMI HASIL UJIAN MADRASAH",
      subtitle: `${exam.title} • Kelas: ${classLabel}`,
      metaRows: [
        { label: "Nama Ujian", value: exam.title },
        { label: "Mata Pelajaran", value: sub?.name || "-" },
        { label: "Kelas", value: classLabel }
      ],
      bodyHtml,
      schoolSettings,
      documentSettings,
      isSimulation
    });
    downloadWordDocFile(
      `Laporan_Resmi_${exam.title.replace(/\s+/g, "_")}.doc`,
      html
    );
  };

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 text-xs">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Pilih Paket Ujian</label>
            <select
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-3 py-2"
            >
              <option value="">-- Pilih Paket Ujian --</option>
              {exams.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.title}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block font-bold text-slate-700 mb-1">
              Filter Kelas (Kosongkan untuk Semua Kelas)
            </label>
            <div className="flex flex-wrap gap-2">
              {classesList.map((c) => {
                const checked = selectedClassIds.includes(c.id);
                return (
                  <label
                    key={c.id}
                    className={`px-3 py-1.5 rounded-lg border font-bold cursor-pointer ${
                      checked
                        ? "bg-emerald-700 border-emerald-700 text-white"
                        : "bg-slate-50 border-slate-200 text-slate-700"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleClass(c.id)}
                      className="hidden"
                    />
                    <span>{c.name}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={handleExportOfficialExcel}
            className="px-3.5 py-2 rounded-xl border border-slate-300 bg-white font-bold flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
            Unduh Excel (.xlsx) Berkop
          </button>
          <button
            type="button"
            onClick={handleDownloadOfficialWord}
            className="px-3.5 py-2 rounded-xl border border-slate-300 bg-white font-bold flex items-center gap-1.5"
          >
            <Download className="w-4 h-4 text-blue-700" />
            Unduh Word (.doc) Berkop
          </button>
          <button
            type="button"
            onClick={handlePrintOfficialReport}
            className="px-4 py-2 rounded-xl bg-emerald-700 text-white font-extrabold flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4" />
            Cetak / Simpan PDF Berkop
          </button>
        </div>
      </div>
      <div className="bg-white border border-slate-200 rounded-2xl overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-700">
            <tr>
              <th className="p-3 text-center w-12">No</th>
              <th className="p-3 text-left">NIS / NISN</th>
              <th className="p-3 text-left">Nama Peserta Didik</th>
              <th className="p-3 text-center">Kelas</th>
              <th className="p-3 text-center">Nilai</th>
              <th className="p-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {reportRows.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-slate-500">
                  Pilih paket ujian di atas untuk menampilkan rekap laporan resmi.
                </td>
              </tr>
            ) : (
              reportRows.map((r, idx) => (
                <tr key={`${r.student_id}_${idx}`}>
                  <td className="p-3 text-center">{idx + 1}</td>
                  <td className="p-3 font-mono">
                    {r.nis} / {r.nisn}
                  </td>
                  <td className="p-3 font-bold text-slate-900">{r.student_name}</td>
                  <td className="p-3 text-center">{r.class_name}</td>
                  <td className="p-3 text-center font-extrabold text-emerald-800">
                    {r.score !== null ? r.score : "-"}
                  </td>
                  <td className="p-3 text-center">
                    {r.score !== null ? "Tercatat" : "Belum Mengikuti"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================================
// MODUL 10: PENGATURAN DOKUMEN TERPUSAT, BACKUP & PENGATURAN AKUN
// ============================================================================
function DocumentSettingsView({
  schoolSettings,
  documentSettings,
  onSaveDocumentSettings,
  showBanner
}) {
  const [cfg, setCfg] = useState({ ...DEFAULT_DOCUMENT_SETTINGS, ...documentSettings });
  useEffect(() => {
    setCfg({ ...DEFAULT_DOCUMENT_SETTINGS, ...documentSettings });
  }, [documentSettings]);

  const handleKopFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      return showBanner("error", "Ukuran gambar kop surat maksimal 2 MB.");
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setCfg((prev) => ({ ...prev, kop_image: reader.result }));
      showBanner("success", "Gambar kop surat berhasil dimuat. Klik Simpan untuk menerapkan.");
    };
    reader.readAsDataURL(file);
  };

  const handlePreviewKop = () => {
    const html = buildOfficialDocumentHtml({
      title: "CONTOH FORMAT DOKUMEN RESMI & KOP SURAT",
      subtitle: `${schoolSettings.school_name} • Tahun Pelajaran ${schoolSettings.academic_year}`,
      metaRows: [
        { label: "Ukuran Kertas", value: `${cfg.paper_size} (${cfg.orientation})` },
        {
          label: "Margin (A/B/Ki/Ka)",
          value: `${cfg.margin_top_mm}mm / ${cfg.margin_bottom_mm}mm / ${cfg.margin_left_mm}mm / ${cfg.margin_right_mm}mm`
        }
      ],
      bodyHtml: `<p style="font-size:10.5pt;">Pratinjau ini menampilkan kop resmi terpusat, margin halaman, tabel data, blok tanda tangan, dan catatan kaki dokumen CBT MIN 4 MAGELANG.</p>`,
      schoolSettings,
      documentSettings: cfg,
      includeSignature: true
    });
    openPrintDocumentWindow(html);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-5 text-xs shadow-sm">
      <div>
        <h2 className="text-sm font-extrabold text-slate-900">
          Pengaturan Template Dokumen & Kop Surat Resmi Terpusat
        </h2>
        <p className="text-[11px] text-slate-500 mt-0.5">
          Mengatur kop surat resmi, ukuran kertas, margin, dan format cetak PDF, Excel (.xlsx), serta
          Word (.doc) secara seragam di seluruh menu.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start border border-slate-200 rounded-2xl p-4 bg-slate-50">
        <div className="md:col-span-2 space-y-3">
          <div className="font-bold text-slate-800">Gambar Kop Surat Resmi Saat Ini</div>
          <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-center">
            <img
              src={cfg.kop_image || DEFAULT_KOP_IMAGE_SRC}
              alt="Pratinjau Kop Surat MIN 4 Magelang"
              className="max-h-32 w-auto object-contain"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="cursor-pointer px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 font-bold flex items-center gap-1.5">
              <Upload className="w-4 h-4 text-emerald-700" />
              Ganti Gambar Kop Surat
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleKopFileUpload}
                className="hidden"
              />
            </label>
            <button
              type="button"
              onClick={() => setCfg((prev) => ({ ...prev, kop_image: DEFAULT_KOP_IMAGE_SRC }))}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold"
            >
              Gunakan Kop Default MIN 4
            </button>
          </div>
        </div>
        <div className="space-y-2.5 bg-white border border-slate-200 rounded-xl p-3.5">
          <div className="font-bold text-slate-800">Penerapan Kop pada Format File</div>
          <label className="flex items-center gap-2 font-semibold cursor-pointer">
            <input
              type="checkbox"
              checked={Boolean(cfg.use_kop_pdf)}
              onChange={(e) => setCfg({ ...cfg, use_kop_pdf: e.target.checked })}
            />
            <span>Tampilkan Kop pada Cetak / PDF</span>
          </label>
          <label className="flex items-center gap-2 font-semibold cursor-pointer">
            <input
              type="checkbox"
              checked={Boolean(cfg.use_kop_excel)}
              onChange={(e) => setCfg({ ...cfg, use_kop_excel: e.target.checked })}
            />
            <span>Sematkan Kop pada Ekspor Excel (.xlsx)</span>
          </label>
          <label className="flex items-center gap-2 font-semibold cursor-pointer">
            <input
              type="checkbox"
              checked={Boolean(cfg.use_kop_word)}
              onChange={(e) => setCfg({ ...cfg, use_kop_word: e.target.checked })}
            />
            <span>Sematkan Kop pada Unduhan Word (.doc)</span>
          </label>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div>
          <label className="block font-bold text-slate-700 mb-1">Ukuran Kertas</label>
          <select
            value={cfg.paper_size}
            onChange={(e) => setCfg({ ...cfg, paper_size: e.target.value })}
            className="w-full border border-slate-300 rounded-xl px-3 py-2"
          >
            <option value="A4">A4 (210 x 297 mm)</option>
            <option value="F4">F4 / Folio (215 x 330 mm)</option>
            <option value="Letter">Letter</option>
          </select>
        </div>
        <div>
          <label className="block font-bold text-slate-700 mb-1">Orientasi Halaman</label>
          <select
            value={cfg.orientation}
            onChange={(e) => setCfg({ ...cfg, orientation: e.target.value })}
            className="w-full border border-slate-300 rounded-xl px-3 py-2"
          >
            <option value="portrait">Portrait (Tegak)</option>
            <option value="landscape">Landscape (Mendatar)</option>
          </select>
        </div>
        <div>
          <label className="block font-bold text-slate-700 mb-1">Margin Atas / Bawah (mm)</label>
          <div className="flex gap-2">
            <input
              type="number"
              min="5"
              max="40"
              value={cfg.margin_top_mm}
              onChange={(e) =>
                setCfg({ ...cfg, margin_top_mm: Number(e.target.value) || 15 })
              }
              className="w-1/2 border border-slate-300 rounded-xl px-2 py-2"
            />
            <input
              type="number"
              min="5"
              max="40"
              value={cfg.margin_bottom_mm}
              onChange={(e) =>
                setCfg({ ...cfg, margin_bottom_mm: Number(e.target.value) || 15 })
              }
              className="w-1/2 border border-slate-300 rounded-xl px-2 py-2"
            />
          </div>
        </div>
        <div>
          <label className="block font-bold text-slate-700 mb-1">Margin Kiri / Kanan (mm)</label>
          <div className="flex gap-2">
            <input
              type="number"
              min="5"
              max="40"
              value={cfg.margin_left_mm}
              onChange={(e) =>
                setCfg({ ...cfg, margin_left_mm: Number(e.target.value) || 15 })
              }
              className="w-1/2 border border-slate-300 rounded-xl px-2 py-2"
            />
            <input
              type="number"
              min="5"
              max="40"
              value={cfg.margin_right_mm}
              onChange={(e) =>
                setCfg({ ...cfg, margin_right_mm: Number(e.target.value) || 15 })
              }
              className="w-1/2 border border-slate-300 rounded-xl px-2 py-2"
            />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
        <div className="md:col-span-2">
          <label className="block font-bold text-slate-700 mb-1">Teks Footer Dokumen</label>
          <input
            type="text"
            value={cfg.footer_text}
            onChange={(e) => setCfg({ ...cfg, footer_text: e.target.value })}
            className="w-full border border-slate-300 rounded-xl px-3 py-2"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2 font-semibold cursor-pointer">
            <input
              type="checkbox"
              checked={Boolean(cfg.show_footer)}
              onChange={(e) => setCfg({ ...cfg, show_footer: e.target.checked })}
            />
            <span>Tampilkan Footer</span>
          </label>
          <label className="flex items-center gap-2 font-semibold cursor-pointer">
            <input
              type="checkbox"
              checked={Boolean(cfg.show_print_date)}
              onChange={(e) => setCfg({ ...cfg, show_print_date: e.target.checked })}
            />
            <span>Tampilkan Tanggal Cetak</span>
          </label>
        </div>
      </div>
      <div className="flex flex-wrap justify-end gap-2 pt-2 border-t border-slate-100">
        <button
          type="button"
          onClick={handlePreviewKop}
          className="px-4 py-2 rounded-xl border border-slate-300 bg-white font-bold flex items-center gap-1.5"
        >
          <Printer className="w-4 h-4" />
          Pratinjau Cetak Kop
        </button>
        <button
          type="button"
          onClick={() => onSaveDocumentSettings?.(cfg)}
          className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold flex items-center gap-1.5"
        >
          <Save className="w-4 h-4" />
          Simpan Pengaturan Dokumen
        </button>
      </div>
    </div>
  );
}

function BackupDataView({ isSimulation, payload, showBanner }) {
  const handleDownloadJson = () => {
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const prefix = isSimulation ? "SIMULASI_" : "";
    a.download = `${prefix}Backup_CBT_MIN4_MAGELANG_${new Date()
      .toISOString()
      .slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showBanner("success", "File backup JSON berhasil diunduh.");
  };
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 text-xs">
      <h2 className="text-sm font-extrabold text-slate-900">Backup Data Sistem</h2>
      <p className="text-slate-600">
        Unduh salinan cadangan data {isSimulation ? "simulasi" : "produksi"} dalam format JSON.
      </p>
      <button
        type="button"
        onClick={handleDownloadJson}
        className="px-4 py-2.5 rounded-xl bg-emerald-700 text-white font-extrabold flex items-center gap-2"
      >
        <HardDriveDownload className="w-4 h-4" />
        Unduh Backup JSON
      </button>
    </div>
  );
}

function AdminSettingsView({
  supabase,
  supabaseUrl,
  supabaseKey,
  profilesList,
  isSimulation,
  onUpdateCredentials,
  onRefresh,
  showBanner
}) {
  const [urlInput, setUrlInput] = useState(supabaseUrl);
  const [keyInput, setKeyInput] = useState(supabaseKey);
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("GURU");
  const [nip, setNip] = useState("");
  const [nisn, setNisn] = useState("");

  const handleCreateUserAccount = async (e) => {
    e.preventDefault();
    if (!supabase) return showBanner("error", "Supabase belum terhubung.");
    if (password.length < 8) {
      return showBanner("error", "Password minimal 8 karakter.");
    }
    try {
      const cleanEmail = email.trim().toLowerCase();
      const cleanUser = username.trim().toLowerCase();
      const { data: signUpRes, error: signUpErr } = await supabase.auth.signUp({
        email: cleanEmail,
        password
      });
      if (signUpErr) throw signUpErr;
      const newUserId = signUpRes?.user?.id;
      if (!newUserId) {
        throw new Error(
          "Akun Auth belum mengembalikan ID user. Nonaktifkan konfirmasi email di Supabase Auth."
        );
      }
      const { error: profErr } = await supabase.from("profiles").insert([
        {
          id: newUserId,
          full_name: fullName.trim(),
          username: cleanUser,
          email: cleanEmail,
          nip: nip.trim() || null,
          nisn: nisn.trim() || null,
          role,
          is_active: true,
          is_simulation: Boolean(isSimulation)
        }
      ]);
      if (profErr) throw profErr;
      setFullName("");
      setUsername("");
      setEmail("");
      setPassword("");
      setNip("");
      setNisn("");
      await onRefresh();
      showBanner("success", `Akun ${role} berhasil dibuat dan disimpan ke Supabase.`);
    } catch (err) {
      showBanner("error", `Gagal membuat akun: ${err.message}`);
    }
  };

  return (
    <div className="space-y-5">
      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 text-xs">
        <h2 className="text-sm font-extrabold text-slate-900">Koneksi Database Supabase</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Supabase Project URL</label>
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-3 py-2 font-mono"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Supabase Anon Key</label>
            <input
              type="text"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-3 py-2 font-mono"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={() => onUpdateCredentials(urlInput.trim(), keyInput.trim())}
          className="px-4 py-2 rounded-xl bg-emerald-700 text-white font-bold"
        >
          Simpan Kredensial Supabase
        </button>
      </div>
      <form
        onSubmit={handleCreateUserAccount}
        className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 text-xs"
      >
        <h2 className="text-sm font-extrabold text-slate-900">
          Registrasi Akun Login (Admin / Guru / Siswa)
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Nama Lengkap</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-3 py-2"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Username</label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-3 py-2"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-3 py-2"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Password (Min 8 Karakter)</label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-3 py-2"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Peran (Role)</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-3 py-2"
            >
              <option value="GURU">GURU</option>
              <option value="SISWA">SISWA</option>
              <option value="ADMIN">ADMIN</option>
            </select>
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">NIP (Opsional)</label>
            <input
              type="text"
              value={nip}
              onChange={(e) => setNip(e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-3 py-2"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">NISN (Opsional)</label>
            <input
              type="text"
              value={nisn}
              onChange={(e) => setNisn(e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-3 py-2"
            />
          </div>
        </div>
        <button
          type="submit"
          className="px-4 py-2 rounded-xl bg-emerald-700 text-white font-extrabold"
        >
          Buat Akun Pengguna
        </button>
      </form>
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-700">
            <tr>
              <th className="p-3 text-left">Nama</th>
              <th className="p-3 text-left">Username</th>
              <th className="p-3 text-left">Email</th>
              <th className="p-3 text-center">Peran</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {profilesList.map((p) => (
              <tr key={p.id}>
                <td className="p-3 font-bold">{p.full_name}</td>
                <td className="p-3 font-mono">{p.username}</td>
                <td className="p-3">{p.email}</td>
                <td className="p-3 text-center font-bold text-emerald-800">{p.role}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <CbtMin4MagelangApp />
    </ErrorBoundary>
  );
}
