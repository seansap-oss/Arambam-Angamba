"""Integration checks against isolated temporary data, never the preview database."""
import http.cookiejar,json,os,pathlib,subprocess,tempfile,time,unittest,urllib.request,urllib.error
from datetime import date,timedelta
ROOT=pathlib.Path(__file__).resolve().parents[1]
class BackendTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.tmp=tempfile.TemporaryDirectory();cls.env={**os.environ,'IMPHAL_DATA_DIR':cls.tmp.name,'IMPHAL_ADMIN_PASSWORD':'Test-only-password-12345'}
  cls.proc=subprocess.Popen(['python3','server/app.py','--port','8791'],cwd=ROOT,env=cls.env)
  cls.client=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
  for _ in range(50):
   try: urllib.request.urlopen('http://127.0.0.1:8791/api/content');break
   except Exception: time.sleep(.1)
 @classmethod
 def tearDownClass(cls):cls.proc.terminate();cls.proc.wait();cls.tmp.cleanup()
 def req(self,path,data=None,client=None,headers=None):
  r=urllib.request.Request('http://127.0.0.1:8791/api'+path,data=json.dumps(data).encode() if data is not None else None,headers={'Content-Type':'application/json',**(headers or {})})
  try:
   with (client or self.client).open(r) as response:return response.status,json.load(response)
  except urllib.error.HTTPError as e:return e.code,json.load(e)
 def test_complete_workflow(self):
  anonymous=urllib.request.build_opener()
  self.assertEqual(self.req('/admin',client=anonymous)[0],401)
  self.assertEqual(self.req('/content',{},client=anonymous)[0],401)
  self.assertEqual(self.req('/login',{'password':'wrong'})[0],401)
  self.assertEqual(self.req('/login',{'password':'Test-only-password-12345'})[0],200)
  self.assertTrue(self.req('/session')[1]['authenticated'])
  cfg=self.req('/admin')[1]['content'];self.assertIn('museology',cfg['bioParagraphs'][2]);self.assertEqual(cfg['title'],'Battle of Imphal 1944')
  cfg['heroSubtitle']='Persistence verification';self.assertEqual(self.req('/content',cfg)[0],200)
  self.assertEqual(self.req('/content')[1]['content']['heroSubtitle'],'Persistence verification')
  bad={**cfg,'donationUrl':'javascript:alert(1)'};self.assertEqual(self.req('/content',bad)[0],400)
  self.assertEqual(self.req('/content',cfg,headers={'Origin':'https://unrelated.example'})[0],403)
  day=(date.today()+timedelta(days=30)).isoformat();blocked=(date.today()+timedelta(days=31)).isoformat()
  cfg['blockedDates']=[blocked];self.assertEqual(self.req('/content',cfg)[0],200)
  b={'name':'Test Visitor','email':'visitor@example.com','tour':'manipur','date':day,'guests':2,'message':'Integration test'}
  self.assertEqual(self.req('/bookings',{**b,'date':blocked},client=anonymous)[0],409)
  self.assertEqual(self.req('/bookings',{**b,'date':'2000-01-01'},client=anonymous)[0],409)
  self.assertEqual(self.req('/bookings',{**b,'guests':0},client=anonymous)[0],400)
  code,result=self.req('/bookings',b,client=anonymous);self.assertEqual(code,201);first=result['id']
  code,result=self.req('/bookings',b,client=anonymous);second=result['id']
  self.assertEqual(self.req('/bookings/status',{'id':first,'status':'confirmed'})[0],200)
  self.assertIn(day,self.req('/content')[1]['unavailable'])
  self.assertEqual(self.req('/bookings/status',{'id':second,'status':'confirmed'})[0],409)
  self.assertEqual(self.req('/bookings',b,client=anonymous)[0],409)
  self.assertEqual(self.req('/bookings/status',{'id':first,'status':'cancelled'})[0],200)
  self.assertNotIn(day,self.req('/content')[1]['unavailable'])
  code,g=self.req('/guestbook',{'name':'Test Reader','country':'Test','message':'A thoughtful historical collection.'},client=anonymous);self.assertEqual(code,201)
  self.assertFalse(self.req('/guestbook',client=anonymous)[1]['entries'])
  self.assertEqual(self.req('/guestbook/status',{'id':g['id'],'status':'approved'})[0],200)
  self.assertEqual(len(self.req('/guestbook',client=anonymous)[1]['entries']),1)
  self.assertEqual(self.req('/guestbook/status',{'id':g['id'],'status':'hidden'})[0],200)
  self.assertFalse(self.req('/guestbook',client=anonymous)[1]['entries'])
  raw=(ROOT/'public/images/artifacts.png').read_bytes()
  request=urllib.request.Request('http://127.0.0.1:8791/api/upload',data=raw,headers={'Content-Type':'image/png'})
  with self.client.open(request) as r:media=json.load(r)['url']
  with urllib.request.urlopen('http://127.0.0.1:8791'+media) as r:self.assertEqual(r.read(),raw)
  request=urllib.request.Request('http://127.0.0.1:8791/api/upload',data=b'<script>bad</script>',headers={'Content-Type':'image/png'})
  with self.assertRaises(urllib.error.HTTPError) as ctx:self.client.open(request)
  self.assertEqual(ctx.exception.code,400)
  self.proc.terminate();self.proc.wait();self.__class__.proc=subprocess.Popen(['python3','server/app.py','--port','8791'],cwd=ROOT,env=self.env)
  for _ in range(50):
   try:
    code,d=self.req('/content');break
   except Exception:time.sleep(.1)
  self.assertEqual(d['content']['heroSubtitle'],'Persistence verification')
  self.assertEqual(len(self.req('/admin')[1]['bookings']),2)
  self.assertEqual(self.req('/password',{'current':'wrong','password':'New-test-password-123'})[0],400)
  self.assertEqual(self.req('/password',{'current':'Test-only-password-12345','password':'New-test-password-123'})[0],200)
  self.assertEqual(self.req('/admin')[0],401)
  self.assertEqual(self.req('/login',{'password':'New-test-password-123'})[0],200)
  self.assertEqual(self.req('/logout',{})[0],200)
  self.assertFalse(self.req('/session')[1]['authenticated'])
if __name__=='__main__':unittest.main(verbosity=2)
