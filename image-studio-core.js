/** ATLAS Image Studio pure planning and validation layer.
 * Canvas processing is browser-local; exports do not reuse camera EXIF metadata.
 */
export const IMAGE_LIMITS=Object.freeze({maxBytes:25*1024*1024,maxSide:4096,maxPixels:12_000_000});
export const IMAGE_FORMATS=Object.freeze({png:'image/png',jpeg:'image/jpeg',webp:'image/webp'});
export const FIT_MODES=Object.freeze(['contain','cover','stretch']);
export const ROTATIONS=Object.freeze([0,90,180,270]);
const integer=(x,min,max)=>Number.isSafeInteger(Number(x))&&Number(x)>=min&&Number(x)<=max;
export function validateImageFile(file){
 if(!file||typeof file.name!=='string'||!integer(file.size,1,IMAGE_LIMITS.maxBytes))throw Error('请选择不超过 25 MB 的有效图片文件');
 const type=String(file.type||'');
 if(!Object.values(IMAGE_FORMATS).includes(type))throw Error('仅支持静态 PNG、JPEG 和 WebP 图片');
 return {name:file.name,bytes:file.size,type};
}
export function planImageOutput(sourceWidth,sourceHeight,{width,height,rotation=0,fit='contain',format='png',quality=90,flipX=false,grayscale=false,background='#ffffff'}={}){
 if(!integer(sourceWidth,1,100_000)||!integer(sourceHeight,1,100_000))throw Error('输入图片尺寸无效');
 if(!integer(width,1,IMAGE_LIMITS.maxSide)||!integer(height,1,IMAGE_LIMITS.maxSide))throw Error('导出宽高需介于 1 和 '+IMAGE_LIMITS.maxSide+' 像素之间');
 const w=Number(width),h=Number(height);
 if(w*h>IMAGE_LIMITS.maxPixels)throw Error('目标图像超过 '+IMAGE_LIMITS.maxPixels.toLocaleString('en-US')+' 像素限制');
 if(!ROTATIONS.includes(Number(rotation)))throw Error('不支持该旋转角度');
 if(!FIT_MODES.includes(fit))throw Error('不支持该图片适配方式');
 if(!Object.hasOwn(IMAGE_FORMATS,format))throw Error('不支持该导出格式');
 if(!integer(quality,1,100))throw Error('图片质量需在 1–100 之间');
 if(!/^#[\da-fA-F]{6}$/.test(String(background)))throw Error('背景颜色必须为六位十六进制值');
 const rot=Number(rotation),sw=Number(sourceWidth),sh=Number(sourceHeight),areaW=rot%180?h:w,areaH=rot%180?w:h;
 const scale=fit==='stretch'?null:(fit==='cover'?Math.max(areaW/sw,areaH/sh):Math.min(areaW/sw,areaH/sh));
 const drawW=fit==='stretch'?areaW:sw*scale,drawH=fit==='stretch'?areaH:sh*scale;
 return {width:w,height:h,rotation:rot,fit,format,mime:IMAGE_FORMATS[format],
  quality:Number(quality)/100,flipX:!!flipX,grayscale:!!grayscale,background,
  drawW,drawH,areaW,areaH,sourceWidth:sw,sourceHeight:sh,
  // Image is centered around the canvas origin after translation and rotation.
  drawX:-drawW/2,drawY:-drawH/2};
}
export function recommendedDimensions(width,height,{rotation=0,maxSide=IMAGE_LIMITS.maxSide}={}){
 if(!integer(width,1,100_000)||!integer(height,1,100_000)||!ROTATIONS.includes(Number(rotation)))throw Error('图片尺寸无效');
 let w=Number(rotation)%180?Number(height):Number(width),h=Number(rotation)%180?Number(width):Number(height);
 const scale=Math.min(1,maxSide/w,maxSide/h,Math.sqrt(IMAGE_LIMITS.maxPixels/(w*h)));
 w=Math.max(1,Math.round(w*scale));h=Math.max(1,Math.round(h*scale));
 return{width:w,height:h};
}
export function proportionalDimension(sourceWidth,sourceHeight,target,{basis='width'}={}){
 if(!integer(sourceWidth,1,100_000)||!integer(sourceHeight,1,100_000)||!integer(target,1,IMAGE_LIMITS.maxSide))throw Error('无法计算目标宽高比例');
 if(basis==='width')return Math.max(1,Math.min(IMAGE_LIMITS.maxSide,Math.round(target*sourceHeight/sourceWidth)));
 if(basis==='height')return Math.max(1,Math.min(IMAGE_LIMITS.maxSide,Math.round(target*sourceWidth/sourceHeight)));
 throw Error('仅支持宽度或高度锁定');
}
export function imageReport({originalBytes,exportBytes,width,height,format}){
 if(!integer(originalBytes,1,IMAGE_LIMITS.maxBytes)||!integer(exportBytes,0,200_000_000))throw Error('图片大小统计无效');
 const saved=100*(1-exportBytes/originalBytes);
 return {originalBytes,exportBytes,width,height,format,
  changePercent:Math.round(saved*10)/10,
  description:saved>=0?'体积减少 '+saved.toFixed(1)+'%':'体积增加 '+Math.abs(saved).toFixed(1)+'%'};
}
