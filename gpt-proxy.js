app.listen(PORT, () => {
  console.log(`🚀 프록시 서버 실행 중 on ${PORT}`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❗ 포트 ${PORT}는 이미 사용 중입니다.`);
    process.exit(1);
  } else {
    throw err;
  }
});

const path = require("path");
const express = require("express");
const axios = require("axios");
const cors = require("cors"); // CORS 허용
const app = express();
app.use(express.static('public')); // 'public' 폴더에 openai.yaml 위치

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
// ✅ Notion DB 불러오기 (완료 제외 + 마감일 필터 추가됨)
// ==========================
const notionToken = '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';
const databaseId = '1c730b44dc0081018323e64ee18b9acb';

app.post('/get-notion-data', async (req, res) => {
  const { excludeStatus, deadlineAfter } = req.body;

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

    const rawTasks = response.data.results.map((page) => {
      const props = page.properties;
      return {
        할일: props["할일"]?.title?.[0]?.plain_text || "제목 없음",
        마감일: props["마감일"]?.date?.start || null,
        진행상황: props["진행상황"]?.status?.name || 
                 props["진행상황"]?.select?.name || 
                 "상태 없음",
        예상소요시간: props["예상소요시간"]?.number || 0,
        우선순위: props["우선순위"]?.select?.name || "없음"
      };
    });


  const filteredTasks = rawTasks.filter(task => {
  // ✅ 완료 항목은 기본적으로 제외
  if (task.진행상황 === "✅완료") return false;

  // ✅ 추가 요청 시 제외 상태가 따로 지정되었으면 그 상태도 제외
  if (excludeStatus && task.진행상황 === excludeStatus) return false;

  // ✅ 마감일 필터
  if (deadlineAfter && task.마감일) {
    const taskDate = new Date(task.마감일);
    const afterDate = new Date(deadlineAfter);
    if (taskDate < afterDate) return false;
  }

  return true;
});


    res.json({ tasks: filteredTasks });
  } catch (error) {
    console.error("❌ Notion 데이터 오류:", error.response?.data || error.message);
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

// ==========================
// ✅ 3. 저장된 스케줄 조회하기
// ==========================
app.post('/get-saved-schedule', async (req, res) => {
  try {
    const response = await axios.post(
      `https://api.notion.com/v1/databases/${databaseId2}/query`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${notionToken}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json'
        }
      }
    );

    const schedules = response.data.results.map((page) => {
      const props = page.properties;
      return {
        title: props["Name"]?.title?.[0]?.plain_text || "제목 없음",
        deadline: props["Deadline"]?.date?.start || "날짜 없음",
        status: props["Status"]?.select?.name || "없음",
        duration: props["예상소요시간"]?.number || 0
      };
    });

    res.json({ schedules });
  } catch (error) {
    console.error("❌ 스케줄 조회 실패:", error.response?.data || error.message);
    res.status(500).json({ error: "스케줄 조회 실패" });
  }
});


// ✅ 서버 실행
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 프록시 서버 실행 중 on ${PORT}`));
