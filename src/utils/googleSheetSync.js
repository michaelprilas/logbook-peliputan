/**
 * Direct Client-Side Live Sync Engine with Google Sheets
 * Enables real-time data sync directly from Google Spreadsheets
 * without relying solely on backend server middleware (works on GitHub Pages & Localhost).
 */

const MONTHS_ID = [
  '', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export const SHEET_LOGBOOK_ID = '16Q_Mrbs2oHPMv-xcCaB9zJ5_JMjAfr9F';
export const SHEET_BERITA_ID = '19BIJfZg3ZzV4uDEAbQg77LDBzQtxYr2O3BQbYmy5caU';

/**
 * Robust RFC 4180 compliant CSV parser that handles:
 * - Commas inside quoted fields
 * - Escaped quotes ("")
 * - Multiline rows
 */
export function parseCSV(text) {
  const rows = [];
  let currentRow = [];
  let currentField = '';
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"';
        i += 2;
        continue;
      } else {
        inQuotes = !inQuotes;
        i++;
        continue;
      }
    }

    if (char === ',' && !inQuotes) {
      currentRow.push(currentField);
      currentField = '';
      i++;
      continue;
    }

    if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      currentRow.push(currentField);
      currentField = '';
      if (currentRow.some(field => field.trim().length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      i++;
      continue;
    }

    currentField += char;
    i++;
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    if (currentRow.some(field => field.trim().length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

/**
 * Parse date string from Google Sheets
 * Supports:
 * - DD/MM/YY or DD/MM/YYYY
 * - YYYY-MM-DD
 * - Excel serial number
 */
export function parseSheetDate(raw) {
  if (!raw) return { dateStr: '', dateFormatted: '', monthName: '', monthIdx: 0, year: 2026 };

  const str = String(raw).trim();

  // Excel serial number (e.g. 46000+)
  const numVal = parseFloat(str);
  if (!isNaN(numVal) && numVal > 20000 && !str.includes('/') && !str.includes('-')) {
    const dt = new Date(Date.UTC(1899, 11, 30) + Math.round(numVal * 86400000));
    const y = dt.getUTCFullYear();
    const m = dt.getUTCMonth() + 1;
    const d = dt.getUTCDate();
    const mName = MONTHS_ID[m] || '';
    const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dateFormatted = `${String(d).padStart(2, '0')} ${mName} ${y}`;
    return { dateStr, dateFormatted, monthName: mName, monthIdx: m, year: y };
  }

  // DD/MM/YY or DD/MM/YYYY or D/M/YY
  const slashMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (slashMatch) {
    const d = parseInt(slashMatch[1], 10);
    const m = parseInt(slashMatch[2], 10);
    let y = parseInt(slashMatch[3], 10);
    if (y < 100) y += 2000;
    const mName = MONTHS_ID[m] || '';
    const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dateFormatted = `${String(d).padStart(2, '0')} ${mName} ${y}`;
    return { dateStr, dateFormatted, monthName: mName, monthIdx: m, year: y };
  }

  // YYYY-MM-DD
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const y = parseInt(isoMatch[1], 10);
    const m = parseInt(isoMatch[2], 10);
    const d = parseInt(isoMatch[3], 10);
    const mName = MONTHS_ID[m] || '';
    const dateFormatted = `${String(d).padStart(2, '0')} ${mName} ${y}`;
    return { dateStr: str, dateFormatted, monthName: mName, monthIdx: m, year: y };
  }

  return { dateStr: str, dateFormatted: str, monthName: '', monthIdx: 0, year: 2026 };
}

/**
 * Fetch and parse Activities live directly from Google Sheet
 */
export async function fetchLiveActivities() {
  const timestamp = Date.now();
  const dbUrl = `https://docs.google.com/spreadsheets/d/${SHEET_LOGBOOK_ID}/gviz/tq?tqx=out:csv&sheet=Database&_nc=${timestamp}`;
  const crosscheckUrl = `https://docs.google.com/spreadsheets/d/${SHEET_LOGBOOK_ID}/gviz/tq?tqx=out:csv&sheet=Crosscheck%20Berita&_nc=${timestamp}`;

  // Fetch both sheets in parallel with cache-busting
  const [dbRes, crossRes] = await Promise.allSettled([
    fetch(dbUrl, { cache: 'no-store' }),
    fetch(crosscheckUrl, { cache: 'no-store' })
  ]);

  if (dbRes.status !== 'fulfilled' || !dbRes.value.ok) {
    throw new Error(`Gagal mengunduh lembar Database: ${dbRes.status === 'fulfilled' ? dbRes.value.statusText : dbRes.reason}`);
  }

  const dbText = await dbRes.value.text();
  const dbRows = parseCSV(dbText);

  // Map headlines from Crosscheck Berita if available
  const newsTitles = {};
  if (crossRes.status === 'fulfilled' && crossRes.value.ok) {
    try {
      const crossText = await crossRes.value.text();
      const crossRows = parseCSV(crossText);
      for (let i = 1; i < crossRows.length; i++) {
        const row = crossRows[i];
        const nomor = (row[0] || '').replace(/\.0$/, '').trim();
        const judul = (row[5] || '').trim();
        const link = (row[7] || '').trim();
        if (nomor && judul) {
          newsTitles[nomor] = { judul, link };
        }
      }
    } catch {
      // Non-fatal if crosscheck fails
    }
  }

  const activities = [];

  for (let i = 1; i < dbRows.length; i++) {
    const r = dbRows[i];
    const nomor = (r[0] || '').replace(/\.0$/, '').trim();
    const rawTgl = (r[1] || '').trim();
    const kegiatan = (r[2] || '').trim();
    const lokasiRaw = (r[3] || '').trim();
    const beritaVal = (r[4] || '').trim();
    const videoVal = (r[5] || '').trim();
    const petugasRaw = (r[6] || '').trim();

    // Skip empty stub rows
    if (!nomor || !kegiatan) continue;

    const { dateStr, dateFormatted, monthName, monthIdx, year } = parseSheetDate(rawTgl);

    let kota = lokasiRaw;
    let provinsi = '';
    if (lokasiRaw.includes(',')) {
      const parts = lokasiRaw.split(',').map(s => s.trim());
      kota = parts[0];
      provinsi = parts.slice(1).join(', ');
    } else if (lokasiRaw.includes('-')) {
      const parts = lokasiRaw.split('-').map(s => s.trim());
      kota = parts[0];
      provinsi = parts[1];
    }

    const matchedNews = newsTitles[nomor];
    const matchedTitle = matchedNews?.judul || '';
    let linkBerita = beritaVal.startsWith('http') ? beritaVal : '';
    if (!linkBerita && matchedNews?.link) {
      linkBerita = matchedNews.link;
    }

    const hasBerita = Boolean(
      linkBerita ||
      (beritaVal && !['-', 'tidak ada', ''].includes(beritaVal.toLowerCase()))
    );

    const hasVideo = Boolean(
      (videoVal.startsWith('http') ? videoVal : '') ||
      (videoVal && !['-', 'tidak ada', ''].includes(videoVal.toLowerCase()))
    );

    const petugasList = petugasRaw
      .split(/[,/;]+/)
      .map(p => p.trim())
      .filter(p => p && p !== '-');

    activities.push({
      id: parseInt(nomor, 10) || nomor,
      nomor,
      tanggal: dateStr,
      tanggal_formatted: dateFormatted,
      bulan: monthName,
      bulan_idx: monthIdx,
      tahun: year,
      kegiatan,
      lokasi: lokasiRaw,
      kota,
      provinsi,
      ada_berita: hasBerita,
      link_berita: linkBerita,
      judul_berita: matchedTitle,
      ada_video: hasVideo,
      link_video: videoVal.startsWith('http') ? videoVal : '',
      petugas: petugasList,
      petugas_raw: petugasRaw
    });
  }

  return activities;
}

/**
 * Fetch and parse News articles live from Google Sheet (sheet: 2026)
 */
export async function fetchLiveNews() {
  const timestamp = Date.now();
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_BERITA_ID}/gviz/tq?tqx=out:csv&sheet=2026&_nc=${timestamp}`;

  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`Gagal mengunduh lembar Berita: ${res.statusText}`);
  }

  const csvText = await res.text();
  const rows = parseCSV(csvText);
  const newsItems = [];

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const judul = (r[0] || '').trim();
    if (!judul || judul === '-' || judul.length < 3) continue;

    const rawTgl = (r[1] || '').trim();
    const { dateStr, dateFormatted, monthName, monthIdx } = parseSheetDate(rawTgl);

    const rawPembaca = (r[2] || '').replace(/[,.]/g, '').trim();
    const pembaca = parseInt(rawPembaca, 10) || 0;

    const ringkasan = (r[3] || '').trim();
    const lokasi = (r[4] || '').trim();
    const link = (r[5] || '').trim();
    const timestampScrape = (r[6] || '').trim();
    const isiLengkap = (r[7] || '').trim();

    newsItems.push({
      id: i,
      tahun: '2026',
      judul,
      tanggal: dateStr,
      tanggal_formatted: dateFormatted,
      bulan: monthName,
      bulan_idx: monthIdx,
      pembaca,
      ringkasan,
      lokasi,
      link,
      timestamp_scrape: timestampScrape,
      isi_lengkap: isiLengkap
    });
  }

  return newsItems;
}
