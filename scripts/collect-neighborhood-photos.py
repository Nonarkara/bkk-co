#!/usr/bin/env python3
"""Curated Commons photographs. Fetch raw metadata first; build/download explicitly.

python3 scripts/collect-neighborhood-photos.py --fetch-metadata
python3 scripts/collect-neighborhood-photos.py --download
python3 scripts/collect-neighborhood-photos.py  # offline rebuild, existing assets required

Requires Pillow only for download/derivative generation. Never substitutes a search
hit for a reviewed selection, changes geographic pins, or accepts NC/ND licenses.
"""
import argparse
import datetime as dt
import hashlib
import html
import io
import json
from pathlib import Path
import re
import time
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
EVIDENCE = ROOT / 'docs/stroll-2026-11-07/photos'
RAW = EVIDENCE / 'raw'
ASSETS = ROOT / 'public/neighborhood-photos'
OUTPUT = ROOT / 'public/data/neighborhood-photos.json'
UA = 'PLUB-neighborhood-photos/1.0 (https://co.nonarkara.org; public photographic reference archive)'
API = 'https://commons.wikimedia.org/w/api.php'
NAMES = {'ari':'Ari / Ari Samphan', 'samyan':'Sam Yan / Chulalongkorn', 'charoenkrung':'Charoen Krung / Talat Noi', 'thonglo':'Thong Lo / Ekkamai', 'ramkhamhaeng':'Ramkhamhaeng corridor', 'benjakitti':'Benjakitti', 'lumphini':'Lumphini', 'chatuchak':'Chatuchak parks', 'santiphap':'Santiphap', 'bangkholaem':'Bang Kho Laem'}


def plain(value):
    return re.sub(r'\s+', ' ', html.unescape(re.sub('<[^>]+>', ' ', str(value or '')))).strip()


def request(url):
    # Sequential access; a denial or rate limit aborts rather than rotating clients.
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    with urllib.request.urlopen(req, timeout=60) as response:
        return response.read(), dict(response.headers)


