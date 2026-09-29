import json,time,urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright
P=Path(__file__).resolve().parents[1]
checks=[]
def check(name,value,detail=''):
 checks.append({'name':name,'pass':bool(value),'detail':detail})
 if not value:print('FAIL:',name,detail)
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 ctx=browser.new_context(viewport={'width':1536,'height':960},device_scale_factor=1)
 page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 resp=urllib.request.urlopen('http://127.0.0.1:4173/')
 check('Production HTML served via HTTP (separate Python check)',resp.status==200)
 for asset in ['arena-cenario.png','gerente.png','roupeiro.png','icon.svg']:
  r=urllib.request.urlopen('http://127.0.0.1:4173/assets/'+asset)
  check('HTTP asset: '+asset,r.status==200)
 # Chromium policy blocks ALL navigation, including localhost. Mount the actual
 # standalone build in a blank page; enable only the existing optional QA hook.
 html=(P/'JOGAR.html').read_text().replace("if(new URLSearchParams(location.search).get('debug')==='1'){", "if(globalThis.__QA_VISUAL__){")
 page.evaluate("""() => { window.__QA_VISUAL__=true; window.__qaStorage=new Map();
 Object.defineProperty(window,'localStorage',{value:{getItem:k=>__qaStorage.get(k)??null,setItem:(k,v)=>__qaStorage.set(k,String(v)),removeItem:k=>__qaStorage.delete(k)}}); }""")
 page.set_content(html,wait_until='load')
 page.wait_for_function('!!window.__arena',timeout=15000)
 check('Artwork and sprite resources loaded',page.evaluate('__arena.rendererInfo().loaded && __arena.rendererInfo().assets.length === 7'))
 page.locator('#start-button').click();page.wait_for_timeout(300)
 page.screenshot(path=str(P/'qa/desktop-inicio.png'))
 # Go via actual visible destination button, then advance the real simulation.
 page.locator('[data-travel=supply]').click()
 page.evaluate('__arena.step(12)')
 check('Depot navigation collects actual kits',page.evaluate('__arena.snapshot().player.carry')==3)
 page.locator('[data-travel=field0]').click();page.evaluate('__arena.step(12)')
 check('Pitch navigation delivers actual kits',page.evaluate('__arena.snapshot().fields[0].stock')==3)
 page.locator('[data-travel=gate]').click();page.evaluate('__arena.step(55)')
 check('Paid attendance and matches occur',page.evaluate('__arena.snapshot().stats.admitted > 0 && __arena.snapshot().stats.matches > 0'))
 page.locator('[data-travel=cash]').click();page.evaluate('__arena.step(12)')
 check('Cash revenue reaches wallet',page.evaluate('__arena.snapshot().wallet > 0'))
 # Earn the expansion normally. No direct wallet/state mutation in this test.
 purchased=[]
 for it in range(25):
  s=page.evaluate('__arena.snapshot()')
  for name in ['gate','runner','cashier','field2']:
   done=s['staff'].get(name,False) if name!='field2' else s['fields'][1]['unlocked']
   if done:continue
   page.locator('#upgrade-button').click()
   button=page.locator('#buy-'+name)
   if button.is_enabled():button.click();purchased.append(name)
   page.locator('#upgrade-dialog [data-close]').click()
   s=page.evaluate('__arena.snapshot()')
   break
  if s['fields'][1]['unlocked']:break
  if s['staff']['runner'] and s['staff']['gate']:
   page.locator('[data-travel=cash]').click();page.evaluate('__arena.step(120)')
  else:
   for zone,sec in [('supply',12),('field0',12),('gate',48),('cash',12)]:
    page.locator(f'[data-travel={zone}]').click();page.evaluate(f'__arena.step({sec})')
 check('Real purchases unlock staff and second pitch',page.evaluate('__arena.snapshot().fields[1].unlocked'),str(purchased))
 page.evaluate('__arena.step(50)');page.wait_for_timeout(3200)
 page.screenshot(path=str(P/'qa/desktop-jogo.png'))
 check('Live HUD equals simulation',page.evaluate("Number(document.getElementById('wallet').textContent.replaceAll('.',''))===__arena.snapshot().wallet"))
 page.evaluate('__arena.save()');check('Save is written to test storage adapter',page.evaluate('__qaStorage.has("arena-de-bairro.save.v1")'))
 check('Menu pauses simulated clock',page.evaluate('true'))
 page.locator('#menu-button').click();t=page.evaluate('__arena.snapshot().t');page.wait_for_timeout(350)
 checks[-1]['pass']=page.evaluate('__arena.snapshot().t')==t
 page.locator('#resume-button').click()
 # Screen-mode checks on same real session, no loss of game state.
 for w,h in [(390,844),(360,800),(320,568),(768,1024),(844,390),(1024,768),(1920,1080)]:
  page.set_viewport_size({'width':w,'height':h});page.wait_for_timeout(300)
  check(f'{w}x{h}: no document horizontal overflow',page.evaluate('document.documentElement.scrollWidth <= innerWidth'))
  check(f'{w}x{h}: primary controls visible',page.locator('#upgrade-button').is_visible() and page.locator('#menu-button').is_visible())
  page.locator('#upgrade-button').click()
  check(f'{w}x{h}: shop is interactive',page.locator('#upgrade-dialog').is_visible())
  page.locator('#upgrade-dialog [data-close]').click()
  if w in [390,844,768]:page.screenshot(path=str(P/f'qa/tela-{w}x{h}.png'))
 # Actual pointer movement on touch control in portrait.
 page.set_viewport_size({'width':390,'height':844});page.wait_for_timeout(100)
 before=page.evaluate('__arena.snapshot().stats.walked');box=page.locator('#joystick').bounding_box()
 page.mouse.move(box['x']+box['width']/2,box['y']+box['height']/2);page.mouse.down();page.mouse.move(box['x']+box['width']-4,box['y']+box['height']/2);page.wait_for_timeout(500);page.mouse.up()
 check('Joystick moves manager in mobile viewport',page.evaluate('__arena.snapshot().stats.walked')>before)
 check('No uncaught browser JS errors',not errors,str(errors))
 report={'environment':'Linux / Chromium. Navigation blocked by browser policy: standalone HTML mounted using set_content; localStorage replaced by in-memory adapter; optional QA hook enabled. HTTP checks done separately via Python. Emulated viewports, not physical devices.', 'checks':checks,'passed':sum(x['pass'] for x in checks),'total':len(checks),'errors':errors,'purchases_without_wallet_injection':purchased}
 (P/'qa/browser-report.json').write_text(json.dumps(report,indent=2,ensure_ascii=False))
 print(json.dumps(report,indent=2,ensure_ascii=False));browser.close()
