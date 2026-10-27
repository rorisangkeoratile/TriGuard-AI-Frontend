import i18next from 'i18next';
import { LOCALES, LANGS } from './locales.js';
import jsQR from 'jsqr';
import { analyze as analyzeEvent, normalizeNumber as normalize, formatNumber as fmt, hashString as hashStr, langLabel } from '../engine/index.js';
import { detector, USE_MOCK } from '../services/detector.js';
import { SCENARIOS, GROUPS, SEED_TRUSTED, SEED_COMMUNITY } from './scenarios.js';

// Drives the simulated phone and the demo desk. App.jsx renders the static markup (the elements with ids below);
// this module fills and updates them. Returns a cleanup function so React can unmount it.
export function startSimulator(){
const ac=new AbortController();const signal=ac.signal;
const $=s=>document.querySelector(s);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cap=s=>s.replace(/\b\w/g,c=>c.toUpperCase());

/* ---------- icons ---------- */
const P={
  home:'<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
  call:'<path d="M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 3 5a2 2 0 0 1 2-2z"/>',
  video:'<rect x="2.5" y="6" width="13" height="12" rx="2"/><path d="M15.5 10.5l6-3.5v10l-6-3.5z"/>',
  sms:'<path d="M4 4h16a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H9l-5 4V5a1 1 0 0 1 1-1z"/><path d="M8 9h8M8 12.5h5"/>',
  email:'<rect x="2.5" y="5" width="19" height="14" rx="2"/><path d="M3 6.5l9 6.5 9-6.5"/>',
  shield:'<path d="M12 2.5l8 3v6.2c0 5-3.4 8.6-8 9.8-4.6-1.2-8-4.8-8-9.8V5.5z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
  list:'<path d="M8 6h12M8 12h12M8 18h12"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/>',
  alert:'<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.5"/>',
  end:'<path d="M3 14c5-5 13-5 18 0l-2.5 3-3.5-1.5V13a10 10 0 0 0-6 0v2.5L5.5 17z"/>',
  upload:'<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v4h16v-4"/>',
  spark:'<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 15.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z"/>',
  globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  mic:'<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
  people:'<circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0"/><circle cx="17" cy="9" r="2.5"/><path d="M15.5 14.6A5 5 0 0 1 21 19.5"/>',
  pin:'<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  image:'<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 17l-5-5-9 8"/>',
  link:'<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  bank:'<path d="M3 10l9-6 9 6"/><path d="M5 10v8M9 10v8M15 10v8M19 10v8M3 20h18"/>',
  siren:'<path d="M7 18v-6a5 5 0 0 1 10 0v6"/><path d="M5 18h14v3H5zM12 3v2M4.2 6.2l1.4 1.4M19.8 6.2l-1.4 1.4"/>',
  check:'<path d="M5 12l5 5 9-10"/>',
  key:'<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M17 6l3 3M15 8l2 2"/>'
};
const ic=(n,s=20)=>`<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n]}</svg>`;
const CH={call:{label:'Voice call',icon:'call'},video:{label:'Video call',icon:'video'},sms:{label:'SMS',icon:'sms'},email:{label:'Email',icon:'email'},audio:{label:'Voice note',icon:'mic'},videoFile:{label:'Video clip',icon:'video'},message:{label:'Message',icon:'sms'},image:{label:'Image',icon:'image'},link:{label:'Link',icon:'link'}};
const LIVE_CH=['call','video','sms','email'];

/* ---------- languages (i18next) ---------- */
const LANG_KEY='triguard-lang';
let curLang='en';try{curLang=localStorage.getItem(LANG_KEY)||'en'}catch(e){}
if(!LOCALES[curLang]) curLang='en';
const i18n=i18next.createInstance();
const resources={};Object.keys(LOCALES).forEach(k=>resources[k]={translation:LOCALES[k]});
i18n.init({lng:curLang,fallbackLng:'en',resources,interpolation:{escapeValue:false},initImmediate:false});
const t=(key,opts)=>i18n.t(key,opts);
function setLang(l){
  if(!LOCALES[l]) return;curLang=l;
  try{localStorage.setItem(LANG_KEY,l)}catch(e){}
  i18n.changeLanguage(l);
  const sc=document.getElementById('screen');if(sc) sc.setAttribute('lang',l);
  const ds=document.getElementById('deskLang');if(ds) ds.value=l;
}
function langSelect(id){return `<select class="psel" id="${id}" aria-label="${t('prof.lang')}">${LANGS.map(([c,n])=>`<option value="${c}" ${c===curLang?'selected':''}>${n}</option>`).join('')}</select>`}
const LV=new Proxy({},{get:(o,k)=>t('level.'+String(k))});

/* ---------- demo data (fictional brands and numbers) ---------- */
const SAMPLE_CSV='number,label,note\n071 555 4402,scam,Fake loan offer calls\n+27 63 555 9013,scam,Fake SARS refund SMS\n083 555 6621,spam,Insurance sales calls\n+27 82 555 0143,trusted,Mom';

/* ---------- accounts (simulated server and phone checks) ---------- */
const DEMO_NUM='+27725550111';
const SEED_ACCOUNTS=[
  {num:DEMO_NUM,first:'Naledi',last:'Dlamini',email:'naledi.d@example.com',created:'2025-03-14',nameChanges:2,reports:7},
  {num:'+27825550143',first:'Nomsa',last:'Dlamini',email:'',created:'2024-11-02',nameChanges:2,reports:1},
  {num:'+27735550198',first:'Thabo',last:'Dlamini',email:'',created:'2025-06-20',nameChanges:2,reports:0}
];
const SIM_SWAPPED=['+27715550666'];
const PROTECTED=/\b(bank|fraud|police|saps|sars|government|gov|official|support|help ?desk|security|admin|triguard|ubuntu|swiftparcel|karoo|vodacom|mtn|cell ?c|telkom|municipality|court|sheriff|lawyer|attorney)\b/i;
const MAX_PER_PHONE=2;

/* ---------- state ---------- */
const state={screen:'home',numTab:'upload',userList:[],trusted:SEED_TRUSTED.map(t=>({...t})),pending:null,analyzing:'',
  community:JSON.parse(JSON.stringify(SEED_COMMUNITY)),channels:{call:true,video:true,sms:true,email:true},
  events:[],last:null,uploadMsg:'',checkRes:null,bulkRes:null,unseen:{},
  accounts:SEED_ACCOUNTS.map(a=>({...a})),session:null,deviceCount:0,auth:{step:'welcome'},protLog:[],flags:{bot:false,newDevice:false},editName:false,profErr:'',delAsk:false,
  ...freshFeatureState()};
// Protection features. The safe word and guardian choice stay on this phone.
function freshFeatureState(){return {safeWord:'',safeWordEdit:false,guardian:null,guardianOn:false,simAlerts:true,waves:[],feedback:[],emergency:null,
  breaches:null,breachBusy:false,linkRes:null,acctRes:null,imgPending:null,botMsgs:[],botBusy:false}}
const KEY='triguard-sim-v1';
function save(){try{localStorage.setItem(KEY,JSON.stringify({userList:state.userList,trusted:state.trusted,community:state.community,channels:state.channels,accounts:state.accounts,session:state.session,deviceCount:state.deviceCount,
  safeWord:state.safeWord,guardian:state.guardian,guardianOn:state.guardianOn,simAlerts:state.simAlerts,emergency:state.emergency}))}catch(e){}}
function load(){try{const d=JSON.parse(localStorage.getItem(KEY)||'null');if(d){Object.assign(state,{userList:d.userList||[],trusted:d.trusted||state.trusted,community:d.community||state.community,channels:d.channels||state.channels,accounts:d.accounts||state.accounts,session:d.session||null,deviceCount:d.deviceCount||0,
  safeWord:d.safeWord||'',guardian:d.guardian||null,guardianOn:!!d.guardianOn,simAlerts:d.simAlerts!==false,emergency:d.emergency||null})}}catch(e){}}

/* ---------- detection: the engine reads the user's lists through these lookups ---------- */
const engineCtx={findTrusted:n=>state.trusted.find(x=>x.num===n),findListed:n=>state.userList.find(u=>u.num===n),findCommunity:n=>state.community[n],get waves(){return state.waves}};
// Live calls are scored on the phone as each line arrives; everything else goes through the detector service.
const analyze=ev=>analyzeEvent(ev,engineCtx);

/* ---------- TriGuard AI explanations (simulated, built from the engine's signals) ---------- */
function voiceEvidence(sc){
  const l=[`Pitch stays unnaturally steady, with about ${Math.round(25+sc*30)}% less natural variation than real speech.`,
    'No breathing sounds between sentences. Real people breathe; cloned voices often don’t.',
    'A faint metallic buzz on long vowels, a pattern voice-cloning tools leave behind.',
    'Background noise switches on and off between words, as if the audio was stitched together.'];
  return sc>=.7?l:l.slice(0,2);
}
function faceEvidence(sc,lip){
  const l=[`Blinking is irregular: ${sc>=.7?3:6} blinks in 20 seconds, where people usually blink 6 to 10 times.`,
    'The edges of the face blur and shimmer when the head moves.',
    'Light on the face doesn’t match the light in the room behind them.'];
  if(lip) l.push('Lip movements are about 200 ms out of step with the voice.');
  return sc>=.7?l:l.slice(0,2);
}
const DETAIL={
  scamlist:()=>'You or someone using your phone added this number to your scam list, so TriGuard treats every contact from it as dangerous.',
  spamlist:()=>'You marked this number as spam. It may be sales calls rather than a scam, but be careful.',
  community:(ev,r)=>`${r.comm.reports} separate TriGuard users reported this number${r.reportsFrom?`, mostly from ${r.reportsFrom}`:''}. Many independent reports in a short time is one of the strongest signs of a scam campaign.`,
  communityLow:()=>'A small number of users reported this number. That’s not enough to be sure, so it only adds a little to the risk.',
  intl:(ev,r)=>`The number comes from ${r.origin.place}. Unexpected international calls are often used for scams, especially if you don’t know anyone there.`,
  voip:()=>'087 numbers run over the internet, so anyone can get one in minutes and use it from anywhere. That makes them hard to trace.',
  wangiri:()=>'The phone rang once and stopped. The goal is to make you curious enough to call back, and the call back is charged at a high premium rate.',
  bankImp:()=>'The caller claims to be from a bank, but the number isn’t your bank’s official line saved in TriGuard. Scammers pretend to be banks because people trust them and act fast when told their money is at risk.',
  knownImp:()=>'The message says it’s someone you know on a “new number”. This is the most common family scam in South Africa: the “new number” story explains why you don’t recognise it.',
  urgency:()=>'Words like “urgent”, “now” or “today” are there to stop you from thinking or checking. Real emergencies can wait the two minutes it takes to call back.',
  money:()=>'It asks you to send or pay money. Combined with the other signs, that’s what the scam is after.',
  secret:()=>'Asking you to keep it secret stops you from talking to someone who might spot the scam. Real family and real bosses don’t do this.',
  otp:()=>'An OTP lets someone approve a payment or log into your banking app as you. Your bank already knows the code it sent, so it never needs you to read it back.',
  threat:()=>'Threats like a blocked account or arrest are meant to scare you into acting before you think.',
  prize:()=>'You can’t win a draw you never entered. Fake prizes are used to collect fees or personal details.',
  detailsReq:()=>'Real companies don’t ask you to confirm your details through a link in a message. Fake pages collect your ID number, banking login or card details.',
  bankchange:()=>'Changing the bank account for an invoice is the main trick in business email scams. Once you pay into the new account, the money is usually gone.',
  shortlink:()=>'Shortened links hide the real website address, so you can’t see where you’ll end up before you tap.',
  lookalike:()=>'The link uses the company’s name, but the real website address is different. Fake sites copy the look of the real one to steal your login or card details.',
  http:()=>'The link isn’t secure (http, not https). Real banks and companies don’t use these for payments or logins.',
  senderName:()=>'Anyone can type any display name on an email. The real address it came from doesn’t belong to the company it claims to be.',
  replyTo:()=>'If you press Reply, your answer goes to a different address than the sender. Scammers do this so the real company never sees your reply.',
  auth:()=>'Email services run checks (SPF, DKIM and DMARC) to confirm an email really came from the domain it shows. Failing them means it may be forged.',
  attach:()=>'This kind of file can open a fake login page or install harmful software. Real invoices are normally PDF files.',
  voiceHi:()=>'TriGuard’s voice model compared the audio with patterns from real and AI-generated speech. This voice matches AI-generated speech closely. What it noticed:',
  voiceMid:()=>'The voice shows some patterns of AI-generated speech, but not enough to be sure. A bad network can cause some of these too. What it noticed:',
  faceHi:()=>'TriGuard’s face model checked the video frame by frame. It found several signs that the face is generated or swapped by AI. What it noticed:',
  faceMid:()=>'The video shows a few signs of manipulation, but a poor connection can cause some of these too. What it noticed:',
  lipsync:()=>'The mouth doesn’t move in time with the words. This happens when a fake face is laid over someone else’s voice.',
  policeImp:()=>'Scammers pretend to be police because people panic when they hear “warrant” or “arrest”. Real police don’t phone you to collect fines, and never ask for payment by eWallet or voucher.',
  easymoney:()=>'Earning a lot for very little work, like liking videos, is the hook of task and job scams. You’re asked to pay a fee first, and the “job” never pays.',
  pop:()=>'Fake proof-of-payment slips and SMSes are the most common marketplace scam. The “buyer” sends a convincing slip and rushes you to hand over the item. Bank transfers can take time, and slips are easy to fake: only money showing in your own banking app counts.',
  wave:()=>'Many TriGuard users reported messages with the same wording this week. Scammers send one script to thousands of people at once.',
  blocklisted:()=>'Threat-intelligence lists already know this website as a scam or phishing site.',
  newDomain:()=>'Real banks and government sites have had their web addresses for years. Scam sites are usually registered days before the messages go out, and disappear soon after.',
  typosquat:()=>'Scammers register web addresses that differ from the real one by a single letter, hoping you won’t notice.',
  punycode:()=>'Some letters from other alphabets look identical to English ones. Scammers use them to build addresses that look exactly like a real bank’s.',
  simSwap:()=>'Your mobile network confirmed this SIM was changed recently. Criminals swap SIMs to take over someone’s number, then use it to call family or receive bank codes.',
  verifyNo:(ev)=>`TriGuard asked ${ev.verification.contact} directly, in their own app on their own phone. They said they are not the one contacting you. A scammer can copy a voice or a number, but not their logged-in app.`,
  safeWordFail:()=>'Your family agreed a safe word in advance. A real family member knows it; a scammer with a cloned voice doesn’t.',
  livenessFail:()=>'Deepfake video tools struggle when the head turns sideways or something passes in front of the face. This face broke up exactly then.',
  accountMismatch:()=>'TriGuard checked the account with the bank’s account verification service. It isn’t in the supplier’s name, so the money would go to someone else.',
  imageEdited:()=>'Edited slips often have numbers in a slightly different font, size or position, or signs the image was saved again after changes.',
  trustedSpoof:(ev,r)=>`The call comes from ${r.trusted}’s real saved number, which is why it looked fine before you answered. A saved number only proves which SIM is calling, not who is speaking. If the phone was stolen, or the SIM was swapped, a scammer can call from the real number and use a cloned voice copied from voice notes or videos. When the number looks right but the voice is AI, trust the voice check.`
};
function aiSummary(ev,r){
  let who=senderName(ev);if(/^(Unknown|Uploaded by you)/.test(who)) who='someone you know';
  const callWord=ev.channel==='audio'?'voice note':ev.channel==='videoFile'?'video':'call';
  const m={
    voiceClone:`The voice in this ${callWord} sounds like ${who}, but it shows clear signs of being made by AI. Scammers can copy a voice from a few seconds of a voice note or video, then use it to ask for money.`,
    deepfakeVideo:`The person in this ${ev.channel==='videoFile'?'video':'video call'} looks like ${who}, but the video shows signs that the face was made or altered by AI. Scammers use fake video calls to make payment requests feel real.`,
    otp:'The caller is trying to get your one-time PIN. With that code they can approve payments or take over your banking app.',
    invoice:'This email is trying to redirect a payment to a scammer’s bank account by pretending to be a supplier.',
    family:'Someone is pretending to be a family member on a new number so they can ask you for money.',
    bank:'Someone is pretending to be your bank to get money or banking details from you.',
    wangiri:'This is a one-ring scam. They want you to call back so they earn money from a premium-rate call.',
    phishing:'This message wants you to open a fake website or file so it can steal your login or card details.',
    prize:'This is a fake prize message. The “prize” is bait to get a fee or your personal details.',
    reported:'This number has been linked to scams before.',
    police:'Someone is pretending to be a police officer to scare you into paying a “fine”.',
    job:'This is a fake job offer. The goal is to get a “registration fee” from you.',
    pop:'Someone says they’ve paid you and shows a slip. Until the money is in your own banking app, treat the slip as possibly fake.',
    impostor:`Someone is pretending to be ${who}. The real ${who} has told TriGuard it isn’t them.`,
    simSwap:'This number’s SIM was swapped recently, so the person using it may not be its owner.',
    newNumber:`This looks like ${who==='Unknown caller'?'someone you know':who} letting you know about a new number. The voice sounds natural and they aren’t asking for money or codes, so I didn’t find scam signs. I still can’t confirm who it is from the number alone.`,
    general:'I didn’t find clear warning signs. That doesn’t prove it’s genuine, so still verify before you send money or share details.'
  };
  return m[r.type]||m.general;
}
function aiMeaning(r){
  if(r.type==='newNumber') return 'It’s probably fine, but confirm it’s really them before you save the number. Scammers use the same “new number” line, so if this number ever asks for money, check first.';
  if(r.level==='high') return 'Treat this as a scam until you have checked it yourself. Don’t send money, share codes or open links from it.';
  if(r.level==='medium') return 'Some things don’t add up. It might be real, but check before you act on anything it asks.';
  return 'Nothing stood out, but scammers keep improving. If it asks for money or codes, verify first.';
}
function aiBubbles(ev,r){
  const out=[];
  const rc=reach(ev,r);
  out.push(`<p><b>${LV[r.level]} · ${r.score}/100.</b> ${esc(aiSummary(ev,r))}</p>`+(r.lang&&r.lang.code!=='en'?`<p class="ai-reach">${ic('globe',15)}<span><b>Language:</b> this is in ${esc(langLabel(r.lang))}. Scammers often use people’s home language to sound local and trustworthy. I checked the words in ${esc(r.lang.name)} for scam signs.${ev.en?` In English it says: “${esc(ev.en)}”`:''}</span></p>`:'')+(rc?`<p class="ai-reach">${ic('people',15)}<span><b>You’re not the only one:</b> ${nfmt(rc.people)} TriGuard users got ${esc(rc.what)} in the last 7 days, and ${nfmt(rc.reports)} reported it. Scammers send the same scam to many people at once.</span></p>`:''));
  if(r.rule) out.push(`<p class="ai-rule">${ic('alert',15)}<span><b>Why it’s ${r.level==='high'?'High':'Medium'} straight away:</b> ${esc(r.rule)}</span></p>`);
  const sigs=r.signals.slice(0,6);
  if(sigs.length){
    out.push(`<p><b>What I found${sigs.length>1?`, most serious first`:''}:</b></p>`+sigs.map(s=>{
      let ev2='';
      if(s.id==='voiceHi'||s.id==='voiceMid') ev2=`<ul class="ai-ev">${voiceEvidence(ev.voiceScore).map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`;
      if(s.id==='faceHi'||s.id==='faceMid') ev2=`<ul class="ai-ev">${faceEvidence(ev.faceScore,ev.lipsync).map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`;
      return `<div class="ai-sig"><span class="ai-n mono">+${s.pts}</span><div><b>${esc(s.text)}</b><p>${esc(DETAIL[s.id]?DETAIL[s.id](ev,r,s):'')}</p>${ev2}</div></div>`;
    }).join(''));
  }
  out.push(`<p><b>What this means for you:</b> ${esc(aiMeaning(r))}</p><p><b>What to do now:</b></p><ol class="steps">${r.tips.map(x=>`<li>${esc(x)}</li>`).join('')}</ol>`);
  return out;
}
const FOLLOW={
  false:{q:'Could this be a false alarm?',a:r=>r.signals.some(s=>s.kind==='deepfake')
    ?'It’s possible. Voice and face detectors aren’t perfect, and a bad connection or a phone filter can look like AI. That’s exactly why TriGuard never relies on the score alone. Hang up and call the person on the number saved in your phone. If it was really them, they’ll understand.'
    :'It’s possible, but several warning signs together make a scam far more likely. You lose nothing by checking: contact the person or company through a number or app you already trust.'},
  paid:{q:'What if I already sent money or a code?',a:()=>'Act fast. Call your bank’s official number now and ask them to stop the payment and block your card or app. Change your banking password. Then report it to SAPS and keep screenshots of the messages and the number. The sooner you call, the better the chance of stopping the money.'},
  how:{q:'How do scammers do this?',a:r=>r.type==='voiceClone'?'They take a short clip of someone’s voice from a voice note, a video or a call, and feed it into a cloning tool. In minutes it can say anything in that voice. Then they call family or colleagues with an urgent story so there’s no time to check.'
    :r.type==='deepfakeVideo'?'They use photos and videos of a real person to build a fake face that moves when the scammer moves. Combined with a cloned voice, it can look convincing on a small screen, especially on a short, “busy” call.'
    :'They pick a story people trust (a bank, family, a delivery or a supplier), add urgency so you don’t stop to think, and ask for money, codes or a click. Changing the number or email address they use makes them hard to block.'},
  stolen:{q:'It’s their real number. How can it be fake?',a:()=>'A saved number only shows which phone or SIM is calling, not who is talking. If the phone was stolen, the SIM was swapped, or the number was spoofed, a scammer can call from it. With a cloned voice copied from voice notes, it can sound exactly like them. Contact them another way: call someone they’re with, message them on another app, or ask a question only they would know.'},
  verify:{q:'How do I check if it’s really them?',a:()=>'Hang up, then call them yourself on the number already saved in your phone, not one from the call or message. You can also ask a question only the real person would know, or agree a family safe word in advance.'}
};

/* ---------- helpers ---------- */
const nowT=()=>new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',hour12:false});
let uid=1;
function senderName(ev){
  if(ev.channel==='email'||ev.msgType==='email') return ev.fromName||ev.fromAddr||'Unknown sender';
  const n=normalize(ev.from);const tr=n&&state.trusted.find(x=>x.num===n);
  if(tr) return tr.name;
  if(ev.uploaded) return n?'Unknown sender':'Uploaded by you';
  return ev.callerName||ev.fromName||(ev.channel==='sms'?'Unknown number':'Unknown caller');
}
function senderSub(ev){
  if(ev.uploaded){const n=normalize(ev.from);return [ev.fileName,ev.fromAddr||(n?fmt(n):'')].filter(Boolean).join(' · ')}
  return ev.channel==='email'?ev.fromAddr:fmt(normalize(ev.from)||ev.from);
}
function initials(s){const w=String(s).replace(/\(.*?\)/g,'').trim().split(/\s+/).filter(Boolean);return w.length?(w[0][0]+(w[1]?w[1][0]:'')).toUpperCase():'?'}
function logEvent(ev,res,status,time,example){
  const item={id:uid++,ev,res,status,time:time||nowT(),at:Date.now(),example:!!example};
  state.events.unshift(item);
  if(!example){state.last=item;state.unseen[ev.channel==='video'?'call':ev.channel]=(state.unseen[ev.channel==='video'?'call':ev.channel]||0)+1;}
  return item;
}
function placeLine(o){return o?(o.hidden?'Location not shown':[o.place,o.area].filter(Boolean).join(', ')):''}
function locCard(r){
  if(!r||!r.origin) return '';
  const o=r.origin,risky=r.level!=='low';
  const rows=o.country==='South Africa'?[['City',o.hidden?'Not shown':o.city],['Province',o.hidden?'Not shown':o.province]]:[['City',o.city||'—'],['Country',o.country]];
  return `<div class="sh-h">${risky?t('card.whereScam'):t('card.where')}</div>
  <div class="loc ${o.hidden?'':r.level}"><span class="loc-pin">${ic('pin',22)}</span>
    <span style="min-width:0">
      <span class="loc-grid">${rows.map(([k,v])=>`<span class="loc-k2">${k}</span><b${o.hidden?' class="muted"':''}>${esc(v)}</b>`).join('')}</span>
      <span class="loc-k"><span class="chip off nodot" style="padding:1px 7px">${esc(o.kind)}</span><span class="chip ${o.hidden?'off':'low'} nodot" style="padding:1px 7px">${esc(o.method)}</span></span>
      ${r.reportsFrom?`<span class="loc-r">Most reports came from TriGuard users in ${esc(r.reportsFrom)}. This is where the people who reported it live, not the caller.</span>`:''}
      ${o.note?`<span class="loc-n">${esc(o.note)}</span>`:''}</span></div>
  <p class="loc-f">${ic('shield',12)} TriGuard never tracks your location or a caller’s location. Scammers can also fake caller ID. Report scams to your bank and SAPS, who can trace numbers lawfully.</p>`;
}
function chip(res){return res?`<span class="chip ${res.level}">${LV[res.level]}</span>`:`<span class="chip off">${t('level.off')}</span>`}
let toastT;
function toast(msg){const el=$('#toast');el.textContent=msg;el.classList.add('show');clearTimeout(toastT);toastT=setTimeout(()=>el.classList.remove('show'),2600)}

/* ---------- reach: how many other users got the same scam (simulated community stats) ---------- */
function reach(ev,res){
  if(!ev||!res||res.level!=='high') return null;
  const key=(res.num||ev.fromAddr||ev.fileName||'')+'|'+String((ev.transcript||[]).join(' ')||ev.text||'').slice(0,60)+'|'+res.type;
  const h=hashStr(key);
  const reported=res.comm&&(res.comm.weighted!=null?res.comm.weighted:res.comm.reports)>=3;
  const exact=reported||ev.channel==='sms'||ev.channel==='email'||ev.channel==='message';
  const people=reported?res.comm.reports*55+(h%240):exact?180+(h%2300):35+(h%620);
  const nouns={call:'call',video:'video call',sms:'SMS',email:'email',audio:'voice note',videoFile:'video',message:'message'};
  const TN={voiceClone:'cloned-voice',deepfakeVideo:'deepfake',otp:'OTP-theft',bank:'fake-bank',family:'“new number”',police:'fake-police',job:'fake-job',invoice:'fake-invoice',phishing:'phishing',wangiri:'one-ring',prize:'fake-prize',pop:'fake-payment',impostor:'impostor',simSwap:'SIM-swap'};
  const what=exact?(reported&&(ev.channel==='call'||ev.channel==='video')?'calls from this number':`this same ${ev.msgType==='email'?'email':nouns[ev.channel]}`):`a similar ${TN[res.type]||'scam'} ${nouns[ev.channel]}`;
  return {people,what,days:1+(h%6),reports:reported?res.comm.reports:Math.max(2,Math.round(people*0.05))};
}
const nfmt=n=>n.toLocaleString('en-ZA');
function reachHTML(ev,res){
  const r=reach(ev,res);if(!r) return '';
  return `<div class="reach">${ic('people',20)}<span><b>${nfmt(r.people)} people</b> also got ${esc(r.what)} in the last 7 days.<small>${nfmt(r.reports)} reported it · first seen ${r.days} day${r.days>1?'s':''} ago · community data, simulated</small></span></div>`;
}

/* ---------- phone rendering ---------- */
function renderTabs(){
  const tabs=[['home','home',t('nav.home')],['call','call',t('nav.calls')],['sms','sms',t('nav.sms')],['email','email',t('nav.email')],['numbers','upload',t('nav.check')]];
  $('#tabbar').innerHTML=tabs.map(([k,i,l])=>{const u=state.unseen[k];return `<button class="tab ${state.screen===k?'on':''}" data-act="nav" data-k="${k}">${ic(i,22)}${l}${u&&state.screen!==k?`<span class="dot">${u}</span>`:''}</button>`}).join('');
}
function rowHTML(it){
  const ev=it.ev,ch=CH[ev.channel];
  const lv=it.res?it.res.level:'';
  let line;
  if(ev.uploaded) line=(ev.fileName||'Uploaded')+(it.res&&it.res.level!=='low'?' · '+it.res.label:'');
  else if(ev.channel==='email') line=ev.subject;
  else if(ev.channel==='sms') line=ev.text;
  else line=(it.res&&it.res.origin&&!it.res.origin.hidden&&it.res.level!=='low'?it.res.origin.place+' · ':'')+(it.status==='missed'?'Missed ':it.status==='declined'?'Declined ':it.status==='blocked'?'Blocked ':'')+ch.label.toLowerCase()+(it.res&&it.res.level!=='low'?' · '+it.res.label:'');
  return `<button class="row" data-act="open" data-id="${it.id}">
    <span class="ico ${lv}">${ic(ch.icon,18)}</span>
    <span style="min-width:0"><span class="t" style="display:block">${esc(senderName(ev))}${it.example?'<span class="ex">Example</span>':''}</span><span class="s" style="display:block">${esc(line)}</span></span>
    <span class="rt">${chip(it.res)}<span class="mono">${it.time}</span></span></button>`;
}
function renderHome(){
  const flagged=state.events.filter(e=>e.res&&e.res.level!=='low').length;
  const listed=state.userList.length+state.trusted.length;
  const on=Object.values(state.channels).filter(Boolean).length;
  const chans=LIVE_CH.map(k=>`<button class="chan ${state.channels[k]?'':'off'}" data-act="toggle" data-k="${k}" aria-pressed="${state.channels[k]}">${ic(CH[k].icon,14)}${t('ch.'+k)}</button>`).join('');
  const a=acct();
  return `<div class="apphead"><span class="logo">${ic('shield',22)}TriGuard</span>${a?`<button class="me" data-act="nav" data-k="profile" aria-label="Your profile">${esc(initials(a.first+' '+a.last))}</button>`:''}</div>
  <div class="guard">
    <div class="guard-top"><span class="pulse">${ic('shield',24)}</span><span><b>${on?t('home.on'):t('home.off')}</b><span class="s">${t('home.sub',{on})}</span></span></div>
    <div class="chans">${chans}</div>
    ${state.guardian&&state.guardianOn?`<span class="guard-line">${ic('people',14)} Guardian alerts go to ${esc(state.guardian.name)}</span>`:''}
  </div>
  <button class="sos" data-act="emergency">${ic('siren',20)}<span><b>I’ve been scammed</b><small>${state.emergency?'Continue your recovery checklist':'Step-by-step help, right now'}</small></span></button>
  ${wavesCard()}
  <div class="stats">
    <div class="stat"><b>${flagged}</b><span>${t('home.flagged')}</span></div>
    <div class="stat"><b>${listed}</b><span>${t('home.listed')}</span></div>
    <div class="stat"><b>${state.events.length}</b><span>${t('home.checked')}</span></div>
  </div>
  <div class="sec-t"><span>${t('home.recent')}</span></div>
  ${state.events.length?state.events.slice(0,6).map(rowHTML).join(''):`<p class="emptyp">${t('home.empty')}</p>`}
  <div class="tip"><b>${t('home.tipTitle')}</b>${t('home.tip')}</div>`;
}
function renderList(ch){
  const items=state.events.filter(e=>ch==='call'?(e.ev.channel==='call'||e.ev.channel==='video'):e.ev.channel===ch);
  const title={call:t('nav.calls'),sms:t('nav.sms'),email:t('nav.email')}[ch];
  const sub={call:'Voice and video calls, checked before you answer',sms:'Every SMS is checked when it arrives',email:'Connected inbox (simulated)'}[ch];
  return `<div class="apphead"><div><h3>${title}</h3><div class="sub">${sub}</div></div></div>
  ${items.length?items.map(rowHTML).join(''):`<p class="emptyp">No ${title.toLowerCase()} yet. Send one from the demo desk.</p>`}`;
}
function langBlock(ev,r){
  if(!r||!r.lang) return '';
  return `<div class="langdet">${ic('globe',16)}<span><b>Language detected: ${esc(langLabel(r.lang))}</b><small>${r.lang.code==='en'&&!r.lang.mixed?'Checked for scam signs in English.':`TriGuard checked the words for scam signs in ${esc(r.lang.name)}${r.lang.mixed?' and English':''}. Simulated.`}</small>${ev.en&&r.lang.code!=='en'?`<span class="langdet-en"><b>In English:</b> ${esc(ev.en)}</span>`:''}</span></div>`;
}
function uploadContent(ev){
  const media=ev.mediaUrl?(ev.channel==='audio'?`<audio controls src="${ev.mediaUrl}"></audio>`:ev.channel==='videoFile'?`<video controls playsinline src="${ev.mediaUrl}"></video>`:ev.channel==='image'?`<img class="up-img" src="${ev.mediaUrl}" alt="The uploaded image">`:''):'';
  if(ev.channel==='image') return `<div class="msg"><div class="subj">${ic('image',14)} ${esc(ev.fileName||'Image')}</div>${media}
    ${ev.qrUrl?`<div class="qr-line">${ic('link',14)} QR code links to <b>${esc(ev.qrUrl)}</b></div>`:''}
    ${ev.text?`<div class="subj" style="margin-top:6px">${ev.textAuto?'Text in the image (sample)':'Text in the image'}</div>${esc(ev.text)}`:'<div style="margin-top:6px;color:var(--ph-muted)">No text added. In the full app, TriGuard reads the text in the image for you.</div>'}</div>`;
  const label=ev.channel==='message'?'':`<div class="subj" style="margin-top:6px">${ev.textAuto?'What it says (sample transcript)':'What it says'}</div>`;
  return `<div class="msg"><div class="subj">${ic(CH[ev.channel].icon,14)} ${esc(ev.fileName||'Uploaded')}</div>${media}${ev.text?label+esc(ev.text):(ev.channel!=='message'?'<div style="margin-top:6px;color:var(--ph-muted)">No words added. In the full app, TriGuard turns speech into text and checks it too.</div>':'')}</div>`;
}
const SAMPLES={
  'clone-note':{channel:'audio',fileName:'voice-note-new-number.opus',from:'068 555 9921',text:"Mama it's me, my phone fell in the water so I'm using a friend's number. Please send R1,500 for a taxi home right now, I'll explain later.",voiceScore:.9},
  'real-note':{channel:'audio',fileName:'voice-note-thabo.opus',from:'073 555 0198',text:"Hey, I'm running late. See you at seven for dinner.",voiceScore:.07},
  'fake-video':{channel:'videoFile',fileName:'ceo-message.mp4',text:'Please process the supplier payment today and keep this confidential.',faceScore:.86,lipsync:true},
  'real-video':{channel:'videoFile',fileName:'birthday-greeting.mp4',text:'Happy birthday! We miss you, see you in December.',faceScore:.06},
  'pop-slip':{channel:'image',fileName:'proof-of-payment.jpg',from:'064 555 1234',text:'Ubuntu Bank · Payment notification · R4,500.00 paid to N Dlamini · Ref: Fridge · Status: Successful',editScore:.86},
  'qr-poster':{channel:'image',fileName:'poster-photo.jpg',text:'SASSA SRD grant: scan to apply for your R370 payment',qrUrl:'http://sassa-srd-update.co.za/apply'}
};
function clearPending(){if(state.pending&&state.pending.url){try{URL.revokeObjectURL(state.pending.url)}catch(e){}}state.pending=null}
async function runUpload(ev,media){
  state.analyzing=ev.channel==='audio'?'Checking the voice for AI cloning and the words for scam signs…':ev.channel==='videoFile'?'Checking the face frame by frame for deepfake signs…':ev.channel==='image'?'Checking the image for editing and any links…':'Checking the message for scam signs…';
  renderApp();
  let res;
  try{
    if(media){
      const {mediaUrl,...meta}=ev;
      const out=media.image?await detector.checkImage({file:media.file,name:media.name,size:media.size,meta},engineCtx)
        :await detector.checkMedia({kind:ev.channel,file:media.file,name:media.name,size:media.size,meta},engineCtx);
      Object.assign(ev,out.scores);res=out.result;
    } else res=await detector.checkEvent(ev,engineCtx);
  }catch(e){state.analyzing='';renderApp();toast(e.message);return}
  state.analyzing='';
  const it={id:uid++,ev,res,status:'checked',time:nowT()};
  state.events.unshift(it);state.last=it;
  renderAll();openSheet(it.id);
}
function runSample(k){const e={...SAMPLES[k],uploaded:true,textAuto:true};state.pending=null;runUpload(e)}
function checkFile(){
  const Pd=state.pending;if(!Pd) return;
  const from=$('#pFrom').value.trim(),text=$('#pText').value.trim();
  const ev={channel:Pd.kind,uploaded:true,fileName:Pd.name,mediaUrl:Pd.url,from:normalize(from)?from:undefined,text};
  state.pending=null;runUpload(ev,{file:Pd.file,name:Pd.name,size:Pd.size});
}
function checkMessage(){
  const type=$('#upType').value,from=$('#upFrom').value.trim(),text=$('#upText').value.trim();
  if(!text){state.msgErr='Paste the message you want to check.';renderApp();return}
  state.msgErr='';
  const ev={channel:'message',uploaded:true,msgType:type,text,fileName:type==='email'?'Pasted email':type==='whatsapp'?'Pasted WhatsApp message':'Pasted SMS'};
  if(type==='email'){ev.fromAddr=from.includes('@')?from:'';}else if(normalize(from)) ev.from=from;
  runUpload(ev);
}
function bindLang(){
  ['langWelcome','langProfile'].forEach(id=>{const el=$('#'+id);if(el) el.addEventListener('change',()=>{setLang(el.value);renderAll();toast(LANGS.find(x=>x[0]===el.value)[1])})});
}
function bindUploads(){
  [['upAudio','audio'],['upVideo','videoFile']].forEach(([id,kind])=>{const el=$('#'+id);if(!el) return;
    el.addEventListener('change',()=>{const f=el.files[0];if(!f) return;let url='';try{url=URL.createObjectURL(f)}catch(e){}
      state.pending={kind,name:f.name,size:f.size,url,file:f};renderApp();});});
}
function pendingBox(kind){
  const Pd=state.pending;if(!Pd||Pd.kind!==kind) return '';
  return `<div class="pending"><div class="pending-h">${ic(kind==='audio'?'mic':'video',16)}<b>${esc(Pd.name)}</b><span class="fine">${(Pd.size/1024/1024).toFixed(1)} MB</span></div>
    ${Pd.url?(kind==='audio'?`<audio controls src="${Pd.url}"></audio>`:`<video controls playsinline src="${Pd.url}"></video>`):''}
    <input class="pin" id="pFrom" placeholder="Who sent it? Number (optional)" inputmode="tel">
    <textarea class="pta" id="pText" placeholder="What does it say? (optional) In the full app this is transcribed for you."></textarea>
    <div class="prow"><button class="pbtn" data-act="check-file">Check ${kind==='audio'?'voice note':'video'}</button><button class="pbtn alt" data-act="clear-file" style="flex:0 0 auto">Remove</button></div>
    <p class="fine">Demo: the AI score is simulated. File names with “fake” or “clone” score high, and “real” scores low.</p></div>`;
}
function listRows(arr,kind){
  if(!arr.length) return '<p class="emptyp" style="padding:6px 0">None yet.</p>';
  return arr.map(x=>`<div class="nrow"><span style="min-width:0"><span class="n" style="display:block">${fmt(x.num)}</span><span class="note" style="display:block">${esc(kind==='trusted'?x.name:(x.note||'No note'))}</span></span>
    <span class="chip ${kind==='scam'?'high':kind==='spam'?'medium':'low'}">${kind==='trusted'?'Trusted':cap(kind)}</span>
    <button class="x" data-act="remove" data-kind="${kind}" data-num="${x.num}" aria-label="Remove ${fmt(x.num)}">×</button></div>`).join('');
}
function renderNumbers(){
  const tab=state.numTab;
  const seg=`<div class="seg seg3"><button class="${tab==='upload'?'on':''}" data-act="seg" data-k="upload">Upload</button><button class="${tab==='lists'?'on':''}" data-act="seg" data-k="lists">My numbers</button><button class="${tab==='check'?'on':''}" data-act="seg" data-k="check">Look up</button></div>`;
  const head=`<div class="apphead"><div><h3>${t('check.title')}</h3><div class="sub">${t('check.sub')}</div></div></div>${seg}`;
  if(tab==='upload'){
    const mine=state.events.filter(e=>e.ev.uploaded);
    return head+`${state.analyzing?`<div class="analyzing"><span class="spin"></span><span>${esc(state.analyzing)}</span></div>`:''}
    <div class="pbox"><h4 class="hx">${ic('mic',16)} Voice note or recording</h4><p>WhatsApp voice notes (OPUS), MP3, M4A, OGG or WAV. Checks the voice for AI cloning and the words for scam signs.</p>
      <label class="file" style="position:relative">${ic('upload',22)}<b>Choose an audio file</b><input type="file" id="upAudio" accept="audio/*,.opus,.ogg,.m4a,.mp3,.wav"></label>
      ${pendingBox('audio')}
      <div class="prow"><button class="pbtn alt" data-act="sample" data-k="clone-note">Sample: cloned voice note</button><button class="pbtn alt" data-act="sample" data-k="real-note">Sample: real voice note</button></div></div>
    <div class="pbox"><h4 class="hx">${ic('video',16)} Video clip</h4><p>MP4 or MOV, such as a video message or a screen recording of a video call. Checks the face for deepfake signs.</p>
      <label class="file" style="position:relative">${ic('upload',22)}<b>Choose a video file</b><input type="file" id="upVideo" accept="video/*,.mp4,.mov"></label>
      ${pendingBox('videoFile')}
      <div class="prow"><button class="pbtn alt" data-act="sample" data-k="fake-video">Sample: deepfake video</button><button class="pbtn alt" data-act="sample" data-k="real-video">Sample: real video</button></div></div>
    <div class="pbox"><h4 class="hx">${ic('image',16)} Screenshot, slip or QR code</h4><p>Proof-of-payment slips, WhatsApp screenshots and posters. QR codes are read on your phone and the link is checked before you open it.</p>
      <label class="file" style="position:relative">${ic('upload',22)}<b>Choose an image</b><input type="file" id="upImage" accept="image/*"></label>
      ${imagePendingBox()}
      <div class="prow"><button class="pbtn alt" data-act="sample" data-k="pop-slip">Sample: payment slip</button><button class="pbtn alt" data-act="sample" data-k="qr-poster">Sample: QR poster</button></div></div>
    <div class="pbox"><h4 class="hx">${ic('sms',16)} Message</h4><p>Paste an SMS, WhatsApp message or email you received.</p>
      <div class="prow"><select class="psel" id="upType" style="flex:1 1 30%"><option value="sms">SMS</option><option value="whatsapp">WhatsApp</option><option value="email">Email</option></select>
      <input class="pin" id="upFrom" placeholder="Sender (optional)" style="flex:1 1 55%"></div>
      <textarea class="pta" id="upText" style="font-family:var(--f-body);font-size:13px" placeholder="Paste the message here">${esc(state.sharedText||'Your SIM card will be blocked today. Confirm your RICA details at http://bit.ly/rica-za-update to keep your number.')}</textarea>
      ${state.sharedText?`<div class="auth-ok">${ic('shield',16)} Shared to TriGuard. Tap Check message.</div>`:''}
      ${state.msgErr?`<div class="auth-err">${esc(state.msgErr)}</div>`:''}
      <button class="pbtn" data-act="check-msg">Check message</button></div>
    <div class="sec-t"><span>Your checks</span></div>
    ${mine.length?mine.map(rowHTML).join(''):'<p class="emptyp">Nothing checked yet. Try a sample above.</p>'}`;
  }
  if(tab==='check'){
    const r=state.checkRes,L=state.linkRes,B=state.acctRes;
    return head+`<div class="pbox"><h4 class="hx">${ic('link',16)} Check a link or website</h4><p>Checks scam-site lists, how old the website is, and look-alike spellings of real brands, without opening it.</p>
      <div class="prow"><input class="pin mono" id="chkLink" value="http://sassa-srd-update.co.za/apply" aria-label="Link to check"><button class="pbtn" style="flex:0 0 auto" data-act="check-link">Check</button></div>
      ${L?(L.busy?`<div class="analyzing"><span class="spin"></span><span>Checking the website…</span></div>`:`<div class="result">${chip(L.res)}<span class="mono" style="font-size:12px;overflow-wrap:anywhere">${esc(L.url)}</span>
        ${L.res.signals.length?`<ul>${L.res.signals.map(s=>`<li>${esc(s.text)}</li>`).join('')}</ul>`:'<p>No warning signs found. Only open it if you were expecting it.</p>'}</div>`):''}</div>
    <div class="pbox"><h4 class="hx">${ic('bank',16)} Check a bank account before you pay</h4><p>Asks the bank whether the account is in the name you were given. Use it whenever someone sends new banking details.</p>
      <input class="pin" id="baName" value="Karoo Supplies (Pty) Ltd" aria-label="Account holder name">
      <div class="prow"><select class="psel" id="baBank" style="flex:1 1 40%" aria-label="Bank"><option>Ubuntu Bank</option><option>Baobab Bank</option><option>Protea Bank</option></select><input class="pin mono" id="baAcc" value="6200 441 8817" style="flex:1 1 50%" aria-label="Account number"></div>
      <button class="pbtn" data-act="check-acct">Verify account</button>
      ${B?(B.busy?`<div class="analyzing"><span class="spin"></span><span>Asking the bank…</span></div>`:acctResultHTML(B.r)):''}</div>
    <div class="pbox"><h4>Check one number</h4>
      <div class="prow"><input class="pin mono" id="chkOne" placeholder="e.g. 010 555 7720" value="010 555 7720"><button class="pbtn" style="flex:0 0 auto" data-act="check-one">Check</button></div>
      ${r?(r.err?`<p style="color:var(--r-high)">${esc(r.err)}</p>`:`<div class="result">${chip(r.res)}<span class="mono" style="font-size:12px">${fmt(r.num)}${r.res.trusted?' · '+esc(r.res.trusted):''}</span><span style="font-size:12px;color:var(--ph-muted);display:flex;gap:4px;align-items:center">${ic('pin',13)}${esc(placeLine(r.res.origin))} · ${esc(r.res.origin.kind)}</span>
        ${r.res.signals.length?`<ul>${r.res.signals.map(s=>`<li>${esc(s.text)}</li>`).join('')}</ul>`:`<p>No reports and not on your lists. Unknown numbers can still be scams, so verify before you pay.</p>`}
        ${r.res.level!=='low'?`<button class="linkbtn" data-act="review-num" data-num="${r.num}">Is this your number? Ask for a review</button>`:''}</div>`):''}</div>
    <div class="pbox"><h4>Bulk check</h4><p>Paste a list of numbers, one per line. Each one gets its own risk level.</p>
      <textarea class="pta" id="bulkIn">010 555 7720
087 555 3301
082 555 0143
+44 20 7946 0012
061 555 1234</textarea>
      <button class="pbtn" data-act="check-bulk">Check all</button>
      ${state.bulkRes?`<div class="bulk">${state.bulkRes.map(b=>`<div><span style="min-width:0"><span class="mono" style="display:block">${b.num?fmt(b.num):esc(b.raw)+' (invalid)'}</span>${b.res?`<span style="display:block;font-size:11px;color:var(--ph-muted)">${esc(placeLine(b.res.origin))}</span>`:''}</span>${b.res?chip(b.res):''}</div>`).join('')}</div>`:''}</div>`;
  }
  const scam=state.userList.filter(u=>u.label==='scam'),spam=state.userList.filter(u=>u.label==='spam');
  return head+`<div class="pbox"><h4>Upload numbers</h4>
    <p>CSV or TXT file. Use one number per line, or <span class="mono">number,label,note</span>. Labels are scam, spam or trusted. Calls and SMS from these numbers are flagged instantly.</p>
    <label class="file" style="position:relative">${ic('upload',22)}<b>Choose a file</b>.csv or .txt<input type="file" id="fileIn" accept=".csv,.txt,text/csv,text/plain"></label>
    <button class="pbtn alt" data-act="load-sample">Load sample list (4 numbers)</button>
    <textarea class="pta" id="pasteIn" placeholder="Or paste numbers here&#10;071 555 4402&#10;+27 63 555 9013"></textarea>
    <div class="prow"><select class="psel" id="pasteLab" style="flex:1 1 40%"><option value="scam">Add as scam</option><option value="spam">Add as spam</option><option value="trusted">Add as trusted</option></select><button class="pbtn" data-act="add-paste" style="flex:1 1 40%">Add numbers</button></div>
    ${state.uploadMsg?`<span class="okmsg">${esc(state.uploadMsg)}</span>`:''}
  </div>
  <div class="lst"><div class="lst-h"><span>Scam</span><span>${scam.length}</span></div>${listRows(scam,'scam')}
  <div class="lst-h"><span>Spam</span><span>${spam.length}</span></div>${listRows(spam,'spam')}
  <div class="lst-h"><span>Trusted (used for call-back)</span><span>${state.trusted.length}</span></div>${listRows(state.trusted,'trusted')}</div>`;
}
function renderApp(){
  const s=state.screen;
  $('#tabbar').hidden=!state.session;
  if(!state.session){$('#appbody').innerHTML=renderAuth();bindLang();return}
  $('#appbody').innerHTML=s==='home'?renderHome():s==='numbers'?renderNumbers():s==='profile'?renderProfile():renderList(s);
  renderTabs();
  bindUploads();
  bindImageUpload();
  bindLang();
  const f=$('#fileIn');
  if(f) f.addEventListener('change',()=>{const file=f.files[0];if(!file) return;const r=new FileReader();
    r.onload=()=>{const out=importText(String(r.result),'scam');state.uploadMsg=`${file.name}: ${out.added} added, ${out.dup} already listed, ${out.bad} invalid.`;renderApp();toast(`${out.added} numbers uploaded`)};
    r.onerror=()=>{state.uploadMsg='Could not read that file. Try a .csv or .txt file.';renderApp()};r.readAsText(file)});
}

/* ---------- engine panel ---------- */
function renderEngine(){
  const it=state.last,el=$('#engine');
  if(!it){el.innerHTML='<p class="empty">Run a scenario to see the signals the engine found.</p>';return}
  const r=it.res;
  if(!r){el.innerHTML=`<p class="empty">${CH[it.ev.channel].label} protection is switched off on the phone, so this event was not checked.</p>`;return}
  const rc=reach(it.ev,r);
  el.innerHTML=`<div class="eng-head"><span class="lvl ${r.level}">${LV[r.level]} · ${r.score}/100</span><span class="eng-meta">${CH[it.ev.channel].label} from ${esc(senderName(it.ev))} · ${esc(r.label)}${r.origin?` · Number from: ${esc(placeLine(r.origin))} (${esc(r.origin.kind)})`:''}${rc?` · ${nfmt(rc.people)} people got ${esc(rc.what)}`:''}${r.lang?` · Language: ${esc(langLabel(r.lang))}`:''}</span></div>
  ${r.rule?`<div class="sig"><span class="pts" style="color:var(--high)">rule</span><span>${esc(r.rule)}</span><span class="k">level</span></div>`:''}
  ${r.signals.length?r.signals.map(s=>`<div class="sig"><span class="pts">+${s.pts}</span><span>${esc(s.text)}</span><span class="k">${s.kind}</span></div>`).join(''):'<div class="sig"><span class="pts">+0</span><span>No warning signs found.</span><span class="k">—</span></div>'}`;
}
function renderAll(){renderApp();renderEngine();renderProt()}

/* ---------- import ---------- */
function importText(txt,defLabel){
  let added=0,bad=0,dup=0;
  txt.split(/\r?\n/).map(l=>l.trim()).filter(Boolean).forEach((l,i)=>{
    const cells=l.split(/[,;\t]/).map(c=>c.trim().replace(/^"|"$/g,''));
    if(i===0&&/number|phone/i.test(cells[0])) return;
    const n=normalize(cells[0]);if(!n){bad++;return}
    let lab=(cells[1]||'').toLowerCase();if(!['scam','spam','trusted'].includes(lab)) lab=defLabel;
    const note=cells[2]||'';
    if(lab==='trusted'){
      if(state.trusted.some(x=>x.num===n)){dup++;return}
      state.userList=state.userList.filter(u=>u.num!==n);
      state.trusted.push({name:note||'Trusted contact',num:n});added++;return;
    }
    const ex=state.userList.find(u=>u.num===n);
    if(ex){if(ex.label===lab){dup++;return}ex.label=lab;ex.note=note||ex.note;added++;return}
    state.userList.push({num:n,label:lab,note});added++;
  });
  save();return {added,bad,dup};
}

/* ---------- SMS / email delivery ---------- */
let notifItem=null,notifT,notifCode=null,notifAction=null;
function notify(it,title,body){
  notifAction=null;notifCode=null;notifItem=it;const n=$('#notif');const ch=CH[it.ev.channel];
  n.innerHTML=`<span class="ni">${ic(it.res?'shield':ch.icon,18)}</span><span class="nt"><span>${esc(title)}</span>${chip(it.res)}</span><span class="nb">${esc(body)}</span>`;
  n.classList.add('show');clearTimeout(notifT);notifT=setTimeout(()=>n.classList.remove('show'),5500);
}
/** A notification that isn't about a checked event (scam waves, SIM-swap alerts). Tapping it runs `action`. */
function notifyRaw(title,body,icon,action){
  notifItem=null;notifCode=null;notifAction=action;const n=$('#notif');
  n.innerHTML=`<span class="ni">${ic(icon||'shield',18)}</span><span class="nt"><span>${esc(title)}</span></span><span class="nb">${esc(body)}</span>`;
  n.classList.add('show');clearTimeout(notifT);notifT=setTimeout(()=>n.classList.remove('show'),6500);
}
// Earlier messages from the same sender in the last 30 minutes, oldest first, so a scam split over several messages is caught.
function senderHistory(ev){
  const key=e=>e.channel==='email'?(e.fromAddr||'').toLowerCase():normalize(e.from);
  const k=key(ev);if(!k) return [];
  const cutoff=Date.now()-30*60*1000;
  return state.events.filter(it=>!it.example&&it.ev.channel===ev.channel&&it.at>=cutoff&&key(it.ev)===k).slice(0,4).reverse()
    .map(it=>it.ev.channel==='email'?[it.ev.subject,it.ev.text].filter(Boolean).join('\n'):it.ev.text);
}
async function deliver(ev){
  ev.history=senderHistory(ev);
  let res=null;
  if(state.channels[ev.channel]){try{res=await detector.checkEvent(ev,engineCtx)}catch(e){toast(e.message);return}}
  const it=logEvent(ev,res,'received');
  renderAll();
  const rc=res&&reach(ev,res);
  notify(it,`TriGuard · ${CH[ev.channel].label} from ${senderName(ev)}`,res?(res.level==='low'?'No warning signs found. Still verify before you pay.':(rc?nfmt(rc.people)+' people got this · ':'')+res.label+': '+res.signals[0].text):(ev.subject||ev.text));
}

/* ---------- calls ---------- */
let call=null;
function clearCall(){if(call){call.timers.forEach(clearTimeout);clearInterval(call.tick);call=null}$('#callLayer').hidden=true;$('#callLayer').innerHTML=''}
function partial(ev,i){
  const lines=(ev.transcript||[]).slice(0,i+1);
  const p={...ev,text:lines.join(' ')};
  if(i<0){p.text='';delete p.missed;delete p.voiceScore;delete p.faceScore;delete p.lipsync}
  return p;
}
function startCall(ev){
  clearCall();closeSheet();
  const on=state.channels[ev.channel];
  const res=on?analyze(partial(ev,-1)):null;
  call={ev,res,on,phase:'ringing',i:-1,secs:0,timers:[],tick:null};
  renderCall();
  if(ev.missed) call.timers.push(setTimeout(()=>finishCall('missed'),2800));
}
function bannerHTML(res,phase){
  if(!res) return `<div class="banner" id="liveBanner"><span class="bi">${ic('shield',18)}</span><span class="bl" style="color:var(--ph-muted)">${t('level.off')}</span><span class="br">Protection for this channel is switched off.</span></div>`;
  if(res.level==='low'&&res.trusted&&(phase==='ringing'||!(call&&call.i>=0)))
    return `<div class="banner" id="liveBanner"><span class="bi">${ic('shield',18)}</span><span class="bl" style="color:var(--ph-ink)">Saved contact · voice not checked yet</span><span class="br">The number matches ${esc(res.trusted)}, but phones can be stolen and numbers spoofed. TriGuard checks the voice as soon as you answer.</span><span class="bs">Don’t trust the number alone</span></div>`;
  const top=res.signals[0];
  const reason=top?top.text:(res.notes[0]||'');
  const rc=call?reach(call.ev,res):null;
  const sub=res.level==='low'?(phase==='ringing'?'TriGuard keeps checking once you answer.':'Still verify before you send money.'):res.label+(rc?` · ${nfmt(rc.people)} people got ${rc.what} this week`:'');
  return `<div class="banner ${res.level}" id="liveBanner"><span class="bi">${ic(res.level==='low'?'shield':'alert',18)}</span><span class="bl">TriGuard: ${LV[res.level]}</span><span class="br">${esc(reason)}</span><span class="bs">${esc(sub)}</span>${phase==='active'?`<button class="why-btn" data-act="card-live">${t('call.why')}</button>`:''}</div>`;
}
function renderCall(){
  const L=$('#callLayer');L.hidden=false;
  const ev=call.ev,res=call.res,video=ev.channel==='video';
  const name=senderName(ev),num=senderSub(ev);
  if(call.phase==='ringing'){
    L.innerHTML=`<div class="call lv-${res?res.level:'low'}" id="callRoot">
      <div class="call-top"><span class="call-kind">${t(video?'call.incomingVideo':'call.incoming')}</span><div class="avatar">${esc(initials(name))}</div><div class="call-name">${esc(name)}</div><div class="call-num mono">${esc(num)}</div>${res&&res.origin&&!res.origin.hidden?`<div class="call-loc ${res.level}">${ic('pin',14)}${esc(placeLine(res.origin))}</div>`:''}</div>
      ${bannerHTML(res,'ringing')}
      <div id="verifySlot">${verifyStatusHTML()}</div>
      <div class="call-mini"><button class="mini" data-act="call-block">${t('call.block')}</button><button class="mini" data-act="card-live">${t('call.why')}</button><button class="mini" data-act="verify-open">${ic('people',14)} Verify</button></div>
      <div class="call-actions"><button class="rbtn red" data-act="decline"><span>${ic('end',26)}</span>${t('call.decline')}</button><button class="rbtn green" data-act="answer"><span>${ic(video?'video':'call',26)}</span>${t('call.accept')}</button></div>
    </div>`;
    return;
  }
  if(video){
    const fake=(ev.faceScore||0)>=.4;
    L.innerHTML=`<div class="vcall ${fake?'fake':''}">
      <div class="vid"><div class="wall"></div>
        <div class="person"><div class="neck"></div><div class="body"></div><div class="collar"></div><div class="head"></div><div class="hair"></div><div class="eyes"><i></i><i></i></div><div class="mouth"></div></div>
        <div class="fbox" id="fbox"><span class="lab" id="flab">Checking face…</span><div class="scanl"></div></div>
        <div class="vtop"><b>${esc(name)}</b><span class="mono">${esc(num)} · <span id="callTimer">00:00</span></span>${res&&res.origin&&!res.origin.hidden?`<span>${esc(placeLine(res.origin))}</span>`:''}</div>
        <div class="self">You</div>
        <div class="hand" aria-hidden="true"></div>
        <div class="live-chk" id="liveChk" hidden></div>
        <div class="caption" id="caption">Connecting…</div>
      </div>
      <div class="vpanel"><div class="lang-live" id="langLive" hidden></div>${bannerHTML(res,'active')}<div id="verifySlot">${verifyStatusHTML()}</div><div id="guardSlot"></div>
        <div class="call-mini"><button class="mini" data-act="liveness" id="liveBtn">${ic('video',14)} Liveness check</button><button class="mini" data-act="verify-open">${ic('people',14)} Is it really you?</button></div>
        <div id="alertSlot"></div>
        <div class="call-actions"><button class="rbtn red" data-act="hangup"><span>${ic('end',26)}</span>${t('call.end')}</button></div></div>
    </div>`;
  } else {
    L.innerHTML=`<div class="call lv-${res?res.level:'low'}" id="callRoot">
      <div class="call-top"><div class="call-name">${esc(name)}</div><div class="call-num mono">${esc(num)}</div>${res&&res.origin&&!res.origin.hidden?`<div class="call-loc ${res.level}">${ic('pin',14)}${esc(placeLine(res.origin))}</div>`:''}<div class="timer mono" id="callTimer">00:00</div></div>
      <div class="live"><div class="live-h"><span>${t('call.liveVoice')}</span><span id="meterVal" class="mono">listening…</span></div>
        <div class="wave">${'<b></b>'.repeat(24)}</div>
        <div class="meter"><i id="meterFill"></i></div></div>
      <div class="trans" id="trans"></div>
      <div class="lang-live" id="langLive" hidden></div>
      ${bannerHTML(res,'active')}
      <div id="verifySlot">${verifyStatusHTML()}</div><div id="guardSlot"></div>
      <div class="call-mini"><button class="mini" data-act="verify-open">${ic('people',14)} Is it really you?</button></div>
      <div id="alertSlot"></div>
      <div class="call-actions"><button class="rbtn red" data-act="hangup"><span>${ic('end',26)}</span>${t('call.end')}</button></div>
    </div>`;
    L.querySelectorAll('.wave b').forEach((b,i)=>b.style.animationDelay=(i%7)*0.11+'s');
  }
}
function answer(){
  if(!call||call.phase!=='ringing') return;
  call.phase='active';renderCall();
  call.tick=setInterval(()=>{call.secs++;const el=$('#callTimer');if(el)el.textContent=`00:${String(call.secs).padStart(2,'0')}`;checkGuardian()},1000);
  const lines=call.ev.transcript||[];
  lines.forEach((ln,i)=>call.timers.push(setTimeout(()=>step(i),1300+i*2100)));
  if(!lines.length) call.timers.push(setTimeout(()=>step(-1),1200));
}
function step(i){
  if(!call) return;
  const ev=call.ev,video=ev.channel==='video',lines=ev.transcript||[];
  call.i=i;
  if(call.on) call.res=analyze(partial(ev,i));
  const res=call.res;
  if(i>=0){
    if(video){$('#caption').textContent='“'+lines[i]+'”'}
    else{const tr=$('#trans');tr.insertAdjacentHTML('beforeend',`<div class="bub">${esc(lines[i])}</div>`);tr.scrollTop=tr.scrollHeight}
  }
  const b=$('#liveBanner');if(b) b.outerHTML=bannerHTML(res,'active');
  const ll=$('#langLive');if(ll&&res&&res.lang){ll.hidden=false;ll.innerHTML=`${ic('globe',14)} Language detected: <b>${esc(langLabel(res.lang))}</b>`}
  const root=$('#callRoot');if(root) root.className='call lv-'+(res?res.level:'low');
  const score=video?ev.faceScore:ev.voiceScore;
  const showScore=typeof score==='number'&&i>=0&&call.on;
  if(video){
    const fb=$('#fbox'),fl=$('#flab');
    if(showScore){const lv=score>=.7?'high':score>=.4?'medium':'low';fb.className='fbox '+lv;fl.textContent=lv==='low'?`Face looks natural · ${Math.round(score*100)}%`:`Possible deepfake · ${Math.round(score*100)}%`}
  } else {
    const m=$('#meterFill'),mv=$('#meterVal');
    if(showScore){m.style.width=Math.round(score*100)+'%';m.style.background=score>=.7?'var(--r-high)':score>=.4?'var(--r-med)':'var(--r-low)';mv.textContent=`AI voice ${Math.round(score*100)}% (simulated)`}
    else if(typeof score==='number'&&call.on){m.style.width='12%';mv.textContent='analysing…'}
  }
  const last=i>=lines.length-1;
  if(last&&res&&res.level==='high') $('#alertSlot').innerHTML=alertHTML();
}
function alertHTML(){
  return `<div class="alertbar">${t('call.warn')}${state.safeWord?`<span class="sw-hint">${ic('key',14)} Ask for your family safe word.</span>`:''}
    <div class="prow"><button class="pbtn" data-act="hangup-callback">${t('call.endCallback')}</button><button class="pbtn alt" data-act="verify-open">Is it really you?</button></div></div>`;
}
/** Re-scores the live call after new evidence (verification, safe word, liveness) and refreshes the call screen. */
function reanalyzeCall(){
  if(!call) return;
  if(call.on) call.res=analyze(partial(call.ev,call.i));
  const b=$('#liveBanner');if(b) b.outerHTML=bannerHTML(call.res,call.phase==='ringing'?'ringing':'active');
  const root=$('#callRoot');if(root) root.className='call lv-'+(call.res?call.res.level:'low');
  const vs=$('#verifySlot');if(vs) vs.innerHTML=verifyStatusHTML();
  const as=$('#alertSlot');if(as&&call.phase==='active'&&call.res&&call.res.level==='high'&&!as.innerHTML) as.innerHTML=alertHTML();
}
function finishCall(status){
  if(!call) return;
  const ev={...call.ev};
  let res;
  if(status==='declined'||status==='blocked') res=call.res;
  else {ev.text=(ev.transcript||[]).slice(0,Math.max(call.i+1,0)).join(' ');
    const full={...ev};if(call.i<0){delete full.voiceScore;delete full.faceScore;delete full.lipsync}
    res=call.on?analyze(full):null;}
  if(status!=='missed'&&!ev.text) ev.text='';
  const it=logEvent(ev,res,status);
  clearCall();renderAll();
  return it;
}

/* ---------- risk sheet ---------- */
function closeSheet(){clearAI();$('#sheetLayer').hidden=true;$('#sheetLayer').innerHTML=''}
function openSheet(id){const it=state.events.find(e=>e.id===id);if(it) showCard(it,false)}
function openLiveCard(){if(!call) return;showCard({id:null,ev:partial(call.ev,call.i),res:call.res,time:nowT(),status:call.phase==='ringing'?'ringing':'live'},true)}
function showCard(it,live){
  const ev=it.ev,r=it.res,ch=CH[ev.channel];
  const isNum=ev.channel!=='email'&&ev.msgType!=='email'&&!!normalize(ev.from);
  let content='';
  if(ev.uploaded) content=uploadContent(ev);
  else if(ev.channel==='email') content=`<div class="msg"><div class="subj">${esc(ev.subject)}</div>${esc(ev.text)}${ev.replyTo?`<div class="n" style="margin-top:6px;color:var(--ph-muted);font-size:12px">Reply-to: ${esc(ev.replyTo)}</div>`:''}${(ev.attachments||[]).map(a=>`<span class="att">📎 ${esc(a)}</span>`).join(' ')}</div>`;
  else if(ev.channel==='sms') content=(ev.history&&ev.history.length?`<div class="msg"><div class="subj">Earlier messages from this sender</div>${ev.history.map(esc).join('<br><br>')}</div>`:'')+`<div class="msg">${esc(ev.text)}</div>`;
  else if(ev.text) content=`<div class="msg"><div class="subj">${live?'What the caller has said so far':'What the caller said'}</div>${esc(ev.text)}</div>`;
  else if(live) content=`<div class="msg">${it.status==='ringing'?'The phone is still ringing. TriGuard checked the number before you answer and keeps checking once you do.':'TriGuard is still listening to the call.'}</div>`;
  else content=`<div class="msg">${it.status==='missed'?'Missed call. The caller rang once and hung up.':it.status==='declined'?'You declined this call before answering.':'Call blocked.'}</div>`;
  const sigs=r?r.signals.map(s=>`<li class="${s.pts>=25?'hi':''}">${esc(s.text)}</li>`).join('')+r.notes.map(n=>`<li class="lo">${esc(n)}</li>`).join(''):'<li class="lo">Protection for this channel was switched off.</li>';
  $('#sheetLayer').innerHTML=`<div class="sheet-layer" data-act="sheet-bg"><div class="sheet" role="dialog" aria-label="Risk details">
    <div class="grab"></div>
    <div class="sh-top"><span>${live?`${ch.label} · ${it.status==='ringing'?'ringing':'in progress'}`:`${ch.label} · ${it.time}${it.example?' · Example':''}`}</span><button class="x" data-act="close-sheet" aria-label="Close">×</button></div>
    ${live&&r&&r.level==='low'&&r.trusted&&!(call&&call.i>=0)?`<div class="risk-hero off"><span class="lv" style="font-size:22px">Saved contact · voice not checked yet</span><span style="font-size:12.5px;color:var(--ph-muted)">The number matches ${esc(r.trusted)}. TriGuard checks the voice as soon as you answer, because a stolen phone or swapped SIM can call from a real saved number.</span></div>`:`<div class="risk-hero ${r?r.level:'off'}"><span class="lv">${r?LV[r.level]:'Not checked'}</span>${r?`<span class="ty">${esc(r.label)}</span><div class="gauge"><span class="mono">${r.score}/100</span><div class="meter"><i style="width:${r.score}%;background:var(--r-${r.level})"></i></div></div>`:''}</div>`}
    ${r?`<button class="ai-ask" ${live?'data-act="ai-live"':`data-act="ai-item" data-id="${it.id}"`}><span class="ai-av">${ic('spark',16)}</span><span><b>${t('card.whyIs')}</b><small>${t('card.askAI')}</small></span></button>`:''}
    ${r?reachHTML(ev,r):''}
    <div class="from"><b>${esc(senderName(ev))}</b><br><span class="n">${esc(senderSub(ev))}</span>${isNum&&r&&r.origin?`<span class="n"> · ${esc(r.origin.place)}</span>`:''}</div>
    ${langBlock(ev,r)}
    ${content}
    ${ev.bankDetails?`<div class="bankbox"><span class="bb-i">${ic('bank',18)}</span><div><b>New bank details in this email</b><span>${esc(ev.bankDetails.bank)} · <span class="mono">${esc(ev.bankDetails.account)}</span> · in the name of “${esc(ev.bankDetails.holder)}”</span>
      ${ev.accountCheck?acctResultHTML(ev.accountCheck):(live?'':`<button class="pbtn" data-act="verify-acct" data-id="${it.id}">Verify this account with the bank</button>`)}</div></div>`:''}
    <div class="sh-h">${t('card.why')}</div><ul class="why">${sigs}</ul>
    ${isNum&&r&&r.level!=='low'?locCard(r):''}
    ${r?`<div class="sh-h">${t('card.safe')}</div><ol class="steps">${r.tips.map(x=>`<li>${esc(x)}</li>`).join('')}</ol>`:''}
    ${isNum&&r&&r.level==='low'?locCard(r):''}
    <div class="acts">
      ${live?`<button class="pbtn wide" data-act="hangup-callback">${it.status==='ringing'?'Decline':'End call'} and call back a trusted number</button><button class="pbtn warn" data-act="call-block">${t('card.blockNum')}</button><button class="pbtn alt" data-act="close-sheet">Back to call</button>`:`<button class="pbtn wide" data-act="callback">${t('card.callback')}</button>
      ${isNum?`<button class="pbtn warn" data-act="block" data-id="${it.id}">${t('card.blockNum')}</button><button class="pbtn alt" data-act="report" data-id="${it.id}">${t('card.report')}</button><button class="pbtn alt wide" data-act="trust" data-id="${it.id}">${t('card.trust')}</button>`
        :ev.uploaded&&ev.msgType!=='email'?`<button class="pbtn alt wide" data-act="report-email" data-id="${it.id}">Report this scam</button>`
        :`<button class="pbtn warn" data-act="block-email" data-id="${it.id}">Block sender</button><button class="pbtn alt" data-act="report-email" data-id="${it.id}">Report phishing</button>`}
      ${r&&r.level!=='low'?`<button class="pbtn alt wide sos-btn" data-act="emergency">${ic('siren',16)} I already paid or shared a code</button>`:''}`}
    </div>
    ${!live&&r?(it.feedback?`<p class="fb-done">${ic('check',14)} Thanks. ${it.feedback==='right'?'Your answer helps TriGuard measure its accuracy.':'A person will review this and TriGuard will learn from it.'}</p>`
      :`<div class="fb"><span>Was TriGuard right?</span><button class="mini" data-act="fb" data-v="right" data-id="${it.id}">Yes</button><button class="mini" data-act="fb" data-v="not-scam" data-id="${it.id}">No, it’s not a scam</button><button class="mini" data-act="fb" data-v="missed" data-id="${it.id}">No, it is a scam</button></div>`):''}
    <p class="never">${t('card.never')}</p>
  </div></div>`;
  $('#sheetLayer').hidden=false;
}
function openCallback(){
  $('#sheetLayer').innerHTML=`<div class="sheet-layer" data-act="sheet-bg"><div class="sheet" role="dialog" aria-label="Call back">
    <div class="grab"></div><div class="sh-top"><span>Verify before you act</span><button class="x" data-act="close-sheet" aria-label="Close">×</button></div>
    <div class="risk-hero off"><span class="lv" style="font-size:20px">Call back on a number you trust</span><span style="font-size:12.5px;color:var(--ph-muted)">A scammer can fake a voice, a face or a caller ID. They can’t answer a number you already have saved.</span></div>
    <div class="cb-list">${state.trusted.map((x,i)=>`<div class="cb"><span class="ico low">${esc(initials(x.name))}</span><span style="min-width:0"><b style="display:block">${esc(x.name)}</b><span class="mono" style="font-size:12px;color:var(--ph-muted)">${fmt(x.num)}</span></span><button class="pbtn" data-act="call-trusted" data-i="${i}">Call</button></div>`).join('')}</div>
    <p class="never">Never use a number or link from the suspicious message itself.</p></div></div>`;
  $('#sheetLayer').hidden=false;
}

/* ---------- accounts: register, login, profile ---------- */
let authTimers=[];
function clearAuthT(){authTimers.forEach(clearTimeout);authTimers=[]}
function acct(){return state.session?state.accounts.find(a=>a.num===state.session.num)||null:null}
function daysSince(d){return Math.max(0,Math.floor((Date.now()-new Date(d+'T00:00:00').getTime())/864e5))}
function todayStr(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function isNew(a){return daysSince(a.created)<7}
function plog(what,result,why){state.protLog.unshift({t:nowT(),what,result,why});renderProt()}
function maskEmail(e){if(!e) return '';const [u,d]=e.split('@');return u[0]+'•••@'+d}
function renderProt(){
  const a=acct(),al=$('#acctLine');
  if(al) al.innerHTML=a?`Signed in as <b>${esc(a.first)} ${esc(a.last)}</b> · <span class="mono">${fmt(a.num)}</span> · ${isNew(a)?'new account':'established account'} · accounts made on this phone: ${state.deviceCount} of ${MAX_PER_PHONE}`:`Not signed in. The phone shows the welcome screen. Accounts made on this phone: ${state.deviceCount} of ${MAX_PER_PHONE}.`;
  const pl=$('#protLog');if(!pl) return;
  pl.innerHTML=state.protLog.length?state.protLog.slice(0,8).map(e=>`<div class="plog"><span class="mono">${e.t}</span><span style="min-width:0"><b>${esc(e.what)}</b><small>${esc(e.why)}</small></span><span class="res ${e.result.toLowerCase()}">${e.result}</span></div>`).join(''):'<p class="empty">No attempts yet. Try one of the attacks above.</p>';
}
const ATTACKS=[['dup','Second account on the same number','Number already registered'],['voip','Sign up with a VoIP number','087 internet number'],['many','Third account on one phone','Device limit'],['name','Register as “Ubuntu Bank Fraud Dept”','Protected name'],['bot','Bot signs up from an emulator','App integrity check'],['swap','Sign up right after a SIM swap','Network SIM-swap check'],['takeover','Take over an account on a new phone','Stolen phone or SIM swap'],['flood','20 fake accounts report Mom','Weighted reports']];
function renderAttacks(){$('#attacks').innerHTML=ATTACKS.map(([id,title,sub])=>`<button class="scn" type="button" data-act="attack" data-id="${id}"><span class="ci">${ic('shield',16)}</span><span class="ch">Attack</span><b>${esc(title)}</b><small style="grid-column:2">${esc(sub)}</small></button>`).join('')}

function goAuth(step,extra){clearAuthT();state.auth=Object.assign({step,err:''},extra||{});renderApp()}
function errBox(){return state.auth.err?`<div class="auth-err" role="alert">${state.auth.err}</div>`:''}
function whyLine(txt){return `<p class="why-line">${ic('shield',13)}<span>${txt}</span></p>`}
function backBtn(k){return `<button class="mini auth-back" data-act="auth-go" data-k="${k}">‹ Back</button>`}
function renderAuth(){
  const A=state.auth;
  if(A.step==='welcome') return `<div class="lang-top">${ic('globe',15)}${langSelect('langWelcome')}</div><div class="welcome"><div class="wl-logo">${ic('shield',44)}</div><h3>TriGuard</h3>
    <p>${t('auth.tagline')}</p>
    <button class="pbtn big" data-act="auth-go" data-k="reg">${t('auth.create')}</button>
    <button class="pbtn alt big" data-act="auth-go" data-k="login">${t('auth.login')}</button>
    <button class="linkbtn" data-act="demo-login">${t('auth.demo')}</button>
    <p class="fine">You need a South African mobile number.</p></div>`;
  if(A.step==='reg'){const f=A.f||{};
    return `<div class="auth">${backBtn('welcome')}<h3 class="auth-h">${t('auth.create')}</h3>
    <label class="auth-l" for="rNum">${t('auth.mobile')} *</label><input class="pin mono" id="rNum" inputmode="tel" placeholder="074 555 1200" value="${esc(f.num||'')}" autocomplete="tel">
    ${whyLine('Your number is your identity on TriGuard. Each number can have only one account. Internet (VoIP) numbers and landlines aren’t accepted.')}
    <label class="auth-l" for="fn">${t('auth.first')} *</label><input class="pin" id="fn" value="${esc(f.fn||'')}" autocomplete="given-name">
    <label class="auth-l" for="ln">${t('auth.last')} *</label><input class="pin" id="ln" value="${esc(f.ln||'')}" autocomplete="family-name">
    ${whyLine('Shown to other TriGuard users when you call them, labelled “Name given by user”. Bank, police, government and company names are blocked.')}
    <label class="auth-l" for="em">Email (optional)</label><input class="pin" id="em" value="${esc(f.em||'')}" inputmode="email" autocomplete="email" placeholder="you@example.com">
    ${whyLine('Used to recover your account, and as a second check if your account is opened on a new phone.')}
    <div class="photo-row"><span class="prof-av sm">${esc(initials(((f.fn||'?')+' '+(f.ln||'')).trim()))}</span><span><b>Profile photo (optional)</b><small>You can add one later in your profile.</small></span></div>
    <div class="consent"><p><b>What we keep:</b> your number, name, optional email, what you report or upload, and an ID for this phone to stop fake accounts.</p>
    <p><b>What we never do:</b> upload your contacts, sell your data or show ads. You can download or delete your data at any time.</p></div>
    <label class="check-p"><input type="checkbox" id="cPriv" ${f.priv?'checked':''}> I agree to the privacy terms (POPIA).</label>
    <label class="check-p"><input type="checkbox" id="cAge" ${f.age?'checked':''}> I am 18 or older, or have permission from a parent or guardian.</label>
    ${errBox()}<button class="pbtn big" data-act="reg-submit">${t('auth.create')}</button>
    <p class="fine">Demo: this button always lets you through. Checks and SMS codes will be added in development.</p></div>`;}
  if(A.step==='login') return `<div class="auth">${backBtn('welcome')}${A.notice?`<div class="auth-ok">${ic('shield',16)} ${esc(A.notice)}</div>`:''}
    <h3 class="auth-h">${t('auth.login')}</h3><p class="auth-sub">Enter the mobile number linked to your account.</p>
    <label class="auth-l" for="lNum">${t('auth.mobile')}</label><input class="pin mono" id="lNum" inputmode="tel" placeholder="072 555 0111" value="${esc(A.prefill||'')}" autocomplete="tel">
    ${whyLine('In the full app, an SMS code will confirm it’s really you. For now, Log in always lets you through.')}
    ${errBox()}<button class="pbtn big" data-act="login-submit">${t('auth.login')}</button>
    <p class="fine">No account yet? <button class="linkbtn" data-act="auth-go" data-k="reg">Create one</button></p></div>`;
  if(A.step==='hold') return `<div class="auth"><h3 class="auth-h">Login on hold</h3>
    <p class="auth-sub">This account was opened on a new phone right after its SIM was changed. To protect it:</p>
    <ul class="hold"><li>We alerted the owner’s other phone.</li><li>${A.email?`We need a code sent to ${esc(maskEmail(A.email))}.`:'The owner has no email on file, so there is no second check available.'}</li><li>Without that, the login waits 24 hours. The name, lists and reports stay locked until then.</li></ul>
    <div class="auth-err">Why: if a scammer steals a phone or swaps a SIM, they control the number. A second check stops them taking over the account and its trusted name.</div>
    <button class="pbtn alt big" data-act="auth-go" data-k="welcome">Back to start</button></div>`;
  return '';
}
function valNum(raw,mode){
  const n=normalize(raw);
  if(!n) return {err:'Enter a valid number, like 082 555 0143.'};
  if(mode==='reg'){
    if(/^\+2787/.test(n)) return {n,rule:'Internet (VoIP) number refused',err:'Internet (VoIP) numbers can’t be used to sign up. They are easy to get in bulk, so they’re used for fake accounts. Use your mobile number.'};
    if(!/^\+27[678]\d{8}$/.test(n)) return {n,rule:'Not a South African mobile number',err:n.startsWith('+27')?'Landlines can’t be used to sign up. Use your mobile number.':'For now, TriGuard only supports South African mobile numbers.'};
    if(state.accounts.some(a=>a.num===n)) return {n,rule:'One account per number',err:'This number already has a TriGuard account, and each number can have only one. <button class="linkbtn" data-act="auth-go" data-k="login">Log in instead</button>'};
  } else if(!state.accounts.some(a=>a.num===n)) return {n,err:'No account uses this number. <button class="linkbtn" data-act="auth-go" data-k="reg">Create an account</button>'};
  return {n};
}
function nameErr(fn,ln){
  if(!fn||!ln) return {msg:'Enter your first and last name.'};
  const ok=/^[A-Za-zÀ-ÿ' -]{2,30}$/;
  if(!ok.test(fn)||!ok.test(ln)) return {msg:'Names can only use letters, spaces, hyphens and apostrophes, 2 to 30 characters.'};
  const full=fn+' '+ln;
  if(PROTECTED.test(full)) return {msg:`“${esc(full)}” can’t be used. Names of banks, police, government, networks and companies are blocked, so nobody can make their calls look official.`,rule:'Protected name blocked'};
  return null;
}
function submitRegister(pre){
  const A=state.auth;
  const f=pre||{num:$('#rNum').value,fn:$('#fn').value.trim(),ln:$('#ln').value.trim(),em:$('#em').value.trim(),priv:$('#cPriv').checked,age:$('#cAge').checked};
  A.f=f;
  if(!pre){ // demo: the buttons always let you through until the real system is built
    const n=normalize(f.num)||'+2774'+String(5550000+Math.floor(Math.random()*9999)).slice(-7);
    if(!state.accounts.some(a=>a.num===n)){state.accounts.push({num:n,first:f.fn||'New',last:f.ln||'User',email:f.em||'',created:todayStr(),nameChanges:2,reports:0});state.deviceCount++;save();plog(`Sign-up for ${fmt(n)}`,'Allowed','Demo sign-up (checks skipped until the real system is built)')}
    goAuth('login',{prefill:fmt(n),notice:'Account created. Log in to continue.'});renderProt();return;
  }
  const nn=normalize(f.num);
  const fail=(msg,rule,what)=>{A.err=msg;if(rule) plog(what||`Sign-up with ${nn?fmt(nn):f.num}`,'Blocked',rule);renderApp();};
  const v=valNum(f.num,'reg');if(v.err) return fail(v.err,v.rule);
  const e=nameErr(f.fn,f.ln);if(e) return fail(e.msg,e.rule,`Sign-up as “${f.fn} ${f.ln}”`);
  if(f.em&&!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.em)) return fail('That email address doesn’t look right. Leave it empty if you don’t want to add one.');
  if(!f.priv||!f.age) return fail('Tick both boxes to continue. We can’t create an account without your consent.');
  if(state.flags.bot){state.flags.bot=false;return fail('This sign-up came from an emulator or automated script, not a real phone. Bots create fake accounts in bulk, so it was stopped.','App integrity check failed (bot or emulator)')}
  if(SIM_SWAPPED.includes(v.n)) return fail('This SIM was changed 6 hours ago. Scammers swap SIMs to take over numbers, so new accounts on a recently swapped SIM wait 24 hours.','Recent SIM swap: 24-hour hold');
  if(state.deviceCount>=MAX_PER_PHONE) return fail(`This phone has already created ${MAX_PER_PHONE} accounts, the limit for one phone. This stops one person making many fake accounts.`,`Device limit (${MAX_PER_PHONE} accounts per phone)`);
  state.accounts.push({num:v.n,first:f.fn,last:f.ln,email:f.em||'',created:todayStr(),nameChanges:2,reports:0});
  state.deviceCount++;save();
  plog(`Sign-up for ${fmt(v.n)}`,'Allowed','All checks passed. New account: reports count 30% for 7 days');
  goAuth('login',{prefill:fmt(v.n),notice:'Account created. Log in to continue.'});renderProt();
}
function submitLogin(pre){
  const A=state.auth;const raw=pre!=null?pre:$('#lNum').value;A.prefill=raw;
  if(pre==null){ // demo: the button always logs you in
    let n=normalize(raw);
    if(!n||!state.accounts.some(a=>a.num===n)){
      if(n){state.accounts.push({num:n,first:'New',last:'User',email:'',created:todayStr(),nameChanges:2,reports:0});save()}
      else{n=DEMO_NUM;if(!state.accounts.some(a=>a.num===n)) state.accounts.push({...SEED_ACCOUNTS[0]})}
    }
    state.flags.newDevice=false;state.session={num:n};state.screen=afterLogin();state.auth={step:'welcome'};save();renderAll();toast('Logged in. Protection is on.');return;
  }
  const v=valNum(raw,'login');if(v.err){A.err=v.err;renderApp();return}
  if(SIM_SWAPPED.includes(v.n)||state.flags.newDevice){
    const acc=state.accounts.find(x=>x.num===v.n);
    plog(`Login to ${fmt(v.n)} on a new phone`,'Held','New phone after a recent SIM swap: alert to the owner, email check, 24-hour hold');
    state.flags.newDevice=false;goAuth('hold',{num:v.n,email:acc&&acc.email});return;
  }
  state.session={num:v.n};state.screen=afterLogin();state.auth={step:'welcome'};save();renderAll();toast('Logged in. Protection is on.');
}
// After signing in, open a message shared to TriGuard if there is one, otherwise Home.
function afterLogin(){if(state.sharedText){state.numTab='upload';return 'numbers'}return 'home'}
function demoLogin(){
  clearAuthT();
  if(!state.accounts.some(a=>a.num===DEMO_NUM)) state.accounts.push({...SEED_ACCOUNTS[0]});
  state.session={num:DEMO_NUM};state.auth={step:'welcome'};state.screen=afterLogin();save();renderAll();toast('Signed in as Naledi (demo account)');
}
function saveName(){
  const me=acct();const fn=$('#pfFn').value.trim(),ln=$('#pfLn').value.trim();
  const e=nameErr(fn,ln);
  if(e){state.profErr=e.msg;if(e.rule) plog(`Name change to “${fn} ${ln}”`,'Blocked',e.rule);renderApp();return}
  if(me.nameChanges<=0){state.profErr='No name changes left this year.';renderApp();return}
  me.first=fn;me.last=ln;me.nameChanges--;state.editName=false;state.profErr='';save();renderAll();toast('Name updated');
}
function renderProfile(){
  const a=acct();if(!a) return '';
  const nw=isNew(a),days=daysSince(a.created);
  return `<div class="apphead"><button class="mini" data-act="nav" data-k="home">‹ Home</button><span class="sub">${t('prof.title')}</span></div>
  <div class="prof"><div class="prof-av">${esc(initials(a.first+' '+a.last))}</div>
    <div class="prof-name">${esc(a.first)} ${esc(a.last)}</div>
    <span class="chip off nodot">Name given by you · not ID-verified</span>
    <div class="prof-num"><span class="mono">${fmt(a.num)}</span><span class="chip low">Verified by SMS</span></div></div>
  <div class="pbox"><h4>Account trust</h4>
    <div class="trust ${nw?'new':'est'}"><b>${nw?'New account':'Established account'}</b><span>${nw?`${days?`Member for ${days} day${days===1?'':'s'}`:'Joined today'}. Your scam reports count 30% until day 7.`:`Member since ${a.created}. Your scam reports count fully.`}</span></div>
    <p>Why: fake accounts are almost always new, so new accounts’ reports count less until they build a history.</p>
    <div class="kv"><span>Scam reports you made</span><b>${a.reports}</b></div></div>
  <div class="pbox"><h4>Details</h4>
    ${state.editName?`<label class="auth-l" for="pfFn">First name</label><input class="pin" id="pfFn" value="${esc(a.first)}"><label class="auth-l" for="pfLn">Last name</label><input class="pin" id="pfLn" value="${esc(a.last)}">${state.profErr?`<div class="auth-err">${state.profErr}</div>`:''}<div class="prow"><button class="pbtn" data-act="save-name">Save name</button><button class="pbtn alt" data-act="cancel-name">Cancel</button></div>`
    :`<div class="kv"><span>Name</span><b>${esc(a.first)} ${esc(a.last)}</b></div><div class="kv"><span>Email</span><b>${a.email?esc(a.email):'Not added'}</b></div><div class="kv"><span>Name changes left this year</span><b>${a.nameChanges} of 2</b></div><button class="pbtn alt" data-act="edit-name" ${a.nameChanges?'':'disabled'}>Change name</button>`}
    <p>Why the limit: someone who keeps changing their name could pose as different people.</p></div>
  <div class="pbox"><h4>Devices</h4><div class="kv"><span>This phone</span><b>Active now</b></div>
    <p>If your account is opened on a new phone, we alert this phone and hold changes for 24 hours.</p></div>
  <div class="pbox"><h4 class="hx">${ic('key',16)} Family safe word</h4>
    <p>Agree a word with your family that nobody else knows. When a call feels wrong, TriGuard reminds you to ask for it. A cloned voice won’t know it. It stays on this phone and is never sent to TriGuard.</p>
    ${state.safeWordEdit||!state.safeWord?`<div class="prow"><input class="pin" id="swIn" type="password" autocomplete="off" placeholder="e.g. a pet’s name plus a number" value="${esc(state.safeWord)}"><button class="pbtn" style="flex:0 0 auto" data-act="sw-save">Save</button></div>`
      :`<div class="kv"><span>Safe word</span><b>••••••</b></div><div class="prow"><button class="pbtn alt" data-act="sw-edit">Change</button><button class="pbtn alt" data-act="sw-clear">Remove</button></div>`}</div>
  <div class="pbox"><h4 class="hx">${ic('people',16)} Guardian alerts</h4>
    <p>Choose a family member to alert if you stay on a High-risk call, so someone can check on you. They only get an alert, never your calls or messages.</p>
    <select class="psel" id="gdSel" aria-label="Guardian"><option value="">Nobody</option>${state.trusted.filter(x=>!x.org).map(x=>`<option value="${x.num}" ${state.guardian&&state.guardian.num===x.num?'selected':''}>${esc(x.name)}</option>`).join('')}</select>
    <label class="check-p"><input type="checkbox" id="gdOn" ${state.guardianOn?'checked':''}> I agree that TriGuard may alert this person when I’m on a High-risk call (POPIA consent). I can switch this off at any time.</label>
    <button class="pbtn alt" data-act="gd-save">Save guardian</button></div>
  <div class="pbox"><h4 class="hx">${ic('shield',16)} SIM-swap alerts</h4>
    <p>Your mobile network tells TriGuard if your SIM is changed. If it wasn’t you, you’ll know within minutes, before anyone can use your number to get bank codes.</p>
    <label class="check-p"><input type="checkbox" data-act="sim-alerts" ${state.simAlerts?'checked':''}> Alert me if my SIM is swapped</label></div>
  <div class="pbox"><h4 class="hx">${ic('alert',16)} Data breach check</h4>
    <p>Checks whether ${a.email?esc(a.email):'your email'} appeared in a known data breach. Leaked details make scams more convincing, because scammers can use your real name and number.</p>
    ${a.email?`<button class="pbtn alt" data-act="breach-check" ${state.breachBusy?'disabled':''}>${state.breachBusy?'Checking…':'Check now'}</button>`:'<p>Add an email address to use this.</p>'}
    ${breachHTML()}</div>
  <div class="pbox"><h4 class="hx">${ic('globe',16)} ${t('prof.lang')}</h4>${langSelect('langProfile')}<p>${t('prof.langNote')}</p></div>
  <div class="pbox"><h4>Privacy</h4><p>Your contacts stay on this phone. TriGuard never uploads them, never collects your location, and never sells your data or shows ads.</p>
    <div class="prow"><button class="pbtn alt" data-act="dl-data">Download my data</button><button class="pbtn alt" data-act="logout">${t('prof.logout')}</button></div>
    ${state.delAsk?`<div class="auth-err">Delete your account, reports and lists? This can’t be undone.<div class="prow" style="margin-top:8px"><button class="pbtn warn" data-act="del-yes">Delete</button><button class="pbtn alt" data-act="del-no">Keep account</button></div></div>`:`<button class="pbtn warn" data-act="del-ask">Delete account</button>`}</div>`;
}
function runAttack(id){
  clearAuthT();clearCall();closeSheet();
  if(id==='flood'){
    const n='+27825550143';const c=state.community[n]||(state.community[n]={reports:0,weighted:0,type:'Reported by users'});
    if(c.weighted==null)c.weighted=c.reports;c.reports+=20;c.weighted+=0.6;save();
    plog('20 new accounts report Mom’s number as a scam','Limited','Accounts under 7 days old from 2 linked phones: 20 reports count as 0.6 in total, below the threshold of 3. Mom’s number is not flagged.');
    renderAll();toast(state.session?'20 fake reports counted as 0.6. Try “Real call from Mom”':'20 fake reports counted as 0.6');return;
  }
  if(state.session){state.session=null;save();toast('Logged out to show the attack')}
  state.screen='home';state.editName=false;state.delAsk=false;
  const base={fn:'Sipho',ln:'Ndlovu',em:'',priv:true,age:true};
  const reg=f=>{goAuth('reg');submitRegister(f)};
  switch(id){
    case 'dup': reg({...base,num:'082 555 0143'});break;
    case 'voip': reg({...base,num:'087 555 2201'});break;
    case 'many': state.deviceCount=Math.max(state.deviceCount,MAX_PER_PHONE);save();reg({...base,num:'074 555 3390'});break;
    case 'name': reg({...base,num:'074 555 3390',fn:'Ubuntu Bank',ln:'Fraud Dept'});break;
    case 'bot': state.flags.bot=true;reg({...base,num:'074 555 3392'});break;
    case 'swap': reg({...base,num:'071 555 0666',fn:'Lindiwe',ln:'Khumalo'});break;
    case 'takeover': if(!state.accounts.some(a=>a.num===DEMO_NUM)) state.accounts.push({...SEED_ACCOUNTS[0]});
      state.flags.newDevice=true;goAuth('login',{prefill:'072 555 0111'});submitLogin('072 555 0111');break;
  }
  renderProt();
}

/* ---------- protection features ---------- */
function eventText(ev){return [ev.subject,ev.text||(ev.transcript||[]).join(' ')].filter(Boolean).join(' — ')}
function okRow(ok,label){return `<div class="okrow ${ok?'ok':'bad'}">${ic(ok?'check':'alert',14)}<span>${label}</span></div>`}

// Scam waves: scams many users reported this week
function wavesCard(){
  if(!state.waves.length) return '';
  return `<div class="sec-t"><span>Scam alerts this week</span></div><div class="waves">${state.waves.map(w=>`<div class="wave"><span class="wave-i">${ic('alert',16)}</span><span><b>${esc(w.name)}</b><small>${nfmt(w.reports)} reports · ${w.days?`first seen ${w.days} day${w.days>1?'s':''} ago`:'new today'}</small><span class="wave-tip">${esc(w.tip)}</span></span></div>`).join('')}</div>`;
}
async function startWave(){
  const w=await detector.nextScamWave();if(!w){toast('The server sends scam alerts on its own.');return}
  if(!state.waves.some(x=>x.id===w.id)) state.waves.unshift(w);
  renderApp();
  notifyRaw('TriGuard · New scam going around',`${w.name}. ${w.tip}`,'alert',()=>{state.screen='home';renderApp();$('#appbody').scrollTop=0});
  seriesTimers.push(setTimeout(()=>deliver({channel:'sms',from:'+27615553390',text:'Load-shedding refund: you qualify for R850 electricity compensation. Claim today at power-refund-claim.co.za before it expires.'}),3200));
}

// Images: QR codes are decoded on the phone (real); text reading and editing checks come from the backend
async function decodeQR(url){
  try{
    const img=await new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=url});
    const scale=Math.min(1,1200/Math.max(img.width,img.height));const w=Math.round(img.width*scale),h=Math.round(img.height*scale);
    const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');g.drawImage(img,0,0,w,h);
    const code=jsQR(g.getImageData(0,0,w,h).data,w,h);return code&&code.data?code.data:null;
  }catch(e){return null}
}
function bindImageUpload(){
  const el=$('#upImage');if(!el) return;
  el.addEventListener('change',async()=>{
    const f=el.files[0];if(!f) return;let url='';try{url=URL.createObjectURL(f)}catch(e){}
    state.imgPending={name:f.name,size:f.size,url,file:f,qr:null,decoding:true};renderApp();
    const qr=await decodeQR(url);
    if(state.imgPending&&state.imgPending.url===url){state.imgPending.qr=qr;state.imgPending.decoding=false;renderApp()}
  });
}
function imagePendingBox(){
  const Pd=state.imgPending;if(!Pd) return '';
  return `<div class="pending"><div class="pending-h">${ic('image',16)}<b>${esc(Pd.name)}</b><span class="fine">${(Pd.size/1024/1024).toFixed(1)} MB</span></div>
    ${Pd.url?`<img class="up-img" src="${Pd.url}" alt="Preview of the image">`:''}
    <div class="qr-line">${ic('link',14)} ${Pd.decoding?'Looking for a QR code…':Pd.qr?`QR code found: <b>${esc(Pd.qr)}</b>`:'No QR code found.'}</div>
    <input class="pin" id="iFrom" placeholder="Who sent it? Number (optional)" inputmode="tel">
    <textarea class="pta" id="iText" placeholder="Type the text in the image (optional). In the full app it’s read for you."></textarea>
    <div class="prow"><button class="pbtn" data-act="check-image" ${Pd.decoding?'disabled':''}>Check image</button><button class="pbtn alt" data-act="clear-image" style="flex:0 0 auto">Remove</button></div>
    <p class="fine">Demo: the QR code is really decoded. The editing check is simulated: file names with “slip”, “pop” or “payment” look edited.</p></div>`;
}
function checkImage(){
  const Pd=state.imgPending;if(!Pd) return;
  const from=$('#iFrom').value.trim(),text=$('#iText').value.trim();
  const ev={channel:'image',uploaded:true,fileName:Pd.name,mediaUrl:Pd.url,from:normalize(from)?from:undefined,text,qrUrl:Pd.qr||undefined};
  state.imgPending=null;runUpload(ev,{file:Pd.file,name:Pd.name,size:Pd.size,image:true});
}

