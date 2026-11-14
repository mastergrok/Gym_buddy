/* Gym Buddy illustrated exercise avatars – self-contained, lightweight, no GIF files.
 * The same movement skeleton drives both SVG characters. Published under the
 * repository owner's existing application license.
 */
(function (root) {
  'use strict';
  var KEYS = ['h','s','p','el','wl','er','wr','kl','al','kr','ar'];
  var palette = {
    male: { skin:'#efbb94', light:'#ffd8b5', hair:'#c6aa75', shade:'#997a51', top:'#f68e30', highlight:'#ffc16d', bottom:'#293446', upper:6.1, fore:4.9, thigh:7.4, calf:5.0, shoulder:8.3, waist:5.3, hip:5.6, head:5.1 },
    female: { skin:'#f2c29f', light:'#ffe0ba', hair:'#ecd17b', shade:'#b79c56', top:'#f68d58', highlight:'#ffca98', bottom:'#394051', upper:4.6, fore:3.7, thigh:7.5, calf:4.8, shoulder:6.5, waist:4.3, hip:7.0, head:5.2 }
  };
  function v(x,y){return [x,y];}
  var ST={h:v(50,11),s:v(50,25),p:v(50,43),el:v(39,35),wl:v(38,48),er:v(61,35),wr:v(62,48),kl:v(45,56),al:v(44,67),kr:v(55,56),ar:v(56,67)};
  var SIDE={h:v(47,12),s:v(46,25),p:v(48,44),el:v(42,35),wl:v(44,46),er:v(52,35),wr:v(54,46),kl:v(52,56),al:v(52,67),kr:v(58,56),ar:v(58,67)};
  var SIT={h:v(34,16),s:v(36,28),p:v(40,46),el:v(41,35),wl:v(54,36),er:v(43,36),wr:v(57,36),kl:v(58,49),al:v(62,67),kr:v(64,49),ar:v(68,67)};
  var BENCH={h:v(22,38),s:v(35,40),p:v(62,42),el:v(39,32),wl:v(47,27),er:v(43,32),wr:v(50,27),kl:v(77,53),al:v(79,67),kr:v(82,53),ar:v(84,67)};
  var HANG={h:v(50,34),s:v(50,44),p:v(50,57),el:v(39,29),wl:v(36,13),er:v(61,29),wr:v(64,13),kl:v(45,65),al:v(45,72),kr:v(55,65),ar:v(55,72)};
  var PUSH={h:v(24,44),s:v(35,45),p:v(66,48),el:v(36,55),wl:v(37,65),er:v(43,55),wr:v(45,65),kl:v(76,52),al:v(85,66),kr:v(78,53),ar:v(87,66)};
  var INVERT={h:v(50,57),s:v(50,46),p:v(50,29),el:v(40,55),wl:v(39,66),er:v(60,55),wr:v(61,66),kl:v(47,16),al:v(47,5),kr:v(53,16),ar:v(53,5)};
  var DIP={h:v(50,13),s:v(50,25),p:v(50,43),el:v(42,34),wl:v(40,38),er:v(58,34),wr:v(60,38),kl:v(44,55),al:v(45,65),kr:v(56,55),ar:v(55,65)};
  var FLOOR={h:v(23,57),s:v(34,56),p:v(57,53),el:v(32,61),wl:v(40,65),er:v(35,62),wr:v(43,65),kl:v(73,55),al:v(81,65),kr:v(77,55),ar:v(86,65)};
  function P(base,change){var p={};KEYS.forEach(function(k){p[k]=(change&&change[k])||base[k];});return p;}
  function shift(base,dx,dy){var p={};KEYS.forEach(function(k){p[k]=v(base[k][0]+dx,base[k][1]+dy);});return p;}
  function n(x){return +x.toFixed(2);}
  function pt(p){return n(p[0])+' '+n(p[1]);}
  function lerp(a,b,t){return v(n(a[0]+(b[0]-a[0])*t),n(a[1]+(b[1]-a[1])*t));}
  function unit(a,b){var x=b[0]-a[0],y=b[1]-a[1],l=Math.hypot(x,y)||1;return v(x/l,y/l);}
  function plus(a,b,t){t=t==null?1:t;return v(n(a[0]+b[0]*t),n(a[1]+b[1]*t));}
  function mid(a,b){return lerp(a,b,.5);}
  function curve(a,b,bump){var u=unit(a,b),m=mid(a,b);return 'M '+pt(a)+' Q '+pt(plus(m,v(u[1],-u[0]),bump||0))+' '+pt(b);}
  function path(poses,make,cl,width,still,dur,fill){
    var vals=poses.map(make),str='<path d="'+vals[0]+'" class="'+cl+'"'+(width?' stroke-width="'+width+'"':'')+(fill?' fill="'+fill+'"':'')+'>';
    if(!still && vals.some(function(x){return x!==vals[0];}))str+='<animate attributeName="d" values="'+vals.join(';')+'" dur="'+dur+'s" repeatCount="indefinite" calcMode="spline" keyTimes="0;0.5;1" keySplines=".45 0 .55 1;.45 0 .55 1"/>';
    return str+'</path>';
  }
  function at(poses,key,cl,shape,still,dur){
    var vals=poses.map(function(p){var q=typeof key==='function'?key(p):p[key];return n(q[0])+','+n(q[1]);});
    var str='<g class="'+cl+'" transform="translate('+vals[0].replace(',',' ')+')">';
    if(!still && vals.some(function(x){return x!==vals[0];}))str+='<animateTransform attributeName="transform" type="translate" values="'+vals.join(';')+'" dur="'+dur+'s" repeatCount="indefinite" calcMode="spline" keyTimes="0;0.5;1" keySplines=".45 0 .55 1;.45 0 .55 1"/>';
    return str+shape+'</g>';
  }
  function torso(p,c){var u=unit(p.s,p.p),d=v(u[1],-u[0]),s=p.s,h=p.p,w=lerp(s,h,.62),a=plus(s,d,-c.shoulder),b=plus(s,d,c.shoulder),e=plus(h,d,c.hip),f=plus(h,d,-c.hip);return 'M '+pt(a)+' Q '+pt(plus(s,u,-2))+' '+pt(b)+' Q '+pt(plus(w,d,c.waist))+' '+pt(e)+' Q '+pt(h)+' '+pt(f)+' Q '+pt(plus(w,d,-c.waist))+' '+pt(a)+' Z';}
  function pants(p,c){var u=unit(p.s,p.p),d=v(u[1],-u[0]),h=p.p,a=plus(h,d,-c.hip-.3),b=plus(h,d,c.hip+.3);return 'M '+pt(plus(a,u,-4))+' Q '+pt(plus(h,u,-5))+' '+pt(plus(b,u,-4))+' L '+pt(plus(b,u,4))+' Q '+pt(plus(h,u,6))+' '+pt(plus(a,u,4))+' Z';}
  function chest(p,c,f){var u=unit(p.s,p.p),d=v(u[1],-u[0]),m=plus(p.s,u,6);return curve(plus(m,d,-c.shoulder*.65),plus(m,d,c.shoulder*.65),f?1.5:.7);}
  function drawAvatar(poses,gender,still,dur){
    var c=palette[gender]||palette.male,s='<g class="athlete">';
    // Distant limbs first, in front of gym equipment and behind the body.
    s+=path(poses,function(p){return curve(p.p,p.kr)},'leg far',c.thigh,still,dur);
    s+=path(poses,function(p){return curve(p.kr,p.ar)},'skin far',c.calf,still,dur);
    s+=path(poses,function(p){return curve(p.s,p.er)},'arm far',c.upper,still,dur);
    s+=path(poses,function(p){return curve(p.er,p.wr)},'skin far',c.fore,still,dur);
    s+=path(poses,function(p){return torso(p,c)},'top',0,still,dur,c.top);
    s+=path(poses,function(p){return chest(p,c,gender==='female')},'definition',.8,still,dur);
    if(gender==='male')s+=path(poses,function(p){var u=unit(p.s,p.p),q=plus(p.s,u,11);return curve(plus(q,v(-4,0)),plus(q,v(4,0)),0);},'definition',.8,still,dur);
    s+=path(poses,function(p){return pants(p,c)},'shorts',0,still,dur,c.bottom);
    s+=path(poses,function(p){return curve(p.p,p.kl)},'shorts',c.thigh+1.7,still,dur);
    s+=path(poses,function(p){return curve(p.kl,p.al)},'skin',c.calf,still,dur);
    s+=path(poses,function(p){return curve(p.s,p.el)},'arm',c.upper,still,dur);
    s+=path(poses,function(p){return curve(p.el,p.wl)},'skin',c.fore,still,dur);
    var shoe='<path d="M -2.7 -1.5 Q 1 -3 6 -1.3 Q 9 0 7 2.8 L -3 2.8Z" fill="#ff992b" stroke="#e37e22" stroke-width=".7"/><path d="M -2.4 2.6 L 7 2.6" stroke="#fff" stroke-width="1.2"/>';
    s+=at(poses,'ar','shoe far',shoe,still,dur)+at(poses,'al','shoe',shoe,still,dur);
    var f=gender==='female';
    var head='<ellipse cx="0" cy="0" rx="'+c.head+'" ry="'+(c.head+.5)+'" fill="'+c.skin+'" stroke="'+c.light+'" stroke-width=".45"/>';
    if(f){head+='<path d="M -5.2 0 Q -6.5 -7 -2 -7.2 Q 3 -9 5.4 -2.2 L 4.2 -.5 Q 3.1 -3.6 .2 -3.3 L -3.7 -3.8 L -4.6 1Z" fill="'+c.hair+'"/><path d="M -5 -4 Q -10 -6 -10 1 Q -10 4 -7 6 L -6 2" fill="'+c.hair+'" stroke="'+c.shade+'" stroke-width=".45"/>';}
    else {head+='<path d="M -5.3 -.5 Q -6 -6 -3 -7 Q -.5 -8.6 1 -7.3 Q 4 -7.5 5.3 -2.8 L 4.7 -1.8 Q 2 -4.9 0 -3.9 Q -3.2 -4.6 -4.8 .3Z" fill="'+c.hair+'"/><path d="M -3.5 -5.8 Q -.5 -7.4 1 -5.8" fill="none" stroke="'+c.shade+'" stroke-width=".8"/>';}
    head+='<path d="M 1.5 .7 Q 2.4 -.25 3.6 .7" stroke="#70533f" stroke-width=".65" fill="none"/><path d="M 1.8 2.8 Q 2.8 3.4 3.6 2.8" stroke="#af8265" stroke-width=".6" fill="none"/>';
    s+=at(poses,'h','head-wrap',head,still,dur);
    ['wl','wr'].forEach(function(k){s+=at(poses,k,'hand','<circle r="2.25" fill="'+c.skin+'" stroke="'+c.light+'" stroke-width=".45"/>',still,dur);});
    return s+'</g>';
  }
  function eq(what,poses,still,dur){
    var s='',bar='#8d9bab',dark='#404e5d';
    if(what.indexOf('floor')>=0)s+='<path d="M 6 69 H 94" stroke="#647585" stroke-width="1.5" opacity=".55"/>';
    if(what.indexOf('bench')>=0)s+='<rect x="12" y="44" width="68" height="4" rx="2" fill="'+dark+'" stroke="'+bar+'" stroke-width=".6"/><path d="M 19 48 V 64 M 74 48 V 64" stroke="'+bar+'" stroke-width="2.4"/>';
    if(what.indexOf('incline')>=0)s+='<path d="M 14 48 L 47 27 L 73 44" stroke="'+bar+'" stroke-width="4" stroke-linecap="round"/><path d="M 23 47 V 65 M 67 44 V 65" stroke="'+bar+'" stroke-width="2"/>';
    if(what.indexOf('seat')>=0)s+='<path d="M 22 47 H 57 M 22 47 V 65 M 22 23 V 47" stroke="'+bar+'" stroke-width="3.6" stroke-linecap="round"/>';
    if(what.indexOf('dipbars')>=0)s+='<path d="M 21 36 H 41 M 59 36 H 79 M 24 36 V 68 M 77 36 V 68" fill="none" stroke="'+bar+'" stroke-width="3.4" stroke-linecap="round"/>';
    if(what.indexOf('pullbar')>=0)s+='<path d="M 15 10 H 85 M 15 8 V 16 M 85 8 V 16" stroke="'+bar+'" stroke-width="3.2" stroke-linecap="round"/>';
    if(what.indexOf('wall')>=0)s+='<path d="M 88 3 V 70" stroke="'+bar+'" stroke-width="3"/>';
    if(what.indexOf('parallettes')>=0)s+='<path d="M 26 53 H 43 M 57 53 H 74 M 29 53 V 67 M 71 53 V 67" stroke="'+bar+'" stroke-width="2.6" fill="none"/>';
    if(what.indexOf('box')>=0)s+='<rect x="67" y="47" width="24" height="22" rx="2" fill="#465361" stroke="'+bar+'" stroke-width="1.4"/>';
    if(what.indexOf('cable')>=0)s+='<path d="M 89 11 V 69 M 84 11 H 94 M 85 64 H 93" stroke="'+bar+'" stroke-width="2.7"/>';
    if(what.indexOf('machine')>=0)s+='<path d="M 16 68 H 84 M 18 26 V 68 M 79 16 V 68" stroke="'+bar+'" stroke-width="3.4" fill="none" opacity=".85"/>';
    if(what.indexOf('bike')>=0)s+='<circle cx="23" cy="58" r="10" stroke="'+bar+'" stroke-width="2" fill="none"/><circle cx="76" cy="58" r="10" stroke="'+bar+'" stroke-width="2" fill="none"/><path d="M 23 58 L 42 58 L 35 37 L 58 37 L 42 58 L 76 58 L 58 37 L 76 58 M 30 37 H 40 M 58 34 H 71" fill="none" stroke="'+bar+'" stroke-width="1.8"/>';
    if(what.indexOf('rowmachine')>=0)s+='<path d="M 10 64 H 78 M 71 45 L 79 64" stroke="'+bar+'" stroke-width="2.7"/><circle cx="79" cy="45" r="7" fill="#394b5e" stroke="'+bar+'" stroke-width="2"/>';
    if(what.indexOf('skierg')>=0)s+='<path d="M 82 8 V 67 M 72 8 H 92 M 82 8 L 60 31" stroke="'+bar+'" stroke-width="2.8" fill="none"/>';
    if(what.indexOf('sled')>=0)s+='<path d="M 63 60 V 43 H 87 V 60 M 60 64 H 94" fill="none" stroke="'+bar+'" stroke-width="4"/>';
    // Equipment in hands follows the animation, with the same interpolation.
    if(what.indexOf('dumbbell')>=0 || what.indexOf('weight')>=0){
      var db='<path d="M -6 0 H 6" stroke="#9ba9b5" stroke-width="2"/><path d="M -5 -4 V 4 M -2 -5 V 5 M 2 -5 V 5 M 5 -4 V 4" stroke="#fa9e37" stroke-width="2.6"/>';
      s+=at(poses,'wl','load',db,still,dur);
      if(what.indexOf('onearm')<0)s+=at(poses,'wr','load',db,still,dur);
    }
    if(what.indexOf('barbell')>=0){
      s+=at(poses,function(p){return mid(p.wl,p.wr);},'load','<path d="M -27 0 H 27" stroke="#9ba9b5" stroke-width="2.8"/><path d="M -25 -6 V 6 M -21 -5 V 5 M 21 -5 V 5 M 25 -6 V 6" stroke="#fa9e37" stroke-width="4.5"/>',still,dur);
    }
    if(what.indexOf('kettlebell')>=0)s+=at(poses,'wl','load','<path d="M -3 -4 V -7 Q 0 -10 3 -7 V -4" fill="none" stroke="#ffd09d" stroke-width="1.5"/><circle cy="0" r="5" fill="#f69b35"/>',still,dur);
    if(what.indexOf('cable')>=0)s+=path(poses,function(p){return 'M 88 15 L '+pt(p.wr);},'cableline',1,still,dur);
    return s;
  }
  function D(start,end,gear,opts){return {frames:[start,end,start],gear:gear||'floor',opts:opts||{}};}
  function animate(kind){
    var a,b,o='',s=ST,t=SIDE;
    switch(kind){
      case 'pull-pron':case 'pull-sup':case 'pull-neutral':case 'pull-weighted':
        a=HANG;b=P(HANG,{h:v(50,19),s:v(50,29),p:v(50,44),el:v(37,25),er:v(63,25),kl:v(45,54),kr:v(55,54),al:v(47,64),ar:v(53,64)});
        return D(a,b,'pullbar'+(kind==='pull-weighted'?' weight':''),{duration:2.2});
      case 'muscleup':
        a=HANG;b=P(HANG,{h:v(50,7),s:v(50,21),p:v(50,35),el:v(42,26),er:v(58,26),wl:v(37,13),wr:v(63,13),kl:v(46,48),kr:v(54,48),al:v(46,59),ar:v(54,59)});
        return D(a,b,'pullbar',{duration:2.6});
      case 'suspension':case 'scapular':
        a=HANG;b=P(HANG,{h:v(50,30),s:v(50,40),p:v(50,53),kl:v(45,61),kr:v(55,61),al:v(45,68),ar:v(55,68),el:v(39,27),er:v(61,27)});
        return D(a,b,'pullbar',{duration:2});
      case 'latpulldown':
        a=P(SIT,{h:v(43,16),s:v(43,27),p:v(42,44),el:v(31,21),wl:v(24,10),er:v(58,21),wr:v(65,10),kl:v(58,49),kr:v(60,49)});
        b=P(a,{el:v(30,30),wl:v(27,29),er:v(58,30),wr:v(62,29)});
        return D(a,b,'seat machine barbell',{duration:2.3});
      case 'cable-row':case 'machine-row':
        a=P(SIT,{wl:v(71,32),wr:v(73,35),el:v(55,32),er:v(56,38)});
        b=P(a,{wl:v(48,37),wr:v(51,37),el:v(46,42),er:v(51,42)});
        return D(a,b,'seat '+(kind==='machine-row'?'machine':'cable'),{duration:2.15});
      case 'bar-row':case 'tbar-row':
        a=P(SIDE,{h:v(33,30),s:v(36,37),p:v(52,42),el:v(41,49),er:v(47,49),wl:v(43,61),wr:v(52,61),kl:v(56,54),kr:v(62,55),al:v(57,67),ar:v(65,67)});
        b=P(a,{el:v(47,43),er:v(55,43),wl:v(48,46),wr:v(57,46)});
        return D(a,b,'floor '+(kind==='bar-row'?'barbell':'weight'),{duration:2.2});
      case 'dbrow':
        a=P(SIDE,{h:v(35,27),s:v(38,36),p:v(57,42),el:v(48,46),wl:v(48,61),er:v(52,45),wr:v(59,49),kl:v(66,52),al:v(70,67),kr:v(57,53),ar:v(48,65)});
        b=P(a,{el:v(55,40),wl:v(60,45)});
        return D(a,b,'bench onearm dumbbell',{duration:2.2});
      case 'facepull':
        a=P(ST,{el:v(61,30),wl:v(70,22),er:v(64,34),wr:v(72,25)});
        b=P(a,{el:v(37,22),wl:v(45,20),er:v(63,22),wr:v(55,20)});
        return D(a,b,'floor cable',{duration:2.1});
      case 'pullover':
        a=P(SIDE,{el:v(58,29),wl:v(73,18),er:v(57,31),wr:v(76,19)});
        b=P(a,{el:v(54,37),wl:v(53,44),er:v(57,37),wr:v(56,44)});
        return D(a,b,'floor cable',{duration:2.15});
      case 'shrugs':
        a=P(ST,{el:v(40,36),wl:v(39,49),er:v(60,36),wr:v(61,49)});
        b=P(a,{h:v(50,8),s:v(50,21),el:v(40,32),wl:v(39,46),er:v(60,32),wr:v(61,46)});
        return D(a,b,'floor dumbbell',{duration:1.7});
      case 'curl-bar':case 'curl-db':case 'curl-hammer':case 'curl-preacher':case 'curl-incline':
        a=P(ST,{el:v(40,36),wl:v(40,50),er:v(60,36),wr:v(60,50)});
        b=P(a,{wl:v(43,28),wr:v(57,28),el:v(40,38),er:v(60,38)});
        if(kind==='curl-preacher'){a=P(SIT,{el:v(45,40),wl:v(48,54),er:v(53,40),wr:v(57,54)});b=P(a,{wl:v(42,30),wr:v(60,30)});}
        if(kind==='curl-incline'){a=P(SIT,{el:v(32,38),wl:v(30,51),er:v(42,38),wr:v(40,52)});b=P(a,{wl:v(35,29),wr:v(44,29)});}
        return D(a,b,(kind==='curl-bar'?'barbell':'dumbbell')+(kind==='curl-preacher'?' seat':'floor'),{duration:2});
      case 'bench-bar':case 'bench-db':case 'incline-bar':case 'incline-db':
        a=P(BENCH,{wl:v(49,28),wr:v(53,28)});
        b=P(a,{el:v(41,19),er:v(47,19),wl:v(48,11),wr:v(53,11)});
        if(kind.indexOf('incline')===0){a=P(a,{h:v(28,30),s:v(38,35),p:v(59,43),kl:v(73,53),al:v(76,66),kr:v(79,53),ar:v(82,66)});b=P(b,{h:v(28,30),s:v(38,35),p:v(59,43),kl:v(73,53),al:v(76,66),kr:v(79,53),ar:v(82,66)});}
        return D(a,b,(kind.indexOf('incline')===0?'incline':'bench')+' '+(kind.endsWith('bar')?'barbell':'dumbbell'),{duration:2.2});
      case 'ohp-bar':case 'ohp-db':case 'pushpress':
        a=P(ST,{el:v(35,34),wl:v(40,25),er:v(65,34),wr:v(60,25)});
        b=P(a,{el:v(35,13),wl:v(36,4),er:v(65,13),wr:v(64,4)});
        if(kind==='pushpress') a=P(a,{p:v(50,47),kl:v(43,57),kr:v(57,57),h:v(50,14),s:v(50,28)});
        return D(a,b,'floor '+(kind==='ohp-db'?'dumbbell':'barbell'),{duration:2.1});
      case 'chestpress':
        a=P(SIT,{el:v(42,35),wl:v(57,32),er:v(48,36),wr:v(60,32)});
        b=P(a,{el:v(58,33),wl:v(76,33),er:v(64,34),wr:v(78,34)});
        return D(a,b,'seat machine',{duration:2.1});
      case 'cablefly':case 'pecdeck':
        a=P(ST,{el:v(29,26),wl:v(22,37),er:v(71,26),wr:v(78,37)});
        b=P(a,{el:v(39,30),wl:v(49,32),er:v(61,30),wr:v(51,32)});
        return D(a,b,kind==='cablefly'?'floor cable':'seat machine',{duration:2.2});
      case 'dips':case 'dips-weighted':
        a=DIP;b=P(DIP,{h:v(50,22),s:v(50,34),p:v(50,51),el:v(41,45),er:v(59,45),kl:v(44,61),kr:v(56,61),al:v(45,69),ar:v(55,69)});
        return D(a,b,'dipbars'+(kind==='dips-weighted'?' weight':''),{duration:2});
      case 'pushup':case 'pushup-diamond':case 'pushup-decline':case 'pikepush':
        a=P(PUSH,kind==='pushup-diamond'?{wl:v(40,65),wr:v(42,65)}:{});
        b=P(a,{h:v(26,53),s:v(36,54),p:v(66,49),el:v(33,61),er:v(43,61)});
        if(kind==='pushup-decline'){a=P(a,{al:v(86,40),ar:v(88,40),kl:v(77,45),kr:v(79,46)});b=P(b,{al:v(86,40),ar:v(88,40),kl:v(77,45),kr:v(79,46)});}
        if(kind==='pikepush'){a=P(PUSH,{h:v(25,53),s:v(36,41),p:v(58,24),kl:v(68,37),kr:v(72,37),al:v(80,66),ar:v(84,66)});b=P(a,{h:v(25,61),s:v(37,50),el:v(36,58),er:v(44,59)});}
        return D(a,b,'floor'+(kind==='pushup-decline'?' box':''),{duration:2.1});
      case 'lateral-db':case 'lateral-cable':
        a=P(ST,{el:v(39,36),wl:v(36,46),er:v(61,36),wr:v(64,46)});
        b=P(a,{el:v(34,26),wl:v(20,25),er:v(66,26),wr:v(80,25)});
        return D(a,b,'floor '+(kind==='lateral-db'?'dumbbell':'cable'),{duration:2.25});
      case 'reverse-fly':case 'reverse-pec':
        a=P(SIDE,{h:v(32,30),s:v(36,38),p:v(54,43),el:v(42,44),wl:v(48,55),er:v(48,45),wr:v(57,55)});
        b=P(a,{el:v(26,36),wl:v(19,29),er:v(54,35),wr:v(66,28)});
        return D(a,b,(kind==='reverse-pec'?'seat machine':'floor dumbbell'),{duration:2.2});
      case 'triceps-push':
        a=P(ST,{el:v(41,33),wl:v(47,27),er:v(59,33),wr:v(54,27)});
        b=P(a,{wl:v(43,48),wr:v(57,48)});
        return D(a,b,'floor cable',{duration:2});
      case 'skullcrusher':
        a=P(BENCH,{el:v(39,22),wl:v(32,24),er:v(44,22),wr:v(37,24)});
        b=P(a,{wl:v(41,10),wr:v(47,10)});
        return D(a,b,'bench barbell',{duration:2.15});
      case 'triceps-overhead':
        a=P(ST,{el:v(45,11),wl:v(48,27),er:v(55,11),wr:v(52,27)});
        b=P(a,{wl:v(48,4),wr:v(52,4)});
        return D(a,b,'floor dumbbell',{duration:2.2});
      case 'squat':case 'frontsquat':case 'gobletsquat':case 'hacksquat':
        a=P(ST,{el:v(39,30),wl:v(43,27),er:v(61,30),wr:v(57,27)});
        b=P(a,{h:v(50,21),s:v(50,34),p:v(50,55),kl:v(40,57),kr:v(60,57),el:v(38,39),er:v(62,39),wl:v(43,35),wr:v(57,35)});
        return D(a,b,'floor '+(kind==='gobletsquat'?'weight':kind==='hacksquat'?'machine':'barbell'),{duration:2.45});
      case 'bulgarian':case 'lunge-walk':case 'lunge-reverse':
        a=P(SIDE,{h:v(45,14),s:v(45,26),p:v(47,43),kl:v(40,56),al:v(35,66),kr:v(67,55),ar:v(74,66)});
        b=P(a,{h:v(45,22),s:v(45,33),p:v(49,53),kl:v(40,61),al:v(35,66),kr:v(68,58),ar:v(76,66)});
        if(kind==='bulgarian'){a=P(a,{ar:v(82,47),kr:v(70,50)});b=P(b,{ar:v(82,47),kr:v(71,54)});}
        return D(a,b,'floor'+(kind==='bulgarian'?' box':'')+' dumbbell',{duration:2.5});
      case 'stepup':
        a=P(SIDE,{h:v(47,12),s:v(47,26),p:v(49,45),kl:v(62,51),al:v(70,47),kr:v(49,58),ar:v(48,67)});
        b=P(a,{h:v(56,6),s:v(56,20),p:v(58,36),kl:v(65,42),al:v(70,47),kr:v(52,45),ar:v(52,56)});
        return D(a,b,'floor box',{duration:2.4});
      case 'deadlift':case 'rdl':case 'goodmorning':
        a=P(SIDE,{h:v(48,12),s:v(46,25),p:v(50,43),kl:v(54,54),kr:v(60,54)});
        b=P(a,{h:v(30,27),s:v(34,35),p:v(53,45),el:v(41,42),wl:v(45,56),er:v(49,42),wr:v(53,56),kl:v(56,56),kr:v(62,56)});
        if(kind==='deadlift'){b=P(b,{h:v(28,31),s:v(31,37),p:v(52,51),kl:v(56,59),kr:v(61,59)});}
        return D(a,b,'floor '+(kind==='goodmorning'?'':'barbell'),{duration:2.45});
      case 'legpress':
        a=P(SIT,{h:v(31,23),s:v(34,34),p:v(41,46),el:v(30,40),wl:v(36,45),er:v(40,40),wr:v(47,45),kl:v(62,46),al:v(75,27),kr:v(67,47),ar:v(78,29)});
        b=P(a,{kl:v(58,33),al:v(75,24),kr:v(59,35),ar:v(78,26)});
        return D(a,b,'seat machine',{duration:2.2});
      case 'legext':
        a=P(SIT,{kl:v(60,50),al:v(60,66),kr:v(67,51),ar:v(67,67)});
        b=P(a,{kl:v(60,50),al:v(79,50),kr:v(67,51),ar:v(84,52)});
        return D(a,b,'seat machine',{duration:2.1});
      case 'legcurl-lying':
        a=P(BENCH,{h:v(21,38),s:v(35,41),p:v(62,43),kl:v(77,43),al:v(90,45),kr:v(80,43),ar:v(93,45)});
        b=P(a,{al:v(77,29),ar:v(80,28)});
        return D(a,b,'bench',{duration:2});
      case 'legcurl-sit':
        a=P(SIT,{kl:v(62,52),al:v(83,50),kr:v(65,52),ar:v(85,50)});
        b=P(a,{al:v(65,65),ar:v(69,65)});
        return D(a,b,'seat machine',{duration:2});
      case 'nordic':
        a=P(SIDE,{h:v(52,15),s:v(52,27),p:v(53,43),kl:v(51,58),al:v(46,67),kr:v(56,58),ar:v(55,67)});
        b=P(a,{h:v(75,38),s:v(70,45),p:v(54,53)});
        return D(a,b,'floor',{duration:2.6});
      case 'hipthrust':case 'glutebridge':
        a=P(FLOOR,{h:v(21,55),s:v(33,52),p:v(58,58),kl:v(75,49),al:v(78,66),kr:v(78,49),ar:v(82,66)});
        b=P(a,{p:v(58,36),kl:v(75,45),kr:v(78,45)});
        return D(a,b,kind==='hipthrust'?'bench':'floor',{duration:2.25});
      case 'abduction':case 'adduction':
        a=P(SIT,{kl:v(53,53),al:v(50,66),kr:v(65,53),ar:v(67,66)});
        b=P(a,kind==='abduction'?{kl:v(43,53),al:v(37,66),kr:v(75,53),ar:v(81,66)}:{kl:v(57,53),al:v(58,66),kr:v(60,53),ar:v(60,66)});
        return D(a,b,'seat machine',{duration:2.1});
      case 'calf-stand':case 'calf-sit':
        a=kind==='calf-sit'?SIT:ST;
        b=P(a,kind==='calf-sit'?{al:v(62,62),ar:v(68,62)}:{h:v(50,8),s:v(50,22),p:v(50,40),kl:v(45,53),kr:v(55,53),al:v(44,63),ar:v(56,63)});
        return D(a,b,(kind==='calf-sit'?'seat':'floor')+' dumbbell',{duration:1.8});
      case 'pistol':
        a=P(SIDE,{kl:v(49,56),al:v(48,68),kr:v(70,47),ar:v(87,46)});
        b=P(a,{h:v(47,24),s:v(45,35),p:v(48,54),kl:v(50,62),al:v(49,68),kr:v(69,53),ar:v(86,51)});
        return D(a,b,'floor',{duration:2.6});
      case 'handstand-free':case 'handstand-wall-front':case 'handstand-wall-back':
        a=INVERT;b=P(a,{h:v(50,55),s:v(50,44),p:v(50,28),kl:v(47,15),kr:v(53,15)});
        return D(a,b,'floor'+(kind==='handstand-free'?'':' wall'),{duration:3});
      case 'handstand-exit':
        a=INVERT;b=P(a,{p:v(56,33),kl:v(69,38),al:v(82,51),kr:v(57,19),ar:v(61,9)});
        return D(a,b,'floor',{duration:2.5});
      case 'wallwalk':
        a=P(PUSH,{h:v(23,51),s:v(34,51),p:v(65,51),kl:v(75,50),al:v(85,49),kr:v(77,51),ar:v(88,49)});
        b=P(INVERT,{h:v(62,54),s:v(62,43),p:v(65,27),wl:v(61,66),wr:v(66,66),al:v(86,10),ar:v(88,10)});
        return D(a,b,'floor wall',{duration:2.8});
      case 'handstand-push':
        a=INVERT;b=P(a,{h:v(50,65),s:v(50,52),p:v(50,35),el:v(35,55),er:v(65,55)});
        return D(a,b,'floor wall',{duration:2.2});
      case 'lsit':case 'vsit':
        a=P(SIT,{h:v(40,20),s:v(40,32),p:v(43,48),el:v(33,43),wl:v(33,54),er:v(51,43),wr:v(54,54),kl:v(62,47),al:v(79,47),kr:v(65,47),ar:v(82,47)});
        b=P(a,kind==='vsit'?{al:v(68,15),ar:v(74,12),kl:v(60,29),kr:v(63,27)}:{al:v(81,44),ar:v(84,44)});
        return D(a,b,'parallettes floor',{duration:2.4});
      case 'tuckplanche':case 'straddleplanche':
        a=P(PUSH,{h:v(23,42),s:v(35,43),p:v(59,42),kl:v(67,48),al:v(67,58),kr:v(71,48),ar:v(70,58)});
        b=P(a,kind==='straddleplanche'?{p:v(58,37),kl:v(72,33),al:v(83,34),kr:v(72,43),ar:v(84,44)}:{p:v(56,37),kl:v(63,43),al:v(68,44),kr:v(67,42),ar:v(71,44)});
        return D(a,b,'parallettes floor',{duration:2.7});
      case 'frontlever':case 'backlever':
        a=P(HANG,{h:v(30,46),s:v(43,43),p:v(63,43),kl:v(77,43),kr:v(78,45),al:v(76,55),ar:v(80,54),wl:v(38,10),wr:v(52,10)});
        b=P(a,{h:v(29,42),s:v(44,40),p:v(62,39),kl:v(70,34),kr:v(72,36),al:v(68,45),ar:v(71,47)});
        return D(a,b,'pullbar',{duration:2.8});
      case 'support':
        a=DIP;b=P(a,{h:v(50,11),s:v(50,23),p:v(50,40),kl:v(44,53),kr:v(56,53)});
        return D(a,b,'dipbars',{duration:2.4});
      case 'skinthecat':
        a=HANG;b=P(a,{h:v(52,33),s:v(50,43),p:v(57,25),kl:v(62,15),kr:v(64,16),al:v(72,13),ar:v(77,14)});
        return D(a,b,'pullbar',{duration:3});
      case 'dragonflag':
        a=P(FLOOR,{h:v(22,56),s:v(34,56),p:v(57,53),kl:v(72,53),al:v(87,52),kr:v(73,55),ar:v(90,54)});
        b=P(a,{p:v(57,34),kl:v(70,22),kr:v(73,24),al:v(81,10),ar:v(84,11)});
        return D(a,b,'bench',{duration:2.4});
      case 'plank':case 'sideplank':
        a=P(PUSH,{h:v(24,50),s:v(35,51),p:v(65,47),el:v(34,62),wl:v(43,66),er:v(42,62),wr:v(51,66)});
        b=P(a,{p:v(65,45),h:v(24,49),s:v(35,49)});
        if(kind==='sideplank')a=P(a,{er:v(47,31),wr:v(54,21)}),b=P(b,{er:v(47,28),wr:v(54,18)});
        return D(a,b,'floor',{duration:3.5});
      case 'deadbug':
        a=P(FLOOR,{h:v(24,56),s:v(34,57),p:v(56,57),el:v(35,42),wl:v(35,27),er:v(48,42),wr:v(49,27),kl:v(65,44),al:v(72,41),kr:v(76,45),ar:v(82,41)});
        b=P(a,{wl:v(22,23),ar:v(88,27),al:v(73,52),wr:v(50,23)});
        return D(a,b,'floor',{duration:2.8});
      case 'hollow':
        a=P(FLOOR,{h:v(22,54),s:v(33,52),p:v(58,56),el:v(30,38),wl:v(24,27),er:v(40,37),wr:v(34,24),kl:v(73,50),al:v(87,43),kr:v(75,52),ar:v(90,45)});
        b=P(a,{h:v(22,53),s:v(33,51),al:v(87,41),ar:v(90,43)});
        return D(a,b,'floor',{duration:3.2});
      case 'cable-crunch':
        a=P(SIDE,{h:v(47,12),s:v(48,27),p:v(50,43),kl:v(46,60),al:v(43,67),kr:v(54,60),ar:v(56,67),el:v(56,24),wl:v(67,20),er:v(60,25),wr:v(71,22)});
        b=P(a,{h:v(38,33),s:v(40,40),p:v(50,43),el:v(49,33),wl:v(59,28),er:v(54,35),wr:v(63,30)});
        return D(a,b,'floor cable',{duration:2.1});
      case 'hanging-raises':case 'toestobar':
        a=HANG;b=P(a,kind==='toestobar'?{kl:v(43,32),al:v(35,12),kr:v(57,32),ar:v(65,12),p:v(50,50)}:{kl:v(40,45),al:v(33,35),kr:v(60,45),ar:v(67,35),p:v(50,52)});
        return D(a,b,'pullbar',{duration:2.4});
      case 'pallof':
        a=P(ST,{el:v(42,34),wl:v(49,32),er:v(58,34),wr:v(51,32)});
        b=P(a,{el:v(47,31),wl:v(49,22),er:v(53,31),wr:v(51,22)});
        return D(a,b,'floor cable',{duration:2.25});
      case 'abwheel':
        a=P(PUSH,{h:v(28,34),s:v(36,44),p:v(49,47),kl:v(58,58),al:v(59,68),kr:v(63,58),ar:v(64,68),el:v(43,51),wl:v(51,62),er:v(46,53),wr:v(53,62)});
        b=P(a,{h:v(46,44),s:v(56,48),p:v(49,47),el:v(65,52),wl:v(75,62),er:v(67,53),wr:v(78,62)});
        return D(a,b,'floor weight',{duration:2.7});
      case 'farmer':case 'suitcase':
        a=ST;b=P(ST,{h:v(51,10),s:v(51,24),p:v(51,43),kl:v(39,55),al:v(39,67),kr:v(57,53),ar:v(62,64)});
        return D(a,b,'floor '+(kind==='farmer'?'dumbbell':'onearm dumbbell'),{duration:1.35});
      case 'kbswing':
        a=P(SIDE,{h:v(35,30),s:v(36,39),p:v(52,44),el:v(43,47),wl:v(49,58),er:v(46,48),wr:v(50,58),kl:v(54,56),kr:v(60,56)});
        b=P(a,{h:v(47,11),s:v(47,25),p:v(50,43),el:v(52,28),wl:v(66,26),er:v(53,28),wr:v(67,26)});
        return D(a,b,'floor kettlebell',{duration:1.85});
      case 'boxjump':
        a=P(SIDE,{h:v(44,12),s:v(44,25),p:v(46,44),kl:v(41,56),kr:v(53,57),al:v(40,68),ar:v(56,67)});
        b=P(a,{h:v(66,7),s:v(66,20),p:v(68,36),kl:v(64,48),kr:v(74,48),al:v(70,48),ar:v(79,48)});
        return D(a,b,'floor box',{duration:2});
      case 'burpees':
        a=P(SIDE,{h:v(46,24),s:v(45,35),p:v(50,53),el:v(37,43),wl:v(31,54),er:v(54,43),wr:v(58,54),kl:v(40,63),al:v(40,68),kr:v(59,63),ar:v(60,68)});
        b=P(PUSH,{h:v(24,54),s:v(35,55),p:v(65,54)});
        return D(a,b,'floor',{duration:2.4});
      case 'jumprope':
        a=ST;b=P(ST,{h:v(50,7),s:v(50,21),p:v(50,39),kl:v(45,53),kr:v(55,53),al:v(44,62),ar:v(56,62),el:v(39,31),er:v(61,31),wl:v(35,37),wr:v(65,37)});
        return D(a,b,'floor',{duration:1});
      case 'battle':
        a=P(ST,{h:v(46,14),s:v(46,28),p:v(47,46),kl:v(39,56),kr:v(58,56),el:v(35,35),er:v(56,35),wl:v(26,45),wr:v(68,46)});
        b=P(a,{wl:v(27,22),wr:v(69,52)});
        return D(a,b,'floor cable',{duration:1.3});
      case 'sledpush':
        a=P(SIDE,{h:v(36,31),s:v(40,39),p:v(52,46),el:v(51,41),wl:v(64,43),er:v(54,43),wr:v(66,43),kl:v(51,56),al:v(42,67),kr:v(62,55),ar:v(60,67)});
        b=P(a,{h:v(39,31),s:v(43,39),p:v(55,46),wl:v(67,43),wr:v(69,43),al:v(46,67),ar:v(66,67)});
        return D(a,b,'floor sled',{duration:1.8});
      case 'rower':
        a=P(SIT,{h:v(31,18),s:v(35,29),p:v(40,44),el:v(51,30),wl:v(67,32),er:v(53,33),wr:v(70,32),kl:v(57,47),al:v(72,54),kr:v(63,47),ar:v(77,54)});
        b=P(a,{h:v(43,15),s:v(47,26),p:v(54,44),el:v(52,32),wl:v(51,35),er:v(55,33),wr:v(55,35),kl:v(70,48),kr:v(74,48)});
        return D(a,b,'floor rowmachine',{duration:1.8});
      case 'bike':case 'armbike':case 'assaultbike':
        a=P(SIT,{h:v(42,13),s:v(43,26),p:v(39,43),el:v(50,33),wl:v(63,34),er:v(54,35),wr:v(66,36),kl:v(48,53),al:v(47,62),kr:v(56,55),ar:v(65,57)});
        b=P(a,{kl:v(57,54),al:v(66,58),kr:v(49,53),ar:v(47,61),wl:v(63,28),wr:v(66,30)});
        return D(a,b,'floor bike',{duration:1.2});
      case 'run':case 'sprint':
        a=P(SIDE,{h:v(48,12),s:v(47,25),p:v(48,43),el:v(38,32),wl:v(35,24),er:v(57,32),wr:v(62,45),kl:v(38,54),al:v(29,65),kr:v(60,51),ar:v(72,62)});
        b=P(a,{h:v(52,12),s:v(51,25),p:v(49,43),el:v(41,32),wl:v(37,45),er:v(61,32),wr:v(65,25),kl:v(62,52),al:v(72,62),kr:v(39,53),ar:v(31,65)});
        return D(a,b,'floor',{duration:kind==='sprint'?.85:1.3});
      case 'skierg':
        a=P(ST,{h:v(44,13),s:v(43,26),p:v(47,44),el:v(51,20),wl:v(65,12),er:v(56,22),wr:v(71,13)});
        b=P(a,{h:v(37,29),s:v(41,38),p:v(48,47),el:v(50,41),wl:v(65,55),er:v(55,41),wr:v(70,56)});
        return D(a,b,'floor skierg',{duration:1.65});
      default:
        a=ST;b=P(ST,{el:v(37,28),wl:v(27,20),er:v(63,28),wr:v(73,20)});
        return D(a,b,'floor',{duration:2.2});
    }
  }
  function fold(s){return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();}
  var mapping=Object.create(null);
  function register(kind,names){names.split('|').forEach(function(name){mapping[fold(name)]=kind;});}
  // Every user-listed exercise has an intentional mapping, including grip/gear variants.
  register('pull-pron','Tractions pronation|Tractions');
  register('pull-sup','Tractions supination');register('pull-neutral','Tractions prise neutre');register('pull-weighted','Tractions lestées');
  register('muscleup','Muscle-up');register('suspension','Suspension active');register('scapular','Scapular pulls');
  register('latpulldown','Tirage vertical poulie haute');register('cable-row','Tirage horizontal poulie basse');
  register('bar-row','Rowing barre');register('dbrow','Rowing haltère sur banc|Rowing haltères');register('tbar-row','Rowing T-bar');
  register('machine-row','Rowing machine convergente');register('facepull','Face pull');register('pullover','Pull-over poulie');register('shrugs','Shrugs haltères');
  register('curl-bar','Curl barre');register('curl-db','Curl haltères');register('curl-hammer','Curl marteau');
  register('curl-preacher','Curl pupitre');register('curl-incline','Curl incliné');
  register('bench-bar','Développé couché barre');register('bench-db','Développé couché haltères');
  register('incline-bar','Développé incliné barre');register('incline-db','Développé incliné haltères');
  register('ohp-bar','Développé militaire barre');register('ohp-db','Développé militaire haltères');register('pushpress','Push press');
  register('chestpress','Chest press machine');register('cablefly','Écarté poulie vis-à-vis');register('pecdeck','Pec deck');
  register('dips','Dips');register('dips-weighted','Dips lestés');register('pushup','Pompes');register('pushup-diamond','Pompes diamant');
  register('pikepush','Pompes pike|Pike push-ups');register('pushup-decline','Pompes déclinées');
  register('lateral-db','Élévations latérales haltères');register('lateral-cable','Élévations latérales poulie');
  register('reverse-fly','Oiseau haltères');register('reverse-pec','Reverse pec deck');
  register('triceps-push','Extension triceps poulie haute');register('skullcrusher','Barre au front');register('triceps-overhead','Extension triceps nuque');
  register('squat','Squat barre');register('frontsquat','Front squat');register('gobletsquat','Goblet squat');
  register('bulgarian','Squat bulgare');register('lunge-walk','Fentes marchées');register('lunge-reverse','Fentes arrière');
  register('stepup','Step-up sur box');register('deadlift','Soulevé de terre');register('rdl','Soulevé de terre roumain');
  register('goodmorning','Good morning');register('legpress','Leg press');register('hacksquat','Hack squat');register('legext','Leg extension');
  register('legcurl-lying','Leg curl allongé');register('legcurl-sit','Leg curl assis');register('nordic','Nordic curl');
  register('hipthrust','Hip thrust');register('glutebridge','Pont fessier');register('abduction','Abduction machine');register('adduction','Adduction machine');
  register('calf-stand','Mollets debout');register('calf-sit','Mollets assis');register('pistol','Pistol squat');
  register('handstand-wall-front','ATR ventre au mur');register('handstand-wall-back','ATR dos au mur');register('handstand-free','ATR libre');
  register('handstand-exit','Sorties contrôlées');register('wallwalk','Montées pieds au mur');register('handstand-push','Pompes en ATR');
  register('lsit','L-sit sur parallettes|L-sit');register('vsit','V-sit');register('tuckplanche','Tuck planche');
  register('straddleplanche','Straddle planche');register('frontlever','Front lever tuck');register('backlever','Back lever tuck');
  register('support','Support sur barres parallèles');register('skinthecat','Skin the cat');register('dragonflag','Dragon flag');
  register('plank','Planche');register('sideplank','Planche latérale');register('deadbug','Dead bug');register('hollow','Hollow hold');
  register('cable-crunch','Crunch poulie à genoux');register('hanging-raises','Relevés de jambes suspendu');register('toestobar','Toes to bar');
  register('pallof','Pallof press');register('abwheel','Ab wheel');register('farmer','Farmer walk');register('suitcase','Suitcase carry');
  register('kbswing','Kettlebell swing');register('boxjump','Box jump');register('burpees','Burpees');register('jumprope','Corde à sauter');
  register('battle','Battle ropes');register('sledpush','Sled push');register('rower','Rameur');register('bike','Vélo');
  register('armbike','Vélo à bras');register('assaultbike','Assault bike');register('run','Course');register('sprint','Sprints');register('skierg','Ski erg');
  function classify(name){
    var f=fold(name);if(mapping[f])return mapping[f];
    if(/developpe couche/.test(f))return /haltere/.test(f)?'bench-db':'bench-bar';
    if(/developpe militaire/.test(f))return /haltere/.test(f)?'ohp-db':'ohp-bar';
    if(/l sit/.test(f))return 'lsit';
    if(/elevation laterale/.test(f))return 'lateral-db';
    if(/tractions?/.test(f))return 'pull-pron';
    if(/rowing|tirage/.test(f))return 'cable-row';
    if(/pike/.test(f))return 'pikepush';
    if(/atri?|handstand/.test(f))return 'handstand-free';
    return 'generic';
  }
  function render(name,gender,still){
    var mode=classify(name),cfg=animate(mode),poses=cfg.frames,c=palette[gender]||palette.male,dur=cfg.opts.duration||2.1;
    var style='<style>.body-line{fill:none;stroke-linecap:round;stroke-linejoin:round}.athlete .skin{stroke:'+c.skin+';fill:none;stroke-linecap:round}.athlete .arm{stroke:'+c.skin+';fill:none;stroke-linecap:round}.athlete .leg{stroke:'+c.skin+';fill:none;stroke-linecap:round}.athlete .top{stroke:'+c.highlight+';stroke-width:.65}.athlete .shorts{stroke:'+c.bottom+';stroke-linejoin:round}.athlete .definition{fill:none;stroke:'+c.highlight+';opacity:.7;stroke-linecap:round}.far{opacity:.62}.cableline{fill:none;stroke:#89aec3;stroke-linecap:round}.load{stroke-linecap:round;stroke-linejoin:round}</style>';
    var equipment=eq(cfg.gear,poses,!!still,dur);
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 76" class="fig avatar-fig" data-kind="'+mode+'" data-avatar="'+(gender==='female'?'female':'male')+'" role="img" aria-label="Animation '+name.replace(/[&"<>]/g,'')+'">'+style+equipment+drawAvatar(poses,gender,!!still,dur)+'</svg>';
  }
  root.GymBuddyAvatar={render:render,classify:classify,supported:Object.keys(mapping).length};
})(window);