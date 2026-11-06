import test from'node:test';import assert from'node:assert/strict';
import{DATA_LIMITS,parseData,filterData,sortData,pageData,aggregateData,numericSummary,exportData,SAMPLE_DATA}from'../data-studio-core.js';

const dataset=parseData('department,person,salary,date\nTech,Alice,120,2026-10-01\nTech,Bob,80,2026-10-02\nOps,Cindy,200,2026-10-03\nOps,Dan,,2026-10-04',{format:'csv'});
test('imports real CSV, detects schema and treats missing cells explicitly',()=>{
 assert.equal(dataset.rows.length,4);
 assert.equal(dataset.schema.find(x=>x.name==='salary').kind,'number');
 assert.equal(dataset.schema.find(x=>x.name==='salary').missing,1);
 assert.equal(dataset.schema.find(x=>x.name==='date').kind,'date');
 assert.equal(dataset.schema.find(x=>x.name==='person').kind,'text');
 assert.equal(dataset.schema.find(x=>x.name==='department').unique,2);
});
test('JSON array import preserves scalar values and refuses non-record payload',()=>{
 const json=parseData('[{"name":"A","value":0,"ok":false},{"name":"B","value":14,"ok":true}]');
 assert.equal(json.format,'json');
 assert.equal(json.rows[0].value,'0');
 assert.equal(json.rows[0].ok,'false');
 assert.equal(json.schema.find(x=>x.name==='ok').kind,'boolean');
 for(const invalid of ['{}','[1,2]','{"rows":[1]}','[]','[null]'])assert.throws(()=>parseData(invalid),/JSON|数据/);
});
test('literal query, column equals and numeric bounds filter actual records',()=>{
 assert.equal(filterData(dataset,{query:'Tech'}).length,2);
 assert.equal(filterData(dataset,{query:'ops',column:'department',operator:'equals'}).length,2);
 assert.deepEqual(filterData(dataset,{query:'90',column:'salary',operator:'gte'}).map(x=>x.person),['Alice','Cindy']);
 assert.deepEqual(filterData(dataset,{query:'120',column:'salary',operator:'lte'}).map(x=>x.person),['Alice','Bob']);
 assert.throws(()=>filterData(dataset,{query:'bad',column:'salary',operator:'gte'}),/有效数值/);
 assert.throws(()=>filterData(dataset,{query:'100',column:'all',operator:'gte'}),/选择一列/);
 assert.throws(()=>filterData(dataset,{query:'A',column:'missing'}),/筛选列不存在/);
});
test('real numeric and date sorting are deterministic with missing values last',()=>{
 assert.deepEqual(sortData(dataset.rows,{column:'salary',schema:dataset.schema}).map(x=>x.person),['Bob','Alice','Cindy','Dan']);
 assert.deepEqual(sortData(dataset.rows,{column:'salary',schema:dataset.schema,direction:'desc'}).map(x=>x.person),['Cindy','Alice','Bob','Dan']);
 assert.deepEqual(sortData(dataset.rows,{column:'date',schema:dataset.schema,direction:'desc'}).map(x=>x.person),['Dan','Cindy','Bob','Alice']);
});
test('real grouping computes count, sum and average on current filtered rows',()=>{
 const group={groupBy:'department'};
 const counts=aggregateData(dataset,dataset.rows,group);
 assert.equal(counts.groups,2);
 assert.deepEqual(counts.items.map(x=>[x.label,x.value]),[['Ops',2],['Tech',2]]);
 const sums=aggregateData(dataset,dataset.rows,{...group,operation:'sum',metric:'salary'});
 assert.deepEqual(sums.items.map(x=>[x.label,x.value]),[['Ops',200],['Tech',200]]);
 const avg=aggregateData(dataset,dataset.rows,{...group,operation:'avg',metric:'salary'});
 assert.deepEqual(avg.items.map(x=>[x.label,x.value]),[['Ops',200],['Tech',100]]);
 assert.equal(aggregateData(dataset,filterData(dataset,{query:'Tech'}),group).groups,1);
 assert.throws(()=>aggregateData(dataset,dataset.rows,{...group,operation:'avg',metric:'person'}),/数值列/);
});
test('numeric summaries never treat missing fields as zero',()=>{
 const a=numericSummary(dataset,dataset.rows).find(x=>x.column==='salary');
 assert.equal(a.count,3);assert.equal(a.sum,400);assert.equal(a.min,80);assert.equal(a.max,200);
 assert.ok(Math.abs(a.mean-133.33333333333334)<1e-8);
});
test('pagination clamps pages, including empty results',()=>{
 assert.deepEqual(pageData(dataset.rows,1,2).rows.map(x=>x.person),['Alice','Bob']);
 assert.deepEqual(pageData(dataset.rows,999,2).rows.map(x=>x.person),['Cindy','Dan']);
 assert.equal(pageData([],1).pages,1);
});
test('safe CSV and JSON export preserve actual field names, quotes, unicode and spreadsheets',()=>{
 const d=parseData('[{"name":"=HYPERLINK(\\"http://evil\\")","number":"-12","text":"Hi,\\"A\\" 中文"}]');
 const csv=exportData(d.rows,d.columns);
 assert.ok(csv.includes("'=HYPERLINK"));assert.ok(csv.includes('-12'));assert.ok(csv.includes('""A""'));
 assert.equal(JSON.parse(exportData(d.rows,d.columns,{format:'json'}))[0].number,'-12');
 assert.throws(()=>exportData([],[],{format:'csv'}),/没有可导出/);
});
test('all limits and invalid format inputs fail explicitly, not silently',()=>{
 assert.ok(DATA_LIMITS.rows===2000&&DATA_LIMITS.columns===48&&DATA_LIMITS.characters===250000);
 assert.throws(()=>parseData('x'.repeat(DATA_LIMITS.characters+1)),/过大/);
 assert.throws(()=>parseData('[]',{format:'xml'}),/只支持 CSV 或 JSON/);
 assert.throws(()=>parseData(JSON.stringify(Array.from({length:2001},()=>({a:1})))),/最多支持 2000 行/);
 assert.throws(()=>parseData(JSON.stringify([Object.fromEntries(Array.from({length:49},(_,i)=>['field'+i,i]))])),/最多支持 48 列/);
});
test('human-visible demo data clearly separate from real GitHub metrics',()=>{
 assert.ok(SAMPLE_DATA.startsWith('project,category,phase,points,estimate'));
 assert.equal(parseData(SAMPLE_DATA).rows.length,10);
});