// Bank account verification
function acctResultHTML(r){
  if(!r) return '';
  const verdict=r.nameMatch?`The account is in the name of ${esc(r.holder)}.`:`Don’t pay. This account is not in the name of ${esc(r.holder)}.`;
  return `<div class="acct-res ${r.nameMatch?'ok':'bad'}"><b>${verdict}</b>${okRow(r.exists,'Account exists and is open')}${okRow(r.nameMatch,'Name matches the account holder')}${okRow(r.olderThan3Months,'Account open for more than 3 months')}
    <small>From the bank’s account verification service (simulated in the demo).</small></div>`;
}

// Data breach check
function breachHTML(){
  const b=state.breaches;if(b==null) return '';
  if(!b.length) return `<div class="acct-res ok"><b>Not found in any known breach.</b><small>Simulated result. Stay alert anyway: new breaches are found all the time.</small></div>`;
  return `<div class="acct-res bad"><b>Found in ${b.length} data breach${b.length>1?'es':''}</b>${b.map(x=>`<div class="breach"><b>${esc(x.name)}</b> <span class="fine">${esc(x.date)}</span><small>Leaked: ${x.data.map(esc).join(', ')}</small></div>`).join('')}
    <ol class="steps"><li>Change your password on these sites, and anywhere you used the same one.</li><li>Turn on two-step verification for your email and banking.</li><li>Expect scams that use your real name, number or address. Real companies still never ask for OTPs.</li></ol>
    <small>Simulated result with fictional companies. The full app checks a breach-notification service.</small></div>`;
}

