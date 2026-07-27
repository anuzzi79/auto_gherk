(()=>{
  let attempts=0;
  const timer=setInterval(()=>{
    attempts++;
    const realHawks=animals.filter(animal=>animal.kind==='bird'&&animal.isRiggedHawk&&animal.g&&animal.g.visible);
    if(realHawks.length>0){
      for(const animal of animals){
        if(animal.kind==='bird'&&!animal.isRiggedHawk){
          animal.disabled=true;
          animal.g.visible=false;
        }
      }
      if(typeof status!=='undefined'&&status)status.textContent=`${realHawks.length} falchi reali attivi`;
      clearInterval(timer);
      return;
    }
    if(attempts>=200)clearInterval(timer);
  },100);
})();
