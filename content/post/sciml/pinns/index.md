+++
title = 'Physics-Informed Neural Networks (PINNs)'
date = '2025-01-05T11:44:46-06:00'
description = ""
tags = []
categories = []
link = ""
hasequations = false
includes = []       # any javascript files to include
tableofcontents = false
draft = true
+++

## Neural Networks are black boxes

- Function approximators
- Try to minimize a cost function blindly
- However, garbage in, garbage out
- This may work for interpolating
- Extrapolation is out of domain

## How we inform a Neural Network

- May work for interpolating, not always
- Occam's razor - perhaps a simpler explanation is better
- We use regularization

## Using physics as information

- Regularization is a penalty informed by model architecture
- Can we add another penalty informed by data domain?