// "Is it really you?": ask the contact in their own TriGuard app, plus the family safe word
function verifyStatusHTML(){
  if(!call) return '';
  const v=call.verify,sw=call.ev.safeWord;let out='';
  if(v){
    if(v.status==='pending') out+=`<div class="vstat wait"><span class="spin"></span><span>Waiting for ${esc(v.contact)} to answer in their TriGuard app…</span></div>`;
    else if(v.status==='yes') out+=`<div class="vstat ok">${ic('check',16)}<span><b>${esc(v.contact)}: “Yes, it’s me.”</b> Confirmed in their own app.</span></div>`;
    else if(v.status==='no') out+=`<div class="vstat bad">${ic('alert',16)}<span><b>${esc(v.contact)}: “No, that’s not me.”</b> End the call.</span></div>`;
    else if(v.status==='not-user') out+=`<div class="vstat">${ic('people',16)}<span>${esc(v.contact)} isn’t on TriGuard. Call them back on their saved number instead.</span></div>`;
    else out+=`<div class="vstat">${ic('people',16)}<span>${esc(v.contact)} didn’t answer. Call them back on their saved number.</span></div>`;
  }
  if(sw==='pass') out+=`<div class="vstat ok">${ic('key',16)}<span>The caller knew your family safe word.</span></div>`;
  if(sw==='fail') out+=`<div class="vstat bad">${ic('key',16)}<span>The caller didn’t know your family safe word.</span></div>`;
  return out;
}
function openVerify(){
  if(!call) return;
  const callerNum=normalize(call.ev.from);
  const people=state.trusted.slice().sort((a,b)=>(b.num===callerNum)-(a.num===callerNum));
  const v=call.verify;
  $('#sheetLayer').innerHTML=`<div class="sheet-layer" data-act="sheet-bg"><div class="sheet" role="dialog" aria-label="Is it really you?" id="verifySheet">
    <div class="grab"></div><div class="sh-top"><span>While the call continues</span><button class="x" data-act="close-sheet" aria-label="Close">×</button></div>
    <div class="risk-hero off"><span class="lv" style="font-size:22px">Is it really you?</span><span style="font-size:12.5px;color:var(--ph-muted)">TriGuard asks the person in their own TriGuard app, on their own phone. A scammer can copy a voice or even a phone number, but not their unlocked app.</span></div>
    ${verifyStatusHTML()}
    ${v&&v.status==='pending'?'':`<div class="sh-h">Ask a contact</div><div class="cb-list">${people.map(x=>`<div class="cb"><span class="ico low">${esc(initials(x.name))}</span><span style="min-width:0"><b style="display:block">${esc(x.name)}${x.num===callerNum?' <span class="chip off nodot">calling now</span>':''}</b><span class="mono" style="font-size:12px;color:var(--ph-muted)">${fmt(x.num)}</span></span><button class="pbtn" data-act="verify-ask" data-num="${x.num}">Ask</button></div>`).join('')}</div>
      <p class="fine" style="margin-top:6px">If the caller says they’re someone who isn’t in your contacts, ask a family member who would know.</p>`}
    <div class="sh-h">Family safe word</div>
    ${state.safeWord?`<p class="fine" style="font-size:12.5px;margin:0 0 8px">Ask the caller for your family safe word. Don’t say it first.</p>
      <div class="prow"><button class="pbtn alt" data-act="sw-answer" data-v="pass">They said it correctly</button><button class="pbtn warn" data-act="sw-answer" data-v="fail">Wrong, or they didn’t know</button></div>`
      :`<p class="fine" style="font-size:12.5px;margin:0">You haven’t set a family safe word yet. Set one in your profile and share it with your family in person.</p>`}
    <div class="acts"><button class="pbtn alt wide" data-act="close-sheet">Back to call</button></div>
  </div></div>`;
  $('#sheetLayer').hidden=false;
}
function askVerify(num){
  if(!call) return;
  const contact=state.trusted.find(x=>x.num===num);if(!contact) return;
  call.verify={contact:contact.name,num,status:'pending'};
  reanalyzeCall();openVerify();
  const c=call;
  detector.verifyContact({contactNumber:num,callerNumber:normalize(c.ev.from),isUser:state.accounts.some(a=>a.num===num),simTruth:c.ev.simTruth})
    .then(r=>{
      if(call!==c) return;
      c.verify.status=r.answer;
      if(r.answer==='yes'||r.answer==='no') c.ev.verification={contact:contact.name,answer:r.answer};
      reanalyzeCall();if($('#verifySheet')) openVerify();
      toast(r.answer==='no'?`${contact.name} says it’s not them`:r.answer==='yes'?`${contact.name} confirmed it’s them`:`${contact.name} can’t be asked in the app`);
    }).catch(e=>{if(call===c){c.verify.status='expired';reanalyzeCall()}toast(e.message)});
}

