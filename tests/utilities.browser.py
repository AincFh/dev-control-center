"""Actual Chromium interaction checks for the ATLAS browser-local developer workshop."""
import json,pathlib,socketserver,threading,time
from http.server import SimpleHTTPRequestHandler
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
ROOT=pathlib.Path(__file__).resolve().parents[1]
OUT=ROOT/"test-artifacts"/"utilities";OUT.mkdir(parents=True,exist_ok=True)
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*a,**kw):super().__init__(*a,directory=str(ROOT),**kw)
 def log_message(self,*a):pass
def until(fn,tries=70):
 for _ in range(tries):
  try:
   result=fn()
   if result:return result
  except Exception:pass
  time.sleep(.2)
 raise AssertionError("Timed out waiting for local utility result")
with socketserver.TCPServer(("127.0.0.1",0),Handler) as server:
 threading.Thread(target=server.serve_forever,daemon=True).start()
 options=Options()
 for arg in ("--headless=new","--no-sandbox","--disable-dev-shm-usage","--window-size=1440,900"):options.add_argument(arg)
 options.set_capability("goog:loggingPrefs",{"browser":"ALL"})
 driver=webdriver.Chrome(options=options)
 try:
  driver.get(f"http://127.0.0.1:{server.server_address[1]}/#utilities")
  until(lambda:driver.execute_script("return document.querySelector('.view.is-active')?.id==='utilities'"))
  until(lambda:len(driver.find_elements(By.CSS_SELECTOR,"#utilsTabs button"))==7)
  a=driver.find_element(By.ID,"utilsInputA")
  a.send_keys('{"a":1,"b":[2]}')
  driver.find_element(By.ID,"utilsRun").click()
  until(lambda:'"a": 1' in driver.find_element(By.ID,"utilsOutput").text)
  assert driver.find_element(By.ID,"utilsDownload").is_enabled()
  a.clear();a.send_keys('{bad')
  driver.find_element(By.ID,"utilsRun").click()
  until(lambda:driver.find_element(By.ID,"utilsStatus").get_attribute('data-status')=='error')
  assert not driver.find_element(By.ID,"utilsDownload").is_enabled()
  driver.find_element(By.CSS_SELECTOR,"#utilsTabs button[data-tool='csv']").click()
  driver.find_element(By.ID,"utilsInputA").send_keys('name,note\nAlice,"hello, world"')
  driver.find_element(By.ID,"utilsRun").click()
  until(lambda:'hello, world' in driver.find_element(By.ID,"utilsOutput").text)
  driver.find_element(By.CSS_SELECTOR,"#utilsTabs button[data-tool='diff']").click()
  assert driver.find_element(By.ID,"utilsInputBWrap").is_displayed()
  driver.find_element(By.ID,"utilsInputA").send_keys("first\nold")
  driver.find_element(By.ID,"utilsInputB").send_keys("first\nnew")
  driver.find_element(By.ID,"utilsRun").click()
  until(lambda:len(driver.find_elements(By.CSS_SELECTOR,"#utilsOutput .utils-diff-added"))==1)
  assert len(driver.find_elements(By.CSS_SELECTOR,"#utilsOutput .utils-diff-removed"))==1
  driver.find_element(By.CSS_SELECTOR,"#utilsTabs button[data-tool='base64']").click()
  driver.find_element(By.ID,"utilsInputA").send_keys('Chinese: 中文 😀')
  driver.find_element(By.ID,"utilsRun").click()
  encoded=until(lambda:driver.find_element(By.CSS_SELECTOR,"#utilsOutput pre").text.strip())
  assert encoded!='Chinese: 中文 😀'
  driver.find_element(By.CSS_SELECTOR,"#utilsTabs button[data-tool='sha256']").click()
  driver.find_element(By.ID,"utilsInputA").send_keys('abc')
  driver.find_element(By.ID,"utilsRun").click()
  until(lambda:'ba7816bf8f01cfea414140de5dae2223' in driver.find_element(By.ID,"utilsOutput").text)
  driver.save_screenshot(str(OUT/"desktop.png"))
  driver.set_window_size(390,844);time.sleep(.3)
  mobile=driver.execute_script("""return{
   width:innerWidth,pageWidth:document.documentElement.scrollWidth,
   tools:document.querySelectorAll('#utilsTabs button').length,
   current:document.querySelector('.view.is-active')?.id
  }""")
  assert mobile['width']>=370 and mobile['width']<=410,mobile
  assert mobile['pageWidth']<=mobile['width']+4,mobile
  assert mobile['tools']==7 and mobile['current']=='utilities',mobile
  driver.save_screenshot(str(OUT/"mobile.png"))
  critical=[x['message'] for x in driver.get_log("browser") if x["level"]=="SEVERE" and "Uncaught" in x["message"]]
  assert not critical,critical
  print(json.dumps({"tools":7,"sha256":"passed","json":"passed","csv":"passed","diff":"passed","base64":"passed","mobile":mobile,"criticalErrors":critical},ensure_ascii=False))
 finally:driver.quit();server.shutdown()
