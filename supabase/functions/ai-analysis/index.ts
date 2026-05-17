const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const analysisSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "score",
    "level",
    "summary",
    "strengths",
    "gaps",
    "actions",
    "risks",
    "counselorNotes",
    "nextQuestions",
  ],
  properties: {
    score: { type: "number" },
    level: { type: "string" },
    summary: { type: "string" },
    strengths: { type: "array", items: { type: "string" } },
    gaps: { type: "array", items: { type: "string" } },
    actions: { type: "array", items: { type: "string" } },
    risks: { type: "array", items: { type: "string" } },
    counselorNotes: { type: "array", items: { type: "string" } },
    nextQuestions: { type: "array", items: { type: "string" } },
  },
};

const buildPrompt = (payload: Record<string, unknown>) => {
  const kind = String(payload.kind || "record");
  const preferredMajor = String(payload.preferredMajor || "학과 미입력");
  const taskName = kind === "essay" ? "자기소개서" : kind === "strategy" ? "입시 전략" : "생활기록부";

  return [
    {
      role: "system",
      content: `너는 한국 수시 학생부종합전형 입학사정관 관점의 AI 에이전트다.
학생과 학원 상담사가 바로 실행할 수 있도록 한국어로 간결하게 판단한다.
평가 기준은 학업역량, 전공적합성, 탐구심화도, 활동 연속성, 자기주도성, 기록 구체성, 지원전략 리스크다.
점수는 0~100점으로 보수적으로 준다. 근거 없는 단정, 합격 보장, 허위 입결은 말하지 않는다.
결과는 반드시 요청된 JSON 스키마에 맞춘다.`,
    },
    {
      role: "user",
      content: JSON.stringify({
        task: `${taskName} 분석`,
        preferredMajor,
        payload,
        outputGuidance: {
          score: "0~100",
          level: "충분, 보완 필요, 자료 부족, 상위권 전략, 기초 구축 중 적절히 선택",
          summary: "한 문단",
          strengths: "충분한 점 3~5개",
          gaps: "부족한 점 3~5개",
          actions: "바로 해야 할 구체 액션 3~5개",
          risks: "주의할 리스크 2~4개",
          counselorNotes: "상담사가 다음 상담에서 확인할 메모 2~4개",
          nextQuestions: "학생에게 물어볼 질문 2~4개",
        },
      }),
    },
  ];
};

const parseOutputText = (data: Record<string, any>) => {
  if (typeof data.output_text === "string") return data.output_text;
  const content = data.output
    ?.flatMap((item: any) => item.content || [])
    ?.find((item: any) => item.type === "output_text" || item.type === "text");
  return content?.text || "";
};

Deno.serve(async req => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "POST만 지원합니다." }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const openAiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openAiKey) {
      return new Response(JSON.stringify({ error: "OPENAI_API_KEY가 설정되지 않았습니다." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = await req.json();
    const model = Deno.env.get("OPENAI_MODEL") || "gpt-4o-mini";

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        input: buildPrompt(payload),
        text: {
          format: {
            type: "json_schema",
            name: "admission_agent_analysis",
            strict: true,
            schema: analysisSchema,
          },
        },
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      return new Response(JSON.stringify({ error: data.error?.message || "OpenAI 분석 요청에 실패했습니다." }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const outputText = parseOutputText(data);
    const analysis = outputText ? JSON.parse(outputText) : null;

    return new Response(JSON.stringify({ analysis, model }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "분석 중 오류가 발생했습니다." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
