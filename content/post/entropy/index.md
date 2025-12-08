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

In this post, I will derive entropy from first principles. This requires no more than a high school-level understanding of mathematics. This derivation is based on Shannon's original seminal paper, [*A mathematical theory of communication*](https://people.math.harvard.edu/~ctm/home/text/others/shannon/entropy/entropy.pdf).

## A derivation

We want a function, $H(n)$, which measures the uncertainty in a system in which we chose one of $n$ events that can occur. We would want it to exhibit the following three properties:

1. Continuity. If the probabiity of an event changes slightly, the measure of uncertainty in our choice should not suddenly jump.

2. Monotonicity. If the amount of possible events that can happen in the system increases, so does the measure of uncertainty in our choice. The uncertainty in a roll of a coin is smaller than the uncertainty in a  roll of a die which is smaller than the uncertainty of drawing a card from a deck.

3. Additivity. If choice from events can be broken up into multiple choices, then the uncertainties of the parts should add up to the uncertainty of the system. The uncertainty of choosing a card from the deck is the same as the uncertainty of choosing the house and then the number on the card.

Let's say there are $n$ events that can happen, equally likely, and we observe them once. We use the measure $H(n)$ to denote the uncertainty in the system.

Now, let's say add to the system and call it system2. There are $n$ possible events that can happen, and the system2 is composed if $k$ choices, $n_1. n_2, ..., n_k$. In this system2, a combined event is a collection of $k$ choices, each equally likely. Therefore there are $n^k$ possible sequences of events. The measure of uncertainty in this system2 is $H(n^k)$.

System2 can be broken up into $k$ parts, each with an uncertainty of $H(n)$. Therefore, by (3):

$$
H(n^k) = H(n_1) + H(n_2) + ... = k H(n)
$$

One function which satisfies this relationship is $\log$. This satisfies (1) i.e. continuity.

$$
k \log n = \log n^k
$$

Now, generalizing to the case where a successive choices do not have equal probabilities. For example, we can break down the guessing a card into (1) guessing the house , and (2) guessing the number. After making our choices, there are still $n$ events than can happen, but we are first choosing a bin/category, and then choosing from inside that category.

So, if $N=n^k$ is the total number of events

$$
\begin{align*}
H(n) &= H(bins) + \sum_i p_i H(n_i) \\\\
-H(bins) &= \sum_i p_i H(n_i) - H(n) \\\\
&\text{The sum of probabilities is 1, so multiplying by it has no effect} \\\\
-H(bins) &= \sum_i p_i H(n_i) - \sum_i p_i H(n) \\\\
-H(bins) &= \sum_i p_i \left( H(n_i) - H(n) \right) \\\\
-H(bins) &= \sum_i p_i \left( \log n_i - \log n \right) \\\\
-H(bins) &= \sum_i p_i \left( \log (n_i / n) \right) \\\\
&\text{$n_i/n$ is just the probability of $i^{th}$ choice} \\\\
H(bins) &= -\sum_i p_i \log p_i
\end{align*}
$$

Here, *bins* refers to categories of events. In many real-world cases, we care about the category of events - the bigger picture - than the actual events themselves. This *bin* is called a macrostate. Why not care about microstates? In many cases, they are fungible states which have significant only in aggregate. For example, the average kinetic energy of particles (temperature) but not the actual velocity of a particle.

$$
H(macrostates...) &= -\sum_i p_i \log p_i
$$

The distribution of macrostates and relation to entropy is intuitively understood. There are two outcomes of a coin toss, equally likely. Let's say the state we care about is win or lose. In this case, the there is a 1:1 correspondence between the micro- and macro-states. The entropy of this system is:

$$
H([win, lose]) = - (0.5 \log 0.5 + 0.5 \log 0.5)
$$

In case of a six-sided die:

$$
H([1,2,3,4,5,6]) = - 6 * (0.167 \log 0.167)
$$

Which is a bigger number. If there are more states to choose from, everything else being same, the uncertainty in the observation will be higher.

## A digression on logs

The $\log$ function is interesting. Take $\log_2 8=3$. On face value, it represents the power the base will be raised to to equal the argument.

On a deeper glance, it represents the minimum number of questions needed to isolate a number, from 1 to the argument. A base of 2 means, at each step a question is asked to rule out 1/2 of the remaining options.

```
(> 4)
  --Yes--(>6)
    --Yes--(>7)
      --Yes--[8]
      --No---[7]
    --No---(>5)
      --Yes--[6]
      --No---[5]
  --No--(>2)
    --Yes--(>3)
      --Yes--[4]
      --No---[3]
    --No---(>1)
      --Yes--[2]
      --No---[1]
```

## Representing surprise

🚧