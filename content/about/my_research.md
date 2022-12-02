+++
title = 'My Research'
date = '2022-10-04T17:55:54-05:00'
description = "A summary of my doctoral research."
link = ""
tags = []
categories = ["personal"]
includes = []       # any javascript files to include
hasequations = false
tableofcontents = true
draft = false
+++

## Purpose of this document

This is a *very* broad, slightly technical, overview of my work. The intended audience are recruiters, engineers, and inanimate web-crawlers.

## Competencies

I've developed competency in the following areas during my research:

1. **Machine learning.** Reinforcement learning for control, supervised learning for system modeling, and unsupervised learning for data exploration.
2. **Control theory.** Artificial Intelligence using insights from classical domains of controls theory and signal processing.
3. **Visualization/interpretation.** Feature engineering, dimensionality reduction, exploratory analysis using visualization tools.
4. **Data engineering.** Write processing pipelines to query and preprocess data.

## The problem

My research problem looks at three things

1. **Autonomous control.** I use machine learning to derive a controller which is trying to score high on some performance metric.
2. **Of complex systems.** The controller is derived for systems that can be non-linear and time-varying. This includes drones, smart-buildings, robots, and even a web application!
3. **Such that they are fault-tolerant.** When the system changes due to a disturbance, the controller should be able to keep performing at an acceptable level.

Specifically, I am looking at Unmanned Aerial Vehicles (UAVs) and smart buildings as testbeds for this problem. However, the application extends to any situation where a decision problem is to be solved.

## Using reinforcement learning

Reinforcement learning (RL) works as humans do. We act, observe feedback of our action, and learn whether or not to take that action again.

The advantage of RL over supervised machine learning is that it does not need solved problems to learn from. For example, image classification problems are learned using labelled datasets. What RL has, is an immediate feedback signal - the reward. The reward only tells us whether the current action is good-ish or bad-ish. RL takes actions such that the reward is maximized over the long run.

Why is RL a candidate for my problem?

1. RL can learn autonomously over time to control a system.
2. Some RL algorithms are model-free. They do not need to replicate a complex system's operation, but only how it rewards actions.
3. As the system changes, the reward changes. So, RL can change its control policy to tolerate faults.

What's the challenge?

What if the system changes? How long will it take to learn a good action? Can the system operate while learning under a fault? Sample inefficiency is one big hurdle for RL. Often times, there is not enough time to learn a sufficiently good control policy.

## The solution(s)

### The data domain

My first set of solutions was to look at speeding the machine learning problem.

1. Using **data-driven models** of the system. Once we have a virtual copy of the environment, the controller can interact with it in parallel to generate more data samples to learn from. However, we need to ensure the data-model is accurate. Bad models will generate bad data.
2. Using **meta-learning** to speed up the learning process itself. By looking at how fast the learning process converges with respect to data, we can tweak the learning parameters of the next data sample. However, meta-learning itself has a host of parameters that need to be fine-tuned. There is little to guarantee that the learning performance will be similar on the faulty-system.
3. Using **transfer learning**. When a fault occurs, the system has not changed completely. There are still parts of the old controller that are useful. So, instead of learning from scratch, the controller attempts to tune itself from data samples from the changed system. Again, however, the learning process may be slow. And in fact, the controller may learn poorly compared to starting from scratch! (Negative transfer).

In all of these approaches, we can benefit from knowing how similar the faulty system is to the original system. Part of my research focuses on quantifying task similarity so we can apply solutions more effectively.

### The control domain

One insight I gained was this: if we can understand *how* a fault has changed a system, then we may be able to directly transform actions to counteract the fault, instead of fine-tuning them slowly.

For example, consider a steering wheel. Imagine a fault causes a left turn of the wheel to turn the tires right. Essentially, the output of the system is reversed. Trivially, all I have to do is to reverse my actions and the system will behave normally.

I derived a control policy transformation that can quickly adapt to changes in a system. Thus, instead of fine-tuning a neural network over time, the output of the network is transformed. The simplest transformation is linear, which in experiments takes an order-of-magnitude smaller computational effort.

My current work is generalizing this transformation to a broader class of non-linear systems and transformations.