def fetch_metadata(ids):
    stamp = dt.datetime.now(dt.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    for offset in range(0, len(ids), 40):
        params = {'action':'query', 'format':'json', 'pageids':'|'.join(map(str, ids[offset:offset+40])), 'prop':'imageinfo|coordinates', 'iiprop':'url|extmetadata|sha1|size', 'iiurlwidth':640, 'colimit':'max'}
        url = API + '?' + urllib.parse.urlencode(params)
        data, headers = request(url)
        # Preserve the unparsed provider response before examining it.
        path = RAW / f'selected-{stamp}-{offset}.json'
        path.write_bytes(data)
        path.with_suffix('.request.json').write_text(json.dumps({'url':url, 'fetchedAt':stamp, 'headers':headers}, indent=2))
        payload = json.loads(data)
        if payload.get('error'): raise RuntimeError(payload['error'])
        time.sleep(0.6)


def load_pages():
    pages = {}
    # New selected snapshots override discovery search metadata. Every snapshot stays.
    files = sorted(RAW.glob('*.json'), key=lambda p: ('selected-' in p.name, p.name))
    for path in files:
        payload = json.loads(path.read_text())
        if not isinstance(payload, dict): continue
        for key, page in payload.get('query', {}).get('pages', {}).items():
            if page.get('imageinfo'):
                pages[key] = (page, path.relative_to(ROOT).as_posix())
    return pages


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--fetch-metadata', action='store_true')
    parser.add_argument('--download', action='store_true')
    args = parser.parse_args()
    selection = json.loads((EVIDENCE / 'selection.json').read_text())
    ids = [pid for group in selection.values() for pid in group]
    assert len(set(ids)) == len(ids), 'Duplicate selected Commons IDs'
    if args.fetch_metadata: fetch_metadata(ids)
    pages = load_pages()
    ASSETS.mkdir(exist_ok=True)
    photos = []
    for slug, selected in selection.items():
        for pid in selected:
            page, raw_path = pages[str(pid)]
            info = page['imageinfo'][0]
            meta = info.get('extmetadata', {})
            val = lambda key: plain(meta.get(key, {}).get('value'))
            license_name = val('LicenseShortName')
            if not re.fullmatch(r'CC BY(?:-SA)? [1-4]\.0(?: [a-z]{2})?|CC0|Public domain', license_name):
                raise ValueError(f'License outside approved policy: {pid} {license_name}')
            if any(word in (val('Categories') + ' ' + val('ImageDescription')).lower() for word in ['ai-generated', 'ai generated', 'midjourney', 'dall-e', 'stable diffusion']):
                raise ValueError(f'Generated content: {pid}')
            if not val('DateTimeOriginal'): raise ValueError(f'Undated photo {pid}')
            local = ASSETS / f'commons-{pid}.webp'
            source_url = info.get('thumburl') or info['url']
            if args.download and not local.exists():
                from PIL import Image, ImageOps
                binary, headers = request(source_url)
                image = ImageOps.exif_transpose(Image.open(io.BytesIO(binary))).convert('RGB')
                image.thumbnail((640,640))
                for quality in [76,68,60,52,44,36,28,20]:
                    out = io.BytesIO(); image.save(out, format='WEBP', quality=quality, method=6)
                    if len(out.getvalue()) <= 80000: break
                if len(out.getvalue()) > 80000: raise ValueError(f'Derivative too large {pid}')
                local.write_bytes(out.getvalue())
                print(f'{len(photos)+1}/{len(ids)} downloaded {pid}', flush=True)
                time.sleep(0.5)
            if not local.exists(): raise FileNotFoundError(f'{local}; run --download')
            from PIL import Image
            with Image.open(local) as image: width, height = image.size
            lat, lon = val('GPSLatitude'), val('GPSLongitude')
            coords = [float(lat),float(lon)] if lat and lon else None
            license_url = val('LicenseUrl')
            if not license_url:
                if license_name == 'Public domain': license_url = 'https://commons.wikimedia.org/wiki/Commons:Public_domain'
                else: raise ValueError(f'License URL missing {pid}')
            if license_url.startswith('//'): license_url = 'https:' + license_url
            license_url = license_url.replace('http://creativecommons.org/', 'https://creativecommons.org/')
            path = '/' + local.relative_to(ROOT / 'public').as_posix()
            photos.append({'id':f'commons-{pid}', 'title':page['title'].removeprefix('File:').rsplit('.',1)[0], 'creator':val('Artist'), 'source':'Wikimedia Commons', 'sourcePage':info['descriptionurl'], 'url':path, 'thumbnail':path, 'originalImageUrl':info['url'], 'sourceDerivativeUrl':source_url, 'license':license_name, 'licenseCode':license_name.upper().replace(' ','-'), 'licenseUrl':license_url, 'derivativeLicense':license_name, 'attributionStatement':val('Attribution'), 'sourceCredit':val('Credit'), 'restrictions':val('Restrictions'), 'licenseStatus':'cc0' if license_name=='CC0' else 'public-domain' if license_name=='Public domain' else 'share-alike' if '-SA' in license_name else 'attribution', 'neighborhoods':[slug], 'dateTaken':val('DateTimeOriginal'), 'association':{'basis':'Commons file description / categories; curated neighborhood association', 'coords':coords, 'description':val('ImageDescription'), 'categories':val('Categories').split('|'), 'source':info['descriptionurl'], 'rawMetadata':raw_path}, 'aiGenerated':False, 'actualVenue':False, 'nonAiEvidence':'Source photograph, inspected in the dated contact-sheet review; no generated imagery accepted.', 'credit':f'{val("Artist")} · {license_name} · Wikimedia Commons', 'changes':'Resized to fit 640 × 640; WebP conversion; orientation applied; metadata removed. No content edits.', 'width':width, 'height':height, 'bytes':local.stat().st_size, 'sha256':hashlib.sha256(local.read_bytes()).hexdigest(), 'sourceSha1':info['sha1']})
    data = {'asOf':'2026-11-07', 'licensePolicy':{'accepted':['CC0','Public domain','CC BY','CC BY-SA'], 'excluded':['AI generated imagery','CC BY-NC','CC BY-ND','unknown licenses'], 'creditRequired':True, 'note':'Free reuse with each image’s stated attribution/share-alike terms. Neighborhood references are not photographs of a selected venue.'}, 'neighborhoods': [{'slug':slug,'name':NAMES[slug],'count':len(group)} for slug,group in selection.items()], 'photos':photos}
    OUTPUT.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({'count':len(photos),'bytes':sum(p['bytes'] for p in photos),'coverage':{slug:len(group) for slug,group in selection.items()}},indent=2))


if __name__ == '__main__': main()
