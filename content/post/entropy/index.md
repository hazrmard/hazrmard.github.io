+++
title = "Surprise? A derivation of entropy"
date = "2025-12-04T22:07:36-08:00"
description = "I explain entropy to myself"
link = ""
tags = [ ]
categories = [ ]
includes = [ ]
hasequations = true
tableofcontents = false
draft = false
slug = "surprise-derivation-entropy"
+++

🚧Work in progress🚧

In this post, I will derive entropy from first principles. This requires no more than a high school-level understanding of mathematics. This derivation is based on Shannon's original seminal paper, *A mathematical theory of communication*.

## A derivation

We want a function, $A(n)$, which measures the uncertainty in a system in which we chose one of $n$ events that can occur. We would want it to exhibit the following three properties:

1. Continuity. If the probabiity of an event changes slightly, the measure of uncertainty in our choice should not suddenly jump.

2. Monotonicity. If the amount of possible events that can happen in the system increases, so does the measure of uncertainty in our choice. The uncertainty in a roll of a coin is smaller than the uncertainty in a  roll of a die which is smaller than the uncertainty of drawing a card from a deck.

3. Additivity. If choice from events can be broken up into multiple choices, then the uncertainties of the parts should add up to the uncertainty of the system. The uncertainty of choosing a card from the deck is the same as the uncertainty of choosing the house and then the number on the card.

Let's say there are $n$ events that can happen, equally likely, and we observe them once. We use the measure $A(n)$ to denote the uncertainty in the system.

Now, let's say add to the system and call it system2. There are $n$ possible events that can happen, and the system2 is composed if $k$ choices, $n_1. n_2, ..., n_k$. In this system2, a combined event is a collection of $k$ choices, each equally likely. Therefore there are $n^k$ possible sequences of events. The measure of uncertainty in this system2 is $A(n^k)$.

System2 can be broken up into $k$ parts, each with an uncertainty of $A(n)$. Therefore, by (3):

$$
A(n^k) = A(n_1) + A(n_2) + ... = k A(n)
$$

One function which satisfies this relationship is $\log$. This satisfies (1) i.e. continuity.

$$
k \log n = \log n^k
$$

Now, generalizing to the case where a successive choices do not have equal probabilities. For example, we can break down the guessing a card into (1) guessing the house , and (2) guessing the number. After making our choices, there are still $n$ events than can happen, but we are first choosing a bin/category, and then choosing from inside that category.

So, if $N=n^k$ is the total number of events

$$
\begin{align*}
A(n) &= A(bins) + \sum_i p_i A(n_i) \\\\
A(bins) &= \sum_i p_i A(n_i) - A(n) \\\\
&\text{The sum of probabilities is 1, so multiplying by it has no effect} \\\\
A(bins) &= \sum_i p_i A(n_i) - \sum_i p_i A(n) \\\\
A(bins) &= \sum_i p_i \left( A(n_i) - A(n) \right) \\\\
A(bins) &= \sum_i p_i \left( \log n_i - \log n \right) \\\\
A(bins) &= \sum_i p_i \left( \log (n_i / n) \right) \\\\
&\text{$n_i/n$ is just the probability of $i^{th}$ choice} \\\\
A(bins) &= \sum_i p_i \log p_i
\end{align*}
$$

Here, *bins* refers to categories of events. In many real-world cases, we care about the category of events - the bigger picture - than the actual events themselves. For example, the house of cards but not the actual card itself. Or, the average kinetic energy of particles but not the actual velocity of a particle. This *bin* is called a macrostate.

There are many ways to be in a macrostate. Thirteen ways to be a card of spades. Infinite velocities to have an average kinetic energy of 25C. One way to win a coin toss.

## Representing surprise

🚧