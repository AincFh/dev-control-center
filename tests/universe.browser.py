"""Real ATLAS thousand-project browser QA: paging, selection restrictions, favorites, mobile canvas."""
import json,pathlib,socketserver,threading,time
from http.server import SimpleHTTPRequestHandler
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import Select

ROOT=pathlib.Path(__file__).resolve().parents[1];OUT=ROOT/"test-artifacts"/"universe";OUT.mkdir(parents=True,exist_ok=True)
class Server(SimpleHTTPRequestHandler):
 def __init__(self,*a,**kw):super().__init__(*a,directory=str(ROOT),**kw)
 def log_message(self,*a):pass
with socketserver.TCPServer(("127.0.0.1",0),Server) as server:
 threading.Thread(target=server.serve_forever,daemon=True).start()
 opt=Options()
 for flag in ("--headless=new","--no-sandbox","--disable-dev-shm-usage","--window-size=1440,900"):opt.add_argument(flag)
 opt.set_capability("goog:loggingPrefs",{"browser":"ALL"})
 driver=webdriver.Chrome(options=opt);driver.set_page_load_timeout(45)
 def until(fn,tries=65):
  for _ in range(tries):
   try:
    v=fn()
    if v:return v
   except Exception:pass
   time.sleep(.2)
  raise AssertionError("Timed out waiting for Universe UI")
 try:
  driver.get(f"http://127.0.0.1:{server.server_address[1]}/#universe")
  until(lambda:driver.execute_script("return document.getElementById('universeTotal')?.textContent?.replace(/,/g,'')*1>=1000"))
  count=int(driver.find_element(By.ID,"universeTotal").text.replace(",",""))
  assert count>=1000,count
  cards=driver.find_elements(By.CSS_SELECTOR,"#universeGrid .universe-project")
  assert len(cards)==24,len(cards)
  assert len(driver.find_elements(By.CSS_SELECTOR,"#universeCategories button"))>=9
  # Cross-domain family switch must be actual interactive filtering, not label-only navigation.
  assert len(driver.find_elements(By.CSS_SELECTOR,"#universeDomains button"))==3
  assert driver.find_element(By.CSS_SELECTOR,"#universeDomains button[data-family='software']").get_attribute('aria-pressed')=='true'
  assert any('AI' in x.text for x in driver.find_elements(By.CSS_SELECTOR,"#universeCategories button"))
  driver.find_element(By.CSS_SELECTOR,"#universeDomains button[data-family='game']").click()
  until(lambda:driver.find_element(By.CSS_SELECTOR,"#universeDomains button[data-family='game']").get_attribute('aria-pressed')=='true')
  assert len(driver.find_elements(By.CSS_SELECTOR,"#universeGrid .universe-project"))==24
  driver.find_element(By.CSS_SELECTOR,"#universeDomains button[data-family='all']").click()
  assert len(driver.find_elements(By.CSS_SELECTOR,"#universeCategories button"))>=21
  driver.find_element(By.CSS_SELECTOR,"#universeDomains button[data-family='software']").click()
  assert len(driver.find_elements(By.CSS_SELECTOR,"#universeGrid .universe-project"))==24
  canvas=driver.execute_script("return {w:document.getElementById('universeCanvas').width,h:document.getElementById('universeCanvas').height}")
  assert canvas['w']>250 and canvas['h']>200,canvas
  # Real DOM events are cancelled for copy, paste, context menus, and text selection.
  blocked=driver.execute_script("""return ['copy','cut','paste','contextmenu','selectstart'].map(type=>{
    const e=new Event(type,{bubbles:true,cancelable:true});document.body.dispatchEvent(e);return [type,e.defaultPrevented]
  })""")
  assert all(v for _,v in blocked),blocked
  driver.save_screenshot(str(OUT/"01-universe-desktop.png"))
  driver.find_element(By.ID,"universeNext").click()
  until(lambda:driver.find_element(By.ID,"universePage").text.startswith("2 /"))
  assert len(driver.find_elements(By.CSS_SELECTOR,"#universeGrid .universe-project"))==24
  driver.find_element(By.ID,"universePrev").click()
  until(lambda:driver.find_element(By.ID,"universePage").text.startswith("1 /"))
  target=driver.find_element(By.CSS_SELECTOR,"#universeGrid .universe-project .universe-name strong").text
  assert target
  driver.find_element(By.CSS_SELECTOR,"#universeGrid .universe-project .universe-save").click()
  assert driver.find_element(By.ID,"universeSaved").text=="1"
  driver.find_element(By.ID,"universeOnlySaved").click()
  assert len(driver.find_elements(By.CSS_SELECTOR,"#universeGrid .universe-project"))==1
  driver.refresh()
  until(lambda:driver.execute_script("return document.getElementById('universeSaved')?.textContent==='1'"))
  # Watchlist filter itself does not persist, the underlying favorite does.
  driver.find_element(By.ID,"universeOnlySaved").click()
  assert len(driver.find_elements(By.CSS_SELECTOR,"#universeGrid .universe-project"))==1
  driver.find_element(By.ID,"universeOnlySaved").click()
  search=driver.find_element(By.ID,"universeSearch")
  search.send_keys("no-exact-match-for-1580-atlas-games-test")
  assert len(driver.find_elements(By.CSS_SELECTOR,"#universeGrid .universe-project"))==0
  search.clear()
  driver.execute_script("arguments[0].dispatchEvent(new Event('input',{bubbles:true}))",search)
  until(lambda:len(driver.find_elements(By.CSS_SELECTOR,"#universeGrid .universe-project"))==24)
  driver.set_window_size(390,844)
  time.sleep(.5)
  mobile=driver.execute_script("""return{
   width:innerWidth,scrollWidth:document.documentElement.scrollWidth,
   contentScroll:document.getElementById('content').scrollWidth-document.getElementById('content').clientWidth,
   cards:document.querySelectorAll('#universeGrid .universe-project').length,
   canvas:document.getElementById('universeCanvas').getBoundingClientRect().width,
   route:document.querySelector('.view.is-active')?.id
  }""")
  assert mobile['width']>300 and mobile['width']<550,mobile
  assert mobile['scrollWidth']<=mobile['width']+4,mobile
  assert mobile['contentScroll']<=4,mobile
  assert mobile['cards']==24 and mobile['route']=='universe',mobile
  driver.save_screenshot(str(OUT/"02-universe-mobile.png"))
  # Global Cmd/Ctrl+K palette searches routes, games and the real external catalog.
  driver.execute_script("location.hash='#home'")
  driver.find_element(By.ID,'quickFind').click()
  until(lambda:driver.execute_script("return document.getElementById('commandDialog').open"))
  input=driver.find_element(By.ID,'commandInput')
  input.send_keys('研发总控')
  until(lambda:len(driver.find_elements(By.CSS_SELECTOR,'#commandResults .command-entry'))==1)
  input.send_keys(Keys.ENTER)
  until(lambda:driver.execute_script("return location.hash==='#mission'"))
  driver.find_element(By.ID,'quickFind').click()
  input=driver.find_element(By.ID,'commandInput')
  input.send_keys('qubecraft')
  until(lambda:len(driver.find_elements(By.CSS_SELECTOR,'#commandResults .command-entry'))>=1)
  driver.save_screenshot(str(OUT/"04-global-search.png"))
  input.send_keys(Keys.ESCAPE)
  assert not driver.execute_script("return document.getElementById('commandDialog').open")
  severe=[x['message'] for x in driver.get_log("browser") if x["level"]=="SEVERE"]
  critical=[s for s in severe if "Uncaught" in s or ("/universe" in s and "404" in s)]
  assert not critical,critical
  # Connect the real GitHub source directory to the local research Kanban.
  driver.set_window_size(1440,900)
  driver.execute_script("location.hash='#universe'")
  until(lambda:driver.execute_script("return document.querySelector('#universe')?.classList.contains('is-active')"))
  source=driver.find_element(By.CSS_SELECTOR,"#universeGrid .universe-project .universe-incubate")
  source.click()
  until(lambda:driver.execute_script("return document.querySelector('#candidateCount')?.textContent==='1'"))
  driver.execute_script("location.hash='#incubator'")
  until(lambda:driver.execute_script("return document.querySelector('#incubator')?.classList.contains('is-active')"))
  assert len(driver.find_elements(By.CSS_SELECTOR,"#candidateBoard .candidate-card"))==1
  driver.find_element(By.CSS_SELECTOR,"#candidateBoard .candidate-card .candidate-button.primary").click()
  assert driver.execute_script("return document.querySelector('#candidateEditor').open")
  assert driver.find_element(By.ID,"candidateIssue").get_attribute("href").startswith("https://github.com/AincFh/dev-control-center/issues/new?")
  driver.find_element(By.ID,"candidateEditNote").send_keys("ATLAS browser verified research note")
  assert "ATLAS%20browser" in driver.find_element(By.ID,"candidateIssue").get_attribute("href")
  Select(driver.find_element(By.ID,'candidateEditStage')).select_by_value('review')
  driver.find_element(By.CSS_SELECTOR,"#candidateForm button[type='submit']").click()
  until(lambda:len(driver.find_elements(By.CSS_SELECTOR,"#candidateBoard .candidate-card"))==1)
  assert driver.execute_script("return document.querySelector('#candidateEditor').open") is False
  driver.refresh()
  until(lambda:driver.execute_script("return document.querySelector('#candidateTotal')?.textContent==='1'"))
  assert len(driver.find_elements(By.CSS_SELECTOR,"#candidateBoard .candidate-card"))==1
  assert driver.find_element(By.CSS_SELECTOR,"#candidateBoard .candidate-card .candidate-snippet").text=="ATLAS browser verified research note"
  driver.set_window_size(390,844)
  time.sleep(.3)
  incubator_mobile=driver.execute_script("""return{
   width:innerWidth,documentWidth:document.documentElement.scrollWidth,
   boardWidth:document.getElementById('candidateBoard').clientWidth,
   boardContentWidth:document.getElementById('candidateBoard').scrollWidth,
   route:document.querySelector('.view.is-active')?.id
  }""")
  assert incubator_mobile['documentWidth']<=incubator_mobile['width']+4,incubator_mobile
  assert incubator_mobile['route']=='incubator',incubator_mobile
  assert incubator_mobile['boardContentWidth']>incubator_mobile['boardWidth'],incubator_mobile
  driver.save_screenshot(str(OUT/"03-incubator-mobile.png"))
  severe_after=[x['message'] for x in driver.get_log("browser") if x["level"]=="SEVERE"]
  assert not [s for s in severe_after if "Uncaught" in s],severe_after
  report={"realExternalRepositories":count,"desktopCards":len(cards),"canvas":canvas,"blockedEvents":blocked,"mobile":mobile,"incubatorMobile":incubator_mobile,"criticalErrors":critical}
  (OUT/"report.json").write_text(json.dumps(report,indent=2,ensure_ascii=False))
  print(json.dumps(report,ensure_ascii=False))
 finally:
  driver.quit();server.shutdown()
