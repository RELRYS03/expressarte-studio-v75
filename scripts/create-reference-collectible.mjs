import * as T from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {GLTFExporter} from 'three/examples/jsm/exporters/GLTFExporter.js';
import {STLExporter} from 'three/examples/jsm/exporters/STLExporter.js';
import {STLLoader} from 'three/examples/jsm/loaders/STLLoader.js';
import Module from 'manifold-3d';
import {createRequire} from 'node:module';
import {writeFile,mkdir} from 'node:fs/promises';
// Approximation authored from the supplied image; no reconstruction API.
const output=process.argv[2];if(!output)throw Error('Pass output directory');
await mkdir(output,{recursive:true});
const root=new T.Group();root.name='Colecionavel-terno-cafe';
const colors={skin:0xe8ae72,hair:0x9f6c34,gold:0xb98645,suit:0x20252e,vest:0x30343b,shoe:0x13151b,white:0xe8ecec,black:0x080b0d,coffee:0x533420};
const mats=Object.fromEntries(Object.entries(colors).map(([k,color])=>[k,new T.MeshStandardMaterial({color,roughness:k==='black'?.2:.68})]));
const add=(g,c,n)=>{const m=new T.Mesh(g,mats[c]);m.name=n;root.add(m);return m;};
function box(w,d,h,x,y,z,c,n,r=1.1){const g=new RoundedBoxGeometry(w,d,h,2,Math.min(r,w/3,d/3,h/3));g.translate(x,y,z);return add(g,c,n);}
function oval(rx,ry,rz,x,y,z,c,n){const g=new T.SphereGeometry(1,24,16);g.scale(rx,ry,rz);g.translate(x,y,z);return add(g,c,n);}
function between(a,b,r1,r2,c,n){const p=new T.Vector3(...a),q=new T.Vector3(...b);const g=new T.CylinderGeometry(r2,r1,p.distanceTo(q),24);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),q.clone().sub(p).normalize()));g.translate(...p.add(q).multiplyScalar(.5).toArray());return add(g,c,n);}
function tube(points,r,c,n){
const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),tube=new T.TubeGeometry(curve,24,r,8,false),open=tube.toNonIndexed(),values=Array.from(open.getAttribute('position').array),pos=tube.getAttribute('position');
for(const end of [0,24]){
 const center=curve.getPointAt(end/24),normal=curve.getTangentAt(end/24).multiplyScalar(end===0?-1:1);
 for(let j=0;j<8;j++){const a=new T.Vector3().fromBufferAttribute(pos,end*9+j),b=new T.Vector3().fromBufferAttribute(pos,end*9+j+1);
 const order=a.clone().sub(center).cross(b.clone().sub(center)).dot(normal)>0?[a,b]:[b,a];
 values.push(...center.toArray(),...order[0].toArray(),...order[1].toArray());}}
