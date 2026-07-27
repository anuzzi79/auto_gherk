(()=>{
  const waterMat=new THREE.MeshStandardMaterial({color:0x32c8e6,transparent:true,opacity:.82,roughness:.14,metalness:.03,side:THREE.DoubleSide});
  const foamMat=new THREE.MeshBasicMaterial({color:0xf2fdff,transparent:true,opacity:.88});
  const stoneMat=new THREE.MeshStandardMaterial({color:0x59665d,roughness:1});
  const darkStoneMat=new THREE.MeshStandardMaterial({color:0x26352f,roughness:1});

  const lip={x:20,z:-12};

  function terrainGradient(x,z){
    const e=.45;
    return {
      dx:(heightAt(x+e,z)-heightAt(x-e,z))/(2*e),
      dz:(heightAt(x,z+e)-heightAt(x,z-e))/(2*e)
    };
  }

  function traceDownhill(startX,startZ,steps,stepSize){
    const pts=[];
    let x=startX,z=startZ;
    for(let i=0;i<steps;i++){
      pts.push([x,z]);
      const g=terrainGradient(x,z);
      let dx=-g.dx,dz=-g.dz;
      const len=Math.hypot(dx,dz);
      if(len<.025){
        dx=.55;dz=-.85;
      }else{
        dx/=len;dz/=len;
      }
      // lieve inerzia verso la costa per evitare oscillazioni locali
      dx=dx*.82+.18*.45;
      dz=dz*.82-.18*.9;
      const n=Math.hypot(dx,dz)||1;
      x+=dx/n*stepSize;
      z+=dz/n*stepSize;
      if(Math.hypot(x,z)>63)break;
    }
    return pts;
  }

  function ribbonFromTerrain(points,width,material,yOffset=.08){
    const verts=[];
    for(let i=0;i<points.length;i++){
      const [x,z]=points[i];
      const prev=points[Math.max(0,i-1)],next=points[Math.min(points.length-1,i+1)];
      const dx=next[0]-prev[0],dz=next[1]-prev[1],len=Math.hypot(dx,dz)||1;
      const nx=-dz/len,nz=dx/len;
      const leftX=x+nx*width,leftZ=z+nz*width;
      const rightX=x-nx*width,rightZ=z-nz*width;
      verts.push(
        leftX,heightAt(leftX,leftZ)+yOffset,leftZ,
        rightX,heightAt(rightX,rightZ)+yOffset,rightZ
      );
    }
    const indices=[];
    for(let i=0;i<points.length-1;i++){
      const a=i*2,b=a+1,c=a+2,d=a+3;
      indices.push(a,b,c,b,d,c);
    }
    const geo=new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));
    geo.setIndex(indices);geo.computeVertexNormals();
    return new THREE.Mesh(geo,material.clone());
  }

  // Corso superiore: aderisce al pendio fino al bordo della cascata.
  const upperPath=traceDownhill(8,-2,18,1.05);
  upperPath.push([lip.x,lip.z]);
  const upperStream=ribbonFromTerrain(upperPath,.78,waterMat,.1);
  scene.add(upperStream);

  const topY=heightAt(lip.x,lip.z)+.18;
  const impactX=21.5,impactZ=-15.8;
  const impactY=heightAt(impactX,impactZ)+.12;
  const fallHeight=Math.max(3.5,topY-impactY);
  const waterfall=new THREE.Mesh(new THREE.PlaneGeometry(2.8,fallHeight,1,18),waterMat.clone());
  waterfall.position.set((lip.x+impactX)/2,(topY+impactY)/2,(lip.z+impactZ)/2);
  const dz=impactZ-lip.z,dx=impactX-lip.x;
  waterfall.rotation.y=Math.atan2(dx,dz);
  waterfall.rotation.x=-Math.atan2(Math.hypot(dx,dz),fallHeight);
  scene.add(waterfall);

  // Piccola vasca d'impatto, non una mezzaluna sospesa.
  const impactPool=new THREE.Mesh(new THREE.CircleGeometry(2.15,36),waterMat.clone());
  impactPool.rotation.x=-Math.PI/2;
  impactPool.scale.set(1.15,.78,1);
  impactPool.position.set(impactX,impactY,impactZ);
  scene.add(impactPool);

  // Uscita della vasca: segue automaticamente la massima discesa fino alla costa.
  const runoffPath=traceDownhill(impactX+.7,impactZ-.4,56,.92);
  const runoff=ribbonFromTerrain(runoffPath,.62,waterMat,.075);
  scene.add(runoff);

  // Rocce lungo cascata e torrente, appoggiate alla quota reale.
  const allPath=upperPath.concat(runoffPath);
  for(let i=2;i<allPath.length;i+=3){
    const [x,z]=allPath[i],prev=allPath[Math.max(0,i-1)],next=allPath[Math.min(allPath.length-1,i+1)];
    const dx=next[0]-prev[0],dz=next[1]-prev[1],len=Math.hypot(dx,dz)||1;
    const nx=-dz/len,nz=dx/len;
    for(const side of[-1,1]){
      const rx=x+nx*(1.05+Math.random()*.65)*side;
      const rz=z+nz*(1.05+Math.random()*.65)*side;
      const s=.4+Math.random()*.85;
      const rock=new THREE.Mesh(new THREE.DodecahedronGeometry(s,0),Math.random()>.2?stoneMat:darkStoneMat);
      rock.position.set(rx,heightAt(rx,rz)+s*.4,rz);
      rock.scale.y=.65;rock.rotation.set(Math.random(),Math.random(),Math.random());
      scene.add(rock);
    }
  }

  const caveDark=new THREE.Mesh(new THREE.CircleGeometry(1.8,26),new THREE.MeshBasicMaterial({color:0x06110d}));
  caveDark.position.set(lip.x-2.2,impactY+1.6,lip.z-.85);
  caveDark.rotation.y=.18;
  scene.add(caveDark);

  const spray=[];
  for(let i=0;i<30;i++){
    const s=new THREE.Mesh(new THREE.SphereGeometry(.1+Math.random()*.16,7,5),foamMat);
    s.position.set(impactX+(Math.random()-.5)*3.8,impactY+.18+Math.random()*1.15,impactZ+(Math.random()-.5)*3.2);
    s.userData={baseY:s.position.y,phase:Math.random()*Math.PI*2};
    scene.add(s);spray.push(s);
  }

  let found=false;
  function tick(){
    requestAnimationFrame(tick);
    const t=performance.now()*.001;
    upperStream.material.opacity=.77+Math.sin(t*2.1)*.04;
    runoff.material.opacity=.76+Math.sin(t*2.4)*.035;
    waterfall.material.opacity=.73+Math.sin(t*5.1)*.08;
    impactPool.material.opacity=.75+Math.sin(t*1.5)*.04;
    spray.forEach(s=>s.position.y=s.userData.baseY+Math.sin(t*4+s.userData.phase)*.16);
    const d=Math.hypot(john.position.x-impactX,john.position.z-impactZ);
    if(d<11&&!found){found=true;document.getElementById('status').textContent='Hai scoperto il torrente della cascata!';}
  }
  tick();
})();