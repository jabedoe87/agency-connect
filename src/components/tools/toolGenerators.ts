// Pure HTML generator functions — each returns a self-contained HTML string.
// All tools share a common shell (header + brand color + footer + CTA).

interface ToolConfig {
  bizName: string;
  color: string;
  ctaLink: string;
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function shell(title: string, body: string, cfg: ToolConfig, extraJs = ''): string {
  const safeName = esc(cfg.bizName || 'Your Business');
  const color = cfg.color || '#6366f1';
  const cta = cfg.ctaLink
    ? `<a class="cta" href="${esc(cfg.ctaLink)}" target="_blank" rel="noopener">Get Your Free Consultation →</a>`
    : '';
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${esc(title)} · ${safeName}</title>
<style>
  :root { --brand: ${color}; }
  * { box-sizing: border-box; }
  body { margin:0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background:#f7f7fb; color:#111; }
  .wrap { max-width: 640px; margin: 0 auto; padding: 20px; }
  header { padding: 20px 0; border-bottom: 2px solid var(--brand); margin-bottom: 24px; }
  header h1 { margin: 0; font-size: 22px; color: var(--brand); }
  header p { margin: 4px 0 0; color:#666; font-size: 13px; }
  h2 { font-size: 18px; margin: 24px 0 8px; }
  label { display:block; font-size: 13px; font-weight:600; margin: 14px 0 6px; color:#333; }
  input[type=text], input[type=number], input[type=url], select, textarea {
    width:100%; padding: 10px 12px; font-size: 15px; border:1px solid #ddd; border-radius: 8px; background:#fff;
  }
  input[type=range] { width:100%; accent-color: var(--brand); }
  .row { display:flex; gap:12px; }
  .row > * { flex:1; }
  .val { font-weight:700; color: var(--brand); }
  button.primary, .primary { background: var(--brand); color:#fff; border:0; padding: 12px 18px; border-radius: 10px; font-size:15px; font-weight:600; cursor:pointer; width:100%; }
  .result { margin-top: 20px; padding: 18px; border-radius: 12px; background:#fff; border:1px solid #eee; }
  .result .big { font-size: 28px; font-weight: 800; color: var(--brand); margin: 4px 0 12px; }
  .grid2 { display:grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px; }
  .grid2 div { background:#f0f0f5; padding:10px; border-radius:8px; font-size:13px; }
  .grid2 b { display:block; color: var(--brand); font-size: 16px; }
  .opt { display:block; padding:10px 12px; border:1px solid #ddd; border-radius:8px; margin:6px 0; cursor:pointer; background:#fff; }
  .opt:hover { border-color: var(--brand); }
  .opt input { margin-right: 8px; }
  a.cta { display:block; text-align:center; margin-top: 24px; padding: 14px; background: var(--brand); color:#fff; text-decoration:none; border-radius: 10px; font-weight: 700; }
  footer { margin-top: 32px; padding: 16px 0; text-align:center; font-size: 12px; color:#999; border-top:1px solid #eee; }
  .hidden { display:none; }
  canvas { max-width:100%; }
</style>
</head>
<body>
<div class="wrap">
  <header>
    <h1>${esc(title)}</h1>
    <p>Provided by ${safeName}</p>
  </header>
  ${body}
  ${cta}
  <footer>Built with AgencyOS · ${safeName}</footer>
</div>
<script>${extraJs}</script>
</body>
</html>`;
}

/* ----------------------------- Generators ----------------------------- */

function mortgage(cfg: ToolConfig) {
  return shell('Mortgage Calculator', `
    <label>Home Price (€) <span class="val" id="vP">300,000</span></label>
    <input type="range" id="price" min="50000" max="2000000" step="5000" value="300000"/>
    <label>Down Payment (€) <span class="val" id="vD">60,000</span></label>
    <input type="range" id="down" min="0" max="500000" step="1000" value="60000"/>
    <label>Interest Rate (%) <span class="val" id="vR">4.5</span></label>
    <input type="range" id="rate" min="0.5" max="12" step="0.1" value="4.5"/>
    <label>Loan Term (years) <span class="val" id="vT">30</span></label>
    <input type="range" id="term" min="5" max="40" step="1" value="30"/>
    <div class="result">
      <div>Monthly Payment</div>
      <div class="big" id="rMonthly">€0</div>
      <div class="grid2">
        <div>Loan Amount<b id="rLoan">€0</b></div>
        <div>Total Interest<b id="rInt">€0</b></div>
        <div>Total Paid<b id="rTotal">€0</b></div>
        <div>Term<b id="rTerm">0 yrs</b></div>
      </div>
    </div>
  `, cfg, `
    const f=n=>'€'+Math.round(n).toLocaleString('en-US');
    function calc(){
      const P=+price.value, D=+down.value, R=+rate.value/100/12, T=+term.value*12;
      vP.textContent=(+price.value).toLocaleString(); vD.textContent=(+down.value).toLocaleString();
      vR.textContent=(+rate.value).toFixed(1); vT.textContent=term.value;
      const L=Math.max(0,P-D); const m=R===0?L/T:L*R*Math.pow(1+R,T)/(Math.pow(1+R,T)-1);
      const tot=m*T;
      rMonthly.textContent=f(m||0); rLoan.textContent=f(L); rInt.textContent=f((tot-L)||0);
      rTotal.textContent=f(tot||0); rTerm.textContent=term.value+' yrs';
    }
    ['price','down','rate','term'].forEach(id=>document.getElementById(id).addEventListener('input',calc));
    calc();
  `);
}

function bmi(cfg: ToolConfig) {
  return shell('BMI Calculator', `
    <label>Height (cm) <span class="val" id="vH">175</span></label>
    <input type="range" id="h" min="120" max="220" value="175"/>
    <label>Weight (kg) <span class="val" id="vW">75</span></label>
    <input type="range" id="w" min="30" max="200" value="75"/>
    <div class="result">
      <div>Your BMI</div>
      <div class="big" id="rBmi">0</div>
      <div class="grid2">
        <div>Category<b id="rCat">—</b></div>
        <div>Ideal Weight<b id="rIdeal">—</b></div>
        <div>Daily Calories<b id="rCal">—</b></div>
        <div>Status<b id="rSt">—</b></div>
      </div>
    </div>
  `, cfg, `
    function calc(){
      const H=+h.value/100, W=+w.value; vH.textContent=h.value; vW.textContent=w.value;
      const b=W/(H*H);
      rBmi.textContent=b.toFixed(1);
      let cat='Healthy', st='✓ Good';
      if(b<18.5){cat='Underweight';st='Below range';}
      else if(b<25){cat='Healthy';st='✓ Good';}
      else if(b<30){cat='Overweight';st='Above range';}
      else{cat='Obese';st='High risk';}
      rCat.textContent=cat; rSt.textContent=st;
      const ideal=22*H*H;
      rIdeal.textContent=ideal.toFixed(0)+' kg';
      rCal.textContent=Math.round(W*30)+' kcal';
    }
    h.addEventListener('input',calc); w.addEventListener('input',calc); calc();
  `);
}

function calories(cfg: ToolConfig) {
  return shell('Calorie & Macro Calculator', `
    <label>Goal</label>
    <select id="goal"><option value="-500">Lose Weight</option><option value="0" selected>Maintain</option><option value="500">Gain Muscle</option></select>
    <label>Sex</label>
    <select id="sex"><option value="m">Male</option><option value="f">Female</option></select>
    <div class="row">
      <div><label>Age</label><input type="number" id="age" value="30"/></div>
      <div><label>Weight (kg)</label><input type="number" id="w" value="75"/></div>
      <div><label>Height (cm)</label><input type="number" id="h" value="175"/></div>
    </div>
    <label>Activity</label>
    <select id="act">
      <option value="1.2">Sedentary</option>
      <option value="1.375">Light</option>
      <option value="1.55" selected>Moderate</option>
      <option value="1.725">Very Active</option>
    </select>
    <button class="primary" id="go" style="margin-top:14px">Calculate</button>
    <div class="result hidden" id="res">
      <div>Daily Calories</div>
      <div class="big" id="rCal">0</div>
      <div class="grid2">
        <div>Protein<b id="rP">0g</b></div>
        <div>Carbs<b id="rC">0g</b></div>
        <div>Fat<b id="rF">0g</b></div>
        <div>Goal<b id="rG">—</b></div>
      </div>
    </div>
  `, cfg, `
    go.onclick=()=>{
      const W=+w.value,H=+h.value,A=+age.value,act=+document.getElementById('act').value;
      const sex=document.getElementById('sex').value;
      const bmr = sex==='m' ? 10*W+6.25*H-5*A+5 : 10*W+6.25*H-5*A-161;
      const tdee = bmr*act + +document.getElementById('goal').value;
      rCal.textContent=Math.round(tdee);
      rP.textContent=Math.round(W*2)+'g';
      rF.textContent=Math.round(tdee*0.25/9)+'g';
      rC.textContent=Math.round((tdee - W*2*4 - tdee*0.25)/4)+'g';
      rG.textContent=document.querySelector('#goal option:checked').textContent;
      res.classList.remove('hidden');
    };
  `);
}

function estimate(cfg: ToolConfig) {
  return shell('Project Cost Estimator', `
    <label>Project Type</label>
    <select id="type">
      <option value="80">Kitchen Renovation</option>
      <option value="60">Bathroom Renovation</option>
      <option value="40">Painting</option>
      <option value="120">Full Home</option>
      <option value="30">Flooring</option>
    </select>
    <label>Size (m²) <span class="val" id="vS">25</span></label>
    <input type="range" id="size" min="5" max="300" value="25"/>
    <label>Quality Level</label>
    <select id="q"><option value="0.7">Budget</option><option value="1" selected>Standard</option><option value="1.6">Premium</option></select>
    <button class="primary" id="go" style="margin-top:14px">Estimate</button>
    <div class="result hidden" id="res">
      <div>Estimated Cost</div>
      <div class="big" id="rRange">—</div>
      <div class="grid2">
        <div>Per m²<b id="rPer">—</b></div>
        <div>Duration<b id="rDur">—</b></div>
        <div>Low<b id="rLow">—</b></div>
        <div>High<b id="rHigh">—</b></div>
      </div>
    </div>
  `, cfg, `
    size.oninput=()=>vS.textContent=size.value;
    go.onclick=()=>{
      const base=+document.getElementById('type').value, S=+size.value, q=+document.getElementById('q').value;
      const per=base*q, mid=per*S, low=Math.round(mid*0.85), high=Math.round(mid*1.25);
      const fmt=n=>'€'+n.toLocaleString();
      rRange.textContent=fmt(low)+' – '+fmt(high);
      rPer.textContent=fmt(Math.round(per));
      rDur.textContent=Math.max(1,Math.round(S/8))+' wks';
      rLow.textContent=fmt(low); rHigh.textContent=fmt(high);
      res.classList.remove('hidden');
    };
  `);
}

function goalsetter(cfg: ToolConfig) {
  return shell('SMART Goal Worksheet', `
    <label>Specific — What exactly?</label><textarea id="s" rows="2"></textarea>
    <label>Measurable — How will you measure?</label><textarea id="m" rows="2"></textarea>
    <label>Achievable — Is it realistic?</label><textarea id="a" rows="2"></textarea>
    <label>Relevant — Why does it matter?</label><textarea id="r" rows="2"></textarea>
    <label>Time-bound — Deadline?</label><input type="text" id="t"/>
    <button class="primary" id="go" style="margin-top:14px">Generate Plan</button>
    <div class="result hidden" id="res">
      <h3 style="margin-top:0">Your SMART Action Plan</h3>
      <div id="out"></div>
      <button class="primary" id="pr" style="margin-top:12px">🖨 Print</button>
    </div>
  `, cfg, `
    go.onclick=()=>{
      const labels=['Specific','Measurable','Achievable','Relevant','Time-bound'];
      const v=['s','m','a','r','t'].map(id=>document.getElementById(id).value||'—');
      out.innerHTML=labels.map((L,i)=>'<p><b>'+L+':</b> '+v[i].replace(/</g,'&lt;')+'</p>').join('');
      res.classList.remove('hidden');
    };
    pr.onclick=()=>window.print();
  `);
}

function assessment(cfg: ToolConfig) {
  const areas = ['Career','Money','Health','Family','Romance','Growth','Fun','Environment'];
  return shell('Life Balance Wheel', `
    ${areas.map((a,i)=>`<label>${a} <span class="val" id="v${i}">5</span>/10</label><input type="range" min="1" max="10" value="5" data-i="${i}" class="ar"/>`).join('')}
    <button class="primary" id="go" style="margin-top:14px">Show My Wheel</button>
    <div class="result hidden" id="res">
      <canvas id="cv" width="500" height="500"></canvas>
    </div>
  `, cfg, `
    const areas=${JSON.stringify(areas)};
    const inputs=document.querySelectorAll('.ar');
    inputs.forEach(el=>el.addEventListener('input',()=>document.getElementById('v'+el.dataset.i).textContent=el.value));
    go.onclick=()=>{
      res.classList.remove('hidden');
      const c=cv.getContext('2d'); const cx=250,cy=250,R=200;
      c.clearRect(0,0,500,500);
      c.strokeStyle='#ddd';
      for(let r=1;r<=10;r++){c.beginPath();for(let i=0;i<8;i++){const a=Math.PI*2*i/8-Math.PI/2;const x=cx+Math.cos(a)*R*r/10,y=cy+Math.sin(a)*R*r/10;i?c.lineTo(x,y):c.moveTo(x,y);}c.closePath();c.stroke();}
      c.fillStyle='#333';c.font='13px sans-serif';c.textAlign='center';
      for(let i=0;i<8;i++){const a=Math.PI*2*i/8-Math.PI/2;c.fillText(areas[i],cx+Math.cos(a)*(R+18),cy+Math.sin(a)*(R+18)+4);}
      const vals=[...inputs].map(el=>+el.value);
      c.beginPath();vals.forEach((v,i)=>{const a=Math.PI*2*i/8-Math.PI/2;const x=cx+Math.cos(a)*R*v/10,y=cy+Math.sin(a)*R*v/10;i?c.lineTo(x,y):c.moveTo(x,y);});c.closePath();
      c.fillStyle='${cfg.color||'#6366f1'}80';c.fill();c.strokeStyle='${cfg.color||'#6366f1'}';c.lineWidth=2;c.stroke();
    };
  `);
}

function haircolor(cfg: ToolConfig) {
  return shell('Hair Color Quiz', `
    <div id="q"></div>
    <div class="result hidden" id="res">
      <div>Your Match</div>
      <div class="big" id="out">—</div>
      <p id="desc"></p>
    </div>
  `, cfg, `
    const Q=[
      {q:'Your skin tone?',a:['Cool/Pink','Warm/Golden','Neutral','Olive']},
      {q:'Eye color?',a:['Blue/Green','Brown','Hazel','Grey']},
      {q:'Style?',a:['Bold','Natural','Trendy','Classic']},
      {q:'Maintenance?',a:['Low','Medium','High','I love salon trips']}
    ];
    const results=['Ash Blonde','Warm Caramel','Rich Chestnut','Soft Balayage'];
    const desc=['Cool tones suit you — try ash or platinum shades.','Golden warmth complements your features beautifully.','Deep chestnut adds dimension and depth.','Sun-kissed balayage gives effortless glamour.'];
    let i=0,picks=[];
    function render(){
      if(i>=Q.length){
        const idx=picks[0];
        out.textContent=results[idx]; document.getElementById('desc').textContent=desc[idx];
        document.getElementById('q').innerHTML='';
        res.classList.remove('hidden');return;
      }
      const cur=Q[i];
      document.getElementById('q').innerHTML='<h3>'+(i+1)+'. '+cur.q+'</h3>'+cur.a.map((x,j)=>'<label class="opt"><input type="radio" name="a" value="'+j+'"/>'+x+'</label>').join('')+'<button class="primary" id="nx" style="margin-top:10px">Next</button>';
      document.getElementById('nx').onclick=()=>{
        const sel=document.querySelector('input[name=a]:checked'); if(!sel)return;
        picks.push(+sel.value); i++; render();
      };
    }
    render();
  `);
}

function skintype(cfg: ToolConfig) {
  return shell('Skin Type Quiz', `
    <div id="q"></div>
    <div class="result hidden" id="res">
      <div>Your Skin Type</div>
      <div class="big" id="out">—</div>
      <p id="desc"></p>
    </div>
  `, cfg, `
    const Q=[
      {q:'How does skin feel after washing?',a:['Tight','Comfortable','Oily quickly','Patchy']},
      {q:'By midday your T-zone is…',a:['Dry','Normal','Shiny','Mixed']},
      {q:'Pores?',a:['Barely visible','Medium','Large','Mixed']},
      {q:'Reaction to new products?',a:['Often irritated','Rarely','Breakouts','Sometimes']}
    ];
    const labels=['Dry','Normal','Oily','Combination'];
    const tips=['Use rich creams & hydrating serums.','Maintain balance with gentle gel cleansers.','Use BHA + lightweight gel moisturizers.','Use different products for cheeks vs T-zone.'];
    let i=0,c=[0,0,0,0];
    function render(){
      if(i>=Q.length){
        const idx=c.indexOf(Math.max(...c));
        out.textContent=labels[idx]; document.getElementById('desc').textContent=tips[idx];
        document.getElementById('q').innerHTML=''; res.classList.remove('hidden');return;
      }
      const cur=Q[i];
      document.getElementById('q').innerHTML='<h3>'+(i+1)+'. '+cur.q+'</h3>'+cur.a.map((x,j)=>'<label class="opt"><input type="radio" name="a" value="'+j+'"/>'+x+'</label>').join('')+'<button class="primary" id="nx" style="margin-top:10px">Next</button>';
      document.getElementById('nx').onclick=()=>{const sel=document.querySelector('input[name=a]:checked');if(!sel)return;c[+sel.value]++;i++;render();};
    }
    render();
  `);
}

function workout(cfg: ToolConfig) {
  return shell('Workout Plan Generator', `
    <label>Goal</label>
    <select id="goal"><option>Build Muscle</option><option>Lose Fat</option><option>Strength</option><option>Endurance</option></select>
    <label>Level</label>
    <select id="lvl"><option>Beginner</option><option>Intermediate</option><option>Advanced</option></select>
    <label>Days / week</label>
    <select id="days"><option>3</option><option>4</option><option>5</option><option>6</option></select>
    <label>Equipment</label>
    <select id="eq"><option>Full Gym</option><option>Dumbbells Only</option><option>Bodyweight</option></select>
    <button class="primary" id="go" style="margin-top:14px">Generate Plan</button>
    <div class="result hidden" id="res"><div id="plan"></div></div>
  `, cfg, `
    const splits={3:['Push','Pull','Legs'],4:['Upper','Lower','Push','Pull'],5:['Chest','Back','Legs','Shoulders','Arms'],6:['Push','Pull','Legs','Push','Pull','Legs']};
    const ex={'Push':['Bench Press 4x8','Overhead Press 3x10','Tricep Dips 3x12'],'Pull':['Pull-ups 4x6','Barbell Row 4x8','Bicep Curl 3x12'],'Legs':['Squat 4x8','Romanian Deadlift 3x10','Lunges 3x12'],'Upper':['Bench 4x8','Row 4x8','OHP 3x10'],'Lower':['Squat 4x8','Deadlift 3x6','Calf Raise 3x15'],'Chest':['Bench 4x8','Incline DB 3x10','Flyes 3x12'],'Back':['Deadlift 4x6','Row 4x8','Pulldown 3x10'],'Shoulders':['OHP 4x8','Lat Raise 3x12','Rear Delt 3x12'],'Arms':['Curl 4x10','Tricep Ext 4x10','Hammer Curl 3x12']};
    go.onclick=()=>{
      const d=+document.getElementById('days').value;
      const split=splits[d];
      plan.innerHTML='<h3 style="margin-top:0">Your '+d+'-Day Plan</h3>'+split.map((day,i)=>'<div style="background:#f0f0f5;padding:10px;border-radius:8px;margin:6px 0"><b>Day '+(i+1)+': '+day+'</b><ul style="margin:6px 0 0 18px;padding:0">'+(ex[day]||['Custom workout']).map(e=>'<li>'+e+'</li>').join('')+'</ul></div>').join('');
      res.classList.remove('hidden');
    };
  `);
}

function materials(cfg: ToolConfig) {
  return shell('Materials Calculator', `
    <label>Material</label>
    <select id="mat">
      <option value="tile|25|22">Tiles (per m²)</option>
      <option value="paint|0.1|8">Paint (liters)</option>
      <option value="floor|1|35">Flooring (per m²)</option>
      <option value="concrete|0.15|120">Concrete (m³)</option>
    </select>
    <label>Area (m²) <span class="val" id="vA">20</span></label>
    <input type="range" id="area" min="1" max="500" value="20"/>
    <button class="primary" id="go" style="margin-top:14px">Calculate</button>
    <div class="result hidden" id="res">
      <div>Estimated Total</div>
      <div class="big" id="rTot">—</div>
      <div class="grid2">
        <div>Quantity<b id="rQ">—</b></div>
        <div>Unit Cost<b id="rU">—</b></div>
        <div>Waste (+10%)<b id="rW">—</b></div>
        <div>Area<b id="rA">—</b></div>
      </div>
    </div>
  `, cfg, `
    area.oninput=()=>vA.textContent=area.value;
    go.onclick=()=>{
      const [k,unit,cost]=document.getElementById('mat').value.split('|');
      const A=+area.value, q=A*+unit*1.1, total=q*+cost;
      rQ.textContent=q.toFixed(1)+' '+k; rU.textContent='€'+cost;
      rW.textContent='+10%'; rA.textContent=A+' m²';
      rTot.textContent='€'+Math.round(total).toLocaleString();
      res.classList.remove('hidden');
    };
  `);
}

function comingSoon(name: string, cfg: ToolConfig) {
  return shell(name, `
    <div class="result" style="text-align:center;padding:40px 20px">
      <div style="font-size:48px">🚧</div>
      <h2 style="margin:8px 0">Coming Soon</h2>
      <p style="color:#666">${esc(name)} is being built. Check back soon!</p>
    </div>
  `, cfg);
}

export function generateToolHTML(templateId: string, cfg: ToolConfig): string {
  switch (templateId) {
    case 'mortgage':   return mortgage(cfg);
    case 'bmi':        return bmi(cfg);
    case 'calories':   return calories(cfg);
    case 'estimate':   return estimate(cfg);
    case 'goalsetter': return goalsetter(cfg);
    case 'assessment': return assessment(cfg);
    case 'haircolor':  return haircolor(cfg);
    case 'skintype':   return skintype(cfg);
    case 'workout':    return workout(cfg);
    case 'materials':  return materials(cfg);
    default: {
      const t = templateId.charAt(0).toUpperCase() + templateId.slice(1);
      return comingSoon(t, cfg);
    }
  }
}
