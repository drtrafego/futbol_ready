import json,time
from pathlib import Path
from playwright.sync_api import sync_playwright
game=Path(__file__).resolve().parents[1];q=game/'qa'
html=(game/'JOGAR.html').read_text().replace("local=location.protocol==='file:'",'local=true').replace("new URLSearchParams(location.search).get('debug')==='1'",'true')
fixture="""<script>const MEM={};Object.defineProperty(window,'localStorage',{value:{getItem:k=>MEM[k]??null,setItem:(k,v)=>MEM[k]=String(v),removeItem:k=>delete MEM[k]}});window.__MEM=MEM;</script>"""
results=[];errors=[]
def check(name,condition):
 results.append({'name':name,'ok':bool(condition)})
 if not condition: raise AssertionError(name)
def state(p):return p.evaluate('__arena.snapshot()')
def close(p):
 p.evaluate("document.querySelectorAll('dialog[open]').forEach(d=>d.close())")
def tab(p,name):
 p.locator('#sports-tabs').locator('[data-tab="'+name+'"]').click()
def load(p,file):
 close(p);p.locator('#menu-button').click();p.locator('#import-file').set_input_files(str(q/file));p.wait_for_timeout(250);close(p)
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 p=b.new_page(viewport={'width':1440,'height':900});p.on('pageerror',lambda e:errors.append(str(e)));p.on('dialog',lambda d:d.accept())
 p.set_content(fixture+html,wait_until='load');p.locator('#login-form button').click();p.wait_for_function('window.__arena !== undefined');p.locator('#start-button').click()
 check('new game: zero wallet, one field',state(p)['wallet']==0 and not state(p)['fields'][1]['unlocked'])
 for target,seconds in [('supply',5),('field0',7),('gate',20),('cash',8)]:
  p.evaluate('(t)=>__arena.goTo(t)',target);p.evaluate('(s)=>__arena.step(s)',seconds)
 check('manual cycle: collected kits and delivered',state(p)['stats']['picked']>0 and state(p)['stats']['delivered']>0)
 check('manual cycle: revenue reached wallet',state(p)['wallet']>0)
 for id,label in [('btn-dock-team','Elenco'),('btn-dock-league','Campeonato'),('btn-dock-youth','Base'),('btn-dock-market','Mercado')]:
  p.locator('#'+id).click();check(id+' opens working panel',label in p.locator('#sports-title').inner_text());close(p)
 load(p,'start-fixture.json');p.locator('#btn-dock-team').click();tab(p,'land')
 before=state(p)['wallet'];p.locator('[data-action=land][data-id=academy]').click();check('buy land debits exactly 500',state(p)['wallet']==before-500 and state(p)['land']['academy'])
 tab(p,'youth');before=state(p)['wallet'];p.locator('[data-action=facility][data-id=youth]').click();check('build youth connects to state',state(p)['facilities']['youth']==1 and state(p)['wallet']<before)
 p.locator('[data-action=scout]').click();check('scouting creates one prospect',len(state(p)['youthList'])==1)
 youth=state(p)['youthList'][0];p.locator('[data-action=trainYouth]').click();check('youth training changes strength',state(p)['youthList'][0]['overall']==youth['overall']+1)
 p.locator('[data-action=promote]').click();check('promotion retains all players',len(state(p)['roster'])==16 and not state(p)['youthList'])
 tab(p,'market');before=state(p)['wallet'];p.locator('[data-action=hire]').first.click();check('market hire debits and adds reserve',len(state(p)['roster'])==17 and state(p)['wallet']<before)
 tab(p,'team');player=state(p)['roster'][0];btn=p.locator('[data-action=train][data-id="'+player['id']+'"]');box=btn.bounding_box();p.mouse.move(box['x']+box['width']/2,box['y']+box['height']/2);p.mouse.down();p.wait_for_timeout(400);p.mouse.up()
 check('held click survives periodic UI update',state(p)['roster'][0]['overall']==player['overall']+1)
 p.locator('[data-action=captain]').first.click();check('captain button updates tactics',state(p)['tactics']['captainId'] is not None)
 p.locator('#tactic-formation').select_option('4-3-3');check('formation select changes lineup',sum(1 for j in state(p)['roster'] if j['starter'] and j['pos']=='ATA')==3)
 p.screenshot(path=str(q/'elenco.png'));close(p)
 load(p,'away-fixture.json');p.locator('#btn-dock-league').click();p.locator('[data-action=round]').click();check('official match starts without early table result',state(p)['official'] is not None and state(p)['season']['clubs'][0]['played']==1)
 p.evaluate('__arena.step(21)');p.screenshot(path=str(q/'estadio-partida.png'));p.evaluate('__arena.step(3)')
 s=state(p);check('official match completes and updates table',s['official'] is None and s['season']['clubs'][0]['played']==2)
 p.locator('#btn-dock-league').click();check('results show our team when away','(VOCÊ)' in p.locator('#sports-content').inner_text());p.screenshot(path=str(q/'tabela.png'));close(p)
 check('save after result succeeds',p.evaluate('__arena.save().ok'))
 stored=p.evaluate('__MEM');p.close();p=b.new_page(viewport={'width':1440,'height':900});p.on('pageerror',lambda e:errors.append(str(e)));p.on('dialog',lambda d:d.accept());p.set_content(fixture.replace('const MEM={}', 'const MEM='+json.dumps(stored))+html,wait_until='load');p.locator('#login-form button').click();p.wait_for_function('window.__arena !== undefined');check('reopen restores league and money',state(p)['season']['clubs'][0]['played']==2)
 close(p);load(p,'phase3-fixture.json');p.locator('#district-button').click();p.wait_for_timeout(200);p.screenshot(path=str(q/'clube-fase3.png'))
 p.locator('#btn-dock-youth').click();p.locator('[data-look=youth]').last.click();p.wait_for_timeout(200);p.screenshot(path=str(q/'base-fase3.png'))
 p.locator('#arena-button').click();p.wait_for_timeout(200);p.screenshot(path=str(q/'arena-fase3.png'))
 for width,height in [(390,844),(320,568),(844,390),(768,1024),(1280,720)]:
  p.set_viewport_size({'width':width,'height':height});p.wait_for_timeout(200)
  check(f'no horizontal document overflow {width}x{height}',p.evaluate('document.documentElement.scrollWidth<=innerWidth'))
  for id in ['btn-dock-team','btn-dock-league','btn-dock-youth','btn-dock-market']:
   p.locator('#'+id).click();check(f'{id} click at {width}x{height}',p.locator('#sports-dialog').is_visible());close(p)
  if width==390:p.screenshot(path=str(q/'celular.png'))
 print('ERRORS',errors)
 check('no JavaScript errors',not errors)
 # A second profile starts independently on the same storage fixture.
 p.close();p=b.new_page(viewport={'width':390,'height':844});p.on('pageerror',lambda e:errors.append(str(e)));p.set_content(fixture.replace('const MEM={}', 'const MEM='+json.dumps(stored))+html,wait_until='load');p.locator('#login-user').select_option('miguel');p.locator('#login-form button').click();p.wait_for_function('window.__arena !== undefined');check('Miguel profile is independent',state(p)['wallet']==0 and state(p)['club']['name']=='Miguel FC')
 b.close()
(q/'browser-report.json').write_text(json.dumps({'method':'Chromium set_content; login changed to local demo only in fixture; in-memory localStorage; debug clock acceleration','errors':errors,'checks':results},ensure_ascii=False,indent=2))
print(f'{len(results)} checks; failures {sum(not r["ok"] for r in results)}; JS errors {len(errors)}')
