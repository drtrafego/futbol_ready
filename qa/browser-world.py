from pathlib import Path
import json, time
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
html=(ROOT/'JOGAR.html').read_text()
html=html.replace("local=location.protocol==='file:'","local=true").replace("if(new URLSearchParams(location.search).get('debug')==='1')","if(true)")
results=[]
def record(name,ok,detail=''):
 results.append({'name':name,'ok':bool(ok),'detail':detail})
 if not ok: print('FAIL',name,detail)
def load(page,fixture=None):
 page.goto('about:blank')
 data={}
 if fixture:data['arena-de-bairro.profile.bernardo']=(ROOT/'qa'/fixture).read_text()
 page.evaluate('''data=>Object.defineProperty(window,'localStorage',{configurable:true,value:{data:{...data},getItem(k){return this.data[k]??null},setItem(k,v){this.data[k]=String(v)},removeItem(k){delete this.data[k]}}})''',data)
 page.set_content(html,wait_until='load',timeout=20000)
 page.locator('#login-form button').click()
 page.wait_for_function('!!window.__arena',timeout=15000)
 if page.locator('#welcome-dialog').evaluate('el=>el.open'):page.locator('#start-button').click()
 page.wait_for_timeout(150)
def state(page):return page.evaluate('window.__arena.snapshot()')
def step(page,sec):return page.evaluate('sec=>window.__arena.step(sec)',sec)
def focus(page,id):page.evaluate('id=>window.__arena.focus(id)',id);page.wait_for_timeout(150)
def hit(page,kind,key):
 info=page.evaluate('window.__arena.rendererInfo()');return next(h for h in info['hits'] if h['kind']==kind and h['key']==key)
def clickhit(page,kind,key):
 h=hit(page,kind,key);page.mouse.click(h['x']+h['w']/2,h['y']+h['h']/2);page.wait_for_timeout(200)

