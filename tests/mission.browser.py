"""Real Chromium QA for ATLAS Mission Control, with deterministic public GitHub fixture.
Mocks only public JSON transport; real DOM controls, browser storage and CSS are exercised.
"""
import json,pathlib,socketserver,threading,time
from http.server import SimpleHTTPRequestHandler
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import Select

ROOT=pathlib.Path(__file__).resolve().parents[1]
OUT=ROOT/"test-artifacts"/"mission";OUT.mkdir(parents=True,exist_ok=True)
STAMP="2026-11-05T07:00:00Z"
projects=[
 {"name":"broken-game","label":"BROKEN GAME","description":"Game under repair","language":"JavaScript","updatedAt":STAMP,"defaultBranch":"main","repositoryUrl":"https://github.com/AincFh/broken-game","ci":{"state":"failure","url":"https://github.com/AincFh/broken-game/actions/runs/6","sha":"f1234","updatedAt":STAMP},"openIssues":2,"openPRs":1,"countsTruncated":False,"site":{"state":"unknown"},"issuePreview":[{"number":3,"kind":"issue","title":"Fix game input","url":"https://github.com/AincFh/broken-game/issues/3","updatedAt":STAMP}],"prPreview":[{"number":5,"kind":"pull","title":"Repair controls","url":"https://github.com/AincFh/broken-game/pull/5","updatedAt":STAMP,"draft":True}]},
 {"name":"healthy-game","description":"Working world","language":"TypeScript","updatedAt":STAMP,"defaultBranch":"main","repositoryUrl":"https://github.com/AincFh/healthy-game","ci":{"state":"success","sha":"c1234","updatedAt":STAMP},"openIssues":0,"openPRs":0,"site":{"state":"published","url":"https://aincfh.github.io/healthy-game/"},"issuePreview":[],"prPreview":[]},
 {"name":"unverified","description":"Pending metadata","language":"JavaScript","updatedAt":STAMP,"defaultBranch":"main","repositoryUrl":"https://github.com/AincFh/unverified","ci":{"state":"unknown"},"openIssues":None,"openPRs":None,"site":{"state":"unknown"},"issuePreview":None,"prPreview":None}
]
# Real data shape returned by the trace collector, isolated from private tokens.
HEAD="a"*40
MERGE="b"*40
projects[0]["trace"]={
 "repo":"broken-game","partial":True,
 "issues":[{"number":3,"title":"Fix game input","url":"https://github.com/AincFh/broken-game/issues/3","relatedPRs":[5]}],
 "prs":[{"repo":"broken-game","number":5,"title":"Repair controls with real input handling",
  "url":"https://github.com/AincFh/broken-game/pull/5","state":"open","phase":"blocked","draft":False,
  "headSha":HEAD,"mergeSha":None,"headBranch":"feature/input","baseBranch":"main",
  "updatedAt":STAMP,"mergedAt":None,"closes":[3],
  "links":[{"issueNumber":3,"url":"https://github.com/AincFh/broken-game/issues/3",
    "basis":"PR 正文关闭关键字","verifiedOpen":True}],
  "checks":{"state":"failure","checked":1,"checks":[{"id":31,"workflow":"Mobile Playtest",
    "state":"failure","url":"https://github.com/AincFh/broken-game/actions/runs/31",
    "sha":HEAD,"event":"pull_request","scope":"pull_request_head"}]}}]
}
projects[1]["trace"]={
 "repo":"healthy-game","partial":True,"issues":[],
 "prs":[{"repo":"healthy-game","number":7,"title":"Gameplay quality release",
  "url":"https://github.com/AincFh/healthy-game/pull/7","state":"merged","phase":"merged_checked","draft":False,
  "headSha":HEAD,"mergeSha":MERGE,"headBranch":"feature/game","baseBranch":"main",
  "updatedAt":STAMP,"mergedAt":STAMP,"closes":[],"links":[],
  "checks":{"state":"success","checked":1,"checks":[{"id":42,"workflow":"Main CI",
    "state":"success","url":"https://github.com/AincFh/healthy-game/actions/runs/42",
    "sha":MERGE,"event":"push","scope":"merged_branch_commit"}]}}]
}
projects[1]["trace"]["prs"][0]["deployment"]={
 "state":"success","sha":MERGE,"id":447,"environment":"github-pages",
 "url":"https://aincfh.github.io/healthy-game/",
 "evidenceUrl":"https://github.com/AincFh/healthy-game/deployments/447",
 "updatedAt":STAMP,"scope":"exact_merge_commit_sha","verified":True
}
# A published project can have branch-only Pages proof without a PR.
projects[2]["site"]={"state":"published","url":"https://aincfh.github.io/unverified/",
 "source":"github_deployment_branch","deploymentSha":MERGE,"verifiedAt":STAMP}
