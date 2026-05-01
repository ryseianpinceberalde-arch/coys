const mongoose = require("../backend/node_modules/mongoose");

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function idString(value) {
  return value ? String(value) : "";
}

function maybeDate(value) {
  if (!value) return new Date(0);
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date(0) : date;
}

function pickNewId(targetIdSet) {
  let candidate = new mongoose.Types.ObjectId();
  while (targetIdSet.has(idString(candidate))) {
    candidate = new mongoose.Types.ObjectId();
  }
  return candidate;
}

function cloneDoc(doc) {
  return { ...doc };
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
  return `${normalize(doc.name)}|${normalize(doc.email)}|${normalize(doc.phone)}`;
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
    maybeDate(doc.createdAt).toISOString(),
    normalize(doc.product),
  ].join("|");
}

function auditLogKey(doc) {
  return [
    normalize(doc.action),
    normalize(doc.entity),
    normalize(doc.entityId),
    maybeDate(doc.createdAt).toISOString(),
    normalize(doc.user),
  ].join("|");
}

function cartKey(doc) {
  return [
    normalize(doc.user),
    String(doc.isCheckedOut ?? false),
    maybeDate(doc.updatedAt).toISOString(),
  ].join("|");
}

async function loadCollection(conn, name) {
  return conn.db.collection(name).find({}).toArray();
}

async function ensureCollection(conn, name) {
  const collections = await conn.db.listCollections({ name }).toArray();
  if (collections.length === 0) {
    await conn.db.createCollection(name);
  }
  return conn.db.collection(name);
}

async function mergeReferenceCollection({
  sourceConn,
  targetConn,
  collectionName,
  keyFn,
  choosePreferred,
  transformInsert = (doc) => doc,
}) {
  const sourceDocs = await loadCollection(sourceConn, collectionName);
  const targetDocs = await loadCollection(targetConn, collectionName);
  const targetCollection = await ensureCollection(targetConn, collectionName);

  const targetByKey = new Map(targetDocs.map((doc) => [keyFn(doc), doc]));
  const targetIdSet = new Set(targetDocs.map((doc) => idString(doc._id)));
  const sourceToTarget = new Map();
  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const sourceDoc of sourceDocs) {
    const key = keyFn(sourceDoc);
    const existing = targetByKey.get(key);

    if (existing) {
      sourceToTarget.set(idString(sourceDoc._id), existing._id);
      const preferred = choosePreferred ? choosePreferred(existing, sourceDoc) : existing;
      if (preferred === sourceDoc) {
        const replacement = transformInsert(cloneDoc(sourceDoc), sourceToTarget);
        replacement._id = existing._id;
        await targetCollection.replaceOne({ _id: existing._id }, replacement);
        targetByKey.set(key, replacement);
        updated += 1;
      } else {
        skipped += 1;
      }
      continue;
    }

    const insertDoc = transformInsert(cloneDoc(sourceDoc), sourceToTarget);
    const sourceId = idString(insertDoc._id);
    if (!insertDoc._id || targetIdSet.has(sourceId)) {
      insertDoc._id = pickNewId(targetIdSet);
    }
    await targetCollection.insertOne(insertDoc);
    targetByKey.set(key, insertDoc);
    targetIdSet.add(idString(insertDoc._id));
    sourceToTarget.set(idString(sourceDoc._id), insertDoc._id);
    inserted += 1;
  }

  return { inserted, updated, skipped, sourceToTarget };
}

function preferNewerMeaningfulDoc(existing, source) {
  const existingScore = JSON.stringify(existing).length;
  const sourceScore = JSON.stringify(source).length;
  if (sourceScore > existingScore && maybeDate(source.updatedAt) > maybeDate(existing.updatedAt)) {
    return source;
  }
  return existing;
}

