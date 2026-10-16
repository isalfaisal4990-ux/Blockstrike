import * as THREE from 'three';
import './style.css';

const $ = id => document.getElementById(id);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x8ac7ed);
scene.fog = new THREE.Fog(0x8ac7ed, 28, 100);

const camera = new THREE.PerspectiveCamera(76, innerWidth / innerHeight, 0.1, 180);
camera.rotation.order = 'YXZ';
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
$('game').appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xcdeaff, 0x596344, 1.7));
const sun = new THREE.DirectionalLight(0xfff0cc, 2.3);
sun.position.set(25, 45, 10); sun.castShadow = true;
sun.shadow.mapSize.set(1024,1024);
sun.shadow.camera.left = -45; sun.shadow.camera.right = 45; sun.shadow.camera.top = 45; sun.shadow.camera.bottom = -45;
scene.add(sun);

const mats = {
  grass: new THREE.MeshStandardMaterial({color:0x5f9d43, roughness:1}),
  dirt: new THREE.MeshStandardMaterial({color:0x79543b, roughness:1}),
  stone: new THREE.MeshStandardMaterial({color:0x89939a, roughness:1}),
  wood: new THREE.MeshStandardMaterial({color:0x95633b, roughness:1}),
  leaf: new THREE.MeshStandardMaterial({color:0x2f713b, roughness:1}),
  sand: new THREE.MeshStandardMaterial({color:0xd7c17b, roughness:1}),
  enemy: new THREE.MeshStandardMaterial({color:0xc74737, roughness:.75}),
  dark: new THREE.MeshStandardMaterial({color:0x29313a, roughness:.65}),
  eye: new THREE.MeshStandardMaterial({color:0xffe7a0, emissive:0x7a2500})
};
const cubeGeo = new THREE.BoxGeometry(1,1,1);
const world = new Map();
const solidMeshes = [];
const keyOf = (x,y,z) => `${x},${y},${z}`;
const blockGroup = new THREE.Group(); scene.add(blockGroup);
function addBlock(x,y,z,type='grass',persist=true){
  const key=keyOf(x,y,z); if(world.has(key)) return false;
  const mesh=new THREE.Mesh(cubeGeo,mats[type]||mats.grass);
  mesh.position.set(x,y,z); mesh.castShadow=y>0; mesh.receiveShadow=true;
  mesh.userData={x,y,z,type,block:true}; blockGroup.add(mesh); world.set(key,mesh); solidMeshes.push(mesh);
  return true;
}
function removeBlock(mesh){
  if(!mesh?.userData?.block) return;
  world.delete(keyOf(mesh.userData.x,mesh.userData.y,mesh.userData.z));
  blockGroup.remove(mesh);
  const i=solidMeshes.indexOf(mesh); if(i>=0) solidMeshes.splice(i,1);
  mesh.geometry.dispose();
}
const heightAt=(x,z)=>Math.max(1,Math.floor(2+Math.sin(x*.19)*1.1+Math.cos(z*.17)*1.2+Math.sin((x+z)*.09)*1.1));
for(let x=-32;x<=32;x++) for(let z=-32;z<=32;z++){
  const h=heightAt(x,z);
  for(let y=0;y<h;y++) addBlock(x,y,z,y===h-1?(Math.abs(x)+Math.abs(z)>48?'sand':'grass'):(y<h-2?'stone':'dirt'));
  if(Math.random()<.035 && Math.abs(x)>3 && Math.abs(z)>3){
    const trunk=h; for(let y=0;y<3;y++) addBlock(x,trunk+y,z,'wood');
    for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++)for(let dy=2;dy<=4;dy++)
      if(Math.abs(dx)+Math.abs(dz)+(dy===4?1:0)<5 && Math.random()>.12) addBlock(x+dx,trunk+dy,z+dz,'leaf');
  }
}
// A few landmarks
for(let i=0;i<16;i++){
  const x=Math.round(Math.sin(i*12.4)*25), z=Math.round(Math.cos(i*7.1)*25), y=heightAt(x,z);
  for(let k=0;k<3+(i%4);k++) addBlock(x,y+k,z,'stone');
}

