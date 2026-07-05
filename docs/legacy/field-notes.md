# What building a 360M health coach taught me about small-model UX

*A field note from the [Build Small Hackathon](https://huggingface.co/build-small-hackathon) — Papajams, June 2026.*

When I started Body Debt, my plan was to use a 7B model and call it a day. Two weekends and a lot of failed Cloudflare tunnels later, I'm shipping a 360M-parameter model and I think the constraint made the product better.

Here are the four lessons, in order of how much they surprised me.

## 1. The product is privacy first, model second

The first user of this app is me at 7am after a bad night. I'm holding a coffee with one hand, my phone with the other, and the question is "should I train today, or rest?" The last thing I want is for that question to round-trip through a server. Even an anonymous server.

So the constraint became: **all inference happens on-device.** A 7B cloud call doesn't help when you're undressed, hungover, or at 2am with a chest flutter. The model has to be small enough to live next to the camera permission.

A 360M model is a constraint that *enables* the product. It's not a compromise.

## 2. The agent trace is the product

I expected the *score* to be the thing users cared about. It's not. It's the **chain of reasoning**.

Body Debt computes the score with a deterministic 5-system engine — no LLM, no randomness. Then it asks SmolLM2-360M to produce a 3-line triage plan: `PRIORITY: Brain 67/100 / SECONDARY: Cardiovascular 37/100 / AVOID: late caffeine, deep-focus work before 11am.` Then it streams a longer prescription.

When I show people the app, they don't react to the number. They react to the fact that they can see *why* the number is what it is. The trace panel — `parse_stressors → compute_live_score → face_scan → triage_plan → llm_coach` — is the part they screenshot.

The hackathon's "Best Agent" badge is judged on multi-step tool use. I can't honestly say my pipeline does tool use. But I can say: the *visible* reasoning chain is the most valuable real estate in the UI. If you're building with a small model, don't hide its work.

## 3. Tiny models are good at structured output, bad at free-form

SmolLM2-360M hallucinates less than I expected, but it *also* doesn't generate fluent prose. The breakthrough came when I switched the final LLM call to ask for a structured plan with three labeled lines, and the longer prescription to follow that plan.

```
SYSTEM: You are a triage planner. Output EXACTLY three lines, in this
format, with no other text:
PRIORITY: <system name> <score>
SECONDARY: <system name> <score>
AVOID: <one specific thing to avoid today>
```

A 360M model can do this. It can produce three labeled lines, in the right order, with no extra text. What it can't do is write a four-paragraph essay about recovery protocols — that part falls apart.

The trick is to **frame the small model as a structured-output generator, not a writer.** Let the deterministic Python do the prose scaffolding (the prescription timeline, the science cards). Let the LLM do the bit it's good at: a fast, low-stakes classification.

## 4. Counterfactual hints beat raw prescriptions

The single highest-leverage line in the UI is the counterfactual:

> *If you had slept 7+ hours, Brain debt would drop from 67 to 55.*

This isn't an LLM. It's just the scoring engine re-run with one variable flipped, then a sentence template. Three minutes of Python. But it converts the app from "here's what's wrong with you" to "here's the one change that would help most." Users screenshot this. They share it. They remember it.

I almost didn't add it because it felt like a small thing.

## What I'd tell a future me

If you're building on a small model for a real product:

- **Commit to dark or light, not a toggle.** A toggle dilutes the design and forces the demo video to pick a side anyway. Pick the side that matches the use case (for health at 2am, dark is the only choice).
- **Show the trace.** Even a fixed pipeline looks agentic when the steps are visible. A 5-step trace panel is worth more than a clever prompt.
- **Use the model for structure, not prose.** Small models are great at JSON-shaped outputs and bad at free-form. Let the deterministic layer own the prose.
- **Ship a counterfactual.** It's the cheapest "wow" moment in a small-model app and it converts raw output into actionable advice.
- **Write a 200-word model card, even for a 2KB model.** The Well-Tuned sub-badge is a 553-parameter MLP with a real README. The card is the point.

## What's next

After the hackathon closes I'll publish:

- The stress MLP as [`Papajams/body-debt-stress-mlp`](https://huggingface.co/Papajams/body-debt-stress-mlp) on the Hub (553 params, MIT, full model card).
- A longer post on the deterministic-vs-LLM split for recovery products. I think there's a real design pattern here that's under-explored.

If you build something with a 360M model and a visible reasoning chain, link me. I'd like to see what others do with the same constraint.

— Papajams