async function mergeProducts(sourceConn, targetConn, refs) {
  const sourceDocs = await loadCollection(sourceConn, "products");
  const targetDocs = await loadCollection(targetConn, "products");
  const collection = await ensureCollection(targetConn, "products");
  const targetByKey = new Map(targetDocs.map((doc) => [productKey(doc), doc]));
  const targetIdSet = new Set(targetDocs.map((doc) => idString(doc._id)));
  const sourceToTarget = new Map();
  let inserted = 0;
  let skipped = 0;

  for (const sourceDoc of sourceDocs) {
    const key = productKey(sourceDoc);
    const existing = targetByKey.get(key);
    if (existing) {
      sourceToTarget.set(idString(sourceDoc._id), existing._id);
      skipped += 1;
      continue;
    }

    const doc = cloneDoc(sourceDoc);
    doc.category = refs.categories.get(idString(sourceDoc.category)) || sourceDoc.category;
    doc.brand = refs.brands.get(idString(sourceDoc.brand)) || sourceDoc.brand || undefined;
    doc.supplier = refs.suppliers.get(idString(sourceDoc.supplier)) || sourceDoc.supplier || undefined;

    const sourceId = idString(doc._id);
    if (!doc._id || targetIdSet.has(sourceId)) {
      doc._id = pickNewId(targetIdSet);
    }

    await collection.insertOne(doc);
    targetByKey.set(key, doc);
    targetIdSet.add(idString(doc._id));
    sourceToTarget.set(idString(sourceDoc._id), doc._id);
    inserted += 1;
  }

  return { inserted, skipped, sourceToTarget };
}

async function mergeSales(sourceConn, targetConn, refs) {
  const sourceDocs = await loadCollection(sourceConn, "sales");
  const targetDocs = await loadCollection(targetConn, "sales");
  const collection = await ensureCollection(targetConn, "sales");
  const targetByKey = new Map(targetDocs.map((doc) => [saleKey(doc), doc]));
  const targetIdSet = new Set(targetDocs.map((doc) => idString(doc._id)));
  let inserted = 0;
  let skipped = 0;

  for (const sourceDoc of sourceDocs) {
    const key = saleKey(sourceDoc);
    if (targetByKey.has(key)) {
      skipped += 1;
      continue;
    }

    const doc = cloneDoc(sourceDoc);
    doc.cashier = refs.users.get(idString(sourceDoc.cashier)) || sourceDoc.cashier;
    doc.customer = sourceDoc.customer
      ? refs.users.get(idString(sourceDoc.customer)) || sourceDoc.customer
      : null;
    doc.items = (sourceDoc.items || []).map((item) => ({
      ...item,
      product: item.product ? refs.products.get(idString(item.product)) || item.product : item.product,
    }));

    const sourceId = idString(doc._id);
    if (!doc._id || targetIdSet.has(sourceId)) {
      doc._id = pickNewId(targetIdSet);
    }

    await collection.insertOne(doc);
    targetByKey.set(key, doc);
    targetIdSet.add(idString(doc._id));
    inserted += 1;
  }

  return { inserted, skipped };
}

async function repairSaleItemProductRefs(targetConn) {
  const salesCollection = await ensureCollection(targetConn, "sales");
  const products = await loadCollection(targetConn, "products");
  const productIds = new Set(products.map((doc) => idString(doc._id)));
  const bySku = new Map(products.filter((doc) => doc.sku).map((doc) => [normalize(doc.sku), doc._id]));
  const byName = new Map(products.map((doc) => [normalize(doc.name), doc._id]));
  const sales = await loadCollection(targetConn, "sales");

  let salesUpdated = 0;
  let itemsUpdated = 0;

  for (const sale of sales) {
    let changed = false;
    const items = (sale.items || []).map((item) => {
      if (!item.product || productIds.has(idString(item.product))) {
        return item;
      }

      const replacement =
        (item.sku && bySku.get(normalize(item.sku))) ||
        byName.get(normalize(item.name));

      if (!replacement) {
        return item;
      }

      changed = true;
      itemsUpdated += 1;
      return {
        ...item,
        product: replacement,
      };
    });

    if (!changed) {
      continue;
    }

    await salesCollection.updateOne({ _id: sale._id }, { $set: { items } });
    salesUpdated += 1;
  }

  return { salesUpdated, itemsUpdated };
}

async function mergeReservations(sourceConn, targetConn, refs) {
  const sourceDocs = await loadCollection(sourceConn, "reservations");
  const targetDocs = await loadCollection(targetConn, "reservations");
  const collection = await ensureCollection(targetConn, "reservations");
  const targetByKey = new Map(targetDocs.map((doc) => [reservationKey(doc), doc]));
  const targetIdSet = new Set(targetDocs.map((doc) => idString(doc._id)));
  let inserted = 0;
  let skipped = 0;

  for (const sourceDoc of sourceDocs) {
    const key = reservationKey(sourceDoc);
    if (targetByKey.has(key)) {
      skipped += 1;
      continue;
    }

    const doc = cloneDoc(sourceDoc);
    doc.user = refs.users.get(idString(sourceDoc.user)) || sourceDoc.user;
    doc.items = (sourceDoc.items || []).map((item) => ({
      ...item,
      product: refs.products.get(idString(item.product)) || item.product,
    }));

    const sourceId = idString(doc._id);
    if (!doc._id || targetIdSet.has(sourceId)) {
      doc._id = pickNewId(targetIdSet);
    }

    await collection.insertOne(doc);
    targetByKey.set(key, doc);
    targetIdSet.add(idString(doc._id));
    inserted += 1;
  }

  return { inserted, skipped };
}

