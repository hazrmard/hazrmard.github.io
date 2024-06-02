+++
title = 'AI+Building Energy Modeling: IBPSA SimBuild 2024 Notes'
date = '2024-06-02T12:12:03-05:00'
description = "Notes from attending the SimBuild conference, especially sessions on data science and modeling."
tags = ["LLM", "Buildings", "Machine learning"]
categories = ["Engineering"]
link = ""
hasequations = false
includes = []       # any javascript files to include
tableofcontents = true
draft = false
+++


This was my first year at IBPSA SimBuild. Three days of interesting sessions on multidiscipinary domains. I and my colleague were presenting on the application of Large Language Models to Building Energy Modeling (BEM). The following are some quick and dirty notes. I naturally paid more attention to talks I found more interesting, given my background.

I have a background in reinforcement learning and machine learning in general. I was particularly interested in the Data Science session.  Large Language Models have quickly permeated into every industry where weakly-supervised automation is possible. LLMs, however, have penetrated faster in to areas with a bigger overlap with computer science professionals or a massive customer-facing online business (customer service). So I was very interested where BEM would use LLMs.

For context, BEM is a business-to-business business. Architects at design firms make blueprints. Building engineers use them recreate a building model and simulate heating/cooling/power characteristics to make it up to code. A lot is lost in translation. Each profession attends to a different aspect of Building Information Management.

## Interesting Talks

### Rapid Building Feature Extraction

By: Soumyadeep Chowdhury

*Summary: Using street- and satellite- views to generate rough building geometries.*

Given a stree-view image, use pre-trained semantic segmentation model to filter out the house's façade from the image. Then use a custom recurrent-CNN to detect house façade dimensions (width, height). Then cross-reference façade dimensions with Open Street Map-generated building footprints to generate a volume.

*My observation*: Creating building models is a big pain point for engineers. This is not an end-to-end solution. But, if it can reliably get you 30, 40, 50 % of the way to a building model, it will be a hit.

### Advanced BEM with LLMs

By: Liang Zhang

*Summary: Using finetuned LLMs to generate error-free idf files in Energy+.*

Energy+ is a popular open-source BEM software. IDF files describe the building model to simulate. The prompt template contains documentation for idf schema as ground truth. Multiple agents are used for individual tasks: (1) extracting occupant requirements, (2) building material information. Then another agent combines requirements together into an idf file. A final agent runs the idf file in Energy+ and returns any errors back into the agent loop to fix the file.

*My observation*: Very clever! LLMs are competent at coding in popular languages, but fall apart in niche domains. This approach throws the book at the LLM and puts it through enough agentic-loops to let it fix common problems. In my own experimentation, I tend to get stingy with providing context to the LLM. But with 16k, 32k, or even 100k+ context windows, a good first approach can be to throw everything at it and whittle down later.

### RL based irregular shading system and indoor lighting simulation

By: Zhuorui Li, Jinzhao Tian

*Summary: RL controller to adjust shading in building façades to ensure indoors are appropriately lit/shaded.*

This work used RL to control building shades such that all parts of the floor, close and far from the windows received adequate lighting throughout the dat. They used a horizontal and vertical illuminance sensors for areas close and far from façade. Distance from façade determined the contribution to the reward. Action space was the angles of individual blinds.

*My observation*: An off-the-beaten-path application of RL. The question, always, is about the adequacy of the reward function. In BEM, energy versus comfort have waged a battle for primacy for a long, long, time.

### ML as surrogate model for early-stage heating demand optimization

*Summary: Parametrically generate building models, simulate them in Energy+, collect data for training an energy prediction model.*

First, use validation to find important building features in the dataset (dimensions, building type etc.) Then, compare Random Forest, Linear Regresion, Adaboost models. Their errors in energy consumption were in 3-6kBTU range. Brief literature review shows measured energy consumption is around 40-100 kBTU/m2.

*My observation: A pretty decent error rate.*