// Guardian alerts: a chosen family member is told when the user stays on a High-risk call
function checkGuardian(){
  if(!call||call.guardianSent||!call.res||call.res.level!=='high'||!state.guardian||!state.guardianOn||call.secs<8) return;
  call.guardianSent=true;const g=state.guardian,c=call;
  detector.alertGuardian({guardianNumber:g.num,reason:c.res.label}).then(()=>{
    plog(`Guardian alert sent to ${g.name}`,'Sent',`${(acct()||{}).first||'The user'} stayed on a High-risk call (${c.res.label}). The demo waits 8 seconds; the real app waits about 2 minutes.`);
    const gs=$('#guardSlot');if(gs&&call===c) gs.innerHTML=`<div class="vstat">${ic('people',16)}<span>${esc(g.name)} has been alerted and may phone you.</span></div>`;
  }).catch(e=>toast(e.message));
}

// Video liveness challenge
function runLiveness(){
  if(!call||call.ev.channel!=='video'||call.liveBusy) return;
  call.liveBusy=true;const c=call;
  const box=$('#liveChk'),vc=document.querySelector('.vcall'),btn=$('#liveBtn');
  if(btn) btn.disabled=true;
  if(box){box.hidden=false;box.innerHTML=`<b>Liveness check</b><ol><li>Ask them to turn their head to the side.</li><li>Ask them to wave a hand slowly in front of their face.</li></ol><span class="spin"></span>`}
  if(vc) vc.classList.add('challenge');
  detector.livenessCheck({faceScore:c.ev.faceScore,callId:null}).then(r=>{
    if(call!==c) return;
    c.liveBusy=false;c.ev.liveness=r.result;if(vc) vc.classList.remove('challenge');
    if(box) box.innerHTML=`<b class="${r.result==='fail'?'lc-bad':'lc-ok'}">${r.result==='fail'?'Liveness check failed':'Liveness check passed'}</b><ul>${r.evidence.map(x=>`<li>${esc(x)}</li>`).join('')}</ul><button class="mini" data-act="liveness-close">OK</button>`;
    reanalyzeCall();
  }).catch(e=>{c.liveBusy=false;if(vc) vc.classList.remove('challenge');if(box) box.hidden=true;toast(e.message)});
}

