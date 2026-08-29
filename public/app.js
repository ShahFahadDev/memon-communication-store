const API="/api";let products=[],cart=[];
const money=n=>"PKR "+Number(n).toLocaleString();
async function load(){const r=await fetch(API+"/products");products=await r.json();render();updateCart()}
function filtered(){let q=document.getElementById("search").value.toLowerCase(),f=document.getElementById("filter").value;return products.filter(p=>(f==="All"||p.category===f)&&(!q||p.name.toLowerCase().includes(q)||p.category.toLowerCase().includes(q)))}
function imageTag(p){
  const imgs=p.images||[];
  return imgs.length?`<img src="${imgs[0]}" alt="${p.name}">`:p.category==="Watches"?"⌚":p.category==="Airbuds"?"🎧":p.category==="Chargers"?"⚡":p.category==="Cables"?"🔌":p.category==="Power Banks"?"🔋":"🔊"
}
function render(){document.getElementById("products").innerHTML=filtered().map(p=>`<article class="product"><div class="pic">${imageTag(p)}</div><div class="body"><div class="cat">${p.category}</div><h3>${p.name}</h3><div class="price">${money(p.price)}</div><div class="stock">${p.stock>0?p.stock+" in stock":"Out of stock"}</div><button class="add" ${p.stock<1?"disabled":""} onclick="add(${p.id})">${p.stock<1?"Out of stock":"Add to cart"}</button><button class="details" onclick="details(${p.id})">View details</button></div></article>`).join("")||"<p>No products found.</p>"}
function choose(c){document.getElementById("filter").value=c;render();document.getElementById("shop").scrollIntoView({behavior:"smooth"})}
document.getElementById("search").oninput=render;document.getElementById("filter").onchange=render;
document.getElementById("searchTop").onclick=()=>{document.getElementById("shop").scrollIntoView({behavior:"smooth"});document.getElementById("search").focus()}
function add(id){let p=products.find(x=>x.id===id),x=cart.find(x=>x.id===id);if(x){if(x.qty<p.stock)x.qty++}else cart.push({...p,qty:1});updateCart();openCart()}
function removeItem(i){cart.splice(i,1);updateCart()}
function updateCart(){document.getElementById("count").textContent=cart.reduce((s,p)=>s+p.qty,0);document.getElementById("cartItems").innerHTML=cart.length?cart.map((p,i)=>`<div class="cartRow"><div><b>${p.name}</b><small>${p.qty} × ${money(p.price)}</small></div><button onclick="removeItem(${i})">×</button></div>`).join(""):"<p>Your cart is empty.</p>";let sub=cart.reduce((s,p)=>s+p.price*p.qty,0),del=sub>=10000||!sub?0:250;document.getElementById("sub").textContent=money(sub);document.getElementById("del").textContent=money(del);document.getElementById("total").textContent=money(sub+del)}
function openCart(){document.getElementById("cart").classList.add("open");document.getElementById("shade").classList.add("open")}function closeCart(){document.getElementById("cart").classList.remove("open");document.getElementById("shade").classList.remove("open")}
function details(id){
 let p=products.find(x=>x.id===id),imgs=p.images||[];
 let gallery=imgs.length?`<div class="galleryMain"><img id="mainGalleryImage" src="${imgs[0]}" alt="${p.name}"></div><div class="thumbs">${imgs.map((x,i)=>`<button class="${i===0?"active":""}" onclick="changeGallery('${x}',this)"><img src="${x}" alt=""></button>`).join("")}</div>`:`<div class="modalPic">${imageTag(p)}</div>`;
 document.getElementById("modalContent").innerHTML=`<div class="modalProduct"><div>${gallery}</div><div><div class="tag">${p.category}</div><h2>${p.name}</h2><p>${p.description||"Quality product from Memon Communication."}</p><div class="modalPrice">${money(p.price)}</div><button onclick="add(${p.id});closeModal()">Add to cart</button></div></div>`;
 document.getElementById("modal").classList.add("show")
}
function changeGallery(src,btn){
 document.getElementById("mainGalleryImage").src=src;
 document.querySelectorAll(".thumbs button").forEach(x=>x.classList.remove("active"));
 btn.classList.add("active")
}
function closeModal(){document.getElementById("modal").classList.remove("show")}
async function checkout(){if(!cart.length)return alert("Your cart is empty.");const customer=prompt("Customer name:");if(!customer)return;const phone=prompt("Phone number:");if(!phone)return;const address=prompt("Delivery address:");if(!address)return;const city=prompt("City:","Karachi")||"Karachi";const r=await fetch(API+"/orders",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({customer,phone,address,city,items:cart.map(p=>({productId:p.id,qty:p.qty}))})});const d=await r.json();if(!r.ok)return alert(d.error||"Order failed");alert(`Order #${d.orderId} placed successfully.\nTotal: ${money(d.total)}`);cart=[];await closeCart();load();closeCart()}
closeCart();load();
