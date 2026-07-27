(()=>{
  const HAWK_URL='assets/hawk.glb?v=1';
  const status=document.getElementById('status');

  if(typeof THREE.GLTFLoader!=='function'){
    console.warn('GLTFLoader non disponibile: mantengo gli uccelli provvisori.');
    return;
  }

  const loader=new THREE.GLTFLoader();
  loader.load(HAWK_URL,gltf=>{
    const model=gltf.scene;
    model.name='Sherkiz_Hawk_Rigged';
    model.scale.setScalar(1.9);
    model.position.set(4,heightAt(4,18)+6.1,18);
    model.rotation.y=Math.PI;
    model.traverse(o=>{
      if(o.isMesh){o.castShadow=true;o.receiveShadow=true;o.frustumCulled=false;}
    });
    scene.add(model);

    const mixer=new THREE.AnimationMixer(model);
    const clip=gltf.animations.find(a=>a.name==='metarig|Fly')||gltf.animations[0];
    const action=clip?mixer.clipAction(clip):null;
    if(action){action.reset().setLoop(THREE.LoopRepeat,Infinity).play();action.timeScale=1;}

    // Gli uccelli geometrici restano solo come fallback finché il GLB non è pronto.
    for(const animal of animals){
      if(animal.kind==='bird'){
        animal.disabled=true;
        animal.g.visible=false;
      }
    }

    const hawk={
      g:model,
      a:Math.PI,
      s:1.35,
      kind:'bird',
      isRiggedHawk:true,
      riderControlled:false,
      mixer,
      action,
      originalScale:model.scale.clone(),
      flapBoost:0
    };
    animals.push(hawk);
    window.johnHawk=hawk;
    status.textContent='Il falco animato sorvola l’isola';

    const clock=new THREE.Clock();
    (function animateHawkRig(){
      requestAnimationFrame(animateHawkRig);
      const dt=Math.min(clock.getDelta(),.05);
      const boost=hawk.flapBoost||0;
      if(action)action.timeScale=THREE.MathUtils.lerp(action.timeScale,1+boost*1.35,.12);
      mixer.update(dt);
      hawk.flapBoost=Math.max(0,boost-dt*1.35);
    })();
  },undefined,error=>{
    console.warn('Falco GLB non caricato:',error);
    status.textContent='Falco GLB non trovato: uso gli uccelli provvisori';
  });
})();