// "I've been scammed": recovery checklist and evidence pack
const EM_STEPS=[
  ['bank','Call your bank’s fraud line now','Use the number on the back of your card or in your banking app, never one from the scam. Ask them to stop the payment.'],
  ['block','Block your cards and banking app','The bank can do it on the same call, or use “block card” in your banking app.'],
  ['passwords','Change your banking and email passwords','Use a different device if your phone may have been tampered with. Don’t reuse old passwords.'],
  ['safps','Apply for protective registration with SAFPS','It’s free and stops criminals opening accounts or loans in your name. Find it at safps.org.za.'],
  ['saps','Open a case at your nearest police station','Take your evidence pack and ask for a case number, which your bank will need. In an emergency, call 10111.'],
  ['report','Report the scam in TriGuard','Your report warns other people who get the same message.']
];
const EM_SIM_STEP=['network','Call your mobile network from another phone','Ask them to stop the SIM swap and give your number back. Then call your bank, because your number may be used to get bank codes.'];
function emSteps(){return state.emergency&&state.emergency.reason==='simswap'?[EM_SIM_STEP,...EM_STEPS]:EM_STEPS}
function openEmergency(reason){
  if(!state.emergency) state.emergency={reason:reason||'scam',done:{},started:new Date().toISOString()};
  else if(reason==='simswap') state.emergency.reason='simswap';
  save();
  const steps=emSteps(),done=state.emergency.done,n=steps.filter(([k])=>done[k]).length;
  const bankLine=state.trusted.find(x=>x.org==='bank');
  $('#sheetLayer').innerHTML=`<div class="sheet-layer" data-act="sheet-bg"><div class="sheet" role="dialog" aria-label="Emergency help">
    <div class="grab"></div><div class="sh-top"><span>${n} of ${steps.length} done</span><button class="x" data-act="close-sheet" aria-label="Close">×</button></div>
    <div class="risk-hero high"><span class="lv" style="font-size:22px">Act now, step by step</span><span style="font-size:12.5px">The first hour matters most. Banks can sometimes stop a payment if you call quickly.</span></div>
    <ol class="em-list">${steps.map(([k,title,body],i)=>`<li class="${done[k]?'done':''}"><button class="em-chk" data-act="em-step" data-k="${k}" aria-pressed="${!!done[k]}" aria-label="Mark step ${i+1} done">${done[k]?ic('check',14):i+1}</button><span><b>${title}</b><small>${body}</small>
      ${k==='bank'&&bankLine?`<button class="pbtn" style="margin-top:6px" data-act="call-trusted" data-i="${state.trusted.indexOf(bankLine)}">Call ${esc(bankLine.name)}</button>`:''}</span></li>`).join('')}</ol>
    <div class="acts"><button class="pbtn wide" data-act="em-pack">${ic('upload',16)} Download evidence pack</button><button class="pbtn alt" data-act="close-sheet">Close</button><button class="pbtn alt" data-act="em-end">I’m done</button></div>
    <p class="never">The evidence pack lists the risky calls and messages TriGuard saw, with numbers, times and what was said. Give it to your bank and the police.</p>
  </div></div>`;
  $('#sheetLayer').hidden=false;
}
function evidencePack(){
  const me=acct(),items=state.events.filter(e=>!e.example&&e.res&&e.res.level!=='low');
  const row=it=>`<tr><td>${esc(it.time)}</td><td>${esc(CH[it.ev.channel].label)}</td><td>${esc(senderName(it.ev))}<br><small>${esc(senderSub(it.ev)||'')}</small></td><td>${esc(eventText(it.ev))}</td><td><b>${esc(LV[it.res.level])}</b> (${it.res.score}/100)<br>${esc(it.res.label)}<ul>${it.res.signals.map(s=>`<li>${esc(s.text)}</li>`).join('')}</ul></td></tr>`;
  const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>TriGuard evidence pack</title>
<style>body{font:14px/1.5 system-ui,sans-serif;margin:32px;color:#13201C}h1{font-size:22px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #c9d4cf;padding:8px;vertical-align:top;text-align:left}th{background:#f1f4f3}small{color:#56675f}</style></head><body>
<h1>TriGuard evidence pack</h1>
<p>Prepared ${esc(new Date().toLocaleString('en-ZA'))} for ${me?esc(me.first+' '+me.last)+' ('+esc(fmt(me.num))+')':'the account holder'}.<br>Generated from what TriGuard recorded on this phone. Times are local to the phone.</p>
<h2>Risky calls and messages (${items.length})</h2>
${items.length?`<table><tr><th>Time</th><th>Type</th><th>From</th><th>What was said</th><th>TriGuard’s assessment</th></tr>${items.map(row).join('')}</table>`:'<p>No High or Medium risk events were recorded on this phone.</p>'}
<h2>Steps taken</h2><ul>${emSteps().map(([k,title])=>`<li>${state.emergency&&state.emergency.done[k]?'Done':'Not yet'}: ${esc(title)}</li>`).join('')}</ul>
<p><small>TriGuard is a warning tool. Its assessments are not proof on their own; banks and SAPS will investigate.</small></p></body></html>`;
  const url=URL.createObjectURL(new Blob([html],{type:'text/html'}));
  const a=document.createElement('a');a.href=url;a.download=`TriGuard-evidence-${todayStr()}.html`;document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),4000);
  toast('Evidence pack downloaded');
}

// The user's own SIM is swapped
function ownSimSwap(){
  if(!state.simAlerts){toast('SIM-swap alerts are off in your profile');return}
  const me=acct();
  plog(`SIM swap on ${me?fmt(me.num):'the user’s number'}`,'Held','The mobile network reported a SIM change. TriGuard alerted the user and held account changes for 24 hours.');
  notifyRaw('TriGuard · Your SIM was just swapped','If this wasn’t you, tap now. Your number may be used to get bank codes.','alert',openSimSwapSheet);
  seriesTimers.push(setTimeout(openSimSwapSheet,1600));
}
function openSimSwapSheet(){
  const me=acct();
  $('#sheetLayer').innerHTML=`<div class="sheet-layer" data-act="sheet-bg"><div class="sheet" role="dialog" aria-label="SIM swap alert">
    <div class="grab"></div><div class="sh-top"><span>SIM-swap alert · ${nowT()}</span><button class="x" data-act="close-sheet" aria-label="Close">×</button></div>
    <div class="risk-hero high"><span class="lv" style="font-size:22px">Your SIM was swapped</span><span style="font-size:12.5px">Your mobile network reported that the SIM for ${me?fmt(me.num):'your number'} was changed 2 minutes ago. Did you do this?</span></div>
    <p style="font-size:13px;line-height:1.45;margin:0 0 6px">If it wasn’t you, someone may be trying to take over your number to receive your bank’s codes. Act now: this phone will lose signal soon.</p>
    <div class="acts"><button class="pbtn warn wide" data-act="simswap-no">No, it wasn’t me</button><button class="pbtn alt wide" data-act="simswap-yes">Yes, I changed my SIM</button></div>
  </div></div>`;
  $('#sheetLayer').hidden=false;
}

// Feedback and the human review queue
function sendFeedback(it,v){
  it.feedback=v;
  if(v!=='right') state.feedback.unshift({id:uid++,at:nowT(),userSays:v,level:it.res?it.res.level:null,label:it.res?it.res.label:'',channel:it.ev.channel,sender:senderName(it.ev),text:eventText(it.ev),ev:it.ev,status:'open'});
  detector.sendFeedback({eventId:it.id,level:it.res?it.res.level:null,userSays:v,channel:it.ev.channel,text:eventText(it.ev)}).catch(()=>{});
  renderReview();showCard(it,false);
  toast(v==='right'?'Thanks for confirming':'Thanks. A person will review this');
}
function testCase(f){
  const ev={channel:f.ev.channel};
  ['from','fromName','fromAddr','subject','msgType'].forEach(k=>{if(f.ev[k]) ev[k]=f.ev[k]});
  ev.text=f.text;
  return f.userSays==='missed'?`// add to SCAMS\n{ min: 'medium', ev: ${JSON.stringify(ev)} },`:`// add to GENUINE\n${JSON.stringify(ev)},`;
}
function renderReview(){
  const el=$('#reviewList');if(!el) return;
  if(!state.feedback.length){el.innerHTML='<p class="empty">No feedback yet. On the phone, open any result and answer “Was TriGuard right?”.</p>';return}
  el.innerHTML=state.feedback.map(f=>`<div class="rv">
    <div class="rv-h"><span class="mono">${esc(f.at)}</span><span>${esc(CH[f.channel].label)} from ${esc(f.sender)}</span></div>
    <p class="rv-t">${esc(f.text||'(no text)')}</p>
    <div class="rv-v"><span>TriGuard said <b class="lvl-${f.level}">${f.level?esc(LV[f.level]):'not checked'}</b>${f.label?` · ${esc(f.label)}`:''}</span><span>User says <b>${f.userSays==='not-scam'?'it’s not a scam':'it is a scam'}</b></span></div>
    ${f.status==='open'?`<div class="row-btns"><button class="btn" type="button" data-act="rv" data-id="${f.id}" data-v="user">User is right</button><button class="btn ghost" type="button" data-act="rv" data-id="${f.id}" data-v="engine">TriGuard is right</button></div>`
      :f.status==='user'?`<p class="rv-ok">Confirmed. Add this test case to <span class="mono">src/engine/__tests__/corpus.test.js</span>, then change the rules until it passes:</p><pre class="rv-code">${esc(testCase(f))}</pre>`
      :'<p class="rv-ok">Kept TriGuard’s verdict. No change needed.</p>'}
  </div>`).join('');
}

// TriGuard on WhatsApp (simulated chatbot using the same engine)
const BOT_SAMPLES=['Your SIM card will be blocked today. Confirm your RICA details at bit.ly/rica-za-update to keep your number.','Hi Ma, it’s me. My phone broke, this is my new number. Please send R1500 urgently, I’ll explain later.','Your parcel will be delivered today between 9:00 and 13:00.'];
function botReplyHTML(r){
  const tag=r.level==='high'?'🔴 HIGH RISK':r.level==='medium'?'🟠 MEDIUM RISK':'🟢 LOW RISK';
  const why=r.signals.slice(0,3).map(s=>`• ${esc(s.text)}`).join('<br>');
  return `<b>${tag}</b> · ${esc(r.label)}${why?`<br><br><b>Why:</b><br>${why}`:''}<br><br><b>What to do:</b><br>${r.tips.slice(0,2).map(x=>`• ${esc(x)}`).join('<br>')}<br><br><i>Reply HELP if you already paid or shared a code. TriGuard never says a message is safe.</i>`;
}
function renderBot(){
  const th=$('#botThread');if(!th) return;
  const msgs=[{from:'bot',html:'Hi! Forward or paste any message you’re unsure about and I’ll check it. I will never ask for your OTP, PIN or passwords.'},...state.botMsgs];
  th.innerHTML=msgs.map(m=>`<div class="wa-b ${m.from==='you'?'you':'bot'}">${m.html||esc(m.text)}</div>`).join('')+(state.botBusy?'<div class="wa-b bot typing"><span></span><span></span><span></span></div>':'');
  th.scrollTop=th.scrollHeight;
  const sm=$('#botSamples');if(sm) sm.innerHTML=BOT_SAMPLES.map((s,i)=>`<button class="ai-chip wa-chip" type="button" data-act="bot-sample" data-i="${i}">${esc(s.slice(0,48))}…</button>`).join('');
}
async function sendBot(text){
  text=String(text||'').trim();if(!text||state.botBusy) return;
  state.botMsgs.push({from:'you',text});state.botBusy=true;renderBot();
  let html;
  if(/^help$/i.test(text)) html='<b>Act now:</b><br>1. Call your bank’s fraud line (number on the back of your card).<br>2. Block your cards and banking app.<br>3. Change your passwords.<br>4. Apply for protective registration at safps.org.za.<br>5. Open a case at your nearest police station.';
  else{try{html=botReplyHTML(await detector.checkEvent({channel:'message',msgType:'whatsapp',text},engineCtx))}catch(e){html=esc(e.message)}}
  await new Promise(r=>seriesTimers.push(setTimeout(r,500)));
  state.botMsgs.push({from:'bot',html});state.botBusy=false;renderBot();
}

/* ---------- AI sheet ---------- */
let aiTimers=[],aiCtx=null;
function clearAI(){aiTimers.forEach(clearTimeout);aiTimers=[]}
function openAI(ctx){
  clearAI();aiCtx=ctx;
  const {ev,res,itemId}=ctx;
  const chName={call:'call',video:'video call',sms:'message',email:'email'}[ev.channel]||'message';
  const q=res?`Why is this ${chName} ${LV[res.level].toLowerCase()}?`:`Why wasn’t this ${chName} checked?`;
  $('#sheetLayer').innerHTML=`<div class="sheet-layer" data-act="sheet-bg"><div class="sheet" role="dialog" aria-label="TriGuard AI explanation">
    <div class="grab"></div>
    <div class="sh-top">${itemId?`<button class="mini" data-act="open" data-id="${itemId}">‹ Back</button>`:(ctx.live?`<button class="mini" data-act="card-live">‹ Back</button>`:'<span></span>')}<button class="x" data-act="close-sheet" aria-label="Close">×</button></div>
    <div class="ai-head"><span class="ai-av big">${ic('spark',20)}</span><span><b>TriGuard AI</b><small>Explains the risk in plain language · simulated</small></span></div>
    <div class="ai-thread" id="aiThread"><div class="ai-u">${esc(q)}</div></div>
    <div class="ai-chips" id="aiChips" hidden>${res?Object.entries(FOLLOW).map(([k,f])=>`<button class="ai-chip" data-act="ai-follow" data-k="${k}">${esc(f.q)}</button>`).join(''):''}</div>
    <p class="never">This AI explanation is simulated for the demo. It is written from the signals the detection engine found. TriGuard never marks anything as safe.</p>
  </div></div>`;
  $('#sheetLayer').hidden=false;
  const bubbles=res?aiBubbles(ev,res):['<p>Protection for this channel is switched off on the phone, so TriGuard didn’t check it. Switch it back on from the Home screen.</p>'];
  stream(bubbles,()=>{const c=$('#aiChips');if(c) c.hidden=false});
}
function stream(bubbles,done){
  const th=$('#aiThread');if(!th) return;
  const reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  let i=0;
  const next=()=>{
    if(!$('#aiThread')) return;
    if(i>=bubbles.length){done&&done();return}
    const el=document.createElement('div');el.className='ai-b typing';el.innerHTML='<span></span><span></span><span></span>';th.appendChild(el);scrollAI();
    aiTimers.push(setTimeout(()=>{el.className='ai-b';el.innerHTML=bubbles[i++];scrollAI();aiTimers.push(setTimeout(next,reduce?0:350))},reduce?0:(i===0?900:650)));
  };
  next();
}
function scrollAI(){const sh=document.querySelector('#sheetLayer .sheet');if(sh) sh.scrollTop=sh.scrollHeight}

/* ---------- desk ---------- */
let seriesTimers=[];
function renderScenarios(){
  $('#scenarios').innerHTML=GROUPS.map(([g,name])=>`<div class="scn-group"><h3>${name}</h3><div class="scn-grid">${SCENARIOS.filter(s=>s.g===g).map(s=>{const ch=s.special?'call':(s.ev||s.multi[0]).channel;return `<button class="scn" type="button" data-act="scenario" data-id="${s.id}"><span class="ci">${ic(CH[ch].icon,16)}</span><span class="ch">${CH[ch].label}<em class="truth ${s.real?'real':'fake'}">${s.real?'Real':'Scam'}</em></span><b>${esc(s.title)}</b><small style="grid-column:2">${esc(s.sub)}</small></button>`}).join('')}</div></div>`).join('');
}
function runScenario(id){
  const s=SCENARIOS.find(x=>x.id===id);if(!s) return;
  if(!state.session){toast('Create an account or use the demo account first');return}
  if(s.multi){closeSheet();s.multi.forEach((m,i)=>seriesTimers.push(setTimeout(()=>deliver(JSON.parse(JSON.stringify(m))),i*1800)));return}
  if(s.special==='wave'){closeSheet();startWave();return}
  if(s.special==='simswap-me'){clearCall();closeSheet();ownSimSwap();return}
  let ev;
  if(s.special==='uploaded'){
    let target=state.userList.find(u=>u.label==='scam');
    if(!target){importText(SAMPLE_CSV,'scam');target=state.userList.find(u=>u.label==='scam');toast('Sample list uploaded first');}
    ev={channel:'call',from:target.num,transcript:['Hello, good news! You qualify for a pre-approved loan of R50,000.','We just need a R499 admin fee paid today to release it.'],voiceScore:.3};
  } else ev=JSON.parse(JSON.stringify(s.ev));
  // Demo only: lets the simulated contact answer "Is it really you?" truthfully. A real backend never knows this.
  ev.simTruth=s.real;
  if(ev.channel==='call'||ev.channel==='video') startCall(ev); else {closeSheet();deliver(ev)}
}
function syncCustom(){
  const c=$('#cChannel').value;
  document.querySelectorAll('[data-for="email"]').forEach(e=>e.hidden=c!=='email');
  document.querySelectorAll('[data-for="voice"]').forEach(e=>e.hidden=!(c==='call'||c==='video'));
  document.querySelectorAll('[data-for="phone"]').forEach(e=>e.hidden=c==='email');
  $('#cFromLab').textContent=c==='email'?'From address':'From number';
  $('#cTextLab').textContent=c==='call'||c==='video'?'What the caller says':'Message';
  $('#cScoreLab').firstChild.textContent=c==='video'?'Simulated deepfake face score: ':'Simulated AI voice score: ';
  const from=$('#cFrom');
  if(c==='email'&&!from.value.includes('@')) from.value='alerts@ubuntu-bank-secure.com';
  if(c!=='email'&&from.value.includes('@')) from.value='072 555 3108';
}
$('#cChannel').addEventListener('change',syncCustom,{signal});
$('#cScore').addEventListener('input',e=>$('#cScoreVal').textContent=e.target.value+'%',{signal});
$('#customForm').addEventListener('submit',e=>{
  e.preventDefault();const err=$('#cErr');err.textContent='';
  if(!state.session){err.textContent='Sign in on the phone first, or use the demo account.';return}
  const c=$('#cChannel').value,from=$('#cFrom').value.trim(),text=$('#cText').value.trim();
  if(c==='email'){
    if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(from)){err.textContent='Enter an email address, like name@example.co.za.';return}
    const att=$('#cAttach').value.trim();const fail=$('#cAuthFail').checked;
    deliver({channel:'email',fromName:$('#cName').value.trim()||from,fromAddr:from,replyTo:$('#cReply').value.trim()||undefined,subject:$('#cSubject').value.trim()||'(no subject)',text,auth:fail?{spf:'fail',dkim:'none',dmarc:'fail'}:{spf:'pass',dkim:'pass',dmarc:'pass'},attachments:att?[att]:[]});
    closeSheet();return;
  }
  if(!normalize(from)){err.textContent='Enter a phone number like 082 555 0143 or +27 82 555 0143.';return}
  const simSwap=$('#cSimSwap').checked?{hoursAgo:2}:undefined;
  if(c==='sms'){closeSheet();deliver({channel:'sms',from,text,simSwap});return}
  const score=Number($('#cScore').value)/100;
  const lines=text?text.split(/(?<=[.!?])\s+/).filter(Boolean):[];
  const ev={channel:c,from,transcript:lines,simSwap,simTruth:score<.4&&!simSwap};
  if(c==='video'){ev.faceScore=score;ev.lipsync=score>=.7}else ev.voiceScore=score;
  if(!lines.length) ev.transcript=['Hello?','Can you hear me?'];
  startCall(ev);
},{signal});

