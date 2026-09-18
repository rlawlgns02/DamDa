const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
function normalizeCard(raw) {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.fields) || raw.fields.length > 20) throw new Error('명함 항목을 확인해 주세요.');
  const text = (value, max) => {
    if (typeof value !== 'string' || value.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) throw new Error('입력한 정보가 올바르지 않아요.');
    return value.trim();
  };
  const showName = raw.showName !== false;
  const name = showName ? text(raw.name, 30) : '';
  const fields = raw.fields.filter(f => f && f.selected !== false).map(f => ({label:text(f.label,20),value:text(f.value,120),selected:true})).filter(f=>f.label&&f.value);
  const photo = raw.photo || '';
  if (typeof photo !== 'string' || photo.length > 2800000 || (photo && !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(photo))) throw new Error('사진 형식을 확인해 주세요.');
  if (!name && !fields.length) throw new Error('공개할 정보를 하나 이상 선택해 주세요.');
  const source=raw.back&&typeof raw.back==='object'?raw.back:{};
  const back={title:text(source.title??'Nice to meet you.',60),message:text(source.message??'',240),color:['blue','dark','mint','light'].includes(source.color)?source.color:'blue',pattern:['plain','orbits','grid'].includes(source.pattern)?source.pattern:'orbits'};
  return {back,name,showName,theme:['light','dark','mint','blue'].includes(raw.theme)?raw.theme:'light',photo,photoShape:['circle','rounded','square'].includes(raw.photoShape)?raw.photoShape:'circle',photoSize:['small','medium','large'].includes(raw.photoSize)?raw.photoSize:'medium',fields};
}
function createStore(directory) {
  return {
    async save(raw) {
      const data = normalizeCard(raw);
      const id = crypto.randomBytes(18).toString('hex');
      await fs.mkdir(directory,{recursive:true});
      await fs.writeFile(path.join(directory,id+'.json'),JSON.stringify(data),{flag:'wx'});
      return {id,data};
    },
    async get(id) {
      if (!/^[a-f0-9]{36}$/.test(id)) return null;
      try { return normalizeCard(JSON.parse(await fs.readFile(path.join(directory,id+'.json'),'utf8'))); }
      catch(error) { if(error.code==='ENOENT') return null; throw error; }
    }
  };
}
module.exports = {normalizeCard,createStore};
