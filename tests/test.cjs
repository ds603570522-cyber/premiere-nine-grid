'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');const core=require(path.join(root,'com.meetavista.ninegrid/js/core.js'));
const code=fs.readFileSync(path.join(root,'com.meetavista.ninegrid/jsx/host.jsx'),'utf8');
let count=0;
function test(name,fn){fn();count++;console.log('PASS '+name);}
function cfg(extra={}){return {...{name:'九宫格测试',paths:Array.from({length:9},(_,i)=>'D:/媒体/视角'+(i+1)+'.mp4'),width:5760,height:3240,fps:30,gap:0,audio:'mute'},...extra};}
function mock(options={}){
 const state={presets:[],removed:0,old:{sequenceID:'old',name:'Existing untouched'},imported:[],mutes:[],seq:null,imports:[]};
 function F(p){if(!(this instanceof F))return new F(p);this.fsName=String(p).replace(/\\/g,'/');this.name=this.fsName.split('/').pop();this.exists=!options.missing;this.parent={getFiles:()=>{const folder=this.fsName.slice(0,this.fsName.lastIndexOf('/'));const cam=Number((folder.match(/cam(\d+)/)||[])[1]||1)-1;const counts=options.imageCounts||[240,150,300,270,210,180,180,174,360];let nums=Array.from({length:counts[cam]},(_,i)=>i+1);if(options.gap)nums=nums.filter(n=>n!==3);if(options.single)nums=[1];return nums.map(n=>new F(folder+'/render.'+String(n).padStart(4,'0')+'.exr'));}};this.open=()=>true;this.close=()=>true;this.write=s=>state.presets.push(s);this.remove=()=>{state.removed++;return true;};}
 F.openDialog=()=>options.cancel?null:(options.selectedImage?new F(options.selectedImage):cfg().paths.map(p=>new F(p)));
 const coll=(arr,prop)=>{arr[prop]=arr.length;return arr;};
 const rootBin={children:coll([],'numItems'),createBin(){const b={type:2,children:coll([],'numItems'),createBin:this.createBin};this.children.push(b);this.children.numItems++;return b;}};
 const project={rootItem:rootBin,sequences:coll([state.old],'numSequences'),openSequence(id){state.open=id;},importFiles(paths,suppress,bin,numbered){state.imports.push({paths:paths.slice(),numbered});
  if(options.importFail)return false;
  paths.forEach((p,i)=>{const ordinal=state.imported.length;const item={numbered,index:ordinal,rate:25,getFootageInterpretation(){return {frameRate:this.rate};},setFootageInterpretation(v){if(!options.badRate)this.rate=v.frameRate;},type:1,getMediaPath:()=>p,clearInPoint(){},clearOutPoint(){},setScaleToFrameSize(){this.scaled=true;}};bin.children.push(item);state.imported.push(item);});bin.children.numItems=bin.children.length;return true;
 }};
 const app={version:'25.4.0',project,enableQE(){}};
 const qe={project:{newSequence(name){
  if(options.createFail)return;
  const preset=state.presets[state.presets.length-1];
  const size=preset.match(/<VideoFrameSize>0,0,(\d+),(\d+)<\/VideoFrameSize>/);const tick=Number(preset.match(/<VideoFrameRate>(\d+)<\/VideoFrameRate>/)[1]);
  const settings={videoFrameWidth:Number(size[1]),videoFrameHeight:Number(size[2]),videoFrameRate:{seconds:tick/254016000000}};
  const seq={sequenceID:'new',name,videoTracks:coll(Array.from({length:9},()=>({clips:coll([],'numItems')})),'numTracks'),audioTracks:coll(Array.from({length:9},(_,i)=>({clips:coll([],'numItems'),setMute(v){state.mutes[i]=v;}})),'numTracks'),getSettings:()=>settings,setPlayerPosition(p){this.playhead=p;},overwriteClip(item,time,v,a){
   assert.equal(time,'0');assert.equal(v,a);assert.equal(item.scaled,true);
   if(options.noVideo && v===3)return;
   const pos={value:[.5,.5],setValue(val){this.value=val;},getValue(){return this.value;}};
   const scale={value:100,setValue(val){this.value=val;},getValue(){return options.badReadback?100:this.value;}};
   const clip={start:{seconds:0},end:{seconds:item.numbered?((options.imageCounts||[240,150,300,270,210,180,180,174,360])[v]/item.rate+(options.badImageCount?1:0)):(options.durations||[8,5.019,10,9,7,6,6,5.8,12])[v]},components:coll([{matchName:'AE.ADBE Motion',properties:coll([pos,scale],'numItems')}],'numItems')};
   this.videoTracks[v].clips=coll([clip],'numItems');this.audioTracks[a].clips=coll(item.numbered?[]:[{end:{seconds:clip.end.seconds}}],'numItems');
  }};
  if(options.badTracks)seq.videoTracks.numTracks=3;
  if(options.badSettings)settings.videoFrameWidth=100;
  project.sequences.push(seq);project.sequences.numSequences++;state.seq=seq;
 }}};
 const context={$:{},app,qe,File:F,Folder:{temp:{fsName:'D:/temporary'}},Time:function(){this.seconds=0;},encodeURIComponent,Error,Date,Math,Number,String,parseInt,isFinite};
 vm.runInNewContext(code,context,{filename:'host.jsx'});
 return {state,host:context.$._ninegrid,run(c=cfg()){const r=context.$._ninegrid.build(c),i=r.indexOf('|');return {ok:r.slice(0,i)==='OK',text:decodeURIComponent(r.slice(i+1))};}};
}
test('frontend validates supported configuration',()=>assert.equal(core.validate(cfg()).width,5760));
test('frontend rejects wrong count, gap, fps, paths',()=>{for(const v of [{paths:[]},{gap:NaN},{gap:-1},{gap:121},{fps:29.97},{paths:[...cfg().paths.slice(0,8),'x\n.mp4']}])assert.throws(()=>core.validate(cfg(v)));});
test('nine grid reproduces original centers',()=>{assert.deepEqual(core.layout(5760,3240,0).map(x=>x.position.map((v,i)=>Math.round(v*[5760,3240][i]))),[[960,540],[2880,540],[4800,540],[960,1620],[2880,1620],[4800,1620],[960,2700],[2880,2700],[4800,2700]]);});
test('all sizes, frame rates, gaps produce bounded cells',()=>{for(const [w,h]of [[5760,3240],[3840,2160],[1920,1080]])for(const gap of [0,20,120])for(const cell of core.layout(w,h,gap)){assert(cell.scale>0&&cell.scale<=100/3);assert(cell.position.every(v=>v>0&&v<1));}});
test('camera filenames sort naturally',()=>assert.deepEqual(['Camera10.mp4','Camera2.mp4','Camera1.mp4'].sort(core.natural),['Camera1.mp4','Camera2.mp4','Camera10.mp4']));
test('host creates 9 clips and trims to shortest whole frame',()=>{const m=mock(),r=m.run();assert(r.ok,r.text);assert.equal(m.state.seq.videoTracks.length,9);for(const t of m.state.seq.videoTracks)assert.equal(t.clips[0].end.seconds,5);assert.deepEqual(m.state.mutes,[1,1,1,1,1,1,1,1,1]);assert.equal(m.state.old.name,'Existing untouched');assert.equal(m.state.removed,1);assert.match(r.text,/150 帧/);});
test('host motion agrees with layout for all output sizes',()=>{for(const [width,height]of [[5760,3240],[3840,2160],[1920,1080]]){const m=mock(),c=cfg({width,height,gap:24}),r=m.run(c);assert(r.ok,r.text);m.state.seq.videoTracks.forEach((t,i)=>{const p=t.clips[0].components[0].properties,l=core.layout(width,height,24)[i];assert.equal(p[0].getValue()[0],l.position[0]);assert.equal(p[0].getValue()[1],l.position[1]);assert.equal(p[1].getValue(),l.scale);});}});
test('audio first and all routing',()=>{const a=mock();assert(a.run(cfg({audio:'first'})).ok);assert.deepEqual(a.state.mutes,[0,1,1,1,1,1,1,1,1]);const b=mock();assert(b.run(cfg({audio:'all'})).ok);assert.deepEqual(b.state.mutes,[0,0,0,0,0,0,0,0,0]);});
test('all supported frame rates use exact tick rates',()=>{for(const fps of [24,25,30,60]){const m=mock(),r=m.run(cfg({fps}));assert(r.ok,r.text);assert.match(m.state.presets[0],new RegExp('<VideoFrameRate>'+254016000000/fps+'</VideoFrameRate>'));assert(Math.abs(m.state.seq.videoTracks[0].clips[0].end.seconds*fps-Math.floor(5.019*fps))<1e-8);}});
test('preflight failure makes no sequence',()=>{for(const v of [{paths:[]},{fps:0},{audio:'invalid'},{gap:-1}]){const m=mock();assert(!m.run(cfg(v)).ok);assert.equal(m.state.seq,null);}const m=mock({missing:true});assert(!m.run().ok);assert.equal(m.state.seq,null);});
test('creation failure removes only own temporary preset',()=>{const m=mock({createFail:true});assert(!m.run().ok);assert.equal(m.state.removed,1);assert.equal(m.state.seq,null);});
test('partial failures preserve labeled result and original sequence',()=>{for(const options of [{badTracks:true},{badSettings:true},{importFail:true},{noVideo:true},{badReadback:true}]){const m=mock(options),r=m.run();assert(!r.ok);assert.match(m.state.seq.name,/未完成/);assert.equal(m.state.old.name,'Existing untouched');assert.equal(m.state.removed,1);}});
test('too short media produces explicit failure',()=>{const m=mock({durations:Array(9).fill(.001)});assert.match(m.run().text,/不足一帧/);});
test('file selection transports Chinese paths, cancel is empty success',()=>{const m=mock(),r=m.host.choose();assert.deepEqual(decodeURIComponent(r.slice(3)).split('\n'),cfg().paths);assert.equal(mock({cancel:true}).host.choose(),'OK|');});

