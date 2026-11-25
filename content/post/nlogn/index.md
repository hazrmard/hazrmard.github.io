+++
title = "How Can Anything Beat n log n?"
date = "2026-11-23T00:00:00-08:00"
lastmod = "2026-11-24T00:00:00-08:00"
description = "Why n log n is not a universal speed limit—and how entropy and branching factor explain every algorithm that beats it."
link = ""
tags = ["Algorithms", "Entropy", "Information Theory"]
categories = ["Computer Science"]
includes = ["./widgets.js"]
hasequations = true
haspython = false
tableofcontents = true
draft = true
image = ""
spotlight = false
ai_assistance = "AI synthesis from notes"
epistemic_status = "High"
+++

Recently, headlines have kept making the rounds about sub-$n \log n$ algorithms—first [Duan et al. breaking Dijkstra's $O(m + n \log n)$ sorting barrier](https://arxiv.org/abs/2504.17033) for directed shortest paths, and then a [preprint claiming sub-$n \log n$ integer multiplication](https://github.com/openai/math/blob/main/preprints/Integer-multiplication-below-n-log-n-September-23-2026/paper.pdf).

My first reaction was skepticism. If a problem cares about ordering $n$ items, don't you need $\log n$ choices to uniquely place each item, repeated $n$ times? That gives $n \log n$. How could you possibly do better?

The short answer is that $n \log n$ is not a universal speed limit. It is the lower bound of a specific model of computation. To see how algorithms beat it, we need to look at what $n \log n$ actually measures—and which assumptions those algorithms drop.

## What $n \log n$ Actually Looks Like

Think of sorting $n$ items as routing each item down a decision tree into its final slot.

If you are only allowed to ask yes/no comparison questions (`<` or `>`), every fork in the tree has **2 branches**. Each step cuts the remaining slots in half. To route one item to its unique leaf among $n$ slots, it has to travel down roughly $\log_2 n$ levels.

Send all $n$ items down a tree of depth $\log_2 n$, and you pay $n \log_2 n$ total steps.

{{< read src="post/nlogn/widget-binary-tree.html" >}}

## The Hidden Assumptions

That intuition feels airtight: if characterizing or placing a single element among $n$ possibilities takes $\log_2 n$ operations, and there are $n$ elements to process, then any task requiring ordering or classification across $n$ items seems forced to pay $n \log_2 n$. Under two specific conditions, that reasoning *is* airtight:

1. **Black-box operands:** You cannot peek inside an item. Your only tool is a binary yes/no operation (like `is a < b?`) that gives you at most 1 bit of information per step.
2. **Factorial-scale outcomes:** The number of possible final answers grows like $n!$ (or $n^n$)—meaning each of the $n$ items could end up in one of roughly $n$ distinct roles or positions. Not every task on $n$ items has that many outcomes: finding the maximum of $n$ items has only $n$ possible answers (whichever position holds the largest value), and assigning a yes/no label to each item has $2^n$ possible answers. Neither creates a factorial space the way sorting all $n$ items ($n!$ orderings) does.

## How Existing Algorithms Break $n \log n$

Counterexamples already exist in every algorithms textbook. Two classic ones—**Bucket Sort** and **Radix Sort**—sort $n$ numbers in $O(n)$ time (for bounded or fixed-width keys):

- **Bucket Sort** computes a bucket address directly from each item's value, drops the item straight into that bucket in a single jump (when keys map cleanly into $n$ slots, that is a direct $n$-way lookup), and then reads the buckets back in order.
- **Radix Sort** processes keys one digit at a time. In Most-Significant-Digit (MSD) Radix Sort, 3-digit numbers are first routed into 10 buckets (`0`–`9`) by their hundreds digit; only buckets holding more than one item are split again by their tens digit, and so on—without ever comparing two numbers against each other.

Neither algorithm breaks mathematics. Both drop the **black-box assumption**—and flatten the tree.

Imagine lining up 30 kids by birth month. If you treat them as black boxes and only ask pairs of kids *"who was born earlier?"*, you are stuck with a 2-way tree of depth $\log_2 n$. Instead, put 12 labeled boxes on the floor (`Jan` through `Dec`). Each kid looks at their own birth month and walks straight to their box in one step.

Computers can do the same thing because numbers aren't opaque black boxes—they are digits and bit patterns, and hardware can jump directly to a memory address in a single step. Direct indexing widens the branching factor all the way to $n$, collapsing the tree to depth 1. MSD Radix Sort makes the intermediate case just as clear: it routes the exact same items down a tree, except each node has **10 branches** (`0`–`9`) instead of 2, flattening the depth from $\log_2 n$ down to the number of digits—with zero comparisons.

{{< read src="post/nlogn/widget-radix-tree.html" >}}

## The Information-Theoretic View

Why does widening the branching factor break $n \log n$, and when is a lower bound truly unavoidable? Information theory puts both assumptions into a single equation.

In an earlier post on [entropy](/post/surprise-derivation-entropy/), I framed entropy $H$ as the minimum number of choices (bits) needed to describe categories of events:

$$
H(\text{outcomes}) = -\sum_i p_i \log_2 p_i
$$

That same lens gives us a hard floor for any algorithm.

Let $N$ be the total number of possible final answers to a problem. Note that $N$ is a function of the input size $n$, not the input size itself: for an input of $n = 4$ distinct numbers, finding the maximum has $N = n = 4$ possible answers (whichever of the 4 positions holds the largest value), whereas sorting those same 4 numbers has $N = n! = 24$ possible orderings. When every answer is equally likely (the worst case, $p_i = 1/N$), the entropy of the answer space simplifies to:

$$
H(N) = -\sum_{i=1}^{N} \frac{1}{N} \log_2 \frac{1}{N} = \log_2 N
$$

Why is $H(N) = \log_2 N$ a hard floor for binary operations? Because $q$ yes/no questions can only produce $2^q$ distinct transcripts of `yes` and `no` answers. If $2^q < N$, at least two different final answers must share the exact same transcript, and no algorithm can tell them apart. Therefore:

$$
2^q \ge N \implies q \ge \log_2 N = H(N)
$$

Where does the $\log_2 n$ in $n \log_2 n$ come from? Logarithms turn multiplication into addition:

- If each of $n$ items has **2 choices** (say, valid or invalid), then $N = 2^n$, and $H(2^n) = \log_2(2^n) = n$. No $\log n$ appears.
- If each of $n$ items has **$n$ choices** (or $N = n!$ total orderings), you are multiplying $n$ numbers that grow with $n$. Taking $H(n!) = \log_2(n!)$ adds up $\log_2 1 + \log_2 2 + \dots + \log_2 n$, which lands at roughly $n \log_2 n$.

Now look at what happens when you drop the black-box assumption. Remember from the [entropy post](/post/surprise-derivation-entropy/#dimensionality) that the base of the logarithm corresponds to how many values a single choice can take. A $k$-way operation yields up to $\log_2 k$ bits per step instead of 1 bit, so $q$ operations can distinguish $k^q$ transcripts:

$$
k^q \ge N \implies q \ge \frac{H(N)}{\log_2 k} = \log_k N
$$

Reading a decimal digit in Radix Sort yields $\log_2 10 \approx 3.32$ bits per step; indexing directly into an array of size $n$ yields $\log_2 n$ bits in a single step—canceling the $\log_2 n$ in $n \log_2 n$ and dropping the floor to $O(n)$. The $\log_2 n$ factor is therefore tied to factorial-scale answer spaces *combined* with constant-outcome operations.

### Entropy Is a Floor, Not a Guarantee

One important nuance: having $H(N) = \log_2 N$ bits of entropy does *not* guarantee you can solve a problem in $\log_2 N$ steps (or $\log_k N$ steps with a $k$-ary operation).

Compare searching a sorted list against finding the maximum of an unsorted list. Both have $N = n$ possible answers, so both have the exact same entropy: $H(n) = \log_2 n$ bits. Yet finding the max takes $n - 1$ comparisons, because each comparison only knocks out one loser—it cannot cut the remaining candidates in half.

More generally, to reach $\log_k N = H(N) / \log_2 k$ steps with a $k$-ary operation over $N$ possible outcomes, each step must partition the remaining candidates **symmetrically (evenly)** into $k$ disjoint buckets of roughly $N/k$ outcomes. That is what lets every step shrink the answer space by division ($N \to N/k$) and extract the full $\log_2 k$ bits toward the answer.

When an operation is **asymmetric**—say, checking *"is item $i$ the target?"* on an unsorted list, where one branch isolates $1$ outcome and the other leaves $N - 1$—the worst-case branch shrinks by subtraction ($N \to N - 1$) instead of division, so you never reach $\log_k N$. Finding the maximum runs into a related failure: `a > b` has two equally likely outcomes, yet on the answer space of $N$ candidate maxima it only discards a single loser, leaving $N - 1$ candidates alive either way because the remaining information is spent on relative order we do not need. You only hit the entropy floor when the problem's structure lets each operation carve the remaining answers into roughly equal, disjoint fractions.

## Bringing It All Together

Every complexity claim sits on two axes: how fast the answer space $N$ grows, and how much information a single operation can extract.

| Problem | Answer space ($N$) | Entropy floor ($H(N) = \log_2 N$) | Black-box binary ops | Breaking the black box |
| :--- | :--- | :--- | :--- | :--- |
| **Read item at index $i$** | $1$ | $0$ | $0$ (1 direct read) | $O(1)$ |
| **Search a sorted list** | $n$ | $\log_2 n$ | $\log_2 n$ | $O(1)$ (with hash/direct index) |
| **Find max (unsorted)** | $n$ | $\log_2 n$ | $n - 1$ | $O(n)$ (still must inspect all) |
| **Label each item yes/no** | $2^n$ | $n$ | $n$ | $O(n)$ |
| **Sort $n$ items** | $n!$ | $\sim n \log_2 n$ | $\sim n \log_2 n$ | $O(n)$ (Radix / Bucket sort) |
| **Learn any pairwise rule** | $2^{n^2}$ | $n^2$ | $n^2$ | $O(n^2)$ |

{{< read src="post/nlogn/widget-floor-explorer.html" >}}

So whenever you see a headline announcing a sub-$n \log n$ algorithm, there are only two ways it happened: either the problem never actually required a factorial-scale ordering in the first place (like computing shortest-path distances without sorting every vertex), or the algorithm found a way to look inside the box and widen the branching factor.