const g=new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(values,3));g.computeVertexNormals();tube.dispose();open.dispose();return add(g,c,n);
}
function triangle(points,y,c,n){const s=new T.Shape();s.moveTo(...points[0]);for(const p of points.slice(1))s.lineTo(...p);s.closePath();const g=new T.ExtrudeGeometry(s,{depth:1.7,bevelEnabled:false});g.rotateX(Math.PI/2);g.translate(0,y,0);return add(g,c,n);}
box(13,21,6,-9,-4,4,'shoe','Sapato esquerdo',2);box(13,21,6,9,-4,4,'shoe','Sapato direito',2);
between([-8,-.5,7],[-5,0,28],4.5,5.7,'suit','Calca esquerda');between([9,-.5,7],[5,0,28],4.5,5.7,'suit','Calca direita');
box(21,15,12,0,0,28,'suit','Cintura',2);box(25,17,27,0,0,42,'suit','Paleto',3);box(15,1.8,23,0,-8.4,42,'vest','Colete',1);
between([0,0,52],[0,0,60],4.2,4.1,'skin','Pescoco');
triangle([[-6,55],[-.5,47],[0,55]],-8.8,'white','Gola esquerda');triangle([[6,55],[0,55],[.5,47]],-8.8,'white','Gola direita');
triangle([[-11,52],[-6,54],[-2.7,42]],-9.1,'suit','Lapela esquerda');triangle([[11,52],[2.7,42],[6,54]],-9.1,'suit','Lapela direita');
for(let i=0;i<4;i++)oval(.9,.9,.9,0,-9.4,35+i*3.4,'shoe','Botao '+i);
between([-11,0,50],[-17,-1,37],4.6,4.2,'suit','Manga esquerda');between([-17,-1,37],[-16,-12,44],4.2,3.5,'suit','Antebraco esquerdo');
oval(3.8,3.6,4.7,-16,-13.5,46,'skin','Mao segurando xicara');
between([11,0,50],[17,0,36],4.6,3.7,'suit','Manga direita');between([17,0,36],[12,-6.5,30],3.7,3.3,'suit','Antebraco direito');oval(3,3,3.5,12,-7,30,'skin','Mao no bolso');
box(52,42,42,0,0,76,'skin','Cabeca',8);
oval(4.2,3.3,6,-25.5,-.5,72,'skin','Orelha esquerda');oval(4.2,3.3,6,25.5,-.5,72,'skin','Orelha direita');
oval(4.7,2.4,5.7,-12,-20.4,72,'black','Olho esquerdo');oval(4.7,2.4,5.7,12,-20.4,72,'black','Olho direito');oval(1.45,1.9,2.9,0,-20.5,67.5,'skin','Nariz');
tube([[-18,-19.8,80],[-13,-21.1,81],[-8,-21,80.3]],1.2,'hair','Sobrancelha esquerda');tube([[8,-21,80.3],[13,-21.1,81.2],[18,-19.8,81.4]],1.2,'hair','Sobrancelha direita');
oval(27,22,12,0,1,94,'hair','Cabelo superior');oval(25,15,22,0,12,80,'hair','Cabelo traseiro');
for(const side of [-1,1]){oval(4,18,19,side*25.5,2,77,'hair','Cabelo lateral '+side);for(let j=0;j<4;j++)tube([[side*24,0,66+j*8],[side*29,-3,68+j*8],[side*29,-10,73+j*8],[side*25,-13,74+j*8]],1.7,'gold','Onda lateral '+side+' '+j);}
for(let i=0;i<7;i++){const x=-21+i*6.8;tube([[x-3,-16,91],[x-5,-21,95],[x-1,-23,98],[x+3,-21,99],[x+4,-17,96]],2.2,i%2?'gold':'hair','Mecha frontal '+i);}
for(let row=0;row<3;row++)for(let i=0;i<5;i++){const x=-19+i*9,y=-10+row*10,z=101-Math.abs(x)*.12;tube([[x-4,y-4,z-2],[x-3,y,z+2],[x+2,y+4,z+3],[x+5,y,z+1],[x+3,y-4,z-1]],1.8,(i+row)%2?'gold':'hair','Onda superior '+row+' '+i);}
between([-10.5,-16,43],[-10.5,-16,49],3.4,4,'white','Xicara solida');between([-10.5,-16,48.7],[-10.5,-16,49.2],3.55,3.55,'coffee','Cafe');
const handle=new T.TorusGeometry(2.6,1.0,10,24);handle.rotateX(Math.PI/2);handle.translate(-15,-16,46);add(handle,'white','Alca');
root.updateMatrixWorld(true);
const bounds=new T.Box3().setFromObject(root),factor=100/(bounds.max.z-bounds.min.z);
for(const m of root.children){m.geometry.translate(0,0,-bounds.min.z);m.geometry.scale(factor,factor,factor);}
const api=await Module({locateFile:()=>createRequire(import.meta.url).resolve('manifold-3d/manifold.wasm')});api.setup();
const owned=[];
try{
for(const m of root.children){const g=m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone();const p=new Float32Array(g.getAttribute('position').array);const mesh=new api.Mesh({numProp:3,vertProperties:p,triVerts:Uint32Array.from({length:p.length/3},(_,i)=>i)});mesh.merge();let solid;try{solid=new api.Manifold(mesh);}catch(e){throw Error(m.name+': '+e.message);}g.dispose();if(solid.status()!=='NoError')throw Error('Invalid part '+m.name+' '+solid.status());owned.push(solid);}
const joined=api.Manifold.union(owned);owned.push(joined);const bodies=joined.decompose(),count=bodies.length;bodies.forEach(b=>b.delete());
const data=joined.getMesh(),vertices=new Float32Array(data.triVerts.length*3);data.triVerts.forEach((v,i)=>vertices.set(data.vertProperties.slice(v*data.numProp,v*data.numProp+3),i*3));
const geometry=new T.BufferGeometry().setAttribute('position',new T.BufferAttribute(vertices,3));geometry.computeVertexNormals();geometry.computeBoundingBox();const dimensions=geometry.boundingBox.getSize(new T.Vector3());
const stl=new STLExporter().parse(new T.Mesh(geometry,new T.MeshStandardMaterial()),{binary:true});const reopened=new STLLoader().parse(stl.buffer.slice(stl.byteOffset,stl.byteOffset+stl.byteLength));
if(joined.status()!=='NoError'||count!==1||Math.abs(dimensions.z-100)>.01||reopened.getAttribute('position').count!==vertices.length/3)throw Error('Validation failed, bodies='+count);
await writeFile(output+'/Colecionavel_Terno_Cafe_100mm.stl',Buffer.from(stl.buffer,stl.byteOffset,stl.byteLength));
await writeFile(output+'/solid-preview.json',JSON.stringify({positions:Array.from(vertices),size:dimensions.toArray()}));
await writeFile(output+'/colored-preview.json',JSON.stringify(root.children.map(m=>({name:m.name,positions:Array.from((m.geometry.index?m.geometry.toNonIndexed():m.geometry).getAttribute('position').array),color:m.material.color.getHex()}))));
root.rotation.x=-Math.PI/2;root.scale.setScalar(.001);root.updateMatrixWorld(true);
globalThis.FileReader=class{readAsArrayBuffer(blob){blob.arrayBuffer().then(value=>{this.result=value;this.onloadend?.();});}readAsDataURL(blob){blob.arrayBuffer().then(value=>{this.result='data:'+blob.type+';base64,'+Buffer.from(value).toString('base64');this.onloadend?.();});}};
const glb=await new GLTFExporter().parseAsync(root,{binary:true});await writeFile(output+'/Colecionavel_Terno_Cafe_Colorido.glb',Buffer.from(glb));
const report={heightMm:dimensions.z,widthMm:dimensions.x,depthMm:dimensions.y,triangles:vertices.length/9,connectedBodies:count,volumeMm3:joined.volume(),status:joined.status(),parts:root.children.length,approach:'Reference-based procedural approximation, not AI reconstruction',limits:['Not exact replica','Not tested in slicer or physical print','GLB retains overlapping named colour parts; STL is unioned','Cup is solid']};
await writeFile(output+'/validacao.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
geometry.dispose();reopened.dispose();
}finally{for(const s of owned.reverse())s.delete();}
