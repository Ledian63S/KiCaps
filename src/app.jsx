const { useState, useEffect, useRef, useCallback } = React;

const GROUPS = [
  { label:'Full Size', keys:['ES','NQ','GC','6E','6B'] },
  { label:'Micro',     keys:['MES','MNQ','MGC'] },
];
const ALL_INSTR = {
  ES:   { name:'E-mini S&P 500',   pv:50,   step:2    },
  NQ:   { name:'E-mini Nasdaq',    pv:20,   step:2    },
  GC:   { name:'Gold Futures',     pv:10,   step:1    },
  '6E': { name:'Euro FX',          pv:12.5, step:1    },
  '6B': { name:'British Pound',    pv:6.25, step:1    },
  MES:  { name:'Micro S&P',        pv:5,    step:0.25 },
  MNQ:  { name:'Micro Nasdaq',     pv:2,    step:0.25 },
  MGC:  { name:'Micro Gold',       pv:1,    step:0.25 },
};

const LS = {
  get:(k,d)=>{ try{const v=localStorage.getItem(k);return v!==null?JSON.parse(v):d;}catch{return d;} },
  set:(k,v)=>{ try{localStorage.setItem(k,JSON.stringify(v));}catch{} },
};
const f$   = n=>(n==null||isNaN(n))?'—':'$'+Math.abs(n).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
const fPts = n=>n%1===0?String(n):n.toFixed(2);

/* slippage / delta → { txt, color } (green under budget, red over) */
function slipInfo(s){
  if(Math.abs(s)<0.005) return { txt:'—', color:'var(--muted)', state:'even' };
  if(s<0)               return { txt:f$(s), color:'var(--green)', state:'under' };
  return                       { txt:'+'+f$(s), color:'var(--red)', state:'over' };
}

function Toggle({checked,onChange}){
  return(
    <label className="tog">
      <input type="checkbox" checked={checked} onChange={e=>onChange(e.target.checked)}/>
      <div className="tog-t"></div>
    </label>
  );
}

