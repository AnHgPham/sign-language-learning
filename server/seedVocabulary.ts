import { randomUUID } from "crypto";
import * as db from "./db";

const vocabularyData = [
  { classId: "0", className: "an", displayName: "Ăn", description: "Động tác ăn", category: "Hoạt động", difficulty: "beginner" as const },
  { classId: "1", className: "ban", displayName: "Bạn", description: "Xưng hô bạn bè", category: "Xưng hô", difficulty: "beginner" as const },
  { classId: "2", className: "ban_be", displayName: "Bạn bè", description: "Nhóm bạn bè", category: "Quan hệ", difficulty: "beginner" as const },
  { classId: "3", className: "bao_nhieu", displayName: "Bao nhiêu", description: "Hỏi số lượng", category: "Câu hỏi", difficulty: "intermediate" as const },
  { classId: "4", className: "cai_gi", displayName: "Cái gì", description: "Hỏi về vật", category: "Câu hỏi", difficulty: "intermediate" as const },
  { classId: "5", className: "cam_on", displayName: "Cảm ơn", description: "Lời cảm ơn", category: "Giao tiếp", difficulty: "beginner" as const },
  { classId: "6", className: "gia_dinh", displayName: "Gia đình", description: "Gia đình", category: "Quan hệ", difficulty: "beginner" as const },
  { classId: "7", className: "khat", displayName: "Khát", description: "Cảm giác khát nước", category: "Cảm giác", difficulty: "beginner" as const },
  { classId: "8", className: "khoe", displayName: "Khỏe", description: "Tình trạng sức khỏe", category: "Cảm giác", difficulty: "beginner" as const },
  { classId: "9", className: "lam_on", displayName: "Làm ơn", description: "Lời nhờ vả", category: "Giao tiếp", difficulty: "beginner" as const },
  { classId: "10", className: "nhu_the_nao", displayName: "Như thế nào", description: "Hỏi về cách thức", category: "Câu hỏi", difficulty: "intermediate" as const },
  { classId: "11", className: "tam_biet", displayName: "Tạm biệt", description: "Lời chào tạm biệt", category: "Giao tiếp", difficulty: "beginner" as const },
  { classId: "12", className: "ten_la", displayName: "Tên là", description: "Giới thiệu tên", category: "Giao tiếp", difficulty: "beginner" as const },
  { classId: "13", className: "toi", displayName: "Tôi", description: "Xưng hô ngôi thứ nhất", category: "Xưng hô", difficulty: "beginner" as const },
  { classId: "14", className: "tuoi", displayName: "Tuổi", description: "Độ tuổi", category: "Thông tin", difficulty: "beginner" as const },
  { classId: "15", className: "xin_chao", displayName: "Xin chào", description: "Lời chào", category: "Giao tiếp", difficulty: "beginner" as const },
  { classId: "16", className: "xin_loi", displayName: "Xin lỗi", description: "Lời xin lỗi", category: "Giao tiếp", difficulty: "beginner" as const },
];

async function seedVocabulary() {
  console.log("🌱 Seeding vocabulary data...");
  
  for (const vocab of vocabularyData) {
    try {
      await db.insertSignVocabulary({
        id: randomUUID(),
        ...vocab,
      });
      console.log(`✓ Added: ${vocab.displayName}`);
    } catch (error) {
      console.log(`⚠ Skipped: ${vocab.displayName} (already exists)`);
    }
  }
  
  console.log("✅ Vocabulary seeding completed!");
}

seedVocabulary().catch(console.error);

