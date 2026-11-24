#!/usr/bin/env python3
"""
Sync script to fetch news articles from Google Sheet (sheets: 2026, 2025, 2024)
and save atomically to src/data/news.json
"""
import urllib.request
import zipfile
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta
import json
import os
import re

MONTHS_ID = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

SHEET_URL = 'https://docs.google.com/spreadsheets/d/19BIJfZg3ZzV4uDEAbQg77LDBzQtxYr2O3BQbYmy5caU/export?format=xlsx'
TMP_FILE = '/tmp/berita_sheet_sync.xlsx'

base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TARGET_JSON = os.path.join(base_dir, 'src', 'data', 'news.json')

def safe_str(val):
    if val is None:
        return ''
    return str(val).strip()

def parse_excel_date(val_str):
    if not val_str:
        return None, '', '', '', 0, 0
    try:
        f_val = float(val_str)
        # Excel date calculation
        dt = datetime(1899, 12, 30) + timedelta(days=f_val)
        date_iso = dt.strftime('%Y-%m-%d')
        date_formatted = f"{dt.day:02d} {MONTHS_ID[dt.month]} {dt.year}"
        month_name = MONTHS_ID[dt.month]
        return dt, date_iso, date_formatted, month_name, dt.month, dt.year
    except (ValueError, OverflowError):
        val_clean = str(val_str).strip()
        return None, val_clean, val_clean, '', 0, 0

def clean_readers(val_str):
    if not val_str:
        return 0
    try:
        return int(float(val_str))
    except (ValueError, TypeError):
        return 0

def main():
    print(f"📥 Mengunduh data berita dari Google Sheet...")
    urllib.request.urlretrieve(SHEET_URL, TMP_FILE)

    print("⚙️ Memproses lembar kerja berita per tahun...")
    news_items = []
    current_id = 1

    with zipfile.ZipFile(TMP_FILE, 'r') as z:
        wb_root = ET.fromstring(z.read('xl/workbook.xml'))
        ns = {'ns': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
        sheet_info = [(s.attrib.get('name'), s.attrib.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id')) 
                      for s in wb_root.findall('.//ns:sheet', ns)]
        
        rels_root = ET.fromstring(z.read('xl/_rels/workbook.xml.rels'))
        rns = {'r': 'http://schemas.openxmlformats.org/package/2006/relationships'}
        rels = {r.attrib.get('Id'): r.attrib.get('Target') for r in rels_root.findall('.//r:Relationship', rns)}

        sst_root = ET.fromstring(z.read('xl/sharedStrings.xml'))
        sst = [''.join(t.text or '' for t in si.findall('.//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t')) 
               for si in sst_root.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}si')]

        # Priority order: 2026, 2025, 2024
        for sname, rid in sheet_info:
            if rid not in rels:
                continue
            target_xml = 'xl/' + rels[rid]
            s_root = ET.fromstring(z.read(target_xml))
            rows = s_root.findall('.//ns:row', ns)
            
            sheet_count = 0
            for r in rows[1:]: # Skip header row
                row_vals = {}
                for c in r.findall('ns:c', ns):
                    coord = c.attrib.get('r')
                    col = ''.join([ch for ch in coord if ch.isalpha()])
                    t = c.attrib.get('t')
                    v = c.find('ns:v', ns)
                    val = v.text if v is not None else ''
                    if t == 's' and val.isdigit():
                        val = sst[int(val)]
                    row_vals[col] = val

                judul = safe_str(row_vals.get('A'))
                if not judul:
                    continue

                raw_tgl = safe_str(row_vals.get('B'))
                dt, date_iso, date_formatted, month_name, month_idx, year_val = parse_excel_date(raw_tgl)
                
                # Sheet name fallback for year if year_val is 0
                if not year_val:
                    try:
                        year_val = int(sname)
                    except ValueError:
                        year_val = 2026

                readers = clean_readers(row_vals.get('C'))
                ringkasan = safe_str(row_vals.get('D'))
                lokasi = safe_str(row_vals.get('E'))
                link = safe_str(row_vals.get('F'))
                timestamp_scrape = safe_str(row_vals.get('G'))
                isi_lengkap = safe_str(row_vals.get('H'))

                news_items.append({
                    'id': current_id,
                    'tahun': str(year_val),
                    'judul': judul,
                    'tanggal': date_iso,
                    'tanggal_formatted': date_formatted or raw_tgl,
                    'bulan': month_name,
                    'bulan_idx': month_idx,
                    'pembaca': readers,
                    'ringkasan': ringkasan,
                    'lokasi': lokasi,
                    'link': link,
                    'timestamp_scrape': timestamp_scrape,
                    'isi_lengkap': isi_lengkap
                })
                current_id += 1
                sheet_count += 1

            print(f"   • Sheet {sname}: {sheet_count} berita terproses.")

    # Sort descending by date / id
    news_items.sort(key=lambda x: (x.get('tanggal') or '', x.get('id', 0)), reverse=True)

    os.makedirs(os.path.dirname(TARGET_JSON), exist_ok=True)
    tmp_json = TARGET_JSON + '.tmp'
    with open(tmp_json, 'w', encoding='utf-8') as f:
        json.dump(news_items, f, ensure_ascii=False, indent=2)
    os.replace(tmp_json, TARGET_JSON)

    print(f"✅ Berhasil menyinkronkan total {len(news_items)} berita ke {TARGET_JSON}!")

if __name__ == '__main__':
    main()
