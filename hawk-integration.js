(async()=>{
  const HAWK_URL='hawk.glb?v=10';
  const status=document.getElementById('status');
  const HAWK_COUNT=5;
  const ISLAND_FLIGHT_RADIUS=50;
  const MAX_PITCH=Math.PI/9;
  let GLTFLoader,cloneSkeleton;

  function showFallback(message){
    for(const animal of animals){
      if(animal.kind==='bird'&&!animal.isRiggedHawk){
        animal.disabled=false;
        animal.g.visible=true;
      }
    }
    if(status)status.textContent=message;
  }

  try{
    const [loaderModule,skeletonModule]=await Promise.all([
      import('https://esm.sh/three@0.160.0/examples/jsm/loaders/GLTFLoader.js'),
      import('https://esm.sh/three@0.160.0/examples/jsm/utils/SkeletonUtils.js')
    ]);
    GLTFLoader=loaderModule.GLTFLoader;
    cloneSkeleton=skeletonModule.clone;
  }catch(error){
    console.error('Moduli GLTF non disponibili:',error);
    showFallback('Uso gli uccelli provvisori');
    return;
  }

  function lerpAngle(current,target,amount){
    const delta=Math.atan2(Math.sin(target-current),Math.cos(target-current));
    return current+delta*amount;
  }

  function orientAlongVelocity(hawk,vx,vy,vz,bankTarget=0,amount=.16){
    const horizontalSpeed=Math.hypot(vx,vz);
    if(horizontalSpeed>.08){
      const horizontalDirection=new THREE.Vector3(vx,0,vz).normalize();
      if(!hawk.flightDirection||hawk.flightDirection.lengthSq()<.000001){
        hawk.flightDirection=horizontalDirection.clone();
      }else{
        hawk.flightDirection.lerp(horizontalDirection,Math.min(1,amount*2.2)).normalize();
      }
    }
    if(!hawk.flightDirection||hawk.flightDirection.lengthSq()<.000001)return;
    const targetYaw=Math.atan2(hawk.flightDirection.x,hawk.flightDirection.z);
    const rawPitch=horizontalSpeed>.08?-Math.atan2(vy,horizontalSpeed):0;
    const targetPitch=THREE.MathUtils.clamp(rawPitch,-MAX_PITCH,MAX_PITCH);
    hawk.g.rotation.order='YXZ';
    hawk.g.rotation.y=lerpAngle(hawk.g.rotation.y,targetYaw,amount);
    hawk.g.rotation.x=THREE.MathUtils.lerp(hawk.g.rotation.x,targetPitch,amount);
    hawk.g.rotation.z=THREE.MathUtils.lerp(hawk.g.rotation.z,bankTarget,amount*.8);
    hawk.lastVelocity.set(vx,vy,vz);
  }

  function randomFlightTarget(currentPosition,minDistance=14){
    for(let attempt=0;attempt<30;attempt++){
      const radius=Math.sqrt(Math.random())*ISLAND_FLIGHT_RADIUS;
      const angle=Math.random()*Math.PI*2;
      const x=Math.cos(angle)*radius;
      const z=Math.sin(angle)*radius;
      if(Math.hypot(x-currentPosition.x,z-currentPosition.z)<minDistance)continue;
      return new THREE.Vector3(x,heightAt(x,z)+7+Math.random()*7,z);
    }
    return new THREE.Vector3(0,heightAt(0,0)+11,0);
  }

  function signedHorizontalTurn(from,to){
    return THREE.MathUtils.clamp(from.x*to.z-from.z*to.x,-1,1);
  }

  function validVector3(v){
    return Number.isFinite(v.x)&&Number.isFinite(v.y)&&Number.isFinite(v.z);
  }

  const loader=new GLTFLoader();
  loader.load(HAWK_URL,gltf=>{
    const created=[];
    try{
      const clip=gltf.animations.find(a=>a.name==='metarig|Fly')||gltf.animations[0];
      const johnX=Number.isFinite(john.position.x)?john.position.x:0;
      const johnZ=Number.isFinite(john.position.z)?john.position.z:18;
      const starts=[
        {x:johnX+7,z:johnZ-3,scale:1.65,speed:6.4},
        {x:-13,z:5,scale:1.38,speed:7.2},
        {x:19,z:-10,scale:1.48,speed:7.0},
        {x:-23,z:18,scale:1.30,speed:7.7},
        {x:5,z:-24,scale:1.42,speed:7.4}
      ];
      const hawks=[];

      starts.slice(0,HAWK_COUNT).forEach((start,index)=>{
        const visual=index===0?gltf.scene:cloneSkeleton(gltf.scene);
        visual.name=`Sherkiz_Hawk_Visual_${index+1}`;
        visual.scale.setScalar(start.scale);
        visual.rotation.order='YXZ';
        visual.rotation.set(0,Math.PI,0);
        visual.traverse(o=>{
          if(o.isMesh){
            o.castShadow=true;
            o.receiveShadow=true;
            o.frustumCulled=false;
          }
        });

        const flightFrame=new THREE.Group();
        flightFrame.name=`Hawk_Flight_Frame_${index+1}`;
        flightFrame.rotation.order='YXZ';
        flightFrame.add(visual);
        const initialY=heightAt(start.x,start.z)+7.5+index*.8;
        flightFrame.position.set(start.x,initialY,start.z);
        scene.add(flightFrame);
        created.push(flightFrame);

        const target=randomFlightTarget(flightFrame.position,18);
        const initialDirection=target.clone().sub(flightFrame.position).setY(0);
        if(initialDirection.lengthSq()<.001)initialDirection.set(0,0,1);
        initialDirection.normalize();
        const velocity=initialDirection.multiplyScalar(start.speed);

        const mixer=new THREE.AnimationMixer(visual);
        const action=clip?mixer.clipAction(clip):null;
        if(action){
          action.reset().setLoop(THREE.LoopRepeat,Infinity).play();
          action.time=index*.31;
          action.timeScale=.9+index*.05;
        }

        const hawk={
          g:flightFrame,visual,kind:'bird',isRiggedHawk:true,
          autonomousManaged:true,riderControlled:false,mixer,action,
          originalScale:flightFrame.scale.clone(),flapBoost:0,
          cruiseSpeed:start.speed,velocity,target,targetAge:0,
          wasControlled:false,lastVelocity:velocity.clone(),
          flightDirection:velocity.clone().setY(0).normalize(),
          safeStart:flightFrame.position.clone()
        };
        orientAlongVelocity(hawk,velocity.x,0,velocity.z,0,1);
        animals.push(hawk);
        hawks.push(hawk);
      });

      if(hawks.length!==HAWK_COUNT)throw new Error('Stormo incompleto');

      // Nasconde i provvisori soltanto dopo la creazione completa dello stormo reale.
      for(const animal of animals){
        if(animal.kind==='bird'&&!animal.isRiggedHawk){
          animal.disabled=true;
          animal.g.visible=false;
        }
      }

      window.orientHawkAlongVelocity=orientAlongVelocity;
      window.johnHawks=hawks;
      window.johnHawk=hawks[0];
      if(status)status.textContent=`${hawks.length} falchi volano liberamente sull’isola`;

      const clock=new THREE.Clock();
      (function animateFreeHawks(){
        requestAnimationFrame(animateFreeHawks);
        const dt=Math.min(clock.getDelta(),.05);
        for(let index=0;index<hawks.length;index++){
          const hawk=hawks[index];
          const boost=hawk.flapBoost||0;
          if(hawk.action){
            const effort=Math.min(1,Math.abs(hawk.velocity.y)/5);
            hawk.action.timeScale=THREE.MathUtils.lerp(hawk.action.timeScale,.92+index*.04+effort*.18+boost*1.45,.12);
          }
          hawk.mixer.update(dt);
          hawk.flapBoost=Math.max(0,boost-dt*1.35);

          if(hawk.riderControlled){
            hawk.wasControlled=true;
            continue;
          }

          if(!validVector3(hawk.g.position)||!validVector3(hawk.velocity)){
            hawk.g.position.copy(hawk.safeStart);
            hawk.target=randomFlightTarget(hawk.g.position,18);
            hawk.velocity.copy(hawk.target).sub(hawk.g.position).setY(0).normalize().multiplyScalar(hawk.cruiseSpeed);
          }

          if(hawk.wasControlled){
            const inherited=hawk.lastVelocity.clone();
            if(Math.hypot(inherited.x,inherited.z)>.2)hawk.velocity.copy(inherited);
            hawk.target=randomFlightTarget(hawk.g.position,20);
            hawk.targetAge=0;
            hawk.wasControlled=false;
          }

          hawk.targetAge+=dt;
          const toTarget=hawk.target.clone().sub(hawk.g.position);
          const horizontalDistance=Math.hypot(toTarget.x,toTarget.z);
          if(horizontalDistance<4.5||hawk.targetAge>14){
            hawk.target=randomFlightTarget(hawk.g.position,16);
            hawk.targetAge=0;
            toTarget.copy(hawk.target).sub(hawk.g.position);
          }

          const desiredHorizontal=new THREE.Vector3(toTarget.x,0,toTarget.z);
          if(desiredHorizontal.lengthSq()<.0001)desiredHorizontal.copy(hawk.flightDirection);
          desiredHorizontal.normalize();
          const currentHorizontal=new THREE.Vector3(hawk.velocity.x,0,hawk.velocity.z);
          if(currentHorizontal.lengthSq()<.0001)currentHorizontal.copy(desiredHorizontal);
          currentHorizontal.normalize();
          const beforeDirection=currentHorizontal.clone();
          const steered=currentHorizontal.lerp(desiredHorizontal,1-Math.exp(-1.15*dt)).normalize();
          hawk.velocity.x=THREE.MathUtils.lerp(hawk.velocity.x,steered.x*hawk.cruiseSpeed,1-Math.exp(-1.7*dt));
          hawk.velocity.z=THREE.MathUtils.lerp(hawk.velocity.z,steered.z*hawk.cruiseSpeed,1-Math.exp(-1.7*dt));

          const minimumY=heightAt(hawk.g.position.x,hawk.g.position.z)+5.8;
          const desiredVy=THREE.MathUtils.clamp((hawk.target.y-hawk.g.position.y)*.48,-2.4,2.4);
          hawk.velocity.y=THREE.MathUtils.lerp(hawk.velocity.y,desiredVy,1-Math.exp(-1.25*dt));
          if(hawk.g.position.y<minimumY)hawk.velocity.y=Math.max(hawk.velocity.y,(minimumY-hawk.g.position.y)*2);

          const radial=Math.hypot(hawk.g.position.x,hawk.g.position.z);
          if(radial>ISLAND_FLIGHT_RADIUS+5){
            const inward=new THREE.Vector3(-hawk.g.position.x,0,-hawk.g.position.z).normalize();
            hawk.velocity.x+=inward.x*9*dt;
            hawk.velocity.z+=inward.z*9*dt;
            hawk.target=randomFlightTarget(hawk.g.position,18);
            hawk.targetAge=0;
          }

          hawk.g.position.addScaledVector(hawk.velocity,dt);
          hawk.g.position.y=Math.max(hawk.g.position.y,heightAt(hawk.g.position.x,hawk.g.position.z)+5.3);
          const afterDirection=new THREE.Vector3(hawk.velocity.x,0,hawk.velocity.z).normalize();
          const bankTarget=THREE.MathUtils.clamp(signedHorizontalTurn(beforeDirection,afterDirection)*2.2,-.28,.28);
          orientAlongVelocity(hawk,hawk.velocity.x,hawk.velocity.y,hawk.velocity.z,bankTarget,.18);
        }
      })();
    }catch(error){
      console.error('Errore nella creazione dello stormo:',error);
      for(const object of created)scene.remove(object);
      showFallback('Errore falchi reali: ripristinati gli uccelli provvisori');
    }
  },undefined,error=>{
    console.error('Falco GLB non caricato:',error);
    showFallback('Falco GLB non caricato: uso gli uccelli provvisori');
  });
})();