with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':1440,'height':900})
 errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
 load(page)
 record('new game is not funded',state(page)['wallet']==0)
 record('new game starts with locked expansion',not state(page)['land']['academy'])
 page.locator('[data-travel="supply"]').click();step(page,6)
 record('original depot works with new world movement',state(page)['player']['carry']>0)
 page.locator('[data-travel="field0"]').click();step(page,5)
 record('original field receives carried equipment',state(page)['fields'][0]['stock']>0)
 # physical camera controls without restarting the game
 cam0=page.evaluate('window.__arena.rendererInfo().camera')
 page.mouse.move(1000,410);page.mouse.down();page.mouse.move(810,460,steps=7);page.mouse.up()
 cam1=page.evaluate('window.__arena.rendererInfo().camera')
 record('drag changes camera without navigation',abs(cam0['x']-cam1['x'])>80)
 zoom0=cam1['zoom'];page.mouse.wheel(0,-240);page.wait_for_timeout(100)
 record('wheel zoom changes world scale',page.evaluate('window.__arena.rendererInfo().camera.zoom')>zoom0)
 # live purchase, placement and construction using UI on a funded QA checkpoint
 load(page,'fixture-expansion.json');focus(page,'all');page.screenshot(path=str(ROOT/'qa'/'mapa-continuo-inicial.png'))
 clickhit(page,'plot','academy');record('clicking a parcel opens contextual inspector',page.locator('#world-inspector').is_visible())
 before=state(page)['wallet'];page.locator('[data-world-action="buyLand"]').click();page.wait_for_timeout(200)
 record('buy parcel changes ownership',state(page)['land']['academy'])
 record('buy parcel spends coins',state(page)['wallet']<=before-500+200)
 record('purchased plot offers on-map placement',page.locator('[data-world-action="place"][data-world-id="training"]').count()==1)
 page.locator('[data-world-action="place"][data-world-id="training"]').click();page.wait_for_timeout(200)
 record('placement mode active',page.evaluate('window.__arena.rendererInfo().placement')=='training')
 info=page.evaluate('window.__arena.rendererInfo()');x=info['ox']+1968*info['scale'];y=info['oy']+652*info['scale']
 page.mouse.move(x,y);page.mouse.click(x,y);page.wait_for_timeout(200)
 record('click ground starts actual construction',len(state(page)['map']['construction'])==1)
 record('no instant benefit before construction',state(page)['facilities']['training']==0)
 focus(page,'training');page.screenshot(path=str(ROOT/'qa'/'obra-do-ct.png'))
 step(page,55)
 record('construction completion updates facility',state(page)['facilities']['training']==1)
 record('construction queue clears',not state(page)['map']['construction'])
 record('training blocked without delivered kits',page.locator('[data-world-action="trainTeam"]').is_disabled())
 page.locator('[data-world-action="closeInspector"]').click()
 page.locator('[data-travel="supply"]').click();step(page,12)
 carried=state(page)['player']['carry'];record('kits available for manual delivery',carried>0)
 focus(page,'training');page.locator('[data-world-action="deliverCT"]').click();step(page,30)
 record('manager reaches CT and delivers kits',state(page)['map']['ctKits']>0)
 # Single training through actual roster action
 page.locator('#btn-dock-team').click();page.wait_for_timeout(150)
 roster_before=state(page)['roster'];id=roster_before[0]['id'];rating=roster_before[0]['overall'];wallet=state(page)['wallet'];kits=state(page)['map']['ctKits']
 page.locator(f'[data-action="train"][data-id="{id}"]').click();page.wait_for_timeout(150)
 record('roster train starts a timed job',bool(state(page)['map']['training']))
 record('training consumes kit once',state(page)['map']['ctKits']==kits-1)
 record('training spends coins',state(page)['wallet']<wallet)
 record('training has no instant rating reward',state(page)['roster'][0]['overall']==rating)
 step(page,32)
 record('completed training improves actual roster',state(page)['roster'][0]['overall']==rating+1)
 record('save after construction and training succeeds',page.evaluate('window.__arena.save().ok'))
 page.locator('[data-world-action="courier"]').click();record('logistics hiring persisted',state(page)['map']['courierHired'])
 # Tree -> construction -> phase geometry are game renders, not generated images.
 for fixture,name in [('fixture-phase1.json','fase-1'),('fixture-phase3.json','fase-3')]:
  load(page,fixture);focus(page,'training');page.locator('[data-world-action="closeInspector"]').click();page.wait_for_timeout(180)
  page.screenshot(path=str(ROOT/'qa'/f'ct-{name}.png'))
  focus(page,'stadium');page.locator('[data-world-action="closeInspector"]').click();page.wait_for_timeout(180)
  page.screenshot(path=str(ROOT/'qa'/f'estadio-{name}.png'))
 load(page,'fixture-phase3.json');focus(page,'all');page.wait_for_timeout(200);page.screenshot(path=str(ROOT/'qa'/'mapa-expandido.png'))
 # Layout and controls on different viewport sizes
 for w,h in [(1440,900),(1024,768),(768,1024),(390,844),(320,568),(844,390)]:
  page.set_viewport_size({'width':w,'height':h});page.wait_for_timeout(200);focus(page,'training')
  overflow=page.evaluate('document.documentElement.scrollWidth > innerWidth')
  record(f'no horizontal overflow {w}x{h}',not overflow)
  for sel in ['#menu-button','#district-button','#btn-dock-team','#world-inspector']:
   box=page.locator(sel).bounding_box();record(f'visible bounds {sel} {w}x{h}',box is not None and box['x']>=-.5 and box['y']>=-.5 and box['x']+box['width']<=w+.5 and box['y']+box['height']<=h+.5,str(box))
  page.locator('#btn-dock-team').click();record(f'roster button connected {w}x{h}',page.locator('#sports-dialog').evaluate('el=>el.open'))
  page.locator('#sports-dialog [data-close]').click()
  if w==390:page.screenshot(path=str(ROOT/'qa'/'mapa-celular.png'))
 # touch drag and joystick via Chromium DevTools
 page.set_viewport_size({'width':390,'height':844});focus(page,'arena');page.locator('[data-world-action="closeInspector"]').click() if page.locator('#world-inspector').is_visible() else None
 cdp=page.context.new_cdp_session(page)
 old=page.evaluate('window.__arena.rendererInfo().camera.x')
 cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':280,'y':310}]})
 for xx in [250,220,190,160]:cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':xx,'y':310}]})
 cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
 record('touch drag pans map',abs(page.evaluate('window.__arena.rendererInfo().camera.x')-old)>30)
 record('no uncaught JavaScript errors',not errors,'; '.join(errors))
 browser.close()
report={'environment':'Linux / Chromium, compiled HTML injected with local-demo authentication and memory storage fixture. Navigation blocked by administrator. No production deployment or device certification.', 'checks':results,'passed':sum(x['ok'] for x in results),'failed':sum(not x['ok'] for x in results),'errors':errors}
(ROOT/'qa'/'browser-world-report.json').write_text(json.dumps(report,indent=2,ensure_ascii=False))
print('RESULT',report['passed'],'passed',report['failed'],'failed')
