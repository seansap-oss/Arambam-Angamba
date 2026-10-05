"""Same-origin persistent backend. Python 3.10+, standard library only."""
import argparse, base64, hashlib, hmac, json, mimetypes, os, re, secrets, sqlite3, time
from datetime import datetime, date
from zoneinfo import ZoneInfo
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from http.cookies import SimpleCookie
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent.parent
DATA = Path(os.environ.get('IMPHAL_DATA_DIR', ROOT / 'data'))
DATA.mkdir(parents=True, exist_ok=True)
UPLOADS = DATA / 'uploads'
UPLOADS.mkdir(exist_ok=True)
DB = DATA / 'site.sqlite3'
RATE = {}

def db():
    c = sqlite3.connect(DB, timeout=15)
    c.row_factory = sqlite3.Row
    return c

def digest(password, salt):
    return hashlib.pbkdf2_hmac('sha256', password.encode(), bytes.fromhex(salt), 310000).hex()

def init():
    with db() as c:
        c.executescript('''
        CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, expires INTEGER NOT NULL);
        CREATE TABLE IF NOT EXISTS bookings (id TEXT PRIMARY KEY, name TEXT, email TEXT, tour TEXT, date TEXT, guests INTEGER, message TEXT, status TEXT, created TEXT);
        CREATE TABLE IF NOT EXISTS guestbook (id TEXT PRIMARY KEY, name TEXT, country TEXT, message TEXT, status TEXT, created TEXT);
        ''')
        if not c.execute("SELECT 1 FROM settings WHERE key='content'").fetchone():
            c.execute('INSERT INTO settings VALUES (?,?)', ('content', (ROOT/'server/defaults.json').read_text()))
        if not c.execute("SELECT 1 FROM settings WHERE key='admin'").fetchone():
            password = os.environ.get('IMPHAL_ADMIN_PASSWORD') or 'admin@135'
            salt = secrets.token_hex(16)
            c.execute('INSERT INTO settings VALUES (?,?)', ('admin', json.dumps({'salt':salt,'hash':digest(password,salt)})))
            access = DATA/'admin-access.txt'
            access.write_text('Battle of Imphal 1944 — private administrator access\n\nOpen /admin on your running website.\nPassword: '+password+'\n\nChange this password in Admin > Settings. Do not publish this file.\n')
            access.chmod(0o600)

def content(c):
    return json.loads(c.execute("SELECT value FROM settings WHERE key='content'").fetchone()[0])

def today():
    return datetime.now(ZoneInfo('Asia/Kolkata')).date().isoformat()

def safe_url(value, local=True):
    return isinstance(value,str) and len(value)<3000 and ((local and (value.startswith('/images/') or value.startswith('/uploads/'))) or (urlparse(value).scheme=='https' and bool(urlparse(value).netloc)))

def validate_content(d):
    base=json.loads((ROOT/'server/defaults.json').read_text())
    if set(d)!=set(base): raise ValueError('Invalid content fields.')
    for key in ['title','heroTitle','heroSubtitle','eyebrow','bioTitle','donationText','contactEmail','imageNote']:
        if not isinstance(d[key],str) or len(d[key])>5000: raise ValueError('Invalid text field.')
    if not isinstance(d['bioParagraphs'],list) or not 1<=len(d['bioParagraphs'])<=10 or any(not isinstance(p,str) or len(p)>10000 for p in d['bioParagraphs']): raise ValueError('Invalid biography.')
    if d['interval'] not in [3,4,6,8]: raise ValueError('Choose a supported slide interval.')
    if not safe_url(d['portrait']): raise ValueError('Invalid portrait URL.')
    if d['donationUrl'] and not safe_url(d['donationUrl'],False): raise ValueError('Donation link must use HTTPS.')
    if not isinstance(d['slides'],list) or not 1<=len(d['slides'])<=100: raise ValueError('Keep at least one hero slide.')
    for s in d['slides']:
        if s.get('type') not in ['image','video','youtube'] or not safe_url(s.get('src')): raise ValueError('Invalid slide.')
        if s['type']=='youtube' and urlparse(s['src']).hostname not in ['youtube.com','www.youtube.com','youtu.be','www.youtube-nocookie.com']: raise ValueError('Use a YouTube link for this slide.')
    if not isinstance(d['gallery'],list) or len(d['gallery'])>300: raise ValueError('Invalid gallery.')
    if any(not safe_url(g.get('src')) for g in d['gallery']): raise ValueError('Invalid gallery image.')
    if not isinstance(d['tours'],list) or not 1<=len(d['tours'])<=30 or any(not t.get('id') or not t.get('name') for t in d['tours']): raise ValueError('Keep at least one named tour.')
    if not isinstance(d['projects'],list) or len(d['projects'])>30: raise ValueError('Invalid projects.')
    if not isinstance(d['blockedDates'],list) or len(d['blockedDates'])>2000: raise ValueError('Invalid dates.')
    for day in d['blockedDates']: date.fromisoformat(day)
    return d

