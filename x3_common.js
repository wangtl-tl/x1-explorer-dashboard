/* ============================================================
   X1 坚忍烁号游戏厅 3.0 共享库
   模块：🎁探险宝箱 📖怪兽图鉴 🏆航海段位 📣战报卡
   版本：v3.0  2026-09-16
   用法：
     XP3.hit(game, cat, isBoss)   // 答对时调用
     XP3.miss(game, cat)          // 答错时调用（护盾挡下不调）
     XP3.settle({game,name,gems}) // 结算时调用，自动开宝箱+算段位
   ============================================================ */
(function(){
"use strict";
/* ---------- 安全存储 ---------- */
var mem={};
function lsGet(k,d){ try{ var v=localStorage.getItem(k); return v===null?d:v; }catch(e){ return (k in mem)?mem[k]:d; } }
function lsSet(k,v){ try{ localStorage.setItem(k,v); }catch(e){ mem[k]=v; } }
function jget(k,d){ try{ return JSON.parse(lsGet(k,d)); }catch(e){ return JSON.parse(d); } }
function jset(k,v){ lsSet(k,JSON.stringify(v)); }

/* ---------- 样式注入 ---------- */
var css=document.createElement('style');
css.textContent=[
".x3mask{position:fixed;inset:0;background:rgba(6,14,32,.86);z-index:9998;display:flex;align-items:center;justify-content:center;flex-direction:column;font-family:'Microsoft YaHei',sans-serif;}",
".x3panel{background:linear-gradient(160deg,#12294f,#0b1e3d);border:2px solid #ffd94d;border-radius:18px;padding:22px;max-width:92vw;max-height:86vh;overflow-y:auto;color:#eaf2ff;text-align:center;box-shadow:0 0 40px rgba(255,217,77,.35);}",
".x3chest{font-size:72px;cursor:pointer;user-select:none;transition:transform .15s;}",
".x3chest:active{transform:scale(.9);}",
".x3shake{animation:x3shk .45s ease;}",
"@keyframes x3shk{0%,100%{transform:rotate(0)}20%{transform:rotate(-14deg) scale(1.06)}40%{transform:rotate(12deg)}60%{transform:rotate(-9deg) scale(1.1)}80%{transform:rotate(7deg)}}",
".x3flash{position:fixed;inset:0;pointer-events:none;opacity:0;z-index:9997;transition:opacity .3s;}",
".x3rare-n{color:#6fb0ff}.x3rare-r{color:#b57bff}.x3rare-e{color:#ffd94d}",
".x3legend{background:linear-gradient(90deg,#ff5c5c,#ffd94d,#6fe3ff,#ff9ecb);-webkit-background-clip:text;background-clip:text;color:transparent;font-weight:900;}",
".x3btn{display:inline-block;background:#ffd94d;color:#0b1e3d;border:none;border-radius:12px;padding:10px 26px;font-size:16px;font-weight:800;margin:8px 6px;cursor:pointer;font-family:inherit;}",
".x3btn.gray{background:#3a5075;color:#cfe0f5;}",
".x3float{position:fixed;right:12px;bottom:14px;z-index:9990;display:flex;flex-direction:column;gap:8px;}",
".x3float button{width:52px;height:52px;border-radius:50%;border:2px solid rgba(255,217,77,.6);background:rgba(11,30,61,.92);font-size:24px;cursor:pointer;box-shadow:0 3px 10px rgba(0,0,0,.4);}",
".x3row{display:flex;align-items:center;gap:10px;text-align:left;background:rgba(255,255,255,.05);border-radius:10px;padding:8px 12px;margin:6px 0;}",
".x3dot{width:10px;height:10px;border-radius:50%;flex:none;}",
".x3tag{font-size:11px;padding:1px 8px;border-radius:8px;flex:none;}",
".x3card{background:linear-gradient(160deg,#1a3a6b,#0d2247);border:2px solid #6fe3ff;border-radius:16px;padding:18px;text-align:left;font-size:15px;line-height:1.9;white-space:pre-wrap;}",
".x3small{font-size:12px;color:#9db8dd;}"
].join("\n");
document.head.appendChild(css);

/* ---------- 浮标按钮 ---------- */
function injectFloat(){
  if(document.getElementById('x3float')) return;
  var f=document.createElement('div'); f.id='x3float'; f.className='x3float';
  var b1=document.createElement('button'); b1.textContent='📖'; b1.title='怪兽图鉴'; b1.onclick=openBook;
  var b2=document.createElement('button'); b2.textContent='🏆'; b2.title='航海段位'; b2.onclick=openBook;
  f.appendChild(b1); f.appendChild(b2); document.body.appendChild(f);
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',injectFloat); else injectFloat();

/* ---------- 怪兽图鉴数据 ---------- */
var MONSTERS=[
 {id:'ss1',game:'shishang',cat:'near',emoji:'🦥',name:'懒散算怪·整十型',rar:'普通',tip:'把除数看成整十数，先估算商是几位数！'},
 {id:'ss2',game:'shishang',cat:'sish',emoji:'🧮',name:'错算怪·四舍型',rar:'稀有',tip:'四舍把除数看小，商容易变大——验算：商×除数！'},
 {id:'ss3',game:'shishang',cat:'wu',emoji:'📐',name:'错算怪·五入型',rar:'史诗',tip:'五入把除数看大，商容易变小——记得调商！'},
 {id:'ss4',game:'shishang',cat:'boss',emoji:'👹',name:'错算怪BOSS·限时型',rar:'传说',tip:'20秒限时战！除数×10估一估，乘积逼近被除数。'},
 {id:'cz1',game:'cuozi',cat:'课文字',emoji:'🀄',name:'错字怪·课文潜伏型',rar:'普通',tip:'课文生字看偏旁：均匀的「均」是土字旁！'},
 {id:'cz2',game:'cuozi',cat:'常用词',emoji:'🎭',name:'错字怪·常用词游荡型',rar:'稀有',tip:'常用词盯紧易混：是「恢复」，不是「灰复」！'},
 {id:'cz3',game:'cuozi',cat:'boss',emoji:'🏹',name:'错字怪首领·箭雨型',rar:'传说',tip:'BOSS=限时20秒，先想偏旁再落笔，一箭一个准！'},
 {id:'dc1',game:'danci',cat:'学校',emoji:'🐙',name:'气泡章鱼·学校系',rar:'普通',tip:'class+room=classroom，长单词拆开记！'},
 {id:'dc2',game:'danci',cat:'家居',emoji:'🏠',name:'气泡章鱼·家居系',rar:'普通',tip:'bed+room=bedroom，房间单词都带room！'},
 {id:'dc3',game:'danci',cat:'食物',emoji:'🍜',name:'气泡章鱼·食物系',rar:'普通',tip:'noodles面条成群结队，所以结尾有s！'},
 {id:'dc4',game:'danci',cat:'职业',emoji:'👨‍⚕️',name:'气泡章鱼·职业系',rar:'稀有',tip:'drive→driver，动词加er变职业！'},
 {id:'dc5',game:'danci',cat:'其他',emoji:'🎒',name:'气泡章鱼·百宝舱',rar:'史诗',tip:'schoolbag=school+bag，书包里装满组合词！'},
 {id:'dc6',game:'danci',cat:'boss',emoji:'👑',name:'章鱼王·无限触手',rar:'传说',tip:'触手会打乱字母顺序——先拼辅音，再补元音！'}
];
var RAR_COLOR={'普通':'#6fb0ff','稀有':'#b57bff','史诗':'#ffd94d','传说':'#ff5c8a'};
var RAR_NAME={'普通':'普通','稀有':'稀有','史诗':'史诗','传说':'传说'};

/* ---------- 段位数据 ---------- */
var RANKS=[[0,'见习水手','🪵'],[30,'正式水手','⚓'],[60,'舵手','🧭'],[100,'大副','🎖️'],[150,'船长','👑'],[220,'提督','🌟']];
function weekKey(){
  var d=new Date(),one=new Date(d.getFullYear(),0,1);
  var wk=Math.ceil((((d-one)/864e5)+one.getDay()+1)/7);
  return d.getFullYear()+'-W'+wk;
}
function rankOf(pts){ var idx=0; for(var i=0;i<RANKS.length;i++){ if(pts>=RANKS[i][0]) idx=i; } return idx; }

/* ---------- 状态 ---------- */
var streak=jget('x3_streak',{});      // 图鉴连击
var book=jget('x3_book',[]);          // 已收编怪兽id
var roundHits={shishang:0,cuozi:0,danci:0};
var pending=[];                        // 本轮新收编怪兽

var ALIAS={'文具':'其他','物品':'其他','人物':'其他','特训':'其他'};
function hit(game,cat,isBoss){
  roundHits[game]=(roundHits[game]||0)+1;
  cat=ALIAS[cat]||cat;
  var key=game+'_'+cat;
  if(isBoss){
    var b=MONSTERS.filter(function(m){return m.game===game&&m.cat==='boss';})[0];
    if(b&&!book.includes(b.id)){ book.push(b.id); jset('x3_book',book); pending.push(b); toast('📖 传说怪兽「'+b.name+'」收编入册！！'); }
    return;
  }
  streak[key]=(streak[key]||0)+1; jset('x3_streak',streak);
  if(streak[key]>=3){
    var m=MONSTERS.filter(function(x){return x.game===game&&x.cat===cat;})[0];
    if(m&&!book.includes(m.id)){ book.push(m.id); jset('x3_book',book); pending.push(m); toast('📖 新怪兽「'+m.name+'」收编入册！'); }
  }
}
function miss(game,cat){
  roundHits[game]=roundHits[game]||0;
  cat=ALIAS[cat]||cat;
  var key=game+'_'+cat;
  if(streak[key]){ streak[key]=0; jset('x3_streak',streak); }
}

/* ---------- 通用浮层 ---------- */
function toast(t){
  var d=document.createElement('div');
  d.style.cssText='position:fixed;top:16%;left:50%;transform:translateX(-50%);background:rgba(11,30,61,.95);border:1px solid #ffd94d;color:#ffd94d;padding:10px 22px;border-radius:24px;z-index:9999;font-size:15px;font-weight:700;box-shadow:0 4px 16px rgba(0,0,0,.5);';
  d.textContent=t; document.body.appendChild(d);
  setTimeout(function(){d.style.opacity='0';d.style.transition='opacity .5s';},2200);
  setTimeout(function(){d.remove();},2800);
}
function overlay(inner){
  var mask=document.createElement('div'); mask.className='x3mask';
  var panel=document.createElement('div'); panel.className='x3panel';
  panel.innerHTML=inner; mask.appendChild(panel); document.body.appendChild(mask);
  return {mask:mask,panel:panel};
}

/* ---------- 🎁 宝箱仪式 ---------- */
function rollRarity(){
  var r=Math.random()*100;
  if(r<1) return '传说'; if(r<10) return '史诗'; if(r<40) return '稀有'; return '普通';
}
var CHEST_LOOT={
 '普通':function(){return {gems:2+Math.floor(Math.random()*4),frags:0};},
 '稀有':function(){return {gems:8,frags:Math.random()<0.75?1:0};},
 '史诗':function(){return {gems:15,frags:3};},
 '传说':function(){return {gems:20,frags:10};}
};
function settle(opts){
  opts=opts||{};
  var game=opts.game||'shishang', name=opts.name||'探险';
  var correct=Math.min(roundHits[game]||0,10);
  roundHits[game]=0;
  if(correct===0&&pending.length===0){ pending=[]; return; }
  /* 段位结算 */
  var rank=jget('x3_rank',{week:weekKey(),pts:0});
  if(rank.week!==weekKey()){ rank={week:weekKey(),pts:0}; }
  var oldIdx=rankOf(rank.pts);
  rank.pts+=correct; jset('x3_rank',rank);
  var newIdx=rankOf(rank.pts);
  var rankUp=newIdx>oldIdx;
  /* 宝箱 */
  var keys=Math.min(correct,5);
  var bonusGems=Math.max(0,correct-5);
  var totalGems=bonusGems,totalFrags=0,legendary=false;
  var fresh=pending.slice(); pending=[];
  var ov=overlay(
    '<div style="font-size:20px;font-weight:900;color:#ffd94d">🎁 探险宝箱</div>'+
    '<div class="x3small" style="margin:6px 0 10px">答对 '+correct+' 题 → '+keys+' 把钥匙'+(bonusGems?'（另有'+bonusGems+'把自动换成💎）':'')+'</div>'+
    '<div class="x3chest" id="x3chestBox">🎁</div>'+
    '<div id="x3keys" style="font-size:16px;margin:8px 0;color:#6fe3ff">'+'🔑'.repeat(keys)+'</div>'+
    '<div id="x3chestMsg" style="min-height:26px;font-size:15px">👆 点一下宝箱开箱！</div>'+
    '<div><button class="x3btn gray" id="x3skip">跳过动画</button></div>'
  );
  var chest=ov.panel.querySelector('#x3chestBox'),msg=ov.panel.querySelector('#x3chestMsg'),keysEl=ov.panel.querySelector('#x3keys');
  var opened=0,busy=false;
  function openOne(){
    if(opened>=keys||busy) return; busy=true; opened++;
    keysEl.textContent='🔑'.repeat(keys-opened);
    chest.classList.remove('x3shake'); void chest.offsetWidth; chest.classList.add('x3shake');
    setTimeout(function(){
      var rar=rollRarity(),loot=CHEST_LOOT[rar]();
      totalGems+=loot.gems; totalFrags+=loot.frags; if(rar==='传说') legendary=true;
      var flash=document.createElement('div'); flash.className='x3flash';
      flash.style.background=rar==='传说'?'radial-gradient(circle,#fff,#ff9ecb)':'radial-gradient(circle,'+RAR_COLOR[rar]+'88,transparent)';
      document.body.appendChild(flash); flash.style.opacity='1';
      setTimeout(function(){flash.style.opacity='0';setTimeout(function(){flash.remove();},350);},420);
      chest.textContent=rar==='传说'?'💎':rar==='史诗'?'🏴‍☠️':'🧰';
      msg.innerHTML='<span class="x3rare-'+({普通:'n',稀有:'r',史诗:'e'}[rar]||'n')+(rar==='传说'?' x3legend':'')+'" style="font-weight:900">'+rar+'宝箱！💎+'+loot.gems+(loot.frags?' 🧩皮肤碎片+'+loot.frags:'')+'</span>';
      setTimeout(function(){ busy=false; chest.textContent='🎁';
        if(opened<keys){ msg.textContent='还有 '+(keys-opened)+' 个宝箱！'; }
        else finishChest();
      },850);
    },480);
  }
  chest.onclick=openOne;
  ov.panel.querySelector('#x3skip').onclick=function(){ opened=keys; keysEl.textContent=''; finishChest(); };
  function finishChest(){
    if(totalGems>0){
      var tg=parseInt(lsGet('x1_total_gems','0'),10)+totalGems;
      lsSet('x1_total_gems',String(tg));
      try{ if(typeof window.updateTotalGems==='function') window.updateTotalGems(tg); }catch(e){}
    }
    if(totalFrags>0) lsSet('x1_skin_frags',String(parseInt(lsGet('x1_skin_frags','0'),10)+totalFrags));
    var html='<div style="font-size:44px">'+(legendary?'🌈':'🎉')+'</div>'+
      '<div style="font-weight:900;font-size:19px;color:#ffd94d;margin:4px 0">开箱收获</div>'+
      '<div style="font-size:16px;line-height:2">💎 宝石 <b>+'+(totalGems)+'</b>（累计 '+lsGet('x1_total_gems','0')+'）'+
      (totalFrags?'<br>🧩 皮肤碎片 <b>+'+totalFrags+'</b>（累计 '+lsGet('x1_skin_frags','0')+'）':'')+'</div>';
    if(fresh.length) html+='<div class="x3small" style="margin-top:6px">📖 本轮收编：'+fresh.map(function(m){return m.emoji+m.name;}).join('　')+'</div>';
    if(rankUp){
      var rk=RANKS[newIdx];
      html+='<div style="margin-top:10px;font-size:22px;font-weight:900">'+rk[2]+' 段位晋升：'+RANKS[oldIdx][1]+' ➜ <span class="x3legend">'+rk[1]+'</span></div>';
    }
    ov.panel.innerHTML=html+'<div><button class="x3btn" id="x3report">📣 生成战报卡</button><button class="x3btn gray" id="x3close">收好战利品</button></div>';
    ov.panel.querySelector('#x3close').onclick=function(){ ov.mask.remove(); };
    ov.panel.querySelector('#x3report').onclick=function(){
      showReport(name,correct,rank,newIdx,fresh,legendary,totalGems,totalFrags);
      ov.mask.remove();
    };
  }
}
function showReport(name,correct,rank,newIdx,fresh,legendary,totalGems,totalFrags){
  var rk=RANKS[newIdx],bookN=book.length;
  var card='🏆 航海战报 ｜ 烁烁船长\n'+
    '━━━━━━━━━━━━\n'+
    '🗺️ 本次探险：'+name+'\n'+
    '✅ 击破答题：'+correct+' 题\n'+
    rk[2]+' 航海段位：'+rk[1]+'（本周 '+rank.pts+' 分）\n'+
    '📖 怪兽图鉴：'+bookN+'/'+MONSTERS.length+' 只'+(fresh.length?('（新增：'+fresh.map(function(m){return m.name;}).join('、')+'）'):'')+'\n'+
    (legendary?'🌈 触发传说宝箱！欧皇附体！！\n':'')+
    (totalFrags?'🧩 皮肤碎片累计：'+lsGet('x1_skin_frags','0')+'\n':'')+
    '━━━━━━━━━━━━\n'+
    '🦆 嘎嘎：报告全船！我们船长又变强了！！💪';
  var ov=overlay(
    '<div style="font-size:18px;font-weight:900;color:#6fe3ff;margin-bottom:10px">📣 航海战报卡</div>'+
    '<div class="x3card" id="x3cardText">'+card.replace(/\n/g,'<br>')+'</div>'+
    '<div><button class="x3btn" id="x3copy">📋 复制发群里</button><button class="x3btn gray" id="x3close2">关闭</button></div>'+
    '<div class="x3small">复制后粘贴到企微群，爸爸和嘎嘎都能看到你的战报！</div>'
  );
  ov.panel.querySelector('#x3close2').onclick=function(){ ov.mask.remove(); };
  ov.panel.querySelector('#x3copy').onclick=function(){
    if(navigator.clipboard){ navigator.clipboard.writeText(card).then(function(){ toast('✅ 已复制，去群里粘贴吧！'); }).catch(function(){ toast('长按战报卡文字复制'); }); }
    else toast('长按战报卡文字复制');
  };
}

/* ---------- 📖 图鉴 + 段位面板 ---------- */
function openBook(){
  var rank=jget('x3_rank',{week:weekKey(),pts:0});
  if(rank.week!==weekKey()){ rank={week:weekKey(),pts:0}; }
  var ridx=rankOf(rank.pts),rk=RANKS[ridx];
  var next=RANKS[ridx+1];
  var html='<div style="font-size:20px;font-weight:900;color:#ffd94d">🏆 航海段位</div>'+
    '<div style="font-size:34px;margin:6px 0">'+rk[2]+'</div>'+
    '<div style="font-weight:900;font-size:18px">'+rk[1]+'（本周 '+rank.pts+' 分）</div>'+
    '<div class="x3small">'+(next?('距离「'+next[1]+'」还差 '+(next[0]-rank.pts)+' 分'):'已达最高段位！')+' ｜ 每周一重置赛季</div>'+
    '<div style="border-top:1px solid rgba(255,255,255,.15);margin:12px 0"></div>'+
    '<div style="font-size:20px;font-weight:900;color:#6fe3ff">📖 怪兽图鉴 '+book.length+'/'+MONSTERS.length+'</div>'+
    '<div class="x3small" style="margin:4px 0 8px">同一类题连续答对3道 = 收编该怪兽！</div>';
  var games=[['shishang','⚓ 试商大冒险'],['cuozi','🏹 错字怪猎人'],['danci','🫧 单词打捞队']];
  games.forEach(function(g){
    html+='<div style="text-align:left;font-weight:800;color:#ffd94d;margin-top:8px">'+g[1]+'</div>';
    MONSTERS.filter(function(m){return m.game===g[0];}).forEach(function(m){
      var got=book.includes(m.id);
      html+='<div class="x3row"><span style="font-size:26px">'+(got?m.emoji:'❓')+'</span>'+
        '<div style="flex:1"><b>'+(got?m.name:'？？？')+'</b> <span class="x3tag" style="background:'+RAR_COLOR[m.rar]+'33;color:'+RAR_COLOR[m.rar]+'">'+m.rar+'</span>'+
        '<div class="x3small">'+(got?m.tip:'连续答对3道【'+(m.cat==='boss'?'BOSS战':m.cat)+'】题收编')+'</div></div></div>';
    });
  });
  html+='<div style="margin-top:12px"><button class="x3btn" id="x3close3">返航</button></div>';
  var ov=overlay(html);
  ov.panel.querySelector('#x3close3').onclick=function(){ ov.mask.remove(); };
}

/* ---------- 导出 ---------- */
window.XP3={hit:hit,miss:miss,settle:settle,openBook:openBook,toast:toast};
})();