async function mergeInventoryLogs(sourceConn, targetConn, refs) {
  const sourceDocs = await loadCollection(sourceConn, "inventorylogs");
  const targetDocs = await loadCollection(targetConn, "inventorylogs");
  const collection = await ensureCollection(targetConn, "inventorylogs");
  const targetByKey = new Map(targetDocs.map((doc) => [inventoryLogKey(doc), doc]));
  const targetIdSet = new Set(targetDocs.map((doc) => idString(doc._id)));
  let inserted = 0;
  let skipped = 0;

  for (const sourceDoc of sourceDocs) {
    const doc = cloneDoc(sourceDoc);
    doc.product = refs.products.get(idString(sourceDoc.product)) || sourceDoc.product;
    doc.createdBy = sourceDoc.createdBy
      ? refs.users.get(idString(sourceDoc.createdBy)) || sourceDoc.createdBy
      : sourceDoc.createdBy;
    const key = inventoryLogKey(doc);
    if (targetByKey.has(key)) {
      skipped += 1;
      continue;
    }

    const sourceId = idString(doc._id);
    if (!doc._id || targetIdSet.has(sourceId)) {
      doc._id = pickNewId(targetIdSet);
    }

    await collection.insertOne(doc);
    targetByKey.set(key, doc);
    targetIdSet.add(idString(doc._id));
    inserted += 1;
  }

  return { inserted, skipped };
}

async function mergeAuditLogs(sourceConn, targetConn, refs) {
  const sourceDocs = await loadCollection(sourceConn, "auditlogs");
  const targetDocs = await loadCollection(targetConn, "auditlogs");
  const collection = await ensureCollection(targetConn, "auditlogs");
  const targetByKey = new Map(targetDocs.map((doc) => [auditLogKey(doc), doc]));
  const targetIdSet = new Set(targetDocs.map((doc) => idString(doc._id)));
  let inserted = 0;
  let skipped = 0;

  for (const sourceDoc of sourceDocs) {
    const doc = cloneDoc(sourceDoc);
    doc.user = sourceDoc.user ? refs.users.get(idString(sourceDoc.user)) || sourceDoc.user : sourceDoc.user;
    const key = auditLogKey(doc);
    if (targetByKey.has(key)) {
      skipped += 1;
      continue;
    }

    const sourceId = idString(doc._id);
    if (!doc._id || targetIdSet.has(sourceId)) {
      doc._id = pickNewId(targetIdSet);
    }

    await collection.insertOne(doc);
    targetByKey.set(key, doc);
    targetIdSet.add(idString(doc._id));
    inserted += 1;
  }

  return { inserted, skipped };
}

async function mergeCarts(sourceConn, targetConn, refs) {
  const sourceDocs = await loadCollection(sourceConn, "carts");
  const targetDocs = await loadCollection(targetConn, "carts");
  const collection = await ensureCollection(targetConn, "carts");
  const targetByKey = new Map(targetDocs.map((doc) => [cartKey(doc), doc]));
  const targetIdSet = new Set(targetDocs.map((doc) => idString(doc._id)));
  let inserted = 0;
  let skipped = 0;

  for (const sourceDoc of sourceDocs) {
    const doc = cloneDoc(sourceDoc);
    doc.user = refs.users.get(idString(sourceDoc.user)) || sourceDoc.user;
    doc.items = (sourceDoc.items || []).map((item) => ({
      ...item,
      product: refs.products.get(idString(item.product)) || item.product,
    }));
    const key = cartKey(doc);
    if (targetByKey.has(key)) {
      skipped += 1;
      continue;
    }

    const sourceId = idString(doc._id);
    if (!doc._id || targetIdSet.has(sourceId)) {
      doc._id = pickNewId(targetIdSet);
    }

    await collection.insertOne(doc);
    targetByKey.set(key, doc);
    targetIdSet.add(idString(doc._id));
    inserted += 1;
  }

  return { inserted, skipped };
}

