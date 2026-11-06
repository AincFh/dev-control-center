"""ATLAS cross-domain release evidence: real Chromium DOM, filters, workboard handoff and responsive layout.
Only public JSON transport is fixture-backed. All application JavaScript and CSS run in Chromium.
"""
import datetime,json,pathlib,socketserver,threading,time
from http.server import SimpleHTTPRequestHandler
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import Select

ROOT=pathlib.Path(__file__).resolve().parents[1]
OUT=ROOT/"test-artifacts"/"release-review";OUT.mkdir(parents=True,exist_ok=True)
STAMP=datetime.datetime.now(datetime.timezone.utc).isoformat()
def project(name,ci,site,probe=None):
 return {"name":name,"repositoryUrl":"https://github.com/AincFh/"+name,
  "description":name,"language":"JavaScript","updatedAt":STAMP,
  "ci":{"state":ci,"updatedAt":STAMP},"site":{"state":site},"probe":probe,
  "openIssues":0,"openPRs":0,"issuePreview":[],"prPreview":[]}
data=[
 project("my-anime-blog","success","published",{"state":"reachable"}),
 project("QingJi","success","unknown"),
 project("cozy-bistro-sim","success","published"),
 project("AincFh","unknown","unknown")
]
repos=[{"name":p["name"],"html_url":p["repositoryUrl"],"description":p["description"],
 "language":p["language"],"pushed_at":STAMP,"private":False,
 "stargazers_count":0} for p in data]
snapshot={"schemaVersion":2,"owner":"AincFh","publicOnly":True,"generatedAt":STAMP,"errors":[],"projects":data}
qa={"schemaVersion":1,"owner":"AincFh","generatedAt":STAMP,
 "runUrl":"https://github.com/AincFh/dev-control-center/actions/runs/42224715758",
 "results":[{"id":"bistro","repo":"cozy-bistro-sim","status":"fail",
 "checks":[{"id":"core-flow","label":"核心操作","status":"fail","reason":"fixture-detected actual failure"}]}]}
script="""(()=>{
 const snapshot=__SNAPSHOT__,repos=__REPOS__,qa=__QA__,real=window.fetch.bind(window);
 const response=v=>Promise.resolve(new Response(JSON.stringify(v),{status:200,headers:{'Content-Type':'application/json'}}));
 window.fetch=(input,...options)=>{
  const url=String(typeof input==='string'?input:input.url);
  if(url.includes('/data/status.json'))return response(snapshot);
  if(url.includes('/users/AincFh/repos?'))return response(repos);
  if(url.includes('/data/game-runtime.json'))return response(qa);
  if(url.includes('/users/AincFh/events/public?'))return response([]);
  return real(input,...options);
 };
})();""".replace("__SNAPSHOT__",json.dumps(snapshot,ensure_ascii=False)).replace("__REPOS__",json.dumps(repos,ensure_ascii=False)).replace("__QA__",json.dumps(qa,ensure_ascii=False))
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(ROOT),**kwargs)
 def log_message(self,*args):pass
