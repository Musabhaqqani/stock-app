import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { parseReport, parseNewsRss, analyseSentiment } = await import("./sentiment");

const post = (i: number) => ({
  source: "r/x",
  title: `post ${i}`,
  body: "",
  score: 1,
  comments: 0,
  url: `https://www.reddit.com/r/x/${i}`,
  createdAt: "2026-10-01T00:00:00.000Z",
});
const posts = Array.from({ length: 6 }, (_, i) => post(i));

describe("parseNewsRss", () => {
  it("decodes entities and strips the publisher suffix", () => {
    const xml = `<rss><channel><item><title>Titan Q2 profit up 20% &amp; beats - Mint</title><link>https://news.google.com/a</link><pubDate>Sat, 10 Oct 2026 04:34:44 GMT</pubDate><source url="https://livemint.com">Mint</source></item></channel></rss>`;
    expect(parseNewsRss(xml)).toEqual([
      {
        source: "Mint",
        title: "Titan Q2 profit up 20% & beats",
        body: "",
        url: "https://news.google.com/a",
        createdAt: "2026-10-10T04:34:44.000Z",
      },
    ]);
  });
});

describe("parseReport", () => {
  it("coerces garbage model output into a safe neutral report", () => {
    const r = parseReport({ lean: "moon", score: "lots", keyPostIndices: [99, -1, "x"] }, "TITAN", posts);
    expect(r.lean).toBe("neutral");
    expect(r.confidence).toBe("low");
    expect(r.score).toBe(0);
    expect(r.keyPosts).toEqual([]);
  });

  it("clamps score and resolves post indices to our own URLs", () => {
    const r = parseReport(
      { lean: "bullish", confidence: "high", score: 450, keyPostIndices: [2, 2, 4] },
      "TITAN",
      posts,
    );
    expect(r.score).toBe(100);
    expect(r.confidence).toBe("high");
    expect(r.keyPosts.map((p) => p.url)).toEqual([posts[2].url, posts[4].url]);
  });

  it("forces low confidence when there are too few posts", () => {
    const r = parseReport({ lean: "bearish", confidence: "high", score: -60 }, "TITAN", posts.slice(0, 2));
    expect(r.confidence).toBe("low");
  });
});

describe("analyseSentiment", () => {
  it("falls back to the next Gemini model when one is overloaded", async () => {
    process.env.GEMINI_API_KEY = "test";
    const item = `<item><title>Titan beats - Mint</title><link>https://n/a</link><pubDate>Sat, 10 Oct 2026 04:34:44 GMT</pubDate><source>Mint</source></item>`;
    const models: string[] = [];
    vi.stubGlobal("fetch", async (url: string) => {
      if (url.startsWith("https://news.google.com")) return new Response(`<rss>${item.repeat(6)}</rss>`);
      models.push(url.split("/models/")[1].split(":")[0]);
      if (models.length === 1) return new Response("{}", { status: 503 });
      const answer = JSON.stringify({ lean: "bullish", confidence: "high", score: 50, keyPostIndices: [0] });
      return Response.json({ candidates: [{ content: { parts: [{ text: answer }] } }] });
    });

    const r = await analyseSentiment("FALLBACK", "Titan Company", true);
    expect(models).toHaveLength(2);
    expect(models[0]).not.toBe(models[1]);
    expect(r.lean).toBe("bullish");
    vi.unstubAllGlobals();
  });
});
