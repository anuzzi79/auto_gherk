(()=>{
  let ridingBird=null;
  let grabCooldown=0;

  function nearestReachableBird(maxDistance=3.4){
    let best=null,bestD=Infinity;
    for(const animal of animals){
      if(animal.kind!=='bird'||animal.riderControlled)continue;
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
        leftArm.rotation.set(-.1,0,-2.72);
        rightArm.rotation.set(-.1,0,2.72);
        leftArm.position.set(-.48,2.82,0);
        rightArm.position.set(.48,2.82,0);
      }else if(typeof resetSlidePose==='function'){
        resetSlidePose();
      }else{
        leftArm.rotation.set(0,0,0);rightArm.rotation.set(0,0,0);
        leftArm.position.set(-.72,2.25,0);rightArm.position.set(.72,2.25,0);
      }
    }
    if(active){
      leg1.rotation.x=.38;leg2.rotation.x=-.24;
      john.rotation.x=.08;john.rotation.z=0;
    }
  }

  function attachToBird(bird){
    if(!bird||ridingBird||grabCooldown>0)return false;
    ridingBird=bird;
    bird.riderControlled=true;
    bird.originalScale=bird.originalScale||bird.g.scale.clone();
    bird.g.scale.copy(bird.originalScale).multiplyScalar(1.65);
    airborne=false;verticalVelocity=0;jumpPushX=jumpPushZ=0;
    setHangingPose(true);
    document.getElementById('status').textContent='John ha afferrato l’uccello — guidalo!';
    return true;
  }

  function releaseBird(){
    if(!ridingBird)return false;
    const bird=ridingBird;
    bird.riderControlled=false;
    if(bird.originalScale)bird.g.scale.copy(bird.originalScale);
    ridingBird=null;
    setHangingPose(false);
    airborne=true;
    verticalVelocity=2.8;
    jumpPushX=Math.sin(yaw)*4.2;
    jumpPushZ=Math.cos(yaw)*4.2;
    grabCooldown=.9;
    document.getElementById('status').textContent='John lascia l’uccello!';
    return true;
  }

  // JUMP mentre appeso = lascia la presa. L'aggancio, invece, è automatico.
  function toggleBirdRide(){
    if(ridingBird)return releaseBird();
    return false;
  }

  function updateBirdRide(dt,t,inputX,inputY,yawValue,pitchValue){
    grabCooldown=Math.max(0,grabCooldown-dt);

    // Aggancio automatico: John deve essere in aria e toccare il volume dell'uccello.
    if(!ridingBird&&airborne&&grabCooldown<=0){
      const bird=nearestReachableBird(3.15);
      if(bird)attachToBird(bird);
    }

    if(!ridingBird)return false;
    const bird=ridingBird;
    const forward=-inputY;
    const side=-inputX;
    const fx=Math.sin(yawValue),fz=Math.cos(yawValue);
    const rx=Math.cos(yawValue),rz=-Math.sin(yawValue);
    let vx=fx*forward+rx*side;
    let vz=fz*forward+rz*side;
    const horizontal=Math.hypot(vx,vz);
    if(horizontal>.01){vx/=horizontal;vz/=horizontal;}
    const speed=horizontal>.01?9.5:2.1;
    bird.g.position.x+=vx*speed*dt;
    bird.g.position.z+=vz*speed*dt;
    const ground=heightAt(bird.g.position.x,bird.g.position.z);
    const climb=horizontal>.01?Math.max(-1,Math.min(1,-Math.sin(pitchValue)))*6.2:0;
    bird.g.position.y+=climb*dt;
    bird.g.position.y=Math.max(ground+5.1,Math.min(38,bird.g.position.y));
    if(horizontal>.01)bird.g.rotation.y=Math.atan2(vx,vz);
    bird.g.rotation.z=THREE.MathUtils.lerp(bird.g.rotation.z,-side*.28,.12);
    bird.g.rotation.x=THREE.MathUtils.lerp(bird.g.rotation.x,climb*.025,.1);

    const phase=t*8.5;
    const left=bird.g.children[1],right=bird.g.children[2];
    if(left&&right){
      const flap=Math.sin(phase)*1.05;
      left.rotation.z=.18+flap;right.rotation.z=-.18-flap;
    }

    john.position.set(bird.g.position.x,bird.g.position.y-3.15,bird.g.position.z);
    john.rotation.y=bird.g.rotation.y;
    setHangingPose(true);
    leg1.rotation.x=.28+Math.sin(t*4)*.12;
    leg2.rotation.x=-.18+Math.sin(t*4+1.1)*.12;
    return true;
  }

  window.toggleBirdRide=toggleBirdRide;
  window.updateBirdRide=updateBirdRide;
  window.isRidingBird=()=>!!ridingBird;
})();