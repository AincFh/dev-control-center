"""ATLAS: actual Chromium acceptance against PUBLIC deployed games.
Four independent browser profiles; real gameplay buttons and persistence.
No monkeypatching fetch, injecting success, or altering player accounts.
All scenario outcomes (including failures) are written to public JSON evidence.
"""
import argparse
import datetime as dt
import json
import os
import pathlib
import re
import time
from selenium import webdriver
from selenium.common.exceptions import TimeoutException
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait

ROOT=pathlib.Path(__file__).resolve().parents[1]
SITES={
 "bistro":("cozy-bistro-sim","https://aincfh.github.io/cozy-bistro-sim/"),
 "paradise":("paradise-isle","https://aincfh.github.io/paradise-isle/"),
 "wildlands":("wildlands-anglerfishing-world-3d","https://aincfh.github.io/wildlands-anglerfishing-world-3d/next/"),
 "fishing":("fishing-world-3d","https://aincfh.github.io/fishing-world-3d/"),
 "factory":("Midnight-Factory","https://aincfh.github.io/Midnight-Factory/"),
 "citylife":("City-of-Small-Chances","https://aincfh.github.io/City-of-Small-Chances/"),
 "mori":("Tamagochi---Open-Source-Game","https://aincfh.github.io/Tamagochi---Open-Source-Game/"),
}
LABELS={
 "bootstrap":"真实页面启动",
 "interaction":"核心操作触发实际状态变化",
 "save":"页面刷新后真实存档可恢复",
 "webgl":"WebGL 游戏世界已加载",
 "mobile":"390px 手机视口没有水平溢出",
 "console":"没有未捕获的第一方脚本错误"
}
def utcnow():
 return dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds").replace("+00:00","Z")
def mark(record,id,label,fn):
 start=time.monotonic()
 try:
  detail=fn()
  assert detail is not False, label+" returned false"
  record["checks"].append({"id":id,"label":label,"status":"pass","reason":""})
  return detail
 except Exception as error:
  status="timeout" if isinstance(error,TimeoutException) else "fail"
  reason=(type(error).__name__+": "+str(error)).split("\n")[0][:220]
  record["checks"].append({"id":id,"label":label,"status":status,"reason":reason})
  raise
def wait_for(driver,js,timeout=28):
 return WebDriverWait(driver,timeout,poll_frequency=.28).until(lambda d:d.execute_script(js))
def assert_mobile(driver):
 driver.set_window_size(390,844)
 time.sleep(.5)
 m=driver.execute_script("""return {
  width: innerWidth, document:document.documentElement.scrollWidth,
  viewport:document.documentElement.clientWidth
 }""")
 assert m["document"]<=m["width"]+5,m
 return m
def assert_console(driver):
 severe=[x["message"] for x in driver.get_log("browser") if x["level"]=="SEVERE"]
 own=[m for m in severe if
  ("Uncaught" in m or "ReferenceError" in m or "TypeError" in m or
  ("aincfh.github.io" in m and ".js" in m and ("404" in m or "Failed to load" in m)))
 ]
 assert not own,own[:3]
 return len(severe)
def run_bistro(driver,check):
 wait_for(driver,"return !!window.COZY_BISTRO")
 def start():
  driver.find_element(By.ID,"enterBtn").click()
  before=driver.execute_script("return window.COZY_BISTRO.test.getRaw().phase")
  driver.find_element(By.ID,"primaryAction").click()
  after=driver.execute_script("return window.COZY_BISTRO.test.getRaw().phase")
  assert before!=after and after=="open",(before,after)
  return after
 check("interaction","真实点击开店并进入营业状态",start)
 def order():
  driver.execute_script("window.COZY_BISTRO.test.step(10)")
  status=driver.execute_script("""return (()=>{const s=window.COZY_BISTRO.test.getRaw();
   return {phase:s.phase,orders:s.orders.length,money:s.money}})()""")
  assert status["phase"]=="open" and status["orders"]>=1,status
  return status
 check("bootstrap","实机浏览器内订单引擎推进并生成订单",order)
 def persist():
  driver.refresh()
  wait_for(driver,"return !!window.COZY_BISTRO")
  driver.find_element(By.ID,"enterBtn").click()
  phase=driver.execute_script("return window.COZY_BISTRO.test.getRaw().phase")
  assert phase=="open",phase
  return phase
 check("save","浏览器刷新后餐馆营业状态恢复",persist)
 check("mobile",LABELS["mobile"],lambda:assert_mobile(driver))