const player={x:0,y:heightAt(0,0)+1.0,z:0,vy:0,yaw:0,pitch:0,health:100,grounded:false};
camera.position.set(player.x,player.y,player.z);
const raycaster=new THREE.Raycaster();
const center=new THREE.Vector2(0,0);
let mode='destroy', buildType='stone', elapsed=0, worldTime=8, weather='CERAH', rain=[], kills=0;
const enemies=[];
function spawnEnemy(x,z){
  const group=new THREE.Group();
  const body=new THREE.Mesh(new THREE.BoxGeometry(.72,1,.48),mats.enemy); body.position.y=.55; body.castShadow=true; group.add(body);
  const head=new THREE.Mesh(new THREE.BoxGeometry(.52,.48,.5),mats.enemy); head.position.y=1.28; head.castShadow=true; group.add(head);
  const eye1=new THREE.Mesh(new THREE.BoxGeometry(.1,.1,.05),mats.eye); eye1.position.set(-.13,1.31,-.26); group.add(eye1);
  const eye2=eye1.clone(); eye2.position.x=.13; group.add(eye2);
  const y=heightAt(Math.round(x),Math.round(z));
  group.position.set(x,y,z); scene.add(group);
  enemies.push({group,hp:3,attack:0});
}
for(let i=0;i<12;i++) spawnEnemy((Math.random()-.5)*48,(Math.random()-.5)*48);
const enemyRayTargets=()=>enemies.flatMap(e=>e.group.children.map(m=>{m.userData.enemy=e;return m;}));

function say(text){$('toast').textContent=text; $('toast').style.opacity='1';}
function updateHUD(){
  $('health').textContent=`♥ ${Math.max(0,Math.round(player.health))}`;
  const hh=String(Math.floor(worldTime)).padStart(2,'0'), mm=String(Math.floor((worldTime%1)*60)).padStart(2,'0');
  $('clock').textContent=(worldTime>=6&&worldTime<18?'☀ ':'☾ ')+hh+':'+mm;
  $('weather').textContent=(weather==='HUJAN'?'🌧 ':'☀ ')+weather;
}
function setWeather(next){
  weather=next;
  rain.forEach(r=>scene.remove(r)); rain=[];
  if(weather==='HUJAN'){
    const geo=new THREE.BufferGeometry(), arr=[];
    for(let i=0;i<650;i++) arr.push((Math.random()-.5)*70,Math.random()*28,(Math.random()-.5)*70);
    geo.setAttribute('position',new THREE.Float32BufferAttribute(arr,3));
    const points=new THREE.Points(geo,new THREE.PointsMaterial({color:0xd4eaff,size:.09,transparent:true,opacity:.75}));
    points.userData.rain=true; scene.add(points); rain.push(points);
    say('Cuaca berubah: HUJAN');
  }else say('Cuaca berubah: CERAH');
  updateHUD();
}
function updateDayNight(dt){
  worldTime=(worldTime+dt*.12)%24;
  const daylight=Math.max(0,Math.sin((worldTime-6)/12*Math.PI));
  sun.intensity=.15+daylight*2.25;
  scene.background=new THREE.Color().setRGB(.015+daylight*.48,.025+daylight*.66,.09+daylight*.78);
  scene.fog.color.copy(scene.background);
  sun.color.setHex(daylight>.2?0xffe7c2:0x8baeff);
  updateHUD();
}
function getGround(x,z){return heightAt(Math.round(x),Math.round(z));}
function isBlocked(x,y,z){
  const bx=Math.round(x), bz=Math.round(z);
  for(let yy=Math.floor(y-.1);yy<=Math.floor(y+1.6);yy++) if(world.has(keyOf(bx,yy,bz))) return true;
  return false;
}
function shoot(){
  raycaster.setFromCamera(center,camera);
  const targets=[...solidMeshes,...enemyRayTargets()];
  const hit=raycaster.intersectObjects(targets,false).find(h=>h.distance<7);
  if(!hit){say('Tidak ada target dalam jangkauan');return;}
  const obj=hit.object;
  if(obj.userData.enemy){
    const e=obj.userData.enemy; e.hp--;
    if(e.hp<=0){scene.remove(e.group); enemies.splice(enemies.indexOf(e),1);kills++;say(`Musuh dikalahkan! Total: ${kills}`); if(enemies.length<12) spawnEnemy(player.x+(Math.random()-.5)*30,player.z+(Math.random()-.5)*30);}
    else say('Musuh terkena!'); return;
  }
  if(obj.userData.block){
    if(mode==='destroy'){
      removeBlock(obj);say('Blok dihancurkan');
    }else{
      const n=hit.face.normal.clone().transformDirection(obj.matrixWorld);
      const p=obj.position.clone().add(n);
      if(p.y>=0&&p.distanceTo(camera.position)<8&&addBlock(Math.round(p.x),Math.round(p.y),Math.round(p.z),buildType)) say('Blok dipasang');
      else say('Tidak bisa memasang blok di sana');
    }
  }
}
function jump(){if(player.grounded){player.vy=7.2;player.grounded=false;}}
function toggleMode(){mode=mode==='destroy'?'build':'destroy';$('mode').textContent='MODE: '+(mode==='destroy'?'HANCURKAN':'BANGUN');say(mode==='destroy'?'Mode hancurkan blok':'Mode bangun blok');}
function interact(){shoot();}

