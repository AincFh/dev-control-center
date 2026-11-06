"""ATLAS real Chromium QA: 42-domain research -> editable, durable execution tasks."""
from __future__ import annotations
import pathlib
import socketserver
import threading
import time
from http.server import SimpleHTTPRequestHandler

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import Select

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / "test-artifacts" / "blueprint-execution"
OUT.mkdir(parents=True, exist_ok=True)

class Server(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)
    def log_message(self, *args):
        pass

def until(fn, attempts=90):
    for _ in range(attempts):
        try:
            value = fn()
            if value:
                return value
        except Exception:
            pass
        time.sleep(0.2)
    raise AssertionError("ATLAS blueprint execution browser step did not complete")

with socketserver.TCPServer(("127.0.0.1", 0), Server) as server:
    threading.Thread(target=server.serve_forever, daemon=True).start()
    base = f"http://127.0.0.1:{server.server_address[1]}/"
    opts = Options()
    for arg in ("--headless=new", "--no-sandbox", "--disable-dev-shm-usage",
                "--window-size=1440,900"):
        opts.add_argument(arg)
    driver = webdriver.Chrome(options=opts)
    driver.set_page_load_timeout(45)
    try:
        driver.get(base + "#universe")
        until(lambda: len(driver.find_elements(By.CSS_SELECTOR, "#sectorLabCategory option")) >= 42)
        Select(driver.find_element(By.ID, "sectorLabCategory")).select_by_value("database")
        upstream = driver.find_element(By.ID, "sectorLabRepo")
        upstream.clear()
        upstream.send_keys("sqlite/sqlite")
        driver.find_element(By.ID, "sectorLabGenerate").click()
        assert len(driver.find_elements(By.CSS_SELECTOR, "#sectorLabResult .sector-lab-phase")) == 5
        assert driver.find_element(By.ID, "sectorLabSchedule").is_enabled()
        Select(driver.find_element(By.ID, "sectorLabTarget")).select_by_value("dev-control-center")
        driver.find_element(By.ID, "sectorLabSchedule").click()

        until(lambda: driver.current_url.endswith("#workboard"))
        until(lambda: driver.find_element(By.ID, "workTotal").text == "5")
        assert len(driver.find_elements(By.CSS_SELECTOR, "#workBoard .work-card")) == 5
        assert driver.find_element(By.ID, "workBlocked").text == "4"
        first = driver.find_element(By.CSS_SELECTOR, "#workBoard .work-card")
        task_id = first.get_attribute("data-work-id")
        assert task_id.startswith("bp_"), task_id
        first.find_element(By.CSS_SELECTOR, ".work-card-actions button").click()
        until(lambda: driver.find_element(By.ID, "workEditor").get_attribute("open") is not None)
        owner = driver.find_element(By.ID, "workEditOwner")
        owner.send_keys("ATLAS QA")
        effort = driver.find_element(By.ID, "workEditEffort")
        effort.clear()
        effort.send_keys("7")
        driver.find_element(By.CSS_SELECTOR, "#workEditForm .work-submit").click()
        until(lambda: driver.find_element(By.ID, "workEditor").get_attribute("open") is None)

        driver.execute_script("location.hash='#universe'")
        until(lambda: driver.find_element(By.ID, "universeSectorLab").is_displayed())
        driver.find_element(By.ID, "sectorLabSchedule").click()
        until(lambda: driver.current_url.endswith("#workboard"))
        until(lambda: driver.find_element(By.ID, "workTotal").text == "5")
        assert len(driver.find_elements(By.CSS_SELECTOR, "#workBoard .work-card")) == 5, "duplicate import occurred"
        same = driver.find_element(By.CSS_SELECTOR, '[data-work-id="' + task_id + '"]')
        same.find_element(By.CSS_SELECTOR, ".work-card-actions button").click()
        until(lambda: driver.find_element(By.ID, "workEditor").get_attribute("open") is not None)
        assert driver.find_element(By.ID, "workEditOwner").get_attribute("value") == "ATLAS QA"
        assert driver.find_element(By.ID, "workEditEffort").get_attribute("value") == "7"
        driver.find_element(By.ID, "workEditorClose").click()

        driver.execute_script("location.hash='#universe'")
        until(lambda: driver.find_element(By.ID, "universeSectorLab").is_displayed())
        upstream.clear()
        Select(driver.find_element(By.ID, "sectorLabCategory")).select_by_value("mobile")
        upstream.clear()
        driver.find_element(By.ID, "sectorLabGenerate").click()
        driver.find_element(By.ID, "sectorLabSchedule").click()
        until(lambda: driver.current_url.endswith("#workboard"))
        until(lambda: driver.find_element(By.ID, "workTotal").text == "10")
        driver.save_screenshot(str(OUT / "01-blueprint-workboard-desktop.png"))

        driver.refresh()
        until(lambda: driver.find_element(By.ID, "workTotal").text == "10")
        assert len(driver.find_elements(By.CSS_SELECTOR, "#workBoard .work-card")) == 10
        driver.set_window_size(390, 844)
        driver.execute_script("location.hash='#universe'")
        until(lambda: driver.find_element(By.ID, "universeSectorLab").is_displayed())
        width = driver.execute_script("""const r=document.querySelector('.sector-lab-execution').getBoundingClientRect();
          return {w:r.width,right:r.right,vw:window.innerWidth};""")
        assert width["w"] > 250 and width["right"] <= width["vw"] + 2, width
        assert driver.find_element(By.ID, "sectorLabSchedule").is_displayed()
        driver.save_screenshot(str(OUT / "02-blueprint-mobile.png"))
        print("ATLAS real blueprint execution browser QA passed: 5 phase tasks, dependency blocking, manual edits, duplicate safety, persistent restore, cross-domain import, mobile layout.")
    finally:
        driver.quit()
