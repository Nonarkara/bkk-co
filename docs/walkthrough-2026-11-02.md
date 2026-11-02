# Walkthrough critique: v1 seen by five people (2026-11-02)

The builder walked v1 (map, chips, search, place sheet, rating) as five people. This is self-critique and not a substitute for the independent audit. It decides what v2 builds.

| Who | What they came for | Where v1 lost them |
|---|---|---|
| **Mew, 16, M.5 student, Thai-first, phone** | A quiet place near Siam to study until late | The map shows 57,000 dots, and "Open now" cuts that to about 1,100 with no word on which ones stay open late. Nothing says *study*. The English filter labels are fine; the Thai experience stops at the search box. |
| **Daniel, 27, freelancer new to Bangkok** | Somewhere to work that also helps him understand the city | v1 answers *where* and never *why here*. Clusters read as noise, there's no sense of neighbourhoods, and no reason to come back tomorrow. |
| **Ploy, 38, remote-working parent** | A reliable spot with outlets near the school run | The work score is the right idea, but every place is "not rated yet", so the promise is empty on day one. She can't keep a shortlist and loses her finds the moment she closes the tab. |
| **Khun Somchai, 58, retired civil servant** | A library or café where he can read and meet friends | The 14 px grey text and the small dots are hard to read. "Co-work" means nothing to him. Libraries are drawn as hollow dots and look like empty slots. He wants a story, not a database. |
| **Yai Noi, 72, grandmother, shown it by a grandchild** | Nothing until someone shows her a place she knows | She recognises nothing until a familiar name appears: Talat Noi, the river. The map can't take her there on its own. |

## What every one of them was missing

1. **Places without meaning.** A dot is not a place. People pick neighbourhoods first and venues second. *Build: a few operational neighbourhoods with a story each, what they are socially good for, and real numbers.*
2. **No memory.** Nothing they found or felt survives a visit. *Build: a passport kept on the device. "I've been here", an impression, a note, photos, and stamps per neighbourhood. Export so it can't be lost.*
3. **Empty scores on day one.** Crowd ratings start at zero. *Build: synthesized numbers that are true from day one: work spots within a 10-minute walk, density compared with every rail station in the city, Wi-Fi and hours coverage. Label them as computed and show their sources.*
4. **No guide.** The tool is honest but cold. *Build: Nong Plub as a cartoon crayon guide in the corner. She speaks in one line and never appears as a pop-up on first load.*
5. **Small type and abstract labels for older eyes.** *Build: name things plainly, keep 14 px as the floor, raise contrast on secondary text, and give the place sheet a larger name.*

## Kept on purpose
The map comes first with no first-load modal. The UI uses three type sizes, has no shadows, and uses one amber. A missing score shows as "not rated", never as a fake one.

## Lens: Oldenburg's *The Great Good Place* (1989)
Ray Oldenburg described third places by eight traits: neutral ground, a leveller, conversation as the main activity, accessible and accommodating, regulars, a low profile, a playful mood, and a home away from home. Each neighbourhood story names the traits it actually shows, not all eight.
