import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { openai } from "@/lib/openai";
import { getAllCustomers } from "@/services/customer.service";

function addMonths(date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}
function getServiceBucket(lastServiceValue) {
  const raw =
    typeof lastServiceValue === "string" ? lastServiceValue.trim() : "";
  if (!raw) return "missing";

  const last = new Date(raw);
  if (Number.isNaN(last.getTime())) return "missing";

  const now = new Date();
  const before12 = addMonths(now, -12);
  const before24 = addMonths(now, -24);

  if (last >= before12) return "ok";
  if (last >= before24) return "dueSoon";
  return "overdue";
}

async function tool_list_service_tasks() {
  const customers = await getAllCustomers();

  const buckets = { overdue: [], dueSoon: [], missing: [], ok: [] };

  for (const c of customers) {
    const bucket = getServiceBucket(c?.lastService);
    buckets[bucket].push({
      id: c?._id,
      name:
        `${c?.firstName ?? ""} ${c?.lastName ?? ""}`.trim() || "(bez jména)",
      lastService: c?.lastService ?? "",
      phone: c?.phone ?? "",
      address: c?.address ?? "",
      serialNumber: c?.serialNumber ?? "",
      manufacturer: c?.manufacturer ?? "",
      type: c?.type ?? "",
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      total: customers.length,
      overdue: buckets.overdue.length,
      dueSoon: buckets.dueSoon.length,
      missing: buckets.missing.length,
      ok: buckets.ok.length,
    },
    shortTerm: {
      overdue: buckets.overdue.slice(0, 50),
      dueSoon: buckets.dueSoon.slice(0, 50),
      missing: buckets.missing.slice(0, 50),
    },
    longTermIdeas: [
      "Doplnit chybějící 'Poslední servis' u zákazníků v bucketu 'missing'.",
      "Zavést workflow: když je servis 'overdue', vytvořit úkol + připomínku.",
      "Napojit na modul Kalendář: generovat plán servisů na 30/60/90 dní.",
      "Zpřesnit data: normalizace adres, telefonů, výrobních čísel.",
    ],
  };
}

async function tool_search_customers({ query }) {
  const q = String(query ?? "")
    .trim()
    .toLowerCase();
  const customers = await getAllCustomers();
  if (!q) return { query: q, results: [] };

  const results = customers
    .map((c) => {
      const hay = [
        c?.firstName,
        c?.lastName,
        c?.email,
        c?.phone,
        c?.address,
        c?.serialNumber,
        c?.manufacturer,
        c?.type,
      ]
        .map((x) => String(x ?? "").toLowerCase())
        .join(" ");

      return { c, hay };
    })
    .filter(({ hay }) => hay.includes(q))
    .slice(0, 25)
    .map(({ c }) => ({
      id: c?._id,
      name:
        `${c?.firstName ?? ""} ${c?.lastName ?? ""}`.trim() || "(bez jména)",
      email: c?.email ?? "",
      phone: c?.phone ?? "",
      address: c?.address ?? "",
      lastService: c?.lastService ?? "",
      bucket: getServiceBucket(c?.lastService),
    }));

  return { query: q, count: results.length, results };
}

async function tool_get_customer_overview({ customerId }) {
  const id = String(customerId ?? "").trim();
  if (!id) return { error: "customerId je povinné" };

  const customers = await getAllCustomers();
  const c = customers.find((x) => String(x?._id ?? "") === id);
  if (!c) return { error: "Zákazník nenalezen" };

  return {
    id: c._id,
    name: `${c?.firstName ?? ""} ${c?.lastName ?? ""}`.trim() || "(bez jména)",
    email: c?.email ?? "",
    phone: c?.phone ?? "",
    address: c?.address ?? "",
    manufacturer: c?.manufacturer ?? "",
    serialNumber: c?.serialNumber ?? "",
    type: c?.type ?? "",
    installYear: c?.installYear ?? null,
    online: Boolean(c?.online),
    lastService: c?.lastService ?? "",
    bucket: getServiceBucket(c?.lastService),
    comments: Array.isArray(c?.comments) ? c.comments.slice(0, 20) : [],
  };
}

const TOOL_HANDLERS = {
  list_service_tasks: tool_list_service_tasks,
  search_customers: tool_search_customers,
  get_customer_overview: tool_get_customer_overview,
};

export async function POST(req) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const messages = Array.isArray(body?.messages) ? body.messages : [];

    const safeMessages = messages.slice(-20).map((m) => ({
      role: m?.role === "assistant" ? "assistant" : "user",
      content: String(m?.content ?? ""),
    }));

    const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";

    const tools = [
      {
        type: "function",
        name: "list_service_tasks",
        description:
          "Vypíše přehled servisních úkolů nad všemi zákazníky (overdue/dueSoon/missing) a navrhne dlouhodobé zlepšení.",
        parameters: {
          type: "object",
          properties: {},
          additionalProperties: false,
        },
      },
      {
        type: "function",
        name: "search_customers",
        description:
          "Najde zákazníky podle dotazu (jméno, email, telefon, SN, adresa, výrobce, typ).",
        parameters: {
          type: "object",
          properties: { query: { type: "string" } },
          required: ["query"],
          additionalProperties: false,
        },
      },
      {
        type: "function",
        name: "get_customer_overview",
        description:
          "Vrátí detail zákazníka + poslední komentáře a servisní bucket (read-only).",
        parameters: {
          type: "object",
          properties: { customerId: { type: "string" } },
          required: ["customerId"],
          additionalProperties: false,
        },
      },
    ];

    const system = `
Jsi AI asistent v aplikaci Vado. Máš POUZE read-only přístup přes nástroje.
Nikdy nenavrhuj mazání ani úpravy databáze jako hotovou akci.
Když uživatel chce změnu, dej jen návrh kroků a co je potřeba potvrdit člověkem.
Když se uživatel zeptá "co mám dělat", prioritizuj krátkodobé úkoly (overdue/dueSoon/missing) a potom dlouhodobé.
Odpovídej česky, stručně, v odrážkách, s jasnou prioritou. Nepoužívej anglické výrazy v odpovědích, pouze české.
`.trim();

    const input = [{ role: "system", content: system }, ...safeMessages];

    let response = await openai.responses.create({
      model,
      input,
      tools,
    });

    for (let guard = 0; guard < 5; guard++) {
      const functionCalls = (response.output || []).filter(
        (it) => it.type === "function_call",
      );

      if (functionCalls.length === 0) break;

      input.push(...response.output);

      for (const call of functionCalls) {
        const name = call?.name;
        const handler = TOOL_HANDLERS[name];

        let args = {};
        try {
          args = call?.arguments ? JSON.parse(call.arguments) : {};
        } catch {
          args = {};
        }

        const out = handler
          ? await handler(args)
          : { error: `Unknown tool: ${name}` };

        input.push({
          type: "function_call_output",
          call_id: call.call_id,
          output: JSON.stringify(out),
        });
      }

      response = await openai.responses.create({
        model,
        input,
        tools,
      });
    }

    const answer = String(response.output_text ?? "").trim();

    return NextResponse.json({
      answer: answer || "(bez odpovědi)",
      response_id: response.id,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ message: "AI error" }, { status: 500 });
  }
}
