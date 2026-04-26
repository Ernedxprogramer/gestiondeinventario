import { ProductStatus, PurchaseOrderStatus, SalesOrderStatus, UserRole } from "@prisma/client";
import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

export const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.nativeEnum(UserRole).optional()
});

export const userUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  role: z.nativeEnum(UserRole).optional(),
  isActive: z.boolean().optional()
});

export const categorySchema = z.object({
  name: z.string().min(2),
  description: z.string().optional().nullable()
});

export const supplierSchema = z.object({
  name: z.string().min(2),
  contactName: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  notes: z.string().optional().nullable()
});

export const customerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  notes: z.string().optional().nullable()
});

export const productSchema = z.object({
  sku: z.string().min(2),
  barcode: z.string().optional().nullable(),
  name: z.string().min(2),
  description: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  supplierId: z.string().optional().nullable(),
  unit: z.string().min(1).default("unidad"),
  salePrice: z.coerce.number().min(0),
  costPrice: z.coerce.number().min(0),
  stock: z.coerce.number().int().min(0).default(0),
  minStock: z.coerce.number().int().min(0).default(0),
  maxStock: z.coerce.number().int().min(0).optional().nullable(),
  status: z.nativeEnum(ProductStatus).optional(),
  location: z.string().optional().nullable()
});

export const adjustmentSchema = z.object({
  productId: z.string(),
  quantity: z.coerce.number().int().positive(),
  direction: z.enum(["IN", "OUT"]),
  note: z.string().optional().nullable(),
  reference: z.string().optional().nullable(),
  unitCost: z.coerce.number().min(0).optional().nullable()
});

export const purchaseOrderSchema = z.object({
  supplierId: z.string(),
  expectedDate: z.string().datetime().optional().nullable(),
  notes: z.string().optional().nullable(),
  status: z.nativeEnum(PurchaseOrderStatus).optional(),
  items: z.array(
    z.object({
      productId: z.string(),
      quantity: z.coerce.number().int().positive(),
      unitCost: z.coerce.number().min(0)
    })
  ).min(1)
});

export const receivePurchaseSchema = z.object({
  items: z.array(
    z.object({
      itemId: z.string(),
      receivedQty: z.coerce.number().int().positive()
    })
  ).min(1)
});

export const salesOrderSchema = z.object({
  customerId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  status: z.nativeEnum(SalesOrderStatus).optional(),
  items: z.array(
    z.object({
      productId: z.string(),
      quantity: z.coerce.number().int().positive(),
      unitPrice: z.coerce.number().min(0).optional()
    })
  ).min(1)
});