/* ---------- click handling ---------- */
document.addEventListener('click',e=>{
  const a=e.target.closest('[data-act]');if(!a) return;
  const act=a.dataset.act;
  if(act==='sheet-bg'&&e.target!==a) return;
  switch(act){
    case 'nav': state.screen=a.dataset.k;state.unseen[a.dataset.k]=0;renderApp();$('#appbody').scrollTop=0;break;
    case 'scenario': runScenario(a.dataset.id);break;
    case 'open': openSheet(Number(a.dataset.id));break;
    case 'notif': $('#notif').classList.remove('show');if(notifAction){notifAction()}else if(notifCode&&$('#otpIn')){$('#otpIn').value=notifCode}else if(notifItem) openSheet(notifItem.id);break;
    case 'verify-open': openVerify();break;
    case 'verify-ask': askVerify(a.dataset.num);break;
    case 'sw-answer': {if(!call) break;call.ev.safeWord=a.dataset.v;reanalyzeCall();openVerify();toast(a.dataset.v==='pass'?'Noted: they knew the safe word':'Noted: they didn’t know the safe word');break}
    case 'liveness': runLiveness();break;
    case 'liveness-close': {const b=$('#liveChk');if(b) b.hidden=true;const lb=$('#liveBtn');if(lb) lb.disabled=false;break}
    case 'emergency': openEmergency();break;
    case 'em-step': {const k=a.dataset.k;state.emergency.done[k]=!state.emergency.done[k];save();openEmergency();break}
    case 'em-pack': evidencePack();break;
    case 'em-end': {state.emergency=null;save();closeSheet();renderApp();toast('Checklist closed. Stay alert for follow-up scams.');break}
    case 'simswap-no': openEmergency('simswap');renderApp();break;
    case 'simswap-yes': closeSheet();toast('Thanks. Nothing else to do.');break;
    case 'sw-save': {const v=$('#swIn').value.trim();if(v.length<4){toast('Use at least 4 characters');break}state.safeWord=v;state.safeWordEdit=false;save();renderApp();toast('Safe word saved on this phone');break}
    case 'sw-edit': state.safeWordEdit=true;renderApp();break;
    case 'sw-clear': state.safeWord='';state.safeWordEdit=false;save();renderApp();toast('Safe word removed');break;
    case 'gd-save': {const num=$('#gdSel').value,on=$('#gdOn').checked,g=state.trusted.find(x=>x.num===num);
      if(num&&!on){toast('Tick the consent box to switch guardian alerts on');break}
      state.guardian=g?{num:g.num,name:g.name}:null;state.guardianOn=!!g&&on;save();renderApp();toast(g?`${g.name} will be alerted on High-risk calls`:'Guardian alerts off');break}
    case 'sim-alerts': state.simAlerts=a.checked;save();toast(a.checked?'SIM-swap alerts on':'SIM-swap alerts off');break;
    case 'breach-check': {const me=acct();if(!me||!me.email) break;state.breachBusy=true;renderApp();
      detector.checkBreaches(me.email).then(list=>{state.breaches=list;state.breachBusy=false;renderApp()}).catch(e=>{state.breachBusy=false;renderApp();toast(e.message)});break}
    case 'check-image': checkImage();break;
    case 'clear-image': {if(state.imgPending&&state.imgPending.url){try{URL.revokeObjectURL(state.imgPending.url)}catch(e){}}state.imgPending=null;renderApp();break}
    case 'check-link': {const url=$('#chkLink').value.trim();if(!url) break;state.linkRes={url,busy:true};renderApp();
      detector.checkLink(url,engineCtx).then(res=>{state.linkRes={url,res};renderApp()}).catch(e=>{state.linkRes=null;renderApp();toast(e.message)});break}
    case 'check-acct': {const d={holder:$('#baName').value.trim(),bank:$('#baBank').value,account:$('#baAcc').value.trim()};
      if(!d.holder||!d.account){toast('Enter the account holder and account number');break}
      state.acctRes={busy:true};renderApp();
      detector.verifyBankAccount(d).then(r=>{state.acctRes={r:{...r,holder:d.holder}};renderApp()}).catch(e=>{state.acctRes=null;renderApp();toast(e.message)});break}
    case 'verify-acct': {const it=state.events.find(x=>x.id===Number(a.dataset.id));if(!it||!it.ev.bankDetails) break;
      a.disabled=true;a.textContent='Asking the bank…';const d=it.ev.bankDetails;
      detector.verifyBankAccount(d).then(async r=>{it.ev.accountCheck={...r,holder:d.holder};it.res=await detector.checkEvent(it.ev,engineCtx);state.last=it;renderAll();showCard(it,false)})
        .catch(e=>{a.disabled=false;a.textContent='Verify this account with the bank';toast(e.message)});break}
    case 'fb': {const it=state.events.find(x=>x.id===Number(a.dataset.id));if(it) sendFeedback(it,a.dataset.v);break}
    case 'rv': {const f=state.feedback.find(x=>x.id===Number(a.dataset.id));if(f){f.status=a.dataset.v;renderReview()}break}
    case 'bot-sample': sendBot(BOT_SAMPLES[Number(a.dataset.i)]);break;
    case 'close-sheet': case 'sheet-bg': closeSheet();break;
    case 'answer': answer();break;
    case 'decline': {const it=finishCall('declined');toast('Call declined and logged');if(it&&it.res&&it.res.level!=='low') openSheet(it.id);break}
    case 'call-block': {const n=normalize(call&&call.ev.from);if(n&&!state.userList.some(u=>u.num===n)){state.userList.push({num:n,label:'scam',note:'Blocked from incoming call'});save()}finishCall('blocked');toast('Number blocked and added to your scam list');renderAll();break}
    case 'hangup': {const it=finishCall('ended');if(it) openSheet(it.id);break}
    case 'hangup-callback': {finishCall(call&&call.phase==='ringing'?'declined':'ended');openCallback();break}
    case 'callback': openCallback();break;
    case 'card-live': openLiveCard();break;
    case 'review-num': {const n=a.dataset.num;plog(`Owner of ${fmt(n)} asked for a review`,'Allowed','POPIA: people can ask for wrong information about them to be corrected, and can challenge automated decisions. The number is checked by a person before the flag stays.');toast('Review requested. A person will check this flag.');break}
    case 'auth-go': goAuth(a.dataset.k);break;
    case 'reg-submit': submitRegister();break;
    case 'login-submit': submitLogin();break;
    case 'sample': runSample(a.dataset.k);break;
    case 'check-file': checkFile();break;
    case 'clear-file': clearPending();renderApp();break;
    case 'check-msg': checkMessage();break;
    case 'demo-login': demoLogin();break;
    case 'logout': {clearAuthT();clearCall();closeSheet();if(state.session){state.session=null;state.auth={step:'welcome'};state.screen='home';save();renderAll();toast('Logged out')}break}
    case 'attack': runAttack(a.dataset.id);break;
    case 'edit-name': state.editName=true;state.profErr='';renderApp();break;
    case 'cancel-name': state.editName=false;state.profErr='';renderApp();break;
    case 'save-name': saveName();break;
    case 'dl-data': toast('Preparing your data file (simulated)');break;
    case 'del-ask': state.delAsk=true;renderApp();break;
    case 'del-no': state.delAsk=false;renderApp();break;
    case 'del-yes': {const me=acct();state.accounts=state.accounts.filter(x=>x!==me);plog(`Account ${fmt(me.num)} deleted by its owner`,'Allowed','Account and its data removed (POPIA). This phone still counts toward the 2-account limit for 30 days.');state.session=null;state.delAsk=false;state.auth={step:'welcome'};save();renderAll();toast('Account deleted');break}
    case 'ai-live': {if(!call) break;const ev=partial(call.ev,call.i);openAI({ev,res:call.res,live:true});break}
    case 'ai-item': {const it=state.events.find(x=>x.id===Number(a.dataset.id));if(it) openAI({ev:it.ev,res:it.res,itemId:it.id});break}
    case 'ai-follow': {if(!aiCtx||!aiCtx.res) break;const f=FOLLOW[a.dataset.k];a.remove();const th=$('#aiThread');th.insertAdjacentHTML('beforeend',`<div class="ai-u">${esc(f.q)}</div>`);scrollAI();stream([`<p>${esc(f.a(aiCtx.res))}</p>`]);break}
    case 'call-trusted': {const tr=state.trusted[Number(a.dataset.i)];closeSheet();toast(`Calling ${tr.name} on ${fmt(tr.num)} (simulated)`);break}
    case 'block': case 'report': case 'trust': {
      const it=state.events.find(x=>x.id===Number(a.dataset.id));const n=it&&normalize(it.ev.from);if(!n) break;
      if(act==='block'){const ex=state.userList.find(u=>u.num===n);if(ex) ex.label='scam';else state.userList.push({num:n,label:'scam',note:'Blocked by you'});state.trusted=state.trusted.filter(x=>x.num!==n);toast('Blocked and added to your scam list')}
      if(act==='report'&&!USE_MOCK){detector.reportNumber({number:n,type:it.res?it.res.type:null,channel:it.ev.channel}).then(()=>toast('Reported. Thanks for protecting others')).catch(e=>toast(e.message))}
      else if(act==='report'){const c=state.community[n]||(state.community[n]={reports:0,weighted:0,type:it.res?it.res.label:'Reported by users'});const me=acct();const w=me&&isNew(me)?0.3:1;if(c.weighted==null)c.weighted=c.reports;c.reports++;c.weighted+=w;if(me)me.reports++;toast(w<1?'Reported. New accounts’ reports count 30% for the first 7 days':`Reported. ${c.reports} users have now reported this number`)}
      if(act==='trust'){if(!state.trusted.some(x=>x.num===n)){state.trusted.push({name:senderName(it.ev)==='Unknown caller'?'Trusted contact':senderName(it.ev),num:n})}state.userList=state.userList.filter(u=>u.num!==n);toast('Added to your trusted numbers')}
      save();closeSheet();renderAll();break}
    case 'block-email': closeSheet();toast('Sender blocked. Future emails go to junk');break;
    case 'report-email': closeSheet();toast('Reported as phishing. Thanks for protecting others');break;
    case 'toggle': {const k=a.dataset.k;state.channels[k]=!state.channels[k];save();renderApp();toast(`${CH[k].label} protection ${state.channels[k]?'on':'off'}`);break}
    case 'seg': state.numTab=a.dataset.k;renderApp();break;
    case 'load-sample': {const o=importText(SAMPLE_CSV,'scam');state.uploadMsg=`Sample list: ${o.added} added, ${o.dup} already listed, ${o.bad} invalid.`;renderApp();break}
    case 'add-paste': {const v=$('#pasteIn').value;if(!v.trim()){state.uploadMsg='Paste at least one number first.';renderApp();break}const o=importText(v,$('#pasteLab').value);state.uploadMsg=`${o.added} added, ${o.dup} already listed, ${o.bad} invalid.`;renderApp();break}
    case 'remove': {const n=a.dataset.num;if(a.dataset.kind==='trusted') state.trusted=state.trusted.filter(x=>x.num!==n);else state.userList=state.userList.filter(u=>u.num!==n);save();renderApp();break}
    case 'check-one': {const n=normalize($('#chkOne').value);
      if(!n){state.checkRes={err:'That is not a valid number. Try 082 555 0143 or +27 82 555 0143.'};renderApp();break}
      detector.checkNumber(n,engineCtx).then(res=>{state.checkRes={num:n,res};renderApp()}).catch(e=>toast(e.message));break}
    case 'check-bulk': {const rows=$('#bulkIn').value.split(/\r?\n/).map(s=>s.trim()).filter(Boolean).map(raw=>({raw,num:normalize(raw)}));
      Promise.all(rows.map(r=>r.num?detector.checkNumber(r.num,engineCtx).then(res=>({...r,res})):{...r,res:null}))
        .then(out=>{state.bulkRes=out;renderApp()}).catch(e=>toast(e.message));break}
    case 'reset': {try{localStorage.removeItem(KEY)}catch(e){}clearCall();closeSheet();
      Object.assign(state,{screen:'home',numTab:'upload',pending:null,analyzing:'',userList:[],trusted:SEED_TRUSTED.map(x=>({...x})),community:JSON.parse(JSON.stringify(SEED_COMMUNITY)),channels:{call:true,video:true,sms:true,email:true},events:[],last:null,uploadMsg:'',checkRes:null,bulkRes:null,unseen:{},accounts:SEED_ACCOUNTS.map(x=>({...x})),session:null,deviceCount:0,auth:{step:'welcome'},protLog:[],flags:{bot:false,newDevice:false},editName:false,profErr:'',delAsk:false,
        ...freshFeatureState()});
      seed();loadWaves();renderAll();renderReview();renderBot();toast('Simulation reset');break}
  }
},{signal});

