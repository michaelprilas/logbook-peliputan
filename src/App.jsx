import React, { useState, useMemo, useRef, useEffect, useCallback, startTransition } from 'react';
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
  Building2,
  ArrowUpRight,
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
    startTransition(() => {
      setCurrentMenu(menu);
    });
  };

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
      if (newsSortPickerRef.current && !newsSortPickerRef.current.contains(event.target)) {
        setIsNewsSortPickerOpen(false);
      }
      if (calendarMonthPickerRef.current && !calendarMonthPickerRef.current.contains(event.target)) {
        setIsCalendarMonthPickerOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

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
    setIsMonthPickerOpen(false);
    setIsNewsStatusPickerOpen(false);
    setIsVideoStatusPickerOpen(false);
    setIsProvincePickerOpen(false);
    setIsOfficerPickerOpen(false);
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
    return count;
  }, [rekapSearch, selectedMonths, selectedNewsStatus, selectedVideoStatus, selectedProvince, selectedOfficers]);

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
    const rows = rekapResults.map(a => [
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
          <div className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl shadow-2xl border text-xs font-bold ${
            syncToast.type === 'success'
              ? 'bg-slate-900 text-white border-slate-700'
              : 'bg-rose-900 text-white border-rose-800'
          }`}>
            <span className={`w-2 h-2 rounded-full shrink-0 ${syncToast.type === 'success' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
            <span>{syncToast.message}</span>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TOP FLOATING NAVBAR (PENCARIAN - DASHBOARD - LANJUTAN)   */}
      {/* ======================================================== */}
      <header className="sticky top-0 z-40 px-3 sm:px-6 pt-2.5 pb-2 backdrop-blur-md bg-white/85 border-b border-slate-200/70 shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          
          {/* Brand Identity - ArchivePeliputan */}
          <div 
            onClick={() => navigateMenu('search')}
            className="flex items-center gap-2.5 cursor-pointer group select-none shrink-0"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-700 to-blue-500 text-white flex items-center justify-center shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <Building2 className="w-4.5 h-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-slate-900 text-base tracking-tight">
                  Archive<span className="text-blue-600">Peliputan</span>
                </span>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-50 text-blue-600 border border-blue-100">
                  {activities.length} Kegiatan
                </span>

                {/* Direct Google Sheets Live Sync Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerLiveSync(true);
                  }}
                  disabled={isSyncing}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border transition-all cursor-pointer select-none shadow-xs ${
                    isSyncing
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                  }`}
                  title={`Live Sync langsung ke Google Sheet.${lastSyncTime ? ` Terakhir: ${lastSyncTime}.` : ''} Klik untuk sinkronkan data sekarang.`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isSyncing ? 'bg-amber-500 animate-ping' : 'bg-emerald-500'}`} />
                  <span>{isSyncing ? 'Sinkron...' : 'Live Sync'}</span>
                  <RefreshCw className={`w-2.5 h-2.5 shrink-0 ${isSyncing ? 'animate-spin text-amber-600' : 'text-emerald-600'}`} />
                </button>
              </div>
              <p className="text-[10px] text-slate-400 font-medium hidden md:block">
                Tim Peliputan & Publikasi - Biro Komunikasi Publik PKP
              </p>
            </div>
          </div>

          {/* Center/Right Top Menu Navigation (Pencarian - Dashboard - Menu Lanjutan) */}
          <nav className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-2xl border border-slate-200/70 shadow-inner">
            
            {/* 1. Pencarian (Default Page) */}
            <button
              type="button"
              onClick={() => navigateMenu('search')}
              className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold select-none focus:outline-none whitespace-nowrap ${
                currentMenu === 'search'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 active:bg-slate-200'
              }`}
            >
              <Search className="w-3.5 h-3.5 shrink-0" />
              <span>Pencarian</span>
            </button>

            {/* 2. Dashboard */}
            <button
              type="button"
              onClick={() => navigateMenu('dashboard')}
              className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold select-none focus:outline-none whitespace-nowrap ${
                currentMenu === 'dashboard'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 active:bg-slate-200'
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
                className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold select-none focus:outline-none whitespace-nowrap ${
                  currentMenu !== 'search' && currentMenu !== 'dashboard'
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 active:bg-slate-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5 shrink-0" />
                <span>Menu Lanjutan</span>
                <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform duration-150 ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Refined Dropdown Popover */}
              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-slate-200/90 p-2 z-50 popover-motion origin-top-right">
                  <div className="px-3 py-1.5 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                    Modul Liputan
                  </div>

                  {/* a. Rekapitulasi Kegiatan */}
                  <button
                    type="button"
                    onClick={() => navigateMenu('rekapitulasi')}
                    className={`w-full px-3 py-2 rounded-xl text-left text-xs sm:text-sm font-semibold flex items-center justify-between cursor-pointer ${
                      currentMenu === 'rekapitulasi'
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <FileText className={`w-4 h-4 ${currentMenu === 'rekapitulasi' ? 'text-blue-600' : 'text-slate-400'}`} />
                      <div>
                        <div className="font-bold">Rekapitulasi Kegiatan</div>
                        <div className="text-[10px] text-slate-400 font-normal">Tabel data interaktif & filter</div>
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </button>

                  {/* b. Tim Peliputan */}
                  <button
                    type="button"
                    onClick={() => navigateMenu('tim')}
                    className={`w-full px-3 py-2 rounded-xl text-left text-xs sm:text-sm font-semibold flex items-center justify-between cursor-pointer ${
                      currentMenu === 'tim'
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Users className={`w-4 h-4 ${currentMenu === 'tim' ? 'text-blue-600' : 'text-slate-400'}`} />
                      <div>
                        <div className="font-bold">Tim Peliputan</div>
                        <div className="text-[10px] text-slate-400 font-normal">25 personil & penugasan</div>
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </button>

                  {/* c. Berita (Segera) */}
                  <button
                    type="button"
                    onClick={() => navigateMenu('berita')}
                    className={`w-full px-3 py-2 rounded-xl text-left text-xs sm:text-sm font-semibold flex items-center justify-between cursor-pointer ${
                      currentMenu === 'berita'
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Newspaper className={`w-4 h-4 ${currentMenu === 'berita' ? 'text-blue-600' : 'text-slate-400'}`} />
                      <div>
                        <div className="font-bold">Berita</div>
                        <div className="text-[10px] text-slate-400 font-normal">Kliping & rilis resmi pkp.go.id</div>
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </button>

                  {/* d. Laporan (Segera) */}
                  <button
                    type="button"
                    onClick={() => navigateMenu('laporan')}
                    className={`w-full px-3 py-2 rounded-xl text-left text-xs sm:text-sm font-semibold flex items-center justify-between cursor-pointer ${
                      currentMenu === 'laporan'
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Wrench className="w-4 h-4 text-amber-500" />
                      <div>
                        <div className="flex items-center gap-1.5 font-bold">
                          <span>Laporan</span>
                          <span className="text-[9px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded font-bold">
                            Segera
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-normal">Format rekap pimpinan</div>
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </button>

                  <div className="my-1 border-t border-slate-100" />

                  {/* d. Database Logbook (Google Sheet) */}
                  <a
                    href="https://docs.google.com/spreadsheets/d/16Q_Mrbs2oHPMv-xcCaB9zJ5_JMjAfr9F/edit?usp=sharing&ouid=110437050343134361164&rtpof=true&sd=true"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setIsDropdownOpen(false)}
                    className="w-full px-3 py-2 rounded-xl text-left text-xs sm:text-sm font-semibold flex items-center justify-between text-emerald-700 hover:bg-emerald-50 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div>
                        <div className="font-bold">Database Logbook</div>
                        <div className="text-[10px] text-slate-400 font-normal">Spreadsheet logbook peliputan</div>
                      </div>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-emerald-600 shrink-0" />
                  </a>

                  {/* e. Database Berita (Google Sheet) */}
                  <a
                    href="https://docs.google.com/spreadsheets/d/19BIJfZg3ZzV4uDEAbQg77LDBzQtxYr2O3BQbYmy5caU/edit?usp=sharing"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setIsDropdownOpen(false)}
                    className="w-full px-3 py-2 rounded-xl text-left text-xs sm:text-sm font-semibold flex items-center justify-between text-teal-700 hover:bg-teal-50 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <FileSpreadsheet className="w-4 h-4 text-teal-600 shrink-0" />
                      <div>
                        <div className="font-bold">Database Berita</div>
                        <div className="text-[10px] text-slate-400 font-normal">Spreadsheet arsip rilis berita</div>
                      </div>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-teal-600 shrink-0" />
                  </a>

                  {/* f. Dokumentasi (SharePoint) */}
                  <a
                    href="https://kemenpkp-my.sharepoint.com/:f:/g/personal/michael_simanjuntak_pkp_go_id/IgBnGmV91qZ8SIBsyncviMcnAXid1tndVpqlDekxtrBpaD0?e=t1CM9D"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setIsDropdownOpen(false)}
                    className="w-full px-3 py-2 rounded-xl text-left text-xs sm:text-sm font-semibold flex items-center justify-between text-blue-700 hover:bg-blue-50 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <FolderArchive className="w-4 h-4 text-blue-600" />
                      <div>
                        <div className="font-bold">Dokumentasi</div>
                        <div className="text-[10px] text-slate-400 font-normal">Folder arsip SharePoint</div>
                      </div>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-blue-600" />
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
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-5">
        
        {/* ======================================================== */}
        {/* VIEW 1: PENCARIAN KEGIATAN (DEFAULT PAGE)                */}
        {/* ======================================================== */}
        {currentMenu === 'search' && (
          <div className="max-w-3xl mx-auto space-y-4 page-transition">
            
            {/* Search Box Card */}
            <div className="invo-card p-5 sm:p-6">
              <div className="mb-3">
                <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
                  Pencarian Dokumentasi & Agenda
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Temukan rilis berita, video liputan, dan petugas sepanjang tahun 2026.
                </p>
              </div>

              {/* Main Search Input */}
              <div className="relative">
                <Search className="w-4.5 h-4.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  autoFocus
                  placeholder="Ketik topik, kota, atau nama petugas (Rusun, Singkawang, Ilham)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-12 pl-11 pr-10 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 rounded-xl text-slate-900 text-sm font-semibold placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all shadow-inner"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Popular Search Chips */}
              <div className="flex items-center gap-1.5 flex-wrap mt-3 text-xs font-medium">
                <span className="text-slate-400 font-bold">Pencarian populer:</span>
                {['Rusun', 'BSPS', 'Singkawang', 'Jatiwangi', 'Michael', 'Ilham', 'Fitrah', 'Jakarta', 'Kunker'].map(tag => (
                  <button
                    key={tag}
                    onClick={() => setSearchQuery(tag)}
                    className="px-2.5 py-0.5 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 font-bold transition-colors btn-motion"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Results Feed OR 5 Latest Activities When Search is Empty */}
            {searchQuery.trim() ? (
              <div className="space-y-3">
                
                <div className="flex items-center justify-between px-1 text-xs font-bold text-slate-500">
                  <p>
                    Ditemukan <span className="text-blue-600 font-extrabold">{searchResults.length}</span> kegiatan
                  </p>
                  <button
                    onClick={() => setSearchQuery('')}
                    className="text-slate-500 hover:text-blue-600 underline"
                  >
                    Reset Pencarian
                  </button>
                </div>

                {searchResults.length === 0 && (
                  <div className="invo-card p-8 text-center">
                    <Search className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <h4 className="font-extrabold text-slate-800 text-sm">
                      Tidak ditemukan kegiatan yang cocok
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Coba gunakan kata kunci umum lainnya seperti nama daerah atau nama personil.
                    </p>
                  </div>
                )}

                {/* 1-Column Feed */}
                <div className="space-y-3">
                  {searchResults.map(item => (
                    <div
                      key={item.id}
                      className="invo-card invo-card-hover p-4 sm:p-5 motion-card-enter"
                    >
                      {/* Top Row */}
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold px-2 py-0.5 rounded-md bg-slate-900 text-white text-[11px]">
                            #{cleanNomor(item.nomor)}
                          </span>
                          <span className="font-semibold text-slate-600 flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            {item.tanggal_formatted || item.tanggal}
                          </span>
                        </div>

                        {item.lokasi && (
                          <div className="flex items-center gap-1 text-slate-600 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100 font-medium">
                            <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                            <span className="truncate max-w-[220px]">{item.lokasi}</span>
                          </div>
                        )}
                      </div>

                      {/* Title */}
                      <h3 className="text-sm sm:text-base font-extrabold text-slate-900 leading-snug mb-2">
                        {item.kegiatan}
                      </h3>

                      {/* News Quote */}
                      {item.judul_berita && (
                        <div className="mb-2.5 p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-100 text-xs flex items-start gap-2">
                          <Newspaper className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold text-emerald-950 block mb-0.5">Rilis Berita Resmi:</span>
                            <span className="text-emerald-800 leading-relaxed font-medium">{item.judul_berita}</span>
                          </div>
                        </div>
                      )}

                      {/* Officers */}
                      <div className="flex items-center gap-1 flex-wrap mb-3 text-xs">
                        <span className="text-slate-400 font-semibold mr-1">Petugas:</span>
                        {item.petugas.length > 0 ? (
                          item.petugas.map((officer, idx) => (
                            <span
                              key={idx}
                              className="bg-slate-100 text-slate-800 font-bold px-2 py-0.5 rounded-md"
                            >
                              {officer}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-400 italic">Tidak tercatat</span>
                        )}
                      </div>

                      {/* Action Bar */}
                      <div className="pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {item.link_berita ? (
                            <a
                              href={item.link_berita}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                            >
                              <Newspaper className="w-3 h-3 text-emerald-600" />
                              <span>pkp.go.id</span>
                              <ArrowUpRight className="w-3 h-3 opacity-60" />
                            </a>
                          ) : (
                            <span className="text-xs text-slate-400 px-2 py-0.5">
                              Belum ada rilis
                            </span>
                          )}

                          {item.link_videos && item.link_videos.length > 1 ? (
                            <div className="inline-flex items-center gap-1.5 flex-wrap">
                              {item.link_videos.map((vUrl, idx) => (
                                <a
                                  key={idx}
                                  href={vUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors"
                                  title={`Video ${idx + 1}: ${vUrl}`}
                                >
                                  <Video className="w-3 h-3 text-blue-600" />
                                  <span>Video {idx + 1}</span>
                                  <ArrowUpRight className="w-2.5 h-2.5 opacity-60" />
                                </a>
                              ))}
                            </div>
                          ) : (item.link_video || (item.link_videos && item.link_videos.length > 0)) ? (
                            <a
                              href={item.link_video || item.link_videos[0]}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors"
                            >
                              <Video className="w-3 h-3 text-blue-600" />
                              <span>Video</span>
                              <ArrowUpRight className="w-3 h-3 opacity-60" />
                            </a>
                          ) : null}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setSelectedDetailItem(item)}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-600 border border-slate-200 transition-colors"
                          >
                            <span>Detail</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => copyReport(item)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                              copyStatus[item.id]
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-slate-900 hover:bg-slate-800 text-white shadow-xs'
                            }`}
                          >
                            {copyStatus[item.id] ? (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                <span>Format WA Tersalin!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
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
              /* When search input is empty: Show 5 Latest Activities (No Empty Void!) */
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                    <h3 className="text-sm font-extrabold text-slate-900">
                      5 Kegiatan Liputan Terbaru
                    </h3>
                  </div>
                  <span className="text-xs font-semibold text-slate-400">
                    Ketik di atas untuk mencari seluruh 509 kegiatan
                  </span>
                </div>

                <div className="space-y-2.5">
                  {recentActivities.map(item => (
                    <div
                      key={item.id}
                      className="invo-card invo-card-hover p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 motion-card-enter"
                    >
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-extrabold px-1.5 py-0.2 rounded bg-slate-900 text-white text-[10px]">
                            #{cleanNomor(item.nomor)}
                          </span>
                          <span className="text-slate-500 font-medium">
                            {item.tanggal_formatted || item.tanggal}
                          </span>
                          {item.lokasi && (
                            <span className="text-slate-400 font-normal truncate max-w-[200px]">
                              • 📍 {item.lokasi}
                            </span>
                          )}
                        </div>
                        <h4 className="font-extrabold text-slate-900 text-sm leading-snug">
                          {item.kegiatan}
                        </h4>
                        <div className="text-[11px] text-slate-400 font-medium">
                          Petugas: {item.petugas.join(', ') || '-'}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <button
                          onClick={() => setSelectedDetailItem(item)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-600 border border-slate-200 transition-colors"
                        >
                          <span>Detail</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => copyReport(item)}
                          className={`p-1.5 rounded-xl border transition-all ${
                            copyStatus[item.id]
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                              : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200'
                          }`}
                          title="Salin Format WA"
                        >
                          {copyStatus[item.id] ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
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
        {/* VIEW 2: DASHBOARD (SEJAJAR & TEPAT SESUAI INSTRUKSI)      */}
        {/* ======================================================== */}
        {currentMenu === 'dashboard' && (
          <div className="space-y-5 page-transition">
            
            {/* ROW 1: 3 COMPACT KPI CARDS (COL-SPAN-3) + KALENDER (KIRI) & AGENDA (KANAN) (COL-SPAN-9) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
              
              {/* Left Column (3 cols): Ukuran ringkas, tanpa panah, teks deskriptif jelas */}
              <div className="lg:col-span-3 flex flex-col justify-between gap-3.5">
                
                {/* 1. Total Kegiatan */}
                <div className="invo-card invo-card-hover p-4 flex-1 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
                      <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                      <span>Total Kegiatan</span>
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                      <PieChart className="w-4.5 h-4.5" />
                    </div>
                  </div>

                  <div className="my-1">
                    <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                      {activities.length}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-100">
                    <span className="font-bold text-slate-600">
                      Total agenda terdata 2026
                    </span>
                    <span className="text-slate-400 font-semibold">Tahun 2026</span>
                  </div>
                </div>

                {/* 2. Publikasi Rilis Berita */}
                <div className="invo-card invo-card-hover p-4 flex-1 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      <span>Rilis Berita</span>
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                      <Newspaper className="w-4.5 h-4.5" />
                    </div>
                  </div>

                  <div className="my-1">
                    <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                      {totalBerita}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-100">
                    <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.2 rounded-md">
                      {percentBerita}% kegiatan punya berita
                    </span>
                    <span className="text-slate-400 font-semibold">pkp.go.id</span>
                  </div>
                </div>

                {/* 3. Publikasi Video */}
                <div className="invo-card invo-card-hover p-4 flex-1 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
                      <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                      <span>Publikasi Video</span>
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                      <Video className="w-4.5 h-4.5" />
                    </div>
                  </div>

                  <div className="my-1">
                    <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                      {totalVideo}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-100">
                    <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.2 rounded-md">
                      {percentVideo}% kegiatan punya video
                    </span>
                    <span className="text-slate-400 font-semibold">Dokumentasi</span>
                  </div>
                </div>

              </div>

              {/* Right Column (9 cols): KALENDER DI SEBELAH KIRI, AGENDA DI SEBELAH KANAN */}
              <div className="lg:col-span-9 invo-card p-5 sm:p-6 flex flex-col justify-between h-full">
                
                {/* Header Kalender & Month Switcher */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-xs">
                      <CalendarDays className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-extrabold text-slate-900 text-base sm:text-lg">
                          Kalender Aktivitas Liputan
                        </h3>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-blue-50 text-blue-600 border border-blue-100">
                          {totalActivitiesInCurrentCalendarMonth} Agenda di {MONTH_ORDER[calendarMonth]}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">
                        Pilih tanggal pada kalender di sebelah kiri untuk melihat rincian agenda di sebelah kanan
                      </p>
                    </div>
                  </div>

                  {/* Month Switcher Controls & Today Shortcut */}
                  <div className="flex items-center gap-1.5 self-start sm:self-auto">
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
                      className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition-colors shadow-xs ${
                        selectedCalendarDate === todayDateStr
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                      title="Kembali ke tanggal hari ini"
                    >
                      Hari Ini
                    </button>

                    <div className="relative flex items-center gap-1 bg-slate-50 border border-slate-200/80 rounded-xl p-0.5 shadow-xs" ref={calendarMonthPickerRef}>
                      <button
                        type="button"
                        onClick={() => setCalendarMonth(prev => (prev === 0 ? 11 : prev - 1))}
                        className="p-1.5 rounded-lg hover:bg-white text-slate-600 hover:text-slate-900 transition-all cursor-pointer shadow-xs"
                        title="Bulan sebelumnya"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>

                      {/* Month Picker Trigger Button */}
                      <button
                        type="button"
                        onClick={() => setIsCalendarMonthPickerOpen(prev => !prev)}
                        className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer select-none ${
                          isCalendarMonthPickerOpen
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-white hover:bg-slate-100/80 text-slate-900 shadow-xs'
                        }`}
                        title="Klik untuk memilih bulan"
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{MONTH_ORDER[calendarMonth]} {calendarYear}</span>
                        <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isCalendarMonthPickerOpen ? 'rotate-180' : ''}`} />
                      </button>

                      <button
                        type="button"
                        onClick={() => setCalendarMonth(prev => (prev === 11 ? 0 : prev + 1))}
                        className="p-1.5 rounded-lg hover:bg-white text-slate-600 hover:text-slate-900 transition-all cursor-pointer shadow-xs"
                        title="Bulan berikutnya"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>

                      {/* Month Picker Popover Overlay */}
                      {isCalendarMonthPickerOpen && (
                        <div className="absolute right-0 top-full mt-2 w-64 sm:w-72 bg-white rounded-2xl shadow-2xl border border-slate-100 p-3 z-40 popover-motion origin-top-right">
                          {/* Popover Header */}
                          <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-100">
                            <div>
                              <span className="font-extrabold text-slate-900 text-xs block">Pilih Bulan Kalender</span>
                              <span className="text-[10px] text-slate-400">Tahun {calendarYear}</span>
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
                              className="text-[11px] font-bold text-blue-600 hover:underline cursor-pointer"
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
                                  className={`p-2 rounded-xl text-left transition-all cursor-pointer flex flex-col justify-between ${
                                    isSelected
                                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                                      : count > 0
                                      ? 'bg-slate-50 hover:bg-blue-50 hover:text-blue-700 text-slate-800'
                                      : 'bg-white hover:bg-slate-50 text-slate-400'
                                  }`}
                                >
                                  <div className="flex items-center justify-between w-full">
                                    <span className={`text-xs font-bold ${isSelected ? 'text-white' : ''}`}>
                                      {monthName.slice(0, 3)}
                                    </span>
                                    {isSelected && <Check className="w-3 h-3 text-white" />}
                                  </div>
                                  <div className={`text-[10px] mt-1 font-semibold ${
                                    isSelected
                                      ? 'text-blue-100'
                                      : count > 0
                                      ? 'text-blue-600'
                                      : 'text-slate-300'
                                  }`}>
                                    {count > 0 ? `${count} agenda` : '0 agenda'}
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
                <div className="grid grid-cols-1 md:grid-cols-12 gap-5 flex-1 items-stretch">
                  
                  {/* SISI KIRI (7 Kolom): Matriks Kalender Bulanan */}
                  <div className="md:col-span-7 flex flex-col justify-between">
                    
                    {/* Header Hari (Sen - Min) */}
                    <div className="grid grid-cols-7 gap-1.5 text-center text-xs font-black text-slate-400 uppercase tracking-wider mb-2">
                      <span className="py-1 bg-slate-50 rounded-lg">Sen</span>
                      <span className="py-1 bg-slate-50 rounded-lg">Sel</span>
                      <span className="py-1 bg-slate-50 rounded-lg">Rab</span>
                      <span className="py-1 bg-slate-50 rounded-lg">Kam</span>
                      <span className="py-1 bg-slate-50 rounded-lg">Jum</span>
                      <span className="py-1 bg-slate-50 rounded-lg">Sab</span>
                      <span className="py-1 bg-slate-50 rounded-lg">Min</span>
                    </div>

                    {/* Matriks Tanggal */}
                    <div className="grid grid-cols-7 gap-1.5 sm:gap-2 flex-1">
                      {calendarDaysMatrix.map((item, idx) => {
                        if (!item) {
                          return <div key={`empty-${idx}`} className="h-10 sm:h-11 rounded-xl bg-transparent" />;
                        }

                        const isSelected = selectedCalendarDate === item.dateKey;
                        const isToday = item.dateKey === todayDateStr;
                        const hasActivities = item.items.length > 0;
                        const count = item.items.length;

                        return (
                          <button
                            key={item.dateKey}
                            onClick={() => setSelectedCalendarDate(item.dateKey)}
                            className={`h-10 sm:h-11 rounded-xl flex flex-col items-center justify-between p-1 text-xs font-extrabold btn-motion relative ${
                              isSelected
                                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30 scale-[1.03] ring-2 ring-blue-500 ring-offset-2 ring-offset-white'
                                : isToday
                                ? 'bg-blue-50 hover:bg-blue-100/70 text-blue-900 border-2 border-blue-400 shadow-xs'
                                : hasActivities
                                ? 'bg-slate-50 hover:bg-blue-50 hover:border-blue-300 text-slate-900 border border-slate-200/90 shadow-xs'
                                : 'bg-transparent hover:bg-slate-50 text-slate-400 border border-transparent'
                            }`}
                          >
                            <span className="leading-none mt-0.5">{item.dayNumber}</span>
                            {hasActivities && (
                              <div className={`flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                                isSelected
                                  ? 'bg-white/20 text-white'
                                  : 'bg-blue-100 text-blue-700'
                              }`}>
                                <span className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-blue-600'}`}></span>
                                <span>{count}</span>
                              </div>
                            )}
                            {!hasActivities && <div className="h-1"></div>}
                          </button>
                        );
                      })}
                    </div>

                    <div className="pt-2 text-[11px] text-slate-400 flex items-center justify-between">
                      <span>• Titik biru menandakan hari dengan agenda liputan</span>
                      <span className="text-blue-600 font-bold">Pilih tanggal</span>
                    </div>

                  </div>

                  {/* SISI KANAN (5 Kolom): Rincian Agenda pada Tanggal Terpilih */}
                  <div className="md:col-span-5 border-t md:border-t-0 md:border-l border-slate-100 md:pl-5 pt-4 md:pt-0 flex flex-col justify-between">
                    <div>
                      {/* Header Agenda */}
                      <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                          <span className="text-xs sm:text-sm font-extrabold text-slate-900">
                            Agenda {selectedCalendarDate}
                          </span>
                          {selectedCalendarDate === todayDateStr && (
                            <span className="text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">
                              Hari Ini
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] font-extrabold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                          {selectedDateActivities.length} Agenda
                        </span>
                      </div>

                      {/* List of activities for the selected date */}
                      <div key={selectedCalendarDate} className="space-y-2 max-h-[265px] overflow-y-auto pr-1 agenda-motion">
                        {selectedDateActivities.length > 0 ? (
                          selectedDateActivities.map(item => (
                            <div key={item.id} className="p-3 rounded-xl bg-slate-50 hover:bg-blue-50/50 border border-slate-200/70 transition-all text-xs flex flex-col justify-between">
                              <div>
                                <div className="flex items-center justify-between gap-1.5 mb-1">
                                  <span className="font-extrabold text-[10px] bg-slate-900 text-white px-1.5 py-0.2 rounded">
                                    #{cleanNomor(item.nomor)}
                                  </span>
                                  {item.lokasi && (
                                    <span className="text-[10px] text-slate-500 font-medium truncate max-w-[130px]">
                                      📍 {item.lokasi}
                                    </span>
                                  )}
                                </div>
                                <p className="font-bold text-slate-900 line-clamp-2 leading-snug">
                                  {item.kegiatan}
                                </p>
                              </div>

                              <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between">
                                <span className="text-[10px] text-slate-400 font-medium truncate max-w-[110px]">
                                  👥 {item.petugas.join(', ') || 'Belum tercatat'}
                                </span>

                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    onClick={() => setSelectedDetailItem(item)}
                                    className="text-[10px] font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded transition-colors"
                                  >
                                    Detail
                                  </button>
                                  {item.link_berita && (
                                    <a
                                      href={item.link_berita}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded hover:bg-emerald-200 transition-colors"
                                    >
                                      Berita
                                    </a>
                                  )}
                                  <button
                                    onClick={() => copyReport(item)}
                                    className="p-1 text-slate-400 hover:text-slate-800 rounded-md hover:bg-white transition-colors"
                                    title="Salin WA"
                                  >
                                    {copyStatus[item.id] ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="py-12 text-center rounded-xl bg-slate-50/60 border border-dashed border-slate-200">
                            <p className="text-xs text-slate-500 font-semibold">
                              Tidak ada agenda pada tanggal ini
                            </p>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              Pilih tanggal bertitik biru di sebelah kiri
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {selectedDateActivities.length > 0 && (
                      <div className="pt-2 text-[11px] text-slate-400 flex items-center justify-between border-t border-slate-100 mt-2">
                        <span>Total agenda terpilih: {selectedDateActivities.length}</span>
                        <button
                          onClick={() => {
                            setSelectedMonths([MONTH_ORDER[calendarMonth]]);
                            setCurrentMenu('rekapitulasi');
                          }}
                          className="text-blue-600 font-bold hover:underline"
                        >
                          Buka Rekapitulasi →
                        </button>
                      </div>
                    )}

                  </div>

                </div>

              </div>

            </div>

            {/* ROW 2: MONTHLY VOLUME BAR CHART & VIBRANT BLUE BANNER */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              
              {/* Left (8 cols): Sleek Monthly Bar Chart */}
              <div 
                className="lg:col-span-8 invo-card p-5 sm:p-6 flex flex-col justify-between"
                onMouseLeave={() => setHoveredMonth(null)}
              >
                
                {/* Header with Monthly Total & Subtitle */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div>
                    <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
                      Aktivitas Peliputan Bulanan
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Data s.d. 11 November 2026
                    </p>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                        {hoveredMonth ? (monthCounts[hoveredMonth] || 0) : peakMonth.count}
                      </span>
                      <span className="text-xs font-semibold text-slate-500">
                        {hoveredMonth ? `kegiatan di bulan ${hoveredMonth}` : `kegiatan di bulan puncak (${peakMonth.name})`}
                      </span>
                    </div>
                  </div>

                  {/* Filter hint */}
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-100">
                    <span className="w-2 h-2 rounded-full bg-blue-700"></span>
                    <span>Puncak: {peakMonth.name} ({peakMonth.count} kegiatan)</span>
                  </div>
                </div>

                {/* Rounded Bar Chart with Peak Month in Dark Blue & Others in Light Blue */}
                <div className="pt-6 pb-1">
                  <div className="flex items-end justify-between gap-1.5 sm:gap-3 h-48 border-b border-slate-100 px-1 pb-2">
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
                          <span className={`text-[10px] font-black mb-1 transition-colors ${
                            isHovered ? 'text-blue-600' : isPeak ? 'text-blue-800' : 'text-slate-500'
                          }`}>
                            {count}
                          </span>

                          {/* Tooltip Floating Pill (Centered exactly above bar) */}
                          {isHovered && (
                            <div className="absolute -top-10 left-1/2 -translate-x-1/2 z-30 pointer-events-none whitespace-nowrap bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded-lg shadow-lg flex flex-col items-center animate-in fade-in zoom-in-95 duration-100">
                              <span>{count} Kegiatan ({month})</span>
                              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-slate-900 rotate-45"></span>
                            </div>
                          )}

                          {/* Bar: Peak Month = Dark Blue (bg-blue-700), Others = Light Blue (bg-blue-300) */}
                          <div
                            className={`w-full max-w-[36px] rounded-lg chart-bar-animated transition-all duration-200 ${
                              isHovered
                                ? 'bg-blue-600 shadow-md shadow-blue-500/30 -translate-y-1'
                                : isPeak
                                ? 'bg-blue-700 shadow-sm shadow-blue-700/20'
                                : 'bg-blue-300 hover:bg-blue-400'
                            }`}
                            style={{ height: `${Math.max(heightPct, 12)}%` }}
                          />

                          {/* Month Label */}
                          <span className={`text-[10px] font-bold mt-2 transition-colors ${
                            isHovered ? 'text-blue-600' : isPeak ? 'text-blue-800 font-extrabold' : 'text-slate-400 group-hover:text-slate-700'
                          }`}>
                            {month.slice(0, 3)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Footer notes */}
                <div className="flex items-center justify-between pt-3 text-[11px] text-slate-400 font-medium">
                  <span>Batang biru tua menandakan bulan dengan aktivitas tertinggi</span>
                  <button 
                    onClick={() => setCurrentMenu('rekapitulasi')}
                    className="text-blue-600 font-bold hover:underline inline-flex items-center gap-1"
                  >
                    <span>Lihat Rekap Lengkap</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </button>
                </div>

              </div>

              {/* Right (4 cols): Featured Vibrant Blue Card with 3 Summary Numbers */}
              <div className="lg:col-span-4 bg-gradient-to-br from-blue-600 via-blue-600 to-blue-700 text-white rounded-2xl p-5 sm:p-6 relative overflow-hidden shadow-lg shadow-blue-600/15 flex flex-col justify-between">
                
                {/* Decorative soft glowing circular ambient waves */}
                <div className="absolute -right-8 -bottom-8 w-36 h-36 rounded-full bg-white/10 blur-xl pointer-events-none"></div>

                <div>
                  <span className="inline-block text-[9px] font-extrabold tracking-wider bg-white/20 text-white px-2 py-0.5 rounded-full uppercase mb-2.5 backdrop-blur-sm">
                    RESMI 2026
                  </span>

                  <h3 className="text-lg sm:text-xl font-black leading-tight text-white mb-1">
                    Basis Data Peliputan Pimpinan PKP
                  </h3>

                  <p className="text-xs text-blue-100 font-medium leading-relaxed">
                    Seluruh agenda kementerian, liputan, rilis berita, serta penugasan tim peliputan terdata secara realtime
                  </p>
                </div>

                {/* 3 Summary Numbers filling the center cleanly */}
                <div className="grid grid-cols-3 gap-2 my-4 p-3 rounded-xl bg-white/10 backdrop-blur-xs border border-white/15 text-center">
                  <div>
                    <div className="text-xl font-black text-white">{activities.length}</div>
                    <div className="text-[10px] text-blue-100 font-medium">Kegiatan</div>
                  </div>
                  <div className="border-x border-white/15">
                    <div className="text-xl font-black text-white">{totalBerita}</div>
                    <div className="text-[10px] text-blue-100 font-medium">Berita</div>
                  </div>
                  <div>
                    <div className="text-xl font-black text-white">{totalVideo}</div>
                    <div className="text-[10px] text-blue-100 font-medium">Video</div>
                  </div>
                </div>

                <div className="space-y-2 pt-1 border-t border-white/15">
                  <a
                    href="https://docs.google.com/spreadsheets/d/16Q_Mrbs2oHPMv-xcCaB9zJ5_JMjAfr9F/edit?usp=sharing&ouid=110437050343134361164&rtpof=true&sd=true"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full h-9.5 bg-white text-blue-700 hover:bg-blue-50 font-bold text-xs rounded-xl inline-flex items-center justify-center gap-1.5 shadow-sm transition-colors"
                  >
                    <span>Buka Google Sheet</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </a>

                  <button
                    onClick={exportCSV}
                    className="w-full h-9 bg-white/10 hover:bg-white/20 text-white font-semibold text-xs rounded-xl inline-flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Ekspor Data CSV</span>
                  </button>
                </div>

              </div>

            </div>

            {/* ROW 3: KEGIATAN PELIPUTAN TERBARU & PETUGAS TERAKTIF WITH PROGRESS BARS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              
              {/* Left: Kegiatan Peliputan Terbaru (Newest first) */}
              <div className="invo-card p-5">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-extrabold text-slate-900 text-sm sm:text-base">
                    Kegiatan Peliputan Terbaru
                  </h4>
                  <button
                    onClick={() => setCurrentMenu('search')}
                    className="text-xs font-bold text-blue-600 hover:underline"
                  >
                    Cari Kegiatan
                  </button>
                </div>

                <div className="divide-y divide-slate-100">
                  {recentActivities.map(item => (
                    <div key={item.id} className="py-2.5 flex items-start justify-between gap-2.5 group">
                      <div className="flex items-start gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 font-bold text-[11px] mt-0.5">
                          #{cleanNomor(item.nomor)}
                        </div>
                        <div>
                          <p 
                            onClick={() => setSelectedDetailItem(item)}
                            className="font-bold text-slate-900 text-xs sm:text-sm line-clamp-1 group-hover:text-blue-600 transition-colors cursor-pointer"
                          >
                            {item.kegiatan}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                            <span className="flex items-center gap-1 font-medium">
                              <Calendar className="w-3 h-3" />
                              {item.tanggal_formatted || item.tanggal}
                            </span>
                            <span>•</span>
                            <span className="truncate max-w-[180px]">{item.lokasi || '-'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => setSelectedDetailItem(item)}
                          className="px-2 py-0.5 text-[10px] font-bold text-slate-600 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 rounded-md transition-colors"
                        >
                          Detail
                        </button>
                        <button
                          onClick={() => copyReport(item)}
                          className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
                          title="Salin WA"
                        >
                          {copyStatus[item.id] ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: Petugas Teraktif (Tanpa Bar) */}
              <div className="invo-card p-5">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-extrabold text-slate-900 text-sm sm:text-base">
                    Petugas Teraktif
                  </h4>
                  <button
                    onClick={() => setCurrentMenu('tim')}
                    className="text-xs font-bold text-blue-600 hover:underline"
                  >
                    Lihat Semua ({officerStats.length})
                  </button>
                </div>

                <div className="divide-y divide-slate-100">
                  {officerStats.slice(0, 5).map((officer, index) => (
                    <div
                      key={officer.name}
                      onClick={() => {
                        setSelectedOfficers([officer.name]);
                        setCurrentMenu('rekapitulasi');
                      }}
                      className="py-2.5 px-2 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-5 h-5 rounded-md bg-slate-100 text-slate-700 font-extrabold flex items-center justify-center text-[10px]">
                          {index + 1}
                        </span>
                        <span className="font-bold text-slate-900 text-xs sm:text-sm group-hover:text-blue-600 transition-colors">
                          {officer.name}
                        </span>
                      </div>
                      <span className="font-extrabold text-blue-600 text-xs bg-blue-50 px-2 py-0.5 rounded-lg">
                        {officer.count} <span className="font-normal text-slate-500">kegiatan</span>
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
            <div className="invo-card p-4 sm:p-5">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3.5">
                <div>
                  <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
                    Rekapitulasi Kegiatan
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Tabel data interaktif seluruh penugasan liputan pimpinan Kementerian PKP.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {activeFiltersCount > 0 && (
                    <button
                      type="button"
                      onClick={resetRekapFilters}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 transition-colors btn-motion"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Atur Ulang ({activeFiltersCount})</span>
                    </button>
                  )}

                  <button
                    onClick={exportCSV}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 shadow-sm transition-colors btn-motion"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Ekspor CSV</span>
                  </button>
                </div>
              </div>

              {/* Table search input */}
              <div className="relative mb-2.5">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Filter tabel berdasarkan nama kegiatan, lokasi daerah, judul berita, atau nama petugas..."
                  value={rekapSearch}
                  onChange={(e) => setRekapSearch(e.target.value)}
                  className="w-full pl-9 pr-8 py-1.5 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 rounded-xl text-slate-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                {rekapSearch && (
                  <button
                    onClick={() => setRekapSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3 h-3" />
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
                    className={`w-full bg-white hover:bg-slate-50 border rounded-xl px-2.5 py-1.5 text-xs font-bold flex items-center justify-between text-left shadow-xs transition-colors cursor-pointer ${
                      selectedMonths.length > 0 ? 'border-blue-300 bg-blue-50/40 text-blue-700' : 'border-slate-200 text-slate-800'
                    }`}
                  >
                    <span className="truncate">
                      {selectedMonths.length === 0
                        ? 'Bulan: Semua'
                        : selectedMonths.length === 1
                        ? `Bulan: ${selectedMonths[0]}`
                        : `Bulan: ${selectedMonths.length} Terpilih`}
                    </span>
                    <ChevronDown className={`w-3.5 h-3.5 text-slate-400 shrink-0 ml-1 transition-transform duration-200 ${isMonthPickerOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isMonthPickerOpen && (
                    <div className="absolute left-0 mt-1.5 w-72 bg-white rounded-2xl shadow-xl border border-slate-100 p-3 z-30 popover-motion origin-top-left">
                      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 text-xs">
                        <span className="font-extrabold text-slate-900">Pilih Bulan</span>
                        <button
                          type="button"
                          onClick={() => setSelectedMonths([])}
                          className="text-blue-600 hover:underline font-bold text-[11px]"
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
                            className="px-2 py-1 text-[10px] font-bold rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-700"
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
                            className="flex items-center justify-between px-2 py-1 rounded-lg hover:bg-slate-50 cursor-pointer text-xs select-none"
                          >
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={selectedMonths.includes(month)}
                                onChange={() => toggleMonth(month)}
                                className="h-3.5 w-3.5 rounded text-blue-600 border-slate-300"
                              />
                              <span className={selectedMonths.includes(month) ? 'font-bold text-blue-600' : 'text-slate-700'}>
                                {month}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-bold">
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
                    className={`w-full bg-white hover:bg-slate-50 border rounded-xl px-2.5 py-1.5 text-xs font-bold flex items-center justify-between text-left shadow-xs transition-colors cursor-pointer ${
                      selectedNewsStatus !== 'all' ? 'border-blue-300 bg-blue-50/40 text-blue-700' : 'border-slate-200 text-slate-800'
                    }`}
                  >
                    <span className="truncate">
                      {selectedNewsStatus === 'all'
                        ? 'Berita: Semua'
                        : selectedNewsStatus === 'with_news'
                        ? `Berita: Ada (${totalBerita})`
                        : 'Berita: Belum Ada'}
                    </span>
                    <ChevronDown className={`w-3.5 h-3.5 text-slate-400 shrink-0 ml-1 transition-transform duration-200 ${isNewsStatusPickerOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isNewsStatusPickerOpen && (
                    <div className="absolute left-0 mt-1.5 w-60 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 z-30 popover-motion origin-top-left">
                      <div className="px-2 py-1 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1">
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
                              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition-all text-left cursor-pointer ${
                                isSelected
                                  ? 'bg-blue-50 text-blue-700 font-bold'
                                  : 'hover:bg-slate-50 text-slate-700 font-medium'
                              }`}
                            >
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span>{opt.label}</span>
                                  {opt.count !== null && (
                                    <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-bold ${
                                      isSelected ? 'bg-blue-200/60 text-blue-800' : 'bg-slate-100 text-slate-500'
                                    }`}>
                                      {opt.count}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-400 font-normal">{opt.desc}</div>
                              </div>
                              {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0 ml-2" />}
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
                    className={`w-full bg-white hover:bg-slate-50 border rounded-xl px-2.5 py-1.5 text-xs font-bold flex items-center justify-between text-left shadow-xs transition-colors cursor-pointer ${
                      selectedVideoStatus !== 'all' ? 'border-amber-300 bg-amber-50/40 text-amber-800' : 'border-slate-200 text-slate-800'
                    }`}
                  >
                    <span className="truncate">
                      {selectedVideoStatus === 'all'
                        ? 'Video: Semua'
                        : selectedVideoStatus === 'with_video'
                        ? `Video: Ada (${totalVideo})`
                        : 'Video: Belum Ada'}
                    </span>
                    <ChevronDown className={`w-3.5 h-3.5 text-slate-400 shrink-0 ml-1 transition-transform duration-200 ${isVideoStatusPickerOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isVideoStatusPickerOpen && (
                    <div className="absolute left-0 mt-1.5 w-60 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 z-30 popover-motion origin-top-left">
                      <div className="px-2 py-1 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1">
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
                              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition-all text-left cursor-pointer ${
                                isSelected
                                  ? 'bg-amber-50 text-amber-800 font-bold'
                                  : 'hover:bg-slate-50 text-slate-700 font-medium'
                              }`}
                            >
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span>{opt.label}</span>
                                  {opt.count !== null && (
                                    <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-bold ${
                                      isSelected ? 'bg-amber-200/60 text-amber-900' : 'bg-slate-100 text-slate-500'
                                    }`}>
                                      {opt.count}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-400 font-normal">{opt.desc}</div>
                              </div>
                              {isSelected && <Check className="w-3.5 h-3.5 text-amber-600 shrink-0 ml-2" />}
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
                    className={`w-full bg-white hover:bg-slate-50 border rounded-xl px-2.5 py-1.5 text-xs font-bold flex items-center justify-between text-left shadow-xs transition-colors cursor-pointer ${
                      selectedProvince !== 'all' ? 'border-blue-300 bg-blue-50/40 text-blue-700' : 'border-slate-200 text-slate-800'
                    }`}
                  >
                    <span className="truncate">
                      {selectedProvince === 'all' ? 'Wilayah: Semua' : `Wilayah: ${selectedProvince}`}
                    </span>
                    <ChevronDown className={`w-3.5 h-3.5 text-slate-400 shrink-0 ml-1 transition-transform duration-200 ${isProvincePickerOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isProvincePickerOpen && (
                    <div className="absolute left-0 sm:left-auto sm:right-0 mt-1.5 w-72 bg-white rounded-2xl shadow-xl border border-slate-100 p-3 z-30 popover-motion origin-top-left sm:origin-top-right">
                      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 text-xs">
                        <div>
                          <span className="font-extrabold text-slate-900 block">Filter Wilayah</span>
                          <span className="text-[10px] text-slate-400">{provinces.length} provinsi tercatat</span>
                        </div>
                        {selectedProvince !== 'all' && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedProvince('all');
                              setIsProvincePickerOpen(false);
                            }}
                            className="text-rose-600 hover:underline font-bold text-[11px]"
                          >
                            Reset
                          </button>
                        )}
                      </div>

                      {/* Mini search for province */}
                      <div className="relative mb-2">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={provinceSearch}
                          onChange={(e) => setProvinceSearch(e.target.value)}
                          placeholder="Cari provinsi..."
                          className="w-full pl-8 pr-7 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-blue-400 font-medium"
                        />
                        {provinceSearch && (
                          <button
                            type="button"
                            onClick={() => setProvinceSearch('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
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
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-all text-left cursor-pointer ${
                            selectedProvince === 'all'
                              ? 'bg-blue-50 text-blue-700 font-bold'
                              : 'hover:bg-slate-50 text-slate-700 font-medium'
                          }`}
                        >
                          <span>Semua Wilayah</span>
                          {selectedProvince === 'all' && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0 ml-2" />}
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
                              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-all text-left cursor-pointer ${
                                isSelected
                                  ? 'bg-blue-50 text-blue-700 font-bold'
                                  : 'hover:bg-slate-50 text-slate-700 font-medium'
                              }`}
                            >
                              <div className="flex items-center gap-1.5 truncate">
                                <MapPin className={`w-3 h-3 shrink-0 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`} />
                                <span className="truncate">{p}</span>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-bold ${
                                  isSelected ? 'bg-blue-200/60 text-blue-800' : 'text-slate-400'
                                }`}>
                                  {count}
                                </span>
                                {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                              </div>
                            </button>
                          );
                        })}
                        {filteredProvinces.length === 0 && (
                          <div className="text-center py-4 text-xs text-slate-400">
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
                    className={`w-full bg-white hover:bg-slate-50 border rounded-xl px-2.5 py-1.5 text-xs font-bold flex items-center justify-between text-left shadow-xs transition-colors cursor-pointer ${
                      selectedOfficers.length > 0 ? 'border-slate-800 bg-slate-900 text-white' : 'border-slate-200 text-slate-800'
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
                      selectedOfficers.length > 0 ? 'text-slate-300' : 'text-slate-400'
                    } ${isOfficerPickerOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isOfficerPickerOpen && (
                    <div className="absolute right-0 mt-1.5 w-72 bg-white rounded-2xl shadow-xl border border-slate-100 p-3 z-30 popover-motion origin-top-right">
                      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 text-xs">
                        <div>
                          <span className="font-extrabold text-slate-900 block">Filter Personil Tim</span>
                          <span className="text-[10px] text-slate-400">Harus bertugas bersama</span>
                        </div>
                        {selectedOfficers.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setSelectedOfficers([])}
                            className="text-rose-600 hover:underline font-bold text-[11px]"
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
                        className="w-full pl-3 pr-2 py-1.5 mb-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-xs font-semibold focus:bg-white focus:outline-none"
                      />

                      <div className="space-y-0.5 max-h-48 overflow-y-auto pr-1">
                        {officerStats
                          .filter(o => o.name.toLowerCase().includes(officerSearch.toLowerCase()))
                          .map(officer => (
                            <label
                              key={officer.name}
                              className="flex items-center justify-between px-2 py-1 rounded-lg hover:bg-slate-50 cursor-pointer text-xs select-none"
                            >
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={selectedOfficers.includes(officer.name)}
                                  onChange={() => toggleOfficer(officer.name)}
                                  className="h-3.5 w-3.5 rounded text-blue-600 border-slate-300"
                                />
                                <span className={selectedOfficers.includes(officer.name) ? 'font-bold text-blue-600' : 'text-slate-700'}>
                                  {officer.name}
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-400 font-bold">
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
                <div className="flex items-center gap-2 flex-wrap pt-2.5 mt-2.5 border-t border-slate-100 text-xs">
                  <span className="text-slate-400 font-bold">Filter aktif:</span>

                  {selectedMonths.map(m => (
                    <span key={m} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-bold text-[11px]">
                      Bulan: {m}
                      <button type="button" onClick={() => toggleMonth(m)} className="hover:text-blue-900">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}

                  {selectedProvince !== 'all' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-bold text-[11px]">
                      Wilayah: {selectedProvince}
                      <button type="button" onClick={() => setSelectedProvince('all')} className="hover:text-blue-900">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}

                  {selectedNewsStatus !== 'all' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-bold text-[11px]">
                      Berita: {selectedNewsStatus === 'with_news' ? 'Tercantum' : 'Belum Ada'}
                      <button type="button" onClick={() => setSelectedNewsStatus('all')} className="hover:text-blue-900">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}

                  {selectedVideoStatus !== 'all' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-bold text-[11px]">
                      Video: {selectedVideoStatus === 'with_video' ? 'Tercantum' : 'Belum Ada'}
                      <button type="button" onClick={() => setSelectedVideoStatus('all')} className="hover:text-blue-900">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}

                  {selectedOfficers.map(name => (
                    <span key={name} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-900 text-white font-bold text-[11px]">
                      {name}
                      <button type="button" onClick={() => toggleOfficer(name)} className="hover:text-slate-300">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}

                  <button
                    type="button"
                    onClick={resetRekapFilters}
                    className="text-xs font-bold text-rose-600 hover:underline ml-1"
                  >
                    Atur Ulang Semua
                  </button>
                </div>
              )}

            </div>

            {/* Results Counter Above Table */}
            <div className="flex items-center justify-between px-1 text-xs font-bold text-slate-500">
              <p>
                Menampilkan <span className="text-blue-600 font-extrabold">{rekapResults.length}</span> dari {activities.length} kegiatan
              </p>
            </div>

            {/* Table Card */}
            <div className="invo-card overflow-hidden">
              <div className="overflow-x-auto max-h-[640px]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-md border-b border-slate-200 text-slate-500 font-extrabold text-[11px] uppercase tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3 w-12 text-center">No</th>
                      <th className="py-2.5 px-3 w-28 whitespace-nowrap">Tanggal</th>
                      <th className="py-2.5 px-3 min-w-[240px]">Nama Kegiatan</th>
                      <th className="py-2.5 px-3 min-w-[150px]">Lokasi</th>
                      <th className="py-2.5 px-3 min-w-[160px]">Petugas</th>
                      <th className="py-2.5 px-3 w-28 text-center">Berita</th>
                      <th className="py-2.5 px-3 w-28 text-center">Video</th>
                      <th className="py-2.5 px-3 w-20 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {rekapResults.map(item => {
                      const hasNews = item.ada_berita && item.link_berita;
                      const hasVideo = item.ada_video && (item.link_video || (item.link_videos && item.link_videos.length > 0));
                      const videoNeedsCheck = item.ada_video && !hasVideo;

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2.5 px-3 text-center font-extrabold text-slate-700">
                            #{cleanNomor(item.nomor)}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap text-slate-700 font-semibold">
                            {item.tanggal_formatted || item.tanggal}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-slate-900 leading-snug">
                            {item.kegiatan}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 font-medium">
                            {item.lokasi || '-'}
                          </td>
                          
                          {/* Petugas: Max 2 names + '+N' chip to maintain uniform row height */}
                          <td className="py-2.5 px-3">
                            <div className="flex flex-wrap items-center gap-1">
                              {item.petugas.slice(0, 2).map((o, idx) => (
                                <span
                                  key={idx}
                                  onClick={() => toggleOfficer(o)}
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors border ${
                                    selectedOfficers.includes(o)
                                      ? 'bg-blue-600 text-white border-blue-600'
                                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                                  }`}
                                  title="Klik untuk memfilter personil ini"
                                >
                                  {o}
                                </span>
                              ))}
                              {item.petugas.length > 2 && (
                                <button
                                  onClick={() => setSelectedDetailItem(item)}
                                  className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition-colors"
                                  title={item.petugas.slice(2).join(', ')}
                                >
                                  +{item.petugas.length - 2}
                                </button>
                              )}
                              {item.petugas.length === 0 && (
                                <span className="text-slate-300 italic text-[10px]">-</span>
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
                                title={item.judul_berita || 'Buka rilis resmi pkp.go.id'}
                                className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-md transition-colors"
                              >
                                <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                                <span>Tercantum</span>
                              </a>
                            ) : item.ada_berita ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-md">
                                <AlertCircle className="w-3 h-3 text-amber-500 shrink-0" />
                                <span>Perlu cek</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-400 bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded-md">
                                <Minus className="w-3 h-3 text-slate-400 shrink-0" />
                                <span>Tidak ada</span>
                              </span>
                            )}
                          </td>

                          {/* Kolom Video: Multi-Video or Single Video */}
                          <td className="py-2.5 px-3 text-center">
                            {hasVideo ? (
                              item.link_videos && item.link_videos.length > 1 ? (
                                <div className="inline-flex items-center gap-1 justify-center flex-wrap">
                                  {item.link_videos.map((vUrl, idx) => (
                                    <a
                                      key={idx}
                                      href={vUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-0.5 text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 px-1.5 py-0.5 rounded-md transition-colors"
                                      title={`Video ${idx + 1}: ${vUrl}`}
                                    >
                                      <Video className="w-2.5 h-2.5 text-blue-600" />
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
                                  className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 px-2 py-0.5 rounded-md transition-colors"
                                  title="Buka tautan video liputan"
                                >
                                  <Video className="w-3 h-3 text-blue-600" />
                                  <span>Tercantum</span>
                                  <ArrowUpRight className="w-2.5 h-2.5 opacity-60" />
                                </a>
                              )
                            ) : videoNeedsCheck ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-md">
                                <AlertCircle className="w-3 h-3 text-amber-500" />
                                <span>Perlu cek</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-400 bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded-md">
                                <Minus className="w-3 h-3 text-slate-400" />
                                <span>Tidak ada</span>
                              </span>
                            )}
                          </td>

                          {/* Kolom Aksi: Tombol Detail dengan panah (Salin WA ada di dalam Drawer) */}
                          <td className="py-2.5 px-3 text-center">
                            <button
                              onClick={() => setSelectedDetailItem(item)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-600 border border-slate-200 hover:border-blue-200 transition-all shadow-xs"
                            >
                              <span>Detail</span>
                              <ChevronRight className="w-3 h-3" />
                            </button>
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
        {/* VIEW 4: TIM PELIPUTAN (25 PERSONIL WITH AVATARS & BARS)  */}
        {/* ======================================================== */}
        {currentMenu === 'tim' && (
          <div className="space-y-4 page-transition">
            <div className="invo-card p-5 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
                <div>
                  <h3 className="text-lg sm:text-xl font-extrabold text-slate-900">
                    Tim Peliputan
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Daftar seluruh personil liputan Biro Komunikasi Publik Kementerian PKP 2026.
                  </p>
                </div>
                <div className="text-xs font-extrabold bg-blue-50 text-blue-600 px-3 py-1 rounded-xl border border-blue-100 self-start sm:self-auto">
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
                      className="invo-card invo-card-hover p-4 cursor-pointer group flex flex-col justify-between motion-card-enter"
                    >
                      <div>
                        {/* Top Row: Initials avatar + Rank */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-blue-400 text-white font-extrabold text-xs flex items-center justify-center shadow-xs">
                              {getInitials(officer.name)}
                            </div>
                            <div>
                              <h4 className="text-sm font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors">
                                {officer.name}
                              </h4>
                              <p className="text-[10px] text-slate-400 font-medium">
                                Bulan teraktif: <span className="text-slate-600 font-bold">{peakM}</span>
                              </p>
                            </div>
                          </div>

                          <span className="text-xs font-black px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700">
                            #{index + 1}
                          </span>
                        </div>

                        {/* Total Penugasan (Tanpa Bar) */}
                        <div className="flex items-center justify-between my-2 text-xs font-bold">
                          <span className="text-slate-400">Total Penugasan</span>
                          <span className="text-blue-600 font-extrabold bg-blue-50 px-2 py-0.5 rounded-lg">
                            {officer.count} kegiatan
                          </span>
                        </div>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-medium">
                        <span>Peringkat ke-{index + 1}</span>
                        <span className="text-blue-600 font-bold group-hover:underline inline-flex items-center gap-0.5">
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
          <div className="max-w-2xl mx-auto py-6 page-transition">
            <div className="invo-card p-6 sm:p-8 text-center">
              <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-2.5 border border-amber-200">
                <Wrench className="w-6 h-6" />
              </div>
              <span className="inline-block text-xs font-bold bg-amber-100 text-amber-900 px-2.5 py-0.5 rounded-full mb-2">
                Sedang Disiapkan
              </span>
              <h3 className="text-xl font-extrabold text-slate-900">
                Modul Laporan Berkala Pimpinan
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Fitur format laporan berkala resmi periodik untuk pimpinan sedang diintegrasikan.
              </p>

              <button
                type="button"
                onClick={() => navigateMenu('rekapitulasi')}
                className="mt-5 px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-md transition-colors"
              >
                Kembali ke Rekapitulasi Kegiatan
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
            <div className="invo-card p-4 sm:p-5">
              
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse"></span>
                    <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                      Kliping & Rilis Berita Pers
                    </h2>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200">
                      {filteredNews.length} Rilis
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Arsip rilis pers resmi Kementerian Perumahan dan Kawasan Permukiman (pkp.go.id).
                  </p>
                </div>

                {/* Year Switcher Pills */}
                <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl self-start md:self-auto border border-slate-200/60">
                  {['2026', '2025', '2024', 'all'].map(year => {
                    const isSelected = selectedNewsYear === year;
                    const label = year === 'all' ? 'Semua Tahun' : year;
                    const count = newsYearCounts[year] || 0;

                    return (
                      <button
                        key={year}
                        type="button"
                        onClick={() => {
                          setSelectedNewsYear(year);
                          setNewsLimit(30);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all duration-150 flex items-center gap-1.5 cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                        }`}
                      >
                        <span>{label}</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                        }`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Statistics Metric Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-4 border-b border-slate-100">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Total Berita Terdata
                  </div>
                  <div className="text-xl font-black text-slate-900 mt-0.5">
                    {newsStats.totalCount.toLocaleString('id-ID')}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    Tahun {selectedNewsYear === 'all' ? '2024 - 2026' : selectedNewsYear}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Akumulasi Pembaca
                  </div>
                  <div className="text-xl font-black text-emerald-600 mt-0.5">
                    {newsStats.totalReaders.toLocaleString('id-ID')}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    Total views di pkp.go.id
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Rata-Rata Pembaca
                  </div>
                  <div className="text-xl font-black text-blue-600 mt-0.5">
                    {newsStats.avgReaders.toLocaleString('id-ID')}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    Per rilis berita
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Paling Banyak Dibaca
                  </div>
                  <div className="text-xl font-black text-amber-600 mt-0.5">
                    {newsStats.topArticle ? (newsStats.topArticle.pembaca || 0).toLocaleString('id-ID') : 0}
                  </div>
                  <div className="text-[10px] text-slate-500 truncate mt-0.5" title={newsStats.topArticle?.judul}>
                    {newsStats.topArticle ? newsStats.topArticle.judul : '-'}
                  </div>
                </div>
              </div>

              {/* Search & Sort Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Cari rilis berita berdasarkan topik, kata kunci, nama menteri, daerah..."
                    value={newsSearch}
                    onChange={(e) => {
                      setNewsSearch(e.target.value);
                      setNewsLimit(30);
                    }}
                    className="w-full pl-9 pr-8 py-2 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 rounded-xl text-slate-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                  {newsSearch && (
                    <button
                      onClick={() => setNewsSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Custom Sort Popover */}
                <div className="relative shrink-0" ref={newsSortPickerRef}>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-500 hidden sm:inline">Urutkan:</span>
                    <button
                      type="button"
                      onClick={() => setIsNewsSortPickerOpen(!isNewsSortPickerOpen)}
                      className="bg-white hover:bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 flex items-center justify-between gap-2 shadow-xs transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-1.5">
                        {newsSort === 'newest' && <Clock className="w-3.5 h-3.5 text-blue-600" />}
                        {newsSort === 'popular' && <Flame className="w-3.5 h-3.5 text-rose-500" />}
                        {newsSort === 'oldest' && <RotateCcw className="w-3.5 h-3.5 text-slate-500" />}
                        <span>
                          {newsSort === 'newest' ? 'Terbaru' : newsSort === 'popular' ? 'Terpopuler' : 'Terlama'}
                        </span>
                      </div>
                      <ChevronDown className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200 ${isNewsSortPickerOpen ? 'rotate-180' : ''}`} />
                    </button>
                  </div>

                  {isNewsSortPickerOpen && (
                    <div className="absolute right-0 mt-1.5 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 z-30 popover-motion origin-top-right">
                      <div className="px-2.5 py-1.5 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1">
                        Urutan Tampilan Berita
                      </div>
                      <div className="space-y-0.5">
                        {[
                          { id: 'newest', label: 'Terbaru', desc: 'Sesuai tanggal tayang rilis berita', icon: Clock, color: 'text-blue-600' },
                          { id: 'popular', label: 'Terpopuler', desc: 'Jumlah pembaca artikel terbanyak', icon: Flame, color: 'text-rose-500' },
                          { id: 'oldest', label: 'Terlama', desc: 'Mulai dari awal tahun rilis', icon: RotateCcw, color: 'text-slate-500' }
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
                              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition-all text-left cursor-pointer ${
                                isSelected
                                  ? 'bg-blue-50 text-blue-700 font-bold'
                                  : 'hover:bg-slate-50 text-slate-700 font-medium'
                              }`}
                            >
                              <div className="flex items-start gap-2">
                                <IconComp className={`w-4 h-4 mt-0.5 shrink-0 ${opt.color}`} />
                                <div>
                                  <div className="font-bold">{opt.label}</div>
                                  <div className="text-[10px] text-slate-400 font-normal">{opt.desc}</div>
                                </div>
                              </div>
                              {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0 ml-2" />}
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
                <span className="text-slate-400 font-bold text-[11px]">Topik populer:</span>
                {['Rusun', 'BSPS', 'Maruarar', 'Fahri Hamzah', 'KPP', 'Wisma Atlet', 'BPS', 'Bencana', 'Jakarta'].map(chip => (
                  <button
                    key={chip}
                    onClick={() => {
                      setNewsSearch(chip);
                      setNewsLimit(30);
                    }}
                    className={`px-2 py-0.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      newsSearch === chip
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-700'
                    }`}
                  >
                    {chip}
                  </button>
                ))}
                {newsSearch && (
                  <button
                    onClick={() => setNewsSearch('')}
                    className="text-[11px] text-rose-600 hover:underline font-bold ml-1 cursor-pointer"
                  >
                    Hapus Filter
                  </button>
                )}
              </div>

            </div>

            {/* News Cards Feed */}
            {displayedNews.length === 0 ? (
              <div className="invo-card p-10 text-center">
                <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <h4 className="font-extrabold text-sm text-slate-700">Tidak ada rilis berita yang cocok</h4>
                <p className="text-xs text-slate-400 mt-1">Coba gunakan kata kunci lain atau pilih tab tahun yang berbeda.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {displayedNews.map(item => (
                  <div
                    key={item.id}
                    className="invo-card invo-card-hover p-4 sm:p-5 flex flex-col justify-between group motion-card-enter"
                  >
                    <div>
                      {/* Top Meta Row */}
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 font-extrabold text-[10px]">
                            {item.tahun}
                          </span>
                          <span className="font-semibold text-slate-600 flex items-center gap-1.5 text-xs">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            {item.tanggal_formatted}
                          </span>
                          {item.lokasi && (
                            <span className="text-slate-500 font-medium flex items-center gap-1 text-xs">
                              <MapPin className="w-3 h-3 text-rose-500" />
                              {item.lokasi}
                            </span>
                          )}
                        </div>

                        {/* Engagement Metric */}
                        {item.pembaca > 0 && (
                          <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
                            <Eye className="w-3 h-3 text-emerald-600" />
                            <span>{item.pembaca.toLocaleString('id-ID')} Pembaca</span>
                          </div>
                        )}
                      </div>

                      {/* Title */}
                      <h3
                        onClick={() => setSelectedNewsDetail(item)}
                        className="text-sm sm:text-base font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors cursor-pointer leading-snug"
                      >
                        {item.judul}
                      </h3>

                      {/* Lead Paragraph / Summary */}
                      {item.ringkasan && (
                        <p className="text-xs text-slate-600 font-medium line-clamp-2 leading-relaxed mt-2">
                          {item.ringkasan}
                        </p>
                      )}
                    </div>

                    {/* Bottom Actions Row */}
                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs gap-2">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedNewsDetail(item)}
                          className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-[11px] transition-colors cursor-pointer"
                        >
                          Baca Selengkapnya
                        </button>

                        {item.link && (
                          <a
                            href={item.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[11px] transition-colors"
                          >
                            <span>pkp.go.id</span>
                            <ArrowUpRight className="w-3 h-3" />
                          </a>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => copyNewsWA(item)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-1 text-[11px] font-semibold cursor-pointer"
                        title="Salin ringkasan rilis untuk WhatsApp"
                      >
                        {newsCopyStatus[item.id] ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-600 font-bold">Tersalin</span>
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
                      className="px-5 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 font-bold text-xs shadow-xs transition-colors cursor-pointer"
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
            className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs drawer-backdrop"
          />

          {/* Drawer Container */}
          <div className="relative w-full max-w-[480px] bg-white h-full shadow-2xl flex flex-col z-10 drawer-slide-in overflow-hidden">
            
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-slate-900 text-white text-xs font-extrabold">
                  #{cleanNomor(selectedDetailItem.nomor)}
                </span>
                <h3 className="text-base font-extrabold text-slate-900">
                  Detail Kegiatan
                </h3>
              </div>
              <button
                onClick={() => setSelectedDetailItem(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
              
              {/* Tanggal & Lokasi */}
              <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                    Tanggal Kegiatan
                  </span>
                  <span className="font-extrabold text-slate-800">
                    {selectedDetailItem.tanggal_formatted || selectedDetailItem.tanggal}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                    Wilayah / Provinsi
                  </span>
                  <span className="font-extrabold text-slate-800">
                    {selectedDetailItem.provinsi || '-'}
                  </span>
                </div>
              </div>

              {/* Nama Kegiatan */}
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Nama Agenda / Kegiatan
                </span>
                <h4 className="text-sm sm:text-base font-extrabold text-slate-900 leading-snug">
                  {selectedDetailItem.kegiatan}
                </h4>
                {selectedDetailItem.lokasi && (
                  <p className="text-slate-500 font-medium mt-1 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    <span>{selectedDetailItem.lokasi}</span>
                  </p>
                )}
              </div>

              {/* Status Rilis Berita */}
              <div className="p-3.5 rounded-xl border border-slate-200/80 bg-white shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-slate-700">
                    <Newspaper className="w-4 h-4 text-emerald-600" />
                    <span>Publikasi Berita</span>
                  </div>
                  {selectedDetailItem.ada_berita && selectedDetailItem.link_berita ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>Tercantum</span>
                    </span>
                  ) : selectedDetailItem.ada_berita ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200">
                      <AlertCircle className="w-3 h-3 text-amber-500" />
                      <span>Perlu cek</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-500">
                      <Minus className="w-3 h-3 text-slate-400" />
                      <span>Belum ada</span>
                    </span>
                  )}
                </div>

                {selectedDetailItem.judul_berita && (
                  <p className="font-semibold text-slate-800 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    {selectedDetailItem.judul_berita}
                  </p>
                )}

                {selectedDetailItem.link_berita && (
                  <a
                    href={selectedDetailItem.link_berita}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-800 font-bold hover:underline"
                  >
                    <span>Buka Rilis Resmi di pkp.go.id</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              {/* Status Publikasi Video */}
              <div className="p-3.5 rounded-xl border border-slate-200/80 bg-white shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-slate-700">
                    <Video className="w-4 h-4 text-blue-600" />
                    <span>Publikasi Video Liputan</span>
                  </div>
                  {selectedDetailItem.ada_video && (selectedDetailItem.link_video || (selectedDetailItem.link_videos && selectedDetailItem.link_videos.length > 0)) ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200">
                      <CheckCircle2 className="w-3 h-3 text-blue-600" />
                      <span>
                        {selectedDetailItem.link_videos && selectedDetailItem.link_videos.length > 1
                          ? `${selectedDetailItem.link_videos.length} Video`
                          : 'Tercantum'}
                      </span>
                    </span>
                  ) : selectedDetailItem.ada_video ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200">
                      <AlertCircle className="w-3 h-3 text-amber-500" />
                      <span>Perlu cek</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-500">
                      <Minus className="w-3 h-3 text-slate-400" />
                      <span>Belum ada</span>
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
                        className="flex items-center justify-between p-2 rounded-lg bg-blue-50/70 hover:bg-blue-100 border border-blue-200 text-blue-700 font-bold text-xs transition-colors"
                      >
                        <span className="flex items-center gap-2 truncate">
                          <Video className="w-3.5 h-3.5 text-blue-600 shrink-0" />
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
                    className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-800 font-bold hover:underline"
                  >
                    <span>Buka Tautan Video</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                ) : null}
              </div>

              {/* Daftar Petugas */}
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Petugas Liputan yang Bertugas
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedDetailItem.petugas.length > 0 ? (
                    selectedDetailItem.petugas.map((officer, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 font-bold text-xs"
                      >
                        {officer}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-400 italic">Petugas belum tercatat</span>
                  )}
                </div>
              </div>

            </div>

            {/* Footer with Salin Format WA Button */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/70 space-y-2">
              <button
                onClick={() => copyReport(selectedDetailItem)}
                className={`w-full h-10 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                  copyStatus[selectedDetailItem.id]
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-slate-900 hover:bg-slate-800 text-white shadow-sm'
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
            className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs drawer-backdrop"
          />

          {/* Drawer Container */}
          <div className="relative w-full max-w-[560px] bg-white h-full shadow-2xl flex flex-col z-10 drawer-slide-in overflow-hidden">
            
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-blue-600 text-white text-xs font-extrabold">
                  {selectedNewsDetail.tahun}
                </span>
                <h3 className="text-base font-extrabold text-slate-900">
                  Rilis Berita Resmi
                </h3>
              </div>
              <button
                onClick={() => setSelectedNewsDetail(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
              
              {/* Meta Stats Pill */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  {selectedNewsDetail.tanggal_formatted}
                </span>
                {selectedNewsDetail.lokasi && (
                  <span className="inline-flex items-center gap-1 font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                    <MapPin className="w-3.5 h-3.5 text-rose-500" />
                    {selectedNewsDetail.lokasi}
                  </span>
                )}
                {selectedNewsDetail.pembaca > 0 && (
                  <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                    <Eye className="w-3.5 h-3.5 text-emerald-600" />
                    {selectedNewsDetail.pembaca.toLocaleString('id-ID')} Pembaca
                  </span>
                )}
              </div>

              {/* Title */}
              <h2 className="text-base sm:text-lg font-black text-slate-900 leading-snug">
                {selectedNewsDetail.judul}
              </h2>

              {/* Ringkasan / Lead paragraph */}
              {selectedNewsDetail.ringkasan && (
                <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-100 text-slate-700 text-xs leading-relaxed font-medium">
                  <span className="text-[10px] font-extrabold text-blue-600 uppercase tracking-wider block mb-1">
                    Ringkasan Berita
                  </span>
                  {selectedNewsDetail.ringkasan}
                </div>
              )}

              {/* Full Body Article */}
              <div className="space-y-3 pt-2 text-slate-800 leading-relaxed text-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
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
                    className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-800 font-bold hover:underline text-xs"
                  >
                    <span>Buka Rilis Resmi di pkp.go.id</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}

            </div>

            {/* Bottom Actions */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/80 flex items-center gap-2">
              <button
                onClick={() => copyNewsWA(selectedNewsDetail)}
                className={`flex-1 h-10 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  newsCopyStatus[selectedNewsDetail.id]
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-slate-900 hover:bg-slate-800 text-white shadow-sm'
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
                  className="px-3 h-10 rounded-xl font-bold text-xs bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center gap-1.5 shrink-0 transition-colors"
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
      <footer className="py-4 mt-auto text-center text-[11px] text-slate-400 border-t border-slate-200/50">
        <p>© 2026 Tim Peliputan & Publikasi - Biro Komunikasi Publik PKP</p>
      </footer>

    </div>
  );
}
