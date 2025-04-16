const path = require("path");
const express = require("express");
const axios = require("axios");
const cors = require("cors"); // CORS 허용
const app = express();

app.use(cors());
app.use(express.json());

// ✅ MIME 타입 설정 (.yaml 보기용)
app.use(express.static(path.join(__dirname, "public"), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith(".yaml")) {
      res.setHeader("Content-Type", "application/yaml");
      res.setHeader("Content-Disposition", "inline");
    }
  }
}));

// 🔗 Webhook → Make로 전달
app.post("/gpt-webhook", async (req, res) => {
  try {
    await axios.post(
      "https://hook.us2.make.com/gvug7if3cxsittuhskjkuuxaki8deh1s",
      req.body,
      { headers: { "Content-Type": "application/json" } }
    );
    res.status(200).send("✅ 전달 완료");
  } catch (e) {
    console.error("❌ 프록시 오류:", e.response?.data || e.message);
    res.status(500).send("프록시 실패");
  }
});

// ✅ 테스트용 API
app.get("/tasks", (req, res) => {
  res.json([
    {
      title: "회의 준비",
      due: "2025-04-15T10:00:00Z",
      description: "팀 회의를 위한 문서 준비"
    },
    {
      title: "보고서 작성",
      due: "2025-04-16",
      description: "주간 업무 보고서 작성"
    }
  ]);
});

// ==========================
// ✅ 1. Notion DB 불러오기 (수정됨)
// ==========================
const notionToken = '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';
const databaseId = '1c730b44dc0081018323e64ee18b9acb';

app.post('/get-notion-data', async (req, res) => {
  try {
    const response = await axios.post(
      `https://api.notion.com/v1/databases/${databaseId}/query`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${notionToken}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json'
        }
      }
    );

    const tasks = response.data.results.map((page) => {
      const props = page.properties;
      return {
        할일: props["할일"]?.title?.[0]?.plain_text || "제목 없음",
        마감일: props["마감일"]?.date?.start || "날짜 없음",
        진행상황: props["진행상황"]?.select?.name || "상태 없음",
        예상소요시간: props["예상소요시간"]?.number || 0,
        우선순위: props["우선순위"]?.select?.name || "없음"
      };
    });

    res.json({ tasks });
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({ error: "Notion 데이터 불러오기 실패" });
  }
});

// ==========================
// ✅ 2. Notion DB에 저장하기
// ==========================
const databaseId2 = '1d630b44dc0080eb9262f744b6b37e15';

app.post('/add-notion-task', async (req, res) => {
  const { title, deadline, status, duration } = req.body;

  try {
    await axios.post(
      'https://api.notion.com/v1/pages',
      {
        parent: { database_id: databaseId2 },
        properties: {
          Name: {
            title: [{ text: { content: title } }]
          },
          Deadline: {
            date: { start: deadline }
          },
          Status: {
            select: { name: status }
          },
          예상소요시간: {
            number: duration
          }
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${notionToken}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json'
        }
      }
    );

    res.status(200).json({ message: '작업이 성공적으로 저장되었습니다.' });
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({ error: '작업 저장 실패' });
  }
});

// ✅ 서버 실행
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 프록시 서버 실행 중 on ${PORT}`));
