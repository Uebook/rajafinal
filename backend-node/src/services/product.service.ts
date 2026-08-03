import { db } from '../db/index.js';
import { categories, products, productImages, vendorPricing, retailerPricing } from '../db/schema.js';
import { eq, and, or, ilike, lte, gte, count, sql, asc } from 'drizzle-orm';
import { AppError } from '../utils/errors.js';
import crypto from 'crypto';
import xlsx from 'xlsx';

export function generateSlug(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
}

export function generateUniqueSlug(text: string): string {
  const base = generateSlug(text);
  const rand = crypto.randomBytes(3).toString('hex');
  return `${base}-${rand}`;
}

export class ProductService {
  // ── Category Service Logic ───────────────────────────────────

  async createCategory(data: any) {
    let depth = 0;
    if (data.parentId) {
      const [parent] = await db
        .select()
        .from(categories)
        .where(and(eq(categories.id, data.parentId), eq(categories.isDeleted, false)));

      if (!parent) {
        throw new AppError(400, 'Parent category not found', 'BAD_REQUEST');
      }
      depth = parent.depth + 1;
      if (depth > 2) {
        throw new AppError(400, 'Category depth cannot exceed 2', 'BAD_REQUEST');
      }
    }

    const slug = generateUniqueSlug(data.name);

    const [category] = await db
      .insert(categories)
      .values({
        name: data.name,
        slug,
        description: data.description || null,
        imageUrl: data.imageUrl || null,
        parentId: data.parentId || null,
        visibleToVendor: data.visibleToVendor !== undefined ? data.visibleToVendor : true,
        visibleToRetailer: data.visibleToRetailer !== undefined ? data.visibleToRetailer : true,
        isActive: data.isActive !== undefined ? data.isActive : true,
        depth,
      })
      .returning();

    return {
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      image_url: category.imageUrl,
      parent_id: category.parentId,
      depth: category.depth,
      visible_to_vendor: category.visibleToVendor,
      visible_to_retailer: category.visibleToRetailer,
      is_active: category.isActive,
      created_at: category.createdAt,
      updated_at: category.updatedAt
    };
  }

  async getCategoryTree() {
    const list = await db
      .select()
      .from(categories)
      .where(eq(categories.isDeleted, false))
      .orderBy(categories.name);

    // Build hierarchical tree in-memory
    const map = new Map<string, any>();
    const tree: any[] = [];

    for (const cat of list) {
      map.set(cat.id, {
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        imageUrl: cat.imageUrl,
        parentId: cat.parentId,
        depth: cat.depth,
        visibleToVendor: cat.visibleToVendor,
        visibleToRetailer: cat.visibleToRetailer,
        isActive: cat.isActive,
        createdAt: cat.createdAt,
        updatedAt: cat.updatedAt,
        subcategories: [],
      });
    }

    for (const cat of list) {
      const mapped = map.get(cat.id);
      if (cat.parentId && map.has(cat.parentId)) {
        map.get(cat.parentId).subcategories.push(mapped);
      } else if (cat.depth === 0) {
        tree.push(mapped);
      }
    }

    return tree;
  }

