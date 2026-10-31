"""Optional, credited city photos from Wikimedia Commons; no extra API key."""
import re
from html import unescape
from functools import lru_cache
from urllib.parse import urlsplit, quote, unquote
import unicodedata
import requests


def plain(value):
    return unescape(re.sub(r'<[^>]*>', '', str(value or ''))).strip()


def hosted(url, host):
    try:
        p = urlsplit(url)
        return p.scheme == 'https' and p.hostname == host and not p.username and p.port in (None, 443)
    except (ValueError, TypeError):
        return False

def normalized(value):
    return ''.join(c for c in unicodedata.normalize('NFD', value.lower()) if not unicodedata.combining(c))


@lru_cache(maxsize=256)
def city_photos(city, country):
    # Strip search operators; search exact city + country in the file namespace.
    city = re.sub(r'[^\w\s-]', '', city).strip()[:90]
    country = re.sub(r'[^\w\s-]', '', country).strip()[:90]
    if not city or not country:
        return []
    headers={'User-Agent': 'Chambiray/1.0 (https://github.com/Camilo1357/Proyect_Mercadosviva)'}
    params={
        'action': 'query', 'format': 'json', 'generator': 'search',
        'gsrsearch': f'"{city}" "{country}" filetype:bitmap',
        'gsrnamespace': 6, 'gsrlimit': 5, 'prop': 'imageinfo',
        'iiprop': 'url|extmetadata|mime|size', 'iiurlwidth': 800,
    }
    matched_page = False
    # Prefer the city article's selected image over arbitrary files mentioning a province.
    try:
        summary_response = requests.get('https://es.wikipedia.org/api/rest_v1/page/summary/' + quote(city.replace(' ', '_'), safe=''), headers=headers, timeout=(3, 6))
        summary_response.raise_for_status()
        summary = summary_response.json()
        original = summary.get('originalimage', {}).get('source', '')
        if (summary.get('type') == 'standard' and normalized(country) in normalized(summary.get('extract', '')) and
            normalized(city) in normalized(summary.get('title', '')) and
            (hosted(original, 'upload.wikimedia.org') or hosted(original, 'thumb.wikimedia.org'))):
            path = urlsplit(original).path
            filename = path.split('/')[-2 if '/thumb/' in path else -1]
            params = {'action':'query','format':'json','titles':'File:'+unquote(filename),
                      'prop':'imageinfo','iiprop':'url|extmetadata|mime|size','iiurlwidth':800}
            matched_page = True
    except (requests.RequestException, ValueError, TypeError, AttributeError):
        pass
    response = requests.get('https://commons.wikimedia.org/w/api.php', params=params, headers=headers, timeout=(3, 8))
    response.raise_for_status()
    pages = response.json().get('query', {}).get('pages', {})
    photos = []
    for page in sorted(pages.values(), key=lambda p:p.get('index', 0)):
        info = (page.get('imageinfo') or [{}])[0]
        metadata = info.get('extmetadata', {})
        credit = plain(metadata.get('Artist', {}).get('value'))
        license_name = plain(metadata.get('LicenseShortName', {}).get('value'))
        license_url = metadata.get('LicenseUrl', {}).get('value', '')
        if license_url.startswith('//'):
            license_url = 'https:' + license_url
        url = info.get('thumburl', '')
        source = info.get('descriptionurl', '')
        title = plain(page.get('title', '')).removeprefix('File:')
        if not matched_page and normalized(city) not in normalized(title):
            continue
        # Exclude nonphotographic diagrams and files lacking usable attribution.
        if (info.get('mime') not in ('image/jpeg','image/png','image/webp') or
            re.search(r'\b(map|flag|logo|coat of arms|mapa|bandera|escudo)\b', title, re.I) or
            not (hosted(url, 'upload.wikimedia.org') or hosted(url, 'thumb.wikimedia.org')) or not hosted(source, 'commons.wikimedia.org') or
            not credit or not license_name or len(credit) > 600 or
            not license_name.lower().startswith(('cc by','cc0','public domain')) or
            not hosted(license_url, 'creativecommons.org')):
            continue
        photos.append({'url': url, 'source_url': source, 'author': credit, 'license': license_name,
                       'license_url': license_url, 'title': title,
                       'label': f'Foto de {city} · referencia de la ciudad'})
        if len(photos) == 3:
            break
    return photos