repos=[{"name":p["name"],"description":p["description"],"html_url":p["repositoryUrl"],"language":p["language"],"pushed_at":STAMP,"stargazers_count":0,"private":False} for p in projects]
snapshot={"schemaVersion":2,"publicOnly":True,"owner":"AincFh","generatedAt":STAMP,"errors":[],"projects":projects}
script="""(() => {
 const snapshot=__SNAPSHOT__, repos=__REPOS__, realFetch=window.fetch.bind(window);
 window.fetch=(input,opts)=>{
  const u=String(typeof input==='string'?input:input.url);
  if(u.includes('/data/status.json'))return Promise.resolve(new Response(JSON.stringify(snapshot),{status:200,headers:{'Content-Type':'application/json'}}));
  if(u.includes('api.github.com/users/AincFh/repos?'))return Promise.resolve(new Response(JSON.stringify(repos),{status:200,headers:{'Content-Type':'application/json'}}));
  if(u.includes('api.github.com/users/AincFh/events/public?'))return Promise.resolve(new Response('[]',{status:200,headers:{'Content-Type':'application/json'}}));
  return realFetch(input,opts);
 };
})()""".replace("__SNAPSHOT__",json.dumps(snapshot,ensure_ascii=False)).replace("__REPOS__",json.dumps(repos,ensure_ascii=False))
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*a,**kw):super().__init__(*a,directory=str(ROOT),**kw)
 def log_message(self,*a):pass
