(()=>{
  const NEAR_RADIUS=28;
  const CHECK_EVERY_MS=1200;
  let checks=0;

  function placeNearJohn(hawk,index){
    if(!hawk||!hawk.g||!hawk.velocity)return;
    const angle=(performance.now()*.00035)+(index*Math.PI);
    const distance=10+index*5;
    const x=john.position.x+Math.cos(angle)*distance;
    const z=john.position.z+Math.sin(angle)*distance;
    const y=heightAt(x,z)+6.5+index*1.4;
    hawk.g.position.set(x,y,z);

    const targetAngle=angle+1.1+(Math.random()-.5)*1.2;
    const targetDistance=14+Math.random()*12;
    const tx=john.position.x+Math.cos(targetAngle)*targetDistance;
    const tz=john.position.z+Math.sin(targetAngle)*targetDistance;
    hawk.target=new THREE.Vector3(tx,heightAt(tx,tz)+7+Math.random()*4,tz);
    hawk.targetAge=0;

    const direction=hawk.target.clone().sub(hawk.g.position).setY(0);
    if(direction.lengthSq()<.001)direction.set(0,0,1);
    direction.normalize();
    const speed=hawk.cruiseSpeed||6.5;
    hawk.velocity.set(direction.x*speed,0,direction.z*speed);
    hawk.lastVelocity.copy(hawk.velocity);
    hawk.flightDirection.copy(direction);
    hawk.g.visible=true;
    hawk.visual.visible=true;
  }

  const timer=setInterval(()=>{
    checks++;
    const hawks=(window.johnHawks||[]).filter(h=>h&&h.g&&h.isRiggedHawk);
    if(!hawks.length){
      if(checks>100)clearInterval(timer);
      return;
    }

    const nearby=hawks.filter(h=>{
      const dx=h.g.position.x-john.position.x;
      const dz=h.g.position.z-john.position.z;
      return Number.isFinite(dx)&&Number.isFinite(dz)&&Math.hypot(dx,dz)<=NEAR_RADIUS;
    });

    if(nearby.length===0)placeNearJohn(hawks[0],0);
    if(nearby.length<2&&hawks[1]&&!hawks[1].riderControlled)placeNearJohn(hawks[1],1);

    for(const animal of animals){
      if(animal.kind==='bird'&&!animal.isRiggedHawk){
        animal.disabled=true;
        animal.g.visible=false;
      }
    }
  },CHECK_EVERY_MS);
})();