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
import { parseExcelSoal, formatRichText } from "./utils/excelQuestionParser";
import RichQuestionContent from "./components/RichQuestionContent";
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
const uploadQuestionImageFile = async (supabaseClient: any, file: File): Promise<string> => {
  const maxBytes = 2 * 1024 * 1024; // Maksimal 2 MB
  if (file.size > maxBytes) {
    throw new Error("Ukuran gambar maksimal 2 MB.");
  }

  const readAsDataUrl = (f: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Gagal membaca file gambar."));
      reader.readAsDataURL(f);
    });

  if (supabaseClient && typeof supabaseClient.storage?.from === "function") {
    const ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "");
    const safeName = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext || "png"}`;
    const filePath = `soal/${safeName}`;

    const { error: uploadErr } = await supabaseClient.storage
      .from("question-images")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false
      });

    if (!uploadErr) {
      const { data: pubData } = supabaseClient.storage
        .from("question-images")
        .getPublicUrl(filePath);
      if (pubData?.publicUrl) {
        return pubData.publicUrl;
      }
    }
  }

  return await readAsDataUrl(file);
};

const appendImageTagToText = (currentText: string, imageUrl: string) => {
  const imgHtml = `<img src="${imageUrl}" alt="Gambar Soal" style="max-width:100%;max-height:280px;border-radius:12px;margin-top:8px;margin-bottom:8px;display:block;" />`;
  const trimmed = String(currentText || "").trimEnd();
  return trimmed ? `${trimmed}\n${imgHtml}` : imgHtml;
};
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
      const isXlsxFile = /\.(xlsx|xls)$/i.test(file.name);
      const validPayloads = [];
      const errors = [];
      let totalRowsCount = 0;
      if (isXlsxFile) {
        const parsedExcelRows = await parseExcelSoal(file);
        totalRowsCount = parsedExcelRows.length;
        parsedExcelRows.forEach((item, idx) => {
          const rowFolder = String(item.folder_name || "").trim() || defaultBatchFolder;
          const rawSub = String(item.subject_id || "").trim();
          const qTopic = String(item.topic || "").trim() || topic.trim();
          const qText = String(item.pertanyaan || "").trim();
          const cAns = String(item.kunci_jawaban || "").trim();
          const rawType = String(
            item.type || (cAns.includes(",") ? "PG_KOMPLEKS" : "PG")
          )
            .trim()
            .toUpperCase();
          const qWeight = Number(item.weight || weight || 1) || 1;
          const isVerifiedVal =
            item.is_verified === undefined || item.is_verified === null || item.is_verified === ""
              ? true
              : String(item.is_verified).trim().toLowerCase() !== "false";

          if (!qText || !cAns) {
            errors.push(
              `Baris ${idx + 2}: kolom question_text/pertanyaan dan correct_answer/kunci wajib diisi.`
            );
            return;
          }

          let matchedSubjectId = subjectId || null;
          if (rawSub) {
            const foundSub = subjects.find(
              (s) =>
                String(s.id) === rawSub ||
                (s.name || "").toLowerCase() === rawSub.toLowerCase() ||
                (s.code || "").toLowerCase() === rawSub.toLowerCase()
            );
            if (foundSub) {
              matchedSubjectId = foundSub.id;
            }
          }

          const optionsJson = buildOptionsByType(
            rawType,
            item.opsi_a,
            item.opsi_b,
            item.opsi_c,
            item.opsi_d,
            item.opsi_e
          );

          if ((rawType === "PG" || rawType === "PG_KOMPLEKS") && optionsJson.length < 2) {
            errors.push(
              `Baris ${idx + 2}: soal ${rawType} minimal memiliki 2 opsi jawaban.`
            );
            return;
          }

          validPayloads.push({
            created_by: currentUser?.id || null,
            folder_name: uploadFolderName.trim() ? defaultBatchFolder : rowFolder,
            subject_id: matchedSubjectId,
            topic: qTopic,
            type: rawType,
            question_text: qText,
            options: optionsJson,
            correct_answer: cAns,
            weight: qWeight,
            is_verified: isVerifiedVal,
            is_simulation: Boolean(isSimulation)
          });
        });
      } else {
        const rawRows = await parseSpreadsheetFile(file);
        totalRowsCount = rawRows.length;
        rawRows.forEach((raw, idx) => {
          const r = normalizeRowKeys(raw);
          const rowFolder =
            String(r.folder_name || r.folder || r.nama_folder || "").trim() || defaultBatchFolder;
          const rawSub = String(r.subject_id || r.mata_pelajaran || r.mapel || "").trim();
          const qTopic = String(r.topic || r.materi || "").trim();
          const rawType = String(r.type || r.jenis_soal || "PG")
            .trim()
            .toUpperCase();
          const qText = formatRichText(String(r.question_text || r.pertanyaan || r.soal || "").trim());
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
              { key: "A", text: formatRichText(String(r.option_a || r.opsi_a || r.a || "").trim()) },
              { key: "B", text: formatRichText(String(r.option_b || r.opsi_b || r.b || "").trim()) },
              { key: "C", text: formatRichText(String(r.option_c || r.opsi_c || r.c || "").trim()) },
              { key: "D", text: formatRichText(String(r.option_d || r.opsi_d || r.d || "").trim()) },
              { key: "E", text: formatRichText(String(r.option_e || r.opsi_e || r.e || "").trim()) }
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
              formatRichText(String(r.option_a || r.opsi_a || r.a || "").trim()),
              formatRichText(String(r.option_b || r.opsi_b || r.b || "").trim()),
              formatRichText(String(r.option_c || r.opsi_c || r.c || "").trim()),
              formatRichText(String(r.option_d || r.opsi_d || r.d || "").trim()),
              formatRichText(String(r.option_e || r.opsi_e || r.e || "").trim())
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
      }
      let insertedCount = 0;
      if (validPayloads.length > 0) {
        await insertQuestionsRows(validPayloads);
        insertedCount = validPayloads.length;
        const activeFolderTarget = uploadFolderName.trim()
          ? defaultBatchFolder
          : validPayloads[0]?.folder_name || defaultBatchFolder;
        setFilterFolder(activeFolderTarget);
        setFolderName(activeFolderTarget);
        setUploadFolderName("");
        await onRefresh();
      }
      setImportSummary({
        total: totalRowsCount,
        success: insertedCount,
        failed: errors.length,
        folder: defaultBatchFolder,
        errors
      });
      showBanner(
        insertedCount > 0 ? "success" : "warning",
        `Impor selesai: ${insertedCount} soal berhasil disimpan ke Supabase (${errors.length} dilewati/gagal).`
      );
    } catch (err) {
      showBanner("error", `Gagal mengimpor Bank Soal: ${err.message}`);
    }
  };
  const handleSaveQuestion = async (e) => {
    e.preventDefault();
    if (!supabase || !questionText.trim()) return;
    const targetFolder = folderName.trim() || DEFAULT_FOLDER_LABEL;
    const formattedQuestion = formatRichText(questionText.trim());
    const options = buildOptionsByType(
      qType,
      formatRichText(optA),
      formatRichText(optB),
      formatRichText(optC),
      formatRichText(optD),
      formatRichText(optE)
    );
    try {
      await insertQuestionsRows([
        {
          created_by: currentUser?.id || null,
          folder_name: targetFolder,
          subject_id: subjectId || null,
          topic: topic.trim(),
          type: qType,
          question_text: formattedQuestion,
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
                  <div className="font-semibold text-slate-900">
                    <RichQuestionContent content={q.question_text} />
                  </div>
                  {opts.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 pt-1 text-[11px] text-slate-700">
                      {opts.map((o) => (
                        <div key={o.key} className="bg-slate-50 px-2.5 py-1 rounded-lg">
                          <strong>{o.key}.</strong>{" "}
                          <RichQuestionContent content={o.text} className="inline" />
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
        const key =
          normalizePersonName(stObj?.full_name || p.student_name) ||
          String(stObj?.id || p.student_id || p.nisn);
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
        const key =
          normalizePersonName(stObj?.full_name || r.student_name) ||
          String(stObj?.id || r.student_id);
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
        const key =
          normalizePersonName(stObj?.full_name || a.student_name) ||
          String(stObj?.id || a.student_id);
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
const normalizeSingleTrueFalseToken = (val: unknown) => {
  const token = normalizeStatementToken(val);
  return token === "B" || token === "S" ? token : "";
};

const normalizeSingleSuitabilityToken = (val: unknown) => {
  const token = normalizeStatementToken(val);
  return token === "T" || token === "TT" ? token : "";
};

const extractExamStatements = (question: any, qType: string) => {
  const rawOpts = Array.isArray(question?.options) ? question.options : [];
  const validOpts = rawOpts.filter((o: any) => {
    const text = String(o?.text ?? "").trim();
    if (!text) return false;
    const keyUpper = String(o?.key ?? "").trim().toUpperCase();
    // Abaikan label bawaan Benar/Salah tunggal agar tidak terdeteksi sebagai pernyataan kompleks
    if (
      qType === "BENAR_SALAH" &&
      rawOpts.length === 2 &&
      (keyUpper === "BENAR" || keyUpper === "SALAH") &&
      (text.toLowerCase() === "benar" || text.toLowerCase() === "salah")
    ) {
      return false;
    }
    return true;
  });

  if (validOpts.length > 0) {
    return validOpts.map((o: any, idx: number) => ({
      key: o.key || `P${idx + 1}`,
      text: o.text
    }));
  }

  return [
    question?.option_a,
    question?.option_b,
    question?.option_c,
    question?.option_d,
    question?.option_e
  ]
    .map((v: any) => String(v ?? "").trim())
    .filter(Boolean)
    .map((text: string, idx: number) => ({
      key: `P${idx + 1}`,
      text
    }));
};
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
        targetExam.question_ids,
        questions
      );
      const summary = computeExamScoreSummary(fullQuestions, currentAnswers, gradingFormula);
      const resultId = `${targetExam.id}_${currentUser.id}`;
      await supabase.from("exam_results").upsert({
        id: resultId,
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
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // Abaikan error storage
    }
    setActiveExam(null);
    await onRefresh();
    showBanner(
      "success",
      isAuto
        ? "Waktu pengerjaan ujian telah berakhir. Jawaban dikumpulkan otomatis."
        : "Ujian berhasil dikumpulkan dan nilai telah tersimpan."
    );
  };
  useEffect(() => {
    if (!activeExam) return;
    const timer = setInterval(() => {
      const nowMs = Date.now();
      const sched = evaluateExamSchedule(activeExam, nowMs);
      if (!sched.canOpen) {
        clearInterval(timer);
        setSecondsLeft(0);
        handleSubmitExam(true, activeExam);
        return;
      }
      setSecondsLeft((prev) => {
        const scheduleSec = Math.max(0, Math.floor((sched.remainingMs || 0) / 1000));
        const nextVal = Math.min(prev > 0 ? prev - 1 : scheduleSec, scheduleSec);
        if (nextVal <= 1) {
          clearInterval(timer);
          handleSubmitExam(true, activeExam);
          return 0;
        }
        return nextVal;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [activeExam]);
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
              <th className="p-3 text-center">Nilai Akhir</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {myResults.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-slate-500">
                  Belum ada riwayat nilai ujian yang tersimpan.
                </td>
              </tr>
            ) : (
              myResults.map((r) => {
                const examObj = exams.find((e) => e.id === r.exam_id);
                const canShow = examObj ? examObj.show_result_to_student !== false : true;
                return (
                  <tr key={r.id}>
                    <td className="p-3 font-bold">{r.exam_title || "Ujian"}</td>
                    <td className="p-3 text-center">{canShow ? r.correct_count : "-"}</td>
                    <td className="p-3 text-center">{canShow ? r.wrong_count : "-"}</td>
                    <td className="p-3 text-center">{canShow ? r.empty_count : "-"}</td>
                    <td className="p-3 text-center font-extrabold text-emerald-800">
                      {canShow ? r.score : "Menunggu Pengumuman"}
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
  const handleStartExam = (exam) => {
    const sched = evaluateExamSchedule(exam, Date.now());
    if (!sched.canOpen) {
      return showBanner("warning", sched.message);
    }
    const alreadyDone =
      !isSimulation &&
      (attempts.some(
        (a) =>
          a.exam_id === exam.id &&
          (String(a.student_id) === String(currentUser.id) ||
            normalizePersonName(a.student_name) === normalizePersonName(currentUser.full_name))
      ) ||
        examResults.some(
          (r) =>
            r.exam_id === exam.id &&
            (String(r.student_id) === String(currentUser.id) ||
              normalizePersonName(r.student_name) === normalizePersonName(currentUser.full_name))
        ));
    if (alreadyDone) {
      return showBanner("warning", "Anda sudah menyelesaikan ujian ini.");
    }
    const storageKey = `cbt_min4_ans_${exam.id}_${currentUser.id}`;
    let restoredMap = {};
    try {
      const rawLocal = localStorage.getItem(storageKey);
      if (rawLocal) restoredMap = JSON.parse(rawLocal) || {};
    } catch {
      restoredMap = {};
    }
    studentAnswers
      .filter((a) => a.exam_id === exam.id && String(a.student_id) === String(currentUser.id))
      .forEach((a) => {
        if (a.question_id && a.answer && !restoredMap[a.question_id]) {
          restoredMap[a.question_id] = a.answer;
        }
      });
    const durationSec = (Number(exam.duration_minutes) || 60) * 60;
    const scheduleSec = Math.max(0, Math.floor((sched.remainingMs || durationSec * 1000) / 1000));
    setActiveExam(exam);
    setCurrentIndex(0);
    setAnswersMap(restoredMap);
    setFlaggedMap({});
    setSecondsLeft(Math.min(durationSec, scheduleSec));
  };
  const handleAnswerChange = async (questionId, val) => {
    if (!activeExam) return;
    const sched = evaluateExamSchedule(activeExam, Date.now());
    if (!sched.canOpen) {
      showBanner("warning", sched.message);
      await handleSubmitExam(true, activeExam);
      return;
    }
    const nextMap = { ...answersMap, [questionId]: val };
    setAnswersMap(nextMap);
    const storageKey = `cbt_min4_ans_${activeExam.id}_${currentUser.id}`;
    try {
      localStorage.setItem(storageKey, JSON.stringify(nextMap));
    } catch {
      // Abaikan error storage
    }
    if (supabase) {
      await supabase.from("student_answers").upsert({
        id: `${activeExam.id}_${currentUser.id}_${questionId}`,
        exam_id: activeExam.id,
        student_id: currentUser.id,
        question_id: questionId,
        answer: val,
        is_simulation: Boolean(isSimulation),
        updated_at: new Date().toISOString()
      });
    }
  };
  if (activeExam) {
    const sched = evaluateExamSchedule(activeExam, nowTick);
    if (!sched.canOpen || activeQuestions.length === 0) {
      return (
        <div className="bg-white border border-amber-300 rounded-2xl p-6 text-center space-y-3 text-xs">
          <Lock className="w-8 h-8 text-amber-700 mx-auto" />
          <div className="font-extrabold text-slate-900">
            {sched.message || "Soal ujian sedang terkunci atau tidak tersedia."}
          </div>
          <button
            type="button"
            onClick={() => setActiveExam(null)}
            className="px-4 py-2 rounded-xl bg-emerald-700 text-white font-bold"
          >
            Kembali ke Daftar Ujian
          </button>
        </div>
      );
    }
    const q = activeQuestions[currentIndex] || activeQuestions[0];
    const currentAns = answersMap[q.id] || "";
    const mins = Math.floor(secondsLeft / 60);
    const secs = secondsLeft % 60;
    const qType = String(q.type || "PG").toUpperCase();
    const opts = Array.isArray(q.options) ? q.options : [];
    const statementTokens = String(currentAns || "").split(",");
    const toggleMultiOption = (key) => {
      const set = new Set(
        String(currentAns || "")
          .split(",")
          .map((s) => s.trim().toUpperCase())
          .filter(Boolean)
      );
      if (set.has(key)) set.delete(key);
      else set.add(key);
      handleAnswerChange(q.id, Array.from(set).join(","));
    };
    const setStatementChoice = (idx, token) => {
      const nextArr = [...statementTokens];
      while (nextArr.length <= idx) nextArr.push("");
      nextArr[idx] = token;
      handleAnswerChange(q.id, nextArr.join(","));
    };
    return (
      <div className="space-y-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-extrabold text-slate-900">{activeExam.title}</div>
            <div className="text-xs text-slate-500">
              Soal {currentIndex + 1} dari {activeQuestions.length} • Jadwal:{" "}
              {activeExam.start_time} - {activeExam.end_time}
            </div>
          </div>
          <div className="px-3.5 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 font-mono font-extrabold text-xs flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-3 bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between text-xs">
              <span className="px-2.5 py-0.5 rounded bg-emerald-50 text-emerald-800 font-bold">
                Tipe: {qType}
              </span>
              <button
                type="button"
                onClick={() => setFlaggedMap((prev) => ({ ...prev, [q.id]: !prev[q.id] }))}
                className={`px-2.5 py-1 rounded-lg border font-bold flex items-center gap-1 ${
                  flaggedMap[q.id]
                    ? "bg-amber-100 border-amber-300 text-amber-900"
                    : "border-slate-200 text-slate-600"
                }`}
              >
                <Flag className="w-3.5 h-3.5" />
                Ragu-ragu
              </button>
            </div>
            <div className="text-sm font-semibold text-slate-900 leading-relaxed">
              <RichQuestionContent content={q.question_text} />
            </div>
            {qType === "PG" && (
              <div className="space-y-2 text-xs">
                {opts.map((o) => (
                  <label
                    key={o.key}
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer ${
                      currentAns === o.key
                        ? "bg-emerald-50 border-emerald-500 font-bold"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name={`q_${q.id}`}
                      checked={currentAns === o.key}
                      onChange={() => handleAnswerChange(q.id, o.key)}
                    />
                    <span>
                      <strong>{o.key}.</strong>{" "}
                      <RichQuestionContent content={o.text} className="inline" />
                    </span>
                  </label>
                ))}
              </div>
            )}
            {qType === "PG_KOMPLEKS" && (
              <div className="space-y-2 text-xs">
                <div className="text-[11px] text-slate-500 font-semibold">
                  Pilih semua jawaban yang benar:
                </div>
                {opts.map((o) => {
                  const selectedSet = new Set(
                    String(currentAns || "")
                      .split(",")
                      .map((s) => s.trim().toUpperCase())
                  );
                  const checked = selectedSet.has(String(o.key).toUpperCase());
                  return (
                    <label
                      key={o.key}
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer ${
                        checked
                          ? "bg-emerald-50 border-emerald-500 font-bold"
                          : "border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleMultiOption(o.key)}
                      />
                      <span>
                        <strong>{o.key}.</strong>{" "}
                        <RichQuestionContent content={o.text} className="inline" />
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          {(qType === "BENAR_SALAH" || qType === "TEPAT_TIDAK_TEPAT") && (() => {
  const toPlainText = (val: unknown) =>
    String(val ?? "")
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();

  const rawOpts = Array.isArray(q?.options) ? q.options : [];
  const nonEmptyOpts = rawOpts.filter((o) => toPlainText(o?.text) !== "");

  const isSingleLabelPair =
    nonEmptyOpts.length === 2 &&
    nonEmptyOpts.every((o) => {
      const t = toPlainText(o?.text);
      if (qType === "TEPAT_TIDAK_TEPAT") {
        return t.includes("tepat") || t === "t" || t === "tt";
      }
      return t.includes("benar") || t.includes("salah") || t === "b" || t === "s";
    });

  const statementItems = isSingleLabelPair ? [] : nonEmptyOpts;

  if (statementItems.length <= 1) {
    const firstToken = normalizeStatementToken(
      String(currentAns || "").split(/[,;|]+/)[0].trim()
    );
    const validTokens = qType === "BENAR_SALAH" ? ["B", "S"] : ["T", "TT"];
    const selectedChoice = validTokens.includes(firstToken) ? firstToken : "";

    const choices =
      qType === "BENAR_SALAH"
        ? [
            { value: "B", label: "Benar" },
            { value: "S", label: "Salah" }
          ]
        : [
            { value: "T", label: "Tepat" },
            { value: "TT", label: "Tidak Tepat" }
          ];

    return (
      <div className="space-y-2.5 text-xs">
        {statementItems.length === 1 && (
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-800">
            <RichQuestionContent content={statementItems[0].text} className="inline" />
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {choices.map((choice) => {
            const active = selectedChoice === choice.value;
            return (
              <button
                key={choice.value}
                type="button"
                onClick={() => handleAnswerChange(q.id, choice.value)}
                className={`p-3.5 rounded-xl border text-left font-bold transition flex items-center justify-between ${
                  active
                    ? "bg-emerald-700 text-white border-emerald-700"
                    : "bg-white text-slate-700 border-slate-300 hover:border-emerald-500"
                }`}
              >
                <span>{choice.label}</span>
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-md ${
                    active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {choice.value}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 text-xs">
      {statementItems.map((o, idx) => {
        const tokA = qType === "BENAR_SALAH" ? "B" : "T";
        const tokB = qType === "BENAR_SALAH" ? "S" : "TT";
        const lblA = qType === "BENAR_SALAH" ? "Benar (B)" : "Tepat (T)";
        const lblB = qType === "BENAR_SALAH" ? "Salah (S)" : "Tidak Tepat (TT)";
        const chosen = normalizeStatementToken(statementTokens[idx] || "");
        return (
          <div
            key={o.key || idx}
            className="p-3 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-2"
          >
            <span className="font-semibold flex-1">
              <RichQuestionContent content={o.text} className="inline" />
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStatementChoice(idx, tokA)}
                className={`px-3 py-1 rounded-lg border font-bold ${
                  chosen === tokA
                    ? "bg-emerald-700 text-white border-emerald-700"
                    : "bg-white text-slate-700 border-slate-300"
                }`}
              >
                {lblA}
              </button>
              <button
                type="button"
                onClick={() => setStatementChoice(idx, tokB)}
                className={`px-3 py-1 rounded-lg border font-bold ${
                  chosen === tokB
                    ? "bg-emerald-700 text-white border-emerald-700"
                    : "bg-white text-slate-700 border-slate-300"
                }`}
              >
                {lblB}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
})()}
            {(qType === "ISIAN_SINGKAT" || qType === "ESSAY") && (
              <div>
                <textarea
                  rows={qType === "ESSAY" ? 5 : 2}
                  value={currentAns}
                  onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                  placeholder="Tulis jawaban Anda di sini..."
                  className="w-full border border-slate-300 rounded-xl p-3 text-xs"
                />
              </div>
            )}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                type="button"
                disabled={currentIndex === 0}
                onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                className="px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-bold disabled:opacity-40 flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                Sebelumnya
              </button>
              {currentIndex < activeQuestions.length - 1 ? (
                <button
                  type="button"
                  onClick={() =>
                    setCurrentIndex((i) => Math.min(activeQuestions.length - 1, i + 1))
                  }
                  className="px-4 py-2 rounded-xl bg-emerald-700 text-white text-xs font-bold flex items-center gap-1"
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
                  Selesai & Kumpulkan Ujian
                </button>
              )}
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 h-fit">
            <div className="text-xs font-extrabold text-slate-800">Navigasi Nomor Soal</div>
            <div className="grid grid-cols-5 gap-1.5">
              {activeQuestions.map((item, idx) => {
                const answered = Boolean(answersMap[item.id]);
                const flagged = Boolean(flaggedMap[item.id]);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setCurrentIndex(idx)}
                    className={`py-2 rounded-lg text-xs font-extrabold border ${
                      idx === currentIndex
                        ? "ring-2 ring-emerald-600 border-emerald-700 bg-emerald-700 text-white"
                        : flagged
                          ? "bg-amber-100 border-amber-300 text-amber-900"
                          : answered
                            ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                            : "bg-slate-50 border-slate-200 text-slate-600"
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => setConfirmFinishOpen(true)}
              className="w-full py-2 rounded-xl bg-emerald-700 text-white text-xs font-extrabold"
            >
              Kumpulkan Ujian
            </button>
          </div>
        </div>
        {confirmFinishOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4">
              <h3 className="text-sm font-extrabold text-slate-900">Konfirmasi Pengumpulan</h3>
              <p className="text-xs text-slate-600">
                Pastikan seluruh jawaban telah diperiksa. Setelah dikumpulkan, jawaban tidak dapat
                diubah kembali.
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
                  Ya, Kumpulkan
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
        <div className="col-span-full bg-white border border-slate-200 rounded-2xl p-8 text-center text-xs text-slate-500">
          Belum ada jadwal ujian yang tersedia untuk akun Anda saat ini.
        </div>
      ) : (
        myExams.map((ex) => {
          const sub = subjects.find((s) => s.id === ex.subject_id);
          const done =
            !isSimulation &&
            (attempts.some(
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
              ));
          const sched = evaluateExamSchedule(ex, nowTick);
          return (
            <div
              key={ex.id}
              className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between gap-4 shadow-sm"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-bold text-emerald-700">
                    {sub?.name || "Mata Pelajaran"}
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                      done
                        ? "bg-slate-100 text-slate-700"
                        : sched.canOpen
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-900"
                    }`}
                  >
                    {done
                      ? "SELESAI"
                      : sched.statusCode === "NOT_STARTED"
                        ? "BELUM DIBUKA"
                        : sched.statusCode === "ENDED"
                          ? "TERKUNCI (SELESAI)"
                          : "TERBUKA"}
                  </span>
                </div>
                <h3 className="text-sm font-extrabold text-slate-900">{ex.title}</h3>
                <p className="text-xs text-slate-500">
                  Tanggal: {ex.exam_date} • Jam: {ex.start_time || "-"} - {ex.end_time || "-"} •
                  Durasi: {ex.duration_minutes} Menit
                </p>
                {!done && !sched.canOpen && (
                  <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 font-semibold">
                    {sched.message}
                  </p>
                )}
              </div>
              <button
                type="button"
                disabled={done || !sched.canOpen}
                onClick={() => handleStartExam(ex)}
                className="w-full py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white text-xs font-extrabold transition"
              >
                {done
                  ? "Sudah Dikerjakan"
                  : sched.canOpen
                    ? "Mulai Kerjakan Ujian"
                    : sched.statusCode === "NOT_STARTED"
                      ? "Menunggu Jadwal Dibuka"
                      : "Jadwal Ujian Berakhir"}
              </button>
            </div>
          );
        })
      )}
    </div>
  );
}
// ============================================================================
// MODUL 8: HASIL UJIAN, RUMUS PENILAIAN & REKAP NILAI BERKOP RESMI
// ============================================================================
function ResultsAndGradingView({
  supabase,
  exams,
  questions,
  students,
  classesList,
  subjects,
  participants,
  attempts,
  studentAnswers,
  examResults,
  gradingFormula,
  schoolSettings,
  documentSettings,
  isSimulation,
  onSaveFormula,
  onRefresh,
  showBanner
}) {
  const [selectedExamId, setSelectedExamId] = useState("");
  const [filterClassId, setFilterClassId] = useState("");
  const [formulaDraft, setFormulaDraft] = useState(gradingFormula);
  const [recalculating, setRecalculating] = useState(false);
  const [repairingAll, setRepairingAll] = useState(false);
  const [inspectingStudent, setInspectingStudent] = useState(null);
  const [manualScores, setManualScores] = useState({});
  useEffect(() => {
    setFormulaDraft(gradingFormula);
  }, [gradingFormula]);
  const buildAnswersMapForStudent = (examId, studentId, studentName = "") => {
    const map = {};
    const normTargetName = normalizePersonName(studentName);
    const matchingAttemptIds = new Set(
      attempts
        .filter(
          (a) =>
            a.exam_id === examId &&
            (String(a.student_id) === String(studentId) ||
              (normTargetName && normalizePersonName(a.student_name) === normTargetName))
        )
        .map((a) => String(a.student_id))
    );
    matchingAttemptIds.add(String(studentId));
    studentAnswers
      .filter((a) => a.exam_id === examId && matchingAttemptIds.has(String(a.student_id)))
      .forEach((a) => {
        if (a.question_id && a.answer !== undefined && a.answer !== null) {
          map[a.question_id] = a.answer;
        }
      });
    attempts
      .filter(
        (a) =>
          a.exam_id === examId &&
          (String(a.student_id) === String(studentId) ||
            (normTargetName && normalizePersonName(a.student_name) === normTargetName))
      )
      .forEach((att) => {
        if (att.answers && typeof att.answers === "object") {
          Object.entries(att.answers).forEach(([qId, ansVal]) => {
            if (ansVal !== undefined && ansVal !== null && String(ansVal).trim() !== "") {
              map[qId] = ansVal;
            }
          });
        }
      });
    return map;
  };
  const mergedResults = useMemo(() => {
    const byStudentKey = new Map();
    const resolveStudent = (stId, stName) =>
      findMatchingStudentRecord(students, { id: stId, name: stName });
    examResults
      .filter((r) => !selectedExamId || r.exam_id === selectedExamId)
      .forEach((r) => {
        const matchedStd = resolveStudent(r.student_id, r.student_name);
        const canonicalId = String(matchedStd?.id || r.student_id || "").trim();
        const canonicalName = String(matchedStd?.full_name || r.student_name || "").trim();
        const key = `${r.exam_id}::${normalizePersonName(canonicalName) || canonicalId}`;
        const prev = byStudentKey.get(key);
        const nextRow = {
          ...r,
          student_id: canonicalId || r.student_id,
          student_name: canonicalName || r.student_name,
          nisn: matchedStd?.nisn || r.nisn || "",
          class_id: matchedStd?.class_id || r.class_id || ""
        };
        if (!prev || Number(nextRow.score) >= Number(prev.score)) {
          byStudentKey.set(key, nextRow);
        }
      });
    attempts
      .filter((a) => !selectedExamId || a.exam_id === selectedExamId)
      .forEach((att) => {
        const matchedStd = resolveStudent(att.student_id, att.student_name);
        const canonicalId = String(matchedStd?.id || att.student_id || "").trim();
        const canonicalName = String(matchedStd?.full_name || att.student_name || "").trim();
        const key = `${att.exam_id}::${normalizePersonName(canonicalName) || canonicalId}`;
        if (!byStudentKey.has(key)) {
          const examObj = exams.find((e) => e.id === att.exam_id);
          const qIds = Array.isArray(examObj?.question_ids) ? examObj.question_ids : [];
          const examQs = qIds
            .map((id) => questions.find((q) => q.id === id))
            .filter(Boolean);
          const ansMap = buildAnswersMapForStudent(
            att.exam_id,
            att.student_id,
            canonicalName
          );
          const summary = computeExamScoreSummary(examQs, ansMap, gradingFormula);
          byStudentKey.set(key, {
            id: `${att.exam_id}_${canonicalId || att.student_id}`,
            exam_id: att.exam_id,
            exam_title: examObj?.title || "Ujian",
            student_id: canonicalId || att.student_id,
            student_name: canonicalName || "Siswa",
            nisn: matchedStd?.nisn || "",
            class_id: matchedStd?.class_id || "",
            score: summary.finalScore,
            correct_count: summary.correctCount,
            wrong_count: summary.wrongCount,
            empty_count: summary.emptyCount
          });
        }
      });
    return Array.from(byStudentKey.values())
      .filter((r) => {
        if (!filterClassId) return true;
        const st = resolveStudent(r.student_id, r.student_name);
        return String(st?.class_id || r.class_id || "") === String(filterClassId);
      })
      .sort((a, b) => (a.student_name || "").localeCompare(b.student_name || "", "id"));
  }, [
    examResults,
    attempts,
    studentAnswers,
    exams,
    questions,
    students,
    selectedExamId,
    filterClassId,
    gradingFormula
  ]);
  const handleRecalculateAll = async () => {
    setRecalculating(true);
    try {
      const targetExams = selectedExamId
        ? exams.filter((e) => e.id === selectedExamId)
        : exams;
      let updatedCount = 0;
      for (const ex of targetExams) {
        const examQuestions = await fetchQuestionsByIdsSafe(
          supabase,
          ex.question_ids,
          questions
        );
        if (examQuestions.length === 0) continue;
        const studentMap = new Map();
        const addStudentRef = (rawId, rawName, rawNisn = "") => {
          const matched = findMatchingStudentRecord(students, {
            id: rawId,
            nisn: rawNisn,
            name: rawName
          });
          const canonId = String(matched?.id || rawId || "").trim();
          const canonName = String(matched?.full_name || rawName || "").trim();
          const key = normalizePersonName(canonName) || canonId;
          if (!key) return;
          const prev = studentMap.get(key) || {
            canonId: canonId || rawId,
            canonName: canonName || "Siswa",
            rawIds: new Set()
          };
          if (canonId) prev.canonId = canonId;
          if (canonName) prev.canonName = canonName;
          if (rawId) prev.rawIds.add(String(rawId));
          if (matched?.id) prev.rawIds.add(String(matched.id));
          studentMap.set(key, prev);
        };
        attempts
          .filter((a) => a.exam_id === ex.id)
          .forEach((a) => addStudentRef(a.student_id, a.student_name));
        examResults
          .filter((r) => r.exam_id === ex.id)
          .forEach((r) => addStudentRef(r.student_id, r.student_name));
        studentAnswers
          .filter((a) => a.exam_id === ex.id)
          .forEach((a) => addStudentRef(a.student_id, ""));
        for (const info of studentMap.values()) {
          const ansMap = {};
          studentAnswers
            .filter((a) => a.exam_id === ex.id && info.rawIds.has(String(a.student_id)))
            .forEach((a) => {
              if (a.question_id && a.answer !== undefined && a.answer !== null) {
                ansMap[a.question_id] = a.answer;
              }
            });
          attempts
            .filter(
              (a) =>
                a.exam_id === ex.id &&
                (info.rawIds.has(String(a.student_id)) ||
                  normalizePersonName(a.student_name) === normalizePersonName(info.canonName))
            )
            .forEach((att) => {
              if (att.answers && typeof att.answers === "object") {
                Object.entries(att.answers).forEach(([qId, ansVal]) => {
                  if (ansVal !== undefined && ansVal !== null && String(ansVal).trim() !== "") {
                    ansMap[qId] = ansVal;
                  }
                });
              }
            });
          const summary = computeExamScoreSummary(examQuestions, ansMap, formulaDraft);
          if (supabase) {
            await supabase.from("exam_results").upsert({
              id: `${ex.id}_${info.canonId}`,
              exam_id: ex.id,
              exam_title: ex.title,
              student_id: info.canonId,
              student_name: info.canonName,
              score: summary.finalScore,
              correct_count: summary.correctCount,
              wrong_count: summary.wrongCount,
              empty_count: summary.emptyCount,
              is_simulation: Boolean(isSimulation),
              updated_at: new Date().toISOString()
            });
          }
          updatedCount++;
        }
      }
      await onRefresh();
      showBanner(
        "success",
        `Hitung ulang nilai selesai untuk ${updatedCount} peserta (semua tipe soal & kunci jawaban terbaru).`
      );
    } catch (err) {
      showBanner("error", `Gagal hitung ulang nilai: ${err.message}`);
    } finally {
      setRecalculating(false);
    }
  };
  const handleRepairAllExamScores = async () => {
    setRepairingAll(true);
    try {
      let repairedCount = 0;
      for (const ex of exams) {
        const examQuestions = await fetchQuestionsByIdsSafe(
          supabase,
          ex.question_ids,
          questions
        );
        if (examQuestions.length === 0) continue;
        const studentMap = new Map();
        const addRef = (rawId, rawName, rawNisn = "") => {
          const matched = findMatchingStudentRecord(students, {
            id: rawId,
            nisn: rawNisn,
            name: rawName
          });
          const canonId = String(matched?.id || rawId || "").trim();
          const canonName = String(matched?.full_name || rawName || "").trim();
          const key = normalizePersonName(canonName) || canonId;
          if (!key) return;
          const prev = studentMap.get(key) || {
            canonId: canonId || rawId,
            canonName: canonName || "Siswa",
            rawIds: new Set()
          };
          if (canonId) prev.canonId = canonId;
          if (canonName) prev.canonName = canonName;
          if (rawId) prev.rawIds.add(String(rawId));
          if (matched?.id) prev.rawIds.add(String(matched.id));
          studentMap.set(key, prev);
        };
        attempts
          .filter((a) => a.exam_id === ex.id)
          .forEach((a) => addRef(a.student_id, a.student_name));
        examResults
          .filter((r) => r.exam_id === ex.id)
          .forEach((r) => addRef(r.student_id, r.student_name));
        studentAnswers
          .filter((a) => a.exam_id === ex.id)
          .forEach((a) => addRef(a.student_id, ""));
        for (const info of studentMap.values()) {
          const ansMap = {};
          studentAnswers
            .filter((a) => a.exam_id === ex.id && info.rawIds.has(String(a.student_id)))
            .forEach((a) => {
              if (a.question_id && a.answer !== undefined && a.answer !== null) {
                ansMap[a.question_id] = a.answer;
              }
            });
          attempts
            .filter(
              (a) =>
                a.exam_id === ex.id &&
                (info.rawIds.has(String(a.student_id)) ||
                  normalizePersonName(a.student_name) === normalizePersonName(info.canonName))
            )
            .forEach((att) => {
              if (att.answers && typeof att.answers === "object") {
                Object.entries(att.answers).forEach(([qId, ansVal]) => {
                  if (ansVal !== undefined && ansVal !== null && String(ansVal).trim() !== "") {
                    ansMap[qId] = ansVal;
                  }
                });
              }
            });
          const summary = computeExamScoreSummary(examQuestions, ansMap, formulaDraft);
          if (supabase) {
            await supabase.from("exam_results").upsert({
              id: `${ex.id}_${info.canonId}`,
              exam_id: ex.id,
              exam_title: ex.title,
              student_id: info.canonId,
              student_name: info.canonName,
              score: summary.finalScore,
              correct_count: summary.correctCount,
              wrong_count: summary.wrongCount,
              empty_count: summary.emptyCount,
              is_simulation: Boolean(isSimulation),
              updated_at: new Date().toISOString()
            });
          }
          repairedCount++;
        }
      }
      await onRefresh();
      showBanner(
        "success",
        `Perbaikan massal selesai: ${repairedCount} nilai peserta di seluruh paket ujian telah dikoreksi & disinkronkan.`
      );
    } catch (err) {
      showBanner("error", `Gagal memperbaiki nilai massal: ${err.message}`);
    } finally {
      setRepairingAll(false);
    }
  };
  const openStudentInspection = async (row) => {
    const examObj = exams.find((e) => e.id === row.exam_id);
    const fullQuestions = await fetchQuestionsByIdsSafe(
      supabase,
      examObj?.question_ids,
      questions
    );
    const ansMap = buildAnswersMapForStudent(row.exam_id, row.student_id, row.student_name);
    const initManual = {};
    fullQuestions.forEach((q) => {
      const ev = evaluateSingleQuestionAnswer(q, ansMap[q.id], formulaDraft);
      initManual[q.id] = ev.earnedWeight;
    });
    setManualScores(initManual);
    setInspectingStudent({
      resultRow: row,
      exam: examObj,
      examQuestions: fullQuestions,
      ansMap
    });
  };
  const handleSaveManualScores = async () => {
    if (!inspectingStudent) return;
    const { resultRow, exam, examQuestions, ansMap } = inspectingStudent;
    const maxScore = Number(formulaDraft.max_score) || 100;
    let totalMaxWeight = 0;
    let totalEarned = 0;
    let correctCount = 0;
    let wrongCount = 0;
    let emptyCount = 0;
    examQuestions.forEach((q) => {
      const ev = evaluateSingleQuestionAnswer(q, ansMap[q.id], formulaDraft);
      const earned =
        manualScores[q.id] !== undefined ? Number(manualScores[q.id]) || 0 : ev.earnedWeight;
      totalMaxWeight += ev.maxWeight;
      totalEarned += earned;
      if (!String(ansMap[q.id] ?? "").trim()) emptyCount++;
      else if (earned >= ev.maxWeight) correctCount++;
      else wrongCount++;
    });
    const rawScore = totalMaxWeight > 0 ? (totalEarned / totalMaxWeight) * maxScore : 0;
    const finalScore =
      formulaDraft.rounding_mode === "INTEGER"
        ? Math.round(rawScore)
        : Number(rawScore.toFixed(2));
    if (supabase) {
      await supabase.from("exam_results").upsert({
        id: `${resultRow.exam_id}_${resultRow.student_id}`,
        exam_id: resultRow.exam_id,
        exam_title: exam?.title || resultRow.exam_title || "Ujian",
        student_id: resultRow.student_id,
        student_name: resultRow.student_name,
        score: finalScore,
        correct_count: correctCount,
        wrong_count: wrongCount,
        empty_count: emptyCount,
        is_simulation: Boolean(isSimulation),
        updated_at: new Date().toISOString()
      });
    }
    setInspectingStudent(null);
    await onRefresh();
    showBanner("success", `Nilai ${resultRow.student_name} diperbarui menjadi ${finalScore}.`);
  };
  const handleExportResultsExcel = async () => {
    if (mergedResults.length === 0) {
      return showBanner("error", "Belum ada data hasil ujian untuk diekspor.");
    }
    const examObj = exams.find((e) => e.id === selectedExamId);
    const clsObj = classesList.find((c) => c.id === filterClassId);
    await exportOfficialExcelWithKop({
      filename: `Rekap_Nilai_${(examObj?.title || "Semua_Ujian").replace(/\s+/g, "_")}.xlsx`,
      sheetName: "Rekap_Nilai",
      title: "REKAPITULASI HASIL UJIAN PESERTA DIDIK",
      subtitle: `${examObj?.title || "Semua Paket Ujian"} ${clsObj ? `• Kelas ${clsObj.name}` : ""}`,
      columns: [
        { key: "no", label: "No", width: 8 },
        { key: "nama", label: "Nama Siswa", width: 32 },
        { key: "kelas", label: "Kelas", width: 14 },
        { key: "ujian", label: "Ujian", width: 28 },
        { key: "benar", label: "Benar", width: 10 },
        { key: "salah", label: "Salah", width: 10 },
        { key: "kosong", label: "Kosong", width: 10 },
        { key: "nilai", label: "Nilai", width: 12 },
        { key: "ket", label: "Keterangan", width: 16 }
      ],
      rows: mergedResults.map((r, i) => {
        const st = findMatchingStudentRecord(students, {
          id: r.student_id,
          name: r.student_name
        });
        const clsName = classesList.find((c) => c.id === st?.class_id)?.name || "-";
        return {
          no: i + 1,
          nama: r.student_name,
          kelas: clsName,
          ujian: r.exam_title || examObj?.title || "-",
          benar: r.correct_count,
          salah: r.wrong_count,
          kosong: r.empty_count,
          nilai: r.score,
          ket: Number(r.score) >= (Number(formulaDraft.kkm) || 75) ? "Tuntas" : "Remedial"
        };
      }),
      documentSettings,
      isSimulation
    });
  };
  const handlePrintResultsPdf = () => {
    if (mergedResults.length === 0) {
      return showBanner("error", "Belum ada data hasil ujian untuk dicetak.");
    }
    const examObj = exams.find((e) => e.id === selectedExamId);
    const clsObj = classesList.find((c) => c.id === filterClassId);
    const bodyHtml = `
      <table class="data-table">
        <thead>
          <tr>
            <th style="width:36px;">No</th>
            <th>Nama Siswa</th>
            <th>Kelas</th>
            <th>Ujian</th>
            <th>B</th>
            <th>S</th>
            <th>K</th>
            <th>Nilai</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${mergedResults
            .map((r, idx) => {
              const st = findMatchingStudentRecord(students, {
                id: r.student_id,
                name: r.student_name
              });
              const clsName = classesList.find((c) => c.id === st?.class_id)?.name || "-";
              const tuntas = Number(r.score) >= (Number(formulaDraft.kkm) || 75);
              return `<tr>
                <td style="text-align:center;">${idx + 1}</td>
                <td>${escapeHtml(r.student_name)}</td>
                <td style="text-align:center;">${escapeHtml(clsName)}</td>
                <td>${escapeHtml(r.exam_title || examObj?.title || "-")}</td>
                <td style="text-align:center;">${r.correct_count}</td>
                <td style="text-align:center;">${r.wrong_count}</td>
                <td style="text-align:center;">${r.empty_count}</td>
                <td style="text-align:center; font-weight:bold;">${escapeHtml(r.score)}</td>
                <td style="text-align:center;">${tuntas ? "Tuntas" : "Remedial"}</td>
              </tr>`;
            })
            .join("")}
        </tbody>
      </table>
    `;
    const html = buildOfficialDocumentHtml({
      title: "REKAPITULASI NILAI UJIAN",
      subtitle: `${examObj?.title || "Semua Ujian"} ${clsObj ? `• Kelas ${clsObj.name}` : ""} • KKM: ${formulaDraft.kkm || 75}`,
      metaRows: [
        { label: "Paket Ujian", value: examObj?.title || "Semua Paket Ujian" },
        { label: "Kelas", value: clsObj?.name || "Semua Kelas" },
        { label: "KKM", value: String(formulaDraft.kkm || 75) },
        { label: "Jumlah Peserta", value: `${mergedResults.length} Siswa` }
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
      <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 text-xs">
        <div className="font-extrabold text-slate-900">
          Konfigurasi Rumus Penilaian & Koreksi Otomatis
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Mode Bobot Soal</label>
            <select
              value={formulaDraft.weight_mode}
              onChange={(e) => setFormulaDraft({ ...formulaDraft, weight_mode: e.target.value })}
              className="w-full border border-slate-300 rounded-xl px-2.5 py-2"
            >
              <option value="EQUAL_PER_QUESTION">Rata per Butir Soal</option>
              <option value="CUSTOM_WEIGHT">Sesuai Bobot Soal</option>
            </select>
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">PG Kompleks & B/S</label>
            <select
              value={formulaDraft.pg_kompleks_mode}
              onChange={(e) =>
                setFormulaDraft({ ...formulaDraft, pg_kompleks_mode: e.target.value })
              }
              className="w-full border border-slate-300 rounded-xl px-2.5 py-2"
            >
              <option value="STRICT">Tepat Semua (Strict)</option>
              <option value="PARTIAL">Skor Parsial</option>
            </select>
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Isian / Uraian</label>
            <select
              value={formulaDraft.isian_mode}
              onChange={(e) => setFormulaDraft({ ...formulaDraft, isian_mode: e.target.value })}
              className="w-full border border-slate-300 rounded-xl px-2.5 py-2"
            >
              <option value="CASE_INSENSITIVE">Abaikan Huruf Kapital</option>
              <option value="CASE_SENSITIVE">Perhatikan Kapital</option>
            </select>
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Pembulatan Nilai</label>
            <select
              value={formulaDraft.rounding_mode}
              onChange={(e) =>
                setFormulaDraft({ ...formulaDraft, rounding_mode: e.target.value })
              }
              className="w-full border border-slate-300 rounded-xl px-2.5 py-2"
            >
              <option value="2_DECIMALS">2 Desimal (0.00)</option>
              <option value="INTEGER">Bilangan Bulat</option>
            </select>
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">KKM</label>
            <input
              type="number"
              value={formulaDraft.kkm}
              onChange={(e) => setFormulaDraft({ ...formulaDraft, kkm: e.target.value })}
              className="w-full border border-slate-300 rounded-xl px-2.5 py-2"
            />
          </div>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={() => onSaveFormula(formulaDraft)}
            className="px-3.5 py-2 rounded-xl border border-slate-300 font-bold flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            Simpan Rumus
          </button>
          <button
            type="button"
            disabled={recalculating}
            onClick={handleRecalculateAll}
            className="px-4 py-2 rounded-xl bg-emerald-700 text-white font-extrabold flex items-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${recalculating ? "animate-spin" : ""}`} />
            {recalculating ? "Menghitung..." : "Hitung Ulang Semua Nilai"}
          </button>
          <button
            type="button"
            disabled={repairingAll}
            onClick={handleRepairAllExamScores}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold flex items-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${repairingAll ? "animate-spin" : ""}`} />
            {repairingAll ? "Memperbaiki..." : "Perbaiki Semua Nilai Ujian"}
          </button>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
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
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleExportResultsExcel}
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
            Cetak Rekap Nilai PDF
          </button>
        </div>
      </div>
      <div className="bg-white border border-slate-200 rounded-2xl overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-700">
            <tr>
              <th className="p-3 text-left">Nama Siswa</th>
              <th className="p-3 text-left">Kelas</th>
              <th className="p-3 text-left">Ujian</th>
              <th className="p-3 text-center">Benar</th>
              <th className="p-3 text-center">Salah</th>
              <th className="p-3 text-center">Kosong</th>
              <th className="p-3 text-center">Nilai</th>
              <th className="p-3 text-right">Periksa Jawaban</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {mergedResults.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-6 text-center text-slate-500">
                  Belum ada hasil ujian pada filter ini.
                </td>
              </tr>
            ) : (
              mergedResults.map((r) => {
                const st = findMatchingStudentRecord(students, {
                  id: r.student_id,
                  name: r.student_name
                });
                const clsName = classesList.find((c) => c.id === st?.class_id)?.name || "-";
                return (
                  <tr key={r.id}>
                    <td className="p-3 font-bold text-slate-900">{r.student_name}</td>
                    <td className="p-3">{clsName}</td>
                    <td className="p-3">{r.exam_title || "-"}</td>
                    <td className="p-3 text-center">{r.correct_count}</td>
                    <td className="p-3 text-center">{r.wrong_count}</td>
                    <td className="p-3 text-center">{r.empty_count}</td>
                    <td className="p-3 text-center font-extrabold text-emerald-800">{r.score}</td>
                    <td className="p-3 text-right">
                      <button
                        type="button"
                        onClick={() => openStudentInspection(r)}
                        className="px-3 py-1 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 font-bold"
                      >
                        Periksa & Koreksi
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
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
      {inspectingStudent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  Lembar Jawaban & Koreksi — {inspectingStudent.resultRow.student_name}
                </h3>
                <p className="text-xs text-slate-500">
                  {inspectingStudent.exam?.title || "Ujian"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInspectingStudent(null)}
                className="p-1 text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              {inspectingStudent.examQuestions.map((q, idx) => {
                const sAns = inspectingStudent.ansMap[q.id] ?? "";
                const ev = evaluateSingleQuestionAnswer(q, sAns, formulaDraft);
                return (
                  <div
                    key={q.id}
                    className="border border-slate-200 rounded-xl p-3 space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-extrabold">
                        Soal #{idx + 1} ({q.type})
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded font-bold ${
                          ev.status === "CORRECT"
                            ? "bg-emerald-100 text-emerald-800"
                            : ev.status === "EMPTY"
                              ? "bg-slate-100 text-slate-600"
                              : "bg-red-100 text-red-700"
                        }`}
                      >
                        {ev.status}
                      </span>
                    </div>
                    <div className="font-semibold text-slate-900">
                      <RichQuestionContent content={q.question_text} />
                    </div>
                    <div className="text-slate-700">
                      Jawaban Siswa: <strong>{String(sAns || "(Kosong)")}</strong> • Kunci:{" "}
                      <strong className="text-emerald-800">{q.correct_answer}</strong>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-slate-600">Skor Butir (Max {ev.maxWeight}):</span>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max={ev.maxWeight}
                        value={manualScores[q.id] ?? ev.earnedWeight}
                        onChange={(e) =>
                          setManualScores((prev) => ({ ...prev, [q.id]: e.target.value }))
                        }
                        className="w-24 border border-slate-300 rounded-lg px-2 py-1 font-bold"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setInspectingStudent(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={handleSaveManualScores}
                className="px-4 py-2 rounded-xl bg-emerald-700 text-white text-xs font-extrabold"
              >
                Simpan Skor & Perbarui Nilai
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
// ============================================================================
// MODUL 9: ANALISIS BUTIR SOAL BERKOP RESMI
// ============================================================================
function ItemAnalysisView({
  exams,
  questions,
  studentAnswers,
  subjects,
  schoolSettings,
  documentSettings,
  isSimulation,
  showBanner
}) {
  const [selectedExamId, setSelectedExamId] = useState("");
  const analysisRows = useMemo(() => {
    const targetExams = selectedExamId ? exams.filter((e) => e.id === selectedExamId) : exams;
    const questionIdList = [];
    targetExams.forEach((ex) => {
      if (Array.isArray(ex.question_ids)) {
        ex.question_ids.forEach((id) => {
          if (!questionIdList.includes(id)) questionIdList.push(id);
        });
      }
    });
    const baseQuestions =
      questionIdList.length > 0
        ? questionIdList.map((id) => questions.find((q) => q.id === id)).filter(Boolean)
        : questions;
    return baseQuestions.map((q, idx) => {
      const relevantAnswers = studentAnswers.filter(
        (a) =>
          a.question_id === q.id &&
          (!selectedExamId || a.exam_id === selectedExamId) &&
          String(a.answer ?? "").trim() !== ""
      );
      const respondents = relevantAnswers.length;
      let correct = 0;
      relevantAnswers.forEach((a) => {
        const ev = evaluateSingleQuestionAnswer(q, a.answer);
        if (ev.status === "CORRECT") correct++;
      });
      const rate = respondents > 0 ? Math.round((correct / respondents) * 100) : 0;
      const criteria =
        respondents === 0
          ? "Belum Ada Respon"
          : rate >= 70
            ? "Mudah"
            : rate >= 35
              ? "Sedang"
              : "Sukar";
      return {
        no: idx + 1,
        id: q.id,
        folder: getQuestionFolderName(q),
        text: q.question_text,
        type: q.type,
        respondents,
        correct,
        rate,
        criteria
      };
    });
  }, [exams, questions, studentAnswers, selectedExamId]);
  const handlePrintAnalysis = () => {
    if (analysisRows.length === 0) {
      return showBanner("error", "Belum ada data analisis soal untuk dicetak.");
    }
    const examObj = exams.find((e) => e.id === selectedExamId);
    const bodyHtml = `
      <table class="data-table">
        <thead>
          <tr>
            <th style="width:36px;">No</th>
            <th>Folder</th>
            <th>Butir Soal</th>
            <th>Responden</th>
            <th>Benar</th>
            <th>% Benar</th>
            <th>Kriteria</th>
          </tr>
        </thead>
        <tbody>
          ${analysisRows
            .map(
              (r) => `<tr>
              <td style="text-align:center;">${r.no}</td>
              <td>${escapeHtml(r.folder)}</td>
              <td>${escapeHtml(r.text)}</td>
              <td style="text-align:center;">${r.respondents}</td>
              <td style="text-align:center;">${r.correct}</td>
              <td style="text-align:center;">${r.rate}%</td>
              <td style="text-align:center;">${escapeHtml(r.criteria)}</td>
            </tr>`
            )
            .join("")}
        </tbody>
      </table>
    `;
    const html = buildOfficialDocumentHtml({
      title: "LAPORAN ANALISIS BUTIR SOAL",
      subtitle: examObj?.title || "Seluruh Butir Soal Bank Soal",
      metaRows: [
        { label: "Paket Ujian", value: examObj?.title || "Semua Butir Soal" },
        { label: "Jumlah Butir Dianalisis", value: `${analysisRows.length} Soal` }
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
          <option value="">Semua Butir Soal</option>
          {exams.map((ex) => (
            <option key={ex.id} value={ex.id}>
              {ex.title}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={handlePrintAnalysis}
          className="px-4 py-2 rounded-xl bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5"
        >
          <Printer className="w-4 h-4" />
          Cetak Analisis Soal PDF
        </button>
      </div>
      <div className="bg-white border border-slate-200 rounded-2xl overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-700">
            <tr>
              <th className="p-3 text-center w-12">No</th>
              <th className="p-3 text-left">Folder</th>
              <th className="p-3 text-left">Butir Soal</th>
              <th className="p-3 text-center">Responden</th>
              <th className="p-3 text-center">Benar</th>
              <th className="p-3 text-center">% Benar</th>
              <th className="p-3 text-center">Kriteria</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {analysisRows.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-6 text-center text-slate-500">
                  Belum ada data butir soal untuk dianalisis.
                </td>
              </tr>
            ) : (
              analysisRows.map((r) => (
                <tr key={r.id}>
                  <td className="p-3 text-center font-bold">{r.no}</td>
                  <td className="p-3 text-emerald-900 font-semibold">{r.folder}</td>
                  <td className="p-3">{r.text}</td>
                  <td className="p-3 text-center">{r.respondents}</td>
                  <td className="p-3 text-center">{r.correct}</td>
                  <td className="p-3 text-center font-bold">{r.rate}%</td>
                  <td className="p-3 text-center font-semibold">{r.criteria}</td>
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
// MODUL 10: PUSAT LAPORAN RESMI TERPUSAT (PDF, WORD & EXCEL BERKOP)
// ============================================================================
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
  const [reportType, setReportType] = useState("REKAP_NILAI");
  const [selectedExamId, setSelectedExamId] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("");
  const generateReportContent = () => {
    const examObj = exams.find((e) => e.id === selectedExamId);
    const clsObj = classesList.find((c) => c.id === selectedClassId);
    if (reportType === "DATA_SISWA") {
      const list = students.filter((s) => !selectedClassId || s.class_id === selectedClassId);
      const bodyHtml = `<table class="data-table"><thead><tr><th>No</th><th>NIS</th><th>NISN</th><th>Nama Siswa</th><th>Kelas</th></tr></thead><tbody>${list
        .map(
          (s, i) =>
            `<tr><td style="text-align:center;">${i + 1}</td><td>${escapeHtml(s.nis || "-")}</td><td>${escapeHtml(s.nisn || "-")}</td><td>${escapeHtml(s.full_name)}</td><td style="text-align:center;">${escapeHtml(classesList.find((c) => c.id === s.class_id)?.name || "-")}</td></tr>`
        )
        .join("")}</tbody></table>`;
      return {
        title: "LAPORAN DATA PESERTA DIDIK",
        subtitle: clsObj ? `Kelas ${clsObj.name}` : "Seluruh Kelas",
        metaRows: [
          { label: "Kelas", value: clsObj?.name || "Semua Kelas" },
          { label: "Jumlah Siswa", value: `${list.length} Siswa` }
        ],
        bodyHtml,
        excelCols: [
          { key: "no", label: "No", width: 8 },
          { key: "nis", label: "NIS", width: 16 },
          { key: "nisn", label: "NISN", width: 18 },
          { key: "nama", label: "Nama Siswa", width: 32 },
          { key: "kelas", label: "Kelas", width: 14 }
        ],
        excelRows: list.map((s, i) => ({
          no: i + 1,
          nis: s.nis || "-",
          nisn: s.nisn || "-",
          nama: s.full_name,
          kelas: classesList.find((c) => c.id === s.class_id)?.name || "-"
        }))
      };
    }
    const filteredResults = examResults.filter((r) => {
      const matchExam = !selectedExamId || r.exam_id === selectedExamId;
      const st = findMatchingStudentRecord(students, {
        id: r.student_id,
        name: r.student_name
      });
      const matchCls = !selectedClassId || st?.class_id === selectedClassId;
      return matchExam && matchCls;
    });
    const bodyHtml = `<table class="data-table"><thead><tr><th>No</th><th>Nama Siswa</th><th>Kelas</th><th>Ujian</th><th>B</th><th>S</th><th>K</th><th>Nilai</th></tr></thead><tbody>${filteredResults
      .map((r, i) => {
        const st = findMatchingStudentRecord(students, {
          id: r.student_id,
          name: r.student_name
        });
        return `<tr><td style="text-align:center;">${i + 1}</td><td>${escapeHtml(r.student_name)}</td><td style="text-align:center;">${escapeHtml(classesList.find((c) => c.id === st?.class_id)?.name || "-")}</td><td>${escapeHtml(r.exam_title || "-")}</td><td style="text-align:center;">${r.correct_count}</td><td style="text-align:center;">${r.wrong_count}</td><td style="text-align:center;">${r.empty_count}</td><td style="text-align:center;font-weight:bold;">${escapeHtml(r.score)}</td></tr>`;
      })
      .join("")}</tbody></table>`;
    return {
      title: "LAPORAN RESMI HASIL UJIAN",
      subtitle: `${examObj?.title || "Semua Ujian"} ${clsObj ? `• Kelas ${clsObj.name}` : ""}`,
      metaRows: [
        { label: "Paket Ujian", value: examObj?.title || "Semua Ujian" },
        { label: "Kelas", value: clsObj?.name || "Semua Kelas" },
        { label: "Jumlah Data", value: `${filteredResults.length} Baris` }
      ],
      bodyHtml,
      excelCols: [
        { key: "no", label: "No", width: 8 },
        { key: "nama", label: "Nama Siswa", width: 32 },
        { key: "kelas", label: "Kelas", width: 14 },
        { key: "ujian", label: "Ujian", width: 28 },
        { key: "benar", label: "Benar", width: 10 },
        { key: "salah", label: "Salah", width: 10 },
        { key: "kosong", label: "Kosong", width: 10 },
        { key: "nilai", label: "Nilai", width: 12 }
      ],
      excelRows: filteredResults.map((r, i) => {
        const st = findMatchingStudentRecord(students, {
          id: r.student_id,
          name: r.student_name
        });
        return {
          no: i + 1,
          nama: r.student_name,
          kelas: classesList.find((c) => c.id === st?.class_id)?.name || "-",
          ujian: r.exam_title || "-",
          benar: r.correct_count,
          salah: r.wrong_count,
          kosong: r.empty_count,
          nilai: r.score
        };
      })
    };
  };
  const handlePrintPdf = () => {
    const rep = generateReportContent();
    const html = buildOfficialDocumentHtml({
      ...rep,
      schoolSettings,
      documentSettings,
      isSimulation
    });
    openPrintDocumentWindow(html);
  };
  const handleDownloadWord = () => {
    const rep = generateReportContent();
    const html = buildOfficialDocumentHtml({
      ...rep,
      schoolSettings,
      documentSettings,
      isSimulation
    });
    downloadWordDocFile(`${rep.title.replace(/\s+/g, "_")}.doc`, html);
    showBanner("success", "Dokumen Word (.doc) berkop resmi berhasil diunduh.");
  };
  const handleDownloadExcel = async () => {
    const rep = generateReportContent();
    await exportOfficialExcelWithKop({
      filename: `${rep.title.replace(/\s+/g, "_")}.xlsx`,
      sheetName: "Laporan_Resmi",
      title: rep.title,
      subtitle: rep.subtitle,
      columns: rep.excelCols,
      rows: rep.excelRows,
      documentSettings,
      isSimulation
    });
  };
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 text-xs shadow-sm">
      <h2 className="text-sm font-extrabold text-slate-900">
        Pusat Laporan Resmi Berkop Madrasah
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block font-bold text-slate-700 mb-1">Jenis Laporan</label>
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            className="w-full border border-slate-300 rounded-xl px-3 py-2"
          >
            <option value="REKAP_NILAI">Rekapitulasi Nilai Ujian</option>
            <option value="DATA_SISWA">Daftar Peserta Didik</option>
          </select>
        </div>
        <div>
          <label className="block font-bold text-slate-700 mb-1">Filter Ujian</label>
          <select
            value={selectedExamId}
            onChange={(e) => setSelectedExamId(e.target.value)}
            className="w-full border border-slate-300 rounded-xl px-3 py-2"
          >
            <option value="">Semua Ujian</option>
            {exams.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.title}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block font-bold text-slate-700 mb-1">Filter Kelas</label>
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="w-full border border-slate-300 rounded-xl px-3 py-2"
          >
            <option value="">Semua Kelas</option>
            {classesList.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex flex-wrap gap-3 pt-2">
        <button
          type="button"
          onClick={handlePrintPdf}
          className="px-4 py-2.5 rounded-xl bg-emerald-700 text-white font-extrabold flex items-center gap-1.5"
        >
          <Printer className="w-4 h-4" />
          Cetak / Simpan PDF Berkop
        </button>
        <button
          type="button"
          onClick={handleDownloadWord}
          className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white font-bold flex items-center gap-1.5"
        >
          <FileText className="w-4 h-4 text-blue-700" />
          Unduh Word (.doc) Berkop
        </button>
        <button
          type="button"
          onClick={handleDownloadExcel}
          className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white font-bold flex items-center gap-1.5"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
          Unduh Excel (.xlsx) Berkop
        </button>
      </div>
    </div>
  );
}
// ============================================================================
// MODUL 11: PENGATURAN DOKUMEN & KOP SURAT TERPUSAT
// ============================================================================
function DocumentSettingsView({
  schoolSettings,
  documentSettings,
  onSaveDocumentSettings,
  showBanner
}) {
  const [form, setForm] = useState({ ...DEFAULT_DOCUMENT_SETTINGS, ...documentSettings });
  useEffect(() => {
    setForm({ ...DEFAULT_DOCUMENT_SETTINGS, ...documentSettings });
  }, [documentSettings]);
  const handleKopFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      return showBanner("error", "Ukuran gambar kop surat maksimal 2 MB.");
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setForm((prev) => ({ ...prev, kop_image: reader.result }));
    };
    reader.readAsDataURL(file);
  };
  const handlePreview = () => {
    const html = buildOfficialDocumentHtml({
      title: "CONTOH PREVIEW DOKUMEN BERKOP RESMI",
      subtitle: "Pengujian Kop Surat, Margin, Ukuran Kertas & Footer",
      metaRows: [
        { label: "Madrasah", value: schoolSettings.school_name },
        { label: "Tahun Pelajaran", value: schoolSettings.academic_year }
      ],
      bodyHtml: `<p style="font-size:10.5pt;">Dokumen ini menampilkan pratinjau kop surat resmi yang digunakan pada cetak naskah soal, daftar hadir, rekap nilai, dan laporan.</p>`,
      schoolSettings,
      documentSettings: form,
      includeSignature: true
    });
    openPrintDocumentWindow(html);
  };
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 text-xs shadow-sm">
      <h2 className="text-sm font-extrabold text-slate-900">
        Pengaturan Template Dokumen & Kop Surat Resmi
      </h2>
      <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3">
        <div className="font-bold text-slate-700">Pratinjau Kop Surat Aktif:</div>
        <img
          src={form.kop_image || DEFAULT_KOP_IMAGE_SRC}
          alt="Kop Surat MIN 4 Magelang"
          className="w-full max-h-36 object-contain bg-white border border-slate-200 rounded-lg p-2"
        />
        <div>
          <label className="block font-bold text-slate-700 mb-1">
            Ganti Gambar Kop Surat (Opsional)
          </label>
          <input type="file" accept="image/*" onChange={handleKopFileUpload} />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <label className="flex items-center gap-2 font-bold">
          <input
            type="checkbox"
            checked={Boolean(form.use_kop_pdf)}
            onChange={(e) => setForm({ ...form, use_kop_pdf: e.target.checked })}
          />
          Gunakan Kop pada Cetak / PDF
        </label>
        <label className="flex items-center gap-2 font-bold">
          <input
            type="checkbox"
            checked={Boolean(form.use_kop_excel)}
            onChange={(e) => setForm({ ...form, use_kop_excel: e.target.checked })}
          />
          Gunakan Kop pada Ekspor Excel
        </label>
        <label className="flex items-center gap-2 font-bold">
          <input
            type="checkbox"
            checked={Boolean(form.use_kop_word)}
            onChange={(e) => setForm({ ...form, use_kop_word: e.target.checked })}
          />
          Gunakan Kop pada Ekspor Word
        </label>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block font-bold text-slate-700 mb-1">Ukuran Kertas</label>
          <select
            value={form.paper_size}
            onChange={(e) => setForm({ ...form, paper_size: e.target.value })}
            className="w-full border border-slate-300 rounded-xl px-3 py-2"
          >
            <option value="A4">A4</option>
            <option value="F4">F4 / Folio</option>
            <option value="Letter">Letter</option>
          </select>
        </div>
        <div>
          <label className="block font-bold text-slate-700 mb-1">Orientasi</label>
          <select
            value={form.orientation}
            onChange={(e) => setForm({ ...form, orientation: e.target.value })}
            className="w-full border border-slate-300 rounded-xl px-3 py-2"
          >
            <option value="portrait">Portrait (Tegak)</option>
            <option value="landscape">Landscape (Mendatar)</option>
          </select>
        </div>
        <div>
          <label className="block font-bold text-slate-700 mb-1">Margin (mm)</label>
          <input
            type="number"
            min="5"
            max="40"
            value={form.margin_top_mm}
            onChange={(e) => {
              const m = Number(e.target.value) || 15;
              setForm({
                ...form,
                margin_top_mm: m,
                margin_bottom_mm: m,
                margin_left_mm: m,
                margin_right_mm: m
              });
            }}
            className="w-full border border-slate-300 rounded-xl px-3 py-2"
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-2 pt-2">
        <button
          type="button"
          onClick={() => onSaveDocumentSettings(form)}
          className="px-4 py-2.5 rounded-xl bg-emerald-700 text-white font-extrabold"
        >
          Simpan Pengaturan Dokumen
        </button>
        <button
          type="button"
          onClick={handlePreview}
          className="px-4 py-2.5 rounded-xl border border-slate-300 font-bold flex items-center gap-1.5"
        >
          <Printer className="w-4 h-4" />
          Preview Cetak
        </button>
      </div>
    </div>
  );
}
// ============================================================================
// MODUL 12: BACKUP DATA JSON
// ============================================================================
function BackupDataView({ isSimulation, payload, showBanner }) {
  const handleDownloadBackup = () => {
    const prefix = isSimulation ? "SIMULASI_" : "";
    const jsonStr = JSON.stringify(
      {
        exported_at: new Date().toISOString(),
        is_simulation: Boolean(isSimulation),
        ...payload
      },
      null,
      2
    );
    const blob = new Blob([jsonStr], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${prefix}Backup_CBT_MIN4_MAGELANG_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showBanner("success", "File backup JSON berhasil diunduh.");
  };
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 text-xs shadow-sm">
      <h2 className="text-sm font-extrabold text-slate-900">Backup Data Sistem</h2>
      <p className="text-slate-600">
        Unduh salinan cadangan data operasional dalam format JSON untuk arsip keamanan madrasah.
      </p>
      <button
        type="button"
        onClick={handleDownloadBackup}
        className="px-4 py-2.5 rounded-xl bg-emerald-700 text-white font-extrabold flex items-center gap-1.5"
      >
        <Download className="w-4 h-4" />
        Unduh Backup JSON
      </button>
    </div>
  );
}
// ============================================================================
// MODUL 13: PENGATURAN AKUN & KONEKSI SUPABASE
// ============================================================================
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
  const [newFullName, setNewFullName] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("GURU");
  const handleCreateAccount = async (e) => {
    e.preventDefault();
    if (!supabase) return showBanner("error", "Supabase belum terhubung.");
    if (newPassword.length < 8) {
      return showBanner("error", "Password minimal 8 karakter.");
    }
    try {
      const cleanEmail = newEmail.trim().toLowerCase();
      const cleanUsername = newUsername.trim().toLowerCase();
      const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
        email: cleanEmail,
        password: newPassword
      });
      if (signUpErr) throw signUpErr;
      const userId = signUpData?.user?.id;
      if (!userId) {
        throw new Error("Akun Auth dibuat tetapi konfirmasi email aktif di Supabase.");
      }
      const { error: profErr } = await supabase.from("profiles").insert([
        {
          id: userId,
          full_name: newFullName.trim(),
          username: cleanUsername,
          email: cleanEmail,
          role: newRole,
          is_active: true,
          is_simulation: Boolean(isSimulation)
        }
      ]);
      if (profErr) throw profErr;
      setNewFullName("");
      setNewUsername("");
      setNewEmail("");
      setNewPassword("");
      await onRefresh();
      showBanner("success", `Akun ${newRole} berhasil dibuat.`);
    } catch (err) {
      showBanner("error", `Gagal membuat akun: ${err.message}`);
    }
  };
  const toggleProfileActive = async (prof) => {
    if (!supabase) return;
    const { error } = await supabase
      .from("profiles")
      .update({ is_active: !prof.is_active })
      .eq("id", prof.id);
    if (error) return showBanner("error", error.message);
    await onRefresh();
    showBanner("success", "Status akun diperbarui.");
  };
  return (
    <div className="space-y-5">
      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 text-xs shadow-sm">
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
            <label className="block font-bold text-slate-700 mb-1">Supabase Publishable / Anon Key</label>
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
          className="px-4 py-2 rounded-xl bg-emerald-700 text-white font-extrabold"
        >
          Simpan Kredensial Supabase
        </button>
      </div>
      <form
        onSubmit={handleCreateAccount}
        className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 text-xs shadow-sm"
      >
        <h2 className="text-sm font-extrabold text-slate-900">
          Registrasi Akun Guru / Admin / Siswa
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <input
            type="text"
            required
            placeholder="Nama Lengkap"
            value={newFullName}
            onChange={(e) => setNewFullName(e.target.value)}
            className="border border-slate-300 rounded-xl px-3 py-2"
          />
          <input
            type="text"
            required
            placeholder="Username"
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            className="border border-slate-300 rounded-xl px-3 py-2"
          />
          <input
            type="email"
            required
            placeholder="Email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            className="border border-slate-300 rounded-xl px-3 py-2"
          />
          <input
            type="password"
            required
            minLength={8}
            placeholder="Password (min 8)"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="border border-slate-300 rounded-xl px-3 py-2"
          />
          <select
            value={newRole}
            onChange={(e) => setNewRole(e.target.value)}
            className="border border-slate-300 rounded-xl px-3 py-2"
          >
            <option value="GURU">GURU</option>
            <option value="ADMIN">ADMIN</option>
            <option value="SISWA">SISWA</option>
          </select>
        </div>
        <button
          type="submit"
          className="px-4 py-2 rounded-xl bg-emerald-700 text-white font-extrabold"
        >
          Buat Akun Pengguna
        </button>
      </form>
      <div className="bg-white border border-slate-200 rounded-2xl overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-700">
            <tr>
              <th className="p-3 text-left">Nama</th>
              <th className="p-3 text-left">Username</th>
              <th className="p-3 text-left">Email</th>
              <th className="p-3 text-center">Peran</th>
              <th className="p-3 text-center">Status</th>
              <th className="p-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {profilesList.map((p) => (
              <tr key={p.id}>
                <td className="p-3 font-bold">{p.full_name}</td>
                <td className="p-3 font-mono">{p.username}</td>
                <td className="p-3">{p.email}</td>
                <td className="p-3 text-center font-bold">{p.role}</td>
                <td className="p-3 text-center">
                  <span
                    className={`px-2 py-0.5 rounded-full font-bold ${
                      p.is_active ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"
                    }`}
                  >
                    {p.is_active ? "AKTIF" : "NONAKTIF"}
                  </span>
                </td>
                <td className="p-3 text-right">
                  <button
                    type="button"
                    onClick={() => toggleProfileActive(p)}
                    className="px-2.5 py-1 rounded-lg border border-slate-300 font-bold"
                  >
                    {p.is_active ? "Nonaktifkan" : "Aktifkan"}
                  </button>
                </td>
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