// Joystick and touch look
let joy={x:0,y:0},joyOn=false,joyId=null,lookId=null,lastX=0,lastY=0;
const joyEl=$('joystick'), stick=$('stick');
function joyMove(e){
 const r=joyEl.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;
 let dx=e.clientX-cx,dy=e.clientY-cy, max=r.width*.34, len=Math.hypot(dx,dy);
 if(len>max){dx=dx/len*max;dy=dy/len*max}
 joy.x=dx/max;joy.y=dy/max;stick.style.transform=`translate(${dx}px,${dy}px)`;
}
joyEl.addEventListener('pointerdown',e=>{e.preventDefault();joyOn=true;joyId=e.pointerId;joyEl.setPointerCapture(e.pointerId);joyMove(e)});
joyEl.addEventListener('pointermove',e=>{if(joyOn&&e.pointerId===joyId)joyMove(e)});
function endJoy(e){if(e.pointerId===joyId){joyOn=false;joy.x=joy.y=0;stick.style.transform='translate(0,0)'}}
joyEl.addEventListener('pointerup',endJoy);joyEl.addEventListener('pointercancel',endJoy);
renderer.domElement.addEventListener('pointerdown',e=>{
 if(e.pointerType==='mouse'){lookId=e.pointerId;lastX=e.clientX;lastY=e.clientY;renderer.domElement.setPointerCapture(e.pointerId);}
 else {lookId=e.pointerId;lastX=e.clientX;lastY=e.clientY;}
});
renderer.domElement.addEventListener('pointermove',e=>{
 if(lookId!==e.pointerId)return;
 const dx=e.clientX-lastX,dy=e.clientY-lastY;lastX=e.clientX;lastY=e.clientY;
 if(e.pointerType==='mouse' && e.buttons===0)return;
 player.yaw-=dx*.004;player.pitch-=dy*.004;player.pitch=Math.max(-1.45,Math.min(1.45,player.pitch));
});
function endLook(e){if(e.pointerId===lookId)lookId=null}
renderer.domElement.addEventListener('pointerup',endLook);renderer.domElement.addEventListener('pointercancel',endLook);
$('shoot').addEventListener('pointerdown',e=>{e.preventDefault();shoot()});
$('jump').addEventListener('pointerdown',e=>{e.preventDefault();jump()});
$('build').addEventListener('pointerdown',e=>{e.preventDefault();toggleMode()});
$('mode').addEventListener('click',toggleMode);
$('weatherBtn').addEventListener('click',()=>setWeather(weather==='CERAH'?'HUJAN':'CERAH'));
$('save').addEventListener('click',()=>{
 const data={player:{x:player.x,y:player.y,z:player.z,health:player.health},worldTime,weather,blocks:[...world.values()].map(m=>({x:m.userData.x,y:m.userData.y,z:m.userData.z,type:m.userData.type}))};
 try{localStorage.setItem('blockstrike-save',JSON.stringify(data));say('Dunia tersimpan di perangkat');}catch(e){say('Gagal menyimpan ruang penyimpanan');}
});
$('reset').addEventListener('click',()=>{if(confirm('Ulangi posisi pemain?')){player.x=0;player.y=heightAt(0,0)+1;player.z=0;player.health=100;player.vy=0;say('Posisi pemain diulang');}});
addEventListener('keydown',e=>{
 if(e.code==='Space')jump();
 if(e.code==='KeyF')shoot();
 if(e.code==='KeyB')toggleMode();
 if(e.code==='KeyW')joy.y=-1;if(e.code==='KeyS')joy.y=1;
 if(e.code==='KeyA')joy.x=-1;if(e.code==='KeyD')joy.x=1;
});
addEventListener('keyup',e=>{if(['KeyW','KeyS'].includes(e.code))joy.y=0;if(['KeyA','KeyD'].includes(e.code))joy.x=0;});
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));});

