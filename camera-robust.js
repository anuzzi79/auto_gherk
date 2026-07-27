(()=>{
  'use strict';

  const getControls=()=>({
    look:document.getElementById('look'),
    joy:document.getElementById('joy'),
    jump:document.getElementById('jumpButton')
  });

  const isInside=(el,x,y)=>{
    if(!el)return false;
    const r=el.getBoundingClientRect();
    return x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom;
  };

  const isControl=(x,y)=>{
    const {joy,jump}=getControls();
    return isInside(joy,x,y)||isInside(jump,x,y);
  };

  // Impedisce al browser di trasformare il trascinamento della camera
  // in drag nativo, selezione di testo o gesto di navigazione.
  const stopNativeDrag=e=>e.preventDefault();
  document.addEventListener('dragstart',stopNativeDrag,true);
  document.addEventListener('selectstart',stopNativeDrag,true);
  document.addEventListener('contextmenu',stopNativeDrag,true);
  document.documentElement.style.userSelect='none';
  document.documentElement.style.webkitUserSelect='none';
  document.documentElement.style.webkitUserDrag='none';
  document.body.style.userSelect='none';
  document.body.style.webkitUserSelect='none';
  document.body.style.overscrollBehavior='none';

  for(const el of document.querySelectorAll('*')){
    el.draggable=false;
    el.style.webkitUserDrag='none';
  }

  let active=false;
  let pointerId=null;
  let lastX=0;
  let lastY=0;

  const sendToLook=(type,source,buttons)=>{
    const {look}=getControls();
    if(!look)return;
    const ev=new PointerEvent(type,{
      bubbles:false,
      cancelable:true,
      pointerId:source.pointerId ?? pointerId ?? 1,
      pointerType:'mouse',
      isPrimary:true,
      button:type==='pointerdown'?0:-1,
      buttons,
      clientX:source.clientX,
      clientY:source.clientY
    });
    look.dispatchEvent(ev);
  };

  const finish=(source)=>{
    if(!active)return;
    active=false;
    document.body.style.cursor='default';
    const point=source||{clientX:lastX,clientY:lastY,pointerId:pointerId};
    sendToLook('pointerup',point,0);
    pointerId=null;
  };

  window.addEventListener('pointerdown',e=>{
    if(e.pointerType!=='mouse'||e.button!==0||isControl(e.clientX,e.clientY))return;
    active=true;
    pointerId=e.pointerId;
    lastX=e.clientX;
    lastY=e.clientY;
    document.body.style.cursor='grabbing';
    e.preventDefault();

    // Se il click non è arrivato direttamente al layer di visuale,
    // avvia comunque la stessa sessione camera.
    if(e.target!==getControls().look)sendToLook('pointerdown',e,1);
  },{capture:true,passive:false});

  window.addEventListener('pointermove',e=>{
    if(!active||e.pointerType!=='mouse'||e.pointerId!==pointerId)return;
    if((e.buttons&1)===0){finish(e);return;}
    lastX=e.clientX;
    lastY=e.clientY;
    e.preventDefault();

    // Il listener originale riceve normalmente gli eventi quando il
    // pointer capture funziona. Questo è il fallback quando il browser
    // perde la capture o il puntatore esce dal layer.
    if(e.target!==getControls().look)sendToLook('pointermove',e,1);
  },{capture:true,passive:false});

  window.addEventListener('pointerup',e=>{
    if(e.pointerType==='mouse'&&e.pointerId===pointerId)finish(e);
  },{capture:true,passive:true});
  window.addEventListener('pointercancel',finish,{capture:true,passive:true});
  window.addEventListener('mouseup',e=>{if(e.button===0)finish(e)},{capture:true,passive:true});
  window.addEventListener('blur',()=>finish(),{passive:true});
  window.addEventListener('pagehide',()=>finish(),{passive:true});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)finish()},{passive:true});
})();