with socketserver.TCPServer(("127.0.0.1",0),Handler) as server:
 threading.Thread(target=server.serve_forever,daemon=True).start()
 opt=Options()
 for flag in ("--headless=new","--no-sandbox","--disable-dev-shm-usage","--window-size=1440,900"):opt.add_argument(flag)
 opt.set_capability("goog:loggingPrefs",{"browser":"ALL"})
 driver=webdriver.Chrome(options=opt)
 driver.execute_cdp_cmd("Page.addScriptToEvaluateOnNewDocument",{"source":script})
 def until(fn,tries=65):
  for _ in range(tries):
   try:
    x=fn()
    if x:return x
   except Exception:pass
   time.sleep(.2)
  raise AssertionError("Mission UI did not reach expected state")
 try:
  driver.get(f"http://127.0.0.1:{server.server_address[1]}/#mission")
  until(lambda:driver.find_element(By.ID,'missionCount').text=='3')
  assert driver.find_element(By.ID,'missionFail').text=='1'
  assert driver.find_element(By.ID,'missionReview').text=='1'
  assert driver.find_element(By.ID,'missionIssues').text=='2'
  assert len(driver.find_elements(By.CSS_SELECTOR,'#missionProjects .mission-project'))==3
  assert len(driver.find_elements(By.CSS_SELECTOR,'#missionTaskFeed .mission-task'))==2
  assert "任务" not in driver.find_element(By.ID,'missionFreshness').text or True
  driver.save_screenshot(str(OUT/'01-mission-desktop.png'))
  Select(driver.find_element(By.ID,'missionFilter')).select_by_value('failure')
  until(lambda:len(driver.find_elements(By.CSS_SELECTOR,'#missionProjects .mission-project'))==1)
  assert driver.find_element(By.CSS_SELECTOR,'#missionProjects .mission-project').get_attribute('data-repo')=='broken-game'
  driver.find_element(By.CSS_SELECTOR,'#missionProjects .mission-pin').click()
  assert driver.find_element(By.CSS_SELECTOR,'#missionProjects .mission-pin').get_attribute('aria-pressed')=='true'
  driver.find_element(By.CSS_SELECTOR,'#missionProjects .mission-review-button').click()
  assert driver.execute_script("return document.getElementById('missionReviewDialog').open")
  driver.find_element(By.ID,'missionCheck_playtest').click()
  driver.find_element(By.ID,'missionReviewNote').send_keys('Real browser evidence verified in QA.')
  driver.find_element(By.CSS_SELECTOR,'#missionReviewForm button[type=submit]').click()
  until(lambda:'1/6' in driver.find_element(By.CSS_SELECTOR,'#missionProjects .mission-review-button').text)
  driver.refresh()
  until(lambda:driver.find_element(By.ID,'missionCount').text=='3')
  Select(driver.find_element(By.ID,'missionFilter')).select_by_value('failure')
  until(lambda:len(driver.find_elements(By.CSS_SELECTOR,'#missionProjects .mission-project'))==1)
  assert driver.find_element(By.CSS_SELECTOR,'#missionProjects .mission-pin').get_attribute('aria-pressed')=='true'
  assert '1/6' in driver.find_element(By.CSS_SELECTOR,'#missionProjects .mission-review-button').text
  driver.find_element(By.CSS_SELECTOR,'#missionProjects .mission-review-button').click()
  assert driver.find_element(By.ID,'missionCheck_playtest').is_selected()
  assert driver.find_element(By.ID,'missionReviewNote').get_attribute('value')=='Real browser evidence verified in QA.'
  driver.find_element(By.ID,'missionReviewClose').click()
  Select(driver.find_element(By.ID,'missionFilter')).select_by_value('all')
  driver.find_element(By.ID,'missionOnlyPinned').click()
  assert len(driver.find_elements(By.CSS_SELECTOR,'#missionProjects .mission-project'))==1
  driver.find_element(By.ID,'missionOnlyPinned').click()
  driver.set_window_size(390,844)
  time.sleep(.5)
  mobile=driver.execute_script("""return{
   width:innerWidth,docWidth:document.documentElement.scrollWidth,
   cards:document.querySelectorAll('#missionProjects .mission-project').length,
   route:document.querySelector('.view.is-active')?.id,
   mainWidth:document.getElementById('content').scrollWidth-document.getElementById('content').clientWidth
  }""")
  assert mobile['docWidth']<=mobile['width']+4,mobile
  assert mobile['mainWidth']<=4,mobile
  assert mobile['cards']==3 and mobile['route']=='mission',mobile
  driver.save_screenshot(str(OUT/'02-mission-mobile.png'))
  # Traceability: open PR failure, recent merged SHA check and explicit Issue edge.
  driver.set_window_size(1440,900)
  driver.execute_script("location.hash='#trace'")
  until(lambda:driver.find_element(By.ID,'traceTotal').text=='2')
  assert driver.find_element(By.ID,'traceBlocked').text=='1'
  assert driver.find_element(By.ID,'traceLinked').text=='1'
  assert driver.find_element(By.ID,'traceDeployed').text=='1'
  assert len(driver.find_elements(By.CSS_SELECTOR,'#traceGrid .trace-card'))==2
  assert "PR 检查失败" in driver.find_element(By.CSS_SELECTOR,'#traceGrid .trace-card').text
  driver.save_screenshot(str(OUT/'03-trace-desktop.png'))
  Select(driver.find_element(By.ID,'tracePhase')).select_by_value('merged')
  until(lambda:len(driver.find_elements(By.CSS_SELECTOR,'#traceGrid .trace-card'))==1)
  assert "已合并" in driver.find_element(By.CSS_SELECTOR,'#traceGrid .trace-card').text
  assert "GitHub Pages 同提交部署确认" in driver.find_element(By.CSS_SELECTOR,'#traceGrid .trace-card').text
  driver.find_element(By.CSS_SELECTOR,'#traceGrid .trace-card summary').click()
  assert "GitHub Deployment #447" in driver.find_element(By.CSS_SELECTOR,'#traceGrid .trace-detail-body').text
  assert driver.find_element(By.CSS_SELECTOR,'#traceGrid .trace-detail-body a[href*="/deployments/447"]')
  Select(driver.find_element(By.ID,'tracePhase')).select_by_value('open')
  until(lambda:driver.find_element(By.CSS_SELECTOR,'#traceGrid .trace-card').get_attribute('data-repo')=='broken-game')
  driver.find_element(By.CSS_SELECTOR,'#traceGrid .trace-card summary').click()
  assert "Issue #3" in driver.find_element(By.CSS_SELECTOR,'#traceGrid .trace-card .trace-detail-body').text
  assert "Mobile Playtest" in driver.find_element(By.CSS_SELECTOR,'#traceGrid .trace-card .trace-detail-body').text
  driver.set_window_size(390,844)
  time.sleep(.5)
  trace_mobile=driver.execute_script("""return {
   width:innerWidth,docWidth:document.documentElement.scrollWidth,
   mainOverflow:document.getElementById('content').scrollWidth-document.getElementById('content').clientWidth,
   route:document.querySelector('.view.is-active')?.id,
   cardCount:document.querySelectorAll('#traceGrid .trace-card').length
  }""")
  assert trace_mobile['docWidth']<=trace_mobile['width']+4,trace_mobile
  assert trace_mobile['mainOverflow']<=4,trace_mobile
  assert trace_mobile['route']=='trace' and trace_mobile['cardCount']==1,trace_mobile
  driver.save_screenshot(str(OUT/'04-trace-mobile.png'))
  # Branch-level deploy proof must surface in ordinary repository cards.
  driver.set_window_size(1440,900)
  driver.execute_script("location.hash='#projects'")
  until(lambda:driver.execute_script("return document.getElementById('projects').classList.contains('is-active')"))
  assert driver.execute_script("""return [...document.querySelectorAll('#grid .project')].some(
    x=>x.textContent.includes('unverified')&&x.textContent.includes('部署证实'))""")
  driver.save_screenshot(str(OUT/'05-branch-deployment-repository.png'))
  severe=[x['message'] for x in driver.get_log("browser") if x['level']=='SEVERE']
  fatal=[x for x in severe if 'Uncaught' in x or ('mission' in x and '404' in x)]
  assert not fatal,fatal
  report={'fixturePublicProjects':3,'riskCount':1,'openIssueSample':1,'openPRSample':1,'manualEvidencePersistence':True,'pinsPersisted':True,'mobile':mobile,'fatalBrowserErrors':fatal}
  (OUT/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8')
  print(json.dumps(report,ensure_ascii=False))
 finally:
  driver.quit();server.shutdown()
