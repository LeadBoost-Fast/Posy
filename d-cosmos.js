(function(){const I=`precision highp float;
uniform vec2 R;uniform float T;uniform int V;uniform float LT;uniform float DIM;uniform float BW;
uniform vec3 C0,C1,C2,C3;uniform vec2 PC;uniform float PR;uniform float PULSE;
float h2(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float n2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h2(i),h2(i+vec2(1,0)),f.x),mix(h2(i+vec2(0,1)),h2(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*n2(p);p=p*2.03+vec2(3.1,1.7);a*=.5;}return v;}
mat2 rot(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}
/* звёзды: три слоя с параллаксом и мерцанием */
vec3 stars(vec2 uv){vec3 c=vec3(0.);
 for(int l=0;l<3;l++){float s=34.+float(l)*38.;vec2 p=uv*s+vec2(T*.012*(1.+float(l)),T*.005);vec2 id=floor(p),f=fract(p)-.5;float h=h2(id+float(l)*7.1);
  if(h>.9){vec2 o=vec2(h2(id+1.3),h2(id+2.9))-.5;float d=length(f-o*.6);float b=(h-.9)/.1;b*=b;float tw=.55+.45*sin(T*(.8+2.5*h)+h*40.);
   c+=mix(C3,vec3(1.),.65)*(smoothstep(.05+.05*b,0.,d)+smoothstep(.22,0.,d)*.08)*b*tw*1.3;}}
 return c;}
float ellD(vec2 p,float a,float b){return (length(vec2(p.x/a,p.y/b))-1.)*min(a,b);}
void main(){vec2 uv=(gl_FragCoord.xy-.5*R)/R.y;float px=1.6/R.y;
 /* фон: глубокий градиент и мягкая дымка */
 vec3 col=mix(C0,mix(C0,C1,.45),smoothstep(-.8,.9,uv.y*.7-uv.x*.35));
 vec2 q=uv*1.05+vec2(T*.007,-T*.004);float n=fbm(q+fbm(q*1.4+T*.012)*.9);
 col+=C1*smoothstep(.34,.95,n)*.85;
 col+=C2*pow(smoothstep(.55,1.,fbm(uv*2.1-vec2(T*.009,T*.003))),2.)*.26;
 col+=stars(uv);
 vec2 p=uv-PC;float d=length(p);vec2 Ld=normalize(vec2(-.6,.62));
 if(V==0){
  /* гладкая планета с ободком света и тонкими орбитами */
  float tilt=-.32;vec2 pr=rot(tilt)*p;
  if(d<PR){vec2 s=p/PR;float z=sqrt(max(0.,1.-dot(s,s)));vec3 nr=vec3(s,z);vec3 L=normalize(vec3(-.55,.62,.5));float dif=dot(nr,L);
   vec2 sr=rot(tilt)*s;float band=sin(sr.y*7.+fbm(vec2(sr.y*2.5,T*.03+sr.x*.4))*2.)*.5+.5;
   vec3 pc=mix(C0*.8+C1*.35,C2,smoothstep(-.3,1.,dif));pc*=.9+.14*band;
   pc+=C3*pow(1.-z,2.6)*smoothstep(-.3,.7,dot(s,L.xy))*1.1;
   pc=mix(pc,C0*.6,smoothstep(.15,-.65,dif)*.6);
   col=mix(col,pc,smoothstep(PR,PR-px*1.5,d));}
  col+=C3*exp(-max(0.,d-PR)/(PR*.05))*.45*smoothstep(-.3,.8,dot(normalize(p),Ld))*step(PR*.985,d);
  col+=C2*exp(-max(0.,d-PR)/(PR*.55))*.2*step(PR,d);
  for(int k=0;k<3;k++){float a=PR*(1.55+float(k)*.5),b=a*.27;float e=abs(ellD(pr,a,b));
   bool hid=pr.y>0.&&d<PR;float ln=smoothstep(px*1.6,0.,e)*(.32-.07*float(k))*(1.+PULSE*.8);
   if(!hid)col+=C3*ln;
   float ang=T*(.16-.035*float(k))+float(k)*2.2;vec2 mp=vec2(cos(ang)*a,sin(ang)*b);float md=length(pr-mp);
   bool mh=mp.y>0.&&length(rot(-tilt)*mp)<PR;
   if(!mh){col+=mix(C3,vec3(1.),.5)*smoothstep(.011,.004,md)*1.2;col+=C2*exp(-md*55.)*.5;}}
 }
 if(V==1){
  /* край огромной планеты и лента сияния вдоль него */
  vec2 c=PC;float r=PR;float dd=length(uv-c);float e=dd-r;float ang=atan(uv.y-c.y,uv.x-c.x);
  if(dd<r){vec2 s=(uv-c)/r;float z=sqrt(max(0.,1.-dot(s,s)));float lit=smoothstep(-.2,1.,dot(normalize(s+1e-4),vec2(.15,1.)));
   vec3 pc=mix(C0*.5,C1*.85,lit*smoothstep(.0,.7,1.-z))+C2*pow(1.-z,4.)*.55*lit;
   pc+=C1*.25*sin(s.x*14.+fbm(vec2(s.x*3.,T*.03))*3.)*lit*(1.-z);
   col=mix(col,pc,smoothstep(r,r-px*1.5,dd));}
  float fl=fbm(vec2(ang*7.+T*.12,e*5.-T*.05));
  float rib=exp(-pow((e-.03-fl*.05)/.013,2.))*smoothstep(.3,.8,fl)+exp(-pow((e-.05-fl*.07)/.02,2.))*smoothstep(.45,.85,fl)*.5;
  float rib2=exp(-pow((e-.09-fbm(vec2(ang*5.-T*.08,3.))*.08)/.03,2.))*.45;
  col+=C3*(rib*1.5+rib2*.6)*(1.+PULSE)+C2*exp(-abs(e)/.06)*.4;
 }
 if(V==2){
  /* сердце туманности: звезда, лучи, плотная дымка */
  float m=fbm(p*2.4+fbm(p*3.+T*.02)*1.2+vec2(T*.01,0.));
  col+=C2*smoothstep(.4,1.,m)*exp(-d*1.6)*1.1+C1*smoothstep(.3,.9,m)*exp(-d*.9)*.5;
  float sp=pow(max(0.,1.-abs(p.x)*18.),3.)*exp(-abs(p.y)*4.)+pow(max(0.,1.-abs(p.y)*18.),3.)*exp(-abs(p.x)*4.);
  col+=C3*(exp(-d*14.)*1.4+exp(-d*45.)*2.+sp*.35)*(1.+PULSE*.6);
  for(int k=0;k<2;k++){float a=PR*(1.+float(k)*.7),b=a*.34;float e=abs(ellD(rot(.25)*p,a,b));col+=C3*smoothstep(px*1.5,0.,e)*.18;}
 }
 if(V==3){
  /* затмение: тёмный диск, тонкое кольцо света и корона */
  float ang=atan(p.y,p.x);float cor=exp(-max(0.,d-PR)/(PR*.32))*(.55+.45*fbm(vec2(ang*3.+T*.05,d*4.-T*.07)));
  col+=C2*cor*.85*step(PR,d);
  col=mix(col,C0*.25,smoothstep(PR,PR-px*1.5,d));
  col+=C3*exp(-abs(d-PR)/(PR*.018))*1.7*(1.+PULSE)+mix(C2,C3,.5)*exp(-abs(d-PR)/(PR*.07))*.45;
  float a=PR*1.9,b=a*.24;float e=abs(ellD(rot(-.18)*p,a,b));bool hid=(rot(-.18)*p).y>0.&&d<PR*1.05;if(!hid)col+=C3*smoothstep(px*1.6,0.,e)*.28;
  float ang2=T*.14;vec2 mp=rot(.18)*vec2(cos(ang2)*a,sin(ang2)*b);col+=mix(C3,vec3(1.),.5)*smoothstep(.011,.004,length(p-mp));
 }
 /* падающая звезда раз в ~11 секунд */
 float ss=fract(T*.09+.3);vec2 dir=normalize(vec2(1.6,-.75));vec2 sp=vec2(-1.1,.65)+dir*ss*2.6;vec2 rl=uv-sp;
 float al=dot(rl,-dir),pp=abs(dot(rl,vec2(-dir.y,dir.x)));
 col+=mix(C3,vec3(1.),.6)*smoothstep(.28,0.,al)*step(0.,al)*smoothstep(px*1.6,0.,pp)*smoothstep(0.,.06,ss)*smoothstep(.4,.25,ss)*1.6;
 col=1.-exp(-col*1.3);
 if(BW>.5)col=vec3(dot(col,vec3(.299,.587,.114)));
 col*=mix(.7,1.,smoothstep(1.3,.3,length(uv*vec2(.8,1.))));
 col*=1.-DIM;
 if(LT>.5){vec3 lb=mix(vec3(.965,.963,.985),C3,.1);col=mix(lb,col*1.05+.04,.42);}
 gl_FragColor=vec4(col,1.);}
`,V=o=>{const t=parseInt(o.slice(1),16),u=a=>Math.pow(a/255,2.2);return[u(t>>16&255),u(t>>8&255),u(t&255)]};let n=null,e=null,c=null,l=0,i=null,p="home",g=0,D=0;const H=performance.now();function O(){if(n=document.createElement("canvas"),n.id="c2bg",n.setAttribute("aria-hidden","true"),document.body.prepend(n),e=n.getContext("webgl",{antialias:!1,alpha:!1,preserveDrawingBuffer:!1,powerPreference:"low-power"}),!e)return n.remove(),n=null,!1;const o=(t,u)=>{const a=e.createShader(t);if(e.shaderSource(a,u),e.compileShader(a),!e.getShaderParameter(a,e.COMPILE_STATUS))throw new Error(e.getShaderInfoLog(a));return a};try{const t=e.createProgram();e.attachShader(t,o(e.VERTEX_SHADER,"attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}")),e.attachShader(t,o(e.FRAGMENT_SHADER,I)),e.linkProgram(t),e.useProgram(t);const u=e.createBuffer();e.bindBuffer(e.ARRAY_BUFFER,u),e.bufferData(e.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),e.STATIC_DRAW);const a=e.getAttribLocation(t,"p");e.enableVertexAttribArray(a),e.vertexAttribPointer(a,2,e.FLOAT,!1,0,0),c={},["R","T","V","LT","DIM","BW","C0","C1","C2","C3","PC","PR","PULSE"].forEach(f=>c[f]=e.getUniformLocation(t,f))}catch{return n.remove(),n=null,e=null,!1}return E(),!0}function E(){if(!n)return;const o=Math.min(2,devicePixelRatio||1),t=n.clientWidth*o||innerWidth,u=n.clientHeight*o||innerHeight,a=Math.min(1,Math.sqrt(38e4/(t*u)));n.width=Math.max(1,t*a|0),n.height=Math.max(1,u*a|0)}function G(){const o=n.width/n.height,t=innerWidth>=900,u=p==="home";return i.v===1?t?{pc:[o*.15,u?-1.25:-1.45],pr:1.3}:{pc:[o*.1,u?-1.02:-1.2],pr:1.25}:t?u?{pc:[o*.3,.22],pr:.2}:{pc:[o*.38,.32],pr:.13}:u?{pc:[.12,.3],pr:.17}:{pc:[.19,.37],pr:.1}}function W(o){if(!e||!i)return;const t=G();e.viewport(0,0,n.width,n.height),e.uniform2f(c.R,n.width,n.height),e.uniform1f(c.T,o),e.uniform1i(c.V,i.v),e.uniform1f(c.LT,i.light?1:0),e.uniform1f(c.DIM,p==="home"?0:p==="orders"?.18:.34),e.uniform1f(c.BW,i.bw?1:0),e.uniform1f(c.PULSE,g),i.c.forEach((u,a)=>e.uniform3fv(c["C"+a],V(u))),e.uniform2f(c.PC,t.pc[0],t.pc[1]),e.uniform1f(c.PR,t.pr),e.drawArrays(e.TRIANGLE_STRIP,0,4)}function L(o){l=0,!(!i||!i.motion||document.hidden)&&(o-D>33&&(D=o,W((o-H)/1e3+31),g=Math.max(0,g-.03)),l=requestAnimationFrame(L))}function k(){W(31)}function q(){const o=document.createElement("canvas");o.setAttribute("aria-hidden","true"),o.style.cssText="position:fixed;inset:0;width:100vw;height:100vh;z-index:60;pointer-events:none",document.body.appendChild(o);const t=Math.min(2,devicePixelRatio||1);return o.width=innerWidth*t,o.height=innerHeight*t,{c:o,x:o.getContext("2d"),d:t}}const U=()=>getComputedStyle(document.documentElement).getPropertyValue("--ac").trim()||"#fff";function N(){if(!i||!i.motion)return;g=1;const{c:o,x:t,d:u}=q(),a=o.width,f=o.height,C=U(),P=[];for(let h=0;h<6;h++)P.push({o:(Math.random()-.5)*50*u,l:(120+Math.random()*200)*u,w:(1.4+Math.random()*1.8)*u,dl:Math.random()*120});const R=performance.now(),w=1e3,T=-a*.2,y=f*.15,M=a*1.1,S=f*.55,d=Math.atan2(S-y,M-T),s=h=>{const A=Math.min(1,(h-R)/w);t.clearRect(0,0,a,f),t.globalCompositeOperation="lighter",P.forEach(r=>{const v=Math.max(0,Math.min(1,(h-R-r.dl)/(w-120))),x=1-Math.pow(1-v,3),m=T+(M-T)*x,b=y+(S-y)*x+r.o,_=m-Math.cos(d)*r.l,B=b-Math.sin(d)*r.l,F=t.createLinearGradient(_,B,m,b);F.addColorStop(0,"rgba(0,0,0,0)"),F.addColorStop(1,C),t.strokeStyle=F,t.lineWidth=r.w,t.globalAlpha=1-v*v,t.beginPath(),t.moveTo(_,B),t.lineTo(m,b),t.stroke();const z=t.createRadialGradient(m,b,0,m,b,9*u);z.addColorStop(0,"#fff"),z.addColorStop(1,"rgba(0,0,0,0)"),t.fillStyle=z,t.beginPath(),t.arc(m,b,9*u,0,7),t.fill()}),A<1?requestAnimationFrame(s):o.remove()};requestAnimationFrame(s)}function Y(o){if(!i||!i.motion){o();return}const{c:t,x:u,d:a}=q(),f=t.width,C=t.height,P=f/2,R=C*.4,w=[];for(let d=0;d<140;d++)w.push({a:Math.random()*Math.PI*2,r:Math.random()*40*a,v:.6+Math.random()});const T=performance.now(),y=900;let M=!1;const S=d=>{const s=Math.min(1,(d-T)/y),h=U(),A=s<.5?s*2:1-(s-.5)*2;if(u.clearRect(0,0,f,C),u.globalCompositeOperation="lighter",u.fillStyle=`rgba(255,255,255,${A*.16})`,u.fillRect(0,0,f,C),w.forEach(r=>{const v=Math.pow(s,2.2),x=r.r+v*f*r.v,m=x-(40+v*260)*a*r.v;u.strokeStyle=s<.5?"#fff":h,u.globalAlpha=A,u.lineWidth=1.2*a,u.beginPath(),u.moveTo(P+Math.cos(r.a)*Math.max(0,m),R+Math.sin(r.a)*Math.max(0,m)),u.lineTo(P+Math.cos(r.a)*x,R+Math.sin(r.a)*x),u.stroke()}),!M&&s>.45){M=!0;try{o()}catch{}}s<1?requestAnimationFrame(S):t.remove()};requestAnimationFrame(S)}window.COSMOS={start(o){i=o,p=o.tab||p,!(!n&&!O())&&(E(),l&&(cancelAnimationFrame(l),l=0),i.motion?l=requestAnimationFrame(L):k())},stop(){if(i=null,l&&cancelAnimationFrame(l),l=0,n){const o=e&&e.getExtension("WEBGL_lose_context");o&&o.loseContext(),n.remove()}n=null,e=null},tab(o){o!==p&&(p=o,i&&!i.motion&&k())},pulse(){g=1},comet:N,warp:Y},addEventListener("resize",()=>{E(),i&&!i.motion&&k()}),document.addEventListener("visibilitychange",()=>{!document.hidden&&i&&i.motion&&!l&&(l=requestAnimationFrame(L))})})();
