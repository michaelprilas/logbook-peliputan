import React, { useState, useMemo, useRef, useEffect, useCallback, startTransition } from 'react';
import pkpLogo from './assets/logo-pkp.svg';
import initialActivities from './data/activities.json';
import initialNews from './data/news.json';
import { fetchLiveActivities, fetchLiveNews } from './utils/googleSheetSync';
import {
  Search,
  Calendar,
  MapPin,
  Users,
  Video,
  Newspaper,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  ArrowUpRight,
  ArrowLeft,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download,
  X,
  FileText,
  FileSpreadsheet,
  FolderArchive,
  Layers,
  Wrench,
  LayoutDashboard,
  Filter,
  PieChart,
  CalendarDays,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Minus,
  RotateCcw,
  Sparkles,
  Clock,
  RefreshCw,
  Info,
  Eye,
  TrendingUp,
  Flame,
  BookOpen,
  Share2
} from 'lucide-react';

const MONTH_ORDER = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export default function App() {
  const [activities, setActivities] = useState(initialActivities);

  // Navigation: 'search' (default) | 'dashboard' | 'rekapitulasi' | 'laporan' | 'tim'
  const [currentMenu, setCurrentMenu] = useState('search');
  const [menuHistory, setMenuHistory] = useState(['search']);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Search state for "Pencarian Kegiatan"
  const [searchQuery, setSearchQuery] = useState('');

  // Filter state for "Rekapitulasi Kegiatan" (Table)
  const [rekapSearch, setRekapSearch] = useState('');
  
  // Multi-select months: empty array means ALL months selected
  const [selectedMonths, setSelectedMonths] = useState([]);
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const monthPickerRef = useRef(null);

  const [selectedNewsStatus, setSelectedNewsStatus] = useState('all');
  const [isNewsStatusPickerOpen, setIsNewsStatusPickerOpen] = useState(false);
  const newsStatusPickerRef = useRef(null);

  const [selectedVideoStatus, setSelectedVideoStatus] = useState('all');
  const [isVideoStatusPickerOpen, setIsVideoStatusPickerOpen] = useState(false);
  const videoStatusPickerRef = useRef(null);

  const [selectedProvince, setSelectedProvince] = useState('all');
  const [isProvincePickerOpen, setIsProvincePickerOpen] = useState(false);
  const [provinceSearch, setProvinceSearch] = useState('');
  const provincePickerRef = useRef(null);

  // Multi-select officers: empty array means ALL officers selected (AND logic)
  const [selectedOfficers, setSelectedOfficers] = useState([]);
  const [isOfficerPickerOpen, setIsOfficerPickerOpen] = useState(false);
  const [officerSearch, setOfficerSearch] = useState('');
  const officerPickerRef = useRef(null);

  // Sort state for "Rekapitulasi Kegiatan" (Table)
  const [rekapSort, setRekapSort] = useState({ field: 'nomor', direction: 'asc' });
  const [isSortPickerOpen, setIsSortPickerOpen] = useState(false);
  const sortPickerRef = useRef(null);

  // Detail Drawer state
  const [selectedDetailItem, setSelectedDetailItem] = useState(null);

  // Copy status per activity id
  const [copyStatus, setCopyStatus] = useState({});

  // News states for "Halaman Berita"
  const [news, setNews] = useState(initialNews);
  const [selectedNewsYear, setSelectedNewsYear] = useState('2026');
  const [newsSearch, setNewsSearch] = useState('');
  const [newsSort, setNewsSort] = useState('newest'); // 'newest' | 'popular' | 'oldest'
  const [isNewsSortPickerOpen, setIsNewsSortPickerOpen] = useState(false);
  const newsSortPickerRef = useRef(null);
  const [selectedNewsDetail, setSelectedNewsDetail] = useState(null);
  const [newsCopyStatus, setNewsCopyStatus] = useState({});
  const [newsLimit, setNewsLimit] = useState(30);

  // Hover state for Dashboard Monthly Bar Chart (null when not hovering)
  const [hoveredMonth, setHoveredMonth] = useState(null);

  // Interactive Calendar State in Dashboard (default to today)
  const todayDateStr = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  const [calendarMonth, setCalendarMonth] = useState(() => new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(() => new Date().getFullYear());
  const [isCalendarMonthPickerOpen, setIsCalendarMonthPickerOpen] = useState(false);
  const calendarMonthPickerRef = useRef(null);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  });

  // Live Sync states
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [syncToast, setSyncToast] = useState(null);

  // Live Sync function: directly queries Google Sheets with fallback to /api/sync
  const triggerLiveSync = useCallback(async (isManual = false) => {
    setIsSyncing(true);
    let success = false;
    let actCount = 0;

    try {
      // 1. Direct fetch from Google Sheet (works on GitHub Pages & Localhost)
      const liveActivities = await fetchLiveActivities();
      if (Array.isArray(liveActivities) && liveActivities.length > 0) {
        setActivities(liveActivities);
        actCount = liveActivities.length;
        success = true;
      }
    } catch (directErr) {
      console.warn('Direct Google Sheet fetch failed, trying local middleware fallback...', directErr);
      // 2. Fallback to /api/sync if on local dev server
      try {
        const res = await fetch('/api/sync', { cache: 'no-store' });
        const result = await res.json();
        if (result.success && Array.isArray(result.data) && result.data.length > 0) {
          setActivities(result.data);
          actCount = result.data.length;
          success = true;
        }
      } catch (localErr) {
        console.warn('Local sync fallback failed:', localErr);
      }
    }

    // Also update news in background
    try {
      const liveNews2026 = await fetchLiveNews();
      if (Array.isArray(liveNews2026) && liveNews2026.length > 0) {
        setNews(prev => {
          const non2026 = prev.filter(n => n.tahun !== '2026');
          return [...liveNews2026, ...non2026];
        });
      }
    } catch {
      // Optional news sync failure is non-fatal
    }

    setIsSyncing(false);

    if (success) {
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} WIB`;
      setLastSyncTime(timeStr);

      if (isManual) {
        setSyncToast({
          type: 'success',
          message: `Live Sync berhasil! ${actCount} kegiatan terdata langsung dari Google Sheet.`
        });
        setTimeout(() => setSyncToast(null), 4000);
      }
    } else if (isManual) {
      setSyncToast({
        type: 'error',
        message: 'Tidak dapat terhubung ke Google Sheet saat ini. Menampilkan data tersimpan.'
      });
      setTimeout(() => setSyncToast(null), 4000);
    }
  }, []);

  // Run live sync immediately on mount, on tab visibility change, and periodically every 45s
  useEffect(() => {
    triggerLiveSync(false);
    const interval = setInterval(() => triggerLiveSync(false), 45000);
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        triggerLiveSync(false);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [triggerLiveSync]);

  // Close all popovers and dropdowns whenever currentMenu changes to prevent stuck states
  useEffect(() => {
    setIsDropdownOpen(false);
    setIsMonthPickerOpen(false);
    setIsNewsStatusPickerOpen(false);
    setIsVideoStatusPickerOpen(false);
    setIsProvincePickerOpen(false);
    setIsOfficerPickerOpen(false);
    setIsNewsSortPickerOpen(false);
    setIsCalendarMonthPickerOpen(false);
  }, [currentMenu]);

  // Navigate menu helper that immediately closes dropdown and transitions page non-blockingly
  const navigateMenu = (menu) => {
    setIsDropdownOpen(false);
    setIsMonthPickerOpen(false);
    setIsNewsStatusPickerOpen(false);
    setIsVideoStatusPickerOpen(false);
    setIsProvincePickerOpen(false);
    setIsOfficerPickerOpen(false);
    setIsNewsSortPickerOpen(false);
    setIsCalendarMonthPickerOpen(false);
    setMenuHistory(prev => (prev[prev.length - 1] === menu ? prev : [...prev, menu]));
    startTransition(() => {
      setCurrentMenu(menu);
    });
  };

  // Functional Back Handler
  const goBack = useCallback(() => {
    if (selectedDetailItem) {
      setSelectedDetailItem(null);
      return;
    }
    if (selectedNewsDetail) {
      setSelectedNewsDetail(null);
      return;
    }
    if (menuHistory.length > 1) {
      const newHistory = [...menuHistory];
      newHistory.pop(); // Pop current
      const prev = newHistory[newHistory.length - 1] || 'search';
      setMenuHistory(newHistory);
      startTransition(() => {
        setCurrentMenu(prev);
      });
    } else {
      startTransition(() => {
        setCurrentMenu('search');
      });
    }
  }, [selectedDetailItem, selectedNewsDetail, menuHistory]);

  // Close dropdowns on outside click or touch
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
      if (monthPickerRef.current && !monthPickerRef.current.contains(event.target)) {
        setIsMonthPickerOpen(false);
      }
      if (newsStatusPickerRef.current && !newsStatusPickerRef.current.contains(event.target)) {
        setIsNewsStatusPickerOpen(false);
      }
      if (videoStatusPickerRef.current && !videoStatusPickerRef.current.contains(event.target)) {
        setIsVideoStatusPickerOpen(false);
      }
      if (provincePickerRef.current && !provincePickerRef.current.contains(event.target)) {
        setIsProvincePickerOpen(false);
      }
      if (officerPickerRef.current && !officerPickerRef.current.contains(event.target)) {
        setIsOfficerPickerOpen(false);
      }
      if (sortPickerRef.current && !sortPickerRef.current.contains(event.target)) {
        setIsSortPickerOpen(false);
      }
      if (newsSortPickerRef.current && !newsSortPickerRef.current.contains(event.target)) {
        setIsNewsSortPickerOpen(false);
      }
      if (calendarMonthPickerRef.current && !calendarMonthPickerRef.current.contains(event.target)) {
        setIsCalendarMonthPickerOpen(false);
      }
    }
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setSelectedDetailItem(null);
        setSelectedNewsDetail(null);
        setIsDropdownOpen(false);
        setIsMonthPickerOpen(false);
        setIsNewsStatusPickerOpen(false);
        setIsVideoStatusPickerOpen(false);
        setIsProvincePickerOpen(false);
        setIsOfficerPickerOpen(false);
        setIsSortPickerOpen(false);
        setIsNewsSortPickerOpen(false);
        setIsCalendarMonthPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside, { passive: true });
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // R-32: Auto-focus first interactive element when drawer dialog opens
  useEffect(() => {
    if (selectedDetailItem || selectedNewsDetail) {
      const timer = setTimeout(() => {
        const dialog = document.querySelector('[role="dialog"]');
        if (dialog) {
          const firstBtn = dialog.querySelector('button');
          firstBtn?.focus();
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [selectedDetailItem, selectedNewsDetail]);

  // Helper to format nomor without .0
  const cleanNomor = (nomor) => {
    if (!nomor) return '';
    return String(nomor).replace(/\.0$/, '');
  };

  // Helper for initials
  const getInitials = (name) => {
    if (!name) return '??';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  // Officer Leaderboard calculation & peak months
  const officerStats = useMemo(() => {
    const counts = {};
    activities.forEach(item => {
      item.petugas.forEach(p => {
        const name = p.trim();
        if (!name || name === '-') return;
        counts[name] = (counts[name] || 0) + 1;
      });
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [activities]);

  const maxOfficerCount = useMemo(() => {
    return officerStats.length > 0 ? officerStats[0].count : 1;
  }, [officerStats]);

  // Officer peak month calculation
  const officerPeakMonths = useMemo(() => {
    const map = {};
    activities.forEach(item => {
      item.petugas.forEach(p => {
        const name = p.trim();
        if (!name || name === '-') return;
        if (!map[name]) map[name] = {};
        map[name][item.bulan] = (map[name][item.bulan] || 0) + 1;
      });
    });
    const peaks = {};
    Object.entries(map).forEach(([name, mCounts]) => {
      let topMonth = 'Juli';
      let topCount = 0;
      Object.entries(mCounts).forEach(([m, c]) => {
        if (c > topCount) {
          topCount = c;
          topMonth = m;
        }
      });
      peaks[name] = topMonth;
    });
    return peaks;
  }, [activities]);

  // Unique lists for dropdowns in Rekapitulasi
  const provinces = useMemo(() => {
    const set = new Set();
    activities.forEach(a => {
      if (a.provinsi && a.provinsi.trim()) {
        set.add(a.provinsi.trim());
      }
    });
    return Array.from(set).sort();
  }, [activities]);

  const provinceCounts = useMemo(() => {
    const map = {};
    activities.forEach(a => {
      const p = a.provinsi?.trim();
      if (p) {
        map[p] = (map[p] || 0) + 1;
      }
    });
    return map;
  }, [activities]);

  const filteredProvinces = useMemo(() => {
    if (!provinceSearch.trim()) return provinces;
    const q = provinceSearch.toLowerCase().trim();
    return provinces.filter(p => p.toLowerCase().includes(q));
  }, [provinces, provinceSearch]);

  const activeMonths = useMemo(() => {
    const present = new Set(activities.map(a => a.bulan));
    return MONTH_ORDER.filter(m => present.has(m));
  }, [activities]);

  // Month counts for the multi-select picker & Dashboard chart
  const monthCounts = useMemo(() => {
    const map = {};
    activities.forEach(a => {
      if (a.bulan) {
        map[a.bulan] = (map[a.bulan] || 0) + 1;
      }
    });
    return map;
  }, [activities]);

  const maxMonthCount = useMemo(() => {
    const counts = Object.values(monthCounts);
    return counts.length > 0 ? Math.max(...counts) : 1;
  }, [monthCounts]);

  // Find peak month
  const peakMonth = useMemo(() => {
    let topM = 'Maret';
    let topC = 0;
    Object.entries(monthCounts).forEach(([m, c]) => {
      if (c > topC) {
        topC = c;
        topM = m;
      }
    });
    return { name: topM, count: topC };
  }, [monthCounts]);

  // Month multi-select toggler
  const toggleMonth = (month) => {
    setSelectedMonths(prev => {
      if (prev.includes(month)) {
        return prev.filter(m => m !== month);
      } else {
        return [...prev, month];
      }
    });
  };

  const selectQuarter = (quarterMonths) => {
    setSelectedMonths(quarterMonths);
  };

  // Officer multi-select toggler
  const toggleOfficer = (name) => {
    setSelectedOfficers(prev => {
      if (prev.includes(name)) {
        return prev.filter(o => o !== name);
      } else {
        return [...prev, name];
      }
    });
  };

  // Reset all filters in Rekapitulasi
  const resetRekapFilters = () => {
    setRekapSearch('');
    setSelectedMonths([]);
    setSelectedNewsStatus('all');
    setSelectedVideoStatus('all');
    setSelectedProvince('all');
    setSelectedOfficers([]);
    setProvinceSearch('');
    setRekapSort({ field: 'nomor', direction: 'asc' });
    setIsMonthPickerOpen(false);
    setIsNewsStatusPickerOpen(false);
    setIsVideoStatusPickerOpen(false);
    setIsProvincePickerOpen(false);
    setIsOfficerPickerOpen(false);
    setIsSortPickerOpen(false);
  };

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (rekapSearch.trim()) count++;
    if (selectedMonths.length > 0) count++;
    if (selectedNewsStatus !== 'all') count++;
    if (selectedVideoStatus !== 'all') count++;
    if (selectedProvince !== 'all') count++;
    if (selectedOfficers.length > 0) count++;
    if (rekapSort.field !== 'nomor' || rekapSort.direction !== 'asc') count++;
    return count;
  }, [rekapSearch, selectedMonths, selectedNewsStatus, selectedVideoStatus, selectedProvince, selectedOfficers, rekapSort]);

  // Results for "Pencarian Kegiatan" (1-column cards)
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return activities.filter(item => {
      const matchTitle = item.kegiatan.toLowerCase().includes(query);
      const matchLoc = (item.lokasi || '').toLowerCase().includes(query);
      const matchOfficers = item.petugas.some(p => p.toLowerCase().includes(query));
      const matchNews = (item.judul_berita || '').toLowerCase().includes(query);
      const matchNomor = cleanNomor(item.nomor) === query.trim();
      return matchTitle || matchLoc || matchOfficers || matchNews || matchNomor;
    });
  }, [activities, searchQuery]);

  // Filtered results for "Rekapitulasi Kegiatan" (Table)
  const rekapResults = useMemo(() => {
    return activities.filter(item => {
      if (rekapSearch.trim()) {
        const query = rekapSearch.toLowerCase();
        const matchTitle = item.kegiatan.toLowerCase().includes(query);
        const matchLoc = (item.lokasi || '').toLowerCase().includes(query);
        const matchOfficers = item.petugas.some(p => p.toLowerCase().includes(query));
        const matchNews = (item.judul_berita || '').toLowerCase().includes(query);
        const matchNomor = cleanNomor(item.nomor) === query.trim();
        if (!matchTitle && !matchLoc && !matchOfficers && !matchNews && !matchNomor) return false;
      }

      // Multi-select month filter
      if (selectedMonths.length > 0 && !selectedMonths.includes(item.bulan)) {
        return false;
      }

      if (selectedNewsStatus === 'with_news' && !item.ada_berita) return false;
      if (selectedNewsStatus === 'no_news' && item.ada_berita) return false;
      if (selectedVideoStatus === 'with_video' && !item.ada_video) return false;
      if (selectedVideoStatus === 'no_video' && item.ada_video) return false;
      if (selectedProvince !== 'all' && item.provinsi !== selectedProvince) return false;

      // Multi-select officer filter: AND logic (harus bertugas bersama)
      if (selectedOfficers.length > 0 && !selectedOfficers.every(officer => item.petugas.includes(officer))) {
        return false;
      }

      return true;
    });
  }, [
    activities,
    rekapSearch,
    selectedMonths,
    selectedNewsStatus,
    selectedVideoStatus,
    selectedProvince,
    selectedOfficers
  ]);

  // Sort Options for Rekapitulasi Table
  const SORT_OPTIONS = [
    { id: 'nomor-asc', field: 'nomor', direction: 'asc', label: 'Nomor (1 → Terakhir)' },
    { id: 'nomor-desc', field: 'nomor', direction: 'desc', label: 'Nomor (Terakhir → 1)' },
    { id: 'tanggal-desc', field: 'tanggal', direction: 'desc', label: 'Tanggal (Terbaru → Terlama)' },
    { id: 'tanggal-asc', field: 'tanggal', direction: 'asc', label: 'Tanggal (Terlama → Terbaru)' },
    { id: 'kegiatan-asc', field: 'kegiatan', direction: 'asc', label: 'Nama Kegiatan (A → Z)' },
    { id: 'kegiatan-desc', field: 'kegiatan', direction: 'desc', label: 'Nama Kegiatan (Z → A)' },
    { id: 'lokasi-asc', field: 'lokasi', direction: 'asc', label: 'Lokasi (A → Z)' },
    { id: 'petugas-asc', field: 'petugas', direction: 'asc', label: 'Petugas (A → Z)' },
    { id: 'berita-desc', field: 'berita', direction: 'desc', label: 'Status Berita (Ada Dahulu)' },
    { id: 'video-desc', field: 'video', direction: 'desc', label: 'Status Video (Ada Dahulu)' },
  ];

  const handleToggleSort = (field) => {
    setRekapSort(prev => {
      if (prev.field === field) {
        return { field, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      const defaultDesc = ['tanggal', 'berita', 'video'].includes(field);
      return { field, direction: defaultDesc ? 'desc' : 'asc' };
    });
  };

  const currentSortLabel = useMemo(() => {
    const found = SORT_OPTIONS.find(opt => opt.field === rekapSort.field && opt.direction === rekapSort.direction);
    return found ? found.label : `${rekapSort.field} (${rekapSort.direction})`;
  }, [rekapSort]);

  // Sorted results for "Rekapitulasi Kegiatan" (Table)
  const sortedRekapResults = useMemo(() => {
    const list = [...rekapResults];
    const { field, direction } = rekapSort;
    if (!field) return list;

    const multiplier = direction === 'asc' ? 1 : -1;

    return list.sort((a, b) => {
      if (field === 'nomor') {
        const numA = parseInt(cleanNomor(a.nomor), 10) || 0;
        const numB = parseInt(cleanNomor(b.nomor), 10) || 0;
        return (numA - numB) * multiplier;
      }
      if (field === 'tanggal') {
        const dateA = a.tanggal || '';
        const dateB = b.tanggal || '';
        const diff = dateA.localeCompare(dateB);
        if (diff !== 0) return diff * multiplier;
        const numA = parseInt(cleanNomor(a.nomor), 10) || 0;
        const numB = parseInt(cleanNomor(b.nomor), 10) || 0;
        return (numA - numB) * multiplier;
      }
      if (field === 'kegiatan') {
        const strA = (a.kegiatan || '').toLowerCase();
        const strB = (b.kegiatan || '').toLowerCase();
        return strA.localeCompare(strB, 'id') * multiplier;
      }
      if (field === 'lokasi') {
        const strA = (a.lokasi || '').toLowerCase();
        const strB = (b.lokasi || '').toLowerCase();
        return strA.localeCompare(strB, 'id') * multiplier;
      }
      if (field === 'petugas') {
        const strA = (a.petugas[0] || '').toLowerCase();
        const strB = (b.petugas[0] || '').toLowerCase();
        return strA.localeCompare(strB, 'id') * multiplier;
      }
      if (field === 'berita') {
        const scoreA = a.ada_berita && a.link_berita ? 2 : a.ada_berita ? 1 : 0;
        const scoreB = b.ada_berita && b.link_berita ? 2 : b.ada_berita ? 1 : 0;
        if (scoreA !== scoreB) return (scoreA - scoreB) * multiplier;
        const numA = parseInt(cleanNomor(a.nomor), 10) || 0;
        const numB = parseInt(cleanNomor(b.nomor), 10) || 0;
        return (numA - numB) * multiplier;
      }
      if (field === 'video') {
        const scoreA = (a.link_videos && a.link_videos.length > 0) || a.link_video ? 2 : a.ada_video ? 1 : 0;
        const scoreB = (b.link_videos && b.link_videos.length > 0) || b.link_video ? 2 : b.ada_video ? 1 : 0;
        if (scoreA !== scoreB) return (scoreA - scoreB) * multiplier;
        const numA = parseInt(cleanNomor(a.nomor), 10) || 0;
        const numB = parseInt(cleanNomor(b.nomor), 10) || 0;
        return (numA - numB) * multiplier;
      }
      return 0;
    });
  }, [rekapResults, rekapSort]);

  // Copy WhatsApp Formatted Report
  const copyReport = (item) => {
    let videoSection = '🎬 *Publikasi Video:* Belum ada\n';
    if (item.link_videos && item.link_videos.length > 1) {
      videoSection = `🎬 *Publikasi Video:*\n` + item.link_videos.map((v, i) => `   ${i + 1}. ${v}`).join('\n') + '\n';
    } else if (item.link_video || (item.link_videos && item.link_videos.length > 0)) {
      videoSection = `🎬 *Publikasi Video:* ${item.link_video || item.link_videos[0]}\n`;
    }

    const waText = `📢 *LAPORAN PELIPUTAN PIMPINAN KEMENTERIAN PKP*\n\n` +
      `📅 *Tanggal:* ${item.tanggal_formatted || item.tanggal}\n` +
      `📍 *Lokasi:* ${item.lokasi || '-'}\n` +
      `📌 *Kegiatan:* ${item.kegiatan}\n` +
      `👥 *Petugas:* ${item.petugas.join(', ') || item.petugas_raw || '-'}\n` +
      (item.link_berita ? `📰 *Publikasi Berita:* ${item.link_berita}\n` : `📰 *Publikasi Berita:* Belum ada\n`) +
      videoSection +
      (item.judul_berita ? `📑 *Judul Berita:* ${item.judul_berita}\n` : '');

    navigator.clipboard.writeText(waText);
    setCopyStatus(prev => ({ ...prev, [item.id]: true }));
    setTimeout(() => {
      setCopyStatus(prev => ({ ...prev, [item.id]: false }));
    }, 2500);
  };

  // Export table data to CSV
  const exportCSV = () => {
    const headers = ['Nomor', 'Tanggal', 'Kegiatan', 'Lokasi', 'Provinsi', 'Petugas', 'Status Berita', 'Judul Berita', 'Link Berita', 'Status Video', 'Link Video'];
    const rows = sortedRekapResults.map(a => [
      cleanNomor(a.nomor),
      `"${a.tanggal_formatted || a.tanggal}"`,
      `"${(a.kegiatan || '').replace(/"/g, '""')}"`,
      `"${(a.lokasi || '').replace(/"/g, '""')}"`,
      `"${(a.provinsi || '').replace(/"/g, '""')}"`,
      `"${a.petugas.join(', ')}"`,
      a.ada_berita ? '"Tercantum"' : '"Tidak ada"',
      `"${(a.judul_berita || '').replace(/"/g, '""')}"`,
      `"${a.link_berita || ''}"`,
      a.ada_video ? '"Tercantum"' : '"Tidak ada"',
      `"${(a.link_videos && a.link_videos.length > 0 ? a.link_videos.join(' , ') : (a.link_video || ''))}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `rekap_peliputan_pkp_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // News WA Copy Helper
  const copyNewsWA = (item) => {
    const waText = 
      `📰 *RILIS BERITA KEMENTERIAN PKP*\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `📌 *Judul:* ${item.judul}\n` +
      `📅 *Tanggal:* ${item.tanggal_formatted}\n` +
      `📍 *Lokasi:* ${item.lokasi || 'Jakarta Pusat'}\n` +
      `👁️ *Pembaca:* ${item.pembaca ? item.pembaca.toLocaleString('id-ID') : '-'}\n\n` +
      (item.ringkasan ? `📝 *Ringkasan:*\n${item.ringkasan}\n\n` : '') +
      `🔗 *Tautan Resmi:*\n${item.link}`;

    navigator.clipboard.writeText(waText);
    setNewsCopyStatus(prev => ({ ...prev, [item.id]: true }));
    setTimeout(() => {
      setNewsCopyStatus(prev => ({ ...prev, [item.id]: false }));
    }, 2500);
  };

  // News calculations & filtering
  const newsYearCounts = useMemo(() => {
    const counts = { all: news.length, '2026': 0, '2025': 0, '2024': 0 };
    news.forEach(item => {
      if (counts[item.tahun] !== undefined) {
        counts[item.tahun]++;
      }
    });
    return counts;
  }, [news]);

  const filteredNews = useMemo(() => {
    let result = news;

    // Filter by year
    if (selectedNewsYear !== 'all') {
      result = result.filter(n => n.tahun === selectedNewsYear);
    }

    // Filter by search query
    if (newsSearch.trim()) {
      const q = newsSearch.toLowerCase();
      result = result.filter(n => 
        (n.judul && n.judul.toLowerCase().includes(q)) ||
        (n.lokasi && n.lokasi.toLowerCase().includes(q)) ||
        (n.ringkasan && n.ringkasan.toLowerCase().includes(q)) ||
        (n.isi_lengkap && n.isi_lengkap.toLowerCase().includes(q))
      );
    }

    // Sort
    result = [...result].sort((a, b) => {
      if (newsSort === 'popular') {
        return (b.pembaca || 0) - (a.pembaca || 0);
      }
      if (newsSort === 'oldest') {
        return (a.tanggal || '').localeCompare(b.tanggal || '') || (a.id - b.id);
      }
      // default: newest
      return (b.tanggal || '').localeCompare(a.tanggal || '') || (b.id - a.id);
    });

    return result;
  }, [news, selectedNewsYear, newsSearch, newsSort]);

  // Statistics for the filtered news
  const newsStats = useMemo(() => {
    const totalCount = filteredNews.length;
    let totalReaders = 0;
    let topArticle = null;
    let maxReaders = -1;

    filteredNews.forEach(item => {
      const p = item.pembaca || 0;
      totalReaders += p;
      if (p > maxReaders) {
        maxReaders = p;
        topArticle = item;
      }
    });

    const avgReaders = totalCount > 0 ? Math.round(totalReaders / totalCount) : 0;

    return {
      totalCount,
      totalReaders,
      avgReaders,
      topArticle
    };
  }, [filteredNews]);

  // Paginated/limited view
  const displayedNews = useMemo(() => {
    return filteredNews.slice(0, newsLimit);
  }, [filteredNews, newsLimit]);

  const totalBerita = useMemo(() => activities.filter(a => a.ada_berita).length, [activities]);
  const totalVideo = useMemo(() => activities.filter(a => a.ada_video).length, [activities]);
  const percentBerita = activities.length > 0 ? Math.round((totalBerita / activities.length) * 100) : 0;
  const percentVideo = activities.length > 0 ? Math.round((totalVideo / activities.length) * 100) : 0;

  // Activities grouped by date (YYYY-MM-DD) for interactive Calendar
  const activitiesByDate = useMemo(() => {
    const map = {};
    activities.forEach(item => {
      if (item.tanggal) {
        if (!map[item.tanggal]) map[item.tanggal] = [];
        map[item.tanggal].push(item);
      }
    });
    return map;
  }, [activities]);

  // Calendar days generation for calendarMonth & calendarYear
  const calendarDaysMatrix = useMemo(() => {
    const firstDay = new Date(calendarYear, calendarMonth, 1).getDay(); // 0 is Sun
    const totalDays = new Date(calendarYear, calendarMonth + 1, 0).getDate();
    
    // Adjust so week starts on Monday (0=Mon, 6=Sun)
    const startOffset = (firstDay + 6) % 7;
    
    const days = [];
    for (let i = 0; i < startOffset; i++) {
      days.push(null);
    }
    for (let d = 1; d <= totalDays; d++) {
      const dayStr = String(d).padStart(2, '0');
      const mStr = String(calendarMonth + 1).padStart(2, '0');
      const dateKey = `${calendarYear}-${mStr}-${dayStr}`;
      days.push({
        dayNumber: d,
        dateKey,
        items: activitiesByDate[dateKey] || []
      });
    }
    // Pad to exactly 42 slots (6 full weeks of 7 days) to lock the calendar height across all months
    while (days.length < 42) {
      days.push(null);
    }
    return days;
  }, [calendarYear, calendarMonth, activitiesByDate]);

  // Total activities in current viewed calendar month
  const totalActivitiesInCurrentCalendarMonth = useMemo(() => {
    const currentMonthName = MONTH_ORDER[calendarMonth];
    return monthCounts[currentMonthName] || 0;
  }, [calendarMonth, monthCounts]);

  // Selected date activities
  const selectedDateActivities = useMemo(() => {
    return activitiesByDate[selectedCalendarDate] || [];
  }, [activitiesByDate, selectedCalendarDate]);

  // Activities sorted so newest/latest appears first
  const recentActivities = useMemo(() => {
    return [...activities].reverse().slice(0, 5);
  }, [activities]);

  return (
    <div className="min-h-screen text-slate-800 flex flex-col font-sans antialiased">
      
      {/* Floating Live Sync Notification Toast */}
      {syncToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 popover-motion">
          <div className={`flex items-center gap-2.5 px-4 py-2 border text-xs font-mono ${
            syncToast.type === 'success'
              ? 'bg-[#0A0A0A] text-[#FAFAFA] border-[#0A0A0A]'
              : 'bg-[#DC2626] text-[#FAFAFA] border-[#DC2626]'
          }`}>
            <span className={`w-2 h-2 shrink-0 ${syncToast.type === 'success' ? 'bg-[#16A34A]' : 'bg-white'}`} />
            <span>{syncToast.message}</span>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TOP NAVBAR (IFRALDAS CLEAN MODERN BAR)                   */}
      {/* ======================================================== */}
      <header className="sticky top-0 z-40 px-4 sm:px-8 py-3 bg-white/95 backdrop-blur-xs border-b border-[#EFF1F3] shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 sm:gap-6">
          
          {/* Brand Identity */}
          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
            <button 
              type="button"
              onClick={() => navigateMenu('search')}
              className="flex items-center gap-3 text-left select-none cursor-pointer focus-visible:outline-2 focus-visible:outline-[#01B6BC] rounded-xl p-1 -m-1"
              aria-label="Kembali ke Beranda Pencarian Kegiatan"
            >
              <img
                src={pkpLogo}
                alt="Logo Kementerian Perumahan dan Kawasan Permukiman RI"
                className="w-8 h-8 object-contain shrink-0"
              />
              <div>
                <span className="font-heading font-extrabold text-[#2B2D42] text-base sm:text-lg tracking-tight block">
                  Archive<span className="text-[#01B6BC]">Peliputan</span>
                </span>
                <p className="text-[10px] text-[#9A9BA9] tracking-wider uppercase font-medium hidden md:block">
                  Biro Komunikasi Publik PKP
                </p>
              </div>
            </button>

            <div className="hidden md:flex items-center gap-2">
              <span className="hidden lg:inline-flex items-center px-2.5 py-0.5 text-[11px] font-bold text-[#019296] bg-[#E6F8F9] rounded-full border border-[#CCF0F2]">
                {activities.length} KEGIATAN
              </span>

              {/* Direct Google Sheets Live Sync Button (iFraldas Outline Button) */}
              <button
                type="button"
                onClick={() => triggerLiveSync(true)}
                disabled={isSyncing}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1 text-xs font-semibold rounded-full border transition-all cursor-pointer select-none ${
                  isSyncing
                    ? 'bg-[#EFF1F3] text-[#9A9BA9] border-[#D7D7DD]'
                    : 'bg-white hover:bg-[#E6F8F9] text-[#019296] border-[#01B6BC] shadow-2xs hover:shadow-xs'
                }`}
                title={`Live Sync Google Sheet.${lastSyncTime ? ` Terakhir: ${lastSyncTime}.` : ''} Klik untuk sinkronkan data.`}
              >
                <RefreshCw className={`w-3 h-3 shrink-0 ${isSyncing ? 'animate-spin' : ''}`} />
                <span className="hidden xl:inline">{isSyncing ? 'SINKRON...' : 'LIVE SYNC'}</span>
              </button>
            </div>
          </div>

          {/* Top Menu Navigation (iFraldas Pill Segmented Control) */}
          <nav className="flex items-center bg-[#F7F8F9] border border-[#EFF1F3] p-1 rounded-full shrink-0 shadow-2xs">
            
            {/* 1. Pencarian */}
            <button
              type="button"
              onClick={() => navigateMenu('search')}
              className={`inline-flex items-center justify-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-full select-none whitespace-nowrap transition-all duration-200 cursor-pointer ${
                currentMenu === 'search'
                  ? 'bg-[#01B6BC] text-white shadow-xs'
                  : 'text-[#9A9BA9] hover:text-[#2B2D42] hover:bg-white/80'
              }`}
            >
              <Search className="w-3.5 h-3.5 shrink-0" />
              <span>Pencarian</span>
            </button>

            {/* 2. Dashboard */}
            <button
              type="button"
              onClick={() => navigateMenu('dashboard')}
              className={`inline-flex items-center justify-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-full select-none whitespace-nowrap transition-all duration-200 cursor-pointer ${
                currentMenu === 'dashboard'
                  ? 'bg-[#01B6BC] text-white shadow-xs'
                  : 'text-[#9A9BA9] hover:text-[#2B2D42] hover:bg-white/80'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5 shrink-0" />
              <span>Dashboard</span>
            </button>

            {/* 3. Menu Lanjutan Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsDropdownOpen(prev => !prev)}
                className={`inline-flex items-center justify-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-full select-none whitespace-nowrap transition-all duration-200 cursor-pointer ${
                  currentMenu !== 'search' && currentMenu !== 'dashboard'
                    ? 'bg-[#01B6BC] text-white shadow-xs'
                    : 'text-[#9A9BA9] hover:text-[#2B2D42] hover:bg-white/80'
                }`}
              >
                <Layers className="w-3.5 h-3.5 shrink-0" />
                <span>Menu Lanjutan</span>
                <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* iFraldas Dropdown Popover */}
              {isDropdownOpen && (
                <div className="absolute right-0 mt-1.5 w-64 bg-white rounded-2xl shadow-lg border border-[#EFF1F3] p-1.5 z-50 popover-motion origin-top-right">
                  <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#9A9BA9]">
                    Modul Liputan
                  </div>

                  {/* a. Rekapitulasi Kegiatan */}
                  <button
                    type="button"
                    onClick={() => navigateMenu('rekapitulasi')}
                    className={`w-full px-3 py-2 rounded-xl text-left text-xs font-medium flex items-center justify-between cursor-pointer transition-colors ${
                      currentMenu === 'rekapitulasi'
                        ? 'bg-[#E6F8F9] text-[#019296] font-bold'
                        : 'text-[#363853] hover:bg-[#F7F8F9]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <FileText className="w-4 h-4 shrink-0 text-[#01B6BC]" />
                      <div>
                        <div className="font-bold">Rekapitulasi Kegiatan</div>
                        <div className="text-[10px] text-[#9A9BA9]">Tabel data interaktif & filter</div>
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-[#9A9BA9]" />
                  </button>

                  {/* b. Tim Peliputan */}
                  <button
                    type="button"
                    onClick={() => navigateMenu('tim')}
                    className={`w-full px-3 py-2 rounded-xl text-left text-xs font-medium flex items-center justify-between cursor-pointer transition-colors ${
                      currentMenu === 'tim'
                        ? 'bg-[#E6F8F9] text-[#019296] font-bold'
                        : 'text-[#363853] hover:bg-[#F7F8F9]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Users className="w-4 h-4 shrink-0 text-[#6F69D2]" />
                      <div>
                        <div className="font-bold">Tim Peliputan</div>
                        <div className="text-[10px] text-[#9A9BA9]">{officerStats.length} personil & penugasan</div>
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-[#9A9BA9]" />
                  </button>

                  {/* c. Berita */}
                  <button
                    type="button"
                    onClick={() => navigateMenu('berita')}
                    className={`w-full px-3 py-2 rounded-xl text-left text-xs font-medium flex items-center justify-between cursor-pointer transition-colors ${
                      currentMenu === 'berita'
                        ? 'bg-[#E6F8F9] text-[#019296] font-bold'
                        : 'text-[#363853] hover:bg-[#F7F8F9]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Newspaper className="w-4 h-4 shrink-0 text-[#FF8DA1]" />
                      <div>
                        <div className="font-bold">Berita Resmi</div>
                        <div className="text-[10px] text-[#9A9BA9]">Kliping & rilis resmi pkp.go.id</div>
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-[#9A9BA9]" />
                  </button>

                  {/* d. Laporan (Segera) */}
                  <button
                    type="button"
                    onClick={() => navigateMenu('laporan')}
                    className={`w-full px-3 py-2 rounded-xl text-left text-xs font-medium flex items-center justify-between cursor-pointer transition-colors ${
                      currentMenu === 'laporan'
                        ? 'bg-[#E6F8F9] text-[#019296] font-bold'
                        : 'text-[#363853] hover:bg-[#F7F8F9]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Wrench className="w-4 h-4 shrink-0 text-[#EFB100]" />
                      <div>
                        <div className="flex items-center gap-1.5 font-bold">
                          <span>Laporan</span>
                          <span className="text-[9px] font-bold bg-[#FFFBF0] border border-[#FFE49C] text-[#B88600] px-1.5 py-0.2 rounded-full">
                            SEGERA
                          </span>
                        </div>
                        <div className="text-[10px] text-[#9A9BA9]">Format rekap pimpinan</div>
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-[#9A9BA9]" />
                  </button>

                  <div className="my-1 border-t border-[#EFF1F3]" />

                  {/* d. Database Logbook (Google Sheet) */}
                  <a
                    href="https://docs.google.com/spreadsheets/d/16Q_Mrbs2oHPMv-xcCaB9zJ5_JMjAfr9F/edit?usp=sharing&ouid=110437050343134361164&rtpof=true&sd=true"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setIsDropdownOpen(false)}
                    className="w-full px-3 py-2 rounded-xl text-left text-xs font-medium flex items-center justify-between text-[#363853] hover:bg-[#F7F8F9] transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <FileSpreadsheet className="w-4 h-4 text-[#22C55E] shrink-0" />
                      <div>
                        <div className="font-bold">Database Logbook</div>
                        <div className="text-[10px] text-[#9A9BA9]">Spreadsheet logbook peliputan</div>
                      </div>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-[#9A9BA9] shrink-0" />
                  </a>

                  {/* e. Database Berita (Google Sheet) */}
                  <a
                    href="https://docs.google.com/spreadsheets/d/19BIJfZg3ZzV4uDEAbQg77LDBzQtxYr2O3BQbYmy5caU/edit?usp=sharing"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setIsDropdownOpen(false)}
                    className="w-full px-3 py-2 rounded-xl text-left text-xs font-medium flex items-center justify-between text-[#363853] hover:bg-[#F7F8F9] transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <FileSpreadsheet className="w-4 h-4 text-[#01B6BC] shrink-0" />
                      <div>
                        <div className="font-bold">Database Berita</div>
                        <div className="text-[10px] text-[#9A9BA9]">Spreadsheet arsip rilis berita</div>
                      </div>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-[#9A9BA9] shrink-0" />
                  </a>

                  {/* f. Dokumentasi (SharePoint) */}
                  <a
                    href="https://kemenpkp-my.sharepoint.com/:f:/g/personal/michael_simanjuntak_pkp_go_id/IgBnGmV91qZ8SIBsyncviMcnAXid1tndVpqlDekxtrBpaD0?e=t1CM9D"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setIsDropdownOpen(false)}
                    className="w-full px-3 py-2 rounded-xl text-left text-xs font-medium flex items-center justify-between text-[#363853] hover:bg-[#F7F8F9] transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <FolderArchive className="w-4 h-4 text-[#6F69D2] shrink-0" />
                      <div>
                        <div className="font-bold">Dokumentasi</div>
                        <div className="text-[10px] text-[#9A9BA9]">Folder arsip SharePoint</div>
                      </div>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-[#9A9BA9] shrink-0" />
                  </a>
                </div>
              )}
            </div>

          </nav>
        </div>
      </header>

      {/* ======================================================== */}
      {/* MAIN BODY CONTAINER                                      */}
      {/* ======================================================== */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-5 lg:px-6 py-3.5 space-y-3.5">
        
        {/* ======================================================== */}
        {/* VIEW 1: PENCARIAN KEGIATAN (IFRALDAS CLEAN FEED)         */}
        {/* ======================================================== */}
        {currentMenu === 'search' && (
          <div className="max-w-4xl mx-auto space-y-4 page-transition">
            
            {/* Search Box Card */}
            <div className="invo-card p-5 sm:p-6">
              <div className="mb-3">
                <h2 className="font-heading font-extrabold text-xl sm:text-2xl text-[#2B2D42] tracking-tight">
                  Pencarian Dokumentasi & Agenda
                </h2>
                <p className="text-xs sm:text-sm text-[#9A9BA9] mt-1">
                  Temukan rilis berita, video liputan, dan riwayat penugasan personil sepanjang tahun 2026.
                </p>
              </div>

              {/* Main Search Input */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-[#9A9BA9] pointer-events-none" aria-hidden="true" />
                <input
                  type="text"
                  autoFocus
                  aria-label="Cari kegiatan, rilis berita, atau petugas"
                  placeholder="Ketik topik, kota, atau nama petugas (Rusun, Singkawang, Ilham)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-11 pl-11 pr-10 bg-white hover:border-[#9A9BA9] focus:border-[#01B6BC] border border-[#D7D7DD] rounded-full text-[#363853] text-sm placeholder:text-[#9A9BA9] focus:outline-none focus:ring-3 focus:ring-[#01B6BC]/20 transition-all shadow-2xs"
                />
                {searchQuery && (
                  <button
                    type="button"
                    aria-label="Hapus kata kunci pencarian"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-[#9A9BA9] hover:text-[#2B2D42] transition-colors cursor-pointer touch-target"
                  >
                    <X className="w-4 h-4" aria-hidden="true" />
                  </button>
                )}
              </div>

              {/* Popular Search Chips (iFraldas Rounded Pills) */}
              <div className="flex items-center gap-1.5 flex-wrap mt-3.5 text-xs">
                <span className="text-[#9A9BA9] font-bold text-[11px] mr-1">Populer:</span>
                {['Rusun', 'BSPS', 'Singkawang', 'Jatiwangi', 'Michael', 'Ilham', 'Fitrah', 'Jakarta', 'Kunker'].map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setSearchQuery(tag)}
                    className="px-3 py-1 rounded-full border border-[#EFF1F3] bg-[#F7F8F9] hover:bg-[#E6F8F9] hover:border-[#CCF0F2] text-[#363853] hover:text-[#019296] text-xs font-semibold transition-all cursor-pointer shadow-2xs"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Results Feed OR 5 Latest Activities When Search is Empty */}
            {searchQuery.trim() ? (
              <div className="space-y-3">
                
                <div className="flex items-center justify-between px-1 text-xs text-[#9A9BA9] font-medium">
                  <p>
                    Ditemukan <span className="text-[#019296] font-bold">{searchResults.length}</span> kegiatan
                  </p>
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="text-[#019296] hover:underline font-bold cursor-pointer"
                  >
                    Reset Pencarian
                  </button>
                </div>

                {searchResults.length === 0 && (
                  <div className="invo-card p-10 text-center space-y-2 border border-dashed border-[#D7D7DD]">
                    <Search className="w-8 h-8 text-[#9A9BA9] mx-auto" aria-hidden="true" />
                    <h4 className="font-heading font-bold text-[#2B2D42] text-base">
                      Tidak ditemukan kegiatan yang cocok
                    </h4>
                    <p className="text-xs text-[#9A9BA9] max-w-sm mx-auto">
                      Coba gunakan kata kunci umum lainnya seperti nama daerah atau nama personil.
                    </p>
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#01B6BC] text-white hover:bg-[#019296] text-xs font-bold transition-all shadow-sm hover:shadow cursor-pointer"
                      >
                        Reset Kata Kunci
                      </button>
                    </div>
                  </div>
                )}

                {/* 1-Column Feed */}
                <div className="space-y-3">
                  {searchResults.map(item => (
                    <div
                      key={item.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedDetailItem(item)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelectedDetailItem(item);
                        }
                      }}
                      aria-label={`Detail kegiatan: ${item.kegiatan}`}
                      className="invo-card invo-card-hover p-4 sm:p-5 motion-card-enter cursor-pointer group transition-all focus-visible:outline-2 focus-visible:outline-[#01B6BC]"
                    >
                      {/* Top Row */}
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold px-2.5 py-0.5 bg-[#E6F8F9] text-[#019296] border border-[#CCF0F2] rounded-md text-xs">
                            #{cleanNomor(item.nomor)}
                          </span>
                          <span className="text-xs text-[#9A9BA9] font-medium flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-[#9A9BA9]" aria-hidden="true" />
                            {item.tanggal_formatted || item.tanggal}
                          </span>
                        </div>

                        {item.lokasi && (
                          <div className="flex items-center gap-1 text-[#363853] bg-[#F7F8F9] px-2.5 py-0.5 rounded-full border border-[#EFF1F3] text-xs font-medium">
                            <MapPin className="w-3 h-3 text-[#FF8DA1] shrink-0" aria-hidden="true" />
                            <span className="truncate max-w-[220px]">{item.lokasi}</span>
                          </div>
                        )}
                      </div>

                      {/* Title */}
                      <h3 className="font-heading font-bold text-base sm:text-lg text-[#2B2D42] leading-snug mb-2 group-hover:text-[#01B6BC] transition-colors">
                        {item.kegiatan}
                      </h3>

                      {/* News Quote (Editorial Border) */}
                      {item.judul_berita && (
                        <div className="mb-2.5 p-3 border-l-4 border-[#01B6BC] bg-[#E6F8F9]/50 rounded-r-xl text-xs space-y-1">
                          <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[11px] text-[#019296]">
                            <Newspaper className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Rilis Berita Resmi</span>
                          </div>
                          <p className="text-[#363853] leading-relaxed font-medium">{item.judul_berita}</p>
                        </div>
                      )}

                      {/* Officers */}
                      <div className="flex items-center gap-1.5 flex-wrap mb-3 text-xs">
                        <span className="text-[11px] font-bold text-[#9A9BA9] uppercase tracking-wider">Petugas:</span>
                        {item.petugas.length > 0 ? (
                          item.petugas.map((officer, idx) => (
                            <span
                              key={idx}
                              className="bg-[#F0EEF9] text-[#5953A8] border border-[#E2E1F6] px-2.5 py-0.5 rounded-full text-xs font-medium"
                            >
                              {officer}
                            </span>
                          ))
                        ) : (
                          <span className="text-[#9A9BA9] text-xs italic">Tidak tercatat</span>
                        )}
                      </div>

                      {/* Action Bar */}
                      <div className="pt-3 border-t border-[#EFF1F3] flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          {item.link_berita ? (
                            <a
                              href={item.link_berita}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full bg-[#E6F8F9] text-[#019296] hover:bg-[#CCF0F2] transition-colors"
                            >
                              <Newspaper className="w-3 h-3" aria-hidden="true" />
                              <span>pkp.go.id</span>
                              <ArrowUpRight className="w-3 h-3 opacity-60" aria-hidden="true" />
                            </a>
                          ) : (
                            <span className="text-xs text-[#9A9BA9] font-medium">
                              Belum ada rilis
                            </span>
                          )}

                          {item.link_videos && item.link_videos.length > 1 ? (
                            <div className="inline-flex items-center gap-1.5 flex-wrap" onClick={(e) => e.stopPropagation()}>
                              {item.link_videos.map((vUrl, idx) => (
                                <a
                                  key={idx}
                                  href={vUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full bg-[#F0EEF9] text-[#5953A8] hover:bg-[#D4D1F0] transition-colors"
                                  title={`Video ${idx + 1}: ${vUrl}`}
                                >
                                  <Video className="w-3 h-3" aria-hidden="true" />
                                  <span>Video {idx + 1}</span>
                                  <ArrowUpRight className="w-2.5 h-2.5 opacity-60" aria-hidden="true" />
                                </a>
                              ))}
                            </div>
                          ) : (item.link_video || (item.link_videos && item.link_videos.length > 0)) ? (
                            <a
                              href={item.link_video || item.link_videos[0]}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full bg-[#F0EEF9] text-[#5953A8] hover:bg-[#D4D1F0] transition-colors"
                            >
                              <Video className="w-3 h-3" aria-hidden="true" />
                              <span>Video</span>
                              <ArrowUpRight className="w-3 h-3 opacity-60" aria-hidden="true" />
                            </a>
                          ) : null}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            aria-label={`Salin format WhatsApp kegiatan nomor ${cleanNomor(item.nomor)}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              copyReport(item);
                            }}
                            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-full transition-all cursor-pointer shadow-2xs ${
                              copyStatus[item.id]
                                ? 'bg-[#22C55E] text-white shadow-xs'
                                : 'bg-[#01B6BC] hover:bg-[#019296] text-white shadow-xs hover:shadow'
                            }`}
                          >
                            {copyStatus[item.id] ? (
                              <>
                                <Check className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>Format WA Tersalin!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>Salin WA</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* When search input is empty: Show 5 Latest Activities */
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#01B6BC]" aria-hidden="true"></span>
                    <h3 className="font-heading font-extrabold text-sm sm:text-base text-[#2B2D42]">
                      5 Kegiatan Liputan Terbaru
                    </h3>
                  </div>
                  <span className="text-xs text-[#9A9BA9]">
                    Ketik di atas untuk mencari seluruh data
                  </span>
                </div>

                <div className="space-y-2.5">
                  {recentActivities.map(item => (
                    <div
                      key={item.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedDetailItem(item)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelectedDetailItem(item);
                        }
                      }}
                      aria-label={`Detail kegiatan terbaru: ${item.kegiatan}`}
                      className="invo-card invo-card-hover p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 motion-card-enter cursor-pointer group transition-all focus-visible:outline-2 focus-visible:outline-[#01B6BC]"
                    >
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-bold px-2 py-0.5 bg-[#E6F8F9] text-[#019296] border border-[#CCF0F2] rounded-md text-xs">
                            #{cleanNomor(item.nomor)}
                          </span>
                          <span className="text-xs text-[#9A9BA9] font-medium">
                            {item.tanggal_formatted || item.tanggal}
                          </span>
                          {item.lokasi && (
                            <span className="text-[#9A9BA9] truncate max-w-[200px] inline-flex items-center gap-1 text-xs font-medium">
                              • <MapPin className="w-3 h-3 text-[#FF8DA1] shrink-0" aria-hidden="true" />
                              <span>{item.lokasi}</span>
                            </span>
                          )}
                        </div>
                        <h4 className="font-heading font-bold text-[#2B2D42] text-sm sm:text-base leading-snug group-hover:text-[#01B6BC] transition-colors">
                          {item.kegiatan}
                        </h4>
                        <div className="text-xs text-[#9A9BA9]">
                          Petugas: <span className="text-[#363853] font-medium">{item.petugas.join(', ') || '-'}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <button
                          type="button"
                          aria-label={`Salin format WhatsApp kegiatan nomor ${cleanNomor(item.nomor)}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            copyReport(item);
                          }}
                          className={`p-2 rounded-full border transition-all cursor-pointer shadow-2xs ${
                            copyStatus[item.id]
                              ? 'bg-[#22C55E] text-white border-[#22C55E]'
                              : 'bg-white hover:bg-[#E6F8F9] hover:border-[#01B6BC] text-[#363853] hover:text-[#019296] border-[#D7D7DD]'
                          }`}
                          title="Salin Format WA"
                        >
                          {copyStatus[item.id] ? <Check className="w-4 h-4 text-white" aria-hidden="true" /> : <Copy className="w-4 h-4" aria-hidden="true" />}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW 2: DASHBOARD (IFRALDAS HARMONIOUS METRICS)          */}
        {/* ======================================================== */}
        {currentMenu === 'dashboard' && (
          <div className="space-y-4 page-transition">
            
            {/* Top Back Action Bar */}
            <div className="flex items-center justify-between pb-0.5">
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={goBack}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold text-[#363853] bg-white hover:bg-[#F7F8F9] border border-[#D7D7DD] hover:border-[#01B6BC] hover:text-[#019296] transition-all select-none cursor-pointer shadow-2xs"
                  title="Kembali ke Pencarian"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Kembali ke Pencarian</span>
                </button>
                <span className="text-xs font-bold text-[#9A9BA9] hidden sm:inline uppercase tracking-wider">
                  Dashboard Analisis & Ringkasan Peliputan 2026
                </span>
              </div>
            </div>

            {/* ROW 1: 3 COMPACT KPI CARDS (COL-SPAN-2) + KALENDER & AGENDA (COL-SPAN-10) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
              
              {/* Left Column (2 cols): iFraldas Metric Cards */}
              <div className="lg:col-span-2 flex flex-col justify-between gap-3">
                
                {/* 1. Total Kegiatan */}
                <div className="invo-card invo-card-hover p-4 flex-1 flex flex-col justify-between">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#9A9BA9] truncate">
                      Total Kegiatan
                    </span>
                    <PieChart className="w-4 h-4 text-[#01B6BC] shrink-0" aria-hidden="true" />
                  </div>

                  <div className="my-1">
                    <div className="text-3xl font-heading font-black text-[#2B2D42] tracking-tight">
                      {activities.length}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-2 border-t border-[#EFF1F3] text-[#9A9BA9]">
                    <span className="truncate">Tahun 2026</span>
                    <span className="font-bold text-[#019296] shrink-0">100%</span>
                  </div>
                </div>

                {/* 2. Publikasi Rilis Berita */}
                <div className="invo-card invo-card-hover p-4 flex-1 flex flex-col justify-between">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#9A9BA9] truncate">
                      Rilis Berita
                    </span>
                    <Newspaper className="w-4 h-4 text-[#6F69D2] shrink-0" aria-hidden="true" />
                  </div>

                  <div className="my-1">
                    <div className="text-3xl font-heading font-black text-[#6F69D2] tracking-tight">
                      {totalBerita}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-2 border-t border-[#EFF1F3]">
                    <span className="text-[#6F69D2] font-bold">
                      {percentBerita}% Liputan
                    </span>
                    <span className="text-[#9A9BA9] shrink-0 text-[11px]">pkp.go.id</span>
                  </div>
                </div>

                {/* 3. Publikasi Video */}
                <div className="invo-card invo-card-hover p-4 flex-1 flex flex-col justify-between">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#9A9BA9] truncate">
                      Publikasi Video
                    </span>
                    <Video className="w-4 h-4 text-[#FF8DA1] shrink-0" aria-hidden="true" />
                  </div>

                  <div className="my-1">
                    <div className="text-3xl font-heading font-black text-[#CC7081] tracking-tight">
                      {totalVideo}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-2 border-t border-[#EFF1F3]">
                    <span className="text-[#CC7081] font-bold">
                      {percentVideo}% Video
                    </span>
                    <span className="text-[#9A9BA9] shrink-0 text-[11px]">Dokumentasi</span>
                  </div>
                </div>

              </div>

              {/* Right Column (10 cols): iFraldas Harmonious Calendar & Agenda */}
              <div className="lg:col-span-10 invo-card p-5 sm:p-6 flex flex-col justify-between h-full lg:h-[540px]">
                
                {/* Header Kalender & Month Switcher */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-[#EFF1F3]">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#E6F8F9] text-[#019296] flex items-center justify-center shrink-0">
                      <CalendarDays className="w-4 h-4 text-[#019296]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-heading font-extrabold text-[#2B2D42] text-base sm:text-lg">
                          Kalender Aktivitas Liputan
                        </h3>
                        <span className="px-2.5 py-0.5 text-xs font-bold text-[#019296] border border-[#CCF0F2] bg-[#E6F8F9] rounded-full">
                          {totalActivitiesInCurrentCalendarMonth} Agenda di {MONTH_ORDER[calendarMonth]}
                        </span>
                      </div>
                      <p className="text-xs text-[#9A9BA9] mt-0.5">
                        Pilih tanggal pada grid kalender di sebelah kiri untuk melihat rincian agenda di sebelah kanan
                      </p>
                    </div>
                  </div>

                  {/* Month Switcher Controls & Today Shortcut */}
                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => {
                        const now = new Date();
                        setCalendarMonth(now.getMonth());
                        setCalendarYear(now.getFullYear());
                        const y = now.getFullYear();
                        const m = String(now.getMonth() + 1).padStart(2, '0');
                        const d = String(now.getDate()).padStart(2, '0');
                        setSelectedCalendarDate(`${y}-${m}-${d}`);
                      }}
                      className={`px-3.5 py-1 text-xs font-bold rounded-full border transition-all cursor-pointer ${
                        selectedCalendarDate === todayDateStr
                          ? 'bg-[#01B6BC] text-white border-[#01B6BC] shadow-2xs'
                          : 'bg-white hover:bg-[#E6F8F9] hover:border-[#01B6BC] text-[#363853] hover:text-[#019296] border-[#D7D7DD]'
                      }`}
                      title="Kembali ke tanggal hari ini"
                    >
                      HARI INI
                    </button>

                    {/* Fixed-width month switcher container */}
                    <div className="relative flex items-center bg-[#F7F8F9] border border-[#D7D7DD] rounded-full p-0.5 shrink-0 w-[215px] sm:w-[230px] justify-between" ref={calendarMonthPickerRef}>
                      <button
                        type="button"
                        onClick={() => setCalendarMonth(prev => (prev === 0 ? 11 : prev - 1))}
                        className="p-1.5 hover:bg-white rounded-full text-[#363853] hover:text-[#019296] transition-colors cursor-pointer shrink-0"
                        title="Bulan sebelumnya"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>

                      {/* Month Picker Trigger Button */}
                      <button
                        type="button"
                        onClick={() => setIsCalendarMonthPickerOpen(prev => !prev)}
                        className={`w-38 sm:w-42 flex-1 inline-flex items-center justify-center gap-1.5 px-2 py-1 text-xs font-bold rounded-full transition-all cursor-pointer select-none shrink-0 ${
                          isCalendarMonthPickerOpen
                            ? 'bg-[#01B6BC] text-white'
                            : 'bg-white hover:bg-[#E6F8F9] text-[#2B2D42] border border-[#EFF1F3]'
                        }`}
                        title="Klik untuk memilih bulan"
                      >
                        <Calendar className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate text-center">{MONTH_ORDER[calendarMonth]} {calendarYear}</span>
                        <ChevronDown className={`w-3 h-3 shrink-0 transition-transform duration-200 ${isCalendarMonthPickerOpen ? 'rotate-180' : ''}`} />
                      </button>

                      <button
                        type="button"
                        onClick={() => setCalendarMonth(prev => (prev === 11 ? 0 : prev + 1))}
                        className="p-1.5 hover:bg-white rounded-full text-[#363853] hover:text-[#019296] transition-colors cursor-pointer shrink-0"
                        title="Bulan berikutnya"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>

                      {/* Month Picker Popover Overlay */}
                      {isCalendarMonthPickerOpen && (
                        <div className="absolute right-0 top-full mt-1.5 w-64 sm:w-72 bg-white border border-[#EFF1F3] rounded-2xl p-3 z-40 shadow-lg popover-motion origin-top-right">
                          <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#EFF1F3]">
                            <div>
                              <span className="font-heading font-bold text-[#2B2D42] text-xs block uppercase">Pilih Bulan</span>
                              <span className="text-[10px] text-[#9A9BA9]">Tahun {calendarYear}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const now = new Date();
                                setCalendarMonth(now.getMonth());
                                setCalendarYear(now.getFullYear());
                                const y = now.getFullYear();
                                const m = String(now.getMonth() + 1).padStart(2, '0');
                                const d = String(now.getDate()).padStart(2, '0');
                                setSelectedCalendarDate(`${y}-${m}-${d}`);
                                setIsCalendarMonthPickerOpen(false);
                              }}
                              className="text-[11px] font-bold text-[#019296] hover:underline cursor-pointer"
                            >
                              Bulan Ini
                            </button>
                          </div>

                          {/* 12 Months Grid */}
                          <div className="grid grid-cols-3 gap-1.5">
                            {MONTH_ORDER.map((monthName, idx) => {
                              const isSelected = calendarMonth === idx;
                              const count = monthCounts[monthName] || 0;
                              return (
                                <button
                                  key={monthName}
                                  type="button"
                                  onClick={() => {
                                    setCalendarMonth(idx);
                                    const mStr = String(idx + 1).padStart(2, '0');
                                    setSelectedCalendarDate(`${calendarYear}-${mStr}-01`);
                                    setIsCalendarMonthPickerOpen(false);
                                  }}
                                  className={`p-2 rounded-xl text-left transition-all cursor-pointer flex flex-col justify-between border ${
                                    isSelected
                                      ? 'bg-[#01B6BC] text-white border-[#01B6BC] shadow-xs'
                                      : count > 0
                                      ? 'bg-[#E6F8F9]/40 hover:bg-[#E6F8F9] text-[#2B2D42] border-[#CCF0F2]'
                                      : 'bg-white hover:bg-[#F7F8F9] text-[#9A9BA9] border-[#EFF1F3]'
                                  }`}
                                >
                                  <div className="flex items-center justify-between w-full">
                                    <span className="text-xs font-bold">
                                      {monthName.slice(0, 3)}
                                    </span>
                                    {isSelected && <Check className="w-3 h-3 text-white" />}
                                  </div>
                                  <div className={`text-[10px] mt-1 font-medium ${
                                    isSelected
                                      ? 'text-white/80'
                                      : count > 0
                                      ? 'text-[#019296] font-bold'
                                      : 'text-[#9A9BA9]'
                                  }`}>
                                    {count > 0 ? `${count} agenda` : '0'}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* DUA KOLOM: KALENDER DI SEBELAH KIRI, AGENDA DI SEBELAH KANAN */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-5 flex-1 items-stretch min-h-0">
                  
                  {/* SISI KIRI (7-8 Kolom): Matriks Kalender Bulanan */}
                  <div className="md:col-span-7 xl:col-span-8 flex flex-col justify-between h-full">
                    
                    {/* Header Hari (Sen - Min) */}
                    <div className="grid grid-cols-7 gap-1 sm:gap-1.5 text-center text-xs font-bold uppercase tracking-wider text-[#9A9BA9] mb-2 shrink-0">
                      <span className="py-1 rounded-lg bg-[#F7F8F9] border border-[#EFF1F3]">Sen</span>
                      <span className="py-1 rounded-lg bg-[#F7F8F9] border border-[#EFF1F3]">Sel</span>
                      <span className="py-1 rounded-lg bg-[#F7F8F9] border border-[#EFF1F3]">Rab</span>
                      <span className="py-1 rounded-lg bg-[#F7F8F9] border border-[#EFF1F3]">Kam</span>
                      <span className="py-1 rounded-lg bg-[#F7F8F9] border border-[#EFF1F3]">Jum</span>
                      <span className="py-1 rounded-lg bg-[#F7F8F9] border border-[#EFF1F3]">Sab</span>
                      <span className="py-1 rounded-lg bg-[#F7F8F9] border border-[#EFF1F3]">Min</span>
                    </div>

                    {/* Matriks Tanggal (Locked 6 Rows Grid) */}
                    <div className="grid grid-cols-7 grid-rows-6 gap-1 sm:gap-1.5 h-[340px] sm:h-[350px]">
                      {calendarDaysMatrix.map((item, idx) => {
                        if (!item) {
                          return <div key={`empty-${idx}`} className="h-full bg-transparent border border-transparent" />;
                        }

                        const isSelected = selectedCalendarDate === item.dateKey;
                        const isToday = item.dateKey === todayDateStr;
                        const hasActivities = item.items.length > 0;
                        const count = item.items.length;

                        return (
                          <button
                            key={item.dateKey}
                            type="button"
                            onClick={() => setSelectedCalendarDate(item.dateKey)}
                            className={`h-full rounded-xl flex flex-col items-center justify-between p-1 text-xs transition-all relative cursor-pointer border ${
                              isSelected
                                ? 'bg-[#01B6BC] text-white border-[#01B6BC] shadow-md ring-2 ring-[#01B6BC]/30'
                                : isToday
                                ? 'bg-white text-[#019296] border-2 border-[#01B6BC] font-bold shadow-2xs'
                                : hasActivities
                                ? 'bg-[#E6F8F9]/50 hover:bg-[#E6F8F9] hover:border-[#80DBDD] text-[#2B2D42] border-[#CCF0F2]'
                                : 'bg-white hover:bg-[#F7F8F9] text-[#9A9BA9] border-[#EFF1F3]'
                            }`}
                          >
                            <span className="leading-none mt-0.5 text-xs font-bold">{item.dayNumber}</span>
                            {hasActivities && (
                              <div className={`flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                                isSelected
                                  ? 'bg-white/20 text-white'
                                  : 'bg-[#CCF0F2] text-[#016D71]'
                              }`}>
                                <span>{count}</span>
                              </div>
                            )}
                            {!hasActivities && <div className="h-0.5"></div>}
                          </button>
                        );
                      })}
                    </div>

                    <div className="pt-2 text-[11px] text-[#9A9BA9] flex items-center justify-between shrink-0">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#01B6BC] inline-block" aria-hidden="true"></span>
                        Angka menandakan jumlah agenda liputan pada tanggal tersebut
                      </span>
                      <span className="text-[#019296] font-bold">Pilih tanggal</span>
                    </div>

                  </div>

                  {/* SISI KANAN (4-5 Kolom): Rincian Agenda pada Tanggal Terpilih */}
                  <div className="md:col-span-5 xl:col-span-4 border-t md:border-t-0 md:border-l border-[#EFF1F3] md:pl-5 pt-4 md:pt-0 flex flex-col justify-between h-full min-h-0">
                    <div className="flex flex-col h-full min-h-0">
                      {/* Header Agenda */}
                      <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#EFF1F3] shrink-0">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-[#01B6BC]" aria-hidden="true"></span>
                          <span className="text-xs sm:text-sm font-bold text-[#2B2D42]">
                            {selectedCalendarDate}
                          </span>
                          {selectedCalendarDate === todayDateStr && (
                            <span className="text-[10px] font-bold bg-[#01B6BC] text-white px-2 py-0.2 rounded-full">
                              HARI INI
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-bold text-[#019296] bg-[#E6F8F9] border border-[#CCF0F2] rounded-full px-2.5 py-0.5">
                          {selectedDateActivities.length} AGENDA
                        </span>
                      </div>

                      {/* List of activities for the selected date - Locked Height */}
                      <div key={selectedCalendarDate} className="space-y-2 h-[340px] sm:h-[350px] overflow-y-auto pr-1 agenda-motion">
                        {selectedDateActivities.length > 0 ? (
                          selectedDateActivities.map(item => (
                            <div
                              key={item.id}
                              role="button"
                              tabIndex={0}
                              onClick={() => setSelectedDetailItem(item)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  setSelectedDetailItem(item);
                                }
                              }}
                              aria-label={`Detail agenda: ${item.kegiatan}`}
                              className="p-3 bg-white hover:bg-[#F7F8F9] border border-[#EFF1F3] hover:border-[#CCF0F2] rounded-xl shadow-2xs hover:shadow-xs transition-all text-xs flex flex-col justify-between cursor-pointer group focus-visible:outline-2 focus-visible:outline-[#01B6BC]"
                            >
                              <div>
                                <div className="flex items-center justify-between gap-1.5 mb-1.5">
                                  <span className="font-bold text-[10px] bg-[#E6F8F9] text-[#019296] border border-[#CCF0F2] rounded-md px-1.5 py-0.2">
                                    #{cleanNomor(item.nomor)}
                                  </span>
                                  {item.lokasi && (
                                    <span className="text-[10px] text-[#9A9BA9] truncate max-w-[140px] inline-flex items-center gap-1 font-medium">
                                      <MapPin className="w-3 h-3 text-[#FF8DA1] shrink-0" aria-hidden="true" />
                                      <span>{item.lokasi}</span>
                                    </span>
                                  )}
                                </div>
                                <p className="font-bold text-[#2B2D42] line-clamp-2 leading-snug group-hover:text-[#01B6BC] transition-colors">
                                  {item.kegiatan}
                                </p>
                              </div>

                              <div className="mt-2.5 pt-2 border-t border-[#EFF1F3] flex items-center justify-between">
                                <span className="text-[10px] text-[#9A9BA9] truncate max-w-[130px] inline-flex items-center gap-1 font-medium">
                                  <Users className="w-3 h-3 text-[#6F69D2] shrink-0" aria-hidden="true" />
                                  <span>{item.petugas.join(', ') || 'Belum tercatat'}</span>
                                </span>

                                <div className="flex items-center gap-1 shrink-0">
                                  {item.link_berita && (
                                    <a
                                      href={item.link_berita}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      className="text-[10px] font-bold rounded-full bg-[#E6F8F9] text-[#019296] hover:bg-[#CCF0F2] px-2 py-0.5 transition-colors"
                                    >
                                      Berita
                                    </a>
                                  )}
                                  <button
                                    type="button"
                                    aria-label={`Salin format WhatsApp kegiatan nomor ${cleanNomor(item.nomor)}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      copyReport(item);
                                    }}
                                    className="p-1 rounded-full border border-[#D7D7DD] hover:border-[#01B6BC] hover:bg-[#E6F8F9] text-[#363853] hover:text-[#019296] transition-colors cursor-pointer shadow-2xs"
                                    title="Salin WA"
                                  >
                                    {copyStatus[item.id] ? <Check className="w-3.5 h-3.5 text-[#22C55E]" aria-hidden="true" /> : <Copy className="w-3.5 h-3.5" aria-hidden="true" />}
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="h-full flex flex-col items-center justify-center p-6 text-center bg-[#F7F8F9] border border-dashed border-[#EFF1F3] rounded-xl">
                            <Calendar className="w-7 h-7 text-[#9A9BA9] mx-auto mb-2" aria-hidden="true" />
                            <p className="text-xs text-[#2B2D42] font-bold">
                              Tidak ada agenda pada tanggal ini
                            </p>
                            <p className="text-[11px] text-[#9A9BA9] mt-0.5">
                              Pilih tanggal bertitik di sebelah kiri untuk melihat rincian agenda liputan.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {selectedDateActivities.length > 0 && (
                      <div className="pt-2.5 text-xs text-[#9A9BA9] flex items-center justify-between border-t border-[#EFF1F3] mt-2">
                        <span>Total: <strong className="text-[#2B2D42]">{selectedDateActivities.length}</strong> agenda</span>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedMonths([MONTH_ORDER[calendarMonth]]);
                            setCurrentMenu('rekapitulasi');
                          }}
                          className="text-[#019296] font-bold hover:underline cursor-pointer"
                        >
                          Buka Rekapitulasi →
                        </button>
                      </div>
                    )}

                  </div>

                </div>

              </div>

            </div>

            {/* ROW 2: MONTHLY VOLUME BAR CHART & SURFACE DEEP SLATE CARD */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              
              {/* Left (8 cols): iFraldas Monthly Bar Chart */}
              <div 
                className="lg:col-span-8 invo-card p-5 sm:p-6 flex flex-col justify-between"
                onMouseLeave={() => setHoveredMonth(null)}
              >
                
                {/* Header with Monthly Total & Subtitle */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div>
                    <h3 className="font-heading font-extrabold text-base sm:text-lg text-[#2B2D42]">
                      Aktivitas Peliputan Bulanan
                    </h3>
                    <p className="text-xs text-[#9A9BA9] mt-0.5">
                      Data s.d. 25 November 2026
                    </p>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-2xl sm:text-3xl font-heading font-black text-[#019296]">
                        {hoveredMonth ? (monthCounts[hoveredMonth] || 0) : peakMonth.count}
                      </span>
                      <span className="text-xs text-[#9A9BA9]">
                        {hoveredMonth ? `kegiatan di bulan ${hoveredMonth}` : `kegiatan di bulan puncak (${peakMonth.name})`}
                      </span>
                    </div>
                  </div>

                  {/* Filter hint */}
                  <div className="flex items-center gap-2 text-xs font-bold text-[#019296] bg-[#E6F8F9] px-3 py-1 rounded-full border border-[#CCF0F2]">
                    <span className="w-2 h-2 rounded-full bg-[#01B6BC]"></span>
                    <span>Puncak: {peakMonth.name} ({peakMonth.count})</span>
                  </div>
                </div>

                {/* Harmonious Bar Chart */}
                <div className="pt-6 pb-1">
                  <div className="flex items-end justify-between gap-1.5 sm:gap-3 h-48 border-b border-[#EFF1F3] px-1 pb-2">
                    {activeMonths.map(month => {
                      const count = monthCounts[month] || 0;
                      const heightPct = Math.round((count / maxMonthCount) * 100);
                      const isHovered = hoveredMonth === month;
                      const isPeak = month === peakMonth.name;

                      return (
                        <div
                          key={month}
                          onMouseEnter={() => setHoveredMonth(month)}
                          onMouseLeave={() => setHoveredMonth(null)}
                          onClick={() => {
                            setSelectedMonths([month]);
                            setCurrentMenu('rekapitulasi');
                          }}
                          className="flex-1 flex flex-col items-center h-full justify-end cursor-pointer group relative"
                        >
                          {/* Centered Number Above Bar */}
                          <span className={`text-[10px] font-bold mb-1 transition-colors ${
                            isHovered ? 'text-[#019296]' : isPeak ? 'text-[#019296]' : 'text-[#9A9BA9]'
                          }`}>
                            {count}
                          </span>

                          {/* Tooltip Floating Pill */}
                          {isHovered && (
                            <div className="absolute -top-9 left-1/2 -translate-x-1/2 z-30 pointer-events-none whitespace-nowrap bg-[#2B2D42] text-white text-[10px] font-bold px-2.5 py-1 rounded-lg shadow-md flex flex-col items-center">
                              <span>{count} Kegiatan ({month})</span>
                            </div>
                          )}

                          {/* Bar */}
                          <div
                            className={`w-full max-w-[36px] chart-bar-animated rounded-t-lg transition-all ${
                              isHovered
                                ? 'bg-[#019296] shadow-sm'
                                : isPeak
                                ? 'bg-[#01B6BC] shadow-xs'
                                : 'bg-[#B3E9EB] hover:bg-[#80DBDD]'
                            }`}
                            style={{ height: `${Math.max(heightPct, 8)}%` }}
                          />

                          {/* Month Label */}
                          <span className={`text-[10px] font-bold mt-2 transition-colors ${
                            isHovered ? 'text-[#019296]' : isPeak ? 'text-[#019296]' : 'text-[#9A9BA9]'
                          }`}>
                            {month.slice(0, 3)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Footer notes */}
                <div className="flex items-center justify-between pt-3 text-xs text-[#9A9BA9]">
                  <span>Warna toska pekat menandakan bulan dengan volume kegiatan tertinggi</span>
                  <button 
                    type="button"
                    onClick={() => setCurrentMenu('rekapitulasi')}
                    className="text-[#019296] font-bold hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    <span>Lihat Rekap Lengkap</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>

              </div>

              {/* Right (4 cols): iFraldas Deep Slate Card (#2B2D42) */}
              <div className="lg:col-span-4 bg-[#2B2D42] text-white rounded-2xl p-5 sm:p-6 flex flex-col justify-between shadow-md border border-[#201F31]">
                <div>
                  <span className="inline-block text-[10px] font-bold tracking-wider bg-[#01B6BC] text-white px-2.5 py-0.5 rounded-full uppercase mb-3 shadow-2xs">
                    RESMI 2026
                  </span>

                  <h3 className="font-heading font-black text-lg sm:text-xl leading-tight text-white mb-2">
                    Basis Data Peliputan Pimpinan PKP
                  </h3>

                  <p className="text-xs text-[#D7D7DD] leading-relaxed">
                    Seluruh agenda kementerian, liputan pers, rilis berita resmi, serta penugasan personil terdata secara terstruktur.
                  </p>
                </div>

                {/* 3 Summary Numbers filling the center cleanly */}
                <div className="grid grid-cols-3 gap-2 my-5 p-3 bg-white/10 rounded-xl border border-white/10 text-center">
                  <div>
                    <div className="text-2xl font-heading font-black text-white">{activities.length}</div>
                    <div className="text-[10px] text-[#D7D7DD] font-semibold uppercase tracking-wider">Kegiatan</div>
                  </div>
                  <div className="border-x border-white/10">
                    <div className="text-2xl font-heading font-black text-[#80DBDD]">{totalBerita}</div>
                    <div className="text-[10px] text-[#D7D7DD] font-semibold uppercase tracking-wider">Berita</div>
                  </div>
                  <div>
                    <div className="text-2xl font-heading font-black text-[#FFC6DD]">{totalVideo}</div>
                    <div className="text-[10px] text-[#D7D7DD] font-semibold uppercase tracking-wider">Video</div>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-white/10">
                  <a
                    href="https://docs.google.com/spreadsheets/d/16Q_Mrbs2oHPMv-xcCaB9zJ5_JMjAfr9F/edit?usp=sharing&ouid=110437050343134361164&rtpof=true&sd=true"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full h-10 bg-[#01B6BC] hover:bg-[#019296] text-white rounded-full text-xs inline-flex items-center justify-center gap-1.5 transition-all font-bold shadow-sm"
                  >
                    <span>BUKA GOOGLE SHEET</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </a>

                  <button
                    type="button"
                    onClick={exportCSV}
                    className="w-full h-10 border border-white/30 text-white hover:bg-white/10 rounded-full text-xs inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer font-bold"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>EKSPOR DATA CSV</span>
                  </button>
                </div>

              </div>

            </div>

            {/* ROW 3: KEGIATAN PELIPUTAN TERBARU & PETUGAS TERAKTIF */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              
              {/* Left: Kegiatan Peliputan Terbaru */}
              <div className="invo-card p-5">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#EFF1F3]">
                  <h4 className="font-heading font-extrabold text-[#2B2D42] text-sm sm:text-base">
                    Kegiatan Peliputan Terbaru
                  </h4>
                  <button
                    type="button"
                    onClick={() => setCurrentMenu('search')}
                    className="text-xs font-bold text-[#019296] hover:underline cursor-pointer"
                  >
                    Cari Kegiatan →
                  </button>
                </div>

                <div className="divide-y divide-[#EFF1F3]">
                  {recentActivities.map(item => (
                    <div
                      key={item.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedDetailItem(item)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelectedDetailItem(item);
                        }
                      }}
                      className="py-2.5 px-2 flex items-start justify-between gap-3 group cursor-pointer hover:bg-[#F7F8F9] rounded-xl transition-colors"
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="text-[10px] font-bold bg-[#E6F8F9] text-[#019296] border border-[#CCF0F2] rounded-md px-1.5 py-0.5 mt-0.5 shrink-0">
                          #{cleanNomor(item.nomor)}
                        </div>
                        <div>
                          <p className="font-bold text-[#2B2D42] text-xs sm:text-sm line-clamp-1 group-hover:text-[#01B6BC] transition-colors">
                            {item.kegiatan}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-[#9A9BA9] mt-0.5 font-medium">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-[#9A9BA9]" />
                              {item.tanggal_formatted || item.tanggal}
                            </span>
                            <span>•</span>
                            <span className="truncate max-w-[180px]">{item.lokasi || '-'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          aria-label={`Salin format WhatsApp kegiatan nomor ${cleanNomor(item.nomor)}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            copyReport(item);
                          }}
                          className="p-1.5 rounded-full border border-[#D7D7DD] hover:border-[#01B6BC] hover:bg-[#E6F8F9] text-[#363853] hover:text-[#019296] transition-colors cursor-pointer shadow-2xs"
                          title="Salin WA"
                        >
                          {copyStatus[item.id] ? <Check className="w-3.5 h-3.5 text-[#22C55E]" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: Petugas Teraktif */}
              <div className="invo-card p-5">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#EFF1F3]">
                  <h4 className="font-heading font-extrabold text-[#2B2D42] text-sm sm:text-base">
                    Personil Teraktif
                  </h4>
                  <button
                    type="button"
                    onClick={() => setCurrentMenu('tim')}
                    className="text-xs font-bold text-[#019296] hover:underline cursor-pointer"
                  >
                    Lihat Semua ({officerStats.length}) →
                  </button>
                </div>

                <div className="divide-y divide-[#EFF1F3]">
                  {officerStats.slice(0, 5).map((officer, index) => (
                    <div
                      key={officer.name}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        setSelectedOfficers([officer.name]);
                        setCurrentMenu('rekapitulasi');
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelectedOfficers([officer.name]);
                          setCurrentMenu('rekapitulasi');
                        }
                      }}
                      className="py-2.5 px-2 hover:bg-[#F7F8F9] rounded-xl transition-colors cursor-pointer group flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-6 h-6 rounded-full bg-[#E6F8F9] text-[#019296] border border-[#CCF0F2] font-bold flex items-center justify-center text-xs">
                          {index + 1}
                        </span>
                        <span className="font-bold text-[#2B2D42] text-xs sm:text-sm group-hover:text-[#01B6BC] transition-colors">
                          {officer.name}
                        </span>
                      </div>
                      <span className="text-xs font-semibold text-[#019296] bg-[#E6F8F9] rounded-full px-2.5 py-0.5">
                        {officer.count} kegiatan
                      </span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW 3: REKAPITULASI KEGIATAN                            */}
        {/* ======================================================== */}
        {currentMenu === 'rekapitulasi' && (
          <div className="space-y-4 page-transition">
            
            {/* Filter Card */}
            <div className="invo-card p-4 sm:p-5 rounded-2xl border border-[#EFF1F3] bg-white shadow-xs">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={goBack}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-sans font-semibold text-[#019296] bg-[#E6F8F9] hover:bg-[#CCF0F2] rounded-full border border-[#B3E9EB] transition-colors cursor-pointer select-none"
                    title="Kembali"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Kembali</span>
                  </button>
                  <div>
                    <h3 className="text-base sm:text-lg font-heading font-black text-[#2B2D42] leading-tight">
                      Rekapitulasi Kegiatan
                    </h3>
                    <p className="text-[11px] font-sans text-[#9A9BA9]">
                      Tabel data interaktif seluruh penugasan liputan pimpinan Kementerian PKP.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {activeFiltersCount > 0 && (
                    <button
                      type="button"
                      onClick={resetRekapFilters}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-sans font-semibold rounded-full border border-[#FFCCD4] bg-[#FFF0F2] text-[#FF395B] hover:bg-[#FFE0E4] transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Atur Ulang ({activeFiltersCount})</span>
                    </button>
                  )}

                  <button
                    onClick={exportCSV}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-sans font-bold rounded-full bg-[#01B6BC] text-white hover:bg-[#019296] shadow-xs hover:shadow transition-all cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Ekspor CSV</span>
                  </button>
                </div>
              </div>

              {/* Table search input */}
              <div className="relative mb-3">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9A9BA9] pointer-events-none" />
                <input
                  type="text"
                  placeholder="Filter tabel berdasarkan nama kegiatan, lokasi daerah, judul berita, atau nama petugas..."
                  value={rekapSearch}
                  onChange={(e) => setRekapSearch(e.target.value)}
                  className="w-full pl-10 pr-9 py-2 bg-[#F7F8F9] focus:bg-white border border-[#EFF1F3] focus:border-[#01B6BC] rounded-full text-[#363853] text-xs font-sans placeholder:text-[#9A9BA9] focus:outline-none transition-all"
                />
                {rekapSearch && (
                  <button
                    onClick={() => setRekapSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#9A9BA9] hover:text-[#2B2D42]"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Filter controls with clear initial labels */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                
                {/* 1. Multi-Select Bulan */}
                <div className="relative" ref={monthPickerRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMonthPickerOpen(!isMonthPickerOpen);
                      setIsNewsStatusPickerOpen(false);
                      setIsVideoStatusPickerOpen(false);
                      setIsProvincePickerOpen(false);
                      setIsOfficerPickerOpen(false);
                    }}
                    className={`w-full bg-white hover:bg-[#F7F8F9] border rounded-full px-3 py-1.5 text-xs font-sans font-medium flex items-center justify-between text-left transition-colors cursor-pointer ${
                      selectedMonths.length > 0 ? 'border-[#01B6BC] bg-[#E6F8F9] text-[#019296] font-bold' : 'border-[#EFF1F3] text-[#363853]'
                    }`}
                  >
                    <span className="truncate">
                      {selectedMonths.length === 0
                        ? 'Bulan: Semua'
                        : selectedMonths.length === 1
                        ? `Bulan: ${selectedMonths[0]}`
                        : `Bulan: ${selectedMonths.length} Terpilih`}
                    </span>
                    <ChevronDown className={`w-3.5 h-3.5 text-[#9A9BA9] shrink-0 ml-1 transition-transform duration-200 ${isMonthPickerOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isMonthPickerOpen && (
                    <div className="absolute left-0 mt-1.5 w-72 bg-white rounded-2xl border border-[#EFF1F3] p-3 z-30 shadow-lg popover-motion origin-top-left">
                      <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#EFF1F3] text-xs font-sans">
                        <span className="font-heading font-bold text-[#2B2D42] uppercase tracking-wider text-[11px]">Pilih Bulan</span>
                        <button
                          type="button"
                          onClick={() => setSelectedMonths([])}
                          className="text-[#01B6BC] hover:underline font-bold text-[11px]"
                        >
                          Pilih Semua
                        </button>
                      </div>

                      {/* Quarters */}
                      <div className="grid grid-cols-4 gap-1 mb-2">
                        {[['Q1', ['Januari', 'Februari', 'Maret']], ['Q2', ['April', 'Mei', 'Juni']], ['Q3', ['Juli', 'Agustus', 'September']], ['Q4', ['Oktober', 'November', 'Desember']]].map(([label, qMonths]) => (
                          <button
                            key={label}
                            type="button"
                            onClick={() => selectQuarter(qMonths)}
                            className="px-2 py-1 text-[10px] font-sans font-bold rounded-full bg-[#F7F8F9] hover:bg-[#E6F8F9] text-[#363853] hover:text-[#019296] border border-[#EFF1F3] transition-colors"
                          >
                            {label}
                          </button>
                        ))}
                      </div>

                      {/* Checkboxes */}
                      <div className="space-y-0.5 max-h-48 overflow-y-auto pr-1">
                        {activeMonths.map(month => (
                          <label
                            key={month}
                            className="flex items-center justify-between px-2.5 py-1.5 rounded-xl hover:bg-[#F7F8F9] cursor-pointer text-xs font-sans select-none"
                          >
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={selectedMonths.includes(month)}
                                onChange={() => toggleMonth(month)}
                                className="h-3.5 w-3.5 rounded text-[#01B6BC] border-[#EFF1F3] accent-[#01B6BC]"
                              />
                              <span className={selectedMonths.includes(month) ? 'font-bold text-[#019296]' : 'text-[#363853]'}>
                                {month}
                              </span>
                            </div>
                            <span className="text-[10px] text-[#9A9BA9] font-sans bg-[#F7F8F9] px-2 py-0.5 rounded-full">
                              {monthCounts[month] || 0}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Status Berita */}
                <div className="relative" ref={newsStatusPickerRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsNewsStatusPickerOpen(!isNewsStatusPickerOpen);
                      setIsMonthPickerOpen(false);
                      setIsVideoStatusPickerOpen(false);
                      setIsProvincePickerOpen(false);
                      setIsOfficerPickerOpen(false);
                    }}
                    className={`w-full bg-white hover:bg-[#F7F8F9] border rounded-full px-3 py-1.5 text-xs font-sans font-medium flex items-center justify-between text-left transition-colors cursor-pointer ${
                      selectedNewsStatus !== 'all' ? 'border-[#01B6BC] bg-[#E6F8F9] text-[#019296] font-bold' : 'border-[#EFF1F3] text-[#363853]'
                    }`}
                  >
                    <span className="truncate">
                      {selectedNewsStatus === 'all'
                        ? 'Berita: Semua'
                        : selectedNewsStatus === 'with_news'
                        ? `Berita: Ada (${totalBerita})`
                        : 'Berita: Belum Ada'}
                    </span>
                    <ChevronDown className={`w-3.5 h-3.5 text-[#9A9BA9] shrink-0 ml-1 transition-transform duration-200 ${isNewsStatusPickerOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isNewsStatusPickerOpen && (
                    <div className="absolute left-0 mt-1.5 w-60 bg-white rounded-2xl border border-[#EFF1F3] p-2 z-30 shadow-lg popover-motion origin-top-left">
                      <div className="px-2.5 py-1.5 font-heading font-bold text-[10px] text-[#9A9BA9] uppercase tracking-wider border-b border-[#EFF1F3] mb-1">
                        Status Rilis Berita
                      </div>
                      <div className="space-y-0.5">
                        {[
                          { id: 'all', label: 'Semua Status Berita', count: null, desc: 'Tampilkan seluruh kegiatan' },
                          { id: 'with_news', label: 'Berita Tercantum', count: totalBerita, desc: 'Rilis pers resmi sudah terbit' },
                          { id: 'no_news', label: 'Belum Ada Berita', count: activities.length - totalBerita, desc: 'Belum terbit rilis pers' }
                        ].map(opt => {
                          const isSelected = selectedNewsStatus === opt.id;
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => {
                                setSelectedNewsStatus(opt.id);
                                setIsNewsStatusPickerOpen(false);
                              }}
                              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition-colors text-left cursor-pointer border ${
                                isSelected
                                  ? 'bg-[#E6F8F9] text-[#019296] border-[#01B6BC] font-bold'
                                  : 'hover:bg-[#F7F8F9] text-[#363853] border-transparent font-medium'
                              }`}
                            >
                              <div>
                                <div className="flex items-center gap-1.5 font-sans">
                                  <span>{opt.label}</span>
                                  {opt.count !== null && (
                                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                                      isSelected ? 'bg-[#01B6BC] text-white' : 'bg-[#EFF1F3] text-[#363853]'
                                    }`}>
                                      {opt.count}
                                    </span>
                                  )}
                                </div>
                                <div className={`text-[10px] font-sans ${isSelected ? 'text-[#019296]/80' : 'text-[#9A9BA9]'}`}>{opt.desc}</div>
                              </div>
                              {isSelected && <Check className="w-3.5 h-3.5 text-[#019296] shrink-0 ml-2" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. Status Video */}
                <div className="relative" ref={videoStatusPickerRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsVideoStatusPickerOpen(!isVideoStatusPickerOpen);
                      setIsMonthPickerOpen(false);
                      setIsNewsStatusPickerOpen(false);
                      setIsProvincePickerOpen(false);
                      setIsOfficerPickerOpen(false);
                    }}
                    className={`w-full bg-white hover:bg-[#F7F8F9] border rounded-full px-3 py-1.5 text-xs font-sans font-medium flex items-center justify-between text-left transition-colors cursor-pointer ${
                      selectedVideoStatus !== 'all' ? 'border-[#01B6BC] bg-[#E6F8F9] text-[#019296] font-bold' : 'border-[#EFF1F3] text-[#363853]'
                    }`}
                  >
                    <span className="truncate">
                      {selectedVideoStatus === 'all'
                        ? 'Video: Semua'
                        : selectedVideoStatus === 'with_video'
                        ? `Video: Ada (${totalVideo})`
                        : 'Video: Belum Ada'}
                    </span>
                    <ChevronDown className={`w-3.5 h-3.5 text-[#9A9BA9] shrink-0 ml-1 transition-transform duration-200 ${isVideoStatusPickerOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isVideoStatusPickerOpen && (
                    <div className="absolute left-0 mt-1.5 w-60 bg-white rounded-2xl border border-[#EFF1F3] p-2 z-30 shadow-lg popover-motion origin-top-left">
                      <div className="px-2.5 py-1.5 font-heading font-bold text-[10px] text-[#9A9BA9] uppercase tracking-wider border-b border-[#EFF1F3] mb-1">
                        Status Tautan Video
                      </div>
                      <div className="space-y-0.5">
                        {[
                          { id: 'all', label: 'Semua Status Video', count: null, desc: 'Tampilkan seluruh liputan' },
                          { id: 'with_video', label: 'Video Tercantum', count: totalVideo, desc: 'Dokumentasi video tersedia' },
                          { id: 'no_video', label: 'Belum Ada Video', count: activities.length - totalVideo, desc: 'Belum ada tautan video' }
                        ].map(opt => {
                          const isSelected = selectedVideoStatus === opt.id;
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => {
                                setSelectedVideoStatus(opt.id);
                                setIsVideoStatusPickerOpen(false);
                              }}
                              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition-colors text-left cursor-pointer border ${
                                isSelected
                                  ? 'bg-[#E6F8F9] text-[#019296] border-[#01B6BC] font-bold'
                                  : 'hover:bg-[#F7F8F9] text-[#363853] border-transparent font-medium'
                              }`}
                            >
                              <div>
                                <div className="flex items-center gap-1.5 font-sans">
                                  <span>{opt.label}</span>
                                  {opt.count !== null && (
                                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                                      isSelected ? 'bg-[#01B6BC] text-white' : 'bg-[#EFF1F3] text-[#363853]'
                                    }`}>
                                      {opt.count}
                                    </span>
                                  )}
                                </div>
                                <div className={`text-[10px] font-sans ${isSelected ? 'text-[#019296]/80' : 'text-[#9A9BA9]'}`}>{opt.desc}</div>
                              </div>
                              {isSelected && <Check className="w-3.5 h-3.5 text-[#019296] shrink-0 ml-2" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* 4. Provinsi */}
                <div className="relative" ref={provincePickerRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsProvincePickerOpen(!isProvincePickerOpen);
                      setIsMonthPickerOpen(false);
                      setIsNewsStatusPickerOpen(false);
                      setIsVideoStatusPickerOpen(false);
                      setIsOfficerPickerOpen(false);
                    }}
                    className={`w-full bg-white hover:bg-[#F7F8F9] border rounded-full px-3 py-1.5 text-xs font-sans font-medium flex items-center justify-between text-left transition-colors cursor-pointer ${
                      selectedProvince !== 'all' ? 'border-[#01B6BC] bg-[#E6F8F9] text-[#019296] font-bold' : 'border-[#EFF1F3] text-[#363853]'
                    }`}
                  >
                    <span className="truncate">
                      {selectedProvince === 'all' ? 'Wilayah: Semua' : `Wilayah: ${selectedProvince}`}
                    </span>
                    <ChevronDown className={`w-3.5 h-3.5 text-[#9A9BA9] shrink-0 ml-1 transition-transform duration-200 ${isProvincePickerOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isProvincePickerOpen && (
                    <div className="absolute left-0 sm:left-auto sm:right-0 mt-1.5 w-72 bg-white rounded-2xl border border-[#EFF1F3] p-3 z-30 shadow-lg popover-motion origin-top-left sm:origin-top-right">
                      <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#EFF1F3] text-xs font-sans">
                        <div>
                          <span className="font-heading font-bold text-[#2B2D42] uppercase tracking-wider block text-[11px]">Filter Wilayah</span>
                          <span className="text-[10px] text-[#9A9BA9]">{provinces.length} provinsi tercatat</span>
                        </div>
                        {selectedProvince !== 'all' && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedProvince('all');
                              setIsProvincePickerOpen(false);
                            }}
                            className="text-[#01B6BC] hover:underline font-bold text-[11px]"
                          >
                            Reset
                          </button>
                        )}
                      </div>

                      {/* Mini search for province */}
                      <div className="relative mb-2">
                        <Search className="w-3.5 h-3.5 text-[#9A9BA9] absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={provinceSearch}
                          onChange={(e) => setProvinceSearch(e.target.value)}
                          placeholder="Cari provinsi..."
                          className="w-full pl-8 pr-7 py-1 text-xs bg-[#F7F8F9] focus:bg-white border border-[#EFF1F3] focus:border-[#01B6BC] rounded-full focus:outline-none font-sans"
                        />
                        {provinceSearch && (
                          <button
                            type="button"
                            onClick={() => setProvinceSearch('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-[#9A9BA9] hover:text-[#2B2D42]"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      <div className="space-y-0.5 max-h-52 overflow-y-auto pr-1">
                        {/* Option 'Semua Wilayah' */}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedProvince('all');
                            setIsProvincePickerOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-sans transition-colors text-left cursor-pointer border ${
                            selectedProvince === 'all'
                              ? 'bg-[#E6F8F9] text-[#019296] border-[#01B6BC] font-bold'
                              : 'hover:bg-[#F7F8F9] text-[#363853] border-transparent font-medium'
                          }`}
                        >
                          <span>Semua Wilayah</span>
                          {selectedProvince === 'all' && <Check className="w-3.5 h-3.5 text-[#019296] shrink-0 ml-2" />}
                        </button>

                        {filteredProvinces.map(p => {
                          const isSelected = selectedProvince === p;
                          const count = provinceCounts[p] || 0;
                          return (
                            <button
                              key={p}
                              type="button"
                              onClick={() => {
                                setSelectedProvince(p);
                                setIsProvincePickerOpen(false);
                              }}
                              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-sans transition-colors text-left cursor-pointer border ${
                                isSelected
                                  ? 'bg-[#E6F8F9] text-[#019296] border-[#01B6BC] font-bold'
                                  : 'hover:bg-[#F7F8F9] text-[#363853] border-transparent font-medium'
                              }`}
                            >
                              <div className="flex items-center gap-1.5 truncate">
                                <MapPin className={`w-3 h-3 shrink-0 ${isSelected ? 'text-[#019296]' : 'text-[#9A9BA9]'}`} />
                                <span className="truncate">{p}</span>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                  isSelected ? 'bg-[#01B6BC] text-white' : 'bg-[#EFF1F3] text-[#363853]'
                                }`}>
                                  {count}
                                </span>
                                {isSelected && <Check className="w-3.5 h-3.5 text-[#019296] shrink-0" />}
                              </div>
                            </button>
                          );
                        })}
                        {filteredProvinces.length === 0 && (
                          <div className="text-center py-4 text-xs font-sans text-[#9A9BA9]">
                            Provinsi tidak ditemukan
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* 5. Multi-Select Petugas */}
                <div className="relative" ref={officerPickerRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsOfficerPickerOpen(!isOfficerPickerOpen);
                      setIsMonthPickerOpen(false);
                      setIsNewsStatusPickerOpen(false);
                      setIsVideoStatusPickerOpen(false);
                      setIsProvincePickerOpen(false);
                    }}
                    className={`w-full bg-white hover:bg-[#F7F8F9] border rounded-full px-3 py-1.5 text-xs font-sans font-medium flex items-center justify-between text-left transition-colors cursor-pointer ${
                      selectedOfficers.length > 0 ? 'border-[#6F69D2] bg-[#F0EEF9] text-[#6F69D2] font-bold' : 'border-[#EFF1F3] text-[#363853]'
                    }`}
                  >
                    <span className="truncate">
                      {selectedOfficers.length === 0
                        ? 'Petugas: Semua'
                        : selectedOfficers.length === 1
                        ? `Petugas: ${selectedOfficers[0]}`
                        : `Petugas: ${selectedOfficers.length} Terpilih`}
                    </span>
                    <ChevronDown className={`w-3.5 h-3.5 shrink-0 ml-1 transition-transform duration-200 ${
                      selectedOfficers.length > 0 ? 'text-[#6F69D2]' : 'text-[#9A9BA9]'
                    } ${isOfficerPickerOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isOfficerPickerOpen && (
                    <div className="absolute right-0 mt-1.5 w-72 bg-white rounded-2xl border border-[#EFF1F3] p-3 z-30 shadow-lg popover-motion origin-top-right">
                      <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#EFF1F3] text-xs font-sans">
                        <div>
                          <span className="font-heading font-bold text-[#2B2D42] uppercase tracking-wider block text-[11px]">Filter Personil Tim</span>
                          <span className="text-[10px] text-[#9A9BA9]">Harus bertugas bersama</span>
                        </div>
                        {selectedOfficers.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setSelectedOfficers([])}
                            className="text-[#6F69D2] hover:underline font-bold text-[11px]"
                          >
                            Reset
                          </button>
                        )}
                      </div>

                      <input
                        type="text"
                        placeholder="Cari nama personil..."
                        value={officerSearch}
                        onChange={(e) => setOfficerSearch(e.target.value)}
                        className="w-full pl-3 pr-2 py-1.5 mb-2 bg-[#F7F8F9] focus:bg-white border border-[#EFF1F3] rounded-full text-[#363853] text-xs font-sans focus:border-[#6F69D2] focus:outline-none transition-all"
                      />

                      <div className="space-y-0.5 max-h-48 overflow-y-auto pr-1">
                        {officerStats
                          .filter(o => o.name.toLowerCase().includes(officerSearch.toLowerCase()))
                          .map(officer => (
                            <label
                              key={officer.name}
                              className="flex items-center justify-between px-2.5 py-1.5 rounded-xl hover:bg-[#F7F8F9] cursor-pointer text-xs font-sans select-none"
                            >
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={selectedOfficers.includes(officer.name)}
                                  onChange={() => toggleOfficer(officer.name)}
                                  className="h-3.5 w-3.5 rounded text-[#6F69D2] border-[#EFF1F3] accent-[#6F69D2]"
                                />
                                <span className={selectedOfficers.includes(officer.name) ? 'font-bold text-[#6F69D2]' : 'text-[#363853]'}>
                                  {officer.name}
                                </span>
                              </div>
                              <span className="text-[10px] text-[#9A9BA9] font-sans bg-[#F7F8F9] px-2 py-0.5 rounded-full">
                                {officer.count}
                              </span>
                            </label>
                          ))}
                      </div>
                    </div>
                  )}
                </div>

              </div>

              {/* Active Filter Chips */}
              {(selectedMonths.length > 0 || selectedOfficers.length > 0 || selectedProvince !== 'all' || selectedNewsStatus !== 'all' || selectedVideoStatus !== 'all') && (
                <div className="flex items-center gap-1.5 flex-wrap pt-3 mt-3 border-t border-[#EFF1F3] text-xs font-sans">
                  <span className="text-[#9A9BA9] uppercase tracking-wider text-[11px] font-bold">Filter aktif:</span>

                  {selectedMonths.map(m => (
                    <span key={m} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#E6F8F9] text-[#019296] border border-[#B3E9EB] font-semibold text-xs">
                      Bulan: {m}
                      <button type="button" onClick={() => toggleMonth(m)} className="hover:text-[#016D71] cursor-pointer">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}

                  {selectedProvince !== 'all' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#E6F8F9] text-[#019296] border border-[#B3E9EB] font-semibold text-xs">
                      Wilayah: {selectedProvince}
                      <button type="button" onClick={() => setSelectedProvince('all')} className="hover:text-[#016D71] cursor-pointer">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}

                  {selectedNewsStatus !== 'all' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#E6F8F9] text-[#019296] border border-[#B3E9EB] font-semibold text-xs">
                      Berita: {selectedNewsStatus === 'with_news' ? 'Tercantum' : 'Belum Ada'}
                      <button type="button" onClick={() => setSelectedNewsStatus('all')} className="hover:text-[#016D71] cursor-pointer">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}

                  {selectedVideoStatus !== 'all' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#E6F8F9] text-[#019296] border border-[#B3E9EB] font-semibold text-xs">
                      Video: {selectedVideoStatus === 'with_video' ? 'Tercantum' : 'Belum Ada'}
                      <button type="button" onClick={() => setSelectedVideoStatus('all')} className="hover:text-[#016D71] cursor-pointer">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}

                  {selectedOfficers.map(name => (
                    <span key={name} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#F0EEF9] text-[#6F69D2] border border-[#E2E1F6] font-semibold text-xs">
                      {name}
                      <button type="button" onClick={() => toggleOfficer(name)} className="hover:text-[#4F46E5] cursor-pointer">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}

                  {(rekapSort.field !== 'nomor' || rekapSort.direction !== 'asc') && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#F7F8F9] text-[#363853] border border-[#EFF1F3] font-semibold text-xs">
                      Urutan: {currentSortLabel}
                      <button
                        type="button"
                        onClick={() => setRekapSort({ field: 'nomor', direction: 'asc' })}
                        className="hover:text-[#2B2D42] cursor-pointer"
                        title="Kembalikan urutan default"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={resetRekapFilters}
                    className="text-xs font-sans font-bold text-[#01B6BC] hover:underline ml-1 cursor-pointer"
                  >
                    Atur Ulang Semua
                  </button>
                </div>
              )}

            </div>

            {/* Results Counter & Sort Selector Above Table */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1 text-xs font-sans text-[#9A9BA9]">
              <p>
                Menampilkan <span className="text-[#2B2D42] font-heading font-black">{sortedRekapResults.length}</span> dari {activities.length} kegiatan
              </p>

              <div className="flex items-center gap-2">
                {/* Sort Dropdown Selector */}
                <div className="relative" ref={sortPickerRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsSortPickerOpen(!isSortPickerOpen);
                      setIsMonthPickerOpen(false);
                      setIsNewsStatusPickerOpen(false);
                      setIsVideoStatusPickerOpen(false);
                      setIsProvincePickerOpen(false);
                      setIsOfficerPickerOpen(false);
                    }}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-sans font-semibold border transition-colors cursor-pointer select-none ${
                      rekapSort.field !== 'nomor' || rekapSort.direction !== 'asc'
                        ? 'bg-[#01B6BC] border-[#01B6BC] text-white shadow-xs'
                        : 'bg-white hover:bg-[#F7F8F9] border-[#EFF1F3] text-[#363853]'
                    }`}
                  >
                    <ArrowUpDown className="w-3.5 h-3.5 shrink-0" />
                    <span>Urutkan: <strong>{currentSortLabel}</strong></span>
                    <ChevronDown className={`w-3 h-3 shrink-0 transition-transform duration-200 ${isSortPickerOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isSortPickerOpen && (
                    <div className="absolute right-0 mt-1.5 w-64 bg-white rounded-2xl border border-[#EFF1F3] p-2 z-30 shadow-lg popover-motion origin-top-right">
                      <div className="px-2.5 py-1.5 font-heading font-bold text-[10px] text-[#9A9BA9] uppercase tracking-wider border-b border-[#EFF1F3] mb-1">
                        Pilihan Urutan Data
                      </div>
                      <div className="space-y-0.5 max-h-64 overflow-y-auto">
                        {SORT_OPTIONS.map(opt => {
                          const isSelected = rekapSort.field === opt.field && rekapSort.direction === opt.direction;
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => {
                                setRekapSort({ field: opt.field, direction: opt.direction });
                                setIsSortPickerOpen(false);
                              }}
                              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-sans transition-colors text-left cursor-pointer border ${
                                isSelected
                                  ? 'bg-[#E6F8F9] text-[#019296] border-[#01B6BC] font-bold'
                                  : 'hover:bg-[#F7F8F9] text-[#363853] border-transparent font-medium'
                              }`}
                            >
                              <span>{opt.label}</span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-[#019296] shrink-0 ml-2" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Table Card (iFraldas Soft Elevation & Rounded Architecture) */}
            <div className="invo-card overflow-hidden rounded-2xl border border-[#EFF1F3] bg-white shadow-xs">
              <div className="overflow-x-auto max-h-[640px]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 z-10 bg-[#F7F8F9] border-b border-[#EFF1F3] text-[#2B2D42] font-heading font-bold text-xs select-none">
                    <tr>
                      {/* No */}
                      <th
                        role="columnheader"
                        tabIndex={0}
                        aria-sort={rekapSort.field === 'nomor' ? (rekapSort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
                        onClick={() => handleToggleSort('nomor')}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleToggleSort('nomor');
                          }
                        }}
                        className="py-3 px-3 w-14 text-center cursor-pointer hover:bg-[#E6F8F9]/50 transition-colors group/th focus-visible:outline-2 focus-visible:outline-[#01B6BC]"
                        title="Klik untuk mengurutkan nomor (1-N / N-1)"
                      >
                        <div className="inline-flex items-center gap-1 justify-center">
                          <span className={rekapSort.field === 'nomor' ? 'text-[#019296] font-black' : ''}>No</span>
                          {rekapSort.field === 'nomor' ? (
                            rekapSort.direction === 'asc' ? <ArrowUp className="w-3 h-3 text-[#019296]" /> : <ArrowDown className="w-3 h-3 text-[#019296]" />
                          ) : (
                            <ArrowUpDown className="w-2.5 h-2.5 text-[#9A9BA9] opacity-40 group-hover/th:opacity-100 transition-opacity" />
                          )}
                        </div>
                      </th>

                      {/* Tanggal */}
                      <th
                        role="columnheader"
                        tabIndex={0}
                        aria-sort={rekapSort.field === 'tanggal' ? (rekapSort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
                        onClick={() => handleToggleSort('tanggal')}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleToggleSort('tanggal');
                          }
                        }}
                        className="py-3 px-3 w-32 whitespace-nowrap cursor-pointer hover:bg-[#E6F8F9]/50 transition-colors group/th focus-visible:outline-2 focus-visible:outline-[#01B6BC]"
                        title="Klik untuk mengurutkan tanggal (Terbaru / Terlama)"
                      >
                        <div className="flex items-center gap-1">
                          <span className={rekapSort.field === 'tanggal' ? 'text-[#019296] font-black' : ''}>Tanggal</span>
                          {rekapSort.field === 'tanggal' ? (
                            rekapSort.direction === 'asc' ? <ArrowUp className="w-3 h-3 text-[#019296]" /> : <ArrowDown className="w-3 h-3 text-[#019296]" />
                          ) : (
                            <ArrowUpDown className="w-2.5 h-2.5 text-[#9A9BA9] opacity-40 group-hover/th:opacity-100 transition-opacity" />
                          )}
                        </div>
                      </th>

                      {/* Nama Kegiatan */}
                      <th
                        role="columnheader"
                        tabIndex={0}
                        aria-sort={rekapSort.field === 'kegiatan' ? (rekapSort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
                        onClick={() => handleToggleSort('kegiatan')}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleToggleSort('kegiatan');
                          }
                        }}
                        className="py-3 px-3 min-w-[240px] cursor-pointer hover:bg-[#E6F8F9]/50 transition-colors group/th focus-visible:outline-2 focus-visible:outline-[#01B6BC]"
                        title="Klik untuk mengurutkan nama kegiatan (A-Z / Z-A)"
                      >
                        <div className="flex items-center gap-1">
                          <span className={rekapSort.field === 'kegiatan' ? 'text-[#019296] font-black' : ''}>Nama Kegiatan</span>
                          {rekapSort.field === 'kegiatan' ? (
                            rekapSort.direction === 'asc' ? <ArrowUp className="w-3 h-3 text-[#019296]" /> : <ArrowDown className="w-3 h-3 text-[#019296]" />
                          ) : (
                            <ArrowUpDown className="w-2.5 h-2.5 text-[#9A9BA9] opacity-40 group-hover/th:opacity-100 transition-opacity" />
                          )}
                        </div>
                      </th>

                      {/* Lokasi */}
                      <th
                        role="columnheader"
                        tabIndex={0}
                        aria-sort={rekapSort.field === 'lokasi' ? (rekapSort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
                        onClick={() => handleToggleSort('lokasi')}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleToggleSort('lokasi');
                          }
                        }}
                        className="py-3 px-3 min-w-[150px] cursor-pointer hover:bg-[#E6F8F9]/50 transition-colors group/th focus-visible:outline-2 focus-visible:outline-[#01B6BC]"
                        title="Klik untuk mengurutkan lokasi wilayah (A-Z / Z-A)"
                      >
                        <div className="flex items-center gap-1">
                          <span className={rekapSort.field === 'lokasi' ? 'text-[#019296] font-black' : ''}>Lokasi</span>
                          {rekapSort.field === 'lokasi' ? (
                            rekapSort.direction === 'asc' ? <ArrowUp className="w-3 h-3 text-[#019296]" /> : <ArrowDown className="w-3 h-3 text-[#019296]" />
                          ) : (
                            <ArrowUpDown className="w-2.5 h-2.5 text-[#9A9BA9] opacity-40 group-hover/th:opacity-100 transition-opacity" />
                          )}
                        </div>
                      </th>

                      {/* Petugas */}
                      <th
                        role="columnheader"
                        tabIndex={0}
                        aria-sort={rekapSort.field === 'petugas' ? (rekapSort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
                        onClick={() => handleToggleSort('petugas')}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleToggleSort('petugas');
                          }
                        }}
                        className="py-3 px-3 min-w-[160px] cursor-pointer hover:bg-[#E6F8F9]/50 transition-colors group/th focus-visible:outline-2 focus-visible:outline-[#01B6BC]"
                        title="Klik untuk mengurutkan nama petugas (A-Z / Z-A)"
                      >
                        <div className="flex items-center gap-1">
                          <span className={rekapSort.field === 'petugas' ? 'text-[#019296] font-black' : ''}>Petugas</span>
                          {rekapSort.field === 'petugas' ? (
                            rekapSort.direction === 'asc' ? <ArrowUp className="w-3 h-3 text-[#019296]" /> : <ArrowDown className="w-3 h-3 text-[#019296]" />
                          ) : (
                            <ArrowUpDown className="w-2.5 h-2.5 text-[#9A9BA9] opacity-40 group-hover/th:opacity-100 transition-opacity" />
                          )}
                        </div>
                      </th>

                      {/* Berita */}
                      <th
                        role="columnheader"
                        tabIndex={0}
                        aria-sort={rekapSort.field === 'berita' ? (rekapSort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
                        onClick={() => handleToggleSort('berita')}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleToggleSort('berita');
                          }
                        }}
                        className="py-3 px-3 w-28 text-center cursor-pointer hover:bg-[#E6F8F9]/50 transition-colors group/th focus-visible:outline-2 focus-visible:outline-[#01B6BC]"
                        title="Klik untuk mengurutkan status berita (Ada / Tidak Ada)"
                      >
                        <div className="inline-flex items-center gap-1 justify-center">
                          <span className={rekapSort.field === 'berita' ? 'text-[#019296] font-black' : ''}>Berita</span>
                          {rekapSort.field === 'berita' ? (
                            rekapSort.direction === 'asc' ? <ArrowUp className="w-3 h-3 text-[#019296]" /> : <ArrowDown className="w-3 h-3 text-[#019296]" />
                          ) : (
                            <ArrowUpDown className="w-2.5 h-2.5 text-[#9A9BA9] opacity-40 group-hover/th:opacity-100 transition-opacity" />
                          )}
                        </div>
                      </th>

                      {/* Video */}
                      <th
                        role="columnheader"
                        tabIndex={0}
                        aria-sort={rekapSort.field === 'video' ? (rekapSort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
                        onClick={() => handleToggleSort('video')}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleToggleSort('video');
                          }
                        }}
                        className="py-3 px-3 w-28 text-center cursor-pointer hover:bg-[#E6F8F9]/50 transition-colors group/th focus-visible:outline-2 focus-visible:outline-[#01B6BC]"
                        title="Klik untuk mengurutkan status video (Ada / Tidak Ada)"
                      >
                        <div className="inline-flex items-center gap-1 justify-center">
                          <span className={rekapSort.field === 'video' ? 'text-[#019296] font-black' : ''}>Video</span>
                          {rekapSort.field === 'video' ? (
                            rekapSort.direction === 'asc' ? <ArrowUp className="w-3 h-3 text-[#019296]" /> : <ArrowDown className="w-3 h-3 text-[#019296]" />
                          ) : (
                            <ArrowUpDown className="w-2.5 h-2.5 text-[#9A9BA9] opacity-40 group-hover/th:opacity-100 transition-opacity" />
                          )}
                        </div>
                      </th>

                      <th className="py-3 px-3 w-16 text-center font-heading font-bold text-xs">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EFF1F3] bg-white">
                    {sortedRekapResults.map(item => {
                      const hasNews = item.ada_berita && item.link_berita;
                      const hasVideo = item.ada_video && (item.link_video || (item.link_videos && item.link_videos.length > 0));
                      const videoNeedsCheck = item.ada_video && !hasVideo;

                      return (
                        <tr
                          key={item.id}
                          role="button"
                          tabIndex={0}
                          aria-label={`Detail kegiatan nomor ${cleanNomor(item.nomor)}: ${item.kegiatan}`}
                          onClick={() => setSelectedDetailItem(item)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              setSelectedDetailItem(item);
                            }
                          }}
                          className="hover:bg-[#E6F8F9]/20 cursor-pointer transition-colors group focus-visible:outline-2 focus-visible:outline-[#01B6BC]"
                        >
                          <td className="py-2.5 px-3 text-center">
                            <span className="px-2 py-0.5 rounded-full bg-[#E6F8F9] text-[#019296] font-heading font-black text-xs inline-block">
                              #{cleanNomor(item.nomor)}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap font-sans text-xs text-[#9A9BA9]">
                            {item.tanggal_formatted || item.tanggal}
                          </td>
                          <td className="py-2.5 px-3 font-sans font-semibold text-xs text-[#2B2D42] leading-snug group-hover:text-[#01B6BC] transition-colors">
                            {item.kegiatan}
                          </td>
                          <td className="py-2.5 px-3 font-sans text-xs text-[#9A9BA9]">
                            {item.lokasi || '-'}
                          </td>
                          
                          {/* Petugas: Max 2 names + '+N' chip to maintain uniform row height */}
                          <td className="py-2.5 px-3">
                            <div className="flex flex-wrap items-center gap-1">
                              {item.petugas.slice(0, 2).map((o, idx) => (
                                <button
                                  type="button"
                                  key={idx}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleOfficer(o);
                                  }}
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-sans cursor-pointer transition-colors border ${
                                    selectedOfficers.includes(o)
                                      ? 'bg-[#F0EEF9] text-[#6F69D2] border-[#E2E1F6] font-bold'
                                      : 'bg-[#F7F8F9] hover:bg-[#E6F8F9] text-[#363853] hover:text-[#019296] border-[#EFF1F3]'
                                  }`}
                                  title="Klik untuk memfilter personil ini"
                                  aria-label={`Filter kegiatan petugas ${o}`}
                                >
                                  {o}
                                </button>
                              ))}
                              {item.petugas.length > 2 && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedDetailItem(item);
                                  }}
                                  className="px-2 py-0.5 rounded-full text-[10px] font-sans font-bold bg-[#E6F8F9] text-[#019296] border border-[#B3E9EB] hover:bg-[#CCF0F2] transition-colors cursor-pointer"
                                  title={item.petugas.slice(2).join(', ')}
                                >
                                  +{item.petugas.length - 2}
                                </button>
                              )}
                              {item.petugas.length === 0 && (
                                <span className="text-[#9A9BA9] italic font-sans text-[10px]">-</span>
                              )}
                            </div>
                          </td>

                          {/* Kolom Berita: Hanya Tercantum saja */}
                          <td className="py-2.5 px-3 text-center">
                            {hasNews ? (
                              <a
                                href={item.link_berita}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                title={item.judul_berita || 'Buka rilis resmi pkp.go.id'}
                                className="inline-flex items-center gap-1 font-sans text-[10px] font-bold text-[#16A34A] bg-[#F0FDF4] hover:bg-[#DCFCE7] border border-[#BBF7D0] px-2.5 py-0.5 rounded-full transition-colors"
                              >
                                <CheckCircle2 className="w-3 h-3 shrink-0" />
                                <span>Tercantum</span>
                              </a>
                            ) : item.ada_berita ? (
                              <span className="inline-flex items-center gap-1 font-sans text-[10px] font-semibold text-[#D97706] bg-[#FFFBEB] border border-[#FDE68A] px-2 py-0.5 rounded-full">
                                <AlertCircle className="w-3 h-3 text-[#D97706] shrink-0" />
                                <span>Perlu Cek</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 font-sans text-[10px] text-[#9A9BA9] px-2 py-0.5">
                                <Minus className="w-3 h-3 text-[#9A9BA9] shrink-0" />
                                <span>Tidak Ada</span>
                              </span>
                            )}
                          </td>

                          {/* Kolom Video: Multi-Video or Single Video */}
                          <td className="py-2.5 px-3 text-center">
                            {hasVideo ? (
                              item.link_videos && item.link_videos.length > 1 ? (
                                <div className="inline-flex items-center gap-1 justify-center flex-wrap" onClick={(e) => e.stopPropagation()}>
                                  {item.link_videos.map((vUrl, idx) => (
                                    <a
                                      key={idx}
                                      href={vUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-0.5 font-sans font-bold text-[10px] text-[#019296] bg-[#E6F8F9] border border-[#B3E9EB] hover:bg-[#CCF0F2] px-2 py-0.5 rounded-full transition-colors"
                                      title={`Video ${idx + 1}: ${vUrl}`}
                                    >
                                      <Video className="w-2.5 h-2.5" />
                                      <span>V{idx + 1}</span>
                                      <ArrowUpRight className="w-2 h-2 opacity-60" />
                                    </a>
                                  ))}
                                </div>
                              ) : (
                                <a
                                  href={item.link_video || item.link_videos?.[0]}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-flex items-center gap-1 font-sans font-bold text-[10px] text-[#019296] bg-[#E6F8F9] border border-[#B3E9EB] hover:bg-[#CCF0F2] px-2.5 py-0.5 rounded-full transition-colors"
                                  title="Buka tautan video liputan"
                                >
                                  <Video className="w-3 h-3" />
                                  <span>Tercantum</span>
                                  <ArrowUpRight className="w-2.5 h-2.5 opacity-60" />
                                </a>
                              )
                            ) : videoNeedsCheck ? (
                              <span className="inline-flex items-center gap-1 font-sans text-[10px] font-semibold text-[#D97706] bg-[#FFFBEB] border border-[#FDE68A] px-2 py-0.5 rounded-full">
                                <AlertCircle className="w-3 h-3 text-[#D97706]" />
                                <span>Perlu Cek</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 font-sans text-[10px] text-[#9A9BA9] px-2 py-0.5">
                                <Minus className="w-3 h-3 text-[#9A9BA9]" />
                                <span>Tidak Ada</span>
                              </span>
                            )}
                          </td>

                          {/* Kolom Aksi: Indikator Buka Detail */}
                          <td className="py-2.5 px-3 text-center">
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#F7F8F9] group-hover:bg-[#01B6BC] text-[#9A9BA9] group-hover:text-white transition-all shadow-xs">
                              <ChevronRight className="w-3.5 h-3.5" />
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* ======================================================== */}
        {/* ======================================================== */}
        {/* VIEW 4: TIM PELIPUTAN (25 PERSONIL WITH AVATARS & BARS)  */}
        {/* ======================================================== */}
        {currentMenu === 'tim' && (
          <div className="space-y-4 page-transition">
            <div className="invo-card p-4 sm:p-6 rounded-2xl border border-[#EFF1F3] bg-white shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-[#EFF1F3]">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={goBack}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-sans font-semibold text-[#019296] bg-[#E6F8F9] hover:bg-[#CCF0F2] rounded-full border border-[#B3E9EB] transition-colors cursor-pointer select-none"
                    title="Kembali"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Kembali</span>
                  </button>
                  <div>
                    <h3 className="text-base sm:text-lg font-heading font-black text-[#2B2D42] leading-tight">
                      Tim Peliputan
                    </h3>
                    <p className="text-[11px] font-sans text-[#9A9BA9]">
                      Arsip personil liputan Biro Komunikasi Publik PKP
                    </p>
                  </div>
                </div>
                <div className="font-sans text-xs font-bold bg-[#F0EEF9] text-[#6F69D2] border border-[#E2E1F6] px-3.5 py-1.5 rounded-full self-start sm:self-auto shadow-xs">
                  Total {officerStats.length} Personil
                </div>
              </div>

              {/* 25 Personil Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
                {officerStats.map((officer, index) => {
                  const peakM = officerPeakMonths[officer.name] || 'Juli';

                  return (
                    <div
                      key={officer.name}
                      onClick={() => {
                        setSelectedOfficers([officer.name]);
                        setCurrentMenu('rekapitulasi');
                      }}
                      className="invo-card invo-card-hover p-4 cursor-pointer group flex flex-col justify-between motion-card-enter rounded-2xl border border-[#EFF1F3] hover:border-[#B3E9EB] bg-white shadow-xs transition-all"
                    >
                      <div>
                        {/* Top Row: Initials avatar + Rank */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#01B6BC] to-[#6F69D2] text-white font-heading font-black text-xs flex items-center justify-center shadow-xs">
                              {getInitials(officer.name)}
                            </div>
                            <div>
                              <h4 className="text-sm font-heading font-bold text-[#2B2D42] group-hover:text-[#01B6BC] transition-colors">
                                {officer.name}
                              </h4>
                              <p className="font-sans text-[11px] text-[#9A9BA9]">
                                Teraktif: <span className="text-[#019296] font-semibold">{peakM}</span>
                              </p>
                            </div>
                          </div>

                          <span className="font-sans text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#F7F8F9] text-[#363853] border border-[#EFF1F3]">
                            #{index + 1}
                          </span>
                        </div>

                        {/* Total Penugasan */}
                        <div className="flex items-center justify-between my-2 font-sans text-xs">
                          <span className="text-[#9A9BA9] font-medium text-[11px]">Penugasan</span>
                          <span className="text-[#019296] font-bold bg-[#E6F8F9] border border-[#B3E9EB] px-2.5 py-0.5 rounded-full">
                            {officer.count} kegiatan
                          </span>
                        </div>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-[#EFF1F3] flex items-center justify-between font-sans text-[11px] text-[#9A9BA9]">
                        <span>Peringkat #{index + 1}</span>
                        <span className="text-[#01B6BC] font-semibold group-hover:underline inline-flex items-center gap-0.5">
                          Lihat Kegiatan <ChevronRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW 5: LAPORAN (UNDER MAINTENANCE)                      */}
        {/* ======================================================== */}
        {currentMenu === 'laporan' && (
          <div className="max-w-2xl mx-auto py-8 page-transition">
            <div className="invo-card p-6 sm:p-10 text-center rounded-2xl border border-[#EFF1F3] bg-white shadow-xs">
              <div className="w-14 h-14 bg-[#FFFBF0] text-[#EFB100] border border-[#FDE68A] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xs">
                <Wrench className="w-7 h-7" />
              </div>
              <span className="inline-block font-sans text-xs font-bold px-3 py-1 border border-[#FDE68A] bg-[#FFFBF0] text-[#B88600] rounded-full mb-3">
                Sedang Disiapkan
              </span>
              <h3 className="text-xl font-heading font-black text-[#2B2D42]">
                Modul Laporan Berkala Pimpinan
              </h3>
              <p className="text-xs text-[#9A9BA9] mt-2 max-w-sm mx-auto leading-relaxed font-sans">
                Fitur format laporan berkala resmi periodik untuk pimpinan sedang diintegrasikan.
              </p>

              <button
                type="button"
                onClick={goBack}
                className="mt-6 px-5 py-2.5 rounded-full bg-[#01B6BC] hover:bg-[#019296] text-white font-sans text-xs font-bold shadow-xs hover:shadow transition-all inline-flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Kembali</span>
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW 6: BERITA (KLIPING & RILIS PERS RESMI)              */}
        {/* ======================================================== */}
        {currentMenu === 'berita' && (
          <div className="space-y-4 page-transition">
            
            {/* Top Card: Filter Bar, Year Selector, Search & Statistics */}
            <div className="invo-card p-4 sm:p-6 rounded-2xl border border-[#EFF1F3] bg-white shadow-xs">
              
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-[#EFF1F3]">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={goBack}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-sans font-semibold text-[#019296] bg-[#E6F8F9] hover:bg-[#CCF0F2] rounded-full border border-[#B3E9EB] transition-colors cursor-pointer select-none"
                    title="Kembali"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Kembali</span>
                  </button>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#01B6BC]" aria-hidden="true"></span>
                      <h2 className="text-base sm:text-lg font-heading font-black text-[#2B2D42] tracking-tight">
                        Kliping & Rilis Berita Pers
                      </h2>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-sans font-bold bg-[#E6F8F9] text-[#019296] border border-[#B3E9EB]">
                        {filteredNews.length} Rilis
                      </span>
                    </div>
                    <p className="text-[11px] font-sans text-[#9A9BA9]">
                      Arsip rilis pers resmi Biro Komunikasi Publik PKP (pkp.go.id)
                    </p>
                  </div>
                </div>

                {/* Year Switcher Pills */}
                <div className="flex items-center gap-1 bg-[#F7F8F9] p-1 rounded-full self-start md:self-auto border border-[#EFF1F3]">
                  {['2026', '2025', '2024', 'all'].map(year => {
                    const isSelected = selectedNewsYear === year;
                    const label = year === 'all' ? 'Semua Tahun' : year;

                    return (
                      <button
                        key={year}
                        type="button"
                        onClick={() => {
                          setSelectedNewsYear(year);
                          setNewsLimit(30);
                        }}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-sans transition-all duration-150 cursor-pointer ${
                          isSelected
                            ? 'bg-[#01B6BC] text-white shadow-xs font-bold'
                            : 'text-[#9A9BA9] hover:text-[#2B2D42] hover:bg-white/60 font-medium'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Statistics Metric Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-4 border-b border-[#EFF1F3]">
                <div className="p-4 rounded-xl bg-[#F7F8F9] border border-[#EFF1F3]">
                  <div className="text-[11px] font-sans font-bold text-[#9A9BA9] uppercase tracking-wider">
                    Total Berita Terdata
                  </div>
                  <div className="text-2xl font-heading font-black text-[#2B2D42] mt-1">
                    {newsStats.totalCount.toLocaleString('id-ID')}
                  </div>
                  <div className="text-[11px] font-sans text-[#9A9BA9] mt-0.5">
                    Tahun {selectedNewsYear === 'all' ? '2024 - 2026' : selectedNewsYear}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#F7F8F9] border border-[#EFF1F3]">
                  <div className="text-[11px] font-sans font-bold text-[#9A9BA9] uppercase tracking-wider">
                    Akumulasi Pembaca
                  </div>
                  <div className="text-2xl font-heading font-black text-[#2B2D42] mt-1">
                    {newsStats.totalReaders.toLocaleString('id-ID')}
                  </div>
                  <div className="text-[11px] font-sans text-[#9A9BA9] mt-0.5">
                    Total views di pkp.go.id
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#F7F8F9] border border-[#EFF1F3]">
                  <div className="text-[11px] font-sans font-bold text-[#9A9BA9] uppercase tracking-wider">
                    Rata-Rata Pembaca
                  </div>
                  <div className="text-2xl font-heading font-black text-[#2B2D42] mt-1">
                    {newsStats.avgReaders.toLocaleString('id-ID')}
                  </div>
                  <div className="text-[11px] font-sans text-[#9A9BA9] mt-0.5">
                    Per rilis berita
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#F7F8F9] border border-[#EFF1F3]">
                  <div className="text-[11px] font-sans font-bold text-[#9A9BA9] uppercase tracking-wider">
                    Paling Banyak Dibaca
                  </div>
                  <div className="text-2xl font-heading font-black text-[#2B2D42] mt-1 truncate">
                    {newsStats.topArticle ? (newsStats.topArticle.pembaca || 0).toLocaleString('id-ID') : 0}
                  </div>
                  <div className="text-[11px] font-sans text-[#9A9BA9] truncate mt-0.5" title={newsStats.topArticle?.judul}>
                    {newsStats.topArticle ? newsStats.topArticle.judul : '-'}
                  </div>
                </div>
              </div>

              {/* Search & Sort Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9A9BA9] pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Cari rilis berita berdasarkan topik, kata kunci, nama menteri, daerah..."
                    value={newsSearch}
                    onChange={(e) => {
                      setNewsSearch(e.target.value);
                      setNewsLimit(30);
                    }}
                    className="w-full pl-10 pr-9 py-2 bg-[#F7F8F9] focus:bg-white border border-[#EFF1F3] focus:border-[#01B6BC] rounded-full text-[#363853] text-xs font-sans focus:outline-none transition-all placeholder:text-[#9A9BA9]"
                  />
                  {newsSearch && (
                    <button
                      onClick={() => setNewsSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#9A9BA9] hover:text-[#2B2D42]"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Custom Sort Popover */}
                <div className="relative shrink-0" ref={newsSortPickerRef}>
                  <div className="flex items-center gap-1.5">
                    <span className="font-sans text-xs text-[#9A9BA9] hidden sm:inline">Urutkan:</span>
                    <button
                      type="button"
                      onClick={() => setIsNewsSortPickerOpen(!isNewsSortPickerOpen)}
                      className="bg-white hover:bg-[#F7F8F9] border border-[#EFF1F3] rounded-full px-3.5 py-2 text-xs font-sans font-semibold text-[#363853] flex items-center justify-between gap-2 shadow-xs transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-1.5">
                        {newsSort === 'newest' && <Clock className="w-3.5 h-3.5 text-[#019296]" />}
                        {newsSort === 'popular' && <Flame className="w-3.5 h-3.5 text-[#FF395B]" />}
                        {newsSort === 'oldest' && <RotateCcw className="w-3.5 h-3.5 text-[#6F69D2]" />}
                        <span>
                          {newsSort === 'newest' ? 'Terbaru' : newsSort === 'popular' ? 'Terpopuler' : 'Terlama'}
                        </span>
                      </div>
                      <ChevronDown className={`w-3.5 h-3.5 text-[#9A9BA9] shrink-0 transition-transform duration-200 ${isNewsSortPickerOpen ? 'rotate-180' : ''}`} />
                    </button>
                  </div>

                  {isNewsSortPickerOpen && (
                    <div className="absolute right-0 mt-1.5 w-64 bg-white rounded-2xl border border-[#EFF1F3] p-2 z-30 shadow-lg popover-motion origin-top-right">
                      <div className="px-2.5 py-1.5 font-heading font-bold text-[10px] text-[#9A9BA9] uppercase tracking-wider border-b border-[#EFF1F3] mb-1">
                        Urutan Tampilan Berita
                      </div>
                      <div className="space-y-0.5">
                        {[
                          { id: 'newest', label: 'Terbaru', desc: 'Sesuai tanggal tayang rilis berita', icon: Clock },
                          { id: 'popular', label: 'Terpopuler', desc: 'Jumlah pembaca artikel terbanyak', icon: Flame },
                          { id: 'oldest', label: 'Terlama', desc: 'Mulai dari awal tahun rilis', icon: RotateCcw }
                        ].map(opt => {
                          const isSelected = newsSort === opt.id;
                          const IconComp = opt.icon;
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => {
                                setNewsSort(opt.id);
                                setIsNewsSortPickerOpen(false);
                              }}
                              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition-colors text-left cursor-pointer border ${
                                isSelected
                                  ? 'bg-[#E6F8F9] text-[#019296] border-[#01B6BC] font-bold'
                                  : 'hover:bg-[#F7F8F9] text-[#363853] border-transparent font-medium'
                              }`}
                            >
                              <div className="flex items-start gap-2">
                                <IconComp className="w-4 h-4 mt-0.5 shrink-0" />
                                <div>
                                  <div className="font-heading font-bold text-xs">{opt.label}</div>
                                  <div className={`text-[10px] font-sans ${isSelected ? 'text-[#019296]/80' : 'text-[#9A9BA9]'}`}>{opt.desc}</div>
                                </div>
                              </div>
                              {isSelected && <Check className="w-3.5 h-3.5 text-[#019296] shrink-0 ml-2" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Popular Topic Chips */}
              <div className="flex items-center gap-1.5 flex-wrap mt-3 text-xs">
                <span className="font-sans text-[#9A9BA9] font-medium text-[11px]">Topik populer:</span>
                {['Rusun', 'BSPS', 'Maruarar', 'Fahri Hamzah', 'KPP', 'Wisma Atlet', 'BPS', 'Bencana', 'Jakarta'].map(chip => (
                  <button
                    key={chip}
                    onClick={() => {
                      setNewsSearch(chip);
                      setNewsLimit(30);
                    }}
                    className={`px-3 py-1 rounded-full font-sans text-xs transition-colors cursor-pointer border ${
                      newsSearch === chip
                        ? 'bg-[#01B6BC] text-white border-[#01B6BC] font-bold shadow-xs'
                        : 'bg-[#F7F8F9] hover:bg-[#E6F8F9] text-[#363853] hover:text-[#019296] border-[#EFF1F3] hover:border-[#B3E9EB]'
                    }`}
                  >
                    {chip}
                  </button>
                ))}
                {newsSearch && (
                  <button
                    onClick={() => setNewsSearch('')}
                    className="font-sans text-xs text-[#01B6BC] hover:underline font-bold ml-1 cursor-pointer"
                  >
                    Hapus Filter
                  </button>
                )}
              </div>

            </div>

            {/* News Cards Feed */}
            {displayedNews.length === 0 ? (
              <div className="invo-card p-10 text-center space-y-2 border border-dashed border-[#EFF1F3] rounded-2xl bg-white">
                <BookOpen className="w-8 h-8 text-[#9A9BA9] mx-auto" aria-hidden="true" />
                <h4 className="font-heading font-bold text-sm text-[#2B2D42]">Tidak ada rilis berita yang cocok</h4>
                <p className="text-xs text-[#9A9BA9] max-w-sm mx-auto font-sans">Coba gunakan kata kunci lain atau pilih tab tahun yang berbeda.</p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setNewsSearch('');
                      setSelectedNewsYear('2026');
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-[#B3E9EB] bg-[#E6F8F9] hover:bg-[#CCF0F2] text-[#019296] font-sans text-xs font-bold transition-colors cursor-pointer"
                  >
                    Reset Filter Berita
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {displayedNews.map(item => (
                  <div
                    key={item.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedNewsDetail(item)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedNewsDetail(item);
                      }
                    }}
                    aria-label={`Detail rilis berita: ${item.judul}`}
                    className="invo-card invo-card-hover p-4 sm:p-5 flex flex-col justify-between group motion-card-enter cursor-pointer rounded-2xl border border-[#EFF1F3] hover:border-[#B3E9EB] bg-white shadow-xs hover:shadow-md transition-all focus-visible:outline-2 focus-visible:outline-[#01B6BC]"
                  >
                    <div>
                      {/* Top Meta Row */}
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="px-2.5 py-0.5 rounded-full bg-[#E6F8F9] text-[#019296] font-heading font-black text-xs">
                            {item.tahun}
                          </span>
                          <span className="font-sans text-[#9A9BA9] flex items-center gap-1.5 text-xs">
                            <Calendar className="w-3.5 h-3.5 text-[#9A9BA9]" />
                            {item.tanggal_formatted}
                          </span>
                          {item.lokasi && (
                            <span className="font-sans text-[#9A9BA9] flex items-center gap-1 text-xs">
                              <MapPin className="w-3 h-3 text-[#9A9BA9]" />
                              {item.lokasi}
                            </span>
                          )}
                        </div>

                        {/* Engagement Metric */}
                        {item.pembaca > 0 && (
                          <div className="flex items-center gap-1 font-sans text-xs font-semibold text-[#6F69D2] bg-[#F0EEF9] border border-[#E2E1F6] px-2.5 py-0.5 rounded-full">
                            <Eye className="w-3.5 h-3.5 text-[#6F69D2]" />
                            <span>{item.pembaca.toLocaleString('id-ID')} Pembaca</span>
                          </div>
                        )}
                      </div>

                      {/* Title */}
                      <h3 className="text-sm sm:text-base font-heading font-bold text-[#2B2D42] group-hover:text-[#01B6BC] transition-colors leading-snug">
                        {item.judul}
                      </h3>

                      {/* Lead Paragraph / Summary */}
                      {item.ringkasan && (
                        <p className="text-xs text-[#363853] font-sans line-clamp-2 leading-relaxed mt-2">
                          {item.ringkasan}
                        </p>
                      )}
                    </div>

                    {/* Bottom Actions Row */}
                    <div className="mt-3.5 pt-3 border-t border-[#EFF1F3] flex items-center justify-between text-xs gap-2">
                      <div className="flex items-center gap-2">
                        {item.link && (
                          <a
                            href={item.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-full border border-[#EFF1F3] bg-[#F7F8F9] hover:bg-[#E6F8F9] text-[#363853] hover:text-[#019296] font-sans font-semibold text-xs transition-colors"
                          >
                            <span>pkp.go.id</span>
                            <ArrowUpRight className="w-3 h-3" />
                          </a>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          copyNewsWA(item);
                        }}
                        className="px-3 py-1 rounded-full border border-[#EFF1F3] bg-white hover:bg-[#F7F8F9] text-[#9A9BA9] hover:text-[#363853] transition-colors flex items-center gap-1 font-sans text-xs font-medium cursor-pointer"
                        title="Salin ringkasan rilis untuk WhatsApp"
                      >
                        {newsCopyStatus[item.id] ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-[#019296]" />
                            <span className="text-[#019296] font-bold">Tersalin</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Salin WA</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}

                {/* Load More Button */}
                {displayedNews.length < filteredNews.length && (
                  <div className="text-center pt-2 pb-4">
                    <button
                      type="button"
                      onClick={() => setNewsLimit(prev => prev + 30)}
                      className="px-6 py-2.5 rounded-full bg-white hover:bg-[#E6F8F9] border border-[#B3E9EB] text-[#019296] font-sans font-bold text-xs shadow-xs hover:shadow transition-all cursor-pointer"
                    >
                      Muat Lebih Banyak ({filteredNews.length - displayedNews.length} berita lagi)
                    </button>
                  </div>
                )}
              </div>
            )}

          </div>
        )}

      </main>

      {/* ======================================================== */}
      {/* DETAIL SLIDE-OVER DRAWER (RIGHT PANEL 480PX)             */}
      {/* ======================================================== */}
      {selectedDetailItem && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div 
            onClick={() => setSelectedDetailItem(null)}
            className="fixed inset-0 bg-[#2B2D42]/40 backdrop-blur-xs drawer-backdrop"
          />

          {/* Drawer Container */}
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Detail Kegiatan Nomor ${cleanNomor(selectedDetailItem.nomor)}: ${selectedDetailItem.kegiatan}`}
            className="relative w-full max-w-[480px] bg-white h-full shadow-2xl border-l border-[#EFF1F3] flex flex-col z-10 drawer-slide-in overflow-hidden rounded-l-2xl"
          >
            
            {/* Header with Back button */}
            <div className="p-4 border-b border-[#EFF1F3] flex items-center justify-between bg-[#F7F8F9]">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedDetailItem(null)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-sans font-semibold text-[#019296] bg-white hover:bg-[#E6F8F9] border border-[#B3E9EB] transition-colors cursor-pointer select-none"
                  title="Kembali"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Kembali</span>
                </button>
                <span className="px-2.5 py-0.5 rounded-full bg-[#E6F8F9] text-[#019296] text-xs font-heading font-black">
                  #{cleanNomor(selectedDetailItem.nomor)}
                </span>
                <h3 className="text-sm font-heading font-bold text-[#2B2D42] truncate">
                  Detail Kegiatan
                </h3>
              </div>
              <button
                type="button"
                aria-label="Tutup panel detail kegiatan"
                onClick={() => setSelectedDetailItem(null)}
                className="p-1.5 text-[#9A9BA9] hover:text-[#2B2D42] hover:bg-white rounded-full transition-colors cursor-pointer"
                title="Tutup (Esc)"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
              
              {/* Tanggal & Lokasi */}
              <div className="grid grid-cols-2 gap-3 p-4 bg-[#F7F8F9] rounded-xl border border-[#EFF1F3]">
                <div>
                  <span className="text-[11px] font-sans font-bold text-[#9A9BA9] uppercase tracking-wider block mb-0.5">
                    Tanggal Kegiatan
                  </span>
                  <span className="font-sans font-bold text-xs text-[#2B2D42]">
                    {selectedDetailItem.tanggal_formatted || selectedDetailItem.tanggal}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] font-sans font-bold text-[#9A9BA9] uppercase tracking-wider block mb-0.5">
                    Wilayah / Provinsi
                  </span>
                  <span className="font-sans font-bold text-xs text-[#2B2D42]">
                    {selectedDetailItem.provinsi || '-'}
                  </span>
                </div>
              </div>

              {/* Nama Kegiatan */}
              <div>
                <span className="text-[11px] font-sans font-bold text-[#9A9BA9] uppercase tracking-wider block mb-1">
                  Nama Agenda / Kegiatan
                </span>
                <h4 className="text-sm sm:text-base font-heading font-bold text-[#2B2D42] leading-snug">
                  {selectedDetailItem.kegiatan}
                </h4>
                {selectedDetailItem.lokasi && (
                  <p className="font-sans text-xs text-[#9A9BA9] mt-1.5 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#9A9BA9] shrink-0" />
                    <span>{selectedDetailItem.lokasi}</span>
                  </p>
                )}
              </div>

              {/* Status Rilis Berita */}
              <div className="p-4 rounded-xl border border-[#EFF1F3] bg-white space-y-2 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-heading font-bold text-xs text-[#2B2D42]">
                    <Newspaper className="w-4 h-4 text-[#01B6BC]" />
                    <span>Publikasi Berita</span>
                  </div>
                  {selectedDetailItem.ada_berita && selectedDetailItem.link_berita ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-sans font-bold bg-[#F0FDF4] text-[#16A34A] border border-[#BBF7D0]">
                      <CheckCircle2 className="w-3 h-3 text-[#16A34A]" />
                      <span>Tercantum</span>
                    </span>
                  ) : selectedDetailItem.ada_berita ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-sans font-semibold bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A]">
                      <AlertCircle className="w-3 h-3 text-[#D97706]" />
                      <span>Perlu Cek</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-sans text-[#9A9BA9] bg-transparent">
                      <Minus className="w-3 h-3 text-[#9A9BA9]" />
                      <span>Belum Ada</span>
                    </span>
                  )}
                </div>

                {selectedDetailItem.judul_berita && (
                  <p className="font-sans font-semibold text-xs text-[#2B2D42] leading-relaxed bg-[#F7F8F9] p-3 rounded-xl border border-[#EFF1F3]">
                    {selectedDetailItem.judul_berita}
                  </p>
                )}

                {selectedDetailItem.link_berita && (
                  <a
                    href={selectedDetailItem.link_berita}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 font-sans text-xs font-bold text-[#01B6BC] hover:underline"
                  >
                    <span>Buka Rilis Resmi di pkp.go.id</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>

              {/* Status Publikasi Video */}
              <div className="p-4 rounded-xl border border-[#EFF1F3] bg-white space-y-2 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-heading font-bold text-xs text-[#2B2D42]">
                    <Video className="w-4 h-4 text-[#01B6BC]" />
                    <span>Publikasi Video Liputan</span>
                  </div>
                  {selectedDetailItem.ada_video && (selectedDetailItem.link_video || (selectedDetailItem.link_videos && selectedDetailItem.link_videos.length > 0)) ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-sans font-bold bg-[#E6F8F9] text-[#019296] border border-[#B3E9EB]">
                      <CheckCircle2 className="w-3 h-3 text-[#019296]" />
                      <span>
                        {selectedDetailItem.link_videos && selectedDetailItem.link_videos.length > 1
                          ? `${selectedDetailItem.link_videos.length} Video`
                          : 'Tercantum'}
                      </span>
                    </span>
                  ) : selectedDetailItem.ada_video ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-sans font-semibold bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A]">
                      <AlertCircle className="w-3 h-3 text-[#D97706]" />
                      <span>Perlu Cek</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-sans text-[#9A9BA9] bg-transparent">
                      <Minus className="w-3 h-3 text-[#9A9BA9]" />
                      <span>Belum Ada</span>
                    </span>
                  )}
                </div>

                {selectedDetailItem.link_videos && selectedDetailItem.link_videos.length > 1 ? (
                  <div className="space-y-1.5 pt-1">
                    {selectedDetailItem.link_videos.map((vUrl, idx) => (
                      <a
                        key={idx}
                        href={vUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-2.5 rounded-xl bg-[#F7F8F9] hover:bg-[#E6F8F9] border border-[#EFF1F3] hover:border-[#B3E9EB] text-[#019296] font-sans font-semibold text-xs transition-colors"
                      >
                        <span className="flex items-center gap-2 truncate">
                          <Video className="w-3.5 h-3.5 text-[#01B6BC] shrink-0" />
                          <span>Tautan Video {idx + 1}</span>
                        </span>
                        <ExternalLink className="w-3.5 h-3.5 shrink-0 opacity-70" />
                      </a>
                    ))}
                  </div>
                ) : (selectedDetailItem.link_video || (selectedDetailItem.link_videos && selectedDetailItem.link_videos.length > 0)) ? (
                  <a
                    href={selectedDetailItem.link_video || selectedDetailItem.link_videos[0]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 font-sans text-xs font-bold text-[#01B6BC] hover:underline"
                  >
                    <span>Buka Tautan Video</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                ) : null}
              </div>

              {/* Daftar Petugas */}
              <div>
                <span className="text-[11px] font-sans font-bold text-[#9A9BA9] uppercase tracking-wider block mb-2">
                  Petugas Liputan yang Bertugas
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedDetailItem.petugas.length > 0 ? (
                    selectedDetailItem.petugas.map((officer, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 rounded-full bg-[#F7F8F9] border border-[#EFF1F3] text-[#363853] font-sans text-xs font-medium"
                      >
                        {officer}
                      </span>
                    ))
                  ) : (
                    <span className="font-sans text-[#9A9BA9] italic text-xs">Petugas belum tercatat</span>
                  )}
                </div>
              </div>

            </div>

            {/* Footer with Salin Format WA & Back Button */}
            <div className="p-4 border-t border-[#EFF1F3] bg-[#F7F8F9] flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedDetailItem(null)}
                className="px-4 py-2.5 rounded-full text-xs font-sans font-semibold text-[#363853] bg-white hover:bg-[#EFF1F3] border border-[#EFF1F3] transition-colors inline-flex items-center gap-1.5 shrink-0 cursor-pointer select-none"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Kembali</span>
              </button>
              <button
                type="button"
                onClick={() => copyReport(selectedDetailItem)}
                className={`flex-1 h-10 rounded-full font-sans text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs ${
                  copyStatus[selectedDetailItem.id]
                    ? 'bg-[#22C55E] text-white shadow'
                    : 'bg-[#01B6BC] hover:bg-[#019296] text-white hover:shadow'
                }`}
              >
                {copyStatus[selectedDetailItem.id] ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Format Laporan WA Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Salin Format Laporan WA</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* DETAIL NEWS SLIDE-OVER DRAWER (RIGHT PANEL 560PX)        */}
      {/* ======================================================== */}
      {selectedNewsDetail && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div 
            onClick={() => setSelectedNewsDetail(null)}
            className="fixed inset-0 bg-[#2B2D42]/40 backdrop-blur-xs drawer-backdrop"
          />

          {/* Drawer Container */}
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Detail Rilis Berita: ${selectedNewsDetail.judul}`}
            className="relative w-full max-w-[560px] bg-white h-full shadow-2xl border-l border-[#EFF1F3] flex flex-col z-10 drawer-slide-in overflow-hidden rounded-l-2xl"
          >
            
            {/* Header with Back button */}
            <div className="p-4 border-b border-[#EFF1F3] flex items-center justify-between bg-[#F7F8F9]">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedNewsDetail(null)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-sans font-semibold text-[#019296] bg-white hover:bg-[#E6F8F9] border border-[#B3E9EB] transition-colors cursor-pointer select-none"
                  title="Kembali"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Kembali</span>
                </button>
                <span className="px-2.5 py-0.5 rounded-full bg-[#E6F8F9] text-[#019296] text-xs font-heading font-black">
                  {selectedNewsDetail.tahun}
                </span>
                <h3 className="text-sm font-heading font-bold text-[#2B2D42] truncate">
                  Rilis Berita Resmi
                </h3>
              </div>
              <button
                type="button"
                aria-label="Tutup panel detail berita"
                onClick={() => setSelectedNewsDetail(null)}
                className="p-1.5 text-[#9A9BA9] hover:text-[#2B2D42] hover:bg-white rounded-full transition-colors cursor-pointer"
                title="Tutup (Esc)"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
              
              {/* Meta Stats Pill */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 font-sans text-xs text-[#363853] bg-[#F7F8F9] border border-[#EFF1F3] px-3 py-1 rounded-full">
                  <Calendar className="w-3.5 h-3.5 text-[#9A9BA9]" />
                  {selectedNewsDetail.tanggal_formatted}
                </span>
                {selectedNewsDetail.lokasi && (
                  <span className="inline-flex items-center gap-1 font-sans text-xs text-[#363853] bg-[#F7F8F9] border border-[#EFF1F3] px-3 py-1 rounded-full">
                    <MapPin className="w-3.5 h-3.5 text-[#9A9BA9]" />
                    {selectedNewsDetail.lokasi}
                  </span>
                )}
                {selectedNewsDetail.pembaca > 0 && (
                  <span className="inline-flex items-center gap-1 font-sans text-xs font-semibold text-[#6F69D2] bg-[#F0EEF9] border border-[#E2E1F6] px-3 py-1 rounded-full">
                    <Eye className="w-3.5 h-3.5 text-[#6F69D2]" />
                    {selectedNewsDetail.pembaca.toLocaleString('id-ID')} Pembaca
                  </span>
                )}
              </div>

              {/* Title */}
              <h2 className="text-base sm:text-lg font-heading font-bold text-[#2B2D42] leading-snug">
                {selectedNewsDetail.judul}
              </h2>

              {/* Ringkasan / Lead paragraph */}
              {selectedNewsDetail.ringkasan && (
                <div className="p-4 rounded-xl bg-[#F7F8F9] border-l-4 border-[#01B6BC] border-y border-r border-[#EFF1F3] text-[#363853] text-xs leading-relaxed font-sans">
                  <span className="text-[11px] font-sans font-bold text-[#019296] uppercase tracking-wider block mb-1">
                    Ringkasan Berita
                  </span>
                  {selectedNewsDetail.ringkasan}
                </div>
              )}

              {/* Full Body Article */}
              <div className="space-y-3 pt-2 text-[#363853] leading-relaxed text-xs font-sans">
                <span className="text-[11px] font-sans font-bold text-[#9A9BA9] uppercase tracking-wider block">
                  Isi Rilis Lengkap
                </span>
                {(selectedNewsDetail.isi_lengkap || selectedNewsDetail.ringkasan || 'Isi rilis dapat dibaca langsung pada tautan resmi.')
                  .split('\n\n')
                  .filter(p => p.trim())
                  .map((para, idx) => (
                    <p key={idx} className="leading-relaxed">
                      {para.trim()}
                    </p>
                  ))}
              </div>

              {/* External Link */}
              {selectedNewsDetail.link && (
                <div className="pt-2">
                  <a
                    href={selectedNewsDetail.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[#01B6BC] font-sans font-bold hover:underline text-xs"
                  >
                    <span>Buka Rilis Resmi di pkp.go.id</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}

            </div>

            {/* Bottom Actions with Back Button */}
            <div className="p-4 border-t border-[#EFF1F3] bg-[#F7F8F9] flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedNewsDetail(null)}
                className="px-4 py-2.5 rounded-full text-xs font-sans font-semibold text-[#363853] bg-white hover:bg-[#EFF1F3] border border-[#EFF1F3] transition-colors inline-flex items-center gap-1.5 shrink-0 cursor-pointer select-none"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Kembali</span>
              </button>

              <button
                type="button"
                onClick={() => copyNewsWA(selectedNewsDetail)}
                className={`flex-1 h-10 rounded-full font-sans text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs ${
                  newsCopyStatus[selectedNewsDetail.id]
                    ? 'bg-[#22C55E] text-white shadow'
                    : 'bg-[#01B6BC] hover:bg-[#019296] text-white hover:shadow'
                }`}
              >
                {newsCopyStatus[selectedNewsDetail.id] ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Format Rilis Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4" />
                    <span>Salin Format Share WA</span>
                  </>
                )}
              </button>

              {selectedNewsDetail.link && (
                <a
                  href={selectedNewsDetail.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 h-10 rounded-full font-sans text-xs font-semibold bg-white hover:bg-[#EFF1F3] text-[#363853] border border-[#EFF1F3] flex items-center justify-center gap-1.5 shrink-0 transition-colors"
                >
                  <span>Portal</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>

          </div>
        </div>
      )}

      {/* FOOTER - Uniform branding */}
      <footer className="py-6 mt-auto text-center font-sans text-xs text-[#9A9BA9] border-t border-[#EFF1F3] bg-white">
        <p>© 2026 Tim Peliputan & Publikasi - Biro Komunikasi Publik Kementerian PKP</p>
      </footer>

    </div>
  );
}
