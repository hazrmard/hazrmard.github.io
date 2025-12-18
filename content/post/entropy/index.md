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

Now, let's say add to the system and call it system2. There are $n$ possible events that can happen in the original system. System2 is composed of $k$ equal choices, $n_1 = n_2, ..., = n_k$ from that pool of events. In this system2, a aggregate event is a collection of $k$ choices, each equally likely. Therefore, there are $N=n^k$ possible aggregate events. The measure of uncertainty in this system2 is $H(n^k)$.

System2 can be broken up into $k$ parts, each with an uncertainty of $H(n)$. Therefore, by (3):

$$
H(n^k) = H(n_1) + H(n_2) + ... = k H(n)
$$

One function which satisfies this relationship is $\log$. This satisfies (1) i.e. continuity.

$$
k \log n = \log n^k
$$

Now, generalizing to the case where a successive choices do not have equal probabilities. When one choice has been made, the pool of available events is different. For example, we can break down the guessing a card into (1) guessing the house (one of $n_1 = 4$), and (2) guessing the number from that house (one of $n_2 = 13$). After making our choices, there are still $N$ events than can happen (in this example, $4\times 13=52$), but we are first choosing a bin/category, and then choosing from inside that category. Each choice has a different probability.

So, if $N$ is the total number of events in this system:

$$
\begin{align*}
H(N) &= H(bins) + \sum_i p_i H(n_i) \\\\
-H(bins) &= \sum_i p_i H(n_i) - H(N) \\\\
&\text{The sum of probabilities is 1, so multiplying by it has no effect} \\\\
-H(bins) &= \sum_i p_i H(n_i) - \sum_i p_i H(N) \\\\
-H(bins) &= \sum_i p_i \left( H(n_i) - H(N) \right) \\\\
-H(bins) &= \sum_i p_i \left( \log n_i - \log N \right) \\\\
-H(bins) &= \sum_i p_i \left( \log (n_i / N) \right) \\\\
&\text{$n_i/N$ is just the probability of $i^{th}$ choice} \\\\
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

Why is the $\log$ function a good fit, intuitively? The $\log$ function is interesting. Take $\log_2 8=3$. On face value, it represents the power the base will be raised to to equal the argument.

On a deeper glance, it represents the minimum number of choices needed to find an answer. For example, guessing a number. A base of 2 means, at each step a question is asked to rule out 1/2 of the remaining options.

```
graph TD
    A{Is it > 4?}
    
    %% Right Branch (Yes)
    A -- Yes --> B{Is it > 6?}
    B -- Yes --> C{Is it > 7?}
    C -- Yes --> D[Result: 8]
    C -- No --> E[Result: 7]
    
    B -- No --> F{Is it > 5?}
    F -- Yes --> G[Result: 6]
    F -- No --> H[Result: 5]
    
    %% Left Branch (No)
    A -- No --> I{Is it > 2?}
    I -- Yes --> J{Is it > 3?}
    J -- Yes --> K[Result: 4]
    J -- No --> L[Result: 3]
    
    I -- No --> M{Is it > 1?}
    M -- Yes --> N[Result: 2]
    M -- No --> O[Result: 1]
```

This makes sense for integer arguments. What about probabilities? Well, a probability is a ratio of an event to the total number of events, $n_i/N$. The log of a probability is the difference between the logs of events: $\log(n_i/N) = \log(n_i) - \log(N)$. This tells us: I need to make only $c$ choices to find an answer in $n_i$, but $C >= c_i$ choices to find an answer in $N$.

## Representing surprise

🚧
