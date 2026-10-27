const {chromium}=require(process.env.PLAYWRIGHT_CORE_PATH || 'playwright-core');
const http=require('http'),fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{const name=decodeURIComponent(req.url.split('?')[0]);const file=path.join(root,name==='/'?'index.html':name);if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}fs.readFile(file,(e,b)=>{if(e){res.writeHead(404);return res.end();}res.setHeader('Content-Type',({'html':'text/html','css':'text/css','js':'application/javascript'})[file.split('.').pop()]||'application/octet-stream');res.end(b);});});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const url=`http://127.0.0.1:${server.address().port}`;
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 try {
 const page=await browser.newPage({viewport:{width:1440,height:1060}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  window.__level=128;window.__requested=0;window.__stopped=0;window.__delay=0;window.__denied=false;
  Object.defineProperty(navigator.mediaDevices,'getUserMedia',{value:async()=>{
   window.__requested++;await new Promise(r=>setTimeout(r,window.__delay));if(window.__denied)throw new DOMException('denied','NotAllowedError');
   const track={enabled:true,muted:false,stop(){window.__stopped++},addEventListener(){}};
   return {getTracks:()=>[track],getAudioTracks:()=>[track]};
  }});
  window.AudioContext=class{constructor(){this.state='running'}resume(){this.state='running';return Promise.resolve()}close(){this.state='closed';return Promise.resolve()}createAnalyser(){return {fftSize:1024,getByteTimeDomainData(b){b.fill(window.__level)}}}createMediaStreamSource(){return {connect(){}}}};
 });
 await page.goto(url);await page.waitForSelector('#demoBtn');
 assert.equal(await page.locator('#durationField').isVisible(),false);
 await page.screenshot({path:path.join(__dirname,'after-desktop.png'),fullPage:true});
 await page.evaluate(()=>{window.__originalTheme=applyTimeTheme;applyTimeTheme=()=>{};document.body.className='morning'});await page.waitForTimeout(650);await page.screenshot({path:path.join(__dirname,'after-day.png'),fullPage:true});
 await page.evaluate(()=>{applyTimeTheme=window.__originalTheme;applyTimeTheme()});await page.locator('#demoBtn').click();await page.waitForTimeout(500);assert.equal(await page.evaluate(()=>window.__requested),0);
 await page.locator('#demoBtn').click();await page.waitForTimeout(650);assert.equal(await page.locator('#fish').evaluate(el=>el.classList.contains('awake')),true);
 assert.equal(await page.locator('#score').textContent(),'0');assert.equal(await page.locator('#noiseEvents').textContent(),'0');
 await page.locator('#stopBtn').click();assert.equal(await page.locator('#resultModal').evaluate(el=>el.classList.contains('show')),true);
 await page.keyboard.press('Escape');assert.equal(await page.locator('#resultModal').evaluate(el=>el.inert),true);
 await page.locator('#mode').selectOption('duration');await page.locator('#duration').fill('0');await page.locator('#startBtn').click();assert.equal(await page.evaluate(()=>window.__requested),0);
 await page.locator('#mode').selectOption('manual');await page.locator('#startBtn').click();await page.waitForTimeout(1150);assert(Number(await page.locator('#score').textContent())>=1);
 await page.evaluate(()=>window.__level=160);await page.waitForTimeout(2100);assert.equal(await page.locator('#noiseEvents').textContent(),'1');assert.equal(await page.locator('#fish').evaluate(el=>el.classList.contains('awake')),true);
 await page.screenshot({path:path.join(__dirname,'after-awake.png'),fullPage:true});
 await page.evaluate(()=>window.__level=128);await page.waitForTimeout(1650);assert.equal(await page.locator('#fish').evaluate(el=>el.classList.contains('awake')),false);
 await page.locator('#stopBtn').click();assert.equal(await page.evaluate(()=>window.__stopped),1);await page.keyboard.press('Escape');
 await page.locator('#resetBtn').click();assert.equal(await page.locator('#score').textContent(),'0');
 await page.evaluate(()=>window.__delay=500);await page.locator('#startBtn').click();await page.locator('#resetBtn').click();await page.waitForTimeout(650);
 assert.equal(await page.locator('#stopBtn').isDisabled(),true);assert.equal(await page.evaluate(()=>window.__stopped),2);
 await page.evaluate(()=>{window.__delay=0;window.__denied=true});await page.locator('#startBtn').click();await page.waitForTimeout(100);assert((await page.locator('#statusText').textContent()).includes('未授权'));assert.equal(await page.locator('#stopBtn').isDisabled(),true);
 await page.evaluate(()=>window.__denied=false);
 // Schedule validation and cross-midnight handling use fixed local dates.
 const plans=await page.evaluate(()=>{
  $('mode').value='scheduled';
  const now=new Date(2026,9,26,12,0).getTime();
  const run=(s,e,n)=>{$('startTime').value=s;$('endTime').value=e;try{return sessionPlan(n)}catch(e){return {error:e.message}}};
  return {future:run('13:00','14:00',now),past:run('10:00','11:00',now),equal:run('12:00','12:00',now),overnight:run('23:00','01:00',new Date(2026,9,26,0,30).getTime()),now};
 });
 assert(plans.future.start>plans.now);assert(plans.past.error);assert(plans.equal.error);assert.equal(plans.overnight.end-plans.overnight.start,30*60000);
 await page.locator('#mode').selectOption('scheduled');
 await page.evaluate(()=>{const n=new Date();n.setMinutes(n.getMinutes()+2);$('startTime').value=`${String(n.getHours()).padStart(2,'0')}:${String(n.getMinutes()).padStart(2,'0')}`;n.setMinutes(n.getMinutes()+2);$('endTime').value=`${String(n.getHours()).padStart(2,'0')}:${String(n.getMinutes()).padStart(2,'0')}`});
 await page.locator('#startBtn').click();await page.waitForTimeout(150);assert.equal(await page.evaluate(()=>state.phase),'scheduled');assert.equal(await page.evaluate(()=>state.stream.getTracks()[0].enabled),false);
 await page.locator('#stopBtn').click();assert.equal(await page.evaluate(()=>state.phase),'idle');
 // Timed end always releases its stream and cannot leave a duplicate loop.
 await page.locator('#mode').selectOption('duration');await page.locator('#duration').fill('1');await page.locator('#startBtn').click();await page.waitForTimeout(100);
 await page.evaluate(()=>state.endAt=Date.now()+150);await page.waitForTimeout(400);assert.equal(await page.evaluate(()=>state.phase),'idle');assert.equal(await page.evaluate(()=>state.stream),null);await page.keyboard.press('Escape');
 await page.locator('#resetBtn').click();await page.locator('#mode').selectOption('manual');
 for(const width of [390,768,1000,1440]){
  await page.setViewportSize({width,height:1000});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`overflow at ${width}`);
  if(width===390)await page.screenshot({path:path.join(__dirname,'after-mobile.png'),fullPage:true});
 }
 await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('#fish').evaluate(el=>getComputedStyle(el).animationName),'none');
 await page.goto(url+'/public/index.html');assert.equal(await page.locator('#demoBtn').count(),1);
 assert.deepEqual(errors,[]);
 console.log('PASS: demo isolation, noise episodes, quiet recovery, microphone cleanup, cancellation during permission, permission denial, duration validation, schedule and midnight boundaries, scheduled cancellation, automatic end, 4 responsive widths, reduced motion, root/public assets, and no page errors.');
 } finally {await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