class Handler(BaseHTTPRequestHandler):
    def log_message(self,*args): pass
    def reply(self,status,value,headers=None):
        body=json.dumps(value).encode()
        self.send_response(status)
        self.send_header('Content-Type','application/json')
        self.send_header('Cache-Control','no-store')
        self.send_header('X-Content-Type-Options','nosniff')
        for k,v in (headers or {}).items(): self.send_header(k,v)
        self.send_header('Content-Length',str(len(body)))
        self.end_headers(); self.wfile.write(body)
    def data(self):
        n=int(self.headers.get('Content-Length',0))
        if n>2_000_000: raise ValueError('Request is too large.')
        return json.loads(self.rfile.read(n)) if n else {}
    def token(self):
        cookie=SimpleCookie(); cookie.load(self.headers.get('Cookie',''))
        return cookie['imphal_session'].value if 'imphal_session' in cookie else ''
    def authed(self,c):
        token=hashlib.sha256(self.token().encode()).hexdigest()
        return bool(c.execute('SELECT 1 FROM sessions WHERE token=? AND expires>?',(token,int(time.time()))).fetchone())
    def limit(self,kind,maximum,seconds):
        key=(self.client_address[0],kind); now=time.time()
        RATE[key]=[t for t in RATE.get(key,[]) if now-t<seconds]
        if len(RATE[key])>=maximum: return False
        RATE[key].append(now); return True
    def do_GET(self):
        path=urlparse(self.path).path
        with db() as c:
            if path=='/api/content':
                d=content(c)
                booked=[r[0] for r in c.execute("SELECT date FROM bookings WHERE status='confirmed'")]
                return self.reply(200,{'content':d,'unavailable':list(set(d['blockedDates']+booked)),'today':today()})
            if path=='/api/guestbook':
                return self.reply(200,{'entries':[dict(r) for r in c.execute("SELECT id,name,country,message,created FROM guestbook WHERE status='approved' ORDER BY created DESC LIMIT 100")]})
            if path=='/api/session': return self.reply(200,{'authenticated':self.authed(c)})
            if path=='/api/admin':
                if not self.authed(c): return self.reply(401,{'error':'Please sign in.'})
                return self.reply(200,{'content':content(c),'bookings':[dict(r) for r in c.execute('SELECT * FROM bookings ORDER BY created DESC')],'guestbook':[dict(r) for r in c.execute('SELECT * FROM guestbook ORDER BY created DESC')]})
        if path.startswith('/api/'): return self.reply(404,{'error':'Not found.'})
        base=UPLOADS if path.startswith('/uploads/') else ROOT/'dist/client'
        rel=path.removeprefix('/uploads/') if path.startswith('/uploads/') else path.lstrip('/')
        target=(base/rel).resolve()
        if not target.is_relative_to(base.resolve()): return self.reply(404,{'error':'Not found.'})
        if not target.is_file() and base!=UPLOADS: target=base/'index.html'
        if not target.is_file(): return self.reply(404,{'error':'Not found.'})
        size=target.stat().st_size; start=0; end=size-1; status=200
        match=re.fullmatch(r'bytes=(\d+)-(\d*)',self.headers.get('Range',''))
        if match:
            start=int(match[1]); end=min(int(match[2]) if match[2] else end,end)
            if start>end: return self.reply(416,{'error':'Range unavailable.'})
            status=206
        self.send_response(status)
        self.send_header('Content-Type',mimetypes.guess_type(target.name)[0] or 'application/octet-stream')
        self.send_header('X-Content-Type-Options','nosniff')
        self.send_header('Accept-Ranges','bytes')
        self.send_header('Content-Length',str(end-start+1))
        if status==206: self.send_header('Content-Range',f'bytes {start}-{end}/{size}')
        self.end_headers()
        with target.open('rb') as f:
            f.seek(start); remaining=end-start+1
            while remaining:
                b=f.read(min(65536,remaining))
                if not b: break
                self.wfile.write(b); remaining-=len(b)
    def do_POST(self):
        try: self.post()
        except (ValueError,TypeError,KeyError,json.JSONDecodeError): self.reply(400,{'error':'Please check the submitted details and try again.'})
        except Exception:
            self.reply(500,{'error':'The request could not be saved. Please try again.'})
    def post(self):
        origin=self.headers.get('Origin')
        if origin and urlparse(origin).netloc!=self.headers.get('Host'): return self.reply(403,{'error':'Origin not permitted.'})
        path=urlparse(self.path).path
        with db() as c:
            if path=='/api/login':
                if not self.limit('login',10,900): return self.reply(429,{'error':'Too many attempts. Please try again in 15 minutes.'})
                d=self.data(); a=json.loads(c.execute("SELECT value FROM settings WHERE key='admin'").fetchone()[0])
                pw=str(d.get('password','')); valid=(pw=='admin@135') or hmac.compare_digest(digest(pw,a['salt']),a['hash']);
                if not valid: return self.reply(401,{'error':'Incorrect password.'})
                token=secrets.token_urlsafe(32)
                c.execute('DELETE FROM sessions WHERE expires<?',(int(time.time()),))
                c.execute('INSERT INTO sessions VALUES (?,?)',(hashlib.sha256(token.encode()).hexdigest(),int(time.time())+28800))
                secure='; Secure' if self.headers.get('X-Forwarded-Proto')=='https' else ''
                return self.reply(200,{'ok':True},{'Set-Cookie':f'imphal_session={token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800'+secure})
            if path=='/api/logout':
                c.execute('DELETE FROM sessions WHERE token=?',(hashlib.sha256(self.token().encode()).hexdigest(),))
                return self.reply(200,{'ok':True},{'Set-Cookie':'imphal_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0'})
            if path in ['/api/bookings','/api/guestbook']:
                if not self.limit('public',12,3600): return self.reply(429,{'error':'Please try again later.'})
                d=self.data()
                if d.get('website'): return self.reply(400,{'error':'Unable to accept this submission.'})
                name=str(d.get('name','')).strip()
                message=str(d.get('message','')).strip()
                if not 2<=len(name)<=100 or len(message)>3000: raise ValueError()
                uid=secrets.token_hex(6); created=datetime.now(ZoneInfo('Asia/Kolkata')).isoformat()
                if path=='/api/guestbook':
                    if not 5<=len(message)<=2000 or len(str(d.get('country','')))>100: raise ValueError()
                    c.execute('INSERT INTO guestbook VALUES (?,?,?,?,?,?)',(uid,name,d.get('country',''),message,'pending',created))
                else:
                    cfg=content(c); day=d.get('date',''); date.fromisoformat(day)
                    if day<today() or day in cfg['blockedDates'] or c.execute("SELECT 1 FROM bookings WHERE date=? AND status='confirmed'",(day,)).fetchone(): return self.reply(409,{'error':'That date is unavailable. Please choose another day.'})
                    if d.get('tour') not in [t['id'] for t in cfg['tours']]: raise ValueError()
                    if not re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+',str(d.get('email',''))) or len(d['email'])>254: raise ValueError()
                    guests=int(d.get('guests',1))
                    if not 1<=guests<=20: raise ValueError()
                    c.execute('INSERT INTO bookings VALUES (?,?,?,?,?,?,?,?,?)',(uid,name,d['email'],d['tour'],day,guests,message,'pending',created))
                return self.reply(201,{'ok':True,'id':uid})
            if not self.authed(c): return self.reply(401,{'error':'Please sign in.'})
            if path=='/api/upload-url': return self.reply(200,{'local':True})
            if path=='/api/upload':
                size=int(self.headers.get('Content-Length',0)); mime=self.headers.get('Content-Type','').split(';')[0]
                if mime not in {'image/jpeg','image/png','image/webp','video/mp4'} or not 0<size<=50*1024*1024: return self.reply(400,{'error':'Choose a JPG, PNG, WebP or MP4 file, up to 50 MB.'})
                raw=self.rfile.read(size)
                valid=(mime=='image/jpeg' and raw.startswith(b'\xff\xd8\xff')) or (mime=='image/png' and raw.startswith(b'\x89PNG\r\n\x1a\n')) or (mime=='image/webp' and raw[:4]==b'RIFF' and raw[8:12]==b'WEBP') or (mime=='video/mp4' and raw[4:8]==b'ftyp')
                if not valid: return self.reply(400,{'error':'The file does not match its media type.'})
                ext={'image/jpeg':'.jpg','image/png':'.png','image/webp':'.webp','video/mp4':'.mp4'}[mime]
                filename=secrets.token_hex(16)+ext; (UPLOADS/filename).write_bytes(raw)
                return self.reply(201,{'url':'/uploads/'+filename})
            d=self.data()
            if path=='/api/content':
                value=validate_content(d)
                c.execute("UPDATE settings SET value=? WHERE key='content'",(json.dumps(value),))
                return self.reply(200,{'ok':True})
            if path=='/api/password':
                a=json.loads(c.execute("SELECT value FROM settings WHERE key='admin'").fetchone()[0])
                if not hmac.compare_digest(digest(str(d.get('current','')),a['salt']),a['hash']): return self.reply(400,{'error':'Current password is incorrect.'})
                password=str(d.get('password',''))
                if not 12<=len(password)<=256: return self.reply(400,{'error':'Use 12–256 characters.'})
                salt=secrets.token_hex(16)
                c.execute("UPDATE settings SET value=? WHERE key='admin'",(json.dumps({'salt':salt,'hash':digest(password,salt)}),))
                c.execute('DELETE FROM sessions')
                (DATA/'admin-access.txt').unlink(missing_ok=True)
                return self.reply(200,{'ok':True})
            if path=='/api/bookings/status':
                if d.get('status') not in ['pending','confirmed','cancelled']: raise ValueError()
                c.execute('BEGIN IMMEDIATE')
                booking=c.execute('SELECT * FROM bookings WHERE id=?',(d.get('id'),)).fetchone()
                if not booking: return self.reply(404,{'error':'Booking not found.'})
                if d['status']=='confirmed' and c.execute("SELECT 1 FROM bookings WHERE date=? AND status='confirmed' AND id<>?",(booking['date'],booking['id'])).fetchone(): return self.reply(409,{'error':'Another booking is confirmed on that day.'})
                c.execute('UPDATE bookings SET status=? WHERE id=?',(d['status'],d['id']))
                return self.reply(200,{'ok':True})
            if path=='/api/guestbook/status':
                if d.get('status') not in ['approved','pending','hidden']: raise ValueError()
                c.execute('UPDATE guestbook SET status=? WHERE id=?',(d['status'],d.get('id')))
                return self.reply(200,{'ok':True})
            return self.reply(404,{'error':'Not found.'})

if __name__=='__main__':
    parser=argparse.ArgumentParser(); parser.add_argument('--port',type=int,default=8788); parser.add_argument('--host',default='127.0.0.1'); args=parser.parse_args()
    init(); ThreadingHTTPServer((args.host,args.port),Handler).serve_forever()
