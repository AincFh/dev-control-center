/** ATLAS Image Studio: fully browser-local real pixel operations, no upload. */
import{IMAGE_LIMITS,IMAGE_FORMATS,validateImageFile,planImageOutput,recommendedDimensions,proportionalDimension,imageReport}from'./image-studio-core.js';
const $=id=>document.getElementById(id);
const S={bitmap:null,file:null,url:null,ready:false,plan:null,lastRotation:0};
const notice=(message,error=false)=>{const n=$('imageFeedback');n.textContent=message;n.dataset.state=error?'error':'info'};
const bytes=n=>n>=1048576?(n/1048576).toFixed(2)+' MB':(n/1024).toFixed(1)+' KB';
function clearResult(){
 S.ready=false;S.plan=null;$('imageDownload').disabled=true;$('imageOutputInfo').textContent='尚未生成处理结果';
 $('imageProcessedCanvas').hidden=true;
}
function release(){
 if(S.bitmap?.close)S.bitmap.close();S.bitmap=null;
 if(S.url){URL.revokeObjectURL(S.url);S.url=null;}
 S.file=null;clearResult();
 $('imageOriginalPreview').hidden=true;$('imageOriginalPreview').removeAttribute('src');
 $('imageSourceInfo').textContent='尚未选择本地图片';$('imageProcess').disabled=true;
}
function sourceDimensions(){
 const rotation=Number($('imageRotation').value);
 return rotation%180?{width:S.bitmap.height,height:S.bitmap.width}:{width:S.bitmap.width,height:S.bitmap.height};
}
function updateAspect(sourceChanged){
 if(!S.bitmap||!$('imageAspectLock').checked)return;
 const size=sourceDimensions();
 if(sourceChanged==='width'){
  const w=Number($('imageWidth').value);
  if(Number.isInteger(w)&&w>=1&&w<=IMAGE_LIMITS.maxSide)
   $('imageHeight').value=proportionalDimension(size.width,size.height,w,{basis:'width'});
 }else{
  const h=Number($('imageHeight').value);
  if(Number.isInteger(h)&&h>=1&&h<=IMAGE_LIMITS.maxSide)
   $('imageWidth').value=proportionalDimension(size.width,size.height,h,{basis:'height'});
 }
}
async function loadImage(file){
 if(!file)return;
 release();
 try{
  validateImageFile(file);
  const bitmap=await createImageBitmap(file);
  if(bitmap.width<=0||bitmap.height<=0||bitmap.width>100000||bitmap.height>100000){bitmap.close();throw Error('图片像素尺寸无法处理');}
  S.bitmap=bitmap;S.file=file;S.url=URL.createObjectURL(file);
  const image=$('imageOriginalPreview');image.src=S.url;image.hidden=false;
  const dim=recommendedDimensions(bitmap.width,bitmap.height);
  $('imageWidth').value=dim.width;$('imageHeight').value=dim.height;
  $('imageRotation').value='0';S.lastRotation=0;
  $('imageSourceInfo').textContent=file.name+' · '+bitmap.width+' × '+bitmap.height+' 像素 · '+bytes(file.size);
  $('imageProcess').disabled=false;
  notice('图片已在浏览器本地读取。可调节尺寸、适配模式和导出格式。');
 }catch(error){release();notice('读取图片失败：'+error.message,true);}
}
function options(){
 return {
  width:Number($('imageWidth').value),height:Number($('imageHeight').value),
  rotation:Number($('imageRotation').value),fit:$('imageFit').value,format:$('imageFormat').value,
  quality:Number($('imageQuality').value),flipX:$('imageFlip').checked,grayscale:$('imageGray').checked,
  background:$('imageBackground').value
 };
}
function renderImage(){
 if(!S.bitmap||!S.file){notice('请先选择本地图片。',true);return;}
 clearResult();
 try{
  const plan=planImageOutput(S.bitmap.width,S.bitmap.height,options());
  const canvas=$('imageProcessedCanvas');canvas.width=plan.width;canvas.height=plan.height;
  const ctx=canvas.getContext('2d',{alpha:plan.format!=='jpeg'});
  if(!ctx)throw Error('浏览器不支持 Canvas 2D');
  ctx.clearRect(0,0,plan.width,plan.height);
  // JPEG has no alpha; explicitly fill the user-chosen background.
  if(plan.format==='jpeg'){ctx.fillStyle=plan.background;ctx.fillRect(0,0,plan.width,plan.height);}
  ctx.save();ctx.translate(plan.width/2,plan.height/2);
  ctx.rotate(plan.rotation*Math.PI/180);
  ctx.scale(plan.flipX?-1:1,1);
  ctx.filter=plan.grayscale?'grayscale(1)':'none';
  ctx.drawImage(S.bitmap,plan.drawX,plan.drawY,plan.drawW,plan.drawH);
  ctx.restore();
  S.plan=plan;S.ready=true;canvas.hidden=false;
  $('imageOutputInfo').textContent=plan.width+' × '+plan.height+' 像素 · '+plan.format.toUpperCase()+' · 浏览器本地像素处理';
  $('imageDownload').disabled=false;
  notice('图片已处理。点击导出后才会在本地生成文件，不会上传原始内容。');
 }catch(error){clearResult();notice('处理失败：'+error.message,true);}
}
async function downloadImage(){
 if(!S.ready||!S.plan||!S.file)return;
 const canvas=$('imageProcessedCanvas'),plan=S.plan;
 $('imageDownload').disabled=true;
 try{
  const blob=await new Promise((resolve,reject)=>canvas.toBlob(v=>v?resolve(v):reject(Error('图像编码失败')),plan.mime,plan.quality));
  if(blob.type!==plan.mime)throw Error('当前浏览器不支持 '+plan.format.toUpperCase()+' 编码');
  const stem=S.file.name.replace(/\.[^.]+$/,'').replace(/[^A-Za-z0-9_\u4e00-\u9fa5.-]/g,'_').slice(0,70)||'image';
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=stem+'-atlas-'+plan.width+'x'+plan.height+'.'+plan.format;
  document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);
  const report=imageReport({originalBytes:S.file.size,exportBytes:blob.size,width:plan.width,height:plan.height,format:plan.format});
  $('imageOutputInfo').textContent=plan.width+' × '+plan.height+' · '+bytes(blob.size)+' · '+report.description;
  notice('已生成本地导出：'+bytes(blob.size)+'。原始图片未被修改或上传。');
 }catch(error){notice('无法导出图片：'+error.message,true);}
 finally{$('imageDownload').disabled=false;}
}
export function initImageStudio(){
 $('imageFile').addEventListener('change',e=>{void loadImage(e.target.files?.[0])});
 $('imageProcess').onclick=renderImage;
 $('imageDownload').onclick=()=>{void downloadImage()};
 $('imageReset').onclick=()=>{release();$('imageFile').value='';notice('图片已从当前工作区清除。')};
 $('imageWidth').addEventListener('input',()=>{updateAspect('width');clearResult()});
 $('imageHeight').addEventListener('input',()=>{updateAspect('height');clearResult()});
 $('imageAspectLock').onchange=()=>{if(S.bitmap&&$('imageAspectLock').checked)updateAspect('width');clearResult()};
 $('imageRotation').onchange=()=>{
  if(S.bitmap){
   const next=Number($('imageRotation').value),changed=(next%180)!==(S.lastRotation%180);
   if(changed){const w=$('imageWidth').value;$('imageWidth').value=$('imageHeight').value;$('imageHeight').value=w;}
   S.lastRotation=next;
  }
  clearResult();
 };
 $('imageFormat').onchange=()=>{$('imageQuality').disabled=$('imageFormat').value==='png';clearResult()};
 for(const id of ['imageFit','imageFlip','imageGray','imageBackground','imageQuality'])
  $(id).addEventListener('input',()=>{if(id==='imageQuality')$('imageQualityValue').textContent=$('imageQuality').value+'%';clearResult()});
 $('imageQuality').disabled=true;notice('选择 PNG、JPEG 或 WebP 图片，即可进行完全离线的尺寸与像素处理。');
}