async function mergeStoreSettings(sourceConn, targetConn) {
  const sourceDocs = await loadCollection(sourceConn, "storesettings");
  const targetDocs = await loadCollection(targetConn, "storesettings");
  const collection = await ensureCollection(targetConn, "storesettings");

  if (targetDocs.length === 0 && sourceDocs.length > 0) {
    await collection.insertOne(cloneDoc(sourceDocs[0]));
    return { inserted: 1, skipped: 0 };
  }

  if (sourceDocs.length === 0) {
    return { inserted: 0, skipped: 0 };
  }

  if (targetDocs.length === 0) {
    return { inserted: 0, skipped: 0 };
  }

  const target = targetDocs[0];
  const source = sourceDocs[0];
  const preferred = preferNewerMeaningfulDoc(target, source);
  if (preferred === source) {
    const replacement = cloneDoc(source);
    replacement._id = target._id;
    await collection.replaceOne({ _id: target._id }, replacement);
    return { inserted: 0, updated: 1, skipped: 0 };
  }

  return { inserted: 0, updated: 0, skipped: 1 };
}

async function main() {
  const [sourceUri, targetUri] = process.argv.slice(2);
  if (!sourceUri || !targetUri) {
    console.error("Usage: node scripts/merge-mongo-dbs.cjs <sourceUri> <targetUri>");
    process.exit(1);
  }

  const sourceConn = await mongoose.createConnection(sourceUri, { dbName: "mern_pos" }).asPromise();
  const targetConn = await mongoose.createConnection(targetUri, { dbName: "mern_pos" }).asPromise();

  const users = await mergeReferenceCollection({
    sourceConn,
    targetConn,
    collectionName: "users",
    keyFn: userKey,
    choosePreferred: preferNewerMeaningfulDoc,
  });

  const categories = await mergeReferenceCollection({
    sourceConn,
    targetConn,
    collectionName: "categories",
    keyFn: categoryKey,
    choosePreferred: preferNewerMeaningfulDoc,
  });

  const brands = await mergeReferenceCollection({
    sourceConn,
    targetConn,
    collectionName: "brands",
    keyFn: brandKey,
    choosePreferred: preferNewerMeaningfulDoc,
  });

  const suppliers = await mergeReferenceCollection({
    sourceConn,
    targetConn,
    collectionName: "suppliers",
    keyFn: supplierKey,
    choosePreferred: preferNewerMeaningfulDoc,
  });

  const products = await mergeProducts(sourceConn, targetConn, {
    users: users.sourceToTarget,
    categories: categories.sourceToTarget,
    brands: brands.sourceToTarget,
    suppliers: suppliers.sourceToTarget,
  });

  const sales = await mergeSales(sourceConn, targetConn, {
    users: users.sourceToTarget,
    products: products.sourceToTarget,
  });
  const repairedSales = await repairSaleItemProductRefs(targetConn);

  const reservations = await mergeReservations(sourceConn, targetConn, {
    users: users.sourceToTarget,
    products: products.sourceToTarget,
  });

  const inventorylogs = await mergeInventoryLogs(sourceConn, targetConn, {
    users: users.sourceToTarget,
    products: products.sourceToTarget,
  });

  const auditlogs = await mergeAuditLogs(sourceConn, targetConn, {
    users: users.sourceToTarget,
  });

  const carts = await mergeCarts(sourceConn, targetConn, {
    users: users.sourceToTarget,
    products: products.sourceToTarget,
  });

  const storesettings = await mergeStoreSettings(sourceConn, targetConn);

  console.log(
    JSON.stringify(
      {
        users: { inserted: users.inserted, updated: users.updated, skipped: users.skipped },
        categories: { inserted: categories.inserted, updated: categories.updated, skipped: categories.skipped },
        brands: { inserted: brands.inserted, updated: brands.updated, skipped: brands.skipped },
        suppliers: { inserted: suppliers.inserted, updated: suppliers.updated, skipped: suppliers.skipped },
        products,
        sales,
        repairedSales,
        reservations,
        inventorylogs,
        auditlogs,
        carts,
        storesettings,
      },
      null,
      2
    )
  );

  await sourceConn.close();
  await targetConn.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
