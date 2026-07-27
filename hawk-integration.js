(async()=>{
  const HAWK_URL='hawk.glb?v=3';
  const status=document.getElementById('status');

  let GLTFLoader;
  try{
    ({GLTFLoader}=await import('https://esm.sh/three@0.160.0/examples/jsm/loaders/GLTFLoader.js'));
  }catch(error){
    console.warn('GLTFLoader non disponibile:',error);
    status.textContent='Caricatore GLB non disponibile: uso gli uccelli provvisori';
    return;
  }

  const loader=new GLTFLoader();
  loader.load(HAWK_URL,gltf=>{
    const model=gltf.scene;
    model.name='Sherkiz_Hawk_Rigged';
    model.scale.setScalar(1.9);
    model.position.set(4,heightAt(4,18)+6.1,18);
    model.rotation.y=Math.PI;
    model.traverse(o=>{
      if(o.isMesh){
        o.castShadow=true;
        o.receiveShadow=true;
        o.frustumCulled=false;
      }
    });
    scene.add(model);

    const mixer=new THREE.AnimationMixer(model);
    const clip=gltf.animations.find(a=>a.name==='metarig|Fly')||gltf.animations[0];
    const action=clip?mixer.clipAction(clip):null;
    if(action){
      action.reset().setLoop(THREE.LoopRepeat,Infinity).play();
      action.timeScale=1;
    }

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
    status.textContent=clip?'Il falco animato sorvola l’isola':'Falco caricato senza animazione Fly';

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
    status.textContent='Falco GLB non caricato: uso gli uccelli provvisori';
  });
})();