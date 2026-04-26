import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("Admin12345!", 10);

  await prisma.user.upsert({
    where: { email: "admin@inventory.local" },
    update: {},
    create: {
      name: "Administrador",
      email: "admin@inventory.local",
      passwordHash,
      role: UserRole.ADMIN
    }
  });

  const category = await prisma.category.upsert({
    where: { name: "General" },
    update: {},
    create: {
      name: "General",
      description: "Categoria inicial"
    }
  });

  const existingSupplier = await prisma.supplier.findFirst({
    where: {
      name: "Proveedor Demo"
    }
  });

  const supplier =
    existingSupplier ??
    (await prisma.supplier.create({
      data: {
        name: "Proveedor Demo",
        contactName: "Ventas",
        email: "ventas@proveedor-demo.com"
      }
    }));

  await prisma.product.upsert({
    where: { sku: "SKU-DEMO-001" },
    update: {},
    create: {
      sku: "SKU-DEMO-001",
      name: "Producto Demo",
      categoryId: category.id,
      supplierId: supplier.id,
      salePrice: 25,
      costPrice: 15,
      stock: 20,
      minStock: 5,
      unit: "pieza",
      location: "A1"
    }
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
