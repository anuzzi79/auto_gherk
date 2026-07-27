(async()=>{
  const HAWK_URL='hawk.glb?v=6';
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

  function lerpAngle(current,target,amount){
    const delta=Math.atan2(Math.sin(target-current),Math.cos(target-current));
    return current+delta*amount;
  }

  function orientAlongVelocity(hawk,vx,vy,vz,bankTarget=0,amount=.16){
    const horizontal=Math.hypot(vx,vz);
    if(horizontal<.0001&&Math.abs(vy)<.0001)return;
    const targetYaw=Math.atan2(vx,vz);
    const targetPitch=-Math.atan2(vy,Math.max(.0001,horizontal));
    hawk.g.rotation.order='YXZ';
    hawk.g.rotation.y=lerpAngle(hawk.g.rotation.y,targetYaw,amount);
    hawk.g.rotation.x=THREE.MathUtils.lerp(hawk.g.rotation.x,targetPitch,amount);
    hawk.g.rotation.z=THREE.MathUtils.lerp(hawk.g.rotation.z,bankTarget,amount*.8);
    hawk.lastVelocity.set(vx,vy,vz);
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
      model.rotation.order='YXZ';
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

      const angle=route.phase;
      const initialX=route.cx+Math.cos(angle)*route.r;
      const initialZ=route.cz+Math.sin(angle)*route.r;
      const initialY=Math.max(heightAt(initialX,initialZ)+5.4,route.base);
      model.position.set(initialX,initialY,initialZ);

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
        wasControlled:false,
        previousPosition:model.position.clone(),
        lastVelocity:new THREE.Vector3()
      };
      animals.push(hawk);
      hawks.push(hawk);
    });

    window.orientHawkAlongVelocity=orientAlongVelocity;
    window.johnHawks=hawks;
    window.johnHawk=hawks[0];
    status.textContent=clip?`${hawks.length} falchi animati sorvolano l’isola`:`${hawks.length} falchi caricati senza animazione Fly`;

    const clock=new THREE.Clock();
    let elapsed=0;
    (function animateHawkFlock(){
      requestAnimationFrame(animateHawkFlock);
      const dt=Math.min(clock.getDelta(),.05);
      elapsed+=dt;

      for(let index=0;index<hawks.length;index++){
        const hawk=hawks[index];
        const boost=hawk.flapBoost||0;
        if(hawk.action){
          const normalSpeed=.95+index*.045;
          hawk.action.timeScale=THREE.MathUtils.lerp(hawk.action.timeScale,normalSpeed+boost*1.45,.12);
        }
        hawk.mixer.update(dt);
        hawk.flapBoost=Math.max(0,boost-dt*1.35);

        if(hawk.riderControlled){
          hawk.wasControlled=true;
          hawk.previousPosition.copy(hawk.g.position);
          continue;
        }

        const route=hawk.route;
        if(hawk.wasControlled){
          route.phase=Math.atan2(hawk.g.position.z-route.cz,hawk.g.position.x-route.cx)-elapsed*route.omega;
          hawk.wasControlled=false;
          hawk.previousPosition.copy(hawk.g.position);
        }

        const angle=route.phase+elapsed*route.omega;
        const x=route.cx+Math.cos(angle)*route.r;
        const z=route.cz+Math.sin(angle)*route.r;
        const terrain=heightAt(x,z);
        const y=Math.max(terrain+5.4,route.base+Math.sin(elapsed*1.15+route.phase)*route.bob);

        const vx=(x-hawk.previousPosition.x)/Math.max(dt,.001);
        const vy=(y-hawk.previousPosition.y)/Math.max(dt,.001);
        const vz=(z-hawk.previousPosition.z)/Math.max(dt,.001);
        hawk.g.position.set(x,y,z);

        const turnBank=-Math.sign(route.omega)*Math.min(.24,Math.abs(route.omega)*.9);
        orientAlongVelocity(hawk,vx,vy,vz,turnBank,.18);
        hawk.previousPosition.copy(hawk.g.position);
      }
    })();
  },undefined,error=>{
    console.warn('Falco GLB non caricato:',error);
    status.textContent='Falco GLB non caricato: uso gli uccelli provvisori';
  });
})();