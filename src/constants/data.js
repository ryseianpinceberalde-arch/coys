export const STORE_NAME = "Coy's Corner";
export const STORE_TAGLINE = "Order ahead and track your status live";
export const CURRENCY = "\u20B1";

export const TIME_SLOTS = [
  "09:00","09:30","10:00","10:30","11:00","11:30",
  "12:00","12:30","13:00","13:30","14:00","14:30",
  "15:00","15:30","16:00","16:30","17:00","17:30",
  "18:00","18:30","19:00","19:30","20:00","20:30",
];

export const categories = [
  { id: "all", name: "All", icon: "\uD83D\uDCCB" },
  { id: "drinks", name: "Drinks", icon: "\uD83E\uDD64" },
  { id: "meals", name: "Meals", icon: "\uD83C\uDF5B" },
  { id: "snacks", name: "Snacks", icon: "\uD83C\uDF5F" },
  { id: "desserts", name: "Desserts", icon: "\uD83C\uDF70" },
  { id: "services", name: "Services", icon: "\u2B50" },
];

export const products = [
  { id:"1", name:"Iced Caramel Latte", category:"drinks", price:149, desc:"Smooth espresso with caramel drizzle", emoji:"\u2615" },
  { id:"2", name:"Mango Smoothie", category:"drinks", price:129, desc:"Fresh mango blended with yogurt", emoji:"\uD83E\uDD6D" },
  { id:"3", name:"Chicken Adobo Plate", category:"meals", price:259, desc:"Classic adobo with steamed rice", emoji:"\uD83C\uDF57" },
  { id:"4", name:"Pork Sisig", category:"meals", price:239, desc:"Sizzling sisig on a hot plate", emoji:"\uD83C\uDF56" },
  { id:"5", name:"Crispy Fries", category:"snacks", price:89, desc:"Golden crispy french fries", emoji:"\uD83C\uDF5F" },
  { id:"6", name:"Nachos Grande", category:"snacks", price:189, desc:"Loaded nachos with cheese and salsa", emoji:"\uD83E\uDDC0" },
  { id:"7", name:"Halo-Halo", category:"desserts", price:159, desc:"Shaved ice dessert with toppings", emoji:"\uD83C\uDF67" },
  { id:"8", name:"Leche Flan", category:"desserts", price:99, desc:"Creamy caramel custard", emoji:"\uD83C\uDF6E" },
  { id:"9", name:"Party Room (3hrs)", category:"services", price:2500, desc:"Private room for up to 15 guests", emoji:"\uD83C\uDF89" },
  { id:"10", name:"Catering Package", category:"services", price:5000, desc:"Full catering for 20 people", emoji:"\uD83C\uDF7D\uFE0F" },
];

export const sampleReservations = [
  {
    id: "RES-20260414-001",
    date: "Apr 14, 2026", time: "12:00 PM",
    items: [{ name:"Chicken Adobo Plate", qty:2, price:259 }, { name:"Iced Caramel Latte", qty:3, price:149 }],
    customer: { name:"Juan Dela Cruz", phone:"09123456789", email:"juan@email.com" },
    total: 965, status:"confirmed", notes:"Window seat please",
  },
  {
    id: "RES-20260411-003",
    date: "Apr 11, 2026", time: "6:00 PM",
    items: [{ name:"Party Room (3hrs)", qty:1, price:2500 }],
    customer: { name:"Juan Dela Cruz", phone:"09123456789", email:"juan@email.com" },
    total: 2500, status:"completed", notes:"Birthday party",
  },
  {
    id: "RES-20260410-002",
    date: "Apr 10, 2026", time: "2:00 PM",
    items: [{ name:"Halo-Halo", qty:4, price:159 }],
    customer: { name:"Juan Dela Cruz", phone:"09123456789", email:"juan@email.com" },
    total: 636, status:"cancelled", notes:"",
  },
  {
    id: "RES-20260409-004",
    date: "Apr 9, 2026", time: "11:00 AM",
    items: [{ name:"Mango Smoothie", qty:2, price:129 }],
    customer: { name:"Juan Dela Cruz", phone:"09123456789", email:"juan@email.com" },
    total: 258, status:"pending", notes:"Extra ice",
  },
];
