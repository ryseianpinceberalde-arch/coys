const mongoose = require("../backend/node_modules/mongoose");

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function toIso(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function userKey(doc) {
  return normalize(doc.email);
}

function categoryKey(doc) {
  return normalize(doc.name);
}

function brandKey(doc) {
  return normalize(doc.name);
}

function supplierKey(doc) {
  const name = normalize(doc.name);
  const email = normalize(doc.email);
  const phone = normalize(doc.phone);
  return `${name}|${email}|${phone}`;
}

function productKey(doc) {
  const barcode = normalize(doc.barcode);
  if (barcode) return `barcode:${barcode}`;
  const sku = normalize(doc.sku);
  if (sku) return `sku:${sku}`;
  return `name:${normalize(doc.name)}`;
}

function saleKey(doc) {
  return normalize(doc.invoiceNumber);
}

function reservationKey(doc) {
  return normalize(doc.reference);
}

function inventoryLogKey(doc) {
  return [
    normalize(doc.type),
    String(doc.quantityChange ?? ""),
    String(doc.previousQuantity ?? ""),
    String(doc.newQuantity ?? ""),
    normalize(doc.note),
    toIso(doc.createdAt),
  ].join("|");
}

const collections = [
  {
    name: "users",
    key: userKey,
    sample: (doc) => ({
      email: doc.email,
      name: doc.name,
      role: doc.role,
      isActive: doc.isActive,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    }),
  },
  {
    name: "categories",
    key: categoryKey,
    sample: (doc) => ({
      name: doc.name,
      description: doc.description,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    }),
  },
  {
    name: "brands",
    key: brandKey,
    sample: (doc) => ({
      name: doc.name,
      description: doc.description,
      isActive: doc.isActive,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    }),
  },
  {
    name: "suppliers",
    key: supplierKey,
    sample: (doc) => ({
      name: doc.name,
      email: doc.email,
      phone: doc.phone,
      isActive: doc.isActive,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    }),
  },
  {
    name: "products",
    key: productKey,
    sample: (doc) => ({
      name: doc.name,
      barcode: doc.barcode,
      sku: doc.sku,
      price: doc.price,
      stockQuantity: doc.stockQuantity,
      isActive: doc.isActive,
      isArchived: doc.isArchived,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    }),
  },
  {
    name: "sales",
    key: saleKey,
    sample: (doc) => ({
      invoiceNumber: doc.invoiceNumber,
      total: doc.total,
      status: doc.status,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      itemCount: Array.isArray(doc.items) ? doc.items.length : 0,
    }),
  },
  {
    name: "reservations",
    key: reservationKey,
    sample: (doc) => ({
      reference: doc.reference,
      status: doc.status,
      total: doc.total,
      dateKey: doc.dateKey,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    }),
  },
  {
    name: "inventorylogs",
    key: inventoryLogKey,
    sample: (doc) => ({
      type: doc.type,
      quantityChange: doc.quantityChange,
      previousQuantity: doc.previousQuantity,
      newQuantity: doc.newQuantity,
      note: doc.note,
      createdAt: doc.createdAt,
    }),
  },
];

async function loadCollection(conn, name, keyFn) {
  const docs = await conn.db.collection(name).find({}).toArray();
  const map = new Map();
  for (const doc of docs) {
    map.set(keyFn(doc), doc);
  }
  return { docs, map };
}

async function compareCollection(leftConn, rightConn, config) {
  const left = await loadCollection(leftConn, config.name, config.key);
  const right = await loadCollection(rightConn, config.name, config.key);

  const onlyLeft = [];
  const onlyRight = [];
  const changed = [];

  for (const [key, doc] of left.map) {
    if (!right.map.has(key)) {
      onlyLeft.push(config.sample(doc));
      continue;
    }

    const rightDoc = right.map.get(key);
    const leftSample = config.sample(doc);
    const rightSample = config.sample(rightDoc);
    if (JSON.stringify(leftSample) !== JSON.stringify(rightSample)) {
      changed.push({ key, left: leftSample, right: rightSample });
    }
  }

  for (const [key, doc] of right.map) {
    if (!left.map.has(key)) {
      onlyRight.push(config.sample(doc));
    }
  }

  return {
    countLeft: left.docs.length,
    countRight: right.docs.length,
    onlyLeft: onlyLeft.slice(0, 10),
    onlyRight: onlyRight.slice(0, 10),
    onlyLeftCount: onlyLeft.length,
    onlyRightCount: onlyRight.length,
    changed: changed.slice(0, 10),
    changedCount: changed.length,
  };
}

async function main() {
  const [leftUri, rightUri] = process.argv.slice(2);
  if (!leftUri || !rightUri) {
    console.error("Usage: node scripts/compare-mongo-dbs.cjs <leftUri> <rightUri>");
    process.exit(1);
  }

  const leftConn = await mongoose.createConnection(leftUri, { dbName: "mern_pos" }).asPromise();
  const rightConn = await mongoose.createConnection(rightUri, { dbName: "mern_pos" }).asPromise();

  const report = {};
  for (const config of collections) {
    report[config.name] = await compareCollection(leftConn, rightConn, config);
  }

  console.log(JSON.stringify(report, null, 2));

  await leftConn.close();
  await rightConn.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
