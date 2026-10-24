# AI Studio and the sandbox trial (KB-014)

Owner: Dustine Kibagendi, The Lucrebag.

## What it does
One request, several models, shared context. Open Sandbox > AI Studio.
- **Auto:** LOIS classifies the job (reasoning, writing, code, quick answer, summarising, extracting) with plain rules, picks the best connected model, and hands off to the next best if one fails.
- **Compare:** the same request on up to three providers, side by side.
- **Chain:** plan, then draft, then check, each by a different model where possible.
- **Shared context:** every model receives the same session summary, your approved knowledge and the last eight turns. Each answer is labelled with the model and the reason it was chosen.
- Sessions and turns are private to the person (row-level security) and can be deleted.

## Connecting models (all optional, free tiers first)
Add any of these in Vercel > Settings > Environment Variables, then redeploy: `GOOGLE_API_KEY` (Gemini, free at aistudio.google.com), `GROQ_API_KEY` (free at console.groq.com), `OPENROUTER_API_KEY` (free ":free" models), `ANTHROPIC_API_KEY` (paid). Override model names with `LOIS_MODEL_GOOGLE`, `LOIS_MODEL_GROQ`, `LOIS_MODEL_OPENROUTER`, `LOIS_LLM_MODEL` if a provider retires one. With no keys, Studio answers from approved knowledge only. The default model names and fit scores in `src/lib/models.ts` are our judgement and could not be tested live; adjust after the first real use.

## Limits
Customers: 40 Studio requests a day. Internal staff: 200. Resets at midnight Nairobi time.

## 25-day sandbox trial
- Starts the first time a customer opens the app. Internal staff workspaces have no clock.
- A countdown banner shows on every page. When it ends, Studio and the tools pause; people can still read and export their data.
- Staff with the second factor can extend a person's trial (1 to 90 days) from the Staff console.

## Guide strip
Every page opens with a collapsible "What am I looking at?" strip (what this is, what to do, what to avoid). It opens the first time you visit a page and stays collapsed afterwards.
