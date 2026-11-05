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
from selenium.webdriver.common.keys import Keys
from selenium.common.exceptions import ElementClickInterceptedException, StaleElementReferenceException

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
    def click_visible(selector):
        # Use actual Selenium pointer clicks; do not bypass app event handlers
        # with injected HTMLElement.click(). Re-center below the fixed HUD,
        # allowing the card/filter layout and scrolling to settle.
        last_error=None
        for attempt in range(4):
            target=driver.find_element(By.CSS_SELECTOR,selector)
            driver.execute_script(
                "arguments[0].scrollIntoView({behavior:'instant',block:'center',inline:'nearest'})",
                target
            )
            time.sleep(.18 + attempt*.08)
            try:
                driver.find_element(By.CSS_SELECTOR,selector).click()
                return
            except (ElementClickInterceptedException,StaleElementReferenceException) as error:
                last_error=error
        raise last_error
    try:
        driver.get(f"http://127.0.0.1:{server.server_address[1]}/#arcade")
        for _ in range(30):
            if driver.execute_script("return document.getElementById('arcade').classList.contains('is-active')"):break
            time.sleep(.1)
        assert driver.execute_script("return document.getElementById('arcade').classList.contains('is-active')")
        assert driver.execute_script("return getComputedStyle(document.getElementById('home')).display")=="none"
        for _ in range(35):
            if len(driver.find_elements(By.CSS_SELECTOR,"#arcadeGrid .arcade-card"))>=11:break
            time.sleep(.35)
        cards=driver.find_elements(By.CSS_SELECTOR,"#arcadeGrid .arcade-card")
        assert len(cards)==11, f"Arcade cards missing: {len(cards)}"
        live=driver.find_elements(By.CSS_SELECTOR,"#arcadeGrid a.arcade-play")
        assert len(live)==10, f"Incorrect playable count: {len(live)}"
        assert len(driver.find_elements(By.CSS_SELECTOR,"[data-game='qube'] a.arcade-play"))==1
        assert len(driver.find_elements(By.CSS_SELECTOR,"[data-game='spacefortress'] a.arcade-play"))==1
        assert len(driver.find_elements(By.CSS_SELECTOR,"[data-game='citylife'] a.arcade-play"))==1
        # Browser QA is independent of CI and Pages readiness; missing real
        # nightly evidence never gets painted green in the arcade.
        # Data is real evidence from the checked-in last QA run, not a fixed
        # fabricated fixture. Future scheduled Chromium runs may change counts.
        assert len(driver.find_elements(By.CSS_SELECTOR,"#gameQACards .game-qa-tile"))==7
        # Game QA evidence loads asynchronously and may arrive after the
        # arcade cards; do not assert the initial dashboard placeholders.
        for _ in range(55):
            qa_counts=[int(driver.find_element(By.ID,part).text or 0) for part in
                       ("gameQAPassed","gameQAFailed","gameQAUnknown")]
            if sum(qa_counts)==7:break
            time.sleep(.2)
        assert sum(qa_counts)==7,qa_counts
        assert driver.find_element(By.ID,"gameQAStamp").text
        driver.save_screenshot(str(OUT/"01-arcade-desktop.png"))
        search=driver.find_element(By.ID,"arcadeSearch")
        search.send_keys("餐馆")
        assert len(driver.find_elements(By.CSS_SELECTOR,"#arcadeGrid .arcade-card"))==1
        assert driver.find_element(By.CSS_SELECTOR,"#arcadeGrid .arcade-card").get_attribute("data-game")=="bistro"
        search.clear()
        driver.execute_script("arguments[0].dispatchEvent(new Event('input',{bubbles:true}))",search)
        click_visible("#arcadePlayable")
        count=len(driver.find_elements(By.CSS_SELECTOR,"#arcadeGrid .arcade-card"))
        assert count==10, f"Playable filter expected 10, got {count}; search={search.get_attribute('value')!r}"
        click_visible("#arcadePlayable")
        click_visible("#arcadeGenres button[data-genre='life']")
        assert len(driver.find_elements(By.CSS_SELECTOR,"#arcadeGrid .arcade-card"))>=2
        click_visible("#arcadeGenres button[data-genre='all']")
        fav=driver.find_element(By.CSS_SELECTOR,"[data-game='paradise'] .arcade-favorite")
        click_visible("[data-game='paradise'] .arcade-favorite")
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
        assert mobile["cards"]==11,mobile
        assert mobile["scrollWidth"]<=mobile["width"]+4,mobile
        driver.save_screenshot(str(OUT/"02-arcade-mobile.png"))
        # Focused route switching, persisted light/dark theme, and command search.
        driver.execute_script("location.hash='#home'")
        time.sleep(.4)
        assert driver.execute_script("return document.getElementById('home').classList.contains('is-active')")
        assert driver.execute_script("return getComputedStyle(document.getElementById('arcade')).display")=="none"
        driver.find_element(By.ID,"themeBtn").click()
        before_theme=driver.execute_script("return document.documentElement.dataset.theme")
        assert before_theme in ("dark","light")
        driver.refresh()
        time.sleep(.6)
        assert driver.execute_script("return document.documentElement.dataset.theme")==before_theme
        driver.find_element(By.ID,"quickFind").click()
        time.sleep(.3)
        assert driver.execute_script("return document.getElementById('commandDialog').open")
        command=driver.find_element(By.ID,'commandInput')
        command.send_keys('全部仓库')
        command.send_keys(Keys.ENTER)
        time.sleep(.3)
        assert driver.execute_script("return location.hash")=="#projects"
        assert driver.execute_script("return document.getElementById('projects').classList.contains('is-active')")
        driver.execute_script("location.hash='#arcade'")
        time.sleep(.35)
        assert driver.execute_script("return document.getElementById('arcade').classList.contains('is-active')")
        assert driver.execute_script("return document.documentElement.scrollWidth<=innerWidth+4")
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
