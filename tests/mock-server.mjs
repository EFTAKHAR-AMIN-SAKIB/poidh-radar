import http from "node:http";
const MAX_ID = 137;
const bountyJson = id => ({
  id, title: "Bounty number " + id, description: "Prove it happened. #" + id,
  issuer: "0x" + String(id).padStart(40, "1"),
  amount: (BigInt(id) * 10n ** 16n).toString(), createdAt: 1700000000 + id * 60,
  claims: id % 3 === 0 ? [{ id: id*10, title: "proof", issuer: "0x"+String(id).padStart(40,"2"),
      imageUrl: "ipfs://QmProof"+id, accepted: id % 6 === 0 }] : []
});
const s = http.createServer((req,res)=>{
  const m = new URL(req.url,"http://x").pathname.match(/^\/([a-z]+)\/bounty\/(\d+)\/data$/);
  if(!m){res.writeHead(404);return res.end();}
  const id=Number(m[2]);
  if(m[1]!=="base"||id>MAX_ID){res.writeHead(404);return res.end();}
  res.writeHead(200,{"content-type":"application/json"});
  res.end(JSON.stringify(bountyJson(id)));
});
s.listen(8731,"127.0.0.1",()=>console.log("mock on 8731"));
