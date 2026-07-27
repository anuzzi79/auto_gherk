(()=>{
  const waterMat=new THREE.MeshStandardMaterial({color:0x39cfff,transparent:true,opacity:.82,roughness:.12,metalness:.05,side:THREE.DoubleSide});
  const foamMat=new THREE.MeshBasicMaterial({color:0xeffcff,transparent:true,opacity:.82});
  const stoneMat=new THREE.MeshStandardMaterial({color:0x59665d,roughness:1});
  const darkStoneMat=new THREE.MeshStandardMaterial({color:0x25342e,roughness:1});

  const source={x:8,z:-2};
  const lip={x:20,z:-12};
  const poolCenter={x:22,z:-16};

  // Il torrente segue davvero la quota del terreno: ogni punto usa heightAt(x,z).
  const riverPath=[
    [source.x,source.z],
    [10,-3.5],
    [12.5,-5],
    [14,-6.8],
    [16,-8.2],
    [18,-10],
    [lip.x,lip.z]
  ];

  function makeRiverRibbon(points,width){
    const verts=[];
    for(let i=0;i<points.length;i++){
      const [x,z]=points[i];
      const prev=points[Math.max(0,i-1)],next=points[Math.min(points.length-1,i+1)];
      const dx=next[0]-prev[0],dz=next[1]-prev[1];
      const len=Math.hypot(dx,dz)||1;
      const nx=-dz/len,nz=dx/len;
      const y=heightAt(x,z)+.12;
      verts.push(x+nx*width,y,z+nz*width,x-nx*width,y,z-nz*width);
    }
    const indices=[];
    for(let i=0;i<points.length-1;i++){
      const a=i*2,b=a+1,c=a+2,d=a+3;
      indices.push(a,b,c,b,d,c);
    }
    const g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));
    g.setIndex(indices);g.computeVertexNormals();
    return new THREE.Mesh(g,waterMat.clone());
  }

  const river=makeRiverRibbon(riverPath,1.05);
  scene.add(river);

  // Rocce sulle sponde, anch'esse appoggiate all'orografia reale.
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
      rock.scale.y=.65;rock.rotation.set(Math.random(),Math.random(),Math.random());
      scene.add(rock);
    }
  }

  // La caduta inizia solo al bordo del salto naturale.
  const topY=heightAt(lip.x,lip.z)+.25;
  const poolGround=heightAt(poolCenter.x,poolCenter.z);
  const bottomY=poolGround+.35;
  const fallHeight=Math.max(4,topY-bottomY);
  const waterfall=new THREE.Mesh(new THREE.PlaneGeometry(3.2,fallHeight,1,18),waterMat.clone());
  waterfall.position.set(lip.x,(topY+bottomY)/2,lip.z-.35);
  waterfall.rotation.y=-.18;
  scene.add(waterfall);

  // Parete rocciosa irregolare dietro al salto, non un blocco rettangolare unico.
  for(let i=0;i<18;i++){
    const a=i/17;
    const rx=lip.x+(Math.random()-.5)*8;
    const rz=lip.z-1.2+(Math.random()-.5)*3.8;
    const s=1.2+Math.random()*2.1;
    const rock=new THREE.Mesh(new THREE.DodecahedronGeometry(s,0),i%4===0?darkStoneMat:stoneMat);
    rock.position.set(rx,bottomY+a*fallHeight+(Math.random()-.5)*1.3,rz);
    rock.scale.set(1,.75,1.15);rock.rotation.set(Math.random(),Math.random(),Math.random());
    rock.castShadow=true;scene.add(rock);
  }

  const pool=new THREE.Mesh(new THREE.CircleGeometry(7.5,48),waterMat.clone());
  pool.rotation.x=-Math.PI/2;pool.scale.set(1.25,.85,1);
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
    scene.add(s);spray.push(s);
  }

  const mistGeo=new THREE.BufferGeometry(),mistN=320,mistPos=new Float32Array(mistN*3);
  for(let i=0;i<mistN;i++){mistPos[i*3]=(Math.random()-.5)*9;mistPos[i*3+1]=Math.random()*4;mistPos[i*3+2]=(Math.random()-.5)*8;}
  mistGeo.setAttribute('position',new THREE.BufferAttribute(mistPos,3));
  const mist=new THREE.Points(mistGeo,new THREE.PointsMaterial({color:0xe4fbff,size:.26,transparent:true,opacity:.42,depthWrite:false}));
  mist.position.set(poolCenter.x,bottomY+.25,poolCenter.z-1);scene.add(mist);

  let found=false;
  function tick(){
    requestAnimationFrame(tick);
    const t=performance.now()*.001;
    river.material.opacity=.76+Math.sin(t*2.2)*.04;
    waterfall.material.opacity=.72+Math.sin(t*5.3)*.08;
    waterfall.scale.x=1+Math.sin(t*2.6)*.035;
    pool.material.opacity=.74+Math.sin(t*1.4)*.05;
    spray.forEach(s=>{s.position.y=s.userData.baseY+Math.sin(t*4+s.userData.phase)*.18;});
    mist.rotation.y=t*.06;
    const d=Math.hypot(john.position.x-poolCenter.x,john.position.z-poolCenter.z);
    if(d<13&&!found){found=true;document.getElementById('status').textContent='Hai scoperto la cascata naturale!';}
  }
  tick();
})();