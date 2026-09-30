/** Tap chooses a world object; dragging pans. WASD/joystick still move the manager.
 * Wheel and two-finger pinch zoom around the pointer, without changing the save. */
export class WorldInput{
 constructor(canvas,stick,onClick,isPaused,renderer){
  this.keys=new Set();this.axis={x:0,y:0};this.knob=stick.querySelector('.stick-knob');this.points=new Map();this.stickId=null;this.renderer=renderer;
  this.reset=()=>{this.keys.clear();this.axis={x:0,y:0};this.stickId=null;this.points.clear();this.drag=null;this.knob.style.transform='';};
  const editable=()=>/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName);
  window.addEventListener('keydown',e=>{if(isPaused()||editable())return;if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowLeft','ArrowDown','ArrowRight'].includes(e.code)){e.preventDefault();this.keys.add(e.code);renderer.mapCamera.follow=true;}if(e.key==='Escape'){renderer.placement=null;renderer.selection=null;}});
  window.addEventListener('keyup',e=>this.keys.delete(e.code));window.addEventListener('blur',this.reset);
  const moveStick=e=>{const r=stick.getBoundingClientRect(),radius=r.width*.34,dx=e.clientX-r.left-r.width/2,dy=e.clientY-r.top-r.height/2,len=Math.max(1,Math.hypot(dx,dy)/radius);this.axis={x:dx/len/radius,y:dy/len/radius};this.knob.style.transform=`translate(${dx/len}px,${dy/len}px)`;renderer.mapCamera.follow=true;};
  stick.addEventListener('pointerdown',e=>{if(isPaused()||this.stickId!==null)return;e.preventDefault();this.stickId=e.pointerId;stick.setPointerCapture(e.pointerId);moveStick(e);});
  stick.addEventListener('pointermove',e=>{if(e.pointerId===this.stickId)moveStick(e);});
  for(const name of['pointerup','pointercancel','lostpointercapture'])stick.addEventListener(name,e=>{if(e.pointerId===this.stickId){this.axis={x:0,y:0};this.stickId=null;this.knob.style.transform='';}});
  canvas.addEventListener('contextmenu',e=>e.preventDefault());
  canvas.addEventListener('pointerdown',e=>{if(isPaused())return;e.preventDefault();canvas.setPointerCapture(e.pointerId);this.points.set(e.pointerId,{x:e.clientX,y:e.clientY});if(this.points.size===1)this.drag={id:e.pointerId,x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,moved:false};else{this.drag.moved=true;this.pinch=this.pinchInfo();}});
  canvas.addEventListener('pointermove',e=>{
   renderer.hover=renderer.snapped(renderer.unproject(e.clientX,e.clientY));
   if(isPaused()||!this.points.has(e.pointerId))return;e.preventDefault();this.points.set(e.pointerId,{x:e.clientX,y:e.clientY});
   if(this.points.size===2){const p=this.pinchInfo();if(this.pinch){renderer.zoomAt(p.distance/Math.max(1,this.pinch.distance),p.x,p.y);renderer.pan(p.x-this.pinch.x,p.y-this.pinch.y);}this.pinch=p;return;}
   if(this.drag?.id===e.pointerId){const d=this.drag;if(Math.hypot(e.clientX-d.x,e.clientY-d.y)>7)d.moved=true;if(d.moved)renderer.pan(e.clientX-d.lastX,e.clientY-d.lastY);d.lastX=e.clientX;d.lastY=e.clientY;}
  });
  canvas.addEventListener('pointerup',e=>{const d=this.drag;const single=this.points.size===1;this.points.delete(e.pointerId);if(single&&d?.id===e.pointerId&&!d.moved&&!isPaused())onClick(e.clientX,e.clientY);if(!this.points.size)this.drag=null;this.pinch=null;});
  for(const name of['pointercancel','lostpointercapture'])canvas.addEventListener(name,e=>{this.points.delete(e.pointerId);if(!this.points.size)this.drag=null;this.pinch=null;});
  canvas.addEventListener('wheel',e=>{if(isPaused())return;e.preventDefault();renderer.zoomAt(Math.exp(-e.deltaY*.0015),e.clientX,e.clientY);},{passive:false});
 }
 pinchInfo(){const [a,b]=[...this.points.values()];return a&&b?{x:(a.x+b.x)/2,y:(a.y+b.y)/2,distance:Math.hypot(a.x-b.x,a.y-b.y)}:null;}
 read(){let x=this.axis.x,y=this.axis.y;if(this.keys.has('KeyA')||this.keys.has('ArrowLeft'))x--;if(this.keys.has('KeyD')||this.keys.has('ArrowRight'))x++;if(this.keys.has('KeyW')||this.keys.has('ArrowUp'))y--;if(this.keys.has('KeyS')||this.keys.has('ArrowDown'))y++;const n=Math.max(1,Math.hypot(x,y));return{x:x/n,z:y/n};}
}