let last=performance.now();
function loop(now){
 requestAnimationFrame(loop);
 const dt=Math.min((now-last)/1000,.04);last=now;elapsed+=dt;
 updateDayNight(dt);
 const forward=new THREE.Vector3(-Math.sin(player.yaw),0,-Math.cos(player.yaw));
 const right=new THREE.Vector3(Math.cos(player.yaw),0,-Math.sin(player.yaw));
 const move=forward.multiplyScalar(-joy.y).add(right.multiplyScalar(joy.x));
 if(move.lengthSq()>1)move.normalize();
 const speed=5.3;
 const nx=player.x+move.x*speed*dt,nz=player.z+move.z*speed*dt;
 if(!isBlocked(nx,player.y,player.z))player.x=THREE.MathUtils.clamp(nx,-36,36);
 if(!isBlocked(player.x,player.y,nz))player.z=THREE.MathUtils.clamp(nz,-36,36);
 player.vy-=18*dt;player.y+=player.vy*dt;
 const floor=getGround(player.x,player.z)+1.65;
 if(player.y<floor){player.y=floor;player.vy=0;player.grounded=true;}
 camera.position.set(player.x,player.y,player.z);
 camera.rotation.set(player.pitch,player.yaw,0);
 // Enemies follow the player and attack at close range.
 for(const e of [...enemies]){
  const dx=player.x-e.group.position.x,dz=player.z-e.group.position.z,d=Math.hypot(dx,dz);
  if(d>1.5){e.group.position.x+=dx/d*1.15*dt;e.group.position.z+=dz/d*1.15*dt;}
  e.group.position.y=getGround(e.group.position.x,e.group.position.z);
  e.group.lookAt(player.x,e.group.position.y+1,player.z);
  e.attack-=dt;
  if(d<1.7&&e.attack<=0){player.health-=8;e.attack=1.1;if(player.health<=0){player.health=100;player.x=0;player.z=0;player.y=heightAt(0,0)+1;say('Kamu tumbang! Kembali ke titik awal.');}updateHUD();}
 }
 // Rain particles drift and recycle.
 for(const p of rain){const a=p.geometry.attributes.position;for(let i=0;i<a.count;i++){a.array[i*3+1]-=dt*16;if(a.array[i*3+1]<0){a.array[i*3+1]=25;a.array[i*3]=player.x+(Math.random()-.5)*60;a.array[i*3+2]=player.z+(Math.random()-.5)*60;}}a.needsUpdate=true;p.position.set(0,0,0);}
 renderer.render(scene,camera);
}
updateHUD();say('Selamat datang! Jelajahi dunia dan bertahan hidup.');requestAnimationFrame(loop);
