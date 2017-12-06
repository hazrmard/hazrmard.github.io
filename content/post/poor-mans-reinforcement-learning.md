+++
title = "A Poor Man's Introduction to Reinforcement Learning"
date = "2017-11-13T23:19:08-06:00"
description = ""
tags = []
categories = []
series = []
isexternal = false
hasequations = false
hascode = false
draft = true
+++

Reinforcement Learning (RL) is one of the many ways to implement artificial
intelligence (AI). AI is the design of "intelligent" agents that maximize their
chances of success at some goal. The goal can belong to any problem: from
winning a game of tic-tac-toe, to recognizing speech, to steering a car.

A problem can be approached in many different ways. An agent can search for all
possible options and choose the best. Or the problem can be formulated as a set
of logical rules which the agent then applies at each step. The former way may
require searching too many options. The latter may require meticulous representation
of the nuances in a system.

RL is built on experience. With each action an agent takes, it gets some
feedback - reinforcement - from its environment. It uses that reinforcement
to get better. So RL agents start off poorly, with the expectation that they
will get better as they blunder their way through the problem.

{{< figure src="/img/posts/poor-mans-RL/three_AI_approaches.gif"
    caption="Let's see what sticks: an illustration of various approaches towards implementing AI. Left: An agent tries all options. Centre: An agent formulates the problem and derives the best choice. Right: An agent learns from experience (reinforcement).">}}

A reinforcement learning problem can be viewed as repeated interactions between
the agent and the environment. An agent can be in one of a number of states. At
every instance, an agent has a set of actions it can take. For each action, the
agent will transition to another state. Also, for each action the agent will get
some feedback from the environment.