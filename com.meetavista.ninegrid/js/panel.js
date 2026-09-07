(function(){
'use strict';
var paths=Array(9).fill(''),selected=-1,busy=false,connected=false;
var $=function(id){return document.getElementById(id);};
function imageMode(){return $('mode').value==='imageSequence';}
function status(text,kind){$('status').textContent=text;$('status').className=kind||'';}
function render(){
 var filled=paths.filter(Boolean).length,img=imageMode();$('grid').textContent='';
 for(var i=0;i<9;i++)(function(n){
  var cell=document.createElement('div');cell.className='cell';var b=document.createElement('button');b.className='tile'+(selected===n?' selected':'');b.disabled=busy||!paths[n];b.setAttribute('aria-label','第 '+(n+1)+' 格 '+(paths[n]||'未选择'));b.setAttribute('aria-pressed',String(selected===n));var a=document.createElement('strong');a.textContent=String(n+1);var t=document.createElement('span');t.textContent=paths[n]?paths[n].split(/[\\/]/).pop():'等待素材';b.title=paths[n]||'未选择';b.appendChild(a);b.appendChild(t);b.onclick=function(){if(selected<0)selected=n;else{var temp=paths[selected];paths[selected]=paths[n];paths[n]=temp;selected=-1;}render();};cell.appendChild(b);
  if(img){var pick=document.createElement('button');pick.className='slot-pick';pick.textContent=paths[n]?'更换首帧':'选择首帧';pick.disabled=busy||!connected;pick.onclick=function(){pickImage(n);};cell.appendChild(pick);}
  $('grid').appendChild(cell);
 })(i);
 $('count').textContent=filled+' / 9';$('build').disabled=busy||!connected||filled!==9;$('choose').disabled=busy||!connected||(img&&filled===9);$('choose').textContent=img?'选择下一格首帧':'选择九段视频';
 $('modeHint').textContent=img?'每格只选一组连续编号图片的首帧。点两个已填格子可交换位置。':'先选择九段视频，点两个格子即可交换位置。';
 Array.prototype.forEach.call(document.querySelectorAll('input,select'),function(el){el.disabled=busy;});if(img){$('audio').value='mute';$('audio').disabled=true;}
}
function host(method,args){return new Promise(function(resolve,reject){
 if(!window.__adobe_cep__)return reject(Error('请从 PR 的“窗口 → 扩展”打开此插件。'));
 var script='$._ninegrid.'+method+'('+args.map(function(a){return JSON.stringify(a);}).join(',')+')';
 window.__adobe_cep__.evalScript(script,function(raw){
  if(typeof raw!=='string'||raw.indexOf('|')<0)return reject(Error('Premiere 未返回结果：'+String(raw)));
  var split=raw.indexOf('|'),body;try{body=decodeURIComponent(raw.slice(split+1));}catch(e){return reject(Error('Premiere 返回内容无效。'));}
  if(raw.slice(0,split)==='ERR')reject(Error(body));else resolve(body);
 });
});}
async function pickImage(index){
 if(index<0||index>8||busy)return;busy=true;render();status('请选择第 '+(index+1)+' 格的图像序列首帧…');
 try{var result=await host('chooseImage',[]);if(result){paths[index]=result;selected=-1;status('第 '+(index+1)+' 格已选好。图片会按连续编号作为一段素材导入。');}else status('已取消选择，现有格子保持原样。');}catch(e){status(e.message,'error');}finally{busy=false;render();}
}
$('mode').onchange=function(){paths=Array(9).fill('');selected=-1;render();status(imageMode()?'请逐格选择图像序列首帧。':'请选择九个视频文件。');};
$('choose').onclick=async function(){
 if(imageMode())return pickImage(paths.indexOf(''));
 busy=true;render();try{var result=await host('choose',[]);if(result){paths=result.split('\n').sort(NineGridCore.natural);selected=-1;status('素材已选好。点两个格子可交换顺序。');}}catch(e){status(e.message,'error');}finally{busy=false;render();}
};
$('build').onclick=async function(){
 var size=$('size').value.split('x');var cfg={mode:$('mode').value,name:$('name').value.trim(),paths:paths.slice(),width:Number(size[0]),height:Number(size[1]),fps:Number($('fps').value),gap:Number($('gap').value),audio:imageMode()?'mute':$('audio').value};
 try{NineGridCore.validate(cfg);}catch(e){status(e.message,'error');return;}
 busy=true;render();status(imageMode()?'正在检查图片编号、导入图像序列并生成九宫格…':'正在导入视频并生成九宫格，请等待 Premiere 完成…');
 try{status(await host('build',[cfg]),'success');}catch(e){status(e.message,'error');}finally{busy=false;render();}
};
render();host('ping',[]).then(function(v){connected=true;status('已连接 Premiere '+v+'。请为九格选择素材。');render();}).catch(function(e){status(e.message,'error');render();});
})();