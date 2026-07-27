(async()=>{
  const HAWK_URL='hawk.glb?v=5';
  const status=document.getElementById('status');
  const HAWK_COUNT=5;

  let GLTFLoader,cloneSkeleton;
  try{
    const [loaderModule,skeletonModule]=await Promise.all([
      import('https://esm.sh/three@0.160.0/examples/jsm/loaders/GLTFLoader.js'),
      import('https://esm.sh/three@0.160.0/examples/jsm/utils/SkeletonUtils.js')
    ]);
    GLTFLoader=loaderModule.GLTFLoader;
    cloneSkeleton=skeletonModule.clone;
  }catch(error){
    console.warn('Moduli GLTF non disponibili:',error);
    status.textContent='Caricatore GLB non disponibile: uso gli uccelli provvisori';
    return;
  }

  const loader=new GLTFLoader();
  loader.load(HAWK_URL,gltf=>{
    const clip=gltf.animations.find(a=>a.name==='metarig|Fly')||gltf.animations[0];
    const hawks=[];
    const routes=[
      {cx:5,cz:13,r:9,base:8.5,omega:.24,phase:0,scale:1.55,bob:.7},
      {cx:-9,cz:-3,r:18,base:13,omega:-.16,phase:1.4,scale:1.35,bob:1.1},
      {cx:18,cz:-12,r:14,base:11,omega:.19,phase:2.8,scale:1.45,bob:.8},
      {cx:-20,cz:14,r:21,base:16,omega:-.13,phase:4.2,scale:1.25,bob:1.3},
      {cx:2,cz:-20,r:25,base:19,omega:.11,phase:5.3,scale:1.4,bob:1.5}
    ];

    for(const animal of animals){
      if(animal.kind==='bird'){
        animal.disabled=true;
        animal.g.visible=false;
      }
    }

    routes.slice(0,HAWK_COUNT).forEach((route,index)=>{
      const model=index===0?gltf.scene:cloneSkeleton(gltf.scene);
      model.name=`Sherkiz_Hawk_Rigged_${index+1}`;
      model.scale.setScalar(route.scale);
      model.traverse(o=>{
        if(o.isMesh){
          o.castShadow=true;
          o.receiveShadow=true;
          o.frustumCulled=false;
        }
      });
      scene.add(model);

      const mixer=new THREE.AnimationMixer(model);
      const action=clip?mixer.clipAction(clip):null;
      if(action){
        action.reset().setLoop(THREE.LoopRepeat,Infinity).play();
        action.time=index*.27;
        action.timeScale=.88+index*.055;
      }

      const hawk={
        g:model,
        a:route.phase,
        s:1.4,
        kind:'bird',
        isRiggedHawk:true,
        autonomousManaged:true,
        riderControlled:false,
        mixer,
        action,
        originalScale:model.scale.clone(),
        flapBoost:0,
        route:{...route},
        wasControlled:false
      };
      animals.push(hawk);
      hawks.push(hawk);
    });

    window.johnHawks=hawks;
    window.johnHawk=hawks[0];
    status.textContent=clip?`${hawks.length} falchi animati sorvolano l’isola`:`${hawks.length} falchi caricati senza animazione Fly`;

    const clock=new THREE.Clock();
    let elapsed=0;
    (function animateHawkFlock(){
      requestAnimationFrame(animateHawkFlock);
      const dt=Math.min(clock.getDelta(),.05);
      elapsed+=dt;

      for(const hawk of hawks){
        const boost=hawk.flapBoost||0;
        if(hawk.action){
          const normalSpeed=.95+(hawks.indexOf(hawk)*.045);
          hawk.action.timeScale=THREE.MathUtils.lerp(hawk.action.timeScale,normalSpeed+boost*1.45,.12);
        }
        hawk.mixer.update(dt);
        hawk.flapBoost=Math.max(0,boost-dt*1.35);

        if(hawk.riderControlled){
          hawk.wasControlled=true;
          continue;
        }

        const route=hawk.route;
        if(hawk.wasControlled){
          route.phase=Math.atan2(hawk.g.position.z-route.cz,hawk.g.position.x-route.cx)-elapsed*route.omega;
          hawk.wasControlled=false;
        }

        const angle=route.phase+elapsed*route.omega;
        const nextAngle=angle+route.omega*.04;
        const x=route.cx+Math.cos(angle)*route.r;
        const z=route.cz+Math.sin(angle)*route.r;
        const nx=route.cx+Math.cos(nextAngle)*route.r;
        const nz=route.cz+Math.sin(nextAngle)*route.r;
        const terrain=heightAt(x,z);
        const y=Math.max(terrain+5.4,route.base+Math.sin(elapsed*1.15+route.phase)*route.bob);

        hawk.g.position.set(x,y,z);
        hawk.g.rotation.y=Math.atan2(nx-x,nz-z);
        hawk.g.rotation.z=THREE.MathUtils.lerp(hawk.g.rotation.z,-Math.sign(route.omega)*.12,.08);
        hawk.g.rotation.x=THREE.MathUtils.lerp(hawk.g.rotation.x,Math.sin(elapsed*.7+route.phase)*.035,.08);
      }
    })();
  },undefined,error=>{
    console.warn('Falco GLB non caricato:',error);
    status.textContent='Falco GLB non caricato: uso gli uccelli provvisori';
  });
})();