def run_paradise(driver,check):
 def new_slot():
  WebDriverWait(driver,36).until(lambda d:d.find_elements(By.CSS_SELECTOR,".slot-card.empty .slot-main"))
  driver.find_element(By.CSS_SELECTOR,".slot-card.empty .slot-main").click()
  WebDriverWait(driver,16).until(lambda d:d.find_elements(By.CSS_SELECTOR,".dialog-input"))
  driver.find_element(By.CSS_SELECTOR,".dialog-input").send_keys("ATLAS QA")
  driver.find_element(By.CSS_SELECTOR,".dialog-box .btn-primary").click()
  wait_for(driver,"return !!window.__PI__",36)
  return driver.execute_script("return window.__PI__.state().player.coins")
 check("bootstrap","真实创建独立岛屿存档并进入世界",new_slot)
 def interactive():
  driver.find_element(By.CSS_SELECTOR,'[data-panel="inventory"]').click()
  WebDriverWait(driver,16).until(lambda d:d.find_elements(By.CSS_SELECTOR,".panel-header .btn-close"))
  assert driver.execute_script("return !!window.__PI__.state().player"),"No player entity"
  return True
 check("interaction","实际打开背包并读取玩家状态",interactive)
 def persist():
  driver.execute_script("window.__PI__.app.save()")
  driver.refresh()
  WebDriverWait(driver,34).until(lambda d:d.find_elements(By.CSS_SELECTOR,".slot-card:not(.empty) .slot-main"))
  driver.find_element(By.CSS_SELECTOR,".slot-card:not(.empty) .slot-main").click()
  wait_for(driver,"return !!window.__PI__",30)
  assert driver.execute_script("return !!window.__PI__.state().player"),"Missing restored player"
  return True
 check("save","实际保存、刷新并恢复已创建岛屿",persist)
 def mobile():
  driver.execute_script("document.querySelector('.dialog-box .btn-primary')?.click()")
  return assert_mobile(driver)
 check("mobile",LABELS["mobile"],mobile)
def run_wildlands(driver,check):
 def boot():
  wait_for(driver,"return !!window.__wildlandsNext && window.__wildlandsNext.getState().renderer==='webgl'",85)
  state=driver.execute_script("return window.__wildlandsNext.getState()")
  assert state["fishSchools"]["population"]>0 and state["treeCount"]>100,state
  return state["treeCount"]
 check("webgl","真实 Three.js WebGL 湖泊与鱼群启动",boot)
 def enter_and_cast():
  driver.find_element(By.ID,"play").click()
  wait_for(driver,"return window.__wildlandsNext.getState().started===true",15)
  cast=driver.find_element(By.ID,"cast")
  ActionChains(driver).move_to_element(cast).click_and_hold().pause(.85).release().perform()
  state=driver.execute_script("return window.__wildlandsNext.getState().phase")
  if state=="flying":driver.execute_script("window.__wildlandsNext.angler.update(1.0)")
  state=driver.execute_script("return window.__wildlandsNext.getState().phase")
  assert state in ("flying","waiting","bite","fighting"),"Cast failed: "+str(state)
  return state
 check("interaction","真实按住并松开钓竿按钮完成抛投",enter_and_cast)
 check("mobile",LABELS["mobile"],lambda:assert_mobile(driver))
def run_fishing(driver,check):
 def boot():
  wait_for(driver,"return !!window.__fishingWorldReady",45)
  assert driver.find_element(By.ID,"start").is_enabled()
  driver.find_element(By.ID,"start").click()
  assert driver.execute_script("return !document.getElementById('game').hidden")
  return True
 check("webgl","实机 WebGL 世界启动及真实开始按钮",boot)
 def cast():
  driver.find_element(By.ID,"cast").click()
  phase=driver.find_element(By.ID,"phaseLabel").text
  assert phase in ("抛投中","等待鱼讯","有鱼咬钩！"),phase
  return phase
 check("interaction","真实点击抛竿令钓鱼阶段变化",cast)
 check("mobile",LABELS["mobile"],lambda:assert_mobile(driver))
