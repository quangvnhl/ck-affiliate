import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import bcrypt from "bcryptjs";
import { users, platforms } from "./schema";

// Lấy connection string từ biến môi trường
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not set");
}

// Tạo postgres client
const client = postgres(connectionString, { prepare: false });
const db = drizzle(client);

// ============================================
// SEED DATA
// ============================================

async function seed() {
  console.log("🌱 Bắt đầu seed dữ liệu...\n");

  try {
    // -----------------------------------------
    // 1. Seed Platforms (Shopee, TikTok)
    // -----------------------------------------
    console.log("📦 Đang tạo platforms...");
    
    const platformsData = [
      {
        name: "shopee",
        isActive: true,
        baseCommissionShare: "70.00",
        apiConfig: null, // Sẽ cấu hình sau khi có API credentials
      },
      {
        name: "tiktok",
        isActive: true,
        baseCommissionShare: "70.00",
        apiConfig: null,
      },
    ];

    // Xóa dữ liệu cũ và insert mới
    await db.delete(platforms);
    const insertedPlatforms = await db.insert(platforms).values(platformsData).returning();
    
    console.log(`✅ Đã tạo ${insertedPlatforms.length} platforms:`);
    insertedPlatforms.forEach((p) => {
      console.log(`   - ${p.name} (ID: ${p.id}, Commission: ${p.baseCommissionShare}%)`);
    });

    // -----------------------------------------
    // 2. Seed Admin User
    // -----------------------------------------
    console.log("\n👤 Đang tạo tài khoản Admin...");
    
    const adminEmail = "admin@ck-affiliate.com";
    const adminPassword = "Admin@123456";
    
    // Hash password với bcrypt (10 rounds)
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    
    const adminData = {
      email: adminEmail,
      passwordHash: passwordHash,
      role: "admin",
      status: "active",
      walletBalance: "0.00",
      totalWithdrawn: "0.00",
    };

    // Xóa tất cả users cũ và tạo admin mới
    // (Chỉ dùng cho môi trường development/staging)
    await db.delete(users);
    const insertedAdmin = await db.insert(users).values(adminData).returning();
    
    console.log(`✅ Đã tạo tài khoản Admin:`);
    console.log(`   - Email: ${insertedAdmin[0].email}`);
    console.log(`   - Password: ${adminPassword} (HÃY ĐỔI NGAY SAU KHI DEPLOY!)`);
    console.log(`   - Role: ${insertedAdmin[0].role}`);
    console.log(`   - ID: ${insertedAdmin[0].id}`);

    // -----------------------------------------
    // Hoàn thành
    // -----------------------------------------
    console.log("\n🎉 Seed dữ liệu hoàn tất!");
    console.log("\n⚠️  QUAN TRỌNG: Hãy đổi mật khẩu Admin ngay sau khi deploy production!");
    
  } catch (error) {
    console.error("❌ Lỗi khi seed dữ liệu:", error);
    throw error;
  } finally {
    // Đóng connection
    await client.end();
  }
}

// Chạy seed
seed();
