export const poissonData = [
  {k:0,p:0.087},{k:1,p:0.2},{k:2,p:0.224},{k:3,p:0.168},
  {k:4,p:0.101},{k:5,p:0.061},{k:6,p:0.025},{k:7,p:0.012},{k:8,p:0.004}
];

export const latencyTS = Array.from({length:24},(_,i)=>({
  t: i+':00',
  mean: Math.round(180+Math.sin(i/3)*40+(i>18?30:0)),
  upper: Math.round(260+Math.sin(i/3)*30+(i>18?50:0)),
  lower: Math.round(110+Math.sin(i/3)*20),
  anomaly: i===19||i===20
}));

export const abTests = [
  {id:1,name:'Cache Strategy',a:'LRU Cache',b:'Redis Cluster',n:2400,meanA:245,meanB:198,t:4.82,p:0.0001,sig:true},
  {id:2,name:'Load Balancer',a:'Round Robin',b:'Least Conn',n:1600,meanA:210,meanB:205,t:0.92,p:0.36,sig:false},
  {id:3,name:'DB Pool Size',a:'pool=10',b:'pool=50',n:3000,meanA:320,meanB:195,t:8.41,p:0.00001,sig:true},
  {id:4,name:'API Version',a:'v1.2.0',b:'v1.2.1-rc',n:4000,meanA:175,meanB:172,t:1.45,p:0.14,sig:false},
];

export const kpis = [
  {label:'Avg Latency',value:'187ms',delta:'-12%',good:true,color:'#3b82f6'},
  {label:'P99 Latency',value:'342ms',delta:'+8%',good:false,color:'#f59e0b'},
  {label:'Uptime SLA',value:'99.97%',delta:'+0.02%',good:true,color:'#10b981'},
  {label:'Active Nodes',value:'1,024',delta:'100%',good:true,color:'#8b5cf6'},
];
