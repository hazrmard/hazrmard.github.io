+++
title = "How Can Anything Beat n log n?"
date = "2026-11-23T00:00:00-08:00"
lastmod = "2026-11-23T00:00:00-08:00"
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

The short answer is that $n \log n$ is not a universal speed limit. It is the speed limit of a very specific game. To see how algorithms beat it, we need to look at what $n \log n$ actually measures—and what happens when you stop playing by its rules.

## What $n \log n$ Actually Looks Like

Think of sorting $n$ items as routing each item down a decision tree into its final slot.

If you are only allowed to ask yes/no comparison questions (`<` or `>`), every fork in the tree has **2 branches**. Each step cuts the remaining slots in half. To route one item to its unique leaf among $n$ slots, it has to travel down roughly $\log_2 n$ levels.

Send all $n$ items down a tree of depth $\log_2 n$, and you pay $n \log_2 n$ total steps.

{{< read src="post/nlogn/widget-binary-tree.html" >}}

## The Hidden Rules of the Game

That intuition feels airtight, and under two specific conditions, it *is* airtight:

1. **Black-box operands:** You cannot peek inside an item. Your only tool is a binary yes/no operation (like `is a < b?`) that gives you at most 1 bit of information per step.
2. **Factorial-scale outcomes:** The number of possible final answers grows like $n!$ (or $n^n$)—meaning each of the $n$ items could end up in one of roughly $n$ distinct roles or positions.

In an earlier post on [entropy](/post/surprise-derivation-entropy/), I framed entropy $H$ as the minimum number of choices (bits) needed to describe categories of events:

$$
H(\text{outcomes}) = -\sum_i p_i \log_2 p_i
$$

That same lens gives us a hard floor for any algorithm.

Let $N$ be the total number of possible final answers to a problem. When every answer is equally likely (the worst case, $p_i = 1/N$), the entropy of the answer space simplifies to:

$$
H(N) = -\sum_{i=1}^{N} \frac{1}{N} \log_2 \frac{1}{N} = \log_2 N
$$

Why is $H(N) = \log_2 N$ a hard floor? Because $q$ yes/no questions can only produce $2^q$ distinct transcripts of `yes` and `no` answers. If $2^q < N$, at least two different final answers must share the exact same transcript, and no algorithm can tell them apart. Therefore:

$$
2^q \ge N \implies q \ge \log_2 N = H(N)
$$

Where does the $\log_2 n$ in $n \log_2 n$ come from? Logarithms turn multiplication into addition:

- If each of $n$ items has **2 choices** (say, valid or invalid), then $N = 2^n$, and $H(2^n) = \log_2(2^n) = n$. No $\log n$ appears.
- If each of $n$ items has **$n$ choices** (or $N = n!$ total orderings), you are multiplying $n$ numbers that grow with $n$. Taking $H(n!) = \log_2(n!)$ adds up $\log_2 1 + \log_2 2 + \dots + \log_2 n$, which lands at roughly $n \log_2 n$.

The $\log_2 n$ factor is intrinsically tied to factorial-scale answer spaces *combined* with constant-outcome operations.

## How Existing Algorithms Break $n \log n$

If $H(N) = \log_2 N$ is a mathematical floor, how do algorithms like **Radix Sort** or **Bucket Sort** sort $n$ numbers in $O(n)$ time?

They don't break the math. They break the **black-box assumption**—and flatten the tree.

Imagine lining up 30 kids by birth month. If you treat them as black boxes and only ask pairs of kids *"who was born earlier?"*, you are stuck with a 2-way tree of depth $\log_2 n$. Instead, put 12 labeled boxes on the floor (`Jan` through `Dec`). Each kid looks at their own birth month and walks straight to their box in one step.

Computers can do the same thing because numbers aren't opaque black boxes—they are digits and bit patterns, and hardware can jump directly to a memory address in a single step. Remember from the [entropy post](/post/surprise-derivation-entropy/#dimensionality) that the base of the logarithm corresponds to how many values a single choice can take. Instead of a 2-way comparison that yields $\log_2 2 = 1$ bit of information, reading a decimal digit to jump into one of 10 branches yields $\log_2 10 \approx 3.32$ bits in one operation, and indexing directly into an array of size $n$ yields $\log_2 n$ bits in a single step.

Most-Significant-Digit (MSD) Radix Sort makes the 1:1 contrast obvious: it routes the exact same items down a tree, except each node has **10 branches** (`0`–`9`) instead of 2. Widening the branching factor flattens the tree depth from $\log_2 n$ down to the number of digits—with zero comparisons.

{{< read src="post/nlogn/widget-radix-tree.html" >}}

## Entropy Is a Floor, Not a Guarantee

One more nuance before we put the full picture together: having $H(N) = \log_2 N$ bits of entropy does *not* guarantee you can solve a problem in $\log_2 N$ steps.

Compare searching a sorted list against finding the maximum of an unsorted list. Both have $N = n$ possible answers, so both have the exact same entropy: $H(n) = \log_2 n$ bits. Yet finding the max takes $n - 1$ comparisons, because each comparison only knocks out one loser—it cannot cut the remaining candidates in half.

You only hit the $H(N) = \log_2 N$ floor when the problem's structure lets each operation split the remaining possibilities roughly in half.

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
