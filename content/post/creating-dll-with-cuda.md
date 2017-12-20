+++
title = "Creating a DLL project with CUDA"
date = "2017-12-19T18:04:24-06:00"
description = ""
tags = ["CUDA", "C/C++"]
categories = ["developer"]
series = []
isexternal = false
hasequations = false
hascode = true
draft = true
+++

CUDA is a framework for parallel computing on graphics processing units (GPUs)
developed by Nvidia. The massively parallel architecture of GPUs allows them
to execute simple instructions on massive data concurrently. CPUs, on the other
hand, can execute more complex instructions but at the cost of parellelism.
For example, in a video game, a CPU will read audio files for sound effects,
control opponents' moves, and do networking. A GPU will handle -you guessed it-
graphics, which are essentially the same calculations done for each of the
million pixels on your screen.

CUDA provides an interface for C/C++ languages. You can interleave CPU and
GPU code in the same project. The CUDA software development kit comes with
integration for Visual Studio. This article documents my attempt to create
a simple CUDA project. This is mainly for my benefit in case I forget my way
down the road.

## The Project

## Outline

* CUDA Dll Proj/ Test proj
* Proj dependencies
* 