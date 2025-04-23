// projectReportGenerator.js

/**
 * 使用 AI 生成项目进度报告
 * @param {Object} projectData - 项目数据
 * @returns {Promise<String>} - 生成的报告文本
 */
async function generateProjectReport(projectData) {
  try {
    // 获取 AI 服务配置
    const aiApiUrl = process.env.AI_API_URL;
    const aiApiKey = process.env.AI_API_KEY;

    if (!aiApiUrl || !aiApiKey) {
      console.error("AI 配置缺失: AI_API_URL 或 AI_API_KEY 未设置");
      throw new Error("AI 服务配置缺失");
    }

    // 构建 AI 提示
    const prompt = buildReportPrompt(projectData);
    console.log("生成报告提示:", prompt);

    // 调用 DeepSeek API
    const response = await fetch(aiApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${aiApiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat", // 使用 DeepSeek 的模型
        max_tokens: 2000,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`AI API 调用失败，状态码: ${response.status}`);
    }

    const data = await response.json();
    const report = data.choices[0].message.content || "无法生成报告"; // DeepSeek API 的响应结构
    // console.log("生成报告成功:", report);

    return report;
  } catch (error) {
    console.error("生成报告失败:", error.message);
    throw new Error("生成项目报告失败: " + error.message);
  }
}

// 构建提示函数保持不变
function buildReportPrompt(data) {
  const {
    projectInfo,
    taskStats,
    branchStats,
    teamMembers,
    pullRequestStats,
    recentVersions,
  } = data;

  const projectStartDate = new Date(projectInfo.created_at);
  const currentDate = new Date();
  const projectDuration = Math.floor(
    (currentDate - projectStartDate) / (1000 * 60 * 60 * 24)
  );

  const taskCompletionRate =
    taskStats.total_tasks > 0
      ? ((taskStats.completed_tasks / taskStats.total_tasks) * 100).toFixed(1)
      : 0;

  const teamMembersSummary = teamMembers
    .map((m) => `${m.name} (${m.role})`)
    .join(", ");

  const versionsInfo =
    recentVersions.length > 0
      ? recentVersions
          .map(
            (v) =>
              `- ${v.version_number} (${new Date(
                v.created_at
              ).toLocaleDateString()}): ${v.description} by ${v.author}`
          )
          .join("\n")
      : "暂无版本发布记录";

  const prompt = `
请为以下项目生成一份全面的进度报告。信息如下：

### 项目基本信息
- 项目名称: ${projectInfo.name}
- 项目描述: ${projectInfo.description || "无描述"}
- 项目进度: ${projectInfo.progress}%
- 项目状态: ${projectInfo.status}
- 项目已运行: ${projectDuration}天

### 任务统计
- 总任务数: ${taskStats.total_tasks}
- 待处理任务: ${taskStats.waiting_tasks}
- 进行中任务: ${taskStats.ongoing_tasks}
- 已完成任务: ${taskStats.completed_tasks}
- 任务完成率: ${taskCompletionRate}%
- 高优先级任务: ${taskStats.high_priority}
- 中优先级任务: ${taskStats.medium_priority}
- 低优先级任务: ${taskStats.low_priority}

### 分支情况
- 总分支数: ${branchStats.total_branches}
- 开发中分支: ${branchStats.developing_branches}
- 待合并分支: ${branchStats.ready_branches}
- 已合并分支: ${branchStats.merged_branches}

### Pull Request状态
- 总PR数: ${pullRequestStats.total_prs}
- 待处理PR: ${pullRequestStats.waiting_prs}
- 审核中PR: ${pullRequestStats.reviewing_prs}
- 已完成PR: ${pullRequestStats.completed_prs}

### 团队成员
${teamMembersSummary}

### 最近版本发布
${versionsInfo}

请生成一份包含以下内容的项目进度报告:
1. 项目概述与当前状态摘要
2. 关键成就与里程碑
3. 任务完成情况分析
4. 潜在的风险与挑战
5. 下一阶段工作建议
6. 总结与展望

请使用专业但易懂的语言，包含适当的数据分析，并提供对项目进展的客观评估。报告应当有明确的结构，突出重点，并提供有见地的建议。`;

  return prompt;
}

module.exports = {
  generateProjectReport,
};