def run_factory(driver,check):
 def guide():
  WebDriverWait(driver,24).until(lambda d:d.find_elements(By.ID,"factory"))
  # First-time users may already have the guide open. Toggling blindly
  # would CLOSE it and make Selenium's visible .text empty.
  panel=driver.find_element(By.ID,"guide-panel")
  if panel.get_attribute("hidden") is not None:
   driver.find_element(By.ID,"guide-toggle").click()
  title=WebDriverWait(driver,12).until(lambda d:d.find_element(By.ID,"step-title").text)
  driver.find_element(By.ID,"locale").click()
  translated=driver.find_element(By.ID,"step-title").text
  assert title and translated and title!=translated,(title,translated)
  driver.find_element(By.ID,"guide-close").click()
  return True
 check("interaction","实际打开新手引导并切换中英文",guide)
 def scene():
  driver.switch_to.frame(driver.find_element(By.ID,"factory"))
  def ready(d):
   return d.execute_script("""return (() => ({
    money:document.querySelector('#money-val')?.textContent||'',
    buttons:document.querySelectorAll('#build-panel button.build-btn').length,
    canvas:document.querySelector('#game-canvas')?.width||0
   }))()""")
  def detected(d):
   x=ready(d)
   return x if x["buttons"]>=15 and x["canvas"]>500 and x["money"] not in ("","0") else False
  state=WebDriverWait(driver,34).until(detected)
  return state
 check("bootstrap","真实工厂 Canvas、资金与建造菜单启动",scene)
 def mine():
  button=driver.find_element(By.CSS_SELECTOR,'#build-panel button[data-id="mine"]')
  button.click()
  assert "active" in driver.find_element(By.CSS_SELECTOR,'#build-panel button[data-id="mine"]').get_attribute("class")
  driver.find_element(By.CSS_SELECTOR,'#build-panel button[data-id="mine"]').click()
  assert "active" not in driver.find_element(By.CSS_SELECTOR,'#build-panel button[data-id="mine"]').get_attribute("class")
  return True
 check("build","实际选择并取消矿机建造工具",mine)
 def mobile():
  driver.switch_to.default_content()
  return assert_mobile(driver)
 check("mobile",LABELS["mobile"],mobile)
def run_citylife(driver,check):
 def world():
  state=wait_for(driver,"return window.__game && document.querySelector('#game')?.getBoundingClientRect().width>400 && !!document.querySelector('#clock')?.textContent",45)
  assert state,"World is not ready"
  return True
 check("webgl","真实 3D 城市、HUD 与时间系统启动",world)
 def walk():
  before=driver.execute_script("return [window.__game.player.root.position.x,window.__game.player.root.position.z]")
  ActionChains(driver).key_down("w").pause(1.0).key_up("w").perform()
  time.sleep(.25)
  after=driver.execute_script("return [window.__game.player.root.position.x,window.__game.player.root.position.z]")
  movement=sum(abs(a-b) for a,b in zip(after,before))
  assert movement>.025,{"before":before,"after":after,"distance":movement}
  return movement
 check("interaction","键盘真实行走导致玩家世界坐标改变",walk)
 def mobile_walk():
  width=assert_mobile(driver)
  before=driver.execute_script("return [window.__game.player.root.position.x,window.__game.player.root.position.z]")
  forward=driver.find_element(By.CSS_SELECTOR,"[data-touch-dir='up']")
  ActionChains(driver).move_to_element(forward).click_and_hold().pause(.95).release().perform()
  time.sleep(.3)
  after=driver.execute_script("return [window.__game.player.root.position.x,window.__game.player.root.position.z]")
  movement=sum(abs(a-b) for a,b in zip(after,before))
  assert movement>.025,{"before":before,"after":after,"movement":movement}
  assert not driver.execute_script("return window.__game.input.touchKeys.has('up')")
  return width
 check("mobile","390px 触屏按键确实使角色移动并松开",mobile_walk)
def run_mori(driver,check):
 def boot():
  WebDriverWait(driver,35).until(lambda d:d.find_elements(By.CSS_SELECTOR,'button[aria-label="Feed"]'))
  tour=driver.find_elements(By.CSS_SELECTOR,'.tutorial-skip')
  if tour:tour[0].click()
  WebDriverWait(driver,15).until(lambda d:not d.find_elements(By.CSS_SELECTOR,'.tutorial-overlay'))
  assert driver.find_elements(By.CSS_SELECTOR,'button[aria-label="Feed"]')
  return True
 check("bootstrap","真实 React 宠物界面启动并完成首次引导",boot)
 def first_story():
  # The real first-run pet opens a narrative choice overlay after the tour.
  # Dismiss it via its accessible Close story button before attempting care.
  time.sleep(.3)
  dialogs=driver.find_elements(By.CSS_SELECTOR,'.story-overlay')
  if dialogs:
   assert driver.find_element(By.CSS_SELECTOR,'.story-dialog #story-title').text
   driver.find_element(By.CSS_SELECTOR,'button[aria-label="Close story"]').click()
   WebDriverWait(driver,12).until(lambda d:not d.find_elements(By.CSS_SELECTOR,'.story-overlay'))
  return True
 check("story","正常完成真实首次剧情弹层，不绕过界面",first_story)
 def care():
  before=driver.execute_script("""return JSON.parse(localStorage.getItem('pocket-worlds-save-v1')||'{}').state?.actionNonce??0""")
  driver.find_elements(By.CSS_SELECTOR,'button[aria-label="Feed"]')[0].click()
  WebDriverWait(driver,12).until(lambda d:d.execute_script("""return (JSON.parse(localStorage.getItem('pocket-worlds-save-v1')||'{}').state?.actionNonce??0)>arguments[0]""",before))
  after=driver.execute_script("""return JSON.parse(localStorage.getItem('pocket-worlds-save-v1')).state.actionNonce""")
  assert after>before
  return after
 check("interaction","实际投喂导致宠物存档行为次数增加",care)
 def persist():
  saved=driver.execute_script("""return JSON.parse(localStorage.getItem('pocket-worlds-save-v1')).state.actionNonce""")
  driver.refresh()
  WebDriverWait(driver,35).until(lambda d:d.find_elements(By.CSS_SELECTOR,'button[aria-label="Feed"]'))
  restored=driver.execute_script("""return JSON.parse(localStorage.getItem('pocket-worlds-save-v1')).state.actionNonce""")
  assert restored>=saved,(saved,restored)
  return restored
 check("save","实际刷新后宠物照料历史持久保存",persist)
 check("mobile",LABELS["mobile"],lambda:assert_mobile(driver))
