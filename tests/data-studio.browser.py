"""ATLAS Data Studio: real Chromium tests of import, analysis, export and responsive UI."""
import csv,json,pathlib,socketserver,threading,time
from http.server import SimpleHTTPRequestHandler
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import Select
ROOT=pathlib.Path(__file__).resolve().parents[1]
OUT=ROOT/"test-artifacts"/"data-studio";OUT.mkdir(parents=True,exist_ok=True)
class Server(SimpleHTTPRequestHandler):
 def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(ROOT),**kwargs)
 def log_message(self,*args):pass
def until(fn,tries=85):
 for _ in range(tries):
  try:
   value=fn()
   if value:return value
  except Exception:pass
  time.sleep(.2)
 raise AssertionError("Timed out waiting for Data Studio UI")
with socketserver.TCPServer(("127.0.0.1",0),Server) as server:
 threading.Thread(target=server.serve_forever,daemon=True).start()
 chrome=Options()
 for arg in ("--headless=new","--no-sandbox","--disable-dev-shm-usage","--window-size=1440,900"):chrome.add_argument(arg)
 chrome.add_experimental_option("prefs",{"download.default_directory":str(OUT),"download.prompt_for_download":False})
 chrome.set_capability("goog:loggingPrefs",{"browser":"ALL"})
 driver=webdriver.Chrome(options=chrome)
 try:
  driver.get(f"http://127.0.0.1:{server.server_address[1]}/#data-studio")
  until(lambda:driver.execute_script("return document.querySelector('.view.is-active')?.id==='data-studio'"))
  driver.find_element(By.ID,"dataSample").click()
  until(lambda:len(driver.find_elements(By.CSS_SELECTOR,"#dataTable tbody tr"))==10)
  assert len(driver.find_elements(By.CSS_SELECTOR,"#dataStats .data-stat"))==4
  assert len(driver.find_elements(By.CSS_SELECTOR,"#dataChart .data-bar-row"))>=7
  assert "虚构" in driver.find_element(By.ID,"dataDataSource").text
  Select(driver.find_element(By.ID,"dataOperation")).select_by_value("sum")
  assert driver.find_element(By.ID,"dataMetric").is_enabled()
  until(lambda:"合计" in driver.find_element(By.ID,"dataChartCaption").text)
  search=driver.find_element(By.ID,"dataFilterQuery");search.send_keys("Mobile")
  until(lambda:len(driver.find_elements(By.CSS_SELECTOR,"#dataTable tbody tr"))==1)
  assert "QingJi" in driver.find_element(By.ID,"dataTable").text
  assert "1 / 1 页" in driver.find_element(By.ID,"dataPage").text
  driver.find_element(By.ID,"dataExportCsv").click()
  until(lambda:len(list(OUT.glob("atlas-data-*.csv")))>0)
  exported=list(OUT.glob("atlas-data-*.csv"))[-1].read_text(encoding="utf-8")
  assert "QingJi" in exported and "ATLAS,Platform" not in exported
  driver.save_screenshot(str(OUT/"01-data-analysis-desktop.png"))
  driver.find_element(By.ID,"dataClear").click()
  assert len(driver.find_elements(By.CSS_SELECTOR,"#dataTable table"))==0
  assert not driver.find_element(By.ID,"dataExportCsv").is_enabled()
  # Import from an actual local file through the file input, not a mocked API.
  sample=OUT/"fixture.csv";sample.write_text('department,amount,month\nLab,120,2026-10-01\nOps,260,2026-10-02\nLab,75,2026-10-03',encoding="utf-8")
  driver.find_element(By.ID,"dataFile").send_keys(str(sample))
  until(lambda:len(driver.find_elements(By.CSS_SELECTOR,"#dataTable tbody tr"))==3)
  Select(driver.find_element(By.ID,"dataGroup")).select_by_value("department")
  until(lambda:len(driver.find_elements(By.CSS_SELECTOR,"#dataChart .data-bar-row"))==2)
  Select(driver.find_element(By.ID,"dataOperation")).select_by_value("sum")
  Select(driver.find_element(By.ID,"dataMetric")).select_by_value("amount")
  until(lambda:"260" in driver.find_element(By.ID,"dataChart").text)
  driver.find_element(By.ID,"dataExportJson").click()
  until(lambda:len(list(OUT.glob("atlas-data-*.json")))>0)
  rows=json.loads(list(OUT.glob("atlas-data-*.json"))[-1].read_text(encoding="utf-8"))
  assert len(rows)==3 and rows[0]["department"]=="Lab"
  # JSON input and textual error paths are also genuine browser operations.
  driver.find_element(By.ID,"dataClear").click()
  area=driver.find_element(By.ID,"dataInput");area.send_keys('[{"name":"A","score":5},{"name":"B","score":15}]')
  driver.find_element(By.ID,"dataImport").click()
  until(lambda:len(driver.find_elements(By.CSS_SELECTOR,"#dataTable tbody tr"))==2)
  Select(driver.find_element(By.ID,"dataFilterColumn")).select_by_value("score")
  Select(driver.find_element(By.ID,"dataFilterOperator")).select_by_value("gte")
  driver.find_element(By.ID,"dataFilterQuery").send_keys("10")
  until(lambda:len(driver.find_elements(By.CSS_SELECTOR,"#dataTable tbody tr"))==1)
  assert "B" in driver.find_element(By.ID,"dataTable").text
  driver.find_element(By.ID,"dataClear").click()
  area=driver.find_element(By.ID,"dataInput");area.send_keys('not a csv,with\nbad,too,many')
  driver.find_element(By.ID,"dataImport").click()
  until(lambda:driver.find_element(By.ID,"dataFeedback").get_attribute("data-kind")=="error")
  driver.set_window_size(390,844);time.sleep(.3)
  metrics=driver.execute_script("""return{
   width:innerWidth,pageWidth:document.documentElement.scrollWidth,
   route:document.querySelector('.view.is-active')?.id,
   source:document.getElementById('dataInput').getBoundingClientRect().width
  }""")
  assert metrics["width"]>=380 and metrics["width"]<=410,metrics
  assert metrics["pageWidth"]<=metrics["width"]+4,metrics
  assert metrics["route"]=="data-studio",metrics
  driver.save_screenshot(str(OUT/"02-data-analysis-mobile.png"))
  errors=[x["message"] for x in driver.get_log("browser") if x["level"]=="SEVERE" and "Uncaught" in x["message"]]
  assert not errors,errors
  print(json.dumps({"source":"local files & pasted JSON","aggregation":"count,sum,avg","filter":"numeric and text","export":"CSV + JSON","mobile":metrics,"criticalErrors":errors},ensure_ascii=False))
 finally:driver.quit();server.shutdown()
