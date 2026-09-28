---
draft: true
aliases: [posts/your-brain-saves-on-a-timer]
title: "Your Brain Saves on a Timer: Light, Clock Genes, and the Protein That Says 'Not Yet'"
date: 2026-09-28
description: "Why your hippocampus might be actively blocking memory during the day, what a histone variant called H2A.Z has to do with it, and the experiments I designed to find out (and never ran, because the funding was imaginary)."
tags: [neuroscience, circadian-rhythms, memory, epigenetics]
---

*Adapted from a research proposal I wrote for a cognitive neuroscience class in fall 2019. The proposal was for experiments that were never run. The funding was, and remains, imaginary.*

Every video game worth playing has figured out the same thing: you do not save constantly. You save at checkpoints. Saving in the middle of a boss fight is how you end up with a corrupted file and a character permanently stuck at 3 HP in a burning building.

Your brain may have figured this out a few hundred million years earlier. And if it did, the checkpoints aren't placed by a level designer. They're placed by a clock.

## First, a quick recap on the clock

I've already written about [[posts/neuropsychology/light-and-the-brains-master-clock|how light reaches the brain's master clock]], so the short version: specialized cells in your eye called ipRGCs detect light and report it to the suprachiasmatic nucleus (SCN), a tiny region at the base of your brain made of roughly 20,000 clock cells. Each of those cells runs a roughly 24-hour genetic loop, and the main engine of that loop is a pair of proteins called BMAL1 and CLOCK. They pair up (BMAL1:CLOCK, the colon is how you know it's serious) and bind to specific spots on your DNA called E-boxes, switching genes on in a rhythm.

In 2018, researchers found that light affects mood and learning through two separate routes, and the learning route runs through the ipRGCs that project to the SCN (Fernandez et al., 2018). Mess with the light cycle and you mess with memory, via the clock. Which raises the question I got stuck on as an undergrad: *how*? How does light information going to a clock turn into memories being made, or not made, in the hippocampus?

## Is your DNA just floating around in there?

Nope! Your DNA is about two meters long per cell, and it is spooled. It wraps around little protein cores called histones, like thread around a bobbin, and how tightly it's wound decides which genes can be read. Tightly wound means locked away. Loosely wound means accessible.

The histone core is built from a standard set of parts, but some of those parts have variants, basically alternate versions that change how the spool behaves. One of those variants is called **H2A.Z**. It swaps in for the regular H2A histone and loosens the grip between the DNA and the spool.

Here is where it gets weird. In the hippocampus, the part of your brain responsible for forming new memories, H2A.Z acts as a **memory suppressor**. When researchers remove it from hippocampal neurons, mice actually get *better* at remembering fear-conditioned events (Zovkic et al., 2014; Stefanelli et al., 2018). So in save-file terms, H2A.Z is the little lock icon on the save button. While it's sitting there, the game is not writing to disk.

## So what does the clock have to do with the lock?

This is the part that made me write an entire proposal about it. When BMAL1:CLOCK binds to those E-boxes during the active phase of the day, it doesn't just switch on clock genes. It recruits other machinery, including enzymes that mark nearby histones (a mark called H3K4me3, which is heavily tied to memory formation), and it promotes the **deposition of H2A.Z** at the same sites (Menet et al., 2014; Papazyan et al., 2016).

Put those pieces together:

1. Light tells the SCN what time it is.
2. The clock cycles BMAL1:CLOCK on and off the DNA on a ~24-hour rhythm.
3. When BMAL1:CLOCK is bound, H2A.Z gets deposited.
4. When H2A.Z is present in the hippocampus, memory formation is suppressed.

Which would mean your brain is locking the save button during the part of the day when it is taking in the *most* information, and unlocking it on the way to rest. That's counterintuitive enough that I didn't fully believe it myself, but it lines up with some real findings. In one study, hamsters whose SCN was thrown into dysrhythmia had impaired memory, but hamsters whose SCN was removed entirely did not (Fernandez et al., 2014). A broken clock was worse than no clock at all. And mice trained on fear tasks remember differently depending on whether they learned during their active or resting phase, and whether they got to sleep afterward (Melo & Ehrlich, 2016; Snider & Obrietan, 2018).

Maybe by the end of the day, whatever survived is worth committing to long-term memory. Maybe it's something with no evolutionary logic at all. I genuinely don't know, which is why I wanted to run the experiments.

## The experiments I designed and did not run

The plan used mice (with apologies to the mice) on two light schedules. The control group lived on a normal 12 hours light, 12 hours dark (T24). The chaos group lived on a T7 cycle: 3.5 hours of light, 3.5 hours of dark, over and over, which is known to impair learning without wrecking the mice's sleep or basic circadian rhythms (LeGates et al., 2012). It is, in other words, the mouse equivalent of working a rotating night shift while living inside a casino.

- **Study 1:** Map where H2A.Z sits in the hippocampus at the start of the active phase versus the start of the rest phase, using ChIP-seq (a sequencing method that tells you exactly where on the genome a protein is sitting). If the clock drives it, the peaks should rise and fall with the time of day.
- **Study 2:** Do the same in mice with and without an SCN, on normal and chaotic light cycles. The prediction: ablated mice look roughly the same either way, but intact T7 mice look like a mess compared to T24.
- **Study 3:** Knock out SIRT1, a gene that clears H2A.Z away by tagging it for degradation (Baptista et al., 2013), and test fear memory at different times of day. If H2A.Z really is the lock, taking away the thing that removes it should hurt memory, especially during rest.
- **Study 4:** Combine everything: light cycles, time of day, H2A.Z maps, and memory performance, all in the same animals. My written rationale for this one, which I submitted for a grade, was "We need to go deeper."
- **Study 5:** Young versus aged mice. My notes say "[Imaginary funding ran out so we didn't get to this experiment]." My data analysis section says "[Outsourced to a collaborator more proficient in bioinformatics]." I would like to formally apologize to my TA.

## Why any of this matters outside of a mouse cage

H2A.Z accumulates in the hippocampus as we age (Stefanelli et al., 2018). If it's a memory lock, then aging brains may be slowly accumulating locks, and that has obvious implications for age-related memory decline and Alzheimer's. The flip side is that H2A.Z also shows up in cancer research for its role in cell proliferation, so a buildup that looks like a bug in memory might be a feature somewhere else, protective in ways nobody has untangled yet.

It would also be very naïve to credit all of memory consolidation to one histone variant. There are many histone variants, many histone marks, and the entire field of circadian epigenetics was still being mapped when I wrote this. And as with most things in neuroscience, we know a great deal about mice and not nearly as much about humans.

But here is the part I keep coming back to. Modern life runs on erratic light: screens at midnight, LEDs full of the exact blue wavelength ipRGCs love most, time zones crossed in an afternoon. If the timing of our memory checkpoints really depends on a clock that light sets, then we may be scrambling our own save system and calling it a productive day.

If anyone has run Study 3 since 2019, please tell me. I would love to find out if I was right, or at least wrong in an interesting way.

## References

- Baptista, T., et al. (2013). Regulation of histone H2A.Z expression is mediated by sirtuin 1 in prostate cancer. *Oncotarget, 4*(10), 1673-1685.
- Fernandez, D. C., et al. (2018). Light affects mood and learning through distinct retina-brain pathways. *Cell, 175*(1), 71-84.
- Fernandez, F., et al. (2014). Dysrhythmia in the suprachiasmatic nucleus inhibits memory processing. *Science, 346*(6211), 854-857.
- LeGates, T. A., et al. (2012). Aberrant light directly impairs mood and learning through melanopsin-expressing neurons. *Nature, 491*(7425), 594-598.
- Melo, I., & Ehrlich, I. (2016). Sleep supports cued fear extinction memory consolidation independent of circadian phase. *Neurobiology of Learning and Memory, 132*, 9-17.
- Menet, J. S., Pescatore, S., & Rosbash, M. (2014). CLOCK:BMAL1 is a pioneer-like transcription factor. *Genes & Development, 28*(1), 8-13.
- Papazyan, R., Zhang, Y., & Lazar, M. A. (2016). Genetic and epigenomic mechanisms of mammalian circadian transcription. *Nature Structural & Molecular Biology, 23*(12), 1045-1052.
- Snider, K. H., & Obrietan, K. (2018). Modulation of learning and memory by the genetic disruption of circadian oscillator populations. *Physiology & Behavior, 194*, 387-393.
- Stefanelli, G., et al. (2018). Learning and age-related changes in genome-wide H2A.Z binding in the mouse hippocampus. *Cell Reports, 22*(5), 1124-1131.
- Zovkic, I. B., et al. (2014). Histone H2A.Z subunit exchange controls consolidation of recent and remote memory. *Nature, 515*(7528), 582-586.
