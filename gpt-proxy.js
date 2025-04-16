const path = require("path");
const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// ✅ Static YAML 제공
app.use(express.static('public'));
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

// ✅ Notion 업무 DB
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
      const props = page.properties
