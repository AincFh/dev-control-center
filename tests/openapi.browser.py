"""Chromium OpenAPI local contract QA: actual form clicks, JSON validation,
operations filtering, local JSON file import, error states and mobile layout.
"""
import json,pathlib,socketserver,threading,time
from http.server import SimpleHTTPRequestHandler
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import Select
ROOT=pathlib.Path(__file__).resolve().parents[1]
OUT=ROOT/"test-artifacts"/"openapi";OUT.mkdir(parents=True,exist_ok=True)
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*a,**kw):super().__init__(*a,directory=str(ROOT),**kw)
 def log_message(self,*a):pass
def until(fn,tries=90):
 for _ in range(tries):
  try:
   v=fn()
   if v:return v
  except Exception:pass
  time.sleep(.2)
 raise AssertionError("OpenAPI local browser operation did not complete")
with socketserver.TCPServer(("127.0.0.1",0),Handler) as server:
 threading.Thread(target=server.serve_forever,daemon=True).start()
 opts=Options()
 for a in ("--headless=new","--no-sandbox","--disable-dev-shm-usage","--window-size=1440,900"):opts.add_argument(a)
 opts.set_capability("goog:loggingPrefs",{"browser":"ALL"})
 driver=webdriver.Chrome(options=opts)
 try:
  driver.get(f"http://127.0.0.1:{server.server_address[1]}/#api-lab")
  until(lambda:driver.execute_script("return document.querySelector('.view.is-active')?.id==='api-lab'"))
  driver.find_element(By.CSS_SELECTOR,"#oasWorkbench > summary").click()
  until(lambda:driver.find_element(By.ID,"oasExample").is_displayed())
  driver.find_element(By.ID,"oasExample").click()
  until(lambda:len(driver.find_elements(By.CSS_SELECTOR,"#oasResults .oas-operation"))==3)
  assert [x.text for x in driver.find_elements(By.CSS_SELECTOR,".oas-summary-item strong")]==["2","3","0","0"]
  assert driver.find_element(By.ID,"oasExport").is_enabled()
  driver.save_screenshot(str(OUT/"desktop.png"))
  Select(driver.find_element(By.ID,"oasMethod")).select_by_value('post')
  until(lambda:len(driver.find_elements(By.CSS_SELECTOR,"#oasResults .oas-operation"))==1)
  assert driver.find_element(By.CSS_SELECTOR,".oas-operation .oas-method").text=="POST"
  Select(driver.find_element(By.ID,"oasMethod")).select_by_value('all')
  search=driver.find_element(By.ID,"oasFilter")
  search.send_keys('getItem')
  until(lambda:len(driver.find_elements(By.CSS_SELECTOR,"#oasResults .oas-operation"))==1)
  assert '/items/{id}' in driver.find_element(By.CSS_SELECTOR,"#oasResults .oas-operation").text
  input=driver.find_element(By.ID,'oasInput')
  input.clear()
  input.send_keys('invalid YAML')
  driver.find_element(By.ID,'oasAnalyze').click()
  until(lambda:driver.find_element(By.ID,'oasStatus').get_attribute('data-kind')=='error')
  assert not driver.find_element(By.ID,'oasExport').is_enabled()
  invalid={"openapi":"3.1.0","info":{"title":"Broken API","version":"1.0"},
    "paths":{"/users/{id}":{"get":{"operationId":"duplicate","responses":{}}},
             "/items":{"post":{"operationId":"duplicate","responses":{"201":{"description":"OK"}}}}}}
  fixture=OUT/"contract.json"
  fixture.write_text(json.dumps(invalid,ensure_ascii=False),encoding="utf-8")
  driver.find_element(By.ID,"oasFile").send_keys(str(fixture.resolve()))
  until(lambda:len(driver.find_elements(By.CSS_SELECTOR,"#oasResults .oas-operation"))==2)
  assert len(driver.find_elements(By.CSS_SELECTOR,".oas-issue.error"))>=3
  driver.find_element(By.CSS_SELECTOR,"#oasResults .oas-findings summary").click()
  assert 'duplicate' in driver.find_element(By.CSS_SELECTOR,"#oasResults .oas-issues").text
  driver.set_window_size(390,844);time.sleep(.4)
  viewport=driver.execute_script("return{width:innerWidth,documentWidth:document.documentElement.scrollWidth,openapi:document.getElementById('oasWorkbench').open}")
  assert viewport["documentWidth"]<=viewport["width"]+4,viewport
  assert viewport["openapi"] is True,viewport
  driver.save_screenshot(str(OUT/"mobile.png"))
  driver.find_element(By.ID,"oasClear").click()
  assert not driver.find_element(By.ID,"oasExport").is_enabled()
  assert len(driver.find_elements(By.CSS_SELECTOR,"#oasResults .oas-operation"))==0
  errors=[x["message"] for x in driver.get_log("browser") if x["level"]=="SEVERE" and "Uncaught" in x["message"]]
  assert not errors,errors
  print(json.dumps({"localOpenAPI":True,"operations":3,"syntaxFailure":True,"fileImport":True,"diagnosticErrors":True,"mobile":viewport,"criticalErrors":errors},ensure_ascii=False))
 finally:
  driver.quit();server.shutdown()
