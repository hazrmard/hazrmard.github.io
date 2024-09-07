+++
title = 'A Simple LLM Frameork'
date = '2024-09-06T22:34:32-05:00'
description = "A minimalist LLM framework for retrieval augmented & agentic workflows."
tags = []
categories = []
link = ""
hasequations = false
includes = ["https://unpkg.com/mermaid@8.2.3/dist/mermaid.min.js"]       # any javascript files to include
tableofcontents = false
draft = true
+++

In this post I describe a simple framework to get 80% of the way to an agentic, retrieval augmented LLM application.

*Agentic*: the LLM is able to call functions and have side effects. For example, writing to a file, asking for further input.

*Retrieval Augmented*: the LLM generates responses grounded in facts provided to it.

## The framework

<pre class="mermaid">
graph TD;
A[User Input]
B[router]
C[ Large Language Model ]
D[Output]

A-->B
B-->C
C-->B
B-->D
B-->A
</pre>

The application framework can be seen as a state machine.

Arguably the most development effort goes into the `router`. What is a router?

At the simplest level, it is nothing.

<pre class="mermaid">
graph TD;
A[User Input]
C[ Large Language Model ]
D[Output]

A-->C
C-->D
</pre>

A more complex router loops back into the LLM:

<pre class="mermaid">
graph TD;
A[User Input]
C[ Large Language Model ]
D[Output]

A-->C
C-->C
C-->D
</pre>

A yet more complex LLM will loop in multiple inputs:

<pre class="mermaid">
graph TD;
A[User Input]
C[ Large Language Model ]
D[Output]

A-->C
C-->C
C-->A
C-->D
</pre>