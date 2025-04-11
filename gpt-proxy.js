const express = require("express");
const axios = require("axios");
const app = express();

app.use(express.json());

app.post("/gpt-webhook", async (req, res) => {
  try {
    await axios.post(
      "https://hook.us2.make.com/qihpvwxoxkxp4qo3qnppez3i2qo7flpt",
      req.body,
      {
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
    res.status(200).send("✅ 전달 완료");
  } catch (e) {
    console.error("❌ 프록시 오류:", e.response?.data || e.message);
    res.status(500).send("프록시 실패");
  }
});

app.listen(3000, () => console.log("🚀 프록시 서버 실행 중"));

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