with socketserver.TCPServer(("127.0.0.1",0),Handler) as server:
 threading.Thread(target=server.serve_forever,daemon=True).start()
 opts=Options()
 for flag in ("--headless=new","--no-sandbox","--disable-dev-shm-usage","--window-size=1440,900"):
  opts.add_argument(flag)
 opts.set_capability("goog:loggingPrefs",{"browser":"ALL"})
 driver=webdriver.Chrome(options=opts)
 driver.set_page_load_timeout(40)
 def until(fn,tries=75):
  for _ in range(tries):
   try:
    value=fn()
    if value:return value
   except Exception:pass
   time.sleep(.2)
  raise AssertionError("Timed out waiting for release review UI")
 try:
  driver.execute_cdp_cmd("Page.addScriptToEvaluateOnNewDocument",{"source":script})
  driver.get(f"http://127.0.0.1:{server.server_address[1]}/#delivery")
  until(lambda:len(driver.find_elements(By.CSS_SELECTOR,"#releaseGrid .release-card"))==4)
  assert driver.find_element(By.CSS_SELECTOR,"#releaseGrid .release-card:first-child").get_attribute("data-repo")=="cozy-bistro-sim"
  assert [v.text for v in driver.find_elements(By.CSS_SELECTOR,"#releaseOverview .release-metric strong")]==["4","1","1","2"]
  assert driver.find_element(By.ID,"releaseFreshness").get_attribute("data-state")=="fresh"
  driver.save_screenshot(str(OUT/"desktop.png"))
  Select(driver.find_element(By.ID,"releaseDomain")).select_by_value("mobile")
  until(lambda:len(driver.find_elements(By.CSS_SELECTOR,"#releaseGrid .release-card"))==1)
  card=driver.find_element(By.CSS_SELECTOR,"#releaseGrid .release-card")
  assert card.get_attribute("data-repo")=="QingJi"
  assert [x.text for x in card.find_elements(By.CSS_SELECTOR,".release-lane strong")]==["已观测","已观测","未知","未知","未知"]
  card.find_element(By.TAG_NAME,"summary").click()
  assert "安装包" in card.find_element(By.CSS_SELECTOR,".release-detail-list").text
  Select(driver.find_element(By.ID,"releaseDomain")).select_by_value("all")
  Select(driver.find_element(By.ID,"releaseState")).select_by_value("human")
  until(lambda:len(driver.find_elements(By.CSS_SELECTOR,"#releaseGrid .release-card"))==1)
  assert driver.find_element(By.CSS_SELECTOR,"#releaseGrid .release-card").get_attribute("data-repo")=="my-anime-blog"
  Select(driver.find_element(By.ID,"releaseState")).select_by_value("all")
  search=driver.find_element(By.ID,"releaseSearch")
  search.send_keys("qingji")
  until(lambda:len(driver.find_elements(By.CSS_SELECTOR,"#releaseGrid .release-card"))==1)
  assert driver.find_element(By.CSS_SELECTOR,"#releaseGrid .release-card").get_attribute("data-repo")=="QingJi"
  driver.find_element(By.CSS_SELECTOR,"#releaseGrid .release-card .release-card-controls button").click()
  until(lambda:driver.find_element(By.ID,"workEditor").get_attribute("open") is not None)
  assert driver.execute_script("return location.hash")=="#workboard"
  assert Select(driver.find_element(By.ID,"workEditRepo")).first_selected_option.get_attribute("value")=="QingJi"
  driver.find_element(By.ID,"workEditorClose").click()
  driver.get(f"http://127.0.0.1:{server.server_address[1]}/#delivery")
  until(lambda:driver.find_element(By.ID,"releaseGrid").is_displayed())
  # View navigation intentionally retains local filters. Reset the query before
  # asserting the full matrix; this is not a fresh-browser app startup.
  driver.execute_script("const s=document.getElementById('releaseSearch');s.value='';s.dispatchEvent(new Event('input',{bubbles:true}));")
  until(lambda:len(driver.find_elements(By.CSS_SELECTOR,"#releaseGrid .release-card"))==4)
  driver.set_window_size(390,844)
  time.sleep(.4)
  viewport=driver.execute_script("return {card:document.querySelector('.release-card').getBoundingClientRect().width,grid:document.querySelector('.release-grid').getBoundingClientRect().width}")
  assert viewport["card"]<=viewport["grid"]+1,viewport
  driver.save_screenshot(str(OUT/"mobile.png"))
  errors=[x["message"] for x in driver.get_log("browser") if x["level"]=="SEVERE" and "favicon" not in x["message"]]
  assert not errors,errors
  print("PASS cross-domain release review: live Chromium sorting, source-specific gates, filters, details, workboard handoff and mobile layout")
 finally:
  driver.quit()
  server.shutdown()