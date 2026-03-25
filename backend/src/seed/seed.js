import dotenv from "dotenv";
import mongoose from "mongoose";
import User from "../models/User.js";
import Category from "../models/Category.js";
import Product from "../models/Product.js";
import Brand from "../models/Brand.js";
import Supplier from "../models/Supplier.js";
import Sale from "../models/Sale.js";

dotenv.config();

const seed = async () => {
  try {
    const uri = process.env.MONGO_URI;
    if (!uri) throw new Error("MONGO_URI not set in .env");
    await mongoose.connect(uri);
    console.log("Connected to MongoDB");

    // Clear all collections
    await Promise.all([
      User.deleteMany({}),
      Category.deleteMany({}),
      Product.deleteMany({}),
      Brand.deleteMany({}),
      Supplier.deleteMany({}),
      Sale.deleteMany({})
    ]);
    console.log("Cleared all collections");

    // Create users
    const [admin, staff1, staff2, user1, user2] = await User.create([
      { name: "Admin User", email: "admin@coyscorner.com", password: "Admin@123", role: "admin" },
      { name: "Maria Santos", email: "staff1@coyscorner.com", password: "Staff@123", role: "staff" },
      { name: "Juan Dela Cruz", email: "staff2@coyscorner.com", password: "Staff@123", role: "staff" },
      { name: "Ana Reyes", email: "user1@coyscorner.com", password: "User@123", role: "user" },
      { name: "Carlo Mendoza", email: "user2@coyscorner.com", password: "User@123", role: "user" }
    ]);

    // Create brands
    const [brandCoke, brandNestle, brandUnilever, brandLuckyMe, brandLocal] = await Brand.create([
      { name: "Coca-Cola", description: "Beverage brand", isActive: true },
      { name: "Nestle", description: "Food and beverage brand", isActive: true },
      { name: "Unilever", description: "Consumer goods brand", isActive: true },
      { name: "Lucky Me", description: "Noodle brand", isActive: true },
      { name: "Local Brand", description: "Local products", isActive: true }
    ]);

    // Create suppliers
    const [sup1, sup2, sup3, sup4, sup5] = await Supplier.create([
      { name: "Metro Wholesale Distributors", contactPerson: "Jose Rizal", email: "jose@metrowholesale.ph", phone: "09171234567", address: "123 Rizal Ave, Manila", notes: "Main beverage supplier", isActive: true },
      { name: "PH Food Supply Co.", contactPerson: "Maria Clara", email: "maria@phfood.ph", phone: "09181234567", address: "456 EDSA, Quezon City", notes: "Snacks and canned goods", isActive: true },
      { name: "National Distribution Inc.", contactPerson: "Andres Bonifacio", email: "andres@natdist.ph", phone: "09191234567", address: "789 Mabini St, Makati", notes: "Dairy and frozen products", isActive: true },
      { name: "Luzon Traders Corp.", contactPerson: "Emilio Aguinaldo", email: "emilio@luzontraders.ph", phone: "09201234567", address: "321 Katipunan Ave, QC", notes: "Personal care products", isActive: true },
      { name: "Mindanao Fresh Goods", contactPerson: "Lapu-Lapu", email: "lapulapu@mindanaofresh.ph", phone: "09211234567", address: "654 Osmena Blvd, Cebu", notes: "Fresh and bakery items", isActive: true }
    ]);

    // Create categories
    const cats = await Category.create([
      { name: "Beverages" },
      { name: "Snacks" },
      { name: "Canned Goods" },
      { name: "Dairy" },
      { name: "Personal Care" },
      { name: "Household" },
      { name: "Frozen" },
      { name: "Bakery" },
      { name: "Condiments" },
      { name: "Sweets" }
    ]);

    const [catBev, catSnacks, catCanned, catDairy, catPersonal, catHousehold, catFrozen, catBakery, catCond, catSweets] = cats;

    // Create 30 products (3 per category)
    const products = await Product.create([
      // Beverages
      { name: "Coca-Cola 330ml", sku: "CC-001", barcode: "8888001001", category: catBev._id, brand: brandCoke._id, supplier: sup1._id, price: 40, costPrice: 28, stockQuantity: 150, reorderLevel: 20, unit: "can", isActive: true },
      { name: "Sprite 500ml", sku: "CC-002", barcode: "8888001002", category: catBev._id, brand: brandCoke._id, supplier: sup1._id, price: 50, costPrice: 35, stockQuantity: 80, reorderLevel: 20, unit: "bottle", isActive: true },
      { name: "Nestea Iced Tea 500ml", sku: "CC-003", barcode: "8888001003", category: catBev._id, brand: brandNestle._id, supplier: sup1._id, price: 35, costPrice: 22, stockQuantity: 4, reorderLevel: 15, unit: "bottle", isActive: true },

      // Snacks
      { name: "Piattos Cheese 85g", sku: "CC-004", barcode: "8888002001", category: catSnacks._id, brand: brandLocal._id, supplier: sup2._id, price: 38, costPrice: 25, stockQuantity: 60, reorderLevel: 15, unit: "pack", isActive: true },
      { name: "Chippy Chili Lime 110g", sku: "CC-005", barcode: "8888002002", category: catSnacks._id, brand: brandLocal._id, supplier: sup2._id, price: 28, costPrice: 18, stockQuantity: 3, reorderLevel: 10, unit: "pack", isActive: true },
      { name: "Presto Chocolate Cream 330g", sku: "CC-006", barcode: "8888002003", category: catSnacks._id, brand: brandLocal._id, supplier: sup2._id, price: 55, costPrice: 38, stockQuantity: 45, reorderLevel: 12, unit: "pack", isActive: true },

      // Canned Goods
      { name: "Argentina Corned Beef 150g", sku: "CC-007", barcode: "8888003001", category: catCanned._id, brand: brandLocal._id, supplier: sup2._id, price: 75, costPrice: 52, stockQuantity: 90, reorderLevel: 20, unit: "can", isActive: true },
      { name: "Century Tuna Flakes in Oil 155g", sku: "CC-008", barcode: "8888003002", category: catCanned._id, brand: brandLocal._id, supplier: sup2._id, price: 45, costPrice: 30, stockQuantity: 120, reorderLevel: 25, unit: "can", isActive: true },
      { name: "Ligo Sardines in Tomato Sauce 155g", sku: "CC-009", barcode: "8888003003", category: catCanned._id, brand: brandLocal._id, supplier: sup2._id, price: 35, costPrice: 22, stockQuantity: 5, reorderLevel: 20, unit: "can", isActive: true },

      // Dairy
      { name: "Alaska Evaporated Milk 370ml", sku: "CC-010", barcode: "8888004001", category: catDairy._id, brand: brandLocal._id, supplier: sup3._id, price: 42, costPrice: 28, stockQuantity: 70, reorderLevel: 15, unit: "can", isActive: true },
      { name: "Nestle All Purpose Cream 250ml", sku: "CC-011", barcode: "8888004002", category: catDairy._id, brand: brandNestle._id, supplier: sup3._id, price: 55, costPrice: 38, stockQuantity: 55, reorderLevel: 12, unit: "pack", isActive: true },
      { name: "Magnolia Butter 225g", sku: "CC-012", barcode: "8888004003", category: catDairy._id, brand: brandLocal._id, supplier: sup3._id, price: 120, costPrice: 85, stockQuantity: 30, reorderLevel: 10, unit: "pcs", isActive: true },

      // Personal Care
      { name: "Safeguard Classic Bar Soap 135g", sku: "CC-013", barcode: "8888005001", category: catPersonal._id, brand: brandUnilever._id, supplier: sup4._id, price: 45, costPrice: 30, stockQuantity: 80, reorderLevel: 20, unit: "pcs", isActive: true },
      { name: "Head & Shoulders Shampoo 90ml", sku: "CC-014", barcode: "8888005002", category: catPersonal._id, brand: brandUnilever._id, supplier: sup4._id, price: 89, costPrice: 60, stockQuantity: 50, reorderLevel: 15, unit: "bottle", isActive: true },
      { name: "Colgate Toothpaste 150g", sku: "CC-015", barcode: "8888005003", category: catPersonal._id, brand: brandLocal._id, supplier: sup4._id, price: 68, costPrice: 45, stockQuantity: 60, reorderLevel: 15, unit: "pcs", isActive: true },

      // Household
      { name: "Joy Dishwashing Liquid 250ml", sku: "CC-016", barcode: "8888006001", category: catHousehold._id, brand: brandUnilever._id, supplier: sup4._id, price: 55, costPrice: 35, stockQuantity: 40, reorderLevel: 12, unit: "bottle", isActive: true },
      { name: "Ariel Powder Detergent 250g", sku: "CC-017", barcode: "8888006002", category: catHousehold._id, brand: brandUnilever._id, supplier: sup4._id, price: 38, costPrice: 25, stockQuantity: 65, reorderLevel: 15, unit: "pack", isActive: true },
      { name: "Domex Toilet Bowl Cleaner 500ml", sku: "CC-018", barcode: "8888006003", category: catHousehold._id, brand: brandUnilever._id, supplier: sup4._id, price: 75, costPrice: 50, stockQuantity: 35, reorderLevel: 10, unit: "bottle", isActive: true },

      // Frozen
      { name: "Magnolia Chicken Nuggets 500g", sku: "CC-019", barcode: "8888007001", category: catFrozen._id, brand: brandLocal._id, supplier: sup3._id, price: 180, costPrice: 125, stockQuantity: 25, reorderLevel: 8, unit: "pack", isActive: true },
      { name: "Swift Hotdog Classic 1kg", sku: "CC-020", barcode: "8888007002", category: catFrozen._id, brand: brandLocal._id, supplier: sup3._id, price: 220, costPrice: 155, stockQuantity: 20, reorderLevel: 8, unit: "pack", isActive: true },
      { name: "Selecta Ice Cream Vanilla 1.4L", sku: "CC-021", barcode: "8888007003", category: catFrozen._id, brand: brandLocal._id, supplier: sup3._id, price: 280, costPrice: 195, stockQuantity: 15, reorderLevel: 5, unit: "pcs", isActive: true },

      // Bakery
      { name: "Gardenia Classic White Bread", sku: "CC-022", barcode: "8888008001", category: catBakery._id, brand: brandLocal._id, supplier: sup5._id, price: 75, costPrice: 50, stockQuantity: 30, reorderLevel: 10, unit: "pack", isActive: true },
      { name: "Pan de Sal 10pcs", sku: "CC-023", barcode: "8888008002", category: catBakery._id, brand: brandLocal._id, supplier: sup5._id, price: 25, costPrice: 15, stockQuantity: 50, reorderLevel: 15, unit: "pack", isActive: true },
      { name: "Rebisco Crackers 250g", sku: "CC-024", barcode: "8888008003", category: catBakery._id, brand: brandLocal._id, supplier: sup5._id, price: 55, costPrice: 38, stockQuantity: 45, reorderLevel: 12, unit: "pack", isActive: true },

      // Condiments
      { name: "Silver Swan Soy Sauce 1L", sku: "CC-025", barcode: "8888009001", category: catCond._id, brand: brandLocal._id, supplier: sup2._id, price: 65, costPrice: 42, stockQuantity: 55, reorderLevel: 12, unit: "bottle", isActive: true },
      { name: "UFC Banana Ketchup 320g", sku: "CC-026", barcode: "8888009002", category: catCond._id, brand: brandLocal._id, supplier: sup2._id, price: 48, costPrice: 32, stockQuantity: 60, reorderLevel: 15, unit: "bottle", isActive: true },
      { name: "Ajinomoto MSG 100g", sku: "CC-027", barcode: "8888009003", category: catCond._id, brand: brandLocal._id, supplier: sup2._id, price: 22, costPrice: 14, stockQuantity: 80, reorderLevel: 20, unit: "pack", isActive: true },

      // Sweets
      { name: "Choco Mucho Chocolate 50g", sku: "CC-028", barcode: "8888010001", category: catSweets._id, brand: brandLocal._id, supplier: sup5._id, price: 18, costPrice: 11, stockQuantity: 100, reorderLevel: 25, unit: "pcs", isActive: true },
      { name: "Kopiko Coffee Candy 150g", sku: "CC-029", barcode: "8888010002", category: catSweets._id, brand: brandLocal._id, supplier: sup5._id, price: 35, costPrice: 22, stockQuantity: 70, reorderLevel: 20, unit: "pack", isActive: true },
      { name: "Ricoa Flat Tops Chocolate 24pcs", sku: "CC-030", barcode: "8888010003", category: catSweets._id, brand: brandLocal._id, supplier: sup5._id, price: 55, costPrice: 38, stockQuantity: 2, reorderLevel: 10, unit: "pack", isActive: true }
    ]);

    // Create 15 sale transactions spread over past 30 days
    const cashiers = [staff1, staff2];
    const saleData = [
      { daysAgo: 0, cashierIdx: 0, items: [{ p: 0, q: 3 }, { p: 3, q: 2 }] },
      { daysAgo: 1, cashierIdx: 1, items: [{ p: 7, q: 5 }, { p: 8, q: 3 }, { p: 2, q: 2 }] },
      { daysAgo: 2, cashierIdx: 0, items: [{ p: 10, q: 2 }, { p: 11, q: 1 }] },
      { daysAgo: 3, cashierIdx: 1, items: [{ p: 12, q: 4 }, { p: 13, q: 2 }, { p: 14, q: 3 }] },
      { daysAgo: 4, cashierIdx: 0, items: [{ p: 1, q: 6 }, { p: 5, q: 4 }] },
      { daysAgo: 5, cashierIdx: 1, items: [{ p: 19, q: 2 }, { p: 20, q: 1 }, { p: 18, q: 3 }] },
      { daysAgo: 6, cashierIdx: 0, items: [{ p: 21, q: 5 }, { p: 22, q: 10 }] },
      { daysAgo: 8, cashierIdx: 1, items: [{ p: 24, q: 3 }, { p: 25, q: 4 }, { p: 26, q: 2 }] },
      { daysAgo: 10, cashierIdx: 0, items: [{ p: 27, q: 6 }, { p: 28, q: 3 }] },
      { daysAgo: 12, cashierIdx: 1, items: [{ p: 6, q: 2 }, { p: 7, q: 4 }, { p: 9, q: 5 }] },
      { daysAgo: 14, cashierIdx: 0, items: [{ p: 15, q: 3 }, { p: 16, q: 2 }] },
      { daysAgo: 16, cashierIdx: 1, items: [{ p: 0, q: 10 }, { p: 1, q: 8 }, { p: 2, q: 6 }] },
      { daysAgo: 18, cashierIdx: 0, items: [{ p: 23, q: 4 }, { p: 4, q: 3 }] },
      { daysAgo: 22, cashierIdx: 1, items: [{ p: 17, q: 2 }, { p: 10, q: 3 }, { p: 11, q: 2 }] },
      { daysAgo: 28, cashierIdx: 0, items: [{ p: 29, q: 5 }, { p: 28, q: 4 }, { p: 27, q: 8 }] }
    ];

    for (let idx = 0; idx < saleData.length; idx++) {
      const sd = saleData[idx];
      const cashier = cashiers[sd.cashierIdx];
      const saleDate = new Date();
      saleDate.setDate(saleDate.getDate() - sd.daysAgo);
      saleDate.setHours(8 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 60), 0, 0);

      const enrichedItems = sd.items.map(({ p, q }) => {
        const prod = products[p];
        return {
          product: prod._id,
          name: prod.name,
          sku: prod.sku || "",
          quantity: q,
          price: prod.price,
          costPrice: prod.costPrice || 0,
          discount: 0,
          subtotal: prod.price * q
        };
      });

      const subtotal = enrichedItems.reduce((s, i) => s + i.subtotal, 0);
      const total = subtotal;
      const paymentReceived = total + (Math.random() > 0.5 ? Math.ceil(Math.random() * 50) : 0);
      const change = paymentReceived - total;

      const y = saleDate.getFullYear();
      const m = String(saleDate.getMonth() + 1).padStart(2, "0");
      const d = String(saleDate.getDate()).padStart(2, "0");
      const invoiceNumber = `CC-${y}${m}${d}-${String(idx + 1).padStart(4, "0")}`;

      const saleDoc = await Sale.create({
        invoiceNumber,
        cashier: cashier._id,
        customer: null,
        items: enrichedItems,
        subtotal,
        discountAmount: 0,
        discountType: "none",
        discountValue: 0,
        tax: 0,
        taxRate: 0,
        total,
        paymentMethod: ["cash", "gcash", "card"][Math.floor(Math.random() * 3)],
        paymentReceived,
        change,
        notes: "",
        status: "completed"
      });

      // Manually set createdAt since Mongoose doesn't allow direct assignment
      await Sale.findByIdAndUpdate(saleDoc._id, { createdAt: saleDate, updatedAt: saleDate });
    }

    console.log("\n✅ Seed complete!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📧 Admin:  admin@coyscorner.com  / Admin@123");
    console.log("📧 Staff:  staff1@coyscorner.com / Staff@123");
    console.log("📧 Staff:  staff2@coyscorner.com / Staff@123");
    console.log("📧 User:   user1@coyscorner.com  / User@123");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("Seed error:", error);
    process.exit(1);
  }
};

seed();
