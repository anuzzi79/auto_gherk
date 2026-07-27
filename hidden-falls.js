(()=>{
  const blue=new THREE.MeshStandardMaterial({color:0x45d9ff,transparent:true,opacity:.78,roughness:.15,metalness:.08});
  const foam=new THREE.MeshBasicMaterial({color:0xe9fbff,transparent:true,opacity:.75});
  const stone=new THREE.MeshStandardMaterial({color:0x56645b,roughness:1});
  const darkStone=new THREE.MeshStandardMaterial({color:0x26352f,roughness:1});

  const falls=new THREE.Group();
  const fx=18,fz=-9,base=heightAt(fx,fz);

  const cliff=new THREE.Mesh(new THREE.BoxGeometry(13,12,6),stone);
  cliff.position.set(fx,base+5.5,fz);
  cliff.rotation.y=-0.22;
  cliff.castShadow=true;
  falls.add(cliff);

  const cave=new THREE.Mesh(new THREE.TorusGeometry(2.5,1.25,10,22,Math.PI),darkStone);
  cave.position.set(fx-1.1,base+1.8,fz+3.15);
  cave.rotation.x=Math.PI/2;
  cave.rotation.z=Math.PI;
  cave.castShadow=true;
  falls.add(cave);

  const caveDark=new THREE.Mesh(new THREE.CircleGeometry(2.05,24),new THREE.MeshBasicMaterial({color:0x07130f}));
  caveDark.position.set(fx-1.1,base+1.8,fz+3.23);
  caveDark.rotation.x=-Math.PI/2;
  falls.add(caveDark);

  const water=new THREE.Mesh(new THREE.PlaneGeometry(3.2,10,1,14),blue.clone());
  water.position.set(fx,base+6.1,fz+3.05);
  water.rotation.x=0;
  falls.add(water);

  const pool=new THREE.Mesh(new THREE.CircleGeometry(7,40),blue.clone());
  pool.rotation.x=-Math.PI/2;
  pool.scale.set(1.35,.82,1);
  pool.position.set(fx,base+.18,fz+7.5);
  falls.add(pool);

  for(let i=0;i<22;i++){
    const s=new THREE.Mesh(new THREE.SphereGeometry(.15+Math.random()*.22,7,5),foam);
    s.position.set(fx+(Math.random()-.5)*5.5,base+.35+Math.random()*.8,fz+4.5+Math.random()*5.5);
    s.userData.phase=Math.random()*6.28;
    falls.add(s);
  }

  const signCanvas=document.createElement('canvas'); signCanvas.width=512; signCanvas.height=128;
  const sctx=signCanvas.getContext('2d'); sctx.fillStyle='#55351f'; sctx.fillRect(0,0,512,128);
  sctx.fillStyle='#ffe2a3'; sctx.font='bold 48px Arial'; sctx.textAlign='center'; sctx.fillText('HIDDEN FALLS',256,78);
  const signTex=new THREE.CanvasTexture(signCanvas);
  const sign=new THREE.Mesh(new THREE.PlaneGeometry(5,1.25),new THREE.MeshBasicMaterial({map:signTex}));
  sign.position.set(fx-8,base+2.2,fz+12); sign.rotation.y=.55; falls.add(sign);
  const post=new THREE.Mesh(new THREE.BoxGeometry(.22,2.8,.22),new THREE.MeshStandardMaterial({color:0x6f4123}));
  post.position.set(fx-8,base+1,fz+12); falls.add(post);

  scene.add(falls);

  const flowerColors=[0xff4f88,0xffd447,0xa45cff,0xff7247,0xffffff];
  for(let i=0;i<42;i++){
    const a=Math.random()*Math.PI*2,r=7+Math.random()*17,x=fx+Math.cos(a)*r,z=fz+7+Math.sin(a)*r,y=heightAt(x,z);
    const g=new THREE.Group();
    const stem=new THREE.Mesh(new THREE.CylinderGeometry(.035,.05,.65,5),new THREE.MeshStandardMaterial({color:0x2e9d45})); stem.position.y=.32; g.add(stem);
    for(let p=0;p<5;p++){
      const petal=new THREE.Mesh(new THREE.SphereGeometry(.18,6,5),new THREE.MeshStandardMaterial({color:flowerColors[i%flowerColors.length]}));
      petal.scale.set(1.5,.45,.8); petal.position.set(Math.cos(p*1.256)*.22,.7,Math.sin(p*1.256)*.22); g.add(petal);
    }
    g.position.set(x,y,z); scene.add(g);
  }

  const butterflies=[];
  for(let i=0;i<15;i++){
    const g=new THREE.Group();
    const mat=new THREE.MeshBasicMaterial({color:flowerColors[(i+2)%flowerColors.length],side:THREE.DoubleSide});
    const l=new THREE.Mesh(new THREE.PlaneGeometry(.42,.25),mat),r=l.clone();
    l.position.x=-.2;r.position.x=.2;g.add(l,r);
    g.position.set(fx+(Math.random()-.5)*24,base+2+Math.random()*6,fz+7+(Math.random()-.5)*20);
    g.userData={phase:Math.random()*6.28,speed:.4+Math.random()*.5,l,r}; scene.add(g); butterflies.push(g);
  }

  const mistGeo=new THREE.BufferGeometry(),mistN=260,mistPos=new Float32Array(mistN*3);
  for(let i=0;i<mistN;i++){mistPos[i*3]=(Math.random()-.5)*8;mistPos[i*3+1]=Math.random()*4;mistPos[i*3+2]=(Math.random()-.5)*7;}
  mistGeo.setAttribute('position',new THREE.BufferAttribute(mistPos,3));
  const mist=new THREE.Points(mistGeo,new THREE.PointsMaterial({color:0xdffaff,size:.24,transparent:true,opacity:.45,depthWrite:false}));
  mist.position.set(fx,base+.5,fz+5);scene.add(mist);

  let found=false;
  function tick(){
    requestAnimationFrame(tick);
    const t=performance.now()*.001;
    water.material.opacity=.66+Math.sin(t*5)*.08;
    water.scale.x=1+Math.sin(t*2)*.04;
    pool.material.opacity=.72+Math.sin(t*1.4)*.05;
    falls.children.forEach(o=>{if(o.userData.phase!==undefined)o.position.y+=Math.sin(t*3+o.userData.phase)*.0015});
    butterflies.forEach((b,i)=>{
      b.position.x+=Math.cos(t*b.userData.speed+b.userData.phase)*.006;
      b.position.z+=Math.sin(t*b.userData.speed+b.userData.phase)*.006;
      b.position.y+=Math.sin(t*2+b.userData.phase)*.003;
      const flap=Math.sin(t*13+b.userData.phase)*.8;
      b.userData.l.rotation.y=flap;b.userData.r.rotation.y=-flap;
    });
    mist.rotation.y=t*.08;
    const d=Math.hypot(john.position.x-fx,john.position.z-(fz+7));
    if(d<12&&!found){found=true;document.getElementById('status').textContent='Hai scoperto Hidden Falls!';}
    if(d>16&&found&&weather==='sun')document.getElementById('status').textContent='Sole tropicale';
  }
  tick();
})();