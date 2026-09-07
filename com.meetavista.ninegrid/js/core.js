(function(root){
'use strict';
function validate(c){
 if(!c || !Array.isArray(c.paths) || c.paths.length!==9) throw Error('请为九个格子选择素材。');
 if(c.mode && ['video','imageSequence'].indexOf(c.mode)<0)throw Error('素材模式无效。');
 c.paths.forEach(function(p){if(typeof p!=='string'||!p||/[\r\n\x00]/.test(p))throw Error('素材路径无效。');});
 if(!c.name || !c.name.trim() || c.name.length>70)throw Error('请输入 1–70 字的序列名称。');
 if(['5760x3240','3840x2160','1920x1080'].indexOf(c.width+'x'+c.height)<0)throw Error('不支持的输出尺寸。');
 if([24,25,30,60].indexOf(c.fps)<0)throw Error('不支持的帧率。');
 if(!Number.isFinite(c.gap)||c.gap<0||c.gap>120||Math.floor(c.gap)!==c.gap)throw Error('间距请输入 0–120 的整数。');
 if(['mute','first','all'].indexOf(c.audio)<0)throw Error('声音设置无效。');
 return c;
}
function layout(w,h,g){
 var cells=[];var cw=w/3,ch=h/3;var fit=Math.min((cw-g)/cw,(ch-g)/ch);
 for(var i=0;i<9;i++)cells.push({position:[(i%3+.5)/3,(Math.floor(i/3)+.5)/3],scale:100/3*fit});
 return cells;
}
function natural(a,b){return a.localeCompare(b,undefined,{numeric:true,sensitivity:'base'});}
root.NineGridCore={validate:validate,layout:layout,natural:natural};
if(typeof module!=='undefined')module.exports=root.NineGridCore;
})(typeof window!=='undefined'?window:globalThis);