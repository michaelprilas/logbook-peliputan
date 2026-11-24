#!/usr/bin/env python3
"""
Sync script to fetch latest Google Sheet data and update src/data/activities.json
"""
import urllib.request
import zipfile
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta
import json
import re
import os

MONTHS_ID = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

SHEET_URL = 'https://docs.google.com/spreadsheets/d/16Q_Mrbs2oHPMv-xcCaB9zJ5_JMjAfr9F/export?format=xlsx'
TMP_FILE = '/tmp/sheet_sync.xlsx'

base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TARGET_JSON = os.path.join(base_dir, 'src', 'data', 'activities.json')

print(f"📥 Mengunduh data terbaru dari Google Sheet...")
urllib.request.urlretrieve(SHEET_URL, TMP_FILE)

print("⚙️ Memproses lembar kerja...")
with zipfile.ZipFile(TMP_FILE, 'r') as z:
    sst_root = ET.fromstring(z.read('xl/sharedStrings.xml'))
    sst = [''.join(t.text or '' for t in si.findall('.//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t')) for si in sst_root.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}si')]
    
    # Read sheet3 (crosscheck) for news headlines
    news_titles = {}
    try:
        sheet3 = ET.fromstring(z.read('xl/worksheets/sheet3.xml'))
        ns = {'ns': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
        for r in sheet3.findall('.//ns:row', ns)[1:]:
            row_vals = {}
            for c in r.findall('ns:c', ns):
                cell_ref = c.attrib.get('r')
                col = ''.join([ch for ch in cell_ref if ch.isalpha()])
                t = c.attrib.get('t')
                v = c.find('ns:v', ns)
                val = v.text if v is not None else ''
                if t == 's' and val.isdigit():
                    val = sst[int(val)]
                row_vals[col] = val
            nomor = row_vals.get('A')
            judul = row_vals.get('F')
            link = row_vals.get('H')
            if nomor and judul:
                news_titles[nomor] = {'judul': judul, 'link': link}
    except Exception as e:
        print(f"Peringatan membaca sheet berita: {e}")

    # Read sheet2 (Database)
    sheet2 = ET.fromstring(z.read('xl/worksheets/sheet2.xml'))
    ns = {'ns': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
    
    rels_data = {}
    try:
        rels_xml = ET.fromstring(z.read('xl/worksheets/_rels/sheet2.xml.rels'))
        for rel in rels_xml.findall('{http://schemas.openxmlformats.org/package/2006/relationships}Relationship'):
            rels_data[rel.attrib.get('Id')] = rel.attrib.get('Target')
    except Exception:
        pass
    
    hyperlinks = {}
    for hl in sheet2.findall('.//ns:hyperlink', ns):
        r_id = hl.attrib.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id')
        ref = hl.attrib.get('ref')
        if r_id and ref and r_id in rels_data:
            hyperlinks[ref] = rels_data[r_id]
            
    rows = sheet2.findall('.//ns:row', ns)
    activities = []
    
    for r in rows[1:]:
        row_vals = {}
        for c in r.findall('ns:c', ns):
            cell_ref = c.attrib.get('r')
            col = ''.join([ch for ch in cell_ref if ch.isalpha()])
            t = c.attrib.get('t')
            v = c.find('ns:v', ns)
            val = v.text if v is not None else ''
            if t == 's' and val.isdigit():
                val = sst[int(val)]
            link = hyperlinks.get(cell_ref, '')
            row_vals[col] = {'val': val.strip(), 'link': link.strip()}
            
        nomor = row_vals.get('A', {}).get('val', '')
        if not nomor:
            continue
        # Clean nomor from .0
        try:
            nomor = str(int(float(nomor)))
        except (ValueError, TypeError):
            nomor = str(nomor).replace('.0', '')
            
        raw_tgl = row_vals.get('B', {}).get('val', '')
        date_str = ''
        date_formatted = ''
        month_idx = 0
        month_name = ''
        year = 2026
        
        serial_val = None
        try:
            serial_val = int(float(raw_tgl))
        except (ValueError, TypeError):
            pass

        if serial_val is not None and serial_val > 20000:
            dt = datetime(1899, 12, 30) + timedelta(days=serial_val)
            date_str = dt.strftime('%Y-%m-%d')
            month_idx = dt.month
            month_name = MONTHS_ID[dt.month]
            year = dt.year
            date_formatted = f'{dt.day:02d} {month_name} {dt.year}'
        else:
            date_str = raw_tgl
            date_formatted = raw_tgl

        kegiatan = row_vals.get('C', {}).get('val', '')
        lokasi_raw = row_vals.get('D', {}).get('val', '')
        
        kota = lokasi_raw
        provinsi = ''
        if ',' in lokasi_raw:
            parts = [p.strip() for p in lokasi_raw.split(',')]
            kota = parts[0]
            provinsi = ', '.join(parts[1:])
        elif '-' in lokasi_raw:
            parts = [p.strip() for p in lokasi_raw.split('-')]
            kota = parts[0]
            provinsi = parts[1]

        berita_val = row_vals.get('E', {}).get('val', '')
        berita_link = row_vals.get('E', {}).get('link', '')
        
        video_val = row_vals.get('F', {}).get('val', '')
        video_link = row_vals.get('F', {}).get('link', '')
        # Extract multiple video urls if present
        video_urls = re.findall(r'https?://[^\s,;"\'<>]+[^\s,;"\'<>.)\]}]', video_val or '')
        if video_link and video_link not in video_urls:
            video_urls.insert(0, video_link)
        if not video_link and video_urls:
            video_link = video_urls[0]
        
        matched = news_titles.get(nomor)
        matched_title = matched['judul'] if matched else ''
        if not berita_link and matched and matched['link']:
            berita_link = matched['link']
            
        petugas_raw = row_vals.get('G', {}).get('val', '')
        petugas_list = [p.strip() for p in re.split(r'[,/;]+', petugas_raw) if p.strip() and p.strip() != '-']
        
        activities.append({
            'id': int(nomor) if nomor.isdigit() else nomor,
            'nomor': nomor,
            'tanggal': date_str,
            'tanggal_formatted': date_formatted,
            'bulan': month_name,
            'bulan_idx': month_idx,
            'tahun': year,
            'kegiatan': kegiatan,
            'lokasi': lokasi_raw,
            'kota': kota,
            'provinsi': provinsi,
            'ada_berita': bool(berita_link or (berita_val and berita_val.lower() not in ['-', 'tidak ada', ''])),
            'link_berita': berita_link,
            'judul_berita': matched_title,
            'ada_video': bool(video_urls or video_link or (video_val and video_val.lower() not in ['-', 'tidak ada', ''])),
            'link_video': video_link,
            'link_videos': video_urls,
            'petugas': petugas_list,
            'petugas_raw': petugas_raw
        })

    os.makedirs(os.path.dirname(TARGET_JSON), exist_ok=True)
    tmp_json = TARGET_JSON + '.tmp'
    with open(tmp_json, 'w', encoding='utf-8') as f:
        json.dump(activities, f, ensure_ascii=False, indent=2)
    os.replace(tmp_json, TARGET_JSON)

print(f"✅ Berhasil menyinkronkan {len(activities)} kegiatan ke {TARGET_JSON}!")
