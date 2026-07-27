(()=>{
  const waterMat=new THREE.MeshStandardMaterial({color:0x39cfff,transparent:true,opacity:.84,roughness:.1,metalness:.04,side:THREE.DoubleSide});
  const foamMat=new THREE.MeshBasicMaterial({color:0xeffcff,transparent:true,opacity:.84});
  const stoneMat=new THREE.MeshStandardMaterial({color:0x59665d,roughness:1});
  const darkStoneMat=new THREE.MeshStandardMaterial({color:0x25342e,roughness:1});

  const source={x:8,z:-2};
  const lip={x:20,z:-12};
  const poolCenter={x:22,z:-16};

  const riverPath=[
    [source.x,source.z],
    [10,-3.5],
    [12.5,-5],
    [14,-6.8],
    [16,-8.2],
    [18,-10],
    [lip.x,lip.z]
  ];

  function terrainPoint(x,z,offset=.1){
    return new THREE.Vector3(x,heightAt(x,z)+offset,z);
  }

  // Crea un tratto d'acqua come un rettangolo realmente inclinato tra due quote del terreno.
  function makeSlopeSegment(a,b,width){
    const p1=terrainPoint(a[0],a[1]);
    const p2=terrainPoint(b[0],b[1]);
    const direction=new THREE.Vector3().subVectors(p2,p1);
    const horizontal=new THREE.Vector3(direction.x,0,direction.z);
    const length=Math.max(.01,direction.length());
    const hLen=Math.max(.01,horizontal.length());

    const geometry=new THREE.PlaneGeometry(width,length,1,3);
    const mesh=new THREE.Mesh(geometry,waterMat.clone());

    // Il piano nasce verticale nell'asse Y: lo orientiamo lungo la direzione 3D reale del pendio.
    const midpoint=new THREE.Vector3().addVectors(p1,p2).multiplyScalar(.5);
    mesh.position.copy(midpoint);
    mesh.rotation.order='YXZ';
    mesh.rotation.y=Math.atan2(direction.x,direction.z);
    mesh.rotation.x=Math.atan2(hLen,-direction.y)-Math.PI/2;

    // Spostamento minimo lungo la normale per evitare sfarfallio col terreno.
    mesh.position.y+=.05;
    mesh.userData.flowPhase=Math.random()*Math.PI*2;
    return mesh;
  }

  const riverSegments=[];
  for(let i=0;i<riverPath.length-1;i++){
    const seg=makeSlopeSegment(riverPath[i],riverPath[i+1],2.1);
    scene.add(seg);
    riverSegments.push(seg);
  }

  // Piccole pozze intermedie solo dove la pendenza locale si riduce.
  for(let i=1;i<riverPath.length-1;i++){
    const [x,z]=riverPath[i];
    const y0=heightAt(riverPath[i-1][0],riverPath[i-1][1]);
    const y1=heightAt(x,z);
    const y2=heightAt(riverPath[i+1][0],riverPath[i+1][1]);
    if(Math.abs(y0-y1)<.7 || Math.abs(y1-y2)<.7){
      const eddy=new THREE.Mesh(new THREE.CircleGeometry(1.35,24),waterMat.clone());
      eddy.rotation.x=-Math.PI/2;
      eddy.position.set(x,y1+.12,z);
      eddy.scale.set(1.35,.8,1);
      scene.add(eddy);
    }
  }

  // Rocce sulle sponde, sempre appoggiate all'orografia.
  for(let i=1;i<riverPath.length-1;i++){
    const [x,z]=riverPath[i];
    const prev=riverPath[i-1],next=riverPath[i+1];
    const dx=next[0]-prev[0],dz=next[1]-prev[1],len=Math.hypot(dx,dz)||1;
    const nx=-dz/len,nz=dx/len;
    for(const side of[-1,1]){
      const rx=x+nx*(1.5+Math.random()*.7)*side;
      const rz=z+nz*(1.5+Math.random()*.7)*side;
      const s=.45+Math.random()*.75;
      const rock=new THREE.Mesh(new THREE.DodecahedronGeometry(s,0),stoneMat);
      rock.position.set(rx,heightAt(rx,rz)+s*.45,rz);
      rock.scale.y=.65;
      rock.rotation.set(Math.random(),Math.random(),Math.random());
      scene.add(rock);
    }
  }

  const topY=heightAt(lip.x,lip.z)+.18;
  const poolGround=heightAt(poolCenter.x,poolCenter.z);
  const bottomY=poolGround+.35;
  const fallHeight=Math.max(3.5,topY-bottomY);

  // La caduta è orientata tra il ciglio e il punto d'impatto reale, non perfettamente verticale.
  const fallTop=new THREE.Vector3(lip.x,topY,lip.z);
  const fallBottom=new THREE.Vector3(poolCenter.x,bottomY+.3,poolCenter.z-1.5);
  const fallDir=new THREE.Vector3().subVectors(fallBottom,fallTop);
  const fallLength=fallDir.length();
  const waterfall=new THREE.Mesh(new THREE.PlaneGeometry(3.2,fallLength,1,20),waterMat.clone());
  waterfall.position.copy(new THREE.Vector3().addVectors(fallTop,fallBottom).multiplyScalar(.5));
  waterfall.rotation.order='YXZ';
  waterfall.rotation.y=Math.atan2(fallDir.x,fallDir.z);
  waterfall.rotation.x=Math.atan2(Math.hypot(fallDir.x,fallDir.z),-fallDir.y)-Math.PI/2;
  scene.add(waterfall);

  // Parete rocciosa irregolare modellata seguendo le quote del terreno attorno al salto.
  for(let i=0;i<20;i++){
    const t=i/19;
    const rx=THREE.MathUtils.lerp(lip.x,poolCenter.x,t)+(Math.random()-.5)*7;
    const rz=THREE.MathUtils.lerp(lip.z,poolCenter.z-1.5,t)+(Math.random()-.5)*3.2;
    const naturalY=heightAt(rx,rz);
    const targetY=THREE.MathUtils.lerp(bottomY,topY,t);
    const s=1.1+Math.random()*2;
    const rock=new THREE.Mesh(new THREE.DodecahedronGeometry(s,0),i%4===0?darkStoneMat:stoneMat);
    rock.position.set(rx,Math.max(naturalY+s*.35,targetY+(Math.random()-.5)*1.1),rz);
    rock.scale.set(1,.72,1.15);
    rock.rotation.set(Math.random(),Math.random(),Math.random());
    rock.castShadow=true;
    scene.add(rock);
  }

  const pool=new THREE.Mesh(new THREE.CircleGeometry(7.5,48),waterMat.clone());
  pool.rotation.x=-Math.PI/2;
  pool.scale.set(1.25,.85,1);
  pool.position.set(poolCenter.x,bottomY,poolCenter.z);
  scene.add(pool);

  const caveDark=new THREE.Mesh(new THREE.CircleGeometry(2.2,28),new THREE.MeshBasicMaterial({color:0x06110d}));
  caveDark.position.set(lip.x-2,bottomY+1.8,lip.z-1.05);
  caveDark.rotation.y=.15;
  scene.add(caveDark);

  const spray=[];
  for(let i=0;i<34;i++){
    const s=new THREE.Mesh(new THREE.SphereGeometry(.12+Math.random()*.2,7,5),foamMat);
    s.position.set(poolCenter.x+(Math.random()-.5)*5,bottomY+.15+Math.random()*1.3,poolCenter.z-1+Math.random()*4);
    s.userData={baseY:s.position.y,phase:Math.random()*Math.PI*2};
    scene.add(s);
    spray.push(s);
  }

  const mistGeo=new THREE.BufferGeometry(),mistN=320,mistPos=new Float32Array(mistN*3);
  for(let i=0;i<mistN;i++){
    mistPos[i*3]=(Math.random()-.5)*9;
    mistPos[i*3+1]=Math.random()*4;
    mistPos[i*3+2]=(Math.random()-.5)*8;
  }
  mistGeo.setAttribute('position',new THREE.BufferAttribute(mistPos,3));
  const mist=new THREE.Points(mistGeo,new THREE.PointsMaterial({color:0xe4fbff,size:.26,transparent:true,opacity:.42,depthWrite:false}));
  mist.position.set(poolCenter.x,bottomY+.25,poolCenter.z-1);
  scene.add(mist);

  let found=false;
  function tick(){
    requestAnimationFrame(tick);
    const t=performance.now()*.001;
    riverSegments.forEach((seg,i)=>{
      seg.material.opacity=.77+Math.sin(t*2.4+i*.7+seg.userData.flowPhase)*.045;
    });
    waterfall.material.opacity=.74+Math.sin(t*5.3)*.08;
    waterfall.scale.x=1+Math.sin(t*2.6)*.035;
    pool.material.opacity=.74+Math.sin(t*1.4)*.05;
    spray.forEach(s=>{s.position.y=s.userData.baseY+Math.sin(t*4+s.userData.phase)*.18;});
    mist.rotation.y=t*.06;
    const d=Math.hypot(john.position.x-poolCenter.x,john.position.z-poolCenter.z);
    if(d<13&&!found){
      found=true;
      document.getElementById('status').textContent='Hai scoperto la cascata naturale!';
    }
  }
  tick();
})();