"""Real Chromium QA for the ATLAS public GitHub REST inspector.
Only the public HTTP transport is fixture-backed; actual UI, DOM, forms,
URL construction, response parsing, field inspection and CSS are exercised.
"""
import json,pathlib,socketserver,threading,time
from http.server import SimpleHTTPRequestHandler
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import Select

ROOT=pathlib.Path(__file__).resolve().parents[1]
OUT=ROOT/"test-artifacts"/"api-lab";OUT.mkdir(parents=True,exist_ok=True)
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(ROOT),**kwargs)
 def log_message(self,*args):pass
def until(fn,tries=80):
 for _ in range(tries):
  try:
   val=fn()
   if val:return val
  except Exception:pass
  time.sleep(.2)
 raise AssertionError("Timed out waiting for real API lab UI")
fixture=r"""(()=>{
 const original=window.fetch.bind(window);
 const reply=(status,data,remaining='29')=>Promise.resolve(new Response(JSON.stringify(data),{
   status,headers:{'Content-Type':'application/json','x-ratelimit-remaining':remaining,'x-ratelimit-limit':'60'}
 }));
 window.__atlasApiCalls=[];
 window.fetch=(input,options={})=>{
  const url=String(typeof input==='string'?input:input.url);
  if(url.includes('/users/AincFh/repos?'))return reply(200,[]);
  if(url.includes('/users/AincFh/events/public?'))return reply(200,[]);
  if(!url.startsWith('https://api.github.com/repos/'))return original(input,options);
  window.__atlasApiCalls.push({url,method:options.method||'GET',credentials:options.credentials||null});
  const u=new URL(url);
  const repo=u.pathname.split('/')[3]||'',endpoint=u.pathname.split('/')[4]||'repository';
  if(repo==='QingJi'&&endpoint==='releases')return reply(403,{message:'API rate limit exceeded'},'0');
  if(endpoint==='repository'){
   const stars=repo==='QingJi'?8:32;
   return reply(200,{full_name:'AincFh/'+repo,language:repo==='QingJi'?'Kotlin':'JavaScript',
    stargazers_count:stars,forks_count:3,open_issues_count:12,default_branch:'main',
    license:{spdx_id:'MIT'}});
  }
  if(endpoint==='issues')return reply(200,[
   {number:11,title:'Repair signing',state:'open'},
   {number:12,title:'PR title mixed in issues list',state:'open',pull_request:{url:'https://api.github.com/pulls/12'}}]);
  if(endpoint==='languages')return reply(200,{JavaScript:4300,TypeScript:810,Kotlin:200});
  return reply(200,[]);
 };
})();"""
with socketserver.TCPServer(("127.0.0.1",0),Handler) as server:
 threading.Thread(target=server.serve_forever,daemon=True).start()
 opt=Options()
 for flag in ("--headless=new","--no-sandbox","--disable-dev-shm-usage","--window-size=1440,900"):opt.add_argument(flag)
 opt.set_capability("goog:loggingPrefs",{"browser":"ALL"})
 driver=webdriver.Chrome(options=opt)
 try:
  driver.execute_cdp_cmd("Page.addScriptToEvaluateOnNewDocument",{"source":fixture})
  driver.get(f"http://127.0.0.1:{server.server_address[1]}/#api-lab")
  until(lambda:driver.execute_script("return document.querySelector('.view.is-active')?.id==='api-lab'"))
  until(lambda:len(driver.find_elements(By.CSS_SELECTOR,"#apiLabEndpoint option"))==8)
  driver.find_element(By.ID,"apiLabRun").click()
  until(lambda:'HTTP 200' in driver.find_element(By.ID,"apiLabResult1").text)
  assert '32' in driver.find_element(By.ID,"apiLabResult1").text
  assert driver.find_element(By.ID,"apiLabJson").is_enabled()
  first=driver.execute_script('return window.__atlasApiCalls[0]')
  assert first['url']=='https://api.github.com/repos/AincFh/dev-control-center',first
  assert first['method']=='GET' and first['credentials']=='omit',first
  driver.find_element(By.CSS_SELECTOR,"#apiLabResult1 .api-inspect-toolbar button").click()
  until(lambda:len(driver.find_elements(By.CSS_SELECTOR,"#apiLabResult1 .api-tree-row"))>=5)
  driver.find_element(By.ID,"apiLabFilter").send_keys('stargazers_count')
  until(lambda:len(driver.find_elements(By.CSS_SELECTOR,"#apiLabResult1 .api-tree-row"))==1)
  assert 'stargazers_count' in driver.find_element(By.CSS_SELECTOR,"#apiLabResult1 .api-tree-row").text
  driver.find_element(By.ID,"apiLabCompareEnabled").click()
  assert driver.find_element(By.ID,"apiLabSecond").is_displayed()
  driver.find_element(By.ID,"apiLabRun").click()
  until(lambda:'HTTP 200' in driver.find_element(By.ID,"apiLabResult2").text)
  assert 'Kotlin' in driver.find_element(By.ID,"apiLabResult2").text
  assert len(driver.find_elements(By.CSS_SELECTOR,"#apiLabCompare .api-compare-row.changed"))>=2
  driver.save_screenshot(str(OUT/"compare.png"))
  driver.find_element(By.ID,"apiLabCompareEnabled").click()
  assert not driver.find_element(By.ID,"apiLabResult2").is_displayed()
  Select(driver.find_element(By.ID,"apiLabEndpoint")).select_by_value('issues')
  driver.find_element(By.ID,"apiLabRun").click()
  until(lambda:'Repair signing' in driver.find_element(By.ID,"apiLabResult1").text)
  assert 'PR title mixed' not in driver.find_element(By.ID,"apiLabResult1").text
  assert len(driver.find_elements(By.CSS_SELECTOR,"#apiLabResult1 .api-sample-items li"))==1
  # HTTP errors are preserved, not masked as empty data.
  driver.find_element(By.ID,"apiLabCompareEnabled").click()
  Select(driver.find_element(By.ID,"apiLabEndpoint")).select_by_value('releases')
  driver.find_element(By.ID,"apiLabRun").click()
  until(lambda:'HTTP 403' in driver.find_element(By.ID,"apiLabResult2").text)
  assert 'rate limit' in driver.find_element(By.ID,"apiLabResult2").text
  assert '请求完成' not in driver.find_element(By.ID,"apiLabStatus").text
  driver.find_element(By.ID,"apiLabClear").click()
  assert not driver.find_element(By.ID,"apiLabExport").is_enabled()
  assert len(driver.find_elements(By.CSS_SELECTOR,"#apiLabResult1 .api-fact"))==0
  driver.set_window_size(390,844);time.sleep(.45)
  viewport=driver.execute_script("return {width:innerWidth,docWidth:document.documentElement.scrollWidth,route:document.querySelector('.view.is-active')?.id}")
  assert viewport['docWidth']<=viewport['width']+4,viewport
  assert viewport['route']=='api-lab'
  driver.save_screenshot(str(OUT/"mobile.png"))
  errors=[x['message'] for x in driver.get_log('browser') if x['level']=='SEVERE' and 'Uncaught' in x['message']]
  assert not errors,errors
  print(json.dumps({"endpointOptions":8,"githubPublicGET":first["url"],"sourceComparisons":True,
   "issueFiltering":True,"httpFailure":403,"mobile":viewport,"uncaughtErrors":errors},ensure_ascii=False))
 finally:
  driver.quit();server.shutdown()