RUNNERS={"bistro":run_bistro,"paradise":run_paradise,"wildlands":run_wildlands,"fishing":run_fishing,"factory":run_factory,"citylife":run_citylife,"mori":run_mori}
def run_game(id,artifact):
 repo,url=SITES[id]
 record={"id":id,"repo":repo,"status":"unknown","elapsedMs":0,"checks":[],"message":""}
 start=time.monotonic()
 opts=Options()
 for arg in ("--headless=new","--no-sandbox","--disable-dev-shm-usage","--enable-webgl","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader","--window-size=1280,840"):
  opts.add_argument(arg)
 opts.page_load_strategy="eager"
 opts.set_capability("goog:loggingPrefs",{"browser":"ALL"})
 driver=None
 try:
  driver=webdriver.Chrome(options=opts)
  driver.set_page_load_timeout(70)
  driver.get(url)
  def check(name,label,fn):
   return mark(record,name,label,fn)
  RUNNERS[id](driver,check)
  check("console",LABELS["console"],lambda:assert_console(driver))
  record["status"]="pass"
 except Exception as error:
  record["status"]="timeout" if isinstance(error,TimeoutException) else "fail"
  record["message"]=(type(error).__name__+": "+str(error)).split("\n")[0][:350]
  if driver is not None:
   try:driver.save_screenshot(str(artifact/(id+"-failure.png")))
   except Exception:pass
 finally:
  if driver is not None:
   try:driver.quit()
   except Exception:pass
 record["elapsedMs"]=round((time.monotonic()-start)*1000)
 return record

def main():
 ap=argparse.ArgumentParser()
 ap.add_argument("--output",default="data/game-runtime.json")
 ap.add_argument("--only",choices=list(SITES),default=None)
 ap.add_argument("--artifacts",default="test-artifacts/live-games")
 args=ap.parse_args()
 artifact=pathlib.Path(args.artifacts);artifact.mkdir(parents=True,exist_ok=True)
 selected=[args.only] if args.only else list(SITES)
 results=[]
 for id in selected:
  result=run_game(id,artifact)
  results.append(result)
  print(json.dumps({"game":id,"status":result["status"],"checks":len(result["checks"]),"message":result["message"],"timeMs":result["elapsedMs"]},ensure_ascii=False),flush=True)
 output={
  "schemaVersion":1,"owner":"AincFh","generatedAt":utcnow(),
  "runUrl":("https://github.com/AincFh/dev-control-center/actions/runs/"+os.environ["GITHUB_RUN_ID"]) if os.environ.get("GITHUB_RUN_ID") else None,
  "source":"real_chromium_public_games","browser":"Chromium / Selenium / fresh profile per game",
  "results":results,"note":"Real browser interactions on public Pages; not comprehensive gameplay, performance or full product certification."
 }
 out=pathlib.Path(args.output);out.parent.mkdir(parents=True,exist_ok=True)
 out.write_text(json.dumps(output,ensure_ascii=False,indent=2)+"\n",encoding="utf8")
 (artifact/"summary.json").write_text(json.dumps(output,ensure_ascii=False,indent=2)+"\n",encoding="utf8")
 print("Saved",out,"passed",sum(x["status"]=="pass" for x in results),"/",len(results),flush=True)
 # Returning 0 allows the workflow to commit an honest FAIL report. It may mark
 # the job red after publication; no game failure is silently discarded.
if __name__=="__main__":
 main()
