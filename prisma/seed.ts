import "dotenv/config";
import { PrismaClient, DiscountType } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({
  adapter,
});

async function main() {

console.log("Seeding database...")
// =========================
// USER STATUS
// =========================
await prisma.userStatus.createMany({
data: [
{ id: 0, name: "waiting for approve" },
{ id: 1, name: "active" },
{ id: 2, name: "suspended" },
{ id: 3, name: "banned" },
{ id: 4, name: "wait for delete" },
{ id: 5, name: "delete" }
],
skipDuplicates: true
});

// =========================
// PLATFORM
// =========================
const platforms = await Promise.all([
prisma.platform.upsert({
where: { name: "Nintendo Switch 2" },
update: {},
create: { name: "Nintendo Switch 2" }
}),
prisma.platform.upsert({
where: { name: "Nintendo Switch" },
update: {},
create: { name: "Nintendo Switch" }
}),
prisma.platform.upsert({
where: { name: "PlayStation 4" },
update: {},
create: { name: "PlayStation 4" }
}),
prisma.platform.upsert({
where: { name: "PlayStation 5" },
update: {},
create: { name: "PlayStation 5" }
}),
prisma.platform.upsert({
where: { name: "Xbox Series X" },
update: {},
create: { name: "Xbox Series X" }
}),
prisma.platform.upsert({
where: { name: "PC" },
update: {},
create: { name: "PC" }
})
]);

const ps5 = platforms.find(p => p.name === "PlayStation 5");
const switch2 = platforms.find(p => p.name === "Nintendo Switch 2");

// =========================
// CATEGORY
// =========================
await prisma.category.createMany({
data: [
{ name: "Action", slug: "action" },
{ name: "ActionRPG", slug: "action-rpg" },
{ name: "Adventure", slug: "adventure" },
{ name: "Anime", slug: "anime" },
{ name: "RPG", slug: "rpg" },
{ name: "JRPG", slug: "jrpg" },
{ name: "CRPG", slug: "crpg" },
{ name: "Cards", slug: "cards" },
{ name: "Shooter", slug: "shooter" },
{ name: "Strategy", slug: "strategy" },
{ name: "Simulation", slug: "simulation" },
{ name: "Sports", slug: "sports" },
{ name: "Racing", slug: "racing" },
{ name: "RogueLike", slug: "rogue-like" },
{ name: "RTS", slug: "rts" },
{ name: "Hack&Slash", slug: "hack&slash" },
{ name: "Horror", slug: "horror" },
{ name: "Puzzle", slug: "puzzle" },
{ name: "Fighting", slug: "fighting" },
{ name: "Platformer", slug: "platformer" },
{ name: "Survival", slug: "survival" },
{ name: "MMORPG", slug: "mmorpg" },
{ name: "SurvivalHorror", slug: "survival-horror" },
{ name: "Wars", slug: "wars" },
{ name: "Indie", slug: "indie" },
{ name: "Metroidvania", slug: "metroidvania" },
{ name: "HeroShooter", slug: "hero-shooter" },
{ name: "TeamBuilder", slug: "team-builder" },
{ name: "DeckBuilder", slug: "deck-builder" },
{ name: "4X", slug: "4x" },
{ name: "OpenWorld", slug: "open-world" }
],
skipDuplicates: true
});

// =========================
// PRODUCTS
// =========================
await prisma.product.upsert({
where: { slug: "gow-ragnarok" },
update: {},
create: {
title: "God of War Ragnarok",
slug: "gow-ragnarok",
description: "Epic Norse adventure",
price: 69.99,
stock: 50,
isActive: true,
platformId: ps5!.id
}
});

await prisma.product.upsert({
where: { slug: "mhs-3" },
update: {},
create: {
title: "Monster Hunter Stories 3",
slug: "mhs-3",
description: "Adventure of Raider and their Monsties",
price: 59.99,
stock: 50,
isActive: true,
platformId: switch2!.id
}
});

await prisma.product.upsert({
where: { slug: "re-req" },
update: {},
create: {
title: "Resident Evil Requiem",
slug: "re-req",
description: "Investigation of abnormal case after Raccoon City incident",
price: 59.99,
stock: 100,
isActive: true,
platformId: ps5!.id
}
});

await prisma.product.upsert({
where: { slug: "elden-ring" },
update: {},
create: {
title: "Elden Ring",
slug: "elden-ring",
description: "Rise, Tarnished, and become the Elden Lord in the Lands Between.",
price: 59.99,
stock: 100,
isActive: true,
platformId: ps5!.id
}
});

await prisma.product.upsert({
where: { slug: "reanimal" },
update: {},
create: {
title: "Reanimal",
slug: "reanimal",
description: "A dark co-op horror adventure about siblings escaping a nightmare.",
price: 49.99,
stock: 100,
isActive: true,
platformId: ps5!.id
}
});

// =========================
// PROMO CODES
// =========================
await prisma.promoCode.createMany({
data: [
{
code: "NEWYEAR10",
discountType: DiscountType.PERCENTAGE,
discountValue: 10,
minOrder: 50,
maxUsage: 100,
usedCount: 5,
isActive: true
},
{
code: "FLAT100",
discountType: DiscountType.FIXED,
discountValue: 100,
minOrder: 500,
maxUsage: 50,
usedCount: 10,
isActive: true
}
],
skipDuplicates: true
});

}

main()
.then(async () => {
await prisma.$disconnect();
})
.catch(async (e) => {
console.error(e);
await prisma.$disconnect();
process.exit(1);
});
