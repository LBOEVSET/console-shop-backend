import "dotenv/config";
import { PrismaClient, DiscountType, UserRole, ProductKind, MerchandiseType, StatEntityType, StatEventType } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcrypt";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({
  adapter,
});

async function main() {

  console.log("Seeding database...")

  // =========================
  // DEFAULT SUPERADMIN
  // =========================
  const adminPasswordHash = await bcrypt.hash("20011966", 10);
  await prisma.user.upsert({
    where: { username: "superadmin" },
    update: {},
    create: {
      username:    "superadmin",
      email:       "superadmin@arcadezenter.com",
      passwordHash: adminPasswordHash,
      firstName:   "Super",
      lastName:    "Admin",
      phone:       "+66000000000",
      role:        UserRole.ADMIN,
      status:      1,
    },
  });
  console.log("  ✓ superadmin user created");
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
      salePrice: 50.00,
      stock: 50,
      isActive: true,
      media: {
        create: [
          {
            type: "IMAGE",
            url: "https://mediam.dotlife.store/media/catalog/product/s/o/sony_game_ps5_god_of_war_ragnarok_-_standard_4948872613989_.001.jpeg",
            sortOrder: 1
          },
        ]
      },
      platform: {
        connect: { id: ps5!.id }
      },
      categories: {
        create: [
          {
            category: {
              connect: { slug: "action" }
            }
          },
          {
            category: {
              connect: { slug: "adventure" }
            }
          }
        ]
      },
      prices: {
        create: [
          {
            region: "US",
            currency: "USD",
            price: 59.99,
            salePrice: 40
          },
          {
            region: "TH",
            currency: "THB",
            price: 1599,
            salePrice: 1280
          }
        ]
      },
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
        salePrice: 50.00,
        stock: 50,
        isActive: true,
        media: {
          create: [
            {
              type: "IMAGE",
              url: "https://down-th.img.susercontent.com/file/th-11134207-81ztm-mgnlnr0wsphm0e",
              sortOrder: 1
            },
          ]
        },
        platform: {
          connect: { id: switch2!.id }
        },
        categories: {
          create: [
            {
              category: {
                connect: { slug: "jrpg" }
              }
            },
            {
              category: {
                connect: { slug: "team-builder" }
              }
            }
          ]
        },
        prices: {
          create: [
            {
              region: "US",
              currency: "USD",
              price: 64.99,
              salePrice: 60
            },
            {
              region: "TH",
              currency: "THB",
              price: 1890,
              salePrice: 1680
            }
          ]
        },
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
      salePrice: 45.00,
      stock: 100,
      isActive: true,
      media: {
        create: [
          {
            type: "IMAGE",
            url: "https://dl.lnwfile.com/2821v5.webp",
            sortOrder: 1
          },
        ]
      },
      platform: {
        connect: { id: ps5!.id }
      },
      categories: {
        create: [
          {
            category: {
              connect: { slug: "survival-horror" }
            }
          },
          {
            category: {
              connect: { slug: "action" }
            }
          }
        ]
      },
      prices: {
        create: [
          {
            region: "US",
            currency: "USD",
            price: 64.99,
            salePrice: 60
          },
          {
            region: "TH",
            currency: "THB",
            price: 1890,
            salePrice: 1700
          }
        ]
      },
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
      salePrice: 34.00,
      stock: 100,
      isActive: true,
      media: {
        create: [
          {
            type: "IMAGE",
            url: "https://dl.lnwfile.com/e147ug.webp",
            sortOrder: 1
          },
        ]
      },
      platform: {
        connect: { id: ps5!.id }
      },
      categories: {
        create: [
          {
            category: {
              connect: { slug: "action-rpg" }
            }
          },
          {
            category: {
              connect: { slug: "adventure" }
            }
          },
          {
            category: {
              connect: { slug: "open-world" }
            }
          }
        ]
      },
      prices: {
        create: [
          {
            region: "US",
            currency: "USD",
            price: 59.99,
            salePrice: 34.00
          },
          {
            region: "TH",
            currency: "THB",
            price: 1690,
            salePrice: 1250
          }
        ]
      },
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
      salePrice: 40.00,
      stock: 100,
      isActive: true,
      media: {
        create: [
          {
            type: "IMAGE",
            url: "https://encrypted-tbn3.gstatic.com/shopping?q=tbn:ANd9GcQgr6MBpIbfU-3SbnolrP8xTx85jC-WtVFBfrV2sYlUtWHT9hfBSC1DVwItexwUYyto_syo1FTKr7A0_yxY647si-EFJTEYFflUG5JqtJZOfxpIMj3dv6A9cl-8sCc-lQj0WJdZAQ&usqp=CAc",
            sortOrder: 1
          },
        ]
      },
      platform: {
        connect: { id: ps5!.id }
      },
      categories: {
        create: [
          {
            category: {
              connect: { slug: "horror" }
            }
          },
          {
            category: {
              connect: { slug: "adventure" }
            }
          },
          {
            category: {
              connect: { slug: "open-world" }
            }
          }
        ]
      },
      prices: {
        create: [
          {
            region: "US",
            currency: "USD",
            price: 49.99,
            salePrice: 40.00
          },
          {
            region: "TH",
            currency: "THB",
            price: 1290,
            salePrice: 1000
          }
        ]
      },
    }
  });

  // =========================
  // ARTICLES
  // =========================
  await prisma.article.upsert({
    where: { slug: "free-shipping-week" },
    update: {},
    create: {
      type: "ANNOUNCEMENT",
      title: "Free Shipping Week",
      slug: "free-shipping-week",
      summary: "Enjoy free delivery nationwide.",
      content: "Detailed announcement content...",
      reference: null,
      isPublished: true,
      media: {
        create: [
          {
            type: "IMAGE",
            url: "https://blog-cdn.play.asia/wp-content/uploads/2025/11/Playasia-Week_Blog-Poster-2.jpg",
            sortOrder: 1
          },
        ]
      },
    }
  });

  await prisma.article.upsert({
    where: { slug: "ps5-pro-performance-leaked" },
    update: {},
    create: {
      type: "NEWS",
      title: "PS5 Pro Performance Leaked",
      slug: "ps5-pro-performance-leaked",
      summary: "Sony’s new console rumored to push 8K gaming.",
      content: "Full article content about PS5 Pro performance...",
      reference: "https://sony.com",
      isPublished: true,
      media: {
        create: [
          {
            type: "IMAGE",
            url: "https://s.isanook.com/ga/0/ud/234/1173738/ps5-pro.jpg",
            sortOrder: 1
          },
        ]
      },
    }
  });

  await prisma.article.upsert({
    where: { slug: "summer-sale-2026" },
    update: {},
    create: {
      type: "PROMOTION",
      title: "Summer Sale 2026",
      slug: "summer-sale-2026",
      summary: "Up to 50% off selected titles.",
      content: "Full promotion detail content here...",
      reference: null,
      isPublished: true,
      media: {
        create: [
          {
            type: "IMAGE",
            url: "https://t4.ftcdn.net/jpg/03/32/95/71/360_F_332957101_NV588R5pQUyusBU22Wvzqqhq3E7pOPwb.jpg",
            sortOrder: 1
          },
        ]
      },
    }
  });

  // =========================
  // EVENTS
  // =========================
  const ev1 = await prisma.event.upsert({
    where: { slug: "bangkok-gaming-expo-2026" },
    update: {},
    create: {
      title:       "Bangkok Gaming Expo 2026",
      slug:        "bangkok-gaming-expo-2026",
      description: "Southeast Asia's biggest annual gaming convention. Try upcoming titles, meet developers, and compete in live tournaments.",
      category:    ProductKind.GAME,
      date:        new Date("2026-08-15T10:00:00Z"),
      venue:       "BITEC, Bangkok",
      price:       350,
      stock:       2000,
      isActive:    true,
      seeCount:    142,
      viewCount:   89,
      clickCount:  34,
      media: {
        create: [
          {
            type:      "IMAGE",
            url:       "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800",
            sortOrder: 1,
          },
        ],
      },
    },
  });

  const ev2 = await prisma.event.upsert({
    where: { slug: "esports-invitational-2026" },
    update: {},
    create: {
      title:       "ArcadeZenter Esports Invitational 2026",
      slug:        "esports-invitational-2026",
      description: "Top-tier teams clash in Valorant, Street Fighter 6, and Tekken 8. Watch live or grab a seat in the arena.",
      category:    ProductKind.TICKET,
      date:        new Date("2026-09-05T14:00:00Z"),
      venue:       "Impact Arena, Muang Thong Thani",
      price:       500,
      stock:       1200,
      isActive:    true,
      seeCount:    310,
      viewCount:   201,
      clickCount:  75,
      media: {
        create: [
          {
            type:      "IMAGE",
            url:       "https://images.unsplash.com/photo-1593305841991-05c297ba4575?w=800",
            sortOrder: 1,
          },
        ],
      },
    },
  });

  const ev3 = await prisma.event.upsert({
    where: { slug: "indie-dev-showcase-oct-2026" },
    update: {},
    create: {
      title:       "Indie Dev Showcase — October 2026",
      slug:        "indie-dev-showcase-oct-2026",
      description: "Discover the next big indie game. 30+ developers present demos, give talks, and hand out exclusive merch.",
      category:    ProductKind.OTHER,
      date:        new Date("2026-10-18T11:00:00Z"),
      venue:       "CentralWorld Event Hall, Bangkok",
      price:       0,
      stock:       500,
      isActive:    true,
      seeCount:    88,
      viewCount:   52,
      clickCount:  17,
      media: {
        create: [
          {
            type:      "IMAGE",
            url:       "https://images.unsplash.com/photo-1528698827591-e19ccd7bc23d?w=800",
            sortOrder: 1,
          },
        ],
      },
    },
  });
  console.log("  ✓ events seeded");

  // =========================
  // MERCHANDISE
  // =========================
  await prisma.merchandise.upsert({
    where: { slug: "az-logo-hoodie-black" },
    update: {},
    create: {
      title:       "ArcadeZenter Logo Hoodie — Black",
      slug:        "az-logo-hoodie-black",
      description: "Premium heavyweight hoodie with embroidered AZ logo on the chest. Unisex fit. Available in S–XXL.",
      type:        MerchandiseType.APPAREL,
      price:       890,
      stock:       150,
      isActive:    true,
      seeCount:    220,
      viewCount:   140,
      clickCount:  60,
      media: {
        create: [
          {
            type:      "IMAGE",
            url:       "https://images.unsplash.com/photo-1556821840-3a63f15732ce?w=600",
            sortOrder: 1,
          },
        ],
      },
    },
  });

  await prisma.merchandise.upsert({
    where: { slug: "az-controller-stand-acrylic" },
    update: {},
    create: {
      title:       "AZ Acrylic Controller Stand",
      slug:        "az-controller-stand-acrylic",
      description: "Crystal-clear acrylic stand that displays any PS5/Xbox/Switch controller. Laser-engraved AZ branding.",
      type:        MerchandiseType.ACCESSORY,
      price:       490,
      stock:       80,
      isActive:    true,
      seeCount:    175,
      viewCount:   98,
      clickCount:  43,
      media: {
        create: [
          {
            type:      "IMAGE",
            url:       "https://images.unsplash.com/photo-1622979135225-d2ba269cf1ac?w=600",
            sortOrder: 1,
          },
        ],
      },
    },
  });

  await prisma.merchandise.upsert({
    where: { slug: "elden-ring-tarnished-figure" },
    update: {},
    create: {
      title:       'Elden Ring "Tarnished" PVC Figure (20 cm)',
      slug:        "elden-ring-tarnished-figure",
      description: "Official licensed 20 cm PVC figure of the Tarnished knight. Highly detailed, display-ready with base.",
      type:        MerchandiseType.COLLECTIBLE,
      price:       1290,
      stock:       40,
      isActive:    true,
      seeCount:    390,
      viewCount:   260,
      clickCount:  110,
      media: {
        create: [
          {
            type:      "IMAGE",
            url:       "https://images.unsplash.com/photo-1608889825205-eebdb9fc5806?w=600",
            sortOrder: 1,
          },
        ],
      },
    },
  });

  await prisma.merchandise.upsert({
    where: { slug: "az-gaming-headset-rgb" },
    update: {},
    create: {
      title:       "AZ Pro Gaming Headset — RGB Edition",
      slug:        "az-gaming-headset-rgb",
      description: "7.1 surround-sound gaming headset with RGB ear cups and noise-cancelling mic. USB + 3.5 mm dual connection.",
      type:        MerchandiseType.PERIPHERAL,
      price:       2490,
      stock:       60,
      isActive:    true,
      seeCount:    510,
      viewCount:   320,
      clickCount:  140,
      media: {
        create: [
          {
            type:      "IMAGE",
            url:       "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=600",
            sortOrder: 1,
          },
        ],
      },
    },
  });
  console.log("  ✓ merchandise seeded");

  // =========================
  // SAMPLE STATISTICS
  // =========================
  // Fetch the entities we'll attach stats to
  const [prodGoW, prodElden, merch1, merch4, article1] = await Promise.all([
    prisma.product.findUnique({ where: { slug: "gow-ragnarok" } }),
    prisma.product.findUnique({ where: { slug: "elden-ring" } }),
    prisma.merchandise.findUnique({ where: { slug: "az-logo-hoodie-black" } }),
    prisma.merchandise.findUnique({ where: { slug: "az-gaming-headset-rgb" } }),
    prisma.article.findUnique({ where: { slug: "summer-sale-2026" } }),
  ]);

  // Helper: returns a Date N days ago + offset hours
  const daysAgo = (d: number, h = 0) =>
    new Date(Date.now() - d * 86_400_000 - h * 3_600_000);

  // Pool of realistic IPs + geo
  const geos = [
    { ip: "101.51.1.1",   geo: { country: "Thailand",     city: "Bangkok",       regionName: "Bangkok",    status: "success" } },
    { ip: "101.109.4.2",  geo: { country: "Thailand",     city: "Chiang Mai",    regionName: "Chiang Mai", status: "success" } },
    { ip: "180.183.2.5",  geo: { country: "Thailand",     city: "Phuket",        regionName: "Phuket",     status: "success" } },
    { ip: "8.8.8.8",      geo: { country: "United States", city: "Mountain View", regionName: "California", status: "success" } },
    { ip: "104.16.0.1",   geo: { country: "United States", city: "San Francisco", regionName: "California", status: "success" } },
    { ip: "202.12.27.1",  geo: { country: "Japan",        city: "Tokyo",         regionName: "Tokyo",      status: "success" } },
    { ip: "118.27.4.1",   geo: { country: "Japan",        city: "Osaka",         regionName: "Osaka",      status: "success" } },
    { ip: "14.1.32.1",    geo: { country: "Singapore",    city: "Singapore",     regionName: "Central",    status: "success" } },
    { ip: "1.1.1.1",      geo: { country: "Australia",    city: "Sydney",        regionName: "New South Wales", status: "success" } },
    { ip: "80.249.99.1",  geo: { country: "Germany",      city: "Frankfurt",     regionName: "Hesse",      status: "success" } },
  ];

  type StatRow = {
    entityType:      StatEntityType;
    entityId:        string;
    eventType:       StatEventType;
    ip:              string;
    addressMetadata: object;
    createdAt:       Date;
  };

  const rows: StatRow[] = [];

  // ── Helper: push SEE → VIEW → (sometimes) CLICK for one visitor on one day
  function visit(
    entityType: StatEntityType,
    entityId:   string,
    daysBack:   number,
    geoIdx:     number,
    clicked = false,
  ) {
    const { ip, geo } = geos[geoIdx % geos.length];
    const base = daysAgo(daysBack, Math.floor(Math.random() * 12));
    rows.push({ entityType, entityId, eventType: StatEventType.SEE,  ip, addressMetadata: geo, createdAt: base });
    rows.push({ entityType, entityId, eventType: StatEventType.VIEW, ip, addressMetadata: geo, createdAt: new Date(base.getTime() + 5_000) });
    if (clicked) {
      rows.push({ entityType, entityId, eventType: StatEventType.CLICK, ip, addressMetadata: geo, createdAt: new Date(base.getTime() + 8_000) });
    }
  }

  // ── God of War Ragnarok (PRODUCT) — 30 days of traffic, trending up ──────
  if (prodGoW) {
    const id = prodGoW.id;
    // Days 30 → 15: low baseline (2–4 visitors/day)
    for (let d = 30; d >= 15; d--) {
      visit(StatEntityType.PRODUCT, id, d, d % 10);
      visit(StatEntityType.PRODUCT, id, d, (d + 3) % 10, d % 3 === 0);
      if (d % 4 === 0) visit(StatEntityType.PRODUCT, id, d, (d + 7) % 10, false);
    }
    // Days 14 → 7: growing (4–7 visitors/day, sale promotion kicks in)
    for (let d = 14; d >= 7; d--) {
      for (let v = 0; v < 5; v++) visit(StatEntityType.PRODUCT, id, d, (d + v) % 10, v % 2 === 0);
    }
    // Days 6 → 0: viral spike (8–12 visitors/day)
    for (let d = 6; d >= 0; d--) {
      for (let v = 0; v < 9; v++) visit(StatEntityType.PRODUCT, id, d, (d + v * 2) % 10, v % 3 === 0);
    }
  }

  // ── Elden Ring (PRODUCT) — steady high traffic with a mid-month dip ───────
  if (prodElden) {
    const id = prodElden.id;
    for (let d = 30; d >= 0; d--) {
      // Dip on days 20–15
      const count = (d >= 15 && d <= 20) ? 3 : 7;
      for (let v = 0; v < count; v++) {
        visit(StatEntityType.PRODUCT, id, d, (d + v * 3) % 10, v % 4 === 0);
      }
    }
  }

  // ── Bangkok Gaming Expo (EVENT) — big spike when announced, then steady ───
  if (ev1) {
    const id = ev1.id;
    // Days 30–25: announcement spike
    for (let d = 30; d >= 25; d--) {
      for (let v = 0; v < 14; v++) visit(StatEntityType.EVENT, id, d, (d + v) % 10, v % 2 === 0);
    }
    // Days 24–8: cooldown
    for (let d = 24; d >= 8; d--) {
      for (let v = 0; v < 5; v++) visit(StatEntityType.EVENT, id, d, (d + v * 2) % 10, v % 3 === 0);
    }
    // Days 7–0: reminder campaign picks up again
    for (let d = 7; d >= 0; d--) {
      for (let v = 0; v < 10; v++) visit(StatEntityType.EVENT, id, d, (d + v) % 10, v % 2 === 0);
    }
  }

  // ── Esports Invitational (EVENT) — steady hype, rising as date approaches ──
  if (ev2) {
    const id = ev2.id;
    // Days 30–22: initial ticket-sale buzz
    for (let d = 30; d >= 22; d--) {
      for (let v = 0; v < 8; v++) visit(StatEntityType.EVENT, id, d, (d + v * 3) % 10, v % 2 === 0);
    }
    // Days 21–8: steady interest
    for (let d = 21; d >= 8; d--) {
      for (let v = 0; v < 6; v++) visit(StatEntityType.EVENT, id, d, (d + v * 2) % 10, v % 3 === 0);
    }
    // Days 7–0: final push — sold-out fear kicks in
    for (let d = 7; d >= 0; d--) {
      for (let v = 0; v < 14; v++) visit(StatEntityType.EVENT, id, d, (d + v) % 10, v % 2 === 0);
    }
  }

  // ── Indie Dev Showcase (EVENT) — free event, organic/niche steady build ────
  if (ev3) {
    const id = ev3.id;
    // Days 30–15: slow organic discovery
    for (let d = 30; d >= 15; d--) {
      const count = d % 3 === 0 ? 5 : 3;
      for (let v = 0; v < count; v++) visit(StatEntityType.EVENT, id, d, (d + v * 4) % 10, v % 4 === 0);
    }
    // Days 14–0: indie community shares start picking it up
    for (let d = 14; d >= 0; d--) {
      for (let v = 0; v < 7; v++) visit(StatEntityType.EVENT, id, d, (d + v * 2) % 10, v % 3 === 0);
    }
  }

  // ── AZ Logo Hoodie (MERCHANDISE) — weekend spikes ─────────────────────────
  if (merch1) {
    const id = merch1.id;
    for (let d = 30; d >= 0; d--) {
      // Every 7th day = big weekend spike
      const count = d % 7 === 0 ? 12 : d % 7 === 1 ? 8 : 3;
      for (let v = 0; v < count; v++) visit(StatEntityType.MERCHANDISE, id, d, (d + v * 4) % 10, v % 3 === 0);
    }
  }

  // ── AZ Gaming Headset (MERCHANDISE) — slow burn, accelerating ────────────
  if (merch4) {
    const id = merch4.id;
    for (let d = 30; d >= 0; d--) {
      const count = Math.max(1, Math.round((30 - d) / 4));
      for (let v = 0; v < count; v++) visit(StatEntityType.MERCHANDISE, id, d, (d + v * 3) % 10, v % 5 === 0);
    }
  }

  // ── Summer Sale Article (ARTICLE) — big on publish day then fades ─────────
  if (article1) {
    const id = article1.id;
    // "Published" 28 days ago — huge spike
    for (let v = 0; v < 20; v++) visit(StatEntityType.ARTICLE, id, 28, v % 10, v % 2 === 0);
    for (let v = 0; v < 12; v++) visit(StatEntityType.ARTICLE, id, 27, v % 10, v % 3 === 0);
    // Then exponential decay
    const decay = [8, 6, 5, 4, 4, 3, 3, 2, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
    decay.forEach((count, i) => {
      for (let v = 0; v < count; v++) visit(StatEntityType.ARTICLE, id, 26 - i, v % 10, v % 4 === 0);
    });
  }

  // Write all rows (createMany is much faster than looped create)
  await prisma.statistic.createMany({ data: rows });
  console.log(`  ✓ statistics seeded (${rows.length} rows across 8 entities)`);


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
