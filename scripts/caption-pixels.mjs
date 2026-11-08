// Compare the highlighted glyphs rather than requiring identical rasterization.
// Font antialiasing, pulse scale and codec rounding may move an edge by 1–2 px.
export function captionGlyphCoverage(reference,actual,width,height){
 if(reference.length!==width*height||actual.length!==reference.length)throw Error('Invalid caption region dimensions.');
 let peak=0,actualPeak=0;for(let i=0;i<reference.length;i++){peak=Math.max(peak,reference[i]);actualPeak=Math.max(actualPeak,actual[i]);}
 const referenceThreshold=Math.max(45,peak*.85),actualThreshold=Math.max(35,actualPeak*.85);
 let expected=0,matched=0,actualPixels=0,explained=0;
 if(peak>=60)for(let j=0;j<reference.length;j++)if(reference[j]>=referenceThreshold){
  expected++;const x=j%width,y=Math.floor(j/width);let found=false;
  for(let dy=-2;dy<=2&&!found;dy++)for(let dx=-2;dx<=2;dx++){
   const xx=x+dx,yy=y+dy;
   if(xx>=0&&xx<width&&yy>=0&&yy<height&&actual[yy*width+xx]>=actualThreshold){found=true;break;}
  }
  if(found)matched++;
 }
 if(actualPeak>=60)for(let j=0;j<actual.length;j++)if(actual[j]>=actualThreshold){
  actualPixels++;const x=j%width,y=Math.floor(j/width);let found=false;
  for(let dy=-2;dy<=2&&!found;dy++)for(let dx=-2;dx<=2;dx++){
   const xx=x+dx,yy=y+dy;
   if(xx>=0&&xx<width&&yy>=0&&yy<height&&reference[yy*width+xx]>=referenceThreshold){found=true;break;}
  }
  if(found)explained++;
 }
 const coverage=expected?matched/expected:0;
 const precision=actualPixels?explained/actualPixels:0;
 return {expectedPixels:expected,coverage,precision,passed:expected>12&&actualPixels>12&&actualPeak>=peak*.6&&coverage>=.9&&precision>=.9};
}
