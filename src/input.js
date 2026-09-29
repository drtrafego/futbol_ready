export class InputController {
  constructor(canvas, stick, onClick, isPaused, toWorld = null) {
    this.toWorld=toWorld;
    this.keys = new Set(); this.axis = { x: 0, y: 0 }; this.pointerId = null; this.enabled = true;
    this.knob = stick.querySelector('.stick-knob');
    const reset = () => { this.keys.clear(); this.axis = {x:0,y:0}; this.pointerId=null;this.knob.style.transform='translate(0,0)'; };
    this.reset = reset;
    window.addEventListener('blur', reset);
    window.addEventListener('keydown', e => {
      if (['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)) return;
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) e.preventDefault();
      if (!isPaused()) this.keys.add(e.code);
    });
    window.addEventListener('keyup', e => this.keys.delete(e.code));
    stick.addEventListener('pointerdown', e => {
      if (isPaused() || this.pointerId!==null) return;
      e.preventDefault(); this.pointerId=e.pointerId;stick.setPointerCapture(e.pointerId);this.updateStick(e,stick);
    });
    stick.addEventListener('pointermove', e => { if (e.pointerId===this.pointerId) this.updateStick(e,stick); });
    for(const event of ['pointerup','pointercancel','lostpointercapture'])stick.addEventListener(event,e=>{if(e.pointerId===this.pointerId)reset();});
    let down=null;
    canvas.addEventListener('pointerdown',e=>{if(!isPaused())down={x:e.clientX,y:e.clientY,id:e.pointerId};});
    canvas.addEventListener('pointerup',e=>{
      if(down&&e.pointerId===down.id&&Math.hypot(e.clientX-down.x,e.clientY-down.y)<12&&!isPaused())onClick(e.clientX,e.clientY);
      down=null;
    });
    canvas.addEventListener('pointercancel',()=>{down=null;});
  }
  updateStick(e,stick) {
    const r=stick.getBoundingClientRect(),radius=38;
    let x=e.clientX-r.left-r.width/2,y=e.clientY-r.top-r.height/2;
    const length=Math.hypot(x,y);
    if(length>radius){x=x/length*radius;y=y/length*radius;}
    this.axis={x:x/radius,y:y/radius};
    this.knob.style.transform=`translate(${x}px,${y}px)`;
  }
  read() {
    if(!this.enabled)return{x:0,z:0};
    let x=this.axis.x,y=this.axis.y;
    if(this.keys.has('KeyA')||this.keys.has('ArrowLeft'))x-=1;
    if(this.keys.has('KeyD')||this.keys.has('ArrowRight'))x+=1;
    if(this.keys.has('KeyW')||this.keys.has('ArrowUp'))y-=1;
    if(this.keys.has('KeyS')||this.keys.has('ArrowDown'))y+=1;
    if(Math.hypot(x,y)<.08)return{x:0,z:0};
    if(this.toWorld)return this.toWorld(x,y);
    // Transformação inversa da projeção: a tecla de cima sempre sobe na tela.
    const dz=y/.7,dx=x+.38*dz,length=Math.hypot(dx,dz);
    const power=Math.min(1,Math.hypot(x,y));
    return{x:dx/length*power,z:dz/length*power};
  }
}
