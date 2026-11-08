// Perspective panel with a fixed hinge. Coordinates are authored illustration
// coordinates, not a claim of a general 3D physics simulation.
export function hingedPanelAt({a,b,freeA,freeB,lift=260,angle=0}){
 if(![a,b,freeA,freeB].every(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite))||![lift,angle].every(Number.isFinite))throw Error('Invalid hinge geometry.');
 const r=angle*Math.PI/180,c=Math.cos(r),s=Math.sin(r);
 const turn=(anchor,point)=>[anchor[0]+(point[0]-anchor[0])*c,anchor[1]+(point[1]-anchor[1])*c-lift*s];
 return [a,b,turn(b,freeB),turn(a,freeA)];
}
