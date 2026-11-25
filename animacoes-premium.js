/* V2J Animations 2.0 — lightweight transparent Canvas 2D renderer. */
(function(root){
'use strict';
const TAU=Math.PI*2, clamp=(n,a,b)=>Math.max(a,Math.min(b,n)), fract=n=>n-Math.floor(n);
const rand=(i,j)=>fract(Math.sin(i*127.1+j*311.7+13.3)*43758.5453);
const mix=(a,b,t)=>a+(b-a)*t;
const smooth=x=>{x=clamp(x,0,1);return x*x*(3-2*x)};
const colors=['#ff438f','#ffd36a','#61e9ff','#bd78ff','#63ffbf','#ff7955'];
const profiles={
 confetti:['foil','fall','multi'],fireworks:['star','firework','multi'],shootingStars:['star','meteor','accent'],
 sparkles:['star','twinkle','accent'],neonExplosion:['spark','burst','multi'],hearts:['heart','rise','accent'],
 heartExplosion:['heart','burst','accent'],heartRain:['heart','fall','accent'],kisses:['kiss','rise','accent'],
 petals:['petal','drift','accent'],money:['money','fall','green'],coins:['coin','fall','gold'],
 diamonds:['gem','drift','ice'],crown:['gem','orbit','gold'],goldenBurst:['star','burst','gold'],
 rain:['emoji','fall','multi'],balloons:['balloon','rise','multi'],bubbles:['bubble','rise','ice'],
 lightning:['spark','electric','accent'],particles:['spark','orbit','multi'],neonHearts:['heart','orbit','accent'],
 psychedelic:['spark','spiral','multi'],pulse:['spark','orbit','accent'],lightWaves:['spark','wave','multi'],
 colorBurst:['foil','burst','multi'],stars:['star','twinkle','gold']
};
const thanks={likes:['heart','rise','accent'],follow:['star','orbit','accent'],purchase:['coin','fall','gold'],share:['arrow','orbit','accent']};
const tone=(kind,a,i)=>kind==='gold'?(i%3===0?'#fff0ac':a.color):kind==='green'?(i%3===0?'#c3ffd7':a.color):kind==='ice'?(i%3===0?'#d9faff':a.color):kind==='multi'?(i%3===0?a.color:colors[i%colors.length]):i%5===0?'#fff0fa':a.color;
function path(c,pts){c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath()}
function heart(c){c.beginPath();c.moveTo(0,28);c.bezierCurveTo(-12,17,-38,-2,-32,-22);c.bezierCurveTo(-26,-42,-6,-35,0,-23);c.bezierCurveTo(6,-35,26,-42,32,-22);c.bezierCurveTo(38,-2,12,17,0,28);c.closePath()}
function star(c){c.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,r=i%2?12:32;i?c.lineTo(Math.cos(a)*r,Math.sin(a)*r):c.moveTo(Math.cos(a)*r,Math.sin(a)*r)}c.closePath()}
function ellipse(c,x,y,rx,ry){c.beginPath();c.ellipse(x,y,rx,ry,0,0,TAU)}
function fill(c,col){c.fillStyle=col;c.fill()}
function shade(c,col){const g=c.createLinearGradient(-25,-34,28,34);g.addColorStop(0,'#ffffff');g.addColorStop(.23,col);g.addColorStop(.54,col);g.addColorStop(1,'#18213e');return g}
function makeSprite(kind,col,emoji){
 const cv=root.document.createElement('canvas');cv.width=cv.height=128;const c=cv.getContext('2d');if(!c)return null;
 c.translate(64,64);c.lineJoin='round';c.lineCap='round';
 const halo=c.createRadialGradient(0,0,2,0,0,57);halo.addColorStop(0,col+'45');halo.addColorStop(1,col+'00');c.fillStyle=halo;c.fillRect(-64,-64,128,128);
 const material=shade(c,col);
 if(kind==='emoji'){c.font='53px system-ui';c.textAlign='center';c.textBaseline='middle';c.fillText(emoji||'✨',0,0);return cv}
 if(kind==='heart'){heart(c);fill(c,material);c.strokeStyle=col;c.lineWidth=1.6;c.stroke();ellipse(c,-12,-18,10,5);fill(c,'#ffffffaa')}
 else if(kind==='star'){star(c);fill(c,material);c.strokeStyle='#ffffffe0';c.lineWidth=1.4;c.stroke();c.beginPath();c.moveTo(-39,0);c.lineTo(39,0);c.moveTo(0,-44);c.lineTo(0,44);c.strokeStyle=col+'a0';c.lineWidth=1;c.stroke()}
 else if(kind==='foil'){path(c,[[-25,-11],[24,-18],[28,12],[-18,19]]);fill(c,material);c.strokeStyle='#ffffff99';c.stroke()}
 else if(kind==='petal'){c.beginPath();c.moveTo(0,34);c.bezierCurveTo(-45,12,-36,-30,-6,-31);c.bezierCurveTo(28,-39,42,10,0,34);fill(c,material);c.beginPath();c.moveTo(0,30);c.quadraticCurveTo(-10,0,5,-25);c.strokeStyle='#ffffff80';c.stroke()}
 else if(kind==='kiss'){c.beginPath();c.moveTo(-35,-2);c.bezierCurveTo(-18,-22,-8,-23,0,-13);c.bezierCurveTo(8,-23,18,-22,35,-2);c.bezierCurveTo(12,31,-12,31,-35,-2);fill(c,material);c.beginPath();c.moveTo(-28,0);c.quadraticCurveTo(0,8,28,0);c.strokeStyle='#46132c';c.lineWidth=3;c.stroke()}
 else if(kind==='money'){c.fillStyle=material;c.fillRect(-38,-19,76,38);c.strokeStyle='#eeffe7';c.lineWidth=2;c.strokeRect(-34,-15,68,30);ellipse(c,0,0,14,12);fill(c,'#17523e');c.fillStyle='#e7ffe9';c.font='bold 15px sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText('R$',0,1)}
 else if(kind==='coin'){ellipse(c,0,0,31,31);fill(c,material);c.strokeStyle='#fff3bd';c.lineWidth=3;c.stroke();ellipse(c,0,0,23,23);c.strokeStyle='#a66c28';c.lineWidth=2;c.stroke();c.fillStyle='#fff4cb';c.font='bold 30px sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText('$',0,2)}
 else if(kind==='gem'){path(c,[[-31,-10],[-17,-29],[17,-29],[31,-10],[0,35]]);fill(c,material);path(c,[[-31,-10],[0,-29],[0,35]]);fill(c,'#ffffff50');path(c,[[0,-29],[31,-10],[0,35]]);fill(c,'#193a7155');c.strokeStyle='#ffffffce';c.lineWidth=1.2;c.stroke();c.beginPath();c.moveTo(-31,-10);c.lineTo(31,-10);c.moveTo(-17,-29);c.lineTo(0,35);c.lineTo(17,-29);c.stroke()}
 else if(kind==='balloon'){ellipse(c,0,-7,25,31);const g=c.createRadialGradient(-10,-19,2,0,-7,35);g.addColorStop(0,'#ffffff');g.addColorStop(.4,col);g.addColorStop(1,'#21213e');fill(c,g);path(c,[[-5,23],[5,23],[7,29],[-7,29]]);fill(c,col);c.beginPath();c.moveTo(0,28);c.bezierCurveTo(-11,40,12,44,1,57);c.strokeStyle='#ffffffaa';c.stroke()}
 else if(kind==='bubble'){ellipse(c,0,0,34,34);const g=c.createRadialGradient(-12,-13,1,0,0,34);g.addColorStop(0,'#ffffff70');g.addColorStop(.35,col+'08');g.addColorStop(.8,col+'18');g.addColorStop(1,col+'aa');fill(c,g);c.strokeStyle=col+'cc';c.lineWidth=1.5;c.stroke();c.beginPath();c.arc(0,0,28,3.7,4.8);c.strokeStyle='#ffffffdf';c.lineWidth=3;c.stroke()}
 else if(kind==='arrow'){path(c,[[-30,-8],[5,-8],[5,-25],[35,0],[5,25],[5,8],[-30,8]]);fill(c,material);c.strokeStyle='#ffffffb0';c.stroke()}
 else{const g=c.createRadialGradient(0,0,0,0,0,33);g.addColorStop(0,'#fff');g.addColorStop(.16,col);g.addColorStop(.48,col+'55');g.addColorStop(1,col+'00');c.fillStyle=g;c.fillRect(-35,-35,70,70)}
 return cv;
}
function create(canvas,a){
 const c=canvas.getContext('2d',{alpha:true});if(!c)return null;
 const profile=thanks[a.thankYouType]||profiles[a.effect];if(!profile)return null;
 const [kind,motion,scheme]=profile, intensity=clamp(a.intensity/100,.2,1), speed=a.speed||1;
 const count=Math.round(24+intensity*68), sprites=new Map();
 function sprite(k,col){const key=k+col;if(!sprites.has(key))sprites.set(key,makeSprite(k,col,a.emoji));return sprites.get(key)}
 const ps=Array.from({length:count},(_,i)=>{const col=tone(scheme,a,i);return {i,col,im:sprite(kind,col),phase:rand(i,1),x:rand(i,2),y:rand(i,3),z:rand(i,4),angle:rand(i,5)*TAU,spin:rand(i,6)*2-1,rate:.7+rand(i,7)*.6}});
 const dust=colors.map(x=>sprite('spark',x));const accentDust=sprite('spark',a.color);
 function position(x,y,w,h){if(a.position==='center')return [w*(.2+.6*x),h*(.2+.6*y)];if(a.position==='edges'){const side=x<.5?0:1;return [w*(side?.83+.17*x:.17*x),h*y]}return [w*x,h*y]}
 function stamp(im,x,y,size,angle,alpha,squash=1){if(!im||alpha<=.001)return;c.save();c.globalAlpha=clamp(alpha,0,1);c.translate(x,y);c.rotate(angle);c.scale(squash,1);c.drawImage(im,-size/2,-size/2,size,size);c.restore()}
 function streak(x,y,xx,yy,col,alpha,width){c.save();c.globalAlpha=clamp(alpha,0,1);const g=c.createLinearGradient(x,y,xx,yy);g.addColorStop(0,col+'00');g.addColorStop(.8,col);g.addColorStop(1,'#fff');c.strokeStyle=g;c.lineWidth=width;c.lineCap='round';c.beginPath();c.moveTo(x,y);c.lineTo(xx,yy);c.stroke();c.restore()}
 function ring(x,y,r,aspect,alpha,col,angle){if(r<=0)return;c.save();c.globalAlpha=alpha;c.translate(x,y);c.rotate(angle);c.beginPath();c.ellipse(0,0,r,r*aspect,0,0,TAU);c.strokeStyle=col;c.lineWidth=1.3;c.stroke();c.restore()}
 function draw(elapsed,w,h){
  const base=Math.min(w,h),t=elapsed*speed,life=elapsed/(a.duration/1000),env=a.loop?1:smooth(life/.12)*smooth((1-life)/.17);
  c.clearRect(0,0,w,h);if(env<=0)return;
  const cx=w/2,cy=h/2, core=a.position==='edges'?0:1;
  if(['burst','orbit','spiral','wave'].includes(motion)&&core){
   for(let k=0;k<4;k++){const u=fract(t*.25+k/4);ring(cx,cy,base*(.12+u*.65),motion==='spiral'?.57:.8,(1-u)*.24*env,a.color,k*.4+t*.15)}
  }
  if(motion==='wave'||a.effect==='psychedelic'){
   for(let j=0;j<5;j++){c.save();c.globalAlpha=.19*env;c.strokeStyle=colors[j];c.lineWidth=2+j*.35;c.beginPath();for(let k=0;k<=48;k++){const x=w*k/48,y=h*(.18+j*.15)+Math.sin(k*.22+t*1.3+j)*base*.10;k?c.lineTo(x,y):c.moveTo(x,y)}c.stroke();c.restore()}
  }
  for(const p of ps){
   const {i,phase,z,angle,rate,col,im}=p;let u=fract(phase+t*.22*rate),x=p.x,y=p.y,opacity=.5+z*.5,rot=p.spin*t*.7,scale=base*(.055+z*.095);
   if(motion==='fall'||motion==='drift'||motion==='rise'){
    x=fract(p.x+Math.sin(t*.85+angle)*(.035+z*.07));y=motion==='rise'?1.12-u*1.24:u*1.24-.12;opacity*=smooth(u/.12)*smooth((1-u)/.12);
    if(motion==='drift')rot=Math.sin(t+angle)*.8+p.spin*t*.2;
   }else if(motion==='burst'||motion==='firework'){
    const group=motion==='firework'?i%4:0;u=fract(t*(motion==='firework'?.36:.29)+group*.24+Math.floor(i/20)*.09);
    const radius=(1-Math.pow(1-u,2))*(.16+z*.58);
    x=(motion==='firework'?.22+group*.18:.5)+Math.cos(angle)*radius*base/w;
    y=(motion==='firework'?.25+(group%2)*.24:.5)+Math.sin(angle)*radius*base/h+u*u*.07;
    opacity*=smooth(u/.06)*Math.pow(1-u,.8);scale*=1-u*.45;
   }else if(motion==='meteor'){u=fract(phase+t*.35*rate);x=1.18-u*1.36;y=p.y*.65+u*.36-.12;opacity*=Math.sin(u*Math.PI);scale*=.7}
   else if(motion==='twinkle'){opacity*=Math.pow(.5+.5*Math.sin(t*3*rate+angle),2);scale*=.45+opacity}
   else if(motion==='orbit'||motion==='spiral'){
    const ang=angle+t*(motion==='spiral'?1.1:.55)*rate;const r=(.12+z*.48)*(motion==='spiral'?.6+u*.7:1);x=.5+Math.cos(ang)*r*base/w;y=.5+Math.sin(ang)*r*base/h;rot=ang;opacity*=.7+.3*Math.sin(t+angle);
   }else if(motion==='electric'){x=p.x<.5?u*.32:1-u*.32;y=fract(p.y+Math.sin(t*3+angle)*.13);opacity*=Math.pow(Math.sin(t*2+angle),2);scale*=.65}
   else if(motion==='wave'){x=u;y=.5+Math.sin(u*TAU*1.4+t*.9+angle)*(.14+z*.21);scale*=.6}
   let [px,py]=position(x,y,w,h);opacity*=env;
   if(motion==='meteor'||motion==='firework'||motion==='burst'){
    const dx=motion==='meteor'?base*.18:-Math.cos(angle)*scale*1.6,dy=motion==='meteor'?-base*.09:-Math.sin(angle)*scale*1.6;
    streak(px+dx,py+dy,px,py,col,opacity*.6,Math.max(1,scale*.026));
   }
   const metallic=['coin','foil','money','gem'].includes(kind);
   stamp(im,px,py,scale,rot,opacity,metallic?.2+.8*Math.abs(Math.cos(t*1.9*rate+angle)):1);
   if(i%3===0){const d=scheme==='multi'?dust[i%dust.length]:accentDust;stamp(d,px+Math.cos(angle+t)*scale*.7,py+Math.sin(angle+t)*scale*.5,scale*.36,0,opacity*.55)}
  }
  if(motion==='electric'){
   for(let j=0;j<3;j++){const pulse=Math.pow(Math.max(0,Math.sin(t*3+j*2)),2);if(pulse<.06)continue;c.save();c.globalAlpha=pulse*.72*env;c.lineWidth=2;c.strokeStyle=a.color;c.beginPath();const left=j%2===0;let x=left?0:w,y=h*(.17+j*.26);c.moveTo(x,y);for(let k=1;k<=9;k++){x+=(left?1:-1)*w*.045;y+=(rand(k+j*11,Math.floor(t*8))-.5)*base*.19;c.lineTo(x,y)}c.stroke();c.lineWidth=.8;c.strokeStyle='#fff';c.stroke();c.restore()}
  }
  if(a.effect==='crown'&&!a.thankYouType&&core){
   c.save();c.translate(cx,cy+Math.sin(t)*base*.014);const z=base*.003;c.scale(z,z);const g=c.createLinearGradient(-80,-80,70,75);g.addColorStop(0,'#fff5c2');g.addColorStop(.45,a.color);g.addColorStop(1,'#9f641f');path(c,[[-85,45],[-78,-57],[-35,-13],[0,-80],[35,-13],[78,-57],[85,45]]);fill(c,g);c.strokeStyle='#fff4bd';c.lineWidth=3;c.stroke();c.fillStyle='#79469b';c.fillRect(-80,30,160,17);c.restore()
  }
 }
 return {draw,context:c};
}
root.V2JPremium={create,profiles,thanks};
})(window);
