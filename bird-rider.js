(()=>{
  let ridingBird=null;
  let grabCooldown=0;
  let grabSequenceT=0;
  let grabStartY=0;

  function nearestReachableBird(maxDistance=3.7){
    let best=null,bestD=Infinity;
    for(const animal of animals){
      if(animal.kind!=='bird'||animal.riderControlled||animal.disabled||!animal.g.visible)continue;
      const dx=animal.g.position.x-john.position.x;
      const dy=animal.g.position.y-(john.position.y+2.2);
      const dz=animal.g.position.z-john.position.z;
      const d=Math.hypot(dx,dy,dz);
      if(d<bestD){bestD=d;best=animal;}
    }
    return bestD<maxDistance?best:null;
  }

  function setHangingPose(active){
    if(typeof leftArm!=='undefined'&&typeof rightArm!=='undefined'){
      if(active){
        leftArm.rotation.set(-.18,0,-2.82);
        rightArm.rotation.set(-.18,0,2.82);
        leftArm.position.set(-.43,2.94,.03);
        rightArm.position.set(.43,2.94,.03);
      }else if(typeof resetSlidePose==='function'){
        resetSlidePose();
      }else{
        leftArm.rotation.set(0,0,0);rightArm.rotation.set(0,0,0);
        leftArm.position.set(-.72,2.25,0);rightArm.position.set(.72,2.25,0);
      }
    }
    if(active){
      leg1.rotation.x=.42;leg2.rotation.x=-.28;
      john.rotation.x=.11;john.rotation.z=0;
    }
  }

  function attachToBird(bird){
    if(!bird||ridingBird||grabCooldown>0)return false;
    ridingBird=bird;
    bird.riderControlled=true;
    bird.originalScale=bird.originalScale||bird.g.scale.clone();
    if(!bird.isRiggedHawk)bird.g.scale.copy(bird.originalScale).multiplyScalar(1.65);
    airborne=false;verticalVelocity=0;jumpPushX=jumpPushZ=0;
    grabSequenceT=0;
    grabStartY=bird.g.position.y;
    bird.flapBoost=1;
    setHangingPose(true);
    document.getElementById('status').textContent='John afferra il falco: reggiti!';
    return true;
  }

  function releaseBird(){
    if(!ridingBird)return false;
    const bird=ridingBird;
    bird.riderControlled=false;
    if(bird.originalScale&&!bird.isRiggedHawk)bird.g.scale.copy(bird.originalScale);
    ridingBird=null;
    setHangingPose(false);
    airborne=true;
    verticalVelocity=2.8;
    jumpPushX=Math.sin(yaw)*4.2;
    jumpPushZ=Math.cos(yaw)*4.2;
    grabCooldown=.95;
    document.getElementById('status').textContent='John lascia il falco!';
    return true;
  }

  function toggleBirdRide(){
    if(ridingBird)return releaseBird();
    return false;
  }

  function updateGrabSequence(dt,t,bird){
    grabSequenceT+=dt;
    const duration=1.65;
    bird.flapBoost=Math.max(bird.flapBoost||0,1-grabSequenceT/duration);

    // 1) Il peso di John fa perdere quota al falco.
    // 2) Due/tre battiti energici recuperano gradualmente la quota.
    if(grabSequenceT<.38){
      const u=grabSequenceT/.38;
      bird.g.position.y=grabStartY-THREE.MathUtils.smoothstep(u,0,1)*1.35;
      bird.g.rotation.x=THREE.MathUtils.lerp(bird.g.rotation.x,.22,.18);
    }else if(grabSequenceT<duration){
      const u=(grabSequenceT-.38)/(duration-.38);
      const recovery=THREE.MathUtils.smoothstep(u,0,1);
      bird.g.position.y=THREE.MathUtils.lerp(grabStartY-1.35,grabStartY+.45,recovery);
      bird.g.rotation.x=THREE.MathUtils.lerp(bird.g.rotation.x,-.08,.12);
      bird.g.rotation.z=Math.sin(t*16)*(1-u)*.07;
    }else{
      document.getElementById('status').textContent='Falco sotto controllo — guidalo!';
      return false;
    }
    return true;
  }

  function updateBirdRide(dt,t,inputX,inputY,yawValue,pitchValue){
    grabCooldown=Math.max(0,grabCooldown-dt);

    // Il contatto durante il salto aggancia automaticamente John al falco.
    if(!ridingBird&&airborne&&grabCooldown<=0){
      const bird=nearestReachableBird();
      if(bird)attachToBird(bird);
    }

    if(!ridingBird)return false;
    const bird=ridingBird;

    if(grabSequenceT<1.65){
      updateGrabSequence(dt,t,bird);
    }else{
      const forward=-inputY;
      const side=-inputX;
      const fx=Math.sin(yawValue),fz=Math.cos(yawValue);
      const rx=Math.cos(yawValue),rz=-Math.sin(yawValue);
      let vx=fx*forward+rx*side;
      let vz=fz*forward+rz*side;
      const horizontal=Math.hypot(vx,vz);
      if(horizontal>.01){vx/=horizontal;vz/=horizontal;}
      const speed=horizontal>.01?10.5:2.2;
      bird.g.position.x+=vx*speed*dt;
      bird.g.position.z+=vz*speed*dt;
      const ground=heightAt(bird.g.position.x,bird.g.position.z);
      const climb=horizontal>.01?Math.max(-1,Math.min(1,-Math.sin(pitchValue)))*6.6:0;
      bird.g.position.y+=climb*dt;
      bird.g.position.y=Math.max(ground+5.1,Math.min(40,bird.g.position.y));
      if(horizontal>.01)bird.g.rotation.y=Math.atan2(vx,vz);
      bird.g.rotation.z=THREE.MathUtils.lerp(bird.g.rotation.z,-side*.28,.12);
      bird.g.rotation.x=THREE.MathUtils.lerp(bird.g.rotation.x,climb*.025,.1);
      bird.flapBoost=horizontal>.01?.25:0;
    }

    if(!bird.isRiggedHawk){
      const phase=t*8.5;
      const left=bird.g.children[1],right=bird.g.children[2];
      if(left&&right){
        const flap=Math.sin(phase)*1.05;
        left.rotation.z=.18+flap;right.rotation.z=-.18-flap;
      }
    }

    john.position.set(bird.g.position.x,bird.g.position.y-3.05,bird.g.position.z);
    john.rotation.y=bird.g.rotation.y;
    setHangingPose(true);
    leg1.rotation.x=.30+Math.sin(t*4)*.13;
    leg2.rotation.x=-.20+Math.sin(t*4+1.1)*.13;
    return true;
  }

  window.toggleBirdRide=toggleBirdRide;
  window.updateBirdRide=updateBirdRide;
  window.isRidingBird=()=>!!ridingBird;
})();
