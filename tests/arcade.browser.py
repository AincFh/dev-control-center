"""ATLAS arcade end-to-end test: real Chromium, clickable filters, favorites,
verified play links and mobile layout. No mocking of game cards."""
import json
import pathlib
import socketserver
import threading
import time
from http.server import SimpleHTTPRequestHandler
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By

ROOT=pathlib.Path(__file__).resolve().parents[1]
OUT=ROOT/"test-artifacts"/"arcade"
OUT.mkdir(parents=True,exist_ok=True)

class Handler(SimpleHTTPRequestHandler):
    def __init__(self,*a,**kw):super().__init__(*a,directory=str(ROOT),**kw)
    def log_message(self,*a):pass

with socketserver.TCPServer(("127.0.0.1",0),Handler) as server:
    threading.Thread(target=server.serve_forever,daemon=True).start()
    options=Options()
    options.add_argument("--headless=new")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--window-size=1440,900")
    options.page_load_strategy="eager"
    options.add_experimental_option("prefs",{"profile.managed_default_content_settings.images":2})
    options.set_capability("goog:loggingPrefs",{"browser":"ALL"})
    driver=webdriver.Chrome(options=options)
    driver.set_page_load_timeout(45)
    try:
        driver.get(f"http://127.0.0.1:{server.server_address[1]}/")
        driver.execute_script("document.querySelector('#arcade').scrollIntoView()")
        for _ in range(35):
            if len(driver.find_elements(By.CSS_SELECTOR,"#arcadeGrid .arcade-card"))>=10:break
            time.sleep(.35)
        cards=driver.find_elements(By.CSS_SELECTOR,"#arcadeGrid .arcade-card")
        assert len(cards)==10, f"Arcade cards missing: {len(cards)}"
        live=driver.find_elements(By.CSS_SELECTOR,"#arcadeGrid a.arcade-play")
        assert len(live)==6, f"Incorrect playable count: {len(live)}"
        assert len(driver.find_elements(By.CSS_SELECTOR,"[data-game='qube'] a.arcade-play"))==0
        driver.save_screenshot(str(OUT/"01-arcade-desktop.png"))
        search=driver.find_element(By.ID,"arcadeSearch")
        search.send_keys("餐馆")
        assert len(driver.find_elements(By.CSS_SELECTOR,"#arcadeGrid .arcade-card"))==1
        assert driver.find_element(By.CSS_SELECTOR,"#arcadeGrid .arcade-card").get_attribute("data-game")=="bistro"
        search.clear()
        driver.execute_script("arguments[0].dispatchEvent(new Event('input',{bubbles:true}))",search)
        driver.find_element(By.ID,"arcadePlayable").click()
        count=len(driver.find_elements(By.CSS_SELECTOR,"#arcadeGrid .arcade-card"))
        assert count==6, f"Playable filter expected 6, got {count}; search={search.get_attribute('value')!r}"
        driver.find_element(By.ID,"arcadePlayable").click()
        driver.find_element(By.CSS_SELECTOR,"#arcadeGenres button[data-genre='life']").click()
        assert len(driver.find_elements(By.CSS_SELECTOR,"#arcadeGrid .arcade-card"))>=2
        driver.find_element(By.CSS_SELECTOR,"#arcadeGenres button[data-genre='all']").click()
        fav=driver.find_element(By.CSS_SELECTOR,"[data-game='paradise'] .arcade-favorite")
        fav.click()
        # Favorites re-render the entire card grid; requery the new DOM node.
        fav=driver.find_element(By.CSS_SELECTOR,"[data-game='paradise'] .arcade-favorite")
        assert fav.get_attribute("aria-pressed")=="true"
        driver.refresh()
        time.sleep(.8)
        assert driver.find_element(By.CSS_SELECTOR,"[data-game='paradise'] .arcade-favorite").get_attribute("aria-pressed")=="true"
        driver.set_window_size(390,844)
        time.sleep(.6)
        driver.execute_script("document.querySelector('#arcade').scrollIntoView()")
        mobile=driver.execute_script("""return {
          width: innerWidth,
          scrollWidth: document.documentElement.scrollWidth,
          cards: document.querySelectorAll('#arcadeGrid .arcade-card').length,
          columns: getComputedStyle(document.getElementById('arcadeGrid')).gridTemplateColumns,
          links: document.querySelectorAll('#arcadeGrid .arcade-play').length
        }""")
        assert mobile["cards"]==10,mobile
        assert mobile["scrollWidth"]<=mobile["width"]+4,mobile
        driver.save_screenshot(str(OUT/"02-arcade-mobile.png"))
        severe=[x["message"] for x in driver.get_log("browser") if x["level"]=="SEVERE" and "favicon" not in x["message"]]
        # External image/CDN/API access is best-effort; app code must still load locally.
        # Local development intentionally lacks the generated GitHub status
        # snapshot: data/status.json is created by the deployment job.
        # Its 404 is a supported offline fallback, not an arcade app error.
        local_errors=[x for x in severe
                      if ("127.0.0.1" in x and (".js" in x or "Uncaught" in x)
                          and "/data/status.json" not in x)]
        assert not local_errors,local_errors
        report={"cards":len(cards),"playable":len(live),"mobile":mobile,
                "favorites_persisted":True,"severe_console":severe[:12]}
        (OUT/"report.json").write_text(json.dumps(report,ensure_ascii=False,indent=2))
        print(json.dumps(report,ensure_ascii=False,indent=2))
    finally:
        driver.quit()
        server.shutdown()
