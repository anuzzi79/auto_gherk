(async()=>{
  const HAWK_URL='hawk.glb?v=9';
  const status=document.getElementById('status');
  const HAWK_COUNT=5;
  const ISLAND_FLIGHT_RADIUS=52;
  const MAX_PITCH=Math.PI/9; // 20 gradi: il falco non può diventare verticale.

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

  /**
   * Orienta il flight frame usando la direzione prominente del volo.
   * La componente orizzontale decide sempre dove punta il becco.
   * La velocità verticale produce soltanto un pitch limitato a +/-20 gradi.
   */
  function orientAlongVelocity(hawk,vx,vy,vz,bankTarget=0,amount=.16){
    const horizontalSpeed=Math.hypot(vx,vz);

    // Un movimento quasi esclusivamente verticale non può cambiare la direzione del becco.
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

  function randomFlightTarget(currentPosition,minDistance=16){
    for(let attempt=0;attempt<24;attempt++){
      // Distribuzione uniforme sull'area, non intorno al centro né su una circonferenza.
      const radius=Math.sqrt(Math.random())*ISLAND_FLIGHT_RADIUS;
      const angle=Math.random()*Math.PI*2;
      const x=Math.cos(angle)*radius;
      const z=Math.sin(angle)*radius;
      if(Math.hypot(x-currentPosition.x,z-currentPosition.z)<minDistance)continue;
      const terrain=heightAt(x,z);
      const clearance=6+Math.random()*9;
      return new THREE.Vector3(x,terrain+clearance,z);
    }
    return new THREE.Vector3(-currentPosition.x,heightAt(-currentPosition.x,-currentPosition.z)+10,-currentPosition.z);
  }

  function signedHorizontalTurn(from,to){
    const cross=from.x*to.z-from.z*to.x;
    return THREE.MathUtils.clamp(cross,-1,1);
  }

  const loader=new GLTFLoader();
  loader.load(HAWK_URL,gltf=>{
    const clip=gltf.animations.find(a=>a.name==='metarig|Fly')||gltf.animations[0];
    const hawks=[];
    const starts=[
      {x:6,z:16,scale:1.55,speed:7.1},
      {x:-18,z:-4,scale:1.35,speed:8.0},
      {x:21,z:-15,scale:1.45,speed:7.5},
      {x:-25,z:17,scale:1.25,speed:8.4},
      {x:4,z:-27,scale:1.4,speed:7.8}
    ];

    for(const animal of animals){
      if(animal.kind==='bird'){
        animal.disabled=true;
        animal.g.visible=false;
      }
    }

    starts.slice(0,HAWK_COUNT).forEach((start,index)=>{
      const visual=index===0?gltf.scene:cloneSkeleton(gltf.scene);
      visual.name=`Sherkiz_Hawk_Visual_${index+1}`;
      visual.scale.setScalar(start.scale);
      visual.rotation.order='YXZ';
      // Il GLB guarda verso -Z; il flight frame considera +Z il proprio avanti.
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
      scene.add(flightFrame);

      const initialY=heightAt(start.x,start.z)+7+index*1.2;
      flightFrame.position.set(start.x,initialY,start.z);

      const target=randomFlightTarget(flightFrame.position,20);
      const initialDirection=target.clone().sub(flightFrame.position);
      initialDirection.y=0;
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
        g:flightFrame,
        visual,
        kind:'bird',
        isRiggedHawk:true,
        autonomousManaged:true,
        riderControlled:false,
        mixer,
        action,
        originalScale:flightFrame.scale.clone(),
        flapBoost:0,
        cruiseSpeed:start.speed,
        velocity,
        target,
        targetAge:0,
        wasControlled:false,
        lastVelocity:velocity.clone(),
        flightDirection:velocity.clone().setY(0).normalize()
      };
      orientAlongVelocity(hawk,velocity.x,0,velocity.z,0,1);
      animals.push(hawk);
      hawks.push(hawk);
    });

    window.orientHawkAlongVelocity=orientAlongVelocity;
    window.johnHawks=hawks;
    window.johnHawk=hawks[0];
    status.textContent=clip?`${hawks.length} falchi volano liberamente sull’isola`:`${hawks.length} falchi caricati senza animazione Fly`;

    const clock=new THREE.Clock();
    (function animateFreeHawks(){
      requestAnimationFrame(animateFreeHawks);
      const dt=Math.min(clock.getDelta(),.05);

      for(let index=0;index<hawks.length;index++){
        const hawk=hawks[index];
        const boost=hawk.flapBoost||0;
        if(hawk.action){
          const effort=Math.min(1,Math.abs(hawk.velocity.y)/5);
          const normalSpeed=.92+index*.04+effort*.18;
          hawk.action.timeScale=THREE.MathUtils.lerp(hawk.action.timeScale,normalSpeed+boost*1.45,.12);
        }
        hawk.mixer.update(dt);
        hawk.flapBoost=Math.max(0,boost-dt*1.35);

        if(hawk.riderControlled){
          hawk.wasControlled=true;
          continue;
        }

        if(hawk.wasControlled){
          // Dopo il rilascio conserva direzione e velocità acquisite dal giocatore.
          const inherited=hawk.lastVelocity.clone();
          if(Math.hypot(inherited.x,inherited.z)>.2){
            hawk.velocity.copy(inherited);
            const inheritedHorizontal=Math.hypot(hawk.velocity.x,hawk.velocity.z);
            if(inheritedHorizontal>hawk.cruiseSpeed*1.35){
              hawk.velocity.multiplyScalar((hawk.cruiseSpeed*1.35)/inheritedHorizontal);
            }
          }
          hawk.target=randomFlightTarget(hawk.g.position,22);
          hawk.targetAge=0;
          hawk.wasControlled=false;
        }

        hawk.targetAge+=dt;
        const toTarget=hawk.target.clone().sub(hawk.g.position);
        const horizontalDistance=Math.hypot(toTarget.x,toTarget.z);
        if(horizontalDistance<5||hawk.targetAge>15){
          hawk.target=randomFlightTarget(hawk.g.position,18);
          hawk.targetAge=0;
          toTarget.copy(hawk.target).sub(hawk.g.position);
        }

        // Direzione desiderata orizzontale: il falco non dipende dal centro dell'isola.
        const desiredHorizontal=new THREE.Vector3(toTarget.x,0,toTarget.z);
        if(desiredHorizontal.lengthSq()<.0001)desiredHorizontal.copy(hawk.flightDirection);
        desiredHorizontal.normalize();

        const currentHorizontal=new THREE.Vector3(hawk.velocity.x,0,hawk.velocity.z);
        if(currentHorizontal.lengthSq()<.0001)currentHorizontal.copy(desiredHorizontal);
        currentHorizontal.normalize();

        // Virata progressiva: la velocità non viene sostituita brutalmente.
        const turnRate=1-Math.exp(-1.25*dt);
        const steered=currentHorizontal.lerp(desiredHorizontal,turnRate).normalize();
        const desiredVx=steered.x*hawk.cruiseSpeed;
        const desiredVz=steered.z*hawk.cruiseSpeed;
        hawk.velocity.x=THREE.MathUtils.lerp(hawk.velocity.x,desiredVx,1-Math.exp(-1.8*dt));
        hawk.velocity.z=THREE.MathUtils.lerp(hawk.velocity.z,desiredVz,1-Math.exp(-1.8*dt));

        // Quota guidata da un obiettivo morbido, mai usata come direzione principale.
        const terrainHere=heightAt(hawk.g.position.x,hawk.g.position.z);
        const minimumY=terrainHere+5.5;
        const altitudeError=hawk.target.y-hawk.g.position.y;
        const desiredVy=THREE.MathUtils.clamp(altitudeError*.55,-2.8,2.8);
        hawk.velocity.y=THREE.MathUtils.lerp(hawk.velocity.y,desiredVy,1-Math.exp(-1.4*dt));
        if(hawk.g.position.y<minimumY){
          hawk.velocity.y=Math.max(hawk.velocity.y,(minimumY-hawk.g.position.y)*2.2);
        }

        // Allontanamento dal bordo senza alcun centro-orbita obbligatorio.
        const radial=Math.hypot(hawk.g.position.x,hawk.g.position.z);
        if(radial>ISLAND_FLIGHT_RADIUS+4){
          const inward=new THREE.Vector3(-hawk.g.position.x,0,-hawk.g.position.z).normalize();
          hawk.velocity.x+=inward.x*7*dt;
          hawk.velocity.z+=inward.z*7*dt;
          hawk.target=randomFlightTarget(hawk.g.position,20);
          hawk.targetAge=0;
        }

        const beforeDirection=currentHorizontal.clone();
        hawk.g.position.addScaledVector(hawk.velocity,dt);
        hawk.g.position.y=Math.max(hawk.g.position.y,heightAt(hawk.g.position.x,hawk.g.position.z)+5.2);

        const afterDirection=new THREE.Vector3(hawk.velocity.x,0,hawk.velocity.z).normalize();
        const turn=signedHorizontalTurn(beforeDirection,afterDirection);
        const bankTarget=THREE.MathUtils.clamp(turn*2.4,-.32,.32);
        orientAlongVelocity(hawk,hawk.velocity.x,hawk.velocity.y,hawk.velocity.z,bankTarget,.18);
      }
    })();
  },undefined,error=>{
    console.warn('Falco GLB non caricato:',error);
    status.textContent='Falco GLB non caricato: uso gli uccelli provvisori';
  });
})();