function App(){
  /* settings */
  const [remBal,    setRemBal]    = useState(()=>LS.get('q6-rembal',   true));
  const [remRisk,   setRemRisk]   = useState(()=>LS.get('q6-remrisk',  true));
  const [remInstr,  setRemInstr]  = useState(()=>LS.get('q6-reminstr', true));
  const [themeMode, setThemeMode] = useState(()=>LS.get('q6-theme',    'dark'));

  /* calc state */
  const [instr,    setInstrRaw] = useState(()=>LS.get('q6-instr',  'MNQ'));
  const [balance,  setBalance]  = useState(()=>String(LS.get('q6-bal',  50000)));
  const [riskMode, setRiskMode] = useState(()=>LS.get('q6-rm',     'fixed'));
  const [riskVal,  setRiskVal]  = useState(()=>String(LS.get('q6-rv',   200)));
  const [slPts,    setSlPts]    = useState(()=>String(LS.get('q6-sl',   25)));
  const [override, setOverride] = useState(null);
  const [favs,     setFavs]     = useState(()=>LS.get('q6-favs',   ['MNQ','MES','NQ','ES']));

  /* ui */
  const [showManage,   setShowManage]   = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [flashRow,     setFlashRow]     = useState(null);
  const [minimized,    setMinimized]    = useState(false);
  const [closed,       setClosed]       = useState(false);
  const heroRef  = useRef(null);
  const tableRef = useRef(null);
  const prevC    = useRef(null);

  /* resizable columns */
  const bodyRef  = useRef(null);
  const [leftW, setLeftW]       = useState(()=>LS.get('q6-leftw', 286));
  const [resizing, setResizing] = useState(false);
  useEffect(()=>{ LS.set('q6-leftw', leftW); },[leftW]);
  function startResize(e){
    e.preventDefault();
    setResizing(true);
    document.body.style.userSelect='none';
    document.body.style.cursor='col-resize';
    function onMove(ev){
      const rect=bodyRef.current.getBoundingClientRect();
      const pad=12;                                   /* body horizontal padding */
      const max=rect.width-pad*2-10-240;              /* keep ladder >= 240px */
      let w=ev.clientX-rect.left-pad;
      w=Math.min(max, Math.max(240, w));
      setLeftW(Math.round(w));
    }
    function onUp(){
      setResizing(false);
      document.removeEventListener('mousemove',onMove);
      document.removeEventListener('mouseup',onUp);
      document.body.style.userSelect='';
      document.body.style.cursor='';
    }
    document.addEventListener('mousemove',onMove);
    document.addEventListener('mouseup',onUp);
  }

  /* window drag (browser only — Electron handles native drag) */
  const winRef   = useRef(null);
  const dragRef  = useRef(null);
  const [winPos, setWinPos] = useState(null);

  useEffect(()=>{
    function onMove(e){
      if(!dragRef.current) return;
      const {ox,oy}=dragRef.current;
      setWinPos({x:e.clientX-ox, y:e.clientY-oy});
    }
    function onUp(){ dragRef.current=null; document.body.style.userSelect=''; }
    window.addEventListener('mousemove',onMove);
    window.addEventListener('mouseup',onUp);
    return()=>{ window.removeEventListener('mousemove',onMove); window.removeEventListener('mouseup',onUp); };
  },[]);

  function onTbDown(e){
    if(window.electronAPI) return;                       /* native drag in app */
    if(e.target.closest('.tb-btn')||e.target.closest('[data-ot]')) return;
    e.preventDefault();
    document.body.style.userSelect='none';
    const rect=winRef.current.getBoundingClientRect();
    if(!winPos) setWinPos({x:rect.left,y:rect.top});
    dragRef.current={ox:e.clientX-rect.left, oy:e.clientY-rect.top};
  }

  /* system dark mode */
  const [sysDark, setSysDark] = useState(()=>window.matchMedia('(prefers-color-scheme:dark)').matches);
  useEffect(()=>{
    const mq=window.matchMedia('(prefers-color-scheme:dark)');
    const h=e=>setSysDark(e.matches);
    mq.addEventListener('change',h);
    return ()=>mq.removeEventListener('change',h);
  },[]);
  const isDark = themeMode==='dark'||(themeMode==='system'&&sysDark);
  const isLight = !isDark;

  useEffect(()=>{ document.body.className=isDark?'':'light'; },[isDark]);

  /* persist */
  useEffect(()=>{ LS.set('q6-theme',   themeMode); },[themeMode]);
  useEffect(()=>{ LS.set('q6-rembal',  remBal);    },[remBal]);
  useEffect(()=>{ LS.set('q6-remrisk', remRisk);   },[remRisk]);
  useEffect(()=>{ LS.set('q6-reminstr',remInstr);  },[remInstr]);
  useEffect(()=>{ LS.set('q6-favs',    favs);       },[favs]);
  useEffect(()=>{ if(remInstr) LS.set('q6-instr', instr); },[instr,remInstr]);
  useEffect(()=>{ if(remBal)   LS.set('q6-bal',   parseFloat(balance)||0); },[balance,remBal]);
  useEffect(()=>{ if(remRisk){ LS.set('q6-rv', parseFloat(riskVal)||0); LS.set('q6-rm',riskMode); } },[riskVal,riskMode,remRisk]);
  useEffect(()=>{ LS.set('q6-sl', parseFloat(slPts)||0); },[slPts]);
  useEffect(()=>{ setOverride(null); },[balance,riskMode,riskVal,slPts,instr]);

  const setInstr = useCallback((t)=>{
    setInstrRaw(t);
    if(!favs.includes(t)) setFavs(f=>[...f,t]);
  },[favs]);

  const toggleFav = useCallback((t)=>{
    setFavs(f=>{
      if(f.includes(t)){
        if(f.length===1) return f;
        const next=f.filter(x=>x!==t);
        if(t===instr) setInstrRaw(next[0]);
        return next;
      }
      return [...f,t];
    });
  },[instr]);

  /* close overlays on outside click */
  useEffect(()=>{
    if(!showManage&&!showSettings) return;
    const h=e=>{ if(!e.target.closest('.overlay')&&!e.target.closest('[data-ot]')){ setShowManage(false); setShowSettings(false); } };
    document.addEventListener('mousedown',h);
    return ()=>document.removeEventListener('mousedown',h);
  },[showManage,showSettings]);

  /* calculations */
  const pv      = ALL_INSTR[instr].pv;
  const ptStep  = ALL_INSTR[instr].step;
  const balNum  = parseFloat(balance)  || 0;
  const rvNum   = parseFloat(riskVal)  || 0;
  const slNum   = parseFloat(slPts)    || 0;
  const riskDol = riskMode==='percent' ? balNum*rvNum/100 : rvNum;
  const riskPct = balNum>0 ? riskDol/balNum*100 : 0;
  const slDol   = slNum*pv;
  const autoC   = slDol>0 ? Math.max(0,Math.round(riskDol/slDol)) : 0;
  const contracts=override!==null ? override : autoC;
  const actRisk  = contracts*slDol;
  const delta    = actRisk-riskDol;                       /* slippage vs target */
  const util     = riskDol>0 ? actRisk/riskDol*100 : 0;

  /* verdict */
  let verdictLabel, verdictColor, deltaStr;
  if(Math.abs(delta)<0.005){ verdictLabel='On Target';   verdictColor='var(--accent)'; deltaStr='±$0.00'; }
  else if(delta<0){          verdictLabel='Under Target'; verdictColor='var(--green)';  deltaStr='−'+f$(delta); }
  else {                     verdictLabel='Over Limit';   verdictColor='var(--red)';    deltaStr='+'+f$(delta); }

  /* ladder rows — centered around slNum so it's always visible */
  const rows=[];
  const halfWin=28;
  if(slNum>0){
    const ci=Math.round(slNum/ptStep);
    const si=Math.max(1,ci-halfWin);
    const ei=ci+halfWin;
    for(let i=si;i<=ei;i++){
      const p=+(i*ptStep).toFixed(6);
      const d=+(p*pv).toFixed(4);
      const c=Math.max(0,Math.round(riskDol/d));
      const ar=+(c*d).toFixed(4);
      rows.push({p,d,c,ar,slip:+(ar-riskDol).toFixed(4)});
    }
  } else {
    for(let p=ptStep;rows.length<60;p=+(p+ptStep).toFixed(6)){
      const d=+(p*pv).toFixed(4);
      const c=Math.max(0,Math.round(riskDol/d));
      const ar=+(c*d).toFixed(4);
      rows.push({p,d,c,ar,slip:+(ar-riskDol).toFixed(4)});
    }
  }

  /* hero pop */
  useEffect(()=>{
    if(prevC.current!==null&&prevC.current!==contracts&&heroRef.current){
      heroRef.current.classList.remove('pop');
      void heroRef.current.offsetWidth;
      heroRef.current.classList.add('pop');
    }
    prevC.current=contracts;
  },[contracts]);

  /* auto-scroll selected row to center */
  const firstScroll = useRef(true);
  useEffect(()=>{
    if(!tableRef.current) return;
    const cur=tableRef.current.querySelector('.lrow.cur');
    if(cur){
      cur.scrollIntoView({block:'center',behavior:firstScroll.current?'instant':'smooth'});
      firstScroll.current=false;
    }
  },[slNum,instr]);

  const handleRowClick=(p)=>{
    setSlPts(String(p));
    setFlashRow(p);
    setTimeout(()=>setFlashRow(null),350);
  };

  /* steppers */
  const stepSL = (dir)=> setSlPts(prev=>{
    const v=Math.max(ptStep, Math.round(((parseFloat(prev)||0)+dir*ptStep)/ptStep)*ptStep);
    return String(+v.toFixed(4));
  });
  const riskStep = riskMode==='percent'?0.1:25;
  const stepRisk = (dir)=> setRiskVal(prev=>{
    const v=Math.max(riskStep, (parseFloat(prev)||0)+dir*riskStep);
    return String(+v.toFixed(2));
  });

  const favInstr = favs.filter(t=>ALL_INSTR[t]);
  const instName = ALL_INSTR[instr].name;

  /* hints */
  const slHint   = slDol>0 ? `${f$(slDol)} · $${pv}/pt` : `$${pv}/pt`;
  const riskHint = riskMode==='fixed'
    ? (balNum>0 ? `${riskPct.toFixed(2)}% of balance` : 'USD')
    : (riskDol>0 ? `${f$(riskDol)}` : 'PCT');

  const deltaSlip = slipInfo(delta);

  if(closed) return null;

  const winStyle = winPos
    ? {position:'fixed',left:winPos.x,top:winPos.y,transform:'none',margin:0,animation:'none'}
    : {};

  return(
    <div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div ref={winRef} className={`w${isLight?' light-theme':''}`}
        style={{...winStyle,...(minimized?{height:'46px'}:{})}}>

        {/* ── TITLEBAR ── */}
        <div className="tb" onMouseDown={onTbDown}>
          <div className="tb-left" style={{cursor:'default'}}>
            <span className="tb-brand">KICAPS</span>
            <span className="tb-div"></span>
            <span className="tb-sub">Position Calculator</span>
          </div>
          <div className="tb-right">
            <button className="tb-btn" title="Minimize"
              onClick={()=>window.electronAPI ? window.electronAPI.minimize() : setMinimized(v=>!v)}>—</button>
            <button className="tb-btn" title="Maximize"
              onClick={()=>window.electronAPI ? window.electronAPI.maximize() : (setWinPos(null),setMinimized(false))}>▢</button>
            <button className="tb-btn x" title="Close"
              onClick={()=>window.electronAPI ? window.electronAPI.close() : setClosed(true)}>✕</button>
          </div>
        </div>

        {/* ── CONTROLS ── */}
        <div className="controls">

          {/* instrument chips */}
          <div className="inst-row">
            <span className="ctl-lbl">Instrument</span>
            <div className="chips">
              {favInstr.map(k=>(
                <button key={k} className={`chip${instr===k?' on':''}`} title={ALL_INSTR[k].name} onClick={()=>setInstr(k)}>
                  <span className="chip-k">{k}</span>
                  <span className="chip-r">${ALL_INSTR[k].pv}/pt</span>
                </button>
              ))}
              <button className="chip chip-manage" data-ot="1"
                onClick={()=>{ setShowManage(v=>!v); setShowSettings(false); }}>
                {showManage?'close':'manage ☆'}
              </button>
            </div>

            {/* manage overlay */}
            {showManage && (
              <div className="overlay manage-ov">
                {GROUPS.map(g=>(
                  <div key={g.label} className="mg-grp">
                    <div className="mg-lbl">{g.label}</div>
                    {g.keys.map(k=>(
                      <div key={k} className="mg-row">
                        <div className="mg-bar" style={{background:favs.includes(k)?'var(--accent)':'var(--hair)'}}></div>
                        <div className="mg-info">
                          <span className={`mg-k${favs.includes(k)?' fav':''}`}>{k}</span>
                          <span className="mg-n">{ALL_INSTR[k].name}</span>
                        </div>
                        <span className="mg-pv">${ALL_INSTR[k].pv}/pt</span>
                        <button className={`mg-star${favs.includes(k)?' on':''}`}
                          onClick={()=>toggleFav(k)}
                          title={favs.includes(k)?'Remove':'Add to watchlist'}>
                          {favs.includes(k)?'★':'☆'}
                        </button>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {/* Balance — account context, lives with the instrument */}
            <div className="bal-inline">
              <span className="ctl-lbl">Balance</span>
              <div className="bal-val">
                <span className="num-pre">$</span>
                <input className="num-in num-md" type="text" inputMode="numeric" placeholder="0"
                  value={balance===''?'':(parseFloat(balance)||0).toLocaleString('en-US')}
                  onChange={e=>setBalance(e.target.value.replace(/[^0-9.]/g,''))}/>
              </div>
            </div>
          </div>
        </div>

        {/* ── BODY ── */}
        <div className="body" ref={bodyRef} style={{gridTemplateColumns:`${leftW}px 10px minmax(0,1fr)`}}>

          {/* LEFT */}
          <div className="left-col">

            {/* SL + Risk — the inputs that drive Position Size */}
            <div className="engine-grid">
              {/* Stop Loss */}
              <div className="ctl-card">
                <div className="card-head">
                  <span className="ctl-lbl">Stop Loss</span>
                  <span className="ctl-hint">{slHint}</span>
                </div>
                <div className="stepper">
                  <button className="rbtn" onClick={()=>stepSL(-1)}>−</button>
                  <div className="stepper-val">
                    <input className="num-in num-lg" type="number" value={slPts} autoFocus
                      step={ptStep} placeholder="0" onChange={e=>setSlPts(e.target.value)}/>
                    <span className="unit">pts</span>
                  </div>
                  <button className="rbtn" onClick={()=>stepSL(1)}>+</button>
                </div>
              </div>

              {/* Risk / Trade */}
              <div className="ctl-card">
                <div className="card-head">
                  <span className="ctl-lbl">Risk / Trade</span>
                  <span className="ctl-hint">{riskHint}</span>
                </div>
                <div className="stepper">
                  <button className="rbtn" onClick={()=>stepRisk(-1)}>−</button>
                  <div className="stepper-val">
                    <span className="num-pre">{riskMode==='fixed'?'$':'%'}</span>
                    <input className="num-in num-lg" type="number" value={riskVal}
                      step={riskStep} placeholder="0" onChange={e=>setRiskVal(e.target.value)}/>
                  </div>
                  <button className="rbtn" onClick={()=>stepRisk(1)}>+</button>
                </div>
              </div>
            </div>

            {/* Position Size */}
            <div className="pos-card">
              <div className="ctl-lbl">Position Size</div>
              <div className="pos-stepper">
                <button className="rbtn lg" onClick={()=>setOverride(c=>Math.max(0,(c??autoC)-1))}>−</button>
                <span ref={heroRef} className="pos-hero">{contracts}</span>
                <button className="rbtn lg" onClick={()=>setOverride(c=>Math.max(0,(c??autoC)+1))}>+</button>
              </div>
              <div className="pos-foot">
                <span className="ctl-lbl">Contracts</span>
                <button className={`auto-pill${override===null?' on':''}`} onClick={()=>setOverride(null)}>Auto</button>
              </div>
            </div>

            {/* Risk Check */}
            <div className="verdict-card" style={{borderColor:verdictColor}}>
              <div className="card-head">
                <span className="ctl-lbl">Risk Check</span>
                <span className="verdict-pill" style={{background:verdictColor}}>{verdictLabel}</span>
              </div>
              <div className="verdict-main">
                <div className="verdict-actual">
                  <span className="ctl-lbl">Actual Risk</span>
                  <span className="verdict-num" style={{color:verdictColor}}>{f$(actRisk)}</span>
                </div>
                <div className="verdict-side">
                  <span className="verdict-target">Target {f$(riskDol)}</span>
                  <span className="verdict-delta" style={{color:verdictColor}}>Δ {deltaStr}</span>
                </div>
              </div>
              <div className="util">
                <div className="util-head">
                  <span className="ctl-lbl">Utilization</span>
                  <span className="util-pct" style={{color:verdictColor}}>{Math.round(util)}%</span>
                </div>
                <div className="util-track">
                  <div className="util-fill" style={{width:`${Math.min(100,util)}%`,background:verdictColor}}></div>
                </div>
              </div>
            </div>

            {/* 2×2 stats */}
            <div className="stat-grid">
              <div className="stat"><span className="stat-l">SL / Contract</span><span className="stat-v">{f$(slDol)}</span></div>
              <div className="stat"><span className="stat-l">Point Value</span><span className="stat-v">{f$(pv)}</span></div>
              <div className="stat"><span className="stat-l">Exposure</span><span className="stat-v">{f$(contracts*slDol)}</span></div>
              <div className="stat"><span className="stat-l">Slippage</span><span className="stat-v"><span className={`slip-chip ${deltaSlip.state}`}>{deltaSlip.txt}</span></span></div>
            </div>
          </div>

          {/* draggable column divider */}
          <div className={`resizer${resizing?' dragging':''}`} onMouseDown={startResize} title="Drag to resize columns"></div>

          {/* RIGHT — ladder */}
          <div className="right-col">
            <div className="ladder-head">
              <span className="ladder-title">{instName} · Stop Loss Ladder</span>
              <span className="ladder-legend">
                <span className="lg"><span className="dot green"></span>Under</span>
                <span className="lg"><span className="dot red"></span>Over</span>
              </span>
            </div>
            <div className="ladder-cols">
              <span>SL Pts</span>
              <span className="r">SL $</span>
              <span className="r">Actual Risk</span>
              <span className="r">vs Target</span>
            </div>
            <div className="ladder-body" ref={tableRef}>
              {rows.map(({p,d,ar,slip})=>{
                const isCur=slNum>0&&Math.abs(p-slNum)<ptStep*0.51;
                const isFlash=flashRow===p;
                const si=slipInfo(slip);
                return(
                  <div key={p} className={`lrow${isCur?' cur':''}${isFlash?' flash':''}`} onClick={()=>handleRowClick(p)}>
                    <div className="lcol-pts">
                      <span className="pts">{fPts(p)}</span>
                      {isCur && <span className="your-stop">Your stop</span>}
                    </div>
                    <span className="lval">{f$(d)}</span>
                    <span className="lval risk">{f$(ar)}</span>
                    <span className="lval slip"><span className={`slip-chip ${si.state}`}>{si.txt}</span></span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── FOOTER ── */}
        <div className="footer">
          <div className="foot-left">
            <span>{instr} {instName}</span>
            <span>SL {fPts(slNum)} pts · {f$(slDol)}</span>
            <span>Risk {f$(riskDol)}</span>
            <span style={{color:verdictColor,fontWeight:700}}>{verdictLabel} · {contracts} contracts</span>
          </div>
          <div className="foot-right" style={{position:'relative'}}>
            {showSettings && (
              <div className="overlay settings-ov">
                <div className="st-sec">
                  <div className="st-head">Risk</div>
                  <div className="st-row">
                    <span className="st-lbl">% of Balance</span>
                    <Toggle checked={riskMode==='percent'} onChange={v=>setRiskMode(v?'percent':'fixed')}/>
                  </div>
                </div>
                <div className="st-sec">
                  <div className="st-head">Preferences</div>
                  <div className="st-row"><span className="st-lbl">Remember Balance</span><Toggle checked={remBal}   onChange={setRemBal}/></div>
                  <div className="st-row"><span className="st-lbl">Remember Risk</span>   <Toggle checked={remRisk}  onChange={setRemRisk}/></div>
                  <div className="st-row"><span className="st-lbl">Remember Instrument</span><Toggle checked={remInstr} onChange={setRemInstr}/></div>
                </div>
                <div className="st-sec">
                  <div className="st-head">Appearance</div>
                  <div className="seg">
                    {['system','dark','light'].map(m=>(
                      <button key={m} className={`seg-btn${themeMode===m?' on':''}`} onClick={()=>setThemeMode(m)}>{m.toUpperCase()}</button>
                    ))}
                  </div>
                </div>
                <div className="st-sec">
                  <div className="st-foot">KiCaps v1.0 · Made for traders</div>
                </div>
              </div>
            )}
            <button data-ot="1" className={`foot-btn${showSettings?' active':''}`}
              onClick={()=>{ setShowSettings(v=>!v); setShowManage(false); }}>⚙ Settings</button>
            <button className="foot-btn" onClick={()=>setThemeMode(isDark?'light':'dark')}>
              {isDark?'◐ Light':'◑ Dark'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