/* ---------- start ---------- */
function seed(){
  const p=SCENARIOS.find(s=>s.id==='parcel').ev, w=SCENARIOS.find(s=>s.id==='wangiri').ev;
  logEvent(p,analyze(p),'received','09:14',true);
  logEvent(w,analyze(w),'missed','11:02',true);
}
function clock(){$('#clock').textContent=nowT()}
function loadWaves(){detector.getScamWaves().then(w=>{state.waves=w||[];renderApp()}).catch(()=>{})}
$('#botForm').addEventListener('submit',e=>{e.preventDefault();const i=$('#botInput');sendBot(i.value);i.value=''},{signal});
load();seed();loadWaves();renderReview();renderBot();
const shared=new URLSearchParams(location.search);
const sharedText=['title','text','url'].map(k=>shared.get(k)).filter(Boolean).join('\n');
if(sharedText){state.sharedText=sharedText;state.screen='numbers';state.numTab='upload';history.replaceState(null,'',location.pathname)}
const deskLang=$('#deskLang');
deskLang.innerHTML=LANGS.map(([c,n])=>`<option value="${c}">${n}</option>`).join('');
deskLang.addEventListener('change',()=>{setLang(deskLang.value);renderAll()},{signal});
setLang(curLang);
renderScenarios();renderAttacks();syncCustom();renderAll();clock();
const clockId=setInterval(clock,20000);

return ()=>{
  ac.abort();clearInterval(clockId);clearTimeout(toastT);clearTimeout(notifT);seriesTimers.forEach(clearTimeout);
  clearAuthT();clearAI();clearCall();closeSheet();
};
}