### Simplifying modeling of buildings and district energy using LLMs

By: Saman Mostafavi

*Summary: Use logit processors to constrain generation and prevent hallucination.*

LLMs are prone to hallucinate. They are, after all, trained to fit to language patterns. They will generate nonsense so long as it *looks* sensible. This work modified the output generation process. For each word, an LLM's output is a probability distribution over the vocabulary it was trained on. It samples the most probable next word to print out. However, the sampling of these logits can be constrained to fit certain grammars.

*My observation*: This talk dovetailed nicely with the prior talk for generating idf files. Whereas that took a hammer to the job, this one applied a scalpel. Logit processing can be extended to a number of logical tasks with constrained grammars. For example, linters exist for many coding languages. The previous output of the LLM can be linted and the following output be constrained to fit to the possible options.

## Hackathon

SimBuild organized a hackathon, which I was very excited about. We had a handful of incredible projects.

### Roombox

Jake Chevrier, Jihoon Chung, Jeiwei Li, Justin Shultz

Streambuild + Pollination cloud (Pollination) to visualize and simulate building characteristics. [Code](https://github.com/JustinShultz/Room-Box).

### BE-A-Mentor

Hunter Swope, Gabriel Flechas

ChatGPT + RAG

[GitHub - GFlechas/BE.A-Mentor-GPT-Methodology](https://github.com/GFlechas/BE.A-Mentor-GPT-Methodology): A repository guide to creating a custom building energy analysis using OpenAIs custom GPTs. The repository includes datasets we've created (based on other opensource data) to feed our example mentor and others are welcome to use these as knowledge inputs for their own GPT.

### The Burrowing Ironbugs: WIGsim

Victor Braciszewski

Ground heat exchanger modeling/optimization.

### Compl-Easy

Jayati Chhabra, David Milner

Streamlit app to interactively browse building codes/standards.

### GridSage

Harshika Bisht, Alex Chapin, Tugcin Kirant

An open source project that provides electricity load profile data to a utility company for planned commercial building projects. This information is used to size new transformers for the electric grid. [Code.](https://github.com/anchapin/gridsage)

## Call to action on building energy modeling

By: Michael Wetter

This talk snuck up on me. I was debating between this and another concurrent technical session. I'm glad I listened to this.

Michael started by contextualizing the design automation process used in the semiconductor industry. He showed a recorded talk by Prof. Alberto Sangiovanni Vincentelli (EECS UC Berkley) that resonated with me strongly, as I have BS/MS/PhD in EE. The big takeaway is developing methodologies for chip design. A methodology is freedom from choice. It pairs abstractions with tools to yield a workflow.

I recall this from VLSI design work in college (pardon me if there're some errors): chip design is abstracted in the form of NAND gates. Once you have a NAND gate, it can be cascaded to make other operators. A standard interface ensures that the layout of billions of transistors can be recursively optimized. The Arighmetic Logic Unit AND operators are not built different from the Control Unit operators on the other side of the CPU die. So, different teams can independently work on higher level design, knowing that their models will play well when brough together in the fabrication plant.

In buildings domain today, a blueprint is used to make a machine/building. The blueprint is also used to make a model of the machine/building. But the model and the machine are disconnected. What abstractions are made in the blueprint are up to the designer. What tools are used to realize the blueprint are up to the makers. What other abstractions the BEM engineer's model makes from the blueprint are separate.

The call to action was to develop methodologies: the engineer should create a blueprint from standard abstractions, from which a model is made, and then make the machine that is faithful to the model using a standard toolkit.

Such a standard exists today: AHSRAE guidelines 231p & 233p. Manufacturers and operators could make equipment and requirements based on the atomic blocks in the standard. The [ASHRAE](https://en.wikipedia.org/wiki/ASHRAE) guidlines can inform the model, which in turn is used to make the machine.

The various projects in the data science session alluded to this need. All in all, a good summary of what needs to happen.
