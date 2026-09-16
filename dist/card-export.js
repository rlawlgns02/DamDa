(function(scope){
  'use strict';
  const visibleFields=data=>data.fields.filter(f=>f.selected!==false&&f.value);
  const escapeV=value=>String(value).replace(/\\/g,'\\\\').replace(/\r\n|\r|\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');
  function vcard(data){
    const lines=['BEGIN:VCARD','VERSION:3.0','FN:'+escapeV(data.showName===false?'FOLD 명함':data.name||'FOLD 명함')];
    const notes=[];
    for(const f of visibleFields(data)){
      const key=({'이메일':'EMAIL;TYPE=INTERNET','전화번호':'TEL;TYPE=CELL','회사':'ORG','직업':'TITLE'})[f.label];
      if(key)lines.push(key+':'+escapeV(f.value));else notes.push(f.label+': '+f.value);
    }
    if(notes.length)lines.push('NOTE:'+escapeV(notes.join('\n')));
    lines.push('END:VCARD');
    // Fold physical lines at 75 UTF-8 octets without splitting a character.
    return lines.map(line=>{let result='',bytes=0;for(const char of line){const size=new TextEncoder().encode(char).length;if(bytes+size>75){result+='\r\n ';bytes=1;}result+=char;bytes+=size;}return result;}).join('\r\n')+'\r\n';
  }
  function download(blob,filename){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
  function filename(data,extension){return 'FOLD-'+(data.showName===false?'명함':data.name||'명함').replace(/[<>:"/\\|?*\u0000-\u001f]/g,'_')+'.'+extension;}
  async function png(data){
    if(document.fonts?.ready)await document.fonts.ready;
    const canvas=document.createElement('canvas');canvas.width=1080;
    const ctx=canvas.getContext('2d');if(!ctx)throw Error('이미지를 만들 수 없어요.');
    const font=(size,weight=400)=>`${weight} ${size}px "Noto Sans KR", sans-serif`;
    const wrap=(value,width)=>{const lines=[];let line='';for(const char of String(value)){if(char==='\n'||(line&&ctx.measureText(line+char).width>width)){lines.push(line);line='';if(char==='\n')continue;}line+=char;}lines.push(line);return lines;};
    ctx.font=font(31);const rows=visibleFields(data).map(f=>({...f,lines:wrap(f.value,864)}));
    ctx.font=font(56,700);const names=data.showName===false?[]:wrap(data.name,864);
    const titleHeight=names.length*76;
    canvas.height=Math.max(650,270+titleHeight+rows.reduce((h,r)=>h+68+r.lines.length*46,0)+90);
    const dark=data.theme==='dark',bg=dark?'#192b50':data.theme==='mint'?'#e7f6f1':'#ffffff';
    ctx.fillStyle=bg;ctx.fillRect(0,0,1080,canvas.height);
    ctx.strokeStyle=dark?'#3e5072':'#e4e9f2';ctx.strokeRect(1,1,1078,canvas.height-2);
    ctx.fillStyle=dark?'#c3cee7':'#7181a1';ctx.font=font(25,700);ctx.fillText('FOLD / MY CARD',108,100);
    let y=200;
    if(data.photo){const image=new Image();await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(Error('프로필 사진을 읽을 수 없어요.'));image.src=data.photo;});ctx.save();ctx.beginPath();ctx.arc(927,155,45,0,Math.PI*2);ctx.clip();const size=Math.min(image.width,image.height);ctx.drawImage(image,(image.width-size)/2,(image.height-size)/2,size,size,882,110,90,90);ctx.restore();}
    ctx.fillStyle=dark?'#ffffff':'#19243a';ctx.font=font(56,700);for(const name of names){ctx.fillText(name,108,y+45);y+=76;}
    y+=35;ctx.strokeStyle=dark?'#3e5072':'#e4e9f2';ctx.beginPath();ctx.moveTo(108,y);ctx.lineTo(972,y);ctx.stroke();y+=55;
    for(const row of rows){ctx.fillStyle=dark?'#9cadcf':'#738097';ctx.font=font(23);ctx.fillText(row.label,108,y);y+=43;ctx.font=font(31);ctx.fillStyle=dark?'#ffffff':'#19243a';for(const line of row.lines){ctx.fillText(line,108,y);y+=46;}y+=25;}
    return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('이미지 저장에 실패했어요.')),'image/png'));
  }
  const api={vcard,png,download,filename};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else scope.FoldExport=api;
})(typeof globalThis!=='undefined'?globalThis:this);
