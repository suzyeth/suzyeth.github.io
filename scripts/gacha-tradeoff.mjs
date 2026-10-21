// Run: node scripts/gacha-tradeoff.mjs /path/to/gacha-simulator/src/engine /path/to/output.json
// Uses Node.js 24 type stripping; copies only engine modules to a temporary folder.
import {readFileSync,mkdtempSync,mkdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
if(!process.argv[2]||!process.argv[3])throw Error('Provide engine directory and output JSON path.');
const temp=mkdtempSync(join(tmpdir(),'portfolio-gacha-'));mkdirSync(join(temp,'rules'));
for(const f of ['types.ts','simulator.ts','scenarios.ts','rules/rule.ts','rules/cyclic-pity.ts','rules/first-draw-script.ts','rules/registry.ts'])writeFileSync(join(temp,f),readFileSync(join(process.argv[2],f),'utf8').replace(/from '(\.[^']+)'/g,"from '$1.ts'"));
const {createInitialState,pull}=await import(pathToFileURL(join(temp,'simulator.ts')));
const {multiTrialUntilTarget,summarizeTrials}=await import(pathToFileURL(join(temp,'scenarios.ts')));
const {defaultRegistry}=await import(pathToFileURL(join(temp,'rules/registry.ts')));
import {writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const protection={type:'target-protection',selectItem:(rarity,items,ctx)=>rarity==='rare'&&ctx.state.custom.protected?items.find(i=>i.id==='target'):null,afterPull:(result,state)=>result.rarity==='rare'?{...state,custom:{...state.custom,protected:result.item.id!=='target'}}:state};
const registry={...defaultRegistry,'target-protection':protection};
function rng(seed){let a=seed>>>0;return()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;}}
const trials=20000,maxPulls=120,seed=20261001;
function pool(period,protect){return {id:'synthetic',name:'Synthetic public example',rarities:[{id:'rare',baseRate:.02},{id:'common',baseRate:.98}],items:[{id:'target',name:'Target',rarity:'rare',weight:1},{id:'other',name:'Other rare',rarity:'rare',weight:1},{id:'common',name:'Common',rarity:'common'}],rules:[{type:'cyclic-pity',params:{period,bucketId:'rare'}},...(protect?[{type:'target-protection',params:{}}]:[])]};}
// Boundary checks: other rare activates protection, commons retain it, next rare is target and clears it.
const p=pool(80,true);let state=createInitialState(p);let values=[0,.9];let out=pull({pool:p,state,rng:()=>values.shift(),registry});assert.equal(out.result.item.id,'other');assert.equal(out.state.custom.protected,true);out=pull({pool:p,state:out.state,rng:()=>.9,registry});assert.equal(out.result.item.id,'common');assert.equal(out.state.custom.protected,true);out=pull({pool:p,state:out.state,rng:()=>0,registry});assert.equal(out.result.item.id,'target');assert.equal(out.state.custom.protected,false);assert.equal(out.state.pullsSinceRarity.rare,0);
function exact(period,protect){let states=new Map([['0,0,0',1]]),rare=0,target=0;for(let i=0;i<maxPulls;i++){let next=new Map();const add=(k,v)=>next.set(k,(next.get(k)||0)+v);for(const [key,m]of states){const [c,g,h]=key.split(',').map(Number),r=c===period-1?1:.02,q=protect&&g?1:.5;rare+=m*r;target+=m*r*q;add('0,0,1',m*r*q);add(`0,${protect?1:0},${h}`,m*r*(1-q));if(r<1)add(`${c+1},${g},${h}`,m*(1-r));}states=next;}return {success:[...states].reduce((a,[k,v])=>a+(k.endsWith(',1')?v:0),0),rare,target};}
const results=[];for(const [id,period,protect]of [['A',80,false],['B',60,false],['C',80,true]]){const config=pool(period,protect),first=summarizeTrials(multiTrialUntilTarget({pool:config,targetResId:'target',trials,maxPulls,rng:rng(seed),registry}));let rare=0,target=0,success=0;const random=rng(seed+1);for(let t=0;t<trials;t++){let state=createInitialState(config),found=false;for(let i=0;i<maxPulls;i++){const o=pull({pool:config,state,rng:random,registry});state=o.state;rare+=Number(o.result.rarity==='rare');target+=Number(o.result.item.id==='target');found ||=o.result.item.id==='target';}success+=Number(found);}const fixed={meanRare:rare/trials,meanTarget:target/trials,meanOther:(rare-target)/trials,successRate:success/trials},theory=exact(period,protect);assert.ok(Math.abs(1-first.failureRate-theory.success)<.015);assert.ok(Math.abs(fixed.meanRare-theory.rare)<.04);assert.ok(Math.abs(fixed.meanTarget-theory.target)<.04);results.push({id,period,protect,config,first,fixed,exact:theory});}
const report={date:'2026-10-01',kind:'New synthetic experiment, not historical player or commercial data',trials,maxPulls,firstSeed:seed,fixedSeed:seed+1,protection:'After any non-target rare, the next rare is target; commons retain protection, targets clear it. Experiment-only plugin, not shipped UI.',checks:'Protection activation/persistence/reset and exact state-probability recurrence passed.',results};writeFileSync(process.argv[3],JSON.stringify(report,null,2));console.log(JSON.stringify(results.map(({id,first,fixed,exact})=>({id,success:1-first.failureRate,fixed,exact})),null,2));

rmSync(temp,{recursive:true,force:true});
