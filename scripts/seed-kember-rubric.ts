import { PrismaClient } from '../app/generated/prisma/client/index.js';

const prisma = new PrismaClient();

const KEMBER_RUBRIC_ID = 'kember-2008-critical-reflection-template';

async function main() {
  console.log('Seeding Kember 2008 Rubric Template...');

  // 檢查是否已存在
  const existing = await prisma.rubric.findUnique({
    where: { id: KEMBER_RUBRIC_ID },
  });

  if (existing) {
    console.log('Kember rubric already exists. Updating...');
  }

  let systemUser = await prisma.user.findFirst({
    where: { role: 'ADMIN' },
  });

  if (!systemUser) {
    systemUser = await prisma.user.findFirst();
  }

  if (!systemUser) {
    console.warn('No users found in DB. Creating a dummy system admin...');
    systemUser = await prisma.user.create({
      data: {
        id: 'system-admin',
        email: 'system@example.com',
        name: 'System',
        picture: '',
        role: 'ADMIN',
      },
    });
  }

  const kemberCriteria = [
    {
      id: "c1-knowledge",
      name: "對既有知識的反思 (Reflection on Existing Knowledge)",
      description: "評估學生如何運用並反思既有知識與經驗。",
      maxScore: 25,
      levels: [
        { score: 25, description: "批判性地檢視既有知識，質疑假設，並因經驗而提出新觀點。" },
        { score: 18, description: "主動且謹慎地思考既有知識，並能把經驗轉化為對知識的新理解。" },
        { score: 12, description: "能使用既有知識，但未嘗試去評估/鑑定它；展現了理解，但沒有連結到個人其他經驗或反應。" },
        { score: 0, description: "自動/表面的回應，幾乎沒有意識/深思熟慮，或未參考既有知識；沒有嘗試去理解就直接回應。" }
      ]
    },
    {
      id: "c2-concepts",
      name: "與學術概念的連結 (Connection to Academic Concepts)",
      description: "評估經驗與課堂理論/文獻的連結程度。",
      maxScore: 40,
      levels: [
        { score: 40, description: "在「經驗」與「課堂內容(理論/文獻)」之間展現卓越的連結；且有應用理論與重建觀點的證據。" },
        { score: 30, description: "在「經驗」與「課堂內容」之間展現清晰的連結；有應用理論的證據。" },
        { score: 20, description: "將經驗與課堂內容連結，但仍停留在表面或過於抽象。" },
        { score: 0, description: "沒有在「經驗」與「課堂內容或文獻」之間建立連結。" }
      ]
    },
    {
      id: "c3-development",
      name: "發展與成長的證據 (Evidence of Development)",
      description: "評估學生是否展現出個人的轉化與成長洞察。",
      maxScore: 35,
      levels: [
        { score: 35, description: "清楚說明因為這次經驗，自己對於「自我」或「特定議題/概念」的觀點發生了轉變。" },
        { score: 26, description: "清楚說明因為這次經驗，對「自我」或「特定概念」產生了新的理解或洞察。" },
        { score: 17, description: "對於「自我」或「特定概念」只有有限或表面的洞察。" },
        { score: 0, description: "沒有證據顯示對「自我」或「特定概念」有任何洞察或成長。" }
      ]
    }
  ];

  await prisma.rubric.upsert({
    where: { id: KEMBER_RUBRIC_ID },
    update: {
      name: 'Kember (2008) 批判性反思範本',
      description: '基於 Kember et al. (2008) 的 Critical Reflection Rubric，專為反思日誌與心得報告設計的多維度評估與 AI 對練框架。',
      criteria: kemberCriteria,
      isTemplate: true,
    },
    create: {
      id: KEMBER_RUBRIC_ID,
      userId: systemUser.id,
      name: 'Kember (2008) 批判性反思範本',
      description: '基於 Kember et al. (2008) 的 Critical Reflection Rubric，專為反思日誌與心得報告設計的多維度評估與 AI 對練框架。',
      criteria: kemberCriteria,
      isTemplate: true,
      version: 1,
      isActive: true,
    },
  });

  console.log('Successfully seeded Kember 2008 Rubric Template!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
