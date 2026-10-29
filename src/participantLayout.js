export function participantLayout(width,height,count,gallery=true){
 const w=Math.max(1,width),h=Math.max(1,height),n=Math.max(1,count),gap=12;
 if(!gallery){const tileWidth=Math.min(180,Math.max(116,(w-gap*(n-1))/n));return {tileWidth:Math.floor(tileWidth),tileHeight:104,columns:n};}
 let best={tileWidth:1,tileHeight:1,columns:1,score:-1};
 for(let columns=1;columns<=n;columns++){
  const rows=Math.ceil(n/columns),availableWidth=(w-gap*(columns-1))/columns,availableHeight=(h-gap*(rows-1))/rows;
  const tileWidth=Math.max(1,Math.min(840,availableWidth,availableHeight*1.6)),tileHeight=tileWidth/1.6;
  const score=tileWidth*tileHeight;
  if(score>best.score)best={tileWidth:Math.floor(tileWidth),tileHeight:Math.floor(tileHeight),columns,score};
 }
 return best;
}
