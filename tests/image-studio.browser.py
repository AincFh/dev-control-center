"""Real Chromium image-editor QA: local PNG pixels, transforms, encoders and mobile UI."""
import pathlib,socketserver,threading,time,struct,zlib,json
from http.server import SimpleHTTPRequestHandler
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.webdriver import WebDriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import Select
ROOT=pathlib.Path(__file__).resolve().parents[1]
OUT=ROOT/"test-artifacts"/"image-studio";OUT.mkdir(parents=True,exist_ok=True)
class Server(SimpleHTTPRequestHandler):
 def __init__(self,*a,**kw):super().__init__(*a,directory=str(ROOT),**kw)
 def log_message(self,*a):pass
def until(fn,tries=100):
 for _ in range(tries):
  try:
   result=fn()
   if result:return result
  except Exception:pass
  time.sleep(.15)
 raise AssertionError("Timed out waiting for Image Studio result")
def chunk(tag,body):
 return struct.pack(">I",len(body))+tag+body+struct.pack(">I",zlib.crc32(tag+body)&0xffffffff)
def png_image():
 raw=b"\x00"+b"\xff\x00\x00"*4+b"\x00"+b"\x00\x00\xff"*4
 return b"\x89PNG\r\n\x1a\n"+chunk(b'IHDR',struct.pack(">IIBBBBB",4,2,8,2,0,0,0))+chunk(b'IDAT',zlib.compress(raw))+chunk(b'IEND',b'')
test_image=OUT/"test.png";test_image.write_bytes(png_image())
with socketserver.TCPServer(("127.0.0.1",0),Server) as server:
 threading.Thread(target=server.serve_forever,daemon=True).start()
 options=Options()
 for arg in ("--headless=new","--no-sandbox","--disable-dev-shm-usage","--window-size=1440,900"):options.add_argument(arg)
 options.add_experimental_option("prefs",{"download.default_directory":str(OUT),"download.prompt_for_download":False})
 options.set_capability("goog:loggingPrefs",{"browser":"ALL"})
 driver=webdriver.Chrome(options=options)
 try:
  driver.get(f"http://127.0.0.1:{server.server_address[1]}/#image-studio")
  until(lambda:driver.execute_script("return document.querySelector('.view.is-active')?.id==='image-studio'"))
  assert not driver.find_element(By.ID,"imageProcess").is_enabled()
  driver.find_element(By.ID,"imageFile").send_keys(str(test_image))
  until(lambda:driver.find_element(By.ID,"imageProcess").is_enabled())
  assert "4 × 2" in driver.find_element(By.ID,"imageSourceInfo").text
  # Real resize with aspect ratio, then 90-degree rotation swaps target dimensions.
  width=driver.find_element(By.ID,"imageWidth");width.clear();width.send_keys("8")
  until(lambda:driver.find_element(By.ID,"imageHeight").get_attribute("value")=="4")
  Select(driver.find_element(By.ID,"imageRotation")).select_by_value("90")
  assert driver.find_element(By.ID,"imageWidth").get_attribute("value")=="4"
  assert driver.find_element(By.ID,"imageHeight").get_attribute("value")=="8"
  driver.find_element(By.ID,"imageGray").click()
  driver.find_element(By.ID,"imageProcess").click()
  until(lambda:driver.find_element(By.ID,"imageDownload").is_enabled())
  dimensions=driver.execute_script("""const c=document.getElementById('imageProcessedCanvas');return {w:c.width,h:c.height,hidden:c.hidden};""")
  assert dimensions=={"w":4,"h":8,"hidden":False},dimensions
  pixels=driver.execute_script("""const c=document.getElementById('imageProcessedCanvas');return [...c.getContext('2d').getImageData(1,1,1,1).data];""")
  assert pixels[3]>0 and abs(pixels[0]-pixels[1])<=2 and abs(pixels[1]-pixels[2])<=2,pixels
  driver.find_element(By.ID,"imageDownload").click()
  png=OUT/"test-atlas-4x8.png";until(lambda:png.exists() and png.stat().st_size>50)
  header=png.read_bytes()
  assert header[:8]==b"\x89PNG\r\n\x1a\n"
  assert struct.unpack(">II",header[16:24])==(4,8)
  driver.save_screenshot(str(OUT/"01-image-editor-desktop.png"))
  Select(driver.find_element(By.ID,"imageFormat")).select_by_value("jpeg")
  assert driver.find_element(By.ID,"imageQuality").is_enabled()
  driver.find_element(By.ID,"imageProcess").click()
  until(lambda:driver.find_element(By.ID,"imageDownload").is_enabled())
  driver.find_element(By.ID,"imageDownload").click()
  jpg=OUT/"test-atlas-4x8.jpeg";until(lambda:jpg.exists() and jpg.stat().st_size>50)
  assert jpg.read_bytes()[:2]==b"\xff\xd8"
  Select(driver.find_element(By.ID,"imageFormat")).select_by_value("webp")
  driver.find_element(By.ID,"imageProcess").click()
  until(lambda:driver.find_element(By.ID,"imageDownload").is_enabled())
  driver.find_element(By.ID,"imageDownload").click()
  webp=OUT/"test-atlas-4x8.webp";until(lambda:webp.exists() and webp.stat().st_size>50)
  assert webp.read_bytes()[:4]==b"RIFF" and webp.read_bytes()[8:12]==b"WEBP"
  # Browser width and scroll checks, not a static CSS-only assertion.
  driver.set_window_size(390,844);time.sleep(.3)
  mobile=driver.execute_script("""return{
   width:innerWidth,documentWidth:document.documentElement.scrollWidth,
   route:document.querySelector('.view.is-active')?.id,
   preview:document.getElementById('imageProcessedCanvas').getBoundingClientRect().width
  }""")
  assert 380<=mobile["width"]<=410,mobile
  assert mobile["documentWidth"]<=mobile["width"]+4,mobile
  assert mobile["route"]=="image-studio",mobile
  driver.save_screenshot(str(OUT/"02-image-editor-mobile.png"))
  driver.find_element(By.ID,"imageReset").click()
  assert not driver.find_element(By.ID,"imageProcess").is_enabled()
  assert not driver.find_element(By.ID,"imageDownload").is_enabled()
  severe=[x["message"] for x in driver.get_log("browser") if x["level"]=="SEVERE" and "Uncaught" in x["message"]]
  assert not severe,severe
  print(json.dumps({"realImage":"PNG 4x2","transforms":"resize 4x8, 90°, grayscale","output":["PNG","JPEG","WebP"],"mobile":mobile,"uncaught":severe},ensure_ascii=False))
 finally:driver.quit();server.shutdown()
