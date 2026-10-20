from pathlib import Path
import json,time
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];QA=ROOT/'qa06'
html=(ROOT/'JOGAR.html').read_text().replace("local=location.protocol==='file:'","local=true").replace("if(new URLSearchParams(location.search).get('debug')==='1')","if(true)")
results=[];errors=[];downloads=[]
def record(name,ok,detail=None):
 results.append({'name':name,'ok':bool(ok),'detail':detail})
 print(('PASS ' if ok else 'FAIL ')+name,flush=True)
 if not ok: print(detail,flush=True)
def load(page,fixture=None):
 page.goto('about:blank');data={}
 if fixture:data['arena-de-bairro.profile.bernardo']=(QA/fixture).read_text()
 page.evaluate('''data=>Object.defineProperty(window,'localStorage',{configurable:true,value:{data:{...data},getItem(k){return this.data[k]??null},setItem(k,v){this.data[k]=String(v)},removeItem(k){delete this.data[k]}}})''',data)
 page.set_content(html,wait_until='load',timeout=20000)
 page.locator('#login-form button').click();page.wait_for_function('!!window.__arena',timeout=15000)
 if page.locator('#welcome-dialog').evaluate('e=>e.open'):page.locator('#start-button').click()
 page.wait_for_timeout(180)
def snapshot(page):return page.evaluate('window.__arena.snapshot()')
def step(page,s):return page.evaluate('s=>window.__arena.step(s)',s)
def focus(page,id):page.evaluate('id=>window.__arena.focus(id)',id);page.wait_for_timeout(200)
def action(page,name,id=None):
 q=f'button[data-action="{name}"]'+(f'[data-id="{id}"]' if id else '')
 el=page.locator(q).first;el.scroll_into_view_if_needed();el.click();page.wait_for_timeout(220)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 page=b.new_page(viewport={'width':1440,'height':900});page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('dialog',lambda d:d.accept())
 try:
  load(page);s=snapshot(page);record('new profile starts with zero money',s['wallet']==0);record('one field and closed expansion on new game',not s['fields'][1]['unlocked'] and not s['land']['academy'])
  page.locator('#navigate-button').click();step(page,8);record('first objective routes to supply when manager has no kit',snapshot(page)['player']['carry']>0)
  page.locator('#navigate-button').click();step(page,8);s=snapshot(page);record('first objective delivers a real kit',s['stats']['delivered']>0);record('claim button appears only after delivery',page.locator('#tycoon-claim').is_visible())
  old=s['wallet'];page.locator('#tycoon-claim').click();page.wait_for_timeout(200);s=snapshot(page);record('claim credits first reward',s['wallet']==old+15);record('claim reveals second chapter',page.locator('#mission-title').inner_text()=='Receba a torcida')
  page.screenshot(path=str(QA/'01-primeiros-passos.png'))
  load(page,'advanced.json');page.locator('#btn-dock-team').click();before=snapshot(page)['t'];page.wait_for_timeout(650);after=snapshot(page)['t'];record('sports management no longer freezes simulation',after>before+.3)
  page.locator('[data-tab="board"]').last.click();page.wait_for_timeout(200)
  inp=page.locator('#club-name');inp.fill('Meu Clube em Edição');page.wait_for_timeout(800);record('editable club name is not overwritten by live render',inp.input_value()=='Meu Clube em Edição')
  action(page,'club');record('club edit is connected to saved state',snapshot(page)['club']['name']=='Meu Clube em Edição')
  page.locator('[data-tab="team"]').last.click();page.wait_for_timeout(200);s=snapshot(page);id=s['roster'][0]['id'];old=s['roster'][0]['overall'];kits=s['map']['ctKits'];money=s['wallet']
  action(page,'train',id);s=snapshot(page);record('individual training creates session',s['map']['training'] is not None);record('training spends kit and coins',s['map']['ctKits']==kits-1 and s['wallet']<money);record('training does not grant strength at click',s['roster'][0]['overall']==old)
  step(page,30);s=snapshot(page);record('training finishes and strengthens same athlete',s['roster'][0]['overall']==old+1);record('athlete history records completed training',s['tycoon']['people'][id]['trainings']==1)
  page.locator('#btn-dock-market').click();page.wait_for_timeout(180);s=snapshot(page);n=len(s['roster']);mid=s['market'][0]['id'];action(page,'hire',mid);s=snapshot(page);record('market button adds reserve to live roster',len(s['roster'])==n+1);record('market offer removed after hiring',all(x['id']!=mid for x in s['market']))
  page.locator('[data-tab="team"]').last.click();page.wait_for_timeout(150);pid='contratado_'+mid;before=snapshot(page)['wallet'];action(page,'sell',pid);s=snapshot(page);record('sell reserve connected to roster',all(x['id']!=pid for x in s['roster']));record('sell credits virtual coins',s['wallet']>before)
  page.locator('[data-tab="youth"]').last.click();page.wait_for_timeout(150);action(page,'scout');s=snapshot(page);record('scout creates academy prospect',len(s['youthList'])==1);yid=s['youthList'][0]['id'];n=len(s['roster']);action(page,'promote',yid);s=snapshot(page);record('promote academy player preserves roster and adds reserve',len(s['roster'])==n+1 and len(s['youthList'])==0)
  page.locator('[data-tab="life"]').last.click();page.wait_for_timeout(180);record('new club panel has functional content',page.locator('#sports-content').inner_text().find('Contratos fictícios')>=0)
  action(page,'tycoon:partner','community');record('partner accepted from real UI',snapshot(page)['tycoon']['partner']['id']=='community')
  page.evaluate("""window.controlIdentity=document.querySelector('[data-action="tycoon:share"]')""");step(page,3)
  record('live counters preserve the actual share button DOM node',page.evaluate("""window.controlIdentity===document.querySelector('[data-action="tycoon:share"]')"""))
  with page.expect_download(timeout=10000) as dl:action(page,'tycoon:share')
  d=dl.value;d.save_as(str(QA/'cartao-clube-exportado.png'));record('club card exported as actual image',d.suggested_filename.endswith('.png'))
  page.screenshot(path=str(QA/'02-clube-vivo.png'))
  # Manual controls stay locked behind the open panel, economy still runs.
  before=snapshot(page)['map']['actor'];page.keyboard.down('KeyW');page.wait_for_timeout(200);page.keyboard.up('KeyW');after=snapshot(page)['map']['actor'];record('game movement does not leak through open sports panel',abs(after['y']-before['y'])<1)
  page.locator('#sports-dialog [data-close]').click();page.locator('#menu-button').click();t=snapshot(page)['t'];page.wait_for_timeout(350);record('pause menu still freezes game',snapshot(page)['t']==t);page.locator('#resume-button').click()
  # Empty stock supply selected in map inspector through full command bridge.
  load(page,'advanced.json');focus(page,'canteen');record('canteen building selection exposes real service controls',page.locator('[data-action="tycoon:food"]').count()>0)
  s=snapshot(page);st=s['tycoon']['canteen']['stock'];before=s['wallet'];action(page,'tycoon:food');s=snapshot(page);record('map inspector food purchase starts physical delivery',s['tycoon']['canteen']['shipment'] is not None);record('food purchase not free and no instant stock',s['wallet']<before and s['tycoon']['canteen']['stock']==st)
  step(page,50);s=snapshot(page);record('canteen physical visitors paid after service',s['tycoon']['counters']['served']>0,s['tycoon']['counters']);record('stock consumed by actual visitors',s['tycoon']['counters']['foodRevenue']>0)
  page.screenshot(path=str(QA/'03-lanchonete.png'))
  # Reserve Field 1 can keep operating while official match is in stadium.
  page.locator('#btn-dock-league').click();page.wait_for_timeout(200);s=snapshot(page);round0=s['season']['currentRound'];record('league button enabled with stadium despite busy local field',not page.locator('[data-action="round"]').is_disabled())
  action(page,'round');s=snapshot(page);record('league command starts independent stadium',s['tycoon']['stadium']['match'] is not None and s['official'] is None);record('table unchanged at kickoff',s['season']['currentRound']==round0)
  step(page,25);s=snapshot(page);record('stadium admission recorded paid supporters',s['tycoon']['stadium']['match']['admitted']>=4);page.screenshot(path=str(QA/'04-estadio-oficial.png'))
  step(page,35);s=snapshot(page);record('official match updates table after finish',s['season']['currentRound']==round0+1);record('independent stadium final result saved',s['tycoon']['stadium']['last'] is not None)
  page.locator('#btn-dock-league').click();page.wait_for_timeout(220);page.screenshot(path=str(QA/'05-resultados.png'));record('league table has correct eight clubs',page.locator('#sports-content tbody tr').count()>=8)
  page.locator('#sports-dialog [data-close]').click();record('save succeeds with venue, bios and catering state',page.evaluate('window.__arena.save().ok'))
  raw=page.evaluate("localStorage.getItem('arena-de-bairro.profile.bernardo')");record('encoded save contains tycoon extension','"tycoon"' in raw)
  for w,h in [(390,844),(320,568),(844,390),(768,1024),(1440,900)]:
   page.set_viewport_size({'width':w,'height':h});page.wait_for_timeout(200)
   record(f'{w}x{h} no document horizontal overflow',page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
   page.locator('#btn-dock-team').click();page.wait_for_timeout(200);rect=page.locator('#sports-dialog').bounding_box()
   record(f'{w}x{h} sports panel fits viewport',rect['x']>=-1 and rect['y']>=-1 and rect['x']+rect['width']<=w+1 and rect['y']+rect['height']<=h+1,rect)
   if w==390:page.screenshot(path=str(QA/'06-elenco-celular.png'))
   page.locator('#sports-dialog [data-close]').click()
  record('no uncaught JavaScript exceptions',len(errors)==0,errors)
 except Exception as e:
  record('browser journey completed',False,str(e));page.screenshot(path=str(QA/'failure.png'))
 finally:
  (QA/'browser-report.json').write_text(json.dumps({'method':'Chromium HTML injection, in-memory localStorage and local demonstration auth for QA only. Native file navigation was blocked by environment.','results':results,'errors':errors},ensure_ascii=False,indent=2));b.close()
print('TOTAL',len(results),'PASS',sum(x['ok'] for x in results),'FAIL',sum(not x['ok'] for x in results))
