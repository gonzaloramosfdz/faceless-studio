# Niche report

Researched 2026-11-11. Reuse until 2026-12-11, then refresh.
Method: 3 niche-researcher subagents, 15 web searches in total, compiled and adjusted by the orchestrator.

## Read this first: how strong the evidence is

- **Sourced:** platform policy (YouTube inauthentic content, synthetic-content disclosure, Meta originality) and data licenses.
- **Not sourced:** demand, competition and language-gap scores. No search returned per-niche view, trend or supply data for Shorts or Reels, so those three columns are judgement and are marked [unverified]. Most "faceless niche" pages are vendor SEO guides and were not used for numbers.
- **Revenue:** sources conflict by two orders of magnitude on Shorts RPM. No figure is used anywhere in this report.
- Policy pages were read as search snippets, not opened in full. Wording must be confirmed on the official pages before monetization is applied for.

## Policy findings that shape the choice

1. **YouTube inauthentic content.** Repetitive or mass-produced videos are not monetizable "regardless of how the content was made"; template-based videos with little meaningful variation are the named pattern. AI-assisted videos with original, varied content are described as eligible. No numeric threshold is published. ([YouTube Help](https://support.google.com/youtube/answer/1311392), [TechCrunch 2026-07-20](https://techcrunch.com/2026/07/20/youtube-clarifies-policies-around-ai-slop-and-upsetting-videos/))
2. **YouTube synthetic-content disclosure.** Required for realistic altered or synthetic content. Clearly unrealistic content such as animation, and AI help with scripts, are exempt. ([YouTube Help](https://support.google.com/youtube/answer/14328491?hl=en-GB)) The pipeline will still set the disclosure flag where the API offers it, per the project rules.
3. **Meta.** Content produced by the creator counts as original; accounts that mostly post unoriginal content are deprioritized and can lose monetization. No AI-label requirement for code-made animation was found. ([Meta, March 2026](https://about.fb.com/news/2026/03/rewarding-original-creators-on-facebook/))

Consequence: a niche is only viable if each video differs in substance (a different problem, map or mechanism), not only in numbers swapped into one template.

## Scoring table

Scale 1 (bad) to 5 (good), maximum 30. D = demand, C = competition (5 = little), P = production fit, M = monetization safety, L = language gap, R = risk (5 = low). D, C and L are [unverified] for every row.

| # | Niche | D | C | P | M | L | R | Total |
|---|---|---|---|---|---|---|---|---|
| N6 | Math and logic puzzles | 3 | 2 | 5 | 4 | 3 | 4 | **21** |
| N4 | Geography and map facts | 3 | 3 | 4 | 4 | 3 | 3 | **20** |
| N5 | Data-visualization comparisons | 3 | 3 | 5 | 3 | 3 | 3 | **20** |
| N2 | Engineering "how things work" | 4 | 2 | 3 | 4 | 3 | 4 | **20** |
| N7 | Language learning | 3 | 2 | 3 | 3 | 4 | 4 | 19 |
| N1 | Funny stickman animation | 3 | 2 | 3 | 3 | 3 | 4 | 18 |
| N3 | Quiz and trivia | 3 | 2 | 4 | 2 | 3 | 4 | 18 |
| N8 | History motion graphics | 3 | 2 | 4 | 3 | 3 | 3 | 18 |
| N9 | Science "what if" | 4 | 2 | 3 | 3 | 3 | 2 | 17 |

Orchestrator adjustment: the subagent scored N2 production fit at 4. It was lowered to 3 because every mechanism needs its own diagram, and an LLM writing a new animated diagram 14 times a week with no human check is unreliable.

The totals are close and half of each total is unverified, so the ranking is decided by the two columns that are grounded: production fit and monetization safety.

## Why the others rank lower

- **N1 Stickman comedy:** drawing stick figures in code is easy, but comedy depends on timing and physical gags, which a free LLM writing 14 skits a week will not deliver consistently. Weak jokes at volume is the pattern the inauthentic-content policy targets.
- **N3 Quiz:** the countdown-and-reveal template is the clearest example of "little meaningful variation".
- **N7 Language learning:** open-source TTS on mixed-language sentences is untested, and pronunciation errors defeat the purpose.
- **N8 History, N9 Science:** LLM-written facts with nobody checking them. N9 also sits in a category already under scrutiny for AI misinformation ([JMIR 2025](https://mededu.jmir.org/2025/1/e80084)).

## Top 3

### 1. Math and logic puzzles (N6), recommended

**Why:** it is the only niche where code can check the content. A solver script verifies each answer before rendering, which matters with under 1 hour a week of review and a free LLM. Each puzzle has its own visuals and solution, which fits YouTube's originality test. Notation is language-neutral, so adding a second language later is cheap.

**Format:** a 30 to 45 s vertical video: the puzzle appears, a short pause invites a guess, then an animated step-by-step solution with a final check. The weekly long-form is "7 puzzles, easy to hard" with longer explanations.

**Main risks:** copycat channels exist ([Reddit snapshot 2026-04-15](https://reddit.sentinel-team.org/posts/1sleo0l/snapshots/2026-04-15T02%3A17%3A08.258928Z)); puzzles must be original or generated, not copied from books or contests; needs at least 8 to 10 puzzle families so the feed does not look like one template.

**Sample ideas:**
1. A 3x3 magic square with gaps, solved by animated row sums.
2. A river-crossing puzzle with the state graph drawn as nodes.
3. "How many triangles?" with each one highlighted in turn.
4. A Monty Hall-style probability trap with a simulated 1,000-trial tally.
5. A modular-clock puzzle with the hands rotating to the answer.

### 2. Geography and map facts (N4), with data comparisons (N5) as a second format

**Why:** numbers come straight from datasets, not from the LLM, so the facts are as reliable as the source. Maps and charts give two visual formats in one channel, which helps variety. Natural Earth map data is public domain ([Wikipedia: Natural Earth](https://en.wikipedia.org/wiki/Natural_Earth); primary terms page still to be confirmed).

**Format:** a 45 to 60 s animated map or chart with one narrated claim and a spoken takeaway. The weekly long-form groups a theme ("7 things maps get wrong").

**Main risks:** disputed borders are a brand-safety issue; OpenStreetMap data needs attribution and has share-alike rules ([OSMF](https://osmfoundation.org/wiki/Licence/Licence_Compatibility)); World Bank license not yet verified; pure ranking videos are the flagged pattern, so each needs a real explanation.

**Sample ideas:**
1. Why Chile is so long: its latitude span laid over Europe.
2. Greenland vs. Africa: true size, shown by a projection morph.
3. Countries with the most land borders, counted one by one.
4. How time zones split one country (Mexico, Russia, Brazil).
5. Life expectancy gain since 1960 for ten countries, with the reason for the biggest jump.

### 3. Engineering "how things work" (N2)

**Why:** matches your civil engineering direction and has sourced evidence of Spanish-language demand for animated explainers ([Señal News 2026-07-13](https://senalnews.com/en/digital/the-fixies-spanish-youtube-channel-tops-3-million-subscribers-and-18-billion-views); the article's view figure is internally inconsistent and is not used).

**Format:** a 45 to 60 s video on one mechanism: a labeled 2D diagram animates in sequence over a three-line narration. The weekly long-form covers one structure in depth.

**Main risks:** hardest to automate. It needs a hand-built library of diagram components (beams, gears, pulleys, fluids) before launch, and factual errors need a human check that the 1 hour a week budget does not cover. Realistic only with a slower start or more review time.

**Sample ideas:**
1. How a pulley lifts a weight with half the force.
2. Why bridges have expansion joints.
3. A four-stroke engine in 45 seconds.
4. How a manual can opener works, lever by lever.
5. Why a dam's curved face holds back water.

## Language

No supply data was found for Spanish or French in any niche, so "decide by the gap" cannot be answered from evidence. Recommendation [unverified]: launch in Spanish, because you can judge the narration quality as a native speaker, and add English or French as separate accounts only after the first month of analytics.

## Sources (accessed 2026-11-11)

Policy and licenses:
- https://support.google.com/youtube/answer/1311392
- https://support.google.com/youtube/answer/14328491?hl=en-GB
- https://blog.youtube/news-and-events/disclosing-ai-generated-content
- https://techcrunch.com/2026/07/20/youtube-clarifies-policies-around-ai-slop-and-upsetting-videos/ (2026-07-20)
- https://techrepublic.com/article/news-youtube-ai-video-monetization-rules (2026-07-21)
- https://about.fb.com/news/2026/03/rewarding-original-creators-on-facebook/ (March 2026)
- https://www.tubefilter.com/2026/03/14/facebook-original-content-creator-impersonation/ (2026-03-14)
- https://plagiarismtoday.com/2025/07/08/youtube-targets-inauthentic-content/ (2025-07-08)
- https://osmfoundation.org/wiki/Licence/Licence_Compatibility
- https://wiki.openstreetmap.org/wiki/Import/ODbL_Compatibility
- https://en.wikipedia.org/wiki/Natural_Earth

Niche evidence (secondary, vendor or anecdotal):
- https://senalnews.com/en/digital/the-fixies-spanish-youtube-channel-tops-3-million-subscribers-and-18-billion-views (2026-07-13)
- https://blog.autonolab.com/niches/2025-11-09-faceless-youtube-comedy/ (2025-11-09)
- https://reddit.sentinel-team.org/posts/1sleo0l/snapshots/2026-04-15T02%3A17%3A08.258928Z (2026-04-15)
- https://reddit.sentinel-team.org/posts/1sleo0l/snapshots/2026-04-16T03%3A33%3A34.464863Z (2026-04-16)
- https://reddit.sentinel-team.org/posts/1reny5i/snapshots/2026-02-26T01%3A15%3A12.587915Z (2026-02-26)
- https://fluxnote.io/guides/start-math-education-youtube-channel (vendor)
- https://fluxnote.io/guides/language-learning-shorts-ideas-2026 (vendor)
- https://fluxnote.io/guides/faceless-history-youtube-channel-2026 (vendor)
- https://mededu.jmir.org/2025/1/e80084 (2025)
- https://kotaku.com/youtube-mistakenly-penalizes-popular-science-channel-kurzgesagt-for-ai-generated-slop-2000722702
