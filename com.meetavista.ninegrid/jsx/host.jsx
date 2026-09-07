/* Nine Grid Assistant / Premiere 25.x / ExtendScript ES3 */
$._ninegrid = (function () {
    function response(ok, text) { return (ok ? 'OK|' : 'ERR|') + encodeURIComponent(String(text)); }
    function xml(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
    function norm(p) { return File(p).fsName.toLowerCase(); }
    function finite(n) { return typeof n === 'number' && isFinite(n); }
    function validate(c) {
        if (!c || !c.paths || c.paths.length !== 9) throw Error('请为九个格子选择素材。');
        if(c.mode && c.mode!=='video' && c.mode!=='imageSequence')throw Error('素材模式无效。');
        if (!c.name || typeof c.name !== 'string' || c.name.length > 70) throw Error('序列名称无效。');
        if (!((c.width===5760 && c.height===3240)||(c.width===3840 && c.height===2160)||(c.width===1920 && c.height===1080))) throw Error('输出尺寸无效。');
        if (c.fps!==24 && c.fps!==25 && c.fps!==30 && c.fps!==60) throw Error('帧率无效。');
        if (!finite(c.gap) || c.gap<0 || c.gap>120 || Math.floor(c.gap)!==c.gap) throw Error('间距无效。');
        if (c.audio!=='mute' && c.audio!=='first' && c.audio!=='all') throw Error('声音设置无效。');
        for(var i=0;i<9;i++) {
            if(typeof c.paths[i]!=='string'||/[\r\n\x00]/.test(c.paths[i])) throw Error('素材路径无效。');
            if(c.mode==='imageSequence') {
                if(!/\.(png|exr|jpg|jpeg|tif|tiff|tga|dpx|bmp)$/i.test(c.paths[i]))throw Error('第 '+(i+1)+' 格请选择图像序列首帧。');
            } else if(!/\.(mp4|mov|mxf|avi|m4v|mts|m2ts|mpg|mpeg|webm)$/i.test(c.paths[i])) throw Error('第 '+(i+1)+' 格请选择视频文件。');
            if(!File(c.paths[i]).exists) throw Error('找不到第 '+(i+1)+' 格素材：'+c.paths[i]);
        }
        if(!app.project || !app.project.rootItem) throw Error('请先打开或新建 PR 工程。');
        if(parseInt(app.version,10)!==25) throw Error('此版本插件适配 Premiere 2025（25.x）。');
    }
    function preset(c) {
        var audio=[];
        for(var i=0;i<9;i++) audio.push('{"mAssign":1,"mAudioSends":[],"mChannelType":1,"mIsOpen":false,"mIsSubmix":false,"mKeyframeMode":true,"mLocked":false,"mMatrix":[],"mMute":false,"mName":"A'+(i+1)+'","mPan":0,"mPannerAssignments":[],"mSolo":false,"mSyncLock":true,"mTargeted":true,"mTrackID":'+(i+2)+',"mVolume":1}');
        var display={24:100,25:101,30:104,60:108};
        var fields={VideoTimeDisplay:display[c.fps],AudioTimeDisplay:200,VideoFieldType:0,
            'EditingModeGUID.Win':'9678AF98-A7B7-4bdb-B477-7AC9C8DF4A4E',
            'EditingModeGUID.Mac':'795454d9-d3c2-429d-9474-923ab13b7018',
            'PreviewPresetFileName.Win':'QuickTime','PreviewPresetFileName.Mac':'QuickTime',
            'PreviewPresetVideoCodec.Win':1634755443,'PreviewPresetVideoCodec.Mac':1634755443,
            VideoFrameRate:254016000000/c.fps,VideoFrameSize:'0,0,'+c.width+','+c.height,
            PreviewVideoFrameSize:'0,0,'+c.width+','+c.height,VideoPixelAspectRatio:'1,1',
            VideoUseMaxBitDepth:'false',VideoUseMaxRenderQuality:'false',VideoAllowLinearCompositing:'true',
            AudioFrameRate:5292000,AudioChannelType:1,AdaptiveNumChannels:2,InitialNumberOfVideoTracks:9,
            AudioTracks:'['+audio.join(',')+']',VideoTracks:'[]',
            SequenceWorkingColorSpace:'{"workingSpaceConfigVersion":1,"workingSpaceID":"BT.709 RGB Full","workingSpaceIsLinearized":0}',AutoToneMapEnabled:'true'};
        var s='<?xml version="1.0" encoding="UTF-8"?><PremiereData Version="3"><SequencePreset ObjectRef="1"/><SequencePreset ObjectID="1" ClassID="5e73dd7e-4f86-4917-80eb-08ddb2f4a5f3" Version="9">';
        s+='<Names Version="1"><NameItem Version="1" Index="0"><First>en_US</First><Second>Nine Grid</Second></NameItem></Names>';
        for(var key in fields) if(fields.hasOwnProperty(key)) s+='<'+key+'>'+xml(fields[key])+'</'+key+'>';
        return s+'</SequencePreset></PremiereData>';
    }
    function findItem(bin,path) {
        for(var i=0;i<bin.children.numItems;i++) {
            var item=bin.children[i];
            if(item.type===2) { var found=findItem(item,path);if(found)return found; }
            else { try{if(item.getMediaPath() && norm(item.getMediaPath())===path)return item;}catch(ignored){} }
        }
        return null;
    }
    function motion(clip,idx,c) {
        var m=null;
        for(var j=0;j<clip.components.numItems;j++) {
            var comp=clip.components[j];
            if(comp.matchName==='AE.ADBE Motion'||comp.matchName==='ADBE Motion'){m=comp;break;}
        }
        if(!m || m.properties.numItems<2)throw Error('第 '+(idx+1)+' 格缺少运动参数。');
        // Scale to Frame Size normalizes footage to sequence size before Motion scaling.
        var cw=c.width/3,ch=c.height/3;
        var scale=100/3*Math.min((cw-c.gap)/cw,(ch-c.gap)/ch);
        var pos=[(idx%3+0.5)/3,(Math.floor(idx/3)+0.5)/3];
        m.properties[0].setValue(pos,true);
        m.properties[1].setValue(scale,true);
        var actual=m.properties[0].getValue(),actualScale=m.properties[1].getValue();
        if(!actual||Math.abs(actual[0]-pos[0])>0.0001||Math.abs(actual[1]-pos[1])>0.0001||Math.abs(actualScale-scale)>0.01)throw Error('第 '+(idx+1)+' 格的布局参数未成功写入。');
    }
    function choose() {
        try {
            var files=File.openDialog('选择 9 段视频（可多选）','视频:*.mp4;*.mov;*.mxf;*.avi;*.m4v;*.mts;*.m2ts;*.mpg;*.mpeg;*.webm',true);
            if(!files)return response(true,'');
            if(files.length!==9)throw Error('本次选择了 '+files.length+' 个文件，请一次选择 9 个。');
            var paths=[];for(var i=0;i<files.length;i++)paths.push(files[i].fsName);
            return response(true,paths.join('\n'));
        } catch(e) {return response(false,e.message);}
    }

    function inspectImages(p) {
        var f=File(p),name=decodeURI(f.name),m=/^(.*?)(\d+)(\.(?:png|exr|jpg|jpeg|tif|tiff|tga|dpx|bmp))$/i.exec(name);
        if(!m)throw Error('图片名称需以连续编号结尾，例如 Camera1.0001.exr。');
        var entries=f.parent.getFiles(),numbers=[];
        for(var i=0;i<entries.length;i++) {
            if(!(entries[i] instanceof File))continue;
            var part=/^(.*?)(\d+)(\.[^.]+)$/.exec(decodeURI(entries[i].name));
            if(part && part[1]===m[1] && part[2].length===m[2].length && part[3].toLowerCase()===m[3].toLowerCase())numbers.push(Number(part[2]));
        }
        numbers.sort(function(a,b){return a-b;});
        if(numbers.length<2)throw Error('没有找到至少两张同前缀、同编号位数的连续图片。');
        if(numbers[0]!==Number(m[2]))throw Error('请选这组图像序列的第一帧，最小编号是 '+numbers[0]+'。');
        for(var j=1;j<numbers.length;j++)if(numbers[j]!==numbers[j-1]+1)throw Error('图片编号不连续：'+numbers[j-1]+' 后应为 '+(numbers[j-1]+1)+'。请补齐缺帧再导入。');
        return numbers.length;
    }
    function chooseImage() {
        try {
            var f=File.openDialog('选择一组图像序列的首帧','图像序列:*.png;*.exr;*.jpg;*.jpeg;*.tif;*.tiff;*.tga;*.dpx;*.bmp',false);
            if(!f)return response(true,'');
            inspectImages(f.fsName);
            return response(true,f.fsName);
        }catch(e){return response(false,e.message);}
    }
    function imageItem(bin,p,idx,fps) {
        var child=bin.createBin('格 '+(idx+1)+' · 图像序列');
        if(!child || !app.project.importFiles([p],true,child,true))throw Error('第 '+(idx+1)+' 组图像序列导入失败。');
        var item=null,count=0;
        for(var i=0;i<child.children.numItems;i++)if(child.children[i].type!==2){item=child.children[i];count++;}
        if(count!==1)throw Error('第 '+(idx+1)+' 组没有导入为单个图像序列片段。');
        var interp=item.getFootageInterpretation();
        if(!interp)throw Error('无法读取图像序列帧率。');
        interp.frameRate=fps;item.setFootageInterpretation(interp);
        var actual=item.getFootageInterpretation();
        if(!actual || Math.abs(actual.frameRate-fps)>0.0001)throw Error('图像序列帧率未成功设为 '+fps+'。');
        return item;
    }

    function build(c) {
        var seq=null,bin=null,presetFile=null,stage='检查素材';
        try {
            validate(c);
            var imageMode=c.mode==='imageSequence',imageCounts=[];
            if(imageMode)for(var im=0;im<9;im++){stage='检查第 '+(im+1)+' 组图像序列';imageCounts.push(inspectImages(c.paths[im]));}
            var stamp=String(new Date().getTime());var name=c.name+'_'+stamp.slice(-6);
            stage='创建序列';
            presetFile=File(Folder.temp.fsName+'/meetavista_ninegrid_'+stamp+'.sqpreset');
            presetFile.encoding='UTF8';
            if(!presetFile.open('w'))throw Error('无法写入临时序列预设。');
            presetFile.write(preset(c));presetFile.close();
            var oldIDs={};for(var a=0;a<app.project.sequences.numSequences;a++)oldIDs[app.project.sequences[a].sequenceID]=true;
            app.enableQE();qe.project.newSequence(name,presetFile.fsName);
            for(var b=0;b<app.project.sequences.numSequences;b++){var candidate=app.project.sequences[b];if(!oldIDs[candidate.sequenceID]&&candidate.name===name){seq=candidate;break;}}
            if(!seq)throw Error('PR 未能从预设创建序列。');
            if(seq.videoTracks.numTracks<9 || seq.audioTracks.numTracks<9)throw Error('PR 未生成所需的九条视频／音频轨道。');
            var settings=seq.getSettings();
            if(Number(settings.videoFrameWidth)!==c.width || Number(settings.videoFrameHeight)!==c.height || Math.abs(Number(settings.videoFrameRate.seconds)-1/c.fps)>0.000001)throw Error('序列尺寸或帧率与设置不一致。');
            stage='导入素材';bin=app.project.rootItem.createBin(name+' · 素材');
            if(!bin)throw Error('无法创建素材箱。');
            if(!imageMode && !app.project.importFiles(c.paths,true,bin,false))throw Error('素材导入失败；请确认视频可在 PR 中正常读取。');
            var clips=[],shortest=Number.MAX_VALUE;
            for(var i=0;i<9;i++) {
                stage='排列第 '+(i+1)+' 格';
                var item=imageMode?imageItem(bin,c.paths[i],i,c.fps):findItem(bin,norm(c.paths[i]));
                if(!item)throw Error('导入后未找到素材 '+File(c.paths[i]).name+'。');
                item.clearInPoint();item.clearOutPoint();item.setScaleToFrameSize();
                seq.overwriteClip(item,'0',i,i);
                var track=seq.videoTracks[i];
                if(track.clips.numItems!==1)throw Error('素材没有可用视频画面，或插入未成功。');
                var clip=track.clips[0];
                if(Math.abs(clip.start.seconds)>0.000001)throw Error('素材未从序列开头开始。');
                if(imageMode && Math.abs(clip.end.seconds*c.fps-imageCounts[i])>0.5)throw Error('第 '+(i+1)+' 组导入帧数与文件数量不一致，可能未按完整图像序列导入。');
                motion(clip,i,c);clips.push(clip);
                shortest=Math.min(shortest,clip.end.seconds);
            }
            stage='统一时长和声音';
            var frames=Math.floor(shortest*c.fps+0.00001);
            if(frames<1)throw Error('存在不足一帧的视频。');
            var end=new Time();end.seconds=frames/c.fps;
            for(var k=0;k<9;k++)clips[k].end=end;
            for(var t=0;t<seq.audioTracks.numTracks;t++) {
                var at=seq.audioTracks[t];at.setMute(imageMode||c.audio==='mute'||(c.audio==='first'&&t!==0)?1:0);
                for(var ac=0;ac<at.clips.numItems;ac++)if(at.clips[ac].end.seconds>end.seconds)at.clips[ac].end=end;
            }
            for(var v=0;v<9;v++)if(Math.abs(clips[v].end.seconds-end.seconds)>0.5/c.fps)throw Error('第 '+(v+1)+' 格时长未同步。');
            seq.setPlayerPosition('0');app.project.openSequence(seq.sequenceID);
            return response(true,'已生成：'+name+'\n'+c.width+' × '+c.height+' · '+c.fps+' fps · '+frames+' 帧（'+end.seconds.toFixed(2)+' 秒）\n请检查九格画面和声音，然后保存工程。');
        } catch(e) {
            if(seq){try{seq.name=seq.name+' [未完成]';app.project.openSequence(seq.sequenceID);}catch(ignored){}}
            return response(false,stage+'失败：'+e.message+(seq?'\n已保留标记为“未完成”的新序列，供检查；原有序列没有被修改。':''));
        } finally {if(presetFile){try{presetFile.close();if(presetFile.exists)presetFile.remove();}catch(ignored){}}}
    }
    return {ping:function(){return response(true,app.version);},choose:choose,chooseImage:chooseImage,build:build};
})();