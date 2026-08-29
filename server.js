const express=require("express");
const cors=require("cors");
const fs=require("fs");
const path=require("path");
const crypto=require("crypto");
const multer=require("multer");

const app=express();
const PORT=process.env.PORT||3000;
const ROOT=__dirname;
const DATA=path.join(ROOT,"data");
const UPLOADS=path.join(ROOT,"public","uploads");
const ADMIN_USER=process.env.ADMIN_USER||"admin";
const ADMIN_PASS=process.env.ADMIN_PASS||"Memon@12345";
fs.mkdirSync(DATA,{recursive:true}); fs.mkdirSync(UPLOADS,{recursive:true});

const file=(n)=>path.join(DATA,n);
function readJson(n, fallback){try{return JSON.parse(fs.readFileSync(file(n),"utf8"))}catch{return fallback}}
let products=readJson("products.json",[]);
products=products.map(p=>({images:Array.isArray(p.images)?p.images:(p.image?[p.image]:[]),...p}));
let orders=readJson("orders.json",[]);
function saveAll(){fs.writeFileSync(file("products.json"),JSON.stringify(products,null,2));fs.writeFileSync(file("orders.json"),JSON.stringify(orders,null,2));}
function nextId(arr){return arr.length?Math.max(...arr.map(x=>Number(x.id)))+1:1}
function token(){return crypto.randomBytes(24).toString("hex")}
const sessions=new Set();

app.use(cors());
app.use(express.json({limit:"2mb"}));
app.use(express.urlencoded({extended:true}));
app.use(express.static(path.join(ROOT,"public")));

function auth(req,res,next){
  const h=req.headers.authorization||"";
  const t=h.startsWith("Bearer ")?h.slice(7):"";
  if(!sessions.has(t)) return res.status(401).json({error:"Unauthorized"});
  next();
}

const storage=multer.diskStorage({
  destination:(req,file,cb)=>cb(null,UPLOADS),
  filename:(req,file,cb)=>{
    const ext=path.extname(file.originalname).toLowerCase();
    cb(null,`${Date.now()}-${crypto.randomBytes(5).toString("hex")}${ext}`);
  }
});
const upload=multer({
  storage,
  limits:{fileSize:5*1024*1024},
  fileFilter:(req,file,cb)=>{
    if(["image/jpeg","image/png","image/webp","image/gif"].includes(file.mimetype)) cb(null,true);
    else cb(new Error("Only JPG, PNG, WEBP and GIF images are allowed"));
  }
});

app.get("/api/health",(req,res)=>res.json({ok:true,service:"Memon Communication API",time:new Date().toISOString()}));
app.post("/api/admin/login",(req,res)=>{
  const {username,password}=req.body||{};
  if(username===ADMIN_USER && password===ADMIN_PASS){
    const t=token();sessions.add(t);return res.json({token:t,user:username});
  }
  res.status(401).json({error:"Invalid username or password"});
});
app.post("/api/admin/logout",auth,(req,res)=>{
  const h=req.headers.authorization||"";sessions.delete(h.slice(7));res.json({ok:true});
});

app.get("/api/products",(req,res)=>res.json(products));
app.post("/api/products",auth,upload.array("images",10),(req,res)=>{
  const {name,category,price,stock,description=""}=req.body;
  if(!name||!category||price===""||stock==="")return res.status(400).json({error:"Name, category, price and stock are required"});
  const images=(req.files||[]).map(f=>"/uploads/"+f.filename);
  const p={id:nextId(products),name,category,price:Number(price),stock:Number(stock),images,description};
  products.push(p);saveAll();res.status(201).json(p);
});
app.put("/api/products/:id",auth,upload.array("images",10),(req,res)=>{
  const p=products.find(x=>x.id===Number(req.params.id)); if(!p)return res.status(404).json({error:"Product not found"});
  p.name=req.body.name??p.name;p.category=req.body.category??p.category;p.price=Number(req.body.price??p.price);
  p.stock=Number(req.body.stock??p.stock);p.description=req.body.description??p.description;
  const newImages=(req.files||[]).map(f=>"/uploads/"+f.filename);
  if(newImages.length)p.images=[...(p.images||[]),...newImages];
  if(typeof req.body.removeImages==="string"){
    const remove=JSON.parse(req.body.removeImages);
    p.images=(p.images||[]).filter(x=>!remove.includes(x));
  }
  saveAll();res.json(p);
});
app.delete("/api/products/:id",auth,(req,res)=>{products=products.filter(x=>x.id!==Number(req.params.id));saveAll();res.json({ok:true})});

app.post("/api/orders",(req,res)=>{
  const {customer,phone,address,city="Karachi",items}=req.body||{};
  if(!customer||!phone||!address||!Array.isArray(items)||!items.length)return res.status(400).json({error:"Complete customer details and cart are required"});
  let subtotal=0;const lines=[];
  for(const it of items){
    const p=products.find(x=>x.id===Number(it.productId)); const qty=Number(it.qty);
    if(!p||!Number.isInteger(qty)||qty<1)return res.status(400).json({error:"Invalid cart item"});
    if(p.stock<qty)return res.status(400).json({error:`Only ${p.stock} left for ${p.name}`});
    subtotal+=p.price*qty;lines.push({productId:p.id,name:p.name,qty,price:p.price});
  }
  const delivery=subtotal>=10000?0:250;
  const total=subtotal+delivery;
  lines.forEach(x=>products.find(p=>p.id===x.productId).stock-=x.qty);
  const order={id:nextId(orders),customer,phone,address,city,items:lines,subtotal,delivery,total,status:"Pending",createdAt:new Date().toISOString()};
  orders.unshift(order);saveAll();res.status(201).json({orderId:order.id,total,status:order.status});
});
app.get("/api/orders",auth,(req,res)=>res.json(orders));
app.get("/api/orders/:id",auth,(req,res)=>{const o=orders.find(x=>x.id===Number(req.params.id));o?res.json(o):res.status(404).json({error:"Order not found"})});
app.patch("/api/orders/:id",auth,(req,res)=>{
  const o=orders.find(x=>x.id===Number(req.params.id));if(!o)return res.status(404).json({error:"Order not found"});
  const allowed=["Pending","Processing","Shipped","Delivered","Cancelled"];
  if(!allowed.includes(req.body.status))return res.status(400).json({error:"Invalid status"});
  o.status=req.body.status;saveAll();res.json(o);
});

app.post("/api/upload",auth,upload.single("image"),(req,res)=>{
  if(!req.file)return res.status(400).json({error:"Image required"});
  res.json({url:"/uploads/"+req.file.filename});
});

app.use((err,req,res,next)=>{console.error(err);res.status(400).json({error:err.message||"Request failed"})});
app.listen(PORT,()=>console.log(`Memon Communication server running on http://localhost:${PORT}`));
