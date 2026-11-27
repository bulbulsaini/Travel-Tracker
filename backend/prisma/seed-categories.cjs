
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const categories = [
  {
    name: 'Food & Grocery',
    slug: 'food-grocery',
    description: 'Organic food, grains and everyday grocery products.',
    children: [
      ['Pulses', 'pulses'],
      ['Flour & Millets', 'flour-millets'],
      ['Spices & Herbs', 'spices-herbs'],
      ['Oils & Honey', 'oils-honey'],
      ['Dry Fruits', 'dry-fruits'],
    ],
  },
  {
    name: 'Fruits & Vegetables',
    slug: 'fruits-vegetables',
    description: 'Fresh organic fruits and vegetables.',
    children: [
      ['Fresh Fruits', 'fresh-fruits'],
      ['Fresh Vegetables', 'fresh-vegetables'],
      ['Leafy Greens', 'leafy-greens'],
      ['Fresh Herbs', 'fresh-herbs'],
    ],
  },
  {
    name: 'Personal Care & Wellness',
    slug: 'personal-care-wellness',
    description: 'Natural personal care and wellness products.',
    children: [
      ['Skin Care', 'skin-care'],
      ['Hair Care', 'hair-care'],
      ['Herbal Products', 'herbal-products'],
      ['Natural Wellness', 'natural-wellness'],
    ],
  },
  {
    name: 'Organic Living & Household',
    slug: 'organic-living-household',
    description: 'Eco-friendly household and organic living products.',
    children: [
      ['Natural Cleaners', 'natural-cleaners'],
      ['Organic Cotton', 'organic-cotton'],
      ['Jute Products', 'jute-products'],
      ['Gardening Supplies', 'gardening-supplies'],
    ],
  },
];

async function main() {
  for (const category of categories) {
    const parent = await prisma.category.upsert({
      where: { slug: category.slug },
      update: {
        name: category.name,
        description: category.description,
        parentId: null,
      },
      create: {
        name: category.name,
        slug: category.slug,
        description: category.description,
      },
    });

    console.log(`Main category: ${parent.name}`);

    for (const [name, slug] of category.children) {
      await prisma.category.upsert({
        where: { slug },
        update: {
          name,
          parentId: parent.id,
        },
        create: {
          name,
          slug,
          parentId: parent.id,
        },
      });
    }
  }

  // Preserve the existing Organic Grains ID and its products.
  const foodCategory = await prisma.category.findUnique({
    where: { slug: 'food-grocery' },
  });

  await prisma.category.update({
    where: { slug: 'organic-grains' },
    data: { parentId: foodCategory.id },
  });

  console.log('Organic Grains linked successfully.');
  console.log('All categories created successfully!');
}

main()
  .catch((error) => {
    console.error('Category seeding failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