function imageCfg(extra={}){return cfg({mode:'imageSequence',paths:Array.from({length:9},(_,i)=>'D:/图像/cam'+(i+1)+'/render.0001.exr'),...extra});}
test('image sequence config validation and unknown mode rejection',()=>{assert.equal(core.validate(imageCfg()).mode,'imageSequence');assert.throws(()=>core.validate(cfg({mode:'timeline'})));const m=mock();assert(!m.run(cfg({mode:'timeline'})).ok);assert.equal(m.state.seq,null);});
test('image sequences imported individually with numbered stills flag',()=>{const m=mock(),r=m.run(imageCfg());assert(r.ok,r.text);assert.equal(m.state.imports.length,9);m.state.imports.forEach(x=>{assert.equal(x.numbered,true);assert.equal(x.paths.length,1);});assert.equal(m.state.imported.length,9);assert(m.state.imported.every(x=>x.rate===30));assert(m.state.seq.audioTracks.every(t=>t.clips.length===0));assert.equal(m.state.seq.videoTracks[0].clips[0].end.seconds,5);});
test('one image per frame at all supported frame rates',()=>{for(const fps of [24,25,30,60]){const m=mock(),r=m.run(imageCfg({fps}));assert(r.ok,r.text);assert.equal(m.state.seq.videoTracks[0].clips[0].end.seconds,150/fps);assert(m.state.imported.every(x=>x.rate===fps));}});
test('image source stays muted even with a forged audio choice',()=>{const m=mock();assert(m.run(imageCfg({audio:'all'})).ok);assert.deepEqual(m.state.mutes,Array(9).fill(1));});
test('missing frame rejected before modifying project',()=>{const m=mock({gap:true}),r=m.run(imageCfg());assert(!r.ok);assert.match(r.text,/编号不连续/);assert.equal(m.state.seq,null);assert.equal(m.state.imports.length,0);});
test('non-first image and single image rejected before import',()=>{const m=mock(),c=imageCfg();c.paths[0]=c.paths[0].replace('0001','0002');assert.match(m.run(c).text,/第一帧/);assert.equal(m.state.seq,null);const n=mock({single:true});assert.match(n.run(imageCfg()).text,/至少两张/);assert.equal(n.state.seq,null);});
test('image filename without trailing number rejected',()=>{const m=mock(),c=imageCfg();c.paths[0]='D:/图像/cam1/still.exr';assert.match(m.run(c).text,/连续编号结尾/);assert.equal(m.state.seq,null);});
test('frame rate and imported frame count readback failures caught',()=>{for(const [options,expected]of [[{badRate:true},/帧率未成功/],[{badImageCount:true},/导入帧数/]]){const m=mock(options),r=m.run(imageCfg());assert(!r.ok);assert.match(r.text,expected);assert.match(m.state.seq.name,/未完成/);}});
test('single first-frame picker returns Unicode path and supports cancel',()=>{const p=imageCfg().paths[0],m=mock({selectedImage:p});assert.equal(decodeURIComponent(m.host.chooseImage().slice(3)),p);assert.equal(mock({cancel:true}).host.chooseImage(),'OK|');});

new vm.Script(fs.readFileSync(path.join(root,'com.meetavista.ninegrid/js/panel.js'),'utf8'));
console.log('RESULT '+count+' test groups passed; host API behavior is mocked, not a Premiere integration test.');