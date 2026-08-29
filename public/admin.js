let token=localStorage.getItem("memon_admin_token")||"";
const API="/api";const $=id=>document.getElementById(id);
function headers(){return token?{"Authorization":"Bearer "+token}:{}}
function showApp(){ $("login").classList.add("hidden");$("app").classList.remove("hidden");load()}
async function login(ev){
  if(ev)ev.preventDefault();
  const btn=$("loginBtn"),msg=$("loginMsg");
  msg.textContent="Connecting to server...";
  btn.disabled=true;
  try{
    const r=await fetch(API+"/admin/login",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({username:$("u").value.trim(),password:$("p").value})
    });
    const d=await r.json().catch(()=>({error:"Server returned invalid JSON"}));
    if(!r.ok){msg.textContent=d.error||"Login failed";btn.disabled=false;return}
    token=d.token;localStorage.setItem("memon_admin_token",token);showApp();
  }catch(e){
    msg.textContent="Backend is not reachable. Open http://localhost:3000/admin.html and make sure npm start is running.";
    btn.disabled=false;
  }
}
async function logout(){
  try{await fetch(API+"/admin/logout",{method:"POST",headers:headers()})}catch(e){}
  localStorage.removeItem("memon_admin_token");location.reload()
}
$("loginForm").addEventListener("submit",login);
$("form").onsubmit=async e=>{
  e.preventDefault();
  const fd=new FormData(e.target),r=await fetch(API+"/products",{method:"POST",headers:headers(),body:fd});
  const d=await r.json().catch(()=>({error:"Invalid server response"}));
  if(!r.ok){alert(d.error||"Could not add product");return}
  e.target.reset();load()
};
async function load(){
  try{
    const [pr,or]=await Promise.all([fetch(API+"/products"),fetch(API+"/orders",{headers:headers()})]);
    if(or.status===401)return logout();
    const ps=await pr.json(),os=await or.json();
    $("statProducts").textContent=ps.length;
    $("statStock").textContent=ps.reduce((s,p)=>s+Number(p.stock),0);
    $("statOrders").textContent=os.length;
    $("statSales").textContent="PKR "+os.reduce((s,o)=>s+Number(o.total),0).toLocaleString();
    $("products").innerHTML=ps.map(p=>`<div class="row"><div>${(p.images&&p.images.length)?`<img class="thumb" src="${p.images[0]}">`:"📦"}</div><div><b>${p.name}</b><div class="muted">${p.description||""}</div><div class="muted">${(p.images||[]).length} image(s)</div></div><span>${p.category}</span><b>PKR ${Number(p.price).toLocaleString()}</b><span>Stock: ${p.stock}</span><div class="rowBtns"><button class="editBtn" onclick="editProduct(${p.id})">Edit</button><button onclick="del(${p.id})">Delete</button></div></div>`).join("")||"<p>No products.</p>";
    $("orders").innerHTML=os.map(o=>`<div class="orderRow"><b>#${o.id}</b><div><b>${o.customer}</b><div class="muted">${o.phone} · ${o.city}</div><div class="muted">${o.address}</div><div class="orderItems">${(o.items||[]).map(i=>`${i.name} × ${i.qty}`).join("<br>")}</div></div><b>PKR ${Number(o.total).toLocaleString()}</b><span>${new Date(o.createdAt).toLocaleString()}</span><span>${o.status}</span><select onchange="status(${o.id},this.value)">${["Pending","Processing","Shipped","Delivered","Cancelled"].map(s=>`<option ${s===o.status?"selected":""}>${s}</option>`).join("")}</select></div>`).join("")||"<p>No orders yet.</p>";
  }catch(e){alert("Could not load admin data. Make sure npm start is running.")}
}
async function del(id){if(!confirm("Delete this product?"))return;const r=await fetch(API+"/products/"+id,{method:"DELETE",headers:headers()});if(r.status===401)return logout();load()}
async function status(id,status){const r=await fetch(API+"/orders/"+id,{method:"PATCH",headers:{...headers(),"Content-Type":"application/json"},body:JSON.stringify({status})});if(r.status===401)return logout();load()}
if(token)showApp();

async function editProduct(id){
 const p=await fetch(API+"/products/"+id).then(r=>r.json());
 const f=$("editForm");f.elements.id.value=p.id;f.elements.name.value=p.name;f.elements.category.value=p.category;f.elements.price.value=p.price;f.elements.stock.value=p.stock;f.elements.description.value=p.description||"";
 const imgs=p.images||[];
 $("existingImages").innerHTML=imgs.length?imgs.map(x=>`<label class="imgPick"><img src="${x}"><input type="checkbox" value="${x}"> Remove</label>`).join(""):"<span class='muted'>No existing images</span>";
 $("editModal").classList.add("show");
}
function closeEdit(){$("editModal").classList.remove("show")}
$("editForm").onsubmit=async e=>{
 e.preventDefault();const fd=new FormData(e.target);
 const remove=[...$("existingImages").querySelectorAll("input:checked")].map(x=>x.value);fd.append("removeImages",JSON.stringify(remove));
 const id=fd.get("id");fd.delete("id");
 const r=await fetch(API+"/products/"+id,{method:"PUT",headers:headers(),body:fd});const d=await r.json();
 if(!r.ok)return alert(d.error||"Update failed");
 closeEdit();load();
};