  async listCategories(depth?: number, parentId?: string, isActive?: boolean) {
    const filters = [eq(categories.isDeleted, false)];
    if (depth !== undefined) filters.push(eq(categories.depth, depth));
    if (parentId !== undefined) filters.push(eq(categories.parentId, parentId));
    if (isActive !== undefined) filters.push(eq(categories.isActive, isActive));

    const list = await db
      .select()
      .from(categories)
      .where(and(...filters))
      .orderBy(categories.name);

    return list.map(c => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description,
      image_url: c.imageUrl,
      parent_id: c.parentId,
      depth: c.depth,
      visible_to_vendor: c.visibleToVendor,
      visible_to_retailer: c.visibleToRetailer,
      is_active: c.isActive,
      created_at: c.createdAt,
      updated_at: c.updatedAt
    }));
  }

  async getCategoryById(id: string) {
    const [cat] = await db
      .select()
      .from(categories)
      .where(and(eq(categories.id, id), eq(categories.isDeleted, false)));
    return cat || null;
  }

  async updateCategory(id: string, data: any) {
    const [cat] = await db
      .select()
      .from(categories)
      .where(and(eq(categories.id, id), eq(categories.isDeleted, false)));

    if (!cat) {
      throw new AppError(404, 'Category not found', 'NOT_FOUND');
    }

    let depth = cat.depth;
    const parentIdVal = data.parentId !== undefined ? data.parentId : (data.parent_id !== undefined ? data.parent_id : cat.parentId);
    const newParentId = parentIdVal && parentIdVal !== '' ? parentIdVal : null;
    
    if (newParentId) {
      const [parent] = await db
        .select()
        .from(categories)
        .where(and(eq(categories.id, newParentId), eq(categories.isDeleted, false)));
      if (parent) {
        depth = parent.depth + 1;
      }
    } else {
      depth = 0;
    }

    const imageUrlVal = data.imageUrl !== undefined ? data.imageUrl : (data.image_url !== undefined ? data.image_url : cat.imageUrl);
    const visibleToVendorVal = data.visibleToVendor !== undefined ? data.visibleToVendor : (data.visible_to_vendor !== undefined ? data.visible_to_vendor : cat.visibleToVendor);
    const visibleToRetailerVal = data.visibleToRetailer !== undefined ? data.visibleToRetailer : (data.visible_to_retailer !== undefined ? data.visible_to_retailer : cat.visibleToRetailer);
    const isActiveVal = data.isActive !== undefined ? data.isActive : (data.is_active !== undefined ? data.is_active : cat.isActive);

    const [updated] = await db
      .update(categories)
      .set({
        name: data.name !== undefined ? data.name : cat.name,
        description: data.description !== undefined ? data.description : cat.description,
        imageUrl: imageUrlVal,
        parentId: newParentId,
        depth: depth,
        visibleToVendor: visibleToVendorVal,
        visibleToRetailer: visibleToRetailerVal,
        isActive: isActiveVal,
        updatedAt: new Date(),
      })
      .where(eq(categories.id, id))
      .returning();

    return {
      id: updated.id,
      name: updated.name,
      slug: updated.slug,
      description: updated.description,
      image_url: updated.imageUrl,
      parent_id: updated.parentId,
      depth: updated.depth,
      visible_to_vendor: updated.visibleToVendor,
      visible_to_retailer: updated.visibleToRetailer,
      is_active: updated.isActive,
      created_at: updated.createdAt,
      updated_at: updated.updatedAt
    };
  }

  async softDeleteCategory(id: string) {
    const [cat] = await db
      .select()
      .from(categories)
      .where(and(eq(categories.id, id), eq(categories.isDeleted, false)));

    if (!cat) {
      throw new AppError(404, 'Category not found', 'NOT_FOUND');
    }

    // Recursively soft-delete this category and all its children
    const list = await db.select().from(categories).where(eq(categories.isDeleted, false));
    const toDeleteIds: string[] = [id];

    const findChildren = (parentId: string) => {
      for (const item of list) {
        if (item.parentId === parentId) {
          toDeleteIds.push(item.id);
          findChildren(item.id);
        }
      }
    };
    findChildren(id);

    for (const deleteId of toDeleteIds) {
      await db
        .update(categories)
        .set({ isDeleted: true, deletedAt: new Date() })
        .where(eq(categories.id, deleteId));
    }
  }

  // ── Product Service Logic ────────────────────────────────────

  async createProduct(data: any) {
    if (![0, 5, 12, 18, 28].includes(data.gstRate)) {
      throw new AppError(400, 'GST rate must be 0, 5, 12, 18, or 28', 'BAD_REQUEST');
    }

    const [category] = await db
      .select()
      .from(categories)
      .where(and(eq(categories.id, data.categoryId), eq(categories.isDeleted, false)));
    if (!category) {
      throw new AppError(400, 'Category not found', 'BAD_REQUEST');
    }

    if (data.subCategoryId) {
      const [subCategory] = await db
        .select()
        .from(categories)
        .where(and(eq(categories.id, data.subCategoryId), eq(categories.isDeleted, false)));
      if (!subCategory) {
        throw new AppError(400, 'Subcategory not found', 'BAD_REQUEST');
      }
    }

    return db.transaction(async (tx) => {
      const [product] = await tx
        .insert(products)
        .values({
          name: data.name,
          slug: generateUniqueSlug(data.name),
          sku: data.sku,
          description: data.description || null,
          returnPolicy: data.returnPolicy || 'No returns allowed',
          returnWindowDays: data.returnWindowDays !== undefined ? data.returnWindowDays : 7,
          unit: data.unit || 'piece',
          hsnCode: data.hsnCode || null,
          basePrice: data.basePrice,
          gstRate: data.gstRate,
          stockQty: data.stockQty || 0,
          lowStockThreshold: data.lowStockThreshold !== undefined ? data.lowStockThreshold : 10,
          status: data.status || 'ACTIVE',
          categoryId: data.categoryId,
          subCategoryId: data.subCategoryId || null,
        })
        .returning();

      if (data.imageUrls && data.imageUrls.length > 0) {
        for (let i = 0; i < data.imageUrls.length; i++) {
          await tx.insert(productImages).values({
            productId: product.id,
            imageUrl: data.imageUrls[i],
            sortOrder: i,
          });
        }
      }

      if (data.vendorPrice !== undefined && data.vendorPrice !== null) {
        await tx.insert(vendorPricing).values({
          productId: product.id,
          price: data.vendorPrice,
        });
      }

      if (data.retailerPrice !== undefined && data.retailerPrice !== null) {
        await tx.insert(retailerPricing).values({
          productId: product.id,
          price: data.retailerPrice,
        });
      }

      return product;
    });
  }

  async listProducts(filters: any, userRole?: string) {
    const queryFilters = [eq(products.isDeleted, false)];
    if (filters.keyword) {
      queryFilters.push(
        or(
          ilike(products.name, `%${filters.keyword}%`),
          ilike(products.description, `%${filters.keyword}%`),
          ilike(products.sku, `%${filters.keyword}%`)
        ) as any
      );
    }
    if (filters.categoryId) {
      queryFilters.push(
        or(
          eq(products.categoryId, filters.categoryId),
          eq(products.subCategoryId, filters.categoryId)
        ) as any
      );
    }
    if (filters.subCategoryId) {
      queryFilters.push(eq(products.subCategoryId, filters.subCategoryId));
    }
    if (filters.priceMin !== undefined) {
      queryFilters.push(gte(products.basePrice, filters.priceMin));
    }
    if (filters.priceMax !== undefined) {
      queryFilters.push(lte(products.basePrice, filters.priceMax));
    }
    if (filters.inStock) {
      queryFilters.push(gte(products.stockQty, 1));
    }
    if (filters.status) {
      queryFilters.push(eq(products.status, filters.status));
    }

    const limit = filters.pageSize || 20;
    const offset = ((filters.page || 1) - 1) * limit;

    const list = await db
      .select()
      .from(products)
      .where(and(...queryFilters))
      .orderBy(asc(products.name))
      .limit(limit)
      .offset(offset);

    // Fetch images and pricing relationships
    const productIds = list.map((p) => p.id);
    const imagesList = productIds.length > 0 ? await db.select().from(productImages).where(eq(productImages.isDeleted, false)) : [];
    const vPricesList = productIds.length > 0 ? await db.select().from(vendorPricing).where(eq(vendorPricing.isDeleted, false)) : [];
    const rPricesList = productIds.length > 0 ? await db.select().from(retailerPricing).where(eq(retailerPricing.isDeleted, false)) : [];

    return list.map((p) => {
      const pImages = imagesList.filter((img) => img.productId === p.id).map((img) => ({
        id: img.id,
        image_url: img.imageUrl,
        sort_order: img.sortOrder,
      }));
      const vp = vPricesList.find((v) => v.productId === p.id);
      const rp = rPricesList.find((r) => r.productId === p.id);

      // Resolve base price depending on user roles overrides
      let resolvedPrice = p.basePrice;
      if (userRole === 'VENDOR' && vp) {
        resolvedPrice = vp.price;
      } else if (userRole === 'RETAILER' && rp) {
        resolvedPrice = rp.price;
      }

      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        sku: p.sku,
        description: p.description,
        return_policy: p.returnPolicy,
        return_window_days: p.returnWindowDays,
        unit: p.unit,
        hsn_code: p.hsnCode,
        base_price: resolvedPrice,
        gst_rate: p.gstRate,
        stock_qty: p.stockQty,
        low_stock_threshold: p.lowStockThreshold,
        status: p.status,
        category_id: p.categoryId,
        sub_category_id: p.subCategoryId,
        images: pImages,
        vendor_price: vp?.price || null,
        retailer_price: rp?.price || null,
      };
    });
  }

  async getProductById(id: string, userRole?: string) {
    const [p] = await db
      .select()
      .from(products)
      .where(and(eq(products.id, id), eq(products.isDeleted, false)));

    if (!p) {
      throw new AppError(404, 'Product not found', 'NOT_FOUND');
    }

    const imagesList = await db.select().from(productImages).where(and(eq(productImages.productId, p.id), eq(productImages.isDeleted, false)));
    const [vp] = await db.select().from(vendorPricing).where(and(eq(vendorPricing.productId, p.id), eq(vendorPricing.isDeleted, false)));
    const [rp] = await db.select().from(retailerPricing).where(and(eq(retailerPricing.productId, p.id), eq(retailerPricing.isDeleted, false)));

    let resolvedPrice = p.basePrice;
    if (userRole === 'VENDOR' && vp) {
      resolvedPrice = vp.price;
    } else if (userRole === 'RETAILER' && rp) {
      resolvedPrice = rp.price;
    }

    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      sku: p.sku,
      description: p.description,
      return_policy: p.returnPolicy,
      return_window_days: p.returnWindowDays,
      unit: p.unit,
      hsn_code: p.hsnCode,
      base_price: resolvedPrice,
      gst_rate: p.gstRate,
      stock_qty: p.stockQty,
      low_stock_threshold: p.lowStockThreshold,
      status: p.status,
      category_id: p.categoryId,
      sub_category_id: p.subCategoryId,
      images: imagesList.map((img) => ({ id: img.id, image_url: img.imageUrl, sort_order: img.sortOrder })),
      vendor_price: vp?.price || null,
      retailer_price: rp?.price || null,
    };
  }

  async updateProduct(id: string, data: any) {
    const [p] = await db
      .select()
      .from(products)
      .where(and(eq(products.id, id), eq(products.isDeleted, false)));

    if (!p) {
      throw new AppError(404, 'Product not found', 'NOT_FOUND');
    }

    if (data.gstRate !== undefined && ![0, 5, 12, 18, 28].includes(data.gstRate)) {
      throw new AppError(400, 'GST rate must be 0, 5, 12, 18, or 28', 'BAD_REQUEST');
    }

    return db.transaction(async (tx) => {
      const updatePayload: any = {
        updatedAt: new Date(),
      };

      if (data.name !== undefined) {
        updatePayload.name = data.name;
        updatePayload.slug = generateUniqueSlug(data.name);
      }
      if (data.sku !== undefined) updatePayload.sku = data.sku;
      if (data.description !== undefined) updatePayload.description = data.description;
      if (data.returnPolicy !== undefined) updatePayload.returnPolicy = data.returnPolicy;
      if (data.returnWindowDays !== undefined) updatePayload.returnWindowDays = data.returnWindowDays;
      if (data.unit !== undefined) updatePayload.unit = data.unit;
      if (data.hsnCode !== undefined) updatePayload.hsnCode = data.hsnCode;
      if (data.basePrice !== undefined) updatePayload.basePrice = data.basePrice;
      if (data.gstRate !== undefined) updatePayload.gstRate = data.gstRate;
      if (data.stockQty !== undefined) updatePayload.stockQty = data.stockQty;
      if (data.lowStockThreshold !== undefined) updatePayload.lowStockThreshold = data.lowStockThreshold;
      if (data.status !== undefined) updatePayload.status = data.status;
      if (data.categoryId !== undefined) updatePayload.categoryId = data.categoryId;
      if (data.subCategoryId !== undefined) updatePayload.subCategoryId = data.subCategoryId;

      const [updated] = await tx
        .update(products)
        .set(updatePayload)
        .where(eq(products.id, id))
        .returning();

      if (data.imageUrls !== undefined) {
        await tx.update(productImages).set({ isDeleted: true, deletedAt: new Date() }).where(eq(productImages.productId, id));
        if (data.imageUrls.length > 0) {
          for (let i = 0; i < data.imageUrls.length; i++) {
            await tx.insert(productImages).values({
              productId: id,
              imageUrl: data.imageUrls[i],
              sortOrder: i,
            });
          }
        }
      }

      if (data.vendorPrice !== undefined) {
        await tx.update(vendorPricing).set({ isDeleted: true, deletedAt: new Date() }).where(eq(vendorPricing.productId, id));
        if (data.vendorPrice !== null) {
          await tx.insert(vendorPricing).values({
            productId: id,
            price: data.vendorPrice,
          });
        }
      }

      if (data.retailerPrice !== undefined) {
        await tx.update(retailerPricing).set({ isDeleted: true, deletedAt: new Date() }).where(eq(retailerPricing.productId, id));
        if (data.retailerPrice !== null) {
          await tx.insert(retailerPricing).values({
            productId: id,
            price: data.retailerPrice,
          });
        }
      }

      return updated;
    });
  }

  async adjustStock(id: string, adjustment: number) {
    const [p] = await db
      .select()
      .from(products)
      .where(and(eq(products.id, id), eq(products.isDeleted, false)));

    if (!p) {
      throw new AppError(404, 'Product not found', 'NOT_FOUND');
    }

    const newStock = p.stockQty + adjustment;
    if (newStock < 0) {
      throw new AppError(400, 'Stock cannot go below 0', 'BAD_REQUEST');
    }

    const [updated] = await db
      .update(products)
      .set({ stockQty: newStock, updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning();

    return {
      product_id: id,
      old_stock: p.stockQty,
      new_stock: updated.stockQty,
    };
  }

  // ── Excel/CSV Bulk Import ────────────────────────────────────

  async bulkUploadProducts(buffer: Buffer, filename: string) {
    let rows: any[] = [];

    if (filename.endsWith('.csv')) {
      const csvStr = buffer.toString('utf-8');
      const workbook = xlsx.read(csvStr, { type: 'string' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      rows = xlsx.utils.sheet_to_json(sheet);
    } else if (filename.endsWith('.xlsx') || filename.endsWith('.xls')) {
      const workbook = xlsx.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      rows = xlsx.utils.sheet_to_json(sheet);
    } else {
      throw new AppError(400, 'Unsupported file format. Please upload .csv or .xlsx', 'BAD_REQUEST');
    }

    if (rows.length === 0) {
      throw new AppError(400, 'Empty file', 'BAD_REQUEST');
    }

    const errors: string[] = [];
    let successCount = 0;
    const fileSkus = new Set<string>();

    const HEADER_MAP: Record<string, string> = {
      name: 'name',
      sku: 'sku',
      description: 'description',
      unit: 'unit',
      hsncode: 'hsnCode',
      baseprice: 'basePrice',
      price: 'basePrice',
      gstrate: 'gstRate',
      gst: 'gstRate',
      stockqty: 'stockQty',
      stock: 'stockQty',
      inventory: 'stockQty',
      lowstockthreshold: 'lowStockThreshold',
      threshold: 'lowStockThreshold',
      category: 'categoryName',
      categoryname: 'categoryName',
    };

    const normalizeHeader = (h: string) => h.trim().toLowerCase().replace(/_/g, '').replace(/ /g, '');

    return db.transaction(async (tx) => {
      for (let i = 0; i < rows.length; i++) {
        const rawRow = rows[i];
        const rowNum = i + 2;
        const rowErrors: string[] = [];

        const data: any = {};
        for (const [k, v] of Object.entries(rawRow)) {
          const normKey = normalizeHeader(k);
          if (HEADER_MAP[normKey]) {
            data[HEADER_MAP[normKey]] = v;
          }
        }

        const name = String(data.name || '').trim();
        const sku = String(data.sku || '').trim();
        const categoryName = String(data.categoryName || '').trim();

        if (!name) rowErrors.push('Product name is required');
        if (!sku) rowErrors.push('SKU is required');
        if (!categoryName) rowErrors.push('Category is required');

        let basePrice = 0;
        if (data.basePrice === undefined) {
          rowErrors.push('Base price is required');
        } else {
          const parsedPrice = parseFloat(data.basePrice);
          if (isNaN(parsedPrice) || parsedPrice <= 0) {
            rowErrors.push(`Invalid base price: ${data.basePrice}`);
          } else {
            basePrice = Math.round(parsedPrice * 100);
          }
        }

        let gstRate = 18;
        if (data.gstRate !== undefined) {
          const parsedGst = parseInt(data.gstRate, 10);
          if (![0, 5, 12, 18, 28].includes(parsedGst)) {
            rowErrors.push(`Invalid GST rate: ${data.gstRate}`);
          } else {
            gstRate = parsedGst;
          }
        }

        let stockQty = 0;
        if (data.stockQty !== undefined) {
          const parsedStock = parseInt(data.stockQty, 10);
          if (isNaN(parsedStock) || parsedStock < 0) {
            rowErrors.push(`Invalid stock quantity: ${data.stockQty}`);
          } else {
            stockQty = parsedStock;
          }
        }

        let lowStockThreshold = 10;
        if (data.lowStockThreshold !== undefined) {
          const parsedThreshold = parseInt(data.lowStockThreshold, 10);
          if (isNaN(parsedThreshold) || parsedThreshold < 0) {
            rowErrors.push(`Invalid low stock threshold: ${data.lowStockThreshold}`);
          } else {
            lowStockThreshold = parsedThreshold;
          }
        }

        if (sku) {
          if (fileSkus.has(sku)) {
            rowErrors.push(`Duplicate SKU '${sku}' in this file`);
          } else {
            fileSkus.add(sku);
            const [dbSku] = await tx.select().from(products).where(and(eq(products.sku, sku), eq(products.isDeleted, false)));
            if (dbSku) {
              rowErrors.push(`SKU '${sku}' already exists in DB`);
            }
          }
        }

        if (rowErrors.length > 0) {
          errors.push(`Row ${rowNum}: ${rowErrors.join(', ')}`);
          continue;
        }

        // Find or create category
        let [cat] = await tx
          .select()
          .from(categories)
          .where(and(sql`lower(${categories.name}) = ${categoryName.toLowerCase()}`, eq(categories.isDeleted, false)));

        if (!cat) {
          const slug = generateUniqueSlug(categoryName);
          [cat] = await tx
            .insert(categories)
            .values({
              name: categoryName,
              slug,
              visibleToVendor: true,
              visibleToRetailer: true,
              isActive: true,
              depth: 0,
            })
            .returning();
        }

        // Create product
        await tx.insert(products).values({
          name,
          slug: generateUniqueSlug(name),
          sku,
          description: data.description ? String(data.description).trim() : null,
          unit: data.unit ? String(data.unit).trim() : 'piece',
          hsnCode: data.hsnCode ? String(data.hsnCode).trim() : null,
          basePrice,
          gstRate,
          stockQty,
          lowStockThreshold,
          categoryId: cat.id,
          status: 'ACTIVE',
        });

        successCount++;
      }

      if (errors.length > 0) {
        tx.rollback(); // Drizzle rollback
        throw new AppError(400, JSON.stringify({ message: 'Validation failed during bulk upload', errors }), 'BAD_REQUEST');
      }

      return {
        message: `Successfully imported ${successCount} products`,
        success_count: successCount,
      };
    });
